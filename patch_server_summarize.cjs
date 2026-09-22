const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf-8');

const oldSummarizeEndpoint = content.substring(
  content.indexOf('app.post("/api/gemini/summarize"'),
  content.indexOf('app.post("/api/gemini/transcribe"')
);

const newSummarizeEndpoint = `app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { text, title, className, classes } = req.body;
    const clientProvidedKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Note text content is required for summarization." });
    }

    const ai = getGeminiClient(clientProvidedKey);
    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured. Please provide an API key in the settings or configure GEMINI_API_KEY.",
        missingKey: true,
      });
    }

    const classesList = Array.isArray(classes) && classes.length > 0 ? classes.map((c: any) => \`ID: \${c.id} | Name: \${c.name}\`).join("\\n") : "None";

    const prompt = \`Analyze this lecture/class voice note transcript.
Note Title: \${title || "Untitled"}
Class/Category: \${className || "General"}

Transcript:
"""
\${text}
"""

Available Classes (for mapping):
\${classesList}

Please do the following:
1. Produce a concise, high-yield structured summary suitable for students and learners.
2. Correct the grammar, punctuation, and formatting of the transcript to make it highly readable without losing any of the original meaning.
3. Suggest a concise, descriptive title for the note based on the topics.
4. Suggest the most appropriate class ID from the provided list, or output null if it doesn't fit any existing class.\`;

    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

    const response = await generateWithFallback(ai, candidateModels, {
      contents: prompt,
      config: {
        systemInstruction:
          "You are an expert academic note summarizer. Create clear, factual, high-retention summaries with structured key bullet points, takeaways/action items, and relevant subject tags. Additionally, clean up the transcript, generate a smart title, and map it to the correct class.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise 2-4 sentence executive overview of the note's core ideas.",
            },
            keyPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Essential bullet points, formulas, definitions, or main concepts covered.",
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Recommended next steps, homework/exam topics to review, or questions to investigate.",
            },
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "3 to 6 high-level academic keywords or topical tags.",
            },
            title: {
              type: Type.STRING,
              description: "A concise, descriptive title for the note (max 6 words)."
            },
            cleanedTranscript: {
              type: Type.STRING,
              description: "The original transcript with corrected grammar, punctuation, and clear paragraph formatting."
            },
            classId: {
              type: Type.STRING,
              description: "The exact ID of the best matching class from the provided list, or null if no match.",
              nullable: true
            }
          },
          required: ["summary", "keyPoints", "actionItems", "tags", "title", "cleanedTranscript"],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return res.status(500).json({ error: "Received empty response from Gemini." });
    }

    const cleanedJson = cleanJsonResponse(rawText);
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch {
      parsedData = {
        summary: "Could not parse AI response. " + rawText,
        keyPoints: [],
        actionItems: [],
        tags: ["Error"],
        title: title || "Untitled Note",
        cleanedTranscript: text,
        classId: null
      };
    }

    return res.json({ data: parsedData });
  } catch (err: any) {
    const errorInfo = parseGeminiError(err);
    console.error("Summarize API Error:", err.message || err);
    return res.status(errorInfo.statusCode).json({
      error: errorInfo.message,
      isHighDemand: errorInfo.isHighDemand,
    });
  }
});\n\n`;

const newContent = content.replace(oldSummarizeEndpoint, newSummarizeEndpoint);
fs.writeFileSync('server.ts', newContent);
console.log('patched server.ts summarize');

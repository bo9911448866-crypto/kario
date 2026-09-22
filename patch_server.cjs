const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf-8');

const newEndpoint = `
// Note analysis endpoint (topic detection, grammar correction, class mapping)
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { text, classes } = req.body;
    const clientProvidedKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Note text content is required for analysis." });
    }

    const ai = getGeminiClient(clientProvidedKey);
    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured.",
        missingKey: true,
      });
    }

    const classesList = Array.isArray(classes) && classes.length > 0 ? classes.map((c: any) => \`ID: \${c.id} | Name: \${c.name}\`).join("\\n") : "None";

    const prompt = \`Analyze this spoken voice note transcript.
1. Correct the grammar, punctuation, and formatting to make it highly readable without losing any of the original meaning.
2. Generate a concise, descriptive title based on the topics.
3. Suggest the most appropriate class ID from the provided list, or output null if it doesn't fit any existing class.

Existing Classes:
\${classesList}

Transcript:
"""
\${text}
"""\`;

    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

    const response = await generateWithFallback(ai, candidateModels, {
      contents: prompt,
      config: {
        systemInstruction: "You are an expert academic note processor. Fix grammar, generate a title, and map to the most appropriate class ID.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A concise, descriptive title for the note (max 6 words)." },
            cleanedTranscript: { type: Type.STRING, description: "The original transcript with corrected grammar, punctuation, and clear paragraph formatting." },
            classId: { type: Type.STRING, description: "The exact ID of the best matching class from the provided list, or null if no match.", nullable: true }
          },
          required: ["title", "cleanedTranscript"]
        }
      }
    });

    const rawText = response.text?.trim();
    if (!rawText) return res.status(500).json({ error: "Received empty response from Gemini." });

    const cleanedJson = cleanJsonResponse(rawText);
    const parsedData = JSON.parse(cleanedJson);

    return res.json({
      success: true,
      title: parsedData.title,
      cleanedTranscript: parsedData.cleanedTranscript,
      classId: parsedData.classId || null
    });

  } catch (err: any) {
    const errorInfo = parseGeminiError(err);
    console.error("Note Analysis API Error:", err.message || err);
    return res.status(errorInfo.statusCode).json({
      error: errorInfo.message,
      isHighDemand: errorInfo.isHighDemand,
    });
  }
});
`;

const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.includes('app.post("/api/gemini/summarize",'));
lines.splice(insertIndex, 0, newEndpoint);

fs.writeFileSync('server.ts', lines.join('\n'));
console.log('patched server.ts');

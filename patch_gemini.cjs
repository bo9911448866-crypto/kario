const fs = require('fs');
const content = fs.readFileSync('src/services/GeminiService.ts', 'utf-8');

const newMethod = `
  async analyzeNote(params: {
    text: string;
    classes: { id: string; name: string }[];
  }): Promise<{ title: string; cleanedTranscript: string; classId: string | null }> {
    const { text, classes } = params;

    if (!text || text.trim().length === 0) {
      throw new Error('Note text is empty. Cannot analyze.');
    }

    const customKey = StorageService.getUserApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customKey) {
      headers['x-gemini-api-key'] = customKey;
    }

    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        classes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.missingKey) {
        throw new Error(
          'Gemini API key is required. Please add your key in the settings panel.'
        );
      }
      const cleanError = sanitizeErrorMessage(data, 'Failed to analyze note with Gemini.');
      throw new Error(cleanError);
    }

    return {
      title: data.title,
      cleanedTranscript: data.cleanedTranscript,
      classId: data.classId,
    };
  },
`;

const lines = content.split('\n');
const insertIndex = lines.findIndex(line => line.includes('async summarizeNote('));
lines.splice(insertIndex, 0, newMethod);

fs.writeFileSync('src/services/GeminiService.ts', lines.join('\n'));
console.log('patched GeminiService.ts');

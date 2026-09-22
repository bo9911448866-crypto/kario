const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `      const summaryResult = await GeminiService.summarizeNote({
        text: note.transcript,
        title: note.title,
        className: targetClass?.name || 'General',
      });

      const updated = StorageService.updateNote(note.id, {
        summary: summaryResult,
        isSummarizing: false,
        error: undefined,
      });`;

const newStr = `      const summaryResult = await GeminiService.summarizeNote({
        text: note.transcript,
        title: note.title,
        className: targetClass?.name || 'General',
        classes,
      });

      const updatePayload: any = {
        summary: summaryResult,
        isSummarizing: false,
        error: undefined,
      };

      if (summaryResult.title) updatePayload.title = summaryResult.title;
      if (summaryResult.cleanedTranscript) updatePayload.transcript = summaryResult.cleanedTranscript;
      if (summaryResult.classId) {
        // Verify classId exists
        const exists = classes.some(c => c.id === summaryResult.classId);
        if (exists) updatePayload.classId = summaryResult.classId;
      }

      const updated = StorageService.updateNote(note.id, updatePayload);`;

const updatedContent = content.replace(targetStr, newStr);
fs.writeFileSync('src/App.tsx', updatedContent);
console.log('patched App.tsx');

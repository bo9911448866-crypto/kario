const fs = require('fs');
const content = fs.readFileSync('src/services/GeminiService.ts', 'utf-8');

const targetStr = `  async summarizeNote(params: {
    text: string;
    title?: string;
    className?: string;
  }): Promise<NoteSummary> {
    const { text, title, className } = params;`;

const newStr = `  async summarizeNote(params: {
    text: string;
    title?: string;
    className?: string;
    classes?: { id: string; name: string }[];
  }): Promise<NoteSummary> {
    const { text, title, className, classes } = params;`;

const oldFetchStr = `      body: JSON.stringify({
        text,
        title,
        className,
      }),`;

const newFetchStr = `      body: JSON.stringify({
        text,
        title,
        className,
        classes,
      }),`;

const oldReturnStr = `    return {
      summary: result.summary || 'Summary generated.',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
      tags: Array.isArray(result.tags) ? result.tags : [className || 'General'],
      generatedAt: new Date().toISOString(),
    };`;

const newReturnStr = `    return {
      summary: result.summary || 'Summary generated.',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
      tags: Array.isArray(result.tags) ? result.tags : [className || 'General'],
      generatedAt: new Date().toISOString(),
      title: result.title,
      cleanedTranscript: result.cleanedTranscript,
      classId: result.classId,
    };`;

let updated = content.replace(targetStr, newStr);
updated = updated.replace(oldFetchStr, newFetchStr);
updated = updated.replace(oldReturnStr, newReturnStr);

fs.writeFileSync('src/services/GeminiService.ts', updated);
console.log('patched GeminiService.ts sum');

const fs = require('fs');
const content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf-8');

let updated = content.replace(
  'placeholder="e.g., Photosynthesis & Light Reactions"',
  'placeholder="Leave blank to let AI auto-generate title"'
);

updated = updated.replace(
  '{classes.map((cls) => (',
  '<option value="">✨ Auto-detect with AI</option>\n                {classes.map((cls) => ('
);

fs.writeFileSync('src/components/AudioRecorder.tsx', updated);
console.log('patched AudioRecorder UI');

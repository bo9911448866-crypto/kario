const fs = require('fs');
const content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf-8');

const updated = content.replace(
  'useState(defaultClassId || classes[0]?.id || \'\');',
  'useState(defaultClassId || \'\');'
);

fs.writeFileSync('src/components/AudioRecorder.tsx', updated);
console.log('patched AudioRecorder default class');

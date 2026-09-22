const fs = require('fs');
const content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf-8');

const targetStr = `  const handleSave = (shouldSummarize = false) => {
    if (!title.trim()) {
      setErrorMsg('Please enter a note title.');
      return;
    }

    const finalTranscript = transcript.trim() || interimTranscript.trim() || '(No spoken audio detected)';

    onSaveNote(
      {
        title: title.trim(),
        classId: selectedClassId,`;

const newStr = `  const handleSave = (shouldSummarize = false) => {
    if (!shouldSummarize && !title.trim()) {
      setErrorMsg('Please enter a note title.');
      return;
    }

    const finalTranscript = transcript.trim() || interimTranscript.trim() || '(No spoken audio detected)';

    onSaveNote(
      {
        title: title.trim() || 'AI Processing...',
        classId: selectedClassId,`;

const updated = content.replace(targetStr, newStr);
fs.writeFileSync('src/components/AudioRecorder.tsx', updated);
console.log('patched AudioRecorder.tsx');

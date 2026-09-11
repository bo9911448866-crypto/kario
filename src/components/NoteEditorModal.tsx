import React, { useState } from 'react';
import { X, Sparkles, Save, Download, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { ClassItem, VoiceNote } from '../types';

interface NoteEditorModalProps {
  note: VoiceNote;
  classes: ClassItem[];
  onSave: (id: string, updates: Partial<VoiceNote>) => void;
  onSummarize: (note: VoiceNote) => void;
  onClose: () => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  classes,
  onSave,
  onSummarize,
  onClose,
}) => {
  const [title, setTitle] = useState(note.title);
  const [classId, setClassId] = useState(note.classId);
  const [transcript, setTranscript] = useState(note.transcript);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Note title cannot be empty.');
      return;
    }

    onSave(note.id, {
      title: title.trim(),
      classId,
      transcript: transcript.trim(),
    });
    onClose();
  };

  const handleExportMarkdown = () => {
    const currentCls = classes.find((c) => c.id === classId)?.name || 'General';
    let md = `# ${title}\n`;
    md += `**Class:** ${currentCls}\n`;
    md += `**Date:** ${new Date(note.createdAt).toLocaleString()}\n\n`;
    md += `## Transcript\n${transcript}\n\n`;

    if (note.summary) {
      md += `## AI Summary\n${note.summary.summary}\n\n`;
      if (note.summary.keyPoints?.length) {
        md += `### Key Points\n`;
        note.summary.keyPoints.forEach((kp) => {
          md += `- ${kp}\n`;
        });
        md += '\n';
      }
      if (note.summary.actionItems?.length) {
        md += `### Action Items\n`;
        note.summary.actionItems.forEach((ai) => {
          md += `- [ ] ${ai}\n`;
        });
        md += '\n';
      }
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="note-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="note-editor-card"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Edit Voice Note
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update title, class assignment, or transcript content
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title & Class row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-note-title"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-note-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="edit-note-class"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Class / Subject
              </label>
              <select
                id="edit-note-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transcript editing */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="edit-note-transcript"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Transcript
              </label>
              <button
                type="button"
                onClick={() =>
                  onSummarize({
                    ...note,
                    title,
                    classId,
                    transcript,
                  })
                }
                disabled={note.isSummarizing}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
              >
                {note.isSummarizing ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>{note.isSummarizing ? 'Summarizing...' : 'Summarize Now with AI'}</span>
              </button>
            </div>
            <textarea
              id="edit-note-transcript"
              rows={8}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-normal"
            />
          </div>

          {/* Current AI Summary preview if available */}
          {note.summary && (
            <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Existing AI Summary</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {note.summary.summary}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Markdown</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-note-changes-btn"
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

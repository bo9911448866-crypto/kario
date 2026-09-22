import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Save,
  Download,
  FileText,
  RefreshCw,
  AlertCircle,
  Wand2,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { ClassItem, VoiceNote, NoteAnalysisResult } from '../types';
import { GeminiService } from '../services/GeminiService';

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
  const [detectedTopics, setDetectedTopics] = useState<string[]>(
    note.detectedTopics || note.summary?.detectedTopics || []
  );
  const [grammarNotes, setGrammarNotes] = useState<string | undefined>(
    note.grammarNotes || note.summary?.grammarNotes
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAiAutoDetectAndPolish = async () => {
    if (!transcript.trim()) {
      setErrorMsg('Note transcript is empty. Please enter text to analyze.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAiSuccessMsg(null);

    try {
      const analysis: NoteAnalysisResult = await GeminiService.analyzeNote({
        text: transcript.trim(),
        classes: classes.map((c) => ({ id: c.id, name: c.name })),
      });

      if (analysis.title) {
        setTitle(analysis.title);
      }
      if (analysis.cleanedTranscript) {
        setTranscript(analysis.cleanedTranscript);
      }
      if (analysis.classId && classes.some((c) => c.id === analysis.classId)) {
        setClassId(analysis.classId);
      }
      if (analysis.detectedTopics && analysis.detectedTopics.length > 0) {
        setDetectedTopics(analysis.detectedTopics);
      }
      if (analysis.grammarNotes) {
        setGrammarNotes(analysis.grammarNotes);
      }

      const matchedCls = classes.find((c) => c.id === analysis.classId);
      setAiSuccessMsg(
        matchedCls
          ? `Topics detected & mapped to "${matchedCls.name}". Grammar polished!`
          : 'Topics detected & title generated. Grammar polished!'
      );
    } catch (err: any) {
      console.warn('AI analysis error in editor:', err);
      setErrorMsg(
        err.message?.includes('GEMINI_API_KEY')
          ? 'Gemini API key is required to auto-classify and fix grammar.'
          : err.message || 'Could not auto-analyze note with AI.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMsg('Note title cannot be empty.');
      return;
    }

    onSave(note.id, {
      title: title.trim(),
      classId,
      transcript: transcript.trim(),
      detectedTopics,
      grammarNotes,
    });
    onClose();
  };

  const handleExportMarkdown = () => {
    const currentCls = classes.find((c) => c.id === classId)?.name || 'General';
    let md = `# ${title}\n`;
    md += `**Class:** ${currentCls}\n`;
    md += `**Date:** ${new Date(note.createdAt).toLocaleString()}\n\n`;

    if (detectedTopics.length > 0) {
      md += `**Topics:** ${detectedTopics.join(', ')}\n\n`;
    }

    md += `## Transcript\n${transcript}\n\n`;

    if (grammarNotes) {
      md += `## Grammar Polish Notes\n${grammarNotes}\n\n`;
    }

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="note-editor-card"
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Edit Voice Note
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Update title, class assignment, detected topics, or transcript
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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

          {aiSuccessMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-900 dark:text-white" />
              <span>{aiSuccessMsg}</span>
            </div>
          )}

          {/* Quick AI Assist Bar */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                AI Auto-Classify & Fix Grammar
              </span>
            </div>
            <button
              id="editor-ai-autoclassify-btn"
              type="button"
              onClick={handleAiAutoDetectAndPolish}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{isAnalyzing ? 'Analyzing...' : 'Auto-Classify & Polish'}</span>
            </button>
          </div>

          {/* Title & Class row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-note-title"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1"
              >
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="edit-note-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
              />
            </div>

            <div>
              <label
                htmlFor="edit-note-class"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1"
              >
                Class / Subject
              </label>
              <select
                id="edit-note-class"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detected Topics Tags */}
          {detectedTopics.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                Detected Topics
              </label>
              <div className="flex flex-wrap gap-1.5">
                {detectedTopics.map((top, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    <Tag className="h-3 w-3 text-zinc-400" />
                    {top}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grammar Notes */}
          {grammarNotes && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Grammar Polish: </span>
              {grammarNotes}
            </div>
          )}

          {/* Transcript editing */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="edit-note-transcript"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
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
                    detectedTopics,
                    grammarNotes,
                  })
                }
                disabled={note.isSummarizing}
                className="flex items-center gap-1 text-xs font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer disabled:opacity-50"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 leading-relaxed font-normal"
            />
          </div>

          {/* Current AI Summary preview if available */}
          {note.summary && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Existing AI Summary</span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {note.summary.summary}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Markdown</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-note-changes-btn"
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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

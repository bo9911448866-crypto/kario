import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Copy,
  Check,
  Clock,
  Calendar,
  RefreshCw,
  FolderInput,
  Tag,
  ListOrdered,
  CheckSquare,
  AlertCircle,
  Mail,
  Send,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { ClassItem, VoiceNote } from '../types';
import { AudioPlayer } from './AudioPlayer';
import { EmailService } from '../services/EmailService';

interface NoteCardProps {
  note: VoiceNote;
  classes: ClassItem[];
  currentClass?: ClassItem;
  onSummarize: (note: VoiceNote) => void;
  onDelete: (id: string) => void;
  onMoveToClass: (noteId: string, targetClassId: string) => void;
  onEdit: (note: VoiceNote) => void;
  cardStyle?: 'solid' | 'frosted';
  onOpenSettings?: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  classes,
  currentClass,
  onSummarize,
  onDelete,
  onMoveToClass,
  onEdit,
  cardStyle = 'solid',
  onOpenSettings,
}) => {
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [copiedSection, setCopiedSection] = useState<'transcript' | 'summary' | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    isBadCredentials?: boolean;
  } | null>(null);

  const formattedDate = new Date(note.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formatDuration = (secs: number) => {
    if (!secs) return '0:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const copyToClipboard = (text: string, section: 'transcript' | 'summary') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleOpenMailto = () => {
    const emailSettings = EmailService.getEmailSettings();
    const recipient = emailSettings.recipientEmail || '';
    const mailtoUrl = EmailService.generateMailtoUrl(recipient, note, currentClass?.name || 'General');
    window.location.href = mailtoUrl;
  };

  const handleSendEmail = async () => {
    const emailSettings = EmailService.getEmailSettings();
    if (!emailSettings.recipientEmail || !emailSettings.recipientEmail.includes('@')) {
      if (onOpenSettings) {
        onOpenSettings();
      } else {
        alert('Please configure your recipient email in Settings to send notes.');
      }
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMsg(null);
    try {
      const res = await EmailService.sendNoteEmail(
        emailSettings.recipientEmail,
        note,
        currentClass?.name || 'General'
      );
      if (res.success) {
        setEmailStatusMsg({ type: 'success', text: `Sent to ${emailSettings.recipientEmail}` });
        setTimeout(() => setEmailStatusMsg(null), 4000);
      } else {
        setEmailStatusMsg({
          type: 'error',
          text: res.error || 'Delivery failed',
        });
      }
    } catch (err: any) {
      setEmailStatusMsg({ type: 'error', text: err?.message || 'Failed to deliver email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      id={`note-card-${note.id}`}
      className={`rounded-2xl border transition-all overflow-hidden flex flex-col group ${
        cardStyle === 'frosted'
          ? 'border-white/20 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-lg hover:shadow-xl'
          : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md dark:shadow-2xl dark:shadow-black/70 hover:shadow-xl'
      }`}
    >
      {/* Note Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          {/* Class Tag Pill & Move Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentClass ? (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentClass.borderColor} ${currentClass.bgColor} ${currentClass.textColor}`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentClass.color }}
                />
                <span>{currentClass.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                General
              </span>
            )}

            {/* Quick Move between classes */}
            <div className="relative inline-flex items-center group">
              <label htmlFor={`move-select-${note.id}`} className="sr-only">Move note to class</label>
              <select
                id={`move-select-${note.id}`}
                value={note.classId}
                onChange={(e) => onMoveToClass(note.id, e.target.value)}
                className="text-[11px] py-0.5 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none cursor-pointer transition-colors"
                title="Move note to another class"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Move to {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note Metadata: Time & Duration */}
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 shrink-0">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formattedDate}</span>
            </span>
            {note.durationSeconds > 0 && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDuration(note.durationSeconds)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug">
          {note.title}
        </h3>

        {/* AI Detected Topics Badges */}
        {((note.detectedTopics && note.detectedTopics.length > 0) ||
          (note.summary?.detectedTopics && note.summary.detectedTopics.length > 0)) && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            <Tag className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
            {(note.detectedTopics?.length
              ? note.detectedTopics
              : note.summary?.detectedTopics || []
            ).map((topic, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Grammar Polish note preview if available */}
        {(note.grammarNotes || note.summary?.grammarNotes) && (
          <div className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Grammar Polish: </span>
            {note.grammarNotes || note.summary?.grammarNotes}
          </div>
        )}
      </div>

      {/* Audio Player (if recorded audio is present) */}
      {note.audioUrl && (
        <div className="px-5 pb-3">
          <AudioPlayer src={note.audioUrl} duration={note.durationSeconds} compact />
        </div>
      )}

      {/* Main Content: Transcript and AI Summary */}
      <div className="px-5 pb-4 space-y-4 flex-1">
        {/* Full Transcript Section */}
        <div className="rounded-xl bg-slate-100/90 dark:bg-slate-950 p-3.5 border border-slate-200/90 dark:border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Spoken Transcript
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(note.transcript, 'transcript')}
                className="text-[11px] font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy transcript text"
              >
                {copiedSection === 'transcript' ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {note.transcript.length > 200 && (
                <button
                  type="button"
                  onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {isTranscriptExpanded ? (
                    <>
                      <span>Collapse</span>
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>Read More</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <p
            className={`text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-normal ${
              !isTranscriptExpanded && note.transcript.length > 200 ? 'line-clamp-3' : ''
            }`}
          >
            {note.transcript}
          </p>
        </div>

        {/* AI Summarization Section */}
        {note.summary ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 p-4 space-y-3 shadow-xs">
            {/* AI Summary Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                <Sparkles className="h-4 w-4 text-zinc-800 dark:text-zinc-200" />
                <span>AI Structured Summary</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `${note.summary?.summary}\n\nKey Points:\n${note.summary?.keyPoints.map((p) => `- ${p}`).join('\n')}`,
                      'summary'
                    )
                  }
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedSection === 'summary' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSummarize(note)}
                  disabled={note.isSummarizing}
                  className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Re-generate AI summary"
                >
                  <RefreshCw className={`h-3 w-3 ${note.isSummarizing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Executive Overview */}
            <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
              {note.summary.summary}
            </p>

            {/* Key Bullet Points */}
            {note.summary.keyPoints && note.summary.keyPoints.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  <ListOrdered className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Key Points</span>
                </div>
                <ul className="space-y-1 pl-1">
                  {note.summary.keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-1.5 shrink-0" />
                      <span className="leading-snug">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items / Study Targets */}
            {note.summary.actionItems && note.summary.actionItems.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  <CheckSquare className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Action Items & Exam Topics</span>
                </div>
                <ul className="space-y-1 pl-1">
                  {note.summary.actionItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-white mt-1.5 shrink-0" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Tags */}
            {note.summary.tags && note.summary.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Tag className="h-3 w-3 text-zinc-400" />
                {note.summary.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Summarize CTA Banner */
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-800 dark:text-zinc-300">
              <Sparkles className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span>No AI summary yet. Generate structured bullet points with Gemini.</span>
            </div>
            <button
              id={`summarize-btn-${note.id}`}
              type="button"
              onClick={() => onSummarize(note)}
              disabled={note.isSummarizing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {note.isSummarizing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Summarizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Summarize Note</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error message if summarization failed */}
        {note.error && (
          <div className="flex items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            <div className="flex items-start gap-2 flex-1">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
              <span className="leading-snug">{note.error}</span>
            </div>
            <button
              type="button"
              onClick={() => onSummarize(note)}
              disabled={note.isSummarizing}
              className="shrink-0 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${note.isSummarizing ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-950 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Note</span>
          </button>

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={isSendingEmail}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Email this note transcript & summary via SMTP"
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                <span>Email Note</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenMailto}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-medium transition-colors cursor-pointer"
            title="Open note in your email app (Gmail, Outlook, Apple Mail)"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open in Mail App</span>
          </button>

          {emailStatusMsg && (
            <div
              className={`text-[11px] px-2.5 py-1 rounded-lg font-medium flex items-center gap-2 flex-wrap ${
                emailStatusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span>{emailStatusMsg.text}</span>
              {emailStatusMsg.type === 'error' && (
                <button
                  type="button"
                  onClick={handleOpenMailto}
                  className="underline hover:text-rose-900 dark:hover:text-rose-100 font-bold cursor-pointer ml-1"
                >
                  Open in Mail App
                </button>
              )}
              <button
                type="button"
                onClick={() => setEmailStatusMsg(null)}
                className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Delete button or confirmation */}
        <div>
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Delete?</span>
              <button
                type="button"
                onClick={() => onDelete(note.id)}
                className="px-2 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-2 py-1 rounded-md text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id={`delete-note-${note.id}`}
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Delete note"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

import React, { useState } from 'react';
import { Megaphone, Send, CheckCircle2, AlertCircle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { PlatformAnnouncement } from '../../types';

interface AdminAnnouncementsTabProps {
  announcement?: PlatformAnnouncement;
  isOwner: boolean;
  onSaveAnnouncement: (data: {
    message: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    active: boolean;
  }) => Promise<void>;
  saving: boolean;
}

export const AdminAnnouncementsTab: React.FC<AdminAnnouncementsTabProps> = ({
  announcement,
  isOwner,
  onSaveAnnouncement,
  saving,
}) => {
  const [message, setMessage] = useState(announcement?.message || '');
  const [type, setType] = useState<'info' | 'warning' | 'alert' | 'success'>(
    announcement?.type || 'info'
  );
  const [active, setActive] = useState(Boolean(announcement?.active));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    await onSaveAnnouncement({ message: message.trim(), type, active });
    setStatusMessage('Platform announcement broadcast updated successfully.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const getBadgeStyle = (t: string) => {
    switch (t) {
      case 'warning':
        return 'bg-amber-950/80 border-amber-800/80 text-amber-200';
      case 'alert':
        return 'bg-rose-950/80 border-rose-800/80 text-rose-200';
      case 'success':
        return 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200';
      default:
        return 'bg-purple-950/80 border-purple-800/80 text-purple-200';
    }
  };

  const getIcon = (t: string) => {
    switch (t) {
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />;
      case 'alert':
        return <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-purple-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-800/40 flex items-start gap-4">
        <div className="p-3 rounded-xl bg-purple-900/60 text-purple-300 border border-purple-700/60 shrink-0">
          <Megaphone className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">Global Platform Announcement</h3>
            {isOwner && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Owner Authority
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Broadcast important updates, scheduled maintenance notices, or study tips across all student sessions on Kairo OS.
            Active announcements render in real-time beneath the OS menu bar.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Broadcast Controls</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <span className={active ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {active ? 'Broadcast LIVE' : 'Broadcast Offline'}
            </span>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
            />
          </label>
        </div>

        {/* Severity Type Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">Notice Severity / Archetype</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['info', 'success', 'warning', 'alert'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 capitalize ${
                  type === t
                    ? getBadgeStyle(t) + ' ring-1 ring-white/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {getIcon(t)}
                <span>{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5">
            Announcement Message Content
          </label>
          <textarea
            rows={3}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g., Welcome scholars! Audio transcription pipeline has been updated with high-accuracy Gemini 2.5."
            className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none font-sans"
          />
        </div>

        {/* Live Preview Card */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Student Desktop Live Preview
          </label>
          <div
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${getBadgeStyle(
              type
            )} ${!active ? 'opacity-40 grayscale' : ''}`}
          >
            <div className="flex items-center gap-2.5">
              {getIcon(type)}
              <span className="font-medium">{message || 'Your announcement message preview will appear here...'}</span>
            </div>
            <span className="text-[10px] font-mono opacity-75 shrink-0">
              {active ? 'Broadcast: Active' : 'Draft / Inactive'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !message.trim()}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{saving ? 'Publishing Announcement...' : 'Publish to Students'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

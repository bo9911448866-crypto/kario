import { VoiceNote, EmailSettings } from '../types';

const EMAIL_SETTINGS_KEY = 'kairo_email_settings';

export const EmailService = {
  getEmailSettings(): EmailSettings {
    try {
      const raw = localStorage.getItem(EMAIL_SETTINGS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load email settings from localStorage', e);
    }
    return {
      recipientEmail: '',
      autoSendNotes: false,
    };
  },

  saveEmailSettings(settings: EmailSettings): void {
    try {
      localStorage.setItem(EMAIL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save email settings to localStorage', e);
    }
  },

  isAutoSendEnabled(): boolean {
    const settings = this.getEmailSettings();
    return Boolean(settings.autoSendNotes && settings.recipientEmail?.trim());
  },

  async sendTestEmail(
    toEmail: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const resp = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to send test email.',
        };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error connecting to email service.' };
    }
  },

  async sendNoteEmail(
    toEmail: string,
    note: VoiceNote,
    className?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const resp = await fetch('/api/email/send-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail,
          note,
          className,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to send note email.',
        };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error connecting to email service.' };
    }
  },

  // Formats note content cleanly into readable text for email body or clipboard
  formatNoteForEmailText(note: VoiceNote, className?: string): string {
    const lines: string[] = [];
    lines.push(`Title: ${note.title}`);
    lines.push(`Class: ${className || 'General'}`);
    lines.push(`Date: ${new Date(note.createdAt).toLocaleDateString()} ${new Date(note.createdAt).toLocaleTimeString()}`);
    lines.push('');

    if (note.summary) {
      lines.push('--- AI EXECUTIVE SUMMARY ---');
      lines.push(note.summary.summary);
      lines.push('');

      if (note.summary.keyPoints && note.summary.keyPoints.length > 0) {
        lines.push('--- KEY TAKEAWAYS ---');
        note.summary.keyPoints.forEach((pt, i) => lines.push(`${i + 1}. ${pt}`));
        lines.push('');
      }

      if (note.summary.actionItems && note.summary.actionItems.length > 0) {
        lines.push('--- ACTION ITEMS & STUDY GOALS ---');
        note.summary.actionItems.forEach((act) => lines.push(`[ ] ${act}`));
        lines.push('');
      }

      if (note.summary.tags && note.summary.tags.length > 0) {
        lines.push(`Tags: ${note.summary.tags.map((t) => `#${t}`).join(' ')}`);
        lines.push('');
      }
    }

    lines.push('--- FULL AUDIO TRANSCRIPT ---');
    lines.push(note.transcript || '(No transcript recorded)');
    lines.push('');
    lines.push('Generated with Kairo AI Voice Notes');

    return lines.join('\n');
  },

  // Generates a mailto: URL for instantaneous 1-click fallback dispatch
  generateMailtoUrl(toEmail: string, note: VoiceNote, className?: string): string {
    const subject = `[Kairo Note] ${note.title} (${className || 'General'})`;
    const body = this.formatNoteForEmailText(note, className);
    return `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },

  // Called automatically when a note is recorded or summarized if autoSendNotes is true
  async checkAutoSend(note: VoiceNote, className?: string): Promise<boolean> {
    const settings = this.getEmailSettings();
    if (!settings.autoSendNotes || !settings.recipientEmail || !settings.recipientEmail.includes('@')) {
      return false;
    }

    try {
      const result = await this.sendNoteEmail(settings.recipientEmail, note, className);
      if (result.success) {
        settings.lastSentAt = new Date().toISOString();
        this.saveEmailSettings(settings);
        return true;
      }
    } catch (e) {
      console.warn('Auto-send note email failed:', e);
    }
    return false;
  },
};

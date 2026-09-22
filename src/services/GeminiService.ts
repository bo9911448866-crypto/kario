import { GeminiApiStatus, NoteSummary } from '../types';
import { StorageService } from './StorageService';

function sanitizeErrorMessage(data: any, fallback: string): string {
  if (!data) return fallback;
  let raw = data.error || data.message || fallback;
  if (typeof raw === 'object' && raw !== null) {
    try {
      raw = raw.message || JSON.stringify(raw);
    } catch {
      raw = raw.message || String(raw) || fallback;
    }
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.error?.message) {
          raw = parsed.error.message;
        }
      } catch {
        // ignore
      }
    }
    if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
      return 'The Gemini AI model is temporarily experiencing high demand. Please try again in a few moments.';
    }
  }
  return String(raw);
}

export const GeminiService = {
  async checkStatus(): Promise<GeminiApiStatus> {
    const customKey = StorageService.getUserApiKey();
    if (customKey) {
      return { hasConfiguredKey: true, source: 'custom' };
    }

    try {
      const res = await fetch('/api/gemini/status');
      if (res.ok) {
        const data = await res.json();
        return {
          hasConfiguredKey: Boolean(data.hasConfiguredKey),
          source: data.hasConfiguredKey ? 'environment' : 'none',
        };
      }
    } catch (e) {
      console.warn('Could not check Gemini API status from server', e);
    }

    return { hasConfiguredKey: false, source: 'none' };
  },


  async analyzeNote(params: {
    text: string;
    classes: { id: string; name: string }[];
  }): Promise<{
    title: string;
    cleanedTranscript: string;
    classId: string | null;
    detectedTopics: string[];
    grammarNotes?: string;
  }> {
    const { text, classes } = params;

    if (!text || text.trim().length === 0) {
      throw new Error('Note text is empty. Cannot analyze.');
    }

    const customKey = StorageService.getUserApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customKey) {
      headers['x-gemini-api-key'] = customKey;
    }

    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        classes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.missingKey) {
        throw new Error(
          'Gemini API key is required. Please add your key in the settings panel.'
        );
      }
      const cleanError = sanitizeErrorMessage(data, 'Failed to analyze note with Gemini.');
      throw new Error(cleanError);
    }

    return {
      title: data.title,
      cleanedTranscript: data.cleanedTranscript,
      classId: data.classId,
      detectedTopics: Array.isArray(data.detectedTopics) ? data.detectedTopics : [],
      grammarNotes: data.grammarNotes || '',
    };
  },

  async summarizeNote(params: {
    text: string;
    title?: string;
    className?: string;
    classes?: { id: string; name: string }[];
  }): Promise<NoteSummary> {
    const { text, title, className, classes } = params;

    if (!text || text.trim().length === 0) {
      throw new Error('Note text is empty. Please record audio or add notes before summarizing.');
    }

    const customKey = StorageService.getUserApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (customKey) {
      headers['x-gemini-api-key'] = customKey;
    }

    const response = await fetch('/api/gemini/summarize', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        title,
        className,
        classes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.missingKey) {
        throw new Error(
          'Gemini API key is required. Please add your key in the settings panel or configure GEMINI_API_KEY.'
        );
      }
      const cleanError = sanitizeErrorMessage(data, 'Failed to summarize note with Gemini.');
      throw new Error(cleanError);
    }

    const result = data.data;
    return {
      summary: result.summary || 'Summary generated.',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      actionItems: Array.isArray(result.actionItems) ? result.actionItems : [],
      tags: Array.isArray(result.tags) ? result.tags : [className || 'General'],
      generatedAt: new Date().toISOString(),
      title: result.title,
      cleanedTranscript: result.cleanedTranscript,
      classId: result.classId,
      detectedTopics: Array.isArray(result.detectedTopics) ? result.detectedTopics : [],
      grammarNotes: result.grammarNotes || '',
    };
  },

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    const customKey = StorageService.getUserApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (customKey) {
      headers['x-gemini-api-key'] = customKey;
    }

    // Convert Blob to Base64
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const response = await fetch('/api/gemini/transcribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType: audioBlob.type || 'audio/webm',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const cleanError = sanitizeErrorMessage(data, 'Failed to transcribe audio.');
      throw new Error(cleanError);
    }

    return data.transcript || '';
  },

  async testApiKey(apiKey: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/gemini/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'API key validation failed.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error connecting to Gemini API.' };
    }
  },
};

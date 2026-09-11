import React, { useState, useEffect } from 'react';
import { X, Key, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, ExternalLink, Trash2 } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import { GeminiService } from '../services/GeminiService';
import { GeminiApiStatus } from '../types';

interface ApiKeyModalProps {
  status: GeminiApiStatus;
  onStatusUpdated: () => void;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  status,
  onStatusUpdated,
  onClose,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const hasCustomKey = Boolean(StorageService.getUserApiKey());

  useEffect(() => {
    setApiKeyInput(StorageService.getUserApiKey());
  }, []);

  const handleSave = () => {
    StorageService.saveUserApiKey(apiKeyInput.trim());
    onStatusUpdated();
    setTestResult({
      success: true,
      message: apiKeyInput.trim() ? 'Custom API key saved successfully.' : 'Custom API key removed.',
    });
  };

  const handleClearCustom = () => {
    StorageService.saveUserApiKey('');
    setApiKeyInput('');
    onStatusUpdated();
    setTestResult({
      success: true,
      message: 'Custom API key removed. Falling back to server environment.',
    });
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Temporarily save to test
      StorageService.saveUserApiKey(apiKeyInput.trim());

      const res = await GeminiService.summarizeNote({
        text: 'This is a test prompt to verify Gemini API key connection and structured summary capabilities.',
        title: 'Connection Test',
        className: 'System',
      });

      if (res && res.summary) {
        setTestResult({
          success: true,
          message: 'Connection successful! Gemini API is responding properly.',
        });
        onStatusUpdated();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Verification failed. Please check your API key.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      id="api-key-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="api-key-card"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Gemini API Key Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure AI summarization & transcription access
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
        <div className="p-6 space-y-4">
          {/* Active Status Badge */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Current Status:{' '}
                {status.hasConfiguredKey ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Connected & Ready</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">No Key Configured</span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                {status.source === 'environment' &&
                  'Using server environment variable (process.env.GEMINI_API_KEY).'}
                {status.source === 'custom' &&
                  'Using custom user key stored securely in local browser session.'}
                {status.source === 'none' &&
                  'Enter a Gemini API key below to enable AI summarization and transcription.'}
              </p>
            </div>
          </div>

          {/* Test Feedback Notice */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* API Key Input */}
          <div>
            <label
              htmlFor="gemini-key-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Custom Gemini API Key (Optional)
            </label>
            <input
              id="gemini-key-input"
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Your key is proxied through the backend server and never exposed directly.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            {hasCustomKey && (
              <button
                type="button"
                onClick={handleClearCustom}
                className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
                <span>Reset to Default</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Get Gemini API Key</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
            >
              Close
            </button>
            <button
              id="save-api-key-btn"
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

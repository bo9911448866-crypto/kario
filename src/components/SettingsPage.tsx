import React, { useState, useEffect } from 'react';
import {
  User,
  Cloud,
  Mail,
  Key,
  Palette,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogOut,
  Send,
  Eye,
  EyeOff,
  Shield,
  Sliders,
  Sparkles,
  Download,
  Upload,
  ArrowLeft,
  Lock,
  Inbox,
  Volume2,
  Flame,
  Film,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  CustomThemeConfig,
  PresetThemeId,
  UserAccount,
  EmailSettings,
  CloudSyncStatus,
  VoiceNote,
  ClassItem,
} from '../types';
import { THEME_PRESETS, CURATED_WALLPAPERS, CURATED_VIDEOS, AMBIENT_SOUNDSCAPES } from '../services/ThemePresets';
import { AuthService } from '../services/AuthService';
import { EmailService } from '../services/EmailService';
import { GeminiService } from '../services/GeminiService';
import { StorageService } from '../services/StorageService';

interface SettingsPageProps {
  themeConfig: CustomThemeConfig;
  onUpdateThemeConfig: (config: CustomThemeConfig) => void;
  notes: VoiceNote[];
  classes: ClassItem[];
  onNotesUpdated: (notes: VoiceNote[]) => void;
  onClassesUpdated: (classes: ClassItem[]) => void;
  onBackToWorkspace: () => void;
  defaultTab?: 'account' | 'email' | 'gemini' | 'themes';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  themeConfig,
  onUpdateThemeConfig,
  notes,
  classes,
  onNotesUpdated,
  onClassesUpdated,
  onBackToWorkspace,
  defaultTab = 'account',
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'email' | 'gemini' | 'themes'>(defaultTab);

  // Cloud Account State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(AuthService.getUser());
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(EmailService.getEmailSettings());
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailMessage, setTestEmailMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [emailSavedMessage, setEmailSavedMessage] = useState(false);

  // Gemini API Key State
  const [apiKeyInput, setApiKeyInput] = useState(StorageService.getUserApiKey() || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatusMessage, setKeyStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Backup & Restore
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check auth status on mount
    AuthService.getMe().then((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    if (authMode === 'register') {
      const res = await AuthService.register(authEmail, authPassword, authName);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setAuthSuccess('Account created successfully! Cloud backup is active.');
        // Automatically sync existing notes to cloud
        await AuthService.syncToCloud(notes, classes);
      } else {
        setAuthError(res.error || 'Failed to create account.');
      }
    } else {
      const res = await AuthService.login(authEmail, authPassword);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setAuthSuccess('Signed in successfully! Synced with your cloud account.');
        // If user had cloud data, offer or merge
        if (res.data?.notes && res.data.notes.length > 0) {
          onNotesUpdated(res.data.notes);
          StorageService.saveNotes(res.data.notes);
        }
        if (res.data?.classes && res.data.classes.length > 0) {
          onClassesUpdated(res.data.classes);
          StorageService.saveClasses(res.data.classes);
        }
      } else {
        setAuthError(res.error || 'Incorrect email or password.');
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setAuthSuccess('Signed out of cloud account. Your notes remain saved locally in this browser.');
    setTimeout(() => setAuthSuccess(null), 4000);
  };

  const handleManualCloudSync = async () => {
    if (!currentUser) {
      setSyncStatus('Please sign in or register to sync with the cloud.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    const res = await AuthService.syncToCloud(notes, classes, { themeConfig });
    setIsSyncing(false);

    if (res.success) {
      setSyncStatus(`All notes synced to cloud at ${new Date().toLocaleTimeString()}`);
    } else {
      setSyncStatus(res.error || 'Sync failed.');
    }
  };

  // Email Handlers
  const handleSaveEmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    EmailService.saveEmailSettings(emailSettings);
    setEmailSavedMessage(true);
    setTimeout(() => setEmailSavedMessage(false), 3000);
  };

  const handleSendTestEmail = async () => {
    if (!emailSettings.recipientEmail || !emailSettings.recipientEmail.includes('@')) {
      setTestEmailMessage({ type: 'error', text: 'Please enter a valid recipient email address first.' });
      return;
    }

    setTestEmailLoading(true);
    setTestEmailMessage(null);

    const res = await EmailService.sendTestEmail(emailSettings.recipientEmail);
    setTestEmailLoading(false);

    if (res.success) {
      setTestEmailMessage({
        type: 'success',
        text: `Test email successfully delivered to ${emailSettings.recipientEmail} from kaironotescompany@gmail.com! Please check your inbox.`,
      });
    } else {
      setTestEmailMessage({
        type: 'error',
        text: res.error || 'Failed to send test email. Please verify the email address.',
      });
    }
  };

  // Gemini API Key Handlers
  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      StorageService.removeUserApiKey();
      setKeyStatusMessage({ type: 'success', text: 'Custom key removed. Using default server configuration.' });
      setTimeout(() => setKeyStatusMessage(null), 3000);
      return;
    }

    setTestingKey(true);
    setKeyStatusMessage(null);

    const res = await GeminiService.testApiKey(trimmed);
    setTestingKey(false);

    if (res.success) {
      StorageService.saveUserApiKey(trimmed);
      setKeyStatusMessage({ type: 'success', text: 'Gemini API key verified and saved successfully!' });
    } else {
      setKeyStatusMessage({
        type: 'error',
        text: res.error || 'Invalid API key. Please check your key string and try again.',
      });
    }
  };

  // Export / Import
  const handleExportData = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      notes,
      classes,
      themeConfig,
      emailSettings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kairo-notes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.notes)) {
          onNotesUpdated(parsed.notes);
          StorageService.saveNotes(parsed.notes);
        }
        if (Array.isArray(parsed.classes)) {
          onClassesUpdated(parsed.classes);
          StorageService.saveClasses(parsed.classes);
        }
        setRestoreMessage(`Restored ${parsed.notes?.length || 0} notes and ${parsed.classes?.length || 0} classes!`);
        setTimeout(() => setRestoreMessage(null), 4000);
      } catch {
        setRestoreMessage('Failed to parse backup file. Please provide a valid JSON export.');
      }
    };
    reader.readAsText(file);
  };

  const handlePresetSelect = (presetId: PresetThemeId) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onUpdateThemeConfig({
        ...preset.config,
        customWallpaperUrl: themeConfig.customWallpaperUrl,
        liveVideoUrl: themeConfig.liveVideoUrl,
        liveAudioUrl: themeConfig.liveAudioUrl,
        contentScrimOpacity: preset.config.contentScrimOpacity ?? 0.85,
        cardStyle: 'solid',
      });
    }
  };

  return (
    <div className="min-h-screen pb-20 relative z-10">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0c0818]/95 backdrop-blur-md border-b border-slate-200 dark:border-purple-950/70 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToWorkspace}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/60 transition-colors flex items-center gap-1.5 text-sm font-semibold cursor-pointer"
              title="Return to voice notes workspace"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Notes</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-purple-950/80" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Settings & Preferences
            </h1>
          </div>

          {/* Cloud Account Quick Badge */}
          <div className="flex items-center gap-2 text-xs">
            {currentUser ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Connected: {currentUser.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-purple-950/40 border border-slate-200 dark:border-purple-900/40 text-slate-600 dark:text-slate-400 font-medium">
                <Cloud className="h-3.5 w-3.5" />
                <span>Local Mode (Guest)</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Settings Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <nav className="space-y-1.5 md:col-span-1">
            <button
              type="button"
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/80 dark:bg-[#120e24]/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-purple-950/60'
              }`}
            >
              <User className="h-4 w-4 shrink-0" />
              <span>Cloud Account & Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('email')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'email'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/80 dark:bg-[#120e24]/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-purple-950/60'
              }`}
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span>Email Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gemini')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'gemini'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/80 dark:bg-[#120e24]/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-purple-950/60'
              }`}
            >
              <Key className="h-4 w-4 shrink-0" />
              <span>Gemini API Key</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('themes')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left cursor-pointer ${
                activeTab === 'themes'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-white/80 dark:bg-[#120e24]/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-950/40 border border-slate-200/80 dark:border-purple-950/60'
              }`}
            >
              <Palette className="h-4 w-4 shrink-0" />
              <span>Themes & Readability</span>
            </button>
          </nav>

          {/* Tab Content Panel */}
          <div className="md:col-span-3 space-y-6">
            {/* ========================================================= */}
            {/* TAB 1: CLOUD ACCOUNT & SYNC                               */}
            {/* ========================================================= */}
            {activeTab === 'account' && (
              <div className="bg-white dark:bg-[#120e24] rounded-2xl border border-slate-200 dark:border-purple-950/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-purple-600" />
                    <span>Cloud-Based Account & Multi-Device Sync</span>
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Store and synchronize your lecture notes, transcripts, audio recordings, and study summaries across all devices.
                  </p>
                </div>

                {currentUser ? (
                  /* Logged-In User Profile Card */
                  <div className="space-y-6">
                    <div className="rounded-xl p-5 bg-purple-50/80 dark:bg-[#1a1435] border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                          {currentUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                            {currentUser.name}
                          </div>
                          <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                            {currentUser.email}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Member since {new Date(currentUser.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={handleManualCloudSync}
                          disabled={isSyncing}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>Sync Now</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-purple-950 hover:bg-slate-300 dark:hover:bg-purple-900/60 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>

                    {syncStatus && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#1a1435] border border-slate-200 dark:border-purple-950 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{syncStatus}</span>
                      </div>
                    )}

                    {/* Cloud Storage Statistics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-purple-950/70 bg-slate-50/70 dark:bg-[#150f2b]">
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{notes.length}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Total Notes in Cloud</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-purple-950/70 bg-slate-50/70 dark:bg-[#150f2b]">
                        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{classes.length}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Active Course Folders</div>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-purple-950/70 bg-slate-50/70 dark:bg-[#150f2b] col-span-2 sm:col-span-1">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <Check className="h-5 w-5" />
                          <span>Active</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Continuous Sync Engine</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Authentication Tabs: Sign In / Create Account */
                  <div className="space-y-5">
                    <div className="flex border-b border-slate-200 dark:border-purple-950/80">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setAuthError(null);
                        }}
                        className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                          authMode === 'login'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setAuthError(null);
                        }}
                        className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                          authMode === 'register'
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        Create Cloud Account
                      </button>
                    </div>

                    <form onSubmit={handleAuthSubmit} className="space-y-4 max-w-md">
                      {authMode === 'register' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Alex Rivera"
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="you@university.edu"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder="••••••••"
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">
                          Must be at least 6 characters
                        </span>
                      </div>

                      {authError && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{authError}</span>
                        </div>
                      )}

                      {authSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <Check className="h-4 w-4 shrink-0" />
                          <span>{authSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {authLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : authMode === 'register' ? (
                          <span>Create Cloud Account</span>
                        ) : (
                          <span>Sign In to Cloud</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* Local JSON Backup & Restore section */}
                <div className="pt-6 border-t border-slate-200 dark:border-purple-950/70">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Backup & Data Portability
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Download an offline JSON copy of all your notes, summaries, audio references, and classes anytime.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] hover:bg-slate-100 dark:hover:bg-purple-900/40 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download All Notes (JSON)</span>
                    </button>

                    <label className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] hover:bg-slate-100 dark:hover:bg-purple-900/40 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Restore from JSON File</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {restoreMessage && (
                    <div className="mt-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-xs text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
                      {restoreMessage}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: EMAIL DELIVERY & AUTOMATION                        */}
            {/* ========================================================= */}
            {activeTab === 'email' && (
              <div className="bg-white dark:bg-[#120e24] rounded-2xl border border-slate-200 dark:border-purple-950/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-purple-600" />
                    <span>Automated Email Delivery for Voice Notes</span>
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Receive your audio transcripts, AI key takeaways, action items, and study notes directly in your inbox.
                  </p>
                </div>

                {/* Sender Information Banner */}
                <div className="p-4 sm:p-5 rounded-xl bg-purple-50/70 dark:bg-[#16102f] border border-purple-200 dark:border-purple-900/60 flex items-start sm:items-center gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Sender Account:</span>
                      <span className="font-mono text-purple-700 dark:text-purple-300 font-semibold">kaironotescompany@gmail.com</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Emails are authenticated and routed automatically from this server account. Simply enter your email address below to receive notes.
                    </div>
                  </div>
                </div>

                {/* Email Preferences Form */}
                <form onSubmit={handleSaveEmailSettings} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Your Email Address (Where Notes Will Be Sent)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. yourname@gmail.com or student@college.edu"
                      value={emailSettings.recipientEmail || ''}
                      onChange={(e) =>
                        setEmailSettings({
                          ...emailSettings,
                          recipientEmail: e.target.value,
                        })
                      }
                      className="w-full sm:max-w-md px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-white dark:bg-[#150f29] text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Audio transcripts, summaries, key takeaways, and study notes will be delivered to this inbox.
                    </span>
                  </div>

                  {/* Delivery Mode Choice (Automatic vs Manual) */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                      Delivery Schedule & Automation
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                      {/* Option A: Automatic */}
                      <label
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          emailSettings.autoSendNotes
                            ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-purple-950/70 bg-slate-50/50 dark:bg-[#150f2b] hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="autoSend"
                          checked={emailSettings.autoSendNotes}
                          onChange={() =>
                            setEmailSettings({
                              ...emailSettings,
                              autoSendNotes: true,
                            })
                          }
                          className="mt-1 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Automatic Delivery
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            Automatically send each voice note to your inbox as soon as it is recorded or summarized.
                          </div>
                        </div>
                      </label>

                      {/* Option B: Manual */}
                      <label
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          !emailSettings.autoSendNotes
                            ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                            : 'border-slate-200 dark:border-purple-950/70 bg-slate-50/50 dark:bg-[#150f2b] hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="autoSend"
                          checked={!emailSettings.autoSendNotes}
                          onChange={() =>
                            setEmailSettings({
                              ...emailSettings,
                              autoSendNotes: false,
                            })
                          }
                          className="mt-1 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Manual Delivery Only
                          </div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                            Send notes on demand whenever you click the &ldquo;Email Note&rdquo; button on a card.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span>Save Email Preferences</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={testEmailLoading}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] hover:bg-slate-100 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {testEmailLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Sending Test...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Send Test Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {emailSavedMessage && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>Email settings saved successfully!</span>
                  </div>
                )}

                {testEmailMessage && (
                  <div
                    className={`p-4 rounded-xl text-xs space-y-2 ${
                      testEmailMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {testEmailMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      )}
                      <span className="leading-relaxed font-medium">{testEmailMessage.text}</span>
                    </div>
                  </div>
                )}

                {/* Instant 1-Click Alternative */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#150f2a] border border-slate-200 dark:border-purple-950/60 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    <span>Instant 1-Click Dispatch (Optional Mail Client)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    You can also click <strong>&ldquo;Open in Mail App&rdquo;</strong> on any voice note card to launch your system or phone&apos;s email client (Gmail, Apple Mail, Outlook) pre-filled with the title, summary, key points, and full transcript.
                  </p>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: GEMINI API KEY CONFIGURATION                       */}
            {/* ========================================================= */}
            {activeTab === 'gemini' && (
              <div className="bg-white dark:bg-[#120e24] rounded-2xl border border-slate-200 dark:border-purple-950/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Key className="h-5 w-5 text-purple-600" />
                    <span>Custom Gemini API Key</span>
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Provide your own Google Gemini API key to power lecture transcription and executive study summarization.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-[#16102f] border border-purple-200/80 dark:border-purple-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>Dual-Model Academic Engine</span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pl-4 list-disc">
                    <li><strong>Audio Transcription:</strong> Gemini 3.5 Transcribe with automatic retry across flash models.</li>
                    <li><strong>Academic Summarizer:</strong> Gemini 3.8 Flash producing structured bullet points, takeaways, and tags.</li>
                    <li><strong>Security:</strong> All requests are proxied server-side to protect keys from client exposure.</li>
                  </ul>
                </div>

                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Gemini API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="AIzaSy..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-purple-900/60 bg-slate-50 dark:bg-[#181330] text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={showApiKey ? 'Hide key' : 'Show key'}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Leave empty to use the system default key (if provisioned).
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      disabled={testingKey}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {testingKey ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Testing Key...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Test & Save Key</span>
                        </>
                      )}
                    </button>

                    {StorageService.getUserApiKey() && (
                      <button
                        type="button"
                        onClick={() => {
                          StorageService.removeUserApiKey();
                          setApiKeyInput('');
                          setKeyStatusMessage({ type: 'success', text: 'Custom key removed.' });
                          setTimeout(() => setKeyStatusMessage(null), 3000);
                        }}
                        className="px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Clear Key
                      </button>
                    )}
                  </div>

                  {keyStatusMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                        keyStatusMessage.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {keyStatusMessage.type === 'success' ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <span>{keyStatusMessage.text}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: THEMES & GUARANTEED READABILITY                    */}
            {/* ========================================================= */}
            {activeTab === 'themes' && (
              <div className="bg-white dark:bg-[#120e24] rounded-2xl border border-slate-200 dark:border-purple-950/80 p-6 sm:p-8 shadow-sm space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Palette className="h-5 w-5 text-purple-600" />
                    <span>Visual Themes & Readability Shield</span>
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Every theme is calibrated with high-contrast text and background scrims so you can always read your notes clearly.
                  </p>
                </div>

                {/* Readability Contrast Shield Slider */}
                <div className="p-5 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-[#181330] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Readability Contrast Shield
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                      {Math.round((themeConfig.contentScrimOpacity ?? 0.85) * 100)}% Contrast
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Controls background dimming behind note cards. Higher values guarantee absolute readability even over motion wallpapers.
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min="0.60"
                      max="0.98"
                      step="0.02"
                      value={themeConfig.contentScrimOpacity ?? 0.85}
                      onChange={(e) =>
                        onUpdateThemeConfig({
                          ...themeConfig,
                          contentScrimOpacity: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>

                  {/* Contrast Presets */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateThemeConfig({
                          ...themeConfig,
                          contentScrimOpacity: 0.95,
                          cardStyle: 'solid',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-purple-950 border border-slate-200 dark:border-purple-900 text-slate-700 dark:text-slate-200 hover:border-purple-500 cursor-pointer"
                    >
                      Ultra Contrast (95%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateThemeConfig({
                          ...themeConfig,
                          contentScrimOpacity: 0.85,
                          cardStyle: 'solid',
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-purple-950 border border-slate-200 dark:border-purple-900 text-slate-700 dark:text-slate-200 hover:border-purple-500 cursor-pointer"
                    >
                      Balanced Focus (85%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateThemeConfig({
                          ...themeConfig,
                          contentScrimOpacity: 0.70,
                        })
                      }
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-purple-950 border border-slate-200 dark:border-purple-900 text-slate-700 dark:text-slate-200 hover:border-purple-500 cursor-pointer"
                    >
                      Atmospheric (70%)
                    </button>
                  </div>
                </div>

                {/* Curated Theme Presets Gallery */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Theme Presets
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {THEME_PRESETS.map((preset) => {
                      const isSelected = themeConfig.presetId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetSelect(preset.id)}
                          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-500/20'
                              : 'border-slate-200 dark:border-purple-950/70 bg-slate-50/50 dark:bg-[#150f2b] hover:border-purple-300 dark:hover:border-purple-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-2">
                            {preset.previewColors.map((c, i) => (
                              <span
                                key={i}
                                className="h-3.5 w-3.5 rounded-full border border-black/10 dark:border-white/10"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                            <span>{preset.name}</span>
                            {isSelected && <Check className="h-3 w-3 text-purple-600" />}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {preset.tagline}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Video Loops */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-purple-950/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Film className="h-4 w-4 text-purple-600" />
                        <span>Ambient Motion Video Wallpapers</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Subtle background loops that run seamlessly behind your workspace
                      </p>
                    </div>
                    {themeConfig.liveVideoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateThemeConfig({
                            ...themeConfig,
                            liveVideoUrl: undefined,
                            presetId: 'custom',
                          })
                        }
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove Video
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {CURATED_VIDEOS.map((vid) => {
                      const isSelected = themeConfig.liveVideoUrl === vid.videoUrl;
                      return (
                        <button
                          key={vid.id}
                          type="button"
                          onClick={() =>
                            onUpdateThemeConfig({
                              ...themeConfig,
                              liveVideoUrl: vid.videoUrl,
                              contentScrimOpacity: Math.max(0.85, themeConfig.contentScrimOpacity ?? 0.85),
                              cardStyle: 'solid',
                              presetId: 'custom',
                            })
                          }
                          className={`rounded-xl overflow-hidden aspect-video border text-left relative transition-all cursor-pointer ${
                            isSelected
                              ? 'border-purple-600 ring-2 ring-purple-500/30'
                              : 'border-slate-200 dark:border-purple-950 hover:opacity-90'
                          }`}
                        >
                          <img
                            src={vid.thumbnail}
                            alt={vid.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                            <span className="text-[10px] font-semibold text-white leading-tight">
                              {vid.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

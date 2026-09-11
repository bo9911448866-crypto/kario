import React from 'react';
import {
  Mic,
  Moon,
  Sun,
  Key,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Palette,
  Settings,
  Cloud,
  FileText,
  User,
  Monitor,
} from 'lucide-react';
import { GeminiApiStatus, UserAccount } from '../types';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiStatus: GeminiApiStatus;
  onOpenApiKeyModal: () => void;
  onOpenRecorder: () => void;
  onReplayIntro?: () => void;
  isFireMode?: boolean;
  onToggleFireMode?: () => void;
  onOpenSettingsModal?: () => void;
  currentView?: 'workspace' | 'settings';
  onNavigateView?: (view: 'workspace' | 'settings') => void;
  user?: UserAccount | null;
  onToggleDesktopView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  apiStatus,
  onOpenApiKeyModal,
  onOpenRecorder,
  onReplayIntro,
  isFireMode = true,
  onToggleFireMode,
  onOpenSettingsModal,
  currentView = 'workspace',
  onNavigateView,
  user,
  onToggleDesktopView,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-purple-950/80 bg-white/95 dark:bg-[#0c0818]/95 backdrop-blur-md transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onReplayIntro}
            title="Kairo - Tap to replay dark purple fire intro"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-950 via-purple-700 to-violet-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40 group-hover:scale-105 group-active:scale-95 transition-transform">
              <Mic className="h-5 w-5 drop-shadow-[0_1px_4px_rgba(243,232,255,0.7)]" />
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-amber-300 text-slate-950 ring-1 ring-white/30">
                <Flame className="h-2.5 w-2.5 text-purple-950" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="bg-gradient-to-r from-purple-700 via-purple-600 to-violet-600 dark:from-purple-300 dark:via-violet-200 dark:to-fuchsia-300 bg-clip-text text-transparent">
                    Kairo
                  </span>
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
                  AI Voice Notes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block">
                Intelligent audio lectures, transcriptions, & study summaries
              </p>
            </div>
          </div>

          {/* View Switcher Tabs (Workspace vs Settings) */}
          {onNavigateView && (
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-purple-950/40 border border-slate-200/80 dark:border-purple-900/40 ml-2">
              <button
                type="button"
                onClick={() => onNavigateView('workspace')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'workspace'
                    ? 'bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Notes</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateView('settings')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'settings'
                    ? 'bg-white dark:bg-purple-900 text-purple-700 dark:text-purple-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </button>
              {onToggleDesktopView && (
                <button
                  type="button"
                  onClick={onToggleDesktopView}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-purple-600 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-all cursor-pointer"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Desktop OS</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cloud Account Badge / Link */}
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('settings')}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                user
                  ? 'border-emerald-200 dark:border-emerald-900/80 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70'
                  : 'border-slate-200 dark:border-purple-950 bg-slate-50 dark:bg-purple-950/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
              title={user ? `Signed in as ${user.email}` : 'Sign in to cloud account'}
            >
              {user ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[110px]">{user.name}</span>
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Cloud Sync</span>
                </>
              )}
            </button>
          )}

          {/* Settings Page Button (Mobile & Desktop) */}
          {onNavigateView && (
            <button
              id="header-settings-btn"
              type="button"
              onClick={() => onNavigateView(currentView === 'settings' ? 'workspace' : 'settings')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'settings'
                  ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                  : 'border-slate-200 dark:border-purple-950 bg-slate-50 dark:bg-[#181330] text-slate-700 dark:text-slate-300 hover:border-purple-400 hover:text-purple-600'
              }`}
              title="Open Settings Page (Accounts, Emails, API Keys, Themes)"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* Dark Purple Fire Toggle */}
          {onToggleFireMode && (
            <button
              id="fire-mode-toggle-btn"
              type="button"
              onClick={onToggleFireMode}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                isFireMode
                  ? 'border-purple-400/80 bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 shadow-sm shadow-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-purple-500'
              }`}
              title={isFireMode ? 'Dark Purple Fire: Active (Tap to disable)' : 'Enable Dark Purple Fire effect'}
              aria-label="Toggle dark purple fire effect"
            >
              <Flame className={`h-4 w-4 ${isFireMode ? 'text-purple-600 dark:text-purple-400 fill-purple-400/30 animate-pulse' : ''}`} />
            </button>
          )}

          {/* API Key Status Pill */}
          <button
            id="api-key-status-btn"
            type="button"
            onClick={onOpenApiKeyModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              apiStatus.hasConfiguredKey
                ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70'
                : 'border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100/70'
            }`}
            title="Configure Gemini API Key"
          >
            {apiStatus.hasConfiguredKey ? (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            )}
            <span className="hidden lg:inline">
              {apiStatus.hasConfiguredKey ? 'Gemini AI Active' : 'Configure API Key'}
            </span>
            <span className="lg:hidden">
              <Key className="h-3.5 w-3.5" />
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Record Button CTA */}
          <button
            id="header-record-btn"
            type="button"
            onClick={onOpenRecorder}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="h-4 w-4" />
            <span>Record</span>
          </button>
        </div>
      </div>
    </header>
  );
};

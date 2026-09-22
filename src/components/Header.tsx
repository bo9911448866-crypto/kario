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
      className="sticky top-0 z-30 w-full border-b border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-md transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onReplayIntro}
            title="Kairo - Intelligent voice notes & study summaries"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-md ring-1 ring-zinc-700/40 group-hover:scale-105 group-active:scale-95 transition-transform">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Kairo</span>
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                  AI Voice Notes
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 hidden lg:block">
                Intelligent audio lectures, transcriptions, & study summaries
              </p>
            </div>
          </div>

          {/* View Switcher Tabs (Workspace vs Settings) */}
          {onNavigateView && (
            <div className="hidden sm:flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 ml-2">
              <button
                type="button"
                onClick={() => onNavigateView('workspace')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'workspace'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
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
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </button>
              {onToggleDesktopView && (
                <button
                  type="button"
                  onClick={onToggleDesktopView}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all cursor-pointer"
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
                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100'
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
                  ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                  : 'border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-zinc-400'
              }`}
              title="Open Settings Page (Accounts, Emails, API Keys, Themes)"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-zinc-100" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Record Button CTA */}
          <button
            id="header-record-btn"
            type="button"
            onClick={onOpenRecorder}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Mic className="h-4 w-4" />
            <span>Record</span>
          </button>
        </div>
      </div>
    </header>
  );
};

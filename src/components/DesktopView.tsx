import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  Mic,
  FileText,
  Settings,
  Shield,
  ShieldCheck,
  Music,
  Lock,
  Search,
  Plus,
  Monitor,
  Flame,
  User,
  LogOut,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react';
import {
  ClassItem,
  VoiceNote,
  CustomThemeConfig,
  UserAccount,
  GeminiApiStatus,
} from '../types';
import { DesktopWindowFrame } from './DesktopWindowFrame';
import { ClassFolderWindow } from './ClassFolderWindow';
import { SettingsPage } from './SettingsPage';
import { AdminDashboardModal } from './AdminDashboardModal';
import { NoteCard } from './NoteCard';
import { AmbientAudioBar } from './AmbientAudioBar';
import { AdminService } from '../services/AdminService';

interface DesktopViewProps {
  classes: ClassItem[];
  notes: VoiceNote[];
  themeConfig: CustomThemeConfig;
  onUpdateThemeConfig: React.Dispatch<React.SetStateAction<CustomThemeConfig>>;
  currentUser: UserAccount | null;
  apiStatus: GeminiApiStatus;
  onOpenRecorder: (defaultClassId?: string) => void;
  onOpenClassModal: (classToEdit?: ClassItem) => void;
  onDeleteClass: (classId: string) => void;
  onSummarizeNote: (note: VoiceNote) => void;
  onDeleteNote: (id: string) => void;
  onMoveNoteToClass: (noteId: string, targetClassId: string) => void;
  onEditNote: (note: VoiceNote) => void;
  onLockDesktop: () => void;
  onLogout: () => void;
  onToggleClassicMode: () => void;
  isAdminUnlocked: boolean;
  onOpenAdminModal: () => void;
  onNotesUpdated: (notes: VoiceNote[]) => void;
  onClassesUpdated: (classes: ClassItem[]) => void;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  classes,
  notes,
  themeConfig,
  onUpdateThemeConfig,
  currentUser,
  apiStatus,
  onOpenRecorder,
  onOpenClassModal,
  onDeleteClass,
  onSummarizeNote,
  onDeleteNote,
  onMoveNoteToClass,
  onEditNote,
  onLockDesktop,
  onLogout,
  onToggleClassicMode,
  isAdminUnlocked,
  onOpenAdminModal,
  onNotesUpdated,
  onClassesUpdated,
}) => {
  // Top bar live clock
  const [clockTime, setClockTime] = useState('');
  const [clockDate, setClockDate] = useState('');

  // Active Windows state
  // Window IDs:
  // - 'settings'
  // - 'all-notes'
  // - 'ambient'
  // - 'admin'
  // - 'class-folder-<classId>'
  const [openWindows, setOpenWindows] = useState<{
    [id: string]: {
      isOpen: boolean;
      isMinimized: boolean;
      isMaximized: boolean;
      zIndex: number;
    };
  }>({});

  const [topZIndex, setTopZIndex] = useState(10);
  const [selectedFolderClass, setSelectedFolderClass] = useState<ClassItem | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isKairoMenuOpen, setIsKairoMenuOpen] = useState(false);
  const [allNotesSearch, setAllNotesSearch] = useState('');

  // Passkey prompt for Admin App if not already unlocked
  const [showAdminKeyPrompt, setShowAdminKeyPrompt] = useState(false);
  const [adminPasskeyInput, setAdminPasskeyInput] = useState('');
  const [adminKeyError, setAdminKeyError] = useState<string | null>(null);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setClockDate(
        now.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const bringToFront = (id: string) => {
    const nextZ = topZIndex + 1;
    setTopZIndex(nextZ);
    setOpenWindows((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { isOpen: true, isMinimized: false, isMaximized: false }),
        isOpen: true,
        isMinimized: false,
        zIndex: nextZ,
      },
    }));
  };

  const openWindow = (id: string) => {
    bringToFront(id);
  };

  const closeWindow = (id: string) => {
    setOpenWindows((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { isMinimized: false, isMaximized: false, zIndex: 1 }),
        isOpen: false,
      },
    }));
  };

  const minimizeWindow = (id: string) => {
    setOpenWindows((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { isOpen: true, isMaximized: false, zIndex: 1 }),
        isMinimized: true,
      },
    }));
  };

  const toggleMaximizeWindow = (id: string) => {
    setOpenWindows((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { isOpen: true, isMinimized: false, zIndex: 1 }),
        isMaximized: !prev[id]?.isMaximized,
      },
    }));
  };

  const handleOpenClassFolder = (classItem: ClassItem) => {
    setSelectedFolderClass(classItem);
    const windowId = `class-folder-${classItem.id}`;
    openWindow(windowId);
  };

  const handleAdminAppClick = () => {
    if (isAdminUnlocked || AdminService.getSavedKey()) {
      onOpenAdminModal();
    } else {
      setShowAdminKeyPrompt(true);
    }
  };

  const handleVerifyPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasskeyInput.trim()) return;

    setIsVerifyingAdmin(true);
    setAdminKeyError(null);

    const result = await AdminService.verifyKey(adminPasskeyInput.trim());
    setIsVerifyingAdmin(false);

    if (result.success) {
      AdminService.saveKey(adminPasskeyInput.trim());
      setShowAdminKeyPrompt(false);
      setAdminPasskeyInput('');
      onOpenAdminModal();
    } else {
      setAdminKeyError(result.error || 'Invalid Admin Passkey.');
    }
  };

  // Filter notes for All Notes window
  const filteredAllNotes = notes.filter((n) => {
    if (!allNotesSearch.trim()) return true;
    const q = allNotesSearch.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.transcript.toLowerCase().includes(q) ||
      n.summary?.summary.toLowerCase().includes(q) ||
      n.summary?.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col select-none">
      {/* 1. TOP OS MENU BAR */}
      <header className="h-8 w-full bg-slate-900/80 dark:bg-[#070312]/85 backdrop-blur-md border-b border-purple-900/40 text-purple-100 flex items-center justify-between px-3 text-xs z-40 select-none">
        {/* Left: Apple/Kairo Menu & Navigation */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsKairoMenuOpen(!isKairoMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-purple-800/40 transition-colors font-bold cursor-pointer"
            >
              <Flame className="h-3.5 w-3.5 text-purple-400" />
              <span className="font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-violet-200 to-fuchsia-300 bg-clip-text text-transparent">
                Kairo
              </span>
            </button>

            {/* Dropdown Menu */}
            {isKairoMenuOpen && (
              <div
                className="absolute left-0 mt-1 w-52 py-1.5 rounded-xl bg-[#140e2b]/95 border border-purple-900/80 shadow-2xl backdrop-blur-xl z-50 text-xs"
                onClick={() => setIsKairoMenuOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-purple-950/60 font-semibold text-purple-200">
                  Kairo OS v2.5 Desktop
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRecorder()}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5 text-purple-400" />
                  <span>New Voice Recording</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenClassModal()}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5 text-purple-400" />
                  <span>New Class Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => openWindow('settings')}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-purple-400" />
                  <span>System Settings</span>
                </button>
                <div className="my-1 border-t border-purple-950/60" />
                <button
                  type="button"
                  onClick={onToggleClassicMode}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <Monitor className="h-3.5 w-3.5 text-purple-400" />
                  <span>Switch to Classic View</span>
                </button>
                <button
                  type="button"
                  onClick={onLockDesktop}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5 text-purple-400" />
                  <span>Lock Desktop</span>
                </button>
              </div>
            )}
          </div>

          {/* Contextual App Menu Items */}
          <div className="hidden sm:flex items-center gap-2 text-purple-300/80 text-[11px]">
            <button
              type="button"
              onClick={() => openWindow('all-notes')}
              className="px-2 py-0.5 rounded hover:bg-purple-800/30 transition-colors cursor-pointer"
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => openWindow('settings')}
              className="px-2 py-0.5 rounded hover:bg-purple-800/30 transition-colors cursor-pointer"
            >
              Preferences
            </button>
            <button
              type="button"
              onClick={() => openWindow('ambient')}
              className="px-2 py-0.5 rounded hover:bg-purple-800/30 transition-colors cursor-pointer"
            >
              Soundscapes
            </button>
          </div>
        </div>

        {/* Right: Status Icons, Clock & User Avatar */}
        <div className="flex items-center gap-3 text-xs">
          {/* Audio soundscape playing badge */}
          {themeConfig.isAudioPlaying && (
            <button
              type="button"
              onClick={() => openWindow('ambient')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-700/50 text-purple-200 text-[10px] animate-pulse cursor-pointer"
            >
              <Volume2 className="h-3 w-3 text-purple-300" />
              <span className="hidden md:inline">Playing Soundscape</span>
            </button>
          )}

          {/* Admin badge if unlocked */}
          {(isAdminUnlocked || AdminService.getSavedKey()) && (
            <button
              type="button"
              onClick={onOpenAdminModal}
              title="Master Admin Portal"
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-900/60 border border-purple-500/50 text-purple-300 text-[10px] font-semibold cursor-pointer hover:bg-purple-800/60"
            >
              <Shield className="h-3 w-3 text-purple-400" />
              <span>Admin</span>
            </button>
          )}

          {/* Classic View Toggle */}
          <button
            type="button"
            onClick={onToggleClassicMode}
            title="Switch to Classic View"
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-purple-800/40 text-purple-300 text-[11px] cursor-pointer"
          >
            <Monitor className="h-3 w-3" />
            <span className="hidden sm:inline">Classic</span>
          </button>

          {/* Live Clock & Date */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-purple-200">
            <span className="hidden md:inline text-purple-400">{clockDate}</span>
            <span>{clockTime}</span>
          </div>

          {/* User Profile Pill / Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 transition-colors cursor-pointer"
            >
              <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'G'}
              </div>
              <span className="text-[11px] text-purple-200 max-w-[80px] truncate">
                {currentUser?.name || 'Guest'}
              </span>
            </button>

            {/* User Dropdown */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 py-1.5 rounded-xl bg-[#140e2b]/95 border border-purple-900/80 shadow-2xl backdrop-blur-xl z-50 text-xs"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-purple-950/60">
                  <p className="font-semibold text-white">{currentUser?.name || 'Guest User'}</p>
                  <p className="text-[10px] text-purple-400 truncate">
                    {currentUser?.email || 'Local Offline Mode'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openWindow('settings')}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5 text-purple-400" />
                  <span>Cloud Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={onLockDesktop}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-800/40 text-purple-100 flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5 text-purple-400" />
                  <span>Lock Desktop</span>
                </button>
                {currentUser && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-300 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. DESKTOP WORKSPACE (WALLPAPER & DESKTOP ICONS GRID) */}
      <main
        className="flex-1 w-full relative overflow-hidden p-6 sm:p-8"
        onClick={() => {
          setIsKairoMenuOpen(false);
          setIsUserMenuOpen(false);
        }}
      >
        {/* Desktop Icons Grid */}
        <div className="grid grid-flow-col auto-cols-[90px] sm:auto-cols-[100px] grid-rows-[repeat(auto-fill,105px)] gap-y-4 gap-x-2 w-max max-w-full h-full overflow-y-auto z-10 relative select-none">
          {/* 1. Core App: Voice Recorder */}
          <div
            onClick={() => onOpenRecorder()}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title="Double-click to open Voice Recorder"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-700 via-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-900/40 group-hover:scale-105 group-hover:shadow-purple-600/50 transition-all flex items-center justify-center text-white">
              <Mic className="h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-white group-hover:text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Recorder
            </span>
          </div>

          {/* 2. Core App: All Notes Explorer */}
          <div
            onClick={() => openWindow('all-notes')}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title="All Notes & Transcripts"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-indigo-900/40 group-hover:scale-105 transition-all flex items-center justify-center text-white">
              <FileText className="h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-white group-hover:text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              All Notes
            </span>
          </div>

          {/* 3. Core App: Settings */}
          <div
            onClick={() => openWindow('settings')}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title="System Preferences & Cloud Settings"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-slate-700 via-slate-600 to-zinc-500 p-0.5 shadow-lg shadow-slate-900/40 group-hover:scale-105 transition-all flex items-center justify-center text-white">
              <Settings className="h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-white group-hover:text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Settings
            </span>
          </div>

          {/* 4. Core App: Ambient Soundscapes */}
          <div
            onClick={() => openWindow('ambient')}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title="Study Audio & Ambient Sounds"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-fuchsia-700 via-fuchsia-600 to-rose-500 p-0.5 shadow-lg shadow-fuchsia-900/40 group-hover:scale-105 transition-all flex items-center justify-center text-white">
              <Music className="h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-white group-hover:text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Soundscapes
            </span>
          </div>

          {/* 5. Core App: Master Admin Portal App */}
          <div
            onClick={handleAdminAppClick}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title={
              isAdminUnlocked || AdminService.getSavedKey()
                ? 'Master Admin Dashboard'
                : 'Click to authenticate Admin Portal'
            }
          >
            <div
              className={`w-13 h-13 rounded-2xl p-0.5 shadow-lg group-hover:scale-105 transition-all flex items-center justify-center text-white relative ${
                isAdminUnlocked || AdminService.getSavedKey()
                  ? 'bg-gradient-to-tr from-purple-800 via-violet-600 to-amber-400 shadow-purple-600/50 ring-2 ring-purple-400/50'
                  : 'bg-gradient-to-tr from-slate-800 via-purple-950 to-slate-900 border border-purple-900/60 shadow-black/40'
              }`}
            >
              <Shield className="h-6 w-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
              {!(isAdminUnlocked || AdminService.getSavedKey()) && (
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-purple-950 border border-purple-600 text-purple-300">
                  <Lock className="h-2.5 w-2.5" />
                </div>
              )}
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-white group-hover:text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Admin Portal
            </span>
          </div>

          {/* 6. CLASS FOLDERS ON DESKTOP */}
          {classes.map((classItem) => {
            const count = notes.filter((n) => n.classId === classItem.id).length;
            return (
              <div
                key={classItem.id}
                onClick={() => handleOpenClassFolder(classItem)}
                className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
                title={`Open Folder: ${classItem.name} (${count} notes)`}
              >
                {/* Desktop Folder Graphic */}
                <div className="relative w-13 h-13 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Folder
                    className="h-12 w-12 drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] transition-colors"
                    style={{
                      color: classItem.color || '#a855f7',
                      fill: classItem.color ? `${classItem.color}33` : '#a855f733',
                    }}
                  />
                  {/* Note count badge */}
                  <span className="absolute bottom-1 right-0 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-950/80 text-white border border-white/20 shadow-xs">
                    {count}
                  </span>
                </div>
                {/* Folder Title */}
                <span className="mt-1.5 text-[11px] font-semibold text-white group-hover:text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] max-w-full break-words">
                  {classItem.name}
                </span>
              </div>
            );
          })}

          {/* 7. Shortcut: New Class Folder */}
          <div
            onClick={() => onOpenClassModal()}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title="Create a new class folder on desktop"
          >
            <div className="w-13 h-13 rounded-2xl border-2 border-dashed border-purple-400/60 hover:border-purple-300 bg-purple-950/20 hover:bg-purple-950/40 p-0.5 group-hover:scale-105 transition-all flex items-center justify-center text-purple-300">
              <FolderPlus className="h-6 w-6" />
            </div>
            <span className="mt-1.5 text-[11px] font-medium text-purple-200 tracking-tight line-clamp-2 px-1 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              + New Folder
            </span>
          </div>
        </div>

        {/* 3. WINDOWS (CLASS FOLDER, SETTINGS, ALL NOTES, AMBIENT, ADMIN) */}

        {/* Dynamic Class Folder Windows */}
        {classes.map((classItem) => {
          const windowId = `class-folder-${classItem.id}`;
          const win = openWindows[windowId];
          return (
            <DesktopWindowFrame
              key={classItem.id}
              id={windowId}
              title={`Class Folder: ${classItem.name}`}
              icon={
                <span
                  className="h-2.5 w-2.5 rounded-full inline-block mr-1"
                  style={{ backgroundColor: classItem.color }}
                />
              }
              isOpen={Boolean(win?.isOpen)}
              isMinimized={Boolean(win?.isMinimized)}
              isMaximized={Boolean(win?.isMaximized)}
              zIndex={win?.zIndex || 10}
              onClose={() => closeWindow(windowId)}
              onMinimize={() => minimizeWindow(windowId)}
              onToggleMaximize={() => toggleMaximizeWindow(windowId)}
              onFocus={() => bringToFront(windowId)}
            >
              <ClassFolderWindow
                classItem={classItem}
                notes={notes}
                allClasses={classes}
                onOpenRecorderWithClass={(classId) => {
                  onOpenRecorder(classId);
                }}
                onEditClass={onOpenClassModal}
                onDeleteClass={(id) => {
                  closeWindow(windowId);
                  onDeleteClass(id);
                }}
                onSummarizeNote={onSummarizeNote}
                onDeleteNote={onDeleteNote}
                onMoveNoteToClass={onMoveNoteToClass}
                onEditNote={onEditNote}
                onOpenSettings={() => openWindow('settings')}
              />
            </DesktopWindowFrame>
          );
        })}

        {/* Settings App Window */}
        {openWindows['settings'] && (
          <DesktopWindowFrame
            id="settings"
            title="System Settings & Preferences"
            icon={<Settings className="h-3.5 w-3.5 text-purple-400" />}
            isOpen={Boolean(openWindows['settings'].isOpen)}
            isMinimized={Boolean(openWindows['settings'].isMinimized)}
            isMaximized={Boolean(openWindows['settings'].isMaximized)}
            zIndex={openWindows['settings'].zIndex || 15}
            onClose={() => closeWindow('settings')}
            onMinimize={() => minimizeWindow('settings')}
            onToggleMaximize={() => toggleMaximizeWindow('settings')}
            onFocus={() => bringToFront('settings')}
          >
            <div className="flex-1 overflow-y-auto">
              <SettingsPage
                themeConfig={themeConfig}
                onUpdateThemeConfig={onUpdateThemeConfig}
                notes={notes}
                classes={classes}
                onNotesUpdated={onNotesUpdated}
                onClassesUpdated={onClassesUpdated}
                onBackToWorkspace={() => closeWindow('settings')}
                defaultTab="account"
                onOpenAdmin={onOpenAdminModal}
              />
            </div>
          </DesktopWindowFrame>
        )}

        {/* All Notes Window */}
        {openWindows['all-notes'] && (
          <DesktopWindowFrame
            id="all-notes"
            title="Notes Library & Study Summaries"
            icon={<FileText className="h-3.5 w-3.5 text-indigo-400" />}
            isOpen={Boolean(openWindows['all-notes'].isOpen)}
            isMinimized={Boolean(openWindows['all-notes'].isMinimized)}
            isMaximized={Boolean(openWindows['all-notes'].isMaximized)}
            zIndex={openWindows['all-notes'].zIndex || 15}
            onClose={() => closeWindow('all-notes')}
            onMinimize={() => minimizeWindow('all-notes')}
            onToggleMaximize={() => toggleMaximizeWindow('all-notes')}
            onFocus={() => bringToFront('all-notes')}
          >
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-[#0c0818]/60">
              <div className="p-4 border-b border-slate-200 dark:border-purple-950/80 bg-white/70 dark:bg-[#110b24]/70 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={allNotesSearch}
                    onChange={(e) => setAllNotesSearch(e.target.value)}
                    placeholder="Search all notes, transcripts, and summaries..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#150f2b] border border-slate-200 dark:border-purple-900/50 text-slate-800 dark:text-purple-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRecorder()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Record Note</span>
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {filteredAllNotes.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                    <FileText className="h-8 w-8 text-purple-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-purple-200">
                      No notes found
                    </p>
                    <p className="text-xs text-slate-500 dark:text-purple-400/70">
                      Click 'Record Note' to capture your first audio lecture.
                    </p>
                  </div>
                ) : (
                  filteredAllNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      classes={classes}
                      currentClass={classes.find((c) => c.id === note.classId)}
                      onSummarize={onSummarizeNote}
                      onDelete={onDeleteNote}
                      onMoveToClass={onMoveNoteToClass}
                      onEdit={onEditNote}
                      cardStyle="solid"
                      onOpenSettings={() => openWindow('settings')}
                    />
                  ))
                )}
              </div>
            </div>
          </DesktopWindowFrame>
        )}

        {/* Ambient Soundscapes Window */}
        {openWindows['ambient'] && (
          <DesktopWindowFrame
            id="ambient"
            title="Ambient Soundscapes & Study Audio"
            icon={<Music className="h-3.5 w-3.5 text-fuchsia-400" />}
            isOpen={Boolean(openWindows['ambient'].isOpen)}
            isMinimized={Boolean(openWindows['ambient'].isMinimized)}
            isMaximized={Boolean(openWindows['ambient'].isMaximized)}
            zIndex={openWindows['ambient'].zIndex || 15}
            onClose={() => closeWindow('ambient')}
            onMinimize={() => minimizeWindow('ambient')}
            onToggleMaximize={() => toggleMaximizeWindow('ambient')}
            onFocus={() => bringToFront('ambient')}
            maxWidth="max-w-2xl"
            height="h-auto max-h-[85vh]"
          >
            <div className="p-6 overflow-y-auto space-y-4">
              <AmbientAudioBar
                config={themeConfig}
                onUpdateConfig={onUpdateThemeConfig}
                onOpenSettings={() => openWindow('settings')}
                isZenMode={Boolean(themeConfig.zenMode)}
                onToggleZenMode={() =>
                  onUpdateThemeConfig((prev) => ({ ...prev, zenMode: !prev.zenMode }))
                }
              />
            </div>
          </DesktopWindowFrame>
        )}
      </main>

      {/* 4. PASSKEY UNLOCK MODAL (IF USER CLICKS ADMIN APP WITHOUT KEY) */}
      {showAdminKeyPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-[#140e2b] border border-purple-900 shadow-2xl space-y-4 text-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-950 border border-purple-700 text-purple-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Unlock Admin Portal</h3>
                <p className="text-[11px] text-purple-300/80">Enter Master Passkey</p>
              </div>
            </div>

            {adminKeyError && (
              <p className="text-xs text-rose-300 p-2 rounded-lg bg-rose-950/60 border border-rose-900">
                {adminKeyError}
              </p>
            )}

            <form onSubmit={handleVerifyPasskey} className="space-y-3">
              <input
                type="password"
                required
                autoFocus
                value={adminPasskeyInput}
                onChange={(e) => setAdminPasskeyInput(e.target.value)}
                placeholder="Enter admin passkey..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-purple-950/50 border border-purple-900 text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminKeyPrompt(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-purple-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingAdmin}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isVerifyingAdmin ? 'Verifying...' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. BOTTOM DESKTOP DOCK (macOS Style Floating Glass Dock) */}
      <footer className="h-16 w-full flex items-center justify-center p-2 z-30 shrink-0 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/80 dark:bg-[#0e0821]/80 border border-purple-900/60 shadow-2xl backdrop-blur-xl">
          {/* Recorder */}
          <button
            type="button"
            onClick={() => onOpenRecorder()}
            title="Voice Recorder"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <Mic className="h-5 w-5 text-purple-300" />
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Record Lecture
            </span>
          </button>

          {/* All Notes */}
          <button
            type="button"
            onClick={() => openWindow('all-notes')}
            title="All Notes"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <FileText className="h-5 w-5 text-indigo-300" />
            {openWindows['all-notes']?.isOpen && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-400" />
            )}
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Notes Library
            </span>
          </button>

          {/* New Class Folder */}
          <button
            type="button"
            onClick={() => onOpenClassModal()}
            title="New Class Folder"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <FolderPlus className="h-5 w-5 text-purple-300" />
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              New Folder
            </span>
          </button>

          {/* Soundscapes */}
          <button
            type="button"
            onClick={() => openWindow('ambient')}
            title="Soundscapes"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <Music className="h-5 w-5 text-fuchsia-300" />
            {openWindows['ambient']?.isOpen && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-fuchsia-400" />
            )}
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Soundscapes
            </span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => openWindow('settings')}
            title="Settings"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <Settings className="h-5 w-5 text-slate-300" />
            {openWindows['settings']?.isOpen && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-purple-400" />
            )}
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Settings App
            </span>
          </button>

          {/* Admin App */}
          <button
            type="button"
            onClick={handleAdminAppClick}
            title="Master Admin Portal"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <Shield
              className={`h-5 w-5 ${
                isAdminUnlocked || AdminService.getSavedKey()
                  ? 'text-amber-400 animate-pulse'
                  : 'text-purple-400'
              }`}
            />
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Master Admin
            </span>
          </button>

          <div className="w-px h-6 bg-purple-900/60 mx-1" />

          {/* Lock Desktop */}
          <button
            type="button"
            onClick={onLockDesktop}
            title="Lock Desktop"
            className="p-2.5 rounded-xl hover:bg-purple-800/40 text-purple-300 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer relative group"
          >
            <Lock className="h-4 w-4" />
            <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Lock Desktop
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
};

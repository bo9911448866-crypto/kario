import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  PlatformAnnouncement,
  MaintenanceModeConfig,
} from '../types';
import { DesktopWindowFrame } from './DesktopWindowFrame';
import { ClassFolderWindow } from './ClassFolderWindow';
import { SettingsPage } from './SettingsPage';
import { AdminDashboardModal } from './AdminDashboardModal';
import { NoteCard } from './NoteCard';
import { AmbientAudioBar } from './AmbientAudioBar';
import { AdminService } from '../services/AdminService';
import { Crown, Megaphone, AlertCircle } from 'lucide-react';

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

  // Platform broadcast announcement & maintenance status
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [maintenance, setMaintenance] = useState<MaintenanceModeConfig | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await AdminService.fetchPlatformStatus();
      if (res.announcement) setAnnouncement(res.announcement);
      if (res.maintenance) setMaintenance(res.maintenance);
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 25000);
    return () => clearInterval(interval);
  }, []);

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
      if (result.isOwner) {
        AdminService.saveOwnerCode(adminPasskeyInput.trim());
      }
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

      {/* 1.5 PLATFORM BROADCAST & MAINTENANCE BANNERS */}
      {maintenance?.enabled && (
        <div className="w-full bg-amber-950/90 border-b border-amber-500/40 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="font-bold">System Maintenance in Progress:</span>
            <span>{maintenance.message || 'The platform is undergoing scheduled updates.'}</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400/80 uppercase">Maintenance Mode</span>
        </div>
      )}

      {announcement?.active && !dismissedAnnouncement && (
        <div
          className={`w-full border-b px-4 py-1.5 flex items-center justify-between text-xs z-30 shadow-md transition-all ${
            announcement.type === 'alert'
              ? 'bg-rose-950/90 border-rose-600/50 text-rose-200'
              : announcement.type === 'warning'
              ? 'bg-amber-950/90 border-amber-600/50 text-amber-200'
              : announcement.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-600/50 text-emerald-200'
              : 'bg-purple-950/90 border-purple-600/50 text-purple-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Megaphone className="h-3.5 w-3.5 shrink-0 animate-bounce" />
            <span className="font-bold shrink-0">Announcement:</span>
            <span className="truncate">{announcement.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissedAnnouncement(true)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. DESKTOP WORKSPACE (WALLPAPER & DESKTOP ICONS GRID) */}
      <main
        className="flex-1 w-full relative overflow-hidden p-6 sm:p-8"
        onClick={() => {
          setIsKairoMenuOpen(false);
          setIsUserMenuOpen(false);
        }}
      >
        {/* Floating Desktop Widget (Clock & Stats) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute top-8 right-8 w-64 rounded-3xl p-5 bg-white/5 dark:bg-black/20 backdrop-blur-3xl border border-white/10 shadow-2xl pointer-events-none select-none z-0"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-extrabold tracking-tighter text-slate-800 dark:text-white drop-shadow-md">
              {clockTime}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-purple-200/70 tracking-wide uppercase">
              {clockDate}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-purple-200/60">
              <span>Classes</span>
              <span className="text-slate-800 dark:text-white">{classes.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-purple-200/60">
              <span>Total Notes</span>
              <span className="text-slate-800 dark:text-white">{notes.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Desktop Icons Grid (Only Folders Now) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-flow-col auto-cols-[90px] sm:auto-cols-[100px] grid-rows-[repeat(auto-fill,105px)] gap-y-4 gap-x-2 w-max max-w-full h-[calc(100%-100px)] overflow-y-auto z-10 relative select-none"
        >
          {/* CLASS FOLDERS ON DESKTOP */}
          <AnimatePresence>
            {classes.map((classItem, idx) => {
              const count = notes.filter((n) => n.classId === classItem.id).length;
              return (
                <motion.div
                  key={classItem.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleOpenClassFolder(classItem)}
                  className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
                  title={`Open Folder: ${classItem.name} (${count} notes)`}
                >
                  {/* Desktop Folder Graphic */}
                  <div className="relative w-13 h-13 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Folder
                      className="h-12 w-12 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)] transition-colors"
                      style={{
                        color: classItem.color || '#a855f7',
                        fill: classItem.color ? `${classItem.color}33` : '#a855f733',
                      }}
                    />
                    {/* Note count badge */}
                    <span className="absolute bottom-1 right-0 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-950/90 text-white border border-white/20 shadow-md backdrop-blur-md">
                      {count}
                    </span>
                  </div>
                  {/* Folder Title */}
                  <span className="mt-2 text-[11px] font-semibold text-slate-800 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-200 tracking-tight line-clamp-2 px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/40 backdrop-blur-sm drop-shadow-sm max-w-full break-words">
                    {classItem.name}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Shortcut: New Class Folder */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: classes.length * 0.05 }}
            onClick={() => onOpenClassModal()}
            className="flex flex-col items-center justify-center p-2 rounded-xl group hover:bg-purple-500/20 active:bg-purple-500/30 transition-all cursor-pointer text-center w-[90px] sm:w-[100px]"
            title="Create a new class folder on desktop"
          >
            <div className="w-13 h-13 rounded-2xl border-2 border-dashed border-purple-400/50 hover:border-purple-400 bg-purple-950/10 hover:bg-purple-950/30 p-0.5 group-hover:scale-110 transition-all duration-300 flex items-center justify-center text-purple-600 dark:text-purple-300 backdrop-blur-md">
              <FolderPlus className="h-6 w-6" />
            </div>
            <span className="mt-2 text-[11px] font-medium text-slate-700 dark:text-purple-200 tracking-tight line-clamp-2 px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/40 backdrop-blur-sm drop-shadow-sm">
              + New Folder
            </span>
          </motion.div>
        </motion.div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[#140e2b] border border-purple-800 shadow-2xl space-y-4 text-purple-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-950/80 border border-purple-700/60 text-purple-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Unlock Admin & Owner Portal</h3>
                <p className="text-[11px] text-purple-300/80">
                  Enter Admin Passkey or Owner Master Code
                </p>
              </div>
            </div>

            {adminKeyError && (
              <p className="text-xs text-rose-300 p-2.5 rounded-xl bg-rose-950/70 border border-rose-900">
                {adminKeyError}
              </p>
            )}

            <form onSubmit={handleVerifyPasskey} className="space-y-3">
              <div>
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPasskeyInput}
                  onChange={(e) => setAdminPasskeyInput(e.target.value)}
                  placeholder="Enter administrator passkey..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-purple-950/60 border border-purple-800 text-purple-100 placeholder:text-purple-400/50 font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Admin Passkey:</span>
                  <code className="text-purple-300 font-mono font-bold">Kairo820</code>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
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
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {isVerifyingAdmin ? 'Verifying...' : 'Unlock Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. BOTTOM DESKTOP DOCK (macOS Style Floating Glass Dock) */}
      <footer className="absolute bottom-6 w-full flex items-center justify-center p-2 z-30 pointer-events-none">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300, delay: 0.1 }}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-3xl bg-white/5 dark:bg-[#070312]/50 border border-white/20 dark:border-white/10 shadow-2xl backdrop-blur-3xl"
        >
          {/* Recorder */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onOpenRecorder()}
            title="Voice Recorder"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-purple-500 to-indigo-400 p-0.5 shadow-lg shadow-purple-900/50 flex items-center justify-center text-white ring-1 ring-white/30 group-hover:shadow-purple-500/50 transition-shadow">
              <Mic className="h-6 w-6 drop-shadow-md" />
            </div>
            {openWindows['recorder']?.isOpen && (
              <span className="absolute -bottom-2.5 h-1 w-1 rounded-full bg-white/70" />
            )}
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              Record Lecture
            </span>
          </motion.button>

          {/* All Notes */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => openWindow('all-notes')}
            title="All Notes"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-900/50 flex items-center justify-center text-white ring-1 ring-white/30 group-hover:shadow-blue-500/50 transition-shadow">
              <FileText className="h-6 w-6 drop-shadow-md" />
            </div>
            {openWindows['all-notes']?.isOpen && (
              <span className="absolute -bottom-2.5 h-1 w-1 rounded-full bg-white/70" />
            )}
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              Notes Library
            </span>
          </motion.button>

          {/* New Class Folder */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onOpenClassModal()}
            title="New Class Folder"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-900/50 flex items-center justify-center text-white ring-1 ring-white/30 group-hover:shadow-emerald-500/50 transition-shadow">
              <FolderPlus className="h-6 w-6 drop-shadow-md" />
            </div>
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              New Folder
            </span>
          </motion.button>

          {/* Soundscapes */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => openWindow('ambient')}
            title="Soundscapes"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-fuchsia-600 via-pink-500 to-rose-400 p-0.5 shadow-lg shadow-fuchsia-900/50 flex items-center justify-center text-white ring-1 ring-white/30 group-hover:shadow-fuchsia-500/50 transition-shadow">
              <Music className="h-6 w-6 drop-shadow-md" />
            </div>
            {openWindows['ambient']?.isOpen && (
              <span className="absolute -bottom-2.5 h-1 w-1 rounded-full bg-white/70" />
            )}
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              Soundscapes
            </span>
          </motion.button>

          {/* Settings */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => openWindow('settings')}
            title="Settings"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-600 via-slate-500 to-gray-400 p-0.5 shadow-lg shadow-slate-900/50 flex items-center justify-center text-white ring-1 ring-white/30 group-hover:shadow-slate-500/50 transition-shadow">
              <Settings className="h-6 w-6 drop-shadow-md" />
            </div>
            {openWindows['settings']?.isOpen && (
              <span className="absolute -bottom-2.5 h-1 w-1 rounded-full bg-white/70" />
            )}
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              Settings App
            </span>
          </motion.button>

          {/* Admin App */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleAdminAppClick}
            title="Master Admin Portal"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className={`w-12 h-12 rounded-2xl p-0.5 shadow-lg flex items-center justify-center text-white ring-1 ring-white/30 transition-shadow ${
              isAdminUnlocked || AdminService.getSavedKey()
                ? 'bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 shadow-amber-900/50 group-hover:shadow-amber-500/50'
                : 'bg-gradient-to-tr from-zinc-800 via-zinc-700 to-zinc-600 shadow-black/50 group-hover:shadow-zinc-500/50'
            }`}>
              <Shield className={`h-6 w-6 drop-shadow-md ${
                isAdminUnlocked || AdminService.getSavedKey() ? 'animate-pulse text-white' : 'text-zinc-300'
              }`} />
              {!(isAdminUnlocked || AdminService.getSavedKey()) && (
                <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-zinc-900 border border-zinc-600 text-zinc-400">
                  <Lock className="h-3 w-3" />
                </div>
              )}
            </div>
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              Master Admin
            </span>
          </motion.button>

          <div className="w-px h-10 bg-white/20 mx-1 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" />

          {/* Lock Desktop */}
          <motion.button
            whileHover={{ scale: 1.2, y: -10 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onLockDesktop}
            title="Lock Desktop"
            className="relative group focus:outline-none flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-red-400 p-0.5 shadow-lg shadow-rose-900/50 flex items-center justify-center text-white ring-1 ring-white/30 group-hover:shadow-rose-500/50 transition-shadow">
              <Lock className="h-6 w-6 drop-shadow-md" />
            </div>
            <span className="absolute -top-10 px-3 py-1.5 rounded-lg bg-black/80 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl backdrop-blur-md border border-white/10">
              Lock Desktop
            </span>
          </motion.button>
        </motion.div>
      </footer>
    </div>
  );
};

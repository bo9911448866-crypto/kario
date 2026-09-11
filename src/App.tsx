import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Folder,
  FileText,
  Sparkles,
  Clock,
  BookOpen,
  Search,
  Plus,
  BarChart3,
  SlidersHorizontal,
  Palette,
} from 'lucide-react';
import {
  ClassItem,
  VoiceNote,
  SortOrder,
  GeminiApiStatus,
  CustomThemeConfig,
  UserAccount,
} from './types';
import { StorageService } from './services/StorageService';
import { GeminiService } from './services/GeminiService';
import { AuthService } from './services/AuthService';
import { EmailService } from './services/EmailService';
import { Header } from './components/Header';
import { ClassFilter } from './components/ClassFilter';
import { NoteCard } from './components/NoteCard';
import { AudioRecorder } from './components/AudioRecorder';
import { ClassModal } from './components/ClassModal';
import { NoteEditorModal } from './components/NoteEditorModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { IntroAnimation } from './components/IntroAnimation';
import { BackgroundAtmosphere } from './components/BackgroundAtmosphere';
import { SettingsModal } from './components/SettingsModal';
import { SettingsPage } from './components/SettingsPage';
import { AmbientAudioBar } from './components/AmbientAudioBar';
import { ZenOverlay } from './components/ZenOverlay';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { DesktopLockScreen } from './components/DesktopLockScreen';
import { DesktopView } from './components/DesktopView';
import { AdminService } from './services/AdminService';

export default function App() {
  // Navigation view: 'workspace' or 'settings'
  const [currentView, setCurrentView] = useState<'workspace' | 'settings'>('workspace');
  const [settingsTab, setSettingsTab] = useState<'account' | 'email' | 'gemini' | 'themes'>('account');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => AuthService.getUser());

  // Desktop OS environment vs classic layout view
  const [viewStyle, setViewStyle] = useState<'desktop' | 'classic'>(() => {
    try {
      return (localStorage.getItem('kairo_view_style') as 'desktop' | 'classic') || 'desktop';
    } catch {
      return 'desktop';
    }
  });

  // Lockscreen gate on application opening
  const [isDesktopLocked, setIsDesktopLocked] = useState<boolean>(true);

  // Recorder default class ID when launched from folder
  const [recorderDefaultClassId, setRecorderDefaultClassId] = useState<string | undefined>(undefined);

  // Admin Portal unlocked
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() =>
    Boolean(AdminService.getSavedKey())
  );

  // Secret Admin Portal state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.location.hash === '#admin'
  );
  const [secretClickCount, setSecretClickCount] = useState<number>(0);

  // Theme & Appearance configuration state
  const [themeConfig, setThemeConfig] = useState<CustomThemeConfig>(() =>
    StorageService.getThemeConfig()
  );

  // Intro animation state
  const [showIntro, setShowIntro] = useState(true);

  // Settings modal open state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Toggle fire mode helper
  const toggleFireMode = () => {
    setThemeConfig((prev) => {
      const isCurrentlyOff = prev.fireIntensity === 'off';
      return {
        ...prev,
        presetId: 'custom',
        fireIntensity: isCurrentlyOff ? 'normal' : 'off',
        backgroundPattern: isCurrentlyOff
          ? 'fire'
          : prev.backgroundPattern === 'fire'
          ? 'none'
          : prev.backgroundPattern,
      };
    });
  };

  // Data states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Modals & Active items
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<VoiceNote | null>(null);

  // Gemini API Status
  const [apiStatus, setApiStatus] = useState<GeminiApiStatus>({
    hasConfiguredKey: false,
    source: 'none',
  });

  // Sync themeConfig with document root & local persistence
  useEffect(() => {
    const root = document.documentElement;
    if (themeConfig.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--kairo-primary', themeConfig.primaryColor);
    root.style.setProperty('--kairo-secondary', themeConfig.secondaryColor);

    StorageService.saveTheme(themeConfig.mode);
    StorageService.saveThemeConfig(themeConfig);
  }, [themeConfig]);

  // Load initial data
  useEffect(() => {
    const loadedClasses = StorageService.getClasses();
    const loadedNotes = StorageService.getNotes();
    setClasses(loadedClasses);
    setNotes(loadedNotes);

    checkApi();
  }, []);

  // Secret Admin Access Triggers:
  // 1. URL Hash: #admin
  // 2. Keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminModalOpen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsAdminModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('keydown', handleKeyDown);

    if (window.location.hash === '#admin') {
      setIsAdminModalOpen(true);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSecretFooterClick = () => {
    setSecretClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsAdminModalOpen(true);
        return 0;
      }
      return next;
    });
    setTimeout(() => setSecretClickCount(0), 2500);
  };

  const checkApi = async () => {
    const status = await GeminiService.checkStatus();
    setApiStatus(status);
  };

  const toggleTheme = () => {
    setThemeConfig((prev) => {
      const nextMode = prev.mode === 'dark' ? 'light' : 'dark';
      return {
        ...prev,
        mode: nextMode,
        presetId: 'custom',
        customBackgroundColor: nextMode === 'dark' ? '#07020d' : '#f8fafc',
      };
    });
  };

  // Note CRUD handlers
  const handleSaveNewNote = async (
    noteData: Omit<VoiceNote, 'id' | 'createdAt' | 'updatedAt'>,
    shouldSummarize = false
  ) => {
    const created = StorageService.createNote(noteData);
    const updatedNotes = StorageService.getNotes();
    setNotes(updatedNotes);

    // Automatic cloud sync if authenticated
    if (AuthService.isAuthenticated()) {
      AuthService.syncToCloud(updatedNotes, classes, { themeConfig }).catch((e) =>
        console.warn('Cloud sync error:', e)
      );
    }

    // Automatic email dispatch if enabled and not summarizing (if summarizing, will send after summary)
    if (!shouldSummarize && EmailService.isAutoSendEnabled()) {
      const emailSettings = EmailService.getEmailSettings();
      if (emailSettings.recipientEmail) {
        const targetClass = classes.find((c) => c.id === created.classId);
        EmailService.sendNoteEmail(
          emailSettings.recipientEmail,
          created,
          targetClass?.name || 'General'
        ).catch((err) => console.warn('Auto-email sending failed:', err));
      }
    }

    if (shouldSummarize) {
      handleSummarizeNote(created);
    }
  };

  const handleUpdateNote = (id: string, updates: Partial<VoiceNote>) => {
    const updated = StorageService.updateNote(id, updates);
    setNotes(updated);
    if (editingNote && editingNote.id === id) {
      setEditingNote((prev) => (prev ? { ...prev, ...updates } : null));
    }
    if (AuthService.isAuthenticated()) {
      AuthService.syncToCloud(updated, classes, { themeConfig }).catch((e) =>
        console.warn('Cloud sync error:', e)
      );
    }
  };

  const handleDeleteNote = (id: string) => {
    const updated = StorageService.deleteNote(id);
    setNotes(updated);
    if (AuthService.isAuthenticated()) {
      AuthService.syncToCloud(updated, classes, { themeConfig }).catch((e) =>
        console.warn('Cloud sync error:', e)
      );
    }
  };

  const handleMoveNoteToClass = (noteId: string, targetClassId: string) => {
    const updated = StorageService.moveNoteToClass(noteId, targetClassId);
    setNotes(updated);
    if (AuthService.isAuthenticated()) {
      AuthService.syncToCloud(updated, classes, { themeConfig }).catch((e) =>
        console.warn('Cloud sync error:', e)
      );
    }
  };

  // Summarize Note with Gemini
  const handleSummarizeNote = async (note: VoiceNote) => {
    const targetClass = classes.find((c) => c.id === note.classId);

    // Optimistically show summarizing indicator
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, isSummarizing: true, error: undefined } : n))
    );

    try {
      const summaryResult = await GeminiService.summarizeNote({
        text: note.transcript,
        title: note.title,
        className: targetClass?.name || 'General',
      });

      const updated = StorageService.updateNote(note.id, {
        summary: summaryResult,
        isSummarizing: false,
        error: undefined,
      });
      setNotes(updated);

      // Automatic cloud sync
      if (AuthService.isAuthenticated()) {
        AuthService.syncToCloud(updated, classes, { themeConfig }).catch((e) =>
          console.warn('Cloud sync error:', e)
        );
      }

      // Automatic email dispatch of summarized note
      if (EmailService.isAutoSendEnabled()) {
        const emailSettings = EmailService.getEmailSettings();
        if (emailSettings.recipientEmail) {
          const summarizedNote = updated.find((n) => n.id === note.id) || {
            ...note,
            summary: summaryResult,
          };
          EmailService.sendNoteEmail(
            emailSettings.recipientEmail,
            summarizedNote,
            targetClass?.name || 'General'
          ).catch((err) => console.warn('Auto-email sending failed:', err));
        }
      }
    } catch (err: any) {
      console.error('Summarize error:', err);
      const isMissingKey =
        err.message?.includes('API key') || err.message?.includes('GEMINI_API_KEY');

      const updated = StorageService.updateNote(note.id, {
        isSummarizing: false,
        error: isMissingKey
          ? 'Gemini API key is required. Click "Configure API Key" in the top bar to set up your key.'
          : err.message || 'Failed to generate summary.',
      });
      setNotes(updated);

      if (isMissingKey) {
        setIsApiKeyModalOpen(true);
      }
    }
  };

  // Class updates handler
  const handleClassesUpdated = (updatedClasses: ClassItem[], updatedNotes?: VoiceNote[]) => {
    setClasses(updatedClasses);
    if (updatedNotes) {
      setNotes(updatedNotes);
    }
    // If selected class was deleted, reset filter
    if (selectedClassId && !updatedClasses.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(null);
    }
  };

  const handleDeleteClass = (id: string) => {
    const res = StorageService.deleteClass(id);
    setClasses(res.classes);
    setNotes(res.notes);
    if (selectedClassId === id) {
      setSelectedClassId(null);
    }
    if (AuthService.isAuthenticated()) {
      AuthService.syncToCloud(res.notes, res.classes, { themeConfig }).catch((e) =>
        console.warn('Cloud sync error:', e)
      );
    }
  };

  const handleOpenRecorder = (defaultClassId?: string) => {
    setRecorderDefaultClassId(defaultClassId);
    setIsRecorderOpen(true);
  };

  const toggleViewStyle = () => {
    setViewStyle((prev) => {
      const next = prev === 'desktop' ? 'classic' : 'desktop';
      try {
        localStorage.setItem('kairo_view_style', next);
      } catch {}
      return next;
    });
  };

  const handleLoginSuccess = (
    user: UserAccount,
    data?: { notes: VoiceNote[]; classes: ClassItem[]; settings: any }
  ) => {
    setCurrentUser(user);
    if (data?.notes && data.notes.length > 0) {
      setNotes(data.notes);
      StorageService.saveNotes(data.notes);
    }
    if (data?.classes && data.classes.length > 0) {
      setClasses(data.classes);
      StorageService.saveClasses(data.classes);
    }
    setIsDesktopLocked(false);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setIsDesktopLocked(true);
  };

  // Calculate note counts per class
  const classNoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    classes.forEach((c) => {
      counts[c.id] = 0;
    });
    notes.forEach((n) => {
      if (counts[n.classId] !== undefined) {
        counts[n.classId]++;
      }
    });
    return counts;
  }, [classes, notes]);

  // Filter & sort notes
  const filteredNotes = useMemo(() => {
    let list = [...notes];

    // Class filter
    if (selectedClassId) {
      list = list.filter((n) => n.classId === selectedClassId);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((n) => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const transcriptMatch = n.transcript.toLowerCase().includes(q);
        const summaryMatch = n.summary?.summary.toLowerCase().includes(q);
        const tagsMatch = n.summary?.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || transcriptMatch || summaryMatch || tagsMatch;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'duration') {
        return (b.durationSeconds || 0) - (a.durationSeconds || 0);
      }
      if (sortOrder === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [notes, selectedClassId, searchQuery, sortOrder]);

  // Summary stats
  const totalNotes = notes.length;
  const summarizedNotesCount = notes.filter((n) => Boolean(n.summary)).length;
  const totalRecordedSeconds = notes.reduce((acc, n) => acc + (n.durationSeconds || 0), 0);
  const totalRecordedMinutes = Math.round(totalRecordedSeconds / 60);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-500 relative overflow-x-hidden"
      style={{
        backgroundColor:
          themeConfig.customBackgroundColor ||
          (themeConfig.mode === 'dark' ? '#07020d' : '#f8fafc'),
      }}
    >
      {/* Dynamic Background Atmosphere (Fire, Grid, Nebula, Waves, or Custom Wallpaper) */}
      <BackgroundAtmosphere config={themeConfig} />

      {/* Intro Animation */}
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}

      {/* Lock Screen Gate (Account System on App Open) */}
      {isDesktopLocked && (
        <DesktopLockScreen
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onContinueAsGuest={() => setIsDesktopLocked(false)}
          onUnlockExisting={() => setIsDesktopLocked(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Zen Screensaver View (Hides UI so background and music take over) */}
      <ZenOverlay
        isOpen={Boolean(themeConfig.zenMode)}
        onExit={() => setThemeConfig((prev) => ({ ...prev, zenMode: false }))}
        config={themeConfig}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Workspace UI (Hidden when in Zen Mode) */}
      {!themeConfig.zenMode && (
        <>
          {viewStyle === 'desktop' ? (
            <DesktopView
              classes={classes}
              notes={notes}
              themeConfig={themeConfig}
              onUpdateThemeConfig={setThemeConfig}
              currentUser={currentUser}
              apiStatus={apiStatus}
              onOpenRecorder={handleOpenRecorder}
              onOpenClassModal={() => setIsClassModalOpen(true)}
              onDeleteClass={handleDeleteClass}
              onSummarizeNote={handleSummarizeNote}
              onDeleteNote={handleDeleteNote}
              onMoveNoteToClass={handleMoveNoteToClass}
              onEditNote={(n) => setEditingNote(n)}
              onLockDesktop={() => setIsDesktopLocked(true)}
              onLogout={handleLogout}
              onToggleClassicMode={toggleViewStyle}
              isAdminUnlocked={isAdminUnlocked || Boolean(AdminService.getSavedKey())}
              onOpenAdminModal={() => setIsAdminModalOpen(true)}
              onNotesUpdated={setNotes}
              onClassesUpdated={setClasses}
            />
          ) : (
            <>
              {/* Header with Navigation and Cloud status */}
              <Header
                theme={themeConfig.mode}
                onToggleTheme={toggleTheme}
                apiStatus={apiStatus}
                onOpenApiKeyModal={() => {
                  setSettingsTab('gemini');
                  setCurrentView('settings');
                }}
                onOpenRecorder={() => handleOpenRecorder()}
                onReplayIntro={() => setShowIntro(true)}
                isFireMode={themeConfig.fireIntensity !== 'off'}
                onToggleFireMode={toggleFireMode}
                onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
                currentView={currentView}
                onNavigateView={(view) => setCurrentView(view)}
                user={currentUser}
                onToggleDesktopView={toggleViewStyle}
              />

          {currentView === 'settings' ? (
            /* Dedicated Settings View: Cloud Accounts, Email Delivery, Gemini Key, and Themes */
            <SettingsPage
              themeConfig={themeConfig}
              onUpdateThemeConfig={setThemeConfig}
              notes={notes}
              classes={classes}
              onNotesUpdated={setNotes}
              onClassesUpdated={setClasses}
              onBackToWorkspace={() => setCurrentView('workspace')}
              defaultTab={settingsTab}
              onOpenAdmin={() => setIsAdminModalOpen(true)}
            />
          ) : (
            /* Main Voice Notes Workspace */
            <>
              {/* Ambient Soundscapes & Live Media Quick Bar */}
              <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
                <AmbientAudioBar
                  config={themeConfig}
                  onUpdateConfig={setThemeConfig}
                  onOpenSettings={() => setIsSettingsModalOpen(true)}
                  isZenMode={Boolean(themeConfig.zenMode)}
                  onToggleZenMode={() =>
                    setThemeConfig((prev) => ({ ...prev, zenMode: !prev.zenMode }))
                  }
                />
              </div>

              {/* Main Container */}
              <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Metric Overview Strip */}
                <section
                  id="metrics-overview"
                  aria-label="Overview statistics"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#120d24] border border-slate-200 dark:border-purple-950/80 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {totalNotes}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Total Notes
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#120d24] border border-slate-200 dark:border-purple-950/80 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {summarizedNotesCount}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        AI Summarized
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#120d24] border border-slate-200 dark:border-purple-950/80 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {totalRecordedMinutes}m
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Audio Captured
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#120d24] border border-slate-200 dark:border-purple-950/80 shadow-xs flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {classes.length}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Active Classes
                      </div>
                    </div>
                  </div>
                </section>

                {/* Class Organization & Filters */}
                <ClassFilter
                  classes={classes}
                  selectedClassId={selectedClassId}
                  onSelectClass={setSelectedClassId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                  onOpenClassManager={() => setIsClassModalOpen(true)}
                  classNoteCounts={classNoteCounts}
                  totalNotesCount={totalNotes}
                />

                {/* Current View Header */}
                <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-white dark:bg-[#120d24] border border-slate-200 dark:border-purple-950/80 shadow-xs flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      {selectedClass ? `${selectedClass.name} Notes` : 'All Lecture Notes'}
                    </h2>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedClass?.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block italic mr-2">
                        {selectedClass.description}
                      </p>
                    )}

                    <button
                      id="customize-theme-btn"
                      type="button"
                      onClick={() => {
                        setSettingsTab('themes');
                        setCurrentView('settings');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-purple-900/50 bg-slate-50 dark:bg-[#181330] text-slate-700 dark:text-purple-300 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-200 transition-all shadow-xs cursor-pointer"
                    >
                      <Palette className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span>Theme Studio</span>
                    </button>
                  </div>
                </div>

                {/* Notes Grid */}
                {filteredNotes.length > 0 ? (
                  <div id="notes-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredNotes.map((note) => {
                      const currentCls = classes.find((c) => c.id === note.classId);
                      return (
                        <NoteCard
                          key={note.id}
                          note={note}
                          classes={classes}
                          currentClass={currentCls}
                          onSummarize={handleSummarizeNote}
                          onDelete={handleDeleteNote}
                          onMoveToClass={handleMoveNoteToClass}
                          onEdit={(n) => setEditingNote(n)}
                          cardStyle={themeConfig.cardStyle}
                          onOpenSettings={() => {
                            setSettingsTab('email');
                            setCurrentView('settings');
                          }}
                        />
                      );
                    })}
                  </div>
                ) : (
                  /* Empty State */
                  <div
                    id="empty-notes-view"
                    className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-purple-950/80 p-12 text-center flex flex-col items-center justify-center space-y-4 bg-white/50 dark:bg-[#120d24]/60"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Mic className="h-6 w-6" />
                    </div>

                    <div className="space-y-1 max-w-sm">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {searchQuery
                          ? 'No matching notes found'
                          : selectedClass
                          ? `No notes in ${selectedClass.name} yet`
                          : 'No voice notes recorded yet'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {searchQuery
                          ? 'Try searching for another keyword or clear the search filter.'
                          : 'Start speaking or upload an audio recording to capture lecture notes and generate AI summaries.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {searchQuery ? (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          Clear Search
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsRecorderOpen(true)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <Mic className="h-4 w-4" />
                          <span>Record First Note</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </main>

              {/* Discreet Footer with Secret Admin Trigger */}
              <footer className="max-w-6xl w-full mx-auto px-4 py-8 text-center text-xs text-slate-400 dark:text-purple-400/40 select-none border-t border-slate-200/50 dark:border-purple-950/40 mt-8">
                <div className="flex items-center justify-center gap-2">
                  <span>Kairo AI Voice Notes & Academic Summaries</span>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={handleSecretFooterClick}
                    title="System Info"
                    className="hover:text-slate-600 dark:hover:text-purple-300 transition-colors cursor-default"
                  >
                    v2.5
                  </button>
                </div>
              </footer>
            </>
          )}
        </>
      )}
    </>
  )}

      {/* Audio Recorder Modal */}
      {isRecorderOpen && (
        <AudioRecorder
          classes={classes}
          defaultClassId={recorderDefaultClassId || selectedClassId || classes[0]?.id}
          onSaveNote={handleSaveNewNote}
          onClose={() => {
            setIsRecorderOpen(false);
            setRecorderDefaultClassId(undefined);
          }}
        />
      )}

      {/* Class Manager Modal */}
      {isClassModalOpen && (
        <ClassModal
          classes={classes}
          notes={notes}
          onClassesUpdated={handleClassesUpdated}
          onClose={() => setIsClassModalOpen(false)}
        />
      )}

      {/* Note Editor Modal */}
      {editingNote && (
        <NoteEditorModal
          note={editingNote}
          classes={classes}
          onSave={handleUpdateNote}
          onSummarize={handleSummarizeNote}
          onClose={() => setEditingNote(null)}
        />
      )}

      {/* API Key Modal */}
      {isApiKeyModalOpen && (
        <ApiKeyModal
          status={apiStatus}
          onStatusUpdated={checkApi}
          onClose={() => setIsApiKeyModalOpen(false)}
        />
      )}

      {/* Theme & Appearance Studio Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        config={themeConfig}
        onUpdateConfig={setThemeConfig}
        onReplayIntro={() => setShowIntro(true)}
      />

      {/* Secret Master Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          if (typeof window !== 'undefined' && window.location.hash === '#admin') {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
      />
    </div>
  );
}

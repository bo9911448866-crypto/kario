import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Users,
  FileText,
  Search,
  Download,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Database,
  Sparkles,
  Clock,
  Crown,
  Megaphone,
  Activity,
  Zap,
} from 'lucide-react';
import { AdminService } from '../services/AdminService';
import { AdminData, AdminUserAccount, AdminRecentNote } from '../types';
import { AdminAccountsTab } from './admin/AdminAccountsTab';
import { AdminAnnouncementsTab } from './admin/AdminAnnouncementsTab';
import { AdminMetricsTab } from './admin/AdminMetricsTab';
import { OwnerConsoleTab } from './admin/OwnerConsoleTab';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  // Passkey & Auth State
  const [adminKey, setAdminKey] = useState<string>(() => AdminService.getSavedKey() || '');
  const [rememberKey, setRememberKey] = useState<boolean>(true);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Elevation state
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [showElevateModal, setShowElevateModal] = useState<boolean>(false);
  const [elevateInput, setElevateInput] = useState<string>('');
  const [elevateError, setElevateError] = useState<string | null>(null);
  const [elevating, setElevating] = useState<boolean>(false);

  // Data state
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // UI Navigation
  const [activeTab, setActiveTab] = useState<
    'accounts' | 'notes' | 'announcements' | 'metrics' | 'owner' | 'raw'
  >('accounts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<AdminUserAccount | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Account deletion modal
  const [accountToDelete, setAccountToDelete] = useState<AdminUserAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);

  // Saving operations
  const [savingAnnouncement, setSavingAnnouncement] = useState<boolean>(false);

  // Auto-attempt unlock if saved key exists
  useEffect(() => {
    if (!isOpen) return;

    const savedKey = AdminService.getSavedKey();
    const savedOwner = AdminService.getSavedOwnerCode();

    if (savedKey || savedOwner) {
      if (savedKey) setAdminKey(savedKey);
      attemptUnlock(savedKey || '', savedOwner || '', false);
    } else {
      setIsUnlocked(false);
      setIsOwner(false);
    }
  }, [isOpen]);

  const attemptUnlock = async (keyToTest: string, ownerCodeToTest = '', shouldSave = true) => {
    const trimmedKey = keyToTest.trim();
    const trimmedOwner = ownerCodeToTest.trim();

    if (!trimmedKey && !trimmedOwner) {
      setKeyError('Please enter an admin passkey or owner code.');
      return;
    }

    setVerifying(true);
    setKeyError(null);

    const res = await AdminService.fetchAdminData(trimmedKey, trimmedOwner);
    setVerifying(false);

    if (res.success && res.data) {
      if (shouldSave && rememberKey) {
        if (trimmedKey) AdminService.saveKey(trimmedKey);
        if (trimmedOwner) {
          AdminService.saveOwnerCode(trimmedOwner);
        }
      }
      setIsUnlocked(true);
      setIsOwner(Boolean(res.data.isOwner));
      setAdminData(res.data);
      setDataError(null);
    } else {
      setIsUnlocked(false);
      setIsOwner(false);
      setKeyError(res.error || 'Invalid Admin Passkey. Please verify and try again.');
    }
  };

  const reloadData = async () => {
    setLoadingData(true);
    setDataError(null);
    const res = await AdminService.fetchAdminData(adminKey, AdminService.getSavedOwnerCode() || '');
    setLoadingData(false);

    if (res.success && res.data) {
      setAdminData(res.data);
      setIsOwner(Boolean(res.data.isOwner));
    } else {
      setDataError(res.error || 'Failed to reload data.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleElevateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setElevateError(null);
    if (!elevateInput.trim()) return;

    setElevating(true);
    const res = await AdminService.elevateToOwner(elevateInput.trim(), adminKey);
    setElevating(false);

    if (res.success) {
      setIsOwner(true);
      setShowElevateModal(false);
      setElevateInput('');
      await reloadData();
    } else {
      setElevateError(res.error || 'Invalid Owner Code. Please check and try again.');
    }
  };

  const handleElevateFromConsole = async (code: string): Promise<boolean> => {
    const res = await AdminService.elevateToOwner(code.trim(), adminKey);
    if (res.success) {
      setIsOwner(true);
      await reloadData();
      return true;
    }
    return false;
  };

  const handleLock = () => {
    AdminService.clearKey();
    AdminService.clearOwnerCode();
    setAdminKey('');
    setIsUnlocked(false);
    setIsOwner(false);
    setAdminData(null);
    setSelectedAccount(null);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!accountToDelete) return;
    setDeletingAccount(true);

    const res = await AdminService.deleteAccount(
      accountToDelete.id,
      adminKey,
      AdminService.getSavedOwnerCode() || ''
    );
    setDeletingAccount(false);

    if (res.success) {
      if (selectedAccount?.id === accountToDelete.id) {
        setSelectedAccount(null);
      }
      setAccountToDelete(null);
      await reloadData();
    } else {
      alert(res.error || 'Failed to delete account.');
    }
  };

  const handleResetPassword = async (userId: string, newPassword?: string) => {
    const res = await AdminService.resetUserPassword(
      userId,
      newPassword,
      adminKey,
      AdminService.getSavedOwnerCode() || ''
    );
    if (res.success) {
      await reloadData();
    }
    return res;
  };

  const handleUpdateRole = async (
    userId: string,
    role: 'owner' | 'admin' | 'vip' | 'user',
    status?: 'active' | 'suspended'
  ) => {
    const res = await AdminService.updateUserRole(
      userId,
      role,
      status,
      AdminService.getSavedOwnerCode() || ''
    );
    if (res.success) {
      await reloadData();
    } else {
      alert(res.error || 'Failed to update user role.');
    }
  };

  const handleSaveAnnouncement = async (data: {
    message: string;
    type: 'info' | 'warning' | 'alert' | 'success';
    active: boolean;
  }) => {
    setSavingAnnouncement(true);
    const res = await AdminService.updateAnnouncement(
      data,
      adminKey,
      AdminService.getSavedOwnerCode() || ''
    );
    setSavingAnnouncement(false);
    if (res.success) {
      await reloadData();
    } else {
      alert(res.error || 'Failed to update announcement.');
    }
  };

  const handleToggleMaintenance = async (enabled: boolean, message?: string) => {
    const res = await AdminService.toggleMaintenance(
      enabled,
      message,
      AdminService.getSavedOwnerCode() || ''
    );
    if (res.success) {
      await reloadData();
    } else {
      alert(res.error || 'Failed to toggle maintenance mode.');
    }
  };

  const handlePurgeEmpty = async () => {
    const res = await AdminService.purgeEmptyAccounts(AdminService.getSavedOwnerCode() || '');
    if (res.success) {
      await reloadData();
    } else {
      alert(res.error || 'Failed to purge empty accounts.');
    }
  };

  const handleRunAiTest = async (model: string, prompt: string) => {
    return await AdminService.testGeminiAI(
      model,
      prompt,
      adminKey,
      AdminService.getSavedOwnerCode() || ''
    );
  };

  const handleRestoreDatabase = async (backupData: any) => {
    const res = await AdminService.restoreDatabase(
      backupData,
      AdminService.getSavedOwnerCode() || ''
    );
    if (res.success) {
      await reloadData();
    } else {
      throw new Error(res.error || 'Failed to restore database.');
    }
  };

  const handleInjectNote = async (
    userId: string,
    title: string,
    transcript: string,
    className?: string
  ) => {
    const res = await AdminService.injectNote(
      userId,
      title,
      transcript,
      className,
      AdminService.getSavedOwnerCode() || ''
    );
    if (res.success) {
      await reloadData();
    } else {
      alert(res.error || 'Failed to inject note.');
    }
  };

  // Filtered Notes for the Notes tab
  const filteredNotes = (adminData?.recentNotes || []).filter((note) => {
    if (selectedUserFilter !== 'all' && note.userId !== selectedUserFilter) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.transcript.toLowerCase().includes(q) ||
      note.userEmail.toLowerCase().includes(q) ||
      note.summary?.summary.toLowerCase().includes(q) ||
      note.summary?.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-6xl h-[92vh] max-h-[900px] flex flex-col rounded-3xl bg-[#0d0a1a] shadow-2xl overflow-hidden transition-all duration-300 ${
          isOwner
            ? 'border-2 border-amber-500/50 shadow-amber-950/40 ring-1 ring-amber-400/20'
            : 'border border-purple-900/60 shadow-purple-950/40'
        }`}
      >
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 select-none ${
            isOwner
              ? 'bg-gradient-to-r from-amber-950/70 via-slate-950 to-amber-950/70 border-amber-500/30'
              : 'bg-slate-950/80 border-purple-900/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl border flex items-center justify-center shadow-md ${
                isOwner
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-400 shadow-amber-900/40'
                  : 'bg-purple-950/80 border-purple-700/60 text-purple-400'
              }`}
            >
              {isOwner ? (
                <Crown className="h-5 w-5 text-amber-400 animate-pulse" />
              ) : (
                <Shield className="h-5 w-5 text-purple-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  {isOwner ? 'Kairo OS Supreme Owner Console' : 'Kairo OS Administrator Portal'}
                </h2>
                {isUnlocked && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      isOwner
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    }`}
                  >
                    {isOwner ? 'Root Authority' : 'Admin Active'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {isOwner
                  ? 'Full root permissions: User roles, database maintenance, note injection & AI telemetry.'
                  : 'System overview: Registered student accounts, audio transcripts & platform announcements.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && (
              <>
                {/* If regular admin, show Elevate to Owner button */}
                {!isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowElevateModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Crown className="h-3.5 w-3.5" />
                    <span>Unlock Owner Mode</span>
                  </button>
                )}

                {/* Refresh data */}
                <button
                  type="button"
                  onClick={reloadData}
                  disabled={loadingData}
                  title="Refresh data"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                </button>

                {/* Lock session */}
                <button
                  type="button"
                  onClick={handleLock}
                  title="Lock dashboard"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* GATE: IF LOCKED, SHOW KEY AUTHENTICATION                  */}
        {/* ========================================================= */}
        {!isUnlocked ? (
          <div className="p-6 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6">
            <div className="h-16 w-16 rounded-3xl bg-purple-950/80 border border-purple-700/50 flex items-center justify-center shadow-xl shadow-purple-900/30">
              <Key className="h-8 w-8 text-purple-400 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Enter Administrator Passkey</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide the administrator passkey to inspect accounts, notes, audio transcripts, and broadcast platform updates.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                attemptUnlock(adminKey, '', true);
              }}
              className="w-full space-y-4 text-left"
            >
              <div className="relative">
                <input
                  type={showKeyInput ? 'text' : 'password'}
                  placeholder="Enter administrator passkey..."
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-purple-900/60 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                />
                <span>Save passkey on this browser</span>
              </label>

              {keyError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-900 text-xs text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{keyError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Administrator Dashboard</span>
                  </>
                )}
              </button>

              {/* Clear Credentials Guidance */}
              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Admin Passkey:</span>
                  <code className="text-purple-300 font-mono font-bold bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40">
                    Kairo820
                  </code>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================= */
          /* UNLOCKED: FULL WORKSPACE                                  */
          /* ========================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Navigation Tabs Bar */}
            <div
              className={`flex items-center justify-between flex-wrap gap-2 px-5 py-2.5 border-b shrink-0 ${
                isOwner ? 'bg-[#0f0b1a] border-amber-500/20' : 'bg-slate-900/80 border-purple-500/10'
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1. Accounts */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('accounts');
                    setSelectedAccount(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'accounts'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Accounts ({adminData?.accounts.length ?? 0})</span>
                </button>

                {/* 2. All Notes */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('notes');
                    setSelectedAccount(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'notes'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Synced Notes ({adminData?.recentNotes.length ?? 0})</span>
                </button>

                {/* 3. Announcements */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('announcements');
                    setSelectedAccount(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'announcements'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  <span>Announcements</span>
                  {adminData?.announcement?.active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>

                {/* 4. System Metrics */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('metrics');
                    setSelectedAccount(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'metrics'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>System Metrics</span>
                </button>

                {/* 5. Owner Console */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('owner');
                    setSelectedAccount(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'owner'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-600/30'
                      : isOwner
                      ? 'text-amber-300 hover:bg-amber-950/40 border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span>{isOwner ? '👑 Owner Console' : 'Owner Console (Restricted)'}</span>
                </button>

                {/* 6. Raw Database */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('raw');
                    setSelectedAccount(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'raw'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Raw JSON</span>
                </button>
              </div>

              {/* Search bar for accounts/notes */}
              {(activeTab === 'accounts' || activeTab === 'notes') && !selectedAccount && (
                <div className="relative w-full sm:w-60">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'accounts'
                        ? 'Search user accounts...'
                        : 'Search transcripts & notes...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB CONTENTS CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {dataError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-900 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{dataError}</span>
                </div>
              )}

              {/* TAB 1: ACCOUNTS DIRECTORY */}
              {activeTab === 'accounts' && (
                <AdminAccountsTab
                  accounts={adminData?.accounts || []}
                  isOwner={isOwner}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onDeleteAccount={(acc) => setAccountToDelete(acc)}
                  onResetPassword={handleResetPassword}
                  onUpdateRole={handleUpdateRole}
                  selectedAccount={selectedAccount}
                  onSelectAccount={setSelectedAccount}
                />
              )}

              {/* TAB 2: GLOBAL NOTES FEED */}
              {activeTab === 'notes' && (
                <div className="space-y-4 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">Filter by Student:</span>
                      <select
                        value={selectedUserFilter}
                        onChange={(e) => setSelectedUserFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                      >
                        <option value="all">All Accounts ({adminData?.accounts.length ?? 0})</option>
                        {adminData?.accounts.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) - {u.notesCount} notes
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-slate-500 font-mono text-[11px]">
                      Showing {filteredNotes.length} notes
                    </span>
                  </div>

                  {filteredNotes.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                      <FileText className="h-8 w-8 text-slate-600 mx-auto" />
                      <div className="text-sm font-bold text-slate-300">No notes found</div>
                      <p className="text-xs text-slate-500">
                        No voice notes have been recorded or synchronized under this filter.
                      </p>
                    </div>
                  ) : (
                    filteredNotes.map((note) => {
                      const isExpanded = expandedNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-white text-sm">{note.title}</h4>
                                <span className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-800 text-[10px] font-mono text-purple-300">
                                  {note.userEmail}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                <span>Author: {note.userName}</span>
                                <span>&bull;</span>
                                <Clock className="h-3 w-3" />
                                <span>{new Date(note.createdAt).toLocaleString()}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {!isExpanded && note.transcript && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {note.transcript}
                            </p>
                          )}

                          {isExpanded && (
                            <div className="pt-3 border-t border-slate-800 space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                                  <span>Spoken Transcript</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(note.transcript || '', `global-tr-${note.id}`)}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedText === `global-tr-${note.id}` ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy Transcript</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                                  {note.transcript}
                                </div>
                              </div>

                              {note.summary && (
                                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/40 space-y-2">
                                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                    <span>AI Analysis & Key Takeaways</span>
                                  </div>
                                  <p className="text-xs text-slate-300 leading-relaxed">
                                    {note.summary.summary}
                                  </p>
                                  {note.summary.keyPoints && note.summary.keyPoints.length > 0 && (
                                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                                      {note.summary.keyPoints.map((kp, idx) => (
                                        <li key={idx}>{kp}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 3: ANNOUNCEMENTS */}
              {activeTab === 'announcements' && (
                <AdminAnnouncementsTab
                  announcement={adminData?.announcement}
                  isOwner={isOwner}
                  onSaveAnnouncement={handleSaveAnnouncement}
                  saving={savingAnnouncement}
                />
              )}

              {/* TAB 4: SYSTEM METRICS */}
              {activeTab === 'metrics' && (
                <AdminMetricsTab
                  metrics={adminData?.metrics}
                  stats={adminData?.stats}
                  onRefresh={reloadData}
                  refreshing={loadingData}
                  onRunAiTest={() => {
                    setActiveTab('owner');
                  }}
                />
              )}

              {/* TAB 5: 👑 OWNER CONSOLE */}
              {activeTab === 'owner' && (
                <OwnerConsoleTab
                  isOwner={isOwner}
                  maintenance={adminData?.maintenance}
                  auditLogs={adminData?.auditLogs || []}
                  accounts={adminData?.accounts || []}
                  onElevateToOwner={handleElevateFromConsole}
                  onToggleMaintenance={handleToggleMaintenance}
                  onPurgeEmpty={handlePurgeEmpty}
                  onRunAiTest={handleRunAiTest}
                  onRestoreDatabase={handleRestoreDatabase}
                  onDownloadBackup={() => AdminService.downloadBackup(adminKey, AdminService.getSavedOwnerCode() || '')}
                  onInjectNote={handleInjectNote}
                />
              )}

              {/* TAB 6: RAW DATABASE JSON */}
              {activeTab === 'raw' && (
                <div className="space-y-3 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-400">
                      Synchronized accounts and notes state
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            JSON.stringify(adminData?.accounts || [], null, 2),
                            'raw-json'
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedText === 'raw-json' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Copied JSON</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          AdminService.downloadBackup(
                            adminKey,
                            AdminService.getSavedOwnerCode() || ''
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Backup File</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-[60vh] leading-relaxed">
                    {JSON.stringify(adminData?.accounts || [], null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Secret Shortcuts & Keys Footer */}
            <div
              className={`px-5 py-2.5 border-t text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0 ${
                isOwner ? 'bg-[#0f0b1a] border-amber-500/20' : 'bg-slate-950/80 border-purple-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span>
                  Admin Session Active &bull; Owner Mode Restricted
                </span>
              </div>
              <div className="text-slate-500">
                Persistent local key caching active ✓
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ELEVATE TO OWNER (FROM ADMIN HEADER BUTTON) */}
      {showElevateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#140e2b] border border-amber-500/40 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Crown className="h-5 w-5" />
                <h3 className="font-bold text-base text-white">Elevate to Supreme Owner</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowElevateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter the master Owner Code to upgrade this administrator session to the Owner Console with root-level platform powers.
            </p>

            {elevateError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                {elevateError}
              </div>
            )}

            <form onSubmit={handleElevateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
                  Owner Secret Code
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter secret owner code..."
                  value={elevateInput}
                  onChange={(e) => setElevateInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-sm font-mono text-amber-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowElevateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={elevating || !elevateInput.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {elevating ? 'Verifying...' : 'Activate Owner Mode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="max-w-md w-full p-5 rounded-2xl bg-slate-900 border border-rose-800 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold text-base">Delete User Account?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-white">{accountToDelete.email}</strong>? All of their{' '}
              {accountToDelete.notesCount} synced notes and classes will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountConfirm}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deletingAccount ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Yes, Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

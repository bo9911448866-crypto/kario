import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Users,
  FileText,
  Folder,
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
  ChevronRight,
  Calendar,
  Mail,
  AlertTriangle,
  Database,
  Sparkles,
  Clock,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { AdminService } from '../services/AdminService';
import { AdminData, AdminUserAccount, AdminRecentNote } from '../types';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  // Key verification state
  const [adminKey, setAdminKey] = useState<string>(() => AdminService.getSavedKey() || '');
  const [rememberKey, setRememberKey] = useState<boolean>(true);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Data state
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // UI Navigation
  const [activeTab, setActiveTab] = useState<'accounts' | 'notes' | 'raw'>('accounts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<AdminUserAccount | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Account deletion modal
  const [accountToDelete, setAccountToDelete] = useState<AdminUserAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);

  // Auto-attempt unlock if saved key is present
  useEffect(() => {
    if (!isOpen) return;

    const saved = AdminService.getSavedKey();
    if (saved) {
      setAdminKey(saved);
      attemptUnlock(saved, false);
    } else {
      setIsUnlocked(false);
    }
  }, [isOpen]);

  const attemptUnlock = async (keyToTest: string, shouldSave = true) => {
    const trimmed = keyToTest.trim();
    if (!trimmed) {
      setKeyError('Please enter an admin passkey.');
      return;
    }

    setVerifying(true);
    setKeyError(null);

    const res = await AdminService.fetchAdminData(trimmed);
    setVerifying(false);

    if (res.success && res.data) {
      if (shouldSave && rememberKey) {
        AdminService.saveKey(trimmed);
      }
      setIsUnlocked(true);
      setAdminData(res.data);
      setDataError(null);
    } else {
      setIsUnlocked(false);
      setKeyError(res.error || 'Invalid Admin Passkey. Please verify and try again.');
    }
  };

  const handleRefresh = async () => {
    setLoadingData(true);
    const res = await AdminService.fetchAdminData(adminKey);
    setLoadingData(false);

    if (res.success && res.data) {
      setAdminData(res.data);
      setDataError(null);
      // Update selected account reference if open
      if (selectedAccount) {
        const updated = res.data.accounts.find((a) => a.id === selectedAccount.id);
        if (updated) setSelectedAccount(updated);
      }
    } else {
      setDataError(res.error || 'Failed to refresh administrator data.');
    }
  };

  const handleLockOut = () => {
    AdminService.clearKey();
    setAdminKey('');
    setIsUnlocked(false);
    setAdminData(null);
    setSelectedAccount(null);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDeleteAccountConfirm = async () => {
    if (!accountToDelete) return;
    setDeletingAccount(true);

    const res = await AdminService.deleteAccount(accountToDelete.id, adminKey);
    setDeletingAccount(false);

    if (res.success) {
      setAccountToDelete(null);
      if (selectedAccount?.id === accountToDelete.id) {
        setSelectedAccount(null);
      }
      handleRefresh();
    } else {
      alert(res.error || 'Failed to delete account.');
    }
  };

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    if (!adminData?.accounts) return [];
    if (!searchQuery.trim()) return adminData.accounts;

    const q = searchQuery.toLowerCase();
    return adminData.accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.notes || []).some((n) => n.title.toLowerCase().includes(q))
    );
  }, [adminData?.accounts, searchQuery]);

  // Filtered Global Notes
  const filteredNotes = useMemo(() => {
    if (!adminData?.recentNotes) return [];
    let list = adminData.recentNotes;

    if (selectedUserFilter !== 'all') {
      list = list.filter((n) => n.userId === selectedUserFilter || n.userEmail === selectedUserFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.transcript && n.transcript.toLowerCase().includes(q)) ||
          (n.summary?.summary && n.summary.summary.toLowerCase().includes(q)) ||
          n.userEmail.toLowerCase().includes(q)
      );
    }

    return list;
  }, [adminData?.recentNotes, selectedUserFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* ========================================================= */}
        {/* HEADER BAR                                                */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-500/20 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Kairo Master Administrator Dashboard
                </h2>
                {isUnlocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    <Check className="h-3 w-3" /> Unlocked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                View user accounts, emails, notes, transcripts, and cloud persistence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUnlocked && (
              <>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loadingData}
                  title="Refresh Database"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => AdminService.downloadBackup(adminKey)}
                  title="Download Cloud JSON Backup"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleLockOut}
                  title="Clear Key & Lock Dashboard"
                  className="px-2.5 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lock</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
            <div className="h-16 w-16 rounded-2xl bg-purple-950/80 border border-purple-700/50 flex items-center justify-center shadow-xl shadow-purple-900/30">
              <Key className="h-8 w-8 text-purple-400 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Enter Master Admin Passkey</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This portal provides complete visibility into registered user accounts, notes, audio transcripts, and email delivery configurations.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                attemptUnlock(adminKey, true);
              }}
              className="w-full space-y-4"
            >
              <div className="relative">
                <input
                  type={showKeyInput ? 'text' : 'password'}
                  placeholder="Enter Master Passkey..."
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-purple-900/60 bg-slate-950 text-slate-100 placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showKeyInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none text-left">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500"
                />
                <span>Save passkey on this device (never ask again on this browser)</span>
              </label>

              {keyError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-900 text-xs text-rose-300 flex items-start gap-2 text-left">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{keyError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Admin Dashboard</span>
                  </>
                )}
              </button>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                Default Master Key: <code className="text-purple-300 font-mono">kairo-admin-2026</code>
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================= */
          /* UNLOCKED: COMPLETE ADMINISTRATOR WORKSPACE                */
          /* ========================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-purple-500/10 bg-slate-950/30 shrink-0">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-purple-400" />
                  <span>Total Accounts</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {adminData?.stats.totalAccounts ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Total Notes Synced</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {adminData?.stats.totalNotes ?? 0}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-amber-400" />
                  <span>Words Transcribed</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {(adminData?.stats.totalWords ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Classes Created</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {adminData?.stats.totalClasses ?? 0}
                </div>
              </div>
            </div>

            {/* Navigation Tabs & Search Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-b border-purple-500/10 bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('accounts');
                    setSelectedAccount(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'accounts'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Accounts Directory ({adminData?.accounts.length ?? 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('notes');
                    setSelectedAccount(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'notes'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>All Synced Notes ({adminData?.recentNotes.length ?? 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('raw');
                    setSelectedAccount(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'raw'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>Raw Database JSON</span>
                </button>
              </div>

              {/* Search input */}
              {activeTab !== 'raw' && (
                <div className="relative w-full sm:w-64">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'accounts'
                        ? 'Filter by email or name...'
                        : 'Search transcripts & notes...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
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

            {/* Tab Contents Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {dataError && (
                <div className="p-3 mb-4 rounded-xl bg-rose-950/70 border border-rose-900 text-xs text-rose-300">
                  {dataError}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 1: ACCOUNTS DIRECTORY                                */}
              {/* ========================================================= */}
              {activeTab === 'accounts' && !selectedAccount && (
                <div className="space-y-3">
                  {filteredAccounts.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                      <Users className="h-8 w-8 text-slate-600 mx-auto" />
                      <div className="text-sm font-bold text-slate-300">
                        {adminData?.accounts.length === 0
                          ? 'No Registered Cloud Accounts Yet'
                          : 'No accounts match your search'}
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {adminData?.accounts.length === 0
                          ? 'When users create an account in Settings > Cloud Account, their profile, email, notes, and classes will appear here automatically.'
                          : 'Try searching with a different name or email address.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredAccounts.map((account) => (
                        <div
                          key={account.id}
                          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center font-bold text-purple-300 text-sm">
                                  {account.name.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <div className="font-bold text-white text-sm">{account.name}</div>
                                  <div className="text-xs text-purple-300 font-mono flex items-center gap-1.5">
                                    <span>{account.email}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(account.email, `email-${account.id}`)}
                                      title="Copy email"
                                      className="text-slate-500 hover:text-slate-300 cursor-pointer"
                                    >
                                      {copiedText === `email-${account.id}` ? (
                                        <Check className="h-3 w-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <span className="text-[10px] text-slate-500">
                                Joined {new Date(account.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Stats & Delivery info */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                  Notes Synced
                                </span>
                                <span className="font-bold text-white text-sm">
                                  {account.notesCount}
                                </span>
                              </div>
                              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80">
                                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                                  Classes
                                </span>
                                <span className="font-bold text-white text-sm">
                                  {account.classesCount}
                                </span>
                              </div>
                            </div>

                            {/* Email delivery settings preview */}
                            {account.settings?.recipientEmail && (
                              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1">
                                <Mail className="h-3 w-3 text-purple-400" />
                                <span>Note Delivery Inbox:</span>
                                <span className="text-purple-300 font-mono font-medium">
                                  {account.settings.recipientEmail}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                            <button
                              type="button"
                              onClick={() => setSelectedAccount(account)}
                              className="px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Inspect Notes & Classes ({account.notesCount})</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setAccountToDelete(account)}
                              title="Delete user account"
                              className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* INSPECT SINGLE ACCOUNT VIEW                               */}
              {/* ========================================================= */}
              {activeTab === 'accounts' && selectedAccount && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedAccount(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to All Accounts</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountToDelete(selectedAccount)}
                      className="px-2.5 py-1 rounded-lg border border-rose-900/50 bg-rose-950/30 text-rose-300 text-xs hover:bg-rose-900/40 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete Account</span>
                    </button>
                  </div>

                  {/* User Profile Card */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-purple-900/50 border border-purple-700/60 flex items-center justify-center font-bold text-purple-300 text-lg">
                        {selectedAccount.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-white text-base">{selectedAccount.name}</div>
                        <div className="text-xs text-purple-300 font-mono flex items-center gap-1.5">
                          <span>{selectedAccount.email}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(selectedAccount.email, `email-${selectedAccount.id}`)
                            }
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            {copiedText === `email-${selectedAccount.id}` ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          User ID: <span className="font-mono">{selectedAccount.id}</span> &bull;
                          Joined: {new Date(selectedAccount.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-slate-900 text-xs font-bold text-purple-300 border border-slate-800">
                        {selectedAccount.notes.length} Notes Synced
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-slate-900 text-xs font-bold text-indigo-300 border border-slate-800">
                        {selectedAccount.classes.length} Classes
                      </span>
                    </div>
                  </div>

                  {/* User's Classes List */}
                  {selectedAccount.classes.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        User's Classes ({selectedAccount.classes.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedAccount.classes.map((cls) => (
                          <div
                            key={cls.id}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-950 border border-slate-800 flex items-center gap-2"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: cls.color || '#9333ea' }}
                            />
                            <span className="text-white">{cls.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User's Notes List */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      User's Notes & Transcripts ({selectedAccount.notes.length})
                    </div>

                    {selectedAccount.notes.length === 0 ? (
                      <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                        This user has not synced any voice notes yet.
                      </div>
                    ) : (
                      selectedAccount.notes.map((note) => {
                        const isExpanded = expandedNoteId === note.id;
                        return (
                          <div
                            key={note.id}
                            className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-white text-sm">{note.title}</div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(note.createdAt).toLocaleString()}</span>
                                  {note.duration && (
                                    <span>&bull; Duration: {Math.round(note.duration)}s</span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                              >
                                <span>{isExpanded ? 'Collapse' : 'Inspect Transcript & AI'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>

                            {/* Preview Snippet */}
                            {!isExpanded && note.transcript && (
                              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {note.transcript}
                              </p>
                            )}

                            {/* Full Detailed Expand View */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                                {/* Transcript */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                                      Full Audio Transcript
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopy(note.transcript || '', `tr-${note.id}`)
                                      }
                                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                    >
                                      {copiedText === `tr-${note.id}` ? (
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
                                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                                    {note.transcript || 'No transcript text available.'}
                                  </div>
                                </div>

                                {/* AI Summary */}
                                {note.summary && (
                                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/40 space-y-2.5">
                                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                      <span>AI Executive Summary</span>
                                    </div>
                                    <p className="text-xs text-slate-300 leading-relaxed">
                                      {note.summary.summary}
                                    </p>

                                    {note.summary.keyPoints && note.summary.keyPoints.length > 0 && (
                                      <div>
                                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                                          Key Takeaways
                                        </span>
                                        <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                                          {note.summary.keyPoints.map((kp, idx) => (
                                            <li key={idx}>{kp}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {note.summary.actionItems &&
                                      note.summary.actionItems.length > 0 && (
                                        <div>
                                          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">
                                            Action Items
                                          </span>
                                          <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                                            {note.summary.actionItems.map((ai, idx) => (
                                              <li key={idx}>{ai}</li>
                                            ))}
                                          </ul>
                                        </div>
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
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: GLOBAL NOTES FEED                                  */}
              {/* ========================================================= */}
              {activeTab === 'notes' && (
                <div className="space-y-3">
                  {/* User Filter Dropdown */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-semibold">Filter by Account:</span>
                    <select
                      value={selectedUserFilter}
                      onChange={(e) => setSelectedUserFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                    >
                      <option value="all">All Accounts ({adminData?.accounts.length ?? 0})</option>
                      {adminData?.accounts.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) - {u.notesCount} notes
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredNotes.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                      <FileText className="h-8 w-8 text-slate-600 mx-auto" />
                      <div className="text-sm font-bold text-slate-300">No notes found</div>
                      <p className="text-xs text-slate-500">
                        No voice notes have been synced under this filter.
                      </p>
                    </div>
                  ) : (
                    filteredNotes.map((note) => {
                      const isExpanded = expandedNoteId === note.id;
                      return (
                        <div
                          key={note.id}
                          className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-sm">{note.title}</h4>
                                <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800 text-[11px] font-medium text-purple-300">
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
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Preview Transcript */}
                          {!isExpanded && note.transcript && (
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {note.transcript}
                            </p>
                          )}

                          {/* Expanded Full Details */}
                          {isExpanded && (
                            <div className="pt-3 border-t border-slate-800 space-y-3">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                                    Full Transcript
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopy(note.transcript || '', `global-tr-${note.id}`)
                                    }
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
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                                  {note.transcript}
                                </div>
                              </div>

                              {note.summary && (
                                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/40 space-y-2">
                                  <div className="text-xs font-bold text-purple-300">
                                    AI Summary & Analysis
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

              {/* ========================================================= */}
              {/* TAB 3: RAW JSON DATABASE                                  */}
              {/* ========================================================= */}
              {activeTab === 'raw' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs text-slate-400">
                      Live data structure from <code className="text-purple-300">cloud_accounts.json</code>
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
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
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
                        onClick={() => AdminService.downloadBackup(adminKey)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Backup File</span>
                      </button>
                    </div>
                  </div>

                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-[60vh] leading-relaxed">
                    {JSON.stringify(adminData?.accounts || [], null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Secret Access Shortcuts Helper Footer */}
            <div className="px-5 py-2.5 border-t border-purple-500/10 bg-slate-950/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <span>Secret URL: <code className="text-purple-300 font-mono">#admin</code></span>
                <span>&bull;</span>
                <span>Keyboard Hotkey: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl + Shift + A</kbd></span>
              </div>
              <div className="text-slate-500">
                Key saved persistently on this device ✓
              </div>
            </div>
          </div>
        )}
      </div>

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

import React, { useState } from 'react';
import {
  Users,
  Search,
  Check,
  Copy,
  Mail,
  ChevronRight,
  Trash2,
  ArrowLeft,
  Key,
  Shield,
  Crown,
  Sparkles,
  BookOpen,
  Calendar,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  UserX,
  UserCheck,
} from 'lucide-react';
import { AdminUserAccount, AdminRecentNote } from '../../types';

interface AdminAccountsTabProps {
  accounts: AdminUserAccount[];
  isOwner: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onDeleteAccount: (account: AdminUserAccount) => void;
  onResetPassword: (
    userId: string,
    newPassword?: string
  ) => Promise<{ success: boolean; temporaryPassword?: string; message?: string; error?: string }>;
  onUpdateRole: (
    userId: string,
    role: 'owner' | 'admin' | 'vip' | 'user',
    status?: 'active' | 'suspended'
  ) => Promise<void>;
  selectedAccount: AdminUserAccount | null;
  onSelectAccount: (account: AdminUserAccount | null) => void;
  onInjectNoteClick?: (userId: string, userName: string) => void;
}

export const AdminAccountsTab: React.FC<AdminAccountsTabProps> = ({
  accounts,
  isOwner,
  searchQuery,
  onSearchChange,
  onDeleteAccount,
  onResetPassword,
  onUpdateRole,
  selectedAccount,
  onSelectAccount,
  onInjectNoteClick,
}) => {
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'admin' | 'vip' | 'user'>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<AdminUserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPass?: string; error?: string } | null>(null);

  // Role edit modal state
  const [roleModalUser, setRoleModalUser] = useState<AdminUserAccount | null>(null);
  const [targetRole, setTargetRole] = useState<'owner' | 'admin' | 'vip' | 'user'>('user');
  const [targetStatus, setTargetStatus] = useState<'active' | 'suspended'>('active');
  const [savingRole, setSavingRole] = useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredAccounts = accounts.filter((acc) => {
    // Role filter
    if (roleFilter !== 'all') {
      const userRole = acc.role || 'user';
      if (userRole !== roleFilter) return false;
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.id.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Crown className="h-3 w-3" />
            <span>Owner</span>
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Admin</span>
          </span>
        );
      case 'vip':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            <span>VIP Scholar</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            User
          </span>
        );
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;

    setResettingPassword(true);
    setResetResult(null);

    const res = await onResetPassword(
      resetModalUser.id,
      newPasswordInput.trim() || undefined
    );

    setResettingPassword(false);
    if (res.success) {
      setResetResult({ tempPass: res.temporaryPassword });
    } else {
      setResetResult({ error: res.error || 'Failed to reset password.' });
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;

    setSavingRole(true);
    await onUpdateRole(roleModalUser.id, targetRole, targetStatus);
    setSavingRole(false);
    setRoleModalUser(null);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header (if not inspecting single user) */}
      {!selectedAccount && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
          {/* Role Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'owner', 'admin', 'vip', 'user'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize cursor-pointer transition-colors ${
                  roleFilter === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {r === 'all' ? `All (${accounts.length})` : r}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Showing {filteredAccounts.length} of {accounts.length} accounts
          </div>
        </div>
      )}

      {/* VIEW 1: ACCOUNTS LIST */}
      {!selectedAccount && (
        <div className="space-y-3">
          {filteredAccounts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
              <Users className="h-8 w-8 text-slate-600 mx-auto" />
              <div className="text-sm font-bold text-slate-300">
                {accounts.length === 0 ? 'No Registered Cloud Accounts Yet' : 'No accounts match filters'}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Users who create cloud accounts in Kairo OS automatically synchronize their profile, notes, and classes here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/40 transition-all flex flex-col justify-between gap-3 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-purple-900/40 border border-purple-700/50 flex items-center justify-center font-bold text-purple-300 text-sm">
                          {account.name.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{account.name}</span>
                            {getRoleBadge(account.role)}
                            {account.status === 'suspended' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 border border-rose-800 text-rose-300">
                                Suspended
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-purple-300 font-mono flex items-center gap-1.5 mt-0.5">
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

                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Notes Synced
                        </span>
                        <span className="font-bold text-white text-sm">{account.notesCount}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Classes
                        </span>
                        <span className="font-bold text-white text-sm">{account.classesCount}</span>
                      </div>
                    </div>

                    {/* Email destination preview */}
                    {account.settings?.recipientEmail && (
                      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-purple-400 shrink-0" />
                        <span className="text-slate-500">Dispatch Inbox:</span>
                        <span className="text-purple-300 font-mono truncate">
                          {account.settings.recipientEmail}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-900/80 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectAccount(account)}
                      className="px-3 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Inspect Notes ({account.notesCount})</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Reset password button */}
                      <button
                        type="button"
                        onClick={() => {
                          setResetModalUser(account);
                          setNewPasswordInput('');
                          setResetResult(null);
                        }}
                        title="Reset User Password"
                        className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Key className="h-3 w-3 text-purple-400" />
                        <span className="hidden sm:inline">Reset Pass</span>
                      </button>

                      {/* Owner controls: Role & Suspend */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            setRoleModalUser(account);
                            setTargetRole(account.role || 'user');
                            setTargetStatus(account.status || 'active');
                          }}
                          title="Change Role / Status"
                          className="px-2 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Crown className="h-3 w-3 text-amber-400" />
                          <span className="hidden sm:inline">Role</span>
                        </button>
                      )}

                      {/* Delete account */}
                      <button
                        type="button"
                        onClick={() => onDeleteAccount(account)}
                        title="Delete User Account"
                        className="p-1.5 rounded-xl hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: INSPECT SINGLE ACCOUNT */}
      {selectedAccount && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectAccount(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to All Accounts Directory</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setResetModalUser(selectedAccount);
                  setNewPasswordInput('');
                  setResetResult(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 text-purple-400" />
                <span>Reset Password</span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteAccount(selectedAccount)}
                className="px-3 py-1.5 rounded-xl border border-rose-900/50 bg-rose-950/30 text-rose-300 text-xs hover:bg-rose-900/40 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-purple-900/50 border border-purple-700/60 flex items-center justify-center font-bold text-purple-300 text-lg">
                {selectedAccount.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{selectedAccount.name}</span>
                  {getRoleBadge(selectedAccount.role)}
                </div>
                <div className="text-xs text-purple-300 font-mono flex items-center gap-1.5 mt-0.5">
                  <span>{selectedAccount.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedAccount.email, `email-${selectedAccount.id}`)}
                    className="text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {copiedText === `email-${selectedAccount.id}` ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ID: <span className="font-mono">{selectedAccount.id}</span> &bull; Joined:{' '}
                  {new Date(selectedAccount.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-bold text-purple-300 border border-slate-800">
                {selectedAccount.notes.length} Notes Synced
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-xs font-bold text-indigo-300 border border-slate-800">
                {selectedAccount.classes.length} Classes
              </span>
            </div>
          </div>

          {/* User's Classes List */}
          {selectedAccount.classes.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Enrolled Class Folders ({selectedAccount.classes.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedAccount.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-800 flex items-center gap-2"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cls.color || '#9333ea' }}
                    />
                    <span className="text-white">{cls.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {cls.schedule || 'No schedule'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User's Notes List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Synchronized Notes & Audio Transcripts ({selectedAccount.notes.length})
            </div>

            {selectedAccount.notes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                This user has not recorded or synced any voice notes yet.
              </div>
            ) : (
              selectedAccount.notes.map((note) => {
                const isExpanded = expandedNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-sm">{note.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                          {note.duration && (
                            <>
                              <span>&bull;</span>
                              <span>{Math.round(note.duration)}s audio</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedNoteId(isExpanded ? null : note.id)}
                        className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs text-purple-300 border border-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    {/* AI Summary excerpt */}
                    {note.summary?.summary && (
                      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-purple-200/90 leading-relaxed">
                        <span className="font-bold text-purple-300 block mb-1">
                          AI Executive Summary:
                        </span>
                        {note.summary.summary}
                      </div>
                    )}

                    {/* Expanded details: transcript & key points */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2 border-t border-slate-900">
                        {/* Audio Transcript */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <span>Spoken Audio Transcript</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(note.transcript, `tr-${note.id}`)}
                              className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
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
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {note.transcript || 'No transcript recorded.'}
                          </div>
                        </div>

                        {/* Key points */}
                        {note.summary?.keyPoints && note.summary.keyPoints.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Key Study Points
                            </span>
                            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                              {note.summary.keyPoints.map((point, idx) => (
                                <li key={idx}>{point}</li>
                              ))}
                            </ul>
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

      {/* MODAL 1: RESET PASSWORD */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#140e2b] border border-purple-900 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-400" />
                <span>Reset User Password</span>
              </h3>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Reset password for <span className="text-purple-300 font-bold">{resetModalUser.name}</span> (
              <span className="font-mono text-slate-300">{resetModalUser.email}</span>).
            </p>

            {resetResult?.error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                {resetResult.error}
              </div>
            )}

            {resetResult?.tempPass && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Password Reset Successfully!</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 font-mono text-sm text-white flex items-center justify-between">
                  <span>{resetResult.tempPass}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(resetResult.tempPass!, 'temp-pass')}
                    className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {copiedText === 'temp-pass' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-[11px] text-emerald-300/80">
                  Provide this password to the student. They can sign in immediately and update their password in Settings.
                </p>
              </div>
            )}

            {!resetResult?.tempPass && (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password (leave blank to auto-generate secure temp password)
                  </label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Auto-generate or type custom..."
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resettingPassword ? 'Updating Password...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </form>
            )}

            {resetResult?.tempPass && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT ROLE & STATUS (OWNER ONLY) */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#140e2b] border border-amber-500/40 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <span>Edit User Role & Account Status</span>
              </h3>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Assign permission tier and access state for <span className="text-amber-300 font-bold">{roleModalUser.name}</span>.
            </p>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Platform Role / Clearance
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="user">👤 User (Standard Student)</option>
                  <option value="vip">🌟 VIP Scholar (Priority Transcripts)</option>
                  <option value="admin">🛡️ Administrator (Admin Panel Access)</option>
                  <option value="owner">👑 Co-Owner (Full Root Authority)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Account Access Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="active">Active (Normal Access)</option>
                  <option value="suspended">Suspended (Access Revoked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingRole ? 'Saving...' : 'Apply Role Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Crown,
  Key,
  Shield,
  ShieldAlert,
  Zap,
  Play,
  Trash2,
  Download,
  Upload,
  Radio,
  Clock,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Terminal,
  Activity,
  UserCheck,
} from 'lucide-react';
import { MaintenanceModeConfig, AuditLogEntry, AdminUserAccount } from '../../types';

interface OwnerConsoleTabProps {
  isOwner: boolean;
  maintenance?: MaintenanceModeConfig;
  auditLogs: AuditLogEntry[];
  accounts: AdminUserAccount[];
  onElevateToOwner: (code: string) => Promise<boolean>;
  onToggleMaintenance: (enabled: boolean, message?: string) => Promise<void>;
  onPurgeEmpty: () => Promise<void>;
  onRunAiTest: (
    model: string,
    prompt: string
  ) => Promise<{ success: boolean; model?: string; latencyMs?: number; reply?: string; error?: string }>;
  onRestoreDatabase: (backupData: any) => Promise<void>;
  onDownloadBackup: () => void;
  onInjectNote: (
    userId: string,
    title: string,
    transcript: string,
    className?: string
  ) => Promise<void>;
}

export const OwnerConsoleTab: React.FC<OwnerConsoleTabProps> = ({
  isOwner,
  maintenance,
  auditLogs,
  accounts,
  onElevateToOwner,
  onToggleMaintenance,
  onPurgeEmpty,
  onRunAiTest,
  onRestoreDatabase,
  onDownloadBackup,
  onInjectNote,
}) => {
  // Elevate state
  const [elevationCode, setElevationCode] = useState('');
  const [elevating, setElevating] = useState(false);
  const [elevationError, setElevationError] = useState<string | null>(null);

  // Maintenance state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(Boolean(maintenance?.enabled));
  const [maintenanceMsg, setMaintenanceMsg] = useState(
    maintenance?.message || 'Kairo Voice Notes OS is undergoing scheduled maintenance. Please check back shortly.'
  );
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [maintenanceSuccess, setMaintenanceSuccess] = useState(false);

  // AI Test state
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [aiPrompt, setAiPrompt] = useState('Ping diagnostic: verify API latency and token output for Kairo OS audio pipeline.');
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<{
    success?: boolean;
    model?: string;
    latencyMs?: number;
    reply?: string;
    error?: string;
  } | null>(null);

  // Purge state
  const [purging, setPurging] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  // Inject Note state
  const [targetUserId, setTargetUserId] = useState<string>(accounts[0]?.id || '');
  const [injectTitle, setInjectTitle] = useState('Master Study Guide: Cellular Respiration & ATP Synthesis');
  const [injectClass, setInjectClass] = useState('Biology 101');
  const [injectTranscript, setInjectTranscript] = useState(
    'In this lecture, we covered glycolysis, the citric acid cycle, and oxidative phosphorylation. ATP synthase operates like a molecular turbine powered by a proton gradient.'
  );
  const [injecting, setInjecting] = useState(false);
  const [injectSuccess, setInjectSuccess] = useState(false);

  // Restore DB state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleElevationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setElevationError(null);
    if (!elevationCode.trim()) return;

    setElevating(true);
    const ok = await onElevateToOwner(elevationCode.trim());
    setElevating(false);

    if (!ok) {
      setElevationError('Invalid Owner Code. Please check the code and try again.');
    }
  };

  const handleMaintenanceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMaintenance(true);
    setMaintenanceSuccess(false);
    await onToggleMaintenance(maintenanceEnabled, maintenanceMsg.trim());
    setSavingMaintenance(false);
    setMaintenanceSuccess(true);
    setTimeout(() => setMaintenanceSuccess(false), 4000);
  };

  const handleRunAi = async () => {
    setAiRunning(true);
    setAiResult(null);
    const res = await onRunAiTest(aiModel, aiPrompt);
    setAiRunning(false);
    setAiResult(res);
  };

  const handlePurge = async () => {
    if (!window.confirm('Are you sure you want to purge all empty accounts (0 notes and 0 classes)? This action is permanent.')) {
      return;
    }
    setPurging(true);
    setPurgeNotice(null);
    await onPurgeEmpty();
    setPurging(false);
    setPurgeNotice('Purge completed. Empty placeholder accounts have been cleaned.');
    setTimeout(() => setPurgeNotice(null), 4000);
  };

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    setInjecting(true);
    setInjectSuccess(false);
    await onInjectNote(targetUserId, injectTitle.trim(), injectTranscript.trim(), injectClass.trim());
    setInjecting(false);
    setInjectSuccess(true);
    setTimeout(() => setInjectSuccess(false), 4000);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);
    try {
      const parsed = JSON.parse(restoreJson);
      setRestoring(true);
      await onRestoreDatabase(parsed);
      setRestoring(false);
      setShowRestoreModal(false);
      setRestoreJson('');
      alert('Database restored successfully from snapshot!');
    } catch (err: any) {
      setRestoring(false);
      setRestoreError(err?.message || 'Invalid JSON snapshot format.');
    }
  };

  // If not elevated to owner, show elevation lock screen
  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto my-8 p-8 rounded-3xl bg-gradient-to-b from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/30 text-center space-y-6 shadow-2xl">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-900/30">
          <Crown className="h-8 w-8 text-amber-400 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Unlock Supreme Owner Console
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Owner tier unlocks root-level capabilities: emergency maintenance toggle, user role elevation, note injection, and direct cloud database restoration.
          </p>
        </div>

        <form onSubmit={handleElevationSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-1.5">
              Owner Access Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Enter owner code (Gizmo820)..."
                value={elevationCode}
                onChange={(e) => setElevationCode(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-200 placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <Key className="h-4 w-4 text-amber-400/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {elevationError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{elevationError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={elevating || !elevationCode.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {elevating ? (
              <span>Authenticating Elevation...</span>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                <span>Elevate to Supreme Owner</span>
              </>
            )}
          </button>

          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-center">
            <span className="text-[11px] text-amber-300/80 font-mono">
              Owner Passcode: <span className="font-bold text-amber-300">Gizmo820</span>
            </span>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-6">
      {/* Supreme Owner Active Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-yellow-950/60 border border-amber-500/40 shadow-xl shadow-amber-950/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center shadow-lg shadow-amber-900/30">
            <Crown className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                Supreme Owner Console (Root Mode)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                Code: Gizmo820
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Full unconstrained root authority. Direct control over student databases, AI models, maintenance modes, and security journals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadBackup}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>Download Full Backup</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRestoreModal(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-xs font-bold text-amber-200 border border-amber-700/60 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-amber-400" />
            <span>Restore Snapshot</span>
          </button>
        </div>
      </div>

      {purgeNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{purgeNotice}</span>
        </div>
      )}

      {/* Grid: Maintenance & Purge Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Platform Maintenance Mode */}
        <form
          onSubmit={handleMaintenanceSave}
          className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Emergency Maintenance Lock
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <span className={maintenanceEnabled ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                  {maintenanceEnabled ? 'System Locked' : 'Online Normal'}
                </span>
                <input
                  type="checkbox"
                  checked={maintenanceEnabled}
                  onChange={(e) => setMaintenanceEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-rose-500"
                />
              </label>
            </div>

            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
              When enabled, student sessions see a maintenance lockout banner. Only Admins and Owners can access workspace functions.
            </p>

            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Notice Message for Students
              </label>
              <textarea
                rows={2}
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                placeholder="Message shown to students during maintenance..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-900">
            {maintenanceSuccess ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Saved!</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                Status: {maintenance?.enabled ? 'Maintenance Active' : 'All Systems Operational'}
              </span>
            )}

            <button
              type="submit"
              disabled={savingMaintenance}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              {savingMaintenance ? 'Saving...' : 'Apply Maintenance Setting'}
            </button>
          </div>
        </form>

        {/* Card 2: Database Purge & Storage Optimization */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Trash2 className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Database Scrub & Maintenance
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
              Clean stale demo accounts created during testing that contain 0 notes and 0 classes. This reduces memory footprint and optimizes serialization times.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Total Registered Accounts:</span>
                <span className="font-bold text-white">{accounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Empty Accounts (0 notes, 0 classes):</span>
                <span className="font-bold text-amber-300">
                  {accounts.filter((a) => a.notesCount === 0 && a.classesCount === 0).length}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-900">
            <button
              type="button"
              onClick={handlePurge}
              disabled={purging}
              className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/60 text-xs font-bold text-rose-200 transition-colors cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{purging ? 'Purging Accounts...' : 'Purge All Empty Accounts'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card 3: Live Gemini AI Diagnostic & Benchmarking Console */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Gemini AI Diagnostics & Latency Tester
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAiModel('gemini-2.5-flash')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                aiModel === 'gemini-2.5-flash'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2.5 Flash
            </button>
            <button
              type="button"
              onClick={() => setAiModel('gemini-2.5-pro')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                aiModel === 'gemini-2.5-pro'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2.5 Pro
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-2">
            <label className="block text-[11px] font-semibold text-slate-400">
              Diagnostic Test Prompt
            </label>
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleRunAi}
              disabled={aiRunning || !aiPrompt.trim()}
              className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{aiRunning ? 'Executing Test...' : 'Run Model Benchmark'}</span>
            </button>
          </div>
        </div>

        {aiResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              aiResult.success
                ? 'bg-slate-900/90 border-amber-500/30 text-slate-200'
                : 'bg-rose-950/80 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-slate-800 pb-2">
              <span className="text-amber-300">Model: {aiResult.model}</span>
              <span className="text-slate-400">
                Latency: <span className="text-emerald-400 font-bold">{aiResult.latencyMs}ms</span>
              </span>
            </div>
            {aiResult.reply ? (
              <div className="font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {aiResult.reply}
              </div>
            ) : (
              <div className="text-rose-300">{aiResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Card 4: Direct Study Note Injector */}
      <form
        onSubmit={handleInject}
        className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Direct Cloud Study Note Injector
            </span>
          </div>
          {injectSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Note Injected into User Account!</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Target User Account
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Class / Subject Folder
            </label>
            <input
              type="text"
              value={injectClass}
              onChange={(e) => setInjectClass(e.target.value)}
              placeholder="e.g. Physics 101, History"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Note Title</label>
          <input
            type="text"
            required
            value={injectTitle}
            onChange={(e) => setInjectTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Voice Transcript Content (will be auto-summarized by AI)
          </label>
          <textarea
            rows={3}
            required
            value={injectTranscript}
            onChange={(e) => setInjectTranscript(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 resize-none font-sans"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={injecting || !targetUserId}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{injecting ? 'Synthesizing & Injecting...' : 'Inject Master Note'}</span>
          </button>
        </div>
      </form>

      {/* Card 5: Live Security Audit Log */}
      <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Security Journal & Audit Trail
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {auditLogs.length} Events Logged
          </span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No audit logs captured in this session.
            </div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-3 font-mono"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                    {log.action}
                  </span>
                  <span className="text-slate-300 truncate">{log.details}</span>
                </div>
                <div className="text-[10px] text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Restore DB Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#140e2b] border border-amber-500/40 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-amber-400" />
                <span>Restore Database from Snapshot</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste a previously exported database JSON object. This will overwrite current accounts with the snapshot state.
            </p>

            {restoreError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300">
                {restoreError}
              </div>
            )}

            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <textarea
                rows={8}
                required
                value={restoreJson}
                onChange={(e) => setRestoreJson(e.target.value)}
                placeholder='Paste database JSON here: {"user-id": { "id": "...", "name": "...", "notes": [] }}'
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restoring || !restoreJson.trim()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {restoring ? 'Restoring Database...' : 'Confirm Overwrite Restore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

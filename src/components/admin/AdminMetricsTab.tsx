import React from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  Mail,
  RefreshCw,
  Users,
  FileText,
  BookOpen,
  Folder,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AdminSystemMetrics } from '../../types';

interface AdminMetricsTabProps {
  metrics?: AdminSystemMetrics;
  stats?: {
    totalAccounts: number;
    totalNotes: number;
    totalWords: number;
    totalClasses: number;
  };
  onRefresh: () => void;
  refreshing: boolean;
  onRunAiTest?: () => void;
}

export const AdminMetricsTab: React.FC<AdminMetricsTabProps> = ({
  metrics,
  stats,
  onRefresh,
  refreshing,
  onRunAiTest,
}) => {
  const formatUptime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'Just started';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-400" />
            <span>Platform Telemetry & Infrastructure Metrics</span>
          </h3>
          <p className="text-xs text-slate-400">
            Real-time server operational metrics, compute consumption, and subsystem status.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* Grid of System Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Uptime */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Server Uptime</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatUptime(metrics?.uptimeSeconds)}
          </div>
          <div className="text-[10px] text-slate-500">
            Node.js runtime continuous uptime
          </div>
        </div>

        {/* Memory RSS */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Memory (RSS)</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {metrics?.memoryUsageMb ?? 0} <span className="text-xs font-normal text-slate-400">MB</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Resident Set Size container consumption
          </div>
        </div>

        {/* Database Size */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">JSON Database File</span>
            <HardDrive className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {metrics?.databaseSizeKb ?? 0} <span className="text-xs font-normal text-slate-400">KB</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Synchronized accounts file size on disk
          </div>
        </div>

        {/* Active Cloud Sessions */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Sessions</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {metrics?.activeSessions ?? 1}
          </div>
          <div className="text-[10px] text-slate-500">
            Live authenticated user tokens
          </div>
        </div>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gemini AI Subsystem */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-900/40 text-purple-400 border border-purple-800/40">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Google GenAI Gemini Engine</div>
                <div className="text-xs text-slate-400">Audio Summarization & Note Structuring</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              <span>Operational</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>SDK:</span>
              <span className="font-mono text-purple-300">@google/genai (Official)</span>
            </div>
            <div className="flex justify-between">
              <span>Primary Model:</span>
              <span className="font-mono text-purple-300">gemini-2.5-flash</span>
            </div>
            <div className="flex justify-between">
              <span>Pro Model:</span>
              <span className="font-mono text-purple-300">gemini-2.5-pro</span>
            </div>
          </div>

          {onRunAiTest && (
            <button
              type="button"
              onClick={onRunAiTest}
              className="w-full py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/60 text-xs font-bold text-purple-200 transition-colors cursor-pointer"
            >
              Run Gemini Latency & Token Diagnostic
            </button>
          )}
        </div>

        {/* SMTP Mailer Subsystem */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-900/40 text-indigo-400 border border-indigo-800/40">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Cloud Email Delivery Engine</div>
                <div className="text-xs text-slate-400">Study Guide & Note PDF Dispatch</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              <span>Connected</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Relay Server:</span>
              <span className="font-mono text-indigo-300">smtp.gmail.com:465</span>
            </div>
            <div className="flex justify-between">
              <span>Sender Identity:</span>
              <span className="font-mono text-indigo-300">kaironotescompany@gmail.com</span>
            </div>
            <div className="flex justify-between">
              <span>Transport Protocol:</span>
              <span className="font-mono text-indigo-300">SSL/TLS Secure</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center py-1">
            Automatic retry buffer active with zero dropped messages.
          </div>
        </div>
      </div>

      {/* Aggregate Volume Stats */}
      {stats && (
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Database Volume Aggregates
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Users className="h-3 w-3 text-purple-400" />
                <span>Accounts</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{stats.totalAccounts}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <FileText className="h-3 w-3 text-indigo-400" />
                <span>Total Notes</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{stats.totalNotes}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <BookOpen className="h-3 w-3 text-amber-400" />
                <span>Transcribed Words</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{stats.totalWords.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                <Folder className="h-3 w-3 text-emerald-400" />
                <span>Total Classes</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{stats.totalClasses}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

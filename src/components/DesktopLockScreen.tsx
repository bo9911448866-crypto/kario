import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  User,
  Mail,
  KeyRound,
  ArrowRight,
  Flame,
  Mic,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { UserAccount, VoiceNote, ClassItem } from '../types';
import { AuthService } from '../services/AuthService';

interface DesktopLockScreenProps {
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount, data?: { notes: VoiceNote[]; classes: ClassItem[]; settings: any }) => void;
  onContinueAsGuest: () => void;
  onUnlockExisting: () => void;
  onLogout: () => void;
}

export const DesktopLockScreen: React.FC<DesktopLockScreenProps> = ({
  currentUser,
  onLoginSuccess,
  onContinueAsGuest,
  onUnlockExisting,
  onLogout,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Mode: 'signin' | 'register' | 'unlock-user'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>(
    'signin'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setDateStr(
        now.toLocaleDateString([], {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await AuthService.login(email.trim(), password);
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to sign in. Check your credentials.');
      return;
    }

    setSuccessMsg('Signed in successfully! Loading desktop...');
    setTimeout(() => {
      onLoginSuccess(res.user!, res.data);
    }, 400);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await AuthService.register(email.trim(), password, name.trim());
    setIsLoading(false);

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Failed to create account.');
      return;
    }

    setSuccessMsg('Account created! Welcome to Kairo Desktop.');
    setTimeout(() => {
      onLoginSuccess(res.user!);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-10 select-none bg-radial from-[#1e1338]/80 via-[#0a0614]/90 to-[#040209] backdrop-blur-2xl text-slate-100 overflow-y-auto">
      {/* Top Header info */}
      <div className="w-full flex items-center justify-between text-xs text-purple-300/70 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-950 via-purple-700 to-violet-600 text-white shadow-xs">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-purple-200">Kairo OS</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-900/40 text-purple-300 text-[11px]">
          <Lock className="h-3 w-3" />
          <span>Locked</span>
        </div>
      </div>

      {/* Center Clock & Authentication Card */}
      <div className="w-full max-w-sm flex flex-col items-center my-auto py-6 space-y-6">
        {/* Large Sleek Clock */}
        <div className="text-center space-y-1">
          <div className="text-5xl sm:text-6xl font-extralight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(168,85,247,0.3)] font-mono">
            {timeStr || '10:00 AM'}
          </div>
          <div className="text-sm font-medium text-purple-300/80 tracking-wide">
            {dateStr || 'Friday, September 11'}
          </div>
        </div>

        {/* Existing Logged-in User Quick Unlock */}
        {currentUser ? (
          <div className="w-full p-6 rounded-2xl bg-[#140e2b]/90 border border-purple-900/60 shadow-2xl shadow-purple-950/50 backdrop-blur-xl text-center space-y-4">
            <div className="relative mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-600/30">
              <div className="w-full h-full rounded-full bg-[#160e30] flex items-center justify-center text-xl font-bold text-purple-200">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="absolute bottom-0 right-0 p-1 rounded-full bg-emerald-500 text-white shadow-xs">
                <CheckCircle2 className="h-3 w-3" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{currentUser.name || 'User'}</h3>
              <p className="text-xs text-purple-300/70 truncate">{currentUser.email}</p>
            </div>

            <button
              type="button"
              onClick={onUnlockExisting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Unlock Desktop</span>
            </button>

            <div className="pt-2 border-t border-purple-950/60 flex items-center justify-between text-xs text-purple-400">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="hover:text-purple-200 transition-colors cursor-pointer"
              >
                Switch Account
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="hover:text-rose-300 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Card */
          <div className="w-full p-6 rounded-2xl bg-[#140e2b]/90 border border-purple-900/60 shadow-2xl shadow-purple-950/50 backdrop-blur-xl space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-purple-950/60 border border-purple-900/50">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error / Success Banners */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-900 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form
              onSubmit={authMode === 'signin' ? handleSignIn : handleRegister}
              className="space-y-3"
            >
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-medium text-purple-300/80 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-purple-950/40 border border-purple-900/60 text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-purple-300/80 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-purple-950/40 border border-purple-900/60 text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-purple-300/80 mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-purple-950/40 border border-purple-900/60 text-purple-100 placeholder:text-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In & Enter' : 'Create & Enter'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Offline / Guest Mode Fallback */}
            <div className="pt-3 border-t border-purple-950/60 text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs text-purple-400 hover:text-purple-200 transition-colors cursor-pointer"
              >
                Continue as Guest (Offline Mode) &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Info */}
      <div className="text-center text-xs text-purple-400/50 shrink-0">
        <span>Kairo AI Voice Notes &bull; Intelligent Academic Workspace</span>
      </div>
    </div>
  );
};

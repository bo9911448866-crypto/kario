import { UserAccount, VoiceNote, ClassItem } from '../types';

const TOKEN_KEY = 'kairo_cloud_auth_token';
const USER_KEY = 'kairo_cloud_user';

export const AuthService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): UserAccount | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken() && this.getUser());
  },

  setSession(token: string, user: UserAccount) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  async register(
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to register account.' };
      }

      this.setSession(data.token, data.user);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during registration.' };
    }
  },

  async login(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    data?: { notes: VoiceNote[]; classes: ClassItem[]; settings: any };
    error?: string;
  }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid email or password.' };
      }

      this.setSession(data.token, data.user);
      return {
        success: true,
        user: data.user,
        data: data.data,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during login.' };
    }
  },

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    this.clearSession();
  },

  async getMe(): Promise<UserAccount | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        this.setSession(token, data.user);
        return data.user;
      }
      // If expired or invalid token
      this.clearSession();
      return null;
    } catch {
      return this.getUser();
    }
  },

  async syncToCloud(
    notes: VoiceNote[],
    classes: ClassItem[],
    settings?: any
  ): Promise<{ success: boolean; syncedAt?: string; error?: string }> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Sign in to sync your notes to the cloud.' };
    }

    try {
      const res = await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes, classes, settings }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to sync with cloud.' };
      }

      return { success: true, syncedAt: data.syncedAt };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during cloud sync.' };
    }
  },
};

import { AdminData } from '../types';

const ADMIN_STORAGE_KEY = 'kairo_admin_master_key';

export const AdminService = {
  getSavedKey(): string | null {
    try {
      return localStorage.getItem(ADMIN_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  saveKey(key: string): void {
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, key.trim());
    } catch (err) {
      console.warn('Failed to save admin key in localStorage', err);
    }
  },

  clearKey(): void {
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear admin key from localStorage', err);
    }
  },

  async verifyKey(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resp = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key.trim(),
        },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid Admin Passkey.',
        };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to admin service.',
      };
    }
  },

  async fetchAdminData(
    customKey?: string
  ): Promise<{ success: boolean; data?: AdminData; error?: string; isUnauthorized?: boolean }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      if (!key) {
        return { success: false, isUnauthorized: true, error: 'Admin key required.' };
      }

      const resp = await fetch('/api/admin/data', {
        headers: {
          'x-admin-key': key,
        },
      });

      const data = await resp.json();
      if (resp.status === 401) {
        return {
          success: false,
          isUnauthorized: true,
          error: data.error || 'Admin passkey is invalid or has expired.',
        };
      }

      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to load administrator data.',
        };
      }

      return {
        success: true,
        data: {
          stats: data.stats,
          accounts: data.accounts || [],
          recentNotes: data.recentNotes || [],
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error fetching admin data.',
      };
    }
  },

  async deleteAccount(
    userId: string,
    customKey?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const resp = await fetch(`/api/admin/account/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': key,
        },
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Failed to delete account.',
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error deleting account.',
      };
    }
  },

  async downloadBackup(customKey?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const resp = await fetch('/api/admin/export', {
        headers: {
          'x-admin-key': key,
        },
      });

      if (!resp.ok) {
        return { success: false, error: 'Failed to download database backup.' };
      }

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kairo_cloud_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to download backup.',
      };
    }
  },
};

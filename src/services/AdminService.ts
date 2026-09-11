import { AdminData, PlatformAnnouncement, MaintenanceModeConfig } from '../types';

const ADMIN_STORAGE_KEY = 'kairo_admin_master_key';
const OWNER_STORAGE_KEY = 'kairo_owner_master_code';

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
      localStorage.removeItem(OWNER_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear admin key from localStorage', err);
    }
  },

  getSavedOwnerCode(): string | null {
    try {
      return localStorage.getItem(OWNER_STORAGE_KEY);
    } catch {
      return null;
    }
  },

  saveOwnerCode(code: string): void {
    try {
      localStorage.setItem(OWNER_STORAGE_KEY, code.trim());
    } catch (err) {
      console.warn('Failed to save owner code in localStorage', err);
    }
  },

  clearOwnerCode(): void {
    try {
      localStorage.removeItem(OWNER_STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to clear owner code from localStorage', err);
    }
  },

  async verifyKey(key: string): Promise<{ success: boolean; isOwner?: boolean; role?: 'admin' | 'owner'; error?: string; message?: string }> {
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
      return {
        success: true,
        isOwner: Boolean(data.isOwner),
        role: data.role || (data.isOwner ? 'owner' : 'admin'),
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to admin service.',
      };
    }
  },

  async elevateToOwner(
    ownerCode: string,
    adminKey?: string
  ): Promise<{ success: boolean; isOwner?: boolean; role?: 'owner'; message?: string; error?: string }> {
    try {
      const key = (adminKey || this.getSavedKey() || '').trim();
      const resp = await fetch('/api/admin/elevate-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key,
        },
        body: JSON.stringify({ ownerCode: ownerCode.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          error: data.error || 'Invalid Owner Code. Elevation denied.',
        };
      }
      this.saveOwnerCode(ownerCode.trim());
      return {
        success: true,
        isOwner: true,
        role: 'owner',
        message: data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error connecting to owner service.',
      };
    }
  },

  async fetchAdminData(
    customKey?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; data?: AdminData; error?: string; isUnauthorized?: boolean }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();

      if (!key && !ownerCode) {
        return { success: false, isUnauthorized: true, error: 'Admin key required.' };
      }

      const headers: Record<string, string> = {};
      if (key) headers['x-admin-key'] = key;
      if (ownerCode) headers['x-owner-key'] = ownerCode;

      const resp = await fetch('/api/admin/data', { headers });
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
          metrics: data.metrics,
          announcement: data.announcement,
          maintenance: data.maintenance,
          auditLogs: data.auditLogs || [],
          isOwner: Boolean(data.isOwner),
          currentRole: data.currentRole,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error fetching admin data.',
      };
    }
  },

  async updateAnnouncement(
    announcement: { message: string; type: 'info' | 'warning' | 'alert' | 'success'; active: boolean },
    customKey?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; announcement?: PlatformAnnouncement; message?: string; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['x-admin-key'] = key;
      if (ownerCode) headers['x-owner-key'] = ownerCode;

      const resp = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers,
        body: JSON.stringify(announcement),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update announcement.' };
      }
      return { success: true, announcement: data.announcement, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating announcement.' };
    }
  },

  async resetUserPassword(
    userId: string,
    newPassword?: string,
    customKey?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; temporaryPassword?: string; message?: string; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['x-admin-key'] = key;
      if (ownerCode) headers['x-owner-key'] = ownerCode;

      const resp = await fetch('/api/admin/user/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, newPassword }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to reset user password.' };
      }
      return { success: true, temporaryPassword: data.temporaryPassword, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error resetting password.' };
    }
  },

  async updateUserRole(
    userId: string,
    role: 'owner' | 'admin' | 'vip' | 'user',
    status?: 'active' | 'suspended',
    customOwnerKey?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-owner-key': ownerCode,
      };

      const resp = await fetch('/api/admin/user/role', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, role, status }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update user role.' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating user role.' };
    }
  },

  async toggleMaintenance(
    enabled: boolean,
    message?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; maintenance?: MaintenanceModeConfig; message?: string; error?: string }> {
    try {
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-owner-key': ownerCode,
      };

      const resp = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers,
        body: JSON.stringify({ enabled, message }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to update maintenance mode.' };
      }
      return { success: true, maintenance: data.maintenance, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating maintenance mode.' };
    }
  },

  async purgeEmptyAccounts(
    customOwnerKey?: string
  ): Promise<{ success: boolean; purgedCount?: number; message?: string; error?: string }> {
    try {
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-owner-key': ownerCode,
      };

      const resp = await fetch('/api/admin/purge-empty', {
        method: 'POST',
        headers,
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to purge empty accounts.' };
      }
      return { success: true, purgedCount: data.purgedCount, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error purging empty accounts.' };
    }
  },

  async injectNote(
    userId: string,
    title: string,
    transcript: string,
    className?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; message?: string; note?: any; error?: string }> {
    try {
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-owner-key': ownerCode,
      };

      const resp = await fetch('/api/admin/inject-note', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, title, transcript, className }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to inject note.' };
      }
      return { success: true, message: data.message, note: data.note };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error injecting note.' };
    }
  },

  async testGeminiAI(
    model?: string,
    prompt?: string,
    customKey?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; model?: string; latencyMs?: number; reply?: string; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['x-admin-key'] = key;
      if (ownerCode) headers['x-owner-key'] = ownerCode;

      const resp = await fetch('/api/admin/test-ai', {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, prompt }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return {
          success: false,
          model: data.model,
          latencyMs: data.latencyMs,
          error: data.error || 'AI diagnostic failed.',
        };
      }
      return {
        success: true,
        model: data.model,
        latencyMs: data.latencyMs,
        reply: data.reply,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error during AI test.' };
    }
  },

  async restoreDatabase(
    backupData: any,
    customOwnerKey?: string
  ): Promise<{ success: boolean; count?: number; message?: string; error?: string }> {
    try {
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-owner-key': ownerCode,
      };

      const resp = await fetch('/api/admin/restore-database', {
        method: 'POST',
        headers,
        body: JSON.stringify({ backupData }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to restore database.' };
      }
      return { success: true, count: data.count, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error restoring database.' };
    }
  },

  async deleteAccount(
    userId: string,
    customKey?: string,
    customOwnerKey?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {};
      if (key) headers['x-admin-key'] = key;
      if (ownerCode) headers['x-owner-key'] = ownerCode;

      const resp = await fetch(`/api/admin/account/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers,
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

  async downloadBackup(customKey?: string, customOwnerKey?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const key = (customKey || this.getSavedKey() || '').trim();
      const ownerCode = (customOwnerKey || this.getSavedOwnerCode() || '').trim();
      const headers: Record<string, string> = {};
      if (key) headers['x-admin-key'] = key;
      if (ownerCode) headers['x-owner-key'] = ownerCode;

      const resp = await fetch('/api/admin/export', { headers });

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

  async fetchPlatformStatus(): Promise<{
    announcement?: PlatformAnnouncement;
    maintenance?: MaintenanceModeConfig;
  }> {
    try {
      const resp = await fetch('/api/platform/status');
      if (!resp.ok) return {};
      return await resp.json();
    } catch {
      return {};
    }
  },
};


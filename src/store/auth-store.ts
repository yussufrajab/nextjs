import { create } from 'zustand';
import type { User, Role } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'auth-store' });

/**
 * UI-safe auth state held IN MEMORY only. Nothing is persisted to localStorage.
 * The backend is the source of truth: state is hydrated from GET /api/auth/me
 * on page load. The session credential lives only in the HttpOnly `session`
 * cookie, which JavaScript cannot read.
 *
 * The CSRF token is intentionally NOT stored here — apiClient reads it from
 * the `csrf-token` cookie (double-submit pattern) when making state-changing
 * requests.
 */
export interface SafeUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: Role;
  active: boolean;
  employeeId?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  mustChangePassword?: boolean;
  isTemporaryPassword?: boolean;
  temporaryPasswordExpiry?: string | null;
  lastPasswordChange?: string | null;
}

interface AuthState {
  user: SafeUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  setUserManually: (user: User) => void;
  initializeAuth: () => Promise<void>;
  refreshUserData: () => Promise<boolean>;
}

function toSafeUser(payload: any): SafeUser {
  return {
    id: payload.id,
    name: payload.name,
    username: payload.username,
    email: payload.email ?? null,
    role: payload.role as Role,
    active: payload.active,
    employeeId: payload.employeeId ?? null,
    institutionId: payload.institutionId ?? null,
    institutionName: payload.institutionName ?? null,
    mustChangePassword: payload.mustChangePassword ?? false,
    isTemporaryPassword: payload.isTemporaryPassword ?? false,
    temporaryPasswordExpiry: payload.temporaryPasswordExpiry ?? null,
    lastPasswordChange: payload.lastPasswordChange ?? null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      log.info({ username }, 'Login start');
      const response = await apiClient.login(username, password);

      if (response.code === 'SESSION_LIMIT_REACHED') {
        const error: any = new Error('SESSION_LIMIT_REACHED');
        error.activeSessions = response.data?.activeSessions || [];
        error.userId = response.data?.userId;
        throw error;
      }

      if (response.code === 'MFA_REQUIRED') {
        const mfaError: any = new Error('MFA_REQUIRED');
        mfaError.userId = response.data?.userId;
        mfaError.email = response.data?.email;
        throw mfaError;
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Login failed');
      }

      // The backend login response carries a user object for immediate render.
      // Extract it (the response is double-wrapped) and set in-memory state.
      const backendResponse = response.data;
      let authData = null;
      if (backendResponse?.data?.data) {
        authData = backendResponse.data.data;
      } else if (backendResponse?.data && (backendResponse.data.token || backendResponse.data.user)) {
        authData = backendResponse.data;
      } else if (backendResponse?.token || backendResponse?.user) {
        authData = backendResponse;
      }

      const userData = authData?.user;
      if (!userData || !userData.id || !userData.username || !userData.role) {
        log.error('Missing required user fields in login response');
        return null;
      }

      const user: User = {
        id: userData.id,
        name: userData.fullName || userData.name || userData.username,
        username: userData.username,
        password: '',
        role: userData.role as Role,
        active: userData.isEnabled !== undefined ? userData.isEnabled : userData.active !== undefined ? userData.active : true,
        employeeId: userData.employeeId,
        institutionId: userData.institutionId,
        institution: userData.institutionName ? { name: userData.institutionName } : userData.institution,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.lastLoginDate ? new Date(userData.lastLoginDate) : new Date(),
        mustChangePassword: userData.mustChangePassword,
        isTemporaryPassword: userData.isTemporaryPassword,
        temporaryPasswordExpiry: userData.temporaryPasswordExpiry ?? null,
      };

      set({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: (userData as any).email ?? null,
          role: user.role,
          active: user.active,
          employeeId: user.employeeId,
          institutionId: user.institutionId,
          institutionName: userData.institutionName ?? null,
          mustChangePassword: user.mustChangePassword,
          isTemporaryPassword: user.isTemporaryPassword,
          temporaryPasswordExpiry:
            user.temporaryPasswordExpiry instanceof Date
              ? user.temporaryPasswordExpiry.toISOString()
              : (user.temporaryPasswordExpiry ?? null),
          lastPasswordChange: null,
        },
        role: user.role,
        isAuthenticated: true,
      });

      // Nothing persisted. /auth/me remains the source of truth on reload.
      return user;
    } catch (error) {
      log.error({ err: error }, 'Login error');
      throw error;
    }
  },

  logout: async () => {
    try {
      const currentUserId = get().user?.id;
      await apiClient.logout(currentUserId);
    } catch (error) {
      log.error({ err: error }, 'Logout error');
    } finally {
      apiClient.clearToken();
      set({ user: null, role: null, isAuthenticated: false });
    }
  },

  setUserManually: (user: User) => {
    set({ user: toSafeUser(user), role: user.role, isAuthenticated: true });
  },

  initializeAuth: async () => {
    // One-time migration: clear any leftover localStorage from the old
    // persist-based design so stale sensitive data is gone immediately.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
    }

    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (response.status === 401) {
        set({ user: null, role: null, isAuthenticated: false });
        return;
      }

      if (!response.ok) {
        log.error({ status: response.status }, 'initializeAuth: /auth/me failed');
        set({ user: null, role: null, isAuthenticated: false });
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        set({
          user: toSafeUser(result.data),
          role: result.data.role as Role,
          isAuthenticated: true,
        });
        log.info({ userId: result.data.id, role: result.data.role }, 'Auth state hydrated from /auth/me');
        return;
      }

      set({ user: null, role: null, isAuthenticated: false });
    } catch (error) {
      log.error({ err: error }, 'initializeAuth error');
      set({ user: null, role: null, isAuthenticated: false });
    }
  },

  refreshUserData: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!response.ok) {
        log.error({ status: response.status }, 'refreshUserData failed');
        return false;
      }
      const result = await response.json();
      if (result.success && result.data) {
        set({ user: toSafeUser(result.data), role: result.data.role as Role });
        return true;
      }
      return false;
    } catch (error) {
      log.error({ err: error }, 'refreshUserData error');
      return false;
    }
  },
}));
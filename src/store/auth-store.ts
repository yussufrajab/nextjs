import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Role } from '@/lib/types';
import { apiClient, LoginResponse } from '@/lib/api-client';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'auth-store' });

/**
 * The auth cookie is now set server-side (httpOnly, Secure, SameSite=Strict)
 * via the login response in src/lib/auth-helpers.ts.
 *
 * Client-side cookie helpers are kept for logout (clearing) and for the
 * transition period where both old and new formats may exist.
 */

/**
 * Clear the auth cookie (client-side fallback for logout)
 */
function clearAuthCookie() {
  if (typeof window === 'undefined') return;
  document.cookie =
    'auth-storage=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

interface AuthState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  sessionToken: string | null; // Session token for concurrent session management
  csrfToken: string | null; // CSRF token for protection against CSRF attacks
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  setUserManually: (user: User) => void;
  refreshAuthToken: () => Promise<boolean>;
  initializeAuth: () => void;
  updateTokenFromApiClient: (newAccessToken: string) => void;
  getCSRFToken: () => string | null; // Helper to get CSRF token
  refreshUserData: () => Promise<boolean>; // Refresh user data from database
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      sessionToken: null,
      csrfToken: null,

      login: async (username: string, password: string) => {
        try {
          log.info('Login start');
          log.info({ username }, 'Attempting login');
          const response = await apiClient.login(username, password);
          log.info({ hasData: !!response.data, code: response.code }, 'API login response received');

          // Check if it's a session limit error
          if (response.code === 'SESSION_LIMIT_REACHED') {
            const error: any = new Error('SESSION_LIMIT_REACHED');
            error.activeSessions = response.data?.activeSessions || [];
            error.userId = response.data?.userId;
            throw error;
          }

          // Check if MFA is required
          if (response.code === 'MFA_REQUIRED') {
            const mfaError: any = new Error('MFA_REQUIRED');
            mfaError.userId = response.data?.userId;
            mfaError.email = response.data?.email;
            throw mfaError;
          }

          if (!response.success || !response.data) {
            log.error({ message: response.message }, 'Login failed');
            // Throw error with the server's message so the form can display it
            throw new Error(response.message || 'Login failed');
          }

          log.info({ success: response.success, hasData: !!response.data }, 'Full login response');

          // The API client response structure is now { success: true, data: backendResponse }
          // The backend response is { success: true, data: authData, message: string }
          const backendResponse = response.data;
          log.info({ keys: backendResponse ? Object.keys(backendResponse) : [] }, 'Backend response structure');

          // The Spring Boot response wraps auth data in another data property
          log.debug({ backendResponseKeys: backendResponse ? Object.keys(backendResponse) : 'none' }, 'Checking backend response structure');

          // The backend wraps AuthResponse in { success, message, data }
          // So we need to extract the AuthResponse from data property
          let authData = null;

          // Backend response structure: { success: true, message: "...", data: AuthResponse }
          // But the logging shows backendResponse.data also has nested structure
          // Check if we have the deeply nested structure
          if (backendResponse?.data?.data) {
            // Handle deeply nested structure
            authData = backendResponse.data.data;
            log.info('Found authData in backendResponse.data.data (deeply nested)');
          } else if (
            backendResponse?.data &&
            (backendResponse.data.token || backendResponse.data.user)
          ) {
            // Handle single nested structure
            authData = backendResponse.data;
            log.info('Found authData in backendResponse.data');
          } else if (backendResponse?.token || backendResponse?.user) {
            // Fallback: if the response is already the AuthResponse
            authData = backendResponse;
            log.info('Using backendResponse directly as authData');
          } else {
            log.error('Could not find auth data in response');
            return null;
          }

          log.info({ authDataKeys: authData ? Object.keys(authData) : [] }, 'Final authData');

          // SpringBoot AuthResponse format: { token, refreshToken, tokenType, expiresIn, user: {...} }
          const token = authData?.token;
          const refreshToken = authData?.refreshToken;
          const userData = authData?.user;

          log.info({ hasToken: !!token, hasRefreshToken: !!refreshToken }, 'Extracted Spring Boot AuthResponse');
          log.info({ userData }, 'Extracted user data');

          // Convert backend user format to frontend user format
          // Validate that we have user data
          if (!userData) {
            log.error('No user data in auth response');
            return null;
          }

          log.info({ role: userData.role, roleType: typeof userData.role }, 'Raw role from backend');

          // Ensure we have required fields
          if (!userData.id || !userData.username || !userData.role) {
            log.error({ hasId: !!userData.id, hasUsername: !!userData.username, hasRole: !!userData.role }, 'Missing required user fields');
            return null;
          }

          const user: User = {
            id: userData.id,
            name: userData.fullName || userData.name || userData.username, // Backend returns fullName
            username: userData.username,
            password: '', // Don't store password
            role: userData.role as Role,
            active:
              userData.isEnabled !== undefined
                ? userData.isEnabled
                : userData.enabled !== undefined
                  ? userData.enabled
                  : true, // Backend returns isEnabled
            employeeId: userData.employeeId,
            institutionId: userData.institutionId,
            institution: userData.institutionName
              ? { id: userData.institutionId, name: userData.institutionName }
              : userData.institution,
            // Convert dates to strings for proper serialization
            createdAt: userData.createdAt
              ? new Date(userData.createdAt)
              : new Date(),
            updatedAt: userData.lastLoginDate
              ? new Date(userData.lastLoginDate)
              : new Date(),

            // Password Policy Fields
            passwordHistory: userData.passwordHistory,
            isTemporaryPassword: userData.isTemporaryPassword,
            temporaryPasswordExpiry: userData.temporaryPasswordExpiry
              ? new Date(userData.temporaryPasswordExpiry)
              : null,
            mustChangePassword: userData.mustChangePassword,
            lastPasswordChange: userData.lastPasswordChange
              ? new Date(userData.lastPasswordChange)
              : null,
            failedPasswordChangeAttempts: userData.failedPasswordChangeAttempts,
            passwordChangeLockoutUntil: userData.passwordChangeLockoutUntil
              ? new Date(userData.passwordChangeLockoutUntil)
              : null,
          };

          log.info({ role: user.role, roleType: typeof user.role }, 'Constructed user object');

          log.info('Setting auth state with role: ' + String(user.role));

          // Validate role before setting
          if (!user.role) {
            log.error('Warning: User role is null/undefined, this should not happen');
          }

          // Ensure role is properly set - extract it directly to avoid any reference issues
          const userRole = user.role;
          log.info({ userRole }, 'Setting auth state - user role extracted');

          // Update API client with the token
          if (token) {
            apiClient.setToken(token);
          }

          // Extract CSRF token from backend response
          const csrfToken = backendResponse?.csrfToken || null;
          log.info({ hasCsrfToken: !!csrfToken }, 'CSRF token extracted');

          set({
            user,
            role: userRole,
            isAuthenticated: true,
            accessToken: token || null,
            refreshToken: refreshToken || null,
            csrfToken: csrfToken,
          });

          // Auth cookie is now set server-side (httpOnly) in auth-helpers.ts
          // No client-side cookie setting needed

          // Verify the state was set correctly
          const newState = get();
          log.info({ userId: newState.user?.id, role: newState.role, isAuthenticated: newState.isAuthenticated, hasAccessToken: !!newState.accessToken }, 'Auth state after setting');

          return user;
        } catch (error) {
          log.error({ err: error }, 'Login error');
          // Re-throw the error so the login form can display it
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
          clearAuthCookie();
          if (typeof window !== 'undefined') {
            document.cookie =
              'csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
          set({
            user: null,
            role: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
            sessionToken: null,
            csrfToken: null,
          });
        }
      },

      refreshAuthToken: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          return false;
        }

        try {
          const response = await apiClient.refreshToken(refreshToken);

          if (!response.success || !response.data) {
            // Refresh failed, logout user
            get().logout();
            return false;
          }

          const newAccessToken = response.data.token;
          const newRefreshToken = response.data.refreshToken;

          // Update API client with new token
          apiClient.setToken(newAccessToken);

          // Update store
          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          return true;
        } catch (error) {
          log.error({ err: error }, 'Token refresh error');
          get().logout();
          return false;
        }
      },

      setUserManually: (user: User) => {
        set({ user, role: user.role, isAuthenticated: true });
      },

      initializeAuth: () => {
        // For session-based auth, just check if user data is persisted
        const currentState = get();
        log.info({ hasUser: !!currentState.user, role: currentState.role, userRole: currentState.user?.role, isAuthenticated: currentState.isAuthenticated, username: currentState.user?.username }, 'initializeAuth - current state');

        // Clear inconsistent auth state - if authenticated but no user data
        if (
          currentState.isAuthenticated &&
          (!currentState.user || !currentState.role)
        ) {
          log.info('Clearing inconsistent auth state - authenticated but no user/role data');
          clearAuthCookie();
          set({ user: null, role: null, isAuthenticated: false });
          return;
        }

        // Clear stale development data
        if (currentState.user?.name === 'System Administrator') {
          log.info('Clearing stale development user data');
          clearAuthCookie();
          set({ user: null, role: null, isAuthenticated: false });
          return;
        }

        // Ensure role consistency after initialization
        if (
          currentState.user &&
          currentState.user.role &&
          currentState.role !== currentState.user.role
        ) {
          log.info({ stateRole: currentState.role, userRole: currentState.user.role }, 'initializeAuth: Fixing role mismatch');
          set({ role: currentState.user.role });
        }

        if (currentState.user && !currentState.isAuthenticated) {
          log.info('Setting isAuthenticated to true');
          set({ isAuthenticated: true });
        }

        // Auth cookie is managed server-side (httpOnly).
        // Client-side persistence is handled by Zustand localStorage middleware.

        // Refresh user data from database to pick up institution name
        // and other profile changes that may have occurred since login
        if (currentState.isAuthenticated && currentState.user) {
          get().refreshUserData();
        }
      },

      // Add a method to sync token updates from API client
      updateTokenFromApiClient: (newAccessToken: string) => {
        set({ accessToken: newAccessToken });
      },

      // Helper to get CSRF token
      getCSRFToken: () => {
        return get().csrfToken;
      },

      // Refresh user data from database
      refreshUserData: async () => {
        try {
          log.info('Refreshing user data from database');
          const response = await fetch(`/api/auth/refresh-user-data?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });

          if (!response.ok) {
            log.error({ status: response.status }, 'Failed to refresh user data');
            return false;
          }

          const result = await response.json();

          if (result.success && result.data) {
            log.info('User data refreshed successfully');

            // Update the store with fresh user data
            // Construct institution object from institutionId/institutionName
            // to match User type which expects { id, name } object
            const refreshedUser = {
              ...result.data,
              institution: result.data.institutionName
                ? { id: result.data.institutionId, name: result.data.institutionName }
                : result.data.institution,
              createdAt: new Date(result.data.createdAt),
              updatedAt: new Date(result.data.updatedAt),
              temporaryPasswordExpiry: result.data.temporaryPasswordExpiry
                ? new Date(result.data.temporaryPasswordExpiry)
                : null,
              lastPasswordChange: result.data.lastPasswordChange
                ? new Date(result.data.lastPasswordChange)
                : null,
              passwordChangeLockoutUntil: result.data.passwordChangeLockoutUntil
                ? new Date(result.data.passwordChangeLockoutUntil)
                : null,
            };
            set({
              user: refreshedUser,
              role: result.data.role,
            });

            // Auth cookie is managed server-side (httpOnly).
            // No client-side cookie update needed.

            return true;
          }

          log.error('Invalid response from refresh endpoint');
          return false;
        } catch (error) {
          log.error({ err: error }, 'Error refreshing user data');
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist user authentication state including role
      partialize: (state) => {
        log.info({ hasUser: !!state.user, role: state.role, userRole: state.user?.role, isAuthenticated: state.isAuthenticated, username: state.user?.username }, 'Partializing state for persistence');

        // Ensure the user object is properly serializable by converting Dates to ISO strings
        const serializableUser = state.user
          ? {
              ...state.user,
              createdAt:
                state.user.createdAt instanceof Date
                  ? state.user.createdAt
                  : new Date(state.user.createdAt),
              updatedAt:
                state.user.updatedAt instanceof Date
                  ? state.user.updatedAt
                  : new Date(state.user.updatedAt),
              temporaryPasswordExpiry:
                state.user.temporaryPasswordExpiry instanceof Date
                  ? state.user.temporaryPasswordExpiry
                  : state.user.temporaryPasswordExpiry
                    ? new Date(state.user.temporaryPasswordExpiry)
                    : null,
              lastPasswordChange:
                state.user.lastPasswordChange instanceof Date
                  ? state.user.lastPasswordChange
                  : state.user.lastPasswordChange
                    ? new Date(state.user.lastPasswordChange)
                    : null,
              passwordChangeLockoutUntil:
                state.user.passwordChangeLockoutUntil instanceof Date
                  ? state.user.passwordChangeLockoutUntil
                  : state.user.passwordChangeLockoutUntil
                    ? new Date(state.user.passwordChangeLockoutUntil)
                    : null,
            }
          : null;

        const persistedState = {
          user: serializableUser,
          role: state.role,
          isAuthenticated: state.isAuthenticated,
          csrfToken: state.csrfToken,
        };

        log.info({ hasUser: !!persistedState.user, role: persistedState.role, isAuthenticated: persistedState.isAuthenticated }, 'State being persisted');
        return persistedState;
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            log.error({ err: error }, 'Auth store rehydration error');
          } else if (state) {
            log.info({ hasUser: !!state.user, role: state.role, userRole: state.user?.role, isAuthenticated: state.isAuthenticated, userId: state.user?.id, username: state.user?.username, hasAccessToken: !!state.accessToken, hasRefreshToken: !!state.refreshToken }, 'Auth store rehydrated successfully');

            // Restore Date objects from strings after rehydration
            if (state.user) {
              if (typeof state.user.createdAt === 'string') {
                state.user.createdAt = new Date(state.user.createdAt);
              }
              if (typeof state.user.updatedAt === 'string') {
                state.user.updatedAt = new Date(state.user.updatedAt);
              }
              // Restore password policy date fields
              if (typeof state.user.temporaryPasswordExpiry === 'string') {
                state.user.temporaryPasswordExpiry = new Date(
                  state.user.temporaryPasswordExpiry
                );
              }
              if (typeof state.user.lastPasswordChange === 'string') {
                state.user.lastPasswordChange = new Date(
                  state.user.lastPasswordChange
                );
              }
              if (typeof state.user.passwordChangeLockoutUntil === 'string') {
                state.user.passwordChangeLockoutUntil = new Date(
                  state.user.passwordChangeLockoutUntil
                );
              }
            }

            // Restore token to API client after rehydration
            if (state.accessToken) {
              apiClient.setToken(state.accessToken);
              log.info('Restored access token to API client');
            }

            // Check for role mismatch between state.role and state.user.role
            if (state.user && state.role !== state.user.role) {
              log.warn({ stateRole: state.role, userRole: state.user.role, username: state.user.username }, 'ROLE MISMATCH DETECTED');
              // Fix the role mismatch by using the user's role
              log.info('Fixing role mismatch');
              state.role = state.user.role;
            }
          }
        };
      },
    }
  )
);

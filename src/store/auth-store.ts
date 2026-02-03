import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Role } from '@/lib/types';
import { apiClient, LoginResponse } from '@/lib/api-client';

/**
 * Helper function to set a cookie for middleware authentication
 * This allows Next.js middleware to read auth state server-side
 */
function setAuthCookie(state: {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
}) {
  if (typeof window === 'undefined') return;

  const cookieValue = JSON.stringify({
    state: {
      user: state.user
        ? {
            id: state.user.id,
            role: state.user.role,
            username: state.user.username,
          }
        : null,
      role: state.role,
      isAuthenticated: state.isAuthenticated,
    },
  });

  // Set cookie with 7 days expiry, httpOnly is not available from client-side
  // This is read by middleware for server-side route protection
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);

  document.cookie = `auth-storage=${encodeURIComponent(cookieValue)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
}

/**
 * Helper function to clear the auth cookie
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
          console.log('=== LOGIN START ===');
          console.log('Attempting login for user:', username);
          const response = await apiClient.login(username, password);
          console.log('API login response received:', response);

          // Check if it's a session limit error (can be in response.code or response.data.code)
          const errorCode = (response as any).code || response.data?.code;
          if (errorCode === 'SESSION_LIMIT_REACHED') {
            const error: any = new Error('SESSION_LIMIT_REACHED');
            error.activeSessions =
              (response as any).data?.activeSessions ||
              response.data?.data?.activeSessions ||
              [];
            error.userId =
              (response as any).data?.userId ||
              response.data?.data?.userId;
            throw error;
          }

          if (!response.success || !response.data) {
            console.error('Login failed:', response.message);
            // Throw error with the server's message so the form can display it
            throw new Error(response.message || 'Login failed');
          }

          console.log('Full login response:', response);
          console.log('Response success:', response.success);
          console.log('Response data exists:', !!response.data);

          // The API client response structure is now { success: true, data: backendResponse }
          // The backend response is { success: true, data: authData, message: string }
          const backendResponse = response.data;
          console.log('Backend response structure:', backendResponse);

          // The Spring Boot response wraps auth data in another data property
          // Let's log all possible structures to find the correct one
          console.log('Checking different data structures:');
          console.log('1. backendResponse:', backendResponse);
          console.log('2. backendResponse.data:', backendResponse?.data);
          console.log(
            '3. backendResponse keys:',
            backendResponse ? Object.keys(backendResponse) : 'none'
          );

          // The backend wraps AuthResponse in { success, message, data }
          // So we need to extract the AuthResponse from data property
          let authData = null;

          // Backend response structure: { success: true, message: "...", data: AuthResponse }
          // But the logging shows backendResponse.data also has nested structure
          // Check if we have the deeply nested structure
          if (backendResponse?.data?.data) {
            // Handle deeply nested structure
            authData = backendResponse.data.data;
            console.log(
              'Found authData in backendResponse.data.data (deeply nested)'
            );
          } else if (
            backendResponse?.data &&
            (backendResponse.data.token || backendResponse.data.user)
          ) {
            // Handle single nested structure
            authData = backendResponse.data;
            console.log('Found authData in backendResponse.data');
          } else if (backendResponse?.token || backendResponse?.user) {
            // Fallback: if the response is already the AuthResponse
            authData = backendResponse;
            console.log('Using backendResponse directly as authData');
          } else {
            console.error('Could not find auth data in response');
            return null;
          }

          console.log('Final authData:', authData);
          console.log(
            'authData keys:',
            authData ? Object.keys(authData) : 'none'
          );

          // SpringBoot AuthResponse format: { token, refreshToken, tokenType, expiresIn, user: {...} }
          const token = authData?.token;
          const refreshToken = authData?.refreshToken;
          const userData = authData?.user;

          console.log('Extracted Spring Boot AuthResponse:', authData);
          console.log('Extracted token:', token ? 'present' : 'missing');
          console.log(
            'Extracted refreshToken:',
            refreshToken ? 'present' : 'missing'
          );
          console.log('Extracted user:', userData);

          console.log('Login response token:', token ? 'present' : 'missing');
          console.log(
            'Login response refreshToken:',
            refreshToken ? 'present' : 'missing'
          );
          if (token) {
            console.log('Token preview:', token.substring(0, 50) + '...');
          }
          console.log('Login response userData:', userData);
          console.log('userData type:', typeof userData);
          console.log(
            'userData keys:',
            userData ? Object.keys(userData) : 'none'
          );

          // Convert backend user format to frontend user format
          // Validate that we have user data
          if (!userData) {
            console.error('No user data in auth response');
            return null;
          }

          console.log(
            'Raw role from backend:',
            userData.role,
            'type:',
            typeof userData.role
          );
          console.log('All userData properties:');
          for (const [key, value] of Object.entries(userData)) {
            console.log(`  ${key}:`, value, `(${typeof value})`);
          }

          // Ensure we have required fields
          if (!userData.id || !userData.username || !userData.role) {
            console.error('Missing required user fields:', {
              hasId: !!userData.id,
              hasUsername: !!userData.username,
              hasRole: !!userData.role,
            });
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

          console.log('Constructed user object:');
          for (const [key, value] of Object.entries(user)) {
            console.log(`  ${key}:`, value, `(${typeof value})`);
          }

          console.log(
            'User role after casting:',
            user.role,
            'type:',
            typeof user.role
          );

          console.log('Converted user object:', user);

          console.log('Setting auth state with role:', user.role);

          // Validate role before setting
          if (!user.role) {
            console.error(
              'Warning: User role is null/undefined, this should not happen'
            );
          }

          // Ensure role is properly set - extract it directly to avoid any reference issues
          const userRole = user.role;
          console.log('Setting auth state - user role extracted:', userRole);

          // Update API client with the token
          if (token) {
            apiClient.setToken(token);
          }

          // Extract session token from backend response (check both locations)
          const sessionToken =
            backendResponse?.sessionToken ||
            backendResponse?.data?.sessionToken ||
            (response as any).sessionToken ||
            null;
          console.log('Session token:', sessionToken ? 'present' : 'missing');
          if (sessionToken) {
            console.log(
              'Session token preview:',
              sessionToken.substring(0, 15) + '...'
            );
          }

          // Extract CSRF token from backend response
          const csrfToken = backendResponse?.csrfToken || null;
          console.log('CSRF token:', csrfToken ? 'present' : 'missing');

          set({
            user,
            role: userRole,
            isAuthenticated: true,
            accessToken: token || null,
            refreshToken: refreshToken || null,
            sessionToken: sessionToken,
            csrfToken: csrfToken,
          });

          // Set auth cookie for middleware
          setAuthCookie({ user, role: userRole, isAuthenticated: true });

          // Verify the state was set correctly
          const newState = get();
          console.log('Auth state after setting:', {
            userId: newState.user?.id,
            role: newState.role,
            isAuthenticated: newState.isAuthenticated,
            hasAccessToken: !!newState.accessToken,
            tokenPreview: newState.accessToken
              ? newState.accessToken.substring(0, 50) + '...'
              : 'none',
          });

          return user;
        } catch (error) {
          console.error('Login error:', error);
          // Re-throw the error so the login form can display it
          throw error;
        }
      },

      logout: async () => {
        try {
          // Get current user ID and session token before clearing state
          const currentUserId = get().user?.id;
          const currentSessionToken = get().sessionToken;

          // Call backend logout endpoint with userId and sessionToken
          await apiClient.logout(currentUserId, currentSessionToken);
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear tokens from API client
          apiClient.clearToken();

          // Clear local storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('sessionToken');
          }

          // Clear auth cookie and CSRF cookie
          clearAuthCookie();
          if (typeof window !== 'undefined') {
            document.cookie =
              'csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }

          // Reset store state
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

          // Update localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // Update store
          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          return true;
        } catch (error) {
          console.error('Token refresh error:', error);
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
        console.log('initializeAuth - current state:', {
          hasUser: !!currentState.user,
          role: currentState.role,
          userRole: currentState.user?.role,
          isAuthenticated: currentState.isAuthenticated,
          username: currentState.user?.username,
        });

        // Clear inconsistent auth state - if authenticated but no user data
        if (
          currentState.isAuthenticated &&
          (!currentState.user || !currentState.role)
        ) {
          console.log(
            'Clearing inconsistent auth state - authenticated but no user/role data'
          );
          clearAuthCookie();
          set({ user: null, role: null, isAuthenticated: false });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
          return;
        }

        // Clear stale development data
        if (currentState.user?.name === 'System Administrator') {
          console.log('Clearing stale development user data');
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
          console.log('initializeAuth: Fixing role mismatch', {
            stateRole: currentState.role,
            userRole: currentState.user.role,
          });
          set({ role: currentState.user.role });
        }

        if (currentState.user && !currentState.isAuthenticated) {
          console.log('Setting isAuthenticated to true');
          set({ isAuthenticated: true });
        }

        // Ensure cookie is set for valid auth state
        if (
          currentState.isAuthenticated &&
          currentState.user &&
          currentState.role
        ) {
          setAuthCookie({
            user: currentState.user,
            role: currentState.role,
            isAuthenticated: currentState.isAuthenticated,
          });
        }
      },

      // Add a method to sync token updates from API client
      updateTokenFromApiClient: (newAccessToken: string) => {
        set({ accessToken: newAccessToken });
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
        }
      },

      // Helper to get CSRF token
      getCSRFToken: () => {
        return get().csrfToken;
      },

      // Refresh user data from database
      refreshUserData: async () => {
        try {
          console.log('[AUTH] Refreshing user data from database...');
          const response = await fetch(`/api/auth/refresh-user-data?t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
          });

          if (!response.ok) {
            console.error('[AUTH] Failed to refresh user data:', response.status);
            return false;
          }

          const result = await response.json();

          if (result.success && result.data) {
            console.log('[AUTH] User data refreshed successfully');

            // Update the store with fresh user data
            set({
              user: {
                ...result.data,
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
              },
              role: result.data.role,
            });

            // Update auth cookie with fresh data
            setAuthCookie(get());

            return true;
          }

          console.error('[AUTH] Invalid response from refresh endpoint');
          return false;
        } catch (error) {
          console.error('[AUTH] Error refreshing user data:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Persist user authentication state including role
      partialize: (state) => {
        console.log('Partializing state for persistence:', {
          hasUser: !!state.user,
          role: state.role,
          userRole: state.user?.role,
          isAuthenticated: state.isAuthenticated,
          username: state.user?.username,
        });

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
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          sessionToken: state.sessionToken,
          csrfToken: state.csrfToken,
        };

        console.log('State being persisted:', persistedState);
        return persistedState;
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Auth store rehydration error:', error);
          } else if (state) {
            console.log('Auth store rehydrated successfully:', {
              hasUser: !!state.user,
              role: state.role,
              userRole: state.user?.role,
              isAuthenticated: state.isAuthenticated,
              userId: state.user?.id,
              username: state.user?.username,
              hasAccessToken: !!state.accessToken,
              hasRefreshToken: !!state.refreshToken,
            });

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
              console.log('Restored access token to API client');
            }

            // Check for role mismatch between state.role and state.user.role
            if (state.user && state.role !== state.user.role) {
              console.warn('ROLE MISMATCH DETECTED:', {
                stateRole: state.role,
                userRole: state.user.role,
                username: state.user.username,
              });
              // Fix the role mismatch by using the user's role
              console.log('Fixing role mismatch...');
              state.role = state.user.role;
            }
          }
        };
      },
    }
  )
);

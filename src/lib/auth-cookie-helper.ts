/**
 * Auth Cookie Helper
 * Utility functions to ensure auth cookies are properly synced with auth state
 */

import type { User, Role } from '@/lib/types';

/**
 * Refresh auth cookie with current user data
 * Call this before making critical API calls to ensure cookie is up-to-date
 */
export function refreshAuthCookie(user: User | null, role: Role | null, isAuthenticated: boolean): void {
  if (typeof window === 'undefined') return;

  if (!user || !role || !isAuthenticated) {
    console.warn('[AUTH-COOKIE] Cannot refresh cookie - missing auth data');
    return;
  }

  const cookieValue = JSON.stringify({
    state: {
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        institutionId: user.institutionId,
      },
      role: role,
      isAuthenticated: isAuthenticated,
    },
  });

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);

  document.cookie = `auth-storage=${encodeURIComponent(cookieValue)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;

  console.log('[AUTH-COOKIE] Cookie refreshed successfully', {
    userId: user.id,
    username: user.username,
    role: role,
    institutionId: user.institutionId,
  });
}

/**
 * Clear auth cookie
 */
export function clearAuthCookie(): void {
  if (typeof window === 'undefined') return;

  document.cookie = 'auth-storage=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  console.log('[AUTH-COOKIE] Cookie cleared');
}

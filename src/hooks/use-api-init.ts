/**
 * Hook to initialize the API client with stored tokens
 */
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'api-init' });

export function useApiInit() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Session-based auth uses an HttpOnly cookie set by the server; there is
    // no access/refresh token to restore from localStorage. Automatic token
    // refresh was removed with the JWT-based auth design.
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        apiClient.setToken(storedToken);
      }
    }

    // No-op: kept for compatibility. Token refresh is handled server-side via
    // the session cookie lifecycle.
    let refreshInterval: NodeJS.Timeout | null = null;

    if (isAuthenticated) {
      log.info('Session-based auth active; no client token refresh needed');
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);

  // Return the API client for direct use if needed
  return apiClient;
}

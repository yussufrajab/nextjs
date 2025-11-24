/**
 * Hook to initialize the API client with stored tokens
 */
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

export function useApiInit() {
  const { isAuthenticated, refreshAuthToken, logout } = useAuthStore();

  useEffect(() => {
    // Initialize API client with stored token on mount
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        apiClient.setToken(storedToken);
      }
    }

    // Set up automatic token refresh
    const setupTokenRefresh = () => {
      // Refresh token every 8 minutes (tokens expire in 10 minutes)
      const refreshInterval = setInterval(async () => {
        if (isAuthenticated) {
          const success = await refreshAuthToken();
          if (!success) {
            console.log('Token refresh failed, logging out');
            clearInterval(refreshInterval);
          }
        }
      }, 8 * 60 * 1000); // 8 minutes

      return refreshInterval;
    };

    let refreshInterval: NodeJS.Timeout;
    
    if (isAuthenticated) {
      refreshInterval = setupTokenRefresh();
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, refreshAuthToken]);

  // Return the API client for direct use if needed
  return apiClient;
}
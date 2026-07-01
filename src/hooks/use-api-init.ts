/**
 * Hook retained for apiClient access. Token bootstrap and refresh-token
 * polling were removed with the move to cookie-based sessions (no JWT, no
 * refresh token). The HttpOnly session cookie is sent automatically via
 * credentials:'include' / same-origin.
 */
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function useApiInit() {
  useEffect(() => {
    // No localStorage token to bootstrap; nothing to poll.
  }, []);
  return apiClient;
}
'use client';
import { useAuthStore } from '@/store/auth-store';
import { useEffect, useState, useRef } from 'react';
import type { User, Role } from '@/lib/types';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'auth' });

interface AuthHookState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

export const useAuth = (): AuthHookState => {
  const storeState = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Zustand persist rehydration runs synchronously from localStorage.
    // Initialize auth after the store is fully available.
    const state = useAuthStore.getState();
    if (state.user !== undefined) {
      state.initializeAuth();
      // Check if user is actually authenticated after init
      const updatedState = useAuthStore.getState();
      if (updatedState.isAuthenticated && updatedState.user) {
        log.info(
          {
            userId: updatedState.user.id,
            role: updatedState.role,
          },
          'Auth state hydrated and initialized'
        );
      }
    }
    setIsLoading(false);

    const unsubscribe = useAuthStore.subscribe((state) => {
      log.info(
        {
          user: !!state.user,
          role: state.role,
          isAuthenticated: state.isAuthenticated,
        },
        'Auth store state changed'
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // When loading, return the raw store state (may be from localStorage hydrate)
  if (isLoading && typeof window !== 'undefined') {
    const state = useAuthStore.getState();
    return {
      user: state.user,
      role: state.role,
      isAuthenticated: state.isAuthenticated,
      login: state.login,
      logout: () => state.logout(),
      isLoading: true,
    };
  }

  return {
    user: storeState.user,
    role: storeState.role,
    isAuthenticated: storeState.isAuthenticated,
    login: storeState.login,
    logout: () => storeState.logout(),
    isLoading: false,
  };
};

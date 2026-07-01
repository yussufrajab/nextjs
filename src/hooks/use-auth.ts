'use client';
import { useAuthStore, type SafeUser } from '@/store/auth-store';
import { useEffect, useState } from 'react';
import type { Role, User } from '@/lib/types';

interface AuthHookState {
  user: SafeUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

export const useAuth = (): AuthHookState => {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logoutStore = useAuthStore((s) => s.logout);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // AuthProvider drives initializeAuth(); once mounted, hydration is done.
    setIsLoading(false);
  }, []);

  return {
    user,
    role,
    isAuthenticated,
    login,
    logout: () => logoutStore(),
    isLoading,
  };
};
'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from './auth-store';
import { useApiInit } from '@/hooks/use-api-init';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [hydrated, setHydrated] = useState(false);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useApiInit();

  useEffect(() => {
    // Hydrate auth state from the backend (GET /api/auth/me) on first load.
    // Nothing is read from localStorage — the backend is the source of truth.
    let cancelled = false;
    initializeAuth().finally(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initializeAuth]);

  if (!hydrated) {
    return null;
  }

  return <>{children}</>;
};
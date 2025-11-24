'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from './auth-store';
import { useApiInit } from '@/hooks/use-api-init';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const { user, role, isAuthenticated } = useAuthStore(); // Access store to ensure it's initialized
  
  // Initialize API client with stored tokens
  useApiInit();

  useEffect(() => {
    // This effect ensures that Zustand has rehydrated from localStorage by the time
    // any child component that depends on the auth state renders.
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    // Optionally, return a loading state or null
    return null; 
  }

  return <>{children}</>;
};

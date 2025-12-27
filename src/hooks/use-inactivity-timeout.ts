'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/hooks/use-toast';

/**
 * Session Inactivity Timeout Hook
 *
 * Automatically logs out users after 7 minutes of inactivity.
 * Inactivity is defined as no user interactions (mouse, keyboard, scroll, touch, etc.)
 *
 * Features:
 * - Tracks user activity events
 * - Updates server with activity timestamps
 * - Shows warning 1 minute before timeout
 * - Auto-logout on timeout
 * - Handles tab visibility changes
 */

const SESSION_TIMEOUT_MS = 7 * 60 * 1000; // 7 minutes
const WARNING_BEFORE_MS = 1 * 60 * 1000; // Warn 1 minute before
const ACTIVITY_UPDATE_INTERVAL_MS = 30 * 1000; // Update server every 30 seconds
const CHECK_INTERVAL_MS = 5 * 1000; // Check timeout every 5 seconds

interface UseInactivityTimeoutOptions {
  enabled?: boolean;
  onWarning?: (remainingSeconds: number) => void;
  onTimeout?: () => void;
}

export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const { enabled = true, onWarning, onTimeout } = options;

  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isActive, setIsActive] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(SESSION_TIMEOUT_MS);

  // Refs to avoid recreation of intervals
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningShownRef = useRef(false);

  /**
   * Update server with current activity
   */
  const updateServerActivity = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch('/api/auth/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      // If session expired on server, logout immediately
      if (data.sessionExpired || response.status === 401) {
        console.log('[INACTIVITY] Session expired on server, logging out');
        handleTimeout();
      }
    } catch (error) {
      console.error('[INACTIVITY] Failed to update server activity:', error);
    }
  }, [user?.id]);

  /**
   * Handle user activity - reset inactivity timer
   */
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsActive(true);
    setShowWarning(false);
    warningShownRef.current = false;
  }, []);

  /**
   * Handle session timeout - logout user
   */
  const handleTimeout = useCallback(async () => {
    console.log('[INACTIVITY] Session timed out, logging out user');

    // Clear intervals
    if (timeoutCheckIntervalRef.current) {
      clearInterval(timeoutCheckIntervalRef.current);
    }
    if (activityUpdateIntervalRef.current) {
      clearInterval(activityUpdateIntervalRef.current);
    }

    // Show toast notification
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });

    // Call custom timeout handler
    if (onTimeout) {
      onTimeout();
    }

    // Logout and redirect
    await logout();
    router.push('/login?reason=inactivity');
  }, [logout, router, onTimeout]);

  /**
   * Check for session timeout
   */
  const checkTimeout = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    const remaining = SESSION_TIMEOUT_MS - timeSinceActivity;

    setRemainingTime(remaining);

    // Check if session has timed out
    if (timeSinceActivity >= SESSION_TIMEOUT_MS) {
      setIsActive(false);
      handleTimeout();
      return;
    }

    // Check if warning should be shown
    if (remaining <= WARNING_BEFORE_MS && !warningShownRef.current) {
      setShowWarning(true);
      warningShownRef.current = true;

      const remainingSeconds = Math.ceil(remaining / 1000);

      toast({
        title: 'Session Expiring Soon',
        description: `You will be logged out in ${remainingSeconds} seconds due to inactivity. Move your mouse or press a key to stay logged in.`,
        variant: 'default',
        duration: WARNING_BEFORE_MS,
      });

      if (onWarning) {
        onWarning(remainingSeconds);
      }
    }
  }, [handleTimeout, onWarning]);

  /**
   * Setup activity event listeners
   */
  useEffect(() => {
    if (!enabled || !user) {
      return;
    }

    console.log('[INACTIVITY] Inactivity timeout enabled');

    // Activity event types to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Add event listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible, check if session expired while away
        const timeSinceActivity = Date.now() - lastActivityRef.current;
        if (timeSinceActivity >= SESSION_TIMEOUT_MS) {
          handleTimeout();
        } else {
          // Update server activity
          updateServerActivity();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start timeout checking interval
    timeoutCheckIntervalRef.current = setInterval(checkTimeout, CHECK_INTERVAL_MS);

    // Start server activity update interval
    activityUpdateIntervalRef.current = setInterval(
      updateServerActivity,
      ACTIVITY_UPDATE_INTERVAL_MS
    );

    // Initial server update
    updateServerActivity();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (timeoutCheckIntervalRef.current) {
        clearInterval(timeoutCheckIntervalRef.current);
      }
      if (activityUpdateIntervalRef.current) {
        clearInterval(activityUpdateIntervalRef.current);
      }
    };
  }, [enabled, user, handleActivity, checkTimeout, updateServerActivity, handleTimeout]);

  return {
    isActive,
    showWarning,
    remainingTime,
    remainingSeconds: Math.ceil(remainingTime / 1000),
    remainingMinutes: Math.ceil(remainingTime / 60000),
  };
}

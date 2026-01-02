import { db } from '@/lib/db';

/**
 * Session Inactivity Timeout Utility
 *
 * Manages automatic logout after 7 minutes of inactivity.
 * Inactivity is defined as no requests made to the server.
 */

// Session timeout configuration
export const SESSION_TIMEOUT_MINUTES = 7;
export const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000; // 7 minutes in milliseconds
export const SESSION_WARNING_BEFORE_MS = 60 * 1000; // Warn 1 minute before timeout

/**
 * Check if a user's session has timed out due to inactivity
 * @param lastActivity - The user's last activity timestamp
 * @returns true if session has timed out, false otherwise
 */
export function isSessionTimedOut(lastActivity: Date | null | undefined): boolean {
  if (!lastActivity) {
    // No activity recorded, consider it timed out
    return true;
  }

  const now = new Date();
  const lastActivityTime = new Date(lastActivity);
  const timeSinceLastActivity = now.getTime() - lastActivityTime.getTime();

  return timeSinceLastActivity > SESSION_TIMEOUT_MS;
}

/**
 * Get the remaining time before session timeout in milliseconds
 * @param lastActivity - The user's last activity timestamp
 * @returns Remaining time in milliseconds, or 0 if already timed out
 */
export function getRemainingSessionTime(lastActivity: Date | null | undefined): number {
  if (!lastActivity) {
    return 0;
  }

  const now = new Date();
  const lastActivityTime = new Date(lastActivity);
  const timeSinceLastActivity = now.getTime() - lastActivityTime.getTime();
  const remainingTime = SESSION_TIMEOUT_MS - timeSinceLastActivity;

  return Math.max(0, remainingTime);
}

/**
 * Check if session is approaching timeout (within warning period)
 * @param lastActivity - The user's last activity timestamp
 * @returns true if within warning period, false otherwise
 */
export function isSessionWarning(lastActivity: Date | null | undefined): boolean {
  const remainingTime = getRemainingSessionTime(lastActivity);
  return remainingTime > 0 && remainingTime <= SESSION_WARNING_BEFORE_MS;
}

/**
 * Update user's last activity timestamp in the database
 * @param userId - The user's ID
 * @returns Updated user object or null if failed
 */
export async function updateUserActivity(userId: string): Promise<Date | null> {
  try {
    const now = new Date();

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { lastActivity: now },
      select: { lastActivity: true },
    });

    return updatedUser.lastActivity;
  } catch (error) {
    console.error('[SESSION_TIMEOUT] Failed to update user activity:', error);
    return null;
  }
}

/**
 * Get user's last activity timestamp from database
 * @param userId - The user's ID
 * @returns Last activity timestamp or null if not found
 */
export async function getUserActivity(userId: string): Promise<Date | null> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { lastActivity: true },
    });

    return user?.lastActivity || null;
  } catch (error) {
    console.error('[SESSION_TIMEOUT] Failed to get user activity:', error);
    return null;
  }
}

/**
 * Clear user's activity timestamp (used during logout)
 * @param userId - The user's ID
 */
export async function clearUserActivity(userId: string): Promise<void> {
  try {
    await db.user.update({
      where: { id: userId },
      data: { lastActivity: null },
    });
  } catch (error) {
    console.error('[SESSION_TIMEOUT] Failed to clear user activity:', error);
  }
}

/**
 * Get session timeout information for display
 * @param lastActivity - The user's last activity timestamp
 * @returns Object with timeout information
 */
export function getSessionTimeoutInfo(lastActivity: Date | null | undefined) {
  const isTimedOut = isSessionTimedOut(lastActivity);
  const remainingTimeMs = getRemainingSessionTime(lastActivity);
  const isWarning = isSessionWarning(lastActivity);

  // Convert remaining time to minutes and seconds
  const remainingMinutes = Math.floor(remainingTimeMs / 60000);
  const remainingSeconds = Math.floor((remainingTimeMs % 60000) / 1000);

  return {
    isTimedOut,
    isWarning,
    remainingTimeMs,
    remainingMinutes,
    remainingSeconds,
    timeoutMinutes: SESSION_TIMEOUT_MINUTES,
    lastActivity: lastActivity ? new Date(lastActivity) : null,
  };
}

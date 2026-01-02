import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

/**
 * Session Manager Utility
 *
 * Manages concurrent user sessions with the following features:
 * - Maximum 3 concurrent sessions per user
 * - Oldest session terminated when limit exceeded
 * - Session token generation and validation
 * - Suspicious login detection
 */

// Configuration
export const MAX_CONCURRENT_SESSIONS = 3;
export const SESSION_EXPIRY_HOURS = 24; // 24 hours
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

/**
 * Generate a secure random session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Calculate session expiry time
 */
export function calculateSessionExpiry(): Date {
  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + SESSION_EXPIRY_MS);
  return expiryDate;
}

/**
 * Parse user agent to extract device info
 */
export function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown Device';

  // Simple device detection
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';

  return 'Unknown Device';
}

/**
 * Create a new session for a user
 * If user has 3 or more sessions, terminates the oldest one
 *
 * @param userId - User ID
 * @param ipAddress - IP address of the login
 * @param userAgent - User agent string
 * @param isSuspicious - Whether this login looks suspicious
 * @returns Created session object with sessionToken
 */
export async function createSession(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
  isSuspicious: boolean = false
) {
  try {
    // Get current active sessions for the user
    const activeSessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }, // Only active sessions
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });

    // If user has MAX_CONCURRENT_SESSIONS or more, delete the oldest session
    if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
      const sessionsToDelete = activeSessions.slice(
        0,
        activeSessions.length - MAX_CONCURRENT_SESSIONS + 1
      );

      await db.session.deleteMany({
        where: {
          id: { in: sessionsToDelete.map((s) => s.id) },
        },
      });

      console.log(
        `[SESSION] Terminated ${sessionsToDelete.length} oldest session(s) for user ${userId}`
      );
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    const deviceInfo = parseUserAgent(userAgent);

    // Create new session
    const session = await db.session.create({
      data: {
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        deviceInfo,
        expiresAt: calculateSessionExpiry(),
        isSuspicious,
        lastActivity: new Date(),
      },
    });

    console.log(`[SESSION] Created new session for user ${userId} (${deviceInfo})`);

    return session;
  } catch (error) {
    console.error('[SESSION] Failed to create session:', error);
    throw error;
  }
}

/**
 * Validate a session token
 *
 * @param sessionToken - Session token to validate
 * @returns Session object if valid, null otherwise
 */
export async function validateSession(sessionToken: string) {
  try {
    const session = await db.session.findUnique({
      where: { sessionToken },
      include: { User: true },
    });

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await db.session.delete({
        where: { id: session.id },
      });
      return null;
    }

    // Update last activity
    await db.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    return session;
  } catch (error) {
    console.error('[SESSION] Failed to validate session:', error);
    return null;
  }
}

/**
 * Terminate a specific session
 *
 * @param sessionToken - Session token to terminate
 */
export async function terminateSession(sessionToken: string): Promise<boolean> {
  try {
    await db.session.delete({
      where: { sessionToken },
    });
    console.log(`[SESSION] Terminated session: ${sessionToken.substring(0, 10)}...`);
    return true;
  } catch (error) {
    console.error('[SESSION] Failed to terminate session:', error);
    return false;
  }
}

/**
 * Terminate all sessions for a user
 *
 * @param userId - User ID
 */
export async function terminateAllUserSessions(userId: string): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: { userId },
    });
    console.log(`[SESSION] Terminated ${result.count} session(s) for user ${userId}`);
    return result.count;
  } catch (error) {
    console.error('[SESSION] Failed to terminate all sessions:', error);
    return 0;
  }
}

/**
 * Get all active sessions for a user
 *
 * @param userId - User ID
 * @returns Array of active sessions
 */
export async function getUserActiveSessions(userId: string) {
  try {
    const sessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' }, // Most recent first
      select: {
        id: true,
        sessionToken: true,
        ipAddress: true,
        deviceInfo: true,
        location: true,
        createdAt: true,
        lastActivity: true,
        expiresAt: true,
        isSuspicious: true,
      },
    });

    return sessions;
  } catch (error) {
    console.error('[SESSION] Failed to get user sessions:', error);
    return [];
  }
}

/**
 * Clean up expired sessions (should be run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      console.log(`[SESSION] Cleaned up ${result.count} expired session(s)`);
    }

    return result.count;
  } catch (error) {
    console.error('[SESSION] Failed to cleanup expired sessions:', error);
    return 0;
  }
}

/**
 * Get session count for a user
 *
 * @param userId - User ID
 * @returns Number of active sessions
 */
export async function getUserSessionCount(userId: string): Promise<number> {
  try {
    const count = await db.session.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
    return count;
  } catch (error) {
    console.error('[SESSION] Failed to get session count:', error);
    return 0;
  }
}

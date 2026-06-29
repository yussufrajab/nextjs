import { db } from '@/lib/db';
import { sessionLogger } from '@/lib/logger';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

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
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    'CRITICAL: SESSION_SECRET environment variable is not set. ' +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
  );
}

export const MAX_CONCURRENT_SESSIONS = 3;
export const SESSION_EXPIRY_HOURS = 24; // 24 hours
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

// Pre-session token for session fixation protection.
// A random token is set as a cookie before authentication and verified after login.
// If the pre-session token doesn't match, the session is rejected (fixation attempt).
export const PRE_SESSION_COOKIE_NAME = 'pre-session';
const PRE_SESSION_EXPIRY_MINUTES = 15;

/**
 * Generate a pre-authentication session token for session fixation protection.
 * This token is set as a cookie before login and verified after successful authentication.
 */
export function generatePreSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get cookie options for the pre-session token.
 * httpOnly: true so it cannot be read by JavaScript (prevents XSS-based fixation).
 */
export function getPreSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 60 * PRE_SESSION_EXPIRY_MINUTES,
  };
}

/**
 * Generate a secure random session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Name of the HttpOnly cookie that carries the DB session token.
 */
export const SESSION_COOKIE_NAME = 'session';

/**
 * Cookie options for the session token cookie.
 * httpOnly: true so the token is never readable by JavaScript (XSS defense).
 * sameSite: 'strict' so the cookie is not sent on cross-site requests.
 * maxAge matches SESSION_EXPIRY_MS so the cookie and DB row expire together.
 */
export function getSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_EXPIRY_MS / 1000,
  };
}

/**
 * HMAC-sign an opaque session token for cookie transport.
 * Cookie value format: `<token>.<expiryUnixMs>.<base64-signature>`. The signed
 * payload (`token.expiryUnixMs`) includes an expiration claim so forged cookies
 * are rejected pre-DB even before the DB row's expiresAt is checked. The DB row
 * remains the source of truth for revocation, but the embedded expiry provides
 * a second layer of defense.
 */
export function signSessionToken(token: string): string {
  const expiry = Date.now() + SESSION_EXPIRY_MS;
  const payload = `${token}.${expiry}`;
  const hmac = createHmac('sha256', SESSION_SECRET!);
  hmac.update(payload);
  const signature = hmac.digest('base64');
  return `${payload}.${signature}`;
}

/**
 * Verify a signed session cookie value and return the raw token on success.
 * Returns null if the value is malformed, the signature does not match
 * (constant-time comparison), or the embedded expiry claim has elapsed.
 * The raw token is then used for validateSession.
 */
export function verifySessionToken(signed: string): string | null {
  try {
    const parts = signed.split('.');
    if (parts.length !== 3) return null;
    const [token, expiryStr, providedSignature] = parts;
    const expiry = Number(expiryStr);
    if (!Number.isFinite(expiry)) return null;

    // Reject if the embedded expiry has elapsed (pre-DB defense)
    if (Date.now() > expiry) return null;

    const payload = `${token}.${expiryStr}`;
    const hmac = createHmac('sha256', SESSION_SECRET!);
    hmac.update(payload);
    const expectedSignature = hmac.digest('base64');

    const a = Buffer.from(providedSignature, 'base64');
    const b = Buffer.from(expectedSignature, 'base64');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? token : null;
  } catch {
    return null;
  }
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
 * Check if user has reached the session limit
 *
 * @param userId - User ID
 * @returns Session limit check result with active sessions
 */
export async function checkSessionLimit(userId: string): Promise<{
  isAtLimit: boolean;
  activeSessions: Array<{
    id: string;
    deviceInfo: string | null;
    lastActivity: Date;
    ipAddress: string | null;
    createdAt: Date;
    isSuspicious: boolean;
  }>;
  count: number;
}> {
  try {
    const activeSessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        lastActivity: true,
        ipAddress: true,
        createdAt: true,
        isSuspicious: true,
      },
    });

    return {
      isAtLimit: activeSessions.length >= MAX_CONCURRENT_SESSIONS,
      activeSessions,
      count: activeSessions.length,
    };
  } catch (error) {
    sessionLogger.error({ err: error }, 'Failed to check session limit');
    return {
      isAtLimit: false,
      activeSessions: [],
      count: 0,
    };
  }
}

/**
 * Terminate a specific session by ID
 * Validates that the session belongs to the requesting user
 *
 * @param sessionId - Session ID to terminate
 * @param requestingUserId - User ID requesting the termination
 * @returns True if successful, false otherwise
 */
export async function terminateSessionById(
  sessionId: string,
  requestingUserId: string
): Promise<boolean> {
  try {
    // Verify the session belongs to the requesting user
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session) {
      sessionLogger.error({ sessionId }, 'Session not found');
      return false;
    }

    if (session.userId !== requestingUserId) {
      sessionLogger.error(
        { sessionId, requestingUserId },
        'User does not own session'
      );
      return false;
    }

    await db.session.delete({
      where: { id: sessionId },
    });

    sessionLogger.info({ sessionId, requestingUserId }, 'Terminated session by ID');
    return true;
  } catch (error) {
    sessionLogger.error({ err: error }, 'Failed to terminate session by ID');
    return false;
  }
}

/**
 * Create a new session for a user
 * Throws error if user already has MAX_CONCURRENT_SESSIONS active sessions
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
    // Check if user has reached session limit and auto-terminate oldest if so
    const activeSessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'asc' },
      select: { id: true },
    });

    if (activeSessions.length >= MAX_CONCURRENT_SESSIONS) {
      // Terminate the oldest session (first in ascending order)
      const oldestSessionId = activeSessions[0].id;
      await db.session.deleteMany({
        where: { id: { in: [oldestSessionId] } },
      });
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

    sessionLogger.info({ userId, deviceInfo }, 'Created new session');

    return session;
  } catch (error) {
    sessionLogger.error({ err: error }, 'Failed to create session');
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
    sessionLogger.error({ err: error }, 'Failed to validate session');
    return null;
  }
}

/**
 * Mark a session as suspicious (hijacking detection).
 * Updates the isSuspicious flag on the session row so the user can review
 * their active sessions and take action.
 */
export async function markSessionSuspicious(sessionId: string): Promise<void> {
  try {
    await db.session.update({
      where: { id: sessionId },
      data: { isSuspicious: true },
    });
    sessionLogger.warn({ sessionId }, 'Marked session as suspicious');
  } catch (error) {
    sessionLogger.error({ err: error, sessionId }, 'Failed to mark session suspicious');
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
    sessionLogger.info({ sessionTokenPrefix: sessionToken.substring(0, 10) }, 'Terminated session');
    return true;
  } catch (error) {
    sessionLogger.error({ err: error }, 'Failed to terminate session');
    return false;
  }
}

/**
 * Terminate all sessions for a user
 *
 * @param userId - User ID
 */
export async function terminateAllUserSessions(
  userId: string
): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: { userId },
    });
    sessionLogger.info({ count: result.count, userId }, 'Terminated sessions for user');
    return result.count;
  } catch (error) {
    sessionLogger.error({ err: error, userId }, 'Failed to terminate all sessions');
    return 0;
  }
}

/**
 * Terminate all sessions for a user EXCEPT the one matching keepSessionToken.
 * Used on password change to force re-login on other devices while keeping
 * the current device signed in.
 *
 * @param userId - User ID
 * @param keepSessionToken - Session token to preserve (the current device)
 * @returns Number of sessions terminated
 */
export async function terminateOtherUserSessions(
  userId: string,
  keepSessionToken: string
): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: {
        userId,
        sessionToken: { not: keepSessionToken },
      },
    });
    sessionLogger.info(
      { count: result.count, userId },
      'Terminated other sessions for user'
    );
    return result.count;
  } catch (error) {
    sessionLogger.error({ err: error, userId }, 'Failed to terminate other sessions');
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
    sessionLogger.error({ err: error, userId }, 'Failed to get user sessions');
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
      sessionLogger.info({ count: result.count }, 'Cleaned up expired sessions');
    }

    return result.count;
  } catch (error) {
    sessionLogger.error({ err: error }, 'Failed to cleanup expired sessions');
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
    sessionLogger.error({ err: error, userId }, 'Failed to get session count');
    return 0;
  }
}

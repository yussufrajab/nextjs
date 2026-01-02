import { db } from '@/lib/db';

/**
 * Suspicious Login Detector
 *
 * Detects potentially suspicious login attempts based on:
 * - Different IP addresses
 * - Different devices/user agents
 * - Unusual timing patterns
 * - Geographic anomalies (if location data available)
 */

interface LoginContext {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Check if a login attempt looks suspicious
 *
 * @param context - Login context with userId, IP, and user agent
 * @returns Object with isSuspicious flag and reasons
 */
export async function detectSuspiciousLogin(context: LoginContext): Promise<{
  isSuspicious: boolean;
  reasons: string[];
  shouldNotify: boolean;
}> {
  const { userId, ipAddress, userAgent } = context;
  const reasons: string[] = [];
  let isSuspicious = false;

  try {
    // Get user's recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSessions = await db.session.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 10, // Last 10 sessions
    });

    // If this is the user's first session, it's not suspicious
    if (recentSessions.length === 0) {
      return { isSuspicious: false, reasons: [], shouldNotify: false };
    }

    // Check 1: New IP Address
    const knownIpAddresses = new Set(
      recentSessions.map((s) => s.ipAddress).filter(Boolean)
    );

    if (ipAddress && !knownIpAddresses.has(ipAddress)) {
      isSuspicious = true;
      reasons.push('Login from new IP address');
    }

    // Check 2: New Device/User Agent
    const knownUserAgents = new Set(
      recentSessions.map((s) => s.userAgent).filter(Boolean)
    );

    if (userAgent && !knownUserAgents.has(userAgent)) {
      const knownDevices = new Set(
        recentSessions.map((s) => s.deviceInfo).filter(Boolean)
      );
      const currentDevice = parseDeviceType(userAgent);

      if (!knownDevices.has(currentDevice)) {
        isSuspicious = true;
        reasons.push(`Login from new device type: ${currentDevice}`);
      }
    }

    // Check 3: Multiple concurrent logins from different IPs
    const currentActiveSessions = await db.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (currentActiveSessions.length > 0) {
      const uniqueIps = new Set(
        currentActiveSessions.map((s) => s.ipAddress).filter(Boolean)
      );

      if (ipAddress && uniqueIps.size > 0 && !uniqueIps.has(ipAddress)) {
        // User is logging in from a different IP while already logged in elsewhere
        isSuspicious = true;
        reasons.push('Concurrent login from different IP address');
      }
    }

    // Check 4: Rapid successive logins from different IPs (potential account takeover)
    const lastSession = recentSessions[0];
    if (lastSession) {
      const timeSinceLastLogin = Date.now() - lastSession.createdAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (
        timeSinceLastLogin < fiveMinutes &&
        ipAddress &&
        lastSession.ipAddress &&
        ipAddress !== lastSession.ipAddress
      ) {
        isSuspicious = true;
        reasons.push('Rapid login from different IP within 5 minutes');
      }
    }

    // Determine if user should be notified
    // Notify if:
    // - Login is from new IP and new device
    // - Multiple concurrent sessions from different IPs
    // - Rapid successive logins
    const shouldNotify =
      reasons.some((r) => r.includes('new IP') && r.includes('new device')) ||
      reasons.some((r) => r.includes('Concurrent')) ||
      reasons.some((r) => r.includes('Rapid'));

    return {
      isSuspicious,
      reasons,
      shouldNotify,
    };
  } catch (error) {
    console.error('[SUSPICIOUS_LOGIN] Detection failed:', error);
    // Fail safe: Don't block login on detection errors
    return { isSuspicious: false, reasons: [], shouldNotify: false };
  }
}

/**
 * Parse device type from user agent
 */
function parseDeviceType(userAgent: string): string {
  if (!userAgent) return 'Unknown';

  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';

  return 'Unknown';
}

/**
 * Get login summary for user notification
 */
export function getLoginSummary(context: LoginContext): {
  device: string;
  location: string;
  time: string;
} {
  const device = context.userAgent ? parseDeviceType(context.userAgent) : 'Unknown Device';
  const location = context.ipAddress || 'Unknown Location';
  const time = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return { device, location, time };
}

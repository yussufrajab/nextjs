import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { logLoginAttempt, logSuspiciousLoginSuccess, getClientIp } from '@/lib/audit-logger';
import {
  createSession,
  checkSessionLimit,
  cleanupExpiredSessions,
  PRE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  signSessionToken,
} from '@/lib/session-manager';
import { detectSuspiciousLogin, getLoginSummary } from '@/lib/suspicious-login-detector';

interface CompleteLoginUser {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  employeeId?: string | null;
  institutionId: string;
  isTemporaryPassword: boolean;
  temporaryPasswordExpiry?: Date | null;
  mustChangePassword: boolean;
  passwordExpiresAt?: Date | null;
  gracePeriodStartedAt?: Date | null;
  lastExpirationWarningLevel?: number | null;
  failedLoginAttempts: number;
  loginLockedUntil?: Date | null;
  loginLockoutReason?: string | null;
  loginLockoutType?: string | null;
  isManuallyLocked: boolean;
  lockedBy?: string | null;
  lockedAt?: Date | null;
  lockoutNotes?: string | null;
}

interface CompleteLoginParams {
  user: CompleteLoginUser & {
    Institution?: any;
    Employee?: any;
  };
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo?: Record<string, any> | null;
  preSessionToken?: string | null;
}

export async function completeLogin(params: CompleteLoginParams): Promise<NextResponse> {
  const { user, ipAddress, userAgent, deviceInfo, preSessionToken } = params;

  // Set initial activity timestamp
  await db.user.update({
    where: { id: user.id },
    data: { lastActivity: new Date() },
  });

  // Session fixation protection: the pre-session token was already verified
  // by the caller (login route reads it from the cookie and passes it here).
  // Its presence confirms the login flow started from a legitimate page load.
  // The pre-session cookie is cleared below after successful auth.

  // Build auth data
  const authData = {
    token: null,
    refreshToken: null,
    tokenType: 'Bearer',
    expiresIn: null,
    user: {
      id: user.id,
      fullName: user.name,
      name: user.name,
      username: user.username,
      role: user.role,
      institutionId: user.institutionId,
      institutionName: user.Institution?.name || '',
      Institution: user.Institution,
      Employee: user.Employee,
      isEnabled: user.active,
      active: user.active,
      employeeId: user.employeeId,
      createdAt: user.Institution ? new Date() : new Date(),
      updatedAt: new Date(),
      lastLoginDate: new Date(),
      mustChangePassword: user.mustChangePassword || false,
      isTemporaryPassword: user.isTemporaryPassword || false,
      temporaryPasswordExpiry: user.temporaryPasswordExpiry,
    },
  };

  const passwordStatus = {
    mustChange: user.mustChangePassword || false,
    isTemporary: user.isTemporaryPassword || false,
    expiresAt: user.temporaryPasswordExpiry,
    isExpired: false,
  };

  // Create welcome notification if first login
  const existingNotifications = await db.notification.findMany({
    where: { userId: user.id },
    take: 1,
  });
  if (existingNotifications.length === 0) {
    const welcomeNotification = NotificationTemplates.welcomeMessage();
    await createNotification({
      userId: user.id,
      message: welcomeNotification.message,
      link: welcomeNotification.link,
    });
  }

  // Log successful login
  await logLoginAttempt({
    success: true,
    username: user.username,
    userId: user.id,
    userRole: user.role,
    ipAddress,
    deviceInfo: deviceInfo || null,
  });

  // Detect suspicious login
  const suspiciousCheck = await detectSuspiciousLogin({
    userId: user.id,
    ipAddress,
    userAgent,
  });

  // Clean up expired sessions
  await cleanupExpiredSessions();

  // Check session limit
  const sessionLimitCheck = await checkSessionLimit(user.id);
  if (sessionLimitCheck.isAtLimit) {
    return NextResponse.json(
      {
        success: false,
        code: 'SESSION_LIMIT_REACHED',
        message: 'You are already signed in on 3 devices',
        data: {
          activeSessions: sessionLimitCheck.activeSessions.map((session) => ({
            id: session.id,
            deviceInfo: session.deviceInfo,
            lastActivity: session.lastActivity,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt,
            isSuspicious: session.isSuspicious,
          })),
          userId: user.id,
        },
      },
      { status: 403 }
    );
  }

  // Create session
  const session = await createSession(
    user.id,
    ipAddress,
    userAgent,
    suspiciousCheck.isSuspicious
  );

  // Notify if suspicious
  if (suspiciousCheck.shouldNotify) {
    const loginInfo = getLoginSummary({
      userId: user.id,
      ipAddress,
      userAgent,
    });
    await createNotification({
      userId: user.id,
      message: `New login detected from ${loginInfo.device} at ${loginInfo.location} on ${loginInfo.time}. If this wasn't you, please change your password immediately.`,
      link: '/dashboard/profile',
    });

    // Audit the suspicious login so it is discoverable in the audit trail.
    // Severity WARNING — this is a security event the SOC should review.
    await logSuspiciousLoginSuccess({
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ipAddress,
      deviceInfo: deviceInfo || null,
      reasons: suspiciousCheck.reasons,
    }).catch(() => {
      // Fail-safe: never block the login flow on an audit write failure
    });
  }

  // Generate CSRF token
  const {
    generateCSRFToken,
    signCSRFToken,
    getCSRFCookieOptions,
    CSRF_COOKIE_NAME,
  } = await import('@/lib/csrf-utils');

  const csrfToken = generateCSRFToken();
  const signedCSRFToken = signCSRFToken(csrfToken);
  const csrfCookieOptions = getCSRFCookieOptions();

  const response = NextResponse.json({
    success: true,
    data: {
      ...authData,
    },
    passwordStatus,
    csrfToken: signedCSRFToken,
    message: 'Login successful',
  });

  // Set CSRF token cookie (readable by JS for double-submit pattern)
  response.cookies.set(CSRF_COOKIE_NAME, signedCSRFToken, csrfCookieOptions);

  // Set the HttpOnly, HMAC-signed session cookie. The client never receives
  // the raw token; the browser sends the signed value automatically.
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(
    SESSION_COOKIE_NAME,
    signSessionToken(session.sessionToken),
    getSessionCookieOptions(isProduction)
  );

  // Clear the pre-session cookie after successful authentication (session fixation protection)
  response.cookies.set(PRE_SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}
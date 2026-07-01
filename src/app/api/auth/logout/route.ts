import { NextResponse, NextRequest } from 'next/server';
import { clearUserActivity } from '@/lib/session-timeout-utils';
import {
  terminateSession,
  terminateAllUserSessions,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '@/lib/session-manager';
import {
  logAuditEvent,
  AuditEventType,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

function readRawSessionToken(req: Request): string | undefined {
  let signed: string | undefined;
  if (req instanceof NextRequest && 'cookies' in req) {
    signed = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      signed = match ? match[1] : undefined;
    }
  }
  if (!signed) return undefined;
  return verifySessionToken(signed) ?? undefined;
}

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  const logoutAll = body?.logoutAll === true;

  const sessionToken = readRawSessionToken(req);

  authLogger.info({
    userId,
    hasSessionToken: !!sessionToken,
    logoutAll,
  }, 'Logout request');

  if (logoutAll && userId) {
    const count = await terminateAllUserSessions(userId);
    authLogger.info({ userId, count }, 'Terminated all sessions');
  } else if (sessionToken) {
    const success = await terminateSession(sessionToken);
    if (!success) {
      authLogger.warn('Failed to terminate session (may already be deleted)');
    }
  } else {
    authLogger.warn('No session cookie or userId provided for logout');
  }

  if (userId) {
    await clearUserActivity(userId);
  }

  if (userId) {
    await logAuditEvent({
      eventType: AuditEventType.LOGOUT,
      eventCategory: AuditEventCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      userId,
      username: null,
      userRole: null,
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
      attemptedRoute: '/api/auth/logout',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: { logoutAll },
    }).catch(() => {});
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear the session cookie (the real credential)
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  // Clear the CSRF cookie (double-submit token) alongside the session so it
  // does not outlive the session. The legacy unsigned auth-storage cookie is
  // no longer set or read anywhere, so it is not cleared here.
  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}, 'auth-logout');

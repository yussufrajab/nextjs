import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  withRateLimit,
  checkRateLimitSliding,
  buildUserRateLimitKey,
} from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';
import {
  logAuditEvent,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import { createPasswordResetToken } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/email';

const PASSWORD_RESET_TOKEN_EXPIRY_MINUTES =
  Number(process.env.PASSWORD_RESET_TOKEN_EXPIRY_MINUTES) || 15;

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required.'),
});

// SECURITY: identical response for every outcome — no account enumeration.
const GENERIC_MESSAGE =
  'If an account with that identifier exists and has an email on file, a reset link has been sent.';

export const POST = wrapHandler(withRateLimit(async (request) => {
  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) return csrfCheck.response!;

  const body = await request.json();
  const { identifier } = forgotPasswordSchema.parse(body);

  const ipAddress = getClientIp(request.headers);
  const userAgent = request.headers.get('user-agent') || '';
  const deviceInfo = JSON.parse(request.headers.get('x-device-info') || 'null');

  // Per-identifier sliding limit (Req 1.8 pattern): throttle enumeration /
  // link-spam against one account from many IPs. Checked before the DB lookup
  // so guesses against non-existent identifiers are throttled too (no timing
  // leak on existence). Reuses the `auth` tier; fail-closed if Redis is down.
  const perIdentifierKey = buildUserRateLimitKey(identifier);
  const limit = await checkRateLimitSliding(perIdentifierKey, 'auth', {
    failClosed: true,
  });
  if (!limit.allowed) {
    const isFailClosed = limit.reason === 'fail_closed';
    return NextResponse.json(
      {
        success: false,
        message: isFailClosed
          ? 'Service temporarily unavailable — please retry shortly'
          : 'Too many requests. Please try again shortly.',
        errorCode: isFailClosed ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMIT_EXCEEDED',
        retryAfter: limit.retryAfter,
      },
      {
        status: isFailClosed ? 503 : 429,
        headers: { 'Retry-After': String(limit.retryAfter) },
      }
    );
  }

  const isEmail = identifier.includes('@');
  const user = await db.user.findFirst({
    where: isEmail ? { email: identifier } : { username: identifier },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      active: true,
      role: true,
    },
  });

  // Only send when the user exists, is active, and has an email on file.
  if (user && user.active && user.email) {
    try {
      const { token } = await createPasswordResetToken(
        user.id,
        user.email,
        ipAddress,
        userAgent
      );
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const resetLink = `${appUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail({
        email: user.email,
        resetLink,
        userName: user.name,
        expiryMinutes: PASSWORD_RESET_TOKEN_EXPIRY_MINUTES,
      });
    } catch (err) {
      // Never leak whether the send happened — log and fall through to the
      // generic success response.
      authLogger.error({ err, userId: user.id }, 'Failed to send password reset email');
    }

    await logAuditEvent({
      eventType: 'PASSWORD_RESET_REQUESTED',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.INFO,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ipAddress,
      deviceInfo,
      attemptedRoute: '/api/auth/forgot-password',
      requestMethod: 'POST',
      isAuthenticated: false,
      wasBlocked: false,
      blockReason: null,
      additionalData: { identifier },
    }).catch(() => {});
  } else {
    // Still audit the attempt (no userId) so the SOC can observe enumeration.
    await logAuditEvent({
      eventType: 'PASSWORD_RESET_REQUESTED',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.INFO,
      ipAddress,
      deviceInfo,
      attemptedRoute: '/api/auth/forgot-password',
      requestMethod: 'POST',
      isAuthenticated: false,
      wasBlocked: false,
      blockReason: null,
      additionalData: { identifier, matched: false },
    }).catch(() => {});
  }

  // Always the same generic response — no account enumeration.
  return NextResponse.json({ success: true, message: GENERIC_MESSAGE });
}, 'auth'), 'auth-forgot-password');
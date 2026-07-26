import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  validatePasswordComplexity,
  isCommonPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_HISTORY_LENGTH,
} from '@/lib/password-utils';
import {
  hashPassword,
  comparePassword,
  checkPasswordHistory,
} from '@/lib/password-hash';
import { checkPasswordBreached } from '@/lib/hibp';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';
import {
  logAuditEvent,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import {
  resolveResetToken,
  consumePasswordResetToken,
  incrementResetVerifyAttempts,
} from '@/lib/password-reset';
import { terminateAllUserSessions } from '@/lib/session-manager';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required.'),
  newPassword: z.string().min(1, 'New password is required.'),
});

const GENERIC_INVALID =
  'This reset link is invalid or has expired. Please request a new one.';

export const POST = wrapHandler(withRateLimit(async (request) => {
  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) return csrfCheck.response!;

  const body = await request.json();
  const { token, newPassword } = resetPasswordSchema.parse(body);

  const ipAddress = getClientIp(request.headers);
  const deviceInfo = JSON.parse(request.headers.get('x-device-info') || 'null');

  // Resolve WITHOUT consuming so a rejected weak password does not burn the
  // link — the user may retry with a stronger password up to the attempt cap.
  const resolved = await resolveResetToken(token);
  if (!resolved.ok || !resolved.record) {
    return NextResponse.json(
      { success: false, message: GENERIC_INVALID },
      { status: 400 }
    );
  }
  const tokenRecord = resolved.record;

  // Load the user. Reject (generic) if missing or deactivated since the link
  // was issued.
  const user = await db.user.findUnique({
    where: { id: tokenRecord.userId },
  });
  if (!user || !user.active) {
    return NextResponse.json(
      { success: false, message: GENERIC_INVALID },
      { status: 400 }
    );
  }

  // --- Full change-password validation chain (mirrors change-password/route.ts) ---
  if (!validatePasswordComplexity(newPassword)) {
    await incrementResetVerifyAttempts(tokenRecord.id);
    return NextResponse.json(
      {
        success: false,
        message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain an uppercase letter, lowercase letter, number, and special character.`,
      },
      { status: 400 }
    );
  }

  if (isCommonPassword(newPassword)) {
    await incrementResetVerifyAttempts(tokenRecord.id);
    return NextResponse.json(
      {
        success: false,
        message:
          'This password is too common and easily guessable. Please choose a stronger password.',
      },
      { status: 400 }
    );
  }

  // HIBP (k-anonymity): reject if pwned; fail-open on HIBP error (log for SOC).
  const breachCheck = await checkPasswordBreached(newPassword);
  if (breachCheck.isPwned) {
    await incrementResetVerifyAttempts(tokenRecord.id);
    return NextResponse.json(
      {
        success: false,
        message:
          'This password has appeared in a known data breach. Please choose a different password.',
        errorCode: 'PASSWORD_PWNED',
      },
      { status: 400 }
    );
  }
  if (breachCheck.error) {
    authLogger.warn(
      { userId: user.id, reason: breachCheck.errorReason },
      'HIBP breach check failed (fail-open). Password reset proceeded.'
    );
  }

  const passwordHistory = user.passwordHistory || [];
  if (await checkPasswordHistory(newPassword, passwordHistory)) {
    await incrementResetVerifyAttempts(tokenRecord.id);
    return NextResponse.json(
      {
        success: false,
        message: `You cannot reuse any of your last ${PASSWORD_HISTORY_LENGTH} passwords. Please choose a different password.`,
      },
      { status: 400 }
    );
  }

  if (await comparePassword(newPassword, user.password)) {
    await incrementResetVerifyAttempts(tokenRecord.id);
    return NextResponse.json(
      {
        success: false,
        message: 'New password must be different from your current password.',
      },
      { status: 400 }
    );
  }

  // --- Validation passed: atomically consume the token (race-safe single-use). ---
  const consumed = await consumePasswordResetToken(tokenRecord.id);
  if (!consumed.ok) {
    return NextResponse.json(
      {
        success: false,
        message:
          'This reset link has already been used. Please request a new one.',
      },
      { status: 400 }
    );
  }

  const hashedPassword = await hashPassword(newPassword);
  const updatedHistory = [user.password, ...passwordHistory].slice(
    0,
    PASSWORD_HISTORY_LENGTH
  );

  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordHistory: updatedHistory,
      isTemporaryPassword: false,
      mustChangePassword: false,
      temporaryPasswordExpiry: null,
      failedPasswordChangeAttempts: 0,
      passwordChangeLockoutUntil: null,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      loginLockoutReason: null,
      loginLockoutType: null,
      lastPasswordChange: new Date(),
      updatedAt: new Date(),
      // SECURITY: do NOT clear isManuallyLocked / lockedBy / lockedAt /
      // lockoutNotes — admin-imposed security lockouts must survive a
      // self-service reset so an attacker controlling the email cannot bypass
      // an admin lockout. Standard auto-lockout fields above ARE cleared
      // because identity was just proven via email control.
    },
  });

  // Reset the password-expiration clock.
  const { resetPasswordExpiration, calculatePasswordExpirationDate } =
    await import('@/lib/password-expiration-utils');
  await resetPasswordExpiration(user.id, user.role);

  // Invalidate ALL sessions — force re-login on every device.
  const terminated = await terminateAllUserSessions(user.id);
  authLogger.info(
    { userId: user.id, terminated },
    'Terminated all sessions after self-service password reset'
  );

  await logAuditEvent({
    eventType: 'PASSWORD_RESET',
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.INFO,
    userId: user.id,
    username: user.username,
    userRole: user.role,
    ipAddress,
    deviceInfo,
    attemptedRoute: '/api/auth/reset-password',
    requestMethod: 'POST',
    isAuthenticated: false,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      via: 'self_service_token',
      sessionsInvalidated: true,
      newExpirationDate: calculatePasswordExpirationDate(new Date(), user.role),
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Your password has been reset successfully. You can now sign in.',
  });
}, 'auth'), 'auth-reset-password');
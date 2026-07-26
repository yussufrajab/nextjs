import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  validatePasswordComplexity,
  isCommonPassword,
  isLockedOut,
  getRemainingLockoutTime,
  calculateLockoutExpiry,
  PASSWORD_MIN_LENGTH,
  PASSWORD_HISTORY_LENGTH,
  MAX_PASSWORD_CHANGE_ATTEMPTS,
} from '@/lib/password-utils';
import {
  checkPasswordHistory,
  hashPassword,
  comparePassword,
} from '@/lib/password-hash';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  terminateOtherUserSessions,
} from '@/lib/session-manager';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';
import { checkPasswordBreached } from '@/lib/hibp';

const changePasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
});

export const POST = wrapHandler(withRateLimit(async (request) => {
    const csrfCheck = await validateCSRF(request);
    if (!csrfCheck.valid) return csrfCheck.response!;

    const body = await request.json();
    const { userId, currentPassword, newPassword } =
      changePasswordSchema.parse(body);

    authLogger.info({ userId }, 'Password change attempt');

    // Find user in database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      authLogger.info({ userId }, 'User not found');
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.active) {
      authLogger.info({ userId }, 'User account is inactive');
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 401 }
      );
    }

    // Check if user is locked out from password changes
    if (isLockedOut(user.passwordChangeLockoutUntil)) {
      const remainingMinutes = getRemainingLockoutTime(
        user.passwordChangeLockoutUntil
      );
      authLogger.info({ userId, remainingMinutes }, 'User locked out');
      return NextResponse.json(
        {
          success: false,
          message: `Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`,
        },
        { status: 429 }
      );
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      authLogger.info({ userId }, 'Invalid current password');

      // Increment failed attempts
      const newAttempts = (user.failedPasswordChangeAttempts || 0) + 1;
      const updateData: {
        failedPasswordChangeAttempts: number;
        passwordChangeLockoutUntil?: Date;
      } = {
        failedPasswordChangeAttempts: newAttempts,
      };

      // Lock account if max attempts reached
      if (newAttempts >= MAX_PASSWORD_CHANGE_ATTEMPTS) {
        updateData.passwordChangeLockoutUntil = calculateLockoutExpiry();
        authLogger.info({ userId, attempts: newAttempts }, 'User locked out after failed password change attempts');
      }

      await db.user.update({
        where: { id: userId },
        data: updateData,
      });

      return NextResponse.json(
        {
          success: false,
          message:
            newAttempts >= MAX_PASSWORD_CHANGE_ATTEMPTS
              ? `Too many failed attempts. Your account has been locked for 30 minutes.`
              : `Current password is incorrect. ${MAX_PASSWORD_CHANGE_ATTEMPTS - newAttempts} attempt${MAX_PASSWORD_CHANGE_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`,
        },
        { status: 401 }
      );
    }

    // Validate new password complexity
    if (!validatePasswordComplexity(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain an uppercase letter, lowercase letter, number, and special character.`,
        },
        { status: 400 }
      );
    }

    // Check if password is too common
    if (isCommonPassword(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'This password is too common and easily guessable. Please choose a stronger password.',
        },
        { status: 400 }
      );
    }

    // Check HIBP (k-anonymity) — reject if the password appears in a known breach.
    // Best-effort: a HIBP error does NOT block the change (fail-open), but the
    // error is logged so the SOC can review coverage.
    const breachCheck = await checkPasswordBreached(newPassword);
    if (breachCheck.isPwned) {
      authLogger.warn(
        { userId, breachCount: breachCheck.count },
        'Rejected password change — password found in known breach (HIBP)'
      );
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
      // HIBP unreachable — log for SOC review but do not block
      authLogger.warn(
        { userId, reason: breachCheck.errorReason },
        'HIBP breach check failed (fail-open). Password change proceeded.'
      );
    }

    // Check against password history
    const passwordHistory = user.passwordHistory || [];
    const matchesHistory = await checkPasswordHistory(
      newPassword,
      passwordHistory
    );

    if (matchesHistory) {
      return NextResponse.json(
        {
          success: false,
          message: `You cannot reuse any of your last ${PASSWORD_HISTORY_LENGTH} passwords. Please choose a different password.`,
        },
        { status: 400 }
      );
    }

    // Check if new password is same as current password
    const sameAsCurrentPassword = await comparePassword(
      newPassword,
      user.password
    );

    if (sameAsCurrentPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'New password must be different from your current password.',
        },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password history (prepend current password, keep last PASSWORD_HISTORY_LENGTH)
    const updatedHistory = [user.password, ...passwordHistory].slice(
      0,
      PASSWORD_HISTORY_LENGTH
    );

    // Update user's password and clear temporary password flags
    await db.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordHistory: updatedHistory,
        isTemporaryPassword: false,
        mustChangePassword: false,
        temporaryPasswordExpiry: null,
        failedPasswordChangeAttempts: 0,
        passwordChangeLockoutUntil: null,
        lastPasswordChange: new Date(),
        updatedAt: new Date(),
      },
    });

    // Reset password expiration
    const { resetPasswordExpiration, calculatePasswordExpirationDate } =
      await import('@/lib/password-expiration-utils');
    await resetPasswordExpiration(userId, user.role);

    // Invalidate all other sessions for this user (force re-login on other
    // devices). The current device stays signed in on its existing session.
    let currentSessionToken: string | undefined;
    if (request instanceof NextRequest && 'cookies' in request) {
      currentSessionToken = verifySessionToken(
        request.cookies.get(SESSION_COOKIE_NAME)?.value ?? ''
      ) ?? undefined;
    } else {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
        if (match) {
          currentSessionToken = verifySessionToken(match[1]) ?? undefined;
        }
      }
    }
    if (currentSessionToken) {
      const terminated = await terminateOtherUserSessions(user.id, currentSessionToken);
      authLogger.info({ userId: user.id, terminated }, 'Terminated other sessions after password change');
    } else {
      // No session cookie on the request (e.g. admin forcing a password
      // change on behalf of a user) — terminate ALL sessions to be safe.
      const { terminateAllUserSessions } = await import('@/lib/session-manager');
      const terminated = await terminateAllUserSessions(user.id);
      authLogger.info({ userId: user.id, terminated }, 'Terminated all sessions after password change (no current session cookie)');
    }

    // Log password change with audit
    const { logAuditEvent, AuditEventCategory, AuditSeverity, getClientIp } =
      await import('@/lib/audit-logger');
    await logAuditEvent({
      eventType: 'PASSWORD_CHANGED',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.INFO,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ipAddress: getClientIp(request.headers),
      deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
      attemptedRoute: '/api/auth/change-password',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: {
        wasTemporaryPassword: user.isTemporaryPassword,
        newExpirationDate: calculatePasswordExpirationDate(
          new Date(),
          user.role
        ),
        sessionsInvalidated: true,
      },
    });

    authLogger.info({ userId }, 'Password changed successfully');

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
}, 'auth'), 'auth-change-password');

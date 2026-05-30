import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  validatePasswordComplexity,
  isCommonPassword,
  checkPasswordHistory,
  hashPassword,
  comparePassword,
  isLockedOut,
  getRemainingLockoutTime,
  calculateLockoutExpiry,
  PASSWORD_MIN_LENGTH,
  PASSWORD_HISTORY_LENGTH,
  MAX_PASSWORD_CHANGE_ATTEMPTS,
} from '@/lib/password-utils';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const changePasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
});

export const POST = wrapHandler(withRateLimit(async (request) => {
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
          message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain at least one uppercase letter, lowercase letter, number, or special character.`,
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

    // Update password history (prepend current password, keep last 3)
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
      },
    });

    authLogger.info({ userId }, 'Password changed successfully');

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
}, 'auth'), 'auth-change-password');

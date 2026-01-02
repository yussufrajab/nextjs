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

const changePasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, currentPassword, newPassword } =
      changePasswordSchema.parse(body);

    console.log('Password change attempt for user ID:', userId);

    // Find user in database
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.active) {
      console.log('User account is inactive:', userId);
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
      console.log(
        `User ${userId} is locked out. ${remainingMinutes} minutes remaining.`
      );
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
      console.log('Invalid current password for user:', userId);

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
        console.log(`User ${userId} locked out after ${newAttempts} failed attempts`);
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
    const { resetPasswordExpiration, calculatePasswordExpirationDate } = await import('@/lib/password-expiration-utils');
    await resetPasswordExpiration(userId, user.role);

    // Log password change with audit
    const { logAuditEvent, AuditEventCategory, AuditSeverity } = await import('@/lib/audit-logger');
    await logAuditEvent({
      eventType: 'PASSWORD_CHANGED',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.INFO,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      attemptedRoute: '/api/auth/change-password',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: {
        wasTemporaryPassword: user.isTemporaryPassword,
        newExpirationDate: calculatePasswordExpirationDate(new Date(), user.role),
      },
    });

    console.log('Password changed successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[CHANGE_PASSWORD_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

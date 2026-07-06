import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  generateTemporaryPassword,
  hashPassword,
  calculateTemporaryPasswordExpiry,
  validatePasswordComplexity,
  isCommonPassword,
} from '@/lib/password-utils';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const resetPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  temporaryPassword: z.string().optional(),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  // Step-up re-authentication: resetting another user's password is a
  // Tier-1 sensitive action.
  const denied = requireReauth(request, 'admin.reset-password', auth);
  if (denied) return denied;

  const body = await request.json();
  const { userId, temporaryPassword } =
    resetPasswordSchema.parse(body);

  logger.info({ value: userId }, 'Password reset request for user ID');

  // Use verified admin ID from auth context
  const adminId = auth.userId;

  // Find the user to reset
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    logger.info({ value: userId }, 'User not found');
    return NextResponse.json(
      { success: false, message: 'User not found' },
      { status: 404 }
    );
  }

  // Determine password: use provided or generate
  let newPassword: string;
  let wasGenerated = false;

  if (temporaryPassword) {
    // Validate custom password meets complexity requirements
    if (!validatePasswordComplexity(temporaryPassword)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The provided password does not meet complexity requirements. Password must be at least 8 characters and contain at least one uppercase letter, lowercase letter, number, or special character.',
        },
        { status: 400 }
      );
    }

    // Check if password is too common/weak
    if (isCommonPassword(temporaryPassword)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'The provided password is too common and easily guessable. Please choose a stronger password or use auto-generate.',
        },
        { status: 400 }
      );
    }

    newPassword = temporaryPassword;
    wasGenerated = false;
  } else {
    // Auto-generate secure password
    newPassword = generateTemporaryPassword();
    wasGenerated = true;
  }

  // Hash the new password
  const hashedPassword = await hashPassword(newPassword);

  // Update user with temporary password flags
  await db.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      isTemporaryPassword: true,
      temporaryPasswordExpiry: calculateTemporaryPasswordExpiry(),
      mustChangePassword: true,
      failedPasswordChangeAttempts: 0,
      passwordChangeLockoutUntil: null,
      // Reset expiration tracking (temporary passwords have their own expiry)
      passwordExpiresAt: null,
      lastExpirationWarningLevel: 0,
      gracePeriodStartedAt: null,
      // Keep existing password history
      updatedAt: new Date(),
    },
  });

  // Log password reset in audit trail using verified auth context
  const { logAuditEvent, AuditEventCategory, AuditSeverity, getClientIp } =
    await import('@/lib/audit-logger');
  const ipAddress = getClientIp(request.headers);
  const deviceInfo = JSON.parse(request.headers.get('x-device-info') || 'null');

  await logAuditEvent({
    eventType: 'ADMIN_PASSWORD_RESET',
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.WARNING,
    userId: adminId,
    username: auth.username,
    userRole: auth.role,
    ipAddress,
    deviceInfo,
    attemptedRoute: '/api/admin/reset-password',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: {
      targetUserId: userId,
      targetUsername: user.username,
      wasGenerated,
    },
  });

  logger.info({ value: userId }, 'Password reset successfully for user');

  return NextResponse.json({
    success: true,
    message: 'Password reset successfully',
    data: {
      temporaryPassword: newPassword, // Return password only this once
      wasGenerated,
      expiresAt: calculateTemporaryPasswordExpiry(),
    },
  });
}, { allowedRoles: ['Admin'] }), 'write'), 'admin-reset-password');
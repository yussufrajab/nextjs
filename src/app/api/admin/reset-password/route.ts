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

const resetPasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  temporaryPassword: z.string().optional(),
  // In a real app, you'd extract adminId from session/token
  adminId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, temporaryPassword, adminId } =
      resetPasswordSchema.parse(body);

    console.log('Password reset request for user ID:', userId);

    // Verify that the caller is an admin
    let admin = null;
    if (adminId) {
      admin = await db.user.findUnique({
        where: { id: adminId },
      });

      if (!admin || admin.role !== 'Admin') {
        return NextResponse.json(
          {
            success: false,
            message: 'Unauthorized. Only admins can reset passwords.',
          },
          { status: 403 }
        );
      }
    }

    // Find the user to reset
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

    // Log password reset in audit trail
    const { logAuditEvent, AuditEventCategory, AuditSeverity, getClientIp } =
      await import('@/lib/audit-logger');
    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent');

    await logAuditEvent({
      eventType: 'ADMIN_PASSWORD_RESET',
      eventCategory: AuditEventCategory.SECURITY,
      severity: AuditSeverity.WARNING,
      userId: adminId || null,
      username: admin?.username || 'unknown',
      userRole: admin?.role || null,
      ipAddress,
      userAgent,
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

    console.log('Password reset successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        temporaryPassword: newPassword, // Return password only this once
        wasGenerated,
        expiresAt: calculateTemporaryPasswordExpiry(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[ADMIN_RESET_PASSWORD_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

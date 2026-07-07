import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import crypto from 'crypto';
import { completeLogin } from '@/lib/auth-helpers';
import { incrementOtpVerifyAttempts, verifyMfaToken } from '@/lib/mfa-utils';
import { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity, getClientIp } from '@/lib/audit-logger';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  otpCode: z.string().length(6),
});

export const POST = wrapHandler(withRateLimit(async (request) => {
    const csrfCheck = await validateCSRF(request);
    if (!csrfCheck.valid) return csrfCheck.response!;

    const body = await request.json();
    const { userId, otpCode } = verifyOtpSchema.parse(body);

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;
    const deviceInfo: Record<string, any> | null = JSON.parse(request.headers.get('x-device-info') || 'null');

    // Find the most recent unused OTP token for this user
    const mfaToken = await db.mfaToken.findFirst({
      where: {
        userId,
        tokenType: 'OTP',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!mfaToken) {
      return NextResponse.json(
        { success: false, message: 'No valid verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check verification attempts
    const attemptCheck = await incrementOtpVerifyAttempts(mfaToken.id);
    if (!attemptCheck.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many failed attempts. Please request a new verification code.' },
        { status: 400 }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(mfaToken.token, 'utf8');
    const inputBuffer = Buffer.from(otpCode, 'utf8');
    if (tokenBuffer.length !== inputBuffer.length || !crypto.timingSafeEqual(tokenBuffer, inputBuffer)) {
      // Fetch user for audit logging
      const failedUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true },
      });
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_FAILED,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        severity: AuditSeverity.WARNING,
        userId: failedUser?.id ?? userId,
        username: failedUser?.username ?? null,
        userRole: failedUser?.role ?? null,
        ipAddress: getClientIp(request.headers),
        deviceInfo,
        attemptedRoute: '/api/auth/mfa/verify-otp',
        requestMethod: 'POST',
        isAuthenticated: true,
        wasBlocked: true,
        blockReason: 'Invalid OTP code',
        additionalData: { mfaMethod: 'otp', action: 'OTP_FAILED' },
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid verification code',
          data: { remainingAttempts: attemptCheck.remainingAttempts },
        },
        { status: 400 }
      );
    }

    // Mark token as used
    await db.mfaToken.update({
      where: { id: mfaToken.id },
      data: { usedAt: new Date() },
    });

    // Also invalidate any magic link tokens for this user
    await db.mfaToken.updateMany({
      where: { userId, tokenType: 'MAGIC_LINK', usedAt: null },
      data: { usedAt: new Date() },
    });

    // Get full user data for completeLogin
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { Institution: true, Employee: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 401 }
      );
    }

    await logAuditEvent({
      eventType: AuditEventType.LOGIN_SUCCESS,
      eventCategory: AuditEventCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      userId: user.id,
      username: user.username,
      userRole: user.role,
      ipAddress: getClientIp(request.headers),
      deviceInfo,
      attemptedRoute: '/api/auth/mfa/verify-otp',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: { mfaMethod: 'otp', action: 'OTP_VERIFIED' },
    }).catch(() => {});

    return completeLogin({
      user,
      ipAddress,
      userAgent,
      deviceInfo,
    });
}, 'auth'), 'auth-mfa-verify-otp');
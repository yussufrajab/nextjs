import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createMfaToken, checkOtpRateLimit, maskEmail } from '@/lib/mfa-utils';
import { sendMfaEmail } from '@/lib/email';
import { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity, getClientIp } from '@/lib/audit-logger';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const sendOtpSchema = z.object({
  userId: z.string().min(1),
});

export const POST = wrapHandler(withRateLimit(async (request) => {
    const body = await request.json();
    const { userId } = sendOtpSchema.parse(body);

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;
    const deviceInfo: Record<string, any> | null = JSON.parse(request.headers.get('x-device-info') || 'null');

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { success: false, message: 'No email address on file for this account.' },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateLimitCheck = await checkOtpRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many verification requests. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const mfaTokenExpiryMinutes = Number(process.env.MFA_TOKEN_EXPIRY_MINUTES) || 15;
    const { token: otpToken } = await createMfaToken(userId, 'OTP', user.email, ipAddress, userAgent);
    const { token: magicLinkToken } = await createMfaToken(userId, 'MAGIC_LINK', user.email, ipAddress, userAgent);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
    const magicLinkUrl = `${appUrl}/mfa/magic-link-confirm?token=${magicLinkToken}`;

    const emailResult = await sendMfaEmail(user.email, otpToken, magicLinkUrl, user.name, mfaTokenExpiryMinutes);

    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    await logAuditEvent({
      eventType: AuditEventType.LOGIN_SUCCESS,
      eventCategory: AuditEventCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      userId: user.id,
      username: user.name,
      userRole: undefined,
      ipAddress: getClientIp(request.headers),
      deviceInfo,
      attemptedRoute: '/api/auth/mfa/send-otp',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: { mfaMethod: 'otp', action: 'OTP_SENT' },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { email: maskEmail(user.email) },
      message: 'Verification code sent to your email',
    });
}, 'auth'), 'auth-mfa-send-otp');
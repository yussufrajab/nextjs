import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyMfaToken } from '@/lib/mfa-utils';
import { completeLogin } from '@/lib/auth-helpers';
import { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity, getClientIp } from '@/lib/audit-logger';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const magicLinkSchema = z.object({
  token: z.string().min(1),
});

export const POST = wrapHandler(withRateLimit(async (request) => {
    const body = await request.json();
    const { token } = magicLinkSchema.parse(body);

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;
    const deviceInfo: Record<string, any> | null = JSON.parse(request.headers.get('x-device-info') || 'null');

    const result = await verifyMfaToken(token, 'MAGIC_LINK');

    if (!result.valid) {
      await logAuditEvent({
        eventType: AuditEventType.LOGIN_FAILED,
        eventCategory: AuditEventCategory.AUTHENTICATION,
        severity: AuditSeverity.WARNING,
        userId: result.userId ?? null,
        username: null,
        userRole: null,
        ipAddress: getClientIp(request.headers),
        deviceInfo,
        attemptedRoute: '/api/auth/mfa/magic-link',
        requestMethod: 'POST',
        isAuthenticated: false,
        wasBlocked: true,
        blockReason: 'Invalid or expired magic link',
        additionalData: { mfaMethod: 'magic-link', action: 'MAGIC_LINK_FAILED' },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, message: 'This link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Also invalidate any OTP tokens for this user
    await db.mfaToken.updateMany({
      where: { userId: result.userId, tokenType: 'OTP', usedAt: null },
      data: { usedAt: new Date() },
    });

    // Get full user data for completeLogin
    const user = await db.user.findUnique({
      where: { id: result.userId },
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
      attemptedRoute: '/api/auth/mfa/magic-link',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: { mfaMethod: 'magic-link', action: 'MAGIC_LINK_VERIFIED' },
    }).catch(() => {});

    return completeLogin({
      user,
      ipAddress,
      userAgent,
      deviceInfo,
    });
}, 'auth'), 'auth-mfa-magic-link');
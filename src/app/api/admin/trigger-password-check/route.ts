import { NextResponse } from 'next/server';
import { checkPasswordExpirations } from '@/lib/cron-service';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { logAuditEvent, AuditEventCategory, AuditSeverity, getClientIp } from '@/lib/audit-logger';

export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
  // Only allow in development mode OR for Admin users
  if (process.env.NODE_ENV !== 'development' && auth.role.toUpperCase() !== 'ADMIN') {
    return NextResponse.json(
      {
        success: false,
        message: 'This endpoint is only available in development mode or for administrators',
      },
      { status: 403 }
    );
  }

  logger.info('[API] Manually triggering password expiration check...');
  await checkPasswordExpirations();

  // Q10 (Domain 14.7): record the privileged admin trigger in the audit trail.
  await logAuditEvent({
    eventType: 'PASSWORD_CHECK_TRIGGERED',
    eventCategory: AuditEventCategory.SYSTEM,
    severity: AuditSeverity.INFO,
    userId: auth.userId,
    username: auth.username,
    userRole: auth.role,
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    attemptedRoute: '/api/admin/trigger-password-check',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: 'Password expiration check completed successfully',
  });
}, { allowedRoles: ['Admin'] }), 'admin-trigger-password-check');

import { NextRequest, NextResponse } from 'next/server';
import { logUnauthorizedAccess, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

export const POST = wrapHandler(withAuth(async (request: Request, { auth }) => {
  const body = await request.json();

  // SECURITY (Q1): The actor identity is derived from the authenticated session,
  // NOT from the request body. The body only describes the event being reported
  // (the route that was blocked and why) — it must never be allowed to spoof who
  // performed the action, otherwise any authenticated user could write fake
  // UNAUTHORIZED_ACCESS audit entries attributed to someone else.
  const {
    attemptedRoute,
    blockReason,
    isAuthenticated,
    requestMethod,
  } = body;

  // Get IP address from request or use provided one
  const ipAddress = body.ipAddress || getClientIp(request.headers);
  const deviceInfo = body.deviceInfo || JSON.parse(request.headers.get('x-device-info') || 'null');

  // Log the unauthorized access attempt
  await logUnauthorizedAccess({
    userId: auth.userId,
    username: auth.username,
    userRole: auth.role,
    attemptedRoute,
    blockReason,
    ipAddress,
    deviceInfo,
    isAuthenticated: isAuthenticated ?? false,
    requestMethod: requestMethod || 'GET',
  });

  return NextResponse.json({
    success: true,
    message: 'Audit event logged successfully',
  });
}), 'audit-log');

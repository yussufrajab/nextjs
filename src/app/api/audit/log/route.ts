import { NextRequest, NextResponse } from 'next/server';
import { logUnauthorizedAccess, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const POST = wrapHandler(async (request: NextRequest) => {
  const body = await request.json();

  const {
    userId,
    username,
    userRole,
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
    userId: userId || null,
    username: username || null,
    userRole: userRole || null,
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
}, 'audit-log');

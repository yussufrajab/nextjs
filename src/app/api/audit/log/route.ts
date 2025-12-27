/**
 * API endpoint for logging audit events
 * Called by middleware and other parts of the app
 */

import { NextRequest, NextResponse } from 'next/server';
import { logUnauthorizedAccess, getClientIp } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
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
    const userAgent = body.userAgent || request.headers.get('user-agent');

    // Log the unauthorized access attempt
    await logUnauthorizedAccess({
      userId: userId || null,
      username: username || null,
      userRole: userRole || null,
      attemptedRoute,
      blockReason,
      ipAddress,
      userAgent,
      isAuthenticated: isAuthenticated ?? false,
      requestMethod: requestMethod || 'GET',
    });

    return NextResponse.json({
      success: true,
      message: 'Audit event logged successfully',
    });
  } catch (error) {
    console.error('[API] Error logging audit event:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to log audit event',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

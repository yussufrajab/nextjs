/**
 * API endpoint for retrieving audit logs
 * Only accessible to Admin and CSCS roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditStatistics } from '@/lib/audit-logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get user from session/cookie
 */
async function getUserFromRequest(
  request: NextRequest
): Promise<{ id: string; role: string } | null> {
  try {
    const authCookie = request.cookies.get('auth-storage')?.value;
    if (!authCookie) return null;

    const decoded = decodeURIComponent(authCookie);
    const authData = JSON.parse(decoded);
    const state = authData.state || authData;

    if (!state.isAuthenticated || !state.user?.id) return null;

    return {
      id: state.user.id,
      role: state.role || state.user.role,
    };
  } catch (error) {
    console.error('[API] Error parsing auth cookie:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated and has permission (Admin or CSCS)
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Note: Route is now /dashboard/admin/audit-trail (Admin only via middleware)
    // But we still allow CSCS programmatic access to API if needed
    if (user.role !== 'Admin' && user.role !== 'CSCS') {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin or CSCS role required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const statsOnly = searchParams.get('statsOnly') === 'true';

    // If stats only, return statistics
    if (statsOnly) {
      const startDateStr = searchParams.get('startDate');
      const endDateStr = searchParams.get('endDate');

      const stats = await getAuditStatistics({
        startDate: startDateStr ? new Date(startDateStr) : undefined,
        endDate: endDateStr ? new Date(endDateStr) : undefined,
      });

      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Get audit logs with filters
    const filters: any = {};

    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const eventType = searchParams.get('eventType');
    const eventCategory = searchParams.get('eventCategory');
    const severity = searchParams.get('severity');
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');
    const attemptedRoute = searchParams.get('attemptedRoute');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    if (startDateStr) filters.startDate = new Date(startDateStr);
    if (endDateStr) filters.endDate = new Date(endDateStr);
    if (eventType) filters.eventType = eventType;
    if (eventCategory) filters.eventCategory = eventCategory;
    if (severity) filters.severity = severity;
    if (userId) filters.userId = userId;
    if (username) filters.username = username;
    if (attemptedRoute) filters.attemptedRoute = attemptedRoute;
    if (limit) filters.limit = parseInt(limit, 10);
    if (offset) filters.offset = parseInt(offset, 10);

    const result = await getAuditLogs(filters);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[API] Error fetching audit logs:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch audit logs',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogs, getAuditStatistics } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

/**
 * Audit log retrieval endpoint.
 *
 * Authorization is enforced by withAuth against the signed `session` cookie:
 * only Admin or CSCS roles may read audit logs. The forgeable auth-storage
 * cookie is no longer consulted for identity or role.
 */
export const GET = wrapHandler(
  withAuth(async (request: NextRequest | Request) => {
    const searchParams = new URL(request.url).searchParams;
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
  }, { allowedRoles: ['Admin', 'CSCS'] }),
  'audit-logs'
);
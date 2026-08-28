import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import {
  logAuditEvent,
  AuditEventType,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import { generateReport, type ReportOutput } from '@/lib/report-generator';

/**
 * Reports API — GET /api/reports
 *
 * Returns a formatted, auth-scoped report as JSON. The report query + formatting
 * live in `src/lib/report-generator.ts#generateReport` and are shared with the
 * export endpoint (POST /api/reports/export) so that the export act re-runs the
 * SAME server-side authorized query rather than trusting client-supplied data
 * (Req 12.2).
 *
 * SECURITY: role is taken from the signed session (`auth.role`), never from the
 * client. Institution scoping is applied inside `generateReport` based on
 * `auth.role` / `auth.institutionId`.
 */
export const GET = wrapHandler(
  withAuth(async (req: Request, { auth }) => {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('reportType');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const institutionId = searchParams.get('institutionId');

    logger.info(
      {
        reportType,
        fromDate,
        toDate,
        institutionId,
        userRole: auth.role,
      },
      'Reports API called with'
    );

    // Build the server-side, auth-scoped report. Returns a NextResponse for
    // client errors (missing/invalid report type, role-forbidden report).
    const result = await generateReport(
      reportType,
      { fromDate, toDate, institutionId },
      auth
    );
    if (result instanceof NextResponse) {
      return result;
    }

    const report: ReportOutput = result;

    // SECURITY (Req 12.5 / 27.2): audit report access. Reports aggregate
    // sensitive HR data across employees/institutions, so every read is
    // recorded with the actor, role, institution scope, report type, and
    // row count for SOC review. Fail-safe: an audit write failure does not
    // block the report from being returned.
    await logAuditEvent({
      eventType: AuditEventType.REPORT_VIEWED,
      eventCategory: AuditEventCategory.ACCESS,
      severity: AuditSeverity.INFO,
      userId: auth.userId,
      username: auth.username,
      userRole: auth.role,
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
      attemptedRoute: '/api/reports',
      requestMethod: 'GET',
      isAuthenticated: true,
      additionalData: {
        reportType,
        fromDate,
        toDate,
        institutionId: auth.institutionId,
        count: report.data.length,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        reportType,
        filters: {
          fromDate,
          toDate,
          institutionId,
        },
        count: report.data.length,
      },
    });
  }, {
    allowedRoles: ['Admin', 'HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO', 'HRO_PEMBA', 'HRRP_PEMBA'],
  })
);
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { isCSCRole } from '@/lib/role-utils';
import { checkRateLimit } from '@/lib/rate-limiter';
import {
  logAuditEvent,
  AuditEventType,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import { generateReport, type ReportOutput } from '@/lib/report-generator';
import {
  renderExcelBuffer,
  renderPdfBuffer,
  fileNameBase,
} from '@/lib/export-renderer';

/**
 * Export API — POST /api/reports/export
 *
 * SECURITY (Req 12.2 — Export authorization): the export act is gated,
 * rate-limited, and audited on the server. The client no longer generates
 * files from already-fetched data; instead it POSTs the report parameters
 * here and downloads a server-generated file.
 *
 *   1. Authorization — `withAuth` restricts the route to the same roles that
 *      may view reports, and `generateReport` re-runs the auth-scoped query
 *      (role taken from the signed session; institution scoping enforced
 *      server-side). The client cannot widen the dataset.
 *   2. Rate limit — a per-user `download`-tier limit throttles export abuse
 *      (Req 12.2 / 12.7).
 *   3. Audit — every export is recorded as `REPORT_EXPORTED` with actor, role,
 *      institution, report type, format, and row count (Req 12.5).
 *
 * Body: { reportType, fromDate?, toDate?, institutionId?, format: 'pdf'|'xlsx' }
 */
export const POST = wrapHandler(
  withAuth(async (req: Request, { auth }) => {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const reportType = typeof body?.reportType === 'string' ? body.reportType : null;
    const fromDate = typeof body?.fromDate === 'string' ? body.fromDate : null;
    const toDate = typeof body?.toDate === 'string' ? body.toDate : null;
    const institutionIdParam =
      typeof body?.institutionId === 'string' ? body.institutionId : null;
    const format = typeof body?.format === 'string' ? body.format.toLowerCase() : '';

    if (!reportType) {
      return NextResponse.json(
        { success: false, message: 'Report type is required' },
        { status: 400 }
      );
    }
    if (format !== 'pdf' && format !== 'xlsx') {
      return NextResponse.json(
        { success: false, message: "Format must be 'pdf' or 'xlsx'" },
        { status: 400 }
      );
    }

    // SECURITY (Req 12.7): per-user rate limit on the export act. The
    // `download` tier fails open if Redis is down (consistent with other
    // non-auth tiers) — a brief un-throttled window is preferable to a 503
    // storm on the reports workflow.
    const rateKey = `ratelimit:export:user:${auth.userId}`;
    const rl = await checkRateLimit(rateKey, 'download');
    if (!rl.allowed) {
      const isFailClosed = rl.reason === 'fail_closed';
      return NextResponse.json(
        {
          success: false,
          error: isFailClosed
            ? 'Service temporarily unavailable — please retry shortly'
            : 'Too many export requests',
          errorCode: isFailClosed ? 'SERVICE_UNAVAILABLE' : 'RATE_LIMIT_EXCEEDED',
          retryAfter: rl.retryAfter,
        },
        {
          status: isFailClosed ? 503 : 429,
          headers: {
            'Retry-After': String(rl.retryAfter ?? 60),
            'X-RateLimit-Limit': String(rl.limit ?? 60),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // Build the server-side, auth-scoped report. Returns a NextResponse for
    // client errors (invalid type, role-forbidden report).
    const result = await generateReport(
      reportType,
      { fromDate, toDate, institutionId: institutionIdParam },
      auth
    );
    if (result instanceof NextResponse) {
      return result;
    }
    const report: ReportOutput = result;

    // Resolve the institution name for the PDF header (CSC-scoped exports
    // may target a single institution). Non-CSC roles are always scoped to
    // their own institution.
    let institutionName: string | null = null;
    const effectiveInstitutionId =
      institutionIdParam && isCSCRole(auth.role) ? institutionIdParam : auth.institutionId;
    if (effectiveInstitutionId) {
      try {
        const inst = await db.institution.findUnique({
          where: { id: effectiveInstitutionId },
          select: { name: true },
        });
        institutionName = inst?.name ?? null;
      } catch {
        // Non-fatal — the report data is already authorized; the header
        // label is cosmetic.
      }
    }

    // Render the file server-side.
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;
    try {
      if (format === 'pdf') {
        fileBuffer = renderPdfBuffer(report, reportType, {
          fromDate,
          toDate,
          institutionName,
        });
        contentType = 'application/pdf';
        fileExtension = 'pdf';
      } else {
        fileBuffer = renderExcelBuffer(report, reportType);
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
      }
    } catch (err) {
      logger.error({ err, reportType, format }, 'Export rendering failed');
      return NextResponse.json(
        { success: false, message: 'Failed to generate export file' },
        { status: 500 }
      );
    }

    const fileName = `${fileNameBase(report.title)}_report.${fileExtension}`;

    // SECURITY (Req 12.5): audit the export act separately from the view.
    // Fail-safe: an audit write failure does not block the download.
    await logAuditEvent({
      eventType: AuditEventType.REPORT_EXPORTED,
      eventCategory: AuditEventCategory.ACCESS,
      severity: AuditSeverity.INFO,
      userId: auth.userId,
      username: auth.username,
      userRole: auth.role,
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
      attemptedRoute: '/api/reports/export',
      requestMethod: 'POST',
      isAuthenticated: true,
      additionalData: {
        reportType,
        fromDate,
        toDate,
        institutionId: effectiveInstitutionId,
        format,
        fileName,
        count: report.data.length,
      },
    }).catch(() => {});

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  }, {
    allowedRoles: ['Admin', 'HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO', 'HRO_PEMBA', 'HRRP_PEMBA'],
  })
);
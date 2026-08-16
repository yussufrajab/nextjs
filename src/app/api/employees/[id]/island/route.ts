import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthContext } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { logEmployeeAction, getClientIp } from '@/lib/audit-logger';

/** Extract the [id] segment from /api/employees/[id]/island */
function getEmployeeIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/employees\/([^/]+)\/island/);
  return match ? match[1] : null;
}

/**
 * PATCH /api/employees/[id]/island
 *
 * Assigns an employee to Pemba or Unguja. Restricted to the HRO role only —
 * NOT HRO_PEMBA (Pemba-scoped HROs cannot reassign island; that is a
 * full-institution-scope action). The employee must belong to the HRO's
 * institution.
 *
 * Body: { island: 'PEMBA' | 'UNGUJA' }
 */
export const PATCH = wrapHandler(
  withRateLimit(
    withAuth(async (
      request: Request | NextRequest,
      { auth }: { auth: AuthContext }
    ) => {
      const employeeId = getEmployeeIdFromUrl(request.url);

      if (!employeeId) {
        return NextResponse.json(
          { success: false, message: 'Employee ID is required' },
          { status: 400 }
        );
      }

      // Only HRO (not HRO_PEMBA) can assign island
      if (auth.role !== 'HRO') {
        return NextResponse.json(
          { success: false, message: 'Access denied: only HRO can assign island' },
          { status: 403 }
        );
      }

      let body: { island?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, message: 'Invalid request body' },
          { status: 400 }
        );
      }

      const island = body.island?.toUpperCase();
      if (island !== 'PEMBA' && island !== 'UNGUJA') {
        return NextResponse.json(
          {
            success: false,
            message: 'Island must be either "PEMBA" or "UNGUJA"',
          },
          { status: 400 }
        );
      }

      // Load the employee and verify institution ownership
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          name: true,
          zanId: true,
          institutionId: true,
          island: true,
        },
      });

      if (!employee) {
        return NextResponse.json(
          { success: false, message: 'Employee not found' },
          { status: 404 }
        );
      }

      if (employee.institutionId !== auth.institutionId) {
        return NextResponse.json(
          {
            success: false,
            message: 'Access denied: employee belongs to a different institution',
          },
          { status: 403 }
        );
      }

      // No-op if already the same island
      if (employee.island === island) {
        return NextResponse.json({
          success: true,
          message: `Employee is already assigned to ${island}`,
          data: { id: employee.id, island: employee.island },
        });
      }

      const previousIsland = employee.island;

      const updated = await db.employee.update({
        where: { id: employeeId },
        data: { island },
        select: { id: true, island: true },
      });

      logger.info(
        {
          employeeId,
          previousIsland,
          newIsland: island,
          performedBy: auth.userId,
        },
        'Employee island updated'
      );

      // Audit trail
      logEmployeeAction({
        action: 'UPDATED',
        employeeId,
        employeeName: employee.name ?? undefined,
        employeeZanId: employee.zanId ?? undefined,
        performedById: auth.userId,
        performedByUsername: auth.username,
        performedByRole: auth.role,
        ipAddress: getClientIp(request.headers),
        additionalData: {
          field: 'island',
          previousValue: previousIsland,
          newValue: island,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Employee assigned to ${island} successfully`,
        data: { id: updated.id, island: updated.island },
      });
    }),
    'read'
  ),
  'employees-island'
);
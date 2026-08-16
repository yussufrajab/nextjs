import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter, pembaIslandWhere } from '@/lib/role-utils';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

async function GETHandler(req: Request, { auth }: { auth: any }) {
    // SECURITY: Use authenticated user context, not client-supplied params
    const userRole = auth.role;
    const userInstitutionId = auth.institutionId;

    const whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      logger.info(
        `Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`
      );
      whereClause.Employee = {
        institutionId: userInstitutionId,
        ...pembaIslandWhere(userRole),
      };
    } else {
      logger.info(
        `Role ${userRole} is a CSC role - showing all LWOP requests across institutions`
      );
    }

    const requests = await db.lwopRequest
      .findMany({
        where: whereClause,
        include: {
          Employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              Institution: { select: { id: true, name: true } },
            },
          },
          User_LwopRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_LwopRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => []);

    return NextResponse.json({ success: true, data: requests });
}

export const GET = wrapHandler(withAuth(GETHandler), 'lwop-requests');

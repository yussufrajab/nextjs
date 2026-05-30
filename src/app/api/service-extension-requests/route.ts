import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

async function GETHandler(req: Request) {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    const whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      logger.info(
        `Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`
      );
      whereClause.Employee = {
        institutionId: userInstitutionId,
      };
    } else {
      logger.info(
        `Role ${userRole} is a CSC role - showing all service extension requests across institutions`
      );
    }

    const requests = await db.serviceExtensionRequest
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
          User_ServiceExtensionRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_ServiceExtensionRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []);

    return NextResponse.json({ success: true, data: requests });
}

export const GET = wrapHandler(GETHandler, 'service-extension-requests');

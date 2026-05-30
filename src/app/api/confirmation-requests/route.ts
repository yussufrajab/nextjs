import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { withAuth } from '@/lib/api-auth';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(withAuth(
  async (req, { auth }) => {
    const { role: userRole, institutionId: userInstitutionId } = auth;

    logger.info({
      userRole,
      userInstitutionId,
    }, 'Confirmation requests API called with');

    const whereClause: any = {};

    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      whereClause.Employee = {
        institutionId: userInstitutionId,
      };
      logger.info(
        { userRole },
        'Applying institution filter for confirmation requests'
      );
    } else {
      logger.info(
        { userRole },
        'CSC role - showing ALL confirmation requests'
      );
    }

    const requests = await db.confirmationRequest
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
          User_ConfirmationRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_ConfirmationRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []);

    return NextResponse.json({ success: true, data: requests });
  },
  { allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP'] }
), 'confirmation-requests');

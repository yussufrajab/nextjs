import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Confirmation requests API called with:', { userRole, userInstitutionId });

    let whereClause: any = {};

    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      whereClause.employee = {
        institutionId: userInstitutionId
      };
      console.log('Applying institution filter for confirmation requests, role:', userRole);
    } else {
      console.log('CSC role - showing ALL confirmation requests for role:', userRole);
    }

    const requests = await db.confirmationRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            institution: { select: { id: true, name: true } }
          }
        },
        submittedBy: { select: { id: true, name: true, username: true } },
        reviewedBy: { select: { id: true, name: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    return NextResponse.json({ success: true, data: requests });
  } catch (error) {
    console.error("[CONFIRMATION_REQUESTS_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
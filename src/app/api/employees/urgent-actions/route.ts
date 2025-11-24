import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Urgent actions API called with:', { userRole, userInstitutionId });

    // Get employees that need urgent actions
    // For now, return employees approaching retirement or with pending confirmations
    const today = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    // Build where clause based on user role and institution
    let whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(`Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`);
      whereClause.institutionId = userInstitutionId;
    } else {
      console.log(`Role ${userRole} is a CSC role - showing urgent actions for all institutions`);
    }

    // Add the urgent conditions to the where clause
    whereClause.OR = [
      // Employees approaching retirement (retirement date within 3 months)
      {
        retirementDate: {
          lte: threeMonthsFromNow,
          gte: today
        }
      },
      // Employees with pending confirmation (employed more than 3 years ago but not confirmed)
      {
        AND: [
          { status: { not: 'Confirmed' } },
          { 
            employmentDate: {
              lte: new Date(today.getFullYear() - 3, today.getMonth(), today.getDate())
            }
          }
        ]
      }
    ];

    const urgentEmployees = await db.employee.findMany({
      where: whereClause,
      include: {
        institution: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { name: 'asc' }
    }).catch(() => []);

    console.log(`Found ${urgentEmployees.length} employees needing urgent actions`);

    // Separate employees by urgency type
    const probationOverdue = urgentEmployees.filter(emp => 
      !(emp.retirementDate && emp.retirementDate <= threeMonthsFromNow)
    );
    
    const nearingRetirement = urgentEmployees.filter(emp => 
      emp.retirementDate && emp.retirementDate <= threeMonthsFromNow
    );

    return NextResponse.json({
      success: true,
      data: {
        probationOverdue,
        nearingRetirement
      }
    });

  } catch (error) {
    console.error("[URGENT_ACTIONS_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
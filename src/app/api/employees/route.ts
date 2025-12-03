import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter, isCSCRole } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');
    const q = searchParams.get('q');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '200'); // Default to 200 for latest profiles

    console.log('Employees API called with params:', { userRole, userInstitutionId, q, status, gender, page, size });

    // Build where clause based on parameters
    let whereClause: any = {};

    // CSC internal roles and Admin should see ALL employees from all institutions
    // Institution-based roles should only see employees from their institution
    // If no role provided, show all employees (default behavior)
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      whereClause.institutionId = userInstitutionId;
      console.log('Applying institution filter for role:', userRole);
    } else if (isCSCRole(userRole)) {
      console.log('CSC role detected - showing ALL institutions data for role:', userRole);
    } else if (!userRole) {
      console.log('No user role provided - showing ALL employees (default behavior)');
    }

    // If search query provided, search by name, zanId, cadre, or institution name
    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { zanId: { contains: q, mode: 'insensitive' } },
        { cadre: { contains: q, mode: 'insensitive' } },
        { Institution: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Filter by gender if provided
    if (gender) {
      whereClause.gender = gender;
    }

    // Get total count for pagination
    const total = await db.Employee.count({ where: whereClause }).catch(() => 0);

    // Get employees with pagination (latest 200 by default, ordered by most recent updates)
    const employees = await db.Employee.findMany({
      where: whereClause,
      include: {
        Institution: {
          select: {
            id: true,
            name: true
          }
        },
        EmployeeCertificate: {
          select: {
            id: true,
            type: true,
            name: true,
            url: true
          }
        }
      },
      orderBy: [
        { employmentDate: 'desc' }, // Most recently employed first
        { name: 'asc' }             // Then by name for consistency
      ],
      skip: (page - 1) * size,
      take: size
    }).catch(() => []);

    console.log(`Found ${employees.length} employees out of ${total} total`);

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: {
        page,
        size,
        total,
        totalPages: Math.ceil(total / size)
      }
    });

  } catch (error) {
    console.error("[EMPLOYEES_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
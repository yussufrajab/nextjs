import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter, isCSCRole } from '@/lib/role-utils';

// Cache configuration for employee data
const CACHE_TTL = 60; // 60 seconds cache (employee data changes infrequently)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');
    const employeeId = searchParams.get('id');
    const q = searchParams.get('q');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '200'); // Default to 200 for latest profiles

    console.log('Employees API called with params:', {
      userRole,
      userInstitutionId,
      employeeId,
      q,
      status,
      gender,
      page,
      size,
    });

    // If a specific employee ID is requested, fetch that employee directly
    if (employeeId) {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: {
          Institution: {
            select: {
              id: true,
              name: true,
            },
          },
          EmployeeCertificate: {
            select: {
              id: true,
              type: true,
              name: true,
              url: true,
            },
          },
        },
      });

      if (!employee) {
        return NextResponse.json(
          {
            success: false,
            message: 'Employee not found',
          },
          { status: 404 }
        );
      }

      // Map EmployeeCertificate to certificates and Institution to institution
      const mappedEmployee = {
        ...employee,
        institution: employee.Institution,
        certificates: employee.EmployeeCertificate,
        Institution: undefined,
        EmployeeCertificate: undefined,
      };

      // Set cache headers for single employee lookup
      const headers = new Headers();
      headers.set(
        'Cache-Control',
        `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`
      );

      return NextResponse.json(
        {
          success: true,
          data: [mappedEmployee],
          pagination: {
            page: 1,
            size: 1,
            total: 1,
            totalPages: 1,
          },
        },
        { headers }
      );
    }

    // Build where clause based on parameters
    const whereClause: any = {};

    // CSC internal roles and Admin should see ALL employees from all institutions
    // Institution-based roles should only see employees from their institution
    // If no role provided, show all employees (default behavior)
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      whereClause.institutionId = userInstitutionId;
      console.log('Applying institution filter for role:', userRole);
    } else if (isCSCRole(userRole)) {
      console.log(
        'CSC role detected - showing ALL institutions data for role:',
        userRole
      );
    } else if (!userRole) {
      console.log(
        'No user role provided - showing ALL employees (default behavior)'
      );
    }

    // If a specific institution ID is provided, filter by that institution
    const institutionId = searchParams.get('institutionId');
    if (institutionId) {
      whereClause.institutionId = institutionId;
      console.log('Filtering by specific institution:', institutionId);
    }

    // If search query provided, search by name, zanId, payrollNumber, cadre, or institution name
    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { zanId: { contains: q, mode: 'insensitive' } },
        { payrollNumber: { contains: q, mode: 'insensitive' } },
        { cadre: { contains: q, mode: 'insensitive' } },
        { Institution: { name: { contains: q, mode: 'insensitive' } } },
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
    const total = await db.employee
      .count({ where: whereClause })
      .catch(() => 0);

    // Get employees with pagination (latest 200 by default, ordered by most recent updates)
    const employees = await db.employee
      .findMany({
        where: whereClause,
        include: {
          Institution: {
            select: {
              id: true,
              name: true,
            },
          },
          EmployeeCertificate: {
            select: {
              id: true,
              type: true,
              name: true,
              url: true,
            },
          },
        },
        orderBy: [
          { employmentDate: 'desc' }, // Most recently employed first
          { name: 'asc' }, // Then by name for consistency
        ],
        skip: (page - 1) * size,
        take: size,
      })
      .catch(() => []);

    console.log(`Found ${employees.length} employees out of ${total} total`);

    // Map EmployeeCertificate to certificates and Institution to institution to match TypeScript interface
    const mappedEmployees = employees.map((emp) => ({
      ...emp,
      institution: emp.Institution,
      certificates: emp.EmployeeCertificate,
      Institution: undefined,
      EmployeeCertificate: undefined,
    }));

    // Set cache headers for employee list
    const headers = new Headers();
    headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`
    );

    return NextResponse.json(
      {
        success: true,
        data: mappedEmployees,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('[EMPLOYEES_GET]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

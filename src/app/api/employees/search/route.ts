import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const zanId = searchParams.get('zanId');
    const payrollNumber = searchParams.get('payrollNumber');
    const identifier = searchParams.get('identifier'); // New flexible search parameter
    const q = searchParams.get('q');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Employee search API called with:', { zanId, payrollNumber, identifier, q, userRole, userInstitutionId });

    if (!zanId && !payrollNumber && !identifier && !q) {
      return NextResponse.json({ 
        success: false, 
        message: 'Either zanId, payrollNumber, identifier, or q parameter is required' 
      }, { status: 400 });
    }

    // Validate required parameters for security
    if (!userRole || !userInstitutionId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User role and institution ID are required for security validation' 
      }, { status: 400 });
    }

    // Determine if institution filtering should be applied
    const shouldFilter = shouldApplyInstitutionFilter(userRole, userInstitutionId);
    console.log(`Should apply institution filter: ${shouldFilter}`);

    let whereClause: any = {};

    // Add institution filtering first if required
    if (shouldFilter) {
      whereClause.institutionId = userInstitutionId;
    }

    // Add search criteria
    if (zanId) {
      whereClause.zanId = zanId;
    } else if (payrollNumber) {
      whereClause.payrollNumber = payrollNumber;
    } else if (identifier) {
      // Search by identifier - try both ZANID and Payroll Number
      if (shouldFilter) {
        whereClause.AND = [
          { institutionId: userInstitutionId },
          {
            OR: [
              { zanId: identifier },
              { payrollNumber: identifier }
            ]
          }
        ];
        // Remove the direct institutionId since it's now in AND clause
        delete whereClause.institutionId;
      } else {
        whereClause.OR = [
          { zanId: identifier },
          { payrollNumber: identifier }
        ];
      }
    } else if (q) {
      // For general search, we need to combine institution filter with OR conditions
      if (shouldFilter) {
        whereClause.AND = [
          { institutionId: userInstitutionId },
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { zanId: { contains: q, mode: 'insensitive' } },
              { payrollNumber: { contains: q, mode: 'insensitive' } },
              { Institution: { name: { contains: q, mode: 'insensitive' } } }
            ]
          }
        ];
        // Remove the direct institutionId since it's now in AND clause
        delete whereClause.institutionId;
      } else {
        whereClause.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { zanId: { contains: q, mode: 'insensitive' } },
          { payrollNumber: { contains: q, mode: 'insensitive' } },
          { Institution: { name: { contains: q, mode: 'insensitive' } } }
        ];
      }
    }

    const employees = await db.employee.findMany({
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
      orderBy: { name: 'asc' }
    }).catch(() => []);

    console.log(`Found ${employees.length} employees matching search criteria`);
    
    // Critical security validation: For HRO and institution-restricted roles,
    // ensure ALL returned employees belong to the user's institution
    if (shouldFilter) {
      // Double-check that all employees belong to the user's institution
      const unauthorizedEmployees = employees.filter(emp => emp.institutionId !== userInstitutionId);
      
      if (unauthorizedEmployees.length > 0) {
        console.warn(`Security violation detected: User ${userRole} from institution ${userInstitutionId} attempted to access employees from other institutions:`, 
          unauthorizedEmployees.map(emp => ({ id: emp.id, zanId: emp.zanId, institutionId: emp.institutionId })));
        
        return NextResponse.json({
          success: false,
          message: 'Access denied: You can only search for employees within your institution'
        }, { status: 403 });
      }

      const filteredEmployees = employees.filter(emp => emp.institutionId === userInstitutionId);
      console.log(`After institution validation: ${filteredEmployees.length} employees from institution ${userInstitutionId}`);

      // Map EmployeeCertificate to certificates to match TypeScript interface
      const mappedEmployees = filteredEmployees.map(emp => ({
        ...emp,
        certificates: emp.EmployeeCertificate,
        EmployeeCertificate: undefined
      }));

      return NextResponse.json({
        success: true,
        data: mappedEmployees
      });
    }

    // For CSC roles with full access
    // Map EmployeeCertificate to certificates to match TypeScript interface
    const mappedEmployees = employees.map(emp => ({
      ...emp,
      certificates: emp.EmployeeCertificate,
      EmployeeCertificate: undefined
    }));

    return NextResponse.json({
      success: true,
      data: mappedEmployees
    });

  } catch (error) {
    console.error("[EMPLOYEES_SEARCH_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
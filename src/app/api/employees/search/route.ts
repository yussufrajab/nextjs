import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { sanitizeEmployees } from '@/lib/sanitize-response';

export const GET = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const { searchParams } = new URL(request.url);
  const zanId = searchParams.get('zanId');
  const payrollNumber = searchParams.get('payrollNumber');
  const identifier = searchParams.get('identifier'); // New flexible search parameter
  const employeeId = searchParams.get('employeeId'); // Direct employee ID lookup
  const q = searchParams.get('q');
  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;

  logger.info({
    zanId,
    payrollNumber,
    identifier,
    q,
    userRole,
    userInstitutionId,
   }, 'Employee search API called with');

  if (!zanId && !payrollNumber && !identifier && !employeeId && !q) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Either zanId, payrollNumber, identifier, or q parameter is required',
      },
      { status: 400 }
    );
  }

  // Determine if institution filtering should be applied
  const shouldFilter = shouldApplyInstitutionFilter(
    userRole,
    userInstitutionId
  );
  logger.info(`Should apply institution filter: ${shouldFilter}`);

  const whereClause: any = {};

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
          OR: [{ zanId: identifier }, { payrollNumber: identifier }],
        },
      ];
      // Remove the direct institutionId since it's now in AND clause
      delete whereClause.institutionId;
    } else {
      whereClause.OR = [{ zanId: identifier }, { payrollNumber: identifier }];
    }
  } else if (employeeId) {
    // Direct lookup by employee ID
    whereClause.id = employeeId;
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
            { Institution: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
      // Remove the direct institutionId since it's now in AND clause
      delete whereClause.institutionId;
    } else {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { zanId: { contains: q, mode: 'insensitive' } },
        { payrollNumber: { contains: q, mode: 'insensitive' } },
        { Institution: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
  }

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
      orderBy: { name: 'asc' },
    })
    .catch(() => []);

  logger.info(`Found ${employees.length} employees matching search criteria`);

  // Critical security validation: For HRO and institution-restricted roles,
  // ensure ALL returned employees belong to the user's institution
  if (shouldFilter) {
    // Double-check that all employees belong to the user's institution
    const unauthorizedEmployees = employees.filter(
      (emp) => emp.institutionId !== userInstitutionId
    );

    if (unauthorizedEmployees.length > 0) {
      logger.warn(
        {
          violations: unauthorizedEmployees.map((emp) => ({
            id: emp.id,
            zanId: emp.zanId,
            institutionId: emp.institutionId,
          })),
        },
        `Security violation detected: User ${userRole} from institution ${userInstitutionId} attempted to access employees from other institutions`
      );

      return NextResponse.json(
        {
          success: false,
          message:
            'Access denied: You can only search for employees within your institution',
        },
        { status: 403 }
      );
    }

    const filteredEmployees = employees.filter(
      (emp) => emp.institutionId === userInstitutionId
    );
    logger.info(
      `After institution validation: ${filteredEmployees.length} employees from institution ${userInstitutionId}`
    );

    // Map EmployeeCertificate to certificates and Institution to institution to match TypeScript interface
    const mappedEmployees = sanitizeEmployees(filteredEmployees.map((emp) => ({
      ...emp,
      institution: emp.Institution,
      certificates: emp.EmployeeCertificate,
      Institution: undefined,
      EmployeeCertificate: undefined,
    })), userRole);

    return NextResponse.json({
      success: true,
      data: mappedEmployees,
    });
  }

  // For CSC roles with full access
  // Map EmployeeCertificate to certificates and Institution to institution to match TypeScript interface
  const mappedEmployees = sanitizeEmployees(employees.map((emp) => ({
    ...emp,
    institution: emp.Institution,
    certificates: emp.EmployeeCertificate,
    Institution: undefined,
    EmployeeCertificate: undefined,
  })), userRole);

  return NextResponse.json({
    success: true,
    data: mappedEmployees,
  });
}, { allowedRoles: ['ADMIN', 'HRO', 'HRRP', 'HRMO', 'HHRMD', 'DO', 'CSCS', 'EMPLOYEE'] }), 'read'), 'employees-search');

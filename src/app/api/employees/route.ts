import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter, isCSCRole } from '@/lib/role-utils';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { sanitizeEmployee, sanitizeEmployees } from '@/lib/sanitize-response';
import { logUnauthorizedAccess, getClientIp } from '@/lib/audit-logger';

// Cache configuration for employee data
const CACHE_TTL = 60; // 60 seconds cache (employee data changes infrequently)

export const GET = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
    const { searchParams } = new URL(request.url);
    const userRole = auth.role;
    const userInstitutionId = auth.institutionId;
    const employeeId = searchParams.get('id');
    const q = searchParams.get('q');
    const status = searchParams.get('status');
    const gender = searchParams.get('gender');
    const cadre = searchParams.get('cadre');
    const currentWorkplace = searchParams.get('currentWorkplace');
    const ministry = searchParams.get('ministry');
    const department = searchParams.get('department');
    const institutionIdFilter = searchParams.get('institutionId');
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '200');

    logger.info({ 
      userRole,
      userInstitutionId,
      employeeId,
      q,
      status,
      gender,
      cadre,
      currentWorkplace,
      ministry,
      department,
      institutionIdFilter,
      page,
      size,
     }, 'Employees API called with params');

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

      // Ownership / institution check to prevent IDOR
      if (userRole === 'EMPLOYEE') {
        const requestingUser = await db.user.findUnique({
          where: { id: auth.userId },
          select: { employeeId: true },
        });
        if (!requestingUser || requestingUser.employeeId !== employeeId) {
          // GAP-M7/M10: audit the IDOR attempt with forensic additionalData
          // (attempted object id + target institution) for SOC triage.
          await logUnauthorizedAccess({
            userId: auth.userId,
            username: auth.username,
            userRole,
            attemptedRoute: `/api/employees?id=${employeeId}`,
            blockReason: 'IDOR: employee does not belong to requesting user',
            isAuthenticated: true,
            requestMethod: 'GET',
            ipAddress: getClientIp(request.headers),
            additionalData: {
              idor: true,
              attemptedObjectId: employeeId,
              targetInstitutionId: employee.institutionId,
            },
          }).catch(() => {});
          return NextResponse.json(
            { success: false, message: 'Access denied' },
            { status: 403 }
          );
        }
      } else if (userRole === 'HRO' || userRole === 'HRRP') {
        if (employee.institutionId !== userInstitutionId) {
          // GAP-M6/M10: audit the cross-institution attempt with the target
          // institution id and attempted object id.
          await logUnauthorizedAccess({
            userId: auth.userId,
            username: auth.username,
            userRole,
            attemptedRoute: `/api/employees?id=${employeeId}`,
            blockReason: 'Cross-institution access attempt (IDOR)',
            isAuthenticated: true,
            requestMethod: 'GET',
            ipAddress: getClientIp(request.headers),
            additionalData: {
              idor: true,
              attemptedObjectId: employeeId,
              targetInstitutionId: employee.institutionId,
              actorInstitutionId: userInstitutionId,
            },
          }).catch(() => {});
          return NextResponse.json(
            { success: false, message: 'Access denied' },
            { status: 403 }
          );
        }
      }

      // Map EmployeeCertificate to certificates and Institution to institution
      const mappedEmployee = sanitizeEmployee({
        ...employee,
        institution: employee.Institution,
        certificates: employee.EmployeeCertificate,
        Institution: undefined,
        EmployeeCertificate: undefined,
      }, userRole);

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

    // EMPLOYEE role can only see their own record
    if (userRole === 'EMPLOYEE') {
      const requestingUser = await db.user.findUnique({
        where: { id: auth.userId },
        select: { employeeId: true },
      });
      if (requestingUser?.employeeId) {
        whereClause.id = requestingUser.employeeId;
      } else {
        // Employee user without an associated employee record: return empty
        return NextResponse.json({
          success: true,
          data: [],
          pagination: { page, size, total: 0, totalPages: 0 },
        });
      }
    }
    // CSC internal roles and Admin should see ALL employees from all institutions
    // Institution-based roles should only see employees from their institution
    // If no role provided, show all employees (default behavior)
    else if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      whereClause.institutionId = userInstitutionId;
      logger.info({ value: userRole }, 'Applying institution filter for role');
    } else if (isCSCRole(userRole)) {
      logger.info(`CSC role detected - showing ALL institutions data for role: ${userRole}`);
    } else if (!userRole) {
      logger.info(
        'No user role provided - showing ALL employees (default behavior)'
      );
    }

    // SECURITY: Only CSC roles can filter by a specific institution (prevents HRO from overriding session filter)
    if (institutionIdFilter && isCSCRole(userRole)) {
      whereClause.institutionId = institutionIdFilter;
      logger.info({ value: institutionIdFilter }, 'CSC role filtering by specific institution');
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

    // Filter by cadre (case-insensitive contains)
    if (cadre) {
      whereClause.cadre = { contains: cadre, mode: 'insensitive' };
    }

    // Filter by current workplace (case-insensitive contains)
    if (currentWorkplace) {
      whereClause.currentWorkplace = { contains: currentWorkplace, mode: 'insensitive' };
    }

    // Filter by ministry (case-insensitive contains)
    if (ministry) {
      whereClause.ministry = { contains: ministry, mode: 'insensitive' };
    }

    // Filter by department (case-insensitive contains)
    if (department) {
      whereClause.department = { contains: department, mode: 'insensitive' };
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

    logger.info(`Found ${employees.length} employees out of ${total} total`);

    // Map EmployeeCertificate to certificates and Institution to institution to match TypeScript interface
    const mappedEmployees = sanitizeEmployees(employees.map((emp) => ({
      ...emp,
      institution: emp.Institution,
      certificates: emp.EmployeeCertificate,
      Institution: undefined,
      EmployeeCertificate: undefined,
    })), userRole);

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
}), 'read'), 'employees');

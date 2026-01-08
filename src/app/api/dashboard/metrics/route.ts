import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ROLES } from '@/lib/constants';
import { shouldApplyInstitutionFilter, isCSCRole } from '@/lib/role-utils';

const getRequestHref = (type: string) => {
  switch (type) {
    case 'Confirmation':
      return '/dashboard/confirmation';
    case 'Promotion':
      return '/dashboard/promotion';
    case 'LWOP':
      return '/dashboard/lwop';
    case 'Complaint':
      return '/dashboard/complaints';
    case 'Retirement':
      return '/dashboard/retirement';
    case 'Resignation':
      return '/dashboard/resignation';
    case 'Service Extension':
      return '/dashboard/service-extension';
    case 'Termination':
    case 'Dismissal':
      return '/dashboard/termination';
    case 'Change of Cadre':
      return '/dashboard/cadre-change';
    default:
      return '/dashboard';
  }
};

// Cache configuration
const CACHE_TTL = 60; // 60 seconds cache

export async function GET(req: Request) {
  try {
    console.log('=== Dashboard metrics API called ===');
    const startTime = Date.now();

    // Get user role and institution for filtering
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    console.log('Dashboard metrics API called with:', {
      userRole,
      userInstitutionId,
    });

    // Determine if institution filtering should be applied
    // Admin sees total system counts (no filtering) for system administration purposes
    // but doesn't have HR oversight permissions (handled separately)
    const shouldFilter =
      userRole === 'Admin'
        ? false
        : shouldApplyInstitutionFilter(userRole, userInstitutionId);
    console.log(
      `Should apply institution filter: ${shouldFilter} (role: ${userRole})`
    );

    // Build where clause for employee-related queries
    const buildEmployeeWhereClause = () => {
      if (shouldFilter && userInstitutionId) {
        return { Employee: { institutionId: userInstitutionId } };
      }
      return {};
    };

    // Build where clause for complaint queries (complainant is User, not Employee)
    const buildComplaintWhereClause = () => {
      if (shouldFilter && userInstitutionId) {
        return {
          User_Complaint_complainantIdToUser: {
            institutionId: userInstitutionId,
          },
        };
      }
      return {};
    };

    // Build where clauses for different entity types
    const employeeWhereClause = buildEmployeeWhereClause();
    const complaintWhereClause = buildComplaintWhereClause();

    // Build where clause for employee-based counts
    const employeeCountWhereClause =
      shouldFilter && userInstitutionId
        ? { institutionId: userInstitutionId }
        : {};

    // Build where clause for requests with employee relation
    const requestEmployeeWhereClause = shouldFilter
      ? { ...employeeWhereClause }
      : {};

    // Build where clause for complaints
    const complaintCountWhereClause = shouldFilter
      ? { ...complaintWhereClause }
      : {};

    console.log('Where clauses:', {
      employeeCountWhereClause,
      requestEmployeeWhereClause,
      complaintCountWhereClause,
    });

    // ===== OPTIMIZATION: Parallelize all count queries using Promise.allSettled =====
    console.log('Starting parallel count queries...');
    const countStartTime = Date.now();

    // Define status arrays for role-specific filtering
    const getConfirmationStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return ['Pending HRMO Review', 'Pending HRMO/HHRMD Review'];
        case 'HHRMD':
          return ['Pending HRMO/HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'PENDING',
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Request Received – Awaiting Commission Decision',
            'UNDER_REVIEW',
          ];
      }
    };

    const getPromotionStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return [
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Draft - Pending Review',
          ];
        case 'HHRMD':
          return ['Pending HRMO/HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'PENDING',
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Request Received – Awaiting Commission Decision',
            'Draft - Pending Review',
            'UNDER_REVIEW',
          ];
      }
    };

    const getTerminationStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return [
            'Pending DO/HHRMD Review',
            'Rejected by HHRMD - Awaiting HRO Correction',
          ];
        case 'HHRMD':
        case 'DO':
          return ['Pending DO/HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'PENDING',
            'Pending DO/HHRMD Review',
            'Request Received – Awaiting Commission Decision',
            'Rejected by HHRMD - Awaiting HRO Correction',
          ];
      }
    };

    const getCadreChangeStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return [
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Rejected by HRMO - Awaiting HRO Correction',
          ];
        case 'HHRMD':
          return ['Pending HRMO/HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Request Received – Awaiting Commission Decision',
            'Rejected by HRMO - Awaiting HRO Correction',
            'UNDER_REVIEW',
          ];
      }
    };

    const getRetirementStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return [
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Rejected by HHRMD - Awaiting HRO Correction',
          ];
        case 'HHRMD':
          return ['Pending HRMO/HHRMD Review', 'Pending HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'PENDING',
            'Pending HRMO Review',
            'Pending HRMO/HHRMD Review',
            'Pending HHRMD Review',
            'Rejected by HHRMD - Awaiting HRO Correction',
            'Request Received – Awaiting Commission Decision',
            'UNDER_REVIEW',
          ];
      }
    };

    const getResignationStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return [
            'Pending HRMO/HHRMD Review',
            'Rejected by HHRMD - Awaiting HRO Action',
          ];
        case 'HHRMD':
          return ['Pending HRMO/HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'Pending HRMO/HHRMD Review',
            'Forwarded to Commission for Acknowledgment',
            'Rejected by HHRMD - Awaiting HRO Action',
            'UNDER_REVIEW',
          ];
      }
    };

    const getServiceExtensionStatuses = (role: string | null) => {
      switch (role) {
        case 'HRO':
          return [
            'Pending HRMO/HHRMD Review',
            'Rejected by HHRMD - Awaiting HRO Correction',
          ];
        case 'HHRMD':
          return ['Pending HRMO/HHRMD Review'];
        case 'CSCS':
        default:
          return [
            'Pending HRMO/HHRMD Review',
            'Request Received – Awaiting Commission Decision',
            'Rejected by HHRMD - Awaiting HRO Correction',
            'UNDER_REVIEW',
          ];
      }
    };

    // Execute all count queries in parallel
    const [
      totalEmployeesResult,
      pendingConfirmationsResult,
      pendingPromotionsResult,
      employeesOnLwopResult,
      pendingTerminationsResult,
      openComplaintsResult,
      pendingCadreChangesResult,
      pendingRetirementsResult,
      pendingResignationsResult,
      pendingServiceExtensionsResult,
    ] = await Promise.allSettled([
      db.employee.count({ where: employeeCountWhereClause }),
      db.confirmationRequest.count({
        where: shouldFilter
          ? {
              status: { in: getConfirmationStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getConfirmationStatuses(userRole) } },
      }),
      db.promotionRequest.count({
        where: shouldFilter
          ? {
              status: { in: getPromotionStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getPromotionStatuses(userRole) } },
      }),
      db.employee.count({
        where: shouldFilter
          ? { status: 'On LWOP', ...employeeCountWhereClause }
          : { status: 'On LWOP' },
      }),
      db.separationRequest.count({
        where: shouldFilter
          ? {
              status: { in: getTerminationStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getTerminationStatuses(userRole) } },
      }),
      db.complaint.count({
        where: shouldFilter
          ? {
              status: {
                notIn: [
                  'Closed - Satisfied',
                  'Resolved - Approved by Commission',
                  'Resolved - Rejected by Commission',
                ],
              },
              ...complaintCountWhereClause,
            }
          : {
              status: {
                notIn: [
                  'Closed - Satisfied',
                  'Resolved - Approved by Commission',
                  'Resolved - Rejected by Commission',
                ],
              },
            },
      }),
      db.cadreChangeRequest.count({
        where: shouldFilter
          ? {
              status: { in: getCadreChangeStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getCadreChangeStatuses(userRole) } },
      }),
      db.retirementRequest.count({
        where: shouldFilter
          ? {
              status: { in: getRetirementStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getRetirementStatuses(userRole) } },
      }),
      db.resignationRequest.count({
        where: shouldFilter
          ? {
              status: { in: getResignationStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getResignationStatuses(userRole) } },
      }),
      db.serviceExtensionRequest.count({
        where: shouldFilter
          ? {
              status: { in: getServiceExtensionStatuses(userRole) },
              ...requestEmployeeWhereClause,
            }
          : { status: { in: getServiceExtensionStatuses(userRole) } },
      }),
    ]);

    // Extract results with fallback to 0 on error
    const totalEmployees =
      totalEmployeesResult.status === 'fulfilled'
        ? totalEmployeesResult.value
        : 0;
    const pendingConfirmations =
      pendingConfirmationsResult.status === 'fulfilled'
        ? pendingConfirmationsResult.value
        : 0;
    const pendingPromotions =
      pendingPromotionsResult.status === 'fulfilled'
        ? pendingPromotionsResult.value
        : 0;
    const employeesOnLwop =
      employeesOnLwopResult.status === 'fulfilled'
        ? employeesOnLwopResult.value
        : 0;
    const pendingTerminations =
      pendingTerminationsResult.status === 'fulfilled'
        ? pendingTerminationsResult.value
        : 0;
    const openComplaints =
      openComplaintsResult.status === 'fulfilled'
        ? openComplaintsResult.value
        : 0;
    const pendingCadreChanges =
      pendingCadreChangesResult.status === 'fulfilled'
        ? pendingCadreChangesResult.value
        : 0;
    const pendingRetirements =
      pendingRetirementsResult.status === 'fulfilled'
        ? pendingRetirementsResult.value
        : 0;
    const pendingResignations =
      pendingResignationsResult.status === 'fulfilled'
        ? pendingResignationsResult.value
        : 0;
    const pendingServiceExtensions =
      pendingServiceExtensionsResult.status === 'fulfilled'
        ? pendingServiceExtensionsResult.value
        : 0;

    console.log(`Count queries completed in ${Date.now() - countStartTime}ms`);

    // ===== OPTIMIZATION: Parallelize recent activities queries =====
    console.log('Starting parallel recent activities queries...');
    const activitiesStartTime = Date.now();
    console.log('Employee where clause:', employeeWhereClause);
    console.log('Complaint where clause:', complaintWhereClause);

    // PAGINATION STRATEGY for multiple tables:
    // True server-side pagination requires UNION query across 9 tables (not supported by Prisma)
    // Hybrid approach: Fetch recent items from each table, merge, sort, then paginate
    // - Fetches last 100 items from each of 9 tables = ~900 total items
    // - Supports pagination of recent activities (last few weeks/months)
    // - For true historical pagination across ALL time, would need raw SQL UNION
    const itemsPerTable = 100; // Fetch last 100 from each table
    console.log(
      `Fetching ${itemsPerTable} recent items per table for pagination`
    );
    const [
      confirmationsResult,
      promotionsResult,
      lwopsResult,
      complaintsResult,
      separationsResult,
      cadreChangesResult,
      retirementsResult,
      resignationsResult,
      serviceExtensionsResult,
    ] = await Promise.allSettled([
      db.confirmationRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.promotionRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.lwopRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.complaint.findMany({
        where: complaintWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          User_Complaint_complainantIdToUser: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.separationRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          type: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.cadreChangeRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.retirementRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.resignationRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
      db.serviceExtensionRequest.findMany({
        where: employeeWhereClause,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          Employee: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: itemsPerTable,
      }),
    ]);

    // Extract results with fallback to empty arrays
    const confirmations =
      confirmationsResult.status === 'fulfilled'
        ? confirmationsResult.value
        : [];
    const promotions =
      promotionsResult.status === 'fulfilled' ? promotionsResult.value : [];
    const lwops = lwopsResult.status === 'fulfilled' ? lwopsResult.value : [];
    const complaints =
      complaintsResult.status === 'fulfilled' ? complaintsResult.value : [];
    const separations =
      separationsResult.status === 'fulfilled' ? separationsResult.value : [];
    const cadreChanges =
      cadreChangesResult.status === 'fulfilled' ? cadreChangesResult.value : [];
    const retirements =
      retirementsResult.status === 'fulfilled' ? retirementsResult.value : [];
    const resignations =
      resignationsResult.status === 'fulfilled' ? resignationsResult.value : [];
    const serviceExtensions =
      serviceExtensionsResult.status === 'fulfilled'
        ? serviceExtensionsResult.value
        : [];

    console.log(
      `Recent activities queries completed in ${Date.now() - activitiesStartTime}ms`
    );

    console.log('Recent activities found:', {
      confirmations: confirmations.length,
      promotions: promotions.length,
      lwops: lwops.length,
      complaints: complaints.length,
      separations: separations.length,
      cadreChanges: cadreChanges.length,
      retirements: retirements.length,
      resignations: resignations.length,
      serviceExtensions: serviceExtensions.length,
    });

    const allActivities = [
      ...confirmations
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'Confirmation',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...promotions
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'Promotion',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...lwops
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'LWOP',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...complaints
        .filter(
          (r) =>
            r.User_Complaint_complainantIdToUser &&
            r.User_Complaint_complainantIdToUser.name
        )
        .map((r) => ({
          id: r.id,
          type: 'Complaint',
          employee: r.User_Complaint_complainantIdToUser.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...separations
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: r.type === 'TERMINATION' ? 'Termination' : 'Dismissal',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...cadreChanges
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'Change of Cadre',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...retirements
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'Retirement',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...resignations
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'Resignation',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
      ...serviceExtensions
        .filter((r) => r.Employee && r.Employee.name)
        .map((r) => ({
          id: r.id,
          type: 'Service Extension',
          employee: r.Employee.name,
          status: r.status,
          updatedAt: r.updatedAt,
        })),
    ];

    // Sort all activities by date
    const sortedActivities = allActivities.sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    // Calculate pagination metadata
    const totalActivities = sortedActivities.length;
    const totalPages = Math.ceil(totalActivities / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Apply pagination
    const recentActivities = sortedActivities
      .slice(skip, skip + limit)
      .map((activity) => ({
        ...activity,
        href: getRequestHref(activity.type),
      }));

    const stats = {
      totalEmployees,
      pendingConfirmations,
      pendingPromotions,
      employeesOnLwop,
      pendingTerminations,
      openComplaints,
      pendingCadreChanges,
      pendingRetirements,
      pendingResignations,
      pendingServiceExtensions,
    };

    console.log('=== Dashboard metrics calculated ===', stats);
    console.log('=== Recent activities count ===', recentActivities.length);
    console.log(`=== Total request time: ${Date.now() - startTime}ms ===`);

    const response = {
      success: true,
      data: {
        stats,
        recentActivities,
        pagination: {
          currentPage: page,
          totalPages,
          totalActivities,
          limit,
          hasNextPage,
          hasPrevPage,
        },
      },
    };

    // ===== OPTIMIZATION: Add caching headers for better performance =====
    const headers = new Headers();
    headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}`
    );
    headers.set('CDN-Cache-Control', `public, s-maxage=${CACHE_TTL}`);
    headers.set('Vercel-CDN-Cache-Control', `public, s-maxage=${CACHE_TTL}`);

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('[DASHBOARD_METRICS_GET]', error);
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

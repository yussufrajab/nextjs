import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ROLES } from '@/lib/constants';
import { shouldApplyInstitutionFilter, isCSCRole, pembaIslandWhere, isHroLike, isHrrpLike } from '@/lib/role-utils';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const getRequestHref = (type: string, id: string) => {
  switch (type) {
    case 'Confirmation':
      return `/dashboard/confirmation?id=${id}`;
    case 'Promotion':
      return `/dashboard/promotion?id=${id}`;
    case 'LWOP':
      return `/dashboard/lwop?id=${id}`;
    case 'Complaint':
      return `/dashboard/complaints?id=${id}`;
    case 'Retirement':
      return `/dashboard/retirement?id=${id}`;
    case 'Resignation':
      return `/dashboard/resignation?id=${id}`;
    case 'Service Extension':
      return `/dashboard/service-extension?id=${id}`;
    case 'Termination':
    case 'Dismissal':
      return `/dashboard/termination?id=${id}`;
    case 'Change of Cadre':
      return `/dashboard/cadre-change?id=${id}`;
    default:
      return '/dashboard';
  }
};

// Cache configuration
const CACHE_TTL = 60; // 60 seconds cache

export const GET = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  logger.info('=== Dashboard metrics API called ===');
  const startTime = Date.now();

  // Get role and institution from verified auth context
  const { searchParams } = new URL(request.url);
  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    logger.info({ 
      userRole,
      userInstitutionId,
     }, 'Dashboard metrics API called with');

    // Determine if institution filtering should be applied
    // Admin sees total system counts (no filtering) for system administration purposes
    // but doesn't have HR oversight permissions (handled separately)
    const shouldFilter =
      userRole === 'Admin'
        ? false
        : shouldApplyInstitutionFilter(userRole, userInstitutionId);
    logger.info(
      `Should apply institution filter: ${shouldFilter} (role: ${userRole})`
    );

    // Build where clause for employee-related queries
    const buildEmployeeWhereClause = () => {
      if (shouldFilter && userInstitutionId) {
        return { Employee: { institutionId: userInstitutionId, ...pembaIslandWhere(userRole) } };
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

    // Complaints are only visible to EMPLOYEE, DO, HHRMD, CSCS — NOT to
    // HRO/HRRP or their Pemba-scoped variants (the proxy blocks /dashboard/
    // complaints for those roles). Exclude complaints entirely from both
    // the count and recent activities when the role cannot access them.
    const canSeeComplaints = !isHroLike(userRole) && !isHrrpLike(userRole) && userRole !== 'HRMO' && userRole !== 'PO';
    // The DO (Disciplinary Officer) role is responsible ONLY for
    // terminations/dismissals and complaints. Every other request type
    // (confirmation, promotion, LWOP, cadre change, retirement, resignation,
    // service extension) is outside her remit, so those counts and recent
    // activities are suppressed for her — her dashboard must reflect only
    // her own work and statistics. The proxy already blocks her from those
    // pages; this keeps the dashboard itself consistent with that.
    const isDisciplineOnly = userRole === 'DO';
    const canSeeConfirmations = !isDisciplineOnly;
    const canSeePromotions = !isDisciplineOnly;
    const canSeeLwop = !isDisciplineOnly;
    const canSeeCadreChanges = !isDisciplineOnly;
    const canSeeRetirements = !isDisciplineOnly;
    const canSeeResignations = !isDisciplineOnly;
    const canSeeServiceExtensions = !isDisciplineOnly;
    // HRMO is responsible for all HR processes EXCEPT
    // terminations/dismissals and complaints (handled by DO). The proxy
    // already blocks her from those pages; mirror that here so the
    // dashboard and metrics reflect only her remit. Complaints are
    // already suppressed for HRMO via canSeeComplaints above.
    const canSeeTerminations = userRole !== 'HRMO';
    const employeeWhereClause = buildEmployeeWhereClause();
    const complaintWhereClause = buildComplaintWhereClause();

    // Build where clause for employee-based counts
    const employeeCountWhereClause =
      shouldFilter && userInstitutionId
        ? { institutionId: userInstitutionId, ...pembaIslandWhere(userRole) }
        : {};

    // Build where clause for requests with employee relation
    const requestEmployeeWhereClause = shouldFilter
      ? { ...employeeWhereClause }
      : {};

    // Build where clause for complaints
    const complaintCountWhereClause = shouldFilter
      ? { ...complaintWhereClause }
      : {};

    logger.info({ 
      employeeCountWhereClause,
      requestEmployeeWhereClause,
      complaintCountWhereClause,
     }, 'Where clauses');

    // ===== OPTIMIZATION: Parallelize all count queries using Promise.allSettled =====
    logger.info('Starting parallel count queries...');
    const countStartTime = Date.now();

    // Define status arrays for role-specific filtering
    // NOTE: Every request module now uses the HRRP-based workflow with the
    // canonical statuses below. These arrays were previously hard-coded with
    // the OLD HRMO/HHRMD/DO review statuses (e.g. 'Pending HRMO Review',
    // 'Pending DO/HHRMD Review'), which no longer exist in the DB after the
    // security rework — so the dashboard counts silently returned 0. Keep
    // these aligned with the modules' VALID_STATUSES.
    // HRO/HRRP (and their Pemba-scoped variants) see only their own stage
    // (pending HRRP review or rejected-back). CSCS and other commission
    // roles also see items already approved by HRRP awaiting their review.
    const HRO_HRRP_STATUSES = [
      'Pending HRRP Review',
      'Rejected by HRRP - Awaiting HRO Correction',
    ];
    const CSC_STATUSES = [
      'Pending HRRP Review',
      'Approved by HRRP - Awaiting Commission Review',
      'Rejected by HRRP - Awaiting HRO Correction',
    ];
    const getStatusesForRole = (role: string | null): string[] =>
      isHroLike(role) || isHrrpLike(role) ? HRO_HRRP_STATUSES : CSC_STATUSES;

    const getConfirmationStatuses = getStatusesForRole;
    const getPromotionStatuses = getStatusesForRole;
    const getTerminationStatuses = getStatusesForRole;
    const getCadreChangeStatuses = getStatusesForRole;
    const getRetirementStatuses = getStatusesForRole;
    const getResignationStatuses = getStatusesForRole;
    const getServiceExtensionStatuses = getStatusesForRole;

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
      canSeeConfirmations
        ? db.confirmationRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getConfirmationStatuses(userRole) },
                  ...requestEmployeeWhereClause,
                }
              : { status: { in: getConfirmationStatuses(userRole) } },
          })
        : Promise.resolve(0),
      canSeePromotions
        ? db.promotionRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getPromotionStatuses(userRole) },
                  ...requestEmployeeWhereClause,
                }
              : { status: { in: getPromotionStatuses(userRole) } },
          })
        : Promise.resolve(0),
      canSeeLwop
        ? db.employee.count({
            where: shouldFilter
              ? { status: 'On LWOP', ...employeeCountWhereClause }
              : { status: 'On LWOP' },
          })
        : Promise.resolve(0),
      canSeeTerminations
        ? db.separationRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getTerminationStatuses(userRole) },
                }
              : { status: { in: getTerminationStatuses(userRole) } },
          })
        : Promise.resolve(0),
      canSeeComplaints
        ? db.complaint.count({
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
          })
        : Promise.resolve(0),
      canSeeCadreChanges
        ? db.cadreChangeRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getCadreChangeStatuses(userRole) },
                  ...requestEmployeeWhereClause,
                }
              : { status: { in: getCadreChangeStatuses(userRole) } },
          })
        : Promise.resolve(0),
      canSeeRetirements
        ? db.retirementRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getRetirementStatuses(userRole) },
                  ...requestEmployeeWhereClause,
                }
              : { status: { in: getRetirementStatuses(userRole) } },
          })
        : Promise.resolve(0),
      canSeeResignations
        ? db.resignationRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getResignationStatuses(userRole) },
                  ...requestEmployeeWhereClause,
                }
              : { status: { in: getResignationStatuses(userRole) } },
          })
        : Promise.resolve(0),
      canSeeServiceExtensions
        ? db.serviceExtensionRequest.count({
            where: shouldFilter
              ? {
                  status: { in: getServiceExtensionStatuses(userRole) },
                  ...requestEmployeeWhereClause,
                }
              : { status: { in: getServiceExtensionStatuses(userRole) } },
          })
        : Promise.resolve(0),
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

    logger.info(`Count queries completed in ${Date.now() - countStartTime}ms`);

    // ===== OPTIMIZATION: Parallelize recent activities queries =====
    logger.info('Starting parallel recent activities queries...');
    const activitiesStartTime = Date.now();
    logger.info({ value: employeeWhereClause }, 'Employee where clause');
    logger.info({ value: complaintWhereClause }, 'Complaint where clause');

    // PAGINATION STRATEGY for multiple tables:
    // True server-side pagination requires UNION query across 9 tables (not supported by Prisma)
    // Hybrid approach: Fetch recent items from each table, merge, sort, then paginate
    // - Fetches last 100 items from each of 9 tables = ~900 total items
    // - Supports pagination of recent activities (last few weeks/months)
    // - For true historical pagination across ALL time, would need raw SQL UNION
    const itemsPerTable = 100; // Fetch last 100 from each table
    logger.info(
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
      canSeeConfirmations
        ? db.confirmationRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeePromotions
        ? db.promotionRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeeLwop
        ? db.lwopRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeeComplaints
        ? db.complaint.findMany({
            where: complaintWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              User_Complaint_complainantIdToUser: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeeTerminations
        ? db.separationRequest.findMany({
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
          })
        : Promise.resolve([]),
      canSeeCadreChanges
        ? db.cadreChangeRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeeRetirements
        ? db.retirementRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeeResignations
        ? db.resignationRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
      canSeeServiceExtensions
        ? db.serviceExtensionRequest.findMany({
            where: employeeWhereClause,
            select: {
              id: true,
              status: true,
              updatedAt: true,
              Employee: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take: itemsPerTable,
          })
        : Promise.resolve([]),
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

    logger.info(
      `Recent activities queries completed in ${Date.now() - activitiesStartTime}ms`
    );

    logger.info({ 
      confirmations: confirmations.length,
      promotions: promotions.length,
      lwops: lwops.length,
      complaints: complaints.length,
      separations: separations.length,
      cadreChanges: cadreChanges.length,
      retirements: retirements.length,
      resignations: resignations.length,
      serviceExtensions: serviceExtensions.length,
     }, 'Recent activities found');

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
        href: getRequestHref(activity.type, activity.id),
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

    logger.info(stats, '=== Dashboard metrics calculated ===');
    logger.info(`=== Recent activities count: ${recentActivities.length} ===`);
    logger.info(`=== Total request time: ${Date.now() - startTime}ms ===`);

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
}), 'read'), 'dashboard-metrics');

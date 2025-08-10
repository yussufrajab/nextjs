import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ROLES } from '@/lib/constants';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

const getRequestHref = (type: string) => {
    switch (type) {
        case 'Confirmation': return '/dashboard/confirmation';
        case 'Promotion': return '/dashboard/promotion';
        case 'LWOP': return '/dashboard/lwop';
        case 'Complaint': return '/dashboard/complaints';
        case 'Retirement': return '/dashboard/retirement';
        case 'Resignation': return '/dashboard/resignation';
        case 'Service Extension': return '/dashboard/service-extension';
        case 'Termination':
        case 'Dismissal':
            return '/dashboard/termination';
        case 'Change of Cadre': return '/dashboard/cadre-change';
        default: return '/dashboard';
    }
}

export async function GET(req: Request) {
  try {
    console.log('=== Dashboard metrics API called ===');
    
    // Get user role and institution for filtering
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');
    
    console.log('Dashboard metrics API called with:', { userRole, userInstitutionId });
    
    // Determine if institution filtering should be applied
    const shouldFilter = shouldApplyInstitutionFilter(userRole, userInstitutionId);
    console.log(`Should apply institution filter: ${shouldFilter}`);
    
    // Build where clause for employee-related queries
    const buildEmployeeWhereClause = () => {
      if (shouldFilter) {
        return { employee: { institutionId: userInstitutionId } };
      }
      return {};
    };
    
    // Build where clause for complaint queries (complainant is User, not Employee)
    const buildComplaintWhereClause = () => {
      if (shouldFilter) {
        return { complainant: { institutionId: userInstitutionId } };
      }
      return {};
    };
    
    // Build where clauses for different entity types
    const employeeWhereClause = buildEmployeeWhereClause();
    const complaintWhereClause = buildComplaintWhereClause();
    
    // Build where clause for employee-based counts
    const employeeCountWhereClause = shouldFilter ? { institutionId: userInstitutionId } : {};
    
    // Build where clause for requests with employee relation
    const requestEmployeeWhereClause = shouldFilter ? 
      { ...employeeWhereClause } : {};
      
    // Build where clause for complaints
    const complaintCountWhereClause = shouldFilter ? 
      { ...complaintWhereClause } : {};
    
    console.log('Where clauses:', { 
      employeeCountWhereClause, 
      requestEmployeeWhereClause, 
      complaintCountWhereClause 
    });
    
    let totalEmployees, pendingConfirmations, pendingPromotions, employeesOnLwop, pendingTerminations, openComplaints, pendingCadreChanges, pendingRetirements, pendingResignations, pendingServiceExtensions;
    
    try {
      totalEmployees = await db.employee.count({ where: employeeCountWhereClause });
      console.log('Total employees:', totalEmployees);
    } catch (err) {
      console.error('Error counting employees:', err);
      totalEmployees = 0;
    }
    
    try {
      const confirmationWhere = shouldFilter ? 
        { status: 'Pending', ...requestEmployeeWhereClause } : 
        { status: 'Pending' };
      pendingConfirmations = await db.confirmationRequest.count({ where: confirmationWhere });
      console.log('Pending confirmations:', pendingConfirmations);
    } catch (err) {
      console.error('Error counting pending confirmations:', err);
      pendingConfirmations = 0;
    }
    
    try {
      const promotionWhere = shouldFilter ? 
        { status: 'Pending', ...requestEmployeeWhereClause } : 
        { status: 'Pending' };
      pendingPromotions = await db.promotionRequest.count({ where: promotionWhere });
      console.log('Pending promotions:', pendingPromotions);
    } catch (err) {
      console.error('Error counting pending promotions:', err);
      pendingPromotions = 0;
    }
    
    try {
      const lwopWhere = shouldFilter ? 
        { status: 'On LWOP', ...employeeCountWhereClause } : 
        { status: 'On LWOP' };
      employeesOnLwop = await db.employee.count({ where: lwopWhere });
      console.log('Employees on LWOP:', employeesOnLwop);
    } catch (err) {
      console.error('Error counting employees on LWOP:', err);
      employeesOnLwop = 0;
    }
    
    try {
      const terminationWhere = shouldFilter ? 
        { status: 'Pending', ...requestEmployeeWhereClause } : 
        { status: 'Pending' };
      pendingTerminations = await db.separationRequest.count({ where: terminationWhere });
      console.log('Pending terminations:', pendingTerminations);
    } catch (err) {
      console.error('Error counting pending terminations:', err);
      pendingTerminations = 0;
    }
    
    try {
      const complaintWhere = shouldFilter ? 
        { 
          status: { notIn: ["Closed - Satisfied", "Resolved - Approved by Commission", "Resolved - Rejected by Commission"] },
          ...complaintCountWhereClause 
        } : 
        { status: { notIn: ["Closed - Satisfied", "Resolved - Approved by Commission", "Resolved - Rejected by Commission"] } };
      openComplaints = await db.complaint.count({ where: complaintWhere });
      console.log('Open complaints:', openComplaints);
    } catch (err) {
      console.error('Error counting open complaints:', err);
      openComplaints = 0;
    }

    try {
      const cadreChangeWhere = shouldFilter ? 
        { 
          status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] },
          ...requestEmployeeWhereClause 
        } : 
        { status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] } };
      pendingCadreChanges = await db.cadreChangeRequest.count({ where: cadreChangeWhere });
      console.log('Pending cadre changes:', pendingCadreChanges);
    } catch (err) {
      console.error('Error counting pending cadre changes:', err);
      pendingCadreChanges = 0;
    }

    try {
      const retirementWhere = shouldFilter ? 
        { 
          status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] },
          ...requestEmployeeWhereClause 
        } : 
        { status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] } };
      pendingRetirements = await db.retirementRequest.count({ where: retirementWhere });
      console.log('Pending retirements:', pendingRetirements);
    } catch (err) {
      console.error('Error counting pending retirements:', err);
      pendingRetirements = 0;
    }

    try {
      const resignationWhere = shouldFilter ? 
        { 
          status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] },
          ...requestEmployeeWhereClause 
        } : 
        { status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] } };
      pendingResignations = await db.resignationRequest.count({ where: resignationWhere });
      console.log('Pending resignations:', pendingResignations);
    } catch (err) {
      console.error('Error counting pending resignations:', err);
      pendingResignations = 0;
    }

    try {
      const serviceExtensionWhere = shouldFilter ? 
        { 
          status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] },
          ...requestEmployeeWhereClause 
        } : 
        { status: { notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] } };
      pendingServiceExtensions = await db.serviceExtensionRequest.count({ where: serviceExtensionWhere });
      console.log('Pending service extensions:', pendingServiceExtensions);
    } catch (err) {
      console.error('Error counting pending service extensions:', err);
      pendingServiceExtensions = 0;
    }

    // Fetch recent activities (with institution filtering and safe error handling)
    console.log('Employee where clause:', employeeWhereClause);
    console.log('Complaint where clause:', complaintWhereClause);
    
    const confirmations = await db.confirmationRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const promotions = await db.promotionRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const lwops = await db.lwopRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const complaints = await db.complaint.findMany({ 
      where: complaintWhereClause,
      include: { complainant: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const separations = await db.separationRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const cadreChanges = await db.cadreChangeRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const retirements = await db.retirementRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const resignations = await db.resignationRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    const serviceExtensions = await db.serviceExtensionRequest.findMany({ 
      where: employeeWhereClause,
      include: { employee: { select: { name: true, institutionId: true } } }, 
      orderBy: { updatedAt: 'desc' }, 
      take: 10 
    }).catch(() => []);
    
    console.log('Recent activities found:', {
      confirmations: confirmations.length,
      promotions: promotions.length,
      lwops: lwops.length,
      complaints: complaints.length,
      separations: separations.length,
      cadreChanges: cadreChanges.length,
      retirements: retirements.length,
      resignations: resignations.length,
      serviceExtensions: serviceExtensions.length
    });
    
    const allActivities = [
      ...confirmations.map(r => ({ id: r.id, type: 'Confirmation', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...promotions.map(r => ({ id: r.id, type: 'Promotion', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...lwops.map(r => ({ id: r.id, type: 'LWOP', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...complaints.map(r => ({ id: r.id, type: 'Complaint', employee: r.complainant.name, status: r.status, updatedAt: r.updatedAt })),
      ...separations.map(r => ({ id: r.id, type: r.type === 'TERMINATION' ? 'Termination' : 'Dismissal', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...cadreChanges.map(r => ({ id: r.id, type: 'Change of Cadre', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...retirements.map(r => ({ id: r.id, type: 'Retirement', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...resignations.map(r => ({ id: r.id, type: 'Resignation', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
      ...serviceExtensions.map(r => ({ id: r.id, type: 'Service Extension', employee: r.employee.name, status: r.status, updatedAt: r.updatedAt })),
    ];
    
    const recentActivities = allActivities
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10)
      .map(activity => ({
          ...activity,
          href: getRequestHref(activity.type)
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
    
    const response = { 
      success: true, 
      data: { stats, recentActivities } 
    };
    
    console.log('=== Final API response ===', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("[DASHBOARD_METRICS_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
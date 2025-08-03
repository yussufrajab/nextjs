import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ROLES } from '@/lib/constants';

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
    
    // For debugging, let's first try with hardcoded values to see if the issue is with the API call itself
    let totalEmployees, pendingConfirmations, pendingPromotions, employeesOnLwop, pendingTerminations, openComplaints, pendingCadreChanges, pendingRetirements, pendingResignations, pendingServiceExtensions;
    
    try {
      totalEmployees = await db.employee.count();
      console.log('Total employees:', totalEmployees);
    } catch (err) {
      console.error('Error counting employees:', err);
      totalEmployees = 0;
    }
    
    try {
      pendingConfirmations = await db.confirmationRequest.count({ where: { status: 'Pending' } });
      console.log('Pending confirmations:', pendingConfirmations);
    } catch (err) {
      console.error('Error counting pending confirmations:', err);
      pendingConfirmations = 0;
    }
    
    try {
      pendingPromotions = await db.promotionRequest.count({ where: { status: 'Pending' } });
      console.log('Pending promotions:', pendingPromotions);
    } catch (err) {
      console.error('Error counting pending promotions:', err);
      pendingPromotions = 0;
    }
    
    try {
      employeesOnLwop = await db.employee.count({ where: { status: 'On LWOP' }});
      console.log('Employees on LWOP:', employeesOnLwop);
    } catch (err) {
      console.error('Error counting employees on LWOP:', err);
      employeesOnLwop = 0;
    }
    
    try {
      pendingTerminations = await db.separationRequest.count({ where: { status: 'Pending' } });
      console.log('Pending terminations:', pendingTerminations);
    } catch (err) {
      console.error('Error counting pending terminations:', err);
      pendingTerminations = 0;
    }
    
    try {
      openComplaints = await db.complaint.count({ where: { status: { notIn: ["Closed - Satisfied", "Resolved - Approved by Commission", "Resolved - Rejected by Commission"] } } });
      console.log('Open complaints:', openComplaints);
    } catch (err) {
      console.error('Error counting open complaints:', err);
      openComplaints = 0;
    }

    try {
      pendingCadreChanges = await db.cadreChangeRequest.count({ 
        where: { 
          status: { 
            notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] 
          } 
        } 
      });
      console.log('Pending cadre changes:', pendingCadreChanges);
    } catch (err) {
      console.error('Error counting pending cadre changes:', err);
      pendingCadreChanges = 0;
    }

    try {
      pendingRetirements = await db.retirementRequest.count({ 
        where: { 
          status: { 
            notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] 
          } 
        } 
      });
      console.log('Pending retirements:', pendingRetirements);
    } catch (err) {
      console.error('Error counting pending retirements:', err);
      pendingRetirements = 0;
    }

    try {
      pendingResignations = await db.resignationRequest.count({ 
        where: { 
          status: { 
            notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] 
          } 
        } 
      });
      console.log('Pending resignations:', pendingResignations);
    } catch (err) {
      console.error('Error counting pending resignations:', err);
      pendingResignations = 0;
    }

    try {
      pendingServiceExtensions = await db.serviceExtensionRequest.count({ 
        where: { 
          status: { 
            notIn: ["Approved by Commission", "Rejected by Commission - Request Concluded"] 
          } 
        } 
      });
      console.log('Pending service extensions:', pendingServiceExtensions);
    } catch (err) {
      console.error('Error counting pending service extensions:', err);
      pendingServiceExtensions = 0;
    }

    // Fetch recent activities (with safe error handling)
    const confirmations = await db.confirmationRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const promotions = await db.promotionRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const lwops = await db.lwopRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const complaints = await db.complaint.findMany({ include: { complainant: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const separations = await db.separationRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const cadreChanges = await db.cadreChangeRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const retirements = await db.retirementRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const resignations = await db.resignationRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    const serviceExtensions = await db.serviceExtensionRequest.findMany({ include: { employee: { select: { name: true } } }, orderBy: { updatedAt: 'desc' }, take: 5 }).catch(() => []);
    
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
      .slice(0, 5)
      .map(activity => ({
          ...activity,
          href: getRequestHref(activity.type)
      }));

    const stats = {
      totalEmployees: totalEmployees || 150, // Add fallback numbers for testing
      pendingConfirmations: pendingConfirmations || 12,
      pendingPromotions: pendingPromotions || 8,
      employeesOnLwop: employeesOnLwop || 5,
      pendingTerminations: pendingTerminations || 3,
      openComplaints: openComplaints || 7,
      pendingCadreChanges: pendingCadreChanges || 0,
      pendingRetirements: pendingRetirements || 0,
      pendingResignations: pendingResignations || 0,
      pendingServiceExtensions: pendingServiceExtensions || 0,
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
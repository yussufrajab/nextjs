import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const institutionName = searchParams.get('institutionName');
    const requestType = searchParams.get('requestType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('Track requests API called with:', { institutionName, requestType, status, page, limit });

    // Build where clause for institution filtering
    let institutionFilter: any = {};
    if (institutionName) {
      institutionFilter = {
        employee: {
          institution: {
            name: {
              contains: institutionName,
              mode: 'insensitive'
            }
          }
        }
      };
    }

    // Build status filter
    let statusFilter: any = {};
    if (status) {
      statusFilter.status = status;
    }

    // Combine filters
    const whereClause = {
      ...institutionFilter,
      ...statusFilter
    };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // If no specific request type is provided, get all types
    const allRequests = [];

    // Get promotion requests
    if (!requestType || requestType === 'promotion') {
      const promotionRequests = await db.promotionRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...promotionRequests.map(req => ({ ...req, requestType: 'Promotion' })));
    }

    // Get confirmation requests
    if (!requestType || requestType === 'confirmation') {
      const confirmationRequests = await db.confirmationRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...confirmationRequests.map(req => ({ ...req, requestType: 'Confirmation' })));
    }

    // Get LWOP requests
    if (!requestType || requestType === 'lwop') {
      const lwopRequests = await db.lwopRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...lwopRequests.map(req => ({ ...req, requestType: 'LWOP' })));
    }

    // Get cadre change requests
    if (!requestType || requestType === 'cadre-change') {
      const cadreChangeRequests = await db.cadreChangeRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...cadreChangeRequests.map(req => ({ ...req, requestType: 'Cadre Change' })));
    }

    // Get retirement requests
    if (!requestType || requestType === 'retirement') {
      const retirementRequests = await db.retirementRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...retirementRequests.map(req => ({ ...req, requestType: 'Retirement' })));
    }

    // Get resignation requests
    if (!requestType || requestType === 'resignation') {
      const resignationRequests = await db.resignationRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...resignationRequests.map(req => ({ ...req, requestType: 'Resignation' })));
    }

    // Get service extension requests
    if (!requestType || requestType === 'service-extension') {
      const serviceExtensionRequests = await db.serviceExtensionRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...serviceExtensionRequests.map(req => ({ ...req, requestType: 'Service Extension' })));
    }

    // Get separation requests (termination)
    if (!requestType || requestType === 'termination') {
      const separationRequests = await db.separationRequest.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              institution: { select: { id: true, name: true } }
            }
          },
          submittedBy: { select: { id: true, name: true, username: true } },
          reviewedBy: { select: { id: true, name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      
      allRequests.push(...separationRequests.map(req => ({ ...req, requestType: 'Termination' })));
    }

    // Sort all requests by creation date (most recent first)
    allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Map to TrackedRequest format
    const mappedRequests = allRequests.map(req => ({
      id: req.id,
      employeeName: req.employee?.name || 'Unknown',
      zanId: req.employee?.zanId || 'Unknown',
      requestType: req.requestType,
      submissionDate: req.createdAt,
      status: req.status || 'Unknown',
      lastUpdatedDate: req.updatedAt || req.createdAt,
      currentStage: req.reviewStage || 'Initial Review',
      employeeInstitution: req.employee?.institution?.name,
      gender: 'N/A', // This would need to be added to employee model
      rejectionReason: req.rejectionReason
    }));

    // Apply pagination
    const paginatedRequests = mappedRequests.slice(skip, skip + limit);
    const totalCount = mappedRequests.length;

    return NextResponse.json({
      success: true,
      data: paginatedRequests,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error("[TRACK_REQUESTS_GET]", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
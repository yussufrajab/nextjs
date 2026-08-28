import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter, pembaIslandWhere } from '@/lib/role-utils';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { verifyAuth } from '@/lib/api-auth';

const employeeSelect = {
  id: true,
  name: true,
  zanId: true,
  gender: true,
  Institution: { select: { id: true, name: true } },
} as const;

const userSelect = {
  select: { id: true, name: true, username: true },
} as const;

const requestInclude = (submittedRelation: string, reviewedRelation: string) =>
  ({
    Employee: { select: employeeSelect },
    [submittedRelation]: userSelect,
    [reviewedRelation]: userSelect,
  }) as any;

const REQUEST_TYPES = [
  {
    key: 'promotion',
    model: db.promotionRequest,
    submittedRelation: 'User_PromotionRequest_submittedByIdToUser',
    reviewedRelation: 'User_PromotionRequest_reviewedByIdToUser',
    label: 'Promotion',
  },
  {
    key: 'confirmation',
    model: db.confirmationRequest,
    submittedRelation: 'User_ConfirmationRequest_submittedByIdToUser',
    reviewedRelation: 'User_ConfirmationRequest_reviewedByIdToUser',
    label: 'Confirmation',
  },
  {
    key: 'lwop',
    model: db.lwopRequest,
    submittedRelation: 'User_LwopRequest_submittedByIdToUser',
    reviewedRelation: 'User_LwopRequest_reviewedByIdToUser',
    label: 'LWOP',
  },
  {
    key: 'cadre-change',
    model: db.cadreChangeRequest,
    submittedRelation: 'User_CadreChangeRequest_submittedByIdToUser',
    reviewedRelation: 'User_CadreChangeRequest_reviewedByIdToUser',
    label: 'Cadre Change',
  },
  {
    key: 'retirement',
    model: db.retirementRequest,
    submittedRelation: 'User_RetirementRequest_submittedByIdToUser',
    reviewedRelation: 'User_RetirementRequest_reviewedByIdToUser',
    label: 'Retirement',
  },
  {
    key: 'resignation',
    model: db.resignationRequest,
    submittedRelation: 'User_ResignationRequest_submittedByIdToUser',
    reviewedRelation: 'User_ResignationRequest_reviewedByIdToUser',
    label: 'Resignation',
  },
  {
    key: 'service-extension',
    model: db.serviceExtensionRequest,
    submittedRelation: 'User_ServiceExtensionRequest_submittedByIdToUser',
    reviewedRelation: 'User_ServiceExtensionRequest_reviewedByIdToUser',
    label: 'Service Extension',
  },
  {
    key: 'termination',
    model: db.separationRequest,
    submittedRelation: 'User_SeparationRequest_submittedByIdToUser',
    reviewedRelation: 'User_SeparationRequest_reviewedByIdToUser',
    label: 'Termination',
  },
] as const;

export const GET = wrapHandler(async (req: Request) => {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const auth = authResult.context!;

    const { searchParams } = new URL(req.url);
    const institutionName = searchParams.get('institutionName');
    const requestType = searchParams.get('requestType');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    logger.info(
      { institutionName, requestType, status, page, limit },
      'Track requests API called with'
    );

    // SECURITY: Apply institution filtering based on role
    let institutionFilter: any = {};
    if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
      institutionFilter = {
        Employee: {
          institutionId: auth.institutionId,
          ...pembaIslandWhere(auth.role),
        },
      };
    } else if (institutionName) {
      // CSC roles can optionally filter by institution name
      institutionFilter = {
        Employee: {
          Institution: {
            name: { contains: institutionName, mode: 'insensitive' },
          },
        },
      };
    }

    const statusFilter: any = {};
    if (status) {
      statusFilter.status = status;
    }

    const whereClause = { ...institutionFilter, ...statusFilter };
    const skip = (page - 1) * limit;

    // Determine which request types to query
    const typesToQuery = REQUEST_TYPES.filter(
      (t) => !requestType || t.key === requestType
    );

    // Parallelize all queries with database-level pagination
    const results = await Promise.allSettled(
      typesToQuery.map(({ model, submittedRelation, reviewedRelation }) =>
        (model as any).findMany({
          where: whereClause,
          include: requestInclude(submittedRelation, reviewedRelation),
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip,
        })
      )
    );

    // Collect results with their labels
    const allRequests: any[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const label = typesToQuery[i].label;
        allRequests.push(
          ...result.value.map((req: any) => ({ ...req, requestType: label }))
        );
      }
    });

    // Sort merged results by creation date (most recent first)
    allRequests.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Slice to requested limit after merge (each table returned up to `limit` rows)
    const paginatedRequests = allRequests.slice(0, limit).map((req) => ({
      id: req.id,
      employeeName: req.Employee?.name || 'Unknown',
      zanId: req.Employee?.zanId || 'Unknown',
      requestType: req.requestType,
      submissionDate: req.createdAt,
      status: req.status || 'Unknown',
      lastUpdatedDate: req.updatedAt || req.createdAt,
      currentStage: req.reviewStage || 'Initial Review',
      employeeInstitution: req.Employee?.Institution?.name,
      gender: req.Employee?.gender || 'N/A',
      rejectionReason: req.rejectionReason,
    }));

    return NextResponse.json({
      success: true,
      data: paginatedRequests,
      pagination: {
        page,
        limit,
        total: paginatedRequests.length,
        totalPages: Math.ceil(paginatedRequests.length / limit) || 1,
      },
    });
  });

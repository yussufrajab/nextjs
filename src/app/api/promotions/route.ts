import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import {
  createNotificationForRole,
  NotificationTemplates,
} from '@/lib/notifications';
import { ROLES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';

// Cache configuration for promotion requests
const CACHE_TTL = 30; // 30 seconds cache (request status changes frequently)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    console.log('Promotions API called with:', {
      userId,
      userRole,
      userInstitutionId,
    });

    // Build where clause based on user role and institution
    const whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      console.log(
        `Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`
      );
      whereClause.Employee = {
        institutionId: userInstitutionId,
      };
    } else {
      console.log(
        `Role ${userRole} is a CSC role - showing all promotion data across institutions`
      );
    }

    const promotionRequests = await db.promotionRequest
      .findMany({
        where: whereClause,
        include: {
          Employee: {
            select: {
              id: true,
              name: true,
              zanId: true,
              payrollNumber: true,
              zssfNumber: true,
              department: true,
              cadre: true,
              dateOfBirth: true,
              employmentDate: true,
              Institution: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          User_PromotionRequest_submittedByIdToUser: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          User_PromotionRequest_reviewedByIdToUser: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      .catch(() => []);

    console.log(`Found ${promotionRequests.length} promotion requests`);

    // Transform the data to match frontend expectations
    const transformedRequests = promotionRequests.map((req: any) => ({
      ...req,
      submittedBy: req.User_PromotionRequest_submittedByIdToUser,
      reviewedBy: req.User_PromotionRequest_reviewedByIdToUser,
      User_PromotionRequest_submittedByIdToUser: undefined,
      User_PromotionRequest_reviewedByIdToUser: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: transformedRequests,
    });
  } catch (error) {
    console.error('[PROMOTIONS_GET]', error);
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating promotion request:', body);

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.promotionType) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, submittedById, promotionType',
        },
        { status: 400 }
      );
    }

    // For experience-based promotions, proposedCadre is required
    if (body.promotionType === 'Experience' && !body.proposedCadre) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required field for experience-based promotion: proposedCadre',
        },
        { status: 400 }
      );
    }

    // Get employee details to check status
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, name: true, status: true },
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

    // Validate employee status for promotion request
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'promotion'
    );
    if (!statusValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: statusValidation.message,
        },
        { status: 403 }
      );
    }

    const promotionRequest = await db.promotionRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        promotionType: body.promotionType,
        proposedCadre: body.proposedCadre || '', // Default to empty string for education-based promotions
        studiedOutsideCountry: body.studiedOutsideCountry || false,
        status: 'Pending HRMO/HHRMD Review',
        reviewStage: 'initial',
        documents: body.documents || [],
        commissionDecisionReason: body.commissionDecisionReason || null,
        updatedAt: new Date(),
      },
      include: {
        Employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            payrollNumber: true,
            zssfNumber: true,
            department: true,
            cadre: true,
            dateOfBirth: true,
            employmentDate: true,
            Institution: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        User_PromotionRequest_submittedByIdToUser: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    console.log('Created promotion request:', promotionRequest.id);

    // Create notification for supervisors/HHRMD
    const notification = NotificationTemplates.promotionSubmitted(
      promotionRequest.Employee.name,
      promotionRequest.id
    );

    await createNotificationForRole(
      ROLES.HHRMD || 'HHRMD',
      notification.message,
      notification.link
    );
    await createNotificationForRole(
      ROLES.DO || 'DO',
      notification.message,
      notification.link
    );

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...promotionRequest,
      submittedBy: (promotionRequest as any)
        .User_PromotionRequest_submittedByIdToUser,
      User_PromotionRequest_submittedByIdToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
  } catch (error) {
    console.error('[PROMOTIONS_POST]', error);
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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    console.log('🔵 PATCH /api/promotions called with:', { id, updateData });

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Request ID is required',
        },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const userAgent = headers.get('user-agent');

    const updatedRequest = await db.promotionRequest.update({
      where: { id },
      data: updateData,
      include: {
        Employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            payrollNumber: true,
            zssfNumber: true,
            department: true,
            cadre: true,
            dateOfBirth: true,
            employmentDate: true,
            Institution: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        User_PromotionRequest_submittedByIdToUser: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        User_PromotionRequest_reviewedByIdToUser: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    // If promotion request is approved by Commission, update employee cadre
    if (
      updateData.status === 'Approved by Commission' &&
      updatedRequest.Employee
    ) {
      await db.employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { cadre: updatedRequest.proposedCadre },
      });
      console.log(
        `Employee ${updatedRequest.Employee.name} cadre updated to "${updatedRequest.proposedCadre}" after promotion approval`
      );
    }

    // Log audit event for approvals and rejections
    if (updateData.reviewedById && updateData.status) {
      const reviewer = await db.user.findUnique({
        where: { id: updateData.reviewedById },
        select: { username: true, role: true },
      });

      if (reviewer) {
        // Check if status contains "Approved" or "Rejected" (case-insensitive)
        const statusLower = updateData.status.toLowerCase();
        const isApproval =
          statusLower.includes('approved') && !statusLower.includes('rejected');
        const isRejection = statusLower.includes('rejected');

        console.log('[AUDIT] Promotion status update:', {
          status: updateData.status,
          isApproval,
          isRejection,
          reviewedById: updateData.reviewedById,
          reviewer: reviewer.username,
        });

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Promotion',
            requestId: id,
            employeeId: updatedRequest.employeeId,
            employeeName: updatedRequest.Employee?.name,
            employeeZanId: updatedRequest.Employee?.zanId,
            approvedById: updateData.reviewedById,
            approvedByUsername: reviewer.username,
            approvedByRole: reviewer.role || 'Unknown',
            reviewStage: updateData.reviewStage,
            ipAddress,
            userAgent,
            additionalData: {
              proposedCadre: updatedRequest.proposedCadre,
              currentCadre: updatedRequest.Employee?.cadre,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'Promotion',
            requestId: id,
            employeeId: updatedRequest.employeeId,
            employeeName: updatedRequest.Employee?.name,
            employeeZanId: updatedRequest.Employee?.zanId,
            rejectedById: updateData.reviewedById,
            rejectedByUsername: reviewer.username,
            rejectedByRole: reviewer.role || 'Unknown',
            rejectionReason:
              updateData.rejectionReason || updateData.commissionDecisionReason,
            reviewStage: updateData.reviewStage,
            ipAddress,
            userAgent,
            additionalData: {
              proposedCadre: updatedRequest.proposedCadre,
              currentCadre: updatedRequest.Employee?.cadre,
            },
          });
        }
      }
    }

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any)
        .User_PromotionRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any)
        .User_PromotionRequest_reviewedByIdToUser,
      User_PromotionRequest_submittedByIdToUser: undefined,
      User_PromotionRequest_reviewedByIdToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
  } catch (error) {
    console.error('[PROMOTIONS_PATCH]', error);
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

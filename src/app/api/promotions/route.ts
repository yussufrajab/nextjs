import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import {
  createNotification,
  createNotificationForRole,
  NotificationTemplates,
} from '@/lib/notifications';
import { ROLES } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestSubmission,
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';
import { sendRequestSubmissionEmails, sendRequestStatusUpdateEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

// Cache configuration for promotion requests
const CACHE_TTL = 30; // 30 seconds cache (request status changes frequently)

// Role-based authorization helper
function checkRoleAuthorization(
  userRole: string | null,
  allowedRoles: readonly string[]
): { authorized: boolean; message?: string } {
  if (!userRole) {
    return { authorized: false, message: 'User role is required' };
  }

  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      message: `Unauthorized: ${userRole} cannot perform this action. Allowed roles: ${allowedRoles.join(', ')}`,
    };
  }

  return { authorized: true };
}

export const GET = wrapHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const userRole = searchParams.get('userRole');
  const userInstitutionId = searchParams.get('userInstitutionId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = parseInt(searchParams.get('size') || '50', 10);
  const status = searchParams.get('status') || 'all';

  logger.info({
    userId,
    userRole,
    userInstitutionId,
    page,
    size,
    status,
   }, 'Promotions API called with');

  // Build where clause based on user role and institution
  const whereClause: any = {};

  // Apply institution filtering based on role
  if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
    logger.info(
      `Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`
    );
    whereClause.Employee = {
      institutionId: userInstitutionId,
    };
  } else {
    logger.info(
      `Role ${userRole} is a CSC role - showing all promotion data across institutions`
    );
  }

  // Apply status filter
  if (status && status !== 'all') {
    if (status === 'pending') {
      whereClause.OR = [
        { status: { contains: 'Pending' } },
        { status: { contains: 'Awaiting' } },
      ];
    } else if (status === 'approved') {
      whereClause.status = { contains: 'Approved' };
    } else if (status === 'rejected') {
      whereClause.OR = [
        { status: { contains: 'Rejected' } },
      ];
    }
  }

  const [promotionRequests, total] = await Promise.all([
    db.promotionRequest.findMany({
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
        User_PromotionRequest_hrrpReviewedByToUser: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    db.promotionRequest.count({ where: whereClause }),
  ]);

  logger.info(`Found ${promotionRequests.length} promotion requests (page ${page} of ${Math.ceil(total / size)})`);

  // Transform the data to match frontend expectations
  const transformedRequests = promotionRequests.map((req: any) => ({
    ...req,
    submittedBy: req.User_PromotionRequest_submittedByIdToUser,
    reviewedBy: req.User_PromotionRequest_reviewedByIdToUser,
    hrrpReviewedBy: req.User_PromotionRequest_hrrpReviewedByToUser,
    User_PromotionRequest_submittedByIdToUser: undefined,
    User_PromotionRequest_reviewedByIdToUser: undefined,
    User_PromotionRequest_hrrpReviewedByToUser: undefined,
  }));

  return NextResponse.json({
    data: transformedRequests,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / size),
      size,
    },
  });
}, 'promotions');

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json();
  logger.info({ value: body }, 'Creating promotion request');

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

  const isHRRP = body.userRole === 'HRRP';
  const initialStatus = isHRRP
    ? 'Approved by HRRP - Awaiting Commission Review'
    : 'Pending HRRP Review';
  const initialReviewStage = isHRRP ? 'hrrp_review' : 'initial';
  const hrrpData = isHRRP
    ? {
        hrrpReviewedById: body.submittedById,
        hrrpReviewedAt: new Date(),
      }
    : {};

  const promotionRequest = await db.promotionRequest.create({
    data: {
      id: uuidv4(),
      employeeId: body.employeeId,
      submittedById: body.submittedById,
      promotionType: body.promotionType,
      proposedCadre: body.proposedCadre || '', // Default to empty string for education-based promotions
      studiedOutsideCountry: body.studiedOutsideCountry || false,
      status: initialStatus,
      reviewStage: initialReviewStage,
      documents: body.documents || [],
      commissionDecisionReason: body.commissionDecisionReason || null,
      updatedAt: new Date(),
      ...hrrpData,
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
      User_PromotionRequest_hrrpReviewedByToUser: isHRRP
        ? { select: { id: true, name: true, username: true } }
        : false,
    },
  });

  logger.info({ value: promotionRequest.id }, 'Created promotion request');

  // Create notification - target depends on who submitted
  if (isHRRP) {
    // HRRP submitted directly: notify commission (HHRMD/HRMO)
    const notification = NotificationTemplates.promotionHrrpApproved(
      promotionRequest.Employee.name,
      promotionRequest.id
    );
    await createNotificationForRole(ROLES.HHRMD!, notification.message, notification.link);
    await createNotificationForRole(ROLES.HRMO!, notification.message, notification.link);
  } else {
    // HRO submitted: notify HRRP at the same institution
    const notification = NotificationTemplates.promotionPendingHrrpReview(
      promotionRequest.Employee.name,
      promotionRequest.id
    );
    const emp = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { institutionId: true },
    });
    if (emp?.institutionId) {
      const hrrpUsers = await db.user.findMany({
        where: { role: ROLES.HRRP!, active: true, institutionId: emp.institutionId },
        select: { id: true },
      });
      for (const hrrpUser of hrrpUsers) {
        await createNotification({
          message: notification.message,
          link: notification.link,
          userId: hrrpUser.id,
        });
      }
    }
  }

  // Send email notifications to CSC reviewers
  await sendRequestSubmissionEmails({
    requestType: 'Promotion',
    employeeName: promotionRequest.Employee.name,
    requestId: promotionRequest.id,
    submittedByName: promotionRequest.User_PromotionRequest_submittedByIdToUser?.name || 'Unknown',
    dashboardPath: '/dashboard/promotion',
  });

  // Log request submission for audit
  const submittedByUser = await db.user.findUnique({
    where: { id: body.submittedById },
    select: { id: true, username: true, role: true },
  });
  await logRequestSubmission({
    requestType: 'Promotion',
    requestId: promotionRequest.id,
    employeeId: promotionRequest.employeeId,
    employeeName: promotionRequest.Employee?.name,
    employeeZanId: promotionRequest.Employee?.zanId,
    submittedById: body.submittedById,
    submittedByUsername: submittedByUser?.username || 'Unknown',
    submittedByRole: submittedByUser?.role || 'Unknown',
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  // Transform the data to match frontend expectations
  const transformedRequest = {
    ...promotionRequest,
    submittedBy: (promotionRequest as any)
      .User_PromotionRequest_submittedByIdToUser,
    hrrpReviewedBy: isHRRP ? (promotionRequest as any).User_PromotionRequest_hrrpReviewedByToUser : undefined,
    User_PromotionRequest_submittedByIdToUser: undefined,
    User_PromotionRequest_hrrpReviewedByToUser: undefined,
  };

  return NextResponse.json({
    success: true,
    data: transformedRequest,
  });
}, 'promotions');

export const PATCH = wrapHandler(async (req: Request) => {
  const body = await req.json();
  const { id, userRole, userId, ...updateData } = body;

  logger.info({  id, updateData  }, '🔵 PATCH /api/promotions called with');

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message: 'Request ID is required',
      },
      { status: 400 }
    );
  }

  // Get IP and device info for audit logging
  const headers = new Headers(req.headers);
  const ipAddress = getClientIp(headers);
  const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

  // Authorization: Different roles can perform different update actions
  const isHrrpApproval =
    updateData.status === 'Approved by HRRP - Awaiting Commission Review' &&
    (updateData.hrrpReviewedById || userRole === 'HRRP');
  const isHrrpRejection =
    updateData.status === 'Rejected by HRRP - Awaiting HRO Correction';
  const isHrrpAction = isHrrpApproval || isHrrpRejection;
  const isCommissionDecision = updateData.reviewedById !== undefined && !isHrrpAction && (updateData.status === 'Approved by Commission' || updateData.status === 'Rejected by Commission - Request Concluded');
  const isInitialReviewAction = updateData.reviewedById !== undefined && !isHrrpAction && !isCommissionDecision;
  const isResubmission =
    updateData.status === 'Pending HRRP Review' &&
    !updateData.reviewedById;

  let authCheck;
  if (isHrrpAction) {
    authCheck = checkRoleAuthorization(userRole, ['HRRP' as const]);
  } else if (isCommissionDecision || isInitialReviewAction) {
    authCheck = checkRoleAuthorization(userRole, ['HHRMD' as const, 'HRMO' as const]);
  } else if (isResubmission) {
    authCheck = checkRoleAuthorization(userRole, ['HRO' as const, 'HRRP' as const]);
  } else {
    authCheck = { authorized: false, message: 'Invalid update action' };
  }

  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, message: authCheck.message },
      { status: 403 }
    );
  }

  // Validate that commission decisions include a commission letter
  if (isCommissionDecision && !body.commissionLetterKey) {
    return NextResponse.json(
      { success: false, message: 'Commission letter is required for commission decisions' },
      { status: 400 }
    );
  }

  // Add HRRP review fields if this is an HRRP action
  if (isHrrpApproval) {
    updateData.hrrpReviewedById = updateData.hrrpReviewedById || userId;
    updateData.hrrpReviewedAt = new Date().toISOString();
    updateData.reviewStage = 'hrrp_review';
  }
  if (isHrrpRejection) {
    updateData.reviewStage = 'initial';
  }

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
      User_PromotionRequest_hrrpReviewedByToUser: {
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
    // Use finalCadre if provided (education-based promotions), otherwise use proposedCadre (experience-based)
    const newCadre = updatedRequest.finalCadre || updatedRequest.proposedCadre;
    await db.employee.update({
      where: { id: updatedRequest.Employee.id },
      data: { cadre: newCadre },
    });
    logger.info(
      `Employee ${updatedRequest.Employee.name} cadre updated to "${newCadre}" after promotion approval (${updatedRequest.finalCadre ? 'finalCadre' : 'proposedCadre'})`
    );
  }

  // Log audit event for approvals and rejections
  // Support both commission review (reviewedById) and HRRP action (hrrpReviewedById)
  const auditReviewerId = isHrrpAction
    ? (updateData.hrrpReviewedById || userId)
    : updateData.reviewedById;

  if (auditReviewerId && updateData.status) {
    const reviewer = await db.user.findUnique({
      where: { id: auditReviewerId },
      select: { username: true, role: true },
    });

    if (reviewer) {
      // Check if status contains "Approved" or "Rejected" (case-insensitive)
      const statusLower = updateData.status.toLowerCase();
      const isApproval =
        statusLower.includes('approved') && !statusLower.includes('rejected');
      const isRejection = statusLower.includes('rejected');

      logger.info({
        status: updateData.status,
        isApproval,
        isRejection,
        reviewerId: auditReviewerId,
        reviewer: reviewer.username,
       }, 'Promotion status update:');

      if (isApproval) {
        await logRequestApproval({
          requestType: 'Promotion',
          requestId: id,
          employeeId: updatedRequest.employeeId,
          employeeName: updatedRequest.Employee?.name,
          employeeZanId: updatedRequest.Employee?.zanId,
          approvedById: auditReviewerId,
          approvedByUsername: reviewer.username,
          approvedByRole: reviewer.role || 'Unknown',
          reviewStage: updateData.reviewStage,
          ipAddress,
          deviceInfo,
          additionalData: {
            proposedCadre: updatedRequest.proposedCadre,
            finalCadre: updatedRequest.finalCadre,
            promotionType: updatedRequest.promotionType,
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
          rejectedById: auditReviewerId,
          rejectedByUsername: reviewer.username,
          rejectedByRole: reviewer.role || 'Unknown',
          rejectionReason:
            updateData.rejectionReason || updateData.commissionDecisionReason,
          reviewStage: updateData.reviewStage,
          ipAddress,
          deviceInfo,
          additionalData: {
            proposedCadre: updatedRequest.proposedCadre,
            finalCadre: updatedRequest.finalCadre,
            promotionType: updatedRequest.promotionType,
            currentCadre: updatedRequest.Employee?.cadre,
          },
        });
      }
    }
  }

  // Send email notification to the HRO submitter on approval/rejection
  if (updateData.status) {
    const patchStatusLower = updateData.status.toLowerCase();
    const patchIsApproval = patchStatusLower.includes('approved') && !patchStatusLower.includes('rejected');
    const patchIsRejection = patchStatusLower.includes('rejected');
    if (patchIsApproval || patchIsRejection) {
      await sendRequestStatusUpdateEmail({
        requestType: 'Promotion',
        employeeName: updatedRequest.Employee?.name || 'Unknown',
        requestId: id,
        submittedById: updatedRequest.submittedById,
        status: updateData.status,
        rejectionReason: updateData.rejectionReason || updateData.commissionDecisionReason,
        dashboardPath: '/dashboard/promotion',
      });
    }
  }

  // HRRP approval notifications: notify commission (HHRMD/HRMO) that a request is ready for review
  if (isHrrpApproval) {
    const hrrpNotification = NotificationTemplates.promotionHrrpApproved(
      updatedRequest.Employee?.name || 'Unknown',
      id
    );
    await createNotificationForRole(ROLES.HHRMD!, hrrpNotification.message, hrrpNotification.link);
    await createNotificationForRole(ROLES.HRMO!, hrrpNotification.message, hrrpNotification.link);

    await sendRequestSubmissionEmails({
      requestType: 'Promotion',
      employeeName: updatedRequest.Employee?.name || 'Unknown',
      requestId: id,
      submittedByName: updatedRequest.User_PromotionRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/promotion',
    });
  }

  // HRRP rejection: notify the HRO who submitted
  if (isHrrpRejection) {
    const rejectionNotification = NotificationTemplates.promotionHrrpRejected(
      updatedRequest.Employee?.name || 'Unknown',
      id,
      updateData.rejectionReason || 'No reason provided'
    );
    await createNotification({
      message: rejectionNotification.message,
      link: rejectionNotification.link,
      userId: updatedRequest.submittedById,
    });
  }

  // Transform the data to match frontend expectations
  const transformedRequest = {
    ...updatedRequest,
    submittedBy: (updatedRequest as any)
      .User_PromotionRequest_submittedByIdToUser,
    reviewedBy: (updatedRequest as any)
      .User_PromotionRequest_reviewedByIdToUser,
    hrrpReviewedBy: (updatedRequest as any)
      .User_PromotionRequest_hrrpReviewedByToUser,
    User_PromotionRequest_submittedByIdToUser: undefined,
    User_PromotionRequest_reviewedByIdToUser: undefined,
    User_PromotionRequest_hrrpReviewedByToUser: undefined,
  };

  return NextResponse.json({
    success: true,
    data: transformedRequest,
  });
}, 'promotions');

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestSubmission,
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';
import { ROLES } from '@/lib/constants';
import { createNotification, createNotificationForRole, NotificationTemplates } from '@/lib/notifications';
import { sendRequestSubmissionEmails, sendRequestStatusUpdateEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { verifyAuth } from '@/lib/api-auth';

// Cache configuration for confirmation requests
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
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;
  const { searchParams } = new URL(req.url);
  const userId = auth.userId;
  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;
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
   }, 'Confirmations API called with');

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
      `Role ${userRole} is a CSC role - showing all confirmation data across institutions`
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

  const [requests, total] = await Promise.all([
    db.confirmationRequest.findMany({
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
            status: true,
            dateOfBirth: true,
            employmentDate: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_ConfirmationRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ConfirmationRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ConfirmationRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
    db.confirmationRequest.count({ where: whereClause }),
  ]);

  // Transform the data to match frontend expectations
  const transformedRequests = requests.map((req: any) => ({
    ...req,
    submittedBy: req.User_ConfirmationRequest_submittedByIdToUser,
    reviewedBy: req.User_ConfirmationRequest_reviewedByIdToUser,
    hrrpReviewedBy: req.User_ConfirmationRequest_hrrpReviewedByToUser,
    User_ConfirmationRequest_submittedByIdToUser: undefined,
    User_ConfirmationRequest_reviewedByIdToUser: undefined,
    User_ConfirmationRequest_hrrpReviewedByToUser: undefined,
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
}, 'confirmations');

export const POST = wrapHandler(async (req: Request) => {
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;
  const body = await req.json();
  logger.info({ value: body }, 'Creating confirmation request');

  // Authorization: Only HRO and HRRP can create confirmation requests
  const authCheck = checkRoleAuthorization(auth.role, [
    'HRO' as const,
    'HRRP' as const,
  ]);
  if (!authCheck.authorized) {
    return NextResponse.json(
      {
        success: false,
        message: authCheck.message,
      },
      { status: 403 }
    );
  }

  // Basic validation
  if (!body.employeeId) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing required fields: employeeId',
      },
      { status: 400 }
    );
  }

  // Get employee details to check status
  const employee = await db.employee.findUnique({
    where: { id: body.employeeId },
    select: { id: true, name: true, status: true, institutionId: true },
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

  // SECURITY: Institution ownership check — HRO/HRRP can only create requests for their own institution's employees
  if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
    if (employee.institutionId !== auth.institutionId) {
      return NextResponse.json(
        { success: false, message: 'Access denied: employee belongs to a different institution' },
        { status: 403 }
      );
    }
  }

  // Validate employee status for confirmation request
  const statusValidation = validateEmployeeStatusForRequest(
    employee.status,
    'confirmation'
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

  const isHRRP = auth.role === 'HRRP';
  const initialStatus = isHRRP
    ? 'Approved by HRRP - Awaiting Commission Review'
    : 'Pending HRRP Review';
  const initialReviewStage = isHRRP ? 'hrrp_review' : 'initial';
  const hrrpData = isHRRP
    ? {
        hrrpReviewedById: auth.userId,
        hrrpReviewedAt: new Date(),
      }
    : {};

  const confirmationRequest = await db.confirmationRequest.create({
    data: {
      id: uuidv4(),
      employeeId: body.employeeId,
      submittedById: auth.userId,
      status: initialStatus,
      reviewStage: initialReviewStage,
      documents: body.documents || [],
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
          status: true,
          dateOfBirth: true,
          employmentDate: true,
          Institution: { select: { id: true, name: true } },
        },
      },
      User_ConfirmationRequest_submittedByIdToUser: {
        select: { id: true, name: true, username: true },
      },
      User_ConfirmationRequest_hrrpReviewedByToUser: isHRRP
        ? { select: { id: true, name: true, username: true } }
        : false,
    },
  });

  logger.info({ value: confirmationRequest.id }, 'Created confirmation request');

  // Create notification - target depends on who submitted
  if (isHRRP) {
    // HRRP submitted directly: notify commission (HHRMD/HRMO)
    const notification = NotificationTemplates.confirmationHrrpApproved(
      confirmationRequest.Employee.name,
      confirmationRequest.id
    );
    await createNotificationForRole(ROLES.HHRMD!, notification.message, notification.link);
    await createNotificationForRole(ROLES.HRMO!, notification.message, notification.link);
  } else {
    // HRO submitted: notify HRRP at the same institution
    const notification = NotificationTemplates.confirmationPendingHrrpReview(
      confirmationRequest.Employee.name,
      confirmationRequest.id
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
    requestType: 'Confirmation',
    employeeName: confirmationRequest.Employee.name,
    requestId: confirmationRequest.id,
    submittedByName: confirmationRequest.User_ConfirmationRequest_submittedByIdToUser?.name || 'Unknown',
    dashboardPath: '/dashboard/confirmation',
  });

  // Log request submission for audit
  const submittedByUser = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, username: true, role: true },
  });
  await logRequestSubmission({
    requestType: 'Confirmation',
    requestId: confirmationRequest.id,
    employeeId: confirmationRequest.employeeId,
    employeeName: confirmationRequest.Employee?.name,
    employeeZanId: confirmationRequest.Employee?.zanId,
    submittedById: auth.userId,
    submittedByUsername: submittedByUser?.username || 'Unknown',
    submittedByRole: submittedByUser?.role || 'Unknown',
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  // Transform the data to match frontend expectations
  const transformedRequest = {
    ...confirmationRequest,
    submittedBy: (confirmationRequest as any)
      .User_ConfirmationRequest_submittedByIdToUser,
    User_ConfirmationRequest_submittedByIdToUser: undefined,
  };

  return NextResponse.json({
    success: true,
    data: transformedRequest,
  });
}, 'confirmations');

export const PATCH = wrapHandler(async (req: Request) => {
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;
  const body = await req.json();
  const { id, ...updateData } = body;
  // Strip client-supplied identity fields: the reviewer is taken from the
  // authenticated session (auth.role / auth.userId), and these request models
  // have no userRole/userId columns. Leaving them in updateData makes Prisma
  // throw PrismaClientValidationError (→ 500) on every workflow PATCH
  // (approve/reject/forward/resubmit). Restores a strip dropped by the
  // centralized error-handling refactor (commit 67fb9c81).
  delete updateData.userRole;
  delete updateData.userId;
  const userRole = auth.role;
  const userId = auth.userId;

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message: 'Request ID is required',
      },
      { status: 400 }
    );
  }

  // Authorization: Different roles can perform different update actions
  const isHrrpApproval =
    updateData.status === 'Approved by HRRP - Awaiting Commission Review' &&
    (updateData.hrrpReviewedById || userRole === 'HRRP');
  const isHrrpRejection =
    updateData.status === 'Rejected by HRRP - Awaiting HRO Correction';
  const isHrrpAction = isHrrpApproval || isHrrpRejection;
  // Commission final decision (approve/reject by the commission itself)
  const isCommissionDecision =
    updateData.reviewedById !== undefined &&
    !isHrrpAction &&
    (updateData.status === 'Approved by Commission' ||
     updateData.status === 'Rejected by Commission - Request Concluded');

  // HHRMD/HRMO initial review (forward to commission or reject back to HRO)
  const isInitialReviewAction =
    updateData.reviewedById !== undefined &&
    !isHrrpAction &&
    !isCommissionDecision;

  const isResubmission =
    updateData.status === 'Pending HRRP Review' &&
    !updateData.reviewedById;

  let authCheck;
  if (isHrrpAction) {
    // HRRP approve/reject action - only HRRP role
    authCheck = checkRoleAuthorization(userRole, ['HRRP' as const]);
  } else if (isCommissionDecision || isInitialReviewAction) {
    // Commission decision or initial review - only HHRMD/HRMO
    authCheck = checkRoleAuthorization(userRole, ['HHRMD' as const, 'HRMO' as const]);
  } else if (isResubmission) {
    // HRO resubmit after rejection - HRO and HRRP
    authCheck = checkRoleAuthorization(userRole, ['HRO' as const, 'HRRP' as const]);
  } else {
    authCheck = { authorized: false, message: 'Invalid update action' };
  }

  if (!authCheck.authorized) {
    return NextResponse.json(
      {
        success: false,
        message: authCheck.message,
      },
      { status: 403 }
    );
  }

  // Validate that commission final decisions include a commission letter
  if (isCommissionDecision && !body.commissionLetterKey) {
    return NextResponse.json(
      {
        success: false,
        message: 'Commission letter is required for commission decisions',
      },
      { status: 400 }
    );
  }

  // Get IP and device info for audit logging
  const headers = new Headers(req.headers);
  const ipAddress = getClientIp(headers);
  const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

  // Add HRRP review fields if this is an HRRP action
  if (isHrrpApproval) {
    updateData.hrrpReviewedById = updateData.hrrpReviewedById || userId;
    updateData.hrrpReviewedAt = new Date().toISOString();
    updateData.reviewStage = 'hrrp_review';
  }
  if (isHrrpRejection) {
    updateData.reviewStage = 'initial';
  }

  // The authenticated user is the reviewer — ignore any client-supplied reviewer id.
  if (updateData.reviewedById !== undefined) {
    updateData.reviewedById = auth.userId;
  }
  if (updateData.hrrpReviewedById !== undefined) {
    updateData.hrrpReviewedById = auth.userId;
  }

  const updatedRequest = await db.confirmationRequest.update({
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
          status: true,
          dateOfBirth: true,
          employmentDate: true,
          Institution: { select: { id: true, name: true } },
        },
      },
      User_ConfirmationRequest_submittedByIdToUser: {
        select: { id: true, name: true, username: true },
      },
      User_ConfirmationRequest_reviewedByIdToUser: {
        select: { id: true, name: true, username: true },
      },
      User_ConfirmationRequest_hrrpReviewedByToUser: {
        select: { id: true, name: true, username: true },
      },
    },
  });

  // Check if the confirmation request was approved by commission
  if (updateData.status === 'Approved by Commission') {
    try {
      // Update employee status from "On Probation" to "Confirmed"
      await db.employee.update({
        where: { id: updatedRequest.employeeId },
        data: {
          status: 'Confirmed',
          confirmationDate: new Date(),
        },
      });

      logger.info(
        `Employee ${updatedRequest.Employee.name} (${updatedRequest.Employee.zanId}) status updated to "Confirmed" due to commission approval`
      );
    } catch (employeeUpdateError) {
      logger.error({ value: employeeUpdateError }, 'Failed to update employee status');
      // Don't fail the entire request if employee update fails
    }
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
       }, 'Confirmation status update:');

      if (isApproval) {
        await logRequestApproval({
          requestType: 'Confirmation',
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
            currentStatus: updatedRequest.Employee?.status,
          },
        });
      } else if (isRejection) {
        await logRequestRejection({
          requestType: 'Confirmation',
          requestId: id,
          employeeId: updatedRequest.employeeId,
          employeeName: updatedRequest.Employee?.name,
          employeeZanId: updatedRequest.Employee?.zanId,
          rejectedById: auditReviewerId,
          rejectedByUsername: reviewer.username,
          rejectedByRole: reviewer.role || 'Unknown',
          rejectionReason: updateData.rejectionReason,
          reviewStage: updateData.reviewStage,
          ipAddress,
          deviceInfo,
          additionalData: {
            currentStatus: updatedRequest.Employee?.status,
          },
        });
      }
    }
  }

  // HRRP approval notifications: notify commission (HHRMD/HRMO) that a request is ready for review
  if (isHrrpApproval) {
    const hrrpNotification = NotificationTemplates.confirmationHrrpApproved(
      updatedRequest.Employee?.name || 'Unknown',
      id
    );
    await createNotificationForRole(ROLES.HHRMD!, hrrpNotification.message, hrrpNotification.link);
    await createNotificationForRole(ROLES.HRMO!, hrrpNotification.message, hrrpNotification.link);

    await sendRequestSubmissionEmails({
      requestType: 'Confirmation',
      employeeName: updatedRequest.Employee?.name || 'Unknown',
      requestId: id,
      submittedByName: updatedRequest.User_ConfirmationRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/confirmation',
    });
  }

  // HRRP rejection: notify the HRO who submitted
  if (isHrrpRejection) {
    const rejectionNotification = NotificationTemplates.confirmationHrrpRejected(
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

  // Send email notification to the HRO submitter on approval/rejection
  if (updateData.status) {
    const patchStatusLower = updateData.status.toLowerCase();
    const patchIsApproval = patchStatusLower.includes('approved') && !patchStatusLower.includes('rejected');
    const patchIsRejection = patchStatusLower.includes('rejected');
    if (patchIsApproval || patchIsRejection) {
      await sendRequestStatusUpdateEmail({
        requestType: 'Confirmation',
        employeeName: updatedRequest.Employee?.name || 'Unknown',
        requestId: id,
        submittedById: updatedRequest.submittedById,
        status: updateData.status,
        rejectionReason: updateData.rejectionReason,
        dashboardPath: '/dashboard/confirmation',
      });
    }
  }

  // Transform the data to match frontend expectations
  const transformedRequest = {
    ...updatedRequest,
    submittedBy: (updatedRequest as any)
      .User_ConfirmationRequest_submittedByIdToUser,
    reviewedBy: (updatedRequest as any)
      .User_ConfirmationRequest_reviewedByIdToUser,
    hrrpReviewedBy: (updatedRequest as any)
      .User_ConfirmationRequest_hrrpReviewedByToUser,
    User_ConfirmationRequest_submittedByIdToUser: undefined,
    User_ConfirmationRequest_reviewedByIdToUser: undefined,
    User_ConfirmationRequest_hrrpReviewedByToUser: undefined,
  };

  return NextResponse.json({
    success: true,
    data: transformedRequest,
  });
}, 'confirmations');

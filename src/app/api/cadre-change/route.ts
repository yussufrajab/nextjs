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
import { createNotification, createNotificationForRole, NotificationTemplates } from '@/lib/notifications';
import { sendRequestSubmissionEmails, sendRequestStatusUpdateEmail } from '@/lib/email';
import { ROLES } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { verifyAuth } from '@/lib/api-auth';

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

// Cache configuration for cadre change requests
const CACHE_TTL = 30; // 30 seconds cache (request status changes frequently)

async function GETHandler(req: Request) {
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
     }, 'Cadre Change API called with');

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
        `Role ${userRole} is a CSC role - showing all cadre change data across institutions`
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
      db.cadreChangeRequest.findMany({
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
              Institution: { select: { id: true, name: true } },
            },
          },
          User_CadreChangeRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_CadreChangeRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_CadreChangeRequest_hrrpReviewedByToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.cadreChangeRequest.count({ where: whereClause }),
    ]);

    logger.info(`Found ${requests.length} cadre change requests (page ${page} of ${Math.ceil(total / size)})`);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_CadreChangeRequest_submittedByIdToUser,
      reviewedBy: req.User_CadreChangeRequest_reviewedByIdToUser,
      hrrpReviewedBy: req.User_CadreChangeRequest_hrrpReviewedByToUser,
      User_CadreChangeRequest_submittedByIdToUser: undefined,
      User_CadreChangeRequest_reviewedByIdToUser: undefined,
      User_CadreChangeRequest_hrrpReviewedByToUser: undefined,
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
}

export const GET = wrapHandler(GETHandler, 'cadre-change');

async function POSTHandler(req: Request) {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const auth = authResult.context!;
    const body = await req.json();
    logger.info({ value: body }, 'Creating cadre change request');

    // Basic validation
    if (!body.employeeId || !body.newCadre) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, newCadre',
        },
        { status: 400 }
      );
    }

    // Get employee details to check status and get current cadre
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, name: true, status: true, cadre: true, institutionId: true },
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

    // Validate employee status for cadre change request
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'cadre-change'
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

    const cadreChangeRequest = await db.cadreChangeRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: auth.userId,
        originalCadre: employee.cadre, // Store original cadre before change
        newCadre: body.newCadre,
        reason: body.reason,
        studiedOutsideCountry: body.studiedOutsideCountry || false,
        documents: body.documents || [],
        status: initialStatus,
        reviewStage: initialReviewStage,
        rejectionReason: body.rejectionReason,
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
            Institution: { select: { id: true, name: true } },
          },
        },
        User_CadreChangeRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_CadreChangeRequest_hrrpReviewedByToUser: isHRRP
          ? { select: { id: true, name: true, username: true } }
          : false,
      },
    });

    logger.info({ value: cadreChangeRequest.id }, 'Created cadre change request');

    // Create notification - target depends on who submitted
    if (isHRRP) {
      // HRRP submitted directly: notify commission (HHRMD/HRMO)
      const notification = NotificationTemplates.cadreChangeHrrpApproved(
        cadreChangeRequest.Employee.name,
        cadreChangeRequest.id
      );
      await createNotificationForRole(ROLES.HHRMD!, notification.message, notification.link);
      await createNotificationForRole(ROLES.HRMO!, notification.message, notification.link);
    } else {
      // HRO submitted: notify HRRP at the same institution
      const notification = NotificationTemplates.cadreChangePendingHrrpReview(
        cadreChangeRequest.Employee.name,
        cadreChangeRequest.id
      );
      const hrrpEmployee = await db.employee.findUnique({
        where: { id: body.employeeId },
        select: { institutionId: true },
      });
      if (hrrpEmployee?.institutionId) {
        const hrrpUsers = await db.user.findMany({
          where: { role: ROLES.HRRP!, active: true, institutionId: hrrpEmployee.institutionId },
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
      requestType: 'Cadre Change',
      employeeName: cadreChangeRequest.Employee.name,
      requestId: cadreChangeRequest.id,
      submittedByName: cadreChangeRequest.User_CadreChangeRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/cadre-change',
    });

    // Log request submission for audit
    const submittedByUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, role: true },
    });
    await logRequestSubmission({
      requestType: 'CadreChange',
      requestId: cadreChangeRequest.id,
      employeeId: cadreChangeRequest.employeeId,
      employeeName: cadreChangeRequest.Employee?.name,
      employeeZanId: cadreChangeRequest.Employee?.zanId,
      submittedById: auth.userId,
      submittedByUsername: submittedByUser?.username || 'Unknown',
      submittedByRole: submittedByUser?.role || 'Unknown',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    }).catch(() => {});

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...cadreChangeRequest,
      submittedBy: (cadreChangeRequest as any)
        .User_CadreChangeRequest_submittedByIdToUser,
      hrrpReviewedBy: isHRRP ? (cadreChangeRequest as any).User_CadreChangeRequest_hrrpReviewedByToUser : undefined,
      User_CadreChangeRequest_submittedByIdToUser: undefined,
      User_CadreChangeRequest_hrrpReviewedByToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
}

export const POST = wrapHandler(POSTHandler, 'cadre-change');

async function PATCHHandler(req: Request) {
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

    // Authorization: Different roles can perform different update actions.
    // A resubmission is identified by its target status ('Pending HRRP
    // Review') — the only PATCH that sets this status is an HRO/HRRP
    // correcting a rejected request — NOT by the absence of reviewedById.
    // The shared frontend helper sets reviewedById on every non-HRRP action,
    // so classifying by reviewedById's presence misroutes an HRO resubmit
    // into the initial-review branch (HHRMD/HRMO only) and returns 403.
    const isResubmission =
      updateData.status === 'Pending HRRP Review';
    const isHrrpApproval =
      updateData.status === 'Approved by HRRP - Awaiting Commission Review' &&
      (updateData.hrrpReviewedById || userRole === 'HRRP');
    const isHrrpRejection =
      updateData.status === 'Rejected by HRRP - Awaiting HRO Correction';
    const isHrrpAction = isHrrpApproval || isHrrpRejection;
    const isCommissionDecision =
      updateData.reviewedById !== undefined &&
      !isHrrpAction && !isResubmission &&
      (updateData.status === 'Approved by Commission' || updateData.status === 'Rejected by Commission - Request Concluded');
    const isInitialReviewAction =
      updateData.reviewedById !== undefined && !isHrrpAction && !isCommissionDecision && !isResubmission;

    let authCheck;
    if (isHrrpAction) {
      authCheck = checkRoleAuthorization(userRole, ['HRRP' as const]);
    } else if (isResubmission) {
      authCheck = checkRoleAuthorization(userRole, ['HRO' as const, 'HRRP' as const]);
    } else if (isCommissionDecision || isInitialReviewAction) {
      authCheck = checkRoleAuthorization(userRole, ['HHRMD' as const, 'HRMO' as const]);
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

    // Validate that commission decisions include a commission letter
    if (isCommissionDecision && !body.commissionLetterKey) {
      return NextResponse.json(
        { success: false, message: 'Commission letter is required for commission decisions' },
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

    // Server-controlled reviewStage for the remaining workflow actions.
    // The page's Commission Decision buttons are gated on
    // reviewStage === 'commission_review' (and status.includes('Awaiting
    // Commission Decision')) — this branch advances the stage server-side
    // in lockstep with the status, so HHRMD/HRMO forwarding a request to
    // the Commission doesn't strand it. Mirrors the promotion workflow.
    if (isInitialReviewAction) {
      const isForwardToCommission =
        typeof updateData.status === 'string' &&
        updateData.status.includes('Awaiting Commission Decision');
      updateData.reviewStage = isForwardToCommission ? 'commission_review' : 'initial';
    }
    if (isCommissionDecision) {
      updateData.reviewStage = 'completed';
    }
    if (isResubmission) {
      // HRO/HRRP correcting a rejected request — back to the start.
      updateData.reviewStage = 'initial';
    }

    // The authenticated user is the reviewer — ignore any client-supplied reviewer id.
    if (updateData.reviewedById !== undefined) {
      updateData.reviewedById = auth.userId;
    }
    if (updateData.hrrpReviewedById !== undefined) {
      updateData.hrrpReviewedById = auth.userId;
    }

    // A resubmission returns the request to HRRP review — there is no
    // reviewer yet. Drop any client-supplied reviewedById (the shared
    // frontend helper sets it for every non-HRRP action) so the
    // resubmitting HRO is not recorded as the reviewer.
    if (isResubmission) {
      delete updateData.reviewedById;
    }

    const updatedRequest = await db.cadreChangeRequest.update({
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
            Institution: { select: { id: true, name: true } },
          },
        },
        User_CadreChangeRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_CadreChangeRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_CadreChangeRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // If cadre change request is approved by Commission, update employee cadre
    if (
      updateData.status === 'Approved by Commission' &&
      updatedRequest.Employee
    ) {
      await db.employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { cadre: updatedRequest.newCadre },
      });
      logger.info(
        `Employee ${updatedRequest.Employee.name} cadre updated to "${updatedRequest.newCadre}" after cadre change approval`
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
         }, 'Cadre Change status update:');

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Cadre Change',
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
              newCadre: updatedRequest.newCadre,
              currentCadre: updatedRequest.Employee?.cadre,
              reason: updatedRequest.reason,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'Cadre Change',
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
              newCadre: updatedRequest.newCadre,
              currentCadre: updatedRequest.Employee?.cadre,
              reason: updatedRequest.reason,
            },
          });
        }
      }
    }

    // Send email notification to the HRO submitter on approval/rejection
    if (updateData.status) {
      const ccPatchStatusLower = updateData.status.toLowerCase();
      const ccPatchIsApproval = ccPatchStatusLower.includes('approved') && !ccPatchStatusLower.includes('rejected');
      const ccPatchIsRejection = ccPatchStatusLower.includes('rejected');
      if (ccPatchIsApproval || ccPatchIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Cadre Change',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: updateData.status,
          rejectionReason: updateData.rejectionReason,
          dashboardPath: '/dashboard/cadre-change',
        });
      }
    }

    // HRRP approval notifications: notify commission (HHRMD/HRMO) that a request is ready for review
    if (isHrrpApproval) {
      const hrrpNotification = NotificationTemplates.cadreChangeHrrpApproved(
        updatedRequest.Employee?.name || 'Unknown',
        id
      );
      await createNotificationForRole(ROLES.HHRMD!, hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.HRMO!, hrrpNotification.message, hrrpNotification.link);

      await sendRequestSubmissionEmails({
        requestType: 'Cadre Change',
        employeeName: updatedRequest.Employee?.name || 'Unknown',
        requestId: id,
        submittedByName: updatedRequest.User_CadreChangeRequest_submittedByIdToUser?.name || 'Unknown',
        dashboardPath: '/dashboard/cadre-change',
      });
    }

    // HRRP rejection: notify the HRO who submitted
    if (isHrrpRejection) {
      const rejectionNotification = NotificationTemplates.cadreChangeHrrpRejected(
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
        .User_CadreChangeRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any)
        .User_CadreChangeRequest_reviewedByIdToUser,
      hrrpReviewedBy: (updatedRequest as any)
        .User_CadreChangeRequest_hrrpReviewedByToUser,
      User_CadreChangeRequest_submittedByIdToUser: undefined,
      User_CadreChangeRequest_reviewedByIdToUser: undefined,
      User_CadreChangeRequest_hrrpReviewedByToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
}

export const PATCH = wrapHandler(PATCHHandler, 'cadre-change');

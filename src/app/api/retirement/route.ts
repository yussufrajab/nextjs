import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter, pembaIslandWhere, isHrrpLike } from '@/lib/role-utils';
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
import { isAllowedStatusTransition } from '@/lib/request-workflow';

// Cache configuration for retirement requests
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
     }, 'Retirement API called with');

    // Build where clause based on user role and institution
    const whereClause: any = {};

    // Apply institution filtering based on role
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      logger.info(
        `Applying institution filter for role ${userRole} with institutionId ${userInstitutionId}`
      );
      whereClause.Employee = {
        institutionId: userInstitutionId,
        ...pembaIslandWhere(userRole),
      };
    } else {
      logger.info(
        `Role ${userRole} is a CSC role - showing all retirement data across institutions`
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
      db.retirementRequest.findMany({
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
          User_RetirementRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_RetirementRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_RetirementRequest_hrrpReviewedByToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.retirementRequest.count({ where: whereClause }),
    ]);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_RetirementRequest_submittedByIdToUser,
      reviewedBy: req.User_RetirementRequest_reviewedByIdToUser,
      hrrpReviewedBy: req.User_RetirementRequest_hrrpReviewedByToUser,
      User_RetirementRequest_submittedByIdToUser: undefined,
      User_RetirementRequest_reviewedByIdToUser: undefined,
      User_RetirementRequest_hrrpReviewedByToUser: undefined,
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

export const GET = wrapHandler(GETHandler, 'retirement');

async function POSTHandler(req: Request) {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const auth = authResult.context!;

    const body = await req.json();
    logger.info({ value: body }, 'Creating retirement request');

    // Basic validation
    if (!body.employeeId || !body.retirementType) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, retirementType',
        },
        { status: 400 }
      );
    }

    // For non-illness retirement, proposedDate is required
    if (body.retirementType !== 'illness' && !body.proposedDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Proposed date is required for compulsory and voluntary retirement',
        },
        { status: 400 }
      );
    }

    // SECURITY: Verify employee exists and check institution ownership
    const employee = await db.employee.findUnique({
      where: { id: body.employeeId },
      select: { id: true, name: true, status: true, institutionId: true },
    });
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
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

    // Validate employee status for retirement request
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'retirement'
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

    // Determine initial status based on submitter role
    const isHRRP = isHrrpLike(auth.role);
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

    const retirementRequest = await db.retirementRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: auth.userId,
        proposedDate: body.proposedDate
          ? new Date(body.proposedDate)
          : new Date(), // For illness retirement, use current date if no proposed date
        retirementType: body.retirementType,
        illnessDescription: body.illnessDescription,
        delayReason: body.delayReason,
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
        User_RetirementRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_RetirementRequest_hrrpReviewedByToUser: isHRRP
          ? { select: { id: true, name: true, username: true } }
          : false,
      },
    });

    logger.info({ value: retirementRequest.id }, 'Created retirement request');

    // Create notification - target depends on who submitted
    if (isHRRP) {
      // HRRP submitted directly: notify commission (HHRMD/HRMO/DO)
      const notification = NotificationTemplates.retirementSubmitted(
        retirementRequest.Employee.name,
        retirementRequest.id
      );
      await createNotificationForRole(
        ROLES.HHRMD || 'HHRMD',
        notification.message,
        notification.link
      );
      await createNotificationForRole(
        ROLES.HRMO || 'HRMO',
        notification.message,
        notification.link
      );
      await createNotificationForRole(
        ROLES.DO || 'DO',
        notification.message,
        notification.link
      );
    } else {
      // HRO submitted: notify HRRP at the same institution
      const hrrpNotification = NotificationTemplates.retirementPendingHrrpReview(
        retirementRequest.Employee.name,
        retirementRequest.id
      );
      const submitter = await db.user.findUnique({
        where: { id: auth.userId },
        select: { institutionId: true },
      });
      if (submitter?.institutionId) {
        const hrrpUsers = await db.user.findMany({
          where: { role: { in: ['HRRP', 'HRRP_PEMBA'] }, active: true, institutionId: submitter.institutionId },
          select: { id: true },
        });
        for (const hrrpUser of hrrpUsers) {
          await db.notification.create({
            data: { id: uuidv4(), userId: hrrpUser.id, message: hrrpNotification.message, link: hrrpNotification.link },
          });
        }
      }
    }

    // Send email notifications to CSC reviewers
    await sendRequestSubmissionEmails({
      requestType: 'Retirement',
      employeeName: retirementRequest.Employee.name,
      requestId: retirementRequest.id,
      submittedByName: retirementRequest.User_RetirementRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/retirement',
    });

    // Log request submission for audit
    const submittedByUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, role: true },
    });
    await logRequestSubmission({
      requestType: 'Retirement',
      requestId: retirementRequest.id,
      employeeId: retirementRequest.employeeId,
      employeeName: retirementRequest.Employee?.name,
      employeeZanId: retirementRequest.Employee?.zanId,
      submittedById: auth.userId,
      submittedByUsername: submittedByUser?.username || 'Unknown',
      submittedByRole: submittedByUser?.role || 'Unknown',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    }).catch(() => {});

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...retirementRequest,
      submittedBy: (retirementRequest as any)
        .User_RetirementRequest_submittedByIdToUser,
      hrrpReviewedBy: isHRRP ? (retirementRequest as any).User_RetirementRequest_hrrpReviewedByToUser : undefined,
      User_RetirementRequest_submittedByIdToUser: undefined,
      User_RetirementRequest_hrrpReviewedByToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
}

export const POST = wrapHandler(POSTHandler, 'retirement');

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

    // Determine HRRP action types before the update
    const isHrrpApproval = updateData.status === 'Approved by HRRP - Awaiting Commission Review' && (updateData.hrrpReviewedById || isHrrpLike(userRole));
    const isHrrpRejection = updateData.status === 'Rejected by HRRP - Awaiting HRO Correction';
    // A resubmission is identified by its target status ('Pending HRRP
    // Review'), NOT by the absence of reviewedById — the shared frontend
    // helper sets reviewedById on every non-HRRP action, including resubmit.
    // Classifying by reviewedById would skip the HRRP resubmission
    // notification below.
    const isResubmission = updateData.status === 'Pending HRRP Review';

    // Validate that commission decisions include a commission letter
    const isCommissionDecision = updateData.reviewedById && (
      updateData.status?.includes('Approved by Commission') ||
      updateData.status?.includes('Rejected by Commission')
    );
    // HHRMD/HRMO initial review = a forwarded action that isn't an HRRP,
    // commission-decision, or resubmission step. Inlined (rather than
    // referencing isHrrpAction) because isHrrpAction is defined further
    // down, after the audit block.
    const isInitialReviewAction =
      updateData.reviewedById !== undefined &&
      !isHrrpApproval && !isHrrpRejection && !isCommissionDecision && !isResubmission;

    // SECURITY (UAT Req 3.5 / 8.3 / 18.3 / 25.3): role-based authorization.
    // Pre-fix the collection PATCH handler for the older modules had no
    // auth gate — only the [id]/route.ts subroute (which the dashboard
    // never calls) had one. An HRO could record a commission decision by
    // direct API call. Mirror the promotion pattern. isHrrpAction is
    // inlined here (rather than referenced) because it's defined later,
    // after the audit block.
    let authCheck;
    if (isHrrpApproval || isHrrpRejection) {
      authCheck = checkRoleAuthorization(userRole, ['HRRP' as const, 'HRRP_PEMBA' as const]);
    } else if (isResubmission) {
      authCheck = checkRoleAuthorization(userRole, ['HRO' as const, 'HRRP' as const, 'HRO_PEMBA' as const, 'HRRP_PEMBA' as const]);
    } else if (isCommissionDecision || isInitialReviewAction) {
      authCheck = checkRoleAuthorization(userRole, ['HHRMD' as const, 'HRMO' as const]);
    } else {
      authCheck = { authorized: false, message: 'Invalid update action' };
    }
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, message: authCheck.message },
        { status: 403 }
      );
    }

    // Fetch the existing record's current status + submitter once, for the
    // FSM transition check and the self-approval check below.
    const existing = await db.retirementRequest.findUnique({
      where: { id },
      select: { status: true, submittedById: true },
    });

    // SECURITY (Req 8.1/8.2/18.1): validate status transition. Prevents a
    // client from jumping an arbitrary status (e.g. re-approving an already
    // Commission-concluded request, or skipping the HRRP stage). Mirrors the
    // FSM in confirmations/lwop collection PATCH, extended to handle the
    // variable HHRMD/HRMO forward status.
    if (
      updateData.status &&
      existing?.status &&
      existing.status !== updateData.status &&
      !isAllowedStatusTransition(existing.status, updateData.status)
    ) {
      return NextResponse.json(
        { success: false, message: `Invalid status transition from "${existing.status}" to "${updateData.status}"` },
        { status: 400 }
      );
    }

    // SECURITY (Req 8.9): prevent self-approval / self-rejection — the user
    // who submitted the request may not approve or reject it (only
    // resubmit/withdraw). The [id] route enforces this; the collection PATCH
    // (which the dashboard actually calls) did not, so a submitter could
    // self-approve via this path.
    if (
      (isHrrpApproval || isHrrpRejection || isCommissionDecision) &&
      existing?.submittedById === auth.userId
    ) {
      return NextResponse.json(
        { success: false, message: 'Cannot approve or reject your own submission' },
        { status: 403 }
      );
    }

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

    // Get IP and device info for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

    // Convert date string to Date object if present
    if (updateData.proposedDate) {
      updateData.proposedDate = new Date(updateData.proposedDate);
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
    // resubmitting HRO is not recorded as the reviewer and the HRRP
    // resubmission notification below fires correctly.
    if (isResubmission) {
      delete updateData.reviewedById;
    }

    updateData.updatedAt = new Date();

    const updatedRequest = await db.retirementRequest.update({
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
        User_RetirementRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_RetirementRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_RetirementRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // If retirement request is approved by Commission, update employee status
    if (
      updateData.status === 'Approved by Commission' &&
      updatedRequest.Employee
    ) {
      await db.employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { status: 'Retired' },
      });
      logger.info(
        `Employee ${updatedRequest.Employee.name} status updated to "Retired" after retirement approval`
      );
    }

    // Log audit event for approvals and rejections
    // Support both commission review (reviewedById) and HRRP action (hrrpReviewedById)
    const isHrrpAction = isHrrpApproval || isHrrpRejection;
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
         }, 'Retirement status update:');

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Retirement',
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
              retirementType: updatedRequest.retirementType,
              proposedDate: updatedRequest.proposedDate,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'Retirement',
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
              retirementType: updatedRequest.retirementType,
              proposedDate: updatedRequest.proposedDate,
            },
          });
        }
      }
    }

    // Send email notification to the HRO submitter on approval/rejection
    if (updateData.status) {
      const retPatchStatusLower = updateData.status.toLowerCase();
      const retPatchIsApproval = retPatchStatusLower.includes('approved') && !retPatchStatusLower.includes('rejected');
      const retPatchIsRejection = retPatchStatusLower.includes('rejected');
      if (retPatchIsApproval || retPatchIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Retirement',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: updateData.status,
          rejectionReason: updateData.rejectionReason,
          dashboardPath: '/dashboard/retirement',
        });
      }
    }

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any)
        .User_RetirementRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any)
        .User_RetirementRequest_reviewedByIdToUser,
      hrrpReviewedBy: (updatedRequest as any)
        .User_RetirementRequest_hrrpReviewedByToUser,
      User_RetirementRequest_submittedByIdToUser: undefined,
      User_RetirementRequest_reviewedByIdToUser: undefined,
      User_RetirementRequest_hrrpReviewedByToUser: undefined,
    };

    // HRRP approval notifications: notify commission (HHRMD/HRMO/DO) that a request is ready for review
    if (isHrrpApproval) {
      const hrrpNotification = NotificationTemplates.retirementHrrpApproved(
        updatedRequest.Employee?.name || 'Unknown',
        id
      );
      await createNotificationForRole(ROLES.HHRMD || 'HHRMD', hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.HRMO || 'HRMO', hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.DO || 'DO', hrrpNotification.message, hrrpNotification.link);
    }

    // HRRP rejection: notify the HRO who submitted
    if (isHrrpRejection) {
      const rejectionNotification = NotificationTemplates.retirementHrrpRejected(
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

    // Resubmission after HRRP rejection: notify HRRP at the same institution
    if (isResubmission) {
      const resubmissionNotification = NotificationTemplates.retirementPendingHrrpReview(
        updatedRequest.Employee?.name || 'Unknown',
        id
      );
      const submitter = await db.user.findUnique({
        where: { id: updatedRequest.submittedById },
        select: { institutionId: true },
      });
      if (submitter?.institutionId) {
        const hrrpUsers = await db.user.findMany({
          where: { role: { in: ['HRRP', 'HRRP_PEMBA'] }, active: true, institutionId: submitter.institutionId },
          select: { id: true },
        });
        for (const hrrpUser of hrrpUsers) {
          await createNotification({
            message: resubmissionNotification.message,
            link: resubmissionNotification.link,
            userId: hrrpUser.id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
}

export const PATCH = wrapHandler(PATCHHandler, 'retirement');

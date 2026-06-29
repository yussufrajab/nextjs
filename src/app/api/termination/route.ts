import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
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
     }, 'Termination API called with');

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
        `Role ${userRole} is a CSC role - showing all termination data across institutions`
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
      db.separationRequest.findMany({
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
          User_SeparationRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_SeparationRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_SeparationRequest_hrrpReviewedByToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.separationRequest.count({ where: whereClause }),
    ]);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_SeparationRequest_submittedByIdToUser,
      reviewedBy: req.User_SeparationRequest_reviewedByIdToUser,
      hrrpReviewedBy: req.User_SeparationRequest_hrrpReviewedByToUser,
      User_SeparationRequest_submittedByIdToUser: undefined,
      User_SeparationRequest_reviewedByIdToUser: undefined,
      User_SeparationRequest_hrrpReviewedByToUser: undefined,
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

export const GET = wrapHandler(GETHandler, 'termination');

async function POSTHandler(req: Request) {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const auth = authResult.context!;

    const body = await req.json();
    logger.info({ value: body }, 'Creating termination request');

    // Basic validation
    if (!body.employeeId || !body.type || !body.reason) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, type, reason',
        },
        { status: 400 }
      );
    }

    // Determine initial status based on submitter role
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

    const separationRequest = await db.separationRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: auth.userId,
        type: body.type,
        reason: body.reason,
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
        User_SeparationRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_SeparationRequest_hrrpReviewedByToUser: isHRRP
          ? { select: { id: true, name: true, username: true } }
          : false,
      },
    });

    logger.info({ value: separationRequest.id }, 'Created termination request');

    // Create notification - target depends on who submitted
    if (isHRRP) {
      // HRRP submitted directly: notify commission (HHRMD/HRMO/DO)
      const notification = NotificationTemplates.terminationSubmitted(
        separationRequest.Employee.name,
        separationRequest.id
      );
      await createNotificationForRole(ROLES.HHRMD || 'HHRMD', notification.message, notification.link);
      await createNotificationForRole(ROLES.HRMO || 'HRMO', notification.message, notification.link);
      await createNotificationForRole(ROLES.DO || 'DO', notification.message, notification.link);
    } else {
      // HRO submitted: notify HRRP at the same institution
      const hrrpNotification = NotificationTemplates.terminationPendingHrrpReview(
        separationRequest.Employee.name,
        separationRequest.id
      );
      const submitter = await db.user.findUnique({
        where: { id: auth.userId },
        select: { institutionId: true },
      });
      if (submitter?.institutionId) {
        const hrrpUsers = await db.user.findMany({
          where: { role: ROLES.HRRP || 'HRRP', active: true, institutionId: submitter.institutionId },
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
      requestType: 'Termination',
      employeeName: separationRequest.Employee.name,
      requestId: separationRequest.id,
      submittedByName: separationRequest.User_SeparationRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/termination',
    });

    // Log request submission for audit
    const submittedByUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, username: true, role: true },
    });
    await logRequestSubmission({
      requestType: 'Termination',
      requestId: separationRequest.id,
      employeeId: separationRequest.employeeId,
      employeeName: separationRequest.Employee?.name,
      employeeZanId: separationRequest.Employee?.zanId,
      submittedById: auth.userId,
      submittedByUsername: submittedByUser?.username || 'Unknown',
      submittedByRole: submittedByUser?.role || 'Unknown',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    }).catch(() => {});

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...separationRequest,
      submittedBy: (separationRequest as any)
        .User_SeparationRequest_submittedByIdToUser,
      hrrpReviewedBy: isHRRP ? (separationRequest as any).User_SeparationRequest_hrrpReviewedByToUser : undefined,
      User_SeparationRequest_submittedByIdToUser: undefined,
      User_SeparationRequest_hrrpReviewedByToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
}

export const POST = wrapHandler(POSTHandler, 'termination');

async function PATCHHandler(req: Request) {
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const auth = authResult.context!;

    const body = await req.json();
    const { id, ...updateData } = body;
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
    const isHrrpApproval = updateData.status === 'Approved by HRRP - Awaiting Commission Review' && (updateData.hrrpReviewedById || userRole === 'HRRP');
    const isHrrpRejection = updateData.status === 'Rejected by HRRP - Awaiting HRO Correction';
    const isResubmission = updateData.status === 'Pending HRRP Review' && !updateData.reviewedById;

    // Validate that commission decisions include a commission letter
    const isCommissionDecision = updateData.reviewedById && (
      updateData.status?.includes('Approved by Commission') ||
      updateData.status?.includes('Rejected by Commission')
    );
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

    // Get IP and device info for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

    // No date conversion needed for separation requests

    // The authenticated user is the reviewer — ignore any client-supplied reviewer id.
    if (updateData.reviewedById !== undefined) {
      updateData.reviewedById = auth.userId;
    }
    if (updateData.hrrpReviewedById !== undefined) {
      updateData.hrrpReviewedById = auth.userId;
    }

    const updatedRequest = await db.separationRequest.update({
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
            status: true,
            Institution: { select: { id: true, name: true } },
          },
        },
      },
    });

    // If separation request is approved by Commission, update employee status based on current employee status
    if (
      updateData.status === 'Approved by Commission' &&
      updatedRequest.Employee
    ) {
      const currentEmployeeStatus = updatedRequest.Employee.status;
      let newStatus;

      if (currentEmployeeStatus === 'Confirmed') {
        newStatus = 'Dismissed';
      } else if (
        currentEmployeeStatus === 'Probation' ||
        currentEmployeeStatus === 'On Probation'
      ) {
        newStatus = 'Terminated';
      } else {
        // For other statuses, default based on separation type
        newStatus =
          updatedRequest.type === 'DISMISSAL' ? 'Dismissed' : 'Terminated';
      }

      await db.employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { status: newStatus },
      });

      logger.info(
        `Employee ${updatedRequest.Employee.name} status updated from "${currentEmployeeStatus}" to "${newStatus}" after ${updatedRequest.type.toLowerCase()} approval`
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
        const requestType =
          updatedRequest.type === 'TERMINATION' ? 'Termination' : 'Dismissal';

        logger.info({
          status: updateData.status,
          isApproval,
          isRejection,
          reviewerId: auditReviewerId,
          reviewer: reviewer.username,
         }, 'Termination/Dismissal status update:');

        if (isApproval) {
          await logRequestApproval({
            requestType,
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
              type: updatedRequest.type,
              reason: updatedRequest.reason,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType,
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
              type: updatedRequest.type,
            },
          });
        }
      }
    }

    // Send email notification to the HRO submitter on approval/rejection
    if (updateData.status) {
      const termPatchStatusLower = updateData.status.toLowerCase();
      const termPatchIsApproval = termPatchStatusLower.includes('approved') && !termPatchStatusLower.includes('rejected');
      const termPatchIsRejection = termPatchStatusLower.includes('rejected');
      if (termPatchIsApproval || termPatchIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Termination',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: updateData.status,
          rejectionReason: updateData.rejectionReason,
          dashboardPath: '/dashboard/termination',
        });
      }
    }

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any)
        .User_SeparationRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any)
        .User_SeparationRequest_reviewedByIdToUser,
      hrrpReviewedBy: (updatedRequest as any)
        .User_SeparationRequest_hrrpReviewedByToUser,
      User_SeparationRequest_submittedByIdToUser: undefined,
      User_SeparationRequest_reviewedByIdToUser: undefined,
      User_SeparationRequest_hrrpReviewedByToUser: undefined,
    };

    // HRRP approval notifications: notify commission (HHRMD/HRMO/DO) that a request is ready for review
    if (isHrrpApproval) {
      const hrrpNotification = NotificationTemplates.terminationHrrpApproved(
        updatedRequest.Employee?.name || 'Unknown',
        id
      );
      await createNotificationForRole(ROLES.HHRMD || 'HHRMD', hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.HRMO || 'HRMO', hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.DO || 'DO', hrrpNotification.message, hrrpNotification.link);
    }

    // HRRP rejection: notify the HRO who submitted
    if (isHrrpRejection) {
      const rejectionNotification = NotificationTemplates.terminationHrrpRejected(
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
      const resubmissionNotification = NotificationTemplates.terminationPendingHrrpReview(
        updatedRequest.Employee?.name || 'Unknown',
        id
      );
      const submitter = await db.user.findUnique({
        where: { id: updatedRequest.submittedById },
        select: { institutionId: true },
      });
      if (submitter?.institutionId) {
        const hrrpUsers = await db.user.findMany({
          where: { role: ROLES.HRRP || 'HRRP', active: true, institutionId: submitter.institutionId },
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

export const PATCH = wrapHandler(PATCHHandler, 'termination');

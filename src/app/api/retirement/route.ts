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

// Cache configuration for retirement requests
const CACHE_TTL = 30; // 30 seconds cache (request status changes frequently)

async function GETHandler(req: Request) {
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
        orderBy: { createdAt: 'desc' },
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
    const body = await req.json();
    logger.info({ value: body }, 'Creating retirement request');

    // Basic validation
    if (!body.employeeId || !body.submittedById || !body.retirementType) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, submittedById, retirementType',
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

    // Determine initial status based on submitter role
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

    const retirementRequest = await db.retirementRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
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
        where: { id: body.submittedById },
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
      requestType: 'Retirement',
      employeeName: retirementRequest.Employee.name,
      requestId: retirementRequest.id,
      submittedByName: retirementRequest.User_RetirementRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/retirement',
    });

    // Log request submission for audit
    const submittedByUser = await db.user.findUnique({
      where: { id: body.submittedById },
      select: { id: true, username: true, role: true },
    });
    await logRequestSubmission({
      requestType: 'Retirement',
      requestId: retirementRequest.id,
      employeeId: retirementRequest.employeeId,
      employeeName: retirementRequest.Employee?.name,
      employeeZanId: retirementRequest.Employee?.zanId,
      submittedById: body.submittedById,
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
    const body = await req.json();
    const { id, userRole, userId, ...updateData } = body;

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

    // Convert date string to Date object if present
    if (updateData.proposedDate) {
      updateData.proposedDate = new Date(updateData.proposedDate);
    }

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
    if (updateData.reviewedById && updateData.status) {
      const reviewer = await db.user.findUnique({
        where: { id: updateData.reviewedById },
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
          reviewedById: updateData.reviewedById,
          reviewer: reviewer.username,
         }, 'Retirement status update:');

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Retirement',
            requestId: id,
            employeeId: updatedRequest.employeeId,
            employeeName: updatedRequest.Employee?.name,
            employeeZanId: updatedRequest.Employee?.zanId,
            approvedById: updateData.reviewedById,
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
            rejectedById: updateData.reviewedById,
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

export const PATCH = wrapHandler(PATCHHandler, 'retirement');

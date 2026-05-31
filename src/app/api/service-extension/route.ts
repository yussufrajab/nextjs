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
     }, 'Service Extension API called with');

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
        `Role ${userRole} is a CSC role - showing all service extension data across institutions`
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
      db.serviceExtensionRequest.findMany({
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
          User_ServiceExtensionRequest_submittedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_ServiceExtensionRequest_reviewedByIdToUser: {
            select: { id: true, name: true, username: true },
          },
          User_ServiceExtensionRequest_hrrpReviewedByToUser: {
            select: { id: true, name: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      db.serviceExtensionRequest.count({ where: whereClause }),
    ]);

    // Transform the data to match frontend expectations
    const transformedRequests = requests.map((req: any) => ({
      ...req,
      submittedBy: req.User_ServiceExtensionRequest_submittedByIdToUser,
      reviewedBy: req.User_ServiceExtensionRequest_reviewedByIdToUser,
      hrrpReviewedBy: req.User_ServiceExtensionRequest_hrrpReviewedByToUser,
      User_ServiceExtensionRequest_submittedByIdToUser: undefined,
      User_ServiceExtensionRequest_reviewedByIdToUser: undefined,
      User_ServiceExtensionRequest_hrrpReviewedByToUser: undefined,
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

export const GET = wrapHandler(GETHandler, 'service-extension');

async function POSTHandler(req: Request) {
    const body = await req.json();
    logger.info({ value: body }, 'Creating service extension request');

    // Basic validation
    if (
      !body.employeeId ||
      !body.submittedById ||
      !body.currentRetirementDate ||
      !body.requestedExtensionPeriod ||
      !body.justification
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing required fields: employeeId, submittedById, currentRetirementDate, requestedExtensionPeriod, justification',
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

    // Validate employee status for service extension request
    const statusValidation = validateEmployeeStatusForRequest(
      employee.status,
      'service-extension'
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

    const serviceExtensionRequest = await db.serviceExtensionRequest.create({
      data: {
        id: uuidv4(),
        employeeId: body.employeeId,
        submittedById: body.submittedById,
        currentRetirementDate: new Date(body.currentRetirementDate),
        requestedExtensionPeriod: body.requestedExtensionPeriod,
        justification: body.justification,
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
        User_ServiceExtensionRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ServiceExtensionRequest_hrrpReviewedByToUser: isHRRP
          ? { select: { id: true, name: true, username: true } }
          : false,
      },
    });

    logger.info(`Created service extension request: ${serviceExtensionRequest.id}`);

    // Create notification - target depends on who submitted
    if (isHRRP) {
      // HRRP submitted directly: notify commission (HHRMD/HRMO/DO)
      const notification = NotificationTemplates.serviceExtensionSubmitted(
        serviceExtensionRequest.Employee.name,
        serviceExtensionRequest.id
      );
      await createNotificationForRole(ROLES.HHRMD || 'HHRMD', notification.message, notification.link);
      await createNotificationForRole(ROLES.HRMO || 'HRMO', notification.message, notification.link);
      await createNotificationForRole(ROLES.DO || 'DO', notification.message, notification.link);
    } else {
      // HRO submitted: notify HRRP at the same institution
      const hrrpNotification = NotificationTemplates.serviceExtensionPendingHrrpReview(
        serviceExtensionRequest.Employee.name,
        serviceExtensionRequest.id
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
      requestType: 'Service Extension',
      employeeName: serviceExtensionRequest.Employee.name,
      requestId: serviceExtensionRequest.id,
      submittedByName: serviceExtensionRequest.User_ServiceExtensionRequest_submittedByIdToUser?.name || 'Unknown',
      dashboardPath: '/dashboard/service-extension',
    });

    // Log request submission for audit
    const submittedByUser = await db.user.findUnique({
      where: { id: body.submittedById },
      select: { id: true, username: true, role: true },
    });
    await logRequestSubmission({
      requestType: 'ServiceExtension',
      requestId: serviceExtensionRequest.id,
      employeeId: serviceExtensionRequest.employeeId,
      employeeName: serviceExtensionRequest.Employee?.name,
      employeeZanId: serviceExtensionRequest.Employee?.zanId,
      submittedById: body.submittedById,
      submittedByUsername: submittedByUser?.username || 'Unknown',
      submittedByRole: submittedByUser?.role || 'Unknown',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    }).catch(() => {});

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...serviceExtensionRequest,
      submittedBy: (serviceExtensionRequest as any)
        .User_ServiceExtensionRequest_submittedByIdToUser,
      hrrpReviewedBy: isHRRP ? (serviceExtensionRequest as any).User_ServiceExtensionRequest_hrrpReviewedByToUser : undefined,
      User_ServiceExtensionRequest_submittedByIdToUser: undefined,
      User_ServiceExtensionRequest_hrrpReviewedByToUser: undefined,
    };

    return NextResponse.json({
      success: true,
      data: transformedRequest,
    });
}

export const POST = wrapHandler(POSTHandler, 'service-extension');

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
    if (updateData.currentRetirementDate) {
      updateData.currentRetirementDate = new Date(
        updateData.currentRetirementDate
      );
    }

    const updatedRequest = await db.serviceExtensionRequest.update({
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
            retirementDate: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_ServiceExtensionRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ServiceExtensionRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_ServiceExtensionRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // Check if the service extension request was approved by commission
    if (updateData.status === 'Approved by Commission') {
      try {
        // Calculate new retirement date based on the requested extension period
        const currentRetirementDate = updatedRequest.currentRetirementDate;
        const extensionPeriod =
          updatedRequest.requestedExtensionPeriod.toLowerCase();

        const newRetirementDate = new Date(currentRetirementDate);

        // Parse extension period and calculate new date
        if (extensionPeriod.includes('year')) {
          const years = parseInt(extensionPeriod.match(/\d+/)?.[0] || '1');
          newRetirementDate.setFullYear(
            newRetirementDate.getFullYear() + years
          );
        } else if (extensionPeriod.includes('month')) {
          const months = parseInt(extensionPeriod.match(/\d+/)?.[0] || '6');
          newRetirementDate.setMonth(newRetirementDate.getMonth() + months);
        } else {
          // Default to 1 year if parsing fails
          newRetirementDate.setFullYear(newRetirementDate.getFullYear() + 1);
        }

        // Update employee's retirement date
        await db.employee.update({
          where: { id: updatedRequest.employeeId },
          data: {
            retirementDate: newRetirementDate,
          },
        });

        logger.info(
          `Employee ${updatedRequest.Employee.name} (${updatedRequest.Employee.zanId}) retirement date updated from ${currentRetirementDate.toISOString().split('T')[0]} to ${newRetirementDate.toISOString().split('T')[0]} due to approved service extension`
        );
      } catch (employeeUpdateError) {
        logger.error(
          { err: employeeUpdateError },
          'Failed to update employee retirement date'
        );
        // Don't fail the entire request if employee update fails
      }
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
         }, 'Service Extension status update:');

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Service Extension',
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
              requestedExtensionPeriod: updatedRequest.requestedExtensionPeriod,
              currentRetirementDate: updatedRequest.currentRetirementDate,
              justification: updatedRequest.justification,
            },
          });
        } else if (isRejection) {
          await logRequestRejection({
            requestType: 'Service Extension',
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
              requestedExtensionPeriod: updatedRequest.requestedExtensionPeriod,
              currentRetirementDate: updatedRequest.currentRetirementDate,
              justification: updatedRequest.justification,
            },
          });
        }
      }
    }

    // Send email notification to the HRO submitter on approval/rejection
    if (updateData.status) {
      const sePatchStatusLower = updateData.status.toLowerCase();
      const sePatchIsApproval = sePatchStatusLower.includes('approved') && !sePatchStatusLower.includes('rejected');
      const sePatchIsRejection = sePatchStatusLower.includes('rejected');
      if (sePatchIsApproval || sePatchIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Service Extension',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: updateData.status,
          rejectionReason: updateData.rejectionReason,
          dashboardPath: '/dashboard/service-extension',
        });
      }
    }

    // Transform the data to match frontend expectations
    const transformedRequest = {
      ...updatedRequest,
      submittedBy: (updatedRequest as any)
        .User_ServiceExtensionRequest_submittedByIdToUser,
      reviewedBy: (updatedRequest as any)
        .User_ServiceExtensionRequest_reviewedByIdToUser,
      hrrpReviewedBy: (updatedRequest as any)
        .User_ServiceExtensionRequest_hrrpReviewedByToUser,
      User_ServiceExtensionRequest_submittedByIdToUser: undefined,
      User_ServiceExtensionRequest_reviewedByIdToUser: undefined,
      User_ServiceExtensionRequest_hrrpReviewedByToUser: undefined,
    };

    // HRRP approval notifications: notify commission (HHRMD/HRMO/DO) that a request is ready for review
    if (isHrrpApproval) {
      const hrrpNotification = NotificationTemplates.serviceExtensionHrrpApproved(
        updatedRequest.Employee?.name || 'Unknown',
        id
      );
      await createNotificationForRole(ROLES.HHRMD || 'HHRMD', hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.HRMO || 'HRMO', hrrpNotification.message, hrrpNotification.link);
      await createNotificationForRole(ROLES.DO || 'DO', hrrpNotification.message, hrrpNotification.link);
    }

    // HRRP rejection: notify the HRO who submitted
    if (isHrrpRejection) {
      const rejectionNotification = NotificationTemplates.serviceExtensionHrrpRejected(
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
      const resubmissionNotification = NotificationTemplates.serviceExtensionPendingHrrpReview(
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

export const PATCH = wrapHandler(PATCHHandler, 'service-extension');

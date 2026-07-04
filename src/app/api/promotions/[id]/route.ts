import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';
import { sendRequestStatusUpdateEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { verifyAuth } from '@/lib/api-auth';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';

const VALID_STATUSES = [
  'Pending HRRP Review',
  'Approved by HRRP - Awaiting Commission Review',
  'Rejected by HRRP - Awaiting HRO Correction',
  'Approved by Commission',
  'Rejected by Commission - Request Concluded',
] as const;

const updateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().optional(),
  reviewedById: z.string().optional(),
  commissionDecisionReason: z.string().optional(),
  proposedCadre: z.string().optional(),
  promotionType: z.enum(['Experience', 'EducationAdvancement']).optional(),
  documents: z.array(z.string()).optional(),
  studiedOutsideCountry: z.boolean().optional(),
  hrrpReviewedById: z.string().optional(),
  hrrpReviewedAt: z.string().datetime().optional(),
  commissionLetterKey: z.string().optional(),
});

const handleUpdate = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const body = await req.json();
  const validatedData = updateSchema.parse(body);

  // The authenticated user is the reviewer — ignore any client-supplied reviewer id.
  if (validatedData.reviewedById !== undefined) {
    validatedData.reviewedById = auth.userId;
  }
  if (validatedData.hrrpReviewedById !== undefined) {
    validatedData.hrrpReviewedById = auth.userId;
  }

  // Get IP and device info for audit logging
  const headers = new Headers(req.headers);
  const ipAddress = getClientIp(headers);
  const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

  // Check if promotion exists
  const existingRequest = await db.promotionRequest.findUnique({
    where: { id },
    include: { Employee: true },
  });

  if (!existingRequest) {
    return new NextResponse('Promotion request not found', { status: 404 });
  }

  // SECURITY: Institution ownership check — HRO/HRRP can only modify their own institution's requests
  if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
    if (!existingRequest.Employee || (existingRequest.Employee as any).institutionId !== auth.institutionId) {
      return NextResponse.json(
        { success: false, message: 'Access denied: request belongs to a different institution' },
        { status: 403 }
      );
    }
  }

  // Validate status transition
  if (validatedData.status && existingRequest.status !== validatedData.status) {
    const ALLOWED_TRANSITIONS: Record<string, string[]> = {
      'Pending HRRP Review': [
        'Approved by HRRP - Awaiting Commission Review',
        'Rejected by HRRP - Awaiting HRO Correction',
      ],
      'Approved by HRRP - Awaiting Commission Review': [
        'Approved by Commission',
        'Rejected by Commission - Request Concluded',
      ],
      'Rejected by HRRP - Awaiting HRO Correction': [
        'Pending HRRP Review',
      ],
    };
    const allowed = ALLOWED_TRANSITIONS[existingRequest.status] || [];
    if (!allowed.includes(validatedData.status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status transition from "${existingRequest.status}" to "${validatedData.status}"` },
        { status: 400 }
      );
    }
  }

  // SECURITY: Enforce rejection reason for all rejections
  if (validatedData.status?.toLowerCase().includes('rejected') && !validatedData.rejectionReason) {
    return NextResponse.json(
      { success: false, message: 'Rejection reason is required when rejecting a request' },
      { status: 400 }
    );
  }

  // Role-based authorization
  if (validatedData.status) {
    const isHrrpApproval =
      validatedData.status === 'Approved by HRRP - Awaiting Commission Review' &&
      (validatedData.hrrpReviewedById || auth.role === 'HRRP');
    const isHrrpRejection =
      validatedData.status === 'Rejected by HRRP - Awaiting HRO Correction';
    const isHrrpAction = isHrrpApproval || isHrrpRejection;
    const isCommissionDecision =
      validatedData.reviewedById !== undefined &&
      !isHrrpAction &&
      (validatedData.status === 'Approved by Commission' ||
        validatedData.status === 'Rejected by Commission - Request Concluded');
    const isResubmission =
      validatedData.status === 'Pending HRRP Review' &&
      !validatedData.reviewedById;

    if (isHrrpAction && auth.role !== 'HRRP') {
      return NextResponse.json(
        { success: false, message: 'Only HRRP can perform HRRP review actions' },
        { status: 403 }
      );
    }
    if (isCommissionDecision && !['HHRMD', 'HRMO'].includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: 'Only HHRMD or HRMO can make commission decisions' },
        { status: 403 }
      );
    }
    if (isResubmission && !['HRO', 'HRRP'].includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: 'Only HRO or HRRP can resubmit requests' },
        { status: 403 }
      );
    }

    // Validate that commission decisions include a commission letter
    if (isCommissionDecision && !validatedData.commissionLetterKey) {
      return NextResponse.json(
        { success: false, message: 'Commission letter is required for commission decisions' },
        { status: 400 }
      );
    }
  }

  // Check if this is a Commission approval
  const isCommissionApproval =
    validatedData.status &&
    validatedData.status.toLowerCase().includes('commission') &&
    validatedData.status.toLowerCase().includes('approved');

  if (isCommissionApproval) {
    // Use transaction to update both promotion request and employee cadre
    const result = await db.$transaction(async (tx) => {
      // Update the promotion request
      const updatedRequest = await tx.promotionRequest.update({
        where: { id },
        data: validatedData,
        include: {
          Employee: {
            select: {
              name: true,
              zanId: true,
              department: true,
              cadre: true,
            },
          },
          User_PromotionRequest_submittedByIdToUser: {
            select: { name: true, role: true },
          },
          User_PromotionRequest_reviewedByIdToUser: {
            select: { name: true, role: true },
          },
          User_PromotionRequest_hrrpReviewedByToUser: {
            select: { id: true, name: true, username: true },
          },
        },
      });

      // Update the employee's cadre to the proposed cadre
      await tx.employee.update({
        where: { id: existingRequest.employeeId },
        data: {
          cadre: existingRequest.proposedCadre,
        },
      });

      return updatedRequest;
    });

    // Send notification
    const userToNotify = await db.user.findUnique({
      where: { employeeId: existingRequest.employeeId },
      select: { id: true },
    });

    if (userToNotify) {
      await db.notification.create({
        data: {
          id: uuidv4(),
          userId: userToNotify.id,
          message: `Your Promotion request for cadre "${existingRequest.proposedCadre}" has been approved by the Commission.`,
          link: `/dashboard/promotion`,
        },
      });
    }

    // Log audit event for Commission approval
    if (validatedData.reviewedById) {
      const reviewer = await db.user.findUnique({
        where: { id: validatedData.reviewedById },
        select: { username: true, role: true },
      });

      if (reviewer) {
        await logRequestApproval({
          requestType: 'Promotion',
          requestId: id,
          employeeId: existingRequest.employeeId,
          employeeName: result.Employee?.name,
          employeeZanId: result.Employee?.zanId,
          approvedById: validatedData.reviewedById,
          approvedByUsername: reviewer.username,
          approvedByRole: reviewer.role || 'Unknown',
          reviewStage: 'Commission Approval',
          ipAddress,
          deviceInfo,
          additionalData: {
            proposedCadre: existingRequest.proposedCadre,
            currentCadre: result.Employee?.cadre,
          },
        });
      }
    }

    // Send email notification to the HRO submitter
    await sendRequestStatusUpdateEmail({
      requestType: 'Promotion',
      employeeName: result.Employee?.name || 'Unknown',
      requestId: id,
      submittedById: existingRequest.submittedById,
      status: 'Approved by Commission',
      dashboardPath: '/dashboard/promotion',
    });

    return NextResponse.json(result);
  } else {
    // Regular update without employee cadre change
    const updatedRequest = await db.promotionRequest.update({
      where: { id },
      data: validatedData,
      include: {
        Employee: {
          select: { name: true, zanId: true, department: true, cadre: true },
        },
        User_PromotionRequest_submittedByIdToUser: {
          select: { name: true, role: true },
        },
        User_PromotionRequest_reviewedByIdToUser: {
          select: { name: true, role: true },
        },
        User_PromotionRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // Create appropriate notifications based on status changes
    if (validatedData.status) {
      const userToNotify = await db.user.findUnique({
        where: { employeeId: updatedRequest.employeeId },
        select: { id: true },
      });

      if (userToNotify) {
        let notification = null;

        if (
          validatedData.status === 'Approved by Commission' ||
          validatedData.status === 'Approved by HRRP - Awaiting Commission Review'
        ) {
          notification = NotificationTemplates.promotionApproved(
            updatedRequest.id
          );
        } else if (
          validatedData.status === 'Rejected by Commission - Request Concluded' ||
          validatedData.status === 'Rejected by HRRP - Awaiting HRO Correction'
        ) {
          const reason =
            validatedData.rejectionReason ||
            validatedData.commissionDecisionReason ||
            'No reason provided';
          notification = NotificationTemplates.promotionRejected(
            updatedRequest.id,
            reason
          );
        } else {
          // Generic status update notification
          notification = {
            message: `Your promotion request for cadre "${updatedRequest.proposedCadre}" has been updated to: ${validatedData.status}`,
            link: `/dashboard/promotion`,
          };
        }

        if (notification) {
          await createNotification({
            userId: userToNotify.id,
            message: notification.message,
            link: notification.link,
          });
        }
      }

      // Log audit event for approvals and rejections
      if (validatedData.reviewedById && validatedData.status) {
        const reviewer = await db.user.findUnique({
          where: { id: validatedData.reviewedById },
          select: { username: true, role: true },
        });

        if (reviewer) {
          // Check if status contains "Approved" or "Rejected" (case-insensitive)
          const statusLower = validatedData.status.toLowerCase();
          const isApproval =
            statusLower.includes('approved') &&
            !statusLower.includes('rejected');
          const isRejection = statusLower.includes('rejected');

          logger.info({
            status: validatedData.status,
            isApproval,
            isRejection,
            reviewedById: validatedData.reviewedById,
            reviewer: reviewer.username,
           }, 'Promotion status update:');

          if (isApproval) {
            await logRequestApproval({
              requestType: 'Promotion',
              requestId: id,
              employeeId: updatedRequest.employeeId,
              employeeName: updatedRequest.Employee?.name,
              employeeZanId: updatedRequest.Employee?.zanId,
              approvedById: validatedData.reviewedById,
              approvedByUsername: reviewer.username,
              approvedByRole: reviewer.role || 'Unknown',
              reviewStage: validatedData.reviewStage,
              ipAddress,
              deviceInfo,
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
              rejectedById: validatedData.reviewedById,
              rejectedByUsername: reviewer.username,
              rejectedByRole: reviewer.role || 'Unknown',
              rejectionReason:
                validatedData.rejectionReason ||
                validatedData.commissionDecisionReason,
              reviewStage: validatedData.reviewStage,
              ipAddress,
              deviceInfo,
              additionalData: {
                proposedCadre: updatedRequest.proposedCadre,
                currentCadre: updatedRequest.Employee?.cadre,
              },
            });
          }
        }
      }

      // Send email notification to the HRO submitter on approval/rejection
      const statusLower = validatedData.status.toLowerCase();
      const isApproval = statusLower.includes('approved') && !statusLower.includes('rejected');
      const isRejection = statusLower.includes('rejected');
      if (isApproval || isRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Promotion',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: validatedData.status,
          rejectionReason: validatedData.rejectionReason || validatedData.commissionDecisionReason,
          dashboardPath: '/dashboard/promotion',
        });
      }
    }

    return NextResponse.json(updatedRequest);
  }
}, 'promotions');

// Export both PUT and PATCH handlers
export const PUT = handleUpdate;
export const PATCH = handleUpdate;

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestApproval,
  logRequestRejection,
  logRequestForward,
  logRequestWithdrawal,
  getClientIp,
} from '@/lib/audit-logger';
import { sendRequestStatusUpdateEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { verifyAuth } from '@/lib/api-auth';
import { shouldApplyInstitutionFilter, isHroLike, isHrrpLike, isPembaScopedRole } from '@/lib/role-utils';
import { denyWorkflowAccess } from '@/lib/workflow-access';

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
  rejectionReason: z.string().nullable().optional(),
  reviewedById: z.string().optional(),
  reason: z.string().optional(),
  documents: z.array(z.string()).optional(),
  hrrpReviewedById: z.string().optional(),
  hrrpReviewedAt: z.string().datetime().optional(),
  commissionLetterKey: z.string().optional(),
  decisionDate: z.string().datetime().optional(),
  commissionDecisionDate: z.string().datetime().optional(),
});

async function handleUpdate(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Fetch existing request for transition validation
    const existingRequest = await db.separationRequest.findUnique({
      where: { id },
      include: { Employee: { select: { id: true, institutionId: true } } },
    });

    if (!existingRequest) {
      return new NextResponse('Termination request not found', { status: 404 });
    }

    // SECURITY: Institution ownership check — HRO/HRRP can only modify their own institution's requests
    if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
      if (!existingRequest.Employee || existingRequest.Employee.institutionId !== auth.institutionId) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'termination',
          requestId: id,
          requestType: 'Termination',
          employeeId: existingRequest.employeeId,
          blockReason: 'INSTITUTION_OWNERSHIP',
          message: 'Access denied: request belongs to a different institution',
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
        });
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
        return denyWorkflowAccess({
          auth,
          routeBase: 'termination',
          requestId: id,
          requestType: 'Termination',
          employeeId: existingRequest.employeeId,
          blockReason: 'INVALID_STATUS_TRANSITION',
          message: `Invalid status transition from "${existingRequest.status}" to "${validatedData.status}"`,
          status: 400,
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
          additionalData: { fromStatus: existingRequest.status, toStatus: validatedData.status },
        });
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
        (validatedData.hrrpReviewedById || isHrrpLike(auth.role));
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

      // SECURITY (Q12, Domain 25.3): prevent self-approval / self-rejection.
      // The submitter may only resubmit (correction) or withdraw — not approve
      // or reject their own request.
      if (
        (isHrrpApproval || isHrrpRejection || isCommissionDecision) &&
        existingRequest.submittedById === auth.userId
      ) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'termination',
          requestId: id,
          requestType: 'Termination',
          employeeId: existingRequest.employeeId,
          blockReason: 'SELF_APPROVAL',
          message: 'Cannot approve or reject your own submission',
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
        });
      }

      if (isHrrpAction && auth.role !== 'HRRP') {
        return denyWorkflowAccess({
          auth,
          routeBase: 'termination',
          requestId: id,
          requestType: 'Termination',
          employeeId: existingRequest.employeeId,
          blockReason: 'ROLE_NOT_HRRP',
          message: 'Only HRRP can perform HRRP review actions',
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
        });
      }
      if (isCommissionDecision && !['HHRMD', 'HRMO'].includes(auth.role)) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'termination',
          requestId: id,
          requestType: 'Termination',
          employeeId: existingRequest.employeeId,
          blockReason: 'ROLE_NOT_COMMISSION',
          message: 'Only HHRMD or HRMO can make commission decisions',
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
        });
      }
      if (isResubmission && !isHroLike(auth.role) && !isHrrpLike(auth.role)) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'termination',
          requestId: id,
          requestType: 'Termination',
          employeeId: existingRequest.employeeId,
          blockReason: 'ROLE_NOT_RESUBMIT',
          message: 'Only HRO or HRRP can resubmit requests',
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
        });
      }

      // Validate that commission decisions include a commission letter
      if (isCommissionDecision && !validatedData.commissionLetterKey) {
        return NextResponse.json(
          { success: false, message: 'Commission letter is required for commission decisions' },
          { status: 400 }
        );
      }
    }

    const updatedRequest = await db.separationRequest.update({
      where: { id },
      data: validatedData,
      include: {
        Employee: {
          select: {
            name: true,
            zanId: true,
            department: true,
            cadre: true,
            employmentDate: true,
            dateOfBirth: true,
            Institution: { select: { name: true } },
            payrollNumber: true,
            zssfNumber: true,
          },
        },
        User_SeparationRequest_submittedByIdToUser: {
          select: { name: true, role: true },
        },
        User_SeparationRequest_reviewedByIdToUser: {
          select: { name: true, role: true },
        },
        User_SeparationRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (validatedData.status) {
      const userToNotify = await db.user.findUnique({
        where: { employeeId: updatedRequest.employeeId },
        select: { id: true },
      });

      if (userToNotify) {
        const typeString =
          updatedRequest.type === 'TERMINATION' ? 'Termination' : 'Dismissal';
        await db.notification.create({
          data: {
            id: uuidv4(),
            userId: userToNotify.id,
            message: `Your ${typeString} request has been updated to: ${validatedData.status}.`,
            link: `/dashboard/termination`,
          },
        });
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
          const requestType =
            updatedRequest.type === 'TERMINATION' ? 'Termination' : 'Dismissal';

          logger.info({ 
            status: validatedData.status,
            isApproval,
            isRejection,
            reviewedById: validatedData.reviewedById,
           }, 'Termination/Dismissal status update:');

          if (isApproval) {
            await logRequestApproval({
              requestType,
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
                type: updatedRequest.type,
                reason: updatedRequest.reason,
              },
            });
            // GAP-M1: HRRP approve also forwards the request to the Commission —
            // log the stage handoff (distinct from the approval verdict above).
            if (
              validatedData.status ===
                'Approved by HRRP - Awaiting Commission Review' &&
              existingRequest.status === 'Pending HRRP Review'
            ) {
              await logRequestForward({
                requestType: 'Termination',
                requestId: id,
                employeeId: updatedRequest.employeeId,
                employeeName: updatedRequest.Employee?.name,
                employeeZanId: updatedRequest.Employee?.zanId,
                forwardedById: auth.userId,
                forwardedByUsername: auth.username,
                forwardedByRole: auth.role,
                fromStage: 'HRRP Review',
                toStage: 'Commission Review',
                ipAddress,
                deviceInfo,
              }).catch(() => {});
            }
          } else if (isRejection) {
            await logRequestRejection({
              requestType,
              requestId: id,
              employeeId: updatedRequest.employeeId,
              employeeName: updatedRequest.Employee?.name,
              employeeZanId: updatedRequest.Employee?.zanId,
              rejectedById: validatedData.reviewedById,
              rejectedByUsername: reviewer.username,
              rejectedByRole: reviewer.role || 'Unknown',
              rejectionReason: validatedData.rejectionReason ?? undefined,
              reviewStage: validatedData.reviewStage,
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
      const termStatusLower = validatedData.status.toLowerCase();
      const termIsApproval = termStatusLower.includes('approved') && !termStatusLower.includes('rejected');
      const termIsRejection = termStatusLower.includes('rejected');
      if (termIsApproval || termIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Termination',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: validatedData.status,
          rejectionReason: validatedData.rejectionReason ?? undefined,
          dashboardPath: '/dashboard/termination',
        });
      }
    }

    return NextResponse.json(updatedRequest);
}

// Export both PUT and PATCH handlers
export const PUT = wrapHandler(handleUpdate, 'termination');
export const PATCH = wrapHandler(handleUpdate, 'termination');

// GAP-M2: Withdrawal / cancellation handler. The original submitter (or an
// oversight role) can withdraw a request that has not yet reached a final
// Commission decision. The withdrawal is logged for non-repudiation BEFORE
// the row is removed, so the audit trail records WHO cancelled it and WHY
// even though the request itself is deleted.
export const DELETE = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const headers = new Headers(req.headers);
  const ipAddress = getClientIp(headers);
  const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

  // Withdrawal reason is optional but recommended for non-repudiation.
  let withdrawalReason: string | undefined;
  try {
    const body = await req.json();
    withdrawalReason =
      typeof body?.withdrawalReason === 'string' ? body.withdrawalReason : undefined;
  } catch {
    // No body or malformed JSON — treat as withdrawal without a stated reason.
  }

  const existingRequest = await db.separationRequest.findUnique({
    where: { id },
    include: {
      Employee: { select: { id: true, institutionId: true, name: true, zanId: true } },
    },
  });

  if (!existingRequest) {
    return new NextResponse('Termination request not found', { status: 404 });
  }

  // SECURITY: Institution ownership check — HRO/HRRP can only withdraw their
  // own institution's requests.
  if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
    if (
      !existingRequest.Employee ||
      existingRequest.Employee.institutionId !== auth.institutionId
    ) {
      return denyWorkflowAccess({
        auth,
        routeBase: 'termination',
        requestId: id,
        requestType: 'Termination',
        employeeId: existingRequest.employeeId,
        blockReason: 'INSTITUTION_OWNERSHIP',
        message: 'Access denied: request belongs to a different institution',
        requestMethod: 'DELETE',
        ipAddress,
        deviceInfo,
      });
    }
  }

  // Only the original submitter or an oversight role (Admin/HHRMD) may withdraw.
  const canWithdraw =
    existingRequest.submittedById === auth.userId ||
    ['Admin', 'HHRMD'].includes(auth.role);
  if (!canWithdraw) {
    return denyWorkflowAccess({
      auth,
      routeBase: 'termination',
      requestId: id,
      requestType: 'Termination',
      employeeId: existingRequest.employeeId,
      blockReason: 'NOT_SUBMITTER',
      message: 'Only the original submitter or an administrator may withdraw this request',
      requestMethod: 'DELETE',
      ipAddress,
      deviceInfo,
    });
  }

  // A request that has already received a final Commission decision is part of
  // the historical record and cannot be withdrawn.
  const TERMINAL_STATUSES = [
    'Approved by Commission',
    'Rejected by Commission - Request Concluded',
  ];
  if (TERMINAL_STATUSES.includes(existingRequest.status)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Cannot withdraw a request that has already received a final Commission decision',
      },
      { status: 409 }
    );
  }

  // GAP-M2: log the withdrawal for non-repudiation before deleting the row.
  // Fail-safe: an audit write failure does not block the withdrawal.
  await logRequestWithdrawal({
    requestType: 'Termination',
    requestId: id,
    employeeId: existingRequest.employeeId,
    employeeName: existingRequest.Employee?.name,
    employeeZanId: existingRequest.Employee?.zanId,
    withdrawnById: auth.userId,
    withdrawnByUsername: auth.username,
    withdrawnByRole: auth.role,
    withdrawalReason,
    reviewStage: existingRequest.reviewStage,
    ipAddress,
    deviceInfo,
  }).catch(() => {});

  await db.separationRequest.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Request withdrawn successfully' });
}, 'termination-withdraw');

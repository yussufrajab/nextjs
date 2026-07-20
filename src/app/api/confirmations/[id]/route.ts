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
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { isAllowedStatusTransition } from '@/lib/request-workflow';

const updateSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().optional(),
  reviewedById: z.string().optional(),
  decisionDate: z.string().datetime().optional(),
  commissionDecisionDate: z.string().datetime().optional(),
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

  // SECURITY: Fetch existing request to verify institution ownership
  const existingRequest = await db.confirmationRequest.findUnique({
    where: { id },
    include: { Employee: { select: { id: true, institutionId: true } } },
  });
  if (!existingRequest) {
    return new NextResponse('Confirmation request not found', { status: 404 });
  }

  // SECURITY: Institution ownership check — HRO/HRRP can only modify their own institution's requests
  if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
    if (!existingRequest.Employee || existingRequest.Employee.institutionId !== auth.institutionId) {
      return NextResponse.json(
        { success: false, message: 'Access denied: request belongs to a different institution' },
        { status: 403 }
      );
    }
  }

  // SECURITY (Req 8.1/8.2/18.1): validate status transition. Prevents a
  // client from jumping an arbitrary status (e.g. re-approving an already
  // Commission-concluded request, or skipping the HRRP stage). Mirrors the
  // FSM in promotions/[id]/route.ts, extended to handle the variable
  // HHRMD/HRMO forward status.
  if (
    validatedData.status &&
    existingRequest.status !== validatedData.status &&
    !isAllowedStatusTransition(existingRequest.status, validatedData.status)
  ) {
    return NextResponse.json(
      { success: false, message: `Invalid status transition from "${existingRequest.status}" to "${validatedData.status}"` },
      { status: 400 }
    );
  }

  // SECURITY: Enforce rejection reason for all rejections
  if (validatedData.status?.toLowerCase().includes('rejected') && !validatedData.rejectionReason) {
    return NextResponse.json(
      { success: false, message: 'Rejection reason is required when rejecting a request' },
      { status: 400 }
    );
  }

  // SECURITY (Q12, Domain 25.3): prevent self-approval / self-rejection.
  // The submitter may only resubmit (correction) or withdraw — not approve or
  // reject their own request. Approval/rejection is detected by the status
  // string, which excludes resubmission ('Pending HRRP Review').
  if (validatedData.status) {
    const statusLower = validatedData.status.toLowerCase();
    const isApprovalOrRejection =
      statusLower.includes('approved') || statusLower.includes('rejected');
    if (isApprovalOrRejection && existingRequest.submittedById === auth.userId) {
      return NextResponse.json(
        { success: false, message: 'Cannot approve or reject your own submission' },
        { status: 403 }
      );
    }
  }

  const updatedRequest = await db.confirmationRequest.update({
    where: { id },
    data: validatedData,
    include: {
      Employee: { select: { name: true, zanId: true } },
      User_ConfirmationRequest_hrrpReviewedByToUser: {
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
      await db.notification.create({
        data: {
          id: uuidv4(),
          userId: userToNotify.id,
          message: `Your Confirmation request has been updated to: ${validatedData.status}.`,
          link: `/dashboard/confirmation`,
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

        logger.info({
          status: validatedData.status,
          isApproval,
          isRejection,
          reviewedById: validatedData.reviewedById,
         }, 'Confirmation status update:');

        if (isApproval) {
          await logRequestApproval({
            requestType: 'Confirmation',
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
          });
          // GAP-M1: HRRP approve also forwards the request to the Commission —
          // log the stage handoff (distinct from the approval verdict above).
          if (
            validatedData.status ===
              'Approved by HRRP - Awaiting Commission Review' &&
            existingRequest.status === 'Pending HRRP Review'
          ) {
            await logRequestForward({
              requestType: 'Confirmation',
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
            requestType: 'Confirmation',
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
          });
        }
      }
    }

    // Send email notification to the HRO submitter on approval/rejection
    const confStatusLower = validatedData.status.toLowerCase();
    const confIsApproval = confStatusLower.includes('approved') && !confStatusLower.includes('rejected');
    const confIsRejection = confStatusLower.includes('rejected');
    if (confIsApproval || confIsRejection) {
      await sendRequestStatusUpdateEmail({
        requestType: 'Confirmation',
        employeeName: updatedRequest.Employee?.name || 'Unknown',
        requestId: id,
        submittedById: updatedRequest.submittedById,
        status: validatedData.status,
        rejectionReason: validatedData.rejectionReason ?? undefined,
        dashboardPath: '/dashboard/confirmation',
      });
    }
  }

  return NextResponse.json(updatedRequest);
}, 'confirmations');

// Export both PUT and PATCH handlers
export const PUT = handleUpdate;
export const PATCH = handleUpdate;

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

  const existingRequest = await db.confirmationRequest.findUnique({
    where: { id },
    include: {
      Employee: { select: { id: true, institutionId: true, name: true, zanId: true } },
    },
  });

  if (!existingRequest) {
    return new NextResponse('Confirmation request not found', { status: 404 });
  }

  // SECURITY: Institution ownership check — HRO/HRRP can only withdraw their
  // own institution's requests.
  if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
    if (
      !existingRequest.Employee ||
      existingRequest.Employee.institutionId !== auth.institutionId
    ) {
      return NextResponse.json(
        { success: false, message: 'Access denied: request belongs to a different institution' },
        { status: 403 }
      );
    }
  }

  // Only the original submitter or an oversight role (Admin/HHRMD) may withdraw.
  const canWithdraw =
    existingRequest.submittedById === auth.userId ||
    ['Admin', 'HHRMD'].includes(auth.role);
  if (!canWithdraw) {
    return NextResponse.json(
      {
        success: false,
        message: 'Only the original submitter or an administrator may withdraw this request',
      },
      { status: 403 }
    );
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
    requestType: 'Confirmation',
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

  await db.confirmationRequest.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Request withdrawn successfully' });
}, 'confirmations-withdraw');

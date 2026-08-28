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
  duration: z.string().optional(),
  reason: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
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
    const existingRequest = await db.lwopRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return new NextResponse('LWOP request not found', { status: 404 });
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
        return NextResponse.json(
          { success: false, message: 'Cannot approve or reject your own submission' },
          { status: 403 }
        );
      }

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
      if (isResubmission && !isHroLike(auth.role) && !isHrrpLike(auth.role)) {
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

    const updatedRequest = await db.lwopRequest.update({
      where: { id },
      data: validatedData,
      include: {
        Employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            department: true,
            cadre: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_LwopRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_LwopRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true },
        },
        User_LwopRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // If LWOP request is approved by Commission, update employee status to "On LWOP"
    if (
      validatedData.status === 'Approved by Commission' &&
      updatedRequest.Employee
    ) {
      await db.employee.update({
        where: { id: updatedRequest.Employee.id },
        data: { status: 'On LWOP' },
      });
      logger.info(
        `Employee ${updatedRequest.Employee.name} status updated to "On LWOP" after LWOP approval`
      );
    }

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
            message: `Your Leave Without Pay request has been updated to: ${validatedData.status}.`,
            link: `/dashboard/lwop`,
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
          const statusLower = validatedData.status.toLowerCase();
          const isApproval =
            statusLower.includes('approved') && !statusLower.includes('rejected');
          const isRejection = statusLower.includes('rejected');

          logger.info({
            status: validatedData.status,
            isApproval,
            isRejection,
            reviewedById: validatedData.reviewedById,
           }, 'LWOP status update:');

          if (isApproval) {
            await logRequestApproval({
              requestType: 'LWOP',
              requestId: id,
              employeeId: updatedRequest.employeeId,
              employeeName: updatedRequest.Employee?.name,
              employeeZanId: updatedRequest.Employee?.zanId ?? undefined,
              approvedById: validatedData.reviewedById,
              approvedByUsername: reviewer.username,
              approvedByRole: reviewer.role || 'Unknown',
              reviewStage: validatedData.reviewStage,
              ipAddress,
              deviceInfo,
              additionalData: {
                duration: updatedRequest.duration,
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
                requestType: 'LWOP',
                requestId: id,
                employeeId: updatedRequest.employeeId,
                employeeName: updatedRequest.Employee?.name,
                employeeZanId: updatedRequest.Employee?.zanId ?? undefined,
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
              requestType: 'LWOP',
              requestId: id,
              employeeId: updatedRequest.employeeId,
              employeeName: updatedRequest.Employee?.name,
              employeeZanId: updatedRequest.Employee?.zanId ?? undefined,
              rejectedById: validatedData.reviewedById,
              rejectedByUsername: reviewer.username,
              rejectedByRole: reviewer.role || 'Unknown',
              rejectionReason: validatedData.rejectionReason ?? undefined,
              reviewStage: validatedData.reviewStage,
              ipAddress,
              deviceInfo,
              additionalData: {
                duration: updatedRequest.duration,
                reason: updatedRequest.reason,
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
          requestType: 'Leave Without Pay',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: validatedData.status,
          rejectionReason: validatedData.rejectionReason ?? undefined,
          dashboardPath: '/dashboard/lwop',
        });
      }
    }

    return NextResponse.json(updatedRequest);
}

// Export both PUT and PATCH handlers
export const PUT = wrapHandler(handleUpdate, 'lwop-requests');
export const PATCH = wrapHandler(handleUpdate, 'lwop-requests');

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

  const existingRequest = await db.lwopRequest.findUnique({
    where: { id },
    include: {
      Employee: { select: { id: true, institutionId: true, name: true, zanId: true } },
    },
  });

  if (!existingRequest) {
    return new NextResponse('LWOP request not found', { status: 404 });
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
    requestType: 'LWOP',
    requestId: id,
    employeeId: existingRequest.employeeId,
    employeeName: existingRequest.Employee?.name,
    employeeZanId: existingRequest.Employee?.zanId ?? undefined,
    withdrawnById: auth.userId,
    withdrawnByUsername: auth.username,
    withdrawnByRole: auth.role,
    withdrawalReason,
    reviewStage: existingRequest.reviewStage,
    ipAddress,
    deviceInfo,
  }).catch(() => {});

  await db.lwopRequest.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Request withdrawn successfully' });
}, 'lwop-requests-withdraw');

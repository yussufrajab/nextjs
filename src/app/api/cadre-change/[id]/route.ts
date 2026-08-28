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
  newCadre: z.string().optional(),
  reason: z.string().optional(),
  studiedOutsideCountry: z.boolean().optional(),
  documents: z.array(z.string()).optional(),
  hrrpReviewedById: z.string().optional(),
  hrrpReviewedAt: z.string().datetime().optional(),
  commissionLetterKey: z.string().optional(),
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
    logger.info({ value: id, body }, 'Updating cadre change request');

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
    const existingRequest = await db.cadreChangeRequest.findUnique({
      where: { id },
      include: { Employee: { select: { id: true, institutionId: true } } },
    });

    if (!existingRequest) {
      return new NextResponse('Cadre change request not found', { status: 404 });
    }

    // SECURITY: Institution ownership check — HRO/HRRP can only modify their own institution's requests
    if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
      if (!existingRequest.Employee || existingRequest.Employee.institutionId !== auth.institutionId) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
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
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
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

      // SECURITY (Q12, Domain 25.3): prevent self-approval / self-rejection.
      // The submitter may only resubmit (correction) or withdraw — not approve
      // or reject their own request.
      if (
        (isHrrpApproval || isHrrpRejection || isCommissionDecision) &&
        existingRequest.submittedById === auth.userId
      ) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
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
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
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
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
          employeeId: existingRequest.employeeId,
          blockReason: 'ROLE_NOT_COMMISSION',
          message: 'Only HHRMD or HRMO can make commission decisions',
          requestMethod: req.method,
          ipAddress,
          deviceInfo,
        });
      }
      if (isResubmission && !['HRO', 'HRRP'].includes(auth.role)) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
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

    const updatedRequest = await db.cadreChangeRequest.update({
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
            employmentDate: true,
            dateOfBirth: true,
            payrollNumber: true,
            zssfNumber: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_CadreChangeRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true, role: true },
        },
        User_CadreChangeRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true, role: true },
        },
        User_CadreChangeRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // If status is updated, create a notification for the employee
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
            message: `Your Change of Cadre request to "${updatedRequest.newCadre}" has been updated to: ${validatedData.status}.`,
            link: `/dashboard/cadre-change`,
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
           }, 'CadreChange status update:');

          if (isApproval) {
            await logRequestApproval({
              requestType: 'CadreChange',
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
                currentCadre: updatedRequest.Employee?.cadre,
                newCadre: updatedRequest.newCadre,
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
                requestType: 'CadreChange',
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
              requestType: 'CadreChange',
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
                currentCadre: updatedRequest.Employee?.cadre,
                newCadre: updatedRequest.newCadre,
              },
            });
          }
        }
      }

      // Send email notification to the HRO submitter on approval/rejection
      const ccStatusLower = validatedData.status.toLowerCase();
      const ccIsApproval = ccStatusLower.includes('approved') && !ccStatusLower.includes('rejected');
      const ccIsRejection = ccStatusLower.includes('rejected');
      if (ccIsApproval || ccIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Cadre Change',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: validatedData.status,
          rejectionReason: validatedData.rejectionReason ?? undefined,
          dashboardPath: '/dashboard/cadre-change',
        });
      }
    }

    // If cadre change request is approved by Commission, update employee cadre
    if (
      validatedData.status &&
      validatedData.status.toLowerCase().includes('commission') &&
      validatedData.status.toLowerCase().includes('approved') &&
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

    logger.info(
      { requestId: updatedRequest.id },
      'Cadre change request updated successfully'
    );
    return NextResponse.json(updatedRequest);
}

// Export both PUT and PATCH handlers
export const PUT = wrapHandler(handleUpdate, 'cadre-change');
export const PATCH = wrapHandler(handleUpdate, 'cadre-change');

async function GETHandler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      return authResult.response!;
    }
    const auth = authResult.context!;

    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

    const request = await db.cadreChangeRequest.findUnique({
      where: { id },
      include: {
        Employee: {
          select: {
            id: true,
            name: true,
            zanId: true,
            department: true,
            cadre: true,
            employmentDate: true,
            dateOfBirth: true,
            payrollNumber: true,
            zssfNumber: true,
            Institution: { select: { id: true, name: true } },
          },
        },
        User_CadreChangeRequest_submittedByIdToUser: {
          select: { id: true, name: true, username: true, role: true },
        },
        User_CadreChangeRequest_reviewedByIdToUser: {
          select: { id: true, name: true, username: true, role: true },
        },
        User_CadreChangeRequest_hrrpReviewedByToUser: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!request) {
      return new NextResponse('Cadre change request not found', {
        status: 404,
      });
    }

    // SECURITY: Institution ownership check — HRO/HRRP can only view their own institution's requests
    if (shouldApplyInstitutionFilter(auth.role, auth.institutionId)) {
      const employeeInstitutionId = request.Employee?.Institution?.id;
      if (employeeInstitutionId !== auth.institutionId) {
        return denyWorkflowAccess({
          auth,
          routeBase: 'cadre-change',
          requestId: id,
          requestType: 'CadreChange',
          employeeId: request.employeeId,
          blockReason: 'INSTITUTION_OWNERSHIP',
          message: 'Access denied: request belongs to a different institution',
          requestMethod: 'GET',
          ipAddress,
          deviceInfo,
        });
      }
    }

    return NextResponse.json(request);
}

export const GET = wrapHandler(GETHandler, 'cadre-change');

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

  const existingRequest = await db.cadreChangeRequest.findUnique({
    where: { id },
    include: {
      Employee: { select: { id: true, institutionId: true, name: true, zanId: true } },
    },
  });

  if (!existingRequest) {
    return new NextResponse('Cadre change request not found', { status: 404 });
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
        routeBase: 'cadre-change',
        requestId: id,
        requestType: 'CadreChange',
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
      routeBase: 'cadre-change',
      requestId: id,
      requestType: 'CadreChange',
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
    requestType: 'CadreChange',
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

  await db.cadreChangeRequest.delete({ where: { id } });

  return NextResponse.json({ success: true, message: 'Request withdrawn successfully' });
}, 'cadre-change-withdraw');

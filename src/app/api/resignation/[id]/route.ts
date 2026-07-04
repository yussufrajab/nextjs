import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { format } from 'date-fns';
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
  rejectionReason: z.string().nullable().optional(),
  reviewedById: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
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
    const existingRequest = await db.resignationRequest.findUnique({
      where: { id },
      include: { Employee: { select: { id: true, institutionId: true } } },
    });

    if (!existingRequest) {
      return new NextResponse('Resignation request not found', { status: 404 });
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

    const updatedRequest = await db.resignationRequest.update({
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
        User_ResignationRequest_submittedByIdToUser: {
          select: { name: true, role: true },
        },
        User_ResignationRequest_reviewedByIdToUser: {
          select: { name: true, role: true },
        },
        User_ResignationRequest_hrrpReviewedByToUser: {
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
            message: `Your Resignation request with effective date ${format(new Date(updatedRequest.effectiveDate), 'PPP')} has been updated to: ${validatedData.status}.`,
            link: `/dashboard/resignation`,
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
           }, 'Resignation status update:');

          if (isApproval) {
            await logRequestApproval({
              requestType: 'Resignation',
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
                effectiveDate: updatedRequest.effectiveDate,
                reason: updatedRequest.reason,
              },
            });
          } else if (isRejection) {
            await logRequestRejection({
              requestType: 'Resignation',
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
                effectiveDate: updatedRequest.effectiveDate,
              },
            });
          }
        }
      }

      // Send email notification to the HRO submitter on approval/rejection
      const resStatusLower = validatedData.status.toLowerCase();
      const resIsApproval = resStatusLower.includes('approved') && !resStatusLower.includes('rejected');
      const resIsRejection = resStatusLower.includes('rejected');
      if (resIsApproval || resIsRejection) {
        await sendRequestStatusUpdateEmail({
          requestType: 'Resignation',
          employeeName: updatedRequest.Employee?.name || 'Unknown',
          requestId: id,
          submittedById: updatedRequest.submittedById,
          status: validatedData.status,
          rejectionReason: validatedData.rejectionReason ?? undefined,
          dashboardPath: '/dashboard/resignation',
        });
      }
    }

    return NextResponse.json(updatedRequest);
}

// Export both PUT and PATCH handlers
export const PUT = wrapHandler(handleUpdate, 'resignation');
export const PATCH = wrapHandler(handleUpdate, 'resignation');

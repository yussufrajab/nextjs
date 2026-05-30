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

const updateSchema = z.object({
  status: z.string().optional(),
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
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    // Get IP and device info for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const deviceInfo = JSON.parse(headers.get('x-device-info') || 'null');

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

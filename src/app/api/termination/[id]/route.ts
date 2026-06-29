import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
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

const updateSchema = z.object({
  status: z.string().optional(),
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

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
              employeeZanId: updatedRequest.Employee?.zanId,
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
          } else if (isRejection) {
            await logRequestRejection({
              requestType: 'CadreChange',
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

    return NextResponse.json(request);
}

export const GET = wrapHandler(GETHandler, 'cadre-change');

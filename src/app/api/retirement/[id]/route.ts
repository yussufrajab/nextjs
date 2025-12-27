import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logRequestApproval, logRequestRejection, getClientIp } from '@/lib/audit-logger';

const updateSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewedById: z.string().optional(),
  retirementType: z.string().optional(),
  proposedDate: z.string().optional(),
  illnessDescription: z.string().nullable().optional(),
  delayReason: z.string().nullable().optional(),
  documents: z.array(z.string()).optional(),
});

async function handleUpdate(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateSchema.parse(body);

    // Get IP and user agent for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const userAgent = headers.get('user-agent');

    const updatedRequest = await db.retirementRequest.update({
      where: { id },
      data: validatedData,
      include: {
        Employee: { select: { name: true, zanId: true, department: true, cadre: true, employmentDate: true, dateOfBirth: true, Institution: { select: { name: true } }, payrollNumber: true, zssfNumber: true }},
        User_RetirementRequest_submittedByIdToUser: { select: { name: true, role: true } },
        User_RetirementRequest_reviewedByIdToUser: { select: { name: true, role: true } },
      }
    });

    if (validatedData.status) {
      const userToNotify = await db.User.findUnique({
        where: { employeeId: updatedRequest.employeeId },
        select: { id: true }
      });

      if (userToNotify) {
        await db.notification.create({
          data: {
            id: uuidv4(),
            userId: userToNotify.id,
            message: `Your ${updatedRequest.retirementType} Retirement request has been updated to: ${validatedData.status}.`,
            link: `/dashboard/retirement`,
          },
        });
      }

      // Log audit event for approvals and rejections
      if (validatedData.reviewedById && validatedData.status) {
        const reviewer = await db.User.findUnique({
          where: { id: validatedData.reviewedById },
          select: { username: true, role: true }
        });

        if (reviewer) {
          // Check if status contains "Approved" or "Rejected" (case-insensitive)
          const statusLower = validatedData.status.toLowerCase();
          const isApproval = statusLower.includes('approved') && !statusLower.includes('rejected');
          const isRejection = statusLower.includes('rejected');

          console.log('[AUDIT] Retirement status update:', {
            status: validatedData.status,
            isApproval,
            isRejection,
            reviewedById: validatedData.reviewedById,
          });

          if (isApproval) {
            await logRequestApproval({
              requestType: 'Retirement',
              requestId: id,
              employeeId: updatedRequest.employeeId,
              employeeName: updatedRequest.Employee?.name,
              employeeZanId: updatedRequest.Employee?.zanId,
              approvedById: validatedData.reviewedById,
              approvedByUsername: reviewer.username,
              approvedByRole: reviewer.role || 'Unknown',
              reviewStage: validatedData.reviewStage,
              ipAddress,
              userAgent,
              additionalData: {
                retirementType: updatedRequest.retirementType,
                proposedDate: updatedRequest.proposedDate,
              },
            });
          } else if (isRejection) {
            await logRequestRejection({
              requestType: 'Retirement',
              requestId: id,
              employeeId: updatedRequest.employeeId,
              employeeName: updatedRequest.Employee?.name,
              employeeZanId: updatedRequest.Employee?.zanId,
              rejectedById: validatedData.reviewedById,
              rejectedByUsername: reviewer.username,
              rejectedByRole: reviewer.role || 'Unknown',
              rejectionReason: validatedData.rejectionReason,
              reviewStage: validatedData.reviewStage,
              ipAddress,
              userAgent,
              additionalData: {
                retirementType: updatedRequest.retirementType,
              },
            });
          }
        }
      }
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[RETIREMENT_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Export both PUT and PATCH handlers
export const PUT = handleUpdate;
export const PATCH = handleUpdate;

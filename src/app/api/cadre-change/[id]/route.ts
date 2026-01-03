import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  logRequestApproval,
  logRequestRejection,
  getClientIp,
} from '@/lib/audit-logger';

const updateSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewedById: z.string().optional(),
  newCadre: z.string().optional(),
  reason: z.string().optional(),
  studiedOutsideCountry: z.boolean().optional(),
  documents: z.array(z.string()).optional(),
});

async function handleUpdate(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    console.log('Updating cadre change request:', id, body);

    const validatedData = updateSchema.parse(body);

    // Get IP and user agent for audit logging
    const headers = new Headers(req.headers);
    const ipAddress = getClientIp(headers);
    const userAgent = headers.get('user-agent');

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

          console.log('[AUDIT] CadreChange status update:', {
            status: validatedData.status,
            isApproval,
            isRejection,
            reviewedById: validatedData.reviewedById,
          });

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
              userAgent,
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
              userAgent,
              additionalData: {
                currentCadre: updatedRequest.Employee?.cadre,
                newCadre: updatedRequest.newCadre,
              },
            });
          }
        }
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
      console.log(
        `Employee ${updatedRequest.Employee.name} cadre updated to "${updatedRequest.newCadre}" after cadre change approval`
      );
    }

    console.log(
      'Cadre change request updated successfully:',
      updatedRequest.id
    );
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('[CADRE_CHANGE_PUT]', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Export both PUT and PATCH handlers
export const PUT = handleUpdate;
export const PATCH = handleUpdate;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      },
    });

    if (!request) {
      return new NextResponse('Cadre change request not found', {
        status: 404,
      });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('[CADRE_CHANGE_GET_BY_ID]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

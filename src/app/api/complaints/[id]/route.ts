import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

const updateComplaintSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  officerComments: z.string().optional(),
  internalNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  assignedOfficerRole: z.string().optional(),
  reviewedById: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validatedData = updateComplaintSchema.parse(body);

    const updatedComplaint = await db.complaint.update({
      where: { id },
      data: validatedData,
      include: {
        User_Complaint_complainantIdToUser: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            Institution: { select: { name: true } },
          },
        },
        User_Complaint_reviewedByIdToUser: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Create appropriate notifications based on status changes
    if (
      validatedData.status &&
      updatedComplaint.User_Complaint_complainantIdToUser
    ) {
      let notification = null;

      if (validatedData.status === 'Resolved - Pending Employee Confirmation') {
        notification = NotificationTemplates.complaintResolved(
          updatedComplaint.id
        );
      } else if (validatedData.status === 'Awaiting More Information') {
        notification = NotificationTemplates.complaintMoreInfoRequested(
          updatedComplaint.id
        );
      } else {
        // Generic status update notification
        notification = {
          message: `Lalamiko lako "${updatedComplaint.subject}" limesasishwa: ${validatedData.status}`,
          link: `/dashboard/complaints`,
        };
      }

      if (notification) {
        await createNotification({
          userId: updatedComplaint.User_Complaint_complainantIdToUser.id,
          message: notification.message,
          link: notification.link,
        });
      }
    }

    // If the complainant has an employeeId, fetch employee details separately
    let employeeDetails = null;
    if (updatedComplaint.User_Complaint_complainantIdToUser.employeeId) {
      employeeDetails = await db.employee.findUnique({
        where: {
          id: updatedComplaint.User_Complaint_complainantIdToUser.employeeId,
        },
        select: {
          zanId: true,
          department: true,
          cadre: true,
        },
      });
    }

    // Format the response to match frontend expectations
    const formattedResponse = {
      ...updatedComplaint,
      User_Complaint_complainantIdToUser: {
        ...updatedComplaint.User_Complaint_complainantIdToUser,
        Employee: employeeDetails,
      },
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('[COMPLAINT_PUT]', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

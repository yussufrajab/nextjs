import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateComplaintSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  officerComments: z.string().optional(),
  internalNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  assignedOfficerRole: z.string().optional(),
  reviewedById: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const validatedData = updateComplaintSchema.parse(body);

    const updatedComplaint = await db.complaint.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        complainant: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            institution: { select: { name: true } },
          },
        },
        reviewedBy: {
          select: {
            name: true,
            role: true,
          }
        }
      },
    });

    // Create a notification for the user when status changes
    if (validatedData.status) {
      await db.notification.create({
        data: {
          userId: updatedComplaint.complainant.id,
          message: `Your complaint "${updatedComplaint.subject}" has been updated to: ${validatedData.status}.`,
          link: `/dashboard/complaints`, // Link to the complaints page
        },
      });
    }

    // If the complainant has an employeeId, fetch employee details separately
    let employeeDetails = null;
    if (updatedComplaint.complainant.employeeId) {
      employeeDetails = await db.employee.findUnique({
        where: { id: updatedComplaint.complainant.employeeId },
        select: {
          zanId: true,
          department: true,
          cadre: true,
        }
      });
    }

    // Format the response to match frontend expectations
    const formattedResponse = {
      ...updatedComplaint,
      complainant: {
        ...updatedComplaint.complainant,
        employee: employeeDetails
      }
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("[COMPLAINT_PUT]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
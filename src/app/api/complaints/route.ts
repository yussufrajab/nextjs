import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import { createNotificationForRole, NotificationTemplates } from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';

const complaintSchema = z.object({
  complaintType: z.string().min(1),
  subject: z.string().min(5),
  complaintText: z.string().min(20),
  complainantPhoneNumber: z.string(),
  nextOfKinPhoneNumber: z.string(),
  attachments: z.array(z.string()).optional(),
  complainantId: z.string().min(1),
  assignedOfficerRole: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      complaintType, 
      subject, 
      complaintText, 
      complainantPhoneNumber, 
      nextOfKinPhoneNumber,
      attachments, 
      complainantId, 
      assignedOfficerRole 
    } = complaintSchema.parse(body);

    const newComplaint = await db.complaint.create({
      data: {
        id: uuidv4(),
        complaintType,
        subject,
        details: complaintText,
        complainantPhoneNumber,
        nextOfKinPhoneNumber,
        attachments: attachments || [],
        complainantId,
        status: "Submitted",
        reviewStage: 'initial',
        assignedOfficerRole: assignedOfficerRole || ROLES.DO || 'DO',
        updatedAt: new Date(),
      },
    });

    // Get complainant's name for notification
    const complainant = await db.user.findUnique({
      where: { id: complainantId },
      select: { name: true },
    });

    // Create notification for officers
    if (complainant && complainant.name) {
      const notification = NotificationTemplates.complaintSubmitted(
        complainant.name,
        newComplaint.id,
        subject
      );
      const doRole = ROLES.DO || 'DO';
      const hhrmdRole = ROLES.HHRMD || 'HHRMD';
      await createNotificationForRole(doRole, notification.message, notification.link);
      await createNotificationForRole(hhrmdRole, notification.message, notification.link);
    }

    return NextResponse.json(newComplaint, { status: 201 });
  } catch (error) {
    console.error("[COMPLAINTS_POST]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const userRole = searchParams.get('userRole');

  if (!userId || !userRole) {
    return new NextResponse("User ID and Role are required", { status: 400 });
  }

  try {
    let complaints;
    const includeOptions = {
      User_Complaint_complainantIdToUser: {
        select: {
          name: true,
          employeeId: true,
          Employee: {
            select: {
              zanId: true,
              department: true,
              cadre: true,
            }
          },
          Institution: { select: { name: true } }
        }
      },
      User_Complaint_reviewedByIdToUser: {
        select: {
          name: true,
          role: true,
        }
      }
    };

    if (userRole === ROLES.EMPLOYEE) {
      complaints = await db.complaint.findMany({
        where: { complainantId: userId },
        orderBy: { createdAt: 'desc' },
        include: includeOptions,
      });
    } else if (userRole === ROLES.DO || userRole === ROLES.HHRMD) {
      // Both DO and HHRMD can see all complaints (including completed ones as history)
      const doRole = ROLES.DO || 'DO';
      const hhrmdRole = ROLES.HHRMD || 'HHRMD';
      complaints = await db.complaint.findMany({
        where: {
          OR: [
            { assignedOfficerRole: doRole },
            { assignedOfficerRole: hhrmdRole }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: includeOptions,
      });
    } else {
        // For higher roles like Admin/CSCS, might want to see all
        complaints = await db.complaint.findMany({
            orderBy: { createdAt: 'desc' },
            include: includeOptions,
        });
    }

    // Map the response to match frontend expectations
    const formattedComplaints = complaints.map(c => ({
        id: c.id,
        employeeId: c.User_Complaint_complainantIdToUser.employeeId,
        employeeName: c.User_Complaint_complainantIdToUser.name,
        zanId: c.User_Complaint_complainantIdToUser.Employee?.zanId,
        department: c.User_Complaint_complainantIdToUser.Employee?.department,
        cadre: c.User_Complaint_complainantIdToUser.Employee?.cadre,
        complaintType: c.complaintType,
        subject: c.subject,
        details: c.details,
        complainantPhoneNumber: c.complainantPhoneNumber,
        nextOfKinPhoneNumber: c.nextOfKinPhoneNumber,
        submissionDate: c.createdAt.toISOString(),
        status: c.status,
        attachments: c.attachments,
        officerComments: c.officerComments,
        internalNotes: c.internalNotes,
        assignedOfficerRole: c.assignedOfficerRole,
        reviewStage: c.reviewStage,
        rejectionReason: c.rejectionReason,
        reviewedBy: c.User_Complaint_reviewedByIdToUser?.role,
    }));

    return NextResponse.json(formattedComplaints);
  } catch (error) {
    console.error("[COMPLAINTS_GET]", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
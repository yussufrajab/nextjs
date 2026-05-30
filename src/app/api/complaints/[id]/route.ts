import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { sendRequestStatusUpdateEmail } from '@/lib/email';
import { logComplaintAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const updateComplaintSchema = z.object({
  status: z.string().optional(),
  reviewStage: z.string().optional(),
  complaintType: z.string().optional(),
  subject: z.string().optional(),
  details: z.string().optional(),
  complainantPhoneNumber: z.string().optional(),
  nextOfKinPhoneNumber: z.string().optional(),
  officerComments: z.string().optional(),
  internalNotes: z.string().optional(),
  officerInternalNote: z.string().optional(),
  rejectionReason: z.string().nullable().optional(),
  assignedOfficerRole: z.string().optional(),
  reviewedById: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;

export const PUT = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const body = await req.json();
  const validatedData = updateComplaintSchema.parse(body);

  // Map officerInternalNote → internalNotes and strip it from the Prisma payload
  const { officerInternalNote, ...prismaData } = validatedData;
  const dbData = {
    ...prismaData,
    ...(officerInternalNote
      ? { internalNotes: officerInternalNote }
      : {}),
  };

  const updatedComplaint = await db.complaint.update({
    where: { id },
    data: dbData,
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

    // Send email notification to the complainant on status changes
    const complaintStatusLower = validatedData.status.toLowerCase();
    const complaintIsApproval = complaintStatusLower.includes('resolved') || complaintStatusLower.includes('approved');
    const complaintIsRejection = complaintStatusLower.includes('rejected');
    if (complaintIsApproval || complaintIsRejection) {
      await sendRequestStatusUpdateEmail({
        requestType: 'Complaint',
        employeeName: updatedComplaint.User_Complaint_complainantIdToUser.name || 'Unknown',
        requestId: id,
        submittedById: updatedComplaint.complainantId,
        status: validatedData.status,
        rejectionReason: validatedData.rejectionReason ?? undefined,
        dashboardPath: '/dashboard/complaints',
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

  // Audit log: complaint updated or resolved
  const reviewedByUser = updatedComplaint.User_Complaint_reviewedByIdToUser;
  await logComplaintAction({
    action: updatedComplaint.status === 'Resolved' ? 'RESOLVED' : 'UPDATED',
    complaintId: updatedComplaint.id,
    subject: updatedComplaint.subject,
    performedById: validatedData.reviewedById || updatedComplaint.complainantId,
    performedByUsername: reviewedByUser?.name || 'unknown',
    performedByRole: reviewedByUser?.role || 'unknown',
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    additionalData: { newStatus: updatedComplaint.status },
  }).catch(() => {});

  return NextResponse.json(formattedResponse);
}, 'complaints');

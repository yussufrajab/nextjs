import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { sendRequestStatusUpdateEmail } from '@/lib/email';
import { logComplaintAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

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
  // SECURITY: Require authentication
  const { verifyAuth } = await import('@/lib/api-auth');
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const { id } = await params;
  const body = await req.json();
  const validatedData = updateComplaintSchema.parse(body);

  // SECURITY: Fetch existing complaint for ownership/status checks
  const existingComplaint = await db.complaint.findUnique({
    where: { id },
    select: {
      id: true,
      complainantId: true,
      status: true,
      assignedOfficerRole: true,
    },
  });

  if (!existingComplaint) {
    return NextResponse.json(
      { success: false, message: 'Complaint not found' },
      { status: 404 }
    );
  }

  // SECURITY: Role-based access control
  const userRole = auth.role;
  const isOfficerRole = ['DO', 'HHRMD', 'Admin', 'CSCS', 'HRMO'].includes(userRole);
  const isComplainant = existingComplaint.complainantId === auth.userId;

  // EMPLOYEE can only update their own complaint (e.g., add more info)
  if (userRole === 'EMPLOYEE') {
    if (!isComplainant) {
      return NextResponse.json(
        { success: false, message: 'Access denied: you can only update your own complaint' },
        { status: 403 }
      );
    }
    // EMPLOYEE can only update limited fields
    const allowedEmployeeFields = ['details', 'complainantPhoneNumber', 'nextOfKinPhoneNumber', 'attachments'];
    const attemptedFields = Object.keys(validatedData);
    const disallowedFields = attemptedFields.filter(f => !allowedEmployeeFields.includes(f));
    if (disallowedFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Employees can only update: ${allowedEmployeeFields.join(', ')}` },
        { status: 403 }
      );
    }
  } else if (!isOfficerRole) {
    // HRO, HRRP, and other non-officer roles cannot update complaints
    return NextResponse.json(
      { success: false, message: 'Access denied: insufficient permissions to update complaints' },
      { status: 403 }
    );
  } else {
    // Officer role (DO, HHRMD, Admin, CSCS, HRMO).
    // SECURITY (Req 9.7): only the officer role assigned to this complaint
    // (or an Admin override) may act on it — not just any officer. Without
    // this, any DO/HHRMD/CSCS/HRMO could resolve a complaint routed to a
    // different officer role. When assignedOfficerRole is unset, any officer
    // may still act (backward-compatible with legacy/unassigned rows).
    if (
      existingComplaint.assignedOfficerRole &&
      userRole !== existingComplaint.assignedOfficerRole &&
      userRole !== 'Admin'
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Access denied: this complaint is assigned to the ${existingComplaint.assignedOfficerRole} officer`,
        },
        { status: 403 }
      );
    }
  }

  // SECURITY: Status transition validation (only for officer roles)
  if (validatedData.status && isOfficerRole) {
    const VALID_TRANSITIONS: Record<string, string[]> = {
      'Submitted': ['Under Review', 'Awaiting More Information'],
      'Under Review': ['Resolved - Pending Employee Confirmation', 'Awaiting More Information', 'Closed - Commission Decision (Resolved)', 'Closed - Commission Decision (Rejected)'],
      'Awaiting More Information': ['Under Review', 'Resolved - Pending Employee Confirmation'],
      'Resolved - Pending Employee Confirmation': ['Closed - Satisfied', 'Under Review'],
    };
    const allowedNext = VALID_TRANSITIONS[existingComplaint.status] || [];
    if (!allowedNext.includes(validatedData.status)) {
      return NextResponse.json(
        { success: false, message: `Invalid status transition from "${existingComplaint.status}" to "${validatedData.status}". Allowed: ${allowedNext.join(', ') || 'none'}` },
        { status: 400 }
      );
    }
  }

  // SECURITY: reviewedById comes from authenticated session, not client
  const dbData: any = { ...validatedData };
  delete dbData.reviewedById;
  delete dbData.officerInternalNote;
  if (body.officerInternalNote) {
    dbData.internalNotes = body.officerInternalNote;
  }

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

  // Audit log: complaint updated or resolved (using authenticated user identity)
  await logComplaintAction({
    action: updatedComplaint.status === 'Resolved' ? 'RESOLVED' : 'UPDATED',
    complaintId: updatedComplaint.id,
    subject: updatedComplaint.subject,
    performedById: auth.userId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    additionalData: { newStatus: updatedComplaint.status },
  }).catch(() => {});

  return NextResponse.json(formattedResponse);
}, 'complaints');

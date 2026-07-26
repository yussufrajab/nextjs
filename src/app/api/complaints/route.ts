import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import {
  createNotificationForRole,
  NotificationTemplates,
} from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';
import { sendRequestSubmissionEmails } from '@/lib/email';
import { logComplaintAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import { sanitizeText } from '@/lib/sanitize-input';
import {
  resolveConfidential,
  REDACTED_COMPLAINANT_NAME,
} from '@/lib/complaint-confidentiality';
import { redactComplainantPii } from '@/lib/complaint-privacy';

const complaintSchema = z.object({
  complaintType: z.string().min(1),
  subject: z.string().min(5),
  complaintText: z.string().min(20),
  complainantPhoneNumber: z.string(),
  nextOfKinPhoneNumber: z.string(),
  attachments: z.array(z.string()).optional(),
  // complainantId is now derived from auth session, not client
  assignedOfficerRole: z.string().optional(),
  // Req 9.6: submitter may request confidentiality; harassment complaints are
  // always confidential (see resolveConfidential).
  confidential: z.boolean().optional(),
});

export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
  const body = await req.json();
  const {
    complaintType,
    subject,
    complaintText,
    complainantPhoneNumber,
    nextOfKinPhoneNumber,
    attachments,
    assignedOfficerRole,
    confidential: requestedConfidential,
  } = complaintSchema.parse(body);

  // SECURITY: Use authenticated user ID, not client-supplied one
  const complainantId = auth.userId;

  // Req 9.6: harassment complaints are always confidential; other types honor
  // the submitter's request.
  const confidential = resolveConfidential(complaintType, requestedConfidential);

  const newComplaint = await db.complaint.create({
    data: {
      id: uuidv4(),
      complaintType: sanitizeText(complaintType),
      subject: sanitizeText(subject),
      details: sanitizeText(complaintText),
      complainantPhoneNumber,
      nextOfKinPhoneNumber,
      attachments: attachments || [],
      complainantId,
      status: 'Submitted',
      reviewStage: 'initial',
      assignedOfficerRole: assignedOfficerRole || ROLES.DO || 'DO',
      confidential,
      updatedAt: new Date(),
    },
  });

  // Get complainant's name for notification
  const complainant = await db.user.findUnique({
    where: { id: complainantId },
    select: { name: true },
  });

  // Req 9.6: for confidential complaints, never broadcast the complainant's
  // real name in officer notifications / emails — only the redacted label.
  const displayName =
    confidential && complainant?.name
      ? REDACTED_COMPLAINANT_NAME
      : complainant?.name;

  // Create notification for officers
  if (displayName) {
    const notification = NotificationTemplates.complaintSubmitted(
      displayName,
      newComplaint.id,
      subject
    );
    const doRole = ROLES.DO || 'DO';
    const hhrmdRole = ROLES.HHRMD || 'HHRMD';
    await createNotificationForRole(
      doRole,
      notification.message,
      notification.link
    );
    await createNotificationForRole(
      hhrmdRole,
      notification.message,
      notification.link
    );
    const hrmoRole = ROLES.HRMO || 'HRMO';
    await createNotificationForRole(
      hrmoRole,
      notification.message,
      notification.link
    );

    // Send email notifications to CSC reviewers
    await sendRequestSubmissionEmails({
      requestType: 'Complaint',
      employeeName: displayName,
      requestId: newComplaint.id,
      submittedByName: displayName,
      dashboardPath: '/dashboard/complaints',
    });
  }

  // Audit log: complaint submitted
  // SECURITY (Q3): attribute the action to the authenticated user, not the
  // client-supplied complainantId, so the audit trail cannot be spoofed.
  // The DB row already uses the trusted auth.userId (above); the audit row
  // must match it for non-repudiation.
  await logComplaintAction({
    action: 'SUBMITTED',
    complaintId: newComplaint.id,
    complainantId: auth.userId,
    subject,
    performedById: auth.userId,
    performedByUsername: complainant?.name || 'unknown',
    performedByRole: auth.role,
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  return NextResponse.json(newComplaint, { status: 201 });
}), 'complaints');

export const GET = wrapHandler(withAuth(async (req: Request, { auth }) => {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') || '50', 10) || 50));
  const status = searchParams.get('status') || 'all';

  // SECURITY: Use authenticated user context, not client-supplied params
  const userId = auth.userId;
  const userRole = auth.role;

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
          },
        },
        Institution: { select: { name: true } },
      },
    },
    User_Complaint_reviewedByIdToUser: {
      select: {
        name: true,
        role: true,
      },
    },
  };

  // Build base where clause based on role
  let baseWhere: any = {};
  if (userRole === ROLES.EMPLOYEE) {
    baseWhere = { complainantId: userId };
  } else if (userRole === ROLES.DO || userRole === ROLES.HHRMD) {
    const doRole = ROLES.DO || 'DO';
    const hhrmdRole = ROLES.HHRMD || 'HHRMD';
    baseWhere = {
      OR: [
        { assignedOfficerRole: doRole },
        { assignedOfficerRole: hhrmdRole },
      ],
    };
  }
  // else: Admin/CSCS sees all (empty where)

  // Apply status filter using AND to combine with role-based conditions
  const closedStatuses = ['Closed - Satisfied', 'Mtumishi ameridhika na hatua', 'Closed - Commission Decision (Resolved)', 'Closed - Commission Decision (Rejected)'];
  const resolvedStatuses = ['Closed - Satisfied', 'Mtumishi ameridhika na hatua', 'Closed - Commission Decision (Resolved)'];
  const rejectedStatuses = ['Closed - Commission Decision (Rejected)'];

  let statusFilterWhere: any = {};
  if (status && status !== 'all') {
    if (status === 'pending') {
      statusFilterWhere = { status: { notIn: closedStatuses } };
    } else if (status === 'resolved') {
      statusFilterWhere = { status: { in: resolvedStatuses } };
    } else if (status === 'rejected') {
      statusFilterWhere = { status: { in: rejectedStatuses } };
    }
  }

  // Combine role-based and status-based filters with AND
  const finalWhere: any = Object.keys(statusFilterWhere).length > 0
    ? { AND: [baseWhere, statusFilterWhere] }
    : baseWhere;

  const [complaints, total] = await Promise.all([
    db.complaint.findMany({
      where: finalWhere,
      orderBy: { createdAt: 'desc' },
      include: includeOptions,
      skip: (page - 1) * size,
      take: size,
    }),
    db.complaint.count({ where: finalWhere }),
  ]);

  // SECURITY: Only complaint-reviewing roles and Admin can see internalNotes and officerComments
  const canSeeInternalNotes = ['Admin', 'DO', 'HHRMD', 'CSCS'].includes(userRole);

  // Map the response to match frontend expectations
  const formattedComplaints = complaints.map((c) => {
    const row = {
      id: c.id,
      complainantId: c.complainantId, // decision-only; redactComplainantPii strips it from output
      employeeId: c.User_Complaint_complainantIdToUser.employeeId,
      employeeName: c.User_Complaint_complainantIdToUser.name,
      zanId: c.User_Complaint_complainantIdToUser.Employee?.zanId,
      department: c.User_Complaint_complainantIdToUser.Employee?.department,
      cadre: c.User_Complaint_complainantIdToUser.Employee?.cadre,
      institutionName: c.User_Complaint_complainantIdToUser.Institution?.name,
      complaintType: c.complaintType,
      subject: c.subject,
      details: c.details,
      complainantPhoneNumber: c.complainantPhoneNumber,
      nextOfKinPhoneNumber: c.nextOfKinPhoneNumber,
      submissionDate: c.createdAt.toISOString(),
      status: c.status,
      attachments: c.attachments,
      officerComments: canSeeInternalNotes ? c.officerComments : null,
      internalNotes: canSeeInternalNotes ? c.internalNotes : null,
      assignedOfficerRole: c.assignedOfficerRole,
      reviewStage: c.reviewStage,
      rejectionReason: c.rejectionReason,
      reviewedBy: c.User_Complaint_reviewedByIdToUser?.role,
      confidential: c.confidential,
    };

    // SECURITY (Req 9.6): mask complainant identity PII for viewers lacking
    // need-to-know. The complainant, the specifically-assigned officer, and
    // (for non-confidential complaints) Admin/CSCS see the full identity;
    // everyone else sees zanId/phones masked to ***1234, employeeId dropped,
    // and employeeName as initials. complainantId is stripped from output.
    return redactComplainantPii(row, {
      viewerRole: userRole,
      viewerUserId: userId,
      assignedOfficerId: c.reviewedById ?? null,
    });
  });

  return NextResponse.json({
    data: formattedComplaints,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / size),
      size,
    },
  });
}), 'complaints');

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

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json();
  const {
    complaintType,
    subject,
    complaintText,
    complainantPhoneNumber,
    nextOfKinPhoneNumber,
    attachments,
    complainantId,
    assignedOfficerRole,
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
      status: 'Submitted',
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
      employeeName: complainant.name,
      requestId: newComplaint.id,
      submittedByName: complainant.name,
      dashboardPath: '/dashboard/complaints',
    });
  }

  // Audit log: complaint submitted
  await logComplaintAction({
    action: 'SUBMITTED',
    complaintId: newComplaint.id,
    complainantId: body.complainantId,
    subject: body.subject,
    performedById: body.complainantId,
    performedByUsername: complainant?.name || 'unknown',
    performedByRole: 'EMPLOYEE',
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  return NextResponse.json(newComplaint, { status: 201 });
}, 'complaints');

export const GET = wrapHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const userRole = searchParams.get('userRole');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = parseInt(searchParams.get('size') || '50', 10);
  const status = searchParams.get('status') || 'all';

  if (!userId || !userRole) {
    return new NextResponse('User ID and Role are required', { status: 400 });
  }

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

  // Map the response to match frontend expectations
  const formattedComplaints = complaints.map((c) => ({
    id: c.id,
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
    officerComments: c.officerComments,
    internalNotes: c.internalNotes,
    assignedOfficerRole: c.assignedOfficerRole,
    reviewStage: c.reviewStage,
    rejectionReason: c.rejectionReason,
    reviewedBy: c.User_Complaint_reviewedByIdToUser?.role,
  }));

  return NextResponse.json({
    data: formattedComplaints,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / size),
      size,
    },
  });
}, 'complaints');

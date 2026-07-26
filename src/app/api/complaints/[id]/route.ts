import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { sendRequestStatusUpdateEmail } from '@/lib/email';
import { logComplaintAction, getClientIp } from '@/lib/audit-logger';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';
import {
  canSeeComplainantIdentity,
  resolveConfidential,
  REDACTED_COMPLAINANT_NAME,
} from '@/lib/complaint-confidentiality';
import { redactComplainantPii } from '@/lib/complaint-privacy';
import { denyWorkflowAccess } from '@/lib/workflow-access';

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
  // Req 9.6: officers may classify a complaint confidential. Employees may
  // not (excluded from EMPLOYEE_ALLOWED_FIELDS below). Harassment complaints
  // remain confidential regardless (resolveConfidential).
  confidential: z.boolean().optional(),
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
      confidential: true,
      complaintType: true,
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

  // EMPLOYEE can only update their own complaint, and only through the
  // employee-facing workflow actions: resubmit after a rejection, provide
  // requested info, confirm satisfaction, or appeal to the commission.
  if (userRole === 'EMPLOYEE') {
    if (!isComplainant) {
      return NextResponse.json(
        { success: false, message: 'Access denied: you can only update your own complaint' },
        { status: 403 }
      );
    }
    // SECURITY: employees may not touch officer-only fields. They can edit
    // their own complaint content plus the fields the employee actions
    // legitimately write (status via the transition check below, resubmit
    // metadata, the appended officerComments on provide-info, and the
    // appeal reason via officerInternalNote). assignedOfficerRole and
    // reviewedById are excluded — the latter is also stripped server-side.
    const EMPLOYEE_ALLOWED_FIELDS = new Set([
      'complaintType',
      'subject',
      'details',
      'complainantPhoneNumber',
      'nextOfKinPhoneNumber',
      'attachments',
      'status',
      'reviewStage',
      'rejectionReason',
      'officerComments',
      'officerInternalNote',
    ]);
    const attemptedFields = Object.keys(validatedData);
    const disallowedFields = attemptedFields.filter(
      (f) => !EMPLOYEE_ALLOWED_FIELDS.has(f)
    );
    if (disallowedFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Access denied: employees cannot update ${disallowedFields.join(', ')}`,
        },
        { status: 403 }
      );
    }
    // SECURITY: employees may only move their complaint to an employee-allowed
    // status from a valid source state. This prevents an employee from setting
    // an officer-only status (e.g. resolving/closing their own complaint).
    if (validatedData.status) {
      const current = existingComplaint.status;
      const EMPLOYEE_TRANSITIONS: Record<string, string[]> = {
        'Awaiting More Information': ['Under Review - Additional Information Provided'],
        'Resolved - Pending Employee Confirmation': [
          'Mtumishi ameridhika na hatua',
          'Appealed to Commission',
        ],
      };
      const isResubmit =
        current.startsWith('Rejected by') && validatedData.status === 'Submitted';
      const allowed = EMPLOYEE_TRANSITIONS[current] || [];
      if (!isResubmit && !allowed.includes(validatedData.status)) {
        return NextResponse.json(
          {
            success: false,
            message: `Access denied: you cannot set status "${validatedData.status}" on your complaint`,
          },
          { status: 403 }
        );
      }
    }
  } else if (!isOfficerRole) {
    // HRO, HRRP, and other non-officer roles cannot update complaints
    return NextResponse.json(
      { success: false, message: 'Access denied: insufficient permissions to update complaints' },
      { status: 403 }
    );
  } else {
    // Officer role (DO, HHRMD, Admin, CSCS, HRMO).
    // SECURITY (Req 9.7): only complaint-handling officers may act on a
    // complaint — not just any officer. The complaint workflow is tier-based,
    // not single-role:
    //   - DO and HHRMD are co-reviewers of the same complaint (the GET list
    //     and route permissions expose each to complaints assigned to either),
    //     so they may act on each other's assigned complaints.
    //   - CSCS (Civil Service Commission Secretary) is the escalation/
    //     commission tier: it sees every complaint and issues commission
    //     decisions, so it may act on any complaint regardless of assignment.
    //   - Admin overrides everything.
    //   - HRMO (and any other non-handler officer) may NOT act — this is the
    //     attack the strict check was added to prevent, and it is preserved
    //     here by not including HRMO in the handler set.
    // When assignedOfficerRole is unset, any handler may still act
    // (backward-compatible with legacy/unassigned rows).
    const COMPLAINT_HANDLERS = ['DO', 'HHRMD', 'CSCS'];
    const isHandler =
      COMPLAINT_HANDLERS.includes(userRole) || userRole === 'Admin';
    if (!isHandler) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Access denied: insufficient permissions to update complaints',
        },
        { status: 403 }
      );
    }
    const assigned = existingComplaint.assignedOfficerRole;
    if (assigned) {
      const sameTier =
        userRole === assigned ||
        (userRole === 'DO' && assigned === 'HHRMD') ||
        (userRole === 'HHRMD' && assigned === 'DO') ||
        userRole === 'CSCS' ||
        userRole === 'Admin';
      if (!sameTier) {
        return NextResponse.json(
          {
            success: false,
            message: `Access denied: this complaint is assigned to the ${assigned} officer`,
          },
          { status: 403 }
        );
      }
    }
  }

  // SECURITY: Status transition validation (only for officer roles).
  // The workflow is tier-based: from an open review state an officer (DO/HHRMD)
  // or the commission (CSCS) may reject, request more info, resolve, or issue a
  // commission decision. The "Rejected by <role> – Waiting submitter reaction"
  // status is role-suffixed, so it is matched by prefix rather than enumerated.
  // Terminal/closed states are not valid sources (a closed complaint is final).
  if (validatedData.status && isOfficerRole) {
    const REVIEW_STATES = [
      'Submitted',
      'Under Review',
      'Awaiting More Information',
      'Under Review - Additional Information Provided',
    ];
    const isRejection = validatedData.status.startsWith('Rejected by');
    const ACTION_TARGETS = [
      'Under Review',
      'Awaiting More Information',
      'Resolved - Pending Employee Confirmation',
      'Closed - Commission Decision (Resolved)',
      'Closed - Commission Decision (Rejected)',
    ];
    const VALID_TRANSITIONS: Record<string, string[]> = {
      'Submitted': ACTION_TARGETS,
      'Under Review': ACTION_TARGETS,
      'Under Review - Additional Information Provided': ACTION_TARGETS,
      'Awaiting More Information': [
        'Under Review',
        'Resolved - Pending Employee Confirmation',
        'Closed - Commission Decision (Resolved)',
        'Closed - Commission Decision (Rejected)',
      ],
      // Submitter appealed a rejection — only the commission can close it.
      'Appealed to Commission': [
        'Closed - Commission Decision (Resolved)',
        'Closed - Commission Decision (Rejected)',
      ],
      // Employee asked to reopen after resolution — back to review.
      'Resolved - Pending Employee Confirmation': ['Under Review'],
    };
    const allowedNext = VALID_TRANSITIONS[existingComplaint.status] || [];
    const isAllowed =
      allowedNext.includes(validatedData.status) ||
      (isRejection && REVIEW_STATES.includes(existingComplaint.status));
    if (!isAllowed) {
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

  // Req 9.6: if an officer is updating the confidentiality flag, enforce the
  // harassment rule (harassment complaints are always confidential — an officer
  // cannot downgrade one). Employees cannot set the flag (excluded from
  // EMPLOYEE_ALLOWED_FIELDS), so this only applies to officer updates.
  if (dbData.confidential !== undefined) {
    const effectiveComplaintType =
      dbData.complaintType ?? existingComplaint.complaintType;
    dbData.confidential = resolveConfidential(
      effectiveComplaintType,
      dbData.confidential
    );
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
  const formattedResponse: Record<string, any> = {
    ...updatedComplaint,
    User_Complaint_complainantIdToUser: {
      ...updatedComplaint.User_Complaint_complainantIdToUser,
      Employee: employeeDetails,
    },
    confidential: updatedComplaint.confidential,
  };

  // SECURITY (Req 9.6): redact complainant identity PII on the response for
  // viewers lacking need-to-know (same rule as the GET list). The PUT response
  // is spread into the caller's cached row, so PII must not leak here either.
  const identityVisible = canSeeComplainantIdentity(auth.role, auth.userId, {
    complainantId: updatedComplaint.complainantId,
    assignedOfficerRole: updatedComplaint.assignedOfficerRole,
    confidential: updatedComplaint.confidential,
  });
  if (!identityVisible) {
    formattedResponse.complainantPhoneNumber = null;
    formattedResponse.nextOfKinPhoneNumber = null;
    if (formattedResponse.User_Complaint_complainantIdToUser) {
      formattedResponse.User_Complaint_complainantIdToUser = {
        ...formattedResponse.User_Complaint_complainantIdToUser,
        name: REDACTED_COMPLAINANT_NAME,
        employeeId: null,
        Employee: null,
      };
    }
    formattedResponse.complainantIdentityRedacted = true;
  }

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

// Req 9.2: single-complaint read with involved-party visibility.
// GET /api/complaints/[id] is restricted to the complainant and the
// complaint-handling officers (DO / HHRMD / CSCS / Admin) — the same set the
// list exposes — and 403s everyone else via the audited `denyWorkflowAccess`
// path. Complainant identity PII is masked via `redactComplainantPii` before
// return, so a co-reviewer / non-owning officer sees masked PII while the
// complainant, the specifically-assigned officer, and (for non-confidential
// complaints) Admin/CSCS see the full identity.
export const GET = wrapHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { verifyAuth } = await import('@/lib/api-auth');
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return authResult.response!;
  }
  const auth = authResult.context!;

  const { id } = await params;

  const complaint = await db.complaint.findUnique({
    where: { id },
    include: {
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
    },
  });

  if (!complaint) {
    return NextResponse.json(
      { success: false, message: 'Complaint not found' },
      { status: 404 }
    );
  }

  const isComplainant = complaint.complainantId === auth.userId;
  const isHandler = ['DO', 'HHRMD', 'CSCS', 'Admin'].includes(auth.role);

  // Involved-party visibility: only the complainant or a complaint-handling
  // officer tier may read a single complaint. Everyone else is denied, and
  // the denial is written to the audit trail via `denyWorkflowAccess`.
  if (!isComplainant && !isHandler) {
    return await denyWorkflowAccess({
      auth,
      routeBase: 'complaints',
      requestId: id,
      requestType: 'Complaint',
      blockReason: 'NOT_INVOLVED_PARTY',
      message: 'Access denied: you are not an involved party to this complaint',
      requestMethod: 'GET',
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
    });
  }

  const canSeeInternalNotes = ['Admin', 'DO', 'HHRMD', 'CSCS'].includes(auth.role);

  const row = {
    id: complaint.id,
    complainantId: complaint.complainantId, // decision-only; redactComplainantPii strips it
    employeeId: complaint.User_Complaint_complainantIdToUser?.employeeId ?? null,
    employeeName: complaint.User_Complaint_complainantIdToUser?.name ?? null,
    zanId: complaint.User_Complaint_complainantIdToUser?.Employee?.zanId ?? null,
    department: complaint.User_Complaint_complainantIdToUser?.Employee?.department ?? null,
    cadre: complaint.User_Complaint_complainantIdToUser?.Employee?.cadre ?? null,
    institutionName: complaint.User_Complaint_complainantIdToUser?.Institution?.name ?? null,
    complaintType: complaint.complaintType,
    subject: complaint.subject,
    details: complaint.details,
    complainantPhoneNumber: complaint.complainantPhoneNumber,
    nextOfKinPhoneNumber: complaint.nextOfKinPhoneNumber,
    submissionDate: complaint.createdAt.toISOString(),
    status: complaint.status,
    attachments: complaint.attachments,
    officerComments: canSeeInternalNotes ? complaint.officerComments : null,
    internalNotes: canSeeInternalNotes ? complaint.internalNotes : null,
    assignedOfficerRole: complaint.assignedOfficerRole,
    reviewStage: complaint.reviewStage,
    rejectionReason: complaint.rejectionReason,
    reviewedBy: complaint.User_Complaint_reviewedByIdToUser?.role ?? null,
    confidential: complaint.confidential,
  };

  const redacted = redactComplainantPii(row, {
    viewerRole: auth.role,
    viewerUserId: auth.userId,
    assignedOfficerId: complaint.reviewedById ?? null,
  });

  return NextResponse.json(redacted);
}, 'complaints');

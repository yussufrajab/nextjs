import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import { verifyMfaToken } from '@/lib/mfa-utils';
import { v4 as uuidv4 } from 'uuid';
import { createNotificationForRole, NotificationTemplates } from '@/lib/notifications';
import { sendRequestSubmissionEmails } from '@/lib/email';
import { logComplaintAction, getClientIp } from '@/lib/audit-logger';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

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

const verifyBodySchema = z.object({
  token: z.string().min(1),
});

export const POST = wrapHandler(async (req: Request) => {
  const csrfCheck = await validateCSRF(req);
  if (!csrfCheck.valid) return csrfCheck.response!;

  // Extract complaint data from URL query params
  const { searchParams } = new URL(req.url);
  const complaintDataParam = searchParams.get('complaintData');

  if (!complaintDataParam) {
    return NextResponse.json(
      { error: 'MISSING_DATA', message: 'Complaint data is missing from URL parameters' },
      { status: 400 }
    );
  }

  // Parse the complaint data from query param
  let complaintData;
  try {
    complaintData = JSON.parse(decodeURIComponent(complaintDataParam));
  } catch (e) {
    return NextResponse.json(
      { error: 'MISSING_DATA', message: 'Invalid complaint data format' },
      { status: 400 }
    );
  }

  // Validate complaint data schema
  const validatedComplaint = complaintSchema.safeParse(complaintData);
  if (!validatedComplaint.success) {
    return NextResponse.json(
      { error: 'MISSING_DATA', message: 'Invalid complaint data', details: validatedComplaint.error.errors },
      { status: 400 }
    );
  }

  const {
    complaintType,
    subject,
    complaintText,
    complainantPhoneNumber,
    nextOfKinPhoneNumber,
    attachments,
    complainantId,
    assignedOfficerRole,
  } = validatedComplaint.data;

  // Parse the request body for the MFA token
  const body = await req.json();
  const { token } = verifyBodySchema.parse(body);

  // Verify the magic link token
  const verificationResult = await verifyMfaToken(token, 'MAGIC_LINK');

  if (!verificationResult.valid) {
    // Determine the specific error code based on the reason
    let errorCode: string;
    const reason = verificationResult.reason || '';

    if (reason.includes('not found')) {
      errorCode = 'INVALID_TOKEN';
    } else if (reason.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (reason.includes('used')) {
      errorCode = 'TOKEN_USED';
    } else {
      errorCode = 'INVALID_TOKEN';
    }

    authLogger.warn({
      reason,
      complainantId,
    }, `Magic link verification failed: ${errorCode}`);

    return NextResponse.json(
      { error: errorCode, message: `Token verification failed: ${reason}` },
      { status: 400 }
    );
  }

  // Validate that the complainant ID matches the token user
  if (verificationResult.userId !== complainantId) {
    authLogger.warn({
      tokenUserId: verificationResult.userId,
      complaintUserId: complainantId,
    }, 'Magic link verification failed: complainant mismatch');

    return NextResponse.json(
      { error: 'MISMATCH', message: 'Complainant ID does not match token user' },
      { status: 403 }
    );
  }

  // Get complainant's name for notification
  const complainant = await db.user.findUnique({
    where: { id: complainantId },
    select: { name: true },
  });

  if (!complainant) {
    return NextResponse.json(
      { error: 'MISSING_DATA', message: 'Complainant not found' },
      { status: 404 }
    );
  }

  // Create the complaint in database
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

  // Create notifications for DO, HHRMD, HRMO roles
  const notification = NotificationTemplates.complaintSubmitted(
    complainant.name,
    newComplaint.id,
    subject
  );

  const doRole = ROLES.DO || 'DO';
  const hhrmdRole = ROLES.HHRMD || 'HHRMD';
  const hrmoRole = ROLES.HRMO || 'HRMO';

  await Promise.all([
    createNotificationForRole(doRole, notification.message, notification.link),
    createNotificationForRole(hhrmdRole, notification.message, notification.link),
    createNotificationForRole(hrmoRole, notification.message, notification.link),
  ]);

  // Send email notifications to CSC reviewers
  await sendRequestSubmissionEmails({
    requestType: 'Complaint',
    employeeName: complainant.name,
    requestId: newComplaint.id,
    submittedByName: complainant.name,
    dashboardPath: '/dashboard/complaints',
  });

  // Audit log: complaint submitted via magic link MFA
  await logComplaintAction({
    action: 'SUBMITTED',
    complaintId: newComplaint.id,
    complainantId,
    subject,
    performedById: complainantId,
    performedByUsername: complainant.name || 'unknown',
    performedByRole: 'EMPLOYEE',
    ipAddress: getClientIp(req.headers),
    deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
  }).catch(() => {});

  authLogger.info({
    complaintId: newComplaint.id,
    complainantId,
  }, 'Complaint submitted successfully via magic link MFA');

  return NextResponse.json({
    success: true,
    complaint: newComplaint,
    message: 'Complaint submitted successfully',
  }, { status: 201 });
}, 'complaints-magic-link');

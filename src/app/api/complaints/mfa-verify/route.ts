import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import { verifyMfaToken } from '@/lib/mfa-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  createNotificationForRole,
  NotificationTemplates,
} from '@/lib/notifications';
import { sendRequestSubmissionEmails } from '@/lib/email';
import { logComplaintAction, getClientIp } from '@/lib/audit-logger';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const complaintMfaVerifySchema = z.object({
  otpCode: z.string().min(6).max(6),
  complaintData: z.string().min(1),
});

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json();
  const { otpCode, complaintData: complaintDataParam } = complaintMfaVerifySchema.parse(body);

  // Verify the MFA token
  const mfaResult = await verifyMfaToken(otpCode, 'OTP');

  if (!mfaResult.valid) {
    authLogger.info({ reason: mfaResult.reason }, 'MFA verification failed for complaint');
    return NextResponse.json(
      {
        success: false,
        message: mfaResult.reason || 'Invalid verification code',
        code: 'MFA_INVALID',
      },
      { status: 401 }
    );
  }

  // Parse the complaint data
  let complaintData;
  try {
    complaintData = JSON.parse(decodeURIComponent(complaintDataParam));
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid complaint data' },
      { status: 400 }
    );
  }

  // Validate the complainant
  if (complaintData.complainantId !== mfaResult.userId) {
    authLogger.warn({
      mfaUserId: mfaResult.userId,
      complaintComplainantId: complaintData.complainantId,
    }, 'Complainant mismatch in MFA verification');
    return NextResponse.json(
      { success: false, message: 'Invalid complainant' },
      { status: 403 }
    );
  }

  const ipAddress = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') || null;

  // Create the complaint
  const newComplaint = await db.complaint.create({
    data: {
      id: uuidv4(),
      complaintType: complaintData.complaintType,
      subject: complaintData.subject,
      details: complaintData.complaintText,
      complainantPhoneNumber: complaintData.complainantPhoneNumber,
      nextOfKinPhoneNumber: complaintData.nextOfKinPhoneNumber,
      attachments: complaintData.attachments || [],
      complainantId: mfaResult.userId,
      status: 'Submitted',
      reviewStage: 'initial',
      assignedOfficerRole: ROLES.DO || 'DO',
      updatedAt: new Date(),
    },
  });

  // Get complainant's name for notification
  const complainant = await db.user.findUnique({
    where: { id: mfaResult.userId },
    select: { name: true },
  });

  // Create notification for officers
  if (complainant && complainant.name) {
    const notification = NotificationTemplates.complaintSubmitted(
      complainant.name,
      newComplaint.id,
      complaintData.subject
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

  // Audit log
  await logComplaintAction({
    action: 'SUBMITTED',
    complaintId: newComplaint.id,
    complainantId: mfaResult.userId,
    subject: complaintData.subject,
    performedById: mfaResult.userId,
    performedByUsername: complainant?.name || 'unknown',
    performedByRole: 'EMPLOYEE',
    ipAddress,
    deviceInfo: null,
  });

  authLogger.info({
    complaintId: newComplaint.id,
    userId: mfaResult.userId,
  }, 'Complaint submitted with MFA verification');

  return NextResponse.json({
    success: true,
    message: 'Complaint submitted successfully',
    data: {
      complaintId: newComplaint.id,
    },
  });
}, 'complaints-mfa-verify');
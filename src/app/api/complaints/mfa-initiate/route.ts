import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { createMfaToken, checkOtpRateLimit, maskEmail } from '@/lib/mfa-utils';
import { sendComplaintMagicLinkEmail } from '@/lib/email';
import { getClientIp } from '@/lib/audit-logger';
import { wrapHandler } from '@/lib/error-handler';

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const { searchParams } = new URL(request.url);
  const complaintDataParam = searchParams.get('complaintData');

  if (!complaintDataParam) {
    return NextResponse.json(
      { success: false, message: 'Complaint data is required' },
      { status: 400 }
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

  // Validate required fields
  if (!complaintData.complainantId || complaintData.complainantId !== auth.userId) {
    return NextResponse.json(
      { success: false, message: 'Invalid complainant' },
      { status: 403 }
    );
  }

  // Get the user's email
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, name: true, role: true, email: true, employeeId: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'User not found' },
      { status: 404 }
    );
  }

  // Only EMPLOYEE role needs MFA for complaint submission
  if (user.role !== 'EMPLOYEE') {
    return NextResponse.json(
      { success: false, message: 'MFA is only required for employee complaints' },
      { status: 400 }
    );
  }

  if (!user.email) {
    return NextResponse.json(
      { success: false, message: 'No email address on file. Please contact HR to add your email address.' },
      { status: 400 }
    );
  }

  const userEmail = user.email;
  const ipAddress = getClientIp(request.headers);
  const userAgent = request.headers.get('user-agent') || null;

  // Check rate limit
  const rateLimitCheck = await checkOtpRateLimit(user.id);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: `Too many verification requests. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
      },
      { status: 429 }
    );
  }

  const mfaTokenExpiryMinutes = Number(process.env.MFA_TOKEN_EXPIRY_MINUTES) || 10;
  const { token: magicLinkToken } = await createMfaToken(
    user.id,
    'MAGIC_LINK',
    userEmail,
    ipAddress,
    userAgent,
    mfaTokenExpiryMinutes
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
  const magicLinkUrl = `${appUrl}/mfa/complaint-confirm?token=${magicLinkToken}&complaintData=${encodeURIComponent(complaintDataParam)}`;

  // Send complaint magic link email
  const emailResult = await sendComplaintMagicLinkEmail({
    email: userEmail,
    magicLink: magicLinkUrl,
    employeeName: user.name || 'Employee',
    expiryMinutes: mfaTokenExpiryMinutes,
    complaintSubject: complaintData.subject,
  });

  if (!emailResult.success) {
    authLogger.error({ err: emailResult.error }, 'Failed to send MFA email for complaint');
    return NextResponse.json(
      { success: false, message: 'Failed to send verification email. Please try again.' },
      { status: 500 }
    );
  }

  authLogger.info({
    userId: user.id,
    email: maskEmail(userEmail),
  }, 'MFA verification initiated for complaint submission');

  return NextResponse.json({
    success: true,
    code: 'MFA_REQUIRED',
    data: {
      userId: user.id,
      email: maskEmail(userEmail),
      complaintData: complaintDataParam,
    },
    message: 'Verification code sent to your email',
  });
}), 'auth'), 'complaints-mfa-initiate');
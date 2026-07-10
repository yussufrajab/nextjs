import { NextResponse } from 'next/server';
import { z } from 'zod';
import { terminateSessionById } from '@/lib/session-manager';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';
import { withAuth } from '@/lib/api-auth';

const forceLogoutSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  // userId is accepted for Admin use (terminating another user's session);
  // non-admins cannot use it — the target is always derived from the
  // authenticated session below.
  userId: z.string().min(1, 'User ID is required'),
});

export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
    const csrfCheck = await validateCSRF(req);
    if (!csrfCheck.valid) return csrfCheck.response!;

    const body = await req.json();
    const { sessionId, userId } = forceLogoutSchema.parse(body);

    // SECURITY (Q4): derive the target user from the authenticated session so a
    // user can only terminate their OWN sessions. An Admin may terminate another
    // user's session by supplying that user's id; everyone else is bound to
    // their own auth.userId regardless of what the client sends.
    const targetUserId =
      auth.role === 'Admin' ? (userId ?? auth.userId) : auth.userId;

    const success = await terminateSessionById(sessionId, targetUserId);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to terminate session. Session may not exist or does not belong to you.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully',
    });
}, { allowedRoles: ['Admin', 'HRO', 'HRRP', 'HRMO', 'HHRMD', 'CSCS', 'PO', 'DO', 'EMPLOYEE'] }), 'auth-force-logout');
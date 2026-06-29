import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserActiveSessions,
  terminateSessionById,
} from '@/lib/session-manager';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { maskSessionToken } from '@/lib/sanitize-response';
import { wrapHandler } from '@/lib/error-handler';

const terminateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

/**
 * GET /api/auth/sessions
 * Get all active sessions for a user
 */
export const GET = wrapHandler(withRateLimit(
  withAuth(async (request, { auth }) => {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId') || auth.userId;

      const sessions = await getUserActiveSessions(userId);

      // Don't expose full session tokens in the list
      const safeSessions = sessions.map((session) => ({
        ...session,
        sessionToken: maskSessionToken(session.sessionToken),
        sessionId: session.id, // Use ID for termination
      }));

    return NextResponse.json({
      success: true,
      sessions: safeSessions,
      count: sessions.length,
      maxSessions: 3,
    });
}, { allowedRoles: ['ADMIN', 'HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO'] }),
  'read'
), 'auth-sessions');

/**
 * POST /api/auth/sessions?action=terminate
 * Terminate one of the caller's own sessions by sessionId.
 */
export const POST = wrapHandler(withRateLimit(
  withAuth(async (request, { auth }) => {
      const body = await request.json();
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');

      if (action === 'terminate') {
        const { sessionId } = terminateSessionSchema.parse(body);

        // terminateSessionById verifies the session belongs to auth.userId,
        // so a user can only terminate their own sessions.
        const success = await terminateSessionById(sessionId, auth.userId);

        if (!success) {
          return NextResponse.json(
            { success: false, message: 'Failed to terminate session' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Session terminated successfully',
        });
      }

      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
  }),
  'write'
), 'auth-sessions');

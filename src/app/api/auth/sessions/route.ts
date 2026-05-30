import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserActiveSessions,
  validateSession,
  terminateSession,
} from '@/lib/session-manager';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { maskSessionToken } from '@/lib/sanitize-response';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const getSessionsSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const validateSessionSchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
});

const terminateSessionSchema = z.object({
  sessionToken: z.string().min(1, 'Session token is required'),
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
 * POST /api/auth/sessions/validate
 * Validate a session token
 */
export const POST = wrapHandler(withRateLimit(
  withAuth(async (request, { auth }) => {
      const body = await request.json();
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');

      if (action === 'validate') {
        const { sessionToken } = validateSessionSchema.parse(body);

        const session = await validateSession(sessionToken);

        if (!session) {
          return NextResponse.json(
            {
              success: false,
              message: 'Invalid or expired session',
              isValid: false,
            },
            { status: 401 }
          );
        }

        return NextResponse.json({
          success: true,
          isValid: true,
          session: {
            userId: session.userId,
            expiresAt: session.expiresAt,
            lastActivity: session.lastActivity,
          },
        });
      }

      if (action === 'terminate') {
        const { sessionToken } = terminateSessionSchema.parse(body);

        const success = await terminateSession(sessionToken);

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

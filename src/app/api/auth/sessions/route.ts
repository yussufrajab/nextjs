import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserActiveSessions,
  validateSession,
  terminateSession,
} from '@/lib/session-manager';

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
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const sessions = await getUserActiveSessions(userId);

    // Don't expose full session tokens in the list
    const safeSessions = sessions.map((session) => ({
      ...session,
      sessionToken: session.sessionToken.substring(0, 10) + '...', // Masked token
      sessionId: session.id, // Use ID for termination
    }));

    return NextResponse.json({
      success: true,
      sessions: safeSessions,
      count: sessions.length,
      maxSessions: 3,
    });
  } catch (error) {
    console.error('[SESSIONS_GET]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/sessions/validate
 * Validate a session token
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'validate') {
      const { sessionToken } = validateSessionSchema.parse(body);

      const session = await validateSession(sessionToken);

      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired session', isValid: false },
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[SESSIONS_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

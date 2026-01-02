import { NextResponse } from 'next/server';
import { clearUserActivity } from '@/lib/session-timeout-utils';
import { terminateSession, terminateAllUserSessions } from '@/lib/session-manager';

export async function POST(req: Request) {
  try {
    // Get userId and sessionToken from request body
    const body = await req.json();
    const userId = body?.userId;
    const sessionToken = body?.sessionToken;
    const logoutAll = body?.logoutAll || false; // Option to logout all sessions

    // Terminate session(s)
    if (logoutAll && userId) {
      // Terminate all sessions for this user
      const count = await terminateAllUserSessions(userId);
      console.log(`[LOGOUT] Terminated all ${count} session(s) for user:`, userId);
    } else if (sessionToken) {
      // Terminate specific session
      await terminateSession(sessionToken);
      console.log('[LOGOUT] Terminated session for token:', sessionToken.substring(0, 10) + '...');
    }

    // Clear user's activity timestamp
    if (userId) {
      await clearUserActivity(userId);
      console.log('[LOGOUT] Cleared activity for user:', userId);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error("[LOGOUT_POST]", error);
    return NextResponse.json({
      success: false,
      message: 'Internal Server Error'
    }, { status: 500 });
  }
}
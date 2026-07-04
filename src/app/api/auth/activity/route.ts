import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  updateUserActivity,
  getUserActivity,
  isSessionTimedOut,
} from '@/lib/session-timeout-utils';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

/**
 * POST /api/auth/activity
 * Update user's last activity timestamp and check session status
 */
export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
    // SECURITY: Use authenticated user ID, not client-supplied
    const userId = auth.userId;

    // Get current activity status before updating
    const currentActivity = await getUserActivity(userId);

    // Check if session is already timed out
    if (isSessionTimedOut(currentActivity)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Session timed out due to inactivity',
          sessionExpired: true,
        },
        { status: 401 }
      );
    }

    // Update activity timestamp
    const newActivity = await updateUserActivity(userId);

    if (!newActivity) {
      return NextResponse.json(
        { success: false, message: 'Failed to update activity' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Activity updated',
      lastActivity: newActivity,
    });
}), 'auth-activity');

/**
 * GET /api/auth/activity
 * Get user's current activity status
 */
export const GET = wrapHandler(withAuth(async (req: Request, { auth }) => {
    // SECURITY: Use authenticated user ID, not client-supplied
    const userId = auth.userId;

    const lastActivity = await getUserActivity(userId);
    const sessionExpired = isSessionTimedOut(lastActivity);

    return NextResponse.json({
      success: true,
      lastActivity,
      sessionExpired,
    });
}), 'auth-activity');

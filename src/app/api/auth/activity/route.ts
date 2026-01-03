import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  updateUserActivity,
  getUserActivity,
  isSessionTimedOut,
} from '@/lib/session-timeout-utils';

const activitySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * POST /api/auth/activity
 * Update user's last activity timestamp and check session status
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = activitySchema.parse(body);

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[ACTIVITY_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/activity
 * Get user's current activity status
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

    const lastActivity = await getUserActivity(userId);
    const sessionExpired = isSessionTimedOut(lastActivity);

    return NextResponse.json({
      success: true,
      lastActivity,
      sessionExpired,
    });
  } catch (error) {
    console.error('[ACTIVITY_GET]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

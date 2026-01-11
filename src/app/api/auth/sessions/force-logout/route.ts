import { NextResponse } from 'next/server';
import { z } from 'zod';
import { terminateSessionById } from '@/lib/session-manager';

const forceLogoutSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, userId } = forceLogoutSchema.parse(body);

    const success = await terminateSessionById(sessionId, userId);

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('[FORCE_LOGOUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

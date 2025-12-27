import { NextResponse } from 'next/server';
import { checkPasswordExpirations } from '@/lib/cron-service';

export async function POST(req: Request) {
  try {
    // TODO: Add admin authentication check
    // For now, allow in development only
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }

    console.log('[API] Manually triggering password expiration check...');
    await checkPasswordExpirations();

    return NextResponse.json({
      success: true,
      message: 'Password expiration check completed successfully',
    });
  } catch (error) {
    console.error('[API] Error triggering password expiration check:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

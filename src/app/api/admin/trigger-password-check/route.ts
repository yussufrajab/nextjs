import { NextResponse } from 'next/server';
import { checkPasswordExpirations } from '@/lib/cron-service';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const POST = wrapHandler(async (req: Request) => {
  // TODO: Add admin authentication check
  // For now, allow in development only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      {
        success: false,
        message: 'This endpoint is only available in development mode',
      },
      { status: 403 }
    );
  }

  logger.info('[API] Manually triggering password expiration check...');
  await checkPasswordExpirations();

  return NextResponse.json({
    success: true,
    message: 'Password expiration check completed successfully',
  });
}, 'admin-trigger-password-check');

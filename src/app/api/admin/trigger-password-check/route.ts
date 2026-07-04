import { NextResponse } from 'next/server';
import { checkPasswordExpirations } from '@/lib/cron-service';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
  // Only allow in development mode OR for Admin users
  if (process.env.NODE_ENV !== 'development' && auth.role.toUpperCase() !== 'ADMIN') {
    return NextResponse.json(
      {
        success: false,
        message: 'This endpoint is only available in development mode or for administrators',
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
}, { allowedRoles: ['Admin'] }), 'admin-trigger-password-check');

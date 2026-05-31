import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(async () => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  }
  logger.info('=== TEST API CALLED ===');
    // Test database connection
    const userCount = await db.user.count();

    return NextResponse.json({
      success: true,
      message: 'Test API is working',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        userCount,
      },
    });
  });

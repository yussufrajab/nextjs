import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  console.log('=== TEST API CALLED ===');
  try {
    // Test database connection
    const userCount = await db.user.count();
    
    return NextResponse.json({
      success: true,
      message: 'Test API is working',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        userCount
      }
    });
  } catch (error) {
    console.error('[TEST_API]', error);
    return NextResponse.json({
      success: false,
      message: 'Test API working but database error',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}
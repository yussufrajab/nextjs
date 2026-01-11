import { NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/session-manager';
import { db } from '@/lib/db';

/**
 * Admin endpoint to manually clean up sessions
 * Can be used to clean up all sessions or just expired ones
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;

    if (action === 'cleanup-expired') {
      // Clean up all expired sessions
      const count = await cleanupExpiredSessions();
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${count} expired sessions`,
        count,
      });
    } else if (action === 'cleanup-all') {
      // Delete ALL sessions (use with caution!)
      const result = await db.session.deleteMany({});
      return NextResponse.json({
        success: true,
        message: `Deleted all ${result.count} sessions`,
        count: result.count,
      });
    } else if (action === 'cleanup-user' && userId) {
      // Delete all sessions for a specific user
      const result = await db.session.deleteMany({
        where: { userId },
      });
      return NextResponse.json({
        success: true,
        message: `Deleted ${result.count} sessions for user ${userId}`,
        count: result.count,
      });
    } else if (action === 'list-sessions') {
      // List all sessions grouped by user
      const sessions = await db.session.findMany({
        include: {
          User: {
            select: {
              username: true,
              name: true,
            },
          },
        },
      });

      const sessionsByUser = sessions.reduce((acc, session) => {
        const username = session.User.username;
        if (!acc[username]) {
          acc[username] = {
            count: 0,
            active: 0,
            expired: 0,
            sessions: [],
          };
        }
        const isExpired = new Date() > session.expiresAt;
        acc[username].count++;
        if (isExpired) {
          acc[username].expired++;
        } else {
          acc[username].active++;
        }
        acc[username].sessions.push({
          id: session.id,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          isExpired,
        });
        return acc;
      }, {} as Record<string, any>);

      return NextResponse.json({
        success: true,
        totalSessions: sessions.length,
        sessionsByUser,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Invalid action. Use: cleanup-expired, cleanup-all, cleanup-user, or list-sessions',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[ADMIN_CLEANUP_SESSIONS]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

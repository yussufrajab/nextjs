import { NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/session-manager';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

/**
 * GET handler — returns session statistics for the admin dashboard (Admin only)
 */
export const GET = wrapHandler(withAuth(async () => {
  const now = new Date();

  const [totalSessions, activeSessions, expiredSessions, suspiciousSessions] =
    await Promise.all([
      db.session.count(),
      db.session.count({ where: { expiresAt: { gt: now } } }),
      db.session.count({ where: { expiresAt: { lte: now } } }),
      db.session.count({ where: { isSuspicious: true } }),
    ]);

  const sessionsByUser = await db.session.groupBy({
    by: ['userId'],
    _count: { id: true },
  });

  const userIds = [...new Set(sessionsByUser.map((s) => s.userId))];
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const perUserBreakdown = sessionsByUser.map((s) => ({
    userId: s.userId,
    username: userMap.get(s.userId)?.username || 'Unknown',
    name: userMap.get(s.userId)?.name || 'Unknown',
    sessionCount: s._count.id,
  }));

  return NextResponse.json({
    success: true,
    data: {
      totalSessions,
      activeSessions,
      expiredSessions,
      suspiciousSessions,
      perUserBreakdown,
    },
  });
}, { allowedRoles: ['Admin'] }), 'admin-cleanup-sessions');

/**
 * Admin endpoint to manually clean up sessions (Admin only)
 * Can be used to clean up all sessions or just expired ones
 */
export const POST = wrapHandler(withAuth(async (req: Request) => {
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
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isExpired,
        isSuspicious: session.isSuspicious,
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
}, { allowedRoles: ['Admin'] }), 'admin-cleanup-sessions');

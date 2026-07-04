import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { validateRequest, notificationQuerySchema } from '@/lib/api-schemas';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const validation = await validateRequest(request as NextRequest, notificationQuerySchema, 'query');
  if (!validation.success) return validation.response;

  const { userId } = validation.data;

  // Verify auth.userId matches userId or admin role
  if (userId !== auth.userId && auth.role !== 'Admin') {
    return NextResponse.json(
      { success: false, message: 'Forbidden' },
      { status: 403 }
    );
  }

  const notifications = await db.notification.findMany({
    where: { userId: userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    success: true,
    data: notifications,
  });
}), 'read'), 'notifications-get');

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const body = await request.json();
  const { notificationIds } = body;

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return NextResponse.json(
      { success: false, message: 'Notification IDs are required' },
      { status: 400 }
    );
  }

  // SECURITY: Only mark notifications that belong to the authenticated user
  await db.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId: auth.userId,
    },
    data: { isRead: true },
  });

  return NextResponse.json({
    success: true,
    message: 'Notifications marked as read',
  });
}), 'write'), 'notifications-post');

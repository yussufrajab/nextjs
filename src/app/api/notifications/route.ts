import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ 
      success: true, 
      data: notifications 
    });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ success: false, message: 'Notification IDs are required' }, { status: 400 });
    }

    await db.notification.updateMany({
      where: { id: { in: notificationIds } },
      data: { isRead: true },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications marked as read' 
    });
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
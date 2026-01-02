import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { lockAccountManually } from '@/lib/account-lockout-utils';
import { createNotification } from '@/lib/notifications';

const lockAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  adminId: z.string().min(1, 'Admin ID is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, adminId, reason, notes } = lockAccountSchema.parse(body);

    // Verify admin user exists and has admin role
    const admin = await db.user.findUnique({
      where: { id: adminId },
      select: { id: true, username: true, role: true },
    });

    if (!admin || admin.role !== 'Admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    // Verify target user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        isManuallyLocked: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent locking another admin (optional safety check)
    if (user.role === 'Admin') {
      return NextResponse.json(
        {
          success: false,
          message: 'Cannot lock another administrator account',
        },
        { status: 403 }
      );
    }

    // Check if already locked
    if (user.isManuallyLocked) {
      return NextResponse.json(
        { success: false, message: 'Account is already locked' },
        { status: 400 }
      );
    }

    // Lock the account
    await lockAccountManually(userId, adminId, reason, notes);

    // Send notification to user
    await createNotification({
      userId: user.id,
      message: `Your account has been locked by an administrator. Reason: ${reason}. Please contact support for assistance.`,
      link: undefined,
    });

    console.log(
      `Account locked for user ${user.username} by admin ${admin.username}`
    );

    return NextResponse.json({
      success: true,
      message: 'Account locked successfully',
      data: {
        userId: user.id,
        username: user.username,
        lockedBy: admin.username,
        reason,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[LOCK_ACCOUNT_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

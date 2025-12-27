import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { unlockAccount } from '@/lib/account-lockout-utils';
import { createNotification } from '@/lib/notifications';

const unlockAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  adminId: z.string().min(1, 'Admin ID is required'),
  verificationNotes: z.string().min(10, 'Verification notes must be at least 10 characters'),
  identityVerified: z.boolean().refine((val) => val === true, {
    message: 'Identity verification is required',
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, adminId, verificationNotes, identityVerified } = unlockAccountSchema.parse(body);

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
        isManuallyLocked: true,
        loginLockoutReason: true,
        failedLoginAttempts: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Unlock the account
    await unlockAccount(userId, adminId, verificationNotes);

    // Send notification to user
    await createNotification({
      userId: user.id,
      message: `Your account has been unlocked by an administrator. You can now log in to the system.`,
      link: '/login',
    });

    console.log(`Account unlocked for user ${user.username} by admin ${admin.username}`);

    return NextResponse.json({
      success: true,
      message: 'Account unlocked successfully',
      data: {
        userId: user.id,
        username: user.username,
        unlockedBy: admin.username,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[UNLOCK_ACCOUNT_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAccountLockoutStatus } from '@/lib/account-lockout-utils';

const lockoutStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = lockoutStatusSchema.parse(body);

    // Find user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        failedLoginAttempts: true,
        loginLockedUntil: true,
        loginLockoutReason: true,
        loginLockoutType: true,
        isManuallyLocked: true,
        lockedBy: true,
        lockedAt: true,
        lockoutNotes: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get lockout status
    const status = getAccountLockoutStatus(user);

    // Get admin username if locked by admin
    let lockedByUsername = null;
    if (user.lockedBy) {
      const admin = await db.user.findUnique({
        where: { id: user.lockedBy },
        select: { username: true },
      });
      lockedByUsername = admin?.username || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        username: user.username,
        lockedByUsername,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[ACCOUNT_LOCKOUT_STATUS]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

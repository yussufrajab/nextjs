import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAccountLockoutStatus } from '@/lib/account-lockout-utils';
import { wrapHandler } from '@/lib/error-handler';

const lockoutStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const POST = wrapHandler(async (req: Request) => {
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
}, 'auth-account-lockout-status');

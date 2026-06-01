import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { unlockAccount } from '@/lib/account-lockout-utils';
import { createNotification } from '@/lib/notifications';
import { logAccountAction, getClientIp } from '@/lib/audit-logger';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

const unlockAccountSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  verificationNotes: z
    .string()
    .min(10, 'Verification notes must be at least 10 characters'),
  identityVerified: z.boolean().refine((val) => val === true, {
    message: 'Identity verification is required',
  }),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const body = await request.json();
  const { userId, verificationNotes, identityVerified } =
    unlockAccountSchema.parse(body);

  // Use verified admin ID from auth context instead of client-sent adminId
  const adminId = auth.userId;

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

  // Log the account unlock action
  await logAccountAction({
    action: 'UNLOCKED',
    targetUserId: userId,
    targetUsername: user.username,
    performedById: adminId,
    performedByUsername: auth.username,
    performedByRole: auth.role,
    ipAddress: getClientIp(request.headers),
    deviceInfo: JSON.parse(request.headers.get('x-device-info') || 'null'),
    additionalData: { verificationNotes },
  }).catch(() => {});

  // Send notification to user
  await createNotification({
    userId: user.id,
    message: `Your account has been unlocked by an administrator. You can now log in to the system.`,
    link: '/login',
  });

  logger.info(
    `Account unlocked for user ${user.username} by admin ${auth.username}`
  );

  return NextResponse.json({
    success: true,
    message: 'Account unlocked successfully',
    data: {
      userId: user.id,
      username: user.username,
      unlockedBy: auth.username,
    },
  });
}, { allowedRoles: ['Admin'] }), 'write'), 'admin-unlock-account');
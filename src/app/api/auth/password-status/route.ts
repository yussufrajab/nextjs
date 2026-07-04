import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getPasswordExpirationStatus } from '@/lib/password-expiration-utils';
import { wrapHandler } from '@/lib/error-handler';
import { withAuth } from '@/lib/api-auth';

export const POST = wrapHandler(withAuth(async (req: Request, { auth }) => {
    // SECURITY: Use authenticated user ID, not client-supplied
    const userId = auth.userId;

    // Find user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        passwordExpiresAt: true,
        gracePeriodStartedAt: true,
        lastExpirationWarningLevel: true,
        isTemporaryPassword: true,
        temporaryPasswordExpiry: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get password expiration status
    const status = getPasswordExpirationStatus(user);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        isTemporaryPassword: user.isTemporaryPassword,
        temporaryPasswordExpiry: user.temporaryPasswordExpiry,
        mustChangePassword: user.mustChangePassword,
      },
    });
}), 'auth-password-status');

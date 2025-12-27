import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getPasswordExpirationStatus } from '@/lib/password-expiration-utils';

const passwordStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = passwordStatusSchema.parse(body);

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[PASSWORD_STATUS]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

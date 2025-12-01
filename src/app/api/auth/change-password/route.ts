import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

const changePasswordSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, currentPassword, newPassword } = changePasswordSchema.parse(body);

    console.log('Password change attempt for user ID:', userId);

    // Find user in database
    const user = await db.User.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.active) {
      console.log('User account is inactive:', userId);
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 401 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      console.log('Invalid current password for user:', userId);
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    await db.User.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log('Password changed successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }
    console.error('[CHANGE_PASSWORD_POST]', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

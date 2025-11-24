import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createNotification, NotificationTemplates } from '@/lib/notifications';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    console.log('Login attempt for username/email:', username);

    // Check if the input is an email (contains @) or username
    const isEmail = username.includes('@');
    
    // Find user in database by either email or username
    const user = await db.user.findFirst({
      where: isEmail 
        ? { email: username }
        : { username: username },
      include: {
        institution: true,
        employee: true
      }
    });

    if (!user) {
      console.log('User not found:', username);
      return NextResponse.json(
        { success: false, message: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    if (!user.active) {
      console.log('User account is inactive:', username);
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);
      return NextResponse.json(
        { success: false, message: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    console.log('Login successful for user:', username);

    // For simplicity, we'll skip JWT tokens and use session-based auth
    // But we need to match the frontend's expected response structure
    const authData = {
      token: null, // We're not using JWT tokens for now
      refreshToken: null,
      tokenType: 'Bearer',
      expiresIn: null,
      user: {
        id: user.id,
        fullName: user.name, // Frontend expects fullName
        name: user.name,
        username: user.username,
        role: user.role,
        institutionId: user.institutionId,
        institutionName: user.institution?.name || '',
        institution: user.institution,
        employee: user.employee,
        isEnabled: user.active, // Frontend expects isEnabled
        active: user.active,
        employeeId: user.employeeId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginDate: new Date()
      }
    };

    // Check if this is a first-time login (check if user has any existing notifications)
    const existingNotifications = await db.notification.findMany({
      where: { userId: user.id },
      take: 1,
    });

    // If no existing notifications, create a welcome notification
    if (existingNotifications.length === 0) {
      const welcomeNotification = NotificationTemplates.welcomeMessage();
      await createNotification({
        userId: user.id,
        message: welcomeNotification.message,
        link: welcomeNotification.link,
      });
    }

    return NextResponse.json({
      success: true,
      data: authData,
      message: 'Login successful'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    console.error("[LOGIN_POST]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
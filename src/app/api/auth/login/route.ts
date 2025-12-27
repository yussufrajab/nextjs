import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createNotification, NotificationTemplates } from '@/lib/notifications';
import { comparePassword } from '@/lib/password-utils';
import { logLoginAttempt, getClientIp } from '@/lib/audit-logger';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = loginSchema.parse(body);

    console.log('Login attempt for username/email:', username);

    // Get client info for audit logging
    const ipAddress = getClientIp(req.headers);
    const userAgent = req.headers.get('user-agent');

    // Check if the input is an email (contains @) or username
    const isEmail = username.includes('@');

    // Find user in database by either email or username
    const user = await db.User.findFirst({
      where: isEmail
        ? { email: username }
        : { username: username },
      include: {
        Institution: true,
        Employee: true
      }
    });

    if (!user) {
      console.log('User not found:', username);

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username,
        ipAddress,
        userAgent,
        failureReason: 'User not found',
      });

      return NextResponse.json(
        { success: false, message: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    if (!user.active) {
      console.log('User account is inactive:', username);

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        failureReason: 'Account is inactive',
      });

      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        failureReason: 'Invalid password',
      });

      return NextResponse.json(
        { success: false, message: 'Invalid username/email or password' },
        { status: 401 }
      );
    }

    // Check password status
    const now = new Date();
    const isTemporaryPasswordExpired =
      user.isTemporaryPassword &&
      user.temporaryPasswordExpiry &&
      new Date(user.temporaryPasswordExpiry) < now;

    // If temporary password has expired, deny login
    if (isTemporaryPasswordExpired) {
      console.log('Temporary password expired for user:', username);
      return NextResponse.json(
        {
          success: false,
          message:
            'Your temporary password has expired. Please contact an administrator to reset your password.',
        },
        { status: 401 }
      );
    }

    // Check password expiration (non-temporary passwords only)
    if (!user.isTemporaryPassword) {
      const {
        isPasswordExpired,
        isInGracePeriod,
        getPasswordExpirationStatus
      } = await import('@/lib/password-expiration-utils');

      const expirationStatus = getPasswordExpirationStatus({
        role: user.role,
        passwordExpiresAt: user.passwordExpiresAt,
        gracePeriodStartedAt: user.gracePeriodStartedAt,
        lastExpirationWarningLevel: user.lastExpirationWarningLevel,
      });

      // If expired beyond grace period, deny login
      if (expirationStatus.isExpired && !expirationStatus.isInGracePeriod) {
        console.log('Password expired beyond grace period for user:', username);

        await logLoginAttempt({
          success: false,
          username: user.username,
          userId: user.id,
          userRole: user.role,
          ipAddress,
          userAgent,
          failureReason: 'Password expired beyond grace period',
        });

        return NextResponse.json(
          {
            success: false,
            message: 'Your password has expired. Please contact an administrator to reset your password.',
          },
          { status: 401 }
        );
      }

      // If in grace period, allow login but set mustChangePassword
      if (expirationStatus.isInGracePeriod) {
        console.log(`User ${username} logging in with expired password (grace period: ${expirationStatus.gracePeriodDaysRemaining} days remaining)`);

        // Update user to require password change
        await db.User.update({
          where: { id: user.id },
          data: {
            mustChangePassword: true,
          },
        });

        // Update user object for response
        user.mustChangePassword = true;
      }
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
        institutionName: user.Institution?.name || '',
        Institution: user.Institution,
        Employee: user.Employee,
        isEnabled: user.active, // Frontend expects isEnabled
        active: user.active,
        employeeId: user.employeeId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginDate: new Date(),
        // Add password status flags
        mustChangePassword: user.mustChangePassword || false,
        isTemporaryPassword: user.isTemporaryPassword || false,
        temporaryPasswordExpiry: user.temporaryPasswordExpiry,
      }
    };

    // Password status for frontend to handle redirects
    const passwordStatus = {
      mustChange: user.mustChangePassword || false,
      isTemporary: user.isTemporaryPassword || false,
      expiresAt: user.temporaryPasswordExpiry,
      isExpired: false, // Already checked above, would have returned error
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

    // Log successful login attempt
    await logLoginAttempt({
      success: true,
      username: user.username,
      userId: user.id,
      userRole: user.role,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: authData,
      passwordStatus,
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
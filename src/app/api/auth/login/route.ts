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

    // Auto-unlock expired standard lockouts
    const { autoUnlockExpiredAccounts, isAccountLocked, getRemainingLockoutTime, getAccountLockoutStatus, incrementFailedLoginAttempts, resetFailedLoginAttempts } = await import('@/lib/account-lockout-utils');
    await autoUnlockExpiredAccounts();

    // Refresh user data after auto-unlock
    const refreshedUser = await db.User.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        active: true,
        employeeId: true,
        institutionId: true,
        isTemporaryPassword: true,
        temporaryPasswordExpiry: true,
        mustChangePassword: true,
        passwordExpiresAt: true,
        gracePeriodStartedAt: true,
        lastExpirationWarningLevel: true,
        failedLoginAttempts: true,
        loginLockedUntil: true,
        loginLockoutReason: true,
        loginLockoutType: true,
        isManuallyLocked: true,
      },
    });

    if (!refreshedUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 401 }
      );
    }

    // Use refreshed user data for subsequent checks
    const currentUser = refreshedUser;

    // Check if account is locked
    if (isAccountLocked(currentUser)) {
      const lockoutStatus = getAccountLockoutStatus(currentUser);
      console.log('Account locked for user:', username);

      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        userAgent,
        failureReason: `Account locked (${lockoutStatus.lockoutReason})`,
      });

      let message = 'Your account has been locked. ';
      if (lockoutStatus.canAutoUnlock && lockoutStatus.remainingMinutes > 0) {
        message += `Please try again in ${lockoutStatus.remainingMinutes} minutes.`;
      } else {
        message += 'Please contact an administrator to unlock your account.';
      }

      return NextResponse.json(
        { success: false, message },
        { status: 403 }
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
    const isPasswordValid = await comparePassword(password, currentUser.password);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', username);

      // Increment failed login attempts
      const lockoutResult = await incrementFailedLoginAttempts(currentUser.id, ipAddress, userAgent);

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

      let message = 'Invalid username/email or password';
      if (lockoutResult.locked) {
        message = 'Too many failed login attempts. Your account has been locked. ';
        if (lockoutResult.lockoutType === 'standard') {
          message += 'Please try again in 30 minutes.';
        } else {
          message += 'Please contact an administrator to unlock your account.';
        }
      } else if (lockoutResult.remainingAttempts > 0) {
        message += `. ${lockoutResult.remainingAttempts} attempt(s) remaining before account lockout.`;
      }

      return NextResponse.json(
        { success: false, message },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    await resetFailedLoginAttempts(currentUser.id);

    // Set initial activity timestamp for session timeout tracking
    await db.User.update({
      where: { id: currentUser.id },
      data: { lastActivity: new Date() },
    });

    // Check password status
    const now = new Date();
    const isTemporaryPasswordExpired =
      currentUser.isTemporaryPassword &&
      currentUser.temporaryPasswordExpiry &&
      new Date(currentUser.temporaryPasswordExpiry) < now;

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
    if (!currentUser.isTemporaryPassword) {
      const {
        isPasswordExpired,
        isInGracePeriod,
        getPasswordExpirationStatus
      } = await import('@/lib/password-expiration-utils');

      const expirationStatus = getPasswordExpirationStatus({
        role: currentUser.role,
        passwordExpiresAt: currentUser.passwordExpiresAt,
        gracePeriodStartedAt: currentUser.gracePeriodStartedAt,
        lastExpirationWarningLevel: currentUser.lastExpirationWarningLevel,
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
          where: { id: currentUser.id },
          data: {
            mustChangePassword: true,
          },
        });
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
        id: currentUser.id,
        fullName: user.name, // Frontend expects fullName (from original user with includes)
        name: user.name,
        username: currentUser.username,
        role: currentUser.role,
        institutionId: currentUser.institutionId,
        institutionName: user.Institution?.name || '',
        Institution: user.Institution,
        Employee: user.Employee,
        isEnabled: currentUser.active, // Frontend expects isEnabled
        active: currentUser.active,
        employeeId: currentUser.employeeId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginDate: new Date(),
        // Add password status flags
        mustChangePassword: currentUser.mustChangePassword || false,
        isTemporaryPassword: currentUser.isTemporaryPassword || false,
        temporaryPasswordExpiry: currentUser.temporaryPasswordExpiry,
      }
    };

    // Password status for frontend to handle redirects
    const passwordStatus = {
      mustChange: currentUser.mustChangePassword || false,
      isTemporary: currentUser.isTemporaryPassword || false,
      expiresAt: currentUser.temporaryPasswordExpiry,
      isExpired: false, // Already checked above, would have returned error
    };

    // Check if this is a first-time login (check if user has any existing notifications)
    const existingNotifications = await db.notification.findMany({
      where: { userId: currentUser.id },
      take: 1,
    });

    // If no existing notifications, create a welcome notification
    if (existingNotifications.length === 0) {
      const welcomeNotification = NotificationTemplates.welcomeMessage();
      await createNotification({
        userId: currentUser.id,
        message: welcomeNotification.message,
        link: welcomeNotification.link,
      });
    }

    // Log successful login attempt
    await logLoginAttempt({
      success: true,
      username: currentUser.username,
      userId: currentUser.id,
      userRole: currentUser.role,
      ipAddress,
      userAgent,
    });

    // Detect suspicious login and create session
    const { detectSuspiciousLogin, getLoginSummary } = await import('@/lib/suspicious-login-detector');
    const { createSession } = await import('@/lib/session-manager');
    const { createNotification: createSuspiciousNotification } = await import('@/lib/notifications');

    const suspiciousCheck = await detectSuspiciousLogin({
      userId: currentUser.id,
      ipAddress,
      userAgent,
    });

    // Create session with suspicious flag
    const session = await createSession(
      currentUser.id,
      ipAddress,
      userAgent,
      suspiciousCheck.isSuspicious
    );

    // Notify user if login is suspicious
    if (suspiciousCheck.shouldNotify) {
      const loginInfo = getLoginSummary({ userId: currentUser.id, ipAddress, userAgent });
      await createSuspiciousNotification({
        userId: currentUser.id,
        message: `New login detected from ${loginInfo.device} at ${loginInfo.location} on ${loginInfo.time}. If this wasn't you, please change your password immediately.`,
        link: '/dashboard/profile',
      });
    }

    // Generate and set CSRF token for protection against CSRF attacks
    const {
      generateCSRFToken,
      signCSRFToken,
      getCSRFCookieOptions,
      CSRF_COOKIE_NAME
    } = await import('@/lib/csrf-utils');

    const csrfToken = generateCSRFToken();
    const signedCSRFToken = signCSRFToken(csrfToken);
    const csrfCookieOptions = getCSRFCookieOptions();

    console.log('[LOGIN] Generated CSRF token for user:', currentUser.username);

    // Create response with CSRF token cookie
    const response = NextResponse.json({
      success: true,
      data: authData,
      passwordStatus,
      sessionToken: session.sessionToken, // Include session token in response
      csrfToken: signedCSRFToken, // Include CSRF token in response for client-side storage
      message: 'Login successful'
    });

    // Set CSRF token cookie (readable by JavaScript, but protected by SameSite)
    response.cookies.set(CSRF_COOKIE_NAME, signedCSRFToken, csrfCookieOptions);

    return response;

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    console.error("[LOGIN_POST]", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
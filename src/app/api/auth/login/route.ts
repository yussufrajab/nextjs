import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { comparePassword } from '@/lib/password-utils';
import { logLoginAttempt, getClientIp, logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity } from '@/lib/audit-logger';
import { checkPasswordBreached } from '@/lib/hibp';
import { createNotification } from '@/lib/notifications';
import { completeLogin } from '@/lib/auth-helpers';
import { createMfaToken, checkOtpRateLimit, maskEmail } from '@/lib/mfa-utils';
import { sendMfaEmail } from '@/lib/email';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import {
  generatePreSessionToken,
  getPreSessionCookieOptions,
  PRE_SESSION_COOKIE_NAME,
} from '@/lib/session-manager';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export const POST = wrapHandler(withRateLimit(async (request) => {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);

    authLogger.info({ username }, 'Login attempt');

    // Get client info for audit logging
    const ipAddress = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent');
    const deviceInfo: Record<string, any> | null = JSON.parse(request.headers.get('x-device-info') || 'null');

    // Session fixation protection: set a pre-session cookie before authentication.
    // This token must be presented back after successful login to prevent fixation.
    const isProduction = process.env.NODE_ENV === 'production';
    const preSessionToken = generatePreSessionToken();
    const preSessionCookieOptions = getPreSessionCookieOptions(isProduction);

    // Check if the input is an email (contains @) or username
    const isEmail = username.includes('@');

    // Find user in database by either email or username
    const user = await db.user.findFirst({
      where: isEmail ? { email: username } : { username: username },
      include: {
        Institution: true,
        Employee: true,
      },
    });

    if (!user) {
      authLogger.info({ username }, 'User not found');

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username,
        ipAddress,
        deviceInfo,
        failureReason: 'User not found',
      });

      const response = NextResponse.json(
        { success: false, message: 'Invalid username/email or password' },
        { status: 401 }
      );
      // Still set pre-session cookie so legitimate users get it for their next attempt
      response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return response;
    }

    // Auto-unlock expired standard lockouts
    const {
      autoUnlockExpiredAccounts,
      isAccountLocked,
      getRemainingLockoutTime,
      getAccountLockoutStatus,
      incrementFailedLoginAttempts,
      resetFailedLoginAttempts,
    } = await import('@/lib/account-lockout-utils');
    await autoUnlockExpiredAccounts();

    // Refresh user data after auto-unlock
    const refreshedUser = await db.user.findUnique({
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
        lockedBy: true,
        lockedAt: true,
        lockoutNotes: true,
      },
    });

    if (!refreshedUser) {
      const response = NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 401 }
      );
      response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return response;
    }

    // Use refreshed user data for subsequent checks
    const currentUser = refreshedUser;

    // Check if account is locked
    if (isAccountLocked(currentUser)) {
      const lockoutStatus = getAccountLockoutStatus(currentUser);
      authLogger.info({ username }, 'Account locked');

      // Still increment failed attempts to track persistent attack attempts
      // This allows upgrading from STANDARD to SECURITY lockout after 11 total attempts
      const lockoutResult = await incrementFailedLoginAttempts(
        currentUser.id,
        ipAddress,
        userAgent,
        deviceInfo
      );

      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        deviceInfo,
        failureReason: `Account locked (${lockoutStatus.lockoutReason})`,
      });

      let message = 'Your account has been locked. ';
      if (lockoutStatus.canAutoUnlock && lockoutStatus.remainingMinutes > 0) {
        message += `Please try again in ${lockoutStatus.remainingMinutes} minutes.`;
      } else {
        message += 'Please contact an administrator to unlock your account.';
      }

      // SECURITY: Use generic message to prevent username enumeration
      const lockoutResponse = NextResponse.json({ success: false, message: 'Invalid username/email or password' }, { status: 401 });
      lockoutResponse.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return lockoutResponse;
    }

    if (!user.active) {
      authLogger.info({ username }, 'User account is inactive');

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        deviceInfo,
        failureReason: 'Account is inactive',
      });

      // SECURITY: Use generic message to prevent username enumeration
      const response = NextResponse.json(
        { success: false, message: 'Invalid username/email or password' },
        { status: 401 }
      );
      response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return response;
    }

    // Verify password
    const isPasswordValid = await comparePassword(
      password,
      currentUser.password
    );

    if (!isPasswordValid) {
      authLogger.info({ username }, 'Invalid password');

      // Increment failed login attempts
      const lockoutResult = await incrementFailedLoginAttempts(
        currentUser.id,
        ipAddress,
        userAgent,
        deviceInfo
      );

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        deviceInfo,
        failureReason: 'Invalid password',
      });

      // SECURITY: Use generic message to prevent username enumeration.
      // Do NOT reveal attempt counts or whether the account exists.
      let message = 'Invalid username/email or password';
      if (lockoutResult.locked) {
        message =
          'Too many failed login attempts. Your account has been locked. ';
        if (lockoutResult.lockoutType === 'standard') {
          message += 'Please try again in 30 minutes.';
        } else {
          message += 'Please contact an administrator to unlock your account.';
        }
      }

      const invalidPwResponse = NextResponse.json({ success: false, message }, { status: 401 });
      invalidPwResponse.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return invalidPwResponse;
    }

    // Reset failed login attempts on successful login
    await resetFailedLoginAttempts(currentUser.id);

    // HIBP breach flag (GAP-H3): best-effort, non-blocking. If the password that
    // just authenticated appears in a known breach, flag it via an audit event
    // + notification so the user changes it. Never blocks or delays the login —
    // runs fire-and-forget. Fail-open on any error (HIBP down, etc.).
    void (async () => {
      try {
        const breach = await checkPasswordBreached(password);
        if (breach.isPwned) {
          await logAuditEvent({
            eventType: AuditEventType.PASSWORD_PWNED_LOGIN,
            eventCategory: AuditEventCategory.SECURITY,
            severity: AuditSeverity.WARNING,
            userId: currentUser.id,
            username: user.username,
            userRole: user.role,
            ipAddress,
            deviceInfo,
            attemptedRoute: '/api/auth/login',
            requestMethod: 'POST',
            isAuthenticated: true,
            wasBlocked: false,
            blockReason: null,
            additionalData: { breachCount: breach.count, kind: 'hibp_flag' },
          }).catch(() => {});
          await createNotification({
            userId: currentUser.id,
            message:
              'Your password was found in a known data breach. Please change it immediately in your profile settings.',
            link: '/dashboard/profile',
          }).catch(() => {});
        }
      } catch {
        // fail-open: never block login
      }
    })();

    // Check password status
    const now = new Date();
    const isTemporaryPasswordExpired =
      currentUser.isTemporaryPassword &&
      currentUser.temporaryPasswordExpiry &&
      new Date(currentUser.temporaryPasswordExpiry) < now;

    // If temporary password has expired, deny login
    if (isTemporaryPasswordExpired) {
      authLogger.info({ username }, 'Temporary password expired');
      // SECURITY: Use generic message to prevent username enumeration
      const response = NextResponse.json(
        {
          success: false,
          message: 'Invalid username/email or password',
        },
        { status: 401 }
      );
      response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return response;
    }

    // Check password expiration (non-temporary passwords only)
    if (!currentUser.isTemporaryPassword) {
      const {
        getPasswordExpirationStatus,
      } = await import('@/lib/password-expiration-utils');

      const expirationStatus = getPasswordExpirationStatus({
        role: currentUser.role,
        passwordExpiresAt: currentUser.passwordExpiresAt,
        gracePeriodStartedAt: currentUser.gracePeriodStartedAt,
        lastExpirationWarningLevel: currentUser.lastExpirationWarningLevel,
      });

      // If expired beyond grace period, deny login
      if (expirationStatus.isExpired && !expirationStatus.isInGracePeriod) {
        authLogger.info({ username }, 'Password expired beyond grace period');

        await logLoginAttempt({
          success: false,
          username: user.username,
          userId: user.id,
          userRole: user.role,
          ipAddress,
          deviceInfo,
          failureReason: 'Password expired beyond grace period',
        });

        const response = NextResponse.json(
          {
            success: false,
            message:
              'Your password has expired. Please contact an administrator to reset your password.',
          },
          { status: 401 }
        );
        response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
        return response;
      }

      // If in grace period, allow login but set mustChangePassword
      if (expirationStatus.isInGracePeriod) {
        await db.user.update({
          where: { id: currentUser.id },
          data: { mustChangePassword: true },
        });
        currentUser.mustChangePassword = true;
      }
    }

    authLogger.info({ username }, 'Login successful');

    // --- MFA Gate ---
    // If user has an email address, require MFA verification before creating a session
    if (user.email) {
      const rateLimitCheck = await checkOtpRateLimit(currentUser.id);
      if (!rateLimitCheck.allowed) {
        const response = NextResponse.json(
          {
            success: false,
            message: `Too many verification requests. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
          },
          { status: 429 }
        );
        response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
        return response;
      }

      const mfaTokenExpiryMinutes = Number(process.env.MFA_TOKEN_EXPIRY_MINUTES) || 10;
      const { token: otpToken } = await createMfaToken(currentUser.id, 'OTP', user.email, ipAddress, userAgent);
      const { token: magicLinkToken } = await createMfaToken(currentUser.id, 'MAGIC_LINK', user.email, ipAddress, userAgent);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const magicLinkUrl = `${appUrl}/mfa/magic-link-confirm?token=${magicLinkToken}`;

      const emailResult = await sendMfaEmail(user.email, otpToken, magicLinkUrl, user.name, mfaTokenExpiryMinutes);

      if (!emailResult.success) {
        authLogger.error({ err: emailResult.error }, 'Failed to send MFA email');
        const response = NextResponse.json(
          { success: false, message: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
        response.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
        return response;
      }

      const mfaResponse = NextResponse.json({
        success: true,
        code: 'MFA_REQUIRED',
        data: {
          userId: currentUser.id,
          email: maskEmail(user.email),
        },
        message: 'MFA verification required',
      });
      // Preserve pre-session cookie through MFA flow
      mfaResponse.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return mfaResponse;
    }

    // No email on file — skip MFA and complete login directly
    authLogger.info({ username }, 'No email on file, skipping MFA');

    // Read pre-session token for session fixation protection
    const cookiePreSessionToken = (request as any).cookies.get(PRE_SESSION_COOKIE_NAME)?.value || null;

    return completeLogin({
      user: {
        ...currentUser,
        name: user.name,
        Institution: user.Institution,
        Employee: user.Employee,
      },
      ipAddress,
      userAgent,
      deviceInfo,
      preSessionToken: cookiePreSessionToken,
    });
}, 'auth'), 'auth-login');

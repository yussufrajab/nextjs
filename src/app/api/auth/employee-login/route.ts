import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import {
  hashPassword,
  calculateTemporaryPasswordExpiry,
} from '@/lib/password-utils';
import { createMfaToken, checkOtpRateLimit, maskEmail } from '@/lib/mfa-utils';
import { validateGovernmentEmail, setUserGovernmentEmail } from '@/lib/employee-email';
import { sendMfaEmail } from '@/lib/email';
import { logLoginAttempt, getClientIp } from '@/lib/audit-logger';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const employeeLoginSchema = z.object({
  zanId: z.string().min(1),
  zssfNumber: z.string().min(1),
  payrollNumber: z.string().min(1),
  email: z.string().optional(),
});

// Helper function to generate username from employee name
function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .slice(0, 50); // Limit to 50 characters
}

export const POST = wrapHandler(withRateLimit(async (request) => {
    const csrfCheck = await validateCSRF(request);
    if (!csrfCheck.valid) return csrfCheck.response!;

    const body = await request.json();
    const { zanId, zssfNumber, payrollNumber, email } =
      employeeLoginSchema.parse(body);

    // Get client info for audit logging
    const ipAddress = getClientIp(request.headers);
    const userAgent = request.headers.get('user-agent') || null;
    const deviceInfo: Record<string, any> | null = JSON.parse(request.headers.get('x-device-info') || 'null');

    // Trim whitespace and normalize input
    const normalizedZanId = zanId.trim();
    const normalizedZssfNumber = zssfNumber.trim().toUpperCase();
    const normalizedPayrollNumber = payrollNumber.trim().toUpperCase();

    authLogger.info({
      zanId: normalizedZanId,
      zssfNumber: normalizedZssfNumber,
      payrollNumber: normalizedPayrollNumber,
    }, 'Employee login search criteria');

    // Find employee with matching credentials
    const employee = await db.employee.findFirst({
      where: {
        zanId: normalizedZanId,
        zssfNumber: normalizedZssfNumber,
        payrollNumber: normalizedPayrollNumber,
      },
      include: {
        Institution: {
          select: {
            name: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
            email: true,
          },
        },
      },
    });

    if (!employee) {
      authLogger.info('No employee found with provided credentials');

      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: normalizedZanId,
        ipAddress,
        deviceInfo,
        failureReason: 'Employee not found with provided credentials',
      });

      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid employee credentials. Please check your ZAN ID, ZSSF Number, and Payroll Number.',
        },
        { status: 401 }
      );
    }

    // Auto-provision user account if employee doesn't have one (JIT provisioning)
    let user = employee.User;

    if (!user) {
      authLogger.info({ employeeName: employee.name }, 'No user account found, auto-provisioning');

      try {
        // Generate username from employee name
        const baseUsername = generateUsername(employee.name);

        // Check if username already exists and make it unique if necessary
        let username = baseUsername;
        let counter = 1;
        while (await db.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Generate cryptographically random default password
        const defaultPassword = randomBytes(16).toString('hex');
        const hashedPassword = await hashPassword(defaultPassword);

        // Generate unique id for user
        const userId = `emp_${randomBytes(16).toString('hex')}`;

        // Create user account with temporary password flags
        user = await db.user.create({
          data: {
            id: userId,
            username,
            password: hashedPassword,
            name: employee.name,
            role: ROLES.EMPLOYEE as string,
            active: true,
            employeeId: employee.id,
            institutionId: employee.institutionId,
            // Set temporary password flags
            isTemporaryPassword: true,
            temporaryPasswordExpiry: calculateTemporaryPasswordExpiry(),
            mustChangePassword: true,
            passwordHistory: [],
            lastPasswordChange: new Date(),
            failedPasswordChangeAttempts: 0,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
            email: true,
          },
        });

        authLogger.info(
          { username: user.username, employeeId: employee.id },
          'User account auto-provisioned successfully'
        );
      } catch (provisionError) {
        authLogger.error(
          { err: provisionError },
          'Error auto-provisioning user account'
        );

        // Log failed login attempt
        await logLoginAttempt({
          success: false,
          username: normalizedZanId,
          ipAddress,
          deviceInfo,
          failureReason: 'Failed to auto-provision user account',
        });

        return NextResponse.json(
          {
            success: false,
            message:
              'Failed to create user account. Please contact HR for assistance.',
          },
          { status: 500 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Failed to create user account.' },
        { status: 500 }
      );
    }

    // Check if user account is active
    if (!user.active) {
      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        deviceInfo,
        failureReason: 'Employee account is inactive',
      });

      return NextResponse.json(
        {
          success: false,
          message:
            'Your account has been deactivated. Please contact HR for assistance.',
        },
        { status: 401 }
      );
    }

    // Check if user role is EMPLOYEE
    if (user.role !== ROLES.EMPLOYEE) {
      // Log failed login attempt
      await logLoginAttempt({
        success: false,
        username: user.username,
        userId: user.id,
        userRole: user.role,
        ipAddress,
        deviceInfo,
        failureReason: 'Non-employee role attempted employee login',
      });

      return NextResponse.json(
        {
          success: false,
          message:
            'This login is only for employees. Please use the staff login page.',
        },
        { status: 403 }
      );
    }

    // --- MFA Gate ---
    // Determine the email to use for MFA. If one is already stored on the
    // user record, reuse it (skip the prompt). Otherwise, if the client
    // supplied a government email at login, validate and persist it so it
    // survives future logins, then use it for MFA.
    let effectiveEmail: string | null = user.email ?? null;

    if (!effectiveEmail && email) {
      const validation = validateGovernmentEmail(email);
      if (!validation.ok) {
        return NextResponse.json(
          { success: false, message: validation.error },
          { status: 400 }
        );
      }

      const persist = await setUserGovernmentEmail(employee.id, validation.email);
      if (!persist.ok) {
        return NextResponse.json(
          { success: false, message: persist.message },
          { status: persist.status }
        );
      }

      effectiveEmail = validation.email;
      user = { ...user, email: effectiveEmail };
    }

    if (effectiveEmail) {
      const rateLimitCheck = await checkOtpRateLimit(user.id);
      if (!rateLimitCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            message: `Too many verification requests. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
          },
          { status: 429 }
        );
      }

      const mfaTokenExpiryMinutes = Number(process.env.MFA_TOKEN_EXPIRY_MINUTES) || 10;
      const { token: otpToken } = await createMfaToken(user.id, 'OTP', effectiveEmail, ipAddress, userAgent);
      const { token: magicLinkToken } = await createMfaToken(user.id, 'MAGIC_LINK', effectiveEmail, ipAddress, userAgent);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
      const magicLinkUrl = `${appUrl}/mfa/magic-link-confirm?token=${magicLinkToken}`;

      const emailResult = await sendMfaEmail(effectiveEmail, otpToken, magicLinkUrl, user.name, mfaTokenExpiryMinutes);

      if (!emailResult.success) {
        authLogger.error({ err: emailResult.error }, 'Failed to send MFA email');
        return NextResponse.json(
          { success: false, message: 'Failed to send verification email. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        code: 'MFA_REQUIRED',
        data: {
          userId: user.id,
          email: maskEmail(effectiveEmail),
        },
        message: 'MFA verification required',
      });
    }

    // No stored email and none provided at login — require the government
    // email before MFA can be sent (it is needed for the verification link).
    authLogger.info({ username: user.username }, 'No email on file, requesting government email');
    return NextResponse.json({
      success: true,
      code: 'EMAIL_REQUIRED',
      data: { userId: user.id },
      message: 'Government email address required to continue',
    });
}, 'auth'), 'auth-employee-login');

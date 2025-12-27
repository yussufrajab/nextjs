import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { ROLES } from '@/lib/constants';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { hashPassword, calculateTemporaryPasswordExpiry } from '@/lib/password-utils';

const employeeLoginSchema = z.object({
  zanId: z.string().min(1),
  zssfNumber: z.string().min(1),
  payrollNumber: z.string().min(1),
});

// Helper function to generate username from employee name
function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .slice(0, 50); // Limit to 50 characters
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { zanId, zssfNumber, payrollNumber } = employeeLoginSchema.parse(body);

    // Trim whitespace and normalize input
    const normalizedZanId = zanId.trim();
    const normalizedZssfNumber = zssfNumber.trim().toUpperCase();
    const normalizedPayrollNumber = payrollNumber.trim().toUpperCase();

    console.log('[EMPLOYEE_LOGIN] Search criteria:', {
      zanId: normalizedZanId,
      zssfNumber: normalizedZssfNumber,
      payrollNumber: normalizedPayrollNumber
    });

    // Find employee with matching credentials
    const employee = await db.Employee.findFirst({
      where: {
        zanId: normalizedZanId,
        zssfNumber: normalizedZssfNumber,
        payrollNumber: normalizedPayrollNumber,
      },
      include: {
        Institution: {
          select: {
            name: true,
          }
        },
        User: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            active: true,
          }
        }
      }
    });

    if (!employee) {
      console.log('[EMPLOYEE_LOGIN] No employee found with provided credentials');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid employee credentials. Please check your ZAN ID, ZSSF Number, and Payroll Number.' 
        },
        { status: 401 }
      );
    }

    // Auto-provision user account if employee doesn't have one (JIT provisioning)
    let user = employee.User;

    if (!user) {
      console.log('[EMPLOYEE_LOGIN] No user account found. Auto-provisioning user account for employee:', employee.name);

      try {
        // Generate username from employee name
        const baseUsername = generateUsername(employee.name);

        // Check if username already exists and make it unique if necessary
        let username = baseUsername;
        let counter = 1;
        while (await db.User.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Generate default password (using ZAN ID as default for security)
        const defaultPassword = employee.zanId;
        const hashedPassword = await hashPassword(defaultPassword);

        // Generate unique id for user
        const userId = `emp_${randomBytes(16).toString('hex')}`;

        // Create user account with temporary password flags
        user = await db.User.create({
          data: {
            id: userId,
            username,
            password: hashedPassword,
            name: employee.name,
            role: ROLES.EMPLOYEE,
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
          }
        });

        console.log('[EMPLOYEE_LOGIN] User account auto-provisioned successfully:', {
          username: user.username,
          employeeId: employee.id
        });

      } catch (provisionError) {
        console.error('[EMPLOYEE_LOGIN] Error auto-provisioning user account:', provisionError);
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to create user account. Please contact HR for assistance.'
          },
          { status: 500 }
        );
      }
    }

    // Check if user account is active
    if (!user.active) {
      return NextResponse.json(
        {
          success: false,
          message: 'Your account has been deactivated. Please contact HR for assistance.'
        },
        { status: 401 }
      );
    }

    // Check if user role is EMPLOYEE
    if (user.role !== ROLES.EMPLOYEE) {
      return NextResponse.json(
        {
          success: false,
          message: 'This login is only for employees. Please use the staff login page.'
        },
        { status: 403 }
      );
    }

    // Set initial activity timestamp for session timeout tracking
    await db.User.update({
      where: { id: user.id },
      data: { lastActivity: new Date() },
    });

    // Get client info for session creation
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     req.headers.get('x-real-ip') ||
                     null;
    const userAgent = req.headers.get('user-agent') || null;

    // Detect suspicious login and create session
    const { detectSuspiciousLogin, getLoginSummary } = await import('@/lib/suspicious-login-detector');
    const { createSession } = await import('@/lib/session-manager');
    const { createNotification } = await import('@/lib/notifications');

    const suspiciousCheck = await detectSuspiciousLogin({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    // Create session with suspicious flag
    const session = await createSession(
      user.id,
      ipAddress,
      userAgent,
      suspiciousCheck.isSuspicious
    );

    // Notify user if login is suspicious
    if (suspiciousCheck.shouldNotify) {
      const loginInfo = getLoginSummary({ userId: user.id, ipAddress, userAgent });
      await createNotification({
        userId: user.id,
        message: `New login detected from ${loginInfo.device} at ${loginInfo.location} on ${loginInfo.time}. If this wasn't you, please contact HR immediately.`,
        link: '/dashboard/profile',
      });
    }

    // Successful authentication - return user data
    const userData = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      employeeId: employee.id,
      institutionId: employee.institutionId,
      department: employee.department,
      cadre: employee.cadre,
      Institution: employee.Institution.name,
      zanId: employee.zanId,
      zssfNumber: employee.zssfNumber,
      payrollNumber: employee.payrollNumber,
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userData,
      sessionToken: session.sessionToken, // Include session token
    });

  } catch (error) {
    console.error('[EMPLOYEE_LOGIN]', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input data',
          errors: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error. Please try again later.' 
      },
      { status: 500 }
    );
  }
}
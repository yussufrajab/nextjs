import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

// Email must end with .go.tz or .ac.tz
const ALLOWED_EMAIL_DOMAINS = ['.go.tz', '.ac.tz'];

function isValidGovernmentEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some(domain => lowerEmail.endsWith(domain));
}

export const PATCH = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employeeId') || '';

  if (!employeeId) {
    return NextResponse.json(
      { success: false, message: 'Employee ID is required' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { email } = body;

  // Validate email format
  if (!email || typeof email !== 'string') {
    return NextResponse.json(
      { success: false, message: 'Email is required' },
      { status: 400 }
    );
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return NextResponse.json(
      { success: false, message: 'Please enter a valid email address' },
      { status: 400 }
    );
  }

  // Validate domain (.go.tz or .ac.tz only)
  if (!isValidGovernmentEmail(trimmedEmail)) {
    return NextResponse.json(
      {
        success: false,
        message: 'Email must end with .go.tz or .ac.tz (government or academic domain only)',
      },
      { status: 400 }
    );
  }

  // Verify the employee belongs to the authenticated user
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { employeeId: true, role: true },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: 'User not found' },
      { status: 404 }
    );
  }

  // Only allow EMPLOYEE role to update their own email, or allow HRO/Admin to update
  if (user.role === 'EMPLOYEE' && user.employeeId !== employeeId) {
    return NextResponse.json(
      { success: false, message: 'You can only update your own email' },
      { status: 403 }
    );
  }

  // Check for duplicate email — another user already has this email
  const existingUser = await db.user.findFirst({
    where: {
      email: trimmedEmail,
      NOT: { employeeId: employeeId },
    },
    select: { id: true, name: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { success: false, message: 'This email address is already in use by another employee' },
      { status: 409 }
    );
  }

  // Also check Employee table for duplicates
  const existingEmployee = await db.employee.findFirst({
    where: {
      email: trimmedEmail,
      NOT: { id: employeeId },
    },
    select: { id: true, name: true },
  });

  if (existingEmployee) {
    return NextResponse.json(
      { success: false, message: 'This email address is already in use by another employee' },
      { status: 409 }
    );
  }

  // Check if employee exists
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, zanId: true, name: true },
  });

  if (!employee) {
    return NextResponse.json(
      { success: false, message: 'Employee not found' },
      { status: 404 }
    );
  }

  // Update employee email on BOTH User and Employee records
  const [updatedUser, updatedEmployee] = await Promise.all([
    db.user.update({
      where: { employeeId: employeeId },
      data: { email: trimmedEmail },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
    db.employee.update({
      where: { id: employeeId },
      data: { email: trimmedEmail },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  authLogger.info({
    employeeId,
    zanId: employee.zanId,
    email: trimmedEmail,
    updatedBy: auth.userId,
  }, 'Employee email updated');

  return NextResponse.json({
    success: true,
    message: 'Email updated successfully',
    data: {
      id: updatedUser.id,
      email: updatedUser.email,
      employeeEmail: updatedEmployee.email,
    },
  });
}), 'read'), 'employees-email');
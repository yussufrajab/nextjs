import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateGovernmentEmail, setUserGovernmentEmail } from '@/lib/employee-email';

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

  // Validate email format + government/academic domain via shared helper
  const validation = validateGovernmentEmail(email);
  if (!validation.ok) {
    return NextResponse.json(
      { success: false, message: validation.error },
      { status: 400 }
    );
  }
  const trimmedEmail = validation.email;

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

  // SECURITY: Institution ownership check for HRO/HRRP
  if (shouldApplyInstitutionFilter(user.role, auth.institutionId)) {
    const targetEmployee = await db.employee.findUnique({
      where: { id: employeeId },
      select: { institutionId: true },
    });
    if (!targetEmployee || targetEmployee.institutionId !== auth.institutionId) {
      return NextResponse.json(
        { success: false, message: 'Access denied: employee belongs to a different institution' },
        { status: 403 }
      );
    }
  }

  // Persist to BOTH User and Employee records, enforcing uniqueness.
  const result = await setUserGovernmentEmail(employeeId, trimmedEmail);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status }
    );
  }

  const { user: updatedUser, employee: updatedEmployee } = result;

  authLogger.info({
    employeeId,
    zanId: updatedEmployee.id,
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

import { db } from '@/lib/db';

// Government/academic email domains permitted for employee accounts.
export const ALLOWED_EMAIL_DOMAINS = ['.go.tz', '.ac.tz'];

export function isValidGovernmentEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.some((domain) => lowerEmail.endsWith(domain));
}

export type GovernmentEmailValidation =
  | { ok: true; email: string }
  | { ok: false; error: string };

export function validateGovernmentEmail(raw: unknown): GovernmentEmailValidation {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'Email is required' };
  }

  const email = raw.trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }

  if (!isValidGovernmentEmail(email)) {
    return {
      ok: false,
      error: 'Email must end with .go.tz or .ac.tz (government or academic domain only)',
    };
  }

  return { ok: true, email };
}

export type SetGovernmentEmailResult =
  | { ok: true; user: { id: string; email: string | null }; employee: { id: string; email: string | null } }
  | { ok: false; status: number; message: string };

/**
 * Persist a government email to BOTH the User record (keyed by employeeId)
 * and the Employee record (keyed by id). Enforces uniqueness across both
 * tables, excluding the employee being updated. Returns a discriminated
 * result so callers can map to the correct HTTP status (409 on duplicate,
 * 404 on unknown employee).
 *
 * The email is the single source of truth for MFA communications, so it must
 * live on both tables and survive logout (re-hydrated via /api/auth/me).
 */
export async function setUserGovernmentEmail(
  employeeId: string,
  email: string
): Promise<SetGovernmentEmailResult> {
  const existingUser = await db.user.findFirst({
    where: { email, NOT: { employeeId } },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      status: 409,
      message: 'This email address is already in use by another employee',
    };
  }

  const existingEmployee = await db.employee.findFirst({
    where: { email, NOT: { id: employeeId } },
    select: { id: true },
  });

  if (existingEmployee) {
    return {
      ok: false,
      status: 409,
      message: 'This email address is already in use by another employee',
    };
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });

  if (!employee) {
    return { ok: false, status: 404, message: 'Employee not found' };
  }

  const [updatedUser, updatedEmployee] = await Promise.all([
    db.user.update({
      where: { employeeId },
      data: { email },
      select: { id: true, email: true },
    }),
    db.employee.update({
      where: { id: employeeId },
      data: { email },
      select: { id: true, email: true },
    }),
  ]);

  return { ok: true, user: updatedUser, employee: updatedEmployee };
}

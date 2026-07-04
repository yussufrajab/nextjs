/**
 * Response sanitization utilities to strip sensitive user fields
 * from API responses before sending them to clients.
 */

export const SENSITIVE_USER_FIELDS = [
  'password',
  'passwordHash',
  'failedLoginAttempts',
  'loginLockedUntil',
  'loginLockoutType',
  'loginLockoutReason',
  'isManuallyLocked',
  'lockedBy',
  'lockedAt',
  'lockoutNotes',
  'failedPasswordChangeAttempts',
  'passwordChangeLockoutUntil',
  'isTemporaryPassword',
  'mustChangePassword',
  'passwordExpiresAt',
  'gracePeriodStartedAt',
  'lastExpirationWarningLevel',
  'passwordHistory',
] as const;

/**
 * Strips sensitive fields from a single user object.
 * Returns a shallow copy with all SENSITIVE_USER_FIELDS removed.
 */
export function sanitizeUser<T extends Record<string, any>>(
  user: T
): Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]> {
  const copy = { ...user };
  for (const field of SENSITIVE_USER_FIELDS) {
    delete (copy as Record<string, any>)[field];
  }
  return copy as Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]>;
}

/**
 * Strips sensitive fields from an array of user objects.
 */
export function sanitizeUsers<T extends Record<string, any>>(
  users: T[]
): Omit<T, (typeof SENSITIVE_USER_FIELDS)[number]>[] {
  return users.map(sanitizeUser);
}

/**
 * Masks a session token for safe logging.
 * Returns '****' for empty or very short tokens,
 * otherwise shows first 4 characters followed by '...'.
 */
export function maskSessionToken(token: string): string {
  if (!token || token.length <= 4) {
    return '****';
  }
  return token.slice(0, 4) + '...';
}

// ---------------------------------------------------------------------------
// Employee field masking
// ---------------------------------------------------------------------------

/** Roles that can see full employee PII */
const PRIVILEGED_EMPLOYEE_ROLES = ['ADMIN', 'HRO', 'HRRP', 'HHRMD', 'HRMO', 'CSCS', 'DO', 'PO'];

/** Masking functions for sensitive employee fields */
const EMPLOYEE_FIELD_MASKS: Record<string, (val: string) => string> = {
  zanId: (val) => (val ? '***' + val.slice(-4) : val),
  zssfNumber: (val) => (val ? '***' + val.slice(-4) : val),
  payrollNumber: (val) => (val ? '***' + val.slice(-4) : val),
  phoneNumber: (val) => (val ? '***' + val.slice(-4) : val),
  contactAddress: () => '[REDACTED]',
};

/**
 * Masks sensitive employee fields for non-privileged roles.
 * Privileged roles (ADMIN, HRO, HHRMD, HRMO, CSCS, DO, PO) get full data.
 * Other roles get masked ZAN ID, ZSSF, payroll, phone, and redacted address.
 */
export function sanitizeEmployee<T extends Record<string, any>>(
  employee: T,
  requestingRole: string | null
): T {
  if (requestingRole && PRIVILEGED_EMPLOYEE_ROLES.includes(requestingRole.toUpperCase())) {
    return employee;
  }
  const sanitized: Record<string, any> = { ...employee };
  for (const [field, maskFn] of Object.entries(EMPLOYEE_FIELD_MASKS)) {
    if (sanitized[field]) {
      sanitized[field] = maskFn(sanitized[field]);
    }
  }
  return sanitized as T;
}

/**
 * Masks sensitive fields from an array of employee objects.
 */
export function sanitizeEmployees<T extends Record<string, any>>(
  employees: T[],
  requestingRole: string | null
): T[] {
  return employees.map((emp) => sanitizeEmployee(emp, requestingRole));
}
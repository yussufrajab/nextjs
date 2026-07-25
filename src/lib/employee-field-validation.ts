/**
 * Employee business-rule validation (Req 6.8).
 *
 * Shared by the manual-entry and bulk-upload creation paths so enum values,
 * identifier formats, and cross-field date logic are enforced consistently.
 * The DB columns are free-text Strings, so without these checks an HRO could
 * submit arbitrary/garbage values.
 */

// ---------------------------------------------------------------------------
// Enumerated text fields
// ---------------------------------------------------------------------------

export const GENDER_VALUES = ['Male', 'Female'] as const;
export const APPOINTMENT_TYPE_VALUES = ['Permanent', 'Contract', 'Temporary', 'Casual'] as const;
export const CONTRACT_TYPE_VALUES = ['Full-time', 'Part-time'] as const;

/**
 * True if `value` is empty (optional → skip) or one of the allowed values.
 */
export function isValidEnum(
  value: string | null | undefined,
  allowed: readonly string[]
): boolean {
  if (value == null || value === '') return true; // optional → skip
  return allowed.includes(value);
}

// ---------------------------------------------------------------------------
// Identifier formats — ZSSF / payroll numbers
// ---------------------------------------------------------------------------

/**
 * ZSSF and payroll identifiers are alphanumeric, optionally hyphenated,
 * 2–50 chars, and must start with an alphanumeric character. This rejects
 * spaces, symbols, leading hyphens, and empty values while accepting the
 * real/legacy formats seen in the data: `ZSSF001`, `ZSSF123456`, `PAY001`,
 * `PR001`, `SSF-1`, `PR-1`.
 */
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{1,49}$/;

export function isValidZssfNumber(value: string | null | undefined): boolean {
  if (!value) return true; // optional/empty → skip (required-ness is checked separately)
  return IDENTIFIER_PATTERN.test(value.trim());
}

export function isValidPayrollNumber(value: string | null | undefined): boolean {
  if (!value) return true;
  return IDENTIFIER_PATTERN.test(value.trim());
}

// ---------------------------------------------------------------------------
// Cross-field date logic
// ---------------------------------------------------------------------------

export interface EmployeeDateFields {
  dateOfBirth?: string | null;
  employmentDate?: string | null;
  confirmationDate?: string | null;
  retirementDate?: string | null;
}

/**
 * Parse a `YYYY-MM-DD` string into a Date (UTC midnight), or null if the
 * value is empty or not a valid ISO calendar date. Per-field format errors
 * are reported by the routes' own format validators; this only gates the
 * cross-field comparisons.
 */
export function parseISODate(value?: string | null): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Cross-field date logic (Req 6.8):
 *   - employmentDate must be strictly AFTER dateOfBirth
 *   - confirmationDate must be ON OR AFTER employmentDate
 *   - retirementDate must be strictly AFTER employmentDate
 *
 * Only fields that are present AND parse to valid dates are compared, so an
 * invalid format on one field does not produce a spurious cross-field error
 * (the per-field validator reports the format problem).
 */
export function validateCrossFieldDates(d: EmployeeDateFields): string[] {
  const dob = parseISODate(d.dateOfBirth);
  const emp = parseISODate(d.employmentDate);
  const conf = parseISODate(d.confirmationDate);
  const ret = parseISODate(d.retirementDate);
  const errors: string[] = [];

  if (dob && emp && emp.getTime() <= dob.getTime()) {
    errors.push('Employment date must be after date of birth');
  }
  if (emp && conf && conf.getTime() < emp.getTime()) {
    errors.push('Confirmation date cannot be before employment date');
  }
  if (emp && ret && ret.getTime() <= emp.getTime()) {
    errors.push('Retirement date must be after employment date');
  }

  return errors;
}
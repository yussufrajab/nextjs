// Unit tests for the shared government-email helper used by both the
// employee-login capture flow and the profile-page PATCH /api/employees/email.
//
// Verifies:
//  - Domain allow-list validation (.go.tz / .ac.tz)
//  - Rejection of invalid format / wrong domain / empty input
//  - setUserGovernmentEmail writes BOTH User.email and Employee.email
//  - setUserGovernmentEmail returns 409 on a duplicate email
//  - setUserGovernmentEmail returns 404 for an unknown employee

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserFindFirst = vi.fn();
const mockEmployeeFindFirst = vi.fn();
const mockEmployeeFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockEmployeeUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: (...a: any[]) => mockUserFindFirst(...a),
      update: (...a: any[]) => mockUserUpdate(...a),
    },
    employee: {
      findFirst: (...a: any[]) => mockEmployeeFindFirst(...a),
      findUnique: (...a: any[]) => mockEmployeeFindUnique(...a),
      update: (...a: any[]) => mockEmployeeUpdate(...a),
    },
  },
}));

import {
  validateGovernmentEmail,
  isValidGovernmentEmail,
  setUserGovernmentEmail,
  ALLOWED_EMAIL_DOMAINS,
} from './employee-email';

describe('ALLOWED_EMAIL_DOMAINS', () => {
  it('permits government and academic Tanzanian domains', () => {
    expect(ALLOWED_EMAIL_DOMAINS).toEqual(['.go.tz', '.ac.tz']);
  });
});

describe('isValidGovernmentEmail', () => {
  it('accepts .go.tz and .ac.tz (case-insensitive)', () => {
    expect(isValidGovernmentEmail('a@gov.go.tz')).toBe(true);
    expect(isValidGovernmentEmail('a@univ.AC.TZ')).toBe(true);
  });

  it('rejects other domains', () => {
    expect(isValidGovernmentEmail('a@gmail.com')).toBe(false);
    expect(isValidGovernmentEmail('a@gov.co.tz')).toBe(false);
  });
});

describe('validateGovernmentEmail', () => {
  it('rejects empty / non-string input', () => {
    expect(validateGovernmentEmail('').ok).toBe(false);
    expect(validateGovernmentEmail(null).ok).toBe(false);
    expect(validateGovernmentEmail(undefined).ok).toBe(false);
  });

  it('rejects malformed addresses', () => {
    expect(validateGovernmentEmail('not-an-email').ok).toBe(false);
    expect(validateGovernmentEmail('a@b').ok).toBe(false);
  });

  it('rejects non-government domains', () => {
    const r = validateGovernmentEmail('emp@gmail.com');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/go\.tz|\.ac\.tz/);
  });

  it('normalizes and accepts a valid government email', () => {
    const r = validateGovernmentEmail('  Emp@Gov.GO.TZ ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe('emp@gov.go.tz');
  });
});

describe('setUserGovernmentEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes the email to BOTH User and Employee records and returns ok', async () => {
    mockUserFindFirst.mockResolvedValue(null); // no duplicate
    mockEmployeeFindUnique.mockResolvedValue({ id: 'emp_1' });
    mockUserUpdate.mockResolvedValue({ id: 'user_1', email: 'emp@gov.go.tz' });
    mockEmployeeUpdate.mockResolvedValue({ id: 'emp_1', email: 'emp@gov.go.tz' });

    const result = await setUserGovernmentEmail('emp_1', 'emp@gov.go.tz');

    expect(result.ok).toBe(true);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp_1' }, data: { email: 'emp@gov.go.tz' } })
    );
    expect(mockEmployeeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'emp_1' }, data: { email: 'emp@gov.go.tz' } })
    );
  });

  it('returns 409 when another User already uses the email', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'other_user' }); // duplicate
    const result = await setUserGovernmentEmail('emp_1', 'emp@gov.go.tz');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
      expect(result.message).toMatch(/already in use/);
    }
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 409 when another Employee already uses the email', async () => {
    // No duplicate User, but duplicate Employee (employee.findFirst)
    mockUserFindFirst.mockResolvedValue(null);
    mockEmployeeFindFirst.mockResolvedValue({ id: 'other_emp' });
    mockEmployeeFindUnique.mockResolvedValue({ id: 'emp_1' }); // existence check
    const result = await setUserGovernmentEmail('emp_1', 'emp@gov.go.tz');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it('returns 404 when the employee does not exist', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    mockEmployeeFindUnique.mockResolvedValue(null);
    const result = await setUserGovernmentEmail('emp_missing', 'emp@gov.go.tz');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });
});

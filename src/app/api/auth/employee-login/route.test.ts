// Route-level tests for the employee-login government-email capture flow.
//
// Verifies the new login behavior:
//  - No stored email + no email in body  -> EMAIL_REQUIRED
//  - No stored email + valid email in body -> persists to User+Employee, returns MFA_REQUIRED
//  - No stored email + invalid domain     -> 400
//  - No stored email + duplicate email     -> 409
//  - Stored email present                  -> straight to MFA_REQUIRED (no prompt)
//
// The persistence/validation logic itself is unit-tested in
// src/lib/employee-email.test.ts; this file asserts the route wiring.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockEmployeeFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserUpdate = vi.fn();
const mockEmployeeFindUnique = vi.fn();
const mockEmployeeUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    employee: {
      findFirst: (...a: any[]) => mockEmployeeFindFirst(...a),
      findUnique: (...a: any[]) => mockEmployeeFindUnique(...a),
      update: (...a: any[]) => mockEmployeeUpdate(...a),
    },
    user: {
      findUnique: (...a: any[]) => mockUserFindUnique(...a),
      findFirst: (...a: any[]) => mockUserFindFirst(...a),
      create: (...a: any[]) => mockUserCreate(...a),
      update: (...a: any[]) => mockUserUpdate(...a),
    },
  },
}));

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: () => Promise.resolve({ valid: true, response: null }),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: () => Promise.resolve({ allowed: true, retryAfter: 0 }),
  getClientIp: () => '127.0.0.1',
  withRateLimit: (handler: any) => handler,
}));

vi.mock('@/lib/mfa-utils', () => ({
  createMfaToken: () => Promise.resolve({ token: 'otp-123' }),
  checkOtpRateLimit: () => Promise.resolve({ allowed: true, retryAfterSeconds: 0 }),
  maskEmail: (email: string) => `${email[0]}***@${email.split('@')[1]}`,
}));

vi.mock('@/lib/email', () => ({
  sendMfaEmail: () => Promise.resolve({ success: true }),
}));

vi.mock('@/lib/audit-logger', () => ({
  logLoginAttempt: () => Promise.resolve(undefined),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/logger', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), fatal: vi.fn() };
  return { authLogger: { ...logger, child: () => logger } };
});

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:9002/api/auth/employee-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const EMPLOYEE = {
  id: 'emp_1',
  name: 'Asha Juma',
  zanId: 'Z123',
  zssfNumber: 'ZSSF1',
  payrollNumber: 'PAY1',
  institutionId: 'inst-1',
  Institution: { name: 'Ministry' },
  // User exists (no JIT provisioning); email intentionally null so the
  // capture flow is exercised.
  User: { id: 'user_1', name: 'Asha Juma', username: 'ashaj', role: 'EMPLOYEE', active: true, email: null },
};

describe('POST /api/auth/employee-login — government email capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmployeeFindFirst.mockResolvedValue(EMPLOYEE);
  });

  it('returns EMAIL_REQUIRED when no email is stored and none supplied', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ zanId: 'Z123', zssfNumber: 'ZSSF1', payrollNumber: 'PAY1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.code).toBe('EMAIL_REQUIRED');
    expect(json.data.userId).toBeTruthy();
  });

  it('persists a valid email and returns MFA_REQUIRED', async () => {
    mockUserFindFirst.mockResolvedValue(null); // no duplicate user
    // employee.findFirst is used for BOTH the credential lookup (must return
    // EMPLOYEE) and the duplicate-email lookup (where.email -> nothing).
    mockEmployeeFindFirst.mockImplementation(async ({ where }: any) =>
      where?.email ? null : EMPLOYEE
    );
    mockEmployeeFindUnique.mockResolvedValue({ id: 'emp_1' }); // employee exists
    mockUserUpdate.mockResolvedValue({ id: 'user_1', email: 'asha@gov.go.tz' });
    mockEmployeeUpdate.mockResolvedValue({ id: 'emp_1', email: 'asha@gov.go.tz' });

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ zanId: 'Z123', zssfNumber: 'ZSSF1', payrollNumber: 'PAY1', email: 'asha@gov.go.tz' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.code).toBe('MFA_REQUIRED');
    expect(json.data.email).toContain('@gov.go.tz');

    // Persisted to BOTH tables using the server-side employee id.
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { employeeId: 'emp_1' }, data: { email: 'asha@gov.go.tz' } })
    );
    expect(mockEmployeeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'emp_1' }, data: { email: 'asha@gov.go.tz' } })
    );
  });

  it('rejects a non-government email with 400', async () => {
    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ zanId: 'Z123', zssfNumber: 'ZSSF1', payrollNumber: 'PAY1', email: 'asha@gmail.com' })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already used by another employee', async () => {
    // setUserGovernmentEmail: duplicate User lookup returns another user; the
    // employee existence check must still succeed.
    mockUserFindFirst.mockImplementation(async ({ where }: any) => {
      if (where?.email) return { id: 'other_user' };
      return null;
    });
    mockEmployeeFindUnique.mockResolvedValue({ id: 'emp_1' });

    const { POST } = await import('./route');
    const res = await POST(
      makeRequest({ zanId: 'Z123', zssfNumber: 'ZSSF1', payrollNumber: 'PAY1', email: 'asha@gov.go.tz' })
    );
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.message).toMatch(/already in use/);
  });

  it('goes straight to MFA when an email is already stored', async () => {
    mockEmployeeFindFirst.mockResolvedValue({
      ...EMPLOYEE,
      User: { id: 'user_1', name: 'Asha Juma', username: 'ashaj', role: 'EMPLOYEE', active: true, email: 'asha@gov.go.tz' },
    });

    const { POST } = await import('./route');
    const res = await POST(makeRequest({ zanId: 'Z123', zssfNumber: 'ZSSF1', payrollNumber: 'PAY1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.code).toBe('MFA_REQUIRED');
    // No persistence attempt — reuse stored email.
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';
// These are the mocked audit/CSRF helpers used by withAuth. vitest's
// `mockReset: true` clears their factory mockResolvedValue before each test,
// and the module factory only re-runs on the FIRST import (test 1), so tests
// 2+ would otherwise see `undefined` and withAuth's `.catch()` on the result
// would throw. Re-establish them in beforeEach below.
import { logAccessDenied, logForbiddenRoute } from '@/lib/audit-logger';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const mockValidateSession = vi.fn();
const mockDbUserFindUnique = vi.fn(); // verifyAuth's db.user.findUnique
const mockPrismaUserFindUnique = vi.fn(); // route's prisma fallback (unused when auth has institutionId)
const mockInstitutionFindUnique = vi.fn();
const mockEmployeeFindUnique = vi.fn();
const mockEmployeeFindFirst = vi.fn();
const mockEmployeeFindMany = vi.fn(); // Req 6.6 org-field lookup
const mockEmployeeCreate = vi.fn();
const mockLogEmployeeAction = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
  // Mirror the production env-aware cookie-name constants so verifyAuth
  // can read either the prod (__Host-session) or dev (session) cookie.
  SESSION_COOKIE_NAME_PROD: '__Host-session',
  SESSION_COOKIE_NAME_DEV: 'session',
  SESSION_COOKIE_NAME: 'session',
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const expiry = Date.now() + 8 * 60 * 60 * 1000;
    const payload = `${token}.${expiry}`;
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(payload);
    return `${payload}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 3) return null;
      const [token, expiryStr, provided] = parts;
      const expiry = Number(expiryStr);
      if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(`${token}.${expiryStr}`);
      const expected = hmac.digest('base64');
      const a = Buffer.from(provided, 'base64');
      const b = Buffer.from(expected, 'base64');
      if (a.length !== b.length) return null;
      return timingSafeEqual(a, b) ? token : null;
    } catch {
      return null;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockDbUserFindUnique(...a) },
  },
}))

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
  logEmployeeAction: (...a: any[]) => mockLogEmployeeAction(...a),
  logAccessDenied: vi.fn().mockResolvedValue(undefined),
  logForbiddenRoute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@prisma/client', () => {
  // Must be a real constructor function — the route does `new PrismaClient()`
  // at module load. Arrow functions cannot be invoked with `new`.
  function PrismaClient(this: any) {
    this.user = { findUnique: (...a: any[]) => mockPrismaUserFindUnique(...a) };
    this.institution = { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) };
    this.employee = {
      findUnique: (...a: any[]) => mockEmployeeFindUnique(...a),
      findFirst: (...a: any[]) => mockEmployeeFindFirst(...a),
      findMany: (...a: any[]) => mockEmployeeFindMany(...a),
      create: (...a: any[]) => mockEmployeeCreate(...a),
    };
  }
  return { PrismaClient };
});

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: vi.fn().mockResolvedValue({ valid: true }),
}));

const VALID_BODY = {
  name: 'Jane Doe',
  gender: 'Female',
  zanId: '12345678',
  dateOfBirth: '1990-01-01',
  zssfNumber: 'SSF-1',
  payrollNumber: 'PR-1',
};

function sessionCookie(): string {
  return `session=${signSessionToken('good-token')}`;
}

function authedRequest(role: string, body: unknown = VALID_BODY): NextRequest {
  return new NextRequest('http://localhost:9002/api/employees/manual-entry', {
    method: 'POST',
    headers: {
      cookie: sessionCookie(),
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/employees/manual-entry authorization', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockDbUserFindUnique.mockReset();
    mockPrismaUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
    mockEmployeeFindUnique.mockReset();
    mockEmployeeFindFirst.mockReset();
    mockEmployeeFindMany.mockReset();
    mockEmployeeCreate.mockReset();
    // vitest `mockReset: true` clears these factory mocks before each test;
    // re-establish the implementations withAuth relies on for every request.
    vi.mocked(validateCSRF).mockResolvedValue({ valid: true } as any);
    vi.mocked(logAccessDenied).mockResolvedValue(undefined);
    vi.mocked(logForbiddenRoute).mockResolvedValue(undefined);
  });

  it('returns 401 when no session cookie is present', async () => {
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost:9002/api/employees/manual-entry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects a forged auth-storage cookie without a valid session (no forgeable identity)', async () => {
    // A client forges the unsigned auth-storage cookie claiming HRO role.
    // Authorization must come from the signed session cookie, not this.
    const forgedAuthStorage = encodeURIComponent(
      JSON.stringify({
        state: {
          user: { id: 'u1', role: 'HRO', institutionId: 'inst-1', username: 'attacker' },
          isAuthenticated: true,
        },
      })
    );
    const { POST } = await import('./route');
    const req = new NextRequest('http://localhost:9002/api/employees/manual-entry', {
      method: 'POST',
      headers: {
        cookie: `auth-storage=${forgedAuthStorage}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    // The route must never have reached prisma on a forged cookie alone.
    expect(mockInstitutionFindUnique).not.toHaveBeenCalled();
    expect(mockEmployeeCreate).not.toHaveBeenCalled();
  });

  it('returns 403 when the authenticated user is not HRO', async () => {
    mockValidateSession.mockResolvedValue({
      id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0',
    });
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u1', active: true, role: 'EMPLOYEE', institutionId: 'inst-1', username: 'x',
    });

    const { POST } = await import('./route');
    const res = await POST(authedRequest('EMPLOYEE'));
    expect(res.status).toBe(403);
    expect(mockEmployeeCreate).not.toHaveBeenCalled();
  });

  it('creates the employee when an HRO with a valid session posts valid data', async () => {
    mockValidateSession.mockResolvedValue({
      id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0',
    });
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'ymrajab',
    });
    mockInstitutionFindUnique.mockResolvedValue({
      manualEntryEnabled: true, manualEntryStartDate: null, manualEntryEndDate: null,
    });
    mockEmployeeFindUnique.mockResolvedValue(null); // zanId not taken
    mockEmployeeFindFirst.mockResolvedValue(null); // payroll not taken
    mockEmployeeCreate.mockResolvedValue({
      id: 'e1', name: VALID_BODY.name, zanId: VALID_BODY.zanId, institutionId: 'inst-1',
    });
    mockLogEmployeeAction.mockResolvedValue(undefined);

    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO'));
    expect(res.status).toBe(201);
    // institutionId must be forced to the authenticated user's institution
    const createCall = mockEmployeeCreate.mock.calls[0][0];
    expect(createCall.data.institutionId).toBe('inst-1');
  });

  // ---- Req 6.6: institution org-field (ministry/department/currentWorkplace)
  // validation against the institution's existing recorded values. ----

  // Mocks the three distinct findMany lookups by inspecting the `select` arg.
  function mockOrgFieldLookup(existing: {
    ministry?: string[];
    department?: string[];
    currentWorkplace?: string[];
  }) {
    mockEmployeeFindMany.mockImplementation((args: any) => {
      if (args.select?.ministry) {
        return Promise.resolve((existing.ministry ?? []).map((m) => ({ ministry: m })));
      }
      if (args.select?.department) {
        return Promise.resolve((existing.department ?? []).map((d) => ({ department: d })));
      }
      if (args.select?.currentWorkplace) {
        return Promise.resolve((existing.currentWorkplace ?? []).map((w) => ({ currentWorkplace: w })));
      }
      return Promise.resolve([]);
    });
  }

  async function setupHroWithManualEntry() {
    mockValidateSession.mockResolvedValue({
      id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0',
    });
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'ymrajab',
    });
    mockInstitutionFindUnique.mockResolvedValue({
      manualEntryEnabled: true, manualEntryStartDate: null, manualEntryEndDate: null,
    });
    mockEmployeeFindUnique.mockResolvedValue(null); // zanId not taken
    mockEmployeeFindFirst.mockResolvedValue(null); // payroll/zssf not taken
    mockEmployeeCreate.mockResolvedValue({
      id: 'e1', name: 'Jane Doe', zanId: '12345678', institutionId: 'inst-1',
    });
    mockLogEmployeeAction.mockResolvedValue(undefined);
  }

  it('Req 6.6: rejects a ministry not recorded for the institution (400)', async () => {
    await setupHroWithManualEntry();
    mockOrgFieldLookup({ ministry: ['Health', 'Education'], department: ['HR'] });
    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO', { ...VALID_BODY, ministry: 'Defence', department: 'HR' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Ministry "Defence"');
    expect(mockEmployeeCreate).not.toHaveBeenCalled();
  });

  it('Req 6.6: accepts a ministry that matches a recorded value (201)', async () => {
    await setupHroWithManualEntry();
    mockOrgFieldLookup({ ministry: ['Health', 'Education'], department: ['HR'] });
    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO', { ...VALID_BODY, ministry: 'Health', department: 'HR' }));
    expect(res.status).toBe(201);
    expect(mockEmployeeCreate).toHaveBeenCalledOnce();
  });

  it('Req 6.6: bootstrap — accepts any ministry when the institution has none recorded (201)', async () => {
    await setupHroWithManualEntry();
    mockOrgFieldLookup({}); // no recorded values → bootstrap
    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO', { ...VALID_BODY, ministry: 'Brand New Ministry', department: 'New Dept' }));
    expect(res.status).toBe(201);
    expect(mockEmployeeCreate).toHaveBeenCalledOnce();
  });

  it('Req 6.6: skips the lookup entirely when no org fields are supplied', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO', VALID_BODY));
    expect(res.status).toBe(201);
    // No org fields supplied → the distinct-value lookup must not run.
    expect(mockEmployeeFindMany).not.toHaveBeenCalled();
  });

  // ---- Req 6.8: cross-field date logic + identifier formats ----

  it('Req 6.8: rejects employmentDate not after dateOfBirth (400)', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(
      authedRequest('HRO', { ...VALID_BODY, dateOfBirth: '1990-01-01', employmentDate: '1990-01-01' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Employment date must be after date of birth');
    expect(mockEmployeeCreate).not.toHaveBeenCalled();
  });

  it('Req 6.8: rejects confirmationDate before employmentDate (400)', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(
      authedRequest('HRO', {
        ...VALID_BODY,
        dateOfBirth: '1990-01-01',
        employmentDate: '2018-01-10',
        confirmationDate: '2017-12-31',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Confirmation date cannot be before employment date');
  });

  it('Req 6.8: rejects retirementDate not after employmentDate (400)', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(
      authedRequest('HRO', {
        ...VALID_BODY,
        dateOfBirth: '1990-01-01',
        employmentDate: '2018-01-10',
        retirementDate: '2018-01-10',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Retirement date must be after employment date');
  });

  it('Req 6.8: rejects malformed confirmationDate format (400)', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(
      authedRequest('HRO', { ...VALID_BODY, confirmationDate: '31-12-2020' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid confirmation date format');
  });

  it('Req 6.8: rejects malformed ZSSF number format (400)', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO', { ...VALID_BODY, zssfNumber: 'ZSSF 123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('ZSSF number');
    expect(mockEmployeeCreate).not.toHaveBeenCalled();
  });

  it('Req 6.8: rejects malformed payroll number format (400)', async () => {
    await setupHroWithManualEntry();
    const { POST } = await import('./route');
    const res = await POST(authedRequest('HRO', { ...VALID_BODY, payrollNumber: 'PR#001' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Payroll number');
  });

  it('Req 6.8: accepts consistent cross-field dates (201)', async () => {
    await setupHroWithManualEntry();
    mockOrgFieldLookup({}); // bootstrap → any org value accepted
    const { POST } = await import('./route');
    const res = await POST(
      authedRequest('HRO', {
        ...VALID_BODY,
        dateOfBirth: '1990-01-01',
        employmentDate: '2018-01-10',
        confirmationDate: '2019-01-10',
        retirementDate: '2055-01-15',
      })
    );
    expect(res.status).toBe(201);
    expect(mockEmployeeCreate).toHaveBeenCalledOnce();
  });
});
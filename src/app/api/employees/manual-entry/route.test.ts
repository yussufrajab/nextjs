import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockDbUserFindUnique = vi.fn(); // verifyAuth's db.user.findUnique
const mockPrismaUserFindUnique = vi.fn(); // route's prisma fallback (unused when auth has institutionId)
const mockInstitutionFindUnique = vi.fn();
const mockEmployeeFindUnique = vi.fn();
const mockEmployeeFindFirst = vi.fn();
const mockEmployeeCreate = vi.fn();
const mockLogEmployeeAction = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const expiry = Date.now() + 86400000;
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
      create: (...a: any[]) => mockEmployeeCreate(...a),
    };
  }
  return { PrismaClient };
});

const VALID_BODY = {
  name: 'Jane Doe',
  gender: 'Female',
  zanId: 'ZN-TEST-1',
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
    mockEmployeeCreate.mockReset();
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
});
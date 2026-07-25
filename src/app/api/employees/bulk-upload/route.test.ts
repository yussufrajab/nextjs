/**
 * Tests for PUT /api/employees/bulk-upload — confirm-and-create (Req 7.9).
 *
 * Verifies transaction integrity: a per-row create failure aborts the WHOLE
 * transaction (atomic rollback — no partial success), returns a 500 with the
 * failing row, and emits no CREATED audit events for the rolled-back rows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';
import { logEmployeeAction } from '@/lib/audit-logger';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const mockValidateSession = vi.fn();
const mockDbUserFindUnique = vi.fn(); // verifyAuth's db.user.findUnique
const mockPrismaUserFindUnique = vi.fn(); // route fallback (unused when auth has institutionId)
const mockTxEmployeeCreate = vi.fn(); // tx.employee.create inside $transaction
const mockTransaction = vi.fn();
const mockLogEmployeeAction = vi.fn();
const mockLogFileAction = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
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
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
  logEmployeeAction: (...a: any[]) => mockLogEmployeeAction(...a),
  logFileAction: (...a: any[]) => mockLogFileAction(...a),
  logAccessDenied: vi.fn().mockResolvedValue(undefined),
  logForbiddenRoute: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: vi.fn().mockResolvedValue({ valid: true }),
}));

vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: () => Promise.resolve({ allowed: true, retryAfter: 0 }),
  getClientIp: () => '127.0.0.1',
  withRateLimit: (handler: any) => handler,
}));

vi.mock('@/lib/file-validation', () => ({
  validateFileUpload: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/logger', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), fatal: vi.fn() };
  return { logger, authLogger: { ...logger, child: () => logger }, dbLogger: logger };
});

vi.mock('@prisma/client', () => {
  function PrismaClient(this: any) {
    this.user = { findUnique: (...a: any[]) => mockPrismaUserFindUnique(...a) };
    // $transaction invokes the callback with a tx whose employee.create is the
    // mock. If the callback throws (create rejection), $transaction re-throws,
    // mirroring real Prisma rollback semantics.
    this.$transaction = async (cb: any) => cb({ employee: { create: (...a: any[]) => mockTxEmployeeCreate(...a) } });
  }
  return { PrismaClient };
});

function row(n: number, zan: string) {
  return {
    rowNumber: n,
    name: `Employee ${n}`,
    gender: 'Male',
    zanId: zan,
    dateOfBirth: '1990-01-01',
    zssfNumber: `ZSSF${n}`,
    payrollNumber: `PR${n}`,
    cadre: 'Nurse',
    ministry: 'Health',
    department: 'HR',
    employmentDate: '2018-01-10',
    status: 'On Probation',
  };
}

function sessionCookie(): string {
  return `session=${signSessionToken('good-token')}`;
}

function putRequest(employees: any[]): NextRequest {
  return new NextRequest('http://localhost:9002/api/employees/bulk-upload', {
    method: 'PUT',
    headers: {
      cookie: sessionCookie(),
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ employees }),
  });
}

async function setupHro() {
  mockValidateSession.mockResolvedValue({
    id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0',
  });
  mockDbUserFindUnique.mockResolvedValue({
    id: 'u1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'hro_user',
  });
}

describe('PUT /api/employees/bulk-upload — transaction integrity (Req 7.9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateCSRF).mockResolvedValue({ valid: true } as any);
    mockLogEmployeeAction.mockResolvedValue(undefined);
    mockLogFileAction.mockResolvedValue(undefined);
  });

  it('rolls back the whole batch when a mid-batch create fails (no partial success)', async () => {
    await setupHro();
    // First two rows succeed, third throws → transaction must abort.
    mockTxEmployeeCreate
      .mockResolvedValueOnce({ id: 'e1' })
      .mockResolvedValueOnce({ id: 'e2' })
      .mockRejectedValueOnce(new Error('unique constraint violated'));

    const { PUT } = await import('./route');
    const res = await PUT(putRequest([row(1, '111'), row(2, '222'), row(3, '333')]));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    // Atomic: nothing reported as created, whole batch counted as failed.
    expect(body.data.created).toBe(0);
    expect(body.data.failed).toBe(3);
    // The failing row (row 3) is surfaced for the operator.
    expect(body.failedRow).toBe(3);
    expect(body.error).toContain('row 3');
    expect(body.error).toContain('rolled back');
    // No CREATED audit events for a rolled-back batch.
    expect(mockLogEmployeeAction).not.toHaveBeenCalled();
  });

  it('commits every row and emits CREATED audit events on full success', async () => {
    await setupHro();
    mockTxEmployeeCreate.mockResolvedValue({ id: 'e-x' });

    const { PUT } = await import('./route');
    const res = await PUT(putRequest([row(1, '111'), row(2, '222')]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.created).toBe(2);
    expect(body.data.failed).toBe(0);
    expect(mockTxEmployeeCreate).toHaveBeenCalledTimes(2);
    expect(mockLogEmployeeAction).toHaveBeenCalledTimes(2);
  });

  it('rolls back when the very first row fails', async () => {
    await setupHro();
    mockTxEmployeeCreate.mockRejectedValueOnce(new Error('db error'));

    const { PUT } = await import('./route');
    const res = await PUT(putRequest([row(1, '111'), row(2, '222')]));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.data.created).toBe(0);
    expect(body.failedRow).toBe(1);
    expect(mockLogEmployeeAction).not.toHaveBeenCalled();
  });
});
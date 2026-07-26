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
import { validateFileUpload } from '@/lib/file-validation';

const mockValidateSession = vi.fn();
const mockDbUserFindUnique = vi.fn(); // verifyAuth's db.user.findUnique
const mockPrismaUserFindUnique = vi.fn(); // route fallback (unused when auth has institutionId)
const mockTxEmployeeCreate = vi.fn(); // tx.employee.create inside $transaction
const mockTransaction = vi.fn();
const mockLogEmployeeAction = vi.fn();
const mockLogFileAction = vi.fn();
// POST (validate) handler mocks
const mockInstitutionFindUnique = vi.fn();
const mockEmployeeFindUnique = vi.fn(); // zanId exact-key DB dedupe
const mockEmployeeFindFirst = vi.fn();  // payroll/zssf exact-key DB dedupe
const mockEmployeeFindMany = vi.fn();  // Req 6.6 org-field lookup + Req 6.5 fuzzy

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
    this.institution = { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) };
    this.employee = {
      findUnique: (...a: any[]) => mockEmployeeFindUnique(...a),
      findFirst: (...a: any[]) => mockEmployeeFindFirst(...a),
      findMany: (...a: any[]) => mockEmployeeFindMany(...a),
      create: vi.fn(),
    };
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

function putRequest(employees: any[], batchId?: string): NextRequest {
  const payload: any = { employees };
  if (batchId) payload.batchId = batchId;
  return new NextRequest('http://localhost:9002/api/employees/bulk-upload', {
    method: 'PUT',
    headers: {
      cookie: sessionCookie(),
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
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

  it('stamps every CREATED event with the same batchId supplied in the request body (Req 7.7)', async () => {
    await setupHro();
    mockTxEmployeeCreate.mockResolvedValue({ id: 'e-x' });

    const { PUT } = await import('./route');
    const res = await PUT(putRequest([row(1, '111'), row(2, '222'), row(3, '333')], 'batch-abc-123'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    // One CREATED audit event per row.
    expect(mockLogEmployeeAction).toHaveBeenCalledTimes(3);
    // Every CREATED event carries the SAME batchId, next to batchRow —
    // linking the whole import end-to-end.
    const calls = mockLogEmployeeAction.mock.calls.map((c: any) => c[0]);
    expect(calls.every((c: any) => c.additionalData?.batchId === 'batch-abc-123')).toBe(true);
    expect(calls.map((c: any) => c.additionalData?.batchRow)).toEqual([1, 2, 3]);
  });

  it('generates a batchId when the client omits one, so CREATED events still carry a non-empty batchId (Req 7.7)', async () => {
    await setupHro();
    mockTxEmployeeCreate.mockResolvedValue({ id: 'e-x' });

    const { PUT } = await import('./route');
    const res = await PUT(putRequest([row(1, '111'), row(2, '222')]));

    expect(res.status).toBe(200);
    expect(mockLogEmployeeAction).toHaveBeenCalledTimes(2);
    const calls = mockLogEmployeeAction.mock.calls.map((c: any) => c[0]);
    const batchIds = new Set(calls.map((c: any) => c.additionalData?.batchId));
    // Exactly one shared, non-empty batchId across all rows.
    expect(batchIds.size).toBe(1);
    expect([...batchIds][0]).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// POST /api/employees/bulk-upload — validate (Req 6.5 fuzzy duplicate detection)
// ---------------------------------------------------------------------------

const CSV_HEADERS =
  'Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date';

function csvRow(values: string[]): string {
  return values.join(',');
}

function postRequestWithCsv(csv: string): NextRequest {
  // NextRequest.formData() parses the body with undici, which (in the jsdom
  // test env) rejects a hand-rolled multipart string body and a jsdom
  // FormData/File (jsdom's File also lacks arrayBuffer()). Bypass the parser:
  // spy on NextRequest.prototype.formData to return a fake File whose
  // arrayBuffer() yields the CSV bytes. The route reads
  // `await file.arrayBuffer()` → `Buffer.from(...).toString('utf-8')`.
  const bytes = new TextEncoder().encode(csv);
  const fakeFile = {
    name: 'employees.csv',
    type: 'text/csv',
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  };
  const fakeFormData = { get: (k: string) => (k === 'file' ? fakeFile : null) };
  vi.spyOn(NextRequest.prototype, 'formData').mockResolvedValue(
    fakeFormData as any
  );
  return new NextRequest('http://localhost:9002/api/employees/bulk-upload', {
    method: 'POST',
    headers: {
      cookie: sessionCookie(),
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
    body: '',
  });
}

async function setupPostValidate() {
  await setupHro(); // HRO with institutionId inst-1
  mockInstitutionFindUnique.mockResolvedValue({
    manualEntryEnabled: true, manualEntryStartDate: null, manualEntryEndDate: null,
  });
  mockEmployeeFindUnique.mockResolvedValue(null); // zanId not taken
  mockEmployeeFindFirst.mockResolvedValue(null);  // payroll/zssf not taken
  // findMany serves both the Req 6.6 org-field lookup (select.ministry etc.)
  // and the Req 6.5 fuzzy check (select.id/name/zanId). Default: no recorded
  // org values (bootstrap → any value accepted) AND no fuzzy DB duplicate.
  mockEmployeeFindMany.mockImplementation((args: any) => {
    if (args.select?.ministry || args.select?.department || args.select?.currentWorkplace) {
      return Promise.resolve([]); // org-field bootstrap
    }
    return Promise.resolve([]); // fuzzy: no existing duplicate
  });
  mockLogFileAction.mockResolvedValue(undefined);
}

describe('POST /api/employees/bulk-upload — Req 6.5 fuzzy duplicate detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateCSRF).mockResolvedValue({ valid: true } as any);
    // mockReset:true (vitest config) clears the factory mockResolvedValue on
    // these after the preceding PUT tests; re-establish them for the POST
    // (validate) handler, which actually calls validateFileUpload.
    vi.mocked(validateFileUpload).mockResolvedValue({ success: true } as any);
    mockLogEmployeeAction.mockResolvedValue(undefined);
    mockLogFileAction.mockResolvedValue(undefined);
  });

  it('flags a within-file fuzzy duplicate (same DOB + similar name, different zanId)', async () => {
    await setupPostValidate();
    const csv = [
      CSV_HEADERS,
      csvRow(['Mohammed Ali', 'Male', '111111', '1990-04-20', 'ZSSF1', 'PR1', 'Nurse', 'Health', 'HR', '2018-01-10']),
      csvRow(['Mohammad Ali', 'Male', '222222', '1990-04-20', 'ZSSF2', 'PR2', 'Nurse', 'Health', 'HR', '2018-01-10']),
    ].join('\n');

    const { POST } = await import('./route');
    const res = await POST(postRequestWithCsv(csv));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.validRows).toBe(1);
    expect(body.data.invalidRows).toBe(1);
    // The duplicate row reports a within-file fuzzy match.
    const invalid = body.data.invalidEmployees;
    const fuzzyRow = invalid.find((e: any) =>
      e.errors?.some((m: string) => m.includes('earlier row in this file'))
    );
    expect(fuzzyRow).toBeTruthy();
    expect(fuzzyRow.errors.join(' ')).toContain('same name + date of birth');
  });

  it('flags a DB fuzzy duplicate (existing same-DOB / similar-name employee)', async () => {
    await setupPostValidate();
    // One clean row; the fuzzy DB check returns one existing near-match
    // ("Jane Doe" vs "Jayne Doe" → 0.875 similarity ≥ threshold).
    mockEmployeeFindMany.mockImplementation((args: any) => {
      if (args.select?.ministry || args.select?.department || args.select?.currentWorkplace) {
        return Promise.resolve([]);
      }
      return Promise.resolve([
        { id: 'e-existing', name: 'Jayne Doe', zanId: '99999999' },
      ]);
    });
    const csv = [
      CSV_HEADERS,
      csvRow(['Jane Doe', 'Female', '333333', '1990-01-01', 'ZSSF3', 'PR3', 'Nurse', 'Health', 'HR', '2018-01-10']),
    ].join('\n');

    const { POST } = await import('./route');
    const res = await POST(postRequestWithCsv(csv));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.validRows).toBe(0);
    expect(body.data.invalidRows).toBe(1);
    const invalid = body.data.invalidEmployees[0];
    expect(invalid.errors.join(' ')).toContain('Likely duplicate of existing employee');
    expect(invalid.errors.join(' ')).toContain('99999999');

    // The fuzzy DB query must be scoped to the institution + DOB calendar day.
    const fuzzyCalls = mockEmployeeFindMany.mock.calls.filter(
      (c: any) => c[0]?.where?.dateOfBirth
    );
    expect(fuzzyCalls.length).toBeGreaterThan(0);
    expect(fuzzyCalls[0][0].where.institutionId).toBe('inst-1');
    expect(fuzzyCalls[0][0].where.dateOfBirth.gte.toISOString()).toBe('1990-01-01T00:00:00.000Z');
  });

  it('accepts a clean file with no fuzzy duplicates', async () => {
    await setupPostValidate();
    const csv = [
      CSV_HEADERS,
      csvRow(['Jane Doe', 'Female', '111111', '1990-01-01', 'ZSSF1', 'PR1', 'Nurse', 'Health', 'HR', '2018-01-10']),
      csvRow(['John Smith', 'Male', '222222', '1985-05-12', 'ZSSF2', 'PR2', 'Clerk', 'Health', 'Finance', '2019-06-01']),
    ].join('\n');

    const { POST } = await import('./route');
    const res = await POST(postRequestWithCsv(csv));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.validRows).toBe(2);
    expect(body.data.invalidRows).toBe(0);
  });

  it('does not flag two rows with the same name but different DOBs', async () => {
    await setupPostValidate();
    const csv = [
      CSV_HEADERS,
      csvRow(['Jane Doe', 'Female', '111111', '1990-01-01', 'ZSSF1', 'PR1', 'Nurse', 'Health', 'HR', '2018-01-10']),
      csvRow(['Jane Doe', 'Female', '222222', '1991-01-01', 'ZSSF2', 'PR2', 'Nurse', 'Health', 'HR', '2018-01-10']),
    ].join('\n');

    const { POST } = await import('./route');
    const res = await POST(postRequestWithCsv(csv));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.validRows).toBe(2);
    expect(body.data.invalidRows).toBe(0);
  });
});
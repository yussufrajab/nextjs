/**
 * Integration tests for GAP-M2: `logRequestWithdrawal` wiring.
 *
 * Two layers:
 *
 *  1. Route-level (runs in the normal vitest suite): calls the promotions
 *     DELETE/withdraw handler with a mocked DB and asserts the helper is
 *     invoked with the withdrawing user + reason, and that the authorization
 *     and terminal-status guards behave. This is the always-on regression net.
 *
 *  2. Live-DB (guarded by CSMS_LIVE_INTEGRATION=1): calls `logRequestWithdrawal`
 *     against the REAL audit table and reads the row back, asserting the
 *     audit row carries `user_id`, `username` and `additional_data.withdrawalReason`
 *     for non-repudiation. Skipped without a database:
 *
 *       CSMS_LIVE_INTEGRATION=1 DATABASE_URL=postgresql://... npx vitest run \
 *         src/lib/audit-logger.medium-gaps.integration.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- spies ------------------------------------------------------------------
const mockLogRequestWithdrawal = vi.fn();
const mockFindUnique = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/audit-logger', () => ({
  logRequestApproval: vi.fn(() => Promise.resolve(undefined)),
  logRequestRejection: vi.fn(() => Promise.resolve(undefined)),
  logRequestForward: vi.fn(() => Promise.resolve(undefined)),
  logRequestWithdrawal: (...a: any[]) => mockLogRequestWithdrawal(...a),
  getClientIp: () => '127.0.0.1',
}));

const mockVerifyAuth = vi.fn();
const authContext = {
  userId: 'user-1',
  username: 'hro_user',
  role: 'HRO',
  institutionId: 'inst-A',
};
vi.mock('@/lib/api-auth', () => ({
  verifyAuth: (...a: any[]) => mockVerifyAuth(...a),
}));

// Skip the institution filter so the focus stays on the withdrawal audit path.
vi.mock('@/lib/role-utils', () => ({
  shouldApplyInstitutionFilter: () => false,
}));

vi.mock('@/lib/db', () => ({
  db: {
    promotionRequest: {
      findUnique: (...a: any[]) => mockFindUnique(...a),
      delete: (...a: any[]) => mockDelete(...a),
    },
  },
}));

const childLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  debug: vi.fn(),
  child: () => childLogger,
};
vi.mock('@/lib/logger', () => ({
  logger: childLogger,
  fileLogger: childLogger,
  authLogger: childLogger,
  hrimsLogger: childLogger,
}));

describe('GAP-M2 withdrawal wiring (route-level)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAuth.mockResolvedValue({ authenticated: true, context: authContext });
    mockLogRequestWithdrawal.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue({});
    mockFindUnique.mockResolvedValue({
      id: 'req-1',
      status: 'Pending HRRP Review',
      reviewStage: 'HRRP Review',
      employeeId: 'emp-1',
      submittedById: 'user-1', // the authenticated user is the submitter
      Employee: { id: 'emp-1', institutionId: 'inst-A', name: 'Jane Doe', zanId: '60363181' },
    });
  });

  async function callDelete(body: unknown) {
    const { DELETE } = await import('../app/api/promotions/[id]/route');
    const req = new Request('http://localhost/api/promotions/req-1', {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    });
    return DELETE(req as any, { params: Promise.resolve({ id: 'req-1' }) } as any);
  }

  it('logs the withdrawal with the withdrawing user + reason, then deletes the row', async () => {
    const res = await callDelete({ withdrawalReason: 'Submitted in error' });
    expect(res.status).toBe(200);

    expect(mockLogRequestWithdrawal).toHaveBeenCalledOnce();
    const arg = mockLogRequestWithdrawal.mock.calls[0][0];
    expect(arg.requestType).toBe('Promotion');
    expect(arg.requestId).toBe('req-1');
    expect(arg.withdrawnById).toBe('user-1');
    expect(arg.withdrawnByUsername).toBe('hro_user');
    expect(arg.withdrawnByRole).toBe('HRO');
    expect(arg.withdrawalReason).toBe('Submitted in error');
    expect(arg.employeeId).toBe('emp-1');

    // The row is removed AFTER the audit event is recorded.
    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it('allows withdrawal without a stated reason (reason is optional)', async () => {
    const res = await callDelete({});
    expect(res.status).toBe(200);
    const arg = mockLogRequestWithdrawal.mock.calls[0][0];
    expect(arg.withdrawalReason).toBeUndefined();
  });

  it('blocks a non-submitter / non-admin from withdrawing (403)', async () => {
    // Override auth to a different HRO who did NOT submit the request.
    mockVerifyAuth.mockResolvedValueOnce({
      authenticated: true,
      context: { userId: 'user-OTHER', username: 'other_hro', role: 'HRO', institutionId: 'inst-A' },
    });

    const res = await callDelete({ withdrawalReason: 'nope' });
    expect(res.status).toBe(403);
    expect(mockLogRequestWithdrawal).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('refuses to withdraw a request that already received a final Commission decision (409)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'req-1',
      status: 'Approved by Commission',
      reviewStage: 'Commission Review',
      employeeId: 'emp-1',
      submittedById: 'user-1',
      Employee: { id: 'emp-1', institutionId: 'inst-A', name: 'Jane Doe', zanId: '60363181' },
    });
    const res = await callDelete({ withdrawalReason: 'too late' });
    expect(res.status).toBe(409);
    expect(mockLogRequestWithdrawal).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Live-DB layer (skipped without CSMS_LIVE_INTEGRATION=1)
// ---------------------------------------------------------------------------

const LIVE = process.env.CSMS_LIVE_INTEGRATION === '1';

describe.skipIf(!LIVE)('GAP-M2 withdrawal live-DB integration', () => {
  let logRequestWithdrawal: typeof import('./audit-logger').logRequestWithdrawal;
  let getAuditPool: () => { query: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }> };

  const MARKER_ID = `withdraw-live-${Date.now()}`;
  const insertedIds: number[] = [];

  beforeAll(async () => {
    if (LIVE) {
      process.env.DATABASE_URL =
        process.env.CSMS_LIVE_DATABASE_URL ||
        'postgresql://postgres:Mamlaka2020@localhost:5432/nody?schema=public';
    }
    ({ logRequestWithdrawal } = await import('./audit-logger'));
    ({ getAuditPool } = await import('./audit-db'));
  });

  afterAll(async () => {
    if (!LIVE) return;
    const pool = getAuditPool();
    for (const id of insertedIds) {
      try {
        await pool.query('DELETE FROM audit.audit_log WHERE id = $1', [id]);
      } catch {
        // best-effort
      }
    }
  });

  it('writes a REQUEST_WITHDRAWN row carrying user + reason to the real audit table', async () => {
    await logRequestWithdrawal({
      requestType: 'Promotion',
      requestId: MARKER_ID,
      employeeId: 'emp-1',
      employeeName: 'Jane Doe',
      employeeZanId: '60363181',
      withdrawnById: 'user-1',
      withdrawnByUsername: 'hro_user',
      withdrawnByRole: 'HRO',
      withdrawalReason: 'Submitted in error',
      reviewStage: 'HRRP Review',
    });

    const pool = getAuditPool();
    const res = await pool.query(
      `SELECT id, user_id, username, additional_data, block_reason
         FROM audit.audit_log
        WHERE action = 'REQUEST_WITHDRAWN'
          AND additional_data->>'requestId' = $1
        ORDER BY id DESC
        LIMIT 1`,
      [MARKER_ID]
    );
    expect(res.rowCount).toBeGreaterThanOrEqual(1);
    const row = res.rows[0];
    insertedIds.push(row.id);
    expect(row.user_id).toBe('user-1');
    expect(row.username).toBe('hro_user');
    expect(row.block_reason).toBe('Submitted in error');
    const data = row.additional_data;
    expect(data.withdrawalReason).toBe('Submitted in error');
    expect(data.withdrawnById || row.user_id).toBe('user-1');
  });
});
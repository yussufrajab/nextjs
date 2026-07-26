// @vitest-environment node
/**
 * Unit tests for `denyWorkflowAccess` (Req 15.7 / 17.6) — the helper that
 * logs a workflow access denial to the audit trail and returns the denial
 * response. Replaces the silent 403/400 returns on the [id] workflow routes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogAccessDenied = vi.fn();

vi.mock('@/lib/audit-logger', () => ({
  logAccessDenied: (...a: any[]) => mockLogAccessDenied(...a),
  safeAuditLog: async (p: Promise<void>) => {
    try {
      await p;
    } catch {
      /* swallow — exercised helper */
    }
  },
}));

import { denyWorkflowAccess } from './workflow-access';

const AUTH = { userId: 'user-1', username: 'hro', role: 'HRO' };

describe('denyWorkflowAccess (Req 15.7 / 17.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogAccessDenied.mockResolvedValue(undefined);
  });

  it('logs an ACCESS_DENIED audit and returns a 403 by default', async () => {
    const res = await denyWorkflowAccess({
      auth: AUTH,
      routeBase: 'lwop',
      requestId: 'req-1',
      requestType: 'LWOP',
      employeeId: 'emp-1',
      blockReason: 'INSTITUTION_OWNERSHIP',
      message: 'Access denied: request belongs to a different institution',
      ipAddress: '127.0.0.1',
      deviceInfo: null,
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      message: 'Access denied: request belongs to a different institution',
    });

    expect(mockLogAccessDenied).toHaveBeenCalledOnce();
    const arg = mockLogAccessDenied.mock.calls[0][0];
    expect(arg.userId).toBe('user-1');
    expect(arg.userRole).toBe('HRO');
    expect(arg.attemptedRoute).toBe('/api/lwop/req-1');
    expect(arg.blockReason).toBe('INSTITUTION_OWNERSHIP');
    expect(arg.requestMethod).toBe('PATCH');
    expect(arg.additionalData.requestType).toBe('LWOP');
    expect(arg.additionalData.requestId).toBe('req-1');
    expect(arg.additionalData.employeeId).toBe('emp-1');
  });

  it('returns the requested status (400 for FSM denials) and records from/to', async () => {
    const res = await denyWorkflowAccess({
      auth: AUTH,
      routeBase: 'promotions',
      requestId: 'req-2',
      requestType: 'Promotion',
      blockReason: 'INVALID_STATUS_TRANSITION',
      message: 'Invalid status transition from "A" to "B"',
      status: 400,
      requestMethod: 'PUT',
      additionalData: { fromStatus: 'A', toStatus: 'B' },
    });

    expect(res.status).toBe(400);
    const arg = mockLogAccessDenied.mock.calls[0][0];
    expect(arg.requestMethod).toBe('PUT');
    expect(arg.additionalData.fromStatus).toBe('A');
    expect(arg.additionalData.toStatus).toBe('B');
  });

  it('defaults requestMethod to PATCH and employeeId to null when omitted', async () => {
    await denyWorkflowAccess({
      auth: AUTH,
      routeBase: 'confirmations',
      requestId: 'req-3',
      requestType: 'Confirmation',
      blockReason: 'SELF_APPROVAL',
      message: 'Cannot approve or reject your own submission',
    });
    const arg = mockLogAccessDenied.mock.calls[0][0];
    expect(arg.requestMethod).toBe('PATCH');
    expect(arg.additionalData.employeeId).toBeNull();
  });
});
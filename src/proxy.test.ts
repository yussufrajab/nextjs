// @vitest-environment node
/**
 * Tests for the proxy (middleware) audit wiring (Req 15.7 / 17.6).
 *
 * Edge-blocks (invalid session, lacks-permission) must write to the
 * tamper-evident audit trail — not console.log only. These tests mock
 * session-manager + audit-logger and assert the right audit helper fires.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockLogUnauthorizedAccess = vi.fn();
const mockLogForbiddenRoute = vi.fn();
const mockVerifySessionToken = vi.fn();
const mockValidateSession = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  verifySessionToken: (...a: any[]) => mockVerifySessionToken(...a),
  validateSession: (...a: any[]) => mockValidateSession(...a),
  SESSION_COOKIE_NAME_PROD: '__Host-session',
  SESSION_COOKIE_NAME_DEV: 'session',
}));

vi.mock('@/lib/audit-logger', () => ({
  logUnauthorizedAccess: (...a: any[]) => mockLogUnauthorizedAccess(...a),
  logForbiddenRoute: (...a: any[]) => mockLogForbiddenRoute(...a),
  safeAuditLog: async (p: Promise<void>) => {
    try {
      await p;
    } catch {
      /* swallow — exercised helper */
    }
  },
}));

import { proxy } from './proxy';

function dashboardReq(path: string, opts: { cookie?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.cookie) headers.cookie = opts.cookie;
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe('proxy audit wiring (Req 15.7 / 17.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogUnauthorizedAccess.mockResolvedValue(undefined);
    mockLogForbiddenRoute.mockResolvedValue(undefined);
  });

  it('writes an UNAUTHORIZED_ACCESS audit (isAuthenticated:false) on invalid session', async () => {
    // No session cookie → validateRequestSession returns null → redirect to /login
    const res = await proxy(dashboardReq('/dashboard/admin'));

    expect(res.status).toBe(307); // redirect
    expect(mockLogUnauthorizedAccess).toHaveBeenCalledOnce();
    const arg = mockLogUnauthorizedAccess.mock.calls[0][0];
    expect(arg.isAuthenticated).toBe(false);
    expect(arg.attemptedRoute).toBe('/dashboard/admin');
    expect(arg.blockReason).toMatch(/session/i);
    expect(mockLogForbiddenRoute).not.toHaveBeenCalled();
  });

  it('writes a FORBIDDEN_ROUTE audit when an authenticated role lacks permission', async () => {
    // Valid session, but EMPLOYEE is not allowed on /dashboard/admin (Admin-only)
    mockVerifySessionToken.mockReturnValue('token-1');
    mockValidateSession.mockResolvedValue({
      User: { id: 'user-1', username: 'emp', role: 'EMPLOYEE', active: true },
    });

    const res = await proxy(
      dashboardReq('/dashboard/admin', { cookie: '__Host-session=signed-token-1; session=signed-token-1' })
    );

    expect(res.status).toBe(307); // redirect to /dashboard
    expect(mockLogForbiddenRoute).toHaveBeenCalledOnce();
    const arg = mockLogForbiddenRoute.mock.calls[0][0];
    expect(arg.userId).toBe('user-1');
    expect(arg.userRole).toBe('EMPLOYEE');
    expect(arg.attemptedRoute).toBe('/dashboard/admin');
    expect(mockLogUnauthorizedAccess).not.toHaveBeenCalled();
  });

  it('does not audit when access is granted (no false-positive audit rows)', async () => {
    mockVerifySessionToken.mockReturnValue('token-1');
    mockValidateSession.mockResolvedValue({
      User: { id: 'user-1', username: 'admin', role: 'Admin', active: true },
    });

    await proxy(
      dashboardReq('/dashboard/admin', { cookie: 'session=signed-token-1' })
    );

    expect(mockLogForbiddenRoute).not.toHaveBeenCalled();
    expect(mockLogUnauthorizedAccess).not.toHaveBeenCalled();
  });

  it('grants HRO_PEMBA access to /dashboard (regression: redirect loop on login)', async () => {
    // The pemba-scoped HRO role must pass the proxy's canAccessRoute check
    // for /dashboard. Before the fix, HRO_PEMBA/HRRP_PEMBA were absent from
    // the proxy's ROUTE_PERMISSIONS, so the middleware redirected to
    // /dashboard?error=unauthorized — which re-entered the proxy and looped
    // until the browser aborted with redirectLoop.
    mockVerifySessionToken.mockReturnValue('token-1');
    mockValidateSession.mockResolvedValue({
      User: { id: 'user-1', username: 'bimkubwa', role: 'HRO_PEMBA', active: true },
    });

    await proxy(
      dashboardReq('/dashboard', { cookie: 'session=signed-token-1' })
    );

    // Access was granted → no forbidden-route audit, no unauthorized audit.
    expect(mockLogForbiddenRoute).not.toHaveBeenCalled();
    expect(mockLogUnauthorizedAccess).not.toHaveBeenCalled();
  });
});
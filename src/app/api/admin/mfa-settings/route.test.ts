/**
 * Route-level tests for the admin MFA enforcement toggle.
 *
 * Verifies src/app/api/admin/mfa-settings/route.ts:
 *  - GET returns the current policy (default true when unset).
 *  - PUT toggles the policy and returns the new state.
 *  - PUT rejects non-boolean `enabled` with 400.
 *  - PUT is a no-op (200) when the value is unchanged.
 *
 * The SystemSettings persistence is mocked; these tests assert route wiring
 * and the audit-log call shape only.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();
const mockLogConfigChange = vi.fn();
const mockTerminateAllSessions = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    systemSettings: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      upsert: (...a: unknown[]) => mockUpsert(...a),
    },
  },
}));

vi.mock('@/lib/api-auth', () => ({
  // Pass-through that injects a fake admin auth context.
  withAuth: (handler: (req: Request, ctx: { auth: Record<string, string> }) => unknown) =>
    (req: Request) => handler(req, { auth: { userId: 'admin-1', username: 'admin', role: 'Admin', institutionId: '1' } }),
}));

vi.mock('@/lib/error-handler', () => ({ wrapHandler: (h: unknown) => h }));

vi.mock('@/lib/audit-logger', () => ({
  logConfigChange: (...a: unknown[]) => mockLogConfigChange(...a),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/mfa-policy', () => ({
  isMfaEnabled: () =>
    mockFindUnique().then((r: { value?: string } | null) => (r ? r.value === 'true' : true)),
  setMfaEnabled: (enabled: boolean) => mockUpsert({ value: String(enabled) }),
}));
vi.mock('@/lib/session-manager', () => ({
  terminateAllSessions: (...a: unknown[]) => mockTerminateAllSessions(...a),
}));

import { GET, PUT } from './route';

function req(body?: unknown) {
  return new NextRequest('http://localhost/api/admin/mfa-settings', {
    method: body !== undefined ? 'PUT' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue(undefined);
  mockLogConfigChange.mockResolvedValue(undefined);
  mockTerminateAllSessions.mockResolvedValue(5);
});

describe('GET /api/admin/mfa-settings', () => {
  it('returns enabled=true when no setting row exists (default)', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.enabled).toBe(true);
  });

  it('returns enabled=false when the setting is stored as "false"', async () => {
    mockFindUnique.mockResolvedValue({ value: 'false' });
    const res = await GET(req());
    const json = await res.json();
    expect(json.data.enabled).toBe(false);
  });
});

describe('PUT /api/admin/mfa-settings', () => {
  it('toggles from enabled to disabled and audits the change', async () => {
    mockFindUnique.mockResolvedValue({ value: 'true' }); // currently enabled
    const res = await PUT(req({ enabled: false }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.enabled).toBe(false);
    expect(json.data.terminatedSessions).toBe(5);
    expect(mockTerminateAllSessions).toHaveBeenCalledTimes(1);
    expect(mockTerminateAllSessions).toHaveBeenCalledWith('admin-1');
    expect(mockLogConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({
        configKey: 'MFA_ENABLED',
        previousValue: 'true',
        newValue: 'false',
        performedById: 'admin-1',
        additionalData: expect.objectContaining({ terminatedSessions: 5 }),
      })
    );
  });

  it('toggles from disabled to enabled and audits the change', async () => {
    mockFindUnique.mockResolvedValue({ value: 'false' });
    const res = await PUT(req({ enabled: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.enabled).toBe(true);
    expect(mockLogConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ previousValue: 'false', newValue: 'true' })
    );
  });

  it('is a no-op (no audit, no session termination) when the value is unchanged', async () => {
    mockFindUnique.mockResolvedValue({ value: 'true' });
    const res = await PUT(req({ enabled: true }));
    expect(res.status).toBe(200);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockLogConfigChange).not.toHaveBeenCalled();
    expect(mockTerminateAllSessions).not.toHaveBeenCalled();
  });

  it('rejects a non-boolean enabled with 400', async () => {
    const res = await PUT(req({ enabled: 'yes' }));
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockTerminateAllSessions).not.toHaveBeenCalled();
  });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/ip-ban-utils', () => ({
  banIpManually: vi.fn(async () => undefined),
  unbanIp: vi.fn(async () => undefined),
  isIpBanned: vi.fn(async () => false),
}));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  getClientIp: () => '127.0.0.1',
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { CRITICAL: 'CRITICAL', INFO: 'INFO' },
  AuditEventType: { ADMIN_IP_BAN: 'ADMIN_IP_BAN', ADMIN_IP_UNBAN: 'ADMIN_IP_UNBAN' },
}));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({
  withAuth: vi.fn((h: any) => async (req: any) =>
    h(req, { auth: { userId: 'admin-1', username: 'admin', role: 'Admin' } })),
  requireReauth: vi.fn(() => null),
}));
vi.mock('@/lib/rate-limiter', () => ({ withRateLimit: vi.fn((h: any) => h) }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn() } }));
vi.mock('@/lib/error-handler', () => ({ wrapHandler: vi.fn((h: any) => h) }));
vi.mock('@/lib/api-csrf-middleware', () => ({ validateCSRF: vi.fn(async () => ({ valid: true })) }));

import { POST as banPost } from './ban-ip/route';
import { POST as unbanPost } from './unban-ip/route';
import { banIpManually, unbanIp } from '@/lib/ip-ban-utils';
import { NextRequest } from 'next/server';

function req(body: object, path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/ban-ip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bans an IP and returns 200', async () => {
    const res = await banPost(req({ ipAddress: '203.0.113.9', reason: 'credential stuffing' }, '/api/admin/ban-ip'));
    expect(res.status).toBe(200);
    expect(banIpManually).toHaveBeenCalledWith('203.0.113.9', expect.any(String), 'credential stuffing', undefined);
  });

  it('rejects a short reason with 400', async () => {
    const res = await banPost(req({ ipAddress: '203.0.113.9', reason: 'bad' }, '/api/admin/ban-ip'));
    expect(res.status).toBe(400);
    expect(banIpManually).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/unban-ip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unbans an IP and returns 200', async () => {
    const res = await unbanPost(req({ ipAddress: '203.0.113.9', notes: 'investigated — false positive' }, '/api/admin/unban-ip'));
    expect(res.status).toBe(200);
    expect(unbanIp).toHaveBeenCalledWith('203.0.113.9', expect.any(String), 'investigated — false positive');
  });
});
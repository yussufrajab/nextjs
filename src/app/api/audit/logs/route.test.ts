import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockDbUserFindUnique = vi.fn();
const mockGetAuditLogs = vi.fn();
const mockGetAuditStatistics = vi.fn();

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
}));

vi.mock('@/lib/audit-logger', () => ({
  getAuditLogs: (...a: any[]) => mockGetAuditLogs(...a),
  getAuditStatistics: (...a: any[]) => mockGetAuditStatistics(...a),
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
}));

function authedRequest(role: string): NextRequest {
  return new NextRequest('http://localhost:9002/api/audit/logs?limit=10', {
    headers: {
      cookie: `session=${signSessionToken('good-token')}`,
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
  });
}

describe('GET /api/audit/logs authorization', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockDbUserFindUnique.mockReset();
    mockGetAuditLogs.mockReset();
    mockGetAuditStatistics.mockReset();
  });

  it('returns 401 when no session cookie is present', async () => {
    const { GET } = await import('./route');
    const res = await GET(new NextRequest('http://localhost:9002/api/audit/logs'));
    expect(res.status).toBe(401);
  });

  it('rejects a forged auth-storage cookie claiming Admin role without a session', async () => {
    const forged = encodeURIComponent(
      JSON.stringify({ state: { user: { id: 'u1', role: 'Admin' }, isAuthenticated: true } })
    );
    const { GET } = await import('./route');
    const res = await GET(
      new NextRequest('http://localhost:9002/api/audit/logs', {
        headers: { cookie: `auth-storage=${forged}` },
      })
    );
    expect(res.status).toBe(401);
    expect(mockGetAuditLogs).not.toHaveBeenCalled();
  });

  it('returns 403 for an authenticated non-Admin/CSCS user', async () => {
    mockValidateSession.mockResolvedValue({
      id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0',
    });
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'x',
    });
    const { GET } = await import('./route');
    const res = await GET(authedRequest('HRO'));
    expect(res.status).toBe(403);
  });

  it('returns logs for an authenticated Admin', async () => {
    mockValidateSession.mockResolvedValue({
      id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0',
    });
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u1', active: true, role: 'Admin', institutionId: null, username: 'admin',
    });
    mockGetAuditLogs.mockResolvedValue({ logs: [], total: 0 });
    const { GET } = await import('./route');
    const res = await GET(authedRequest('Admin'));
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);
  });
});
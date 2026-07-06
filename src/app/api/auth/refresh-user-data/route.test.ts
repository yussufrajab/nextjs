import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

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
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
  logAccessDenied: () => Promise.resolve(undefined),
  logForbiddenRoute: () => Promise.resolve(undefined),
}));

const SAFE_USER = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', email: 'yussuf.rajab@zanajira.go.tz', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1',
  isTemporaryPassword: false, temporaryPasswordExpiry: null,
  mustChangePassword: false, lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
};

function authedRequest(): NextRequest {
  return new NextRequest('http://localhost:9002/api/auth/refresh-user-data', {
    headers: {
      cookie: `session=${signSessionToken('good-token')}`,
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
  });
}

describe('GET /api/auth/refresh-user-data', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns 401 with no session cookie', async () => {
    const { GET } = await import('./route');
    const res = await GET(new NextRequest('http://localhost:9002/api/auth/refresh-user-data'));
    expect(res.status).toBe(401);
  });

  it('returns UI-safe data and never passwordHistory', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0' });
    // verifyAuth's lookup (select subset, no name) vs getMePayload's lookup (select name) — branch on select.name
    mockUserFindUnique.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
      Promise.resolve(select?.name ? SAFE_USER : { id: 'u1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'ymrajab' })
    );
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });

    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe('yussuf.rajab@zanajira.go.tz');
    const serialized = JSON.stringify(body.data);
    expect(serialized).not.toContain('passwordHistory');
    expect(serialized).not.toContain('passwordChangeLockoutUntil');
    expect(serialized).not.toContain('failedPasswordChangeAttempts');
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

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
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
}));

const SAFE_USER = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', email: 'yussuf.rajab@zanajira.go.tz', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1',
  isTemporaryPassword: false, temporaryPasswordExpiry: null,
  mustChangePassword: false, lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
};

function authedRequest(): NextRequest {
  return new NextRequest('http://localhost:9002/api/auth/me', {
    headers: {
      cookie: `session=${signSessionToken('good-token')}`,
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
  });
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns 401 when no session cookie is present', async () => {
    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost:9002/api/auth/me');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.clone().json();
    expect(body.success).toBe(false);
  });

  it('returns the UI-safe payload with no password fields', async () => {
    // verifyAuth's lookup uses a minimal select (no `name`); getMePayload's lookup includes `name` — branch the mock on `select.name`.
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0' });
    mockUserFindUnique.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
      Promise.resolve(select?.name ? SAFE_USER : { id: 'u1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'ymrajab' })
    );
    mockInstitutionFindUnique.mockResolvedValue({ name: 'TUME YA UTUMISHI SERIKALINI' });

    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.clone().json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      id: 'u1', username: 'ymrajab', name: 'Yussuf', email: 'yussuf.rajab@zanajira.go.tz', role: 'Admin', active: true,
      employeeId: null, institutionId: 'inst-1',
      institutionName: 'TUME YA UTUMISHI SERIKALINI',
      mustChangePassword: false, isTemporaryPassword: false,
      temporaryPasswordExpiry: null, lastPasswordChange: '2026-05-14T07:51:39.477Z',
    });
    const serialized = JSON.stringify(body.data);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('passwordHistory');
  });

  it('returns 401 when the session is invalid', async () => {
    mockValidateSession.mockResolvedValue(null);
    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 INVALID_SESSION when the user has been deleted but the session is still valid', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0' });
    // verifyAuth's lookup uses a minimal select (no `name`); getMePayload's lookup includes `name` — branch the mock on `select.name`.
    mockUserFindUnique.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
      Promise.resolve(select?.name ? null : { id: 'u1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'ymrajab' })
    );

    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(401);
    const body = await res.clone().json();
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });
});
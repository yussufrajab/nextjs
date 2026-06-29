/**
 * Unit tests for src/lib/api-auth.ts
 *
 * verifyAuth reads the HttpOnly `session` cookie, verifies its HMAC signature,
 * validates the raw token against the DB via validateSession, and derives
 * userId/role from the session row + User table — never from the client-
 * controlled auth-storage cookie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, withAuth } from './api-auth';
import { signSessionToken } from '@/lib/session-manager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockValidateSession = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...args: any[]) => mockValidateSession(...args),
  // Pass-through signing helpers so the tests can build realistic cookies.
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(token);
    return `${token}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 2) return null;
      const [token, provided] = parts;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(token);
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
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequestWithSessionCookie(signedSessionToken?: string): NextRequest {
  const url = 'http://localhost:9002/api/test';
  if (signedSessionToken === undefined) return new NextRequest(url);
  return new NextRequest(url, {
    headers: { cookie: `session=${signedSessionToken}` },
  });
}

async function responseBody(response: NextResponse): Promise<any> {
  return response.clone().json();
}

// ---------------------------------------------------------------------------
// verifyAuth
// ---------------------------------------------------------------------------

describe('verifyAuth', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockFindUnique.mockReset();
  });

  it('returns UNAUTHENTICATED (401) when no session cookie is present', async () => {
    const req = new NextRequest('http://localhost:9002/api/test');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    expect(result.response!.status).toBe(401);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('UNAUTHENTICATED');
  });

  it('returns INVALID_SESSION (401) when the cookie signature is invalid', async () => {
    const req = makeRequestWithSessionCookie('forged-token.bogus-signature');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  it('returns INVALID_SESSION (401) when validateSession returns null', async () => {
    mockValidateSession.mockResolvedValue(null);
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns INVALID_SESSION when the DB user lookup returns null', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns INVALID_SESSION when the user is inactive', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: false, role: 'Admin', institutionId: null, username: 'admin' });
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns authenticated context derived from the session row + DB user', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'hro1' });
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context).toEqual({
      userId: 'user-1',
      role: 'HRO',
      institutionId: 'inst-1',
      username: 'hro1',
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, active: true, role: true, institutionId: true, username: true },
    });
    // validateSession must receive the RAW token, not the signed cookie value.
    expect(mockValidateSession).toHaveBeenCalledWith('good-token');
  });

  it('uses the session userId even when an auth-storage cookie claims a different user', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'real-user', User: { id: 'real-user' } });
    mockFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === 'real-user'
          ? { id: 'real-user', active: true, role: 'EMPLOYEE', institutionId: null, username: 'real' }
          : null
      )
    );
    const req = new NextRequest('http://localhost:9002/api/test', {
      headers: {
        cookie:
          'session=' +
          signSessionToken('good-token') +
          '; auth-storage=' +
          encodeURIComponent(JSON.stringify({ userId: 'attacker-target', role: 'Admin' })),
      },
    });
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context!.userId).toBe('real-user');
    expect(result.context!.role).toBe('EMPLOYEE');
  });

  it('returns INVALID_SESSION when validateSession throws', async () => {
    mockValidateSession.mockRejectedValue(new Error('DB down'));
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns INVALID_SESSION when the user lookup throws', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockRejectedValue(new Error('DB down'));
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('supports plain Request objects by parsing the cookie header', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'Admin', institutionId: null, username: 'admin' });
    const req = new Request('http://localhost:9002/api/test', {
      headers: { cookie: 'session=' + signSessionToken('good-token') },
    });
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context!.userId).toBe('user-1');
  });
});

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

describe('withAuth', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockFindUnique.mockReset();
  });

  it('calls the handler with the DB-derived auth context', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'User', institutionId: null, username: 'user' });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));

    await wrapped(req);

    expect(handler).toHaveBeenCalledWith(req, {
      auth: { userId: 'user-1', role: 'User', institutionId: null, username: 'user' },
    });
  });

  it('returns 403 FORBIDDEN when the DB role is not in allowedRoles', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'User', institutionId: null, username: 'user' });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler, { allowedRoles: ['Admin'] });
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));

    const response = await wrapped(req);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    const body = await response.clone().json();
    expect(body.errorCode).toBe('FORBIDDEN');
  });

  it('matches allowedRoles case-insensitively', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'a1', User: { id: 'a1' } });
    mockFindUnique.mockResolvedValue({ id: 'a1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'admin' });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler, { allowedRoles: ['ADMIN'] });
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));

    const response = await wrapped(req);

    expect(handler).toHaveBeenCalledOnce();
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('returns 401 when no session cookie is present', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);
    const req = new NextRequest('http://localhost:9002/api/test');

    const response = await wrapped(req);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });
});

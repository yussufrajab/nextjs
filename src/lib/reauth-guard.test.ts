/**
 * Unit tests for the `requireReauth` step-up guard in src/lib/api-auth.ts.
 *
 * Covers:
 *  - passes (returns null) when a valid, in-scope reauth cookie bound to the
 *    session user is present
 *  - rejects (401 REAUTH_REQUIRED) when no reauth cookie is present
 *  - rejects on scope mismatch
 *  - rejects on expired token
 *  - rejects when the reauth token was issued to a different userId than the
 *    current session (replay across accounts)
 *  - the 401 body carries errorCode: REAUTH_REQUIRED and the requiredScope
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { issueReauthToken } from '@/lib/reauth';
import { requireReauth } from './api-auth';

// ---------------------------------------------------------------------------
// Mocks — only what api-auth.ts imports. The reauth token module is left real
// (it is pure crypto + SESSION_SECRET, which the global test setup provides).
// ---------------------------------------------------------------------------

vi.mock('@/lib/session-manager', () => ({
  validateSession: vi.fn(),
  markSessionSuspicious: vi.fn(),
  SESSION_COOKIE_NAME_PROD: '__Host-session',
  SESSION_COOKIE_NAME_DEV: 'session',
  SESSION_COOKIE_NAME: 'session',
  signSessionToken: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: { user: { findUnique: vi.fn() } } }));

const mockLogAccessDenied = vi.fn().mockResolvedValue(undefined);
const mockLogForbiddenRoute = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
  logAccessDenied: (...args: any[]) => mockLogAccessDenied(...args),
  logForbiddenRoute: (...args: any[]) => mockLogForbiddenRoute(...args),
}));

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: vi.fn().mockResolvedValue({ valid: true }),
}));

beforeAll(() => {
  // The global test setup sets SESSION_SECRET; ensure it is present for the
  // real reauth HMAC signer.
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only';
  }
});

// The vitest config uses `mockReset: true`, which strips mockResolvedValue
// before each test. Re-establish the resolved value so logAccessDenied
// returns a real promise (requireReauth calls `.catch()` on it).
beforeEach(() => {
  mockLogAccessDenied.mockResolvedValue(undefined);
  mockLogForbiddenRoute.mockResolvedValue(undefined);
});

const AUTH = { userId: 'user-1', username: 'ymrajab', role: 'Admin' };

function makeRequest(cookieValue?: string): NextRequest {
  const url = 'http://localhost:9002/api/users/user-1';
  if (cookieValue === undefined) return new NextRequest(url);
  return new NextRequest(url, {
    headers: { cookie: `reauth=${cookieValue}` },
  });
}

describe('requireReauth', () => {
  it('returns null when a valid in-scope reauth cookie bound to the session user is present', () => {
    const token = issueReauthToken(AUTH.userId, 'users.delete');
    const req = makeRequest(token);
    expect(requireReauth(req, 'users.delete', AUTH)).toBeNull();
  });

  it('returns 401 REAUTH_REQUIRED when no reauth cookie is present', () => {
    const req = makeRequest(); // no cookie
    const result = requireReauth(req, 'users.delete', AUTH);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns 401 REAUTH_REQUIRED on scope mismatch', () => {
    // Token issued for users.delete, but the route requires admin.reset-password.
    const token = issueReauthToken(AUTH.userId, 'users.delete');
    const req = makeRequest(token);
    const result = requireReauth(req, 'admin.reset-password', AUTH);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns 401 REAUTH_REQUIRED on an expired token', async () => {
    const token = issueReauthToken(AUTH.userId, 'users.delete', 1);
    await new Promise((r) => setTimeout(r, 10));
    const req = makeRequest(token);
    const result = requireReauth(req, 'users.delete', AUTH);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('returns 401 REAUTH_REQUIRED when the token userId does not match the session userId (replay across accounts)', () => {
    // Token issued to user-2, but the session belongs to user-1.
    const token = issueReauthToken('user-2', 'users.delete');
    const req = makeRequest(token);
    const result = requireReauth(req, 'users.delete', AUTH);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it('the 401 body carries errorCode REAUTH_REQUIRED and the requiredScope', async () => {
    const req = makeRequest(); // no cookie
    const result = requireReauth(req, 'institutions.delete', AUTH)!;
    const body = await result.clone().json();
    expect(body.errorCode).toBe('REAUTH_REQUIRED');
    expect(body.requiredScope).toBe('institutions.delete');
  });

  it('logs the access-denied event on rejection (fail-safe, never throws)', () => {
    mockLogAccessDenied.mockClear();
    const req = makeRequest(); // no cookie
    requireReauth(req, 'users.delete', AUTH);
    expect(mockLogAccessDenied).toHaveBeenCalledTimes(1);
    const payload = mockLogAccessDenied.mock.calls[0][0];
    expect(payload.blockReason).toBe('REAUTH_REQUIRED');
    expect(payload.additionalData.requiredScope).toBe('users.delete');
  });
});
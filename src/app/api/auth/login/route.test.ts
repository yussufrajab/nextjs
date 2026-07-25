/**
 * Route-level tests for the per-user sliding login rate limit (Req 1.8).
 *
 * Verifies the wiring in src/app/api/auth/login/route.ts:
 *  - When the per-user sliding limit denies (rate_limit_exceeded) → 429, and
 *    the DB lookup is NOT reached (the limit is checked before findFirst).
 *  - When Redis is down and the limiter fail-closes (fail_closed) → 503.
 *  - When the per-user limit allows, the request proceeds to the DB lookup.
 *  - The key passed to the limiter is the normalized per-user key, so case
 *    variants of the same username share a bucket.
 *
 * The limiter logic itself is unit-tested in src/lib/rate-limiter-sliding.test.ts;
 * this file asserts the route wiring only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---------------------------------------------------------------

const mockCheckRateLimitSliding = vi.fn();
const mockUserFindFirst = vi.fn();
const mockBuildUserRateLimitKey = vi.fn();

vi.mock('@/lib/rate-limiter', () => ({
  // Pass-through wrapper so the inner handler runs directly.
  withRateLimit: (handler: any) => handler,
  checkRateLimitSliding: (...a: any[]) => mockCheckRateLimitSliding(...a),
  buildUserRateLimitKey: (...a: any[]) => mockBuildUserRateLimitKey(...a),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: (...a: any[]) => mockUserFindFirst(...a),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: () => Promise.resolve({ valid: true, response: null }),
}));

vi.mock('@/lib/session-manager', () => ({
  PRE_SESSION_COOKIE_NAME: 'pre-session',
  generatePreSessionToken: () => 'pre-session-token',
  getPreSessionCookieOptions: () => ({ httpOnly: true, path: '/' }),
}));

vi.mock('@/lib/error-handler', () => ({
  // Pass-through so the handler runs without the error-boundary wrapper.
  wrapHandler: (handler: any) => handler,
}));

vi.mock('@/lib/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audit-logger', () => ({
  logLoginAttempt: vi.fn(),
  getClientIp: () => '127.0.0.1',
  logAuditEvent: vi.fn(),
  AuditEventType: {},
  AuditEventCategory: {},
  AuditSeverity: {},
}));

vi.mock('@/lib/password-hash', () => ({ comparePassword: vi.fn() }));
vi.mock('@/lib/hibp', () => ({ checkPasswordBreached: vi.fn() }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/auth-helpers', () => ({ completeLogin: vi.fn() }));
vi.mock('@/lib/mfa-utils', () => ({
  createMfaToken: vi.fn(),
  checkOtpRateLimit: vi.fn(),
  maskEmail: (e: string) => e,
}));
vi.mock('@/lib/email', () => ({ sendMfaEmail: vi.fn() }));

beforeEach(() => {
  mockCheckRateLimitSliding.mockReset();
  mockUserFindFirst.mockReset();
  mockBuildUserRateLimitKey.mockReset();
  // Real-ish key builder so we can assert on the key actually passed to the
  // limiter (normalization is the security property under test here).
  mockBuildUserRateLimitKey.mockImplementation(
    (u: string) => `ratelimit:user:${(u ?? '').trim().toLowerCase()}:auth`
  );
});

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login — per-user rate limit (Req 1.8)', () => {
  it('returns 429 and skips the DB lookup when the per-user limit is exceeded', async () => {
    mockCheckRateLimitSliding.mockResolvedValueOnce({
      allowed: false,
      limit: 5,
      remaining: 0,
      retryAfter: 37,
      reason: 'rate_limit_exceeded',
    });

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'alice', password: 'pw' }));

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('37');
    const json = await res.json();
    expect(json.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    // The per-user limit must be checked BEFORE the DB lookup, so brute-force
    // guesses against non-existent usernames are throttled too.
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it('returns 503 when Redis is down and the limiter fail-closes', async () => {
    mockCheckRateLimitSliding.mockResolvedValueOnce({
      allowed: false,
      limit: 5,
      remaining: 0,
      retryAfter: 60,
      reason: 'fail_closed',
    });

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'alice', password: 'pw' }));

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.errorCode).toBe('SERVICE_UNAVAILABLE');
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it('proceeds to the DB lookup when the per-user limit allows', async () => {
    mockCheckRateLimitSliding.mockResolvedValueOnce({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfter: 60,
    });
    mockUserFindFirst.mockResolvedValueOnce(null); // user not found → 401

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'alice', password: 'pw' }));

    expect(res.status).toBe(401);
    expect(mockUserFindFirst).toHaveBeenCalledTimes(1);
  });

  it('passes a normalized per-user key so case variants share a bucket', async () => {
    mockCheckRateLimitSliding.mockResolvedValueOnce({
      allowed: true,
      limit: 5,
      remaining: 4,
      retryAfter: 60,
    });
    mockUserFindFirst.mockResolvedValueOnce(null);

    const { POST } = await import('./route');
    await POST(buildRequest({ username: '  Alice  ', password: 'pw' }));

    expect(mockBuildUserRateLimitKey).toHaveBeenCalledWith('  Alice  ');
    // The limiter must receive the normalized key (lowercased + trimmed).
    expect(mockCheckRateLimitSliding).toHaveBeenCalledWith(
      'ratelimit:user:alice:auth',
      'auth',
      { failClosed: true }
    );
  });
});
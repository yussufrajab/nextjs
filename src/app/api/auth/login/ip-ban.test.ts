/**
 * Login route — IP ban gate. Verifies a banned IP gets 403 before the DB lookup,
 * and a failed login feeds the IP failed-login counter.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock ip-ban-utils BEFORE importing the route. vi.mock is hoisted.
vi.mock('@/lib/ip-ban-utils', () => ({
  isIpBanned: vi.fn(),
  getIpBanStatus: vi.fn(),
  recordFailedLoginFromIp: vi.fn().mockResolvedValue(undefined),
  autoUnbanExpiredIps: vi.fn().mockResolvedValue(0),
  isTrustedIp: vi.fn().mockReturnValue(false),
}));

// Mock the other heavy deps the route imports, so the test is isolated.
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('@/lib/password-hash', () => ({ comparePassword: vi.fn() }));
vi.mock('@/lib/audit-logger', () => ({
  logLoginAttempt: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn().mockReturnValue('203.0.113.9'),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AuditEventType: { PASSWORD_PWNED_LOGIN: 'PASSWORD_PWNED_LOGIN' },
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { WARNING: 'WARNING' },
}));
vi.mock('@/lib/hibp', () => ({ checkPasswordBreached: vi.fn().mockResolvedValue({ isPwned: false }) }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/auth-helpers', () => ({ completeLogin: vi.fn() }));
vi.mock('@/lib/mfa-utils', () => ({
  createMfaToken: vi.fn(),
  checkOtpRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  maskEmail: vi.fn().mockReturnValue('j***@e.com'),
}));
vi.mock('@/lib/email', () => ({ sendMfaEmail: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({
  withRateLimit: vi.fn((_h: any) => _h), // pass-through wrapper
  checkRateLimitSliding: vi.fn().mockResolvedValue({ allowed: true }),
  buildUserRateLimitKey: vi.fn().mockReturnValue('k'),
}));
vi.mock('@/lib/logger', () => ({ authLogger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/error-handler', () => ({ wrapHandler: vi.fn((_h: any) => _h) }));
vi.mock('@/lib/api-csrf-middleware', () => ({ validateCSRF: vi.fn().mockResolvedValue({ valid: true }) }));
vi.mock('@/lib/session-manager', () => ({
  generatePreSessionToken: vi.fn().mockReturnValue('t'),
  getPreSessionCookieOptions: vi.fn().mockReturnValue({}),
  PRE_SESSION_COOKIE_NAME: 'pre_session',
}));

import { validateCSRF } from '@/lib/api-csrf-middleware';
import { POST } from './route';
import {
  isIpBanned,
  getIpBanStatus,
  recordFailedLoginFromIp,
  autoUnbanExpiredIps,
} from '@/lib/ip-ban-utils';
import { logLoginAttempt } from '@/lib/audit-logger';
import { checkRateLimitSliding } from '@/lib/rate-limiter';
import { NextRequest } from 'next/server';

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('login route — IP ban gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish resolved-promise returns: vi.clearAllMocks() can reset
    // mockResolvedValue implementations in this vitest version, and the route
    // calls `.catch` on the result of recordFailedLoginFromIp — if that returns
    // undefined (not a Promise), `.catch` throws TypeError and the route 500s.
    (recordFailedLoginFromIp as any).mockResolvedValue(undefined);
    (autoUnbanExpiredIps as any).mockResolvedValue(0);
    (logLoginAttempt as any).mockResolvedValue(undefined);
    (checkRateLimitSliding as any).mockResolvedValue({ allowed: true });
    (validateCSRF as any).mockResolvedValue({ valid: true, response: null });
  });

  it('returns 403 IP_BLOCKED when the IP is banned, before any DB lookup', async () => {
    (isIpBanned as any).mockResolvedValue(true);
    (getIpBanStatus as any).mockResolvedValue({
      isBanned: true,
      banType: 'security',
      remainingMinutes: 60,
    });
    const res = await POST(makeReq({ username: 'someone', password: 'x' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.errorCode).toBe('IP_BLOCKED');
    // recordFailedLoginFromIp must NOT have been called (already banned)
    expect(recordFailedLoginFromIp).not.toHaveBeenCalled();
  });

  it('does not 403 when the IP is not banned', async () => {
    (isIpBanned as any).mockResolvedValue(false);
    const res = await POST(makeReq({ username: 'someone', password: 'x' }));
    expect(res.status).not.toBe(403);
  });
});
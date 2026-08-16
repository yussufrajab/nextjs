/**
 * Route-level tests for the mandatory MFA policy.
 *
 * MFA is required for ALL users, regardless of role. The policy:
 *  1. Any role WITH email → MFA_REQUIRED (OTP + magic link sent).
 *  2. Any role WITHOUT email → 403 MFA_REQUIRED_NO_EMAIL (login blocked).
 *
 * Updated 2026-08-16: removed the conditional email-based MFA bypass —
 * previously, non-privileged roles without an email could log in without
 * MFA. Now every user must complete MFA.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---------------------------------------------------------------

const mockCheckRateLimitSliding = vi.fn();
const mockUserFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockComparePassword = vi.fn();
const mockCheckPasswordBreached = vi.fn();
const mockGetPasswordExpirationStatus = vi.fn();
const mockCreateMfaToken = vi.fn();
const mockCheckOtpRateLimit = vi.fn();
const mockSendMfaEmail = vi.fn();
const mockCompleteLogin = vi.fn();

vi.mock('@/lib/rate-limiter', () => ({
  withRateLimit: (handler: unknown) => handler,
  checkRateLimitSliding: (...a: unknown[]) => mockCheckRateLimitSliding(...a),
  buildUserRateLimitKey: (u: string) => `ratelimit:user:${u}:auth`,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findFirst: (...a: unknown[]) => mockUserFindFirst(...a),
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    ipBan: {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn(),
      create: vi.fn(),
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
  wrapHandler: (handler: unknown) => handler,
}));

vi.mock('@/lib/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  csrfLogger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
  ipBanLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audit-logger', () => ({
  logLoginAttempt: vi.fn(),
  getClientIp: () => '127.0.0.1',
  logAuditEvent: vi.fn(),
  AuditEventType: {},
  AuditEventCategory: {},
  AuditSeverity: {},
}));

vi.mock('@/lib/password-hash', () => ({ comparePassword: (...a: unknown[]) => mockComparePassword(...a) }));
vi.mock('@/lib/hibp', () => ({ checkPasswordBreached: (...a: unknown[]) => mockCheckPasswordBreached(...a) }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/auth-helpers', () => ({ completeLogin: (...a: unknown[]) => mockCompleteLogin(...a) }));
vi.mock('@/lib/mfa-utils', () => ({
  createMfaToken: (...a: unknown[]) => mockCreateMfaToken(...a),
  checkOtpRateLimit: (...a: unknown[]) => mockCheckOtpRateLimit(...a),
  maskEmail: (e: string) => e,
}));
vi.mock('@/lib/email', () => ({ sendMfaEmail: (...a: unknown[]) => mockSendMfaEmail(...a) }));
vi.mock('@/lib/account-lockout-utils', () => ({
  autoUnlockExpiredAccounts: vi.fn().mockResolvedValue(0),
  isAccountLocked: vi.fn().mockReturnValue(false),
  getRemainingLockoutTime: vi.fn().mockReturnValue(0),
  getAccountLockoutStatus: vi.fn().mockReturnValue({ isLocked: false }),
  incrementFailedLoginAttempts: vi.fn().mockResolvedValue(undefined),
  resetFailedLoginAttempts: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/ip-ban-utils', () => ({
  isIpBanned: vi.fn().mockResolvedValue(false),
  getIpBanStatus: vi.fn().mockResolvedValue({ isBanned: false, remainingMinutes: 0 }),
  recordFailedLoginFromIp: vi.fn().mockResolvedValue(undefined),
  autoUnbanExpiredIps: vi.fn().mockResolvedValue(0),
  isTrustedIp: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/password-expiration-utils', () => ({
  getPasswordExpirationStatus: (...a: unknown[]) => mockGetPasswordExpirationStatus(...a),
}));

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'testuser',
    role: 'HRO',
    name: 'Test User',
    email: null,
    password: 'hashed',
    active: true,
    isLocked: false,
    isTemporaryPassword: false,
    temporaryPasswordExpiry: null,
    mustChangePassword: false,
    passwordExpiresAt: null,
    gracePeriodStartedAt: null,
    lastExpirationWarningLevel: null,
    failedLoginAttempts: 0,
    loginLockedUntil: null,
    loginLockoutReason: null,
    loginLockoutType: null,
    isManuallyLocked: false,
    lockedBy: null,
    lockedAt: null,
    lockoutNotes: null,
    employeeId: null,
    institutionId: 'inst-1',
    Institution: { id: 'inst-1', name: 'Test Inst' },
    Employee: null,
    ...overrides,
  };
}

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckRateLimitSliding.mockResolvedValue({
    allowed: true,
    limit: 5,
    remaining: 4,
    retryAfter: 60,
  });
  mockComparePassword.mockResolvedValue(true);
  mockCheckPasswordBreached.mockResolvedValue(false);
  mockCheckOtpRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  mockCreateMfaToken.mockResolvedValue({ token: 'otp-token' });
  mockSendMfaEmail.mockResolvedValue({ success: true });
  mockCompleteLogin.mockResolvedValue(new Response(null, { status: 200 }));
  mockGetPasswordExpirationStatus.mockReturnValue({
    isExpired: false,
    isInGracePeriod: false,
  });
});

describe('POST /api/auth/login — per-role MFA gate (Req 1.1)', () => {
  it('blocks a privileged role (Admin) with no email → 403 MFA_REQUIRED_NO_EMAIL', async () => {
    const adminUser = makeUser({ role: 'Admin', email: null });
    mockUserFindFirst.mockResolvedValueOnce(adminUser);
    mockUserFindUnique.mockResolvedValueOnce(adminUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'admin1', password: 'pw' }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe('MFA_REQUIRED_NO_EMAIL');
    expect(mockCreateMfaToken).not.toHaveBeenCalled();
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('blocks a privileged role (CSCS) with no email → 403 MFA_REQUIRED_NO_EMAIL', async () => {
    const cscsUser = makeUser({ role: 'CSCS', email: null });
    mockUserFindFirst.mockResolvedValueOnce(cscsUser);
    mockUserFindUnique.mockResolvedValueOnce(cscsUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'cscs1', password: 'pw' }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe('MFA_REQUIRED_NO_EMAIL');
  });

  it('blocks a privileged role (HHRMD) with no email → 403 MFA_REQUIRED_NO_EMAIL', async () => {
    const hhrmdUser = makeUser({ role: 'HHRMD', email: null });
    mockUserFindFirst.mockResolvedValueOnce(hhrmdUser);
    mockUserFindUnique.mockResolvedValueOnce(hhrmdUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'hhrmd1', password: 'pw' }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe('MFA_REQUIRED_NO_EMAIL');
  });

  it('requires MFA for a privileged role (Admin) WITH email → MFA_REQUIRED', async () => {
    const adminUser = makeUser({ role: 'Admin', email: 'admin@example.gov' });
    mockUserFindFirst.mockResolvedValueOnce(adminUser);
    mockUserFindUnique.mockResolvedValueOnce(adminUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'admin1', password: 'pw' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe('MFA_REQUIRED');
    expect(mockCreateMfaToken).toHaveBeenCalledTimes(2);
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('blocks a non-privileged role (HRO) with no email → 403 MFA_REQUIRED_NO_EMAIL', async () => {
    const hroUser = makeUser({ role: 'HRO', email: null });
    mockUserFindFirst.mockResolvedValueOnce(hroUser);
    mockUserFindUnique.mockResolvedValueOnce(hroUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'hro1', password: 'pw' }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe('MFA_REQUIRED_NO_EMAIL');
    expect(mockCreateMfaToken).not.toHaveBeenCalled();
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('blocks a non-privileged role (HRRP_PEMBA) with no email → 403 MFA_REQUIRED_NO_EMAIL', async () => {
    const pembaUser = makeUser({ role: 'HRRP_PEMBA', email: null });
    mockUserFindFirst.mockResolvedValueOnce(pembaUser);
    mockUserFindUnique.mockResolvedValueOnce(pembaUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'pemba1', password: 'pw' }));

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.errorCode).toBe('MFA_REQUIRED_NO_EMAIL');
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('requires MFA for a non-privileged role (HRO) WITH email → MFA_REQUIRED', async () => {
    const hroUser = makeUser({ role: 'HRO', email: 'hro@example.gov' });
    mockUserFindFirst.mockResolvedValueOnce(hroUser);
    mockUserFindUnique.mockResolvedValueOnce(hroUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'hro1', password: 'pw' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe('MFA_REQUIRED');
    expect(mockCreateMfaToken).toHaveBeenCalledTimes(2);
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('requires MFA for a non-privileged role (DO) WITH email → MFA_REQUIRED', async () => {
    const doUser = makeUser({ role: 'DO', email: 'do@example.gov' });
    mockUserFindFirst.mockResolvedValueOnce(doUser);
    mockUserFindUnique.mockResolvedValueOnce(doUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'do1', password: 'pw' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe('MFA_REQUIRED');
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

  it('requires MFA for a non-privileged role (PO) WITH email → MFA_REQUIRED', async () => {
    const poUser = makeUser({ role: 'PO', email: 'po@example.gov' });
    mockUserFindFirst.mockResolvedValueOnce(poUser);
    mockUserFindUnique.mockResolvedValueOnce(poUser);

    const { POST } = await import('./route');
    const res = await POST(buildRequest({ username: 'po1', password: 'pw' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.code).toBe('MFA_REQUIRED');
    expect(mockCompleteLogin).not.toHaveBeenCalled();
  });

});
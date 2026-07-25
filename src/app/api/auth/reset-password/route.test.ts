/**
 * Route tests for POST /api/auth/reset-password (Req 1.10).
 * - Valid token + strong new password → password updated, temp/standard-lockout
 *   flags cleared, all sessions invalidated, PASSWORD_RESET audit written.
 * - Admin/security lockout (isManuallyLocked) is preserved across a reset.
 * - Expired / already-used / not-found / inactive-user → generic 400.
 * - Weak / common / history / same-as-current password → 400 and the token is
 *   NOT consumed (attempt counter incremented instead).
 * - HIBP pwned password → 400.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockResolveResetToken = vi.fn();
const mockConsumePasswordResetToken = vi.fn();
const mockIncrementResetVerifyAttempts = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockHashPassword = vi.fn();
const mockComparePassword = vi.fn();
const mockCheckPasswordHistory = vi.fn();
const mockCheckPasswordBreached = vi.fn();
const mockTerminateAllUserSessions = vi.fn();
const mockResetPasswordExpiration = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock('@/lib/rate-limiter', () => ({
  withRateLimit: (handler: any) => handler,
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...a: any[]) => mockUserFindUnique(...a),
      update: (...a: any[]) => mockUserUpdate(...a),
    },
  },
}));

vi.mock('@/lib/api-csrf-middleware', () => ({
  validateCSRF: () => Promise.resolve({ valid: true, response: null }),
}));

vi.mock('@/lib/error-handler', () => ({
  wrapHandler: (handler: any) => handler,
}));

vi.mock('@/lib/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: (...a: any[]) => mockLogAuditEvent(...a),
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { INFO: 'INFO' },
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/password-reset', () => ({
  resolveResetToken: (...a: any[]) => mockResolveResetToken(...a),
  consumePasswordResetToken: (...a: any[]) => mockConsumePasswordResetToken(...a),
  incrementResetVerifyAttempts: (...a: any[]) => mockIncrementResetVerifyAttempts(...a),
}));

vi.mock('@/lib/password-hash', () => ({
  hashPassword: (...a: any[]) => mockHashPassword(...a),
  comparePassword: (...a: any[]) => mockComparePassword(...a),
  checkPasswordHistory: (...a: any[]) => mockCheckPasswordHistory(...a),
}));

vi.mock('@/lib/hibp', () => ({
  checkPasswordBreached: (...a: any[]) => mockCheckPasswordBreached(...a),
}));

vi.mock('@/lib/session-manager', () => ({
  terminateAllUserSessions: (...a: any[]) => mockTerminateAllUserSessions(...a),
}));

vi.mock('@/lib/password-expiration-utils', () => ({
  resetPasswordExpiration: (...a: any[]) => mockResetPasswordExpiration(...a),
  calculatePasswordExpirationDate: () => new Date('2027-01-01'),
}));

const TOKEN_RECORD = { id: 't1', userId: 'u1', email: 'a@b.com', usedAt: null, attempts: 0, expiresAt: new Date(Date.now() + 60000) };
const ACTIVE_USER = {
  id: 'u1', username: 'alice', role: 'Admin', active: true, password: 'old-hash',
  passwordHistory: ['h1', 'h2'], isManuallyLocked: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveResetToken.mockResolvedValue({ ok: true, record: TOKEN_RECORD });
  mockConsumePasswordResetToken.mockResolvedValue({ ok: true });
  mockIncrementResetVerifyAttempts.mockResolvedValue({ allowed: true, remainingAttempts: 4 });
  mockUserFindUnique.mockResolvedValue(ACTIVE_USER);
  mockUserUpdate.mockResolvedValue({});
  mockHashPassword.mockResolvedValue('new-hash');
  mockComparePassword.mockResolvedValue(false);
  mockCheckPasswordHistory.mockResolvedValue(false);
  mockCheckPasswordBreached.mockResolvedValue({ isPwned: false });
  mockTerminateAllUserSessions.mockResolvedValue(3);
  mockResetPasswordExpiration.mockResolvedValue(undefined);
  mockLogAuditEvent.mockResolvedValue(undefined);
});

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/reset-password (Req 1.10)', () => {
  it('resets the password, clears standard flags, invalidates sessions, audits', async () => {
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(200);
    expect(mockConsumePasswordResetToken).toHaveBeenCalledWith('t1');
    expect(mockHashPassword).toHaveBeenCalledWith('StrongPass1!aa');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        password: 'new-hash',
        isTemporaryPassword: false,
        mustChangePassword: false,
        temporaryPasswordExpiry: null,
        failedLoginAttempts: 0,
        loginLockedUntil: null,
        lastPasswordChange: expect.any(Date),
      }),
    });
    // admin/security lockout NOT cleared
    const data = mockUserUpdate.mock.calls[0][0].data;
    expect('isManuallyLocked' in data).toBe(false);
    expect(mockTerminateAllUserSessions).toHaveBeenCalledWith('u1');
    expect(mockResetPasswordExpiration).toHaveBeenCalledWith('u1', 'Admin');
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent.mock.calls[0][0].eventType).toBe('PASSWORD_RESET');
    expect(mockLogAuditEvent.mock.calls[0][0].additionalData.via).toBe('self_service_token');
  });

  it('rejects an expired/used/not-found token with a generic 400 and does not consume', async () => {
    mockResolveResetToken.mockResolvedValue({ ok: false, reason: 'expired' });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(400);
    expect(mockConsumePasswordResetToken).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects a weak password with 400 and does NOT consume the token', async () => {
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'weak' }));
    expect(res.status).toBe(400);
    expect(mockIncrementResetVerifyAttempts).toHaveBeenCalledWith('t1');
    expect(mockConsumePasswordResetToken).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('rejects same-as-current password and does NOT consume the token', async () => {
    mockComparePassword.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(400);
    expect(mockConsumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects a pwned password (HIBP) and does NOT consume the token', async () => {
    mockCheckPasswordBreached.mockResolvedValue({ isPwned: true, count: 5 });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(400);
    expect(mockConsumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects a history-matching password and does NOT consume the token', async () => {
    mockCheckPasswordHistory.mockResolvedValue(true);
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(400);
    expect(mockConsumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('rejects when the user no longer exists or is inactive', async () => {
    mockUserFindUnique.mockResolvedValue({ ...ACTIVE_USER, active: false });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(400);
    expect(mockConsumePasswordResetToken).not.toHaveBeenCalled();
  });

  it('preserves isManuallyLocked across the reset (does not clear it)', async () => {
    mockUserFindUnique.mockResolvedValue({ ...ACTIVE_USER, isManuallyLocked: true });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(200);
    const data = mockUserUpdate.mock.calls[0][0].data;
    expect('isManuallyLocked' in data).toBe(false);
    expect('lockedBy' in data).toBe(false);
  });

  it('returns "already used" when the consume race is lost', async () => {
    mockConsumePasswordResetToken.mockResolvedValue({ ok: false, reason: 'already_used' });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(400);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('proceeds (fail-open) when HIBP is unreachable', async () => {
    mockCheckPasswordBreached.mockResolvedValue({ isPwned: false, error: true, errorReason: 'timeout' });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ token: 'raw', newPassword: 'StrongPass1!aa' }));
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalled();
  });
});
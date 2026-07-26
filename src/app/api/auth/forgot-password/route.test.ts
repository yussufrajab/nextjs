/**
 * Route tests for POST /api/auth/forgot-password (Req 1.10).
 * - Always returns the same generic success regardless of whether the
 *   identifier matches an active user with an email (no enumeration).
 * - Emails a reset link only when: user exists AND active AND has email.
 * - Applies a per-identifier sliding rate limit before the DB lookup.
 * - Records a PASSWORD_RESET_REQUESTED audit event (with or without userId).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockCheckRateLimitSliding = vi.fn();
const mockBuildUserRateLimitKey = vi.fn();
const mockUserFindFirst = vi.fn();
const mockCreatePasswordResetToken = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockLogAuditEvent = vi.fn();

vi.mock('@/lib/rate-limiter', () => ({
  withRateLimit: (handler: any) => handler,
  checkRateLimitSliding: (...a: any[]) => mockCheckRateLimitSliding(...a),
  buildUserRateLimitKey: (...a: any[]) => mockBuildUserRateLimitKey(...a),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findFirst: (...a: any[]) => mockUserFindFirst(...a) },
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
  createPasswordResetToken: (...a: any[]) => mockCreatePasswordResetToken(...a),
}));

vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: (...a: any[]) => mockSendPasswordResetEmail(...a),
}));

beforeEach(() => {
  mockCheckRateLimitSliding.mockReset();
  mockBuildUserRateLimitKey.mockReset();
  mockUserFindFirst.mockReset();
  mockCreatePasswordResetToken.mockReset();
  mockSendPasswordResetEmail.mockReset();
  mockLogAuditEvent.mockReset();
  mockCheckRateLimitSliding.mockResolvedValue({ allowed: true });
  mockBuildUserRateLimitKey.mockImplementation((u: string) => `rl:${u}`);
  mockCreatePasswordResetToken.mockResolvedValue({ token: 'raw-token', expiresAt: new Date() });
  mockSendPasswordResetEmail.mockResolvedValue({ success: true });
  mockLogAuditEvent.mockResolvedValue(undefined);
});

function buildRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/forgot-password (Req 1.10)', () => {
  it('returns generic success and skips email/audit-matched when no user matches', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ identifier: 'nobody' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toMatch(/reset link has been sent/i);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled();
    // audit still records the (unmatched) attempt
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent.mock.calls[0][0].additionalData).toEqual(
      expect.objectContaining({ identifier: 'nobody', matched: false })
    );
  });

  it('returns generic success and skips email when user has no email on file', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'u1', username: 'alice', email: null, name: 'Alice', active: true, role: 'Admin' });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ identifier: 'alice' }));
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns generic success and skips email when user is inactive', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'u1', username: 'alice', email: 'a@b.com', name: 'Alice', active: false, role: 'Admin' });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ identifier: 'alice' }));
    expect(res.status).toBe(200);
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('creates a token and sends the reset email for an active user with email', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'u1', username: 'alice', email: 'a@b.com', name: 'Alice', active: true, role: 'Admin' });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ identifier: 'a@b.com' }));
    expect(res.status).toBe(200);
    expect(mockCreatePasswordResetToken).toHaveBeenCalledWith('u1', 'a@b.com', '127.0.0.1', expect.any(String));
    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const arg = mockSendPasswordResetEmail.mock.calls[0][0];
    expect(arg.email).toBe('a@b.com');
    expect(arg.resetLink).toContain('/reset-password?token=raw-token');
    expect(mockLogAuditEvent.mock.calls[0][0].additionalData).toEqual(
      expect.objectContaining({ identifier: 'a@b.com' })
    );
    expect(mockLogAuditEvent.mock.calls[0][0].userId).toBe('u1');
  });

  it('returns 429 when the per-identifier sliding limit denies', async () => {
    mockCheckRateLimitSliding.mockResolvedValue({ allowed: false, reason: 'rate_limit_exceeded', retryAfter: 37 });
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ identifier: 'alice' }));
    expect(res.status).toBe(429);
    expect(mockUserFindFirst).not.toHaveBeenCalled();
  });

  it('still returns generic success when the email send fails', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'u1', username: 'alice', email: 'a@b.com', name: 'Alice', active: true, role: 'Admin' });
    mockSendPasswordResetEmail.mockRejectedValueOnce(new Error('smtp down'));
    const { POST } = await import('./route');
    const res = await POST(buildRequest({ identifier: 'alice' }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
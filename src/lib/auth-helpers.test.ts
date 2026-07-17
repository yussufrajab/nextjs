// Tests for completeLogin — the response builder consumed by the staff login,
// OTP-verify, and magic-link-verify routes to hydrate the client auth store.
//
// Regression guard for the bug where the post-login user object omitted
// `email`. The employee complaints page gates submission on `user.email` from
// the in-memory auth store (hydrated directly from this response on MFA
// verify), so an absent email blocked complaints even though the DB had one.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserUpdate = vi.fn();
const mockNotificationFindMany = vi.fn();
const mockCreateNotification = vi.fn();
const mockLogLoginAttempt = vi.fn();
const mockLogSuspiciousLoginSuccess = vi.fn();
const mockDetectSuspiciousLogin = vi.fn();
const mockGetLoginSummary = vi.fn();
const mockCleanupExpiredSessions = vi.fn();
const mockCheckSessionLimit = vi.fn();
const mockCreateSession = vi.fn();
const mockSignSessionToken = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: { update: (...a: any[]) => mockUserUpdate(...a) },
    notification: { findMany: (...a: any[]) => mockNotificationFindMany(...a) },
  },
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: (...a: any[]) => mockCreateNotification(...a),
  NotificationTemplates: { welcomeMessage: () => ({ message: 'hi', link: '/x' }) },
}));

vi.mock('@/lib/audit-logger', () => ({
  logLoginAttempt: (...a: any[]) => mockLogLoginAttempt(...a),
  logSuspiciousLoginSuccess: (...a: any[]) => mockLogSuspiciousLoginSuccess(...a),
  getClientIp: () => '127.0.0.1',
}));

vi.mock('@/lib/session-manager', () => ({
  createSession: (...a: any[]) => mockCreateSession(...a),
  checkSessionLimit: (...a: any[]) => mockCheckSessionLimit(...a),
  cleanupExpiredSessions: (...a: any[]) => mockCleanupExpiredSessions(...a),
  PRE_SESSION_COOKIE_NAME: 'pre-session',
  SESSION_COOKIE_NAME: 'session',
  getSessionCookieOptions: () => ({ httpOnly: true, path: '/' }),
  signSessionToken: (t: string) => `signed:${t}`,
}));

vi.mock('@/lib/suspicious-login-detector', () => ({
  detectSuspiciousLogin: (...a: any[]) => mockDetectSuspiciousLogin(...a),
  getLoginSummary: (...a: any[]) => mockGetLoginSummary(...a),
}));

vi.mock('@/lib/csrf-utils', () => ({
  generateCSRFToken: () => 'csrf-raw',
  signCSRFToken: (t: string) => `signed:${t}`,
  getCSRFCookieOptions: () => ({ httpOnly: false, path: '/' }),
  CSRF_COOKIE_NAME: 'csrf-token',
}));

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user_1',
    name: 'Asha Juma',
    username: 'ashaj',
    role: 'EMPLOYEE',
    active: true,
    employeeId: 'emp_1',
    institutionId: 'inst-1',
    isTemporaryPassword: false,
    mustChangePassword: false,
    failedLoginAttempts: 0,
    isManuallyLocked: false,
    email: 'asha@gov.go.tz',
    Institution: { name: 'Ministry' },
    Employee: { id: 'emp_1', email: 'asha@gov.go.tz' },
    ...overrides,
  };
}

describe('completeLogin — login response shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserUpdate.mockResolvedValue(undefined);
    mockNotificationFindMany.mockResolvedValue([{ id: 'n1' }]); // already has notifications
    mockLogLoginAttempt.mockResolvedValue(undefined);
    mockDetectSuspiciousLogin.mockResolvedValue({ isSuspicious: false, shouldNotify: false, reasons: [] });
    mockGetLoginSummary.mockReturnValue({ device: 'd', location: 'l', time: 't' });
    mockCleanupExpiredSessions.mockResolvedValue(undefined);
    mockCheckSessionLimit.mockResolvedValue({ isAtLimit: false });
    mockCreateSession.mockResolvedValue({ sessionToken: 'sess-tok' });
    mockSignSessionToken.mockReturnValue('signed:sess-tok');
  });

  it('includes email in the returned user object (regression: complaints gate)', async () => {
    const { completeLogin } = await import('./auth-helpers');
    const response = await completeLogin({
      user: makeUser({ email: 'asha@gov.go.tz' }),
      ipAddress: null,
      userAgent: null,
      deviceInfo: null,
    });

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe('asha@gov.go.tz');
  });

  it('propagates a null email when the user has none', async () => {
    const { completeLogin } = await import('./auth-helpers');
    const response = await completeLogin({
      user: makeUser({ email: null }),
      ipAddress: null,
      userAgent: null,
      deviceInfo: null,
    });

    const json = await response.json();
    expect(json.data.user.email).toBeNull();
  });
});
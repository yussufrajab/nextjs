/**
 * Unit tests for the suspicious login detector
 *
 * Verifies the 4 detection rules:
 *  1. New IP address
 *  2. New device / user agent
 *  3. Concurrent sessions from different IPs
 *  4. Rapid successive logins from different IPs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSessionFindMany = vi.fn();
const mockUserFindMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    session: { findMany: (...args: any[]) => mockSessionFindMany(...args) },
  },
}));

vi.mock('@/lib/logger', () => ({
  authLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('detectSuspiciousLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not-suspicious on first-ever login', async () => {
    mockSessionFindMany.mockResolvedValueOnce([]);
    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    expect(result.isSuspicious).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(result.shouldNotify).toBe(false);
  });

  it('flags new IP address', async () => {
    // 1st call: 30-day lookback (recent sessions)
    // 2nd call: active sessions lookup
    mockSessionFindMany
      .mockResolvedValueOnce([
        { ipAddress: '10.0.0.1', userAgent: 'OldAgent', deviceInfo: 'Windows PC', createdAt: new Date() },
      ])
      .mockResolvedValueOnce([]); // no active sessions

    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '203.0.113.99', // new IP
      userAgent: 'OldAgent',
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons.some((r) => r.includes('new IP'))).toBe(true);
  });

  it('flags new device type', async () => {
    mockSessionFindMany
      .mockResolvedValueOnce([
        { ipAddress: '10.0.0.1', userAgent: 'Mozilla/5.0 (Windows)', deviceInfo: 'Windows PC', createdAt: new Date() },
      ])
      .mockResolvedValueOnce([]);

    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '10.0.0.1',
      userAgent: 'Mozilla/5.0 (iPhone)', // new device type
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons.some((r) => r.includes('new device'))).toBe(true);
  });

  it('flags concurrent sessions from different IPs', async () => {
    const recentSessions = [
      { ipAddress: '10.0.0.1', userAgent: 'A', deviceInfo: 'Windows PC', createdAt: new Date() },
    ];
    const activeSessions = [
      { ipAddress: '10.0.0.1', userAgent: 'A' },
    ];
    mockSessionFindMany
      .mockResolvedValueOnce(recentSessions)
      .mockResolvedValueOnce(activeSessions);

    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '203.0.113.99',
      userAgent: 'A',
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons.some((r) => r.includes('Concurrent'))).toBe(true);
    expect(result.shouldNotify).toBe(true);
  });

  it('flags rapid login from different IP within 5 minutes', async () => {
    const twoSecondsAgo = new Date(Date.now() - 2000);
    mockSessionFindMany
      .mockResolvedValueOnce([
        { ipAddress: '10.0.0.1', userAgent: 'A', deviceInfo: 'X', createdAt: twoSecondsAgo },
      ])
      .mockResolvedValueOnce([]);

    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '203.0.113.99',
      userAgent: 'A',
    });
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons.some((r) => r.includes('Rapid'))).toBe(true);
  });

  it('returns not-suspicious for same IP and device', async () => {
    mockSessionFindMany
      .mockResolvedValueOnce([
        { ipAddress: '10.0.0.1', userAgent: 'A', deviceInfo: 'X', createdAt: new Date(Date.now() - 60000) },
      ])
      .mockResolvedValueOnce([{ ipAddress: '10.0.0.1', userAgent: 'A' }]);

    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '10.0.0.1',
      userAgent: 'A',
    });
    expect(result.isSuspicious).toBe(false);
  });

  it('fails safe on DB error (does not block login)', async () => {
    mockSessionFindMany.mockRejectedValueOnce(new Error('DB down'));
    const { detectSuspiciousLogin } = await import('./suspicious-login-detector');
    const result = await detectSuspiciousLogin({
      userId: 'u1',
      ipAddress: '1.2.3.4',
      userAgent: 'A',
    });
    expect(result.isSuspicious).toBe(false);
    expect(result.reasons).toEqual([]);
  });
});

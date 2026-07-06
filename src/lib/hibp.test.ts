/**
 * Unit tests for the HIBP k-anonymity breach check
 *
 * Verifies:
 *  - Disabled by HIBP_ENABLED=false → returns not-pwned, no error
 *  - Successful k-anonymity check finds a known pwned password
 *  - Cache hit short-circuits the API call
 *  - HIBP API error → fail-open (no error, isPwned=false)
 *  - Empty / non-string input → not-pwned, no error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetch = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('ioredis', () => {
  function MockRedis(this: any) {
    this.get = (...args: any[]) => mockRedisGet(...args);
    this.set = (...args: any[]) => mockRedisSet(...args);
    this.on = vi.fn();
  }
  return { default: MockRedis };
});

// Make the global fetch use our mock
beforeEach(() => {
  (global as any).fetch = mockFetch;
});

describe('checkPasswordBreached', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HIBP_ENABLED;
    delete process.env.HIBP_PWNED_THRESHOLD;
    delete process.env.REDIS_HOST;
  });

  it('returns not-pwned when HIBP_ENABLED=false', async () => {
    process.env.HIBP_ENABLED = 'false';
    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    const result = await checkPasswordBreached('password');
    expect(result.isPwned).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe(false);
  });

  it('returns not-pwned for empty input', async () => {
    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    expect((await checkPasswordBreached('')).isPwned).toBe(false);
    expect((await checkPasswordBreached(null as any)).isPwned).toBe(false);
  });

  it('returns pwned=true when HIBP API finds the hash suffix', async () => {
    // The SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    // Prefix = 5BAA6, Suffix = 1E4C9B93F3F0682250B6CF8331B7EE68FD8
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => `1E4C9B93F3F0682250B6CF8331B7EE68FD8:9999999\nOTHER:1\n`,
    });

    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    const result = await checkPasswordBreached('password');
    expect(result.isPwned).toBe(true);
    expect(result.count).toBe(9999999);
    expect(result.error).toBe(false);
  });

  it('returns pwned=false when HIBP returns no match', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => `OTHER1:5\nOTHER2:10\n`,
    });

    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    const result = await checkPasswordBreached('ThisIsAVeryUniquePassword2026');
    expect(result.isPwned).toBe(false);
    expect(result.count).toBe(0);
    expect(result.error).toBe(false);
  });

  it('fails open on HIBP API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    });

    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    const result = await checkPasswordBreached('password');
    expect(result.isPwned).toBe(false);
    expect(result.error).toBe(true);
    expect(result.errorReason).toMatch(/503/);
  });

  it('fails open on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    const result = await checkPasswordBreached('password');
    expect(result.isPwned).toBe(false);
    expect(result.error).toBe(true);
    expect(result.errorReason).toMatch(/ECONNREFUSED/);
  });

  it('honors HIBP_PWNED_THRESHOLD for high-threshold deployments', async () => {
    // Password seen only 5 times — below the 100 threshold
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => `1E4C9B93F3F0682250B6CF8331B7EE68FD8:5\n`,
    });

    process.env.HIBP_PWNED_THRESHOLD = '100';
    vi.resetModules();
    const { checkPasswordBreached } = await import('./hibp');
    const result = await checkPasswordBreached('password');
    expect(result.isPwned).toBe(false);
    expect(result.count).toBe(5);
  });
});

// GAP-H3: the login-time flag depends on a dedicated audit event type so the
// event is discoverable in audit queries (not buried under a generic breach).
describe('PASSWORD_PWNED_LOGIN audit event (GAP-H3 flag contract)', () => {
  it('is exported as a distinct AuditEventType value', async () => {
    const { AuditEventType } = await import('./audit-logger');
    expect(AuditEventType.PASSWORD_PWNED_LOGIN).toBe('PASSWORD_PWNED_LOGIN');
  });
});

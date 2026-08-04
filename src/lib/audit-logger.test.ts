/**
 * Unit tests for getClientIp — trusted-proxy validation
 *
 * Verifies that the function:
 * - Returns null when no upstream headers are set and no peer IP is found
 * - Returns null when x-forwarded-for is set but the request did NOT come
 *   from a trusted proxy (prevents header-spoofing bypasses)
 * - Honors x-forwarded-for when the request did come from a trusted proxy
 * - Walks the XFF chain to find the first non-trusted IP (real client)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function makeHeaders(entries: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(entries)) h.set(k, v);
  return h;
}

describe('getClientIp — trusted-proxy validation', () => {
  const ORIGINAL_TRUSTED = process.env.TRUSTED_PROXY_IPS;

  beforeEach(() => {
    // Reset module cache so that the module-level CIDR memoization
    // picks up the test's env var. Without this, the first import wins.
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIGINAL_TRUSTED === undefined) {
      delete process.env.TRUSTED_PROXY_IPS;
    } else {
      process.env.TRUSTED_PROXY_IPS = ORIGINAL_TRUSTED;
    }
  });

  it('returns null when no headers are set', async () => {
    delete process.env.TRUSTED_PROXY_IPS;
    const { getClientIp } = await import('./audit-logger');
    expect(getClientIp(makeHeaders({}))).toBeNull();
  });

  it('IGNORES x-forwarded-for when no trusted proxy is configured', async () => {
    process.env.TRUSTED_PROXY_IPS = '';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({ 'x-forwarded-for': '1.2.3.4' });
    // Without trusted-proxy validation, the spoofed XFF must NOT be returned
    expect(getClientIp(headers)).not.toBe('1.2.3.4');
  });

  it('returns x-real-ip as the peer when no trusted proxy is configured (safe default)', async () => {
    // x-real-ip from the platform (Vercel/Fly) IS the peer IP, not a
    // client-controlled header. Without trusted-proxy config, the function
    // returns it as the closest available signal of the real peer.
    // The critical case is x-forwarded-for (client-controlled) being ignored.
    process.env.TRUSTED_PROXY_IPS = '';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({ 'x-real-ip': '1.2.3.4' });
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('honors x-forwarded-for when peer IP is in TRUSTED_PROXY_IPS', async () => {
    process.env.TRUSTED_PROXY_IPS = '10.0.0.0/8';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({
      'x-real-ip': '10.0.0.5',            // trusted proxy
      'x-forwarded-for': '203.0.113.42', // real client
    });
    expect(getClientIp(headers)).toBe('203.0.113.42');
  });

  it('walks XFF chain to find first non-trusted IP', async () => {
    process.env.TRUSTED_PROXY_IPS = '10.0.0.0/8,192.168.0.0/16';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({
      'x-real-ip': '10.0.0.5',                       // trusted
      'x-forwarded-for': '192.168.1.1, 203.0.113.42', // trusted, real
    });
    expect(getClientIp(headers)).toBe('203.0.113.42');
  });

  it('returns first XFF entry when all chain entries are trusted', async () => {
    process.env.TRUSTED_PROXY_IPS = '10.0.0.0/8';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({
      'x-real-ip': '10.0.0.5',
      'x-forwarded-for': '10.0.0.6, 10.0.0.7',
    });
    // No untrusted IP found — return the first one as fallback
    expect(getClientIp(headers)).toBe('10.0.0.6');
  });

  it('handles malformed CIDR gracefully (does not throw)', async () => {
    process.env.TRUSTED_PROXY_IPS = 'not-a-cidr,10.0.0.0/8';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({
      'x-real-ip': '10.0.0.5',
      'x-forwarded-for': '203.0.113.42',
    });
    // Malformed CIDR is ignored; 10.0.0.0/8 still valid
    expect(getClientIp(headers)).toBe('203.0.113.42');
  });

  it('returns peer IP when no upstream headers are set', async () => {
    process.env.TRUSTED_PROXY_IPS = '10.0.0.0/8';
    const { getClientIp } = await import('./audit-logger');
    const headers = makeHeaders({ 'x-real-ip': '10.0.0.5' });
    expect(getClientIp(headers)).toBe('10.0.0.5');
  });
});

describe('AuditEventType — IP ban events', () => {
  it('exposes the five IP-ban event types', async () => {
    const { AuditEventType } = await import('./audit-logger');
    expect(AuditEventType.IP_BANNED).toBe('IP_BANNED');
    expect(AuditEventType.IP_BANNED_UPGRADED).toBe('IP_BANNED_UPGRADED');
    expect(AuditEventType.IP_AUTO_UNBANNED).toBe('IP_AUTO_UNBANNED');
    expect(AuditEventType.ADMIN_IP_BAN).toBe('ADMIN_IP_BAN');
    expect(AuditEventType.ADMIN_IP_UNBAN).toBe('ADMIN_IP_UNBAN');
  });
});

/**
 * Unit tests for the re-auth token module
 *
 * Covers:
 *  - issueReauthToken produces a parseable token
 *  - verifyReauthToken accepts a valid token for the right scope
 *  - verifyReauthToken rejects on scope mismatch
 *  - verifyReauthToken rejects on expiry
 *  - verifyReauthToken rejects on bad signature
 *  - verifyReauthToken rejects malformed input
 *  - tokens for one user cannot be used for another user (signature binds)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const ORIGINAL_SECRET = process.env.SESSION_SECRET;
beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-at-least-32-chars-long-1234567890';
});
afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = ORIGINAL_SECRET;
});

describe('reauth tokens', () => {
  describe('issueReauthToken / verifyReauthToken', () => {
    it('round-trips a valid token for the correct scope', async () => {
      const { issueReauthToken, verifyReauthToken } = await import('./reauth');
      const token = issueReauthToken('user-1', 'users.delete');
      const payload = verifyReauthToken(token, 'users.delete');
      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe('user-1');
      expect(payload?.scope).toBe('users.delete');
    });

    it('rejects when scope does not match', async () => {
      const { issueReauthToken, verifyReauthToken } = await import('./reauth');
      const token = issueReauthToken('user-1', 'users.delete');
      expect(verifyReauthToken(token, 'admin.reset-password')).toBeNull();
    });

    it('rejects when token is expired', async () => {
      const { issueReauthToken, verifyReauthToken } = await import('./reauth');
      // Issue with a 1ms TTL so it's immediately expired
      const token = issueReauthToken('user-1', 'users.delete', 1);
      // Wait a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(verifyReauthToken(token, 'users.delete')).toBeNull();
    });

    it('rejects malformed input', async () => {
      const { verifyReauthToken } = await import('./reauth');
      expect(verifyReauthToken(null, 'users.delete')).toBeNull();
      expect(verifyReauthToken(undefined, 'users.delete')).toBeNull();
      expect(verifyReauthToken('', 'users.delete')).toBeNull();
      expect(verifyReauthToken('only.two.parts', 'users.delete')).toBeNull();
      expect(verifyReauthToken('a.b.c.d', 'users.delete')).toBeNull();
      expect(verifyReauthToken('a.b.c.d.e.f', 'users.delete')).toBeNull();
    });

    it('rejects when signature is tampered', async () => {
      const { issueReauthToken, verifyReauthToken } = await import('./reauth');
      const token = issueReauthToken('user-1', 'users.delete');
      const parts = token.split(':');
      // Replace signature with garbage
      parts[4] = 'AAAA' + parts[4].substring(4);
      const tampered = parts.join(':');
      expect(verifyReauthToken(tampered, 'users.delete')).toBeNull();
    });

    it('rejects when userId is swapped in the token', async () => {
      const { issueReauthToken, verifyReauthToken } = await import('./reauth');
      const token = issueReauthToken('user-1', 'users.delete');
      const parts = token.split(':');
      parts[0] = 'user-2';
      // Keep original signature — must fail
      const tampered = parts.join(':');
      expect(verifyReauthToken(tampered, 'users.delete')).toBeNull();
    });
  });

  describe('getReauthCookieOptions', () => {
    it('sets httpOnly, sameSite=strict, secure in production', async () => {
      const { getReauthCookieOptions } = await import('./reauth');
      const opts = getReauthCookieOptions(true, 300);
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/');
      expect(opts.maxAge).toBe(300);
    });

    it('disables secure flag in development', async () => {
      const { getReauthCookieOptions } = await import('./reauth');
      const opts = getReauthCookieOptions(false, 300);
      expect(opts.secure).toBe(false);
    });
  });

  describe('REAUTH_TTL_MS', () => {
    it('is 5 minutes (300000 ms)', async () => {
      const { REAUTH_TTL_MS } = await import('./reauth');
      expect(REAUTH_TTL_MS).toBe(5 * 60 * 1000);
    });
  });
});

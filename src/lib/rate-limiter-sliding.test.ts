/**
 * Unit tests for the per-user sliding-window rate limit (Req 1.8):
 * `checkRateLimitSliding` and `buildUserRateLimitKey`.
 *
 * The sliding window is a Redis sorted set driven by a Lua script. We mock
 * ioredis and assert on the `eval` call's return shape — the script itself is
 * exercised against a live Redis in E2E; here we verify the JS contract:
 * allowed/denied branching, remaining/retryAfter mapping, and the
 * fail-closed/fail-open policy when Redis is unavailable or errors.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  evalFn: vi.fn(),
}));

// Mock ioredis. The constructor throws when FORCE_REDIS_FAIL=1 so we can
// exercise the null-client fail-closed path deterministically.
vi.mock('ioredis', () => {
  function MockRedis(this: any) {
    if (process.env.FORCE_REDIS_FAIL === '1') {
      throw new Error('connection refused');
    }
    this.eval = (...args: any[]) => mocks.evalFn(...args);
    this.on = vi.fn();
    this.quit = vi.fn();
  }
  return { default: MockRedis };
});

beforeEach(() => {
  mocks.evalFn.mockReset();
  delete process.env.FORCE_REDIS_FAIL;
});

afterEach(() => {
  delete process.env.FORCE_REDIS_FAIL;
});

// ---------------------------------------------------------------------------
// buildUserRateLimitKey — normalization
// ---------------------------------------------------------------------------

describe('buildUserRateLimitKey', () => {
  it('uses the documented ratelimit:user:<name>:auth shape', async () => {
    const { buildUserRateLimitKey } = await import('./rate-limiter');
    expect(buildUserRateLimitKey('alice')).toBe('ratelimit:user:alice:auth');
  });

  it('lowercases so case variations share a bucket', async () => {
    const { buildUserRateLimitKey } = await import('./rate-limiter');
    expect(buildUserRateLimitKey('Admin')).toBe('ratelimit:user:admin:auth');
    expect(buildUserRateLimitKey('ADMIN')).toBe(buildUserRateLimitKey('admin'));
  });

  it('trims surrounding whitespace', async () => {
    const { buildUserRateLimitKey } = await import('./rate-limiter');
    expect(buildUserRateLimitKey('  alice  ')).toBe('ratelimit:user:alice:auth');
  });

  it('lowercases the local + domain part of an email username', async () => {
    const { buildUserRateLimitKey } = await import('./rate-limiter');
    expect(buildUserRateLimitKey('Alice@Example.Go.Tz')).toBe(
      'ratelimit:user:alice@example.go.tz:auth'
    );
  });

  it('caps pathologically long usernames to keep keys bounded', async () => {
    const { buildUserRateLimitKey } = await import('./rate-limiter');
    const long = 'a'.repeat(500);
    const key = buildUserRateLimitKey(long);
    // `ratelimit:user:` + 256 + `:auth`
    expect(key.length).toBe('ratelimit:user:'.length + 256 + ':auth'.length);
  });

  it('collapses empty/whitespace input to a shared bucket (no existence leak)', async () => {
    const { buildUserRateLimitKey } = await import('./rate-limiter');
    expect(buildUserRateLimitKey('')).toBe('ratelimit:user::auth');
    expect(buildUserRateLimitKey('   ')).toBe('ratelimit:user::auth');
  });
});

// ---------------------------------------------------------------------------
// checkRateLimitSliding — happy path + denial
// ---------------------------------------------------------------------------

async function loadFresh() {
  vi.resetModules();
  return await import('./rate-limiter');
}

describe('checkRateLimitSliding — allowed/denied branching', () => {
  it('returns allowed=true with remaining from the script result', async () => {
    const { checkRateLimitSliding } = await loadFresh();
    // [allowed=1, limit=5, remaining=4, retryAfter=60]
    mocks.evalFn.mockResolvedValueOnce([1, 5, 4, 60]);

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'auth', {
      failClosed: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
    expect(result.retryAfter).toBe(60);
    expect(result.reason).toBeUndefined();
  });

  it('returns allowed=false with rate_limit_exceeded when the limit is hit', async () => {
    const { checkRateLimitSliding } = await loadFresh();
    // [allowed=0, limit=5, remaining=0, retryAfter=37]
    mocks.evalFn.mockResolvedValueOnce([0, 5, 0, 37]);

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'auth', {
      failClosed: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('rate_limit_exceeded');
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(37);
  });

  it('falls back to the configured windowSeconds when retryAfter is missing/0', async () => {
    const { checkRateLimitSliding } = await loadFresh();
    mocks.evalFn.mockResolvedValueOnce([0, 5, 0, 0]);

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'auth', {
      failClosed: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(60); // auth windowSeconds
  });
});

// ---------------------------------------------------------------------------
// checkRateLimitSliding — fail-closed / fail-open policy
// ---------------------------------------------------------------------------

describe('checkRateLimitSliding — fail-closed policy', () => {
  it('auth tier FAILS CLOSED (503 semantics) when Redis cannot be created', async () => {
    process.env.FORCE_REDIS_FAIL = '1';
    const { checkRateLimitSliding } = await loadFresh();

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'auth');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('fail_closed');
    expect(result.retryAfter).toBe(60);
  });

  it('non-auth tier FAILS OPEN when Redis cannot be created', async () => {
    process.env.FORCE_REDIS_FAIL = '1';
    const { checkRateLimitSliding } = await loadFresh();

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'read');

    expect(result.allowed).toBe(true);
  });

  it('auth tier can OPT IN to fail-open via failClosed=false when Redis is down', async () => {
    process.env.FORCE_REDIS_FAIL = '1';
    const { checkRateLimitSliding } = await loadFresh();

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'auth', {
      failClosed: false,
    });

    expect(result.allowed).toBe(true);
  });

  it('non-auth tier can OPT IN to fail-closed via failClosed=true when Redis is down', async () => {
    process.env.FORCE_REDIS_FAIL = '1';
    const { checkRateLimitSliding } = await loadFresh();

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'read', {
      failClosed: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('fail_closed');
  });

  it('auth tier FAILS CLOSED when Redis eval throws', async () => {
    const { checkRateLimitSliding } = await loadFresh();
    mocks.evalFn.mockRejectedValueOnce(new Error('redis eval boom'));

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'auth', {
      failClosed: true,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('fail_closed');
  });

  it('non-auth tier FAILS OPEN when Redis eval throws', async () => {
    const { checkRateLimitSliding } = await loadFresh();
    mocks.evalFn.mockRejectedValueOnce(new Error('redis eval boom'));

    const result = await checkRateLimitSliding('ratelimit:user:alice:auth', 'read');

    expect(result.allowed).toBe(true);
  });
});
/**
 * Unit tests for src/lib/rate-limiter.ts
 *
 * Tests getRateLimitConfig() for each rate-limit tier.
 */

import { describe, it, expect } from 'vitest';
import { getRateLimitConfig, RATE_LIMITS, RateLimitTier } from './rate-limiter';

// ---------------------------------------------------------------------------
// getRateLimitConfig
// ---------------------------------------------------------------------------

describe('getRateLimitConfig', () => {
  const tiers: RateLimitTier[] = ['auth', 'write', 'read', 'upload'];

  it.each(tiers)('returns correct config for tier "%s"', (tier) => {
    const config = getRateLimitConfig(tier);
    const expected = RATE_LIMITS[tier];

    expect(config.limit).toBe(expected.limit);
    expect(config.windowSeconds).toBe(expected.windowSeconds);
  });

  it('auth tier: limit 5, windowSeconds 60', () => {
    const config = getRateLimitConfig('auth');
    expect(config).toEqual({ limit: 5, windowSeconds: 60 });
  });

  it('write tier: limit 30, windowSeconds 60', () => {
    const config = getRateLimitConfig('write');
    expect(config).toEqual({ limit: 30, windowSeconds: 60 });
  });

  it('read tier: limit 100, windowSeconds 60', () => {
    const config = getRateLimitConfig('read');
    expect(config).toEqual({ limit: 100, windowSeconds: 60 });
  });

  it('upload tier: limit 10, windowSeconds 60', () => {
    const config = getRateLimitConfig('upload');
    expect(config).toEqual({ limit: 10, windowSeconds: 60 });
  });
});

// ---------------------------------------------------------------------------
// checkRateLimit — fail-closed policy for the auth tier
// ---------------------------------------------------------------------------

describe('checkRateLimit — fail-closed policy', () => {
  // Mock the ioredis client to simulate Redis being unavailable
  const mockIncr = vi.fn();
  const mockExpire = vi.fn();
  const mockTtl = vi.fn();

  vi.mock('ioredis', () => {
    function MockRedis(this: any) {
      this.incr = (...args: any[]) => mockIncr(...args);
      this.expire = (...args: any[]) => mockExpire(...args);
      this.ttl = (...args: any[]) => mockTtl(...args);
      this.on = vi.fn();
      this.quit = vi.fn();
    }
    return { default: MockRedis };
  });

  it('auth tier FAILS CLOSED when Redis client cannot be created (null)', async () => {
    // Force REDIS_HOST to a value that makes connection fail
    const origHost = process.env.REDIS_HOST;
    process.env.REDIS_HOST = 'this-host-does-not-exist.invalid';
    process.env.REDIS_PORT = '1';

    // Reset module cache so the lazy Redis client re-initializes
    vi.resetModules();
    const { checkRateLimit } = await import('./rate-limiter');

    const result = await checkRateLimit('test:key', 'auth');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(60);
    expect(result.reason).toBe('fail_closed');

    process.env.REDIS_HOST = origHost;
  });

  it('non-auth tier FAILS OPEN when Redis client cannot be created', async () => {
    const origHost = process.env.REDIS_HOST;
    process.env.REDIS_HOST = 'this-host-does-not-exist.invalid';
    process.env.REDIS_PORT = '1';

    vi.resetModules();
    const { checkRateLimit } = await import('./rate-limiter');

    const result = await checkRateLimit('test:key', 'read');
    expect(result.allowed).toBe(true);

    process.env.REDIS_HOST = origHost;
  });

  it('auth tier can OPT IN to fail-open via options.failClosed=false', async () => {
    const origHost = process.env.REDIS_HOST;
    process.env.REDIS_HOST = 'this-host-does-not-exist.invalid';
    process.env.REDIS_PORT = '1';

    vi.resetModules();
    const { checkRateLimit } = await import('./rate-limiter');

    const result = await checkRateLimit('test:key', 'auth', { failClosed: false });
    expect(result.allowed).toBe(true);

    process.env.REDIS_HOST = origHost;
  });

  it('non-auth tier can OPT IN to fail-closed via options.failClosed=true', async () => {
    const origHost = process.env.REDIS_HOST;
    process.env.REDIS_HOST = 'this-host-does-not-exist.invalid';
    process.env.REDIS_PORT = '1';

    vi.resetModules();
    const { checkRateLimit } = await import('./rate-limiter');

    const result = await checkRateLimit('test:key', 'read', { failClosed: true });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBe('fail_closed');

    process.env.REDIS_HOST = origHost;
  });
});
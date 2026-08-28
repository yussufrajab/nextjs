/**
 * Rate limiter → IP ban wiring: an auth-tier 429 calls recordRateLimitHit;
 * a non-auth tier 429 does not.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/ip-ban-utils', () => ({
  recordRateLimitHit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/audit-logger', () => ({ getClientIp: () => '203.0.113.9' }));
vi.mock('@/lib/logger', () => ({ rateLimitLogger: { warn: vi.fn(), error: vi.fn() } }));

// Mock ioredis so checkRateLimit returns a real 429.
const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockTtl = vi.fn();
vi.mock('ioredis', () => {
  function MockRedis(this: any) {
    this.incr = (...a: any[]) => mockIncr(...a);
    this.expire = (...a: any[]) => mockExpire(...a);
    this.ttl = (...a: any[]) => mockTtl(...a);
    this.on = vi.fn();
    this.quit = vi.fn();
  }
  return { default: MockRedis };
});

import { withRateLimit } from './rate-limiter';
import { recordRateLimitHit } from '@/lib/ip-ban-utils';

describe('withRateLimit → recordRateLimitHit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIncr.mockResolvedValue(99); // over any limit → 429
    mockExpire.mockResolvedValue(1);
    mockTtl.mockResolvedValue(60);
  });

  it('auth-tier 429 calls recordRateLimitHit', async () => {
    const handler = vi.fn();
    const wrapped = withRateLimit(handler, 'auth');
    const res = await wrapped(new Request('http://localhost/x'));
    expect(res.status).toBe(429);
    expect(recordRateLimitHit).toHaveBeenCalledTimes(1);
    expect(recordRateLimitHit).toHaveBeenCalledWith('203.0.113.9');
  });

  it('write-tier 429 does NOT call recordRateLimitHit', async () => {
    const handler = vi.fn();
    const wrapped = withRateLimit(handler, 'write');
    const res = await wrapped(new Request('http://localhost/x'));
    expect(res.status).toBe(429);
    expect(recordRateLimitHit).not.toHaveBeenCalled();
  });
});
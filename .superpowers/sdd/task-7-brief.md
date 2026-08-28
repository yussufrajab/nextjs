## Task 7: Wire `recordRateLimitHit` into the rate limiter

**Files:**
- Modify: `src/lib/rate-limiter.ts` (the `withRateLimit` denial branch, ~line 364)
- Create: `src/lib/rate-limiter.ip-ban.test.ts`

**Interfaces:**
- Consumes: `recordRateLimitHit` from `@/lib/ip-ban-utils` (dynamic import, cold path only).
- Produces: an auth-tier 429 also feeds the per-IP rate-limit-hit counter.

- [ ] **Step 1: Write the failing test**

Create `src/lib/rate-limiter.ip-ban.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/rate-limiter.ip-ban.test.ts`
Expected: FAIL — `recordRateLimitHit` not called on auth 429.

- [ ] **Step 3: Wire the call into `withRateLimit`**

In `src/lib/rate-limiter.ts`, inside `withRateLimit` (the `if (!result.allowed) {` block, ~line 364), **before** the `return NextResponse.json(...)` (the 429 return, ~line 374), add:

```typescript
    if (!result.allowed) {
      // Feed the per-IP rate-limit-hit counter on auth-tier 429s. A sustained
      // flood of auth 429s auto-bans the source IP (see ip-ban-utils.ts).
      // Dynamic import avoids a load-order cycle with Prisma `db` + the audit
      // pool, and only runs on the cold deny path.
      if (result.reason === 'rate_limit_exceeded' && tier === 'auth') {
        try {
          const { recordRateLimitHit } = await import('@/lib/ip-ban-utils');
          await recordRateLimitHit(ip);
        } catch (err) {
          rateLimitLogger.warn({ err, ip }, 'ip-ban: recordRateLimitHit failed – fail-open');
        }
      }

      // Differentiate "you sent too many" (429) from "Redis is down" (503).
      const isFailClosedDenial = result.reason === 'fail_closed';
```

(Insert the `if (...) { ... }` block immediately after the existing `if (!result.allowed) {` opening line and before the existing `// Differentiate ...` comment line, so the rest of the denial block is unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/rate-limiter.ip-ban.test.ts`
Expected: PASS.

- [ ] **Step 5: Run existing rate-limiter tests to check for regressions**

Run: `npx vitest run src/lib/rate-limiter.test.ts`
Expected: PASS (the existing `getRateLimitConfig` + fail-closed tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limiter.ts src/lib/rate-limiter.ip-ban.test.ts
git commit -m "feat(security): feed auth-tier 429s into the IP ban counter"
```

---


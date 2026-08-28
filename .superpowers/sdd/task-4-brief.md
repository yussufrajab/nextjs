## Task 4: `ip-ban-utils.ts` — Redis counters + `recordFailedLoginFromIp` + `recordRateLimitHit`

**Files:**
- Modify: `src/lib/ip-ban-utils.ts` (append Redis + counter functions)
- Modify: `src/lib/ip-ban-utils.test.ts` (append counter tests)

**Interfaces:**
- Consumes: `ioredis` (Redis client), `isIpBanned` + `isTrustedIp` from Task 3, `banIp` from Task 5 (forward reference — see note).
- Produces:
  - `recordFailedLoginFromIp(ip: string, context?: Record<string, any>): Promise<void>`
  - `recordRateLimitHit(ip: string): Promise<void>`

> **Forward reference note:** `recordFailedLoginFromIp`/`recordRateLimitHit` call `banIp(ip, reason)` when the counter crosses the threshold. `banIp` is added in Task 5. The counter functions are written here but only fully testable once `banIp` exists. The tests in this task mock `banIp` indirectly by mocking the audit logger + db, and assert the counter/audit calls; full end-to-end threshold→ban is verified in Task 5's tests. To avoid a circular import, define `banIp` as a function declaration that is assigned in Task 5 (function declarations are hoisted, so calling `banIp(...)` here before its body is defined in Task 5 is fine within the same module).

- [ ] **Step 1: Write the failing tests for counters**

Append to `src/lib/ip-ban-utils.test.ts` (after the imports, add an `ioredis` mock + new `describe` blocks). Add this near the top, after the `vi.mock('@/lib/audit-logger', ...)` block:

```typescript
// Mock ioredis — each test sets the return values via mockFns.
const mockEval = vi.fn();
const mockDel = vi.fn();
vi.mock('ioredis', () => {
  function MockRedis(this: any) {
    this.eval = (...args: any[]) => mockEval(...args);
    this.del = (...args: any[]) => mockDel(...args);
    this.on = vi.fn();
    this.quit = vi.fn();
  }
  return { default: MockRedis };
});

import { recordFailedLoginFromIp, recordRateLimitHit, isTrustedIp } from './ip-ban-utils';
import { db } from '@/lib/db';
```

Then append these suites at the end of the file:

```typescript
describe('isTrustedIp', () => {
  const orig = process.env.TRUSTED_IPS;
  afterEach(() => { process.env.TRUSTED_IPS = orig; });

  it('returns true for a listed IP', () => {
    process.env.TRUSTED_IPS = '10.0.0.1, 10.0.0.2';
    expect(isTrustedIp('10.0.0.1')).toBe(true);
  });
  it('returns false for an unlisted IP', () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    expect(isTrustedIp('203.0.113.9')).toBe(false);
  });
  it('returns false for unknown/null', () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    expect(isTrustedIp('unknown')).toBe(false);
    expect(isTrustedIp(null)).toBe(false);
  });
});

describe('recordFailedLoginFromIp — counter + threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.ipBan.findUnique as any).mockResolvedValue(null); // not currently banned
  });

  it('does nothing for a trusted IP', async () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    await recordFailedLoginFromIp('10.0.0.1');
    expect(mockEval).not.toHaveBeenCalled();
  });

  it('increments the Redis counter but does NOT ban below threshold', async () => {
    mockEval.mockResolvedValue(3); // ZCARD after ZADD → 3, below default 10
    await recordFailedLoginFromIp('203.0.113.9');
    expect(mockEval).toHaveBeenCalledTimes(1);
    expect(db.ipBan.upsert).not.toHaveBeenCalled();
  });

  it('calls banIp when the counter reaches the threshold', async () => {
    mockEval.mockResolvedValue(10); // reaches default threshold 10
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9', banCount: 1 });
    await recordFailedLoginFromIp('203.0.113.9');
    expect(db.ipBan.upsert).toHaveBeenCalledTimes(1);
  });

  it('fails open (no throw) when Redis is unavailable', async () => {
    mockEval.mockRejectedValue(new Error('redis down'));
    await expect(recordFailedLoginFromIp('203.0.113.9')).resolves.toBeUndefined();
    expect(db.ipBan.upsert).not.toHaveBeenCalled();
  });

  it('does not count while the IP is already actively banned', async () => {
    (db.ipBan.findUnique as any).mockResolvedValue({
      ipAddress: '203.0.113.9', isActive: true, banType: 'security', bannedUntil: null,
    });
    await recordFailedLoginFromIp('203.0.113.9');
    expect(mockEval).not.toHaveBeenCalled();
  });
});

describe('recordRateLimitHit — counter + threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.ipBan.findUnique as any).mockResolvedValue(null);
  });

  it('calls banIp after the configured number of auth 429s', async () => {
    mockEval.mockResolvedValue(3); // reaches default threshold 3
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9', banCount: 1 });
    await recordRateLimitHit('203.0.113.9');
    expect(db.ipBan.upsert).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a trusted IP', async () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    await recordRateLimitHit('10.0.0.1');
    expect(mockEval).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ip-ban-utils.test.ts`
Expected: FAIL — `recordFailedLoginFromIp` / `recordRateLimitHit` not exported.

- [ ] **Step 3: Add the Redis client + counter implementation**

Append to `src/lib/ip-ban-utils.ts`:

```typescript
// ---------------------------------------------------------------------------
// Redis client (ephemeral per-IP abuse counters)
// ---------------------------------------------------------------------------

import Redis from 'ioredis';

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // fail fast — counters fail open
      lazyConnect: true,
      connectTimeout: 2000,
    });
    redisClient.on('error', (err) => {
      ipBanLogger.warn({ err: err.message || err }, 'ip-ban Redis error');
    });
  } catch (err) {
    ipBanLogger.warn({ err }, 'Failed to create ip-ban Redis client');
    redisClient = null;
  }
  return redisClient;
}

/**
 * Atomic sliding-window counter: trims members older than the window, adds the
 * current timestamp, refreshes the TTL, and returns the surviving count.
 * Mirrors the ZSET pattern in rate-limiter.ts (SLIDING_WINDOW_SCRIPT) but
 * returns the count instead of a allow/deny decision.
 */
const IP_COUNTER_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])
local member = ARGV[3]
local cutoff = now - windowSeconds * 1000
redis.call('ZREMRANGEBYSCORE', key, '-inf', '(' .. cutoff)
redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, windowSeconds)
return redis.call('ZCARD', key)
`;

/**
 * Increment the per-IP sliding-window counter and return the new count.
 * Returns null when Redis is unavailable or errors (caller fails open).
 */
async function incrementIpCounter(ip: string, keyPrefix: string): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;
  const now = Date.now();
  const member = `${now}:${Math.random().toString(36).slice(2)}`;
  try {
    const count = (await client.eval(
      IP_COUNTER_SCRIPT,
      1,
      `${keyPrefix}:${ip}`,
      now,
      IP_BAN_WINDOW_SECONDS,
      member
    )) as number;
    return Number(count);
  } catch (err) {
    ipBanLogger.warn({ err, keyPrefix, ip }, 'ip-ban Redis counter error – fail-open');
    return null;
  }
}

async function clearIpCounters(ip: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(`ipban:failedlogins:${ip}`, `ipban:limithits:${ip}`);
  } catch {
    // best-effort — counters age out via TTL anyway
  }
}

// ---------------------------------------------------------------------------
// Counter-driven ban triggers
// ---------------------------------------------------------------------------

// `banIp` is defined as a function declaration so it is hoisted; its body is
// assigned in Task 5. Calling it here before Task 5 is applied is safe within
// the same module.
declare const banIp: (ip: string, reason: IpBanReason, context?: Record<string, any>) => Promise<void>;

export async function recordFailedLoginFromIp(
  ip: string,
  context?: Record<string, any>
): Promise<void> {
  if (isTrustedIp(ip)) return;
  if (await isIpBanned(ip)) return; // don't count while already actively banned
  const count = await incrementIpCounter(ip, 'ipban:failedlogins');
  if (count === null) return; // Redis down — fail open
  if (count >= IP_FAILED_LOGIN_BAN_THRESHOLD) {
    await banIp(ip, IpBanReason.FAILED_LOGINS, { count, ...context });
  }
}

export async function recordRateLimitHit(ip: string): Promise<void> {
  if (isTrustedIp(ip)) return;
  if (await isIpBanned(ip)) return;
  const count = await incrementIpCounter(ip, 'ipban:limithits');
  if (count === null) return;
  if (count >= IP_RATELIMIT_HIT_BAN_THRESHOLD) {
    await banIp(ip, IpBanReason.RATE_LIMIT, { count });
  }
}
```

> **Note on `declare const banIp`:** This tells TypeScript the symbol exists at runtime without a value yet. In Task 5, replace this `declare` line with the real `export async function banIp(...)` (or a `const banIp = async ...`). Function declarations hoist, so the calls in `recordFailedLoginFromIp` resolve correctly once Task 5 lands. The tests in this task mock `db.ipBan.upsert` (which `banIp` calls), so the threshold→ban assertion passes even before `banIp`'s real body is written, because `recordFailedLoginFromIp` will call the hoisted `banIp` — and until Task 5, `banIp` is `undefined` and the call throws. **Therefore:** if you run this task's tests before Task 5, the "calls banIp when the counter reaches the threshold" test will FAIL with `banIp is not a function`. That is expected — apply Task 5 to make it pass. Re-order Tasks 4 and 5 if you prefer green tests at every step (see Task 5 note).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/ip-ban-utils.test.ts`
Expected: the `isTrustedIp`, `recordFailedLoginFromIp — does nothing for a trusted IP`, `... below threshold`, `... fails open when Redis is unavailable`, `... does not count while already banned`, and `recordRateLimitHit — does nothing for a trusted IP` tests PASS. The two "calls banIp at threshold" tests FAIL until Task 5. Proceed to Task 5.

- [ ] **Step 5: Commit (counters + triggers; threshold tests will go green after Task 5)**

```bash
git add src/lib/ip-ban-utils.ts src/lib/ip-ban-utils.test.ts
git commit -m "feat(security): ip-ban Redis counters + threshold triggers"
```

---


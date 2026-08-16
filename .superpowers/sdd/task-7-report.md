# Task 7 Report — Wire `recordRateLimitHit` into the rate limiter

## TDD Evidence

### RED (before insertion)
`npx vitest run src/lib/rate-limiter.ip-ban.test.ts`:
- auth-tier 429 calls recordRateLimitHit — **FAIL**: `expected "vi.fn()" to be called 1 times, but got 0 times`
- write-tier 429 does NOT call recordRateLimitHit — PASS (trivially; assertion meaningful since res.status === 429)

### GREEN (after insertion)
- auth-tier 429 calls recordRateLimitHit — **PASS** (called 1× with `203.0.113.9`)
- write-tier 429 does NOT call recordRateLimitHit — **PASS** (`not.toHaveBeenCalled`, status 429)
- 2/2 passed.

## Exact Insertion Point

In `src/lib/rate-limiter.ts`, inside `withRateLimit`, the block was inserted immediately after the opening line `if (!result.allowed) {` and immediately before the comment line `// Differentiate "you sent too many" (429) from "Redis is down" (503).`. Surrounding context after insertion:

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
      // The `reason` field set by checkRateLimit is the authoritative signal.
      const isFailClosedDenial = result.reason === 'fail_closed';
```

## Regression + Typecheck

- `npx vitest run src/lib/rate-limiter.test.ts` — 12/12 passed, no regressions.
- `npm run typecheck` — clean (no output, exit 0).

## Files Changed + Commit

- `src/lib/rate-limiter.ts` (modified: deny-block wiring)
- `src/lib/rate-limiter.ip-ban.test.ts` (created)

Commit: `feat(security): feed auth-tier 429s into the IP ban counter`

## Self-Review

- Block at the right boundary: deny path (`if (!result.allowed) {`), auth tier only (`tier === 'auth'` && `reason === 'rate_limit_exceeded'`). Yes.
- Both tests green for the right reasons: auth-tier test asserts called 1× with the IP; write-tier test asserts a genuine 429 (status checked == 429) AND not called. Yes — the write-tier assertion is meaningful (mockIncr=99 > write limit 30 → real 429 path).
- Existing `rate-limiter.test.ts` unaffected (12/12).
- Typecheck clean.
- Commit stages only the two intended files.
- Fail-open semantics: a thrown error in `recordRateLimitHit` is caught and logged via `rateLimitLogger.warn`; the 429 response still proceeds. This is fail-open by design (rate-limit deny still happens; only the ban counter is best-effort).
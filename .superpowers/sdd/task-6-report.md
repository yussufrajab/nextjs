# Task 6 Report — Wire the login route: `isIpBanned` gate + `recordFailedLoginFromIp`

## Status: DONE

## Insertion points (by structure, not stale line numbers)

The login route `src/app/api/auth/login/route.ts` was read in full first. Actual structure:

- **Gate**: inserted AFTER the pre-session token setup (`preSessionToken` / `preSessionCookieOptions`, ~line 44) and BEFORE the per-user sliding rate-limit block (`const perUserKey = buildUserRateLimitKey(username)`). The brief said "after deviceInfo, before per-user block" — confirmed correct. The pre-session setup must precede the gate because the 403 response sets the `PRE_SESSION_COOKIE_NAME` cookie using `preSessionToken` / `preSessionCookieOptions`.
- **Counter feed #1 — "User not found"**: in the `if (!user) {` branch, AFTER `await logLoginAttempt({...failureReason: 'User not found'})` and BEFORE `const response = NextResponse.json(...)`.
- **Counter feed #2 — "Account locked"**: in the `if (isAccountLocked(currentUser)) {` branch, AFTER `const lockoutResult = await incrementFailedLoginAttempts(...)` and BEFORE `await logLoginAttempt({...failureReason: 'Account locked ...'})`.
- **Counter feed #3 — "Invalid password"**: in the `if (!isPasswordValid) {` branch, AFTER `const lockoutResult = await incrementFailedLoginAttempts(...)` and BEFORE `await logLoginAttempt({...failureReason: 'Invalid password'})`.

The password-expired / temporary-password-expired branches were correctly LEFT ALONE (policy blocks, not credential failures).

## Route identifiers — no adaptation needed

All in-scope identifiers the brief named exist exactly as expected at the insertion point: `preSessionToken`, `preSessionCookieOptions`, `PRE_SESSION_COOKIE_NAME`, `NextResponse`, `ipAddress`. No renaming was required.

The gate uses a dynamic `await import('@/lib/ip-ban-utils')` to pull `isIpBanned` (aliased `checkIpBanned`), `getIpBanStatus`, `recordFailedLoginFromIp`, `autoUnbanExpiredIps`. Because the dynamic import is in scope for the rest of the handler, the three counter feeds reuse the same `recordFailedLoginFromIp` binding.

## Extra `vi.mock` added

The new test (`ip-ban.test.ts`) mocks every module the route imports at module-eval time. The brief's mock list was complete for the route's top-level imports; no extra mocks were needed for the new test file.

For the EXISTING `src/app/api/auth/login/route.test.ts`, a new `vi.mock('@/lib/ip-ban-utils', ...)` had to be ADDED — the gate now runs `autoUnbanExpiredIps()` + `isIpBanned()` before the per-user rate limit, and without a mock the real `autoUnbanExpiredIps` hits `db.ipBan.updateMany`, which that test's `@/lib/db` mock does not provide (`TypeError: Cannot read properties of undefined (reading 'updateMany')`).

## beforeEach mock re-establish fix (vitest 4.0.16 trap)

Confirmed the trap is real. `vi.clearAllMocks()` (and even per-mock `mockReset()`) drops `mockResolvedValue` implementations, and the route's `await recordFailedLoginFromIp(ipAddress).catch(() => {})` throws `TypeError: Cannot read properties of undefined (reading 'catch')` when the mock returns `undefined` instead of a Promise. This manifested in BOTH test files.

Fix applied in `ip-ban.test.ts` `beforeEach` — after `vi.clearAllMocks()`, re-establish:
```ts
(recordFailedLoginFromIp as any).mockResolvedValue(undefined);
(autoUnbanExpiredIps as any).mockResolvedValue(0);
(logLoginAttempt as any).mockResolvedValue(undefined);
(checkRateLimitSliding as any).mockResolvedValue({ allowed: true });
(validateCSRF as any).mockResolvedValue({ valid: true, response: null });
```
`validateCSRF` had to be re-established too (its `mockResolvedValue` was also reset, causing `Cannot read properties of undefined (reading 'valid')`).

Fix applied in `route.test.ts` `beforeEach` — re-establish `recordFailedLoginFromIp`, `autoUnbanExpiredIps`, `isIpBanned` resolved values.

## Supporting change: ip-ban-utils signature widening

`npm run typecheck` reported `Argument of type 'string | null' is not assignable to parameter of type 'string'` for `isIpBanned(ipAddress)`, `getIpBanStatus(ipAddress)`, and the three `recordFailedLoginFromIp(ipAddress)` calls — `getClientIp` returns `string | null`.

The ip-ban-utils functions already handle null/empty internally (`getIpBan`: `if (!ip || ip === 'unknown') return null;`; `isTrustedIp` already accepts `string | null | undefined`). To match reality and keep the route's gate code matching the brief verbatim, I widened the public signatures in `src/lib/ip-ban-utils.ts`:
- `getIpBan(ip: string | null)`
- `isIpBanned(ip: string | null)`
- `getIpBanStatus(ip: string | null)`
- `recordFailedLoginFromIp(ip: string | null, ...)` — added `if (!ip || isTrustedIp(ip)) return;` guard (was `if (isTrustedIp(ip)) return;`)
- `recordRateLimitHit(ip: string | null)` — added `if (!ip || isTrustedIp(ip)) return;` guard (consistency)

This is a minimal, behavior-preserving change (null was already handled by `isTrustedIp`/`getIpBan`; the new `!ip` short-circuit just makes the null path explicit and avoids passing null to `incrementIpCounter(ip: string)`). This change is outside the two named task files but was necessary for a clean typecheck.

## TDD Evidence

### RED (real behavioral failure, not load error)
After fixing the missing `validateCSRF` mock-reset, the banned-IP test failed with a real behavioral assertion:
```
× returns 403 IP_BLOCKED when the IP is banned, before any DB lookup
  AssertionError: expected 401 to be 403
  + Received: 401   (User not found — gate not yet wired)
✓ does not 403 when the IP is not banned
Tests: 1 failed | 1 passed
```

### GREEN
After wiring the gate + three counter feeds:
```
✓ returns 403 IP_BLOCKED when the IP is banned, before any DB lookup
✓ does not 403 when the IP is not banned
Tests: 2 passed
```

### Right-reason verification
Temporarily tightened the "not banned" assertion to `expect(res.status).toBe(401)` — passed, confirming the not-banned path returns a real 401 (User not found), NOT a masked 500 from a thrown `.catch`. Reverted to the brief's `not.toBe(403)` assertion.

## Regression check
`npx vitest run src/app/api/auth/ src/lib/account-lockout-utils.test.ts`:
```
Test Files  9 passed (9)
Tests       85 passed (85)
```
No regressions (required adding the `@/lib/ip-ban-utils` mock + beforeEach re-establish to the existing `route.test.ts`).

## typecheck
`npm run typecheck`: clean (after ip-ban-utils signature widening).

## Files changed + commit
- `src/app/api/auth/login/route.ts` — gate + 3 counter feeds
- `src/app/api/auth/login/ip-ban.test.ts` — new test (created)
- `src/app/api/auth/login/route.test.ts` — added `@/lib/ip-ban-utils` mock + beforeEach re-establish (regression fix)
- `src/lib/ip-ban-utils.ts` — widened 5 sigs to `string | null` + null guards (typecheck fix)

Commit: `feat(security): block banned IPs at login + feed failed-login counter`

## Self-review findings / concerns
- Gate + exactly three counter feeds in the right branches; password-expired branches untouched. ✓
- "not banned" passes for the right reason (401, verified). ✓
- No regressions; typecheck clean. ✓
- Concern (minor, expected): the commit stages 4 files, not the 2 the brief named — because the gate's `autoUnbanExpiredIps` call broke `route.test.ts` (no ip-ban mock) and `getClientIp`'s `string | null` return forced ip-ban-utils signature widening for typecheck. Both are necessary, minimal, behavior-preserving supporting changes. Reported rather than skipped.
- The dynamic `await import('@/lib/ip-ban-utils')` inside the handler is matched by `vi.mock('@/lib/ip-ban-utils', ...)` (hoisted) — the dynamic import resolves to the mocked module, so the gate and the test assertions share the same mock instances. ✓
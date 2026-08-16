# Task 8 Report — Admin routes `ban-ip` + `unban-ip`

## `withAuth` mock fix (and why it was necessary)

The real `withAuth` (in `src/lib/api-auth.ts`) wraps a handler and injects `{ auth }`
as the **second** argument: `return handler(request, { auth: authResult.context! })`.
Route handlers are written as `(request, { auth }) => {...}`.

The brief's test mock was:
```typescript
withAuth: vi.fn((h: any) => h),   // pass-through — returns the raw handler
```
With this mock, `POST(req)` invokes `h(req)` with **no** second argument, so
`const { auth } = undefined` throws a `TypeError` destructuring error — every test
fails with a meaningless error, and GREEN never works.

Fixed to inject an auth context as the second arg:
```typescript
withAuth: vi.fn((h: any) => async (req: any) =>
  h(req, { auth: { userId: 'admin-1', username: 'admin', role: 'Admin' } })),
```
`requireReauth: vi.fn(() => null)` kept (no step-up denial), so `banIpManually`
is reached and called with `('203.0.113.9', 'admin-1', 'credential stuffing', undefined)`,
matching `expect.any(String)` for the admin id.

## Additional mock fix required by vitest v4.0.16

During GREEN I discovered a second mock-layer issue. The brief's mocks used
`vi.fn().mockResolvedValue(...)` for `validateCSRF`, `banIpManually`, `unbanIp`,
and `isIpBanned`. In vitest v4.0.16, `vi.clearAllMocks()` **wipes `mockResolvedValue`**
(it resets the mock to return `undefined`). Because `test/setup.ts` runs
`vi.clearAllMocks()` in a global `afterEach` and the test runs it in `beforeEach`,
the `validateCSRF` mock returned `undefined` on the very first test, causing
`csrfCheck.valid` to throw `Cannot read properties of undefined (reading 'valid')`.

I verified with a minimal scratch test that `mockResolvedValue` does NOT survive
`clearAllMocks` in v4.0.16, while an **inline async implementation**
(`vi.fn(async () => ({ valid: true }))`) DOES survive. I therefore changed the
mock factories to inline async implementations:
```typescript
banIpManually: vi.fn(async () => undefined),
unbanIp: vi.fn(async () => undefined),
isIpBanned: vi.fn(async () => false),
...
validateCSRF: vi.fn(async () => ({ valid: true })),
```
This is a test-only change; the route code is unchanged from the brief. The
`banIpManually`/`unbanIp` mocks don't strictly need this (the route `await`s a
value that isn't read), but I made them consistent and resilient.

## Deviations from the brief's route code to match lock-account's pattern

I compared `src/app/api/admin/lock-account/route.ts` against the brief and matched
lock-account's conventions. The brief's route code already matched lock-account on
all the load-bearing points:
- `requireReauth(request, 'admin.ban-ip'|'admin.unban-ip', auth)` — step-up call
  shape matches lock-account's `requireReauth(request, 'admin.lock-account', auth)`.
- `withAuth(handler, { allowedRoles: ['Admin'] })` — matches.
- `withRateLimit(..., 'write')` tier — matches lock-account's `'write'`.
- `wrapHandler(..., 'admin-ban-ip'|'admin-unban-ip')` — matches lock-account's
  `wrapHandler(..., 'admin-lock-account')` naming style.
- Import paths (`@/lib/api-auth`, `@/lib/rate-limiter`, `@/lib/error-handler`,
  `@/lib/api-csrf-middleware`, `@/lib/audit-logger`, `@/lib/logger`) all match.

Deviations actually made (both explicitly called out in the task instructions):

1. **Unused-var fix (ban-ip):** the brief's route declared
   `const clientIp = getClientIp(request.headers);` but never used `clientIp`.
   lock-account uses `getClientIp` inside `logAccountAction`. Since the ban-ip
   route has no `logAccountAction` call, I used `clientIp` in the `logger.info`
   line instead: `IP ${ipAddress} banned by admin ${auth.username} from ${clientIp}`.
   This keeps the `getClientIp` import used and `typecheck` clean.

2. **Unused import removed (unban-ip):** the brief's unban-ip route imported
   `getClientIp` from `@/lib/audit-logger` but never referenced it. I dropped that
   import to avoid an unused-import lint/typecheck warning.

The brief added CSRF validation (`validateCSRF`) which lock-account does not have;
I kept it per the brief since CSRF is a deliberate IP-ban-route addition and the
task instructions listed CSRF as outside the "prefer lock-account pattern" set
(requireReauth, withAuth opts, wrapHandler, withRateLimit tier).

## TDD Evidence

### RED (module-not-found, before routes existed)
```
Error: Failed to resolve import "./ban-ip/route" from "src/app/api/admin/ban-ip.route.test.ts". Does the file exist?
Test Files  1 failed (1)
     Tests  no tests
```
This is the correct RED (module-not-found), NOT the `withAuth` destructuring
error — confirming the mock fix was applied before the routes existed.

### GREEN (all three tests pass for the right reasons)
```
✓ src/app/api/admin/ban-ip.route.test.ts > POST /api/admin/ban-ip > bans an IP and returns 200
✓ src/app/api/admin/ban-ip.route.test.ts > POST /api/admin/ban-ip > rejects a short reason with 400
✓ src/app/api/admin/ban-ip.route.test.ts > POST /api/admin/unban-ip > unbans an IP and returns 200
Test Files  1 passed (1)
     Tests  3 passed (3)
```
- Ban 200 test: `banIpManually` called with `('203.0.113.9', expect.any(String), 'credential stuffing', undefined)`.
- 400 test: short reason (`'bad'`, <10 chars) fails zod parse → 400, `banIpManually` not called.
- Unban 200 test: `unbanIp` called with `('203.0.113.9', expect.any(String), 'investigated — false positive')`.

## typecheck result
```
> nextn@0.1.0 typecheck
> tsc --noEmit
```
Clean — no errors (no output). The unused-var/unused-import cleanups were necessary
for this.

## Files changed + commit

- `src/app/api/admin/ban-ip/route.ts` (new)
- `src/app/api/admin/unban-ip/route.ts` (new)
- `src/app/api/admin/ban-ip.route.test.ts` (new)

Commit: `58493ab5` — `feat(security): admin ban-ip / unban-ip API routes`
(staged exactly these three files; pre-commit hooks ran lint-staged cleanly).

## Self-review findings / concerns

- withAuth mock fixed to inject `{ auth }` as second arg: YES.
- Routes match lock-account conventions (requireReauth action strings, withAuth
  `allowedRoles: ['Admin']`, `withRateLimit('write')`, `wrapHandler(name)`): YES.
- All three tests green for the right reasons (200 + correct call args; 400 + no
  call; 200 + correct call args): YES.
- typecheck clean (no unused-var / unused-import errors): YES.
- Commit stages only the three files: YES.

Concerns:
- The vitest v4.0.16 `clearAllMocks`-wipes-`mockResolvedValue` behavior is
  project-wide (global `afterEach` in `test/setup.ts` calls `vi.clearAllMocks()`).
  Other test files in the repo that rely on `mockResolvedValue` and also use
  `beforeEach(clearAllMocks)` will silently get `undefined` after the first test.
  This is a latent pre-existing issue, not introduced by this task, but worth
  flagging. The inline async implementation form is the resilient pattern.
- lock-account does NOT do CSRF validation; the IP-ban routes do (per the brief).
  This is a deliberate, defensible difference (both are Tier-1 admin actions), not
  a deviation requiring action.
# Task 9 Report: Admin ip-bans list + public ip-ban-status routes

## Mock-wipe mitigation

Used the **beforeEach re-establish** approach. Each describe's `beforeEach` calls `vi.clearAllMocks()` then re-establishes the `mockResolvedValue` implementations on `db.ipBan.findMany`, `db.ipBan.count` (list describe), and `getIpBanStatus` (status describe) using shared `BAN_ROW` / `BAN_STATUS` constants. The factory-level `mockResolvedValue` calls from the brief are retained (harmless), but the `beforeEach` re-establish is what makes tests reliable across the vitest 4.0.16 `clearAllMocks` wipe. Verified by running the suite twice — all three tests pass each time, including the second test in the status describe (the one that would fail if the wipe gotcha were still biting).

The `withAuth` pass-through mock is left as-is: `vi.fn((h: any) => h)`. The admin list route handler signature is `(request) => {...}` (no `{ auth }` destructure), so the pass-through works correctly here.

## TDD Evidence

### RED (routes absent)

```
FAIL  src/app/api/admin/ip-bans.route.test.ts
Error: Failed to resolve import "./ip-bans/route" from "src/app/api/admin/ip-bans.route.test.ts". Does the file exist?
Test Files  1 failed (1)
      Tests  no tests
```

Clean module-not-found — no mock-related noise.

### GREEN (routes implemented)

```
✓ src/app/api/admin/ip-bans.route.test.ts > GET /api/admin/ip-bans > lists bans filtered by status=active
✓ src/app/api/admin/ip-bans.route.test.ts > GET /api/auth/ip-ban-status > returns status for the requested IP
✓ src/app/api/admin/ip-bans.route.test.ts > GET /api/auth/ip-ban-status > rejects a missing ip with 400
Test Files  1 passed (1)
      Tests  3 passed (3)
```

Assertions honored for real reasons:
- list: 200, `body.data` length 1, `body.data[0].ipAddress === '203.0.113.9'`, `findMany` called with `where.isActive === true`.
- status 200: `body.data.isBanned === true`.
- status missing-ip: 400 (zod `safeParse` fails on empty ip).

## typecheck

`npm run typecheck` → clean (no output from `tsc --noEmit`).

## Files changed + commit

- `src/app/api/admin/ip-bans/route.ts` (new)
- `src/app/api/auth/ip-ban-status/route.ts` (new)
- `src/app/api/admin/ip-bans.route.test.ts` (new)

Commit: `52845a24` — `feat(security): admin ip-bans list + public ip-ban-status routes`
3 files changed, 126 insertions(+).

## Self-review findings / concerns

- Re-established `mockResolvedValue` in each `beforeEach` — yes.
- All three tests pass (verified across two consecutive runs, including the second test per describe) — yes.
- `withAuth` mock left as pass-through (not changed) — yes.
- `typecheck` clean — yes.
- Commit stages only the three files — yes.

No concerns. The public status route is unauthenticated by design (it only reports whether an IP is banned; IP is query-supplied and the route is rate-limited via `withRateLimit('read')`). The admin list route is gated by `withAuth({ allowedRoles: ['Admin'] })`.
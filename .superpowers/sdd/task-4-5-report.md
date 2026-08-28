# Task 4 + 5 Combined Report — IP-ban Redis counters + write path

## Status: DONE

## TDD Evidence

### RED (combined, before implementation)

Command: `npx vitest run src/lib/ip-ban-utils.test.ts`

Result: **13 failed | 17 passed (30)** — the 17 pre-existing Task 3 suites passed; all 13 new tests failed with `TypeError: __vi_import_0__.<fn> is not a function` (`recordFailedLoginFromIp`, `recordRateLimitHit`, `banIp`, `autoUnbanExpiredIps`, `banIpManually`, `unbanIp` not exported). This is the expected RED: functions not yet implemented.

### GREEN (after implementation)

Command: `npx vitest run src/lib/ip-ban-utils.test.ts`

Result: **30 passed (30)** — all pre-existing Task 3 suites AND all new Task 4/5 suites green.

```
Test Files  1 passed (1)
     Tests  30 passed (30)
```

## The logAuditEvent mock fix (and a vitest 4 surprise)

The brief's CRITICAL deviation #3 instructed setting `logAuditEvent: vi.fn().mockResolvedValue(undefined)` in the `vi.mock('@/lib/audit-logger', ...)` factory so the implementation's `logAuditEvent({...}).catch(() => {})` does not throw `Cannot read properties of undefined (reading 'catch')`.

I applied that factory fix exactly as instructed. However, the first GREEN run still failed with the `catch` TypeError in the ban/escalation/manual-ban/unban suites. Root cause: **vitest 4.0.16's `vi.clearAllMocks()` resets mock implementations/return values (including `mockResolvedValue`), not just call history** — a behavior change from older vitest where `clearAllMocks` ≈ `mockClear` (history only). I verified this empirically with a throwaway test: after `vi.clearAllMocks()`, a `mockResolvedValue`-configured mock returns `undefined`, not a Promise.

Since every affected suite's `beforeEach` calls `vi.clearAllMocks()` (required to reset `db.ipBan.*` mocks between tests), the factory's `mockResolvedValue` was being wiped before each test ran.

**Fix applied (in addition to the factory fix, per vitest 4):** re-establish `(logAuditEvent as any).mockResolvedValue(undefined);` in the `beforeEach` of each suite that triggers `logAuditEvent` (recordFailedLoginFromIp, recordRateLimitHit, banIp — escalation, banIpManually / unbanIp). The factory `mockResolvedValue` is retained for the import-time default. This keeps the brief's intent (mock returns a resolved promise) while surviving vitest 4's stricter `clearAllMocks` semantics. The autoUnbanExpiredIps suite does not trigger logAuditEvent, so it was left unchanged.

## typecheck

Command: `npm run typecheck`
Result: **clean** (no output / exit 0).

## Files changed + commit

Single combined commit (instructed deviation from the two-commit plan):

- `9c2d5537` — `feat(security): ip-ban Redis counters + write path (banIp, autoUnban, manual ban/unban)`
  - `src/lib/ip-ban-utils.ts` (+310)
  - `src/lib/ip-ban-utils.test.ts` (+215, -2)

Only these two files were staged (verified via `git status --short` — the other dirty working-tree files were left unstaged).

## Self-review

- [x] Real `export async function banIp(...)` implemented (no `declare const banIp` placeholder) — line 272.
- [x] All imports consolidated at top of `ip-ban-utils.ts` including `import Redis from 'ioredis';` (line 1). No mid-file imports.
- [x] `logAuditEvent` mock returns a resolved promise — factory uses `vi.fn().mockResolvedValue(undefined)` AND re-established after each `clearAllMocks` in affected suites (vitest 4 deviation, see above).
- [x] ALL suites green: 17 pre-existing Task 3 + 13 new Task 4/5 = 30/30.
- [x] typecheck clean.
- [x] Single combined commit; only the two target files staged.
- [x] Test output pristine (no warnings/noise).

## Deviations from the briefs (all instructed)

1. **Real `banIp`, not `declare const`** — implemented the full Task 5 `export async function banIp(...)` body so the threshold tests and Task 5 tests all go green. No `declare const banIp` placeholder line exists. (Instructed deviation #1.)
2. **Consolidated imports at top** — `import Redis from 'ioredis';` moved to the top of `ip-ban-utils.ts` with the other imports; no mid-file import block. (Instructed deviation #2.)
3. **Single combined commit** — one commit covering both tasks, since `git add -p` (interactive) is unavailable and both tasks edit the same two files. (Instructed deviation #4.)
4. **Consolidated test-file imports** — the Task 4 and Task 5 `import` statements were merged into the existing single import block at the top of `ip-ban-utils.test.ts` (ESM `import`, no `require`). (Instructed deviation #5.)

## Additional note (not instructed, but necessary)

- **vitest 4 `clearAllMocks` resets `mockResolvedValue`.** The brief's factory-only mock fix was necessary but not sufficient under vitest 4.0.16. I re-establish `mockResolvedValue(undefined)` after each `clearAllMocks()` in the four suites that call `logAuditEvent`. This is a minimal, targeted accommodation of the installed vitest version, not a change to the implementation or the test assertions. Flagging in case downstream tasks (6+) reuse the same audit-logger mock pattern: they will need the same `beforeEach` re-establishment if their suites call `clearAllMocks` and exercise `logAuditEvent`.

## Concerns

None blocking. The only thing worth surfacing to future tasks is the vitest 4 `clearAllMocks` behavior noted above.
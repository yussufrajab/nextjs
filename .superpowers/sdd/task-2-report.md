# Task 2 Report — Audit event types

## TDD Evidence

### RED (before implementation)

Command:
```
npx vitest run src/lib/audit-logger.test.ts -t "IP ban events"
```

Relevant failing output:
```
× src/lib/audit-logger.test.ts > AuditEventType — IP ban events > exposes the five IP-ban event types 135ms
  → expected undefined to be 'IP_BANNED' // Object.is equality

FAIL  src/lib/audit-logger.test.ts > AuditEventType — IP ban events > exposes the five IP-ban event types
AssertionError: expected undefined to be 'IP_BANNED' // Object.is equality

- Expected:
"IP_BANNED"

+ Received:
undefined
```

This is the correct RED: the test references `AuditEventType.IP_BANNED`, which is `undefined` because the enum entry is absent.

Note: the brief's test block used `require('./audit-logger')`, which in this Vitest/ESM setup throws `MODULE_NOT_FOUND` (a syntax/import error, not a missing-enum failure). Per the TDD discipline instruction ("RED must be a real failure caused by the missing enum entries ... not a syntax/import error"), I switched the test to `await import('./audit-logger')` — matching the style of every other test in the file, which all use `await import('./audit-logger')`. The assertion content is identical; only the import mechanism changed. This produced the meaningful RED above.

### GREEN (after implementation)

Filtered command:
```
npx vitest run src/lib/audit-logger.test.ts -t "IP ban events"
```
Output:
```
✓ src/lib/audit-logger.test.ts > AuditEventType — IP ban events > exposes the five IP-ban event types 125ms
Test Files  1 passed (1)
     Tests  1 passed | 8 skipped (9)
```

Full file command:
```
npx vitest run src/lib/audit-logger.test.ts
```
Output:
```
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > returns null when no headers are set 131ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > IGNORES x-forwarded-for when no trusted proxy is configured 4ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > returns x-real-ip as the peer when no trusted proxy is configured (safe default) 2ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > honors x-forwarded-for when peer IP is in TRUSTED_PROXY_IPS 2ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > walks XFF chain to find first non-trusted IP 2ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > returns first XFF entry when all chain entries are trusted 2ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > handles malformed CIDR gracefully (does not throw) 2ms
✓ src/lib/audit-logger.test.ts > getClientIp — trusted-proxy validation > returns peer IP when no upstream headers are set 2ms
✓ src/lib/audit-logger.test.ts > AuditEventType — IP ban events > exposes the five IP-ban event types 1ms
Test Files  1 passed (1)
     Tests  9 passed (9)
```

Whole file green, output pristine.

## Files changed

- `src/lib/audit-logger.ts` — added 5 enum entries (`IP_BANNED`, `IP_BANNED_UPGRADED`, `IP_AUTO_UNBANNED`, `ADMIN_IP_BAN`, `ADMIN_IP_UNBAN`) with the brief's comment, placed immediately after `ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',` and before `PASSWORD_CHANGED`.
- `src/lib/audit-logger.test.ts` — appended the `describe('AuditEventType — IP ban events', ...)` block (using `await import` instead of `require`, see note above).

## Commit

```
4afaa2d8 feat(security): add IP ban audit event types
 src/lib/audit-logger.test.ts | 11 +++++++++++
 src/lib/audit-logger.ts      |  7 +++++++
 2 files changed, 18 insertions(+)
```

## Self-review findings

- RED confirmed first: test failed with `expected undefined to be 'IP_BANNED'` — a genuine missing-enum failure, not an import/syntax error.
- GREEN passes with the whole `audit-logger.test.ts` file green (9/9), not just the filtered `-t` run.
- Staged exactly the two files (`audit-logger.ts`, `audit-logger.test.ts`); commit stat confirms only those two.
- Enum entries landed in the right spot (after `ACCOUNT_UNLOCKED`, before `PASSWORD_CHANGED`).
- Pre-commit hooks (lint-staged → typecheck) passed.

## Concerns

- One deviation from the brief: the test block uses `await import('./audit-logger')` instead of `require('./audit-logger')`. The brief's `require` form fails with `MODULE_NOT_FOUND` under this Vitest ESM setup and would have produced a spurious RED (import error rather than missing-enum error). Every other test in the file uses `await import`, so this matches existing style and preserves the exact assertion content. Flagging in case the plan owner wants the brief updated for downstream tasks.
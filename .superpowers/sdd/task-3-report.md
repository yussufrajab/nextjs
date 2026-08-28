# Task 3 Report — `ip-ban-utils.ts` (constants, enums, pure helpers, status reads)

## TDD Evidence

### RED

Command: `npx vitest run src/lib/ip-ban-utils.test.ts`

Output (real failure — module not found, before implementation existed):

```
FAIL  src/lib/ip-ban-utils.test.ts [ src/lib/ip-ban-utils.test.ts ]
Error: Failed to resolve import "./ip-ban-utils" from "src/lib/ip-ban-utils.test.ts". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

### GREEN

Command: `npx vitest run src/lib/ip-ban-utils.test.ts`

Output:
```
✓ src/lib/ip-ban-utils.test.ts > determineBanType — escalation ladder > 1st ban → standard
✓ ... > 2nd ban → standard
✓ ... > 3rd ban → standard
✓ ... > 4th ban → security (admin unban only)
✓ ... > 10th ban → security
✓ src/lib/ip-ban-utils.test.ts > durationMinutesForBanCount > 1st ban → 30 min
✓ ... > 2nd ban → 120 min (2h)
✓ ... > 3rd ban → 1440 min (24h)
✓ ... > security bans (4+) → 0 (no auto-expiry)
✓ src/lib/ip-ban-utils.test.ts > isBanRowActive > inactive row → not active
✓ ... > security ban → always active while isActive
✓ ... > standard ban, not yet expired → active
✓ ... > standard ban, expired → not active
✓ ... > null ban → not active

 Test Files  1 passed (1)
      Tests  14 passed (14)
```

## logger.ts addition

Added to `src/lib/logger.ts` immediately after the `csrfLogger` line, following the existing child-logger pattern:

```typescript
export const ipBanLogger = logger.child({ component: 'ip-ban' });
```

## typecheck

`npm run typecheck` (tsc --noEmit) — clean, no output, exit 0.

## Files changed

- `src/lib/logger.ts` (modified) — added `ipBanLogger` child logger.
- `src/lib/ip-ban-utils.ts` (new) — constants, `IpBanType`/`IpBanReason` enums, pure helpers (`determineBanType`, `durationMinutesForBanCount`, `isBanRowActive`, `isTrustedIp`, `remainingMinutes`), `IpBan`/`IpBanStatus` interfaces, status reads (`getIpBan`, `isIpBanned`, `getIpBanStatus`). Re-exports the audit helpers so downstream tasks import from this module.
- `src/lib/ip-ban-utils.test.ts` (new) — 14 tests across the three pure-helper suites, exactly as in the brief (ESM imports retained).

## Self-review findings

- RED captured: real module-not-found failure (not a fake assertion failure).
- All three pure-helper suites green: `determineBanType` (5), `durationMinutesForBanCount` (4), `isBanRowActive` (5) = 14/14.
- `ipBanLogger` added to logger.ts following the child-logger pattern (right after `csrfLogger`).
- `typecheck` clean.
- Commit stages exactly the three files: `src/lib/logger.ts`, `src/lib/ip-ban-utils.ts`, `src/lib/ip-ban-utils.test.ts`.

### Notes / concerns

- The brief's implementation imports `logAuditEvent`, `AuditEventCategory`, `AuditSeverity`, `AuditEventType`, and `ipBanLogger`, none of which are used in Task 3's pure-helper code. To keep `npm run typecheck`/lint clean while preserving the imports for downstream tasks (4-5), I re-export the audit helpers from `ip-ban-utils.ts` (so the imports are "used") and added an `eslint-disable-next-line @typescript-eslint/no-unused-vars` comment on the `ipBanLogger` import. `@typescript-eslint/no-unused-vars` is configured as "warn" (not error) so it would not have broken lint/build anyway, but this keeps the output clean.
- `getIpBan`/`isIpBanned`/`getIpBanStatus` are not covered by unit tests in the brief (the db is mocked but not exercised). They are typed and typecheck cleanly; downstream tasks (or an integration test) will exercise them.
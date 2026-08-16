# SDD Progress Ledger — feat/ip-ban-on-abuse

Plan: docs/superpowers/plans/2026-08-04-ip-ban.md
Branch: feat/ip-ban-on-abuse
Base (branch start): 86347d4f

## Done (10/10)
- [x] Task 1   — Prisma IpBan model + migration              (7518883c)
- [x] Task 2   — 5 AuditEventType entries                     (4afaa2d8)
- [x] Task 3   — ip-ban-utils constants/enums/helpers/reads   (7244f4e8)
- [x] Task 4+5 — Redis counters + ban write path              (9c2d5537) [combined: real banIp, single commit]
- [x] Task 6   — Login gate (403 IP_BLOCKED) + counter feeds   (23637ddd)
- [x] Task 7   — Rate-limiter → recordRateLimitHit on 429     (e7a7e597)
- [x] Task 8   — Admin ban-ip / unban-ip routes                (58493ab5)
- [x] Task 9   — Admin ip-bans list + public ip-ban-status     (52845a24)
- [x] Task 10  — .env.example docs                            (1fb550a6)

## Final verification
- typecheck: clean (exit 0)
- lint (touched files): 0 errors, 99 warnings (all no-explicit-any; warnings ignored per CLAUDE.md)
- full vitest excluding environmental suites: 84 files / 1136 tests passed, 0 failed
- environmental (pre-existing, unrelated to IP-ban): 5 Playwright e2e specs (need dev server; vitest config include '??\/*.{test,spec}' picks them up) + audit-db.test.ts partition test (audit_log_2026_09 not provisioned — date boundary)

## Carry-forward notes
- Test files use ESM `import` (require() fails under this Vitest/ESM setup).
- vitest.config.ts sets mockReset:true + clearMocks:true + restoreMocks:true → mock implementations (mockResolvedValue) are auto-reset before EVERY test. Factory-set mockResolvedValue does NOT persist across tests; re-establish in beforeEach or use inline async impls.
- withAuth real signature injects { auth } as 2nd arg: `async (req) => handler(req, { auth })`. Pass-through mock `withAuth:(h)=>h` breaks handlers that destructure { auth }; inject auth in the mock instead.

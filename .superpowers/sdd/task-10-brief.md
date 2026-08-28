## Task 10: Env documentation

**Files:**
- Modify: `.env.example` (add an IP Ban section after the Redis section, ~line 28)

- [ ] **Step 1: Add the env section**

In `.env.example`, after the Redis block (after line 27 `REDIS_PORT=6379`), insert:

```env
# ---------------------------------------------------------------------------
# IP Ban on Abuse (auto-ban a source IP for auth abuse)
# ---------------------------------------------------------------------------
# Ephemeral per-IP abuse counters live in Redis; the durable ban record lives
# in Postgres (IpBan). See docs/superpowers/specs/2026-08-04-ip-ban-design.md.
# All thresholds are env-overridable so E2E (many logins from one IP) doesn't
# trip the ban mid-suite — leave unset for production defaults.
#  - IP_FAILED_LOGIN_BAN_THRESHOLD: failed logins from one IP across ALL
#    accounts before a ban (default 10, over a 15-min sliding window).
#  - IP_RATELIMIT_HIT_BAN_THRESHOLD: auth-tier 429s from one IP before a ban
#    (default 3, over a 15-min sliding window).
#  - IP_BAN_WINDOW_SECONDS: the sliding-window length for both counters
#    (default 900 = 15 min).
#  - TRUSTED_IPS: comma-separated IPs never auto-banned (office NAT / admin
#    egress escape hatch). Admins can still ban them manually.
IP_FAILED_LOGIN_BAN_THRESHOLD=10
IP_RATELIMIT_HIT_BAN_THRESHOLD=3
IP_BAN_WINDOW_SECONDS=900
TRUSTED_IPS=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(security): document IP ban env vars"
```

---

## Final verification

- [ ] **Run the full unit suite**

```bash
npm test
```
Expected: all suites pass, no regressions in `account-lockout-utils`, `rate-limiter`, or `audit-logger`.

- [ ] **Typecheck**

```bash
npm run typecheck
```
Expected: no new errors.

- [ ] **Lint the new files**

```bash
npm run lint
```
Expected: no new errors in `src/lib/ip-ban-utils.ts`, the new routes, or the modified login/rate-limiter files.

- [ ] **Manual smoke (optional, requires running app + Redis + Postgres)**

1. Start the dev server (`npm run dev`).
2. From a non-trusted IP, trigger >10 failed logins across different usernames within 15 min → confirm the IP is banned (subsequent logins return `403 IP_BLOCKED` with a remaining-minutes message).
3. Hit the auth rate limit repeatedly (>3 × 429 within 15 min) → confirm the IP is banned.
4. `POST /api/admin/ban-ip` with a reason → confirm a security ban is created and appears in `GET /api/admin/ip-bans?status=active`.
5. `POST /api/admin/unban-ip` → confirm the ban is cleared and the IP can log in again.
6. `GET /api/auth/ip-ban-status?ip=<banned-ip>` → confirm it reports `isBanned: true` with the right `banType`.

---

## Self-Review (completed)

**Spec coverage:**
- Goal (auto-ban, failed OR limit trigger): Tasks 4-5 (counters + `banIp`), 6-7 (wiring both triggers). ✓
- Escalating duration (30m/2h/24h/security): Task 3 `determineBanType` + `durationMinutesForBanCount`, Task 5 `banIp`. ✓
- Redis counters + Postgres ban record split: Task 3 (status reads from Postgres), Task 4 (Redis counters), Task 1 (Postgres model). ✓
- Login-route early gate + record on failures: Task 6. ✓
- Rate-limiter → `recordRateLimitHit`: Task 7. ✓
- Admin ban/unban/list + public status: Tasks 8-9. ✓
- Audit events (5 new): Task 2 + emitted in Task 5. ✓
- Trusted-IP allowlist: Task 3 `isTrustedIp`, used in Task 4. ✓
- Redis-down fail-open for counters, Postgres survives: Task 4 (counters fail open), Task 3 (`isIpBanned` reads DB). ✓
- Generic security message / remaining-minutes for standard: Task 6 gate. ✓
- Env docs: Task 10. ✓

**Placeholder scan:** No TBD/TODO; every code step has full code. ✓

**Type consistency:** `IpBanType` / `IpBanReason` enums used consistently across Tasks 3-5; `recordFailedLoginFromIp` / `recordRateLimitHit` / `banIp` / `banIpManually` / `unbanIp` / `getIpBanStatus` / `autoUnbanExpiredIps` signatures match between producers (Tasks 3-5) and consumers (Tasks 6-9). ✓

**Known friction point (called out in Task 4):** the two "calls banIp at threshold" tests go green only after Task 5 lands, because `banIp`'s body is defined in Task 5. The plan states this explicitly and offers re-ordering as an option; every other test is green at its task boundary.

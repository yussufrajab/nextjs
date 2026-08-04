# IP Ban on Abuse — Design

**Date:** 2026-08-04
**Status:** Approved (brainstorm), pending implementation plan
**Scope:** Auto-ban a source IP on auth abuse, persistent + audited, with admin manual control. Mirrors the existing `account-lockout-utils` design.

## Goal

Auto-ban an IP on abuse, escalating on repeat offences:

- **Trigger:** failed login attempts from that IP across **all** accounts, **OR** repeated auth rate-limit (429) hits from that IP. Either condition triggers a ban.
- **Duration:** escalating — 1st ban 30 min, 2nd 2h, 3rd 24h, 4th+ requires admin unban (security).
- **Storage:** ban record in Postgres (persistent + audited, survives Redis restart). Ephemeral per-IP counters in Redis (sliding window, matching the existing rate limiter).
- **Admin control:** manual ban / unban via admin API routes, plus a list endpoint.

This complements the existing per-account lockout (`src/lib/account-lockout-utils.ts`): account lockout protects one account; IP ban protects against credential stuffing / single-IP floods that rotate usernames or pace themselves under the per-account limit.

## Architecture — two stores, split by purpose

| Store | Holds | Why |
|---|---|---|
| **Redis** | Ephemeral sliding-window counters: `ipban:failedlogins:{ip}`, `ipban:limithits:{ip}` | Fast, auto-expiring, no DB write per request. Reuses the atomic ZSET pattern from `rate-limiter.ts`. |
| **Postgres** | The ban record itself (`IpBan` Prisma model) | Persistent, survives Redis restart, audited. The hard gate reads from here, so a Redis outage does not disable existing bans. |

Audit events flow to the existing partitioned `audit.audit_log` table via `logAuditEvent` (raw `pg`, same path as `ACCOUNT_LOCKED`).

## Data model — new Prisma model `IpBan`

Mirrors the lockout fields already on `User`:

```prisma
model IpBan {
  id                String    @id @default(cuid())
  ipAddress         String    @unique          // normalized
  banCount          Int       @default(0)      // drives escalation
  banType           String?                    // 'standard' | 'security'
  bannedUntil       DateTime?                  // null for security (admin-only)
  banReason         String?                    // 'failed_logins' | 'rate_limit' | 'admin_ban'
  isManuallyBanned  Boolean   @default(false)
  bannedBy          String?                    // admin userId
  bannedAt          DateTime?
  banNotes          String?
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  @@index([ipAddress, isActive])
  @@index([bannedUntil])
}
```

## Escalation — `determineBanType(banCount)`

Mirrors `determineLockoutType` in `account-lockout-utils.ts`:

| `banCount` | `banType` | Duration | Auto-expires |
|---|---|---|---|
| 1 | `standard` | 30 min | yes |
| 2 | `standard` | 2 h | yes |
| 3 | `standard` | 24 h | yes |
| 4+ | `security` | — (admin unban only) | no |

Standard → security upgrade path emits a distinct `IP_BANNED_UPGRADED` audit event.

## Thresholds (constants, env-overridable)

- `IP_FAILED_LOGIN_BAN_THRESHOLD` — default 10 failed logins / 15 min window
- `IP_RATELIMIT_HIT_BAN_THRESHOLD` — default 3 auth 429s / 15 min window
- `IP_BAN_WINDOW_SECONDS` — default 900 (15 min) for both counters
- `TRUSTED_IPS` — comma-separated allowlist; these IPs are never auto-banned (escape hatch for office NAT / admin egress). Admins can still ban them manually.

Env-overridable, like `RATE_LIMIT_AUTH_LIMIT`, so the E2E suite (many logins from one IP) doesn't trip the ban before tests complete.

## Library — `src/lib/ip-ban-utils.ts`

Mirrors the shape of `account-lockout-utils.ts`:

| Function | Responsibility |
|---|---|
| `isIpBanned(ip)` | Reads `IpBan` row; true if `isActive` and (`banType === security` or `bannedUntil` in the future). |
| `getIpBanStatus(ip): IpBanStatus` | `{ isBanned, banType, banReason, remainingMinutes, canAutoUnban, isManuallyBanned }`. |
| `recordFailedLoginFromIp(ip)` | ZADD into `ipban:failedlogins:{ip}`; on `ZCARD >= threshold` → `banIp(ip, 'failed_logins')`. No-op if already banned or IP is trusted. |
| `recordRateLimitHit(ip)` | ZADD into `ipban:limithits:{ip}`; on `ZCARD >= threshold` → `banIp(ip, 'rate_limit')`. Same skips. |
| `banIp(ip, reason, banType?)` | `upsert` on `ipAddress`, increment `banCount`, set `banType`/`bannedUntil` per `determineBanType`, emit audit event. Re-reads after upsert to clamp one escalation step per call. |
| `escalateIpBan(existingBan, reason)` | STANDARD → SECURITY upgrade path. |
| `autoUnbanExpiredIps(): number` | Bulk `updateMany` for expired standard bans (mirrors `autoUnlockExpiredAccounts`). Called on login attempts. |
| `banIpManually(ip, adminId, reason, notes?)` | Admin manual ban; `banType = security`, `isManuallyBanned = true`. |
| `unbanIp(ip, adminId, notes)` | Clears ban state, resets counters (Redis keys deleted), emits audit. |

**Redis counters** reuse the existing `SLIDING_WINDOW_SCRIPT` atomic pattern (trim `ZREMRANGEBYSCORE` → count `ZCARD` → add `ZADD` + `EXPIRE`, in one `EVAL`). Same pattern as `checkRateLimitSliding` in `rate-limiter.ts`. A banned IP suppresses further counting (no Redis writes while banned) — counters age out via TTL naturally.

**Successful login does NOT reset IP counters.** A successful login from a flagged IP should not clear abuse history — that is a credential-stuffing evasion. Counters age out via the sliding-window TTL.

## Wiring

### Login route (`src/app/api/auth/login/route.ts`)

In order:

1. **Very early, before the per-user sliding limit:** `if (isIpBanned(ip))` → return `403` `{ errorCode: 'IP_BLOCKED', retryAfter: remainingMinutes }` with a generic message for `security` bans, remaining-minutes message for `standard`. Banned IP never reaches the DB lookup.
2. After each existing failure branch (`User not found`, `Account locked`, `Invalid password`) → `await recordFailedLoginFromIp(ip)`. Fire-and-forget; existing audit logging in those branches is unchanged.
3. Successful login → no IP-counter reset (see rationale above).

### Rate limiter (`src/lib/rate-limiter.ts`)

In `withRateLimit`, when `result.reason === 'rate_limit_exceeded'` **and** `tier === 'auth'` → `await recordRateLimitHit(ip)` via dynamic `import('@/lib/ip-ban-utils')`. Non-auth tiers do not feed the IP ban.

**Why dynamic import:** `rate-limiter.ts` is imported hot and early across the app; `ip-ban-utils` pulls in Prisma `db` and the audit pool. A static import risks a load-order cycle. Dynamic import inside the deny branch (cold path only) keeps it clean — exactly how `account-lockout-utils` is dynamically imported in the login route today.

### Admin routes (mirror `/api/admin/lock-account` + `unlock-account`)

- `POST /api/admin/ban-ip` — body `{ ipAddress, reason, notes? }` → `banIpManually`. Admin-only, CSRF-validated.
- `POST /api/admin/unban-ip` — body `{ ipAddress, notes }` → `unbanIp`. Admin-only.
- `GET /api/admin/ip-bans?status=active|expired|all` — list bans for an admin table.
- `GET /api/auth/ip-ban-status` — returns `{ isBanned, remainingMinutes, banType }` for a given IP, so a locked-out user sees a countdown (parallel to `account-lockout-status`).

### Admin UI

An "IP Bans" admin panel (table of active bans, manual ban/unban forms) mirrors `lock-account-modal.tsx` / `unlock-account-modal.tsx`. **Out of scope for the first cut** — ship the API + auto-ban first; UI is a flagged follow-up.

## Audit events

Add to the `AuditEventType` enum in `src/lib/audit-logger.ts`:

- `IP_BANNED` — auto ban created.
- `IP_BANNED_UPGRADED` — standard → security upgrade.
- `IP_AUTO_UNBANNED` — expired standard ban auto-cleared.
- `ADMIN_IP_BAN` — admin manual ban.
- `ADMIN_IP_UNBAN` — admin manual unban.

All via `logAuditEvent` → `audit.audit_log`. Severity: `WARNING` for standard auto bans, `CRITICAL` for security / upgrades / admin bans. `wasBlocked: true` for auto bans.

## Edge cases & security decisions

- **Shared NAT / office IP**: `TRUSTED_IPS` is the escape hatch. Auto-ban is risky where many users share one egress IP (same trade-off as account lockout on a shared account). Standard duration is short (30 min) so collateral damage self-heals. Document this.
- **Enumeration leak**: banned response is generic for `security` bans ("Access denied"); shows remaining minutes only for `standard`. The IP is already known to the caller, so no username leakage. Mirrors the account-lockout message policy.
- **Redis down**: counters fail open silently (log warn, don't block login). `isIpBanned` reads from **Postgres**, so existing bans survive a Redis outage. New bans cannot be created while Redis is down — acceptable and safer than failing closed.
- **Race on threshold**: two concurrent failures could both cross the threshold and both call `banIp`. `banIp` uses `upsert` keyed on `ipAddress` and increments `banCount` in the same write; clamp to one escalation step per call by re-reading after upsert. Acceptable; not worth a transaction lock.
- **IP extraction**: reuse `audit-logger.getClientIp` (already `TRUSTED_PROXY_IPS`-aware), so attackers cannot rotate `x-forwarded-for` to dodge the ban. Same IP the rate limiter uses.

## Testing (Vitest, existing `*.test.ts` style)

- `ip-ban-utils.test.ts` — `isIpBanned` expiry logic; `determineBanType` escalation (1→30m, 2→2h, 3→24h, 4→security); `autoUnbanExpiredIps`; manual ban/unban; trusted-IP skip. Mock Redis + `db`.
- Login-route test: banned IP → 403 before DB lookup; failed login increments counter; threshold triggers ban; successful login does not reset counter.
- Rate-limiter test: auth 429 calls `recordRateLimitHit`; non-auth does not.

## Out of scope / flagged follow-ups

- Admin UI panel for IP bans.
- IP-range / CIDR bans.
- Reverse-DNS lookups.
- Correlation with `account-lockout-utils` to detect a single account hammered from many IPs.

## Build sequence (preview, finalized in implementation plan)

1. Prisma model `IpBan` + migration.
2. `src/lib/ip-ban-utils.ts` (functions, Redis counters, audit events).
3. New `AuditEventType` entries.
4. Wire login route (early `isIpBanned` gate + `recordFailedLoginFromIp` on failures).
5. Wire `rate-limiter.ts` (`recordRateLimitHit` on auth 429).
6. Admin routes (`/api/admin/ban-ip`, `/api/admin/unban-ip`, `/api/admin/ip-bans`, `/api/auth/ip-ban-status`).
7. Tests.
8. Env docs (`.env.example`, `TRUSTED_IPS`, thresholds).
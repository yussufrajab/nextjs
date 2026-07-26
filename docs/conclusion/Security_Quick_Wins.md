# CSMS Security — Quick Wins to Implement Now

**Source gap analysis:** `docs/conclusion/CSMS_Security_Controls_Implementation_Status.md` (30 requirements, 206 controls)
**Codebase analyzed:** `/home/latest` (Next.js 14 + Prisma + PostgreSQL) — branch `fix/e2e-chronic-failures`
**Prepared:** 2026-07-19

## Scope rule (tighter-than-required = implemented)

Configs that are **stricter** than the requirement are treated as ✅ Implemented and are **not** remediation targets. Only weaker-than-spec or missing controls below are in scope.

### Reclassified as ✅ (leave as-is)

| # | Control | Spec | Actual | Reason |
|---|---|---|---|---|
| 2.1 | Session idle timeout | 15–30 min | 10 min | Stricter → implemented |
| 7.3 | File upload size cap | ~10 MB | 1 MB | Stricter → implemented |

---

## Quick wins — verified in the working tree

### Tier 1 — One-constant / trivial changes (minutes each)

#### 1. Password policy to spec — Req 1.3 / 1.4 / 1.5
**File:** `src/lib/password-utils.ts`
- Line 6: `PASSWORD_MIN_LENGTH = 8` → `12`
- Line 7: `PASSWORD_HISTORY_LENGTH = 3` → `5`
- Lines 43–45 (`validatePasswordComplexity`): change `classCount >= 2` → `classCount >= 4` (require all four character classes)

All three are weaker-than-spec (not tighter), so they are real gaps. The change applies only to new passwords (change/reset), so no data migration is required.

#### 2. Shorten presigned-URL expiry — Req 10.3
**File:** `src/lib/minio.ts:158`
- Default `expiry: 24 * 60 * 60` (24 h) → `15 * 60` (15 min). A leaked presigned link is currently valid for a full day.

#### 3. Kill the HRIMS SSRF — Req 11.2
**File:** `src/app/api/hrims/sync-employee/route.ts:230-234`
- Today `request.hrimsApiUrl` (caller-supplied, Zod `.url()`) overrides the env value, and `hrimsApiKey` comes from the request body (`route.ts:234`).
- Drop both from the request schema and read only from env/server config.
- High value — eliminates caller-controlled outbound URL + credential exposure.

---

### Tier 2 — Small, localized (an hour or two each)

#### 4. Add Admin role check to institution PUT/DELETE — Req 14.1 / 14.6
**File:** `src/app/api/institutions/[id]/route.ts`
- PUT handler (line 29) and DELETE handler (line 179) call `verifyAuth` (any authenticated user) + `requireReauth`, but **never check `role === 'Admin'`**.
- Today any logged-in user who passes reauth can edit or **delete** an institution.
- Fix: add a role guard, or switch to `withAuth(['Admin'])`. High-value privilege-escalation fix.

#### 5. Add auth to `/api/external/employees` — Req 3.6
**File:** `src/app/api/external/employees/route.ts:13`
- Only `validateCSRF` — no `verifyAuth`/`withAuth`.
- Add an auth + role check (and ideally reauth, since it proxies to HRIMS with server credentials).

#### 6. Invalidate sessions on role/institution change — Req 2.5
**File:** `src/app/api/users/[id]/route.ts:83-96`
- Password change already invalidates other sessions (`src/app/api/auth/change-password/route.ts:236-259`); role/institution change does **not**.
- Reuse the same session-invalidation helper after a role or institution change so a demoted/transfered user cannot keep using old privileges.

#### 7. Self-approval check in bulk PATCH — Req 8.9
**File:** collection PATCH handlers (e.g. `src/app/api/promotions/route.ts` bulk path)
- The `[id]` routes block self-approval (`promotions/[id]/route.ts:138-150`); the bulk PATCH path does not.
- Copy the same `reviewedById === submittedById` check into the bulk loop.

#### 8. Deterministic jobId for dedup — Req 16.4
**File:** `src/lib/hrims-sync-queue.ts:100`
- jobId uses `Date.now()` → double-click enqueues duplicates.
- Switch to a deterministic id (e.g. `hrims-sync:${institutionId}`) so a second enqueue dedupes.

#### 9. Owner-bound job-status — Req 16.2
**Files:** `src/app/api/hrims/job-status/[jobId]/route.ts:32` and `sync-status/[jobId]/route.ts:48`
- Currently any Admin/HHRMD can read any job.
- Add an owner match (job `userId`/`institutionId` vs `auth`).

#### 10. Validate notification recipient — Req 13.1
**File:** `src/lib/notifications.ts:56-67`
- `createNotification` accepts any `userId`.
- Add an existence + active-user check before insert.

---

### Tier 3 — Small but worth doing

#### 11. FSM on confirmations & lwop — Req 8.1 / 8.2 / 18.1
Copy the `ALLOWED_TRANSITIONS` block from `src/app/api/promotions/[id]/route.ts:91-110` into:
- `src/app/api/confirmations/[id]/route.ts`
- `src/app/api/lwop/[id]/route.ts`
- and validate transitions in the bulk PATCH handlers.

#### 12. Enforce `gender` enum on manual-entry — Req 6.8
**File:** `src/app/api/employees/manual-entry/route.ts:58-131`
- Add `z.enum([...])` for `gender` and `appointmentType`/`contractType`.

#### 13. Enforce `assignedOfficerRole` on resolution — Req 9.7
**File:** `src/app/api/complaints/[id]/route.ts:64-110`
- Compare actor role to `assignedOfficerRole`, not just "any officer".

#### 14. Audit the reports GET — Req 12.5 / 27.2
**File:** `src/app/api/reports/route.ts`
- Currently has **no** `logAuditEvent` call (verified — grep found none).
- Add one `REPORT_VIEWED`/`EXPORT` event with role + institution + report type + counts.

---

## Not quick — defer (despite looking small)

| Req | Control | Why deferred |
|---|---|---|
| 21 | Audit hash-chain / `REVOKE UPDATE,DELETE` + trigger | Needs migration + background verifier — medium-large |
| 22 / 23 | Data classification + restricted-data workflow | Schema additions + wiring across auth/report/export — large |
| 20.4 | Optimistic locking (`version` field) | Needs column + migration + every PATCH updated — not quick |
| 2.6 / 3.5 | Validate session cookie in middleware (not forgeable `auth-storage`) | Touches middleware + every dashboard gating path — medium |

---

## Suggested implementation order

1. **Tier 1 (items 1–3):** 4 trivial commits → closes Req 1.3/1.4/1.5, 10.3, 11.2.
2. **Items 4 & 5:** the two highest-risk privilege/SSRF holes.
3. **Remainder of Tier 2 (items 6–10).**
4. **Tier 3 (items 11–14).**

Recommended first PR on this branch: Tier 1 + items 4 & 5, with tests for the password-policy and role-check changes.

---

*Derived from codebase analysis of `/home/latest` (branch `fix/e2e-chronic-failures`) on 2026-07-19. All `file:line` references are to the current working tree and were verified before writing.*
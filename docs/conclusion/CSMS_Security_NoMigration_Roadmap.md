# CSMS Security — No-Migration Fix Roadmap

**Companion to:** `docs/conclusion/CSMS_Security_Controls_Implementation_Status.md`
**Scope:** every remaining security gap that can be closed **without a Prisma/DB migration**. Items requiring schema changes (reset-token columns, optimistic-lock `version`, audit hash-chain, classification fields, approval-workflow tables, correlation-id column, etc.) are intentionally excluded — see the bottom of this file.
**Ordering:** the numbered list is the suggested **implementation order** (it balances priority, risk, and shared-path coordination). The **Priority** column records security impact separately, because the two legitimately differ — e.g. Req 30.5 (PII encryption) is the single highest-impact item but is sequenced later so it lands after the data-layer paths it touches are stabilized.

**Priority legend:** 🔴 Critical · 🟠 High · 🟡 Moderate · ⚪ Low
**Size:** S (≤~1 file, hours) · M (a few files, ~1 day) · L (multi-day / cross-cutting)
**Risk:** Low · Med · High

---

## Summary

| # | Req | Title | Priority | Size | Risk | Phase |
|---:|----|-------|:--:|:--:|:--:|----|
| 1 | 7.7 | Bulk-upload batch ID | 🟠 High | S | Low | 1 — Quick wins |
| 2 | 26.2 | Privilege-escalation detection & alerting | 🔴 Critical | S | Low | 1 — Quick wins |
| 3 | 11.2 | HRIMS trusted-source / SSRF elimination | 🔴 Critical | M | Med | 2 — Active-vuln elimination |
| 4 | 9.6 + 9.2 | Complainant confidentiality + `GET /api/complaints/[id]` | 🔴 Critical | M | Low | 2 — Active-vuln elimination |
| 5 | 16.1/16.3/16.6/16.7 | HRIMS worker audit + re-validation | 🟠 High | M | Med | 3 — HRIMS sync hardening |
| 6 | 11.7 + 11.8 | Sync `$transaction` + runtime Zod | 🟠 High | M | Med | 3 — HRIMS sync hardening |
| 7 | 11.4 | Sync duplicate prevention / idempotency | 🟠 High | S | Med | 3 — HRIMS sync hardening |
| 8 | 20.5 | Post-sync reconciliation cron | 🟡 Moderate | M | Low | 3 — HRIMS sync hardening |
| 9 | 30.5 | PII encryption at rest (wire existing dead code) | 🔴 Critical | L | High | 4 — PII encryption |
| 10 | 10.4 | Document type-specific authorization | 🟠 High | S | Low | 5 — Authorization & confidentiality |
| 11 | 13.2/13.3/13.4 | Notification scoping (involved parties + caller gate) | 🟡 Moderate | M | Low | 5 — Authorization & confidentiality |
| 12 | 27.4 | Report data minimization (mask PII in report rows) | 🟡 Moderate | M | Low | 5 — Authorization & confidentiality |
| 13 | 1.1 + 14.2 | Per-role MFA policy (config-based) | 🟡 Moderate | M | Med | 5 — Authorization & confidentiality |
| 14 | 14.7 | Admin audit before/after (reset/unlock/cleanup-sessions) | 🟡 Moderate | S | Low | 5 — Authorization & confidentiality |
| 15 | 6.5 | Fuzzy duplicate detection | 🟡 Moderate | M | Low | 6 — Data integrity & validation |
| 16 | 7.5 + 7.6 | Bulk-upload validation parity + per-row institution | 🟡 Moderate | M | Low | 6 — Data integrity & validation |
| 17 | 28.5 | Config integrity schema validation | 🟡 Moderate | S | Low | 6 — Data integrity & validation |
| 18 | 18.6 | Background workflow-integrity cron | 🟡 Moderate | M | Low | 6 — Data integrity & validation |
| 19 | 12.2/12.5/12.6/12.7 | Server-side export endpoint + audit + ownership + rate limits | 🟠 High | L | Med | 7 — Larger / broad |
| 20 | 8.8 (partial) | Silent `.catch(()=>{})` audit-write cleanup (non-file domains) | 🟡 Moderate | M | Low | 7 — Larger / broad |
| 21 | 15.6 + 19.5 | Change-history prev/new for all UPDATE handlers | 🟡 Moderate | L | Low | 7 — Larger / broad |
| 22 | 20.1 + 20.2 | Zod + business-rule validation on remaining ~60 routes | 🟡 Moderate | L | Low | 7 — Larger / broad |
| 23 | 3.1 | Consolidate API endpoint→role mapping | ⚪ Low | M | Low | 7 — Larger / broad |
| 24 | 21.5 | Dedicated audit-review role | ⚪ Low | S | Low | 7 — Larger / broad |
| 25 | 25.2 | Split `Admin` into user-mgmt vs data/config sub-roles | ⚪ Low | L | Med | 7 — Larger / broad |
| 26 | 30.2 | Field-level ABAC / tighten CSC least-privilege | ⚪ Low | L | Med | 7 — Larger / broad |

> **Sequencing note for #9 (30.5):** it is the highest-impact item on this list but is staged in Phase 4 because it touches every Employee write/read path (manual-entry, bulk-upload, HRIMS sync, reads) — the same paths modified in Phases 2–3 and 6. **Start its backward-compat read-path design immediately in parallel with Phase 2** (decrypt-if-ciphertext detection so existing plaintext rows keep working), then cut over once the sync write path (Phase 3) is stable.

---

## Phase 1 — Quick wins

### 1. Req 7.7 — Bulk-upload batch ID
**Gap.** `employees/bulk-upload/route.ts` emits `UPLOADED` (`:533-557`, with `totalRows`/`validRows`/`invalidRows`) and per-row `CREATED` (`:696-705`, with `batchRow`) but no single `batchId` links an import end-to-end.
**Fix.** Generate `const batchId = uuidv4()` at the start of the POST (validate) handler; add it to the `UPLOADED` `additionalData` and to every `CREATED` `additionalData` (next to `batchRow`); surface `batchId` in the validation response.
**Files.** `src/app/api/employees/bulk-upload/route.ts`.
**Verify.** One import emits `UPLOADED` + N `CREATED` sharing one `batchId`; test asserts the shared id.

### 2. Req 26.2 — Privilege-escalation detection & alerting
**Gap.** `users/[id]/route.ts:121-144` logs the role-change diff but no detection/alerting rule fires on escalation patterns.
**Fix.** On role change, if the new role escalates privilege (e.g. → `Admin`/`HHRMD`/`CSCS`), or an unusual run of escalations occurs in a window, emit a CRITICAL `POTENTIAL_BREACH` via the existing `dispatchSecurityAlert` pipeline (already wired into `logAuditEvent`).
**Files.** `src/app/api/users/[id]/route.ts` (reuses `src/lib/security-alerts.ts`).
**Verify.** An escalation to Admin emits a CRITICAL alert; lateral/non-escalating changes do not; test.

---

## Phase 2 — Active-vuln elimination

### 3. Req 11.2 — HRIMS trusted-source / SSRF elimination
**Gap.** `hrims/sync-employee/route.ts:18-19,237-241`, `hrims/sync-certificates/route.ts:17-18,197-201`, and `hrims/sync-documents/route.ts` accept a **caller-supplied** `hrimsApiUrl`/`hrimsApiKey` (body preferred over env) — an authorized caller can point the server at an arbitrary host (SSRF) and exfiltrate the key. `hrims/fetch-employee/route.ts:432` already uses the safe pattern (`getHrimsApiConfig()`).
**Fix.** Remove `hrimsApiUrl`/`hrimsApiKey` from the three Zod schemas + handlers; always source config via `getHrimsApiConfig()`. In `src/lib/hrims-config.ts` add a host allow-list (`HRIMS_ALLOWED_HOSTS`) validated at config-load; enforce TLS cert validation (no `rejectUnauthorized:false`); reject non-`https` in production. Reauth already wired (Req 11.1).
**Files.** `hrims/sync-employee/route.ts`, `hrims/sync-documents/route.ts`, `hrims/sync-certificates/route.ts`, `src/lib/hrims-config.ts`.
**Verify.** Body `hrimsApiUrl`/`hrimsApiKey` ignored; non-allowlisted host → 400 + `HRIMS_SYNC_FAILED`; tests.

### 4. Req 9.6 + 9.2 — Complainant confidentiality + `GET /api/complaints/[id]`
**Gap.** `complaints/route.ts:209-219` returns complainant `employeeId`, `employeeName`, `zanId`, `complainantPhoneNumber`, `nextOfKinPhoneNumber` to all officer roles with no redaction. No `GET /api/complaints/[id]` exists (Req 9.2) — involved-party visibility not modeled.
**Fix.** Add `src/lib/complaint-privacy.ts` `redactComplainantPii(complaint, { viewerRole, viewerUserId, assignedOfficerId })`: for a non-owning viewer (not the complainant and not the assigned officer), mask `zanId`/phones (`***1234`), drop `employeeId`, render `employeeName` as initials; complainant + assigned officer + Admin/CSCS see full. Apply in the list response; add `GET` to `complaints/[id]/route.ts` enforcing complainant-or-assigned-officer visibility, 403 via the existing `denyWorkflowAccess` path, redact before return.
**Files.** `src/app/api/complaints/route.ts`, `src/app/api/complaints/[id]/route.ts`, new `src/lib/complaint-privacy.ts`.
**Verify.** Non-owning officer sees masked PII on list + GET; assigned officer + complainant see full; 403 denial audited; tests per branch.

---

## Phase 3 — HRIMS sync hardening

### 5. Req 16.1/16.3/16.6/16.7 — HRIMS worker audit + re-validation
**Gap.** `src/lib/jobs/hrims-sync-worker.ts` imports only `workerLogger` (`:11`) — completed/failed jobs write no tamper-evident audit row; it doesn't re-validate `job.data.userId` permission (16.1), the HRIMS response shape (16.6), or the institution `voteNumber`/`tin` before upserting (16.7).
**Fix.** Import `logHrimsSync`; on completion emit it with actor + saved/skipped/failed counts + per-record failure reasons; on failure emit `HRIMS_SYNC_FAILED`. Re-fetch the `User` for `job.data.userId` (active + sync role) or abort with an audit event. Add a Zod schema for the HRIMS employee-list page response and `safeParse` before processing. Re-fetch the Institution and verify `voteNumber`/`tinNumber` match `job.data.identifier` before upserting.
**Files.** `src/lib/jobs/hrims-sync-worker.ts` (reuses existing `logHrimsSync`).
**Verify.** Completed job writes audit row with actor+counts; revoked-user job aborts; malformed HRIMS response rejected; institution mismatch aborts.

### 6. Req 11.7 + 11.8 — Sync `$transaction` + runtime Zod
**Gap.** `hrims/sync-documents/route.ts:260-362` writes each document in a per-row `try/catch` — a mid-batch failure leaves partial commits; background doc/cert sync is fire-and-forget `Promise.all(...).catch` with no `await` (11.7). `hrims/fetch-employee/route.ts` persists `any`-typed HRIMS data (no runtime Zod) and `hrims/bulk-fetch/route.ts` has no schema (11.8).
**Fix.** Wrap multi-row document/cert writes in `prisma.$transaction` (employee-field updates + `DocumentHash` rows atomic); `await` the background sync; on any row failure roll back the whole batch and emit per-record `HRIMS_SYNC_FAILED`. Add a runtime Zod schema for the HRIMS employee-detail response in `fetch-employee` + `bulk-fetch`; `safeParse` before persist; reject on mismatch with 422 + audit.
**Files.** `hrims/sync-documents/route.ts`, `hrims/fetch-employee/route.ts`, `hrims/bulk-fetch/route.ts`.
**Verify.** Mid-batch failure rolls back all rows (no partial commit); malformed HRIMS response rejected before persist; tests.

### 7. Req 11.4 — Sync duplicate prevention / idempotency
**Gap.** `hrims/sync-employee/route.ts:290-356` upserts on `zanId` only; a `payrollNumber`-only HRIMS response with a different `zanId` can create a duplicate employee.
**Fix.** Match on `zanId` OR `payrollNumber`; add an idempotency key (deterministic per `institutionId`+identifier, mirroring the BullMQ jobId pattern from Req 16.4) so retries dedupe; wrap the upsert in `$transaction` (builds on #6).
**Files.** `hrims/sync-employee/route.ts`.
**Verify.** A `payrollNumber`-only response matching an existing employee updates instead of creating; a retried sync dedupes; test.

### 8. Req 20.5 — Post-sync reconciliation cron
**Gap.** `cron-service.ts:292-323` schedules only password-expiry / MFA-cleanup / audit-partition jobs — no reconciliation verifies synced employees against the HRIMS source.
**Fix.** Add a scheduled job that compares synced employee counts/key fields for an institution against a fresh HRIMS fetch and flags drift (writes a `HRIMS_SYNC_DRIFT` audit/WARNING, or `HRIMS_SYNC_FAILED` on divergence).
**Files.** `src/lib/cron-service.ts` (+ a `hrims-reconcile.ts` helper).
**Verify.** A deliberate field drift raises an audit event; a clean sync raises none; test with mocked HRIMS.

---

## Phase 4 — PII encryption at rest

### 9. Req 30.5 — PII encryption at rest (wire existing dead code)
**Gap.** Migration `20260529000000_add_pii_encryption` and `src/lib/encryption.ts` (`initEncryptionSession`/`encryptPII`/`decryptPII`) already exist but are **never called** — PII is stored plaintext. HRIMS `apiKey`/`token` secrets in `SystemSettings` are plaintext; the HRIMS upstream is plaintext HTTP.
**Fix.**
- Wire `initEncryptionSession()` + `encryptPII`/`decryptPII` into the Employee data layer: encrypt on write (manual-entry, bulk-upload, HRIMS sync) and decrypt on read across the same paths. Coordinate with Phases 2–3 and 6 which touch these same paths — **land after the sync write path (#5–#7) is stable**.
- Implement a **backward-compat read path** (detect ciphertext vs plaintext, decrypt-if-encrypted) so existing rows keep working through the cutover; migrate legacy rows in a background pass.
- Encrypt `SystemSettings` secrets (`apiKey`/`token`) at rest using the same helpers (encrypt on save, decrypt on read, redact in audit).
- Switch the HRIMS upstream to HTTPS (config / `hrims-config.ts`).
**Files.** `src/lib/encryption.ts`, `src/app/api/employees/manual-entry/route.ts`, `src/app/api/employees/bulk-upload/route.ts`, `src/app/api/hrims/sync-employee/route.ts`, `src/app/api/hrims/fetch-employee/route.ts`, employee read paths, `src/app/api/admin/hrims-settings/route.ts`, `src/lib/hrims-config.ts`.
**Verify.** New writes store ciphertext; reads return plaintext to authorized roles; legacy plaintext rows still readable; secrets redacted in audit; a missing `PII_ENCRYPTION_KEY` fails closed (not silent); tests for encrypt/decrypt round-trip + backward-compat read.

---

## Phase 5 — Authorization & confidentiality

### 10. Req 10.4 — Document type-specific authorization
**Gap.** `files/employee-documents/[filename]/route.ts:40-72` gates by filename-prefix only — identical rules for every document type.
**Fix.** Add a type→role map (e.g. `birthCertificate` vs `confirmationLetter` vs `terminationLetter`) and enforce per-type role gating on download/preview.
**Files.** `src/app/api/files/employee-documents/[filename]/route.ts` (+ a small config map).
**Verify.** A role allowed for one doc type is denied a different type; test.

### 11. Req 13.2/13.3/13.4 — Notification scoping
**Gap.** `notifications.ts:56,114` server helpers have no caller-permission gate; `promotions/route.ts:329-330` and `complaints/route.ts:75-90` fan out to all active role-holders across institutions regardless of involvement.
**Fix.** Add a caller-permission gate to `createNotification`/`createNotificationForRole`; scope workflow + complaint status notifications to involved parties / by institution + assignment instead of broadcasting.
**Files.** `src/lib/notifications.ts`, `promotions/route.ts`, `complaints/route.ts`, `complaints/[id]/route.ts`.
**Verify.** Only involved parties receive notifications; an unauthorized caller is rejected; tests.

### 12. Req 27.4 — Report data minimization
**Gap.** `reports/route.ts` `sanitizeText` is XSS-escaping only — report rows carry full PII (`nidaNumber`/`zssfNumber`/`phoneNumber`).
**Fix.** Apply role-based masking to sensitive report-row fields (reuse the `sanitize-response.ts` mask pattern), not just XSS-escaping.
**Files.** `src/app/api/reports/route.ts` (+ `src/lib/sanitize-response.ts`).
**Verify.** Low-privilege roles see masked PII in report rows; high-privilege see full; test.

### 13. Req 1.1 + 14.2 — Per-role MFA policy (config-based)
**Gap.** `auth/login/route.ts:350-395` enforces email-OTP MFA for all users with an email, not per-role; silently skipped when a user has no email; no requirement that Admin have MFA.
**Fix.** Add a config-based `MFA_REQUIRED_ROLES` set in `src/lib/constants.ts` (e.g. `Admin`, `HHRMD`, `CSCS`); require MFA for those roles regardless of email presence (gate login/step-up on role membership). No `User.requireMfa` column needed.
**Files.** `src/lib/constants.ts`, `src/app/api/auth/login/route.ts`, `src/lib/mfa-utils.ts`, `src/lib/reauth.ts`.
**Verify.** A privileged role without an email is required to set up MFA / is blocked from privileged actions until MFA; non-privileged roles unaffected; tests.

### 14. Req 14.7 — Admin audit before/after
**Gap.** `admin/reset-password`, `admin/unlock-account`, `admin/cleanup-sessions` log only new state (reset logs `wasGenerated`; unlock logs no prior lock reason; cleanup logs only deleted count).
**Fix.** Fetch and capture prior state before the mutation and include prev/new in the audit `additionalData` (mirrors the user role/institution pattern in `users/[id]/route.ts:127-144`).
**Files.** `src/app/api/admin/reset-password/route.ts`, `src/app/api/admin/unlock-account/route.ts`, `src/app/api/admin/cleanup-sessions/route.ts`.
**Verify.** Each admin action's audit row carries prev + new state; tests.

---

## Phase 6 — Data integrity & validation

### 15. Req 6.5 — Fuzzy duplicate detection
**Gap.** `manual-entry/route.ts:220-261` and `bulk-upload/route.ts:378-451` do exact-match uniqueness only (zanId/zssf/payroll); no fuzzy name/DOB/institution detection.
**Fix.** Add a levenshtein/trigram duplicate check on name + DOB + institutionId (warn or block on near-match).
**Files.** new `src/lib/duplicate-detection.ts`, `src/app/api/employees/manual-entry/route.ts`, `src/app/api/employees/bulk-upload/route.ts`.
**Verify.** A near-identical name+DOB+institution is flagged; an exact match is still blocked; tests.

### 16. Req 7.5 + 7.6 — Bulk-upload validation parity + per-row institution
**Gap.** `bulk-upload/route.ts:290-349` lacks ZSSF/payroll format, `appointmentType`/`contractType` enum, and cross-field date logic (7.5); `institutionId` is forced from session with no per-row institution column (7.6).
**Fix.** Reuse the Req 6.8 helpers (`isValidEnum`/`isValidZssfNumber`/`isValidPayrollNumber`/`validateCrossFieldDates`) on the bulk path; read + validate a per-row `institutionId` column against institution records (CSC roles may pass any; non-CSC forced from session).
**Files.** `src/app/api/employees/bulk-upload/route.ts`.
**Verify.** Bulk rows reject on bad enum/format/date-order; a per-row institution mismatch is rejected; tests.

### 17. Req 28.5 — Config integrity schema validation
**Gap.** `admin/hrims-settings/route.ts:62,75` validates only host/port regex — no schema validation on the config blob.
**Fix.** Add a Zod schema + checksum for the HRIMS config blob; reject malformed config with 400 + audit.
**Files.** `src/app/api/admin/hrims-settings/route.ts`.
**Verify.** Malformed config rejected; valid config accepted; test.

### 18. Req 18.6 — Background workflow-integrity cron
**Gap.** `cron-service.ts:292-323` schedules no workflow-integrity job — orphaned/inconsistent workflow states go undetected.
**Fix.** Add a scheduled job that detects requests stuck in a non-terminal status past SLA, or whose `reviewStage`/`status` pair is invalid; emit a WARNING audit (and alert on stuck-Commission).
**Files.** `src/lib/cron-service.ts` (+ a `workflow-integrity.ts` helper).
**Verify.** A stuck request raises an audit event; a clean request does not; test.

---

## Phase 7 — Larger / broad

### 19. Req 12.2/12.5/12.6/12.7 — Server-side export endpoint
**Gap.** `src/lib/export-utils.ts:31-66` — exports are client-side from already-fetched data; no server authorization/rate-limit/audit on the export act; `REPORT_EXPORTED` is defined but never emitted; no per-user ownership/standing check; no download rate limits/watermarking.
**Fix.** Add a server-side export endpoint with role auth, emit `REPORT_EXPORTED` on the act, enforce per-user ownership/standing, and add download rate-limits + watermarking. (Req 12.8 dual-approval is the only export sub-item that needs a migration — excluded.)
**Files.** new `src/app/api/reports/export/route.ts`, `src/lib/export-utils.ts`, `src/app/api/reports/route.ts`.
**Verify.** Export requires role auth + is audited; rate limit + watermark applied; ownership enforced; tests.

### 20. Req 8.8 (partial) — Silent `.catch(()=>{})` audit-write cleanup (non-file)
**Gap.** The file domain is done; the remaining ~call sites across other domains still swallow audit-write failures with `.catch(()=>{})`.
**Fix.** Migrate them to the existing `safeAuditLog(p, context)` helper (logs, never swallows). The HMAC-signing part of 8.8 needs a column and is excluded.
**Files.** audit-write call sites across `src/app/api/**` (mechanical sweep).
**Verify.** No bare `.catch(()=>{})` on audit writes remain outside tests; a failing audit write is logged; spot-check.

### 21. Req 15.6 + 19.5 — Change-history prev/new for all UPDATE handlers
**Gap.** Only user role/institution + HRIMS config capture prev/new; employees, complaints, promotions, lwop, etc. record new state only.
**Fix.** Generalize `src/lib/change-history.ts` to compute + persist prev/new field diffs with actor for all UPDATE handlers.
**Files.** `src/lib/change-history.ts` + the UPDATE handlers (broad).
**Verify.** An employee/complaint/promotion update audit row carries prev/new diffs; tests.

### 22. Req 20.1 + 20.2 — Zod + business-rule validation on remaining routes
**Gap.** ~39/99 routes have Zod; the rest validate presence/types only; date-ordering and eligibility rules absent on most mutation routes.
**Fix.** Add Zod schemas to the remaining ~60 routes; add date-ordering + eligibility business rules to mutation routes.
**Files.** `src/lib/api-schemas.ts` + the route handlers (broad).
**Verify.** A malformed body is rejected with 422; an invalid date order is rejected; tests.

### 23. Req 3.1 — Consolidate API endpoint→role mapping
**Gap.** ~78 inline `allowedRoles` declarations; no single API endpoint→role table.
**Fix.** Consolidate into a single source-of-truth table mirroring `route-permissions-config.ts`.
**Files.** new `src/lib/api-route-permissions.ts` + route handlers (mechanical).
**Verify.** A CI/sync test confirms the table matches the inline declarations; tests.

### 24. Req 21.5 — Dedicated audit-review role
**Gap.** `audit/logs/route.ts:85` restricts reads to `['Admin','CSCS']` — no dedicated audit-review/auditor role.
**Fix.** Introduce an `AuditReviewer` role (role is a string → config-only, no migration) and gate audit reads on it (+ Admin/CSCS).
**Files.** `src/lib/constants.ts`, `src/app/api/audit/logs/route.ts`.
**Verify.** An `AuditReviewer` can read audit logs but not perform admin data actions; test.

### 25. Req 25.2 — Split `Admin` into user-mgmt vs data/config sub-roles
**Gap.** A single `Admin` role performs both user-management and data/config functions.
**Fix.** Introduce `UserAdmin` + `DataAdmin` sub-roles and scope admin routes accordingly (config/auth change; large).
**Files.** `src/lib/constants.ts`, `src/lib/route-permissions-config.ts`, `src/proxy.ts`, admin route `allowedRoles`.
**Verify.** A `UserAdmin` can manage users but not change HRIMS config; a `DataAdmin` the reverse; tests.

### 26. Req 30.2 — Field-level ABAC / tighten CSC least-privilege
**Gap.** `api-auth.ts:235-300` / `role-utils.ts:9` — CSC roles see ALL institutions (broad, by-design) and there is no field-level ABAC.
**Fix.** Add field-level ABAC for the most sensitive fields and/or narrow CSC access where the by-design tension allows.
**Files.** `src/lib/api-auth.ts`, `src/lib/role-utils.ts`, `src/lib/sanitize-response.ts`.
**Verify.** CSC sees only the fields/institutions justified by need-to-know; tests.

---

## Excluded — need schema migrations (do not attempt under this roadmap)
- **1.10** self-service password reset (`resetToken`/`resetTokenExpiry` columns)
- **20.4** optimistic locking (`version`/`lockVersion` field)
- **15.2 / 15.5 / 21.1–21.4 / 21.6 / 29.5** audit append-only (`REVOKE UPDATE,DELETE` + `BEFORE UPDATE/DELETE` trigger + hash-chain column)
- **22.1–22.5** data classification (classification fields on models + audit)
- **23.1** clearance-level field; **23.2** `AccessApproval` workflow entity; **23.4** dual-approval export; **23.5** dual-control restricted-data grants
- **24.5** `correlation_id` column; **24.6** request-chain key
- **25.4** DB CHECK constraint (distinct submitter+reviewer); **25.5** dual-authorization workflow
- **27.3** classification-based export; **27.5** `ExportRequest` model; **28.2** `ConfigChangeRequest` model; **28.4** `SystemSettingsHistory` table
- **12.8** export secondary-approval workflow

---

*Prepared 2026-07-25 against branch `fix/e2e-chronic-failures`. Each entry maps to the per-control rows in `CSMS_Security_Controls_Implementation_Status.md`; update that doc's row verdict + master summary + "Closed in this pass" note as each item lands.*
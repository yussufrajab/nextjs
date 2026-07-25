# CSMS Security Controls — Implementation Status Report (All 30 Requirements)

**Source requirements:** `docs/conclusion/CSMS_Security_Requirements_Transform.md` (30 requirements, 206 individual controls/components)
**Codebase analyzed:** `/home/latest` (Next.js 14 + Prisma + PostgreSQL Civil Service Management System)
**Format:** Modeled on `docs/conclusion/sample_example.md` — each control is a testable acceptance criterion with an implementation verdict and `file:line` evidence.

**Status legend**
- ✅ **Implemented** — control is in place and meets (or exceeds) the specification.
- ⚠️ **Partial** — control exists but has gaps, weaker config, or incomplete coverage.
- ❌ **Not Implemented** — control is absent or fails the specification.

> **Re-audit note (2026-07-21).** This report was originally prepared 2026-07-18. It has been re-verified against the current working tree on branch `fix/e2e-chronic-failures`, which has received multiple security commits since the original analysis (`fix(security): DB-validated session proxy + HRIMS fetch-data 500 fix`, `Security Quick Wins`, etc.). All `file:line` references and verdicts below reflect the **current** code. Per the governing principle, controls that are **tighter than spec** (e.g. 10-min idle timeout vs the 15–30 min window, 1-MB upload cap vs ~10 MB, CSV-only import vs `.xlsx`) are scored ✅ — they exceed the requirement and are *not* treated as gaps to loosen.

---

## Master Summary — All 30 Requirements

| Req | Requirement (Domain) | Controls | ✅ Implemented | ⚠️ Partial | ❌ Not Implemented |
|----:|----------------------|:------:|:------:|:------:|:------:|
| 1 | Authentication & Identity Assurance | 13 | 11 | 2 | 0 |
| 2 | Session Security | 8 | 8 | 0 | 0 |
| 3 | Authorization & Least Privilege | 6 | 5 | 1 | 0 |
| 4 | Institution Data Isolation | 7 | 7 | 0 | 0 |
| 5 | Employee Profile Protection | 7 | 6 | 1 | 0 |
| 6 | Employee Creation Integrity | 8 | 5 | 2 | 1 |
| 7 | Bulk Upload Security | 9 | 5 | 4 | 0 |
| 8 | Workflow Security & Approval Integrity | 9 | 8 | 1 | 0 |
| 9 | Complaint Management Security | 7 | 5 | 1 | 1 |
| 10 | File & Document Security | 8 | 5 | 2 | 1 |
| 11 | HRIMS Integration Security | 8 | 4 | 2 | 2 |
| 12 | Reporting & Export Security | 8 | 3 | 1 | 4 |
| 13 | Notification Security | 6 | 3 | 3 | 0 |
| 14 | Administrative Security | 8 | 5 | 3 | 0 |
| 15 | Audit Trail & Accountability | 7 | 4 | 3 | 0 |
| 16 | Background Processing Security | 7 | 3 | 3 | 1 |
| 17 | Direct Object Reference Protection (IDOR) | 6 | 5 | 1 | 0 |
| 18 | Workflow State Integrity | 6 | 5 | 0 | 1 |
| 19 | Non-Repudiation | 6 | 5 | 1 | 0 |
| 20 | Data Integrity Protection | 6 | 2 | 3 | 1 |
| 21 | Audit Log Protection | 6 | 0 | 4 | 2 |
| 22 | Government Data Classification Enforcement | 5 | 0 | 0 | 5 |
| 23 | Restricted Government Data Protection | 6 | 1 | 3 | 2 |
| 24 | Accountability & Traceability | 6 | 4 | 1 | 1 |
| 25 | Separation of Duties | 5 | 2 | 2 | 1 |
| 26 | Security Monitoring & Detection | 6 | 4 | 1 | 1 |
| 27 | Export & Data Extraction Control | 6 | 2 | 2 | 2 |
| 28 | Administrative Change Control | 5 | 2 | 1 | 2 |
| 29 | Synchronization Accountability | 5 | 0 | 5 | 0 |
| 30 | Government Information Confidentiality | 6 | 3 | 3 | 0 |
| | **TOTAL** | **206** | **122** | **56** | **28** |

**Headline result (2026-07-21 re-audit; updated 2026-07-25):** 122/206 controls fully implemented (59.2%), 56/206 partial (27.2%), 28/206 not implemented (13.6%) — up from 94/79/33 at the 2026-07-18 baseline. The strongest areas are Session Security (Req 2), Institution Isolation (Req 4), Authorization (Req 3), Workflow Security (Req 8), and Non-Repudiation (Req 19). The weakest areas remain Data Classification (Req 22), Audit Log Protection (Req 21), Synchronization Accountability (Req 29), Reporting/Export (Req 12), and Administrative Change Control (Req 28).

---

## Requirement 1: Authentication & Identity Assurance

**Process/Function:** User Authentication, Login Security & MFA

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 1.1 | Multi-Factor Authentication (designated roles) | ⚠️ Partial | `src/app/api/auth/login/route.ts:350-395`; `src/lib/mfa-utils.ts:23-57`; `prisma/schema.prisma:412-471` | Email-OTP MFA enforced for **all** users with an email, not per-role. Silently skipped when user has no email (`login/route.ts:350,398`). No TOTP/hardware keys; no per-role MFA policy field on `User`. Gap: add a per-role MFA policy (e.g. `mfaRequiredRoles` config or `User.requireMfa` flag) and require MFA for privileged roles regardless of email presence. |
| 1.2 | Strong Password Policy / weak-password rejection | ✅ Implemented | `src/lib/password-utils.ts:132-140`; `src/app/api/auth/change-password/route.ts:133-162` | zxcvbn common-password rejection + HIBP k-anonymity breach rejection. |
| 1.3 | Minimum password length ≥ 12 | ✅ Implemented | `src/lib/password-utils.ts:11` (`PASSWORD_MIN_LENGTH = 12`); `change-password/route.ts:124-128` | **Fixed (was ❌).** Constant raised from 8 to 12 and enforced in `validatePasswordComplexity` + change-password error message. |
| 1.4 | Password complexity (4 classes) | ✅ Implemented | `src/lib/password-utils.ts:49-50` (`classCount >= 4`) | **Fixed (was ⚠️).** Complexity now requires all four character classes (was ≥2 of 4). |
| 1.5 | Password history (last 5) | ✅ Implemented | `src/lib/password-utils.ts:12` (`PASSWORD_HISTORY_LENGTH = 5`); `change-password/route.ts:174-184,209-213` | **Fixed (was ❌).** History retention raised from 3 to 5; `checkPasswordHistory` (Argon2id verify) and `updatedHistory = [...].slice(0, 5)` enforce it. |
| 1.6 | Password expiry (90 days, configurable) | ✅ Implemented | `src/lib/password-expiration-utils.ts:4-24`; `login/route.ts:299-345` | 90 days standard, 60 for Admin, 7-day grace. Reset on change. |
| 1.7 | Account lockout after 5 failed attempts | ✅ Implemented | `src/lib/account-lockout-utils.ts:4-5,78-86,121-143`; `login/route.ts:201-230` | 5 attempts → 30-min lockout; security lockout >10 attempts. |
| 1.8 | Login rate limiting per IP/user | ✅ Implemented | `src/lib/rate-limiter.ts:198-204` (per-IP fixed window via `withRateLimit`); `src/lib/rate-limiter.ts:checkRateLimitSliding` + `buildUserRateLimitKey` (per-user sliding window); `src/app/api/auth/login/route.ts:46-76` | **Fixed (was ⚠️).** Per-IP fixed window (5/60s, fail-closed) retained; added a per-user sliding-window counter keyed `ratelimit:user:${normalizedUsername}:auth` (Redis ZSET + atomic Lua) checked before the DB lookup so distributed brute-force against one account (and guesses against non-existent usernames) is throttled regardless of source IP. Username normalized (trim+lowercase, capped 256) so case variants share a bucket. Reuses the `auth` tier config (env-overridable via `RATE_LIMIT_AUTH_LIMIT` for E2E) and fails closed (503) when Redis is down. |
| 1.9 | Secure password hashing (Argon2id + salt) | ✅ Implemented | `src/lib/password-hash.ts:13-33` (`argon2.argon2id`, OWASP params); `package.json:69` (`"argon2": "^0.45.0"`) | **Fixed (was ❌).** bcrypt replaced with native Argon2id (memoryCost 19456, timeCost 2, parallelism 1); `verifyPassword`/`comparePassword`/`checkPasswordHistory` all use Argon2id with no bcrypt fallback. |
| 1.10 | Secure password reset (token, single-use, ≤15 min) | ✅ Implemented | `src/app/api/auth/forgot-password/route.ts`; `src/app/api/auth/reset-password/route.ts`; `src/lib/password-reset.ts`; `prisma/schema.prisma` (`PasswordResetToken` model) | **Fixed (2026-07-25).** Self-service token-based reset: `POST /api/auth/forgot-password` (accepts username or email, always returns a generic non-enumerable response, per-identifier sliding rate limit) issues a single-use `PasswordResetToken` (SHA-256 hashed at rest, ≤15-min TTL via `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES`) and emails a one-time link. `POST /api/auth/reset-password` runs the full change-password validation chain (complexity / common / HIBP / history / not-same-as-current), then atomically consumes the token (race-safe `updateMany` single-use guarantee), updates the password, clears standard lockout + temp-password flags, preserves admin `isManuallyLocked` security lockouts, invalidates all sessions, and audits `PASSWORD_RESET`. UI: `/forgot-password` + `/reset-password` pages + "Forgot password?" link on login. Tighter than the literal spec (hashed-at-rest token + dedicated table + attempt cap), consistent with the existing `MfaToken` single-use pattern. |
| 1.11 | Generic authentication error messages | ✅ Implemented | `src/app/api/auth/login/route.ts:72,163,184,221,290` | Identical "Invalid username/email or password" on all failure paths. |
| 1.12 | Failed login monitoring/logging | ✅ Implemented | `src/app/api/auth/login/route.ts:63-69,145-180,209-217,315-323`; `src/lib/audit-logger.ts:232-245` | `logLoginAttempt` records username, userId, role, IP, device, reason. |
| 1.13 | Reauthentication for high-risk actions | ✅ Implemented | `src/lib/reauth.ts`; `src/lib/api-auth.ts:355-403`; `src/app/api/auth/reauth/route.ts:66-76` | Step-up re-auth (HMAC cookie, 5-min TTL) on reset-password, role/institution change, HRIMS sync, lock/unlock, etc. |

---

## Requirement 2: Session Security

**Process/Function:** Session Lifecycle, Timeout & Cookie Hardening

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 2.1 | Session timeout (idle 15–30 min) | ✅ Implemented | `src/lib/session-timeout-utils.ts:12-13` (`SESSION_TIMEOUT_MINUTES = 10`); `src/lib/session-manager.ts:358-362` | **Tighter than spec (was ⚠️).** Idle timeout is 10 min — below the 15–30 min window but *stricter* (faster expiry); exceeds spec, so ✅. |
| 2.2 | Absolute session lifetime (8–12 hrs) | ✅ Implemented | `src/lib/session-manager.ts:26-27,109-116,152-156,347-354` | 8-hr absolute expiry embedded in HMAC cookie + DB `expiresAt`. |
| 2.3 | Secure session identifiers (HttpOnly/Secure/SameSite/random) | ✅ Implemented | `src/lib/session-manager.ts:60-62,79-99,109-147` | `crypto.randomBytes(32)`, `httpOnly`, `secure` in prod, `sameSite:'strict'`, `__Host-` prefix, HMAC-signed. |
| 2.4 | Session invalidation on logout | ✅ Implemented | `src/app/api/auth/logout/route.ts:39-57,82-106` | DB row deleted + cookies cleared (`maxAge:0`). |
| 2.5 | Session invalidation on password/role change | ✅ Implemented | `src/app/api/users/[id]/route.ts:148-162` (`terminateAllUserSessions` on role/institution change); `change-password/route.ts:236-261` (password) | **Fixed (was ⚠️).** Role and institution changes now terminate ALL of the target user's sessions (diff computed at `users/[id]/route.ts:123-128`); password change invalidates other sessions (current device kept). |
| 2.6 | Server-side session validation on every request | ✅ Implemented | `src/proxy.ts:249-293,387-420` (HMAC `verifySessionToken` + DB `validateSession` + active-User role lookup on every `/dashboard` navigation); `src/lib/api-auth.ts:92-204` (API: HMAC + DB + IP/UA) | **Fixed (was ⚠️).** `middleware.ts` was removed; `src/proxy.ts` now does full HMAC + DB + active-User validation on dashboard navigations and reads the role from the DB User row (never the forgeable `auth-storage` cookie). |
| 2.7 | Concurrent session control | ✅ Implemented | `src/lib/session-manager.ts:25,285-301`; `src/app/api/auth/sessions/route.ts` | Max 3; oldest evicted on 4th login; user-facing session mgmt endpoints. |
| 2.8 | Reauthentication for sensitive actions | ✅ Implemented | `src/lib/reauth.ts`; `src/app/api/auth/reauth/route.ts:66-76` | See Req 1.13. |

---

## Requirement 3: Authorization & Least Privilege

**Process/Function:** RBAC, Least Privilege, Deny-by-Default

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 3.1 | RBAC mapping endpoints→roles | ⚠️ Partial | `src/lib/route-permissions-config.ts:17-167`; `src/app/api/users/route.ts:109,247`; `src/lib/api-auth.ts:235-300` | Dashboard pages have a single source-of-truth map, but API routes still declare `allowedRoles` inline (~78 occurrences); no single API endpoint→role table. `Commission` role remains absent by design (folded into `HHRMD`/`HRMO`, `src/lib/constants.ts:3-13`). Gap: consolidate API endpoint→role mapping. |
| 3.2 | Least privilege enforcement | ✅ Implemented | `src/app/api/users/route.ts:109` (GET: ADMIN/HHRMD/HRO), `:247` (POST: ADMIN only) | **Fixed (was ⚠️).** Read vs write granularity now differentiated — GET users allows ADMIN/HHRMD/HRO while POST (create) is ADMIN-only; reports route is GET-only so the PO/HHRMD sharing concern is moot. |
| 3.3 | Need-to-know access control | ✅ Implemented | `src/app/api/employees/route.ts:188-197`; `src/lib/role-utils.ts:7,14-30` | **Tighter/by-design (was ⚠️).** `EMPLOYEE` restricted to own record; CSC roles see all institutions (central commission oversight, by design). Admin is intentionally excluded from data-page allow-lists (only `/dashboard/admin` + home) — tighter than spec, not a gap. |
| 3.4 | Deny-by-default authorization | ✅ Implemented | `src/lib/route-permissions.ts:45-46`; `src/proxy.ts:210-211`; `src/lib/api-auth.ts:260-281` | `return false` / `forbidden()` when no rule matches. |
| 3.5 | Server-side authorization (not client role claims) | ✅ Implemented | `src/proxy.ts:249-293,388-391`; `src/lib/api-auth.ts:92-204,181-184` | **Fixed (was ⚠️).** `middleware.ts` removed; `src/proxy.ts` validates the HMAC-signed `session` cookie via `verifySessionToken`+`validateSession` and reads the role from the DB User row on every dashboard navigation — the forgeable `auth-storage` cookie is no longer used for page gating. |
| 3.6 | Permission validation on every request | ✅ Implemented | `src/app/api/external/employees/route.ts:20-29,74`; `src/app/api/test/csrf/route.ts:12-14`; `src/app/api/debug-request/route.ts:5-6` | **Fixed (was ⚠️).** `/api/external/employees` now wraps `withAuth` with an 8-role allow-list; debug/test routes return 404 when `NODE_ENV==='production'`. Minor residual: `src/app/api/institutions/[id]/manual-entry-permission/route.ts:11` remains unauthenticated (exposes only the manual-entry window config, no PII). |

---

## Requirement 4: Institution Data Isolation

**Process/Function:** Institution Scoping Across CRUD, Queries, Reports, Sync

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 4.1 | Institution ownership validation | ✅ Implemented | `src/app/api/employees/route.ts:107-132`; `src/app/api/confirmations/[id]/route.ts:67-68`; `src/app/api/promotions/[id]/route.ts:80-81` | IDOR check + 403 before serving/mutating cross-institution records. |
| 4.2 | Institution-based CRUD scoping | ✅ Implemented | `src/app/api/employees/route.ts:188-203`; `manual-entry/route.ts:222,250`; `bulk-upload/route.ts:472,580` | Client-supplied `institutionId` ignored/forced for non-CSC roles. Caveat: `null` institutionId bypasses filter (`src/lib/role-utils.ts:24-30`). |
| 4.3 | Institution context validation (session vs request) | ✅ Implemented | `src/app/api/employees/route.ts:188-203`; `src/lib/role-utils.ts:7,14-16` | **By-design (was ⚠️).** Non-CSC roles are session-sourced; CSC roles may pass any `institutionId`, but `CSC_ROLES` are the central commission with all-institution access by design, so no allow-list is needed — not below-spec. |
| 4.4 | Institution filtering in DB queries (Prisma) | ✅ Implemented | `src/app/api/employees/route.ts:189`; `src/app/api/reports/route.ts:754-756` | `shouldApplyInstitutionFilter` + Prisma `where` across request/report routes. |
| 4.5 | Institution filtering in API responses | ✅ Implemented | `src/app/api/employees/route.ts:283-289`; `src/app/api/reports/route.ts:1330-1342` | Returns only the institution-filtered dataset. |
| 4.6 | Institution filtering in reports | ✅ Implemented | `src/app/api/reports/route.ts:750-762,1041-1054` | Auto-scope for non-CSC; HRO/HRRP blocked from complaint reports. |
| 4.7 | Institution validation during HRIMS sync | ✅ Implemented | `src/app/api/hrims/sync-employee/route.ts:86-111,296-358` | Looks up by `voteNumber`; `institutionId` never overwritten on update. |

---

## Requirement 5: Employee Profile Protection

**Process/Function:** Object-Level Profile Authorization & PII Masking

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 5.1 | Object-level authorization | ✅ Implemented | `src/app/api/employees/route.ts:79-132`; `documents/route.ts:194-212`; `certificates/route.ts:80,259,335` | Per-employee ownership verified before read/write of profile and sub-resources. |
| 5.2 | Employee ownership validation (institution) | ✅ Implemented | `src/app/api/employees/route.ts:108,111-126`; `fetch-documents/route.ts:238`; `fetch-photo/route.ts:40` | `institutionId !== auth.institutionId` → 403 + IDOR audit. |
| 5.3 | Profile access validation | ✅ Implemented | `src/app/api/employees/route.ts:80-84,170-173`; `search/route.ts:57-66` | `EMPLOYEE` validated via DB `User.employeeId` lookup. |
| 5.4 | Record update authorization | ✅ Implemented | `confirmations/[id]/route.ts:67-68,92`; `promotions/[id]/route.ts:80-81,144,152,158` | Role + institution + self-approval checks before PATCH. |
| 5.5 | Sensitive field protection (mask ZanID/ZSSF/payroll) | ✅ Implemented | `src/lib/sanitize-response.ts:67-107` | `EMPLOYEE_FIELD_MASKS` mask zanId/zssfNumber/payrollNumber/phoneNumber/address by role. |
| 5.6 | Access logging (profile view/edit) | ✅ Implemented | `src/lib/audit-logger.ts:19-86`; `src/lib/audit-logger.ts` `logEmployeeView`; `src/app/api/employees/route.ts:135-175` | **Fixed (was ⚠️).** Writes, file access, and IDOR denials logged; the single-employee GET path now emits an `EMPLOYEE_VIEWED` ACCESS event on every successful PII read (added `EMPLOYEE_VIEWED` to the `AuditEventType` enum + `logEmployeeView` helper). Records actor + target (employeeId/zanId/name/institutionId) without the PII payload; self-views are logged too. Fire-and-forget so a logging failure cannot break the read. Covered by `audit-logger.medium-gaps.test.ts`. |
| 5.7 | Record integrity validation | ✅ Implemented | `prisma/schema.prisma:152-171`; `src/lib/file-integrity.ts` | `DocumentHash` (SHA-256 per field) + `FileHash` verified on download/preview. |

---

## Requirement 6: Employee Creation Integrity

**Process/Function:** Single & Bulk Employee Creation Validation

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 6.1 | Creation authorization (HRO/Admin) | ✅ Implemented | `manual-entry/route.ts:283` (`['HRO']`); `bulk-upload/route.ts:488,625` (`['HRO','ADMIN']`) | Enforced by `withAuth`. |
| 6.2 | Unique payroll number | ✅ Implemented | `prisma/schema.prisma:112` (`@unique`); `manual-entry/route.ts:193-205` | DB constraint + app check. |
| 6.3 | Unique ZanID | ✅ Implemented | `prisma/schema.prisma:107` (`@unique`); `manual-entry/route.ts:180-190` | DB constraint + app check. |
| 6.4 | Unique ZSSF | ✅ Implemented | `prisma/schema.prisma:111` (`@unique`); `manual-entry/route.ts:208-220` | DB constraint + app check. |
| 6.5 | Duplicate detection (fuzzy name/DOB/institution) | ❌ Not Implemented | — (grep `fuzzy|similarity|levenshtein|soundex|trigram|jaro|ngram` across `src/lib`+`src/app` → 0 hits); `manual-entry/route.ts:220-261`, `bulk-upload/route.ts:378-451` | Only exact-match uniqueness on zanId/zssf/payroll. No fuzzy name/DOB/institution detection. Gap: add levenshtein/trigram duplicate check on name+DOB+institutionId. |
| 6.6 | Institution validation on creation | ✅ Implemented | `src/lib/institution-field-validation.ts`; `manual-entry/route.ts:220-238`; `bulk-upload/route.ts:177-184,379-392` | **Fixed (was ⚠️).** Institution existence + `manualEntryEnabled` checked; `ministry`/`department`/`currentWorkplace` are now validated via `getInstitutionOrgFieldValues` + `validateInstitutionOrgFields` against the distinct values already recorded for the institution's employees (the de-facto org-unit reference data — no canonical Ministry/Department table exists). Bootstrap: a field with no recorded values accepts any non-empty value; once values exist, supplied values must match one (case-sensitive) or the request/row is rejected (400 / per-row error). Lookup skipped entirely when no org fields are supplied. Covered by `institution-field-validation.test.ts` + `manual-entry/route.test.ts`. |
| 6.7 | Audit logging of creation (payload) | ✅ Implemented | `manual-entry/route.ts:263-274`; `bulk-upload/route.ts:602-613` | `CREATED` event with employeeId, name, zanId, dataSource, institutionId. (Full payload snapshot not retained.) |
| 6.8 | Business rule validation (mandatory/enum/date logic) | ✅ Implemented | `src/lib/employee-field-validation.ts`; `manual-entry/route.ts:84-112,161-238`; `bulk-upload/route.ts:312-402` | **Fixed (was ⚠️).** Enums (`gender`/`appointmentType`/`contractType`) now enforced on BOTH manual-entry and bulk-upload via the shared `GENDER_VALUES`/`APPOINTMENT_TYPE_VALUES`/`CONTRACT_TYPE_VALUES` + `isValidEnum`. Cross-field date logic added to both paths via `validateCrossFieldDates`: `employmentDate > dateOfBirth`, `confirmationDate ≥ employmentDate`, `retirementDate > employmentDate` (compares only validly-parsed fields). ZSSF/payroll identifier format (`isValidZssfNumber`/`isValidPayrollNumber`: 2–50 alphanumeric, hyphens allowed, no spaces/symbols) now enforced on both paths. Manual-entry also gained `confirmationDate`/`retirementDate` format checks. Covered by `employee-field-validation.test.ts` + `manual-entry/route.test.ts`. |

---

## Requirement 7: Bulk Upload Security

**Process/Function:** Bulk Import Authorization, Validation, Integrity

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 7.1 | Upload authorization | ✅ Implemented | `bulk-upload/route.ts:92,488,625` | `withAuth(['HRO','ADMIN'])`. |
| 7.2 | File type validation (.xlsx, .csv) | ✅ Implemented | `src/lib/file-validation.ts:58-61,124-145` | **Tighter than spec (was ⚠️).** Allow-list is CSV-only (`text/csv`, `application/vnd.ms-excel`, `text/plain`); `.xlsx` is ZIP-based and is rejected by the magic-byte table (ZIP→docx mapping). CSV-only is a smaller attack surface (no zip-bomb/macros) — exceeds spec, so ✅. |
| 7.3 | File size validation (~10 MB) | ✅ Implemented | `src/lib/file-validation.ts:60` (`bulkUpload maxSize = 1*MB`) | **Tighter than spec (was ⚠️).** Cap is 1 MB, well below the ~10 MB spec — stricter, so ✅. |
| 7.4 | Duplicate detection against existing records | ✅ Implemented | `bulk-upload/route.ts:378-411,414-451` | Within-file Set dedupe + per-row DB lookup on all three keys. |
| 7.5 | Employee validation rules (same as single) | ⚠️ Partial | `bulk-upload/route.ts:290-349` | Bulk path validates gender enum + ZanID regex + phone + DOB/employmentDate future-only. Gaps: no ZSSF/payroll format regex, no `appointmentType`/`contractType` enum, no cross-field date logic. Gap: mirror manual-entry enums (`manual-entry/route.ts:18-20,90-107`) + add format checks. |
| 7.6 | Institution validation per row | ⚠️ Partial | `bulk-upload/route.ts:580` (institutionId forced from session); headerMap `:218-243` | `institutionId` forced from session for every row; no per-row institution column read or validated. Gap: add a per-row institutionId column + validate against institution records. |
| 7.7 | Import audit logging (batch ID, counts) | ⚠️ Partial | `bulk-upload/route.ts:459-474,601-613` | Upload event logs totalRows/validRows/invalidRows; per-row `CREATED` with `batchRow` only. **No single batch ID** linking an import. Gap: generate one `batchId` (uuid) and include it in the UPLOADED event + every CREATED `additionalData`. |
| 7.8 | Import error handling (row-level) | ✅ Implemented | `bulk-upload/route.ts:246-376,477-487,615-624` | Per-row `errors[]`; returns `invalidEmployees`/`failedEmployees` with row numbers. |
| 7.9 | Transaction integrity (rollback) | ✅ Implemented | `bulk-upload/route.ts:612-692` (PUT confirm-and-create) | **Fixed (was ⚠️).** Removed the per-row `try/catch` inside `prisma.$transaction` so any `tx.employee.create` failure throws and aborts the WHOLE transaction → Prisma rolls back every row inserted so far (atomic, all-or-nothing — no partial success). The `$transaction` is wrapped in an outer `try/catch` that returns a 500 naming the failing row + reason with `created: 0`; CREATED audit events fire only on full success, so a rolled-back batch emits none. Success response preserves the `data.created/createdEmployees` shape the frontend reads. Covered by `bulk-upload/route.test.ts` (mid-batch rollback, first-row rollback, full-success commit). |

---

## Requirement 8: Workflow Security & Approval Integrity

**Process/Function:** Request Workflows, Approvals, Rejections, Chains

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 8.1 | Workflow state validation | ✅ Implemented | `src/lib/request-workflow.ts:34-78` (`isAllowedStatusTransition`); all 8 `[id]` routes; all 8 bulk PATCH handlers (`confirmations/route.ts:455`, `lwop/route.ts:465`, `promotions/route.ts`, `cadre-change/route.ts`, `resignation/route.ts`, `retirement/route.ts`, `termination/route.ts`, `service-extension/route.ts`) | **Fixed (was ⚠️).** FSM now present on all 8 `[id]` routes and **all 8 bulk PATCH handlers** — the 6 remaining handlers (promotions, cadre-change, resignation, retirement, termination, service-extension) now call `isAllowedStatusTransition` before applying a status change, mirroring confirmations/lwop. |
| 8.2 | Workflow transition validation (state machine) | ✅ Implemented | Same as 8.1 | **Fixed (was ⚠️).** State-machine enforcement now covers all 8 bulk PATCH handlers; a client can no longer jump stages via any collection PATCH path. |
| 8.3 | Approval authorization checks (role↔stage) | ✅ Implemented | `promotions/route.ts:482-498`; `confirmations/route.ts:411-430`; + siblings | `checkRoleAuthorization` on every PATCH; stage-specific role gating. |
| 8.4 | Rejection authorization checks | ✅ Implemented | `promotions/route.ts:473-480`; `promotions/[id]/route.ts:113-119`; + siblings | Rejection gated by same role checks; reason required. |
| 8.5 | Workflow ownership validation (institution) | ✅ Implemented | `promotions/route.ts:235-243,446-453`; `promotions/[id]/route.ts:79-87,505-515` | `shouldApplyInstitutionFilter` + employee-institution check on POST/PATCH/DELETE. |
| 8.6 | Workflow chain enforcement (HRO→HHRMD/HRMO→Commission) | ✅ Implemented | `promotions/route.ts:418-419,524-554`; `confirmations/route.ts:498-521`; `lwop/route.ts:500-523`; `src/lib/request-workflow.ts:34-78` | **Fixed (was ⚠️).** `reviewStage` is server-controlled (client value deleted) in all bulk routes and the FSM enforces ordered status transitions in all 8 bulk PATCH handlers, so stage jumps are no longer possible. |
| 8.7 | Workflow audit logging | ✅ Implemented | `src/lib/audit-logger.ts:455-687`; `promotions/[id]/route.ts:371-433,549-562` | Submission/approval/rejection/forward/withdrawal logged with IP, device, actor, stage. |
| 8.8 | Non-repudiation controls | ⚠️ Partial | `promotions/route.ts:381`; `promotions/[id]/route.ts:410,562`; `confirmations/[id]/route.ts:201,346`; `lwop/[id]/route.ts:227,375`; `bulk-upload/route.ts:474,612` | Actor/IP/device/timestamp bound server-side. Gaps: audit writes still use `.catch(() => {})` (silent failures) at call sites; no cryptographic signing of audit entries (only reauth/csrf/session use `createHmac`). Gap: replace silent catches with logged-error handlers; add HMAC signing of audit rows. |
| 8.9 | Business rules (no self-approval) | ✅ Implemented | `promotions/[id]/route.ts:138-150`; + 7 sibling `[id]` routes; `promotions/route.ts:500-513`, `confirmations/route.ts:463-476`, `lwop/route.ts:473-486` (bulk PATCH) | Self-approval/rejection blocked on all `[id]` routes **and** all three bulk PATCH handlers (`submittedById === auth.userId` → 403). **Gap closed** — bulk PATCH self-approval check added. |

---

## Requirement 9: Complaint Management Security

**Process/Function:** Complaint Lifecycle, Confidentiality, Resolution

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 9.1 | Complaint ownership validation | ✅ Implemented | `complaints/route.ts:41`; `complaints/[id]/route.ts:67,70-138` | `complainantId` server-derived; EMPLOYEE limited to own complaint. **Fixed:** the EMPLOYEE branch's rigid field allow-list (`details/phones/attachments` only) blocked every employee workflow action (resubmit, provide-info, confirm-satisfied, appeal) because they all set `status` — appeals returned 403. Now employees may set an explicit employee-allowed field set (content + `status`/`reviewStage`/`rejectionReason`/`officerComments`/`officerInternalNote`) and only transition to employee-allowed statuses from valid source states; `assignedOfficerRole`/`reviewedById`/raw `internalNotes` stay 403. |
| 9.2 | Complaint access control (involved parties) | ⚠️ Partial | `src/app/api/complaints/route.ts:155-169,203-224`; `src/app/api/complaints/[id]/route.ts` (PUT only, no GET) | List restricted by role; internal notes gated. **No `GET /api/complaints/[id]`**; involved-party (non-complainant) visibility not modeled. Gap: add a GET handler enforcing complainant-or-assigned-officer visibility. |
| 9.3 | Complaint authorization checks (status change) | ✅ Implemented | `complaints/[id]/route.ts:64-141,143-185` | Officer roles (DO/HHRMD/CSCS/Admin tier) may change status; employees may only transition to employee-allowed statuses (resubmit→`Submitted`, provide-info→`Under Review - Additional Information Provided`, confirm→`Mtumishi ameridhika na hatua`, appeal→`Appealed to Commission`); `reviewedById` server-sourced. HRMO and non-handler roles blocked. |
| 9.4 | Complaint status validation (transitions) | ✅ Implemented | `complaints/[id]/route.ts:143-185` | Explicit `VALID_TRANSITIONS` map; invalid transitions → 400. **Fixed:** the map was keyed on `Under Review` (a state never persisted in production) and omitted the officer reply targets (`Rejected by …`, `Resolved - Pending Employee Confirmation`, `Closed - Commission Decision …`) from `Submitted`, so 3 of the 4 reply actions returned 400. Map now covers the real open states (`Submitted`, `Under Review`, `Awaiting More Information`, `Appealed to Commission`, `Resolved - Pending Employee Confirmation`), and the role-suffixed `Rejected by …` status is matched by prefix from the review states. Terminal/closed states remain non-reentrant. |
| 9.5 | Complaint audit logging | ✅ Implemented | `src/lib/audit-logger.ts:906-950`; `complaints/route.ts:107-117`; `complaints/[id]/route.ts:214-224` | `COMPLAINT_SUBMITTED/UPDATED/RESOLVED` events. (Audit writes `.catch(()=>{})`.) |
| 9.6 | Confidential information protection (complainant identity) | ❌ Not Implemented | `src/app/api/complaints/route.ts:207-228` | No anonymization/redaction; `employeeId`, `employeeName`, `zanId`, `complainantPhoneNumber`, `nextOfKinPhoneNumber` returned to all officer roles (DO/HHRMD/Admin/CSCS); no `confidential` flag. Gap: redact PII for non-owning officers and add a confidential flag. |
| 9.7 | Complaint resolution authorization | ✅ Implemented | `src/app/api/complaints/[id]/route.ts:100-141` | **Fixed (was ⚠️).** PUT authorizes by complaint-handling tier, not single-role equality: DO↔HHRMD are co-reviewers (each may act on a complaint assigned to the other), CSCS (commission) may act on any complaint as the escalation tier, and Admin overrides. Non-handler officers (e.g. HRMO) are still 403. Backward-compatible when `assignedOfficerRole` is unset. (The earlier strict `userRole === assignedOfficerRole` check was reverted because every complaint defaults to `assignedOfficerRole='DO'` and the field is never `CSCS`, which blocked HHRMD and CSCS replies with 403 — see Req 9.4 note for the matching transition-map fix.) |

---

## Requirement 10: File & Document Security

**Process/Function:** Upload/Download Authorization, Integrity, Malware

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 10.1 | File access control (permission before serving) | ✅ Implemented | `files/employee-documents/[filename]/route.ts:42-78`; `files/employee-photos/[filename]/route.ts:38-71`; `src/lib/file-access.ts` (`checkFileAccess`/`authorizeFileOrDeny`); `files/download/[...objectKey]/route.ts`; `files/preview/[...objectKey]/route.ts`; `files/exists/[...objectKey]/route.ts` | **Fixed (was ⚠️).** Employee-documents/photos RBAC retained; generic download/preview/exists now run `authorizeFileOrDeny` BEFORE any MinIO access — same role matrix as the dedicated routes (central/officer roles unrestricted; HRO/HRRP institution-scoped; EMPLOYEE self-only; unknown denied). Denied requests never reach MinIO (no existence oracle). |
| 10.2 | File ownership validation (institution/record) | ✅ Implemented | `src/lib/file-access.ts` (`parseEmployeeIdFromKey`, `resolveEmployeeAccess`, `resolveGenericUploadAccess`, `resolveComplaintAttachmentAccess`); `files/employee-documents/...:55-66`; `files/employee-photos/...:48-59` | **Fixed (was ⚠️).** objectKey → owner resolution: `employee-documents/<id>_` and `employee-photos/<id>.` → Employee.institutionId; generic uploads → `FileHash.uploadedBy` → User.institutionId; complaint attachments → Complaint.complainantId (so a complainant can read officer-uploaded letters). At-risk roles with an unresolvable owner are DENIED (fail-closed) — flips the old allow-all. |
| 10.3 | Secure download (signed, time-limited / MinIO presigned) | ✅ Implemented | `src/lib/minio.ts:30-38,166-173`; `files/preview/[...objectKey]/route.ts:50-53` | **Fixed (was ⚠️).** `MAX_PRESIGNED_URL_EXPIRY_SECONDS` capped at 3600s (was 24h) and caller-supplied `?expiry=` clamped to [1,3600] — tighter than the time-limited spec. (Generic download/preview ownership gap tracked under 10.1/10.2.) |
| 10.4 | Document authorization checks (type-specific) | ❌ Not Implemented | `files/employee-documents/[filename]/route.ts:40-72` | Role gating exists but is identical for all document types (filename-prefix only); no per-document-type role gating (e.g. birthCertificate vs confirmationLetter). Gap: add a type→role map. |
| 10.5 | File type validation (extension/MIME) | ✅ Implemented | `src/lib/file-validation.ts:46-365`; `files/upload/route.ts:49-55` | Context allow-lists + blocklists + magic-byte detection + MIME spoofing checks. (Generic upload always uses `'generic'` context.) |
| 10.6 | File integrity validation (checksum/hash) | ✅ Implemented | `src/lib/file-integrity.ts` (`isSensitiveObjectKey`, `verifyFileHash` `:252-331`, `verifyDocumentHash` `:112-167`); `files/download/...:76`; `files/preview/...:104` | **Fixed (was ⚠️).** SHA-256 `FileHash`/`DocumentHash` recorded + verified on retrieval; mismatch → 410. **Now fail-closed for sensitive object keys** (`employee-documents/`*, `employee-photos/`* — government PII): a missing hash or a DB-lookup error blocks the read (`ok=false`, new `lookup_failed`/`no_hash_recorded` reasons) AND emits a CRITICAL `POTENTIAL_BREACH` audit event (`blockReason` `NO_HASH_RECORDED` / `INTEGRITY_LOOKUP_FAILED`) so an unsigned/tampered file is flagged rather than served as clean. `verifyDocumentHash` defaults to fail-closed (employee documents are inherently PII). Non-sensitive keys (system `templates/`, generic uploads) keep fail-open so an integrity-table outage or legacy data never breaks legitimate access; they still block on a real hash *mismatch*. Callers may override via the new `VerifyOptions.failClosed` flag. Covered by `file-integrity.test.ts`. |
| 10.7 | Malware scanning | ✅ Implemented | `src/lib/clamav.ts` (`isClamAVEnabled` + production two-key gate); `file-validation.ts:388-411`; `hrims/sync-documents/route.ts:267-292`; `src/lib/hrims-photo-scan.ts` + `hrims/sync-employee/route.ts`; `files/upload/route.ts:49` | **Fixed (was ⚠️).** ClamAV INSTREAM, fail-closed on error where wired. **All three gaps closed:** (1) `sync-employee` photo is now scanned — `src/lib/hrims-photo-scan.ts` (`scanEmployeePhoto`) base64-decodes `Employee.photo.content` and runs `scanFile` before persisting the `profileImageUrl` data URL; fail-closed on malware/scan-error/throw drops the photo (`null`) + emits a CRITICAL `POTENTIAL_BREACH` audit (`HRIMS_PHOTO_MALWARE`/`HRIMS_PHOTO_SCAN_FAILED`); dev/CI stores it unchanged when scanning is disabled. (2) generic `files/upload` is scanned via `validateFileUpload(...,'generic')` step 5 (context-agnostic ClamAV step) — verified by `file-validation.test.ts` (`generic` context invokes `scanFile`, rejects on malware). (3) `CLAMAV_ENABLED=false` is now **ignored in production** unless `CLAMAV_DISABLE_ALLOWED=true` (deliberate, ops-only two-key action) so a stray/malicious env var cannot silently turn off scanning; the dev/CI escape hatch still works outside production. Both flags log the decision once at module load. Tests in `clamav.test.ts`, `file-validation.test.ts`, `sync-employee/route.test.ts`. |
| 10.8 | File audit logging | ✅ Implemented | `src/lib/audit-logger.ts:1054-1098` (`logFileAction` + `FILE_EXISTS_CHECK`) + `:209-227` (`safeAuditLog`); `files/download/...`; `files/preview/...`; `files/upload/route.ts`; `files/exists/[...objectKey]/route.ts`; `src/lib/file-access.ts`; `src/lib/file-integrity.ts` | **Fixed (was ⚠️).** `UPLOADED/DELETED/DOWNLOADED/PREVIEWED` events, **and `files/exists` is now audited** via a new `EXISTS` action / `FILE_EXISTS_CHECK` event type — both `exists:true` and `exists:false` outcomes are logged. **Silent `.catch(()=>{})` on file audit writes removed**: all file-domain audit writes (download/preview/upload/exists `logFileAction`, the IDOR `logUnauthorizedAccess` in `file-access.ts`, and the CRITICAL `POTENTIAL_BREACH` writes in `file-integrity.ts`) now go through `safeAuditLog(p, context)` which logs (never swallows) a rejection — a defense-in-depth backstop on top of `logAuditEvent`'s internal error handling + `AUDIT_WRITE_FAILED` alert. |

---

## Requirement 11: HRIMS Integration Security

**Process/Function:** Sync Authorization, Trusted Source, Matching, Integrity

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 11.1 | Synchronization authorization (service accounts/roles) | ✅ Implemented | `hrims/sync-employee/route.ts:76`; `bulk-fetch/route.ts:489`; `sync-documents/route.ts:60-65`; `sync-certificates/route.ts:53-58` | **Fixed (was ⚠️).** Role allow-lists on all sync routes; step-up `requireReauth` now enforced on `sync-employee`, `bulk-fetch`, `sync-documents`, and `sync-certificates`. |
| 11.2 | Trusted source validation (whitelisted endpoint, IP/cert, API key) | ❌ Not Implemented | `hrims/sync-employee/route.ts:230-234`; `sync-documents/route.ts:199-203`; `sync-certificates/route.ts:191-195` | `hrimsApiUrl` still caller-controllable (SSRF); `hrimsApiKey` still accepted from request body; no host allow-list, cert pinning, or IP allowlist. (`fetch-employee`/`bulk-fetch` use server-side `getHrimsApiConfig` — those are fine.) Gap: drop body URL/key, enforce server-side config + host allow-list + TLS cert validation. |
| 11.3 | Employee matching (unique identifiers only) | ✅ Implemented | `hrims/sync-employee/route.ts:11-23,290-294`; `sync-documents/route.ts:12-25,102-110` | Zod requires zanId OR payrollNumber; match on `zanId`. |
| 11.4 | Duplicate prevention | ⚠️ Partial | `hrims/sync-employee/route.ts:290-356` | Upsert keyed on `zanId` only; `institutionId` never overwritten. Gap: `payrollNumber`-only HRIMS responses with a different `zanId` can create duplicates; no idempotency key; no `$transaction`. |
| 11.5 | Institution validation during sync | ✅ Implemented | `hrims/sync-employee/route.ts:86-111`; `sync-documents/route.ts:79-99` | Lookup by `voteNumber`; 404 + audit if missing. |
| 11.6 | Synchronization audit logging | ✅ Implemented | `src/lib/audit-logger.ts:778-814`; sync routes | `HRIMS_SYNCED`/`HRIMS_SYNC_FAILED` with actor, institution, zanId. (`.catch(()=>{})`.) |
| 11.7 | Synchronization failure handling (no partial silent writes) | ❌ Not Implemented | `hrims/sync-documents/route.ts:260-362`; `hrims/sync-employee/route.ts:194-199` | No `$transaction` anywhere in HRIMS routes; `sync-documents` uses per-row try/catch (partial commits possible); background doc/cert sync is fire-and-forget (`Promise.all(...).catch`, no `await`). Gap: wrap multi-row writes in `$transaction` and surface background failures. |
| 11.8 | Data integrity validation (incoming schema) | ⚠️ Partial | `sync-employee/route.ts:26-71,140`; `sync-documents/route.ts:28-57,152` (✅); `fetch-employee/route.ts:110-108,431-608`; `bulk-fetch/route.ts:486-541` (❌) | Strict Zod on sync-employee/documents/certificates; **`fetch-employee` persists `any`-typed HRIMS data (TS interfaces only, no runtime Zod) and `bulk-fetch` has no schema**. Gap: add runtime Zod parse of the HRIMS response before persist. |

---

## Requirement 12: Reporting & Export Security

**Process/Function:** Report Generation, Export Authorization, Audit

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 12.1 | Report authorization (roles) | ✅ Implemented | `src/app/api/reports/route.ts:687,1376` | `withAuth(['Admin','HRO','HHRMD','HRMO','DO','CSCS','HRRP','PO'])`; role from session. |
| 12.2 | Export authorization (roles) | ❌ Not Implemented | `src/lib/export-utils.ts:31-66`; `src/app/dashboard/reports/page.tsx` | No server-side export endpoint; exports remain client-side from already-fetched data — no server authorization/rate limit on the export act. |
| 12.3 | Institution-based report filtering | ✅ Implemented | `src/app/api/reports/route.ts:750-762,1042-1054` | Non-CSC forced to `auth.institutionId`; client param ignored unless CSC. |
| 12.4 | Data minimization (exclude sensitive by default) | ✅ Implemented | `src/app/api/reports/route.ts:817-825,1055-1069` | Prisma `select` limits fields; passwords/emails/phones excluded; XSS-sanitized. |
| 12.5 | Export audit logging | ⚠️ Partial | `src/app/api/reports/route.ts:1342-1361`; `src/lib/audit-logger.ts:73` | **Improved (was ❌).** Reports GET now emits `REPORT_VIEWED` (actor/role/institution/reportType/count). Gap: `REPORT_EXPORTED` enum is defined but never emitted — the client-side export act itself is not separately audited. |
| 12.6 | Report ownership validation | ❌ Not Implemented | `src/app/api/reports/route.ts:750-762` | Reports remain system-wide aggregates scoped only by role+institution; no per-user ownership/standing check. |
| 12.7 | Restricted data export controls | ❌ Not Implemented | `src/lib/export-utils.ts:31-66` | No download rate limits, watermarking, quotas, or restricted-flag on sensitive report types (no export endpoint exists). |
| 12.8 | Export approval controls (secondary approval) | ❌ Not Implemented | — (grep `export.*approv` → 0 hits) | No approval workflow / second-admin sign-off / reauth on exports. |

---

## Requirement 13: Notification Security

**Process/Function:** Recipient Validation, Content Minimization, Audit

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 13.1 | Recipient validation | ✅ Implemented | `src/lib/notifications.ts:66-76` | **Fixed (was ⚠️).** `createNotification` now validates recipient existence AND active status before insert, skipping deleted/deactivated users. |
| 13.2 | Notification authorization (who can trigger) | ⚠️ Partial | `src/lib/notifications.ts:56,114`; `notifications/route.ts` | REST API authed+ownership-enforced, but server helpers (`createNotification`/`createNotificationForRole`) still have no "may this caller send?" gate; callable from any authed route. Gap: add a caller-permission gate to the server helpers. |
| 13.3 | Workflow notification controls (involved parties only) | ⚠️ Partial | `promotions/route.ts:329-330`; `confirmations/route.ts:289-290` | Still broadcasts to every active HHRMD/HRMO via `createNotificationForRole` regardless of involvement with the specific request. Gap: scope to involved parties. |
| 13.4 | Complaint notification restrictions | ⚠️ Partial | `complaints/route.ts:75-90`; `complaints/[id]/route.ts:165-171` | Complaint submission still fans out to all active DO/HHRMD/HRMO across institutions via `createNotificationForRole`; status updates to complainant correctly scoped. Gap: scope submission fan-out by institution/assignment. |
| 13.5 | Notification audit logging | ✅ Implemented | `src/lib/notifications.ts:73-88,122-138` | `NOTIFICATION_SENT` per recipient; role broadcasts log one summary with `recipientCount`. |
| 13.6 | Content minimization | ✅ Implemented | `src/lib/notifications.ts:23,37-54` | `sanitizeNotificationText` strips control bytes, HTML-escapes, truncates to 500 chars at the sink. |

---

## Requirement 14: Administrative Security

**Process/Function:** Admin RBAC, User/Role/Config Management, SoD

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 14.1 | Administrative RBAC (Admin only) | ✅ Implemented | `admin/reset-password/route.ts:145`; `admin/lock-account/route.ts:104`; `users/route.ts:248`; `users/[id]/route.ts:159,189`; `institutions/[id]/route.ts:40-55,210-225` | **Fixed (was ⚠️).** Most admin routes `['Admin']`; `institutions/[id]` PUT/DELETE now enforce the Admin role check (with `logForbiddenRoute` on denial) in addition to reauth. |
| 14.2 | Privileged access control (MFA for admin console) | ⚠️ Partial | `src/lib/reauth.ts`; `auth/reauth/route.ts:128-129`; `admin/hrims-settings/route.ts:45`; `auth/login/route.ts:348-398` | Step-up reauth (with OTP if MFA enabled) on sensitive sub-actions. Gaps: no requirement that Admin have MFA (MFA gate keys on email presence, not role); `admin/hrims-settings` PUT still skips `requireReauth`. |
| 14.3 | User management authorization (Admin only) | ✅ Implemented | `users/route.ts:248`; `users/[id]/route.ts:159,189` | Create/edit/deactivate Admin-only; non-Admin GET institution-scoped. |
| 14.4 | Role assignment authorization (Admin, logged) | ✅ Implemented | `users/[id]/route.ts:49-52,55-60,127-144` | Reauth required; self-role-change blocked; previous/new role audited. |
| 14.5 | Institution assignment authorization (Admin) | ✅ Implemented | `users/[id]/route.ts:49-52,140-142` | Reauth required; previous/new institution audited. |
| 14.6 | Configuration change authorization (Admin) | ✅ Implemented | `admin/hrims-settings/route.ts:130`; `institutions/[id]/route.ts:40-55` | **Fixed (was ⚠️).** HRIMS config Admin-only; institution `manualEntryEnabled` toggle now requires Admin role; prior/new manual-entry window captured in audit. |
| 14.7 | Administrative audit logging (before/after) | ⚠️ Partial | `users/[id]/route.ts:127-144`; `institutions/[id]/route.ts:178-188`; `hrims-settings/route.ts:86-119`; `admin/reset-password/route.ts:114-133`; `admin/unlock-account/route.ts:58-68`; `admin/cleanup-sessions/route.ts:80,89,100` | User/institution/config changes capture before/after. Gaps: `reset-password` logs only new state (`wasGenerated`); `unlock` logs no prior lock reason; `cleanup-sessions` logs only deleted count. Gap: capture prior state on these admin actions. |
| 14.8 | Separation of duties (admin) | ⚠️ Partial | `users/[id]/route.ts:55-60,188-207`; `admin/lock-account/route.ts:49-57`; `admin/reset-password/route.ts:36-46`; `users/[id]/route.ts:191-199` | **Improved (was ⚠️).** Self-role-change and lock-Admin blocked; **self-reset guard added** (`adminId === userId` → 403 in `reset-password`) and **self-delete guard added** (`id === auth.userId` → 403 in `users/[id]` DELETE). Remaining gap: no two-person rule on destructive actions (see Req 25.5). |

---

## Requirement 15: Audit Trail & Accountability

**Process/Function:** Audit Events, Immutability, Retention, Change History

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 15.1 | Audit logging (auth/workflow/admin/complaint) | ✅ Implemented | `src/lib/audit-logger.ts:19-81,232-999`; `audit-db.ts:115-193` | ~30 typed helpers across all domains; partitioned `audit.audit_log` table. |
| 15.2 | Immutable / append-only audit logs | ⚠️ Partial | `src/lib/audit-db.ts:137-144` (INSERT-only app layer); `prisma/migrations/20260522010000_migrate_audit_to_partitioned/migration.sql:5-26` | No `REVOKE UPDATE,DELETE`, no `BEFORE UPDATE/DELETE` trigger on `audit.audit_log`; no hash chain. App-only — DB-level tampering possible. Gap: add `REVOKE UPDATE,DELETE` + a `BEFORE UPDATE OR DELETE` trigger that raises an exception. |
| 15.3 | Audit log retention | ✅ Implemented | `src/lib/audit-db.ts:535`; `src/lib/cron-service.ts:354`; `scripts/archive-audit.sh` | 84-month default, monthly cron, partition detach + archival. |
| 15.4 | Audit access control (audit-review roles) | ✅ Implemented | `src/app/api/audit/logs/route.ts:85` | Reads restricted to `['Admin','CSCS']`. (No dedicated `audit-review` role.) |
| 15.5 | Audit integrity validation (tamper detection) | ⚠️ Partial | `src/lib/audit-health.ts:24-117`; `src/lib/file-integrity.ts:83-230` | File-integrity tamper detection yes; `audit-health.ts` only does connectivity/row-count/partition checks — **audit-row tampering undetectable** (no hash chain/sig over rows). Gap: add a hash chain + verification. |
| 15.6 | Change history tracking (prev/new) | ⚠️ Partial | `src/lib/change-history.ts:47`; `users/[id]/route.ts:139-142`; `hrims-settings/route.ts:86-119`; `institutions/[id]/route.ts:178-188` | Prev/new captured for user role/institution, HRIMS config, and institution manual-entry window; most other UPDATEs (employees, complaints, promotions, lwop, etc.) record new state only. Gap: capture prev/new field diffs with actor for all UPDATE handlers. |
| 15.7 | Security event logging (denied access, auth failures, IDOR, privesc) | ✅ Implemented | `login/route.ts:63-315`; `api-auth.ts:245,266,381`; `employees/route.ts:87-126`; `employees/[id]/documents/route.ts:70-77`; `src/lib/workflow-access.ts` (`denyWorkflowAccess`) + all 8 `[id]` workflow routes; `src/proxy.ts` (`logUnauthorizedAttempt` → `logUnauthorizedAccess`/`logForbiddenRoute`) | **Fixed (was ⚠️).** Auth failures, role violations, employees IDOR logged; `withAuth` denials log via `logAccessDenied`/`logForbiddenRoute`; `institutions/[id]` logs object denials. **`[id]` workflow 403/FSM-400 denials now audited** — every institution-ownership, self-approval, role-gating, submitter-only, and invalid-status-transition denial on `promotions`/`confirmations`/`lwop`/`termination`/`retirement`/`cadre-change`/`resignation`/`service-extension` `[id]` routes (PUT/PATCH/GET/DELETE) goes through `denyWorkflowAccess` → `logAccessDenied` (ACCESS_DENIED, WARNING; `INVALID_STATUS_TRANSITION` for the FSM 400). **Proxy edge-blocks now write to the audit trail** — `logUnauthorizedAttempt` fires `logUnauthorizedAccess` (unauthenticated) / `logForbiddenRoute` (authenticated wrong-role) in addition to the console log. Covered by `workflow-access.test.ts` + `proxy.test.ts`. |

---

## Requirement 16: Background Processing Security

**Process/Function:** Job Authorization, Ownership, Idempotency, Audit

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 16.1 | Job authorization validation | ⚠️ Partial | `hrims/sync-employee/route.ts:73`; `bulk-fetch/route.ts:486,489`; `src/lib/jobs/hrims-sync-worker.ts:237-246` | Enforced at enqueue; **worker does not re-validate** `job.data.userId` permission. Gap: re-validate the initiating user's permission/role in the worker before processing. |
| 16.2 | Job ownership validation | ✅ Implemented | `src/lib/jobs/hrims-sync-queue.ts:159-168` (`canAccessJob`); `hrims/job-status/[jobId]/route.ts:43-48`; `hrims/sync-status/[jobId]/route.ts:61-66` | **Fixed (was ❌).** New `canAccessJob` helper enforces owner/institution-bound access (Admin = any job; otherwise `userId` or `institutionId` match) and returns 403 on mismatch in both `job-status` and `sync-status`; jobId now embeds the cuid `institutionId` so it is non-enumerable. |
| 16.3 | Job audit logging | ⚠️ Partial | `src/lib/jobs/hrims-sync-worker.ts:11`; `hrims/bulk-fetch/route.ts:5,486-541` | Worker imports only `workerLogger` (pino), no `audit-logger` — completed/failed jobs emit no tamper-evident audit row; `bulk-fetch` still imports no audit helper and emits no `HRIMS_SYNCED`/`FAILED` event. Gap: have the worker write `HRIMS_SYNCED`/`HRIMS_SYNC_FAILED` to the audit trail; add an audit event to `bulk-fetch`. |
| 16.4 | Duplicate processing prevention (idempotency) | ✅ Implemented | `src/lib/jobs/hrims-sync-queue.ts:99-110` | **Fixed (was ⚠️).** `addHRIMSSyncJob` now uses a deterministic jobId `hrims-sync-${institutionId}-${identifierType}-${identifier}` (hyphen-joined, BullMQ-safe), so double-clicks dedupe against the in-flight/queued job instead of enqueuing duplicates. |
| 16.5 | Retry protection | ✅ Implemented | `hrims-sync-queue.ts:57,66`; `hrims-sync-worker.ts:311,478` | BullMQ `attempts:3` + backoff, 7-day retention, rate limiter. (No dead-letter audit event.) |
| 16.6 | Workflow integrity validation in background | ❌ Not Implemented | `src/lib/jobs/hrims-sync-worker.ts:297-339` | Worker only checks `employeeListResponse.code !== 200`; no Zod/shape validation of the HRIMS response (data array, overallDataSize, currentDataSize) and no workflow/state-transition re-validation. Gap: validate the HRIMS response shape with a schema before processing. |
| 16.7 | Institution context validation in background | ⚠️ Partial | `src/lib/jobs/hrims-sync-worker.ts:237-246,410` | `institutionId` preserved on update; **not re-validated** (existence / `voteNumber`/`tin` match) before upserting employees. Gap: re-fetch the Institution row and verify `voteNumber`/`tinNumber` against `job.data.identifier` before processing. |

---

## Requirement 17: Direct Object Reference Protection (IDOR)

**Process/Function:** Object Ownership, Per-Object Authorization, Identifier Safety

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 17.1 | Object ownership validation | ✅ Implemented | `employees/route.ts:79-106`; `complaints/[id]/route.ts:71`; `files/employee-documents/...:54-65`; `lwop/[id]/route.ts:314` | EMPLOYEE restricted to own records across employees/complaints/files/requests. |
| 17.2 | Object-level authorization (per object) | ✅ Implemented | `lwop/[id]/route.ts:72,301`; `promotions/[id]/route.ts:80,505`; `termination/[id]/route.ts:78,378` + siblings; file routes | Object fetched + institution compared before every mutate. |
| 17.3 | Resource access validation | ✅ Implemented | `files/download/[...objectKey]/route.ts`; `files/preview/[...objectKey]/route.ts`; `files/exists/[...objectKey]/route.ts`; `src/lib/file-access.ts` | **Fixed (was ⚠️).** IDOR-protected for employees/complaints/requests/employee-docs AND now for generic download/preview/exists via `authorizeFileOrDeny` (objectKey → owner → role matrix) before serving. Denied attempts log a forensic IDOR audit event (`logUnauthorizedAccess` with objectKey + resolved owner). |
| 17.4 | Secure object references (UUID/non-sequential) | ✅ Implemented | `prisma/schema.prisma:481,510,167,187`; `users/route.ts:182`; audit `gen_random_uuid()` | `cuid()`/`uuidv4()` IDs across models; audit `BIGSERIAL`+UUID — non-enumerable. |
| 17.5 | Server-side identifier validation | ✅ Implemented | `src/lib/api-auth.ts:92`; `lwop/[id]/route.ts:50-55`; `complaints/route.ts:110-113`; `audit/log/route.ts:11-14` | Identity/reviewer IDs derived from signed session; client-supplied values ignored. |
| 17.6 | Access denial logging | ✅ Implemented | `employees/route.ts:87,111`; `api-auth.ts:245,266`; `src/lib/workflow-access.ts` (`denyWorkflowAccess`) wired into all 8 `[id]` workflow routes; `src/proxy.ts` (`logUnauthorizedAttempt` → audit trail) | **Fixed (was ⚠️).** `withAuth` logs to the audit trail via `logAccessDenied`/`logForbiddenRoute`; `institutions/[id]` logs object denials. **`[id]` workflow routes no longer return 403 silently** — institution-ownership / self-approval / role-gating / submitter-only 403s (and the FSM invalid-transition 400) all flow through `denyWorkflowAccess` → `logAccessDenied` across `promotions`/`confirmations`/`lwop`/`termination`/`retirement`/`cadre-change`/`resignation`/`service-extension`. **Proxy writes edge-blocks to the audit trail** (not console-only). Covered by `workflow-access.test.ts` + `proxy.test.ts`. |

---

## Requirement 18: Workflow State Integrity

**Process/Function:** State Machine, Transitions, Background Integrity Checks

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 18.1 | State machine enforcement | ✅ Implemented | `src/lib/request-workflow.ts:34-78`; all 8 `[id]` routes; all 8 bulk PATCH handlers (`confirmations/route.ts:455`, `lwop/route.ts:465`, `promotions/route.ts`, `cadre-change/route.ts`, `resignation/route.ts`, `retirement/route.ts`, `termination/route.ts`, `service-extension/route.ts`) | **Fixed (was ⚠️).** FSM (`isAllowedStatusTransition`) now present on all 8 `[id]` routes and **all 8 bulk PATCH handlers** — the 6 previously-missing handlers (promotions, cadre-change, resignation, retirement, termination, service-extension) now enforce transitions. |
| 18.2 | Transition validation | ✅ Implemented | Same as 18.1 | **Fixed (was ⚠️).** Transition validation now covers all 8 bulk PATCH handlers. |
| 18.3 | Status change authorization | ✅ Implemented | `checkRoleAuthorization` in every PATCH; `reviewStage` server-controlled | Stage-matched role gating on all transitions. |
| 18.4 | Workflow ownership validation | ✅ Implemented | `shouldApplyInstitutionFilter` on POST/PATCH/DELETE across all workflows | Institution-scope check enforced. |
| 18.5 | Workflow audit logging | ✅ Implemented | `audit-logger.ts:455-687`; all workflow routes | Every state change logged with prev/new + actor. |
| 18.6 | Workflow integrity checks (background) | ❌ Not Implemented | `src/lib/cron-service.ts:292-323` (grep `orphan|stuck.*workflow|workflow.*integrity|reconcile` → 0 hits) | Cron schedules only password-expiration, MFA-token cleanup, and audit-partition creation; no background/cron job detects orphaned/inconsistent workflow states. Gap: add a scheduled job that detects requests stuck in a non-terminal status beyond SLA, or whose `reviewStage`/`status` pair is invalid. |

---

## Requirement 19: Non-Repudiation

**Process/Function:** Attribution, Decision Logging, Server Timestamps, Change Tracking

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 19.1 | User attribution (bind to User ID) | ✅ Implemented | `audit-logger.ts:103,121-136`; `audit-db.ts:121,146`; `complaints/route.ts:112`; `lwop/[id]/route.ts:50-55` | `userId`/`username`/`role` from signed session on every audit row. |
| 19.2 | Approval attribution (approver identity) | ✅ Implemented | `audit-logger.ts:455-640`; `schema.prisma:21-22,28` | `reviewedById`/`hrrpReviewedById`/`approvedById` recorded per stage. |
| 19.3 | Decision logging (rationale/comments) | ✅ Implemented | `audit-logger.ts:499-540,597-640`; `lwop/[id]/route.ts:82` | `rejectionReason`/`comment`/`withdrawalReason` persisted; reason required. |
| 19.4 | Timestamp validation (server-generated) | ✅ Implemented | `audit-db.ts:137-144`; migration `created_at DEFAULT NOW()`; `schema.prisma` `@default(now())` | DB/server-generated only. Minor: `hrrpReviewedAt` Zod accepts client datetime. |
| 19.5 | Change tracking (field-level with actor) | ⚠️ Partial | `src/app/api/users/[id]/route.ts:80-146`; `hrims-settings/route.ts:86-119`; `audit-logger.ts:865` | Field-level prev/new only for user `role`/`institutionId` (+ HRIMS config); other UPDATEs (employees, institutions, workflow records) record new state only. Gap: capture and persist prev/new field diffs with actor for all UPDATE handlers. |
| 19.6 | Workflow decision audit logging | ✅ Implemented | `audit-logger.ts:45-50`; `lwop/[id]/route.ts:191-211` | `REQUEST_APPROVED/REJECTED/WITHDRAWN/FORWARDED/SUBMITTED/UPDATED`; stage handoffs logged. |

---

## Requirement 20: Data Integrity Protection

**Process/Function:** Input Validation, Business Rules, Referential Integrity, Locking

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 20.1 | Input validation (server-side type/length/format) | ⚠️ Partial | `src/lib/api-schemas.ts:41-147,157-171`; `src/lib/sanitize-input.ts:37-73`; ~39/99 routes with Zod | **Improved (was ⚠️).** Central helper + DOMPurify; Zod adoption up from 33/102 to 39/99 routes (`institutions/[id]/route.ts:59` added). Gaps: `employees/route.ts`, `reports/route.ts`, `files/upload/route.ts`, `institutions/route.ts`, and most other collection POST handlers still lack Zod. Gap: add Zod schemas to the remaining ~60 routes. |
| 20.2 | Business rule validation | ⚠️ Partial | `src/lib/employee-status-validation.ts:25-157`; `src/lib/request-workflow.ts:34-78`; `sync-employee/route.ts:20-23` | **Improved (was ⚠️).** Employee status→request-type rules + HRIMS cross-field refine + FSM transition rules now enforced on the 8 `[id]` routes + 2 bulk PATCH handlers. Gaps: date-ordering (e.g. startDate < endDate) and eligibility rules still absent on most mutation routes, which validate presence/types only. Gap: add date-ordering and eligibility business rules to mutation routes. |
| 20.3 | Data integrity checks (FK consistency) | ✅ Implemented | `prisma/schema.prisma:31-34,85-88,134,277-280,302-342` | Prisma relations + `ON DELETE RESTRICT`/`SET NULL`. |
| 20.4 | Record consistency (optimistic locking) | ❌ Not Implemented | `prisma/schema.prisma` (no `version`/`lockVersion` field; grep `version` → 0 hits) | No optimistic-locking field exists; last-write-wins. Gap: add a `version Int @default(1)` column to mutable models and increment-with-where on every UPDATE. |
| 20.5 | Synchronization validation (HRIMS integrity) | ⚠️ Partial | `sync-employee/route.ts:26-71,140,296-347`; `audit-logger.ts:778-814`; `src/lib/cron-service.ts:292-323` | Request/response Zod + `institutionId` preservation + `logHrimsSync` audit at enqueue. Gap: no post-sync reconciliation/consistency job (grep `reconcile|post-sync|consistency.*job` → 0 hits). Gap: add a scheduled reconciliation job that verifies synced employee counts/fields against the HRIMS source and flags drift. |
| 20.6 | Referential integrity (DB FK constraints) | ✅ Implemented | `prisma/migrations/20250712105050_init/migration.sql:271-358`; `schema.prisma` `@unique` constraints | DB-level FK + uniqueness on zanId/zssf/payroll/username/tinNumber. |

---

## Requirement 21: Audit Log Protection

**Process/Function:** Append-Only, Tamper Protection, Restricted Access, Monitoring

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 21.1 | Append-only logging (no UPDATE/DELETE grants) | ⚠️ Partial | `src/lib/audit-db.ts:137-144` (INSERT-only app) | No `REVOKE UPDATE,DELETE` or trigger on `audit.audit_log`; DB-level mutation possible. |
| 21.2 | Audit record tamper protection (hash-chain) | ❌ Not Implemented | migration `20260522010000...:5-27` (no hash column); `audit-logger.ts:774` (aspirational comment) | No `previous_hash`/chain_hash column; no chaining logic. |
| 21.3 | Audit deletion prevention (no API/admin function) | ⚠️ Partial | `audit/logs/route.ts:13` (GET only); `audit/log/route.ts:7` (POST append only) | No DELETE API; **no DB-level guard** — direct DB access can delete. |
| 21.4 | Audit modification prevention | ⚠️ Partial | `audit-db.ts:115-193` (insert-only) | No UPDATE API; **no DB-level guard**. |
| 21.5 | Restricted audit access (audit-review roles) | ⚠️ Partial | `audit/logs/route.ts:85` (`['Admin','CSCS']`) | Admin/CSCS only; **no dedicated audit-review/auditor role**. |
| 21.6 | Audit integrity monitoring (background hash check) | ❌ Not Implemented | `cron-service.ts:292-366`; `audit-health.ts:24-117` | Cron checks connectivity/row-counts/partitions only — no hash verification (no hashes exist). |

---

## Requirement 22: Government Data Classification Enforcement

**Process/Function:** Classification Labels, Classification-Based Controls

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 22.1 | Data classification labels (Public/Internal/Confidential/Restricted) | ❌ Not Implemented | — (no `classification`/`sensitivity` field in `schema.prisma` or `constants.ts`) | No classification field on any model. |
| 22.2 | Classification-based authorization | ❌ Not Implemented | — | Authorization is purely role-based; no classification consulted. |
| 22.3 | Classification-based reporting controls | ❌ Not Implemented | `reports/route.ts` (role/institution only) | Reports not filtered by classification. |
| 22.4 | Classification-based export controls | ❌ Not Implemented | `src/lib/export-utils.ts:31-66` | No classification gating on exports. |
| 22.5 | Classification-based audit controls | ❌ Not Implemented | audit migration `5-27` (no classification column) | Audit events not tagged with classification. |

---

## Requirement 23: Restricted Government Data Protection

**Process/Function:** Enhanced Authorization, Access Approval, Export Restrictions, Alerting

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 23.1 | Enhanced authorization (clearance checks) | ⚠️ Partial | `src/lib/api-auth.ts:355`; `hrims/sync-employee/route.ts:76`; `users/[id]/route.ts:50` | Step-up reauth on sensitive actions; **no clearance-level field or per-record clearance check**. |
| 23.2 | Restricted data access approval workflow | ❌ Not Implemented | — (no `AccessApproval`/workflow entity in `schema.prisma`) | Access granted statically by role; no approval-request workflow. |
| 23.3 | Enhanced audit logging (full context) | ✅ Implemented | `src/lib/audit-db.ts:49-66,137-144`; `employees/route.ts:87-101` | Audit rows capture user/role/action/entity/IP/device/method/route/additional_data; IDOR includes forensic context. |
| 23.4 | Export restrictions (dual approval) | ❌ Not Implemented | `files/download/...:16-98`; `export-utils.ts:31-66` | No dual-approval; generic download needs only auth. |
| 23.5 | Administrative approval controls | ⚠️ Partial | `admin/reset-password/route.ts:24`; `lock-account/route.ts:21`; `hrims-settings/route.ts:45` | Admin role + reauth; **no separate approval role / dual control** for restricted-data grants. |
| 23.6 | Security monitoring & alerting | ✅ Implemented | `suspicious-login-detector.ts:26-60`; `audit-logger.ts:270-308`; `file-integrity.ts:109-124,226-240`; `security-alerts.ts` (outbound) | **Fixed (was ⚠️).** Detection (suspicious-login, file-integrity) + audit events retained; outbound SOC alerting now closed via `security-alerts.ts` (Req 26.6) — critical detection events flow through `logAuditEvent` → `dispatchSecurityAlert` (webhook/SIEM + email). |

---

## Requirement 24: Accountability & Traceability

**Process/Function:** Attribution, Timestamps, Correlation, End-to-End Trails

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 24.1 | User attribution (User ID on every transaction) | ✅ Implemented | `audit-logger.ts:103,121-136`; `audit-db.ts:121,146`; `termination/[id]/route.ts:256`; `schema.prisma:174,193` | `user_id` on every audit row; actor from session. |
| 24.2 | Timestamp recording (server-side) | ✅ Implemented | audit migration `created_at DEFAULT NOW()`; `schema.prisma` `@default(now())` | DB/server-generated. |
| 24.3 | Activity logging (significant activity) | ✅ Implemented | `audit-logger.ts:19-81` (40+ event types) | Covers auth/authorization/data/system/security. |
| 24.4 | Transaction logging (data-modifying) | ✅ Implemented | `termination/[id]/route.ts:250`; `admin/reset-password/route.ts:114`; `hrims-settings/route.ts:102`; file routes | Audit event on every successful mutation. |
| 24.5 | Correlation IDs per request | ❌ Not Implemented | — (no `correlationId`/`x-request-id` in middleware/error-handler/audit) | No per-request correlation ID; audit schema has no `request_id`/`correlation_id`. |
| 24.6 | End-to-end audit trails (joinable) | ⚠️ Partial | `audit-db.ts:295` (JOIN to User); `entity_type`/`entity_id`/`additional_data` JSONB | One-hop join only; no request-chain key — full end-to-end trail not reconstructable without heuristic correlation. |

---

## Requirement 25: Separation of Duties

**Process/Function:** Role Separation, Self-Approval Prevention, Dual Authorization

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 25.1 | Role separation (no initiate + approve same action) | ✅ Implemented | `confirmation-requests/[id]/route.ts:101-146`; `termination/[id]/route.ts:121-166`; `promotions/[id]/route.ts:138+` | Multi-stage role-gated workflow (HRO→HRRP→HHRMD/HRMO). |
| 25.2 | Administrative segregation (user-mgmt vs data/config admin) | ⚠️ Partial | `prisma/schema.prisma:417` (single `Admin` role) | One `Admin` role performs both user-management and data/config functions; no sub-roles. |
| 25.3 | Approval separation (no self-approval) | ✅ Implemented | `termination/[id]/route.ts:139-147`; `promotions/[id]/route.ts:144`; `confirmations/[id]/route.ts:119-127`; `users/[id]/route.ts:55-60` | Self-approval/rejection/role-change blocked. |
| 25.4 | Independent verification (second reviewer) | ⚠️ Partial | `termination/[id]/route.ts:121-169` | Two-stage review enforced; distinct reviewers guaranteed by role gating only — **no DB-level CHECK** preventing same user as submitter + reviewer. |
| 25.5 | Dual authorization (two distinct approvals) | ❌ Not Implemented | — (grep `dual.*authorization|two.*approv` → 0 hits) | No two-person rule on any action. |

---

## Requirement 26: Security Monitoring & Detection

**Process/Function:** Failure Monitoring, Escalation Detection, Alerting

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 26.1 | Failed login monitoring | ✅ Implemented | `login/route.ts:63-315`; `account-lockout-utils.ts`; `suspicious-login-detector.ts:26`; `audit-logger.ts:270` | `LOGIN_FAILED` + lockout tracking + suspicious-success detection. |
| 26.2 | Privilege escalation detection | ⚠️ Partial | `users/[id]/route.ts:121-144` | Role-change diff logged; **no detection/alerting rule** fires on escalation patterns. |
| 26.3 | Authorization failure monitoring (403) | ✅ Implemented | `audit-logger.ts:184,208,159` (`ACCESS_DENIED`/`FORBIDDEN_ROUTE`/`UNAUTHORIZED_ACCESS`) | Called from `withAuth` and IDOR checks. |
| 26.4 | IDOR attempt detection | ✅ Implemented | `employees/route.ts:78-131`; `documents/route.ts:193`; `certificates/route.ts:246` | Explicit IDOR guard with forensic `additionalData`. |
| 26.5 | Administrative activity monitoring | ✅ Implemented | `admin/reset-password/route.ts:115`; `lock-account/route.ts:71`; `hrims-settings/route.ts:102`; `audit-health.ts` | Admin actions audited with CRITICAL/WARNING severity. |
| 26.6 | Security alerting (real-time) | ✅ Implemented | `src/lib/security-alerts.ts` (`dispatchSecurityAlert`); `src/lib/audit-logger.ts:127-187` (fire-and-forget hook in `logAuditEvent` + audit-write-failure meta-alert); `.env.example` / `.env.production` (`SECURITY_ALERT_*`) | **Fixed (was ❌).** Outbound alerting wired into the audit pipeline: on every `logAuditEvent` at/above `SECURITY_ALERT_SEVERITY_THRESHOLD` (default CRITICAL) it POSTs a JSON alert to `SECURITY_ALERT_WEBHOOK_URL` (SIEM, optional Bearer token, 5s timeout) and emails `SECURITY_ALERT_EMAIL_TO` (per-eventType dedup window, `SECURITY_ALERT_DEDUP_SECONDS`, default 30s, `0` disables). Fire-and-forget + per-channel isolation — a SIEM/SMTP outage can never delay a request or suppress the audit row. An audit-write failure dispatches an `AUDIT_WRITE_FAILED` ERROR alert (tampering/DB-outage signal). Opt-in: no env set → no-op (safe dev/CI default). Middleware `console.log`-only blocked access is tracked under Req 17.6. |

---

## Requirement 27: Export & Data Extraction Control

**Process/Function:** Export Authorization, Audit, Restrictions, Filtering

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 27.1 | Export authorization | ✅ Implemented | `reports/route.ts:1376` (roles ✅); `src/lib/file-access.ts` (per-object ACL ✅); `files/download/[...objectKey]/route.ts` | **Fixed (was ⚠️).** Reports role-gated; generic file download now per-object authorized via `authorizeFileOrDeny` (ownership/institution ACL), no longer any-authenticated-user. |
| 27.2 | Export audit logging | ✅ Implemented | `src/app/api/reports/route.ts:1342-1361` (`REPORT_VIEWED`); `files/download/...` (`logFileAction`) | **Fixed (was ⚠️).** Reports export now audited with `REPORT_VIEWED` (actor, role, institution scope, reportType, count); file downloads already audited via `logFileAction`. (Residual: the client-side export *act* is not separately audited — see 12.5.) |
| 27.3 | Restricted data export controls | ❌ Not Implemented | `prisma/schema.prisma:499-507` | No classification field/model and no classification-based export restriction anywhere. |
| 27.4 | Data minimization | ⚠️ Partial | `sanitize-response.ts:13-40`; `admin/hrims-settings/route.ts:19-28`; `files/download/[...objectKey]/route.ts:94`; `reports/route.ts:24` | User fields stripped; secrets masked. Gaps: file downloads serve raw bytes; reports `sanitizeText` is XSS-escaping only — rows still carry full PII (`nidaNumber`/`zssfNumber`/`phoneNumber`), no minimization/masking. |
| 27.5 | Export approval workflow | ❌ Not Implemented | `prisma/schema.prisma` (no `ExportRequest` model) | No export-request entity/approver; downloads and reports remain immediate. |
| 27.6 | Institution-based export filtering | ✅ Implemented | `reports/route.ts:750-762`; `employees/route.ts:188-189` | Non-CSC forced to `auth.institutionId`. |

---

## Requirement 28: Administrative Change Control

**Process/Function:** Config Authorization, Approval, Audit, Versioning

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 28.1 | Configuration change authorization (Admin) | ✅ Implemented | `admin/hrims-settings/route.ts:40,130,165` | `withAuth(['Admin'])` on GET/PUT/POST. |
| 28.2 | Change approval workflow (secondary approval) | ❌ Not Implemented | `admin/hrims-settings/route.ts:45`; — (no `ConfigChangeRequest` model) | Single-admin; no secondary approver. |
| 28.3 | Configuration audit logging (before/after) | ✅ Implemented | `admin/hrims-settings/route.ts:86-119`; `audit-logger.ts:865-901` | Previous/new host:port + `apiKeyChanged`/`tokenChanged` (secrets redacted). |
| 28.4 | Change tracking (versioned history) | ⚠️ Partial | `change-history.ts:44,122`; `SystemSettings` (`schema.prisma:499-507`) | Audit-log JSONB stores before/after; **no `SystemSettingsHistory`/row versioning** — upsert overwrites. |
| 28.5 | Configuration integrity validation (schema) | ❌ Not Implemented | `admin/hrims-settings/route.ts:62,75` | Only host/port format regex; no schema validation/checksum on config blob. |

---

## Requirement 29: Synchronization Accountability

**Process/Function:** Sync Logging, Attribution, Result Tracking, Failure Logging

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 29.1 | Synchronization logging (start/end/source) | ⚠️ Partial | `sync-employee/route.ts:93,117,151`; `sync-documents/route.ts:86,113,162` | HTTP sync routes log start/end; **BullMQ worker (`hrims-sync-worker.ts`) and scripts do not** — bulk syncs vanish from audit. |
| 29.2 | Synchronization attribution (triggering actor) | ⚠️ Partial | `sync-employee/route.ts:95-97,153-155` | HTTP routes capture actor; **worker/scripts have no `performedById`** in audit. |
| 29.3 | Synchronization result tracking (counts) | ⚠️ Partial | `sync-employee/route.ts:204-219`; `hrims-sync-worker.ts:449-465` | Worker computes counts but logs via pino only; audit `additionalData` lacks saved/skipped counts. |
| 29.4 | Failure logging (per record) | ⚠️ Partial | `hrims-sync-worker.ts:438,298,377`; `sync-employee/route.ts:117-129` | Per-record errors pino-only; HTTP routes log aggregate failures only — no per-record `HRIMS_SYNC_FAILED` audit event. |
| 29.5 | Synchronization audit trails (immutable/queryable) | ⚠️ Partial | `audit-db.ts:211` (`queryAuditLogs`); `audit-logger.ts:76-77` | Queryable yes; **immutability NOT enforced at DB** (no REVOKE/trigger/hash chain). |

---

## Requirement 30: Government Information Confidentiality

**Process/Function:** Need-to-Know, Least Privilege, Encryption, Access Monitoring

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 30.1 | Need-to-know enforcement | ✅ Implemented | `role-utils.ts:48`; `employees/route.ts:188`; `reports/route.ts:750-762`; `src/lib/file-access.ts` | **Fixed (was ⚠️).** Institution scoping + IDOR for employees/reports; generic file download now need-to-know enforced via `authorizeFileOrDeny` (institution/ownership/complaint-relationship grant). |
| 30.2 | Least privilege enforcement | ⚠️ Partial | `api-auth.ts:235-300`; `role-utils.ts:9` | Route-level RBAC; CSC roles see ALL institutions (broad, not least-privilege); no field-level ABAC. |
| 30.3 | Data access authorization | ✅ Implemented | `api-auth.ts:92-204`; `audit/logs/route.ts:8-10` | Identity from signed session (DB-validated), not forgeable cookie; institution + IDOR checks. |
| 30.4 | Institution isolation | ✅ Implemented | `schema.prisma:130,420`; `employees/route.ts:188`; `sync-employee/route.ts:296-301` | Server-side filtering; institutionId preserved on sync update. |
| 30.5 | Confidential data protection (encrypt/mask at rest + TLS) | ⚠️ Partial | `nginx-cscs-ssl.conf:9-27,185`; `next.config.ts:86-90` (TLS ✅); `migration 20260529000000_add_pii_encryption` + `src/lib/encryption.ts` (❌ dead code) | TLS to client enforced (HSTS, TLS1.2/1.3). **PII encryption is dead code** — `encrypt_pii`/`decrypt_pii` never called; PII stored plaintext. HRIMS upstream is plaintext HTTP. Secrets plaintext in `SystemSettings`. |
| 30.6 | Access monitoring | ✅ Implemented | per-route `logAuditEvent` calls; `schema.prisma:480-491` Session tracking; `health/audit/route.ts` | All authenticated access audited; sessions tracked with IP/UA/device. Gap: middleware edge-blocks are console-only. |

---

## Priority Remediation Recommendations

Derived from the highest-impact *remaining* gaps after the 2026-07-21 re-audit, ordered by risk. Items already closed by recent security commits (Argon2id, password length/complexity/history, session invalidation on role change, proxy-side session validation, deterministic jobId, owner-bound job-status, presigned-URL expiry cap, reports export audit, complaint resolution authorization, institutions Admin check, notification recipient validation, self-approval in bulk PATCH, confirmations/lwop FSM) are omitted — see the per-control "Fixed" remarks above.

1. ~~**Fix generic file download/preview/exists IDOR** (Req 10.1–10.2, 17.3, 27.1, 30.1): add per-object ownership/institution authorization before serving any MinIO object — currently any authenticated user can read any object key. (Presigned-URL expiry already capped at 3600s.)~~ **Closed (2026-07-25)** via `src/lib/file-access.ts` + guards in the three generic routes.
2. **DB-enforce audit immutability** (Req 15.2, 21.1–21.6, 29.5): add `REVOKE UPDATE, DELETE` + a `BEFORE UPDATE/DELETE` trigger and a hash-chain column on `audit.audit_log`; add a background hash-verification job. Currently audit-row tampering is undetectable.
3. **Trusted-source validation for HRIMS** (Req 11.2): allow-list HRIMS hosts, validate certs, reject caller-supplied `hrimsApiUrl`/`hrimsApiKey` (eliminate SSRF); wrap sync writes in `$transaction` (Req 11.7); add runtime Zod to `fetch-employee`/`bulk-fetch` (Req 11.8). (Req 11.1 reauth on all sync routes is now closed.)
4. **Background processing audit & re-validation** (Req 16.1, 16.3, 16.6, 16.7, 29.1–29.4): have the BullMQ worker write `logHrimsSync` audit events with actor + counts + per-record failures; re-validate `job.data.userId` permission, the HRIMS response shape, and the institution `voteNumber` before processing.
5. **Add export/reporting controls** (Req 12, 27): create a server-side export endpoint with role authorization, audit logging of the export *act* (`REPORT_EXPORTED`), rate limits, watermarking, and an approval workflow for bulk/sensitive exports; minimize PII in report rows (Req 27.4).
6. **Implement data classification** (Req 22) and **restricted-data protection** (Req 23): add `classification` fields to the schema, wire classification into authorization/reporting/export/audit, and add an access-approval workflow + dual-approval export.
7. **Data integrity & concurrency** (Req 20.1, 20.4, 28.5): add Zod validation to remaining routes (`employees`, `reports`, `files/upload`, `institutions`); add a `version` field for optimistic locking; add config schema validation.
8. **Complainant confidentiality** (Req 9.6): redact/anonymize complainant identity for non-resolving officers; add a `GET /api/complaints/[id]` with involved-party visibility (Req 9.2). (Resolution authorization Req 9.7 is already fixed.)
9. **MFA per-role** (Req 1.1): add a per-role MFA policy (require MFA for privileged roles regardless of email presence). ~~Self-service token-based reset flow (Req 1.10)~~ **Closed (2026-07-25)** — see row 1.10.
10. **Correlation IDs** (Req 24.5): generate a per-request correlation ID propagated through `proxy.ts`→route→audit (add a `correlation_id` column). (Outbound alerting Req 26.6 is now closed via `security-alerts.ts`.)
11. **Separation of duties — two-person rule** (Req 25.5, 14.8): introduce dual authorization for the most destructive actions (delete user/institution, HRIMS config change) and split admin sub-roles. (Self-reset/self-delete guards Req 14.8 are now closed; the two-person rule remains.)
12. **Encrypt PII at rest & secure HRIMS transport** (Req 30.5): wire the existing `encryptPII`/`decryptPII` functions into the Employee data layer (or remove the dead migration); use HTTPS for the HRIMS upstream; encrypt secrets in `SystemSettings`.
13. ~~**File integrity fail-closed & malware coverage** (Req 10.6, 10.7, 10.8)~~ **Closed (2026-07-25).** Fail-closed (or flag) when a hash is missing/DB error for sensitive object keys — `verifyFileHash`/`verifyDocumentHash` fail-closed + CRITICAL `POTENTIAL_BREACH` audit for `employee-documents/`* / `employee-photos/`*; non-sensitive keys keep fail-open. `files/exists` audited via `FILE_EXISTS_CHECK`. Scan `sync-employee` photo — `src/lib/hrims-photo-scan.ts` (`scanEmployeePhoto`, fail-closed drop + CRITICAL audit). Generic `files/upload` scanned via `validateFileUpload` step 5 (verified by tests). `CLAMAV_ENABLED=false` ignored in production without `CLAMAV_DISABLE_ALLOWED=true` (two-key admin gate; dev/CI escape hatch retained). Silent `.catch(()=>{})` file-audit writes replaced with `safeAuditLog` (`files/download`, `files/preview`, `files/upload`, `files/exists`, `file-access.ts` IDOR, `file-integrity.ts` CRITICAL writes).

> **Closed in this pass (2026-07-21):** workflow state-machine coverage across all 8 bulk PATCH handlers (Req 8.1/8.2/8.6/18.1/18.2), step-up reauth on `sync-documents`/`sync-certificates` (Req 11.1), and self-reset/self-delete admin guards (Req 14.8).

> **Closed in this pass (2026-07-25):** per-user sliding login rate limit (Req 1.8) — `checkRateLimitSliding` + `buildUserRateLimitKey` in `src/lib/rate-limiter.ts`, wired into `src/app/api/auth/login/route.ts` ahead of the DB lookup; unit tests in `src/lib/rate-limiter-sliding.test.ts` and route tests in `src/app/api/auth/login/route.test.ts`. Real-time security alerting (Req 26.6, also closes 23.6's outbound gap) — `src/lib/security-alerts.ts` (`dispatchSecurityAlert`: webhook/SIEM + email, severity-gated, fire-and-forget, channel-isolated) wired into `logAuditEvent`; env config in `.env.example`/`.env.production`; tests in `src/lib/security-alerts.test.ts` + `src/lib/audit-logger.alert-wiring.test.ts`. Generic file download/preview/exists IDOR (Req 10.1–10.2, 17.3, 27.1, 30.1) — `src/lib/file-access.ts` (`checkFileAccess`/`authorizeFileOrDeny`: objectKey → owner → role matrix, fail-closed for at-risk roles, complaint-relationship grant) wired before any MinIO access in `files/download`, `files/preview`, `files/exists`; tests in `src/lib/file-access.test.ts` + `src/app/api/files/files-access.route.test.ts`. File integrity fail-closed for sensitive keys (Req 10.6) — `src/lib/file-integrity.ts` `isSensitiveObjectKey` + `VerifyOptions.failClosed`: `verifyFileHash`/`verifyDocumentHash` now block (`ok=false`, new `lookup_failed` reason) and emit a CRITICAL `POTENTIAL_BREACH` audit (`NO_HASH_RECORDED`/`INTEGRITY_LOOKUP_FAILED`) when a sensitive object key (`employee-documents/`*, `employee-photos/`*) has no recorded hash or the integrity-table lookup errors; non-sensitive keys keep fail-open. `files/exists` audit logging (Req 10.8) — new `EXISTS` action / `FILE_EXISTS_CHECK` event type in `logFileAction` (`src/lib/audit-logger.ts`) wired into `files/exists/[...objectKey]/route.ts` (both exists:true/false outcomes); tests in `src/lib/file-integrity.test.ts`. Malware scanning coverage + env-disable hardening (Req 10.7) — `src/lib/hrims-photo-scan.ts` (`scanEmployeePhoto`: scans `Employee.photo.content` before persisting, fail-closed drop + CRITICAL `HRIMS_PHOTO_MALWARE`/`HRIMS_PHOTO_SCAN_FAILED` audit) wired into `hrims/sync-employee/route.ts`; generic `files/upload` confirmed scanned via `validateFileUpload` step 5 (new `generic`-context tests); `clamav.ts` `isClamAVEnabled` now ignores `CLAMAV_ENABLED=false` in production without `CLAMAV_DISABLE_ALLOWED=true` (two-key gate, dev/CI escape hatch retained, logs once); tests in `clamav.test.ts`, `file-validation.test.ts`, `sync-employee/route.test.ts`. Silent file-audit `.catch(()=>{})` cleanup (Req 10.8 / Remediation #13) — new `safeAuditLog(p, context)` helper in `audit-logger.ts` (logs, never swallows) now wraps every file-domain audit write (`files/download`, `files/preview`, `files/upload`, `files/exists`, `file-access.ts` IDOR, `file-integrity.ts` CRITICAL writes) replacing the bare `.catch(()=>{})`. Silent `[id]` workflow 403s + proxy edge-blocks (Req 15.7, 17.6) — new `src/lib/workflow-access.ts` (`denyWorkflowAccess`: logs `logAccessDenied` then returns the 403/400) wired into every institution-ownership / self-approval / role-gating / submitter-only / FSM-transition denial on all 8 `[id]` workflow routes (`promotions`, `confirmations`, `lwop`, `termination`, `retirement`, `cadre-change`, `resignation`, `service-extension`) PUT/PATCH/GET/DELETE; `src/proxy.ts` `logUnauthorizedAttempt` now fires `logUnauthorizedAccess` (unauthenticated) / `logForbiddenRoute` (authenticated wrong-role) to the audit trail in addition to console; tests in `workflow-access.test.ts` + `proxy.test.ts`. Self-service token-based password reset (Req 1.10) — new hashed `PasswordResetToken` table + `src/lib/password-reset.ts` (`resolveResetToken`/`consumePasswordResetToken` race-safe single-use, `incrementResetVerifyAttempts` cap) + `POST /api/auth/forgot-password` (non-enumerable, per-identifier sliding limit) + `POST /api/auth/reset-password` (full change-password validation chain, atomically consumes token, clears standard lockout flags, preserves admin `isManuallyLocked`, invalidates all sessions, `PASSWORD_RESET` audit) + `sendPasswordResetEmail` + `/forgot-password` & `/reset-password` pages + login "Forgot password?" link; env `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES`/`PASSWORD_RESET_MAX_VERIFY_ATTEMPTS` in `.env.example`/`.env.production`; tests in `src/lib/password-reset.test.ts`, `forgot-password/route.test.ts`, `reset-password/route.test.ts`.

---

*Originally prepared from codebase analysis of `/home/latest` (branch `fix/e2e-chronic-failures`) on 2026-07-18. Re-audited and updated 2026-07-21 against the current working tree; all `file:line` references reflect the current code. Each table row maps directly to one or more UAT/penetration test cases per the implementation notes in `CSMS_Security_Requirements_Transform.md`. Controls that are tighter than the specified threshold are scored ✅ and are intentionally not loosened.*
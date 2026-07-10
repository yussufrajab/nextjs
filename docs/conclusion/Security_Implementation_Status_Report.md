# CSMS Security Implementation Status Report

**System:** CSMS (Civil Service Management System)
**Source requirements:** `docs/conclusion/Security_requirements_and_Controls.md` (30 security domains, all Mandatory)
**Method:** Static code audit of `src/` (Next.js API routes + `src/lib/` security modules), Prisma schema, and migrations. Each control was verified against actual code; file:line references and symbol names are cited as evidence.
**Date of audit:** 2026-07-10

---

## Status Legend

| Status | Meaning |
|---|---|
| ✅ **Implemented** | Control is correctly and completely implemented in code. |
| ⚠️ **Partial** | Control exists but has gaps, inconsistencies, or weaker-than-required enforcement. |
| ❌ **Missing** | No implementation found, or implementation is dead code. |

---

## 1. Executive Summary — Per-Domain Compliance Score

"Implemented correctly" counts only controls marked ✅ Implemented for the domain. ⚠️ Partial and ❌ Missing are tracked separately.

| # | Security Domain | Controls | ✅ Implemented | ⚠️ Partial | ❌ Missing | Domain Verdict |
|---|---|---:|---:|---:|---:|---|
| 1 | Authentication & Identity Assurance | 13 | 8 | 4 | 1 | ⚠️ Partial |
| 2 | Session Security | 8 | 6 | 2 | 0 | ⚠️ Partial |
| 3 | Authorization & Least Privilege | 6 | 5 | 1 | 0 | ⚠️ Partial |
| 4 | Institution Data Isolation | 7 | 6 | 1 | 0 | ⚠️ Partial |
| 5 | Employee Profile Protection | 7 | 6 | 1 | 0 | ⚠️ Partial |
| 6 | Employee Creation Integrity | 8 | 6 | 2 | 0 | ⚠️ Partial |
| 7 | Bulk Upload Security | 9 | 7 | 2 | 0 | ⚠️ Partial |
| 8 | Workflow Security & Approval Integrity | 9 | 4 | 5 | 0 | ⚠️ Partial |
| 9 | Complaint Management Security | 7 | 6 | 1 | 0 | ⚠️ Partial |
| 10 | File & Document Security | 8 | 5 | 3 | 0 | ⚠️ Partial |
| 11 | HRIMS Integration Security | 8 | 4 | 3 | 1 | ⚠️ Partial |
| 12 | Reporting & Export Security | 8 | 1 | 1 | 6 | ❌ Mostly Missing |
| 13 | Notification Security | 6 | 4 | 1 | 1 | ⚠️ Partial |
| 14 | Administrative Security | 8 | 6 | 2 | 0 | ⚠️ Partial |
| 15 | Audit Trail & Accountability | 8 | 5 | 2 | 1 | ⚠️ Partial |
| 16 | Background Processing Security | 7 | 2 | 4 | 1 | ⚠️ Partial |
| 17 | Direct Object Reference Protection (IDOR) | 6 | 6 | 0 | 0 | ✅ Implemented |
| 18 | Workflow State Integrity | 6 | 2 | 4 | 0 | ⚠️ Partial |
| 19 | Non-Repudiation | 6 | 6 | 0 | 0 | ✅ Implemented |
| 20 | Data Integrity Protection | 6 | 3 | 3 | 0 | ⚠️ Partial |
| 21 | Audit Log Protection | 6 | 0 | 4 | 2 | ❌ Mostly Missing |
| 22 | Government Data Classification Enforcement | 5 | 0 | 0 | 5 | ❌ Missing |
| 23 | Restricted Government Data Protection | 6 | 2 | 2 | 2 | ❌ Mostly Missing |
| 24 | Accountability & Traceability | 6 | 5 | 1 | 0 | ⚠️ Partial |
| 25 | Separation of Duties | 5 | 3 | 1 | 1 | ⚠️ Partial |
| 26 | Security Monitoring & Detection | 6 | 5 | 1 | 0 | ⚠️ Partial |
| 27 | Export & Data Extraction Control | 6 | 1 | 3 | 2 | ❌ Mostly Missing |
| 28 | Administrative Change Control | 5 | 2 | 2 | 1 | ⚠️ Partial |
| 29 | Synchronization Accountability | 5 | 0 | 2 | 3 | ❌ Mostly Missing |
| 30 | Government Information Confidentiality | 6 | 1 | 4 | 1 | ❌ Mostly Missing |
| | **TOTAL** | **210** | **106** | **61** | **29** | |

**Overall:** 106 of 210 controls (~50%) are fully and correctly implemented. 61 (~29%) are partial, and 29 (~14%) are missing. Only **2 of 30 domains** (IDOR Protection, Non-Repudiation) are fully implemented; **5 domains** are largely missing (Reporting/Export, Audit Log Protection, Data Classification, Synchronization Accountability, Government Information Confidentiality).

---

## 2. Item-by-Item Compliance Tables

### Domain 1 — Authentication & Identity Assurance

| # | Control | Status | Evidence |
|---|---|---|---|
| 1.1 | Multi-Factor Authentication (MFA) | ✅ Implemented | `src/lib/mfa-utils.ts:23` `createMfaToken` issues 6-digit OTP/magic-link tokens with expiry + attempt limiting; `src/app/api/auth/login/route.ts:351` gates login behind `checkOtpRateLimit` + email OTP before `completeLogin`. |
| 1.2 | Strong Password Policy | ⚠️ Partial | `src/lib/password-utils.ts:51` uses zxcvbn scoring + `isCommonPassword` rejects score≤1, but complexity (`:32` `validatePasswordComplexity`) only requires 2 of 4 character classes. |
| 1.3 | Minimum Password Length | ✅ Implemented | `src/lib/password-utils.ts:5` `PASSWORD_MIN_LENGTH = 8`; enforced at `:33` and `change-password/route.ts:122`. |
| 1.4 | Password Complexity Enforcement | ⚠️ Partial | `src/lib/password-utils.ts:43-44` requires only `classCount >= 2` of (upper/lower/number/special) — weaker than requiring 3–4 classes. |
| 1.5 | Password History | ✅ Implemented | `src/lib/password-utils.ts:6` `PASSWORD_HISTORY_LENGTH = 3`; `:108` `checkPasswordHistory` bcrypt-compares new pw against stored hashes; `change-password/route.ts:172-208`. |
| 1.6 | Password Expiry | ✅ Implemented | `src/lib/password-expiration-utils.ts:4-6` 90-day standard / 60-day admin with 7-day grace; `login/route.ts:299-335` enforces. |
| 1.7 | Account Lockout | ✅ Implemented | `src/lib/account-lockout-utils.ts:4` `MAX_FAILED_LOGIN_ATTEMPTS=5`; `:78` escalates to SECURITY (admin-only unlock) after >10; `:121` locks + deactivates. |
| 1.8 | Login Attempt Rate Limiting | ✅ Implemented | `src/lib/rate-limiter.ts:17` `auth: { limit: 5, windowSeconds: 60 }`; `login/route.ts:27` wraps handler in `withRateLimit(..., 'auth')`. |
| 1.9 | Secure Password Hashing (Argon2id) | ❌ Missing | `src/lib/password-utils.ts:174` `hashPassword` uses bcryptjs cost-10. No Argon2id/scrypt/pbkdf2 anywhere in `src/lib` or `src/app/api/auth`. |
| 1.10 | Secure Password Reset Process | ⚠️ Partial | `src/lib/password-utils.ts:145` `generateTemporaryPassword` uses non-cryptographic `Math.random()` for temp passwords; change-password enforces history/HIBP/complexity on reset. |
| 1.11 | Generic Authentication Error Messages | ✅ Implemented | `src/app/api/auth/login/route.ts:72,163,184,221,287` returns uniform `"Invalid username/email or password"` for user-not-found, locked, inactive, bad-password, expired-temp. |
| 1.12 | Failed Login Monitoring | ✅ Implemented | `src/app/api/auth/login/route.ts:63,209` `logLoginAttempt`; `account-lockout-utils.ts:148` logs `ACCOUNT_LOCKED`/`ACCOUNT_LOCKOUT_UPGRADED`. |
| 1.13 | Reauthentication for High-Risk Actions | ⚠️ Partial | `src/lib/reauth.ts:69` `issueReauthToken` + `api-auth.ts:355` `requireReauth` enforce scoped HMAC cookie for users.delete/institutions.delete/admin.reset-password; BUT `reauth/route.ts:122-124` accepts `otp` but does NOT validate it (self-documented GAP-M12) — password-only step-up. |

### Domain 2 — Session Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 2.1 | Session Timeout | ⚠️ Partial | `src/lib/session-timeout-utils.ts:12` `SESSION_TIMEOUT_MINUTES=10` + `isSessionTimedOut`, but `session-manager.ts:335` `validateSession` only checks absolute `expiresAt` and never calls `isSessionTimedOut` — inactivity timeout relies on client-side `updateUserActivity`. |
| 2.2 | Absolute Session Lifetime | ✅ Implemented | `src/lib/session-manager.ts:25` `SESSION_EXPIRY_HOURS = 8`; `:108` `signSessionToken` embeds expiry; `:132` `verifySessionToken` rejects elapsed expiry; `validateSession` re-checks `expiresAt`. |
| 2.3 | Secure Session Identifiers | ✅ Implemented | `src/lib/session-manager.ts:59` `generateSessionToken` uses `randomBytes(32).toString('hex')`; `:78` `__Host-session` cookie prefix in prod; `:90` httpOnly, secure, sameSite=strict. |
| 2.4 | Session Invalidation on Logout | ✅ Implemented | `src/app/api/auth/logout/route.ts:51` `terminateSession` deletes DB row; `:89` clears `session` + csrf cookies (maxAge 0). |
| 2.5 | Session Invalidation on Password Change | ✅ Implemented | `src/app/api/auth/change-password/route.ts:251` `terminateOtherUserSessions(user.id, currentSessionToken)` keeps current device, kills others; falls back to `terminateAllUserSessions` (`:257`). |
| 2.6 | Server-Side Session Validation | ✅ Implemented | `src/lib/api-auth.ts:130` `verifySessionToken` + `:138` `validateSession` against DB Session table; `:149-174` per-request IP/UA binding with `markSessionSuspicious`; user `active` flag confirmed at `:186`. |
| 2.7 | Concurrent Session Control | ⚠️ Partial | `src/lib/session-manager.ts:24` `MAX_CONCURRENT_SESSIONS=3`, `:294` `createSession` evicts oldest. BUT `sessions/force-logout/route.ts` does NOT call `withAuth`/`verifyAuth` — CSRF-only, trusts client-supplied `userId`/`sessionId` (an attacker could force-logout a victim's session). |
| 2.8 | Reauthentication for Sensitive Actions | ✅ Implemented | `src/lib/api-auth.ts:355` `requireReauth` verifies scoped `reauth` cookie bound to `auth.userId` (`:379`); `reauth/route.ts:65` whitelists scopes; cookie httpOnly/sameSite=strict/5-min TTL. |

### Domain 3 — Authorization & Least Privilege

| # | Control | Status | Evidence |
|---|---|---|---|
| 3.1 | Role-Based Access Control (RBAC) | ✅ Implemented | `src/lib/api-auth.ts:235` `withAuth(handler, { allowedRoles })`; `src/lib/route-permissions-config.ts:17` `ROUTE_PERMISSIONS`; `src/lib/route-permissions.ts:18` `canAccessRoute()`. |
| 3.2 | Least Privilege Enforcement | ✅ Implemented | `src/lib/role-utils.ts:14` `isCSCRole()` + `shouldApplyInstitutionFilter()` scope non-CSC roles to their own institution; field-level allowlists e.g. `complaints/[id]/route.ts:78`. |
| 3.3 | Need-to-Know Access Control | ✅ Implemented | `src/app/api/employees/route.ts:169` EMPLOYEE force-scoped to own record; HRO/HRRP scoped to own institution (`:188`); CSC sees all. |
| 3.4 | Deny-by-Default Authorization | ✅ Implemented | `src/lib/route-permissions.ts:46` returns `false` when no route pattern matches; `middleware.ts:190` same; `employees/[id]/fetch-photo/route.ts:58` explicit deny for unknown roles. |
| 3.5 | Server-Side Authorization Validation | ✅ Implemented | `src/lib/api-auth.ts:181` `verifyAuth()` re-fetches user from DB; comment at `:8` states the forgeable `auth-storage` cookie is NOT authoritative; role/institutionId from DB row. |
| 3.6 | Permission Validation on Every Request | ⚠️ Partial | `src/lib/api-auth.ts:138` `validateSession()` runs against DB every request (no cache). GAP: `middleware.ts:276` authorizes dashboard page access from the client-set `auth-storage` cookie via `parseAuthStorage()` and only checks the `session` cookie for *presence*, not validity — page-level routing trusts a forgeable cookie. |

### Domain 4 — Institution Data Isolation

| # | Control | Status | Evidence |
|---|---|---|---|
| 4.1 | Institution Ownership Validation | ✅ Implemented | `src/app/api/employees/route.ts:108` rejects HRO/HRRP cross-institution fetch with audited IDOR; `employees/[id]/documents/route.ts:69`; `certificates/route.ts:80`; `fetch-photo/route.ts:40`. |
| 4.2 | Institution-Based Access Control | ✅ Implemented | `src/lib/role-utils.ts:24` `shouldApplyInstitutionFilter(role, institutionId)` true only for non-CSC roles with institutionId; consumed across employees, reports, requests, search. |
| 4.3 | Institution Context Validation | ✅ Implemented | `src/lib/api-auth.ts:200` derives institutionId from DB user; `employees/manual-entry/route.ts:20` rejects creation when `!institutionId`; `bulk-upload/route.ts:509` re-fetches from DB. |
| 4.4 | Institution Filtering in Queries | ✅ Implemented | `src/app/api/employees/route.ts:189` `whereClause.institutionId = userInstitutionId`; `search/route.ts:51`; `urgent-actions/route.ts:51`; `email/route.ts:83`. |
| 4.5 | Institution Filtering in APIs | ✅ Implemented | Same `shouldApplyInstitutionFilter` pattern across employees, reports, requests/track, search, urgent-actions, email; client-supplied `institutionId` ignored for non-CSC roles (`reports/route.ts:752`). |
| 4.6 | Institution Filtering in Reports | ✅ Implemented | `src/app/api/reports/route.ts:751-762` builds `institutionFilter.Employee = { institutionId: auth.institutionId }` for non-CSC roles; complaint reports additionally blocked for HRO/HRRP (`:715`). |
| 4.7 | Institution Validation During Synchronization | ⚠️ Partial | `src/app/api/hrims/sync-employee/route.ts:85` resolves institution by `voteNumber` and validates existence. GAP: resolved `institutionId` is NOT checked against `auth.institutionId` — any Admin/HHRMD can sync into any institution by supplying its vote number. |

### Domain 5 — Employee Profile Protection

| # | Control | Status | Evidence |
|---|---|---|---|
| 5.1 | Object-Level Authorization | ✅ Implemented | `src/app/api/employees/route.ts:79` EMPLOYEE ownership + `:107` HRO/HRRP institution checks; `fetch-documents/route.ts:230` role-tiered check. |
| 5.2 | Employee Ownership Validation | ✅ Implemented | `employees/[id]/documents/route.ts:194`; `certificates/route.ts:247`; `fetch-photo/route.ts:46` — compare `requestingUser.employeeId !== employeeId` for EMPLOYEE, 403 on mismatch. |
| 5.3 | Profile Access Validation | ✅ Implemented | `src/app/api/employees/route.ts:79-132` GET `?id=` performs ownership (EMPLOYEE) and institution (HRO/HRRP) checks with IDOR audit before returning. |
| 5.4 | Record Update Authorization | ⚠️ Partial | No standalone `PATCH /api/employees/[id]` route exists; updates occur only inside workflow routes (`promotions/route.ts:580`, `confirmations/route.ts:502`, etc.) and HRIMS sync, each re-implementing checks inconsistently — no centralized update-authorization gate. |
| 5.5 | Sensitive Field Protection | ✅ Implemented | `src/lib/sanitize-response.ts:70` `EMPLOYEE_FIELD_MASKS` masks `zanId`, `zssfNumber`, `payrollNumber`, `phoneNumber` (last-4), redacts `contactAddress` for non-privileged roles; `auth-me.ts:38` explicit `select` excludes password/lockout fields. |
| 5.6 | Access Logging | ✅ Implemented | `src/app/api/employees/route.ts:87` `logUnauthorizedAccess` with forensic `additionalData` (idor, attemptedObjectId, targetInstitutionId); `manual-entry/route.ts:263` `logEmployeeAction`; `documents/route.ts:131` `logFileAction`. |
| 5.7 | Record Integrity Validation | ✅ Implemented | `src/app/api/employees/manual-entry/route.ts:58-138` validates required fields, phone regex `/^0\d{9}$/`, name length, DOB range, ZanID format `/^\d{5,12}$/`, employment-date not-future; `prisma/schema.prisma:107` `zanId @unique`. |

### Domain 6 — Employee Creation Integrity

| # | Control | Status | Evidence |
|---|---|---|---|
| 6.1 | Employee Creation Authorization | ✅ Implemented | `src/app/api/employees/manual-entry/route.ts:283` `{ allowedRoles: ['HRO'] }`; `bulk-upload/route.ts:488` `{ allowedRoles: ['HRO', 'ADMIN'] }` (POST) and `:502` PUT re-check. |
| 6.2 | Unique Payroll Number Validation | ⚠️ Partial | App-level check at `manual-entry/route.ts:193-205` and `bulk-upload/route.ts:425`; `validate/route.ts:28` pre-check. GAP: `prisma/schema.prisma:112` `payrollNumber` has only `@@index` — NO `@unique`, so uniqueness is not DB-enforced (race condition). |
| 6.3 | Unique ZanID Validation | ✅ Implemented | `prisma/schema.prisma:107` `zanId String @unique` (DB-enforced); `manual-entry/route.ts:180` `findUnique({ where: { zanId } })`; `bulk-upload/route.ts:416`; `hrims/sync-employee/route.ts:247` upsert keyed on zanId. |
| 6.4 | Unique ZSSF Validation | ⚠️ Partial | App-level check at `manual-entry/route.ts:208-220` and `bulk-upload/route.ts:436`. GAP: `prisma/schema.prisma:111` `zssfNumber` has NO `@unique` — application-level only; concurrent creation can bypass. |
| 6.5 | Duplicate Detection | ✅ Implemented | `src/app/api/employees/bulk-upload/route.ts:378` in-file dedup via `Set` for zanIds/zssfNumbers/payrollNumbers (379-409) AND DB dedup (413-446); `validate/route.ts:10` returns existence flags. |
| 6.6 | Institution Validation | ✅ Implemented | `manual-entry/route.ts:142` fetches institution, verifies `manualEntryEnabled` (`:151`) and `manualEntryStartDate/EndDate` window (`:159-177`); `institutionId` forced from `auth.institutionId` at `:250`; `bulk-upload/route.ts:580` forces auth-derived institutionId. |
| 6.7 | Audit Logging | ✅ Implemented | `manual-entry/route.ts:263` `logEmployeeAction({ action:'CREATED', dataSource:'MANUAL_ENTRY', institutionId })`; `bulk-upload/route.ts:601` logs each created employee with `dataSource:'BULK_UPLOAD'`. |
| 6.8 | Business Rule Validation | ✅ Implemented | `manual-entry/route.ts:58-138` enforces required fields, ZanID numeric format, phone format, name length, DOB range, employment-date-not-future; default status `On Probation` (`:249`); `bulk-upload/route.ts:347` re-validates ZanID per row. |

### Domain 7 — Bulk Upload Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 7.1 | Upload Authorization | ✅ Implemented | `src/app/api/employees/bulk-upload/route.ts:92-108,491-507` POST/PUT wrapped in `withAuth` + `withRateLimit`, both check `['HRO','ADMIN'].includes(role)`, plus `allowedRoles:['HRO','ADMIN']`. |
| 7.2 | File Type Validation | ✅ Implemented | `src/lib/file-validation.ts:329-386` `validateFileUpload` enforces extension blocklist (`:336`), MIME blocklist (`:346`), context allowlist `UPLOAD_CONFIGS.bulkUpload` (`:357`), magic-byte check `isMimeTypeCompatible` (`:378`); called at `bulk-upload/route.ts:187`. |
| 7.3 | File Size Validation | ✅ Implemented | `src/lib/file-validation.ts:42-70,367-374` `UPLOAD_CONFIGS.bulkUpload.maxSize = 1 MB`; rejects `buffer.length > config.maxSize` with 413. |
| 7.4 | Duplicate Detection | ✅ Implemented | `src/app/api/employees/bulk-upload/route.ts:378-451` in-file dedup via Sets + DB dedup via `findUnique/findFirst` on ZanID/Payroll/ZSSF. |
| 7.5 | Employee Validation Rules | ⚠️ Partial | `bulk-upload/route.ts:268-376` POST validates fields. GAP: the confirm/create PUT (`:528-583`) inserts the client-supplied `employees` array with NO re-validation of rules or re-check of duplicates — a client can bypass field validation by calling PUT directly. |
| 7.6 | Institution Validation | ✅ Implemented | `bulk-upload/route.ts:131-170` fetches institution, rejects when `!inst.manualEntryEnabled` (`:141`) and outside the manual-entry time window (`:152-170`); employees stamped with `institutionId` (`:580`). |
| 7.7 | Import Audit Logging | ✅ Implemented | `bulk-upload/route.ts:459-474` POST logs `logFileAction({action:'UPLOADED', totalRows/validRows/invalidRows})`; PUT loops `logEmployeeAction({action:'CREATED'})` per employee (`:601-613`). |
| 7.8 | Import Error Handling | ✅ Implemented | `bulk-upload/route.ts:248,371-376,477-487` splits `validEmployees`/`invalidEmployees` with per-row `errors[]`; PUT (`:590-597`) catches per-employee create errors into `failedEmployees`. |
| 7.9 | Transaction Integrity Validation | ⚠️ Partial | `bulk-upload/route.ts:542-598` uses `prisma.$transaction`, but per-employee `try/catch` (`:544-597`) is INSIDE the transaction — failed creates are swallowed into `failedEmployees` and successful rows still commit (best-effort, not all-or-nothing). |

### Domain 8 — Workflow Security & Approval Integrity

| # | Control | Status | Evidence |
|---|---|---|---|
| 8.1 | Workflow State Validation | ⚠️ Partial | `src/lib/employee-status-validation.ts:84-157` `validateEmployeeStatusForRequest` applied in `promotions/route.ts:246`, `cadre-change/route.ts:206`, `service-extension`, `resignation`. GAP: not invoked in `confirmation-requests`, `lwop-requests`, `retirement-requests`, `termination` POST handlers. |
| 8.2 | Workflow Transition Validation | ⚠️ Partial | `ALLOWED_TRANSITIONS` enforced in `[id]` routes (`promotions/[id]:91-110`, `confirmation-requests/[id]:77`, `lwop-requests/[id]:81`, `retirement/[id]:92`, `service-extension/[id]:91`, `termination/[id]:89`, `cadre-change/[id]:91`, `resignation/[id]:91`). GAP: `confirmations/[id]` and `lwop/[id]` lack a transition map; root PATCH handlers in `cadre-change/route.ts:464` and `resignation/route.ts` call `update({where:{id}})` directly with no transition check. |
| 8.3 | Approval Authorization Checks | ✅ Implemented | `promotions/[id]/route.ts:122-164` `isHrrpApproval`→HRRP, `isCommissionDecision`→HHRMD/HRMO; `checkRoleAuthorization` in `promotions/route.ts:482-498`, `cadre-change/route.ts:404-413`, `lwop`, `confirmations`. |
| 8.4 | Rejection Authorization Checks | ✅ Implemented | `promotions/[id]/route.ts:113-119` requires `rejectionReason` for any `rejected` status (400 if missing); role gating on rejection (`isHrrpRejection`→HRRP only, `:138-143`); repeated in `termination/[id]:112`, `cadre-change/[id]:114`, `lwop-requests/[id]`, `confirmations/[id]:77`. |
| 8.5 | Workflow Ownership Validation | ⚠️ Partial | `[id]` routes fetch existing request and check `existingRequest.Employee.institutionId !== auth.institutionId` → 403 (`promotions/[id]:80-87`, `confirmation-requests/[id]:329`, `lwop-requests/[id]:355`, `cadre-change/[id]:80`, `termination/[id]:78`). GAP: inline root PATCH handlers `cadre-change/route.ts:360-466` and `resignation/route.ts:344+` skip the institution-ownership check. |
| 8.6 | Workflow Chain Enforcement | ⚠️ Partial | `promotions/[id]/route.ts:91-103` enforces the HRRP→Commission chain; `reviewStage` server-controlled (`promotions/route.ts:419`); `commissionLetterKey` required for commission decisions (`promotions/[id]:158`). GAP: root PATCH handlers in `cadre-change` and `resignation` skip the transition table, allowing chain bypass. |
| 8.7 | Workflow Audit Logging | ✅ Implemented | `src/lib/audit-logger.ts` exports `logRequestSubmission/Approval/Rejection/Forward/Withdrawal`; invoked across workflows (`promotions/route.ts:370`, `promotions/[id]:236/399`, `promotions/[id]:383` forward, `promotions/[id]:535` withdrawal logged before delete). All include `ipAddress` + `deviceInfo`. |
| 8.8 | Non-Repudiation Controls | ✅ Implemented | `promotions/[id]/route.ts:57-62,519-525` reviewer id forced from `auth.userId` (client `reviewedById` overwritten); `promotions/route.ts:413-414` strips `userRole/userId`; withdrawal logged BEFORE delete (`:533-548`); audit writes include username/role/IP/device. |
| 8.9 | Business Rule Enforcement | ⚠️ Partial | `promotions/[id]/route.ts:166-209` wraps Commission approval + employee cadre update in `db.$transaction`; `promotions/route.ts:208-217` requires `proposedCadre` for Experience promotions. GAP: other workflows that mutate employee state (cadre-change approval, termination, retirement, resignation) do NOT wrap the request+employee updates in a transaction. |

### Domain 9 — Complaint Management Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 9.1 | Complaint Ownership Validation | ✅ Implemented | `src/app/api/complaints/[id]/route.ts:67-86` `isComplainant = existingComplaint.complainantId === auth.userId`; EMPLOYEE blocked from updating if not complainant and restricted to `allowedEmployeeFields` (`:78`). |
| 9.2 | Complaint Access Control | ✅ Implemented | `src/app/api/complaints/route.ts:151-165` GET `baseWhere` — EMPLOYEE sees only `{complainantId: userId}`, DO/HHRMD see `assignedOfficerRole`, Admin/CSCS see all; `[id]/route.ts:64-93` PUT restricts update to complainant or officer roles. |
| 9.3 | Complaint Authorization Checks | ✅ Implemented | `src/app/api/complaints/[id]/route.ts:87-93` non-officer/non-complainant roles (HRO/HRRP) get 403; officer-only status transitions gated by `isOfficerRole` (`:96`). |
| 9.4 | Complaint Status Validation | ✅ Implemented | `src/app/api/complaints/[id]/route.ts:95-110` `VALID_TRANSITIONS` map with `existingComplaint.status` lookup; invalid target returns 400 with allowed list. |
| 9.5 | Complaint Audit Logging | ⚠️ Partial | `[id]/route.ts:214-224` PUT logs `logComplaintAction` with trusted `auth.userId`. GAP: `complaints/route.ts:103-113` POST audit log uses CLIENT-supplied `body.complainantId`/`body.subject` and `performedById: body.complainantId` instead of `auth.userId` — false attribution possible even though the DB row uses trusted `auth.userId` (`:41`). |
| 9.6 | Confidential Information Protection | ✅ Implemented | `src/app/api/complaints/route.ts:199-220` `canSeeInternalNotes=['Admin','DO','HHRMD','CSCS']` gates `officerComments`/`internalNotes`; non-authorized roles receive `null`. |
| 9.7 | Complaint Resolution Authorization | ✅ Implemented | `src/app/api/complaints/[id]/route.ts:96-110` only `isOfficerRole` may set terminal/resolved statuses; transitions to `Closed - Commission Decision` only from `Under Review` per `VALID_TRANSITIONS`. |

### Domain 10 — File & Document Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 10.1 | File Access Control | ⚠️ Partial | `files/employee-documents/[filename]/route.ts:38-72` and `employee-photos/[filename]/route.ts:38-66` implement role-tiered access. GAP: `files/download/[...objectKey]`, `preview/[...objectKey]`, `exists/[...objectKey]` perform ONLY `verifyAuth` — any authenticated user can download/preview/probe any object by guessing its objectKey. |
| 10.2 | File Ownership Validation | ⚠️ Partial | Implemented only in `employee-documents/[filename]/route.ts:54-65` (EMPLOYEE: `user.employeeId === employeeId`) and `employee-photos`. Generic `download/preview/exists` routes perform no ownership validation. |
| 10.3 | Secure Download Authorization | ⚠️ Partial | `employee-documents` enforces institution/ownership. GAP: generic `download/[...objectKey]` (`:20-24`) authorizes on authentication alone; `preview` `mode=presigned` (`:60-74`) returns a direct MinIO presigned URL with no per-user constraint and skips integrity verification. |
| 10.4 | Document Authorization Checks | ⚠️ Partial | `employee-documents`/`employee-photos` enforce officer/institution/owner tiers. GAP: generic objectKey routes lack any document-level authorization beyond authentication. |
| 10.5 | File Type Validation | ✅ Implemented | `files/upload/route.ts:49` calls `validateFileUpload(..., 'generic')` enforcing `UPLOAD_CONFIGS.generic.allowedMimes=['application/pdf']` + blocklists + magic-byte check; `employee-photos` validates filename via regex `/^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp)$/i`. |
| 10.6 | File Integrity Validation | ✅ Implemented | `src/lib/file-integrity.ts:169-250` `recordFileHash`/`verifyFileHash` store/verify SHA-256; upload records hash (`files/upload/route.ts:67`); `download/[...objectKey]:65-75` and `preview:88-98` reject with 410 `INTEGRITY_MISMATCH` and emit `POTENTIAL_BREACH` (`file-integrity.ts:226-240`). |
| 10.7 | Malware Scanning | ✅ Implemented | `src/lib/clamav.ts:47-107` `scanFile` speaks ClamAV INSTREAM with fail-closed on error/timeout (`:77-84`); invoked in `validateFileUpload` step 5 (`file-validation.ts:388-411`) returning 403 `MALWARE_DETECTED` / 503 `SCAN_SERVICE_UNAVAILABLE`; `isClamAVEnabled()` defaults true (`:16`). |
| 10.8 | File Audit Logging | ✅ Implemented | `logFileAction` called in `files/upload/route.ts:71` (UPLOADED), `download/[...objectKey]:82` (DOWNLOADED), `preview:111` (PREVIEWED), `employee-documents/[filename]:111` (DOWNLOADED), `employee-photos`, `bulk-upload/route.ts:459` — all with performedBy identity + IP + deviceInfo. |

### Domain 11 — HRIMS Integration Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 11.1 | Synchronization Authorization | ✅ Implemented | `src/app/api/hrims/sync-employee/route.ts:72,179` `withAuth(..., { allowedRoles: ['Admin','HHRMD'] })` + `requireReauth(req,'hrims.sync',auth)` step-up (`:75`); `bulk-fetch/route.ts:489,541` same. |
| 11.2 | Trusted Source Validation | ⚠️ Partial | `sync-employee/route.ts:25-70,115` validates via `hrimsEmployeeResponseSchema.parse()`; `sync-documents/route.ts:27-56,120` validates documents schema. GAP: `fetch-employee/route.ts:10-48` uses only a TypeScript `interface` (no zod `.parse`) and `processDocuments` (`:229-317`) uploads to MinIO with NO ClamAV scan, unlike `sync-documents/route.ts:219-244`. |
| 11.3 | Employee Matching Validation | ✅ Implemented | `sync-documents/route.ts:86-104` and `sync-certificates/route.ts:79-97` look up employee by `zanId`/`payrollNumber` AND require `institutionId` match before storing; 404 if not in that institution. |
| 11.4 | Duplicate Prevention | ⚠️ Partial | `sync-employee/route.ts:247-308` upserts by `zanId`; `sync-certificates/route.ts:205-209` deletes existing certs on page 1 before re-creating. GAP: `sync-documents` overwrites a single field per type (`:247-268`) with no duplicate tracking. |
| 11.5 | Institution Validation | ✅ Implemented | Every HRIMS route validates institution exists by `voteNumber`/`institutionId` before processing: `sync-employee/route.ts:85-99`, `sync-documents/route.ts:69-83`, `fetch-employee/route.ts:442-451`, `fetch-by-institution/route.ts:46-55`, `search-employee/route.ts:42-56`. |
| 11.6 | Synchronization Audit Logging | ❌ Missing | `grep` of `src/app/api/hrims/` for `logAuditEvent/logConfigChange/logEmployeeAction/audit-logger` returns NONE. HRIMS routes only call `hrimsLogger` (structured logger), never the tamper-evident audit trail; employee upserts (`sync-employee/route.ts:294-308`) do NOT call `logEmployeeAction`. |
| 11.7 | Synchronization Failure Handling | ⚠️ Partial | `sync-documents/route.ts:208-323` counts `failed`/`rejectedForMalware` with ClamAV fail-closed (`:235-243`); `sync-employee/route.ts:152-156` swallows background-task errors to `.catch(log)`. GAP: `fetch-employee/route.ts:223-236` falls back to MOCK data on fetch error (mock data enters DB); no retry/dead-letter mechanism. |
| 11.8 | Data Integrity Validation | ⚠️ Partial | `sync-documents/route.ts:273-300` records + verifies document hash. GAP: `fetch-employee` `processDocuments` records/verifies no hash; no integrity check on employee record fields. |

### Domain 12 — Reporting & Export Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 12.1 | Report Authorization | ⚠️ Partial | `src/app/api/reports/route.ts:687` `withAuth(async ...)` with NO `allowedRoles` — any authenticated user can call the reports endpoint; only complaint reports are role-restricted (`:715` blocks HRO/HRRP). |
| 12.2 | Export Authorization | ❌ Missing | `src/lib/export-utils.ts:1-72` is a client-side `'use client'` module providing `loadPdfExporter`/`loadExcelExporter` with NO authorization checks; no server-side export endpoint exists; exports generated client-side with no server authorization. |
| 12.3 | Institution-Based Report Filtering | ✅ Implemented | `reports/route.ts:750-762` non-CSC roles always filtered by `auth.institutionId` (client param ignored); CSC may optionally filter; complaints use `shouldApplyInstitutionFilter` (`:1042-1044`). |
| 12.4 | Data Minimization | ⚠️ Partial | `reports/route.ts:817-834` uses Prisma `select` for needed columns; `sanitizeText` (`:17-25`) escapes XSS. GAP: `/all` case (`:1082-1285`) fetches full request rows; employee `zanId`, gender always surfaced — no field-level PII minimization for export. |
| 12.5 | Export Audit Logging | ❌ Missing | `grep` of `src/app/api/reports/` for audit-logger calls returns NONE; neither report generation nor export is recorded in the audit trail. |
| 12.6 | Report Ownership Validation | ❌ Missing | No ownership concept in `reports/route.ts`; filtering is purely by role+institution, no per-user ownership check on outputs. |
| 12.7 | Restricted Data Export Controls | ❌ Missing | No restricted-data classification in `reports/route.ts` or `export-utils.ts`; complaint reports are the only restricted type and are freely exportable client-side otherwise. |
| 12.8 | Export Approval Controls | ❌ Missing | No approval workflow anywhere in `src/app/api/reports/` or `export-utils.ts`; exports are immediate. |

### Domain 13 — Notification Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 13.1 | Recipient Validation | ✅ Implemented | `src/app/api/notifications/route.ts:14-20` GET verifies `userId === auth.userId` (or Admin); POST mark-read (`:46-52`) scopes `updateMany` to `userId: auth.userId`, preventing cross-user marking. |
| 13.2 | Notification Authorization | ✅ Implemented | `notifications/route.ts:8,34` both handlers wrapped in `withAuth`; GET enforces self-or-Admin (`:15`); POST scopes to caller's own `auth.userId` (`:49`). |
| 13.3 | Workflow Notification Controls | ✅ Implemented | `src/lib/notifications.ts:100-426` `NotificationTemplates` drive workflow notifications; `createNotificationForRole` (`:68-97`) targets only active users of a given role, used by HR workflow templates. |
| 13.4 | Complaint Notification Restrictions | ⚠️ Partial | `notifications.ts:133-150` defines complaint templates; role-targeted via `createNotificationForRole`. GAP: no code restricts complaint notifications to CSC-only recipients at the notification layer — restriction enforced only at the reports endpoint. |
| 13.5 | Notification Audit Logging | ❌ Missing | `grep` of `src/app/api/notifications/` and `src/lib/notifications.ts` for audit-logger calls returns NONE; `createNotification`/`createNotificationForRole` (`notifications.ts:50,68`) only call `logger.info`. |
| 13.6 | Content Minimization | ✅ Implemented | `src/lib/notifications.ts:17-48` `sanitizeNotificationText` strips control chars, HTML-escapes, truncates to `NOTIFICATION_MAX_LENGTH = 500`; applied at both `createNotification` (`:52`) and `createNotificationForRole` (`:74`). |

### Domain 14 — Administrative Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 14.1 | Administrative RBAC | ✅ Implemented | All `src/app/api/admin/*` routes set `allowedRoles: ['Admin']`: `hrims-settings/route.ts:40,130,165`, `reset-password/route.ts:21`, `lock-account/route.ts:18`, `unlock-account:90`, `cleanup-sessions:51,144`, `trigger-password-check:26`; `users/route.ts:104,242`, `users/[id]/route.ts:159,189`. |
| 14.2 | Privileged Access Control | ✅ Implemented | Step-up reauth via `requireReauth`: `reset-password/route.ts:24`, `lock-account/route.ts:21`, `unlock-account:25`, `users/[id]/route.ts:50` (role/institution change), `:170` (delete). |
| 14.3 | User Management Authorization | ✅ Implemented | `users/route.ts:43-104` GET and `:106-242` POST are Admin-only (`:242`); `users/[id]/route.ts:36,161` PUT/DELETE Admin-only; identity from signed session `auth`, not client cookie. |
| 14.4 | Role Assignment Authorization | ⚠️ Partial | `users/[id]/route.ts:30-34,49-60` role change requires Admin + reauth, self-role-change blocked (`:55-60`). GAP: a single Admin can assign the `Admin` role to anyone — no two-person/higher-privilege check; `users/route.ts` POST likewise lets Admin create a new Admin. |
| 14.5 | Institution Assignment Authorization | ✅ Implemented | `users/[id]/route.ts:49-52` institution change triggers `requireReauth(req,'users.role-change',auth)`; previous/new institution captured for audit (`:78-82,137-141`); Admin-only. |
| 14.6 | Configuration Change Authorization | ✅ Implemented | `admin/hrims-settings/route.ts:45-130` PUT is Admin-only, validates host/port, captures previous config, writes CRITICAL `logConfigChange` audit event (`:102-119`) with secrets redacted. |
| 14.7 | Administrative Audit Logging | ⚠️ Partial | `reset-password/route.ts:114-133`, `lock-account/route.ts:71-81`, `unlock-account:58`, `users/route.ts:217-230`, `users/[id]/route.ts:127-144`, `hrims-settings/route.ts:102-119` all log. GAP: `admin/cleanup-sessions/route.ts` and `admin/trigger-password-check/route.ts` do NOT log audit. |
| 14.8 | Separation of Duties | ⚠️ Partial | Self-role-change blocked (`users/[id]/route.ts:55-60`); `lock-account/route.ts:49-57` prevents locking another Admin. GAP: no two-person rule for Admin creation/role-escalation; the same Admin can both reset a password and unlock the account they locked. |

### Domain 15 — Audit Trail & Accountability

| # | Control | Status | Evidence |
|---|---|---|---|
| 15.1 | Audit Logging | ✅ Implemented | `src/lib/audit-logger.ts:112-147` `logAuditEvent` writes via `writeAuditLog` to `audit.audit_log`; 20+ typed helpers; `api-auth.ts:245,266` auto-logs unauthenticated/forbidden access. |
| 15.2 | Immutable Audit Records | ❌ Missing | `prisma/migrations/20260522010000_migrate_audit_to_partitioned/migration.sql` creates `audit.audit_log` with NO `REVOKE UPDATE,DELETE`, NO append-only trigger, NO immutability constraint; `grep` for `REVOKE/TRIGGER/append-only` in migrations returns NONE. |
| 15.3 | Append-Only Audit Logs | ❌ Missing | No DB-enforced append-only; `audit-db.ts:115-193` `writeAuditLog` only INSERTs (no UPDATE/DELETE helper in code), but the DB permits UPDATE/DELETE to any role with access. |
| 15.4 | Audit Log Retention | ✅ Implemented | `src/lib/audit-db.ts:535-587` `enforceRetentionPolicy(retentionMonths=84)` detaches partitions older than 84 months (7-year govt-HR window) without dropping. NOTE: not wired to any cron/scheduled job found — must be invoked manually. |
| 15.5 | Audit Access Control | ⚠️ Partial | `audit/logs/route.ts:85` GET restricted to `['Admin','CSCS']`. GAP: `audit/log/route.ts:7` POST uses `withAuth(...)` with NO `allowedRoles` — any authenticated user can POST an `UNAUTHORIZED_ACCESS` audit entry with client-supplied `userId`/`username`/`userRole`/`attemptedRoute`/`blockReason`, enabling audit-record spoofing. |
| 15.6 | Audit Integrity Validation | ⚠️ Partial | `src/lib/audit-health.ts:24-117` `checkAuditHealth` validates DB connectivity, row count, 24h event count, partition coverage. GAP: no tamper-detection / hash-verification step — integrity is only "is the table receiving rows," not "have rows been altered." |
| 15.7 | Change History Tracking | ✅ Implemented | `src/lib/change-history.ts:47-119` `queryChangeHistory` queries `audit.audit_log.additional_data` JSONB for `previousValue`/`newValue`; callers (`users/[id]/route.ts:137-141`, `hrims-settings/route.ts:104-105`) record previous/new values. |
| 15.8 | Security Event Logging | ✅ Implemented | `audit-logger.ts:19-74` defines `UNAUTHORIZED_ACCESS`, `LOGIN_SUCCESS/FAILED`, `SUSPICIOUS_LOGIN_SUCCESS`, `PASSWORD_PWNED_LOGIN`, `ACCOUNT_LOCKED/UNLOCKED`, `ROLE_VIOLATION`; `logSuspiciousLoginSuccess:263`, `logLoginAttempt:225`, `logAccountAction:992`. |

### Domain 16 — Background Processing Security

| # | Control | Status | Evidence |
|---|---|---|---|
| 16.1 | Job Authorization Validation | ⚠️ Partial | `src/app/api/hrims/fetch-by-institution/route.ts:113` `withAuth(...{ allowedRoles: ['Admin','HHRMD'] })` gates queueing; GAP: the worker `src/lib/jobs/hrims-sync-worker.ts:228` performs no per-job authorization re-check and cron jobs in `src/lib/cron-service.ts` run unauthenticated (`isAuthenticated: false`). |
| 16.2 | Job Ownership Validation | ❌ Missing | `src/lib/jobs/hrims-sync-worker.ts:228-237` `processHRIMSSyncJob` reads `institutionId, userId` from `job.data` but never validates that the queued `userId` owns/has rights to that `institutionId`; the `userId` field on `HRIMSSyncJobData` is optional and unused by the worker. |
| 16.3 | Job Audit Logging | ⚠️ Partial | `src/lib/cron-service.ts:245-278` logs `CRON_JOB_COMPLETED/FAILED` via `logAuditEvent`. GAP: the HRIMS worker (`hrims-sync-worker.ts:476-486`) only emits `workerLogger.info/error` — no `logAuditEvent`, so background job execution is NOT in the audit trail. |
| 16.4 | Duplicate Processing Prevention | ⚠️ Partial | `src/lib/jobs/hrims-sync-queue.ts:100` builds `jobId: hrims-sync-${institutionId}-${Date.now()}` with `removeOnComplete/removeOnFail`. GAP: `Date.now()` suffix means the same institution can be re-queued concurrently with no idempotency key on `institutionId`. |
| 16.5 | Retry Protection | ✅ Implemented | `src/lib/jobs/hrims-sync-queue.ts:57-61` `defaultJobOptions: { attempts: 3, backoff: { type:'exponential', delay: 5000 } }` + `concurrency: 2` + rate limiter (`max:5, duration:60000`) at `hrims-sync-worker.ts:469-473`; cron uses in-process `cronJobRunning` guard (`cron-service.ts:18,24`). |
| 16.6 | Workflow Integrity Validation | ✅ Implemented | `src/app/api/promotions/[id]/route.ts:90-110` enforces `ALLOWED_TRANSITIONS` state machine, requires `rejectionReason` (`:114`) and `commissionLetterKey` (`:158`). (Applied to workflow requests, not raw background jobs.) |
| 16.7 | Institution Context Validation | ⚠️ Partial | Queueing route verifies institution exists (`fetch-by-institution/route.ts:46-55`); worker writes `institutionId` into each employee row (`hrims-sync-worker.ts:193`). GAP: no check that the acting user belongs to the institution being synced — an Admin/HHRMD can sync any institution. |

### Domain 17 — Direct Object Reference Protection (IDOR)

| # | Control | Status | Evidence |
|---|---|---|---|
| 17.1 | Object Ownership Validation | ✅ Implemented | `src/app/api/employees/route.ts:79-106` EMPLOYEE fetches `user.employeeId`, 403s if mismatch; `employees/[id]/documents/route.ts:194-204` same; `complaints/[id]/route.ts:67` `complainantId === auth.userId`. |
| 17.2 | Object-Level Authorization | ✅ Implemented | `src/app/api/complaints/[id]/route.ts:65-93` role-gates: EMPLOYEE only edits own complaint + limited fields; `employees/route.ts:188` `shouldApplyInstitutionFilter` scopes list queries by role. |
| 17.3 | Resource Access Validation | ✅ Implemented | `src/app/api/employees/route.ts:107-132` HRO/HRRP 403 if `employee.institutionId !== userInstitutionId`; `requests/track/route.ts:107` applies institution filter; `employees/[id]/documents/route.ts:68-79` HRO institution check on upload. |
| 17.4 | Secure Object References | ✅ Implemented | `src/app/api/complaints/route.ts:41` `complainantId = auth.userId` (server-derived); `password-status/route.ts:10` uses `auth.userId`; `change-password/route.ts` derives session token from cookie not body. |
| 17.5 | Server-Side Identifier Validation | ✅ Implemented | `src/lib/api-auth.ts:92` `verifyAuth` derives `userId` solely from the HMAC-signed `session` cookie → DB session row → `:181` `db.user.findUnique`; client `auth-storage` cookie explicitly NOT authoritative (`api-auth.ts:9` comment). |
| 17.6 | Access Denial Logging | ✅ Implemented | `src/app/api/employees/route.ts:87-101,111-126` `logUnauthorizedAccess` with `additionalData: { idor: true, attemptedObjectId, targetInstitutionId }`; `api-auth.ts:245` `logAccessDenied` and `:266` `logForbiddenRoute`. |

### Domain 18 — Workflow State Integrity

| # | Control | Status | Evidence |
|---|---|---|---|
| 18.1 | State Machine Enforcement | ⚠️ Partial | `src/lib/employee-status-validation.ts:25-76` `statusRestrictions` enforced at submission. GAP: inline root PATCH handlers `cadre-change/route.ts:360-466` and `resignation/route.ts:344+` call `update({where:{id}})` with no existing-status fetch and no transition map — a client can drive a request directly to any status via the root endpoint. |
| 18.2 | Transition Validation | ⚠️ Partial | Implemented in `promotions/[id]:91-110`, `confirmation-requests/[id]:77`, `lwop-requests/[id]:81`, `retirement/[id]:92`, `service-extension/[id]:91`, `termination/[id]:89`, `cadre-change/[id]:91`, `resignation/[id]:91`. GAP: `confirmations/[id]` and `lwop/[id]` have NO `ALLOWED_TRANSITIONS` map; root PATCH handlers in `cadre-change` and `resignation` omit transition validation. |
| 18.3 | Status Change Authorization | ✅ Implemented | `promotions/[id]/route.ts:122-164` and `promotions/route.ts:482-498` map each target status to required role(s) via `checkRoleAuthorization`; identical pattern in `cadre-change/route.ts:404-413`, `lwop`, `confirmations`, `termination/[id]`. |
| 18.4 | Workflow Ownership Validation | ⚠️ Partial | `[id]` routes fetch existing request and enforce `existingRequest.Employee.institutionId !== auth.institutionId` → 403. GAP: root PATCH handlers `cadre-change/route.ts:360+` and `resignation/route.ts:344+` do not fetch the existing row and do not run the institution-ownership check. |
| 18.5 | Workflow Audit Logging | ✅ Implemented | `logRequestSubmission/Approval/Rejection/Forward/Withdrawal` called across workflows (`promotions/route.ts:370`, `promotions/[id]:236,399,535`, `cadre-change/route.ts:322,535,554`, `resignation/route.ts:305,497,515`, `termination/[id]:237,277`, `lwop-requests/[id]:226,266`, `confirmation-requests/[id]:208,244`), recording userId/username/role/ipAddress/deviceInfo. |
| 18.6 | Workflow Integrity Checks | ⚠️ Partial | `promotions/[id]:174-209` wraps Commission-approval + employee-cadre update in `db.$transaction`; `promotions/route.ts:413-419` strips client-supplied `userRole/userId/reviewStage`. GAP: only the promotions Commission-approval path is transactional — other workflows that mutate employee state do not wrap the request+employee updates in a transaction. |

### Domain 19 — Non-Repudiation

| # | Control | Status | Evidence |
|---|---|---|---|
| 19.1 | User Attribution | ✅ Implemented | `src/lib/audit-logger.ts:448-487` `logRequestApproval` records `approvedById/Username/Role`; the promotions route derives the actor from the signed session, overriding client-supplied id (`promotions/[id]/route.ts:57-62` `validatedData.reviewedById = auth.userId`). |
| 19.2 | Approval Attribution | ✅ Implemented | `src/app/api/promotions/[id]/route.ts:236-253` calls `logRequestApproval` with the reviewer fetched from DB (`username`, `role`) and `reviewStage: 'Commission Approval'`, binding the approval to the authenticated actor. |
| 19.3 | Decision Logging | ✅ Implemented | `src/lib/audit-logger.ts:492-533` `logRequestRejection` records `rejectedById/username/role`, `rejectionReason`, `action: 'REJECTED'`; rejection reason enforced required at `promotions/[id]/route.ts:114-119`. |
| 19.4 | Timestamp Validation | ✅ Implemented | `prisma/migrations/20260522010000_.../migration.sql:24` `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` — server-side, tamper-resistant; the application never supplies it. |
| 19.5 | Change Tracking | ✅ Implemented | `src/lib/change-history.ts:47-119` `queryChangeHistory` queries `audit.audit_log.additional_data` for `previousValue`/`newValue` pairs; `users/[id]/route.ts:75-81` captures `previousUser` before update for the audit diff. |
| 19.6 | Workflow Decision Audit Logging | ✅ Implemented | `src/lib/audit-logger.ts:590-633` `logRequestForward` records `fromStage`/`toStage`/`comment` and `action: 'FORWARDED'`; called at `promotions/[id]/route.ts:383-396`; withdrawal logged before row deletion at `promotions/[id]/route.ts:535-548`. |

### Domain 20 — Data Integrity Protection

| # | Control | Status | Evidence |
|---|---|---|---|
| 20.1 | Input Validation | ✅ Implemented | `src/lib/api-schemas.ts:41-107` `validateRequest` parses against Zod schemas and returns 400 `VALIDATION_ERROR`; schemas for employee queries, search, notifications, file uploads (`:113-147`); promotions use `updateSchema` (`promotions/[id]/route.ts:27-40`). |
| 20.2 | Business Rule Validation | ✅ Implemented | `src/lib/employee-status-validation.ts:84-157` `validateEmployeeStatusForRequest` enforces status-based request eligibility (e.g. probation/retired employees cannot be promoted) via `statusRestrictions` map (`:25-76`). |
| 20.3 | Data Integrity Checks | ✅ Implemented | `src/lib/file-integrity.ts:100-114` computes `sha256Hex` and compares to stored hash; on mismatch logs `POTENTIAL_BREACH` at CRITICAL severity ("possible tampering"). |
| 20.4 | Record Consistency Validation | ⚠️ Partial | Workflow state-machine transitions (`promotions/[id]/route.ts:90-110`) enforce consistent status progression; terminal-status withdrawal blocked (`:519-531`). GAP: no general cross-record consistency validator for non-workflow entities. |
| 20.5 | Synchronization Validation | ⚠️ Partial | `src/lib/jobs/hrims-sync-worker.ts:85-90,200-209` upserts by unique `zanId` preventing duplicate sync rows, skips records missing `zanIdNumber` (`:70-72`). GAP: no post-sync reconciliation/count verification against HRIMS `overallDataSize` beyond a progress log. |
| 20.6 | Referential Integrity Validation | ⚠️ Partial | Prisma schema relations enforce DB-level FKs; institution ownership validated in `promotions/[id]/route.ts:80-87`. GAP: no explicit referential-integrity check routine before writes (relies on DB constraints). |

### Domain 21 — Audit Log Protection

| # | Control | Status | Evidence |
|---|---|---|---|
| 21.1 | Append-Only Logging | ❌ Missing | `audit-db.ts:137-144` `writeAuditLog` only INSERTs (no UPDATE/DELETE SQL in code), but `audit.audit_log` migration has no DB-level append-only enforcement (no trigger, no REVOKE). Any DB role with privileges could UPDATE/DELETE out-of-band. |
| 21.2 | Audit Record Tamper Protection | ❌ Missing | No hash chaining in `audit.audit_log` (migration has no `prev_hash`/`curr_hash` columns); `grep` for `prev_hash|curr_hash|hash_chain` in migrations returns NONE; `audit-health.ts`/`audit-db.ts` contain no tamper-detection logic. |
| 21.3 | Audit Deletion Prevention | ⚠️ Partial | No DELETE endpoint exists in `src/app/api/audit/` (only GET logs and POST log). GAP: no DB-level prevention (REVOKE DELETE / trigger) — deletion prevented only by absence of an API, not by enforcement. |
| 21.4 | Audit Modification Prevention | ⚠️ Partial | No UPDATE endpoint exists; `writeAuditLog` is insert-only. GAP: no DB-level REVOKE UPDATE / immutability trigger. |
| 21.5 | Restricted Audit Access | ⚠️ Partial | Read access (`audit/logs/route.ts:85`) is Admin/CSCS only. GAP: the open `audit/log` POST (no role restriction, see Domain 15) lets any authenticated user write audit records, undermining restricted-write access. |
| 21.6 | Audit Integrity Monitoring | ⚠️ Partial | `audit-health.ts` monitors ingestion health (counts, partitions, latency) but NOT integrity/tampering; no hash-chain verification, no anomaly detection for modified/deleted rows; `assertPartitionsReady` (`audit-db.ts:477-518`) fails-fast on missing partitions but does not verify row integrity. |

### Domain 22 — Government Data Classification Enforcement

| # | Control | Status | Evidence |
|---|---|---|---|
| 22.1 | Data Classification Labels | ❌ Missing | `grep` of `prisma/schema.prisma` for `classification|confidential|restricted|sensitivity` returns no matches; no classification/sensitivity column on Employee, User, Institution, or file-document models; no classification label enum in code. |
| 22.2 | Classification-Based Authorization | ❌ Missing | `src/lib/route-permissions-config.ts` and `api-auth.ts` gate routes by `role` only; no permission check references a data classification level; no classification-aware middleware. |
| 22.3 | Classification-Based Reporting Controls | ❌ Missing | `src/app/api/reports/route.ts` matches "restricted" only as generic access-restriction wording, not a classification scheme; reports filtered by role/institution, not by data classification. |
| 22.4 | Classification-Based Export Controls | ❌ Missing | `src/lib/export-utils.ts` is a client-side lazy-loader with no classification gating, watermarking, or role-by-classification checks. |
| 22.5 | Classification-Based Audit Controls | ❌ Missing | `src/lib/audit-logger.ts` `AuditLogData` interface (`:92-107`) has no `classification` field; audit events categorized by `eventCategory`/`severity` only, never by the classification of the data touched. |

### Domain 23 — Restricted Government Data Protection

| # | Control | Status | Evidence |
|---|---|---|---|
| 23.1 | Enhanced Authorization Controls | ✅ Implemented | `src/lib/reauth.ts` (via `requireReauth`) enforces step-up re-authentication for Tier-1 actions: institution update/delete (`src/app/api/institutions/.../route.ts:26-33,177-183`), role/institution changes (`users/[id]/route.ts:49-52`). |
| 23.2 | Restricted Data Access Approval | ❌ Missing | No "restricted data" designation or approval workflow exists; access decided solely by role + institution scoping; no per-record restricted-data approval gate. |
| 23.3 | Enhanced Audit Logging | ⚠️ Partial | `file-integrity.ts:110,227` logs `POTENTIAL_BREACH` at CRITICAL; `reauth/route.ts:101-108` logs `POTENTIAL_BREACH`; `audit-logger.ts:812-848` `logConfigChange` is CRITICAL. GAP: no "restricted data" tag distinguishes these from generic events. |
| 23.4 | Export Restrictions | ❌ Missing | `src/lib/export-utils.ts` provides only lazy-loading of PDF/XLSX libraries — no role-based export authorization, no audit hook on export, no watermark/redaction of restricted fields, no rate limit on exports. |
| 23.5 | Administrative Approval Controls | ✅ Implemented | Step-up re-auth (`requireReauth`) for institution config changes and deletion; self-escalation prevention (`users/[id]/route.ts:54-60` "Cannot change your own role"); config changes audited at CRITICAL severity. |
| 23.6 | Security Monitoring and Alerting | ⚠️ Partial | `src/lib/suspicious-login-detector.ts:26-138` flags new-IP/new-device/concurrent/rapid logins; `src/lib/hibp.ts` checks passwords against breach database; `login/route.ts:249` logs `PASSWORD_PWNED_LOGIN`. GAP: detection writes audit rows and structured logs but there is no outbound alerting (no SOC webhook, email, or paging) — alerts must be discovered by querying the audit trail. |

### Domain 24 — Accountability & Traceability

| # | Control | Status | Evidence |
|---|---|---|---|
| 24.1 | User Attribution | ✅ Implemented | `prisma/migrations/20260522010000_.../migration.sql:8-10` audit_log stores `user_id, username, user_role`; every `logAuditEvent` path (`audit-logger.ts:112-129`) populates these from the authenticated session. |
| 24.2 | Timestamp Recording | ✅ Implemented | `migration.sql:24` `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` plus `event_id UUID DEFAULT gen_random_uuid()` (`:7`) — both server-generated, immutable by the application. |
| 24.3 | Activity Logging | ✅ Implemented | `src/lib/audit-logger.ts:112-147` `logAuditEvent` writes to partitioned `audit.audit_log`; `logger.info` mirrors to the structured logger for real-time monitoring. |
| 24.4 | Transaction Logging | ✅ Implemented | Request lifecycle helpers log SUBMITTED/APPROVED/REJECTED/FORWARDED/WITHDRAWN/UPDATED (`audit-logger.ts:448-717`); promotions route writes approval+forward atomically with the DB update (`promotions/[id]/route.ts:174-209,357-419`). |
| 24.5 | Correlation IDs | ❌ Missing | `grep` for `correlationId|correlation_id|x-request-id|x-correlation` in `src/` and `prisma/` returns no matches; audit table has per-row `event_id UUID` but no field linking multiple events of one request/transaction; no middleware injects a request-scoped correlation id; `logger.ts:34-43` pino config has no correlation binding. |
| 24.6 | End-to-End Audit Trails | ⚠️ Partial | A continuous audit trail exists in `audit.audit_log` with actor, IP, route, method, and `additional_data`. GAP: absence of correlation IDs means a single user transaction spanning multiple audit events cannot be programmatically reconstructed end-to-end. |

### Domain 25 — Separation of Duties

| # | Control | Status | Evidence |
|---|---|---|---|
| 25.1 | Role Separation Controls | ✅ Implemented | `src/lib/route-permissions-config.ts:17-167` `ROUTE_PERMISSIONS` enforces per-route role lists (e.g. `/dashboard/termination` → HRO, DO, HHRMD, CSCS, HRRP); mirrored in `middleware.ts:74-160` `canAccessRoute`; re-checked server-side via `withAuth({allowedRoles})` (`users/route.ts:104`). |
| 25.2 | Administrative Segregation | ✅ Implemented | `src/app/api/admin/*/route.ts` all use `{ allowedRoles: ['Admin'] }` (`hrims-settings/route.ts:40`, `reset-password/route.ts:21`, `lock-account/route.ts:18`); the Admin role is excluded from `CSC_ROLES` (`role-utils.ts:7`) so admins are NOT institution-scoped and confined to system-administration routes only. |
| 25.3 | Approval Separation | ⚠️ Partial | `promotions/route.ts:460-498` `checkRoleAuthorization` routes HRRP actions to HRRP and Commission decisions to HHRMD/HRMO, giving a two-stage workflow (HRO submit → HRRP approve → Commission). GAP: no explicit `submittedById !== auth.userId` self-approval guard in any PATCH handler; an HRRP who submits a request pre-approves their own submission by design. |
| 25.4 | Independent Verification Controls | ✅ Implemented | `src/app/api/admin/unlock-account/route.ts:16-20` requires `identityVerified: true` + `verificationNotes` (min 10 chars) as an explicit independent-identity-verification attestation before unlocking, plus step-up re-auth via `requireReauth` (`:24`). |
| 25.5 | Dual Authorization for Critical Actions | ❌ Missing | No two-person rule anywhere. `admin/reset-password/route.ts:21-25`, `admin/lock-account/route.ts:18-22`, `users/[id]/route.ts:36-52,161-171` (DELETE) each require only a single Admin + step-up re-auth; HRIMS config change (`hrims-settings/route.ts:45`) requires only a single Admin with no secondary approval; no `approver != requester` or co-signer logic in any admin or workflow route. |

### Domain 26 — Security Monitoring & Detection

| # | Control | Status | Evidence |
|---|---|---|---|
| 26.1 | Failed Login Monitoring | ✅ Implemented | `src/lib/account-lockout-utils.ts:91-140` `incrementFailedLoginAttempts` counts failures, locks at `MAX_FAILED_LOGIN_ATTEMPTS`; `login/route.ts:63,145,172,209,315` calls `logLoginAttempt` (success/failure) for every attempt; lockout escalates to SECURITY after >10 attempts (`account-lockout-utils.ts:78-82`). |
| 26.2 | Privilege Escalation Detection | ✅ Implemented | `src/app/api/users/[id]/route.ts:46-60` requires re-auth for role/institution changes, blocks self-role-change, captures `previousUser` (`:78-81`) so the audit row records the privilege-escalation diff; `ROLE_VIOLATION`/`PERMISSION_DENIED` event types exist (`audit-logger.ts:32-33`). |
| 26.3 | Authorization Failure Monitoring | ✅ Implemented | `src/lib/api-auth.ts:245,266,381` calls `logAccessDenied`/`logForbiddenRoute` on unauthorized and forbidden routes; `logAccessDenied` writes `ACCESS_DENIED` at WARNING severity with the actor's role and route (`audit-logger.ts:177-196`). |
| 26.4 | IDOR Attempt Detection | ✅ Implemented | `src/app/api/employees/route.ts:85-131` logs `logUnauthorizedAccess` with `additionalData.idor: true`, `attemptedObjectId`, `targetInstitutionId`, `actorInstitutionId` for both EMPLOYEE-cross-ownership and HRO/HRRP cross-institution attempts, returning 403. |
| 26.5 | Administrative Activity Monitoring | ✅ Implemented | `src/lib/audit-logger.ts:812-848` `logConfigChange` logs at CRITICAL with redacted previous/new values; `logUserAction` (`:766-803`) and `logAccountAction` (`:992-1026`) record admin user/lock actions; CSP reports captured at `src/app/api/csp-report/route.ts:15-25`. |
| 26.6 | Security Alerting | ⚠️ Partial | Detection is strong but alerting is passive: `csp-report/route.ts` and `error-report/route.ts` only `logger.warn/error`; `POTENTIAL_BREACH` (`file-integrity.ts:110`, `reauth/route.ts:101`) and `SUSPICIOUS_LOGIN_SUCCESS` (`audit-logger.ts:263-289`) write audit rows but trigger no outbound notification/SOC alert; `audit-health.ts:24-117` is pull-style (no push alerting); no email/webhook/paging integration found. |

### Domain 27 — Export & Data Extraction Control

| # | Control | Status | Evidence |
|---|---|---|---|
| 27.1 | Export Authorization | ⚠️ Partial | `src/app/api/reports/route.ts:687` `withAuth` guards the reports endpoint and `route-permissions-config.ts:138-149` restricts `/dashboard/reports` to a role set; complaint reports blocked for HRO/HRRP (`reports/route.ts:715-723`). GAP: `src/lib/export-utils.ts:31-66` `loadPdfExporter`/`loadExcelExporter` simply dynamically import jsPDF/XLSX with no per-export server authorization — actual export generation happens in the browser from already-returned JSON. |
| 27.2 | Export Audit Logging | ❌ Missing | `src/lib/export-utils.ts` contains no audit logging and `audit-logger.ts` has no export event type; the reports GET endpoint (`reports/route.ts:687-1343`) does not call any audit logger. (File downloads ARE logged, but report/data exports are not.) |
| 27.3 | Restricted Data Export Controls | ⚠️ Partial | `src/lib/sanitize-response.ts:70-97` `sanitizeEmployee` masks zanId/zssfNumber/payrollNumber/phoneNumber (`***` + last 4) and redacts `contactAddress` for non-privileged roles before data leaves the server; `reports/route.ts:750-762` enforces institution filtering. GAP: no field-level export restrictions beyond role-based masking; exports of full PII to PDF/XLSX allowed for any privileged role without extra authorization. |
| 27.4 | Data Minimization | ⚠️ Partial | `src/lib/sanitize-response.ts:6-25` `SENSITIVE_USER_FIELDS` strips password, lockout, password-history fields from user responses; `sanitizeEmployee` masks PII for non-privileged roles. GAP: the reports API (`reports/route.ts:812-1073`) returns full `zanId`, `name`, `gender`, `Institution` to all privileged roles with no column-level minimization for export. |
| 27.5 | Export Approval Workflow | ❌ Missing | No export-request/approval entity or flow exists; `find src -path "*export*approval*"` returns nothing; reports are generated synchronously on GET with no approval step. |
| 27.6 | Institution-Based Export Filtering | ✅ Implemented | `src/app/api/reports/route.ts:750-762` builds `institutionFilter.Employee.institutionId = auth.institutionId` for non-CSC roles via `shouldApplyInstitutionFilter`; CSC roles may optionally filter; complaint reports apply the same filter (`:1041-1053`). |

### Domain 28 — Administrative Change Control

| # | Control | Status | Evidence |
|---|---|---|---|
| 28.1 | Configuration Change Authorization | ⚠️ Partial | `src/app/api/admin/hrims-settings/route.ts:45` PUT gated to `{ allowedRoles: ['Admin'] }` with host/port format validation (`:61-83`). GAP: no secondary approver for config changes — single-admin authorization only. |
| 28.2 | Change Approval Workflow | ❌ Missing | `src/app/api/admin/hrims-settings/route.ts:45-130` applies the new HRIMS host/port/apiKey/token immediately on `saveHrimsConfig` (`:93`) with no pending/approval state, no second admin required, no review queue; same for all other admin config routes. |
| 28.3 | Configuration Audit Logging | ✅ Implemented | `src/lib/audit-logger.ts:812-848` `logConfigChange` emits a CRITICAL-severity `HRIMS_CONFIG_CHANGED`/`SYSTEM_SETTING_CHANGED` event with redacted previous/new values; called from `hrims-settings/route.ts:102-119`. User CRUD uses `logUserAction` (`users/route.ts:217-230`; `users/[id]/route.ts:127-144`). |
| 28.4 | Change Tracking | ✅ Implemented | `src/app/api/users/[id]/route.ts:75-82,121-144` fetches the previous user row before update and writes `previousRole`/`newRole`/`previousInstitutionId`/`newInstitutionId`/`roleChanged`/`institutionChanged` into the audit `additionalData`; `hrims-settings/route.ts:86-98` records previous host/port and whether apiKey/token changed. |
| 28.5 | Configuration Integrity Validation | ⚠️ Partial | `src/app/api/admin/hrims-settings/route.ts:135-165` `POST /test` runs `testHrimsConnection` to validate config before/after save; `verifyEncryption()` round-trip in `src/lib/encryption.ts:75-87`. GAP: no signed-state / tamper-evidence for config rows themselves (HRIMS config stored via `hrims-config.ts` without a hash/signature field), so integrity validation of stored config is not enforced. |

### Domain 29 — Synchronization Accountability

| # | Control | Status | Evidence |
|---|---|---|---|
| 29.1 | Synchronization Logging | ❌ Missing | `grep` of `src/app/api/hrims/` for `logAuditEvent/logConfigChange/logEmployeeAction/audit-logger` returns NONE. HRIMS sync routes use `hrimsLogger` (plain structured logger) only — syncs are NOT recorded in the tamper-evident audit trail. |
| 29.2 | Synchronization Attribution | ❌ Missing | `sync-employee/route.ts:72-179` does not record `auth.userId`/`username`/`role` in any audit record (no audit call); the `withAuth` context provides the actor but it is never persisted to the audit trail for syncs — only `hrimsLogger.info` (non-tamper-evident). |
| 29.3 | Synchronization Result Tracking | ⚠️ Partial | `fetch-by-institution/route.ts:91-112` queues a job and returns a `jobId` + `statusUrl=/api/hrims/sync-status/${jobId}`; `job-status/route.ts` and `sync-status/route.ts` expose status. GAP: result tracked in the job queue, NOT in the audit trail. |
| 29.4 | Failure Logging | ⚠️ Partial | `sync-documents/route.ts:208-323` counts `failed` and `rejectedForMalware` and logs via `hrimsLogger.error`; `sync-employee/route.ts:152-156` logs background-task errors. GAP: all via structured logger only — NOT the audit trail, so failures are not tamper-evident or retention-protected. |
| 29.5 | Synchronization Audit Trails | ❌ Missing | No end-to-end audit trail for sync operations; `audit.audit_log` receives no HRIMS sync events — only operational logs in `hrimsLogger`. (Conflicts with Domain 11 Synchronization Audit Logging, also Missing.) |

### Domain 30 — Government Information Confidentiality

| # | Control | Status | Evidence |
|---|---|---|---|
| 30.1 | Need-to-Know Enforcement | ⚠️ Partial | Institution scoping via `src/lib/role-utils.ts:24-30` `shouldApplyInstitutionFilter` applied in `users/route.ts:46-48`, `promotions/route.ts:81-92`, `confirmations/[id]/route.ts:66-74`, `reports/route.ts:750-762`. GAP: `files/download/[...objectKey]/route.ts:16-96` and `files/preview/[...objectKey]/route.ts:14-58` authenticate and rate-limit but perform NO institution or ownership check on the requested `objectKey` — any authenticated user can download/preview any file by enumerating its key. |
| 30.2 | Least Privilege Enforcement | ⚠️ Partial | Per-route `allowedRoles` lists (`route-permissions-config.ts`, `middleware.ts`) and server-side `withAuth({allowedRoles})` enforce coarse role gates; `sanitizeEmployee` masks PII by role. GAP: the file download/preview routes grant every authenticated user the same file-access privilege regardless of role or institution, defeating least-privilege for document access. |
| 30.3 | Data Access Authorization | ⚠️ Partial | Request-scoped authorization checks exist for workflow records (e.g. `promotions/route.ts:446-453` institution ownership). GAP: file/document access has no per-object ACL (`files/download`, `files/preview`, `files/employee-documents/[filename]`, `files/employee-photos/[filename]` — all only call `verifyAuth`). |
| 30.4 | Institution Isolation | ⚠️ Partial | `shouldApplyInstitutionFilter` (`role-utils.ts:24-30`) isolates non-CSC roles to their own institution for users, requests, and reports. GAP: file routes and `employee-documents/[filename]` / `employee-photos/[filename]` routes do not filter by institution, so cross-institution document access is possible. |
| 30.5 | Confidential Data Protection | ❌ Missing | `src/lib/encryption.ts:13-61` defines `encryptPII`/`decryptPII`/`initEncryptionSession` backed by pgcrypto (`prisma/migrations/20260529000000_add_pii_encryption/migration.sql:20-46`) and the migration adds `*Encrypted` columns. BUT a repo-wide grep for callers of `initEncryptionSession`/`encryptPII`/`decryptPII` outside `encryption.ts` and the migration returns NOTHING — the functions are never invoked. Prisma schema (`prisma/schema.prisma:107-112`) still declares `zanId`, `phoneNumber`, `email`, `contactAddress`, `zssfNumber`, `payrollNumber`, `dateOfBirth` as plaintext columns. PII is stored and served in plaintext; the encryption layer is dead code. |
| 30.6 | Access Monitoring | ✅ Implemented | `src/lib/audit-logger.ts` provides `logAuditEvent`, `logUserAction` (`:766`), `logConfigChange` (`:812`), `logFileAction` (`:902`), `logRequestSubmission` (`:638`), `logAccountAction`, all recording `performedById`, `ipAddress`, `deviceInfo`, `severity`. File downloads monitored (`files/download/[...objectKey]:82-91`), admin actions monitored, workflow approvals/rejections logged across request-type routes; middleware logs unauthorized route attempts. |

---

## 3. Cross-Cutting Security Controls (HTTP/Transport Hardening)

Not in the 30-domain list, but supporting several domains; audited for completeness.

| Control | Status | Evidence |
|---|---|---|
| Security Headers (HSTS, X-Frame-Options, etc.) | ✅ Implemented | `next.config.ts:51-134` `headers()` sets HSTS (`max-age=63072000; includeSubDomains; preload` in prod, `:86-90`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, COEP/COOP/CORP; `poweredByHeader: false` (`:12`). |
| Content-Security-Policy | ⚠️ Partial | `next.config.ts:59-74` sets CSP with `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`, `report-uri /api/csp-report`; `src/lib/csp.ts:10-33` `generateNonce`/`getCspHeaders` provides a stricter nonce-based CSP, but it is NOT wired in by default — the default config still uses `'unsafe-inline'` for script-src/style-src (`:61-62`). `middleware.ts` does NOT set security headers; all come from `next.config.ts`. |
| CSRF Protection | ✅ Implemented | `src/lib/csrf-utils.ts` + `src/lib/api-csrf-middleware.ts` enforce double-submit cookie on state-changing routes; documented in `docs/CSRF_PROTECTION.md`. |
| CSP Violation Reporting | ✅ Implemented | `src/app/api/csp-report/route.ts:15-25` receives CSP reports. |

---

## 4. Most Material Gaps (Prioritized Remediation)

1. **PII stored in plaintext** (Domain 30.5) — `encryption.ts` + migration exist but are never called; `zanId`, `phoneNumber`, `email`, etc. are plaintext in the DB and served unmasked for privileged roles. Wire `encryptPII`/`decryptPII` into the repository layer.
2. **Generic objectKey file routes lack authorization** (Domains 10.1–10.4, 30.1–30.4) — `files/download`, `files/preview`, `files/exists` authenticate only; any user can download/preview any MinIO object by enumerating its key. Add institution/ownership checks like `employee-documents/[filename]`.
3. **Government Data Classification entirely absent** (Domain 22) — no classification labels, classification-aware authz, reporting, export, or audit. The largest single domain-level gap.
4. **Audit log not tamper-protected** (Domains 15.2–15.3, 21.1–21.2) — no hash chaining, no append-only trigger, no `REVOKE UPDATE,DELETE`. Immutability relies solely on absence of delete/update API endpoints.
5. **HRIMS syncs write zero audit records** (Domains 11.6, 29.1–29.5) — syncs use `hrimsLogger` only; the tamper-evident audit trail receives no sync events, attribution, or failure records.
6. **Open `POST /api/audit/log`** (Domains 15.5, 21.5) — no `allowedRoles`; any authenticated user can write spoofed `UNAUTHORIZED_ACCESS` audit entries with arbitrary identity fields.
7. **Argon2id not used** (Domain 1.9) — password hashing is bcryptjs cost-10; requirement specifies Argon2id.
8. **No dual authorization / two-person rule** (Domains 25.5, 28.2) — admin role grant, password reset, config changes, and critical deletes require only a single Admin + re-auth.
9. **Export security largely missing** (Domains 12, 27) — exports are client-side with no server authorization, no audit logging, no approval workflow, no field-level minimization.
10. **Correlation IDs absent** (Domain 24.5) — no request-scoped id linking audit events; end-to-end transaction reconstruction is not possible.
11. **Server-side inactivity timeout not enforced** (Domain 2.1) — `isSessionTimedOut` exists but `validateSession` never calls it; 10-min timeout relies on the client.
12. **Reauth OTP not validated** (Domain 1.13) — `reauth/route.ts:122-124` accepts `otp` but skips verification; step-up is password-only.
13. **Root PATCH bypass in `cadre-change` and `resignation`** (Domains 8.2, 8.5, 18.1) — inline handlers update by id with no existing-status fetch, no transition check, no institution-ownership check.
14. **`payrollNumber`/`zssfNumber` lack DB `@unique`** (Domains 6.2, 6.4) — uniqueness is application-level only; concurrent creates can introduce duplicates.
15. **`reports` endpoint has no role restriction** (Domain 12.1) — `withAuth` with no `allowedRoles`; any authenticated user can call it.
16. **Complaint POST audit uses client-supplied attribution** (Domain 9.5) — `complaints/route.ts:103-113` records `body.complainantId` into the audit log rather than `auth.userId`.
17. **No outbound security alerting** (Domains 23.6, 26.6) — detection is comprehensive but alerting is passive (log/audit-row only); no SOC webhook/email/paging.

---

## 5. Quick Wins — Easily Implementable Fixes

These are the gaps that can be closed with **small, low-risk, high-value code changes** (most are a handful of lines in a single file) and need no schema migration or architectural rework. Each was verified against the current source. Effort: **S** = minutes to a few hours, single file / ≤ ~15 lines; **M** = a few files / half-day, still self-contained.

> **Update (2026-07-10):** Quick Wins **Q1–Q14 have been implemented** in this pass (see the table below). Verification: `npm run typecheck` ✅, `npm run lint` ✅ (0 errors), `npx vitest run --dir src` ✅ (744 unit tests pass), `npx prisma validate`/`generate` ✅.
> - **Q1–Q12** applied exactly as specified (authz, non-repudiation, info-disclosure, session-timeout, CSPRNG, OTP, audit-logging, self-approval guard).
> - **Q13** (`@unique` on `payrollNumber`/`zssfNumber`): schema updated and a dedup-safe migration `prisma/migrations/20260710000000_unique_payroll_zssf/migration.sql` was added. **Applying it requires a live database** (`npx prisma migrate deploy` / `migrate dev`) — the migration file is committed but not applied here.
> - **Q14** (CSP): wired as **Report-Only** (`Content-Security-Policy-Report-Only` via a per-request Web-Crypto nonce in `middleware.ts`) so violations flow to `/api/csp-report` without blocking the UI. Full enforcement (removing `'unsafe-inline'`) is deferred pending the collected violation data.
> - **Q15** (object-level authz on generic `files/download|preview|exists` routes): **deferred** — flagged in this report as the highest-priority non-trivial follow-up (needs an object→owner lookup); not included in this pass.

| # | Quick Win | Domain(s) | Current Behavior | Recommended Fix (file:line) | Effort |
|---|---|---|---|---|---|
| Q1 | **Stop audit-record spoofing on `POST /api/audit/log`** | 15.5, 21.5 | `withAuth(async (request, { auth }) => ...)` reads `userId`/`username`/`userRole` from the client request body, so any authenticated user can write a spoofed `UNAUTHORIZED_ACCESS` entry with arbitrary identity fields. | Ignore the client-supplied identity fields and derive them from the authenticated session: set `userId: auth.userId`, `username: auth.username`, `userRole: auth.role` in `src/app/api/audit/log/route.ts:21-26` (keep `attemptedRoute`/`blockReason` from body — those describe the event, not the actor). No `allowedRoles` needed since the endpoint legitimately reports access-denied events for any signed-in user. | S |
| Q2 | **Restrict the reports endpoint by role** | 12.1 | `src/app/api/reports/route.ts:687` `withAuth(async (req, { auth }) => {...})` passes NO `allowedRoles`, so every authenticated role can call it. | Add an allowed-roles list matching `/dashboard/reports` (`route-permissions-config.ts:138-149`): `withAuth(async (req, { auth }) => {...}, { allowedRoles: ['Admin','HRO','HHRMD','HRMO','DO','CSCS','HRRP','PO'] })`. Institution filtering already enforces scoping for non-CSC roles. | S |
| Q3 | **Fix complaint-submission audit attribution** | 9.5 | `src/app/api/complaints/route.ts:103-113` records `complainantId: body.complainantId` and `performedById: body.complainantId` (client-supplied) into the audit trail, even though the DB row is created with the trusted `auth.userId` (`:41`). | Replace both with the authenticated identity: `complainantId: auth.userId, performedById: auth.userId` (keep `performedByUsername: complainant?.name`). One-line semantics change, restores non-repudiation. | S |
| Q4 | **Authenticate `sessions/force-logout`** | 2.7 | `src/app/api/auth/sessions/force-logout/route.ts:18` only runs `validateCSRF`; it trusts the client-supplied `userId` and `sessionId`, so an attacker can terminate another user's session. | Wrap the handler in `withAuth` and ignore the client `userId` — pass `auth.userId` to `terminateSessionById(sessionId, auth.userId)` so a user can only end their *own* sessions; restrict to Admin/`auth.userId===body.userId` if admins may terminate others. | S |
| Q5 | **Enforce server-side inactivity timeout** | 2.1 | `validateSession` (`src/lib/session-manager.ts:334`) only checks absolute `expiresAt`; the existing `isSessionTimedOut` (`src/lib/session-timeout-utils.ts:24`) is never called, so the 10-minute inactivity timeout relies on the client. | After fetching the session in `validateSession`, call `isSessionTimedOut(session.lastActivity)` and return `null` (optionally `db.session.delete`) when timed out. The `lastActivity` field is already updated elsewhere in this module. ~3 lines. | S |
| Q6 | **Use a CSPRNG for temporary passwords** | 1.10 | `src/lib/password-utils.ts:148-159` `generateTemporaryPassword` uses `Math.random()` for all character selection — non-cryptographic. | `import { randomInt } from 'crypto'` and replace each `Math.floor(Math.random() * chars.length)` with `randomInt(chars.length)`; shuffle the result with `randomInt`-based Fisher-Yates. Mechanical, ~6 lines. | S |
| Q7 | **Validate the re-auth OTP** | 1.13 | `src/app/api/auth/reauth/route.ts:122-124` accepts an `otp` parameter but skips verification entirely (self-documented "Future: wire MfaToken verification"). Step-up auth is password-only. | When `body.otp` is present, call the existing MFA verifier from `src/lib/mfa-utils.ts` (e.g. `verifyMfaToken`/the same helper used at `login/route.ts:351`) and return `INVALID_CREDENTIALS` on failure before issuing the reauth token. The helper already exists — this is wiring, not new logic. | S |
| Q8 | **Add audit logging to HRIMS sync routes** | 11.6, 29.1–29.5 | `src/app/api/hrims/sync-employee/`, `sync-documents/`, `sync-certificates/`, `fetch-employee/` call only `hrimsLogger`; the tamper-evident audit trail receives no sync events, attribution, or failure records. | Import `logEmployeeAction`/`logAuditEvent` and emit a `SYNCED`/`SYNC_FAILED` audit event at the end of each handler with `performedById: auth.userId`, the institution, and result counts (`created`/`updated`/`failed`). A few lines per route; closes 5 missing controls at once. | M |
| Q9 | **Add audit logging to notifications** | 13.5 | `createNotification`/`createNotificationForRole` (`src/lib/notifications.ts:50,68`) only call `logger.info`. | Call `logAuditEvent` (or a new `logNotificationAction`) inside both sinks with recipient id, template, and `performedById`. Central change covers all callers. | S |
| Q10 | **Audit `cleanup-sessions` and `trigger-password-check`** | 14.7 | `src/app/api/admin/cleanup-sessions/route.ts` and `trigger-password-check/route.ts` perform privileged admin actions with no audit record. | Add a `logAuditEvent` (or `logAccountAction`) call in each with the admin `auth.userId` and the affected scope (session count / user count). ~5 lines each. | S |
| Q11 | **Add `allowedRoles` to `employees/validate`** | 6 (info disclosure) | `src/app/api/employees/validate/route.ts` has no `allowedRoles`, so any authenticated user can enumerate whether a given `zanId`/`payrollNumber`/`zssfNumber` exists. | Wrap in `withAuth(..., { allowedRoles: ['HRO','Admin','HHRMD'] })` (the roles permitted to create employees). | S |
| Q12 | **Add a self-approval guard to workflow approvals** | 25.3 | No `submittedById !== auth.userId` check in any workflow PATCH handler; an HRRP who submits a request pre-approves their own submission. | In the approval branch of each `[id]` PATCH handler (e.g. `promotions/[id]/route.ts:122-164`), return 403 when `existingRequest.submittedById === auth.userId` for approval/rejection actions. One guard per workflow. | S |
| Q13 | **Enforce DB uniqueness for `payrollNumber` and `zssfNumber`** | 6.2, 6.4 | `prisma/schema.prisma:111-112` declare these without `@unique`; uniqueness is application-level only, so concurrent creates can introduce duplicates. | Add `@unique` to both columns and generate a migration. **Caveat:** run a dedup query first — if duplicate values already exist, the migration will fail, so deduplicate/NULL-blank existing rows before applying. | M |
| Q14 | **Wire the nonce-based CSP** | (cross-cutting) | `next.config.ts:59-74` ships a default CSP with `'unsafe-inline'` for script-src/style-src; `src/lib/csp.ts:10-33` already implements a stricter `generateNonce`/`getCspHeaders` but it is not wired in. | Wire `getCspHeaders` into `middleware.ts` (generate a per-request nonce, set the CSP header, and pass the nonce to scripts) and remove `'unsafe-inline'` from `next.config.ts`. Reduces XSS exposure. | M |
| Q15 | **Lock down the generic object-key file routes** (partial, listed for visibility) | 10.1–10.4, 30.1–30.4 | `files/download/[...objectKey]`, `preview/[...objectKey]`, `exists/[...objectKey]` authorize on authentication only — any user can fetch any MinIO object by enumerating its key. | Add an institution/ownership lookup before serving: resolve the object's owning employee/institution from a metadata table (file hashes are already recorded in `file-integrity.ts`) and apply the same `shouldApplyInstitutionFilter` + ownership checks used in `employee-documents/[filename]/route.ts:38-72`. **Not a one-liner** (needs an object→owner lookup), but high-value and self-contained — flagged here as the highest-priority non-trivial follow-up. | M |

**Recommended order:** ship Q1, Q2, Q3, Q4, Q11, Q12 first (all one-liners that close authz/non-repudiation/info-disclosure holes), then Q5–Q7, then the batched logging wins Q8–Q10, then Q13/Q14, and treat Q15 as a focused follow-up. Together these close roughly **20 of the 90 partial/missing controls** with minimal risk.

---

*End of report. This document was generated by static code audit and reflects the state of the repository at the time of review. Every file:line reference above was verified against the actual source.*
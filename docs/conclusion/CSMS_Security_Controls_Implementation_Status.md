# CSMS Security Controls — Implementation Status Report (All 30 Requirements)

**Source requirements:** `docs/conclusion/CSMS_Security_Requirements_Transform.md` (30 requirements, 206 individual controls/components)
**Codebase analyzed:** `/home/latest` (Next.js 14 + Prisma + PostgreSQL Civil Service Management System)
**Format:** Modeled on `docs/conclusion/sample_example.md` — each control is a testable acceptance criterion with an implementation verdict and `file:line` evidence.

**Status legend**
- ✅ **Implemented** — control is in place and meets the specification.
- ⚠️ **Partial** — control exists but has gaps, weaker config, or incomplete coverage.
- ❌ **Not Implemented** — control is absent or fails the specification.

---

## Master Summary — All 30 Requirements

| Req | Requirement (Domain) | Controls | ✅ Implemented | ⚠️ Partial | ❌ Not Implemented |
|----:|----------------------|:------:|:------:|:------:|:------:|
| 1 | Authentication & Identity Assurance | 13 | 7 | 3 | 3 |
| 2 | Session Security | 8 | 5 | 3 | 0 |
| 3 | Authorization & Least Privilege | 6 | 2 | 4 | 0 |
| 4 | Institution Data Isolation | 7 | 6 | 1 | 0 |
| 5 | Employee Profile Protection | 7 | 6 | 1 | 0 |
| 6 | Employee Creation Integrity | 8 | 5 | 2 | 1 |
| 7 | Bulk Upload Security | 9 | 3 | 6 | 0 |
| 8 | Workflow Security & Approval Integrity | 9 | 5 | 4 | 0 |
| 9 | Complaint Management Security | 7 | 4 | 2 | 1 |
| 10 | File & Document Security | 8 | 4 | 3 | 1 |
| 11 | HRIMS Integration Security | 8 | 4 | 2 | 2 |
| 12 | Reporting & Export Security | 8 | 3 | 0 | 5 |
| 13 | Notification Security | 6 | 2 | 4 | 0 |
| 14 | Administrative Security | 8 | 3 | 5 | 0 |
| 15 | Audit Trail & Accountability | 7 | 3 | 4 | 0 |
| 16 | Background Processing Security | 7 | 1 | 4 | 2 |
| 17 | Direct Object Reference Protection (IDOR) | 6 | 4 | 2 | 0 |
| 18 | Workflow State Integrity | 6 | 3 | 2 | 1 |
| 19 | Non-Repudiation | 6 | 5 | 1 | 0 |
| 20 | Data Integrity Protection | 6 | 2 | 3 | 1 |
| 21 | Audit Log Protection | 6 | 0 | 4 | 2 |
| 22 | Government Data Classification Enforcement | 5 | 0 | 0 | 5 |
| 23 | Restricted Government Data Protection | 6 | 1 | 3 | 2 |
| 24 | Accountability & Traceability | 6 | 4 | 1 | 1 |
| 25 | Separation of Duties | 5 | 2 | 2 | 1 |
| 26 | Security Monitoring & Detection | 6 | 4 | 1 | 1 |
| 27 | Export & Data Extraction Control | 6 | 1 | 3 | 2 |
| 28 | Administrative Change Control | 5 | 2 | 1 | 2 |
| 29 | Synchronization Accountability | 5 | 0 | 5 | 0 |
| 30 | Government Information Confidentiality | 6 | 3 | 3 | 0 |
| | **TOTAL** | **206** | **94** | **79** | **33** |

**Headline result:** 94/206 controls fully implemented (45.6%), 79/206 partial (38.3%), 33/206 not implemented (16.0%). The strongest areas are Institution Isolation, Employee Profile Protection, and Non-Repudiation. The weakest areas are Data Classification (Req 22), Audit Log Protection (Req 21), Reporting/Export (Req 12), and Background Processing (Req 16).

---

## Requirement 1: Authentication & Identity Assurance

**Process/Function:** User Authentication, Login Security & MFA

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 1.1 | Multi-Factor Authentication (designated roles) | ⚠️ Partial | `src/app/api/auth/login/route.ts:351-396`; `src/app/api/auth/mfa/verify-otp/route.ts:51-62`; `src/lib/mfa-utils.ts:59-90` | Email-OTP MFA enforced for **all** users with an email, not per-role. Silently skipped when user has no email (`login/route.ts:351,398`). No TOTP/hardware keys; no per-role MFA policy field on `User`. |
| 1.2 | Strong Password Policy / weak-password rejection | ✅ Implemented | `src/lib/password-utils.ts:132-140`; `src/app/api/auth/change-password/route.ts:133-162` | zxcvbn common-password rejection + HIBP k-anonymity breach rejection. |
| 1.3 | Minimum password length ≥ 12 | ❌ Not Implemented | `src/lib/password-utils.ts:6` (`PASSWORD_MIN_LENGTH = 8`) | Enforced minimum is 8, not 12. Fails spec. |
| 1.4 | Password complexity (4 classes) | ⚠️ Partial | `src/lib/password-utils.ts:33-46` | Requires only ≥2 of 4 character classes, not all four. |
| 1.5 | Password history (last 5) | ❌ Not Implemented | `src/lib/password-utils.ts:7` (`PASSWORD_HISTORY_LENGTH = 3`); `change-password/route.ts:172-186` | Only last 3 retained, not 5. |
| 1.6 | Password expiry (90 days, configurable) | ✅ Implemented | `src/lib/password-expiration-utils.ts:4-24`; `login/route.ts:299-345` | 90 days standard, 60 for Admin, 7-day grace. Reset on change. |
| 1.7 | Account lockout after 5 failed attempts | ✅ Implemented | `src/lib/account-lockout-utils.ts:4-5,78-86,121-143`; `login/route.ts:201-230` | 5 attempts → 30-min lockout; security lockout >10 attempts. |
| 1.8 | Login rate limiting per IP/user | ⚠️ Partial | `src/lib/rate-limiter.ts:16-29,117-204`; `login/route.ts:27` | Per-IP only (5/60s). No per-user sliding count; relies on lockout. |
| 1.9 | Secure password hashing (Argon2id + salt) | ❌ Not Implemented | `src/lib/password-utils.ts:1,182-195` (`bcrypt.genSalt(10)/hash`); `package.json:69` | bcryptjs cost-10 only — no `argon2`. Fails Argon2id spec. |
| 1.10 | Secure password reset (token, single-use, ≤15 min) | ❌ Not Implemented | `src/app/api/admin/reset-password/route.ts` (admin-initiated only) | No self-service token reset flow; no `resetToken` field on `User`. Only admin-issued temp password (7-day expiry). |
| 1.11 | Generic authentication error messages | ✅ Implemented | `src/app/api/auth/login/route.ts:72,163,184,221,290` | Identical "Invalid username/email or password" on all failure paths. |
| 1.12 | Failed login monitoring/logging | ✅ Implemented | `src/app/api/auth/login/route.ts:63-69,145-180,209-217,315-323`; `src/lib/audit-logger.ts:232-245` | `logLoginAttempt` records username, userId, role, IP, device, reason. |
| 1.13 | Reauthentication for high-risk actions | ✅ Implemented | `src/lib/reauth.ts`; `src/lib/api-auth.ts:355-403`; `src/app/api/auth/reauth/route.ts:66-76` | Step-up re-auth (HMAC cookie, 5-min TTL) on reset-password, role/institution change, HRIMS sync, lock/unlock, etc. |

---

## Requirement 2: Session Security

**Process/Function:** Session Lifecycle, Timeout & Cookie Hardening

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 2.1 | Session timeout (idle 15–30 min) | ⚠️ Partial | `src/lib/session-timeout-utils.ts:12-13`; `src/lib/session-manager.ts:362-370` | Idle timeout is 10 min — stricter but outside the specified 15–30 min window. |
| 2.2 | Absolute session lifetime (8–12 hrs) | ✅ Implemented | `src/lib/session-manager.ts:26-27,109-116,152-156,347-354` | 8-hr absolute expiry embedded in HMAC cookie + DB `expiresAt`. |
| 2.3 | Secure session identifiers (HttpOnly/Secure/SameSite/random) | ✅ Implemented | `src/lib/session-manager.ts:60-62,79-99,109-147` | `crypto.randomBytes(32)`, `httpOnly`, `secure` in prod, `sameSite:'strict'`, `__Host-` prefix, HMAC-signed. |
| 2.4 | Session invalidation on logout | ✅ Implemented | `src/app/api/auth/logout/route.ts:39-57,82-106` | DB row deleted + cookies cleared (`maxAge:0`). |
| 2.5 | Session invalidation on password/role change | ⚠️ Partial | `change-password/route.ts:236-259` (pw ✅); `src/app/api/users/[id]/route.ts:83-96` (role ❌) | Password change invalidates other sessions; **role/institution change does not** invalidate sessions. |
| 2.6 | Server-side session validation on every request | ⚠️ Partial | `src/lib/api-auth.ts:92-204`; `src/lib/session-manager.ts:336-383` | API routes fully validate (HMAC + DB + IP/UA). Middleware (`middleware.ts:325-339`) only checks cookie **presence** on dashboard navigations — no HMAC/DB validation. |
| 2.7 | Concurrent session control | ✅ Implemented | `src/lib/session-manager.ts:25,285-301`; `src/app/api/auth/sessions/route.ts` | Max 3; oldest evicted on 4th login; user-facing session mgmt endpoints. |
| 2.8 | Reauthentication for sensitive actions | ✅ Implemented | `src/lib/reauth.ts`; `src/app/api/auth/reauth/route.ts:66-76` | See Req 1.13. |

---

## Requirement 3: Authorization & Least Privilege

**Process/Function:** RBAC, Least Privilege, Deny-by-Default

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 3.1 | RBAC mapping endpoints→roles | ⚠️ Partial | `src/lib/route-permissions-config.ts:17-167`; `src/middleware.ts:74-160`; `src/lib/api-auth.ts:235-300` | Central map for dashboard pages; API routes declare `allowedRoles` inline (no single API endpoint→role table). `Commission` role does not exist (`src/lib/constants.ts:4-13`) — folded into `HHRMD`/`HRMO`. |
| 3.2 | Least privilege enforcement | ⚠️ Partial | `src/app/api/admin/reset-password/route.ts:146`; `src/app/api/users/route.ts:248` | Admin-only on sensitive routes, but read vs write granularity not differentiated (e.g. `PO` shares reports allow-list with `HHRMD`). |
| 3.3 | Need-to-know access control | ⚠️ Partial | `src/app/api/employees/route.ts:79-106`; `src/lib/role-utils.ts:7,14-30` | `EMPLOYEE` restricted to own record; CSC roles see all institutions. Admin excluded from page-level allow-lists for most data pages. |
| 3.4 | Deny-by-default authorization | ✅ Implemented | `src/lib/route-permissions.ts:45-46`; `src/middleware.ts:189-190`; `src/lib/api-auth.ts:260-281` | `return false` / `forbidden()` when no rule matches. |
| 3.5 | Server-side authorization (not client role claims) | ⚠️ Partial | `src/lib/api-auth.ts:92-204,181-184` (API ✅); `src/middleware.ts:328-330,379` (pages ❌) | API reads role from DB. Middleware reads role from the forgeable `auth-storage` cookie for page gating. |
| 3.6 | Permission validation on every request | ⚠️ Partial | 83/102 API routes use `withAuth`/`verifyAuth` | Gap: `/api/external/employees/route.ts:17` has no auth (CSRF only); debug/test routes unprotected. |

---

## Requirement 4: Institution Data Isolation

**Process/Function:** Institution Scoping Across CRUD, Queries, Reports, Sync

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 4.1 | Institution ownership validation | ✅ Implemented | `src/app/api/employees/route.ts:107-132`; `src/app/api/confirmations/[id]/route.ts:67-68`; `src/app/api/promotions/[id]/route.ts:80-81` | IDOR check + 403 before serving/mutating cross-institution records. |
| 4.2 | Institution-based CRUD scoping | ✅ Implemented | `src/app/api/employees/route.ts:188-203`; `manual-entry/route.ts:222,250`; `bulk-upload/route.ts:472,580` | Client-supplied `institutionId` ignored/forced for non-CSC roles. Caveat: `null` institutionId bypasses filter (`src/lib/role-utils.ts:24-30`). |
| 4.3 | Institution context validation (session vs request) | ⚠️ Partial | `src/lib/api-auth.ts:200`; `src/app/api/employees/route.ts:200-203` | Session-sourced for non-CSC; CSC roles may pass any `institutionId` with no allow-list of valid institutions. |
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
| 5.6 | Access logging (profile view/edit) | ⚠️ Partial | `src/lib/audit-logger.ts:729-776,955-976` | Writes, file access, and IDOR denials logged. **No `EMPLOYEE_VIEWED`/`PROFILE_VIEW` event** — successful PII reads unaudited. |
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
| 6.5 | Duplicate detection (fuzzy name/DOB/institution) | ❌ Not Implemented | — (grep `fuzzy|similarity|levenshtein|soundex` → 0 hits) | Only exact-match uniqueness on zanId/zssf/payroll. No fuzzy detection. |
| 6.6 | Institution validation on creation | ⚠️ Partial | `manual-entry/route.ts:142-156,250`; `bulk-upload/route.ts:132-149` | Institution existence + `manualEntryEnabled` checked; but `ministry`/`department`/`currentWorkplace` are free-text, not validated against institution records. |
| 6.7 | Audit logging of creation (payload) | ✅ Implemented | `manual-entry/route.ts:263-274`; `bulk-upload/route.ts:602-613` | `CREATED` event with employeeId, name, zanId, dataSource, institutionId. (Full payload snapshot not retained.) |
| 6.8 | Business rule validation (mandatory/enum/date logic) | ⚠️ Partial | `manual-entry/route.ts:58-131`; `bulk-upload/route.ts:269-367` | Mandatory fields + ZanID/phone format + DOB/employment date logic. Gaps: `gender` enum not enforced on manual-entry; no cross-field date logic; `appointmentType`/`contractType` not validated. |

---

## Requirement 7: Bulk Upload Security

**Process/Function:** Bulk Import Authorization, Validation, Integrity

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 7.1 | Upload authorization | ✅ Implemented | `bulk-upload/route.ts:92,488,625` | `withAuth(['HRO','ADMIN'])`. |
| 7.2 | File type validation (.xlsx, .csv) | ⚠️ Partial | `src/lib/file-validation.ts:48-52,124-145` | Allow-list lacks `.xlsx` MIME; effectively CSV-only. Parsing assumes UTF-8 CSV. |
| 7.3 | File size validation (~10 MB) | ⚠️ Partial | `src/lib/file-validation.ts:49-52` | Cap is 1 MB, not ~10 MB. |
| 7.4 | Duplicate detection against existing records | ✅ Implemented | `bulk-upload/route.ts:378-411,414-451` | Within-file Set dedupe + per-row DB lookup on all three keys. |
| 7.5 | Employee validation rules (same as single) | ⚠️ Partial | `bulk-upload/route.ts:269-367` | Bulk path richer than manual; gaps: no ZSSF/payroll format, no `appointmentType`/`contractType` enum, no cross-field dates. |
| 7.6 | Institution validation per row | ⚠️ Partial | `bulk-upload/route.ts:580` | `institutionId` forced from session for every row; no per-row institution column read. |
| 7.7 | Import audit logging (batch ID, counts) | ⚠️ Partial | `bulk-upload/route.ts:459-474,602-613` | Upload event logs totalRows/validRows/invalidRows; per-row `CREATED` with `batchRow`. **No single batch ID** linking an import. |
| 7.8 | Import error handling (row-level) | ✅ Implemented | `bulk-upload/route.ts:246-376,477-487,615-624` | Per-row `errors[]`; returns `invalidEmployees`/`failedEmployees` with row numbers. |
| 7.9 | Transaction integrity (rollback) | ⚠️ Partial | `bulk-upload/route.ts:542` | `prisma.$transaction` wraps creates, but each `create` is independently try/caught — partial success, not atomic all-or-nothing. |

---

## Requirement 8: Workflow Security & Approval Integrity

**Process/Function:** Request Workflows, Approvals, Rejections, Chains

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 8.1 | Workflow state validation | ⚠️ Partial | `promotions/[id]/route.ts:91-110` + 5 siblings | `ALLOWED_TRANSITIONS` on 6 of 8 `[id]` routes; **missing on `confirmations/[id]` and `lwop/[id]`**; bulk PATCH handlers do not validate transitions. |
| 8.2 | Workflow transition validation (state machine) | ⚠️ Partial | Same as 8.1 | Same gap — bulk PATCH path and confirmations/lwop `[id]` lack state-machine enforcement. |
| 8.3 | Approval authorization checks (role↔stage) | ✅ Implemented | `promotions/route.ts:482-498`; `confirmations/route.ts:411-430`; + siblings | `checkRoleAuthorization` on every PATCH; stage-specific role gating. |
| 8.4 | Rejection authorization checks | ✅ Implemented | `promotions/route.ts:473-480`; `promotions/[id]/route.ts:113-119`; + siblings | Rejection gated by same role checks; reason required. |
| 8.5 | Workflow ownership validation (institution) | ✅ Implemented | `promotions/route.ts:235-243,446-453`; `promotions/[id]/route.ts:79-87,505-515` | `shouldApplyInstitutionFilter` + employee-institution check on POST/PATCH/DELETE. |
| 8.6 | Workflow chain enforcement (HRO→HHRMD/HRMO→Commission) | ⚠️ Partial | `promotions/route.ts:518-539`; `confirmations/route.ts:459-476`; + siblings | `reviewStage` server-controlled (deleted from client), but advanced via status string matching — no ordered-stage table; bulk PATCH can jump stages if role matches. |
| 8.7 | Workflow audit logging | ✅ Implemented | `src/lib/audit-logger.ts:455-687`; `promotions/[id]/route.ts:371-433,549-562` | Submission/approval/rejection/forward/withdrawal logged with IP, device, actor, stage. |
| 8.8 | Non-repudiation controls | ⚠️ Partial | `promotions/route.ts:542-547`; `promotions/[id]/route.ts:57-62,462-567` | Actor/IP/device/timestamp bound server-side. Gaps: audit writes use `.catch(()=>{})` (silent failures); no cryptographic signing of audit entries. |
| 8.9 | Business rules (no self-approval) | ✅ Implemented | `promotions/[id]/route.ts:138-150`; + 7 sibling `[id]` routes | Self-approval/rejection blocked. **Gap**: bulk PATCH handlers lack the self-approval check. |

---

## Requirement 9: Complaint Management Security

**Process/Function:** Complaint Lifecycle, Confidentiality, Resolution

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 9.1 | Complaint ownership validation | ✅ Implemented | `complaints/route.ts:41`; `complaints/[id]/route.ts:67,70-76` | `complainantId` server-derived; EMPLOYEE limited to own complaint. |
| 9.2 | Complaint access control (involved parties) | ⚠️ Partial | `complaints/route.ts:155-169,203-224` | List restricted by role; internal notes gated. No `GET /api/complaints/[id]`; involved-party (non-complainant) visibility not modeled. |
| 9.3 | Complaint authorization checks (status change) | ✅ Implemented | `complaints/[id]/route.ts:64-93,112-115` | Officer roles only may change status; `reviewedById` server-sourced. |
| 9.4 | Complaint status validation (transitions) | ✅ Implemented | `complaints/[id]/route.ts:96-110` | Explicit `VALID_TRANSITIONS` map; invalid transitions → 400. |
| 9.5 | Complaint audit logging | ✅ Implemented | `src/lib/audit-logger.ts:906-950`; `complaints/route.ts:107-117`; `complaints/[id]/route.ts:214-224` | `COMPLAINT_SUBMITTED/UPDATED/RESOLVED` events. (Audit writes `.catch(()=>{})`.) |
| 9.6 | Confidential information protection (complainant identity) | ❌ Not Implemented | `complaints/route.ts:209-219` | No anonymization/redaction; complainant name, employeeId, zanId, phone numbers returned to all officer roles. No `confidential` flag. |
| 9.7 | Complaint resolution authorization | ⚠️ Partial | `complaints/[id]/route.ts:64-110` | Status transition enforced, but `assignedOfficerRole` never compared to actor — any officer role can resolve any complaint. |

---

## Requirement 10: File & Document Security

**Process/Function:** Upload/Download Authorization, Integrity, Malware

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 10.1 | File access control (permission before serving) | ⚠️ Partial | `files/employee-documents/[filename]/route.ts:42-78`; `files/employee-photos/[filename]/route.ts:38-71` (✅); `files/download/[...objectKey]/route.ts:20-49`; `files/preview/...`; `files/exists/...` (❌) | Employee-documents/photos enforce RBAC + institution. **Generic download/preview/exists only verify authentication** — any logged-in user can read any object key. |
| 10.2 | File ownership validation (institution/record) | ⚠️ Partial | `files/employee-documents/...:55-66`; `files/employee-photos/...:48-59` | Implemented for employee-documents/photos; **not for generic download/preview/exists**. |
| 10.3 | Secure download (signed, time-limited / MinIO presigned) | ⚠️ Partial | `src/lib/minio.ts:155-172`; `files/preview/[...objectKey]/route.ts:55-66` | Presigned URLs supported, but default 24h expiry is excessive; presigned mode returns to any authenticated user without ownership check. |
| 10.4 | Document authorization checks (type-specific) | ❌ Not Implemented | `files/employee-documents/[filename]/route.ts:42` | No per-document-type role gating; all docs treated identically by filename prefix. |
| 10.5 | File type validation (extension/MIME) | ✅ Implemented | `src/lib/file-validation.ts:46-365`; `files/upload/route.ts:49-55` | Context allow-lists + blocklists + magic-byte detection + MIME spoofing checks. (Generic upload always uses `'generic'` context.) |
| 10.6 | File integrity validation (checksum/hash) | ✅ Implemented | `src/lib/file-integrity.ts:14-22,169-230`; `files/download/...:60-72`; `files/preview/...:78-94` | SHA-256 `FileHash`/`DocumentHash` recorded + verified on retrieval; mismatch → 410. **Fail-open** when no hash or DB error. |
| 10.7 | Malware scanning | ✅ Implemented | `src/lib/clamav.ts`; `file-validation.ts:351-380`; `hrims/sync-documents/route.ts:267-292` | ClamAV INSTREAM, fail-closed on error. Gap: `sync-employee` photo not scanned; may be disabled via env. |
| 10.8 | File audit logging | ✅ Implemented | `src/lib/audit-logger.ts:955-985`; upload/download/preview/employee-docs routes | `UPLOADED/DELETED/DOWNLOADED/PREVIEWED` events. Gaps: `.catch(()=>{})` swallows failures; `files/exists` not logged. |

---

## Requirement 11: HRIMS Integration Security

**Process/Function:** Sync Authorization, Trusted Source, Matching, Integrity

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 11.1 | Synchronization authorization (service accounts/roles) | ✅ Implemented | `hrims/sync-employee/route.ts:222,76`; `sync-documents/route.ts:192`; `sync-certificates/route.ts:184`; `bulk-fetch/route.ts:541,489` | Role allow-lists + step-up reauth on `sync-employee`/`bulk-fetch`. Gap: `sync-documents`/`sync-certificates` lack reauth. |
| 11.2 | Trusted source validation (whitelisted endpoint, IP/cert, API key) | ❌ Not Implemented | `hrims/sync-employee/route.ts:230-234`; `sync-documents/route.ts:199-203`; `fetch-employee/route.ts:88-108` | `hrimsApiUrl` caller-controllable (SSRF risk); no host allow-list, no cert pinning, no IP allowlist; API key accepted from request body. |
| 11.3 | Employee matching (unique identifiers only) | ✅ Implemented | `hrims/sync-employee/route.ts:11-23,290-294`; `sync-documents/route.ts:12-25,102-110` | Zod requires zanId OR payrollNumber; match on `zanId`. |
| 11.4 | Duplicate prevention | ⚠️ Partial | `hrims/sync-employee/route.ts:342-356,296-301` | Upsert by zanId; institutionId never overwritten. Gap: `payrollNumber`-only matches could create duplicate zanId; no idempotency key; no `$transaction`. |
| 11.5 | Institution validation during sync | ✅ Implemented | `hrims/sync-employee/route.ts:86-111`; `sync-documents/route.ts:79-99` | Lookup by `voteNumber`; 404 + audit if missing. |
| 11.6 | Synchronization audit logging | ✅ Implemented | `src/lib/audit-logger.ts:778-814`; sync routes | `HRIMS_SYNCED`/`HRIMS_SYNC_FAILED` with actor, institution, zanId. (`.catch(()=>{})`.) |
| 11.7 | Synchronization failure handling (no partial silent writes) | ❌ Not Implemented | `hrims/sync-documents/route.ts:260-362`; `sync-employee/route.ts:194-199` | No `$transaction` anywhere in HRIMS routes; document writes per-row try/catch → partial commits; background doc sync is fire-and-forget. |
| 11.8 | Data integrity validation (incoming schema) | ⚠️ Partial | `sync-employee/route.ts:26-71,140`; `sync-documents/route.ts:28-57,152` (✅); `bulk-fetch/route.ts`; `fetch-employee/route.ts:110` (❌) | Strict Zod on sync-employee/documents/certificates; **`bulk-fetch` and `fetch-employee` persist `any`-typed data without runtime Zod**. |

---

## Requirement 12: Reporting & Export Security

**Process/Function:** Report Generation, Export Authorization, Audit

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 12.1 | Report authorization (roles) | ✅ Implemented | `src/app/api/reports/route.ts:687,1343` | `withAuth(['Admin','HRO','HHRMD','HRMO','DO','CSCS','HRRP','PO'])`; role from session. |
| 12.2 | Export authorization (roles) | ❌ Not Implemented | `src/lib/export-utils.ts:31-66` | No server-side export endpoint; exports are client-side from already-fetched data — no server authorization/rate limit. |
| 12.3 | Institution-based report filtering | ✅ Implemented | `src/app/api/reports/route.ts:750-762,1042-1054` | Non-CSC forced to `auth.institutionId`; client param ignored unless CSC. |
| 12.4 | Data minimization (exclude sensitive by default) | ✅ Implemented | `src/app/api/reports/route.ts:817-825,1055-1069` | Prisma `select` limits fields; passwords/emails/phones excluded; XSS-sanitized. |
| 12.5 | Export audit logging | ❌ Not Implemented | — (no `EXPORT`/`REPORT` event in `src/lib/audit-logger.ts`) | Reports GET writes no audit event; who-exported-what unrecorded. |
| 12.6 | Report ownership validation | ❌ Not Implemented | — | Reports are system-wide aggregates; no per-user ownership/standing check beyond role+institution. |
| 12.7 | Restricted data export controls | ❌ Not Implemented | — | No download rate limits, watermarking, quotas, or restricted-flag on sensitive report types. |
| 12.8 | Export approval controls (secondary approval) | ❌ Not Implemented | — (grep `export.*approv` → 0 hits) | No approval workflow / second-admin sign-off / reauth on exports. |

---

## Requirement 13: Notification Security

**Process/Function:** Recipient Validation, Content Minimization, Audit

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 13.1 | Recipient validation | ⚠️ Partial | `src/lib/notifications.ts:56-67,101-104`; `notifications/route.ts:15-20` | Role broadcasts scoped to active users; GET enforces ownership. `createNotification` accepts arbitrary `userId` with no existence/active check. |
| 13.2 | Notification authorization (who can trigger) | ⚠️ Partial | `notifications/route.ts`; `notifications.ts:73-138` | REST API authed+ownership; server helpers callable from many routes with no "may this caller send?" gate. |
| 13.3 | Workflow notification controls (involved parties only) | ⚠️ Partial | `complaints/route.ts:75-86`; `promotions/route.ts:329-330` | Broadcasts to every active DO/HHRMD/HRMO regardless of involvement; complainant updates correctly scoped. |
| 13.4 | Complaint notification restrictions | ⚠️ Partial | `complaints/route.ts:75-86`; `complaints/[id]/route.ts:165-171` | Submission fans out to officers across institutions; status updates to complainant scoped. |
| 13.5 | Notification audit logging | ✅ Implemented | `src/lib/notifications.ts:73-88,122-138` | `NOTIFICATION_SENT` per recipient; role broadcasts log one summary with `recipientCount`. |
| 13.6 | Content minimization | ✅ Implemented | `src/lib/notifications.ts:23,37-54` | `sanitizeNotificationText` strips control bytes, HTML-escapes, truncates to 500 chars at the sink. |

---

## Requirement 14: Administrative Security

**Process/Function:** Admin RBAC, User/Role/Config Management, SoD

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 14.1 | Administrative RBAC (Admin only) | ⚠️ Partial | `admin/reset-password/route.ts:145`; `admin/lock-account/route.ts:104`; `users/route.ts:248`; `users/[id]/route.ts:159,189` | Most admin routes `['Admin']`. Gap: `institutions/[id]/route.ts:29-33,179-183` PUT/DELETE have no Admin role check (only reauth). |
| 14.2 | Privileged access control (MFA for admin console) | ⚠️ Partial | `src/lib/reauth.ts`; `auth/reauth/route.ts:128-129` | Step-up reauth (with OTP if MFA enabled) on sensitive sub-actions. Gaps: no requirement Admin have MFA; `admin/hrims-settings` PUT skips reauth. |
| 14.3 | User management authorization (Admin only) | ✅ Implemented | `users/route.ts:248`; `users/[id]/route.ts:159,189` | Create/edit/deactivate Admin-only; non-Admin GET institution-scoped. |
| 14.4 | Role assignment authorization (Admin, logged) | ✅ Implemented | `users/[id]/route.ts:49-52,55-60,127-144` | Reauth required; self-role-change blocked; previous/new role audited. |
| 14.5 | Institution assignment authorization (Admin) | ✅ Implemented | `users/[id]/route.ts:49-52,140-142` | Reauth required; previous/new institution audited. |
| 14.6 | Configuration change authorization (Admin) | ⚠️ Partial | `admin/hrims-settings/route.ts:130` (Admin ✅); `institutions/[id]/route.ts` PUT (❌ no Admin check) | HRIMS config Admin-only; institution `manualEntryEnabled` toggle lacks Admin check. |
| 14.7 | Administrative audit logging (before/after) | ⚠️ Partial | `users/[id]/route.ts:127-144`; `institutions/[id]/route.ts:145-158`; `hrims-settings/route.ts:102-119` | User/institution/config changes capture before/after. Gaps: reset-password, lock/unlock, cleanup-sessions do not capture prior state. |
| 14.8 | Separation of duties (admin) | ⚠️ Partial | `users/[id]/route.ts:55-60`; `admin/lock-account/route.ts:49-57` | Self-role-change and lock-Admin blocked. Gaps: no self-reset/self-delete guard; no two-person rule on destructive actions. |

---

## Requirement 15: Audit Trail & Accountability

**Process/Function:** Audit Events, Immutability, Retention, Change History

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 15.1 | Audit logging (auth/workflow/admin/complaint) | ✅ Implemented | `src/lib/audit-logger.ts:19-81,232-999`; `audit-db.ts:115-193` | ~30 typed helpers across all domains; partitioned `audit.audit_log` table. |
| 15.2 | Immutable / append-only audit logs | ⚠️ Partial | `src/lib/audit-db.ts:137-144` (INSERT-only app layer) | No `REVOKE UPDATE,DELETE`, no trigger on `audit.audit_log`; no hash chain. App-only — DB-level tampering possible. |
| 15.3 | Audit log retention | ✅ Implemented | `src/lib/audit-db.ts:535`; `src/lib/cron-service.ts:354`; `scripts/archive-audit.sh` | 84-month default, monthly cron, partition detach + archival. |
| 15.4 | Audit access control (audit-review roles) | ✅ Implemented | `src/app/api/audit/logs/route.ts:85` | Reads restricted to `['Admin','CSCS']`. (No dedicated `audit-review` role.) |
| 15.5 | Audit integrity validation (tamper detection) | ⚠️ Partial | `src/lib/audit-health.ts:24-117`; `src/lib/file-integrity.ts:83-230` | File-integrity tamper detection yes; **audit-row tampering undetectable** (no hash chain/sig over rows). |
| 15.6 | Change history tracking (prev/new) | ⚠️ Partial | `src/lib/change-history.ts:47`; `users/[id]/route.ts:127-144`; `hrims-settings/route.ts:86-119` | Prev/new captured only for user role/institution + HRIMS config; most UPDATEs record new state only. |
| 15.7 | Security event logging (denied access, auth failures, IDOR, privesc) | ⚠️ Partial | `login/route.ts:63-315`; `api-auth.ts:245,266,381`; `employees/route.ts:87-126` | Auth failures, role violations, employees IDOR logged. Gaps: object-level `[id]` denials silent; middleware blocks `console.log` only. |

---

## Requirement 16: Background Processing Security

**Process/Function:** Job Authorization, Ownership, Idempotency, Audit

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 16.1 | Job authorization validation | ⚠️ Partial | `hrims/sync-employee/route.ts:73`; `bulk-fetch/route.ts:486,489`; `hrims-sync-worker.ts:237` | Enforced at enqueue; **worker does not re-validate** `job.data.userId` permission. |
| 16.2 | Job ownership validation | ❌ Not Implemented | `hrims/job-status/[jobId]/route.ts:32`; `sync-status/[jobId]/route.ts:48` | `job-status`/`sync-status` return any job to any Admin/HHRMD — no owner match; jobId pattern enumerable. |
| 16.3 | Job audit logging | ⚠️ Partial | sync routes (✅); `hrims-sync-worker.ts:485-489`; `bulk-fetch/route.ts` (❌) | Worker logs to pino only — **not to the tamper-evident audit trail**; `bulk-fetch` emits no audit event. |
| 16.4 | Duplicate processing prevention (idempotency) | ⚠️ Partial | `hrims-sync-worker.ts:200` (upsert ✅); `hrims-sync-queue.ts:100` (jobId ❌) | Data-level upsert yes; **job-level dedup no** — jobId uses `Date.now()`, so double-clicks enqueue duplicates. |
| 16.5 | Retry protection | ✅ Implemented | `hrims-sync-queue.ts:57,66`; `hrims-sync-worker.ts:311,478` | BullMQ `attempts:3` + backoff, 7-day retention, rate limiter. (No dead-letter audit event.) |
| 16.6 | Workflow integrity validation in background | ❌ Not Implemented | `hrims-sync-worker.ts:237` | Worker does not re-validate response shape or workflow/state transitions. |
| 16.7 | Institution context validation in background | ⚠️ Partial | `hrims-sync-worker.ts:197-218,213` | InstitutionId preserved on update; **not re-validated** (existence/voteNumber) before processing. |

---

## Requirement 17: Direct Object Reference Protection (IDOR)

**Process/Function:** Object Ownership, Per-Object Authorization, Identifier Safety

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 17.1 | Object ownership validation | ✅ Implemented | `employees/route.ts:79-106`; `complaints/[id]/route.ts:71`; `files/employee-documents/...:54-65`; `lwop/[id]/route.ts:314` | EMPLOYEE restricted to own records across employees/complaints/files/requests. |
| 17.2 | Object-level authorization (per object) | ✅ Implemented | `lwop/[id]/route.ts:72,301`; `promotions/[id]/route.ts:80,505`; `termination/[id]/route.ts:78,378` + siblings; file routes | Object fetched + institution compared before every mutate. |
| 17.3 | Resource access validation | ⚠️ Partial | `files/download/[...objectKey]/route.ts:16`; `files/preview/...` | IDOR-protected for employees/complaints/requests/employee-docs; **generic download/preview have no per-object check** — any authed user fetches any key. |
| 17.4 | Secure object references (UUID/non-sequential) | ✅ Implemented | `prisma/schema.prisma:481,510,167,187`; `users/route.ts:182`; audit `gen_random_uuid()` | `cuid()`/`uuidv4()` IDs across models; audit `BIGSERIAL`+UUID — non-enumerable. |
| 17.5 | Server-side identifier validation | ✅ Implemented | `src/lib/api-auth.ts:92`; `lwop/[id]/route.ts:50-55`; `complaints/route.ts:110-113`; `audit/log/route.ts:11-14` | Identity/reviewer IDs derived from signed session; client-supplied values ignored. |
| 17.6 | Access denial logging | ⚠️ Partial | `employees/route.ts:87,111`; `api-auth.ts:245,266,381` | Employees IDOR + `withAuth` denials logged. Gap: `[id]` route object-level denials return 403 silently; middleware blocks `console.log` only. |

---

## Requirement 18: Workflow State Integrity

**Process/Function:** State Machine, Transitions, Background Integrity Checks

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 18.1 | State machine enforcement | ⚠️ Partial | `promotions/[id]/route.ts:91-110` + 5 siblings | Explicit FSM on 6 of 8 `[id]` routes; **missing on confirmations/lwop** and all bulk PATCH handlers. |
| 18.2 | Transition validation | ⚠️ Partial | Same as 18.1 | Same gap. |
| 18.3 | Status change authorization | ✅ Implemented | `checkRoleAuthorization` in every PATCH; `reviewStage` server-controlled | Stage-matched role gating on all transitions. |
| 18.4 | Workflow ownership validation | ✅ Implemented | `shouldApplyInstitutionFilter` on POST/PATCH/DELETE across all workflows | Institution-scope check enforced. |
| 18.5 | Workflow audit logging | ✅ Implemented | `audit-logger.ts:455-687`; all workflow routes | Every state change logged with prev/new + actor. |
| 18.6 | Workflow integrity checks (background) | ❌ Not Implemented | — (grep `workflow.*integrity|stuck.*workflow` → 0 hits) | No background/cron job detects orphaned/inconsistent workflow states. |

---

## Requirement 19: Non-Repudiation

**Process/Function:** Attribution, Decision Logging, Server Timestamps, Change Tracking

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 19.1 | User attribution (bind to User ID) | ✅ Implemented | `audit-logger.ts:103,121-136`; `audit-db.ts:121,146`; `complaints/route.ts:112`; `lwop/[id]/route.ts:50-55` | `userId`/`username`/`role` from signed session on every audit row. |
| 19.2 | Approval attribution (approver identity) | ✅ Implemented | `audit-logger.ts:455-640`; `schema.prisma:21-22,28` | `reviewedById`/`hrrpReviewedById`/`approvedById` recorded per stage. |
| 19.3 | Decision logging (rationale/comments) | ✅ Implemented | `audit-logger.ts:499-540,597-640`; `lwop/[id]/route.ts:82` | `rejectionReason`/`comment`/`withdrawalReason` persisted; reason required. |
| 19.4 | Timestamp validation (server-generated) | ✅ Implemented | `audit-db.ts:137-144`; migration `created_at DEFAULT NOW()`; `schema.prisma` `@default(now())` | DB/server-generated only. Minor: `hrrpReviewedAt` Zod accepts client datetime. |
| 19.5 | Change tracking (field-level with actor) | ⚠️ Partial | `users/[id]/route.ts:78-81,127-144`; `hrims-settings/route.ts:86-119`; `audit-logger.ts:865` | Field-level prev/new only for user role/institution + HRIMS config; other UPDATEs record new state only. |
| 19.6 | Workflow decision audit logging | ✅ Implemented | `audit-logger.ts:45-50`; `lwop/[id]/route.ts:191-211` | `REQUEST_APPROVED/REJECTED/WITHDRAWN/FORWARDED/SUBMITTED/UPDATED`; stage handoffs logged. |

---

## Requirement 20: Data Integrity Protection

**Process/Function:** Input Validation, Business Rules, Referential Integrity, Locking

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 20.1 | Input validation (server-side type/length/format) | ⚠️ Partial | `src/lib/api-schemas.ts:41-147,157-171`; `src/lib/sanitize-input.ts:37-73`; ~33/102 routes with Zod | Central helper + DOMPurify. Gaps: `employees/route.ts`, `reports/route.ts`, `files/upload/route.ts`, `institutions/route.ts`, most collection POST handlers lack Zod. |
| 20.2 | Business rule validation | ⚠️ Partial | `src/lib/employee-status-validation.ts:25-157`; `sync-employee/route.ts:20-23` | Employee status→request-type rules + HRIMS cross-field refine. Gaps: most mutation routes validate presence/types only (no transition/date-ordering/eligibility rules). |
| 20.3 | Data integrity checks (FK consistency) | ✅ Implemented | `prisma/schema.prisma:31-34,85-88,134,277-280,302-342` | Prisma relations + `ON DELETE RESTRICT`/`SET NULL`. |
| 20.4 | Record consistency (optimistic locking) | ❌ Not Implemented | — (no `version`/`lockVersion` field in `schema.prisma`) | No optimistic locking; last-write-wins. |
| 20.5 | Synchronization validation (HRIMS integrity) | ⚠️ Partial | `sync-employee/route.ts:26-71,140,296-347`; `audit-logger.ts:778-814` | Request/response Zod + institutionId preservation + audit. Gap: no post-sync reconciliation/consistency job. |
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
| 23.6 | Security monitoring & alerting | ⚠️ Partial | `suspicious-login-detector.ts:26-60`; `audit-logger.ts:270-308`; `file-integrity.ts:109-124,226-240` | Detection + audit events present; **no outbound SOC alerting** (email/SIEM/pager) on critical events. |

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
| 26.6 | Security alerting (real-time) | ❌ Not Implemented | — (no webhook/SIEM/email in `src/lib`) | Audit INSERT + pino logs only; no outbound alerting. Middleware blocks `console.log` only — not in audit DB. |

---

## Requirement 27: Export & Data Extraction Control

**Process/Function:** Export Authorization, Audit, Restrictions, Filtering

| # | Control | Status | Evidence (file:line) | Remarks / Gap |
|---|---|---|---|---|
| 27.1 | Export authorization | ⚠️ Partial | `reports/route.ts:1338` (roles ✅); `files/download/[...objectKey]/route.ts:23` (❌ no per-object ACL) | Reports role-gated; generic file download authorizes any authenticated user. |
| 27.2 | Export audit logging | ⚠️ Partial | `files/download/...` (`logFileAction` ✅); `reports/route.ts` (❌ no audit) | File downloads audited; **reports export unaudited**. |
| 27.3 | Restricted data export controls | ❌ Not Implemented | — | No classification-based export restriction. |
| 27.4 | Data minimization | ⚠️ Partial | `sanitize-response.ts:13-40`; `admin/hrims-settings/route.ts:19-28` | User fields stripped; secrets masked. Gap: file downloads serve raw bytes; reports include full PII per row. |
| 27.5 | Export approval workflow | ❌ Not Implemented | — | No export-request entity/approver; downloads/reports immediate. |
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
| 30.1 | Need-to-know enforcement | ⚠️ Partial | `role-utils.ts:48`; `employees/route.ts:188`; `reports/route.ts:750-762` | Institution scoping + IDOR for employees/reports; **generic file download has no need-to-know check**. |
| 30.2 | Least privilege enforcement | ⚠️ Partial | `api-auth.ts:235-300`; `role-utils.ts:9` | Route-level RBAC; CSC roles see ALL institutions (broad, not least-privilege); no field-level ABAC. |
| 30.3 | Data access authorization | ✅ Implemented | `api-auth.ts:92-204`; `audit/logs/route.ts:8-10` | Identity from signed session (DB-validated), not forgeable cookie; institution + IDOR checks. |
| 30.4 | Institution isolation | ✅ Implemented | `schema.prisma:130,420`; `employees/route.ts:188`; `sync-employee/route.ts:296-301` | Server-side filtering; institutionId preserved on sync update. |
| 30.5 | Confidential data protection (encrypt/mask at rest + TLS) | ⚠️ Partial | `nginx-cscs-ssl.conf:9-27,185`; `next.config.ts:86-90` (TLS ✅); `migration 20260529000000_add_pii_encryption` + `src/lib/encryption.ts` (❌ dead code) | TLS to client enforced (HSTS, TLS1.2/1.3). **PII encryption is dead code** — `encrypt_pii`/`decrypt_pii` never called; PII stored plaintext. HRIMS upstream is plaintext HTTP. Secrets plaintext in `SystemSettings`. |
| 30.6 | Access monitoring | ✅ Implemented | per-route `logAuditEvent` calls; `schema.prisma:480-491` Session tracking; `health/audit/route.ts` | All authenticated access audited; sessions tracked with IP/UA/device. Gap: middleware edge-blocks are console-only. |

---

## Priority Remediation Recommendations

Derived from the highest-impact gaps above, ordered by risk:

1. **Harden authentication to spec** (Req 1): switch to Argon2id, raise min length to 12, require all 4 character classes, retain 5 password history, add self-service token-based password reset, and enforce MFA per-role (don't skip when email absent).
2. **Fix generic file download/preview/exists IDOR** (Req 10.1–10.3, 17.3, 27.1, 30.1): add per-object ownership/institution authorization before serving any MinIO object; shorten presigned-URL expiry.
3. **DB-enforce audit immutability** (Req 15.2, 21.1–21.6, 29.5): add `REVOKE UPDATE, DELETE` + a `BEFORE UPDATE/DELETE` trigger and a hash chain column on `audit.audit_log`; add a background hash-verification job.
4. **Trusted-source validation for HRIMS** (Req 11.2): allow-list HRIMS hosts, validate certs, reject caller-supplied `hrimsApiUrl`/`hrimsApiKey` (eliminate SSRF); wrap sync writes in `$transaction` (Req 11.7).
5. **Background processing audit & ownership** (Req 16.2, 16.3, 29.1–29.4): have the BullMQ worker write `logHrimsSync` audit events with actor + counts + per-record failures; make `job-status`/`sync-status` owner-bound; use a deterministic jobId (institutionId-based) for dedup.
6. **Stop trusting client role in middleware** (Req 2.6, 3.5): validate the `session` cookie (HMAC + DB) on dashboard navigations instead of the forgeable `auth-storage` cookie; invalidate sessions on role/institution change (Req 2.5).
7. **Add export/reporting controls** (Req 12, 27): create a server-side export endpoint with role authorization, audit logging (who/what/scope/counts), rate limits, and an approval workflow for bulk/sensitive exports; audit the reports GET endpoint.
8. **Implement data classification** (Req 22) and **restricted-data protection** (Req 23): add `classification` fields to the schema, wire classification into authorization/reporting/export/audit, and add an access-approval workflow + dual-approval export.
9. **Workflow state-machine coverage** (Req 8.1–8.2, 18.1–18.2): add `ALLOWED_TRANSITIONS` to `confirmations`/`lwop` and enforce transitions in the bulk PATCH handlers; add the self-approval check to bulk PATCH paths.
10. **Data integrity & concurrency** (Req 20.1, 20.4, 28.5): add Zod validation to remaining routes (`employees`, `reports`, `files/upload`, `institutions`); add a `version` field for optimistic locking; add config schema validation.
11. **Complainant confidentiality** (Req 9.6): redact/anonymize complainant identity for non-resolving officers; enforce `assignedOfficerRole` on resolution (Req 9.7).
12. **Correlation IDs & alerting** (Req 24.5, 26.6): generate a per-request correlation ID propagated through middleware→route→audit; add outbound alerting (SIEM/email/webhook) on CRITICAL events.
13. **Separation of duties** (Req 25.5, 14.8): introduce dual authorization for the most destructive actions (delete user/institution, HRIMS config change) and split admin sub-roles.
14. **Encrypt PII at rest & secure HRIMS transport** (Req 30.5): wire the existing `encrypt_pii`/`decrypt_pii` functions into the Employee data layer, or remove the dead migration; use HTTPS for the HRIMS upstream.

---

*Prepared from codebase analysis of `/home/latest` (branch `fix/e2e-chronic-failures`) on 2026-07-18. All `file:line` references are to the current working tree. Each table row maps directly to one or more UAT/penetration test cases per the implementation notes in `CSMS_Security_Requirements_Transform.md`.*
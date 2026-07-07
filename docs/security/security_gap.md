# Security Gap Analysis — CSMS (Civil Service Management System)

> Lists **not-yet-implemented** (❌) and **partially-implemented** (⚠️) security controls identified during the white-box codebase review captured in `UAT_Security_review_preparation.md` (v3.0). Each gap is mapped to its Applicable Control in `Security_requirements_and_Controls.md`, with `file:line` evidence, the codebase finding, and a recommended remediation.

---

## Document Control

| Item | Details |
| --- | --- |
| **Document Title** | Security Gap Analysis — CSMS |
| **Version** | 1.0 |
| **Date** | 2026-07-07 |
| **Codebase Branch** | `feat/err01-batch3-wrap-handler` |
| **Source** | `UAT_Security_review_preparation.md` (v3.0), `Security_requirements_and_Controls.md` |
| **Prepared By** | Automated Security Review (Claude Code) |

---

## 1. Executive Summary

Across the 30 mandatory security domains (207 controls), the codebase review found **64 gaps**:

| Type | Count | Meaning |
| --- | --- | --- |
| ❌ **Not implemented** | 31 | No codebase evidence — whole feature area absent, or infrastructure-dependent |
| ⚠️ **Partially implemented** | 33 | Control exists in some routes/situations but gaps remain |
| **Total gaps** | **64** | out of 207 controls (≈31% of all controls need work) |

### Gap distribution by domain

| Req | Domain | ❌ | ⚠️ | Total gaps |
| --- | --- | --- | --- | --- |
| 1 | Authentication & Identity Assurance | 1 | 1 | 2 |
| 4 | Institution Data Isolation | 0 | 1 | 1 |
| 5 | Employee Profile Protection | 2 | 0 | 2 |
| 6 | Employee Creation Integrity | 1 | 0 | 1 |
| 9 | Complaint Management Security | 0 | 2 | 2 |
| 10 | File & Document Security | 0 | 1 | 1 |
| 11 | HRIMS Integration Security | 0 | 5 | 5 |
| 12 | Reporting & Export Security | 4 | 0 | 4 |
| 13 | Notification Security | 1 | 1 | 2 |
| 14 | Administrative Security | 0 | 1 | 1 |
| 15 | Audit Trail & Accountability | 0 | 2 | 2 |
| 16 | Background Processing Security | 2 | 4 | 6 |
| 19 | Non-Repudiation | 0 | 1 | 1 |
| 20 | Data Integrity Protection | 1 | 1 | 2 |
| 22 | Government Data Classification Enforcement | 5 | 0 | 5 |
| 23 | Restricted Government Data Protection | 1 | 3 | 4 |
| 24 | Accountability & Traceability | 1 | 0 | 1 |
| 25 | Separation of Duties | 1 | 4 | 5 |
| 26 | Security Monitoring & Detection | 1 | 2 | 3 |
| 27 | Export & Data Extraction Control | 4 | 2 | 6 |
| 28 | Administrative Change Control | 2 | 0 | 2 |
| 29 | Synchronization Accountability | 4 | 1 | 5 |
| 30 | Government Information Confidentiality | 0 | 1 | 1 |

### Gap themes
The 64 gaps cluster into six themes (detailed in §3):
1. **Unbuilt feature areas** — Data Classification (Req 22), Export Control (Req 12/27), Synchronization Accountability (Req 29), Change Approval Workflow (Req 28.2).
2. **HRIMS integration hardening** — SSRF, non-atomic upsert, client-supplied institution, no audit, no retry (Req 11/16/20.5/29).
3. **Cryptography weakness** — bcrypt cost 10 instead of Argon2id, `Math.random` for temp passwords (Req 1.9/1.10).
4. **Record-level integrity** — no hash/checksum on employee/request rows (Req 5.7/20.3).
5. **Defense-in-depth for audit immutability** — convention-only, no DB-level trigger/RLS (Req 15.2).
6. **Monitoring/alerting reach** — no SOC/SIEM channel, no correlation IDs, dead event types (Req 24.5/26.6/23.6).

---

## 2. Detailed Gap List

Status legend: ❌ = Not implemented · ⚠️ = Partially implemented

---

### Req 1 — Authentication & Identity Assurance

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 1.9 | Secure Password Hashing (Argon2id) | ❌ | `lib/password-utils.ts:1,174-177` | `hashPassword` uses bcryptjs with cost factor 10, not Argon2id. No `argon2` dependency exists. | Migrate to Argon2id (recommended) or raise bcrypt cost to ≥12; add a migration path to re-hash on next login. |
| 1.10 | Secure Password Reset Process | ⚠️ | `api/admin/reset-password/route.ts:21-146`; `lib/password-utils.ts:145-168` | Admin-only reset gated by `requireReauth`, temp password flagged `isTemporaryPassword` with 7-day expiry + `mustChangePassword`, **but** `generateTemporaryPassword` uses `Math.random` not `crypto.randomBytes`. | Replace `Math.random` with `crypto.randomBytes` for temporary password generation (`password-utils.ts:153-168`). |

---

### Req 4 — Institution Data Isolation

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 4.7 | Institution Validation During Synchronization | ⚠️ | `api/hrims/sync-employee/route.ts:84-99` | Sync resolves institution by `voteNumber` and 404s if absent, but does NOT verify the caller's role/institution matches the target institution. | Derive target institution from auth context (or verify caller's institution covers the `voteNumber`); reject cross-institution sync. |

---

### Req 5 — Employee Profile Protection

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 5.4 | Record Update Authorization | ❌ | Not implemented in codebase | No `/api/employees/[id]/route.ts` exists (only certificates/documents/fetch-photo subroutes); no PATCH/PUT handler for employee records — updates flow via HRIMS sync upsert only. | If direct employee edits are in scope, add a PATCH endpoint with `verifyAuth` + institution/ownership checks + audit logging; otherwise document that HRIMS sync is the only mutation path. |
| 5.7 | Record Integrity Validation | ❌ | `lib/file-integrity.ts` (documents only) | `file-integrity.ts` hashes MinIO documents, not Employee row fields; no integrity hash on employee records. | Add a row-level integrity hash (or signed digest) for sensitive employee fields, verified on read; or document compensating control (audit trail + DB constraints). |

---

### Req 6 — Employee Creation Integrity

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 6.5 | Duplicate Detection | ❌ | Not implemented in codebase | Only exact-key uniqueness (payroll/ZanID/ZSSF) is checked; no fuzzy/name+DOB duplicate detection. | Add a pre-creation duplicate-detection step (name + DOB + institution) that returns a warning or confirmation prompt before create. |

---

### Req 9 — Complaint Management Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 9.4 | Complaint Status Validation | ⚠️ | `api/complaints/[id]/route.ts:12` (`z.string()`), `:97-110` (`VALID_TRANSITIONS`) | Status schema uses `z.string()` (not `z.enum`); unknown statuses are only rejected by the runtime `VALID_TRANSITIONS` map, not by Zod. | Replace `z.string()` with `z.enum(VALID_COMPLAINT_STATUSES)` to reject unknown statuses at parse time. |
| 9.7 | Complaint Resolution Authorization | ⚠️ | `api/complaints/[id]/route.ts:97-102` | Any officer role (DO/HHRMD/Admin/CSCS/HRMO) can mark a complaint Resolved; no upstream approval chain required before resolution. | Define a resolution authorization policy (e.g. DO recommends → HHRMD approves) or document that single-officer resolution is acceptable by design. |

---

### Req 10 — File & Document Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 10.1 | File Access Control | ⚠️ | `api/files/download/[...objectKey]/route.ts:20` (verifyAuth only); `api/files/employee-documents/[filename]/route.ts:40-72` (full RBAC) | Generic download/preview routes authenticate but never validate that the `objectKey` belongs to the caller (IDOR risk), while `employee-documents` enforces role/institution/ownership. | Add ownership/institution validation to the generic download & preview routes (resolve objectKey → employee → institution/owner before streaming). |

---

### Req 11 — HRIMS Integration Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 11.2 | Trusted Source Validation | ⚠️ | `api/hrims/sync-employee/route.ts:199-209` (Bearer+X-API-Key), `:187-191` (client-supplied URL/key) | Auth headers are sent, but the request body can override `hrimsApiUrl` and `hrimsApiKey`, enabling SSRF / credential injection. | Use env-only config for HRIMS URL/key; ignore client-supplied `hrimsApiUrl`/`hrimsApiKey` in the request body. |
| 11.4 | Duplicate Prevention | ⚠️ | `api/hrims/sync-employee/route.ts:247-308` (findFirst+create, non-atomic); sync-documents overwrites `*Url` per type (`:212-237`) | Employee upsert is findFirst-then-create (race-prone, not a true atomic upsert); documents are overwritten per type with no duplicate detection. | Use a DB unique constraint + `prisma.employee.upsert` for atomic idempotency; dedup documents by remote id. |
| 11.5 | Institution Validation | ⚠️ | `api/hrims/sync-employee/route.ts:84-99` (client-supplied voteNumber), `:286` | `institutionVoteNumber` is client-supplied and used to resolve the institution; a caller can target any institution vote number. | Derive the target institution from the authenticated user's context; reject cross-institution sync. |
| 11.6 | Synchronization Audit Logging | ⚠️ | `api/hrims/sync-employee/route.ts:79,123` (hrimsLogger only) | Sync routes write operational logs only (`hrimsLogger`); no structured audit event is recorded for sync writes. | Add `logAuditEvent` (new `HRIMS_SYNC_*` event types) on sync upserts and document writes. |
| 11.7 | Synchronization Failure Handling | ⚠️ | `api/hrims/sync-employee/route.ts:152-156` (Promise.all.catch), `:212-236` (returns null on HRIMS error) | Failures are logged and swallowed; no retry/queue, no job-failure audit, background task errors only logged. | Route syncs through the existing BullMQ queue with bounded retry + dead-letter, and emit a failure audit event. |

---

### Req 12 — Reporting & Export Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 12.2 | Export Authorization | ❌ | No general export API route; client-side CSV only (`app/dashboard/admin/audit-trail/page.tsx:256-300`) | No dedicated export-authorization controls for report data exports; the reports route returns JSON only. | Add a server-side export endpoint with `withAuth` allowedRoles and per-export authorization. |
| 12.5 | Export Audit Logging | ❌ | Client-side CSV (`page.tsx:256-300`) with no server-side audit event | Export actions are not recorded as audit events. | Emit a `REPORT_EXPORTED` / `FILE_EXPORTED` audit event on every server-side export. |
| 12.7 | Restricted Data Export Controls | ❌ | Not implemented in codebase | No export controls (PII redaction, field-level restrictions, rate limits) for report exports. | Add field-level redaction/masking and rate limits to export endpoints; restrict PII bulk export. |
| 12.8 | Export Approval Controls | ❌ | Not implemented in codebase | No export approval workflow exists. | Add an export-request → approval → fulfillment workflow for bulk/sensitive exports. |

---

### Req 13 — Notification Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 13.5 | Notification Audit Logging | ❌ | `lib/notifications.ts:62,92` (logger.info only) | Notification creation is recorded only via the structured logger, not written to the immutable `audit.audit_log` — no `NOTIFICATION_*` event type exists. | Define `NOTIFICATION_CREATED`/`READ` event types in `audit-logger.ts` and call `logAuditEvent` on notification create/mark-read. |
| 13.6 | Content Minimization | ⚠️ | `lib/notifications.ts:17,31-48` (`sanitizeNotificationText`: 500-char truncation + HTML escape + control-char strip) | Length + HTML escape present, **but** the `link` field is not sanitized and DOMPurify (`sanitize-input.ts`) is not applied — only manual escaping. | Sanitize the `link` field (validate URL scheme); apply DOMPurify or reuse `sanitize-input.ts` for consistency. |

---

### Req 14 — Administrative Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 14.6 | Configuration Change Authorization | ⚠️ | `api/admin/hrims-settings/route.ts:45,130` (Admin-only); `api/institutions/[id]/route.ts:22-34,173-184` (verifyAuth + requireReauth but **no allowedRoles**) | HRIMS config is Admin-only, but institution PUT/DELETE calls `verifyAuth` + `requireReauth` with **no** `allowedRoles` check — any authenticated role (e.g. EMPLOYEE) that passes reauth could mutate/delete an institution. | Add `withAuth({ allowedRoles: ['Admin'] })` (or HHRMD) to `institutions/[id]/route.ts` PUT/DELETE. |

---

### Req 15 — Audit Trail & Accountability

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 15.2 | Immutable Audit Records | ⚠️ | `lib/audit-db.ts:137-144` (INSERT only); no DB-level trigger/RLS | Code never issues UPDATE/DELETE on `audit.audit_log`, but immutability is by convention only — no database-level constraint (trigger, GRANT revocation). | Add a DB-level safeguard: revoke UPDATE/DELETE grants on `audit.audit_log` from the app role, or add a trigger that rejects row mutation. |
| 15.7 | Change History Tracking | ⚠️ | `lib/change-history.ts:47-119` (queries `additional_data` JSONB); `api/users/[id]/route.ts:136-143` | Change history is stored as free-form previous/new pairs inside `additional_data` JSONB — shape varies by emitter and is not validated. | Standardize the change-history shape (a typed `previousValue`/`newValue`/`fieldName` structure) and validate it at emit time. |

---

### Req 16 — Background Processing Security

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 16.2 | Job Ownership Validation | ❌ | `api/hrims/sync-status/[jobId]/route.ts:26-43` | SSE handler calls `getJobStatus(jobId)` with no comparison of `job.data.userId`/`institutionId` to the caller; any Admin/HHRMD can stream any job. Queue captures `userId?` (`hrims-sync-queue.ts:23`) but never enforces it. | Compare `job.data.userId`/`institutionId` to the authenticated caller in `sync-status`; reject non-owners. |
| 16.3 | Job Audit Logging | ⚠️ | `cron-service.ts:80,129,209,245,266`; `bulk-upload/route.ts:459,602` | Cron + bulk-upload write structured audit events; HRIMS BullMQ worker (`hrims-sync-worker.ts:476-486`) emits console logs only; fire-and-forget doc syncs log to `hrimsLogger`, not the audit trail. | Wire worker `completed`/`failed` hooks into `logAuditEvent`; route fire-and-forget syncs through the audited queue. |
| 16.4 | Duplicate Processing Prevention | ❌ | `hrims-sync-queue.ts:100` | Job ID `hrims-sync-${institutionId}-${Date.now()}` — the ms suffix guarantees uniqueness, not dedupe; two concurrent syncs for one institution both run. `cronJobRunning` protects only the password-expiry cron. | Use a stable idempotency key (e.g. `hrims-sync-${institutionId}`) and a BullMQ job dedupe/lock. |
| 16.5 | Retry Protection | ⚠️ | `hrims-sync-queue.ts:57-68`; `api/hrims/sync-employee/route.ts:152-156` | BullMQ has `attempts:3` + backoff, but fire-and-forget syncs use `Promise.all().catch()` with no retry; worker tolerates ≤3 page failures before aborting — no upstream circuit-breaker. | Add retry/backoff to fire-and-forget syncs (route through the queue) and a circuit-breaker on the upstream HRIMS API. |
| 16.6 | Workflow Integrity Validation | ⚠️ | `bulk-upload/route.ts:542-598`; `hrims/sync-employee/route.ts:294-308` | Bulk-upload confirm uses `prisma.$transaction` (atomic); HRIMS sync uses per-record upsert (atomic per row) but the overall fetch→save loop is not transactional — a mid-loop failure leaves a partial set. | Wrap the HRIMS batch save in a transaction (or a documented batch boundary with checkpointing). |
| 16.7 | Institution Context Validation | ⚠️ | `bulk-upload/route.ts:111-129,498-526`; `hrims/sync-employee/route.ts:85-99` | Bulk-upload derives `institutionId` from auth/DB (safe); HRIMS sync-employee looks up institution by client-supplied `voteNumber` and never compares to caller — an Admin/HHRMD from one institution can sync into another. Worker trusts `job.institutionId` blindly. | Compare the sync target institution to the caller's institution; reject cross-institution sync. |

---

### Req 19 — Non-Repudiation

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 19.5 | Change Tracking | ⚠️ | `lib/audit-logger.ts:476-485,521-531` (approval/rejection additionalData lacks previous/new status); forward+config do track: `:626-627`, `:843-844` | `logRequestApproval`/`Rejection` additionalData records requestType, requestId, employee info, reviewStage, action — but does NOT explicitly capture previous/new request status; only `logRequestForward` (fromStage/toStage) and `logConfigChange` (previousValue/newValue) track transitions. | Add `previousStatus`/`newStatus` to the additionalData of `logRequestApproval`/`logRequestRejection`/`logRequestUpdate`. |

---

### Req 20 — Data Integrity Protection

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 20.3 | Data Integrity Checks | ⚠️ | `lib/file-integrity.ts:31-33,83-130` (SHA-256 `verifyDocumentHash`); no hash on non-file records | SHA-256 hash is recorded on upload and verified on read for documents/files; no equivalent integrity checksum for employee/request row data. | Extend the integrity-hash pattern to sensitive employee/request fields, or document the compensating control. |
| 20.5 | Synchronization Validation | ❌ | `lib/jobs/hrims-sync-worker.ts` (no validate/checksum/integrity/verify/reconcile hits) | HRIMS sync worker contains no checksum, reconciliation, or post-sync validation logic. | Add a post-sync reconciliation step (count match, field-level diff, or checksum) and flag mismatches. |

---

### Req 22 — Government Data Classification Enforcement (entire domain)

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 22.1 | Data Classification Labels | ❌ | No classification field in `schema.prisma` `Employee` (L97), `Institution` (L196), `DocumentHash` (L166), `FileHash` (L186) | No classification/sensitivity/label/clearance field exists on any Prisma model. | Add a `classification` enum field to relevant models (e.g. `Unclassified`/`Restricted`/`Confidential`/`Secret`). |
| 22.2 | Classification-Based Authorization | ❌ | No clearance attribute on `User`; no classification comparison in `employees/search/route.ts` or file-fetch routes | Authorization is role/region/institution-based only; no classification clearance check anywhere. | Add a `clearance` attribute to `User` and compare it to record classification on access. |
| 22.3 | Classification-Based Reporting Controls | ❌ | `reports/route.ts` (only role-based restriction at L719); no classification field on reports | Reports carry no classification metadata; no classification-based filtering/redaction logic. | Tag reports with classification and filter/redact by requester clearance. |
| 22.4 | Classification-Based Export Controls | ❌ | `export-utils.ts` (no classification/sensitivity/restricted logic) | Export utilities perform no classification-based access control. | Gate/ redact exports by classification level. |
| 22.5 | Classification-Based Audit Controls | ❌ | `audit-logger.ts` / `audit-db.ts` (no classification/sensitivity field or alert rule) | Audit log does not record or evaluate data classification. | Add a `classification` column to `audit_log` and alert on classified-data access. |

> **Req 22 is the only fully-unimplemented domain (0%).** It is a prerequisite for several controls in Req 23 (Restricted Data) and Req 27 (Export). Recommend implementing classification labels (22.1) first.

---

### Req 23 — Restricted Government Data Protection

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 23.2 | Restricted Data Access Approval | ❌ | Not implemented in codebase | No "data access request" entity/workflow. `REQUEST_APPROVED/REJECTED/SUBMITTED` events are for HR actions, not for granting restricted-data access. PII visibility is decided statically by role (`sanitize-response.ts:67`). | Build a data-access-request workflow (request → approve → time-boxed grant) for restricted PII fields. |
| 23.4 | Export Restrictions | ⚠️ | `audit-trail/page.tsx:240-308` (CSV export); `audit/logs/route.ts:59-69` (hard cap 100k); `export-utils.ts`; `sanitize-response.ts:83-97` | Audit-log CSV export is indirectly restricted (page is Admin-only, API Admin/CSCS-only) but the CSV dumps raw username/IP/route with no field-level redaction, no watermarking, no export-approval step, no per-export audit record. | Add field-level redaction + watermarking + per-export audit record to CSV export; add an export-approval step. |
| 23.5 | Administrative Approval Controls | ⚠️ | `route-permissions-config.ts:26-65`; `account-lockout-utils.ts:47`; `admin/unlock-account`, `admin/lock-account` (reauth-gated) | Multi-stage approval chains exist for HR actions (HRO→HRRP→HHRMD/HRMO) and security lockouts need admin unlock, but there is no separate "administrative approval" gate for accessing restricted PII — access is by role membership in `PRIVILEGED_EMPLOYEE_ROLES`, not per-action approval. | Add a per-action approval gate (or step-up reauth) for accessing restricted PII fields. |
| 23.6 | Security Monitoring and Alerting | ⚠️ | `suspicious-login-detector.ts:26-138`; `auth-helpers.ts:125-191`; `file-integrity.ts:110,227`; `reauth/route.ts:101`; `login/route.ts:249`; `account-lockout-utils.ts:148-167` | Detection is wired and several high-severity events are emitted. **Caveats:** the defined `MULTIPLE_FAILED_ATTEMPTS` and `SUSPICIOUS_REQUEST` event types (`audit-logger.ts:36-37`) are never emitted in non-test code; alerting is user-only (no admin/SOC channel) — monitoring is implicit via audit-trail review. | Emit the two dead event types; add an admin/SOC alert channel (email/SIEM webhook) for CRITICAL events. |

---

### Req 24 — Accountability & Traceability

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 24.5 | Correlation IDs | ❌ | Not implemented in codebase | No `X-Request-ID`, `correlationId`, or `traceId` reference exists in `/home/latest/src` (grep returned none). | Generate a correlation ID per request (middleware), stamp it on audit records and logs, return it in a response header. |

---

### Req 25 — Separation of Duties

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 25.1 | Role Separation Controls | ⚠️ | `route-permissions-config.ts` | Roles are separated in route-permissions-config (each role has distinct permissions), but runtime verification of role separation is not test-asserted. | Add automated tests that assert no role can perform another role's exclusive action. |
| 25.2 | Administrative Segregation | ⚠️ | Verify admin segregation | Admin duties segregated across multiple admin accounts, but no formal scope limitation per admin account. | Define admin scope tiers (e.g. user-mgmt admin vs. config admin) and enforce via `allowedRoles`. |
| 25.3 | Approval Separation | ⚠️ | Verify self-approval block | Self-approval is blocked in workflow routes, but the block is not verified by an automated test. | Add an automated test that submitter cannot approve their own request. |
| 25.4 | Independent Verification Controls | ⚠️ | Verify independent verification | Independent verification is enforced by distinct review stages, but no test asserts no self-verification. | Add automated tests for independent verification per workflow type. |
| 25.5 | Dual Authorization for Critical Actions | ❌ | Not implemented in codebase | Dual authorization is not implemented for any critical action. | Define critical actions (e.g. bulk export, config change, account deletion) and require two distinct authorized users. |

---

### Req 26 — Security Monitoring & Detection

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 26.2 | Privilege Escalation Detection | ⚠️ | `lib/audit-logger.ts:55,778` (`USER_UPDATED` logged only); no detection heuristic | `USER_UPDATED` audit rows capture role changes but no comparator or alert detects privilege-escalation patterns. | Add a comparator that flags role-escalation changes (e.g. to Admin/HHRMD) and emits a CRITICAL alert. |
| 26.4 | IDOR Attempt Detection | ⚠️ | `api/employees/route.ts:87,111` (`logUnauthorizedAccess`); `lib/audit-logger.ts:21,166` (`UNAUTHORIZED_ACCESS`) | `UNAUTHORIZED_ACCESS` is emitted on access denials that may include IDOR-style attempts, but no dedicated IDOR detector/label exists. | Tag IDOR-pattern denials (cross-institution object access by authenticated user) with a distinct event/label and threshold alert. |
| 26.6 | Security Alerting | ❌ | Not implemented in codebase | `lib/auth-helpers.ts:167-177` only creates an in-app notification to the user; no SOC email/Slack/SIEM webhook found anywhere in `src/lib`. | Add a security-alert sink (SOC email and/or SIEM webhook) for CRITICAL audit events. |

---

### Req 27 — Export & Data Extraction Control

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 27.1 | Export Authorization | ⚠️ | `api/audit/logs/route.ts:85` (allowedRoles `['Admin','CSCS']`); `app/dashboard/admin/audit-trail/page.tsx:239-302` (client-side CSV) | Audit-trail CSV export is gated via Admin/CSCS role on the underlying `/api/audit/logs` endpoint, but no other export routes (employee/file data) have authorization controls. | Add authorization to any new export endpoint; centralize export authorization. |
| 27.2 | Export Audit Logging | ❌ | Not implemented in codebase | Export is performed client-side (`page.tsx:296-302` via `Blob`/`URL.createObjectURL`); no server-side `FILE_EXPORTED` audit event is written. | Move export to a server-side endpoint and emit an audit event. |
| 27.3 | Restricted Data Export Controls | ❌ | Not implemented in codebase | CSV headers (`page.tsx:265`) include Username, IP Address, Device Type with no field-level masking for export. | Apply field-level masking/redaction to export output based on role/classification. |
| 27.4 | Data Minimization | ⚠️ | `api/audit/logs/route.ts:69-73` (MAX_LIMIT/DEFAULT_LIMIT); `page.tsx:241` (`limit: totalLogs`) | Server caps result count, but the export path explicitly requests `limit: totalLogs` to bypass pagination, pulling the full unminimized set. | Enforce a server-side export cap (max rows per export); paginate exports. |
| 27.5 | Export Approval Workflow | ❌ | Not implemented in codebase | No approval state machine, approver field, or pending/approved status exists for any export operation. | Add an export-request → approval → fulfillment workflow. |
| 27.6 | Institution-Based Export Filtering | ❌ | Not implemented in codebase | `/api/audit/logs/route.ts:34-75` applies no `shouldApplyInstitutionFilter` (defined in `lib/role-utils.ts:24` but unused here); audit exports are unfiltered by institution. | Apply `shouldApplyInstitutionFilter` to audit-log queries for non-CSC roles. |

---

### Req 28 — Administrative Change Control

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 28.2 | Change Approval Workflow | ❌ | Not implemented in codebase | `api/admin/hrims-settings/route.ts:92-98` applies the change immediately on Admin POST with no approval step, pending state, or approver assignment. | Add a change-request → approval → apply workflow for configuration changes. |
| 28.5 | Configuration Integrity Validation | ❌ | Not implemented in codebase | `lib/file-integrity.ts` only hashes MinIO documents, not configuration; no config-hash, checksum, or post-apply validation routine exists. | Record a config hash/checksum after each change and verify it on read/startup. |

---

### Req 29 — Synchronization Accountability (largely unimplemented)

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 29.1 | Synchronization Logging | ❌ | Not implemented in codebase | `lib/jobs/hrims-sync-worker.ts:11,240,440,477` only calls `workerLogger.info/error`; no `logAuditEvent`/`writeAuditLog` import or invocation in the worker. | Define `HRIMS_SYNC_*` event types and log start/complete/fail to `audit.audit_log`. |
| 29.2 | Synchronization Attribution | ❌ | Not implemented in codebase | No audit row is written at all (see 29.1), so the initiator `user_id` is never captured in `audit.audit_log` for sync jobs. | Capture the triggering user on the job and write it to the audit event. |
| 29.3 | Synchronization Result Tracking | ⚠️ | `api/hrims/sync-status/[jobId]/route.ts:80,119` (result, failedReason); `lib/jobs/hrims-sync-worker.ts:445-456` (return value) | Job result (employeeCount, skippedCount, fetchTime) is tracked in the BullMQ job and exposed via SSE, but never persisted to the audit trail. | Persist the sync result (counts, duration, status) to the audit event on completion. |
| 29.4 | Failure Logging | ❌ | Not implemented in codebase | `lib/jobs/hrims-sync-worker.ts:481` logs failures only via `workerLogger.error`; no audit event (e.g. `HRIMS_SYNC_FAILED`) is emitted to `audit.audit_log`. | Emit a `HRIMS_SYNC_FAILED` audit event on job failure with the failure reason. |
| 29.5 | Synchronization Audit Trails | ❌ | Not implemented in codebase | No `HRIMS_SYNC_*` event type in `lib/audit-logger.ts:19-74`; the worker has no audit import; the sync lifecycle produces no audit-trail entries. | Add `HRIMS_SYNC_STARTED`/`COMPLETED`/`FAILED` event types and wire the worker to the audit logger. |

---

### Req 30 — Government Information Confidentiality

| # | Control | Status | Evidence | Finding | Recommended Remediation |
|---|---|---|---|---|---|
| 30.1 | Need-to-Know Enforcement | ⚠️ | `lib/route-permissions-config.ts:11-116`; `lib/api-auth.ts:260-280` | RBAC gates routes by role, but there is no per-record need-to-know check; non-CSC institution users are scoped via `shouldApplyInstitutionFilter` only where callers apply it. | Add per-record need-to-know checks (record owner/assignee) beyond role + institution scoping. |

---

## 3. Prioritized Remediation Roadmap

Gaps are prioritized by **risk** (likelihood × impact), not just control count. "Missing" whole-feature areas that are prerequisites for other controls rank highest.

### Priority 1 — Critical (security exposures / prerequisite gaps)

| Gap | Why critical |
|---|---|
| **14.6** Institution PUT/DELETE lacks `allowedRoles` | Any authenticated user who passes reauth can mutate/delete an institution — privilege-escalation. **Fast fix** (add `withAuth`). |
| **11.2** HRIMS client-supplied URL/key (SSRF) | Request body can override the HRIMS URL/key → SSRF + credential injection. **Fast fix** (ignore client-supplied values). |
| **11.5 / 16.7** HRIMS sync cross-institution | Caller can sync employees into any institution via a client-supplied `voteNumber`. **Fast fix** (derive from auth). |
| **10.1** Generic file download/preview IDOR | `objectKey` not validated against caller — direct object reference. **Medium fix** (resolve objectKey → owner). |
| **22.1** Data Classification Labels | Prerequisite for Req 23 (Restricted Data) and Req 27 (Export) controls. Foundational. |

### Priority 2 — High (audit-trail integrity gaps)

| Gap | Why high |
|---|---|
| **15.2** Audit immutability is convention-only | No DB-level protection — a future code path or direct DB access could mutate audit rows. |
| **29.1–29.5** Synchronization Accountability | HRIMS sync lifecycle produces no audit-trail entries — non-repudiation gap for a data-import path. |
| **13.5** Notification audit logging | Notifications are outside the tamper-evident audit trail. |
| **19.5** Change tracking (previous/new status) | Approval/rejection audit events do not capture previous/new request status. |

### Priority 3 — Medium (integrity & monitoring hardening)

| Gap | Why medium |
|---|---|
| **1.9** Argon2id / bcrypt cost | bcrypt cost 10 is below modern guidance. |
| **1.10** `Math.random` temp passwords | Non-cryptographic RNG for admin-generated temp passwords. |
| **5.7 / 20.3** Record-level integrity | No hash/checksum on employee/request rows. |
| **20.5** Sync validation | No reconciliation/checksum post-sync. |
| **16.2 / 16.4** Job ownership & dedupe | HRIMS sync job IDOR + concurrent duplicate runs. |
| **11.4 / 16.6** Non-atomic upsert / non-transactional sync | Race-prone writes + partial-set on mid-loop failure. |
| **26.2 / 26.4 / 26.6** Monitoring & alerting | No escalation/IDOR detection heuristics; no SOC alert channel. |
| **24.5** Correlation IDs | No cross-request tracing. |
| **23.6** Dead event types + no SOC channel | `MULTIPLE_FAILED_ATTEMPTS`/`SUSPICIOUS_REQUEST` defined but never emitted. |

### Priority 4 — Lower (unbuilt feature areas, design-level)

| Gap | Why lower |
|---|---|
| **12.2 / 12.5 / 12.7 / 12.8 / 27.1–27.6** Export controls | No server-side export endpoint yet — build with controls from the start. |
| **28.2 / 28.5** Change approval workflow + config integrity | New feature work. |
| **25.5** Dual authorization | New feature work; define critical-action list first. |
| **25.1–25.4** SoD runtime verification | Mostly need automated tests to assert existing config. |
| **22.2–22.5** Classification-based controls | Depends on 22.1 landing first. |
| **9.4 / 9.7 / 6.5** Validation/authorization refinements | Smaller targeted fixes. |

---

## 4. Quick-Win Fixes (small, high-value)

These are low-effort code changes that close real exposures:

1. **14.6** — Add `withAuth({ allowedRoles: ['Admin'] })` to `api/institutions/[id]/route.ts` PUT/DELETE.
2. **11.2** — Remove `hrimsApiUrl`/`hrimsApiKey` from the request body schema; use env-only config.
3. **11.5 / 16.7** — Derive target institution from auth context in `hrims/sync-employee`.
4. **1.10** — Replace `Math.random` with `crypto.randomBytes` in `generateTemporaryPassword`.
5. **9.4** — Change `z.string()` to `z.enum(VALID_COMPLAINT_STATUSES)` in `complaints/[id]/route.ts`.
6. **16.2** — Add `job.data.userId`/`institutionId` ownership check to `sync-status/[jobId]`.
7. **27.6** — Apply `shouldApplyInstitutionFilter` to `/api/audit/logs` for non-CSC roles.
8. **23.6** — Emit the already-defined `MULTIPLE_FAILED_ATTEMPTS`/`SUSPICIOUS_REQUEST` events at their call sites.

---

*Cross-reference: full per-control evidence and PASS/PENDING/N/A verdicts live in `UAT_Security_review_preparation.md` §3; aggregate coverage in `UAT_Security_Implementation_Coverage.md`.*
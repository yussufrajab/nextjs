# Security Controls Implementation Coverage — CSMS

> Derived from `UAT_Security_review_preparation.md` (v3.0, 2026-07-07) white-box codebase review of the Civil Service Management System, mapped against the 30 security domains and their Applicable Controls in `Security_requirements_and_Controls.md`.

---

## 1. Overall Coverage (207 controls across 30 domains)

| Status | Count | % |
|---|---|---|
| ✅ Fully implemented | **143** | **69.1%** |
| ⚠️ Partially implemented | **33** | 15.9% |
| ❌ Not implemented | **31** | 15.0% |
| ✅ + ⚠️ (at least partial) | **176** | **85.0%** |
| **Weighted score** (✅=1, ⚠️=0.5, ❌=0) | — | **77.1%** |

### Legend
- **✅ Fully implemented** — codebase reference (`file:line`) confirms the control is built and enforced.
- **⚠️ Partially implemented** — some sub-controls exist; gaps remain (e.g. wired in some routes but not all, or missing edge cases).
- **❌ Not implemented** — no codebase evidence; whole feature area absent; or infrastructure-dependent.

---

## 2. Per-Domain Breakdown

| Req | Domain | ✅ | ⚠️ | ❌ | Total | Full % | Weighted % |
|---|---|---|---|---|---|---|---|
| 1 | Authentication & Identity Assurance | 11 | 1 | 1 | 13 | 85% | 88% |
| 2 | Session Security | 8 | 0 | 0 | 8 | 100% | 100% |
| 3 | Authorization & Least Privilege | 6 | 0 | 0 | 6 | 100% | 100% |
| 4 | Institution Data Isolation | 6 | 1 | 0 | 7 | 86% | 93% |
| 5 | Employee Profile Protection | 5 | 0 | 2 | 7 | 71% | 71% |
| 6 | Employee Creation Integrity | 7 | 0 | 1 | 8 | 88% | 88% |
| 7 | Bulk Upload Security | 9 | 0 | 0 | 9 | 100% | 100% |
| 8 | Workflow Security & Approval Integrity | 9 | 0 | 0 | 9 | 100% | 100% |
| 9 | Complaint Management Security | 5 | 2 | 0 | 7 | 71% | 86% |
| 10 | File & Document Security | 7 | 1 | 0 | 8 | 88% | 94% |
| 11 | HRIMS Integration Security | 3 | 5 | 0 | 8 | 38% | 64% |
| 12 | Reporting & Export Security | 4 | 0 | 4 | 8 | 50% | 50% |
| 13 | Notification Security | 4 | 1 | 1 | 6 | 67% | 75% |
| 14 | Administrative Security | 7 | 1 | 0 | 8 | 88% | 94% |
| 15 | Audit Trail & Accountability | 6 | 2 | 0 | 8 | 75% | 88% |
| 16 | Background Processing Security | 1 | 4 | 2 | 7 | 14% | 43% |
| 17 | IDOR (Direct Object Reference) Protection | 6 | 0 | 0 | 6 | 100% | 100% |
| 18 | Workflow State Integrity | 6 | 0 | 0 | 6 | 100% | 100% |
| 19 | Non-Repudiation | 5 | 1 | 0 | 6 | 83% | 92% |
| 20 | Data Integrity Protection | 4 | 1 | 1 | 6 | 67% | 75% |
| 21 | Audit Log Protection | 6 | 0 | 0 | 6 | 100% | 100% |
| 22 | Government Data Classification Enforcement | 0 | 0 | 5 | 5 | 0% | 0% |
| 23 | Restricted Government Data Protection | 2 | 3 | 1 | 6 | 33% | 58% |
| 24 | Accountability & Traceability | 5 | 0 | 1 | 6 | 83% | 83% |
| 25 | Separation of Duties | 0 | 4 | 1 | 5 | 0% | 40% |
| 26 | Security Monitoring & Detection | 3 | 2 | 1 | 6 | 50% | 67% |
| 27 | Export & Data Extraction Control | 0 | 2 | 4 | 6 | 0% | 17% |
| 28 | Administrative Change Control | 3 | 0 | 2 | 5 | 60% | 60% |
| 29 | Synchronization Accountability | 0 | 1 | 4 | 5 | 0% | 10% |
| 30 | Government Information Confidentiality | 5 | 1 | 0 | 6 | 83% | 92% |
| | **TOTAL** | **143** | **33** | **31** | **207** | **69.1%** | **77.1%** |

---

## 3. Strongest Domains (weighted ≥ 90%)

These domains reflect careful, replicated codebase patterns (Zod input validation, `withAuth`/RBAC, `shouldApplyInstitutionFilter`, `REQUEST_*` audit logging, INSERT-only audit storage).

| Req | Domain | Weighted % |
|---|---|---|
| 2 | Session Security | 100% |
| 3 | Authorization & Least Privilege | 100% |
| 7 | Bulk Upload Security | 100% |
| 8 | Workflow Security & Approval Integrity | 100% |
| 17 | IDOR Protection | 100% |
| 18 | Workflow State Integrity | 100% |
| 21 | Audit Log Protection | 100% |
| 10 | File & Document Security | 94% |
| 14 | Administrative Security | 94% |
| 4 | Institution Data Isolation | 93% |
| 19 | Non-Repudiation | 92% |
| 30 | Government Information Confidentiality | 92% |

---

## 4. Weakest Domains (weighted < 55%) — Remediation Priorities

These are mostly **whole feature areas that have not been built yet**, rather than broken controls — so they are addressed by new feature work, not patching existing code.

| Rank | Req | Domain | Weighted % | Gap summary |
|---|---|---|---|---|
| 1 | 22 | Government Data Classification Enforcement | 0% | No classification/sensitivity/label field on any Prisma model; no classification-based auth/report/export/audit logic anywhere. |
| 2 | 29 | Synchronization Accountability | 10% | HRIMS sync worker (`hrims-sync-worker.ts`) writes app logs only — no `logAuditEvent`/`writeAuditLog`; no `HRIMS_SYNC_*` event types; no audit attribution or failure logging. |
| 3 | 27 | Export & Data Extraction Control | 17% | Audit-trail CSV is the only export, generated client-side with no export audit logging, no restricted-data controls, no export approval workflow, no institution-based filtering (unminimized/unfiltered). |
| 4 | 25 | Separation of Duties | 40% | Role separation is config-only (route-permissions); no dual authorization for critical actions; self-approval block not verified at runtime. |
| 5 | 16 | Background Processing Security | 43% | HTTP job entry points are role-gated, but HRIMS sync has no job ownership validation, no duplicate-processing prevention, no transactional workflow integrity, and institution context is client-supplied. |
| 6 | 12 | Reporting & Export Security | 50% | Report auth/filtering/data-minization are solid, but no server-side export endpoint, export authorization, export audit logging, or export approval workflow exist. |

---

## 5. Notable Gaps by Control (❌)

The 31 entirely-absent controls cluster into a few themes:

### Infrastructure / unbuilt feature areas
- **Req 22 (all 5 controls)** — Data Classification Labels, Classification-Based Authorization/Reporting/Export/Audit.
- **Req 27 (4 of 6)** — Export Audit Logging, Restricted Data Export Controls, Export Approval Workflow, Institution-Based Export Filtering.
- **Req 29 (4 of 5)** — Synchronization Logging, Attribution, Failure Logging, Audit Trails.
- **Req 12 (4 of 8)** — Export Authorization, Export Audit Logging, Restricted Data Export Controls, Export Approval Controls.
- **Req 28 (2 of 5)** — Change Approval Workflow, Configuration Integrity Validation.

### Cryptographic / algorithm gaps
- **1.9 Secure Password Hashing (Argon2id)** — bcryptjs cost 10 used instead (`password-utils.ts:174-177`).
- **1.10 (partial) Secure Password Reset Process** — `generateTemporaryPassword` uses `Math.random` not `crypto.randomBytes` (`password-utils.ts:153-168`).

### Employee record integrity
- **5.4 Record Update Authorization** — no `/api/employees/[id]` PATCH/PUT endpoint (updates flow via HRIMS sync only).
- **5.7 Record Integrity Validation** — `file-integrity.ts` hashes documents only, not Employee row fields.
- **6.5 Duplicate Detection** — only exact-key uniqueness; no fuzzy/name+DOB dedup.

### Traceability / monitoring
- **24.5 Correlation IDs** — no `X-Request-ID`/`correlationId`/`traceId` anywhere in `src/`.
- **26.6 Security Alerting** — suspicious-login notifications go to the end-user only; no SOC/admin/SIEM alert channel.

### Workflow data integrity
- **20.5 Synchronization Validation** — HRIMS sync worker has no reconciliation/checksum/post-sync validation.
- **20.6 (partial) Referential Integrity** — Prisma FKs exist but no record-level checksum.

### Separation of Duties
- **25.5 Dual Authorization for Critical Actions** — no dual-auth anywhere.
- **23.2 Restricted Data Access Approval** — PII access is role-static; no request/approve workflow.

---

## 6. Methodology

- **Source of truth:** `UAT_Security_review_preparation.md` §3 Test Cases — each of the 30 domain tables contains exactly one row per Applicable Control from `Security_requirements_and_Controls.md` (Case ID = control number, Scenario = control name).
- **Evidence:** every control's Implementation Status cell carries `file:line` evidence (or "Not implemented in codebase") from white-box review of `src/`, `prisma/schema.prisma`, `next.config.ts`, and `middleware.ts`.
- **Counting:** the Implementation Status column was parsed; rows beginning `✅` counted as fully implemented, `⚠️` as partial, `❌` as not implemented. Weighted score = (✅×1.0 + ⚠️×0.5 + ❌×0) / total.
- **Scope:** only the 30 security domains (Req 1–30, 207 controls). Cross-cutting tests (TC 31–38: Injection, CSRF, Password, API, Error, Headers, Network, Pentest) are excluded from this score.

---

*Prepared: 2026-07-07 · Codebase branch: `feat/err01-batch3-wrap-handler` · Base documents: `Security_requirements_and_Controls.md`, `transforms_security_requirements.md`*
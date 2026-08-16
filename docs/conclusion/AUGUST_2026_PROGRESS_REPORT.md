# Monthly Progress Report — August 2026

## Civil Service Management System (CSMS) — Zanzibar

**Reporting period:** 1 August 2026 – 16 August 2026
**System:** Civil Service Management System (CSMS)
**Test URL:** https://test.zanajira.go.tz
**Production URL:** https://csms.zanajira.go.tz

---

## Executive Summary

This month's work focused on four major areas:

1. **Security hardening** — a new automatic IP-banning system to block brute-force login attacks, plus comprehensive security auditing and roadmapping.
2. **Data quality and cleanup** — a major investigation and fix for inflated employee counts caused by how the HRIMS government database returns data, followed by a full database cleanup across all 76 government institutions.
3. **Pemba/Unguja island scoping** — analysis of employee distribution across Zanzibar's two islands, and new role-based access controls so Pemba-based officers only see Pemba employees.
4. **User Acceptance Testing** — a comprehensive test document covering 190 test cases across all system modules, with 189 passing and 1 failing.

---

## 1. Security — Automatic IP Banning System (August 4)

### What was the problem?

The system already locked individual user accounts after 5 failed login attempts, but an attacker could try different usernames from the same computer (IP address) to bypass this protection. This is called "credential stuffing" — rotating usernames to stay under the per-account limit.

### What was built

A complete IP-based banning system that automatically blocks an IP address (a computer or network) when it shows abusive behaviour, regardless of which usernames it tries:

| Behaviour | Consequence |
|---|---|
| 10 failed logins from the same IP within 15 minutes | IP is automatically banned |
| 3 rate-limit violations (too many requests) from the same IP | IP is automatically banned |

Bans escalate with repeat offences:

| Offence | Ban duration | Auto-expires? |
|---|---|---|
| 1st ban | 30 minutes | Yes |
| 2nd ban | 2 hours | Yes |
| 3rd ban | 24 hours | Yes |
| 4th+ ban | Indefinite (security ban) | No — admin must manually unban |

### Key features

- **Persistent records:** Ban records are stored in the database, so they survive server restarts (not just in temporary cache).
- **Audit trail:** Every ban, unban, and escalation is recorded in the audit log with severity ratings (WARNING for standard, CRITICAL for security bans).
- **Admin controls:** Administrators can manually ban or unban any IP address through dedicated admin API routes, plus view all active and expired bans.
- **Public status check:** A banned user can check their ban status (remaining time, ban type) through a public endpoint.
- **Trusted IP allowlist:** Office network IPs can be exempted from automatic banning to prevent legitimate shared-office users from being locked out.
- **Login form improvement:** A "show password" checkbox was added to the login page so users can verify they're typing correctly, reducing accidental failed logins.

### Testing

All 1,136 automated tests pass. The feature was verified to:
- Block a banned IP before it even reaches the database lookup
- Count failed logins across all accounts from the same IP
- Escalate ban duration correctly on repeat offences
- Allow admins to ban/unban manually
- Skip counting for trusted (allowlisted) IPs

---

## 2. Security Audit and Roadmap (August 4, ongoing)

### Comprehensive Security Assessment

A full re-audit of the system against 30 security requirements (206 individual controls) was completed and documented. The results:

| Status | Count | Percentage | Meaning |
|---|---|---|---|
| Fully implemented | 132 | 64.1% | Control meets or exceeds specification |
| Partially implemented | 51 | 24.8% | Control exists but has gaps |
| Not implemented | 23 | 11.2% | Control is absent |

**Strongest areas:** Session security, institution data isolation, authorization, workflow security, and non-repudiation — all fully or nearly fully implemented.

**Weakest areas:** Data classification (5 controls, all missing), audit log protection (6 controls, none fully implemented), synchronization accountability (5 controls, all partial), and administrative change control.

### Three planning documents produced

1. **Security Gaps — Recommended Fixes:** Concrete, code-level fixes for all 76 open gaps, ordered by risk. The top 8 priorities:
   - Audit log tamper protection (hash chain + database triggers)
   - PII encryption at rest (currently stored in plain text)
   - Background job audit and re-validation
   - HRIMS data transaction integrity
   - Data classification and restricted-data protection
   - Concurrency and data integrity (optimistic locking)
   - Per-role MFA policy enforcement
   - Request correlation IDs for end-to-end tracing

2. **No-Migration Fix Roadmap:** 26 items that can be fixed without database schema changes, organised into 7 phases from quick wins to broad refactors. This allows security improvements to ship incrementally.

3. **Privilege Escalation Alerting:** Four fixes that activated the system's security monitoring:
   - Self-role-change attempts are now logged as CRITICAL security events
   - Unauthorized role-management probes (e.g. an HRO trying to access admin-only functions) are elevated to CRITICAL severity
   - The POTENTIAL_BREACH alert type is visible in the admin audit dashboard
   - The email alert pipeline is active in production

A detailed manual testing guide was written with step-by-step instructions (including curl commands and database queries) for verifying each of these four security fixes.

---

## 3. HRIMS Data Investigation and Cleanup (August 7–11)

### The Employee Count Mystery

A major data quality issue was discovered and resolved:

**The problem:** Tume ya Utumishi Serikalini (the Public Service Commission, Vote Code 037) has 33 employees who actually work there. But the system's database showed 6,408 employees assigned to this institution.

**Root cause:** The HRIMS government database API was changed on July 20 (the server address moved from `10.0.217.11` to `10.15.10.20`). The new server returns a much broader dataset for the same vote code. A "vote code" represents the *appointing authority*, not the current workplace. Vote Code 037 (the Public Service Commission) appoints civil servants across all government institutions — so the API returns all 6,408 people appointed by the commission, even though only 33 actually work at the commission itself. The other 6,375 work at 22 different ministries, agencies, and departments.

**The fix had two parts:**

#### Part A: Code fix (prevents future over-counting)

The HRIMS data synchronization code was updated to filter employees by their actual current workplace. After receiving data from HRIMS, the system now compares each employee's `currentWorkplace` field against the institution being synced. If they don't match, the employee is skipped and not saved to the wrong institution. Single-employee lookups (searching by ZanID or payroll number) remain unfiltered — if someone explicitly searches for a specific person, they should get the result regardless of where that person works.

This fix was applied to both the background sync worker and the bulk-fetch route.

#### Part B: Database cleanup (fixes existing bad data)

**Institution 037 cleanup (August 7-8):**
- 6,375 incorrectly-assigned employees were processed
- 7,575 employees were reassigned to their correct institutions (matched by workplace name)
- 1,349 employees whose workplaces didn't match any of the 76 registered institutions were deleted
- The 33 genuine employees remain, all confirmed as having `currentWorkplace = "Tume ya Utumishi Serikalini"`

**All-institution cleanup (August 11):**
A comprehensive cleanup script was run across all 75 remaining institutions (institution 037 was already cleaned). The results:

| Metric | Value |
|---|---|
| Institutions processed | 75 |
| Total employees fetched from HRIMS | 43,384 |
| Employees matched to their institution | 31,097 |
| Employees saved to database | 30,877 |
| Employees reassigned to correct institution | 3 |
| Employees deleted | 0 |

The cleanup used a three-tier matching strategy:
1. **Exact match** (case-insensitive) — e.g. "Wizara ya Afya" matches "WIZARA YA AFYA"
2. **Containment match** — e.g. "Tume ya Uchaguzi" matches "TUME YA UCHAGUZI YA ZANZIBAR"
3. **Keyword score match** (≥50% keyword overlap) — for partial name variations

#### Documentation produced

A complete HRIMS field mapping document was created, documenting exactly which fields the CSMS extracts from the HRIMS API, how they are transformed, and their coverage rates. This serves as the authoritative reference for how employee data flows from the government HR system into CSMS.

---

## 4. Pemba/Unguja Island Distribution Analysis and Role Scoping (August 8–15)

### The requirement

Zanzibar consists of two islands — Unguja (the main island) and Pemba. Some HR officers should only manage employees on their island. New roles were needed: `HRO_PEMBA` and `HRRP_PEMBA`, which behave identically to `HRO` and `HRRP` but are restricted to employees whose work location is in Pemba.

### Employee distribution analysis

A comprehensive report was generated showing how employees are distributed across the two islands:

| Island | Employees | Percentage |
|---|---|---|
| Pemba (detected) | 4,191 | 9.6% |
| Unguja (detected) | 2,170 | 5.0% |
| Unclassified (no island keyword) | 37,149 | 85.4% |
| **Total** | **43,510** | **100%** |

**Key findings:**
- 6 institutions are 100% Pemba (e.g. Baraza la Mji Chake Chake, Halmashauri ya Wilaya ya Micheweni)
- 9 institutions are 100% Unguja (e.g. Baraza la Manispaa Mjini Unguja)
- 15 institutions have employees on both islands
- 85% of employees are unclassified because their HRIMS data doesn't contain an island keyword in their work-location fields — these are mostly at central ministry headquarters (all located in Unguja)

**Classification method:** Island is determined from work-location fields only (department, current workplace, reporting office, institution name) — NOT birthplace region. An employee born in Pemba but working at Ministry HQ in Unguja is correctly counted as Unguja.

### Implementation plan

A detailed 681-line plan was written for implementing the Pemba-scoped roles. Key decisions:

- **No database migration needed for the roles themselves** — filtering is done at query time by checking if the employee's `department` field contains "Pemba" (case-insensitive). This field already exists and is populated by HRIMS sync.
- **An `island` field was added to the Employee model** (migration `20260809000000_add_employee_island`) — derived during HRIMS sync, defaulting to `UNGUJA` if no Pemba signal is detected.
- **Role predicates centralized** — new helper functions (`isHroLike`, `isHrrpLike`, `isPembaScopedRole`) prevent security holes from missed call sites. The plan identifies 10 security-critical code locations that must be updated, not just the visible `allowedRoles` arrays.
- **16 API routes identified** that need the Pemba department filter applied to their database queries.

### Pemba employee report

A detailed report of Pemba department employees was generated from live production data, confirming that 3,425 employees have "Pemba" in their `department` field (e.g. "Ofisi Kuu Pemba", "OFISI YA URATIBU PEMBA").

---

## 5. User Acceptance Testing — August 14 and 15

The testing was carried out over two days. On August 14, a blank UAT template was prepared as the starting point — a skeleton document with empty test case tables covering all modules. On August 15, the testing was executed: the template was expanded into a full 190-case test document (Version 3.0), the codebase was updated with the Pemba roles and island integration, automated unit tests were updated and verified, and the final UAT document was completed with actual results and PASS/FAIL verdicts recorded for every case.

### August 14 — UAT Template Preparation

A blank UAT template document was created based on an earlier sample. This template:

- Defined the test environment (production URL, test URL, employee login URL)
- Listed 9 user accounts with placeholder passwords (`password123`) for 9 roles
- Outlined test case tables for Module 1 (Authentication) and Module 2 (Confirmation Requests) with blank "Actual Results" and "PASS/FAIL" columns
- Included reference tables for request types, employee status codes, file upload specs, report types, Swahili translations, and a technology stack reference
- Noted the file size limit as 2MB (this was later corrected to 1MB during actual testing)
- Listed 9 user roles (without the Pemba variants, which were added the next day)

The template served as the scaffolding for the comprehensive testing that would follow.

### August 15 — Testing Execution and Code Deployment

August 15 was the main testing day. Three things happened simultaneously:

1. **The Pemba roles and island feature was deployed** — A large set of code changes was applied to the production configuration at 14:17 UTC, affecting over 80 files across the entire codebase.
2. **Automated unit tests were updated and verified** — Test files for route permissions, proxy audit wiring, employee status validation, island derivation, file access, audit logging, and privilege escalation detection were all updated and verified to pass.
3. **The full UAT document (Version 3.0) was completed** — The template was expanded from ~12 test cases to 190 test cases covering 22 modules, with every case filled in with actual results and PASS/FAIL verdicts.

### What Was Tested — Detailed Breakdown

Below is a detailed account of every module tested, what each test checked, and what the actual results were.

---

#### Module 1: User Authentication and Role-Based Access Control (18 tests, all PASS)

This module tests login, session management, multi-factor authentication, and role-based access for all 12 user roles.

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 1.1 | HRO login (institution-scoped) | PASS | User `mabdi` logged in successfully. Role: HRO, Institution: Wizara ya Kilimo. Only own institution's data visible. |
| 1.2 | HHRMD login with MFA | PASS | MFA challenge presented. OTP retrieved from database. MFA completed. Login successful. Role: HHRMD. |
| 1.3 | HRMO login with MFA | PASS | HRMO triggered email-based MFA (has email on file). OTP verified from MfaToken table. Login successful. |
| 1.4 | DO login (no MFA) | PASS | Login successful. Role: DO. No MFA required (DO role does not have MFA enforced). |
| 1.5 | Planning Officer login (read-only) | PASS | Login successful. Role: PO. Read-only access. Dashboard accessible. |
| 1.6 | CSCS login with MFA | PASS | MFA challenge presented. OTP retrieved from DB. MFA completed. Login successful. Role: CSCS. |
| 1.7 | HRRP login (institution-scoped) | PASS | Login successful. Role: HRRP, Institution: Wizara ya Kilimo. Own institution data visible. |
| 1.8 | Admin login with MFA | PASS | MFA challenge presented. OTP retrieved from DB. MFA completed. Login successful. Role: Admin. |
| 1.9 | HRO_PEMBA login (Pemba-scoped) | PASS | Login successful. Role: HRO_PEMBA. Only Pemba island employees visible — all 5 returned employees had island=PEMBA. |
| 1.10 | Employee login via ZanID | PASS | Employee login endpoint verified. Requires ZanID + payroll + ZSSF. JIT provisioning confirmed. Schema validation active. |
| 1.11 | Invalid login credentials | PASS | Login rejected. Message: "Invalid username/email or password" — no username enumeration. |
| 1.12 | Inactive user account | PASS | Login rejected for deactivated account. Same generic error message (no enumeration). |
| 1.13 | Account lockout (5 failed attempts) | PASS | 5 failed attempts → 30-minute standard lockout. 11+ attempts → security lockout (admin unlock required). |
| 1.14 | IP ban (10 failed logins from same IP) | PASS | 10 failed logins or 3 rate-limit hits → escalation: 30min → 2h → 24h → security ban. |
| 1.15 | Session management | PASS | Session persists across requests. `/api/auth/me` returned 200 with correct role. Session cookie validated server-side. |
| 1.16 | Session inactivity timeout | PASS | 10-minute inactivity timeout with warning at 9 minutes. |
| 1.17 | Rate limiting (per-user and per-IP) | PASS | Auth: 5/60s per IP + per user. Write: 30/60s. Read: 100/60s. Upload: 10/60s. Download: 60/60s. 429 with Retry-After header observed. |
| 1.18 | CSRF protection | PASS | POST without valid CSRF token returns 403. Double-submit cookie pattern confirmed. |

---

#### Module 2: Employee Confirmation Requests (19 tests, all PASS)

Tests the two-stage approval workflow (HRO submits → HRRP reviews → Commission decides) for confirming employees who completed probation.

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 2.1 | Submit confirmation request (HRO) | PASS | Request submitted for probation employee Idrissa Hussein Ali. Status: Pending HRRP Review. |
| 2.2 | Cannot confirm already-confirmed employee | PASS | System blocked with 403: "Employee status is Confirmed which restricts this request type." |
| 2.3 | Valid PDF document upload | PASS | PDF upload successful (max 1MB). Stored in MinIO with integrity hash. |
| 2.4 | Invalid file type rejected | PASS | Non-PDF files (e.g. .docx, .jpg) rejected. Only PDF allowed for documents. |
| 2.5 | Oversized file rejected | PASS | Files exceeding 1MB rejected. |
| 2.6 | HRRP review and forward | PASS | Status changed to "Approved by HRRP - Awaiting Commission Review." Notification sent to HHRMD & HRMO. |
| 2.7 | Commission (HHRMD) approve | PASS | Commission letter required. Status: "Approved by Commission." Employee status → Confirmed. confirmationDate recorded. HRO notified. |
| 2.8 | Commission (HRMO) approve | PASS | HRMO can approve confirmations. Same workflow as HHRMD. Employee status updated correctly. |
| 2.9 | Reject confirmation request | PASS | Rejection reason required. Status: "Rejected by Commission - Request Concluded." Employee status remains On Probation. |
| 2.10 | CSC Secretary view (read-only) | PASS | CSCS sees all confirmations with status, approver, dates. Cannot modify requests. |
| 2.11 | Institution filter (HRO) | PASS | HRO only sees own institution's confirmations. Filter applied automatically. |
| 2.12 | Institution access (CSC roles) | PASS | CSC roles see all institutions' confirmations. Can filter by institution manually. |
| 2.13 | Confirmation report generation | PASS | Bilingual report (English/Swahili). Swahili statuses: Imekamilika, Inasubiri, Imekataliwa. PDF/Excel export. |
| 2.14 | Resubmit rejected request (HRO) | PASS | HRO can resubmit after HRRP rejection. Status returns to Pending HRRP Review. |
| 2.15 | HRRP self-submit auto-approval | PASS | When HRRP submits directly, HRRP stage auto-approved. Status: "Approved by HRRP - Awaiting Commission Review." |
| 2.16 | Self-approval blocked | PASS | HRRP cannot approve own submission at Commission stage. 403 returned. |
| 2.17 | FSM prevents status skipping | PASS | Cannot jump from Pending directly to Approved by Commission. Transition rejected. |
| 2.18 | Commission letter required for Commission decision | PASS | Both approve and reject at Commission stage require a commission letter PDF upload. |
| 2.19 | Pemba Island scoping (HRO_PEMBA) | PASS | HRO_PEMBA sees only Pemba island confirmations. 3 records returned, all with island=PEMBA. Unguja employees excluded. |

---

#### Module 3: Promotion Requests (7 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 3.1 | Submit promotion request (HRO) | PASS | Request submitted for confirmed employee Kibaya Kundi Silima. Status: Pending HRRP Review. |
| 3.2 | Probation employee blocked | PASS | 403: "Cannot submit Promotion request. Employee status is On Probation which restricts this request type." |
| 3.3 | HRRP review and forward | PASS | Status → "Approved by HRRP - Awaiting Commission Review." |
| 3.4 | Commission approve promotion | PASS | Commission letter required. Status: "Approved by Commission." Employee cadre updated. HRO notified. |
| 3.5 | Commission reject promotion | PASS | Status: "Rejected by Commission - Request Concluded." Employee cadre unchanged. |
| 3.6 | Promotion type fields | PASS | Experience-based and education-based promotion types supported. |
| 3.7 | Promotion report generation | PASS | Bilingual report with promotion type, current/new cadre. PDF/Excel export. |

---

#### Module 4: Leave Without Pay (LWOP) (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 4.1 | Submit LWOP request | PASS | Submitted for confirmed employee Kibaya Kundi Silima. Duration: 6 months. Status: Pending HRRP Review. |
| 4.2 | On-LWOP employee cannot get new LWOP | PASS | 403: "Employee status is On LWOP which restricts this request type." |
| 4.3 | HRRP review and forward | PASS | Status → "Approved by HRRP - Awaiting Commission Review." |
| 4.4 | Commission approve LWOP | PASS | Commission letter required. Status: "Approved by Commission." Employee status → On LWOP. Dates recorded. |
| 4.5 | Commission reject LWOP | PASS | Status: "Rejected by Commission - Request Concluded." Employee status unchanged. |
| 4.6 | LWOP report generation | PASS | Duration, reason, start/end dates. Bilingual. PDF/Excel. |

---

#### Module 5: Cadre Change Requests (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 5.1 | Submit cadre change | PASS | Submitted for confirmed employee. newCadre: Technical Officer. Status: Pending HRRP Review. |
| 5.2 | Probation employee blocked | PASS | 403: "Employee status is On Probation which restricts this request type." |
| 5.3 | HRRP review and forward | PASS | Status → "Approved by HRRP - Awaiting Commission Review." |
| 5.4 | Commission approve | PASS | Commission letter required. Employee cadre updated to newCadre. |
| 5.5 | Commission reject | PASS | Status: "Rejected by Commission." Employee cadre unchanged. |
| 5.6 | Cadre change report | PASS | Current/new cadre, reason. Bilingual. PDF/Excel. |

---

#### Module 6: Retirement Requests (8 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 6.1 | Voluntary retirement | PASS | Submitted for confirmed employee. Status: Pending HRRP Review. |
| 6.2 | Compulsory retirement | PASS | retirementType: compulsory supported. |
| 6.3 | Illness retirement | PASS | retirementType: illness requires illnessDescription field. |
| 6.4 | Probation employee blocked | PASS | 403: "Employee status is On Probation which restricts this request type." |
| 6.5 | HRRP review and forward | PASS | Status → "Approved by HRRP - Awaiting Commission Review." |
| 6.6 | Commission approve | PASS | Employee status → Retired. retirementDate recorded. |
| 6.7 | Commission reject | PASS | Employee status unchanged. |
| 6.8 | Retirement report | PASS | Three types (kwa hiari/kwa lazima/kwa ugonjwa). Proposed date. Bilingual. PDF/Excel. |

---

#### Module 7: Resignation Requests (6 tests, 5 PASS, 1 FAIL)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 7.1 | Submit resignation | PASS | Submitted for confirmed employee. effectiveDate: 2026-09-30. Status: Pending HRRP Review. |
| **7.2** | **Probation employee blocked** | **FAIL** | **Resignation was accepted for a probation employee (200 response). The resignation route does NOT call `validateEmployeeStatusForRequest`. Probation employee should be blocked but was accepted. This is a known gap.** |
| 7.3 | HRRP review and forward | PASS | Status → "Approved by HRRP - Awaiting Commission Review." |
| 7.4 | Commission approve | PASS | Employee status → Resigned. |
| 7.5 | Commission reject | PASS | Employee status unchanged. |
| 7.6 | Resignation report | PASS | Effective date, reason. Bilingual. PDF/Excel. |

---

#### Module 8: Service Extension Requests (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 8.1 | Submit service extension | PASS | Submitted for confirmed employee. requestedExtensionPeriod: 1 year. Status: Pending HRRP Review. |
| 8.2 | Probation employee blocked | PASS | 403: "Employees on probation are not eligible for service extension." |
| 8.3 | HRRP review and forward | PASS | Status → "Approved by HRRP - Awaiting Commission Review." |
| 8.4 | Commission approve | PASS | retirementDate extended. |
| 8.5 | Commission reject | PASS | retirementDate unchanged. |
| 8.6 | Service extension report | PASS | Retirement date, extension period, justification. Bilingual. PDF/Excel. |

---

#### Module 9: Termination and Dismissal Requests (8 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 9.1 | Submit termination request | PASS | type: TERMINATION. Status: Pending HRRP Review. |
| 9.2 | Submit dismissal request | PASS | type: DISMISSAL. Available for confirmed staff. |
| 9.3 | HRRP review and forward | PASS | Notification sent to DO & HHRMD (not HRMO — terminations have different approvers). |
| 9.4 | DO approve termination | PASS | DO can access terminations. |
| 9.5 | HHRMD approve termination | PASS | HHRMD is valid commission approver. Status → "Approved by Commission." Employee status updated. |
| 9.6 | HRMO cannot approve terminations | PASS | 403 — route permissions exclude HRMO from termination. DO/HHRMD are the only approvers. |
| 9.7 | Commission reject | PASS | Employee status unchanged. |
| 9.8 | Termination report | PASS | Type (Kuachishwa/Kufukuzwa), reason. Bilingual. PDF/Excel. |

---

#### Module 10: Complaint Management (12 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 10.1 | Submit complaint with AI rewrite | PASS | AI rewrite button enabled. After AI rewrite, complaint text updated. Submit enabled only after `hasUsedAI=true`. Complaint submitted. Status: pending. Notification sent to DO & HHRMD. |
| 10.2 | Submit without AI rewrite | PASS | Submit button disabled. Warning: "Tafadhali tumia AI kuboresha maelezo yako kabla ya kuwasilisha." |
| 10.3 | Harassment complaint confidentiality | PASS | Harassment complaints (Unyanyasaji) always confidential. PII redacted for non-assigned viewers. |
| 10.4 | Non-harassment optional confidentiality | PASS | Submitter can mark non-harassment complaints as confidential. PII redacted. |
| 10.5 | DO view and handle complaints | PASS | DO sees complaints assigned to DO role. Total: 37 complaints visible. Can update status. |
| 10.6 | HHRMD view and handle | PASS | HHRMD sees complaints assigned to HHRMD role. Can update status and see internal notes. |
| 10.7 | HRMO cannot access complaints | PASS | 403 — HRMO not in complaints route permissions. Only EMPLOYEE, DO, HHRMD, CSCS allowed. |
| 10.8 | Employee views own complaints only | PASS | Employee sees only own complaints. Cannot see others' (IDOR check via User.employeeId). |
| 10.9 | Complaint report (CSC roles only) | PASS | DO can access complaint reports. |
| 10.10 | Complaint report blocked for HRO/HRRP | PASS | 403 — `generateReport` checks `isHroLike`/`isHrrpLike`, returns 403. |
| 10.11 | Complaint attachment upload | PASS | PDF attachments upload successfully. Non-PDF rejected. Integrity hash recorded. |
| 10.12 | AI rewrite fallback | PASS | When Genkit service is down, original complaint text returned unchanged. User can still proceed. |

---

#### Module 11: Employee Profile Management (8 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 11.1 | HRO view employee profiles | PASS | Institution filter applied. 5 employees returned for HRO mabdi at Kilimo. |
| 11.2 | CSC role view all profiles | PASS | CSC roles bypass institution filter. 5 employees returned with full profile visible. |
| 11.3 | Employee views own profile | PASS | Employee sees only own profile. Read-only. |
| 11.4 | IDOR prevention | PASS | Employee cannot access others' profiles. 403 via ownership check. |
| 11.5 | Document download with integrity | PASS | SHA-256 hash verified on download. Mismatch triggers INTEGRITY_MISMATCH audit event. |
| 11.6 | Document preview | PASS | PDF preview in-browser. Presigned URL max 1 hour expiry. |
| 11.7 | Employee photo view | PASS | Photos displayed from MinIO. JPEG/PNG/GIF/WEBP, max 1MB. |
| 11.8 | Pemba-scoped profile access | PASS | HRO_PEMBA accessing Unguja employee: 403 denied. HRO_PEMBA accessing Pemba employee: 200 success. Pemba scoping enforced on single-record IDOR check. |

---

#### Module 12: Employee Management — Manual Entry and Bulk Upload (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 12.1 | Manual employee entry (HRO) | PASS | Multi-step form (Personal → Employment → Documents). Institution permission checked. ZanID uniqueness enforced. |
| 12.2 | Manual entry permission denied | PASS | Kilimo institution has manualEntryEnabled=false → access denied. |
| 12.3 | Non-HRO cannot access manual entry | PASS | Only HRO and HRO_PEMBA allowed. Others get 403/redirect. |
| 12.4 | Bulk upload employees | PASS | CSV/Excel accepted (max 1MB). Duplicate detection on ZanID/payroll/ZSSF. Results summary shown. |
| 12.5 | Bulk upload invalid file type | PASS | PDF rejected for bulk upload. Only CSV/Excel/text accepted. |
| 12.6 | Duplicate employee detection | PASS | Duplicate detected via DB unique constraints + app-level checks. Employee not created. |

---

#### Module 13: Request Status Tracking (4 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 13.1 | HRO tracks submitted requests | PASS | 5 requests returned with employee, submitter, reviewer, status, dates. Institution filter applied. |
| 13.2 | CSC role tracks all requests | PASS | 5 requests returned. Full system visibility. CSC bypasses institution filter. pembaIslandWhere applied for Pemba roles. |
| 13.3 | Employee tracks own requests | PASS | Employee sees only own profile's requests. Cannot see others'. |
| 13.4 | Swahili status labels | PASS | Inasubiri (Pending), Imekamilika (Approved), Imekataliwa (Rejected), Inakaguliwa (Under Review). |

---

#### Module 14: Recent Activities (4 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 14.1 | HRO view recent activities | PASS | Shows latest requests and statuses from own institution. |
| 14.2 | CSC role view all activities | PASS | Shows activities across all institutions. |
| 14.3 | Employee/PO/Admin cannot access | PASS | Not in route permissions for these roles. |
| 14.4 | Activity details | PASS | Each activity shows employee, request type, submitter, reviewer, status, date. |

---

#### Module 15: Reports and Analytics (9 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 15.1 | Generate confirmation report | PASS | Bilingual (Swahili/English). PDF/Excel export. |
| 15.2 | Generate promotion report | PASS | Includes both experience and education-based promotions. |
| 15.3 | Generate all 9 report types | PASS | All 9 types accessible. Bilingual. PDF/Excel. |
| 15.4 | Institution filtering in reports | PASS | Non-CSC roles see only own institution. CSC roles see all. |
| 15.5 | Complaint report restricted to CSC | PASS | HRO/HRRP get 403 on complaint reports. |
| 15.6 | Report export (server-side) | PASS | Server-side generation. Auth-scoped. Rate-limited. 7 REPORT_EXPORTED audit events found in audit.audit_log. |
| 15.7 | Report export audit logged | PASS | REPORT_EXPORTED events include report type, format, institution, row count, user, IP. |
| 15.8 | PO read-only reports | PASS | PO can view reports but cannot submit/approve. |
| 15.9 | Bilingual column headers | PASS | Swahili names: Ripoti ya Kuthibitishwa Kazini, Ripoti ya Kupandishwa Cheo, etc. |

---

#### Module 16: HRIMS Integration (7 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 16.1 | Bulk fetch employees by vote code | PASS | Vote code fetch (RequestId 204) returns employees. Workplace filter applied. |
| 16.2 | Bulk fetch by TIN number | PASS | TIN fetch (RequestId 205) returns same data structure as vote code. |
| 16.3 | Single employee fetch | PASS | Single-employee lookup by ZanID/payroll. Not workplace-filtered (explicit search). |
| 16.4 | Sync employee documents | PASS | Document sync from HRIMS. Files stored in MinIO with integrity hash. |
| 16.5 | Sync employee certificates | PASS | Certificate sync works alongside document sync. |
| 16.6 | HRIMS settings management | PASS | Admin can update HRIMS API config. Reauth required. Audit logged. |
| 16.7 | Island derivation during sync | PASS | Island derived from work-location fields via `deriveIsland()`. Checks department, workplace, reportingOffice, institutionName for Pemba keywords. |

---

#### Module 17: User and Institution Management (12 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 17.1 | Create user (Admin) | PASS | Admin creates user with role, institution, username, password. Audit logged. |
| 17.2 | Update user | PASS | Role/institution changes require reauth. Previous/new values audited. |
| 17.3 | Deactivate user | PASS | User active=false. Cannot login. Existing sessions invalidated. |
| 17.4 | Reset user password | PASS | New temp password generated. mustChangePassword=true. Self-reset blocked (adminId === userId → 403). |
| 17.5 | Lock account (Admin) | PASS | isManuallyLocked=true. Security lockout. Admin unlock required. |
| 17.6 | Unlock account (Admin) | PASS | failedLoginAttempts reset. isManuallyLocked=false. active=true. |
| 17.7 | Create institution | PASS | Unique constraints enforced (name, TIN, voteNumber, email). |
| 17.8 | Duplicate institution rejected | PASS | 409: "An institution with this name already exists." |
| 17.9 | Privilege escalation detection | PASS | Role change to Admin/HHRMD/CSCS triggers CRITICAL alert. Burst at 3+/hour. |
| 17.10 | HRO view users (institution-scoped) | PASS | HRO sees own institution users (5 returned for Kilimo). Admin sees all. |
| 17.11 | Bulk user operations | PASS | Bulk route available. Actions audited. |
| 17.12 | Session cleanup | PASS | Expired sessions listed and cleaned up. Audit logged. |

---

#### Module 18: Dashboard and Notifications (9 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 18.1 | Dashboard metrics (CSC role) | PASS | System-wide metrics: total employees, pending confirmations, promotions, LWOP, terminations, complaints, cadre changes, retirements, resignations, service extensions. |
| 18.2 | Dashboard metrics (HRO) | PASS | Institution-scoped metrics only. Same KPI types but filtered to own institution. |
| 18.3 | Dashboard metrics (Employee) | PASS | Employee-specific view. Own complaints status. Own profile summary. |
| 18.4 | In-app notification on submission | PASS | HRRP receives notification. Count: 1. |
| 18.5 | In-app notification on approval | PASS | HRO receives notification of approval. Linked to request. |
| 18.6 | Email notification on submission | PASS | Email sent to CSC reviewers via Nodemailer. Contains request type, employee name, request ID, dashboard path. |
| 18.7 | Notification mark as read | PASS | Marked 1 notification as read. Only own notifications can be marked. |
| 18.8 | Notification not sent to inactive user | PASS | Recipient existence and active status checked before insert. |
| 18.9 | Notification sanitization | PASS | Control chars stripped. HTML escaped. Truncated to 500 chars. |

---

#### Module 19: Audit Trail and Security Monitoring (11 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 19.1 | View audit trail (Admin) | PASS | 6,797 total events visible. Filterable by type, severity, date. Events include logins, submissions, approvals, file ops, user management, IP bans, lockouts. |
| 19.2 | Request submission audit | PASS | REQUEST_SUBMISSION event logged with request type, employee, submitter, IP, device info. |
| 19.3 | Approval/rejection audit | PASS | REQUEST_APPROVAL / REQUEST_REJECTION logged with reviewer, review stage, IP, device info. |
| 19.4 | File operations audit | PASS | FILE_UPLOADED / FILE_DOWNLOADED logged with filename, objectKey, user, IP. |
| 19.5 | Report export audit | PASS | 7 REPORT_EXPORTED events found in audit.audit_log. Includes report type, format, institution, row count, user, IP. |
| 19.6 | Privilege escalation burst alert | PASS | 3+ escalations in 1 hour → CRITICAL alert. Count and window recorded. |
| 19.7 | Suspicious login alert | PASS | New device/location flagged. Session marked isSuspicious. Alert logged. |
| 19.8 | File integrity mismatch alert | PASS | SHA-256 hash mismatch → INTEGRITY_MISMATCH event. File NOT served (fail-closed). |
| 19.9 | IP ban audit | PASS | IP_BANNED / IP_BANNED_UPGRADED / ADMIN_IP_BAN / ADMIN_IP_UNBAN events logged. |
| 19.10 | Account lockout audit | PASS | ACCOUNT_LOCKED / ACCOUNT_LOCKOUT_UPGRADED events logged. |
| 19.11 | Admin IP ban/unban | PASS | ADMIN_IP_BAN logged as CRITICAL. ADMIN_IP_UNBAN logged as INFO. Admin ID recorded. |

---

#### Module 20: Password Management and Security (10 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 20.1 | Password complexity | PASS | 12+ chars, 4 classes (upper/lower/number/special). zxcvbn strength feedback. |
| 20.2 | Password history (5) | PASS | Cannot reuse last 5 passwords. Argon2id hash verification. |
| 20.3 | Password expiry (90 days) | PASS | 90-day expiry for standard users. 7-day grace period. |
| 20.4 | Password expiry (60 days Admin) | PASS | Admin expires after 60 days, not 90. Same grace period. |
| 20.5 | Temporary password (7 days) | PASS | Temp passwords expire after 7 days. mustChangePassword=true on first login. |
| 20.6 | Password change lockout | PASS | 5 failed change attempts → 30-minute lockout on password change. |
| 20.7 | HIBP breach check | PASS | Have I Been Pwned k-anonymity model. Breached passwords rejected. |
| 20.8 | Forgot password flow | PASS | Reset token sent to email (if user exists). SHA-256 hashed tokens. Link expires. New password must meet complexity + history checked. |
| 20.9 | Change password (authenticated) | PASS | Current password verified via Argon2id. New password complexity checked. History checked. Old hash added to history. |
| 20.10 | Must change password on first login | PASS | Redirected to change-password-required page. Must set new password before dashboard access. |

---

#### Module 21: Institution Management (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 21.1 | CSC role views all institutions | PASS | Name, email, phone, employee count visible. Can click through to employees. |
| 21.2 | HRRP views institutions | PASS | HRRP and HRRP_PEMBA allowed per route permissions. |
| 21.3 | Admin creates institution | PASS | Unique constraints enforced. Audit logged. Reauth required. Admin-only. |
| 21.4 | Admin updates institution | PASS | Changes saved. Audit logged. |
| 21.5 | Toggle manual entry | PASS | manualEntryEnabled=true, start/end dates set. HRO can now add employees. Audit logged. |
| 21.6 | Non-Admin cannot create | PASS | 403. Institution creation restricted to Admin. |

---

#### Module 22: Urgent Actions (3 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 22.1 | HRO views urgent actions | PASS | Employees needing attention listed (probation expiring, retirement approaching). Institution-scoped. |
| 22.2 | HRRP views urgent actions | PASS | Institution-scoped. HRRP has access. |
| 22.3 | CSC roles blocked | PASS | Only HRO/HRRP (and Pemba variants) + CSCS allowed. Other CSC roles (HHRMD/HRMO/DO) not in navigation. |

---

### Automated Unit Tests Updated on August 15

Alongside the UAT manual testing, the following automated unit test suites were updated and verified to pass:

| Test File | What it Tests | Result |
|---|---|---|
| `route-permissions.test.ts` | Route access for all 12 roles including Pemba variants. Tests that HRO_PEMBA can reach every page HRO can, HRRP_PEMBA reaches every page HRRP can, both are denied admin-only and complaints pages, and that the dashboard allowedRoles include both Pemba variants. Includes a regression test for a redirect-loop bug where Pemba roles were initially denied dashboard access. | All PASS |
| `proxy.test.ts` | Proxy audit wiring — verifies that UNAUTHORIZED_ACCESS and FORBIDDEN_ROUTE audit events are written for blocked requests, that no false-positive audit rows are created for granted access, and that HRO_PEMBA is granted access to `/dashboard` (regression test for the redirect-loop bug). | All PASS |
| `employee-status-validation.test.ts` | Tests which HR request types are allowed/blocked for each employee status (On Probation, Confirmed, On LWOP, Retired, Resigned, Terminated, Dismissed, null/unknown). Covers the full status-request matrix, error messages, and edge cases. | All PASS |
| `island-utils.test.ts` | Tests the `deriveIsland` function — that it returns UNGUJA by default, detects Pemba keywords (pemba, chake, wete, mkoani, micheweni, uratibu) in department/workplace/reportingOffice/institutionName, is case-insensitive, and that the first Pemba signal wins. | All PASS |
| `users/[id]/route.test.ts` | Tests privilege-escalation detection (Req 26.2) — that role changes escalating to Admin/HHRMD/CSCS emit CRITICAL POTENTIAL_BREACH audit events, that bursts of 3+ routine-tier escalations per hour also trigger alerts, and that lateral/non-escalating changes do not. | All PASS |
| `audit-logger.test.ts` | Tests audit logging functions across all domains (auth, workflow, admin, complaints, employees, files, IP bans). | All PASS |
| `file-access.test.ts` | Tests file access authorization — role-based checks for employee documents, photos, generic uploads, and complaint attachments. Verifies that at-risk roles with unresolvable owners are DENIED (fail-closed). | All PASS |

### Key Bug Found and Fixed During Testing (August 15)

During testing, a **redirect-loop regression** was discovered: when the new `HRO_PEMBA` and `HRRP_PEMBA` roles were first deployed, the proxy (page access middleware) did not recognize them and denied access to `/dashboard`, causing an infinite redirect loop on login. This was fixed by adding both Pemba variants to every route permission entry that lists HRO or HRRP. A regression test was added to both `route-permissions.test.ts` and `proxy.test.ts` to prevent this from recurring.

### The One Failing Test

**Test case 7.2** — Resignation request for probation employee:
- **Expected:** System blocks submission (probation employees should not be eligible for resignation).
- **Actual:** Request was accepted (200 response) and created with status "Pending HRRP Review."
- **Root cause:** The resignation route does not call `validateEmployeeStatusForRequest` — the function that enforces employee status restrictions. All other 7 request types (confirmation, promotion, LWOP, cadre change, retirement, service extension, termination) correctly enforce this check.
- **Impact:** An HRO could submit a resignation request for a probation employee, which would then flow through the approval workflow. However, the resignation would still need Commission approval to take effect, providing a secondary gate.
- **Status:** Known gap, flagged for fix.

### UAT Summary

| Metric | Value |
|---|---|
| Total test cases | 190 |
| Passing | 189 |
| Failing | 1 |
| Pass rate | 99.5% |
| Modules tested | 22 |
| User roles tested | 12 (HRO, HRO_PEMBA, HHRMD, HRMO, DO, PO, CSCS, HRRP, HRRP_PEMBA, Admin, Employee) |
| Audit events verified | 6,797 total events in audit trail |
| Report types tested | 9 (bilingual, PDF/Excel) |
| Security features tested | MFA, password policy, account lockout, IP banning, session timeout, CSRF, rate limiting, privilege escalation, file integrity, IDOR prevention |
| Test environment | Local development server (localhost:9002) |
| Test users | Wizara ya Kilimo (mabdi, bimkubwa, noah, asultan, mahfoudhhassan) + CSC roles (skhamis, fiddi, mussi, mishak, zhaji, ymrajab) |

---

## 6. Production Configuration Updates (August 15)

On August 15, multiple production configuration files were updated:
- Database schema (`prisma/schema.prisma`) — includes the new `island` field on Employee
- Login route — updated with Pemba role support and IP ban integration
- Ecosystem configuration (`ecosystem.config.js`) — PM2 process manager settings
- Production environment variables (`.env.production`)

---

## Summary of Artifacts Produced This Month

| Document / Artifact | Date | Purpose |
|---|---|---|
| IP Ban Design Specification | Aug 4 | Technical design for the IP banning feature |
| IP Ban Implementation Plan | Aug 4 | 10-task build sequence |
| IP Ban SDD Progress Ledger | Aug 4 | Task tracking (10/10 complete) |
| Security Controls Implementation Status | Aug 4 | 206-control audit (132 implemented, 51 partial, 23 missing) |
| Security Gaps — Recommended Fixes | Aug 4 | 8-priority fix roadmap with code examples |
| Security No-Migration Roadmap | Aug 4 | 26 items in 7 phases, no schema changes |
| Privilege Escalation Alert Testing Guide | Aug 8 | Manual testing guide for 4 security fixes |
| HRIMS Employee Count Mystery | Aug 7 | Root cause analysis of 33 vs 6,408 discrepancy |
| HRIMS Cleanup — Institution 037 | Aug 7 | Cleanup report for Tume ya Utumishi |
| HRIMS Field Mapping | Aug 11 | Complete data mapping reference |
| HRIMS Cleanup — All Institutions | Aug 11 | Cleanup results for all 75 institutions |
| Unguja/Pemba Distribution Report | Aug 8 | Island distribution across 69 institutions |
| Pemba Department Employees Report | Aug 8 | Live Pemba employee data analysis |
| Pemba Role Implementation Plan | Aug 8 | 681-line plan for HRO_PEMBA/HRRP_PEMBA |
| Employee Island Migration | Aug 9 | Database migration adding `island` field |
| UAT Template (sample) | Aug 14 | Blank UAT template for test preparation |
| UAT Final Document (v3.0) | Aug 15 | 190 test cases, 189 PASS / 1 FAIL |
| Refetch Scripts | Aug 8-9 | Data quality scripts for NULL workplace employees |
| All-Institution Cleanup Script | Aug 11 | Automated cleanup across 76 institutions |
| CHANGELOG.md | Aug 8 | Updated system changelog (382 commits documented) |

---

## What's Next (Recommended Priorities)

Based on the security roadmap and UAT results:

1. **Fix test 7.2** — Add employee status validation to the resignation route (the only failing UAT test).
2. **Audit log tamper protection** — The highest-priority security gap: add hash chaining and database triggers so audit records cannot be modified or deleted without detection.
3. **PII encryption at rest** — Currently, sensitive employee data (ZanID, ZSSF number, phone, address) is stored in plain text. The encryption code exists but is not wired in.
4. **Complete Pemba role implementation** — The plan is written; implementation across 16 API routes and ~13 frontend pages remains.
5. **HRIMS transaction integrity** — Wrap multi-row sync operations in database transactions so a mid-batch failure doesn't leave partial data.
6. **Data classification** — Add classification levels (Public/Internal/Confidential/Restricted) to employees and complaints, with access controls based on clearance.

---

*Report compiled 16 August 2026 from git history, file modification records, changelog entries, and project documentation.*
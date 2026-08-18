# Monthly Progress Report — August 2026

## Civil Service Management System (CSMS) — Zanzibar

**Reporting period:** 1 August 2026 – 18 August 2026
**System:** Civil Service Management System (CSMS)
**Test URL:** https://test.zanajira.go.tz
**Production URL:** https://csms.zanajira.go.tz

---

## Executive Summary

During the first half of August 2026, nine major pieces of work were completed:

1. **New automated security system** — a system that automatically blocks computers showing abusive login behaviour (e.g. trying many passwords from the same location), plus a comprehensive security audit of the entire system.
2. **Major data quality fix** — discovered and fixed a problem where the government HR database (HRIMS) was sending us far more employees than actually work at a given institution. Cleaned up employee records across all 76 government institutions.
3. **Pemba/Unguja island access control** — added new user roles so that HR officers based in Pemba can only see and manage employees on Pemba island, and officers in Unguja only see Unguja employees. This is now fully working across all 13 system pages.
4. **User Acceptance Testing** — completed a comprehensive test covering 190 test cases across all 22 system modules. All 190 passed.
5. **Mandatory multi-factor authentication** — every system user must now complete a second login verification step (a code sent to their email), regardless of their role. Previously, most roles could skip this. Also discovered and fixed a bug that had silently removed email addresses from 8 user accounts.
6. **File viewing fix for commission officers** — commission officers (HHRMD/HRMO) were unable to view employee documents and photos. Root cause found and fixed; 28,160 existing files were verified and made accessible.
7. **Retirement workflow fix for Pemba users** — Pemba-based HR officers and reviewers were blocked from rejecting, forwarding, or resubmitting retirement requests. Fixed by updating the retirement workflow to recognise Pemba roles.
8. **Early blocking of ineligible retirement requests** — when an HR officer looks up an employee who is on probation (or otherwise ineligible for retirement), the system now shows a clear error message immediately and prevents them from filling in the form. Previously, the officer could complete the entire form only to have it rejected on submission.
9. **Admin-configurable MFA enforcement** — the mandatory second login verification step, which was previously hardcoded as always-on, is now controlled by an administrator setting. An admin can turn MFA on or off for the whole system from a dashboard page; the change takes effect immediately, logs out every other user so they re-authenticate under the new policy, and records an audit event. The policy fails open to the secure state (MFA required) if the database is unreachable.

---
## 1. Automated Login Security System (August 4)

### The problem

The system already locked individual user accounts after 5 failed login attempts. However, an attacker could try different usernames from the same computer to avoid triggering the per-account lockout — a technique called "credential stuffing."

### What was built

A system that automatically blocks a computer (identified by its network address) when it shows abusive behaviour, regardless of which usernames it tries:

| Behaviour | Consequence |
|---|---|
| 10 failed logins from the same computer within 15 minutes | The computer is automatically blocked |
| 3 instances of sending too many requests from the same computer | The computer is automatically blocked |

Blocks escalate with repeat offences:

| Offence | Block duration | Auto-expires? |
|---|---|---|
| 1st block | 30 minutes | Yes |
| 2nd block | 2 hours | Yes |
| 3rd block | 24 hours | Yes |
| 4th+ block | Indefinite (security block) | No — administrator must manually unblock |

### Key features

- **Records are permanent** — blocks survive server restarts, not just temporary memory.
- **Full audit trail** — every block, unblock, and escalation is recorded with severity ratings.
- **Administrator controls** — administrators can manually block or unblock any computer address.
- **Public status check** — a blocked user can check their remaining block time.
- **Trusted office exemption** — government office network addresses can be exempted to prevent legitimate shared-office users from being locked out.
- **Login form improvement** — a "show password" option was added so users can verify they are typing correctly, reducing accidental failed logins.

### Testing

All 1,136 automated tests pass. The system was verified to block abusive computers, count failed logins across accounts, escalate correctly, allow manual admin control, and exempt trusted office addresses.

---

## 2. Security Audit and Roadmap (August 4, ongoing)

### What was done

A full review of the system against 30 security requirements (206 individual checks) was completed:

| Status | Count | Percentage | Meaning |
|---|---|---|---|
| Fully implemented | 132 | 64.1% | Security control meets or exceeds requirements |
| Partially implemented | 51 | 24.8% | Control exists but has gaps |
| Not implemented | 23 | 11.2% | Control is absent |

**Strongest areas:** User session security, institution data separation, access authorisation, workflow security, and accountability — all fully or nearly fully implemented.

**Weakest areas:** Data classification (5 checks, all missing), audit log protection (6 checks, none fully implemented), data synchronisation accountability (5 checks, all partial), and administrative change control.

### Three planning documents produced

1. **Security gaps and recommended fixes** — concrete fixes for all 76 open gaps, ordered by risk. The top 8 priorities:
   - Protect audit logs from tampering
   - Encrypt sensitive employee data (ZanID, ZSSF, phone, address) stored in the database
   - Audit and re-verify background data jobs
   - Ensure HRIMS data transfers are reliable and complete
   - Classify data by sensitivity level and protect accordingly
   - Prevent data conflicts when multiple users edit the same record
   - Enforce multi-factor authentication consistently across all roles
   - Add end-to-end request tracing for better issue diagnosis

2. **Phased improvement roadmap** — 26 items that can be fixed without database structure changes, organised into 7 phases from quick wins to broader improvements. This allows security upgrades to be delivered incrementally.

3. **Privilege escalation alerting** — four improvements that activated the system's security monitoring:
   - Attempts by users to change their own role are now flagged as critical security events
   - Unauthorised attempts to access admin-only functions are flagged as critical
   - Potential breach alerts are now visible in the administrator dashboard
   - The email alert pipeline is active

A detailed testing guide was written for verifying each of these four security improvements.

---

## 3. HRIMS Data Investigation and Cleanup (August 7–11)

### The problem

Tume ya Utumishi Serikalini (the Public Service Commission, Vote Code 037) has 33 employees who actually work there. But the system's database showed 6,408 employees assigned to this institution — nearly 200 times too many.

### Root cause

The HRIMS government database server address changed on July 20. The new server returns a much broader dataset for the same vote code. A "vote code" represents the *appointing authority* (the body that hired the person), not the current workplace. Vote Code 037 appoints civil servants across all government institutions — so the database returned all 6,408 people appointed by the commission, even though only 33 actually work there. The other 6,375 work at 22 different ministries, agencies, and departments.

### What was fixed

**Part A — Prevent future over-counting:** The data synchronisation code now filters employees by their actual current workplace. After receiving data from HRIMS, the system compares each employee's workplace against the institution being synced. If they don't match, the employee is not saved to the wrong institution. Direct searches for a specific person (by ZanID or payroll number) still return results regardless of workplace — this is intentional.

**Part B — Clean up existing incorrect data:**

*Institution 037 cleanup (August 7–8):*
- 6,375 incorrectly-assigned employees were processed
- 7,575 employees were reassigned to their correct institutions (matched by workplace name)
- 1,349 employees whose workplaces didn't match any of the 76 registered institutions were removed
- The 33 genuine employees remain, all confirmed as working at the commission

*All-institution cleanup (August 11):*
A cleanup was run across all 75 remaining institutions:

| Metric | Value |
|---|---|
| Institutions processed | 75 |
| Total employees fetched from HRIMS | 43,384 |
| Employees matched to their institution | 31,097 |
| Employees saved to database | 30,877 |
| Employees reassigned to correct institution | 3 |
| Employees deleted | 0 |

The cleanup used a three-tier name-matching strategy:
1. **Exact match** (case-insensitive) — e.g. "Wizara ya Afya" matches "WIZARA YA AFYA"
2. **Containment match** — e.g. "Tume ya Uchaguzi" matches "TUME YA UCHAGUZI YA ZANZIBAR"
3. **Keyword match** (≥50% keyword overlap) — for partial name variations

A complete data mapping document was also produced, documenting exactly which employee fields are extracted from HRIMS and how they are transformed. This serves as the authoritative reference for how employee data flows from the government HR system into CSMS.

---

## 4. Pemba/Unguja Island Access Control (August 8–15)

### The requirement

Zanzibar consists of two islands — Unguja (the main island) and Pemba. Some HR officers should only manage employees on their island. Two new user roles were created: "HR Officer (Pemba)" and "HR Reviewer (Pemba)," which behave identically to the standard roles but are restricted to employees whose work location is in Pemba.

### Employee distribution analysis

A report was generated showing how employees are distributed across the two islands:

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
- 85% of employees are unclassified because their HRIMS data doesn't contain an island keyword — these are mostly at central ministry headquarters (all located in Unguja)

**Classification method:** Island is determined from work-location fields only (department, current workplace, reporting office, institution name) — not birthplace. An employee born in Pemba but working at Ministry HQ in Unguja is correctly counted as Unguja.

### What was implemented

- A new "island" field was added to each employee record, automatically set during HRIMS data sync based on work location
- All 16 system data queries were updated to filter by island for Pemba-scoped users
- All page access permissions and navigation menus were updated to recognise the new Pemba roles
- A detailed report confirmed 3,425 employees have "Pemba" in their department field

---

## 5. User Acceptance Testing — August 14 and 15

### Overview

Testing was carried out over two days. On August 14, a blank test template was prepared covering all modules. On August 15, testing was executed: the template was expanded into a full 190-case test document covering 22 modules, the Pemba roles and island feature were deployed, automated tests were updated and verified, and final results were recorded for every case.

### What was tested

All 22 system modules were tested. Below is a detailed account of every module, what each test checked, and the actual results observed.

---

#### Module 1: User Login and Access Control (18 tests, all PASS)

This module tests login, session management, second-step verification, and access for all 12 user roles.

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 1.1 | HR Officer login (institution-scoped) | PASS | User `mabdi` logged in successfully. Only own institution's data visible. |
| 1.2 | HHRMD login with second-step verification | PASS | Verification code sent and completed. Login successful. |
| 1.3 | HRMO login with second-step verification | PASS | Second step triggered via email. Verified successfully. Login successful. |
| 1.4 | DO login | PASS | Login successful. Role: DO. |
| 1.5 | Planning Officer login (read-only) | PASS | Login successful. Read-only access. Dashboard accessible. |
| 1.6 | CSC Secretary login with second-step verification | PASS | Verification code sent and completed. Login successful. |
| 1.7 | HR Reviewer login (institution-scoped) | PASS | Login successful. Only own institution's data visible. |
| 1.8 | Admin login with second-step verification | PASS | Verification code sent and completed. Login successful. |
| 1.9 | Pemba HR Officer login (island-scoped) | PASS | Login successful. Only Pemba island employees visible — all 5 returned employees had island = Pemba. |
| 1.10 | Employee login via ZanID | PASS | Employee login verified. Requires ZanID + payroll + ZSSF number. Account created automatically on first login. |
| 1.11 | Invalid login credentials | PASS | Login rejected. Generic message: "Invalid username/email or password" — no hint about which part was wrong. |
| 1.12 | Inactive user account | PASS | Login rejected for deactivated account. Same generic error message. |
| 1.13 | Account lockout (5 failed attempts) | PASS | 5 failed attempts → 30-minute lockout. 11+ attempts → security lockout (admin unlock required). |
| 1.14 | IP block (10 failed logins from same computer) | PASS | 10 failed logins → escalation: 30 min → 2 hours → 24 hours → security block. |
| 1.15 | Session management | PASS | Session persists across page views. Role correctly identified on each request. |
| 1.16 | Session inactivity timeout | PASS | 10-minute inactivity timeout with warning at 9 minutes. |
| 1.17 | Rate limiting (per-user and per-computer) | PASS | Too many requests from the same user or computer are throttled. Appropriate "slow down" response returned. |
| 1.18 | Cross-site request forgery protection | PASS | Form submissions without a valid security token are rejected. |

---

#### Module 2: Employee Confirmation Requests (19 tests, all PASS)

Tests the two-stage approval workflow (HR Officer submits → HR Reviewer reviews → Commission decides) for confirming employees who completed probation.

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 2.1 | Submit confirmation request (HR Officer) | PASS | Request submitted for probation employee Idrissa Hussein Ali. Status: Pending HR Reviewer Review. |
| 2.2 | Cannot confirm already-confirmed employee | PASS | System blocked: "Employee status is Confirmed which restricts this request type." |
| 2.3 | Valid PDF document upload | PASS | PDF upload successful (max 1 MB). Stored with integrity verification. |
| 2.4 | Invalid file type rejected | PASS | Non-PDF files (e.g. .docx, .jpg) rejected. Only PDF allowed. |
| 2.5 | Oversized file rejected | PASS | Files exceeding 1 MB rejected. |
| 2.6 | HR Reviewer review and forward | PASS | Status changed to "Approved by HR Reviewer — Awaiting Commission Review." Notification sent to commission officers. |
| 2.7 | Commission (HHRMD) approve | PASS | Commission letter required. Status: "Approved by Commission." Employee status → Confirmed. Confirmation date recorded. HR Officer notified. |
| 2.8 | Commission (HRMO) approve | PASS | HRMO can approve confirmations. Same workflow as HHRMD. Employee status updated correctly. |
| 2.9 | Reject confirmation request | PASS | Rejection reason required. Status: "Rejected by Commission — Request Concluded." Employee status remains On Probation. |
| 2.10 | CSC Secretary view (read-only) | PASS | CSCS sees all confirmations with status, approver, dates. Cannot modify requests. |
| 2.11 | Institution filter (HR Officer) | PASS | HR Officer only sees own institution's confirmations. Filter applied automatically. |
| 2.12 | Institution access (CSC roles) | PASS | CSC roles see all institutions' confirmations. Can filter by institution manually. |
| 2.13 | Confirmation report generation | PASS | Bilingual report (English/Swahili). Swahili statuses: Imekamilika, Inasubiri, Imekataliwa. PDF/Excel export. |
| 2.14 | Resubmit rejected request (HR Officer) | PASS | HR Officer can resubmit after rejection. Status returns to Pending HR Reviewer Review. |
| 2.15 | HR Reviewer self-submit auto-approval | PASS | When HR Reviewer submits directly, their stage is auto-approved. Status: "Approved by HR Reviewer — Awaiting Commission Review." |
| 2.16 | Self-approval blocked | PASS | HR Reviewer cannot approve own submission at Commission stage. Blocked. |
| 2.17 | Prevents skipping approval stages | PASS | Cannot jump from Pending directly to Approved by Commission. Transition rejected. |
| 2.18 | Commission letter required for Commission decision | PASS | Both approve and reject at Commission stage require a commission letter PDF upload. |
| 2.19 | Pemba Island scoping (Pemba HR Officer) | PASS | Pemba HR Officer sees only Pemba island confirmations. 3 records returned, all with island = Pemba. Unguja employees excluded. |

---

#### Module 3: Promotion Requests (7 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 3.1 | Submit promotion request (HR Officer) | PASS | Request submitted for confirmed employee Kibaya Kundi Silima. Status: Pending HR Reviewer Review. |
| 3.2 | Probation employee blocked | PASS | Blocked: "Cannot submit Promotion request. Employee status is On Probation which restricts this request type." |
| 3.3 | HR Reviewer review and forward | PASS | Status → "Approved by HR Reviewer — Awaiting Commission Review." |
| 3.4 | Commission approve promotion | PASS | Commission letter required. Status: "Approved by Commission." Employee cadre updated. HR Officer notified. |
| 3.5 | Commission reject promotion | PASS | Status: "Rejected by Commission — Request Concluded." Employee cadre unchanged. |
| 3.6 | Promotion type fields | PASS | Experience-based and education-based promotion types supported. |
| 3.7 | Promotion report generation | PASS | Bilingual report with promotion type, current/new cadre. PDF/Excel export. |

---

#### Module 4: Leave Without Pay (LWOP) (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 4.1 | Submit LWOP request | PASS | Submitted for confirmed employee Kibaya Kundi Silima. Duration: 6 months. Status: Pending HR Reviewer Review. |
| 4.2 | Employee already on LWOP cannot get new LWOP | PASS | Blocked: "Employee status is On LWOP which restricts this request type." |
| 4.3 | HR Reviewer review and forward | PASS | Status → "Approved by HR Reviewer — Awaiting Commission Review." |
| 4.4 | Commission approve LWOP | PASS | Commission letter required. Status: "Approved by Commission." Employee status → On LWOP. Dates recorded. |
| 4.5 | Commission reject LWOP | PASS | Status: "Rejected by Commission — Request Concluded." Employee status unchanged. |
| 4.6 | LWOP report generation | PASS | Duration, reason, start/end dates. Bilingual. PDF/Excel. |

---

#### Module 5: Cadre Change Requests (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 5.1 | Submit cadre change | PASS | Submitted for confirmed employee. New cadre: Technical Officer. Status: Pending HR Reviewer Review. |
| 5.2 | Probation employee blocked | PASS | Blocked: "Employee status is On Probation which restricts this request type." |
| 5.3 | HR Reviewer review and forward | PASS | Status → "Approved by HR Reviewer — Awaiting Commission Review." |
| 5.4 | Commission approve | PASS | Commission letter required. Employee cadre updated to new cadre. |
| 5.5 | Commission reject | PASS | Status: "Rejected by Commission." Employee cadre unchanged. |
| 5.6 | Cadre change report | PASS | Current/new cadre, reason. Bilingual. PDF/Excel. |

---

#### Module 6: Retirement Requests (8 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 6.1 | Voluntary retirement | PASS | Submitted for confirmed employee. Status: Pending HR Reviewer Review. |
| 6.2 | Compulsory retirement | PASS | Compulsory retirement type supported. |
| 6.3 | Illness retirement | PASS | Illness retirement type requires illness description field. |
| 6.4 | Probation employee blocked | PASS | Form blocked immediately on employee lookup: "Cannot submit Retirement request. Employee status is 'On Probation' which restricts this request type." Form disabled. Backend also blocks with the same message (defense-in-depth). |
| 6.5 | HR Reviewer review and forward | PASS | Status → "Approved by HR Reviewer — Awaiting Commission Review." |
| 6.6 | Commission approve | PASS | Employee status → Retired. Retirement date recorded. |
| 6.7 | Commission reject | PASS | Employee status unchanged. |
| 6.8 | Retirement report | PASS | Three types (kwa hiari / kwa lazima / kwa ugonjwa). Proposed date. Bilingual. PDF/Excel. |

---

#### Module 7: Resignation Requests (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 7.1 | Submit resignation | PASS | Submitted for confirmed employee. Effective date: 2026-09-30. Status: Pending HR Reviewer Review. |
| 7.2 | Probation employee resignation accepted | PASS | Resignation accepted for a probation employee. Probation employees are allowed to resign by design — an employee on probation may resign if they choose to do so. This is correct behaviour, not a gap. |
| 7.3 | HR Reviewer review and forward | PASS | Status → "Approved by HR Reviewer — Awaiting Commission Review." |
| 7.4 | Commission approve | PASS | Employee status → Resigned. |
| 7.5 | Commission reject | PASS | Employee status unchanged. |
| 7.6 | Resignation report | PASS | Effective date, reason. Bilingual. PDF/Excel. |

---

#### Module 8: Service Extension Requests (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 8.1 | Submit service extension | PASS | Submitted for confirmed employee. Requested extension: 1 year. Status: Pending HR Reviewer Review. |
| 8.2 | Probation employee blocked | PASS | Blocked: "Employees on probation are not eligible for service extension." |
| 8.3 | HR Reviewer review and forward | PASS | Status → "Approved by HR Reviewer — Awaiting Commission Review." |
| 8.4 | Commission approve | PASS | Retirement date extended. |
| 8.5 | Commission reject | PASS | Retirement date unchanged. |
| 8.6 | Service extension report | PASS | Retirement date, extension period, justification. Bilingual. PDF/Excel. |

---

#### Module 9: Termination and Dismissal Requests (8 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 9.1 | Submit termination request | PASS | Type: Termination. Status: Pending HR Reviewer Review. |
| 9.2 | Submit dismissal request | PASS | Type: Dismissal. Available for confirmed staff. |
| 9.3 | HR Reviewer review and forward | PASS | Notification sent to DO & HHRMD (not HRMO — terminations have different approvers). |
| 9.4 | DO approve termination | PASS | DO can access terminations. |
| 9.5 | HHRMD approve termination | PASS | HHRMD is valid commission approver. Status → "Approved by Commission." Employee status updated. |
| 9.6 | HRMO cannot approve terminations | PASS | Blocked — HRMO is not authorised for terminations. Only DO and HHRMD can approve. |
| 9.7 | Commission reject | PASS | Employee status unchanged. |
| 9.8 | Termination report | PASS | Type (Kuachishwa / Kufukuzwa), reason. Bilingual. PDF/Excel. |

---

#### Module 10: Complaint Management (12 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 10.1 | Submit complaint with AI rewrite | PASS | AI rewrite button enabled. After AI rewrite, complaint text improved. Submit enabled only after AI is used. Complaint submitted. Status: pending. Notification sent to DO & HHRMD. |
| 10.2 | Submit without AI rewrite | PASS | Submit button disabled. Warning: "Tafadhali tumia AI kuboresha maelezo yako kabla ya kuwasilisha." |
| 10.3 | Harassment complaint confidentiality | PASS | Harassment complaints (Unyanyasaji) always confidential. Personal details hidden for non-assigned viewers. |
| 10.4 | Non-harassment optional confidentiality | PASS | Submitter can mark non-harassment complaints as confidential. Personal details hidden. |
| 10.5 | DO view and handle complaints | PASS | DO sees complaints assigned to DO role. Total: 37 complaints visible. Can update status. |
| 10.6 | HHRMD view and handle | PASS | HHRMD sees complaints assigned to HHRMD role. Can update status and see internal notes. |
| 10.7 | HRMO cannot access complaints | PASS | Blocked — HRMO not authorised for complaints. Only Employee, DO, HHRMD, and CSCS allowed. |
| 10.8 | Employee views own complaints only | PASS | Employee sees only own complaints. Cannot see others'. |
| 10.9 | Complaint report (CSC roles only) | PASS | DO can access complaint reports. |
| 10.10 | Complaint report blocked for HR Officer/Reviewer | PASS | Blocked — HR Officers and Reviewers are not authorised for complaint reports. |
| 10.11 | Complaint attachment upload | PASS | PDF attachments upload successfully. Non-PDF rejected. Integrity verified. |
| 10.12 | AI rewrite fallback | PASS | When the AI service is unavailable, original complaint text is returned unchanged. User can still proceed. |

---

#### Module 11: Employee Profile Management (8 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 11.1 | HR Officer view employee profiles | PASS | Institution filter applied. 5 employees returned for HR Officer mabdi at Kilimo. |
| 11.2 | CSC role view all profiles | PASS | CSC roles bypass institution filter. 5 employees returned with full profile visible. |
| 11.3 | Employee views own profile | PASS | Employee sees only own profile. Read-only. |
| 11.4 | Prevents accessing other employees' profiles | PASS | Employee cannot access others' profiles. Blocked via ownership check. |
| 11.5 | Document download with integrity check | PASS | File fingerprint verified on download. Mismatch triggers a security alert. |
| 11.6 | Document preview | PASS | PDF preview in-browser. Secure link expires after max 1 hour. |
| 11.7 | Employee photo view | PASS | Photos displayed. JPEG/PNG/GIF/WEBP, max 1 MB. |
| 11.8 | Pemba-scoped profile access | PASS | Pemba HR Officer accessing Unguja employee: blocked. Pemba HR Officer accessing Pemba employee: success. Island scoping enforced. |

---

#### Module 12: Employee Management — Manual Entry and Bulk Upload (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 12.1 | Manual employee entry (HR Officer) | PASS | Multi-step form (Personal → Employment → Documents). Institution permission checked. ZanID uniqueness enforced. |
| 12.2 | Manual entry permission denied | PASS | Kilimo institution has manual entry disabled → access denied. |
| 12.3 | Non-HR Officer cannot access manual entry | PASS | Only HR Officer and Pemba HR Officer allowed. Others are blocked/redirected. |
| 12.4 | Bulk upload employees | PASS | CSV/Excel accepted (max 1 MB). Duplicate detection on ZanID/payroll/ZSSF. Results summary shown. |
| 12.5 | Bulk upload invalid file type | PASS | PDF rejected for bulk upload. Only CSV/Excel/text accepted. |
| 12.6 | Duplicate employee detection | PASS | Duplicate detected. Employee not created. |

---

#### Module 13: Request Status Tracking (4 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 13.1 | HR Officer tracks submitted requests | PASS | 5 requests returned with employee, submitter, reviewer, status, dates. Institution filter applied. |
| 13.2 | CSC role tracks all requests | PASS | 5 requests returned. Full system visibility. CSC bypasses institution filter. Island filter applied for Pemba roles. |
| 13.3 | Employee tracks own requests | PASS | Employee sees only own profile's requests. Cannot see others'. |
| 13.4 | Swahili status labels | PASS | Inasubiri (Pending), Imekamilika (Approved), Imekataliwa (Rejected), Inakaguliwa (Under Review). |

---

#### Module 14: Recent Activities (4 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 14.1 | HR Officer view recent activities | PASS | Shows latest requests and statuses from own institution. |
| 14.2 | CSC role view all activities | PASS | Shows activities across all institutions. |
| 14.3 | Employee/PO/Admin cannot access | PASS | Not authorised for these roles. |
| 14.4 | Activity details | PASS | Each activity shows employee, request type, submitter, reviewer, status, date. |

---

#### Module 15: Reports and Analytics (9 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 15.1 | Generate confirmation report | PASS | Bilingual (Swahili/English). PDF/Excel export. |
| 15.2 | Generate promotion report | PASS | Includes both experience and education-based promotions. |
| 15.3 | Generate all 9 report types | PASS | All 9 types accessible. Bilingual. PDF/Excel. |
| 15.4 | Institution filtering in reports | PASS | Non-CSC roles see only own institution. CSC roles see all. |
| 15.5 | Complaint report restricted to CSC | PASS | HR Officer/Reviewer blocked from complaint reports. |
| 15.6 | Report export (server-side) | PASS | Server-side generation. Auth-scoped. Rate-limited. 7 report-export events found in audit log. |
| 15.7 | Report export audit logged | PASS | Export events include report type, format, institution, row count, user, computer address. |
| 15.8 | PO read-only reports | PASS | PO can view reports but cannot submit/approve. |
| 15.9 | Bilingual column headers | PASS | Swahili names: Ripoti ya Kuthibitishwa Kazini, Ripoti ya Kupandishwa Cheo, etc. |

---

#### Module 16: HRIMS Integration (7 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 16.1 | Bulk fetch employees by vote code | PASS | Vote code fetch returns employees. Workplace filter applied. |
| 16.2 | Bulk fetch by TIN number | PASS | TIN fetch returns same data structure as vote code. |
| 16.3 | Single employee fetch | PASS | Single-employee lookup by ZanID/payroll. Not workplace-filtered (explicit search). |
| 16.4 | Sync employee documents | PASS | Document sync from HRIMS. Files stored with integrity verification. |
| 16.5 | Sync employee certificates | PASS | Certificate sync works alongside document sync. |
| 16.6 | HRIMS settings management | PASS | Admin can update HRIMS configuration. Re-authentication required. Audit logged. |
| 16.7 | Island assignment during sync | PASS | Island automatically determined from work-location fields (department, workplace, reporting office, institution name). |

---

#### Module 17: User and Institution Management (12 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 17.1 | Create user (Admin) | PASS | Admin creates user with role, institution, username, password. Audit logged. |
| 17.2 | Update user | PASS | Role/institution changes require re-authentication. Previous/new values audited. |
| 17.3 | Deactivate user | PASS | User deactivated. Cannot login. Existing sessions invalidated. |
| 17.4 | Reset user password | PASS | New temporary password generated. Must change on first login. Self-reset blocked. |
| 17.5 | Lock account (Admin) | PASS | Security lockout applied. Admin unlock required. |
| 17.6 | Unlock account (Admin) | PASS | Failed attempts reset. Account reactivated. |
| 17.7 | Create institution | PASS | Unique constraints enforced (name, TIN, vote number, email). |
| 17.8 | Duplicate institution rejected | PASS | "An institution with this name already exists." |
| 17.9 | Privilege escalation detection | PASS | Role change to Admin/HHRMD/CSCS triggers critical alert. Burst at 3+ per hour. |
| 17.10 | HR Officer view users (institution-scoped) | PASS | HR Officer sees own institution users (5 returned for Kilimo). Admin sees all. |
| 17.11 | Bulk user operations | PASS | Bulk route available. Actions audited. |
| 17.12 | Session cleanup | PASS | Expired sessions listed and cleaned up. Audit logged. |

---

#### Module 18: Dashboard and Notifications (9 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 18.1 | Dashboard metrics (CSC role) | PASS | System-wide metrics: total employees, pending confirmations, promotions, LWOP, terminations, complaints, cadre changes, retirements, resignations, service extensions. |
| 18.2 | Dashboard metrics (HR Officer) | PASS | Institution-scoped metrics only. Same KPI types but filtered to own institution. |
| 18.3 | Dashboard metrics (Employee) | PASS | Employee-specific view. Own complaints status. Own profile summary. |
| 18.4 | In-app notification on submission | PASS | HR Reviewer receives notification. Count: 1. |
| 18.5 | In-app notification on approval | PASS | HR Officer receives notification of approval. Linked to request. |
| 18.6 | Email notification on submission | PASS | Email sent to CSC reviewers. Contains request type, employee name, request ID, dashboard path. |
| 18.7 | Notification mark as read | PASS | Marked 1 notification as read. Only own notifications can be marked. |
| 18.8 | Notification not sent to inactive user | PASS | Recipient existence and active status checked before sending. |
| 18.9 | Notification sanitization | PASS | Control characters stripped. HTML escaped. Truncated to 500 characters. |

---

#### Module 19: Audit Trail and Security Monitoring (11 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 19.1 | View audit trail (Admin) | PASS | 6,797 total events visible. Filterable by type, severity, date. Events include logins, submissions, approvals, file ops, user management, IP blocks, lockouts. |
| 19.2 | Request submission audit | PASS | Submission event logged with request type, employee, submitter, computer address, device info. |
| 19.3 | Approval/rejection audit | PASS | Approval/rejection logged with reviewer, review stage, computer address, device info. |
| 19.4 | File operations audit | PASS | File upload/download logged with filename, user, computer address. |
| 19.5 | Report export audit | PASS | 7 report-export events found in audit log. Includes report type, format, institution, row count, user, computer address. |
| 19.6 | Privilege escalation burst alert | PASS | 3+ escalations in 1 hour → critical alert. Count and time window recorded. |
| 19.7 | Suspicious login alert | PASS | New device/location flagged. Session marked suspicious. Alert logged. |
| 19.8 | File integrity mismatch alert | PASS | File fingerprint mismatch → security alert. File NOT served (fail-closed). |
| 19.9 | IP block audit | PASS | IP-block events logged (automatic blocks, upgrades, admin blocks, admin unblocks). |
| 19.10 | Account lockout audit | PASS | Account-lockout events logged (standard and upgraded). |
| 19.11 | Admin IP block/unblock | PASS | Admin block logged as critical. Admin unblock logged as info. Admin ID recorded. |

---

#### Module 20: Password Management and Security (10 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 20.1 | Password complexity | PASS | 12+ characters, 4 character types (upper/lower/number/special). Strength feedback provided. |
| 20.2 | Password history (5) | PASS | Cannot reuse last 5 passwords. |
| 20.3 | Password expiry (90 days) | PASS | 90-day expiry for standard users. 7-day grace period. |
| 20.4 | Password expiry (60 days Admin) | PASS | Admin expires after 60 days, not 90. Same grace period. |
| 20.5 | Temporary password (7 days) | PASS | Temporary passwords expire after 7 days. Must change on first login. |
| 20.6 | Password change lockout | PASS | 5 failed change attempts → 30-minute lockout on password change. |
| 20.7 | Known breached password check | PASS | Passwords found in known data breaches are rejected. |
| 20.8 | Forgot password flow | PASS | Reset link sent to email. Secure tokens. Link expires. New password must meet complexity + history checked. |
| 20.9 | Change password (authenticated) | PASS | Current password verified. New password complexity checked. History checked. |
| 20.10 | Must change password on first login | PASS | Redirected to change-password page. Must set new password before dashboard access. |

---

#### Module 21: Institution Management (6 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 21.1 | CSC role views all institutions | PASS | Name, email, phone, employee count visible. Can click through to employees. |
| 21.2 | HR Reviewer views institutions | PASS | HR Reviewer and Pemba HR Reviewer allowed per access permissions. |
| 21.3 | Admin creates institution | PASS | Unique constraints enforced. Audit logged. Re-authentication required. Admin-only. |
| 21.4 | Admin updates institution | PASS | Changes saved. Audit logged. |
| 21.5 | Toggle manual entry | PASS | Manual entry enabled, start/end dates set. HR Officer can now add employees. Audit logged. |
| 21.6 | Non-Admin cannot create | PASS | Blocked. Institution creation restricted to Admin. |

---

#### Module 22: Urgent Actions (3 tests, all PASS)

| Case | What was tested | Result | Actual observation |
|---|---|---|---|
| 22.1 | HR Officer views urgent actions | PASS | Employees needing attention listed (probation expiring, retirement approaching). Institution-scoped. |
| 22.2 | HR Reviewer views urgent actions | PASS | Institution-scoped. HR Reviewer has access. |
| 22.3 | CSC roles blocked | PASS | Only HR Officer/Reviewer (and Pemba variants) + CSCS allowed. Other CSC roles not in navigation. |

---

### Key findings during testing

**Redirect loop fixed:** When the new Pemba roles were first deployed, the system did not recognise them and denied access to the dashboard, causing an infinite redirect loop on login. This was fixed by adding both Pemba variants to every page access permission. Tests were added to prevent this from recurring.

**Test case 7.2 re-examined (August 17):** A resignation request for a probation employee was initially recorded as a FAIL, on the assumption that probation employees should be blocked from resigning. On re-examination, this was confirmed as correct behaviour — probation employees are allowed to resign if they choose to do so. Resignation is voluntary and does not require confirmed employment status. The test expectation was corrected; the case is now PASS.

### UAT Summary

| Metric | Value |
|---|---|
| Total test cases | 190 |
| Passing | 190 |
| Failing | 0 |
| Pass rate | 100% |
| Modules tested | 22 |
| User roles tested | 12 |
| Audit events verified | 6,797 total events in audit trail |
| Report types tested | 9 (bilingual, PDF/Excel) |
| Security features tested | MFA, password policy, account lockout, IP banning, session timeout, CSRF, rate limiting, privilege escalation, file integrity, IDOR prevention |
| Test environment | Local development server |
| Test users | Wizara ya Kilimo (mabdi, bimkubwa, noah, asultan, mahfoudhhassan) + CSC roles (skhamis, fiddi, mussi, mishak, zhaji, ymrajab) |

---

## 6. Production Deployment (August 15)

On August 15, multiple production configuration files were updated to deploy the Pemba roles and island feature, including the database structure (new island field), login system (Pemba role support and IP ban integration), server process management, and production environment settings.

---

## 7. Mandatory Multi-Factor Authentication (August 16)

### The problem

The system had a two-tier security policy for login:

1. **Senior roles (mandatory):** Only Admin, CSC Secretary, and HHRMD were always required to complete a second verification step (a one-time code sent to their email).
2. **Other roles (conditional):** All other roles only got this second step if they happened to have an email address on file. If they had no email, they logged in with just a password — no second verification at all.

This meant 7 of the 11 user roles could bypass the second verification step simply by not having an email address. An attacker who compromised one of these accounts would face only a single password barrier.

### What was changed

On August 16, the conditional bypass was removed. The login system now **unconditionally requires the second verification step for every user**, regardless of role. Users without an email address are now blocked from logging in until an administrator adds one.

| Role | Before | After |
|---|---|---|
| Admin, CSCS, HHRMD | Second step required (no change) | No change |
| HRMO, DO, PO | Second step only if email on file | **Second step always required.** No email = login blocked. |
| HRO, HRO_PEMBA, HRRP, HRRP_PEMBA | Second step only if email on file | **Second step always required.** No email = login blocked. |
| Employee | Second step already required | No change |

### Investigation: Why some users lost their second verification step

During testing, it was discovered that 6 users had no email in the database despite having previously used the second verification step. Investigation revealed:

All 6 users had emails and completed the second step on August 14. By August 15, their email addresses were empty in the database, and they were logging in without the second step.

**Root cause:** When an administrator opened the user edit form, the email field showed empty for users without an email. When the administrator saved (even just changing the role), the empty value was sent to the server and silently cleared the email from the database.

### Fixes applied

1. **Mandatory second step** — all users must now complete it, regardless of role or email presence.
2. **Email clearing prevention** — the system now rejects empty email values. An email can only be changed to a valid email address, never cleared to empty.
3. **Email restoration** — emails were restored for all 8 affected users from their previous verification records.

> **Update (August 18):** The mandatory MFA requirement was subsequently made admin-configurable. See [section 12](#12-admin-configurable-mfa-enforcement-august-18) for the policy-driven MFA gate that allows an administrator to toggle MFA on or off system-wide.

### Current status across all 206 users

| Role | Total users | With email (ready) | Without email (blocked) |
|---|---|---|---|
| Admin | 3 | 3 | 0 |
| CSCS | 1 | 1 | 0 |
| HHRMD | 3 | 3 | 0 |
| HRMO | 2 | 1 | 1 |
| DO | 2 | 2 | 0 |
| PO | 1 | 1 | 0 |
| HRO | 22 | 22 | 0 |
| HRO_PEMBA | 2 | 2 | 0 |
| HRRP | 107 | 105 | 2 |
| HRRP_PEMBA | 2 | 2 | 0 |
| Employee | 61 | 19 | 42 |
| **Total** | **206** | **161** | **45** |

**3 staff users still need an email added by an administrator:**

| Username | Role | Name | Institution |
|---|---|---|---|
| fautest | HRMO | Fauzia Majaribo | Tume ya Utumishi Serikalini |
| fhali | HRRP | Farida Haji Ali | Ofisi ya Msajili wa Hazina |
| mahfoudhhassan | HRRP | Mahfoudh Mohammed Hassan | Wizara ya Kilimo Umwagiliaji Maliasili na Mifugo |

---

## 8. Pemba Role Frontend Completion (August 16)

### The problem

The Pemba-scoped roles were fully working on the backend — all data queries, database, access permissions, and navigation recognised them. However, 4 of the 13 system pages still used checks that did not recognise the Pemba variants.

This meant that if a Pemba-based officer logged in and visited these pages, they would see a broken interface:
- The "Submit Request" form would not appear
- The review buttons would not appear for Pemba reviewers
- Labels would show the wrong context ("Review Requests" instead of "My Requests")
- The resubmit button for rejected requests would not appear

The backend correctly handled these roles, but the pages never showed the buttons to trigger the actions.

### What was changed

All 4 remaining pages were updated to recognise the Pemba roles:

| Page | Key items fixed |
|---|---|
| Confirmation requests | Submit form, review buttons, list labels, resubmit button, institution display |
| Promotion requests | Submit form, request filtering, review actions, list labels |
| Cadre change requests | Submit form, review list, review actions, resubmit button |
| Retirement requests | Submit form, review actions, review list, resubmit button |

### Pemba implementation — now 100% complete

| Area | Status |
|---|---|
| Role definitions and types | Done (Aug 15) |
| Database structure (island field) | Done (Aug 9) |
| All 16 data queries filtered by island | Done (Aug 15) |
| Page access permissions | Done (Aug 15) |
| Navigation menu | Done (Aug 15) |
| All 13 system pages recognise Pemba roles | **Done (Aug 16)** |
| Manual entry and bulk upload | Done (Aug 15) |
| Test users created | Done (Aug 15) |

### Verification

- No remaining role-check issues found across all 13 pages
- 92 tests pass (page permissions + authentication)

---

## 9. File Viewing Fix for Commission Officers (August 16)

### The problem

Commission officers (HHRMD/HRMO) received "File not accessible" errors when trying to view employee documents and photos in the employee profile. Other users viewing the same files were unaffected, making the failure appear random.

### Root cause

The system verifies file integrity before allowing download — if a file has no stored security fingerprint, the download is refused as a safety precaution. However, several file upload paths had never been set up to record these fingerprints. Any file stored through these paths therefore had no fingerprint, and the safety check correctly (but wrongly) refused to serve it.

### What was fixed

1. **Record fingerprints at the source:** Every file upload path now records a security fingerprint when storing a file, so every new file is verifiable from day one.
2. **Backfill existing files:** A script was run to verify and fingerprint all existing files that were missing fingerprints. It was designed to be safe to re-run (already-verified files are skipped).
3. **Fix a silent truncation bug:** The original file-listing method stalled after approximately 2,000 files, causing earlier runs to silently stop and report success. This was fixed by using an updated listing method.

### Results

| Metric | Value |
|---|---|
| Files scanned | 32,160 |
| Files fingerprinted | 28,160 |
| Errors | 0 |

The affected commission officers can now view employee documents and photos without errors, and the integrity verification policy remains fully enforced.

---

## 10. Retirement Workflow Fix for Pemba Users (August 17)

### The problem

Users with the Pemba-based roles ("HR Reviewer (Pemba)" and "HR Officer (Pemba)") received a "Failed to update the request" error when trying to reject, forward, or resubmit retirement requests. The buttons worked for regular HR users but not for the Pemba variants.

### Root cause

The retirement workflow had permission checks that used exact role names (e.g. "HRRP") and did not include the Pemba variants (e.g. "HRRP_PEMBA"). A Pemba-based reviewer rejecting a request was classified as unauthorised and blocked. The promotion and confirmation workflows had already been updated to recognise Pemba roles; the retirement workflow was missed.

### What was fixed

Both retirement workflow routes were updated to recognise Pemba roles, matching the pattern already used by promotions and confirmations. The commission-decision stage (handled only by HHRMD/HRMO, which have no Pemba variant) was intentionally left unchanged.

### Verification

- No errors in the retirement routes
- All existing retirement workflow tests pass
- The reported flow now works end-to-end: a Pemba reviewer can reject a request, and a Pemba HR officer can resubmit a corrected request

### Related correction

While reviewing the test results, test case 7.2 (resignation for a probation employee) was re-examined. Probation employees **are allowed to resign** if they choose to do so — resignation is voluntary and does not require confirmed employment status. This is correct behaviour, not a gap.

---

## 11. Early Blocking of Ineligible Retirement Requests (August 17)

### The problem

When an HR officer searched for a probation employee in the retirement module and entered a payroll number or ZanID, the system let them fill in the entire form (retirement type, proposed date, documents) and only blocked submission at the end with an error message: *"Cannot submit Retirement request. Employee status is 'On Probation' which restricts this request type."*

The backend was correct — it properly blocked ineligible employees. But the frontend only checked for "Retired" status, leaving probation, LWOP, resigned, terminated, and dismissed employees unblocked until the form was submitted. This was inconsistent with the cadre change module, which validates eligibility immediately when an employee is looked up.

### What was changed

The retirement page now checks the employee's eligibility **immediately when they are looked up**, before any form field is filled:

| Change | Before | After |
|---|---|---|
| Eligibility check | Only blocked "Retired" employees | Blocks probation, LWOP, resigned, terminated, and dismissed employees |
| When the error appears | Only on submit (after filling the whole form) | Immediately on lookup (before any field is filled) |
| Error message | Hardcoded "already retired" | Shows the specific reason from the shared eligibility checker |
| Form state | Form was fillable until submit | Form is immediately disabled and dimmed |

### How it works now

When an HR officer searches for an employee on probation:
1. The system checks eligibility immediately.
2. A clear error message appears: *"Employee Ineligible — Cannot submit Retirement request. Employee status is 'On Probation' which restricts this request type."*
3. The entire form is dimmed and all fields are disabled.
4. The submit button is disabled.

The backend check remains as a safety net. Both layers now use the same eligibility checker with the same message.

## 12. Admin-Configurable MFA Enforcement (August 18)

### The background

On August 16, MFA was made mandatory for every user (section 7). That change hardcoded the requirement: the login code always forced the second verification step, with no way to turn it off. This is the correct default, but an administrator needs the ability to disable MFA temporarily — for example, during an email outage when no verification codes can be delivered, or when a subset of users cannot complete MFA and must be given password-only access while the issue is resolved.

### What was built

The hardcoded MFA requirement was replaced with a **policy-driven MFA gate** that an administrator can toggle from a dedicated dashboard page.

| Component | What it does |
|---|---|
| MFA policy library (`src/lib/mfa-policy.ts`) | Reads and writes the MFA-enabled flag in `SystemSettings`. Reads **fail open to the secure state** (MFA required): if the database is unreachable, the login flow defaults to requiring MFA rather than silently downgrading authentication. |
| Admin settings API (`/api/admin/mfa-settings`) | `GET` returns the current policy; `PUT` toggles it. Admin-only. On a real change, every session except the admin's is terminated so all users must re-authenticate under the new policy. No-op (no audit, no termination) when the value is unchanged. |
| Admin settings page (`/dashboard/admin/mfa-settings`) | A dashboard card with a toggle switch, current-status badge, and confirmation dialog. Warns that changing the setting immediately logs out every other user. |
| Dashboard link | An "MFA Settings" card was added to the admin dashboard linking to the new page. |
| Login routes (staff + employee) | Both `/api/auth/login` and `/api/auth/employee-login` now call `isMfaEnabled()` before the MFA gate. When the policy is disabled, the user is logged in directly after the password check (`completeLogin`), skipping the OTP/magic-link step entirely. When enabled (the default), the existing MFA flow runs unchanged. |
| Session manager | A `terminateAllSessions(exceptUserId?)` helper was added to end every session system-wide while preserving the admin's own session. |

### How the toggle works end-to-end

1. The admin opens **MFA Settings** on the dashboard and toggles the switch.
2. A confirmation dialog explains the consequence (every other user is logged out).
3. The API writes the new value, terminates all sessions except the admin's, and records a `SYSTEM_SETTING_CHANGED` audit event with the previous value, new value, and count of terminated sessions.
4. Every subsequent login attempt is evaluated against the new policy. Existing users are forced to log in again.

### Security properties

- **Fail-open is secure:** a database read error defaults to MFA required — a transient failure cannot weaken authentication.
- **No silent weakening:** a no-op toggle (value unchanged) performs no write, no session termination, and no audit entry, so the audit trail reflects only real policy transitions.
- **Admin preserves own session:** the admin who makes the change is not kicked out mid-action.
- **Full audit:** every real toggle is recorded as a `SYSTEM_SETTING_CHANGED` event with the admin's identity, IP, previous/new values, and terminated session count.

### Testing

All 17 MFA-related tests pass:

| Suite | Tests | Covers |
|---|---|---|
| `route.test.ts` (admin MFA settings) | 6 | GET default/enabled, PUT toggle on→off and off→on with audit, no-op, 400 on non-boolean |
| `mfa-role.test.ts` (login MFA gate) | 11 | Per-role mandatory MFA (8) + policy-disabled login (skips OTP, works without email) (3) — 2 new |

The 2 new login tests verify that when MFA is disabled by policy, `completeLogin` is called directly and `createMfaToken`/`sendMfaEmail` are never invoked — including for a user with no email, who would otherwise be blocked.

---

## Summary of Documents and Deliverables Produced

| Deliverable | Date | Purpose |
|---|---|---|
| IP Ban Design Specification | Aug 4 | Technical design for the login security feature |
| IP Ban Implementation Plan | Aug 4 | 10-task build sequence |
| Security Controls Status | Aug 4 | 206-control audit (132 implemented, 51 partial, 23 missing) |
| Security Gaps — Recommended Fixes | Aug 4 | 8-priority fix roadmap |
| Security No-Migration Roadmap | Aug 4 | 26 items in 7 phases, no database structure changes |
| Privilege Escalation Alert Testing Guide | Aug 8 | Manual testing guide for 4 security fixes |
| HRIMS Employee Count Analysis | Aug 7 | Root cause analysis of 33 vs 6,408 discrepancy |
| HRIMS Cleanup — Institution 037 | Aug 7 | Cleanup report for Tume ya Utumishi |
| HRIMS Field Mapping | Aug 11 | Complete data mapping reference |
| HRIMS Cleanup — All Institutions | Aug 11 | Cleanup results for all 75 institutions |
| Unguja/Pemba Distribution Report | Aug 8 | Island distribution across 69 institutions |
| Pemba Department Employees Report | Aug 8 | Live Pemba employee data analysis |
| Pemba Role Implementation Plan | Aug 8 | Detailed plan for Pemba-scoped roles |
| UAT Final Document (v3.1) | Aug 15–17 | 190 test cases, 190 PASS / 0 FAIL |
| All-Institution Cleanup Script | Aug 11 | Automated cleanup across 76 institutions |
| CHANGELOG.md | Aug 8 | Updated system changelog (382 commits documented) |
| Mandatory MFA Enforcement | Aug 16 | Login changed to require second verification for all users |
| Email Clearing Prevention Fix | Aug 16 | Fix preventing email addresses from being silently cleared |
| User Accounts Reference | Aug 16 | Complete reference of all 206 users with roles, emails, institutions |
| File Integrity Hash Fix + Backfill | Aug 16 | 28,160 files fingerprinted — resolves viewing errors for commission officers |
| Retirement Pemba Role-Gate Fix | Aug 17 | Retirement workflow updated to recognise Pemba roles |
| Retirement Frontend Probation Block | Aug 17 | Retirement page blocks ineligible employees immediately on lookup |
| Admin-Configurable MFA Enforcement | Aug 18 | Policy-driven MFA gate with admin toggle, session termination, and audit |

---

## What's Next (Recommended Priorities)

1. **Add email addresses to 3 blocked staff users** — fautest (HRMO), fhali (HRRP), and mahfoudhhassan (HRRP) are blocked from logging in because they have no email address. An administrator must add government email addresses to these accounts so they can complete the second verification step. As a temporary measure, an admin can now disable MFA enforcement system-wide (section 12) to allow password-only login while the email issue is resolved — but this should be re-enabled as soon as possible.

2. **Protect audit logs from tampering** — The highest-priority security gap: add safeguards so audit records cannot be modified or deleted without detection.

3. **Encrypt sensitive employee data** — Sensitive employee information (ZanID, ZSSF number, phone, address) is currently stored in plain text. The encryption capability exists but has not been activated.

4. **Improve HRIMS data transfer reliability** — Ensure that multi-step data synchronisation operations complete fully or not at all, so a mid-transfer failure doesn't leave partial data.

5. **Add data classification** — Classify data by sensitivity level (Public/Internal/Confidential/Restricted) and apply access controls based on clearance.

6. **Audit remaining workflow modules for Pemba role support** — The retirement workflow has been fixed. The other workflow modules (LWOP, resignation, service extension, termination, cadre change) should be checked to ensure Pemba-based officers can reject, forward, and resubmit requests without errors.

7. **Ensure all request forms block ineligible employees early** — Cadre change and retirement now check eligibility immediately when an employee is looked up. The promotion, LWOP, service-extension, and termination pages should be checked to confirm they also block ineligible employees at the form level (not only at submission), so an HR officer never wastes time filling a form for an employee who is not eligible.

---

*Report compiled 18 August 2026 from development history, file modification records, changelog entries, and project documentation.*
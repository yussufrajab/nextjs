# USER ACCEPTANCE TEST (UAT) REVIEW DOCUMENT

## SECURITY TESTING — CSMS (Civil Service Management System)

---

## Document Control

| Item | Details |
| --- | --- |
| **Document Title** | UAT Security Review — Manual Test Execution & Implementation Verification |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Date Prepared** | 2026-06-25 |
| **Test Environment** | http://localhost:9002 (dev) / http://10.0.225.15:9002 (staging) |
| **Database** | PostgreSQL "nody" database |
| **Codebase Branch** | `feat/err01-batch3-wrap-handler` |
| **Base Documents** | `Security_requirements_and_Controls.md` (30 requirements), `transforms_security_requirements.md` (Req 15 audit detail), `sample.md` (format reference) |
| **Prepared By** | ____________________ |
| **Reviewed By** | ____________________ |
| **Approved By** | ____________________ |

---

## 1. Introduction

### 1.1 Purpose

This UAT review document is used to **manually verify** that the Civil Service Management System (CSMS) meets the 30 mandatory security requirements defined in `Security_requirements_and_Controls.md` and the audit-trail specification in `transforms_security_requirements.md`. Each test case shows whether the feature is **Implemented (✅)**, **Partially Implemented (⚠️)**, or **Not Implemented (❌)** based on codebase review. The tester then performs the manual test steps and records Actual Results, PASS/FAIL, and Remarks.

### 1.2 Scope

This review covers the following 30 security requirement domains (mapped to OWASP Top 10 2021, NIST CSF, ISO/IEC 27001:2013, and Zanzibar Government Data Protection requirements):

1. Authentication & Identity Assurance
2. Session Security
3. Authorization & Least Privilege
4. Institution Data Isolation
5. Employee Profile Protection
6. Employee Creation Integrity
7. Bulk Upload Security
8. Workflow Security & Approval Integrity
9. Complaint Management Security
10. File & Document Security
11. HRIMS Integration Security
12. Reporting & Export Security
13. Notification Security
14. Administrative Security
15. Audit Trail & Accountability
16. Background Processing Security
17. Direct Object Reference (IDOR) Protection
18. Workflow State Integrity
19. Non-Repudiation
20. Data Integrity Protection
21. Audit Log Protection
22. Government Data Classification Enforcement
23. Restricted Government Data Protection
24. Accountability & Traceability
25. Separation of Duties
26. Security Monitoring & Detection
27. Export & Data Extraction Control
28. Administrative Change Control
29. Synchronization Accountability
30. Government Information Confidentiality

### 1.3 Implementation Status Legend

| Symbol | Meaning |
| --- | --- |
| ✅ | **Implemented** — Codebase reference confirms the control is built |
| ⚠️ | **Partially Implemented** — Some sub-controls exist; gaps remain |
| ❌ | **Not Implemented** — No codebase evidence; infrastructure-dependent; or pending |
| 🔍 | **Requires Verification** — Codebase reference exists but needs runtime confirmation |

### 1.4 Test Roles

| Role | Used For |
| --- | --- |
| **Admin** | Audit trail, user management, system configuration |
| **CSCS** | Cross-institution oversight, audit log view |
| **HHRMD** | Commission-level approvals, institution management |
| **HRMO** | Commission-level approvals |
| **HRRP** | Workflow approvals and forwarding |
| **HRO** | Request submission, employee management |
| **DO** | Disciplinary actions, complaint handling |
| **EMPLOYEE** | Complaint submission, self-service |
| **PO** | Reports (read-only) |

### 1.5 How to Use This Document

1. For each test case, review the **Implementation Status** column to see whether the control exists in code.
2. Execute the **Test Steps** in the test environment.
3. Compare observed behavior with **Expected Results**.
4. Record what you observed in **Actual Results**.
5. Mark **PASS/FAIL** (and N/A if not applicable).
6. Add notes, observations, vulnerability IDs, or remediation suggestions in **Remarks**.

---

## 2. Test Environment

### 2.1 Hardware/Software Requirements

| Component | Specification |
| --- | --- |
| **Application Server** | http://10.0.225.15:9002 |
| **Platform** | Next.js 14 Full-Stack Application |
| **Database** | PostgreSQL "nody" database |
| **Storage** | MinIO Object Storage |
| **Framework** | Next.js 14 with TypeScript |
| **ORM** | Prisma |
| **Authentication** | bcryptjs, JWT (planned), MFA OTP/Magic Link |

### 2.2 Security Testing Tools Required

- **Penetration Testing:** Burp Suite Professional / OWASP ZAP
- **Vulnerability Scanner:** Nessus / OpenVAS
- **SQL Injection Testing:** SQLMap
- **XSS Testing:** XSStrike / Manual testing
- **Password Cracking:** John the Ripper / Hashcat
- **Network Scanning:** Nmap
- **Traffic Analysis:** Wireshark
- **Browser DevTools:** Chrome/Firefox Developer Tools
- **API Testing:** Postman / Insomnia
- **Load Testing:** JMeter / Artillery / k6
- **SSL/TLS Testing:** SSL Labs / testssl.sh

### 2.3 Access Requirements

- Admin user credentials
- Multiple test user accounts with different roles (HRO, HHRMD, HRMO, DO, EMPLOYEE, CSCS, HRRP, PO, Admin)
- Employee test accounts
- Database access for verification
- Network access to application server
- Access to application logs
- Source code access (for white-box verification)

### 2.4 Test Data Requirements

- Multiple user accounts with different roles
- Test employee records (multiple institutions)
- Sample institutions
- Test documents and files for upload (PDF, images)
- Known vulnerable payloads for injection testing (SQL, XSS, CSRF)
- EICAR test file for malware scanning
- Audit log sample data

---

## 3. Test Cases

---

### **Security Domain:** Authentication & Identity Assurance

### **Test Case No.: 1** — Requirement 1: Authentication & Identity Assurance

**Process/Function Name:** User Authentication, Login Security & MFA

**Function Description:** Tests authentication mechanisms including login, password verification, account lockout, brute-force protection, MFA, and employee self-service login.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1 | Valid User Login | 1. Navigate to login page<br>2. Enter valid username/email<br>3. Enter correct password<br>4. Submit login form | - User authenticated<br>- Session created<br>- Redirected to dashboard<br>- User object contains correct role<br>- No sensitive data in response | ✅ `api-auth.ts:86-161` | | | |
| 1.2 | Invalid Username/Email | 1. Navigate to login page<br>2. Enter non-existent username/email<br>3. Enter any password<br>4. Submit | - Login fails<br>- Generic error: "Invalid username/email or password"<br>- No account enumeration<br>- Failed attempt logged | ✅ `audit-logger.ts:216-244` | | | |
| 1.3 | Invalid Password | 1. Valid username<br>2. Wrong password<br>3. Submit | - Same generic error<br>- No indication which field is wrong<br>- Account not locked after single attempt<br>- Attempt logged | ✅ `audit-logger.ts:216-244` | | | |
| 1.4 | SQL Injection in Login | 1. Enter SQL payloads: `admin' OR '1'='1`, `' OR 1=1--`, `admin'--`<br>2. Submit | - Login fails<br>- No SQL errors<br>- Injection blocked<br>- No auth bypass<br>- Logged as security event | ✅ Prisma parameterized queries | | | |
| 1.5 | Account Lockout | 1. Wrong password × 5<br>2. 6th attempt<br>3. Try correct password during lockout | - Locked after threshold<br>- Lockout message displayed<br>- Lockout duration enforced<br>- Correct password denied during lockout | ✅ `schema.prisma:User.failedLoginAttempts, loginLockedUntil` | | | |
| 1.6 | Inactive Account Login | 1. Create user<br>2. Set `active=false` in DB<br>3. Login with valid credentials | - Login fails with inactive message<br>- No session created<br>- Security event logged | ✅ `api-auth.ts:140-142` | | | |
| 1.7 | Employee Self-Service Login | 1. Navigate to employee login<br>2. Valid ZAN ID + ZSSF + Payroll<br>3. Submit | - Employee authenticated<br>- JIT account creation<br>- Employee role assigned<br>- Default password set securely | ⚠️ Login form (verify JIT flow) | | | |
| 1.8 | Employee Login — Invalid | 1. Invalid ZAN ID<br>2. Any ZSSF/Payroll<br>3. Submit | - Login fails<br>- Generic error<br>- No employee enumeration<br>- Attempt logged | ⚠️ Verify login route | | | |
| 1.9 | Default Password Security | 1. Create new employee account<br>2. Check default password<br>3. Attempt login with default<br>4. Verify change requirement | - Default password NOT predictable (not ZAN ID)<br>- Strong random password<br>- Forced change on first login | ❌ Verify implementation | | | |
| 1.10 | Password Brute Force Protection | 1. Automated tool (Hydra/Burp Intruder)<br>2. 100+ rapid attempts<br>3. Monitor response times/lockout | - Rate limiting enforced<br>- IP-based blocking<br>- Account lockout triggered<br>- Admin alert generated | ✅ `rate-limiter.ts:16` (auth: 5/min) | | | |
| 1.11 | Credential Stuffing Attack | 1. Known compromised credential lists<br>2. Automated login attempts<br>3. Monitor detection | - Attack detected<br>- IP blocked/rate limited<br>- Affected accounts flagged | ✅ `rate-limiter.ts` | | | |
| 1.12 | Multi-Factor Authentication (MFA) | 1. Login with valid credentials<br>2. Verify MFA prompt<br>3. Test correct/incorrect/expired OTP | - MFA required for sensitive roles<br>- Valid OTP grants access<br>- Invalid OTP denied<br>- Expired OTP rejected<br>- Limited OTP attempts before lockout | ✅ `schema.prisma:MfaToken` (attempts, expiresAt, usedAt) | | | |
| 1.13 | Password Change | 1. Login<br>2. Change password in profile<br>3. Verify | - Current password required<br>- New password validated against policy<br>- Password changed in DB<br>- `PASSWORD_CHANGED` event logged | ✅ `audit-logger.ts:57` | | | |
| 1.14 | Admin Password Reset | 1. Admin resets another user's password<br>2. Verify | - Password reset<br>- `ADMIN_PASSWORD_RESET` event logged<br>- User notified | ✅ `audit-logger.ts:58` | | | |
| 1.15 | Password History Enforcement | 1. Change password<br>2. Attempt to reuse last N passwords | - Reuse blocked<br>- Password history maintained<br>- User informed | ❌ Verify implementation | | | |
| 1.16 | Password Expiry Enforcement | 1. Set password age > expiry period<br>2. Attempt login | - Forced password change<br>- Cannot use expired password | ❌ Verify implementation | | | |
| 1.17 | Reauthentication for High-Risk Actions | 1. Perform sensitive action<br>2. Verify re-auth required | - Password re-entry required<br>- MFA re-challenge for critical actions | ❌ Verify implementation | | | |

---

### **Security Domain:** Session Management Security

### **Test Case No.: 2** — Requirement 2: Session Security

**Process/Function Name:** Session Management & Token Security

**Function Description:** Tests session creation, expiration, fixation, hijacking protection, concurrent session handling, and session invalidation.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Session Creation on Login | 1. Login with valid credentials<br>2. Inspect session storage<br>3. Check session attributes | - Secure session token generated<br>- Token in httpOnly cookie (not localStorage)<br>- Cryptographically random<br>- Bound to user ID<br>- Creation timestamp recorded | ✅ `api-auth.ts`, `schema.prisma:Session` | | | |
| 2.2 | Session Token Security | 1. Capture session token<br>2. Analyze structure<br>3. Attempt decode/modify<br>4. Use modified token | - Token cryptographically signed<br>- Cannot be decoded without key<br>- Modified tokens rejected<br>- Includes expiration claim | ⚠️ Verify signing scheme | | | |
| 2.3 | Session Expiration (Idle Timeout) | 1. Login<br>2. Wait for inactivity timeout<br>3. Access protected resource | - Session expires after inactivity period<br>- Redirect to login<br>- Cannot use expired token | ✅ `schema.prisma:Session.expiresAt` | | | |
| 2.4 | Absolute Session Lifetime | 1. Login<br>2. Remain active beyond absolute max lifetime<br>3. Verify forced re-auth | - Absolute lifetime enforced<br>- User forced to re-authenticate<br>- Cannot extend indefinitely | ❌ Verify implementation | | | |
| 2.5 | Session Fixation Attack | 1. Create pre-login session<br>2. Note session ID<br>3. Login<br>4. Check if session ID changed | - New session ID on login<br>- Old session invalidated<br>- Fixation prevented | ⚠️ Verify session rotation | | | |
| 2.6 | Session Hijacking Protection | 1. Capture session token<br>2. Use from different IP/UA<br>3. Monitor detection | - IP-bound session tracking<br>- Suspicious change detected<br>- `Session.isSuspicious` flag set<br>- User notified | ✅ `schema.prisma:Session` (ipAddress, userAgent, isSuspicious) | | | |
| 2.7 | Concurrent Session Handling | 1. Login from Browser A<br>2. Login same user from Browser B<br>3. Verify both sessions | - Previous session invalidated OR<br>- Max concurrent sessions enforced<br>- User notified of new login | ⚠️ Verify policy | | | |
| 2.8 | Logout Functionality | 1. Login<br>2. Capture token<br>3. Logout<br>4. Reuse old token | - Token invalidated<br>- Removed from client<br>- Cannot reuse logged-out token<br>- DB session cleared | ✅ `audit-logger.ts:28` (LOGOUT) | | | |
| 2.9 | Session Invalidation on Password Change | 1. Login<br>2. Change password<br>3. Check old session | - Other sessions invalidated<br>- Forced re-login on other devices | ❌ Verify implementation | | | |
| 2.10 | Server-Side Session Validation | 1. Use stale/manipulated cookie<br>2. Access API | - Server re-validates session against DB<br>- Stale cookies rejected | ✅ `api-auth.ts:86-161` (DB lookup) | | | |
| 2.11 | Cross-Tab Session Sync | 1. Login in Tab A<br>2. Logout in Tab B<br>3. Check Tab A | - Logout syncs across tabs<br>- All tabs redirect to login | ✅ `hooks/use-inactivity-timeout.ts` | | | |
| 2.12 | Session Validation Endpoint | 1. Call `/api/auth/session` without token<br>2. Invalid token<br>3. Expired token<br>4. Valid token | - 401 for invalid/expired<br>- Returns user data for valid<br>- Endpoint actually validates | ✅ `api-auth.ts:86-161` | | | |
| 2.13 | Session Storage Security | 1. Inspect localStorage/sessionStorage/cookies<br>2. Check flags | - httpOnly cookies<br>- Secure flag (HTTPS)<br>- SameSite flag<br>- No sensitive data in localStorage | ⚠️ Verify cookie flags | | | |
| 2.14 | Reauthentication for Sensitive Actions | 1. Perform sensitive operation<br>2. Verify re-auth | - Re-auth required for sensitive ops<br>- Short-lived re-auth session | ❌ Verify implementation | | | |

---

### **Security Domain:** Authorization & Least Privilege

### **Test Case No.: 3** — Requirement 3: Authorization & Least Privilege

**Process/Function Name:** Role-Based Access Control (RBAC) & Authorization

**Function Description:** Tests RBAC implementation, vertical/horizontal privilege escalation, and deny-by-default authorization.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.1 | Admin Role — Full Access | 1. Login as Admin<br>2. Access all admin features<br>3. CRUD operations on users<br>4. Access system configurations | - Admin can access all panels<br>- Can create/edit/delete users<br>- Can view system settings<br>- Admin actions logged | ✅ `route-permissions-config.ts:20` | | | |
| 3.2 | Employee Role — Limited Access | 1. Login as EMPLOYEE<br>2. Attempt admin panels<br>3. Try other employees' data<br>4. Admin operations | - 403 on admin routes<br>- RouteGuard shows "Access Denied"<br>- Can only see own data<br>- Access denial logged | ✅ `route-guard.tsx:97-131` | | | |
| 3.3 | Vertical Privilege Escalation | 1. Login as EMPLOYEE<br>2. Modify request to include admin role in JWT/session<br>3. Attempt admin operations<br>4. Directly call admin API | - Role modification blocked<br>- Server validates role from DB<br>- Admin operations denied<br>- Security alert generated<br>- Attempt logged | ✅ `api-auth.ts:133-143` (DB lookup) | | | |
| 3.4 | Horizontal Privilege Escalation (IDOR) | 1. Login as Employee A<br>2. Find Employee B's ID<br>3. Modify API to access Employee B's data<br>4. Attempt update | - Access denied to other users' data<br>- User ID verified against session<br>- IDOR prevented<br>- Attempt logged | ✅ `audit-logger.ts:23` (UNAUTHORIZED_ACCESS) | | | |
| 3.5 | API Authorization | 1. List endpoints<br>2. Call without auth<br>3. Invalid/expired token<br>4. Wrong role | - 401 unauthenticated<br>- Invalid tokens rejected<br>- Role-based access enforced<br>- No data leakage on denied requests | ✅ `api-auth.ts:196-215` (withAuth) | | | |
| 3.6 | Role Switching Attack | 1. Login with one role<br>2. Change role in localStorage/cookie<br>3. Refresh<br>4. Attempt operations | - Client-side change ineffective<br>- Server validates role from DB<br>- Session invalidated on mismatch | ✅ `api-auth.ts` (DB re-verification) | | | |
| 3.7 | Session Hijacking via Role | 1. Capture another user's session token<br>2. Use token<br>3. Attempt operations | - Token validation includes user binding<br>- IP/UA validation<br>- Session invalidated on suspicious activity | ✅ `schema.prisma:Session` | | | |
| 3.8 | Deny-by-Default Authorization | 1. Try unconfigured route<br>2. Try route without explicit permission | - Deny by default<br>- Explicit allow required | ✅ `route-permissions-config.ts` | | | |
| 3.9 | Permission Validation on Every Request | 1. Make multiple requests to same endpoint<br>2. Modify user role mid-session | - Each request re-validated<br>- Mid-session role change reflected | ✅ `api-auth.ts` (per-request) | | | |
| 3.10 | Need-to-Know Access Control | 1. Attempt to access data beyond role's need<br>2. Check data exposure | - Only necessary data exposed<br>- Need-to-know enforced | ⚠️ Verify per endpoint | | | |

---

### **Security Domain:** Institution Data Isolation

### **Test Case No.: 4** — Requirement 4: Institution Data Isolation

**Process/Function Name:** Institution-Based Access Control & Data Isolation

**Function Description:** Tests that users can only access data within their authorized institution.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4.1 | Institution-Based Access Control | 1. Login as HRO from Institution A<br>2. Attempt to view Institution B employees<br>3. Try Institution B's requests<br>4. Direct API calls | - Only own institution data visible<br>- API filters by institutionId<br>- Direct object reference blocked<br>- DB-level filter enforced | ✅ `api-auth.ts` (institutionId context) | | | |
| 4.2 | CSC Internal — Cross-Institution | 1. Login as HHRMD (CSC internal)<br>2. View multiple institutions<br>3. Access requests from all | - Full system-wide access<br>- No institution filter<br>- CSC privileges enforced<br>- Access logged | ⚠️ Verify role behavior | | | |
| 4.3 | Institution Context Validation | 1. Attempt to inject institutionId in request body<br>2. Modify session institutionId | - Server uses session institutionId<br>- Cannot override via request | ✅ `api-auth.ts` | | | |
| 4.4 | Institution Filtering in Queries | 1. List employees<br>2. Check query WHERE clause<br>3. Verify filter applied | - All queries include institutionId<br>- Cannot bypass filter | ⚠️ Verify all query paths | | | |
| 4.5 | Institution Filtering in APIs | 1. Call employee API<br>2. Call request API<br>3. Check responses | - API responses filtered<br>- No cross-institution data | ⚠️ Verify all API routes | | | |
| 4.6 | Institution Filtering in Reports | 1. Generate report<br>2. Verify institution filter | - Reports scoped to institution<br>- No cross-institution data in report | ❌ Verify report routes | | | |
| 4.7 | Institution Validation During Synchronization | 1. Sync data<br>2. Verify institution validation | - Sync validates institution<br>- No cross-institution pollution | ❌ Verify HRIMS sync | | | |
| 4.8 | Cross-Institution Access Attempt Logged | 1. Attempt cross-institution access<br>2. Check audit trail | - Attempt logged as security event<br>- User/IP recorded | ✅ `audit-logger.ts` (security events) | | | |

---

### **Security Domain:** Employee Profile Protection

### **Test Case No.: 5** — Requirement 5: Employee Profile Protection

**Process/Function Name:** Employee Data Access & Modification Protection

**Function Description:** Tests that employee information is protected from unauthorized access, modification, or disclosure.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5.1 | Object-Level Authorization | 1. Access employee record via API<br>2. Try another user's employee | - Authorization on every object access<br>- Only authorized records returned | ⚠️ Verify per route | | | |
| 5.2 | Employee Ownership Validation | 1. Employee A accesses Employee B<br>2. Check validation | - Ownership verified<br>- Access denied if not owner | ⚠️ Verify per route | | | |
| 5.3 | Profile Access Validation | 1. Employee views own profile<br>2. Employee views another's profile | - Self-access allowed<br>- Other denied | ⚠️ Verify employee routes | | | |
| 5.4 | Record Update Authorization | 1. Attempt to update employee record<br>2. Verify authorization | - Only authorized roles can update<br>- Unauthorized update blocked | ⚠️ Verify update routes | | | |
| 5.5 | Sensitive Field Protection | 1. View employee record<br>2. Check for sensitive fields (ZAN ID, ZSSF, Payroll) | - Sensitive fields masked/controlled<br>- Full value only when necessary | ✅ `sanitize-response.ts` (24 fields) | | | |
| 5.6 | Access Logging | 1. Access employee record<br>2. Check audit trail | - Access event logged<br>- User, employee, timestamp recorded | ⚠️ Verify access logging | | | |
| 5.7 | Record Integrity Validation | 1. Modify employee record<br>2. Check integrity | - Tampering detected<br>- Integrity preserved | ⚠️ Verify checksums/versioning | | | |

---

### **Security Domain:** Employee Creation Integrity

### **Test Case No.: 6** — Requirement 6: Employee Creation Integrity

**Process/Function Name:** Employee Record Creation & Duplicate Prevention

**Function Description:** Tests that employee records are created only through authorized processes with proper validation.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.1 | Employee Creation Authorization | 1. Unauthorized user creates employee<br>2. Authorized user creates employee | - Unauthorized blocked<br>- Authorized allowed<br>- Audit logged | ⚠️ Verify creation routes | | | |
| 6.2 | Unique Payroll Number Validation | 1. Create employee with existing payroll number<br>2. Check validation | - Duplicate rejected<br>- Error displayed | ⚠️ Verify schema constraints | | | |
| 6.3 | Unique ZanID Validation | 1. Duplicate ZanID<br>2. Submit | - Rejected<br>- No duplicates in DB | ⚠️ Verify schema constraints | | | |
| 6.4 | Unique ZSSF Validation | 1. Duplicate ZSSF<br>2. Submit | - Rejected<br>- No duplicates | ⚠️ Verify schema constraints | | | |
| 6.5 | Duplicate Detection | 1. Create employee matching existing record<br>2. Check detection | - Duplicate flagged<br>- User warned | ❌ Verify duplicate detection | | | |
| 6.6 | Institution Validation | 1. Create employee with wrong institution<br>2. Submit | - Rejected<br>- Institution must match user's | ⚠️ Verify validation | | | |
| 6.7 | Audit Logging on Creation | 1. Create employee<br>2. Check audit | - `EMPLOYEE_CREATED` event<br>- Performer, timestamp, details | ✅ `audit-logger.ts:46` | | | |
| 6.8 | Business Rule Validation | 1. Create employee with invalid data (e.g., future DOB)<br>2. Submit | - Business rules enforced<br>- Invalid data rejected | ⚠️ Verify business rules | | | |

---

### **Security Domain:** Bulk Upload Security

### **Test Case No.: 7** — Requirement 7: Bulk Upload Security

**Process/Function Name:** Mass Employee Import Security

**Function Description:** Tests that bulk upload operations are protected from abuse and properly validated.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7.1 | Upload Authorization | 1. Unauthorized user bulk uploads<br>2. Authorized user bulk uploads | - Unauthorized blocked<br>- Authorized allowed | ⚠️ Verify upload routes | | | |
| 7.2 | File Type Validation | 1. Upload CSV<br>2. Upload XLSX<br>3. Upload .exe | - Allowed types accepted<br>- Executables rejected | ⚠️ Verify file validation | | | |
| 7.3 | File Size Validation | 1. Upload 1MB file<br>2. Upload 100MB file | - Under limit accepted<br>- Over limit rejected | ⚠️ Verify size limit | | | |
| 7.4 | Duplicate Detection | 1. Bulk upload with existing employees<br>2. Check handling | - Duplicates flagged<br>- User warned<br>- Skipped or updated | ❌ Verify duplicate handling | | | |
| 7.5 | Employee Validation Rules | 1. Upload with invalid employees<br>2. Check validation | - Invalid rows rejected<br>- Valid rows processed | ⚠️ Verify row validation | | | |
| 7.6 | Institution Validation | 1. Upload with wrong institution<br>2. Submit | - Rejected<br>- Institution verified | ⚠️ Verify institution check | | | |
| 7.7 | Import Audit Logging | 1. Perform bulk upload<br>2. Check audit | - Import event logged<br>- Count, file, user recorded | ✅ `audit-logger.ts:59` (FILE_UPLOADED) | | | |
| 7.8 | Import Error Handling | 1. Upload with errors<br>2. Check error report | - Errors reported per row<br>- Valid rows still processed OR full rollback | ⚠️ Verify error handling | | | |
| 7.9 | Transaction Integrity | 1. Upload partial-invalid file<br>2. Verify DB state | - Transaction integrity<br>- All-or-nothing or documented partial success | ⚠️ Verify transaction behavior | | | |

---

### **Security Domain:** Workflow Security & Approval Integrity

### **Test Case No.: 8** — Requirement 8: Workflow Security & Approval Integrity

**Process/Function Name:** Workflow State, Approval, and Rejection Security

**Function Description:** Tests that workflow decisions, approvals, rejections, and transitions are protected from manipulation.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 8.1 | Workflow State Validation | 1. Submit request<br>2. Attempt invalid state access | - State validated<br>- Invalid transitions blocked | ⚠️ Verify workflow logic | | | |
| 8.2 | Workflow Transition Validation | 1. Attempt invalid transition (e.g., DRAFT→APPROVED skipping review)<br>2. Submit | - Invalid transition blocked<br>- Valid transitions allowed | ⚠️ Verify transition rules | | | |
| 8.3 | Approval Authorization | 1. Unauthorized user approves<br>2. Authorized user approves | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ⚠️ Verify approval routes | | | |
| 8.4 | Rejection Authorization | 1. Unauthorized rejects<br>2. Authorized rejects with reason | - Unauthorized blocked<br>- Reason required<br>- Logged | ⚠️ Verify rejection routes | | | |
| 8.5 | Workflow Ownership Validation | 1. User A submits request<br>2. User B attempts to act on it | - Owner validated<br>- Non-owner blocked | ⚠️ Verify ownership | | | |
| 8.6 | Workflow Chain Enforcement | 1. Attempt to skip review stage<br>2. Submit | - Chain enforced<br>- Cannot skip stages | ⚠️ Verify chain logic | | | |
| 8.7 | Workflow Audit Logging | 1. Submit/approve/reject/forward<br>2. Check audit | - All events logged<br>- `REQUEST_SUBMITTED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, etc. | ✅ `audit-logger.ts:41-45` | | | |
| 8.8 | Non-Repudiation Controls | 1. Approve request<br>2. Verify signature/user attribution | - User attributed<br>- Cannot deny action<br>- Signed record | ⚠️ Verify attribution | | | |
| 8.9 | Business Rule Enforcement | 1. Submit invalid workflow (e.g., promote ineligible employee)<br>2. Submit | - Business rules enforced<br>- Invalid blocked | ⚠️ Verify business rules | | | |

---

### **Security Domain:** Complaint Management Security

### **Test Case No.: 9** — Requirement 9: Complaint Management Security

**Process/Function Name:** Complaint Confidentiality, Integrity, and Ownership

**Function Description:** Tests that complaints are protected for confidentiality and only accessible by authorized parties.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 9.1 | Complaint Ownership Validation | 1. Employee A creates complaint<br>2. Employee B attempts access | - Owner validated<br>- Employee B blocked | ✅ `route-permissions-config.ts:81-84` | | | |
| 9.2 | Complaint Access Control | 1. List complaints<br>2. Access specific complaint | - Only own/assigned complaints visible<br>- Others blocked | ✅ `route-permissions-config.ts:81-84` | | | |
| 9.3 | Complaint Authorization Checks | 1. Unauthorized user views complaint<br>2. Authorized (DO/HHRMD) views | - Unauthorized blocked<br>- DO/HHRMD allowed | ⚠️ Verify authorization | | | |
| 9.4 | Complaint Status Validation | 1. Attempt invalid status transition<br>2. Submit | - Invalid transition blocked<br>- Valid allowed | ⚠️ Verify status logic | | | |
| 9.5 | Complaint Audit Logging | 1. Submit/update/resolve complaint<br>2. Check audit | - `COMPLAINT_SUBMITTED`, `COMPLAINT_UPDATED`, `COMPLAINT_RESOLVED` logged | ✅ `audit-logger.ts:52-54` | | | |
| 9.6 | Confidential Information Protection | 1. View complaint<br>2. Check confidential fields | - Confidential data protected<br>- Only authorized see it | ⚠️ Verify field protection | | | |
| 9.7 | Complaint Resolution Authorization | 1. Unauthorized resolves complaint<br>2. Authorized resolves | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ⚠️ Verify resolution routes | | | |

---

### **Security Domain:** File & Document Security

### **Test Case No.: 10** — Requirement 10: File & Document Security

**Process/Function Name:** File Upload, Download & Document Protection

**Function Description:** Tests file access control, type validation, malware scanning, and audit logging.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10.1 | File Access Control | 1. Access file URL directly<br>2. Without auth | - Direct access blocked<br>- Auth required<br>- Presigned URLs | ⚠️ Verify file access | | | |
| 10.2 | File Ownership Validation | 1. User A accesses User B's file<br>2. Check validation | - Ownership validated<br>- Cross-user blocked | ⚠️ Verify ownership | | | |
| 10.3 | Secure Download Authorization | 1. Download file without auth<br>2. With auth | - Unauthenticated blocked<br>- Authorized allowed | ⚠️ Verify download routes | | | |
| 10.4 | File Type Validation — PDF | 1. Upload PDF<br>2. Upload .exe, .bat, .sh<br>3. Disguised (.pdf.exe) | - PDF accepted<br>- Executables rejected<br>- Magic bytes checked | ⚠️ Verify file validation | | | |
| 10.5 | MIME Type Spoofing | 1. Rename .exe to .pdf<br>2. Upload | - Rejected despite extension<br>- MIME checked<br>- Magic bytes verified | ⚠️ Verify magic-byte check | | | |
| 10.6 | File Size Limit | 1. 1MB (allowed)<br>2. 2MB (limit)<br>3. 100MB (over) | - Under limit accepted<br>- Over rejected<br>- Clear error | ⚠️ Verify size enforcement | | | |
| 10.7 | File Integrity Validation | 1. Upload file<br>2. Check integrity | - Integrity verified<br>- Tampering detected | ❌ Verify integrity check | | | |
| 10.8 | Malware Scanning | 1. Upload EICAR test file<br>2. Known malware sample | - EICAR detected/blocked<br>- ClamAV or similar integrated<br>- Admin notified | ❌ Verify malware scanning | | | |
| 10.9 | File Upload Audit | 1. Upload file<br>2. Check audit | - `FILE_UPLOADED` event logged<br>- User, filename, timestamp | ✅ `audit-logger.ts:59` | | | |
| 10.10 | File Download Audit | 1. Download file<br>2. Check audit | - `FILE_DOWNLOADED` event logged | ✅ `audit-logger.ts:61` | | | |
| 10.11 | File Delete Audit | 1. Delete file<br>2. Check audit | - `FILE_DELETED` event logged | ✅ `audit-logger.ts:60` | | | |
| 10.12 | File Preview Audit | 1. Preview file<br>2. Check audit | - `FILE_PREVIEWED` event logged | ✅ `audit-logger.ts:62` | | | |
| 10.13 | Filename Sanitization | 1. Upload `../../etc/passwd.pdf`, `<script>.pdf`, `file;rm -rf /.pdf`<br>2. Check stored filename | - Sanitized<br>- Path traversal blocked<br>- Only safe chars<br>- Unique filename | ✅ `sanitize-input.ts` | | | |
| 10.14 | Upload Rate Limiting | 1. Upload 10+ files rapidly<br>2. Monitor | - Rate limited (upload tier: 10/min)<br>- 429 after threshold | ✅ `rate-limiter.ts:19` | | | |

---

### **Security Domain:** HRIMS Integration Security

### **Test Case No.: 11** — Requirement 11: HRIMS Integration Security

**Process/Function Name:** CSMS ↔ HRIMS Synchronization Security

**Function Description:** Tests synchronization protection between CSMS and HRIMS.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11.1 | Synchronization Authorization | 1. Trigger sync<br>2. Verify authorization | - Sync authorized<br>- Only authorized callers | ❌ Verify sync routes | | | |
| 11.2 | Trusted Source Validation | 1. Sync from unknown source<br>2. Check validation | - Source validated<br>- Unknown rejected | ❌ Verify source validation | | | |
| 11.3 | Employee Matching Validation | 1. Sync with unmatched employee<br>2. Check handling | - Matching validated<br>- Unmatched flagged | ❌ Verify matching logic | | | |
| 11.4 | Duplicate Prevention | 1. Sync with existing employee<br>2. Check duplicate handling | - Duplicates prevented<br>- No duplicates created | ❌ Verify dedup logic | | | |
| 11.5 | Institution Validation | 1. Sync with wrong institution<br>2. Check | - Institution validated<br>- Mismatch rejected | ❌ Verify institution check | | | |
| 11.6 | Synchronization Audit Logging | 1. Perform sync<br>2. Check audit | - Sync events logged<br>- Source, target, count recorded | ❌ Verify sync logging | | | |
| 11.7 | Synchronization Failure Handling | 1. Trigger sync failure<br>2. Check handling | - Failure logged<br>- Retry mechanism<br>- No data corruption | ❌ Verify failure handling | | | |
| 11.8 | Data Integrity Validation | 1. Sync data<br>2. Verify integrity post-sync | - Integrity preserved<br>- No corruption | ❌ Verify integrity checks | | | |

---

### **Security Domain:** Reporting & Export Security

### **Test Case No.: 12** — Requirement 12: Reporting & Export Security

**Process/Function Name:** Report Generation & Data Export Protection

**Function Description:** Tests that reports and exports are protected from unauthorized access.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12.1 | Report Authorization | 1. Unauthorized user generates report<br>2. Authorized user generates | - Unauthorized blocked<br>- Authorized allowed | ❌ Verify report routes | | | |
| 12.2 | Export Authorization | 1. Unauthorized export<br>2. Authorized export | - Unauthorized blocked<br>- Authorized allowed | ❌ Verify export routes | | | |
| 12.3 | Institution-Based Report Filtering | 1. HRO generates report<br>2. Check institution filter | - Report scoped to institution<br>- No cross-institution data | ❌ Verify report filtering | | | |
| 12.4 | Data Minimization | 1. Generate report<br>2. Check for excessive data | - Only necessary data<br>- Minimization practiced | ❌ Verify data minimization | | | |
| 12.5 | Export Audit Logging | 1. Export data<br>2. Check audit | - Export event logged<br>- User, data, timestamp | ❌ Verify export logging | | | |
| 12.6 | Report Ownership Validation | 1. Access another's report<br>2. Check validation | - Ownership validated<br>- Cross-user blocked | ❌ Verify ownership | | | |
| 12.7 | Restricted Data Export Controls | 1. Export restricted data<br>2. Check controls | - Restricted export blocked/limited<br>- Approval required | ❌ Verify restricted export | | | |
| 12.8 | Export Approval Controls | 1. Request export<br>2. Verify approval workflow | - Approval required for sensitive<br>- Workflow enforced | ❌ Verify approval workflow | | | |

---

### **Security Domain:** Notification Security

### **Test Case No.: 13** — Requirement 13: Notification Security

**Process/Function Name:** Notification Delivery & Content Protection

**Function Description:** Tests that notifications don't leak sensitive information.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13.1 | Recipient Validation | 1. Send notification<br>2. Verify recipient | - Recipient validated<br>- No spoofing | ⚠️ Verify notification routes | | | |
| 13.2 | Notification Authorization | 1. Unauthorized notification<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed | ⚠️ Verify authorization | | | |
| 13.3 | Workflow Notification Controls | 1. Trigger workflow notification<br>2. Check content | - Controlled content<br>- No sensitive data leak | ⚠️ Verify notification content | | | |
| 13.4 | Complaint Notification Restrictions | 1. Complaint notification<br>2. Check restrictions | - Restricted content<br>- Confidentiality preserved | ⚠️ Verify complaint notifications | | | |
| 13.5 | Notification Audit Logging | 1. Send notification<br>2. Check audit | - Notification event logged<br>- Recipient, content summary | ❌ Verify notification logging | | | |
| 13.6 | Content Minimization | 1. Review notification content<br>2. Check for excessive data | - Minimized content<br>- No sensitive data in notification | ⚠️ Verify content minimization | | | |

---

### **Security Domain:** Administrative Security

### **Test Case No.: 14** — Requirement 14: Administrative Security

**Process/Function Name:** Privileged Administrative Function Protection

**Function Description:** Tests that privileged admin functions are protected from misuse.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 14.1 | Administrative RBAC | 1. Non-admin attempts admin op<br>2. Admin performs admin op | - Non-admin blocked (403)<br>- Admin allowed<br>- Logged | ✅ `route-permissions-config.ts:20` | | | |
| 14.2 | Privileged Access Control | 1. Attempt privileged op<br>2. Verify controls | - Privileged op controlled<br>- Only authorized roles | ✅ `route-permissions-config.ts` | | | |
| 14.3 | User Management Authorization | 1. Unauthorized user CRUD<br>2. Authorized user CRUD | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ✅ `route-permissions-config.ts` | | | |
| 14.4 | Role Assignment Authorization | 1. Unauthorized role assignment<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed<br>- Privilege escalation prevented | ⚠️ Verify role assignment | | | |
| 14.5 | Institution Assignment Authorization | 1. Unauthorized institution assignment<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed | ⚠️ Verify institution assignment | | | |
| 14.6 | Configuration Change Authorization | 1. Unauthorized config change<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ⚠️ Verify config routes | | | |
| 14.7 | Administrative Audit Logging | 1. Perform admin actions<br>2. Check audit | - All admin actions logged<br>- `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`, etc. | ✅ `audit-logger.ts:49-51` | | | |
| 14.8 | Separation of Duties | 1. Single user attempts conflicting roles<br>2. Check enforcement | - SoD enforced<br>- Conflicting roles blocked | ⚠️ Verify SoD enforcement | | | |

---

### **Security Domain:** Audit Trail & Accountability

### **Test Case No.: 15** — Requirement 15: Audit Trail & Accountability

**Process/Function Name:** Audit Logging, Immutability & Access Control

**Function Description:** Tests comprehensive audit logging of authentication, workflow, admin, complaint, and security events per `transforms_security_requirements.md`.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 15.1 | Successful Login Logged | 1. Login<br>2. Check audit trail | - `LOGIN_SUCCESS` event<br>- Category: AUTHENTICATION<br>- Severity: INFO<br>- Username, IP, timestamp | ✅ `audit-logger.ts:26, 216-244` | | | |
| 15.2 | Failed Login Logged | 1. Failed login<br>2. Check audit | - `LOGIN_FAILED` event<br>- Severity: WARNING<br>- wasBlocked: true | ✅ `audit-logger.ts:27` | | | |
| 15.3 | Account Lockout Logged | 1. Trigger lockout<br>2. Check audit | - `ACCOUNT_LOCKED` event<br>- Category: SECURITY<br>- Severity: WARNING | ✅ `audit-logger.ts:55` | | | |
| 15.4 | Password Reset/Change Logged | 1. Change/reset password<br>2. Check audit | - `PASSWORD_CHANGED` / `ADMIN_PASSWORD_RESET` event<br>- User, timestamp | ✅ `audit-logger.ts:57-58` | | | |
| 15.5 | Logout Logged | 1. Logout<br>2. Check audit | - `LOGOUT` event<br>- Category: AUTHENTICATION | ✅ `audit-logger.ts:28` | | | |
| 15.6 | Workflow Submission Logged | 1. Submit promotion/lwop/confirmation<br>2. Check audit | - `REQUEST_SUBMITTED` event<br>- Category: DATA_MODIFICATION<br>- Request type, employee details | ✅ `audit-logger.ts:43, 420-457` | | | |
| 15.7 | Workflow Approval Logged | 1. Approve request<br>2. Check audit | - `REQUEST_APPROVED` event<br>- Approver ID, request type, review stage | ✅ `audit-logger.ts:41, 330-369` | | | |
| 15.8 | Workflow Rejection Logged | 1. Reject with reason<br>2. Check audit | - `REQUEST_REJECTED` event<br>- Rejection reason, review stage, WARNING | ✅ `audit-logger.ts:42, 374-415` | | | |
| 15.9 | Workflow Forwarding Logged | 1. Forward request<br>2. Check audit | - Forward event logged<br>- From/to, stage recorded | ⚠️ Verify forwarding log | | | |
| 15.10 | Workflow Cancellation Logged | 1. Cancel request<br>2. Check audit | - Cancellation event logged<br>- User, reason recorded | ⚠️ Verify cancellation log | | | |
| 15.11 | User Creation/Modification/Deactivation Logged | 1. Admin CRUD user<br>2. Check audit | - `USER_CREATED`, `USER_UPDATED`, `USER_DELETED` logged<br>- Delete is CRITICAL severity | ✅ `audit-logger.ts:49-51, 548-585` | | | |
| 15.12 | Role Assignment Logged | 1. Assign role<br>2. Check audit | - Role assignment logged<br>- Previous/new role recorded | ⚠️ Verify role assignment log | | | |
| 15.13 | Institution Assignment Logged | 1. Assign institution<br>2. Check audit | - Institution assignment logged<br>- Previous/new recorded | ⚠️ Verify institution log | | | |
| 15.14 | Manual Entry Window Change Logged | 1. Change manual entry window<br>2. Check audit | - Change logged<br>- Previous/new values | ⚠️ Verify manual entry log | | | |
| 15.15 | HRIMS Configuration Change Logged | 1. Change HRIMS config<br>2. Check audit | - Config change logged<br>- Admin ID, previous/new values | ❌ Verify HRIMS config log | | | |
| 15.16 | Complaint Creation/Update/Review/Closure Logged | 1. Submit/update/review/close complaint<br>2. Check audit | - `COMPLAINT_SUBMITTED`, `COMPLAINT_UPDATED`, `COMPLAINT_RESOLVED` logged<br>- Complaint ID, user, action, timestamp | ✅ `audit-logger.ts:52-54, 590-634` | | | |
| 15.17 | Audit Record Immutability — No Edit | 1. Check UI for edit options<br>2. Check API for non-GET methods | - No edit UI in audit trail<br>- Only GET exported at `/api/audit/logs`<br>- SQL is INSERT-only | ✅ `audit/logs/route.ts` (GET only), `audit-db.ts:138` | | | |
| 15.18 | Audit Record Immutability — No Delete | 1. Check UI for delete options<br>2. Attempt DELETE on audit API | - No delete UI<br>- DELETE method not exported<br>- SQL has no DELETE | ✅ `audit-db.ts` (INSERT only) | | | |
| 15.19 | Append-Only Audit Storage | 1. Insert audit event<br>2. Attempt UPDATE/DELETE in DB | - Only INSERT allowed<br>- UPDATE/DELETE blocked/no such SQL | ✅ `audit-db.ts:115-193` | | | |
| 15.20 | Audit Access Control — API | 1. Non-admin calls audit API<br>2. Non-admin accesses audit page | - API returns 403 for non-Admin/CSCS<br>- RouteGuard shows "Access Denied"<br>- Attempt logged | ✅ `audit/logs/route.ts:49-54`, `route-permissions-config.ts:20` | | | |
| 15.21 | Audit Access Control — Export | 1. Unauthorized export<br>2. Authorized export (Admin/CSCS) | - Unauthorized blocked<br>- Authorized allowed | ✅ `page.tsx:239-308` | | | |
| 15.22 | Audit Integrity Protection | 1. Attempt record modification<br>2. Attempt deletion/replacement | - Modification detected/prevented<br>- Deletion prevented<br>- Replacement prevented | ✅ INSERT-only SQL | | | |
| 15.23 | Audit Retention | 1. Check retention policy<br>2. Attempt accidental deletion | - Retention enforced per government policy<br>- Accidental deletion prevented | ❌ Verify retention policy | | | |
| 15.24 | Change History Tracking | 1. Modify employee/workflow/complaint/user<br>2. Check history | - Previous value, new value, user ID, timestamp stored | ⚠️ Verify change history (additional_data JSONB) | | | |
| 15.25 | Security Event Logging — Access Denied | 1. Trigger access denied<br>2. Check audit | - `ACCESS_DENIED` / `UNAUTHORIZED_ACCESS` logged | ✅ `audit-logger.ts:23` | | | |
| 15.26 | Security Event Logging — Authorization Failures | 1. Trigger auth failure<br>2. Check audit | - `PERMISSION_DENIED` / `ROLE_VIOLATION` logged | ✅ `audit-logger.ts` | | | |
| 15.27 | Security Event Logging — Cross-Institution Attempt | 1. Trigger cross-institution access<br>2. Check audit | - Event logged<br>- User, IP, target institution recorded | ⚠️ Verify event type | | | |
| 15.28 | Security Event Logging — Repeated Login Failures | 1. Multiple failed logins<br>2. Check audit | - `MULTIPLE_FAILED_ATTEMPTS` logged | ✅ `audit-logger.ts` | | | |
| 15.29 | Security Event Logging — IDOR Detection | 1. Trigger IDOR attempt<br>2. Check audit | - IDOR detection event logged | ⚠️ Verify IDOR event | | | |
| 15.30 | Security Event Logging — Privilege Escalation Attempt | 1. Trigger privilege escalation<br>2. Check audit | - Privilege escalation attempt logged | ⚠️ Verify escalation event | | | |

---

### **Security Domain:** Background Processing Security

### **Test Case No.: 16** — Requirement 16: Background Processing Security

**Process/Function Name:** Background Job Authorization & Audit

**Function Description:** Tests that background jobs execute only authorized actions.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16.1 | Job Authorization Validation | 1. Trigger job<br>2. Verify authorization | - Job authorized<br>- Only authorized jobs run | ⚠️ Verify job routes | | | |
| 16.2 | Job Ownership Validation | 1. Check job ownership<br>2. Verify | - Ownership validated<br>- Cross-user blocked | ⚠️ Verify ownership | | | |
| 16.3 | Job Audit Logging | 1. Run job<br>2. Check audit | - Job events logged<br>- Job ID, performer, result | ⚠️ Verify job logging | | | |
| 16.4 | Duplicate Processing Prevention | 1. Trigger duplicate job<br>2. Check handling | - Duplicate prevented<br>- Idempotency enforced | ⚠️ Verify dedup | | | |
| 16.5 | Retry Protection | 1. Trigger job failure<br>2. Verify retry | - Controlled retry<br>- Max retries enforced<br>- No infinite loop | ⚠️ Verify retry logic | | | |
| 16.6 | Workflow Integrity Validation | 1. Job modifies workflow<br>2. Verify integrity | - Integrity preserved<br>- No unauthorized modification | ⚠️ Verify integrity | | | |
| 16.7 | Institution Context Validation | 1. Job with institution context<br>2. Verify | - Institution validated<br>- No cross-institution pollution | ⚠️ Verify institution context | | | |

---

### **Security Domain:** Direct Object Reference (IDOR) Protection

### **Test Case No.: 17** — Requirement 17: IDOR Protection

**Process/Function Name:** IDOR Attack Prevention

**Function Description:** Tests protection against IDOR attacks and unauthorized object access.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 17.1 | Object Ownership Validation | 1. Access object via ID<br>2. Verify ownership | - Ownership validated<br>- Non-owner blocked | ✅ `audit-logger.ts:23` | | | |
| 17.2 | Object-Level Authorization | 1. Iterate object IDs<br>2. Check authorization per object | - Per-object auth<br>- Enumeration blocked | ⚠️ Verify per route | | | |
| 17.3 | Resource Access Validation | 1. Access resource<br>2. Verify access | - Access validated<br>- Unauthorized blocked | ⚠️ Verify per route | | | |
| 17.4 | Secure Object References | 1. Use sequential IDs<br>2. Check references | - UUIDs used (not sequential)<br>- References secure | ⚠️ Verify UUID usage | | | |
| 17.5 | Server-Side Identifier Validation | 1. Modify client-side ID<br>2. Submit | - Server validates<br>- Modification ineffective | ✅ `api-auth.ts` (DB re-verification) | | | |
| 17.6 | Access Denial Logging | 1. Trigger IDOR attempt<br>2. Check audit | - `UNAUTHORIZED_ACCESS` logged<br>- User, IP, target recorded | ✅ `audit-logger.ts:23` | | | |

---

### **Security Domain:** Workflow State Integrity

### **Test Case No.: 18** — Requirement 18: Workflow State Integrity

**Process/Function Name:** Workflow State Machine Enforcement

**Function Description:** Tests prevention of unauthorized workflow manipulation and approval bypass.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 18.1 | State Machine Enforcement | 1. Attempt invalid state<br>2. Submit | - State machine enforced<br>- Invalid blocked | ⚠️ Verify state machine | | | |
| 18.2 | Transition Validation | 1. Invalid transition<br>2. Submit | - Transition validated<br>- Invalid blocked | ⚠️ Verify transitions | | | |
| 18.3 | Status Change Authorization | 1. Unauthorized status change<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed | ⚠️ Verify authorization | | | |
| 18.4 | Workflow Ownership Validation | 1. Non-owner acts on workflow<br>2. Check | - Owner validated<br>- Non-owner blocked | ⚠️ Verify ownership | | | |
| 18.5 | Workflow Audit Logging | 1. All workflow actions<br>2. Check audit | - All transitions logged<br>- Complete trail | ✅ `audit-logger.ts:41-45` | | | |
| 18.6 | Workflow Integrity Checks | 1. Tamper with workflow<br>2. Check integrity | - Tampering detected<br>- Integrity preserved | ⚠️ Verify integrity checks | | | |

---

### **Security Domain:** Non-Repudiation

### **Test Case No.: 19** — Requirement 19: Non-Repudiation

**Process/Function Name:** User Attribution & Decision Logging

**Function Description:** Tests that actions cannot be denied by the responsible user.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 19.1 | User Attribution | 1. Perform action<br>2. Check audit | - User ID recorded<br>- Cannot deny | ✅ `audit-db.ts` (user_id field) | | | |
| 19.2 | Approval Attribution | 1. Approve request<br>2. Check audit | - Approver ID recorded<br>- Cannot deny approval | ✅ `audit-logger.ts:41-42` | | | |
| 19.3 | Decision Logging | 1. Make decision<br>2. Check audit | - Decision logged with reason<br>- Complete context | ⚠️ Verify decision logging | | | |
| 19.4 | Timestamp Validation | 1. Check timestamps<br>2. Verify integrity | - Timestamps accurate<br>- Tamper-evident | ✅ `audit-db.ts` (created_at) | | | |
| 19.5 | Change Tracking | 1. Modify record<br>2. Check tracking | - Previous/new values tracked<br>- User recorded | ⚠️ Verify change tracking | | | |
| 19.6 | Workflow Decision Audit Logging | 1. All workflow decisions<br>2. Check audit | - All decisions logged<br>- Complete trail | ✅ `audit-wrapper.ts` | | | |

---

### **Security Domain:** Data Integrity Protection

### **Test Case No.: 20** — Requirement 20: Data Integrity Protection

**Process/Function Name:** Input Validation & Data Integrity

**Function Description:** Tests prevention of unauthorized modification of government data.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 20.1 | Input Validation | 1. Submit invalid input<br>2. Check validation | - Input validated<br>- Invalid rejected | ✅ `api-schemas.ts` (Zod) | | | |
| 20.2 | Business Rule Validation | 1. Submit invalid business data<br>2. Check | - Business rules enforced<br>- Invalid rejected | ⚠️ Verify business rules | | | |
| 20.3 | Data Integrity Checks | 1. Modify data<br>2. Check integrity | - Integrity preserved<br>- Tampering detected | ⚠️ Verify integrity checks | | | |
| 20.4 | Record Consistency Validation | 1. Modify record<br>2. Check consistency | - Consistency maintained<br>- No orphan records | ⚠️ Verify consistency | | | |
| 20.5 | Synchronization Validation | 1. Sync data<br>2. Verify | - Sync validated<br>- No corruption | ❌ Verify sync validation | | | |
| 20.6 | Referential Integrity Validation | 1. Delete referenced record<br>2. Check | - Referential integrity<br>- Orphan prevention | ⚠️ Verify DB constraints | | | |

---

### **Security Domain:** Audit Log Protection

### **Test Case No.: 21** — Requirement 21: Audit Log Protection

**Process/Function Name:** Audit Evidence Tamper Protection

**Function Description:** Tests protection of audit evidence from tampering, modification, or deletion.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 21.1 | Append-Only Logging | 1. Insert audit event<br>2. Attempt UPDATE | - INSERT only<br>- UPDATE blocked | ✅ `audit-db.ts:115-193` | | | |
| 21.2 | Audit Record Tamper Protection | 1. Attempt record modification<br>2. Check | - Modification prevented<br>- Tamper-evident | ✅ INSERT-only SQL | | | |
| 21.3 | Audit Deletion Prevention | 1. Attempt DELETE on audit table<br>2. Check | - DELETE blocked<br>- No delete UI/API/SQL | ✅ `audit/logs/route.ts` (GET only) | | | |
| 21.4 | Audit Modification Prevention | 1. Attempt modification via API<br>2. Check | - No PUT/PATCH/DELETE on audit API<br>- Modification blocked | ✅ `audit/logs/route.ts` | | | |
| 21.5 | Restricted Audit Access | 1. Non-admin access<br>2. Admin/CSCS access | - Non-admin blocked (403)<br>- Admin/CSCS allowed | ✅ `audit/logs/route.ts:49-54` | | | |
| 21.6 | Audit Integrity Monitoring | 1. Run `checkAuditHealth()`<br>2. Verify | - Health check runs<br>- Anomalies detected/alerted | ✅ `audit-health.ts` | | | |

---

### **Security Domain:** Government Data Classification Enforcement

### **Test Case No.: 22** — Requirement 22: Data Classification Enforcement

**Process/Function Name:** Data Classification Labels & Controls

**Function Description:** Tests that information receives appropriate protection based on sensitivity.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 22.1 | Data Classification Labels | 1. Review records<br>2. Check classification labels | - Labels present (Public/Internal/Restricted/Confidential)<br>- Applied consistently | ❌ Verify classification labels | | | |
| 22.2 | Classification-Based Authorization | 1. Access classified data<br>2. Verify auth | - Authorization based on classification<br>- Higher class = stricter | ❌ Verify classification-based auth | | | |
| 22.3 | Classification-Based Reporting Controls | 1. Generate report<br>2. Check classification controls | - Report classification enforced<br>- Restricted data filtered | ❌ Verify report classification | | | |
| 22.4 | Classification-Based Export Controls | 1. Export data<br>2. Check controls | - Export classification enforced<br>- Restricted blocked/limited | ❌ Verify export classification | | | |
| 22.5 | Classification-Based Audit Controls | 1. Access classified data<br>2. Check audit | - Classification-based audit<br>- Higher class = more logging | ❌ Verify audit classification | | | |

---

### **Security Domain:** Restricted Government Data Protection

### **Test Case No.: 23** — Requirement 23: Restricted Data Protection

**Process/Function Name:** Highly Sensitive Government Data Protection

**Function Description:** Tests protection of highly sensitive government information.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 23.1 | Enhanced Authorization Controls | 1. Access restricted data<br>2. Verify enhanced auth | - Enhanced auth required<br>- Additional checks | ❌ Verify enhanced controls | | | |
| 23.2 | Restricted Data Access Approval | 1. Request restricted data<br>2. Verify approval | - Approval required<br>- Workflow enforced | ❌ Verify approval workflow | | | |
| 23.3 | Enhanced Audit Logging | 1. Access restricted data<br>2. Check audit | - Enhanced logging<br>- More detail captured | ❌ Verify enhanced logging | | | |
| 23.4 | Export Restrictions | 1. Attempt export of restricted<br>2. Check | - Export blocked/limited<br>- Approval required | ❌ Verify export restrictions | | | |
| 23.5 | Administrative Approval Controls | 1. Admin access restricted<br>2. Verify approval | - Approval required<br>- Dual authorization | ❌ Verify admin approval | | | |
| 23.6 | Security Monitoring & Alerting | 1. Access restricted data<br>2. Monitor | - Monitoring active<br>- Alerts generated | ⚠️ Verify monitoring | | | |

---

### **Security Domain:** Accountability & Traceability

### **Test Case No.: 24** — Requirement 24: Accountability & Traceability

**Process/Function Name:** Critical Action Reconstruction

**Function Description:** Tests that all critical actions can be reconstructed during investigations.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 24.1 | User Attribution | 1. Perform action<br>2. Check audit | - User ID recorded<br>- Attribution clear | ✅ `audit-db.ts` | | | |
| 24.2 | Timestamp Recording | 1. Perform action<br>2. Check timestamp | - Accurate timestamp<br>- Tamper-evident | ✅ `audit-db.ts` (created_at) | | | |
| 24.3 | Activity Logging | 1. Perform activities<br>2. Check audit | - All activities logged<br>- Complete trail | ✅ `audit-logger.ts` | | | |
| 24.4 | Transaction Logging | 1. Perform transactions<br>2. Check audit | - Transactions logged<br>- Complete record | ✅ `audit-wrapper.ts` | | | |
| 24.5 | Correlation IDs | 1. Trace transaction<br>2. Check correlation | - Correlation IDs present<br>- End-to-end traceable | ⚠️ Verify correlation IDs | | | |
| 24.6 | End-to-End Audit Trails | 1. Trace action end-to-end<br>2. Verify | - Complete trail<br>- All steps recorded | ✅ `audit-logger.ts`, `audit-wrapper.ts` | | | |

---

### **Security Domain:** Separation of Duties

### **Test Case No.: 25** — Requirement 25: Separation of Duties

**Process/Function Name:** Authority Separation & Dual Authorization

**Function Description:** Tests prevention of excessive concentration of authority.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 25.1 | Role Separation Controls | 1. Check role separation<br>2. Verify | - Roles separated<br>- No conflict | ⚠️ Verify role separation | | | |
| 25.2 | Administrative Segregation | 1. Check admin segregation<br>2. Verify | - Admin duties segregated<br>- No single admin has all powers | ⚠️ Verify admin segregation | | | |
| 25.3 | Approval Separation | 1. Submitter approves own request<br>2. Check | - Self-approval blocked<br>- Different user required | ⚠️ Verify self-approval block | | | |
| 25.4 | Independent Verification Controls | 1. Check verification<br>2. Verify independence | - Independent verification<br>- No self-verification | ⚠️ Verify independent verification | | | |
| 25.5 | Dual Authorization for Critical Actions | 1. Perform critical action<br>2. Check dual auth | - Dual auth required<br>- Two users needed | ❌ Verify dual authorization | | | |

---

### **Security Domain:** Security Monitoring & Detection

### **Test Case No.: 26** — Requirement 26: Security Monitoring & Detection

**Process/Function Name:** Suspicious Activity Detection & Alerting

**Function Description:** Tests detection and response to suspicious activities and attacks.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 26.1 | Failed Login Monitoring | 1. Multiple failed logins<br>2. Check monitoring | - Monitoring active<br>- Alerts generated | ✅ `audit-logger.ts` | | | |
| 26.2 | Privilege Escalation Detection | 1. Attempt escalation<br>2. Check detection | - Detected<br>- Alert generated | ⚠️ Verify escalation detection | | | |
| 26.3 | Authorization Failure Monitoring | 1. Trigger auth failures<br>2. Check monitoring | - Monitored<br>- Alerts generated | ✅ `audit-logger.ts` (security events) | | | |
| 26.4 | IDOR Attempt Detection | 1. Attempt IDOR<br>2. Check detection | - Detected<br>- Alert generated | ⚠️ Verify IDOR detection | | | |
| 26.5 | Administrative Activity Monitoring | 1. Perform admin actions<br>2. Check monitoring | - All admin actions monitored<br>- Alerts for suspicious | ✅ `audit-logger.ts:49-51` | | | |
| 26.6 | Security Alerting | 1. Trigger security event<br>2. Check alerting | - Alert generated<br>- Appropriate team notified | ⚠️ Verify alerting | | | |

---

### **Security Domain:** Export & Data Extraction Control

### **Test Case No.: 27** — Requirement 27: Export & Data Extraction Control

**Process/Function Name:** Government Employee Data Extraction Protection

**Function Description:** Tests prevention of unauthorized extraction of government employee information.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 27.1 | Export Authorization | 1. Unauthorized export<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed | ❌ Verify export routes | | | |
| 27.2 | Export Audit Logging | 1. Export data<br>2. Check audit | - Export logged<br>- User, data, timestamp | ❌ Verify export logging | | | |
| 27.3 | Restricted Data Export Controls | 1. Export restricted data<br>2. Check controls | - Restricted blocked/limited<br>- Approval required | ❌ Verify restricted export | | | |
| 27.4 | Data Minimization on Export | 1. Export data<br>2. Check minimization | - Only necessary data<br>- Minimization practiced | ❌ Verify minimization | | | |
| 27.5 | Export Approval Workflow | 1. Request export<br>2. Verify workflow | - Approval workflow<br>- Required for sensitive | ❌ Verify approval workflow | | | |
| 27.6 | Institution-Based Export Filtering | 1. HRO exports<br>2. Check filter | - Export scoped to institution<br>- No cross-institution | ❌ Verify export filter | | | |

---

### **Security Domain:** Administrative Change Control

### **Test Case No.: 28** — Requirement 28: Administrative Change Control

**Process/Function Name:** System Configuration Change Protection

**Function Description:** Tests protection of system configuration and administrative changes.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 28.1 | Configuration Change Authorization | 1. Unauthorized config change<br>2. Authorized | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ⚠️ Verify config routes | | | |
| 28.2 | Change Approval Workflow | 1. Request config change<br>2. Verify workflow | - Approval workflow<br>- Required for critical | ❌ Verify approval workflow | | | |
| 28.3 | Configuration Audit Logging | 1. Change config<br>2. Check audit | - Change logged<br>- Previous/new values | ⚠️ Verify config logging | | | |
| 28.4 | Change Tracking | 1. Review changes<br>2. Check tracking | - All changes tracked<br>- Complete history | ⚠️ Verify change tracking | | | |
| 28.5 | Configuration Integrity Validation | 1. Modify config<br>2. Check integrity | - Integrity preserved<br>- Tampering detected | ❌ Verify integrity | | | |

---

### **Security Domain:** Synchronization Accountability

### **Test Case No.: 29** — Requirement 29: Synchronization Accountability

**Process/Function Name:** Sync Activity Attribution & Review

**Function Description:** Tests that synchronization activities are attributable and reviewable.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 29.1 | Synchronization Logging | 1. Perform sync<br>2. Check audit | - Sync logged<br>- Source, target, count | ❌ Verify sync logging | | | |
| 29.2 | Synchronization Attribution | 1. Sync event<br>2. Check attribution | - User/system attributed<br>- Clear record | ❌ Verify attribution | | | |
| 29.3 | Synchronization Result Tracking | 1. Sync<br>2. Check result tracking | - Result tracked<br>- Success/failure recorded | ❌ Verify result tracking | | | |
| 29.4 | Failure Logging | 1. Trigger sync failure<br>2. Check log | - Failure logged<br>- Error details | ❌ Verify failure logging | | | |
| 29.5 | Synchronization Audit Trails | 1. Review sync history<br>2. Verify trail | - Complete trail<br>- Reviewable | ❌ Verify audit trail | | | |

---

### **Security Domain:** Government Information Confidentiality

### **Test Case No.: 30** — Requirement 30: Government Information Confidentiality

**Process/Function Name:** Government Information Disclosure Protection

**Function Description:** Tests protection of government information from unauthorized disclosure.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30.1 | Need-to-Know Enforcement | 1. Access data<br>2. Verify need-to-know | - Need-to-know enforced<br>- Excessive access blocked | ⚠️ Verify per endpoint | | | |
| 30.2 | Least Privilege Enforcement | 1. Check user permissions<br>2. Verify least privilege | - Least privilege enforced<br>- No excessive permissions | ⚠️ Verify least privilege | | | |
| 30.3 | Data Access Authorization | 1. Access data<br>2. Verify auth | - Authorization required<br>- Per-data auth | ⚠️ Verify per endpoint | | | |
| 30.4 | Institution Isolation | 1. Cross-institution access<br>2. Check | - Isolation enforced<br>- No cross-institution | ✅ `api-auth.ts` | | | |
| 30.5 | Confidential Data Protection | 1. Access confidential data<br>2. Check protection | - Protected<br>- Only authorized see it | ⚠️ Verify confidential protection | | | |
| 30.6 | Access Monitoring | 1. Access sensitive data<br>2. Check monitoring | - Monitored<br>- Alerts on suspicious | ✅ `audit-logger.ts` | | | |

---

### **Security Domain:** Input Validation & Injection Prevention

### **Test Case No.: 31** — Cross-cutting: Injection Prevention

**Process/Function Name:** Input Validation, Sanitization & Injection Prevention

**Function Description:** Tests input validation and protection against SQL, XSS, command, path traversal, and other injection attacks.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 31.1 | SQL Injection — Login Form | 1. SQL payloads in username: `' OR '1'='1`, `admin'--`<br>2. Submit<br>3. Check errors | - All blocked<br>- No SQL errors<br>- No auth bypass<br>- Parameterized queries<br>- Attempt logged | ✅ Prisma parameterized | | | |
| 31.2 | SQL Injection — Search Fields | 1. SQLMap/manual: `1' UNION SELECT NULL--`, `1' AND 1=1--`<br>2. Employee/institution search | - No injection<br>- Prisma prevents<br>- Generic errors<br>- No DB structure exposed | ✅ Prisma ORM | | | |
| 31.3 | SQL Injection — Numeric Parameters | 1. IDs: `1 OR 1=1`, `1'; DROP TABLE users--`<br>2. Pagination/filter params | - Numeric validation via Zod<br>- Type safety<br>- No SQL execution | ✅ `api-schemas.ts` (Zod) | | | |
| 31.4 | Stored XSS | 1. XSS payloads in profile: `<script>alert('XSS')</script>`, `<img src=x onerror=alert(1)>`<br>2. Save<br>3. View profile | - Sanitized<br>- HTML entities encoded<br>- Scripts don't execute<br>- CSP enforced | ✅ `sanitize-input.ts` (DOMPurify) | | | |
| 31.5 | Reflected XSS | 1. URL params: `?name=<script>alert(1)</script>`<br>2. Check reflection | - URL params sanitized<br>- Reflected content encoded<br>- No script execution<br>- CSP blocks inline | ✅ `sanitize-input.ts` | | | |
| 31.6 | DOM-based XSS | 1. innerHTML injections<br>2. eval() attempts<br>3. React component props | - No innerHTML with user data<br>- React escapes by default<br>- No eval() with user input<br>- DOMPurify when needed | ✅ React escaping, DOMPurify | | | |
| 31.7 | Command Injection | 1. `; ls -la`, `| cat /etc/passwd`, `&& whoami` in file ops<br>2. System calls<br>3. File upload filenames | - No command injection<br>- No shell execution with user input<br>- File ops sanitized | ⚠️ Verify command safety | | | |
| 31.8 | Path Traversal | 1. File access: `../../etc/passwd`, `..\..\windows\system32`<br>2. File download<br>3. Image/document URLs | - Path traversal blocked<br>- Absolute path validation<br>- No access outside allowed dirs<br>- Filename sanitization | ⚠️ Verify path validation | | | |
| 31.9 | XML/XXE Injection | 1. External entity definitions<br>2. Billion laughs attack<br>3. Malicious XML upload | - External entities disabled<br>- DTD processing disabled<br>- File disclosure prevented<br>- DoS prevented | ❌ Verify XML parsing | | | |
| 31.10 | Email Header Injection | 1. `test@test.com\nCC:hacker@evil.com`, `test\r\nBCC:spam@spam.com`<br>2. Contact forms<br>3. Notification emails | - Newlines blocked<br>- Headers validated<br>- No additional recipients<br>- SMTP injection prevented | ⚠️ Verify email library | | | |
| 31.11 | Input Length Validation | 1. 10,000+ char strings<br>2. All text fields<br>3. Buffer overflows<br>4. Performance impact | - Max length enforced<br>- DB constraints respected<br>- No crashes<br>- Validation errors returned | ✅ `api-schemas.ts` (Zod) | | | |
| 31.12 | Special Characters & Unicode | 1. Emoji 😀🎉<br>2. Unicode ` `, `‮`<br>3. Null bytes `\0`<br>4. RTL override | - Handled correctly<br>- UTF-8 enforced<br>- Null bytes rejected<br>- Unicode normalized | ✅ `sanitize-input.ts` | | | |
| 31.13 | Content Type Validation | 1. JSON to form endpoint<br>2. Form data to JSON API<br>3. MIME type confusion | - Content-Type validated<br>- Mismatch rejected<br>- No type confusion | ⚠️ Verify content-type checks | | | |
| 31.14 | Mass Assignment | 1. POST with extra fields: `{ "name":"User", "role":"Admin", "isActive":true }`<br>2. Check unauthorized fields | - Extra fields ignored<br>- Only allowed fields processed<br>- Role/permission protected<br>- Schema validation | ✅ `api-schemas.ts` (Zod whitelist) | | | |

---

### **Security Domain:** Cross-Site Request Forgery (CSRF) Protection

### **Test Case No.: 32** — Cross-cutting: CSRF Protection

**Process/Function Name:** CSRF Protection & Same-Origin Policy

**Function Description:** Tests CSRF protection via double-submit cookie pattern, SameSite cookies, and origin validation.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 32.1 | CSRF Token Generation | 1. Login<br>2. Inspect forms for CSRF tokens<br>3. Check token presence<br>4. Verify randomness | - Token present in all forms<br>- Cryptographically random<br>- Unique per session<br>- In hidden field or header<br>- Rotates periodically | ✅ `csrf-utils.ts:generateCSRFToken()` | | | |
| 32.2 | CSRF Token Validation | 1. Submit without token<br>2. Invalid token<br>3. Expired token<br>4. Another user's token | - 403 without token<br>- Invalid/expired rejected<br>- Bound to user session<br>- Error doesn't leak info | ✅ `csrf-utils.ts:validateCSRFTokens()` | | | |
| 32.3 | CSRF Attack — State-Changing GET | 1. `<img src="/api/users/delete?id=1">`<br>2. Send to authenticated user<br>3. Check execution | - GET doesn't modify state<br>- Only POST/PUT/DELETE change state<br>- Action not executed via GET | ✅ `csrf-utils.ts:requiresCSRFProtection()` | | | |
| 32.4 | CSRF Attack — Malicious Form | 1. External page with form posting to CSMS<br>2. Auto-submit on load<br>3. Test | - Blocked (missing CSRF token)<br>- Origin header validated<br>- SameSite cookie prevents inclusion | ✅ `api-csrf-middleware.ts` | | | |
| 32.5 | SameSite Cookie Attribute | 1. Login<br>2. Inspect cookies<br>3. Check SameSite<br>4. Cross-site request | - `SameSite=Lax` or `Strict`<br>- Not sent on cross-site POST<br>- Fallback tokens present | ✅ `csrf-utils.ts` | | | |
| 32.6 | Origin Header Validation | 1. POST with different Origin<br>2. Origin = attacker domain<br>3. Omit Origin | - Origin validated<br>- Cross-origin rejected<br>- Only allowed origins<br>- No origin = reject | ✅ `api-csrf-middleware.ts` | | | |
| 32.7 | Double-Submit Cookie Pattern | 1. Check cookie/header match<br>2. Modify cookie value<br>3. Send mismatched | - Token in cookie and request<br>- Values must match<br>- Mismatch rejected<br>- Logged | ✅ `csrf-utils.ts:validateCSRFTokens()`, `logCSRFViolation()` | | | |
| 32.8 | Custom Header Requirement | 1. API call without x-csrf-token header<br>2. Check | - Header required<br>- Missing = rejected<br>- Preflight triggered | ✅ `csrf-utils.ts:CSRF_HEADER_NAME` | | | |
| 32.9 | CSRF on Critical Operations | 1. Password change<br>2. Email change<br>3. Role modification<br>4. User deletion via CSRF | - All critical ops protected<br>- CSRF tokens required<br>- Re-auth for sensitive | ✅ `api-csrf-middleware.ts` | | | |
| 32.10 | JSON-based CSRF | 1. JSON payload CSRF<br>2. `Content-Type: application/json`<br>3. Preflight test | - Preflight triggered<br>- CORS restricts<br>- Token still validated | ⚠️ Verify JSON CSRF | | | |
| 32.11 | Login CSRF | 1. External form posting to login<br>2. Pre-fill attacker creds<br>3. Trick user | - Login endpoint CSRF-protected<br>- Token on login form<br>- User not logged in as attacker | ⚠️ Verify login CSRF | | | |
| 32.12 | CSRF Audit Logging | 1. Trigger CSRF violation<br>2. Check audit | - `logCSRFViolation()` called<br>- Event recorded | ✅ `csrf-utils.ts:logCSRFViolation()` | | | |

---

### **Security Domain:** Password Security & Cryptography

### **Test Case No.: 33** — Cross-cutting: Password & Cryptography

**Process/Function Name:** Password Policies, Hashing & Cryptographic Security

**Function Description:** Tests password security including policies, hashing, reset, and protection against password attacks.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 33.1 | Password Complexity Requirements | 1. Change password<br>2. Try weak: "password", "12345678", "qwerty"<br>3. Try strong | - Weak rejected<br>- Min 8 chars<br>- Upper + lower + numbers<br>- Special chars recommended<br>- Clear errors | ⚠️ Verify password policy | | | |
| 33.2 | Password Hashing Verification | 1. Create user<br>2. Check DB<br>3. Verify algorithm<br>4. Test strength | - Not plaintext<br>- bcrypt/Argon2id<br>- Salt generated<br>- Cost factor ≥ 10<br>- Non-reversible | ⚠️ Verify hashing (Argon2id specified) | | | |
| 33.3 | Password Hash Uniqueness | 1. Multiple users with same password<br>2. Compare hashes<br>3. Verify salt | - Each hash unique<br>- Per-password salt<br>- Different hashes for same password<br>- Rainbow table prevented | ⚠️ Verify hash uniqueness | | | |
| 33.4 | Password Change Security | 1. Login<br>2. Change password<br>3. Enter current + new<br>4. Submit | - Current password required<br>- New validated against policy<br>- Cannot reuse last N<br>- Updated in DB<br>- User notified<br>- `PASSWORD_CHANGED` logged | ✅ `audit-logger.ts:57` | | | |
| 33.5 | Password Reset — Email Verification | 1. Request reset<br>2. Receive email<br>3. Check token<br>4. Verify properties | - Reset email sent to verified address<br>- Token cryptographically random<br>- Single-use<br>- Expires 15-60 min<br>- Not predictable | ⚠️ Verify reset flow | | | |
| 33.6 | Password Reset — Token Security | 1. Obtain token<br>2. Use to reset<br>3. Reuse token<br>4. Expired token | - Valid token resets<br>- Invalidated after use<br>- Expired rejected<br>- Bound to user<br>- Cannot reset others | ⚠️ Verify token security | | | |
| 33.7 | Password Reset Rate Limiting | 1. Request reset<br>2. Repeat 5+ times rapidly<br>3. Monitor | - Rate limited<br>- Max N per period<br>- Email flood prevented<br>- User notified<br>- Account not locked | ✅ `rate-limiter.ts:16` (auth tier) | | | |
| 33.8 | Common Password Dictionary | 1. Try common: "Password123", "Qwerty123", "Welcome1"<br>2. Check rejection | - Common passwords blocked<br>- Dictionary check<br>- HIBP API used (optional)<br>- Suggestions provided | ❌ Verify dictionary check | | | |
| 33.9 | Password Enumeration Prevention | 1. Reset for existing user<br>2. Reset for non-existing email<br>3. Compare responses<br>4. Check timing | - Same response for both<br>- Generic message<br>- No enumeration<br>- Timing attacks mitigated | ⚠️ Verify enumeration prevention | | | |
| 33.10 | Credential Stuffing Protection | 1. Automated password guessing<br>2. Leaked credential lists<br>3. Verify blocking | - Detected<br>- Rate limited<br>- Lockout triggered<br>- Security alerted | ✅ `rate-limiter.ts` | | | |
| 33.11 | Password in Transit Security | 1. Submit password over network<br>2. Capture traffic<br>3. Verify encryption<br>4. HTTPS enforcement | - HTTPS enforced<br>- TLS 1.2+<br>- Strong ciphers<br>- No password in URL | ⚠️ Infrastructure-dependent | | | |
| 33.12 | Password Storage Audit | 1. Review DB schema<br>2. Check password field<br>3. Verify no plaintext<br>4. Access controls | - Non-readable format<br>- DB encrypted at rest<br>- Access controls on table<br>- No passwords in logs | ✅ `sanitize-response.ts` | | | |
| 33.13 | Audit: Password Changed | 1. Change password<br>2. Check audit | - `PASSWORD_CHANGED` event in audit log | ✅ `audit-logger.ts:57` | | | |
| 33.14 | Audit: Admin Password Reset / Account Locked | 1. Admin resets password<br>2. Trigger lockout<br>3. Check audit | - `ADMIN_PASSWORD_RESET` event<br>- `ACCOUNT_LOCKED` event | ✅ `audit-logger.ts:55, 58` | | | |

---

### **Security Domain:** API Security Testing

### **Test Case No.: 34** — Cross-cutting: API Security & Rate Limiting

**Process/Function Name:** API Security, Rate Limiting & Abuse Prevention

**Function Description:** Tests API security including auth, authorization, rate limiting, and abuse prevention.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 34.1 | API Authentication Enforcement | 1. List endpoints<br>2. Call without auth<br>3. Call with invalid token<br>4. Monitor | - All protected endpoints require auth<br>- 401 Unauthorized<br>- No data leakage<br>- Public endpoints defined | ✅ `api-auth.ts:86-161` | | | |
| 34.2 | API Authorization Testing | 1. Regular user calls admin endpoints<br>2. Other users' endpoints<br>3. Verify access control | - Admin APIs reject regular users (403)<br>- Cannot access others' data<br>- RBAC enforced<br>- Ownership validated | ✅ `api-auth.ts:205-210` | | | |
| 34.3 | API Rate Limiting — Read | 1. 100+ read requests in 60s<br>2. Check headers<br>3. Verify reset | - Rate limited<br>- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`<br>- 429 returned<br>- Resets correctly | ✅ `rate-limiter.ts:18` (read: 100/min) | | | |
| 34.4 | API Rate Limiting — Auth | 1. 5+ login attempts in 60s<br>2. Same IP<br>3. Different usernames<br>4. Monitor | - Login rate limited (5/min)<br>- Stricter than other endpoints<br>- IP + username limits<br>- Brute force prevented | ✅ `rate-limiter.ts:16` (auth: 5/min) | | | |
| 34.5 | API Rate Limiting — Write | 1. 30+ write requests in 60s<br>2. Monitor | - 429 after threshold (30/min) | ✅ `rate-limiter.ts:17` (write: 30/min) | | | |
| 34.6 | API Rate Limiting — Upload | 1. 10+ uploads in 60s<br>2. Monitor | - 429 after threshold (10/min) | ✅ `rate-limiter.ts:19` (upload: 10/min) | | | |
| 34.7 | API Enumeration Prevention | 1. Iterate user IDs: `/api/users/1, /2...`<br>2. Sequential access<br>3. Check response differences | - Enumeration prevented<br>- Same response for missing/unauthorized<br>- UUIDs used<br>- No info leakage<br>- Timing mitigated | ⚠️ Verify UUID usage | | | |
| 34.8 | API Mass Assignment | 1. POST with extra fields: `{ "name":"User", "role":"Admin", "isActive":true }`<br>2. Check unauthorized fields | - Extra fields ignored<br>- Only allowed processed<br>- Role/permission protected<br>- Schema validation | ✅ `api-schemas.ts` (Zod) | | | |
| 34.9 | API Parameter Tampering | 1. Modify URL params<br>2. Change body values<br>3. Inject additional params<br>4. Test validation | - All validated<br>- Type checking<br>- Range validation<br>- Unexpected rejected | ✅ `api-schemas.ts` (Zod) | | | |
| 34.10 | API Response Data Leakage | 1. Call endpoints<br>2. Inspect responses<br>3. Check excessive data<br>4. Verify filtering | - Only necessary fields<br>- No password hashes<br>- No internal IDs<br>- PII masked<br>- Filtering implemented | ✅ `sanitize-response.ts` (24 fields) | | | |
| 34.11 | API Error Message Information Disclosure | 1. Trigger various API errors<br>2. Check error responses<br>3. Verify no sensitive data<br>4. Test stack traces | - Generic messages<br>- No stack traces in production<br>- No DB structure revealed<br>- No file paths<br>- Standardized codes | ✅ `error-handler.ts:86-94` | | | |
| 34.12 | API HTTP Method Security | 1. Wrong methods<br>2. POST to GET endpoint<br>3. DELETE on read-only | - Only allowed methods<br>- 405 Method Not Allowed<br>- GET read-only<br>- State changes only on POST/PUT/DELETE | ✅ `audit/logs/route.ts` (only GET) | | | |
| 34.13 | API Batch/Pagination Limits | 1. Batch/bulk requests<br>2. 1000+ records<br>3. Pagination limits | - Batch size limited<br>- Max page size enforced<br>- Pagination required<br>- No DoS via large requests | ✅ `audit-db.ts:264` (default limit 100) | | | |
| 34.14 | API Token Security | 1. Capture API tokens<br>2. Analyze structure<br>3. Check lifetime<br>4. Test revocation | - Cryptographically secure<br>- Short-lived access<br>- Refresh rotation<br>- Revocation works<br>- Bound to user/session | ⚠️ Verify token security | | | |

---

### **Security Domain:** Error Handling & Information Disclosure

### **Test Case No.: 35** — Cross-cutting: Error Handling

**Process/Function Name:** Error Handling & Information Disclosure Prevention

**Function Description:** Tests that error handling doesn't leak sensitive information.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 35.1 | Generic Error Messages | 1. Trigger various errors<br>2. Check messages<br>3. Verify consistency | - Generic messages<br>- No technical details<br>- Consistent format | ✅ `error-handler.ts:86-94` | | | |
| 35.2 | Stack Trace Suppression | 1. Cause exception<br>2. Check response<br>3. Verify production vs dev | - No stack traces in production<br>- Only in dev mode<br>- Errors logged server-side | ✅ `error-handler.ts:51` (isProduction) | | | |
| 35.3 | Database Error Handling | 1. Trigger constraint violation<br>2. Check response<br>3. Verify no SQL exposure | - DB errors not exposed<br>- No SQL in messages<br>- No table/column names | ✅ `error-handler.ts:68-81` | | | |
| 35.4 | File Path Disclosure | 1. Trigger file errors<br>2. Check for paths<br>3. Verify no FS structure | - No FS paths in errors<br>- No directory structure | ✅ `error-handler.ts` | | | |
| 35.5 | API Error Responses | 1. Call API with invalid data<br>2. Check format | - Consistent: `{ success, message, errorCode }`<br>- No internals | ✅ `error-handler.ts:86-93` | | | |
| 35.6 | Validation Error Messages | 1. Invalid form data<br>2. Check messages | - Field-level Zod errors<br>- User can correct<br>- No internals | ✅ `error-handler.ts:68-80` (ZodError) | | | |
| 35.7 | Auth Error Messages | 1. Failed login<br>2. Invalid token<br>3. Session expired | - Generic "Invalid credentials"<br>- Don't reveal which field wrong | ✅ `api-auth.ts:46-53` | | | |
| 35.8 | Sensitive Data in Logs | 1. Review logs for PII<br>2. Search for passwords, ZAN IDs, tokens | - No PII in logs<br>- Sanitized<br>- Access controlled | ✅ `sanitize-response.ts` | | | |
| 35.9 | Client-side Error Handling | 1. Trigger JS errors<br>2. Check UI | - React error boundaries<br>- Graceful degradation<br>- No app crash | ⚠️ Verify error boundaries | | | |
| 35.10 | Third-party API Errors | 1. Simulate HRIMS/MinIO failure<br>2. Check handling | - Graceful handling<br>- No third-party details exposed<br>- User informed of service issue | ⚠️ Verify third-party error handling | | | |

---

### **Security Domain:** Security Headers & Configurations

### **Test Case No.: 36** — Cross-cutting: Security Headers

**Process/Function Name:** HTTP Security Headers & Server Configuration

**Function Description:** Tests implementation of security-related HTTP headers.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 36.1 | Content-Security-Policy (CSP) | 1. Load application<br>2. Check response headers<br>3. Verify CSP<br>4. Test inline scripts | - CSP header present<br>- Restrictive policy<br>- Inline scripts blocked<br>- Only whitelisted sources<br>- `default-src 'self'` or stricter | ⚠️ Verify `next.config.ts`/middleware | | | |
| 36.2 | X-Frame-Options | 1. Embed app in iframe<br>2. Check header<br>3. Verify frame blocking | - `DENY` or `SAMEORIGIN`<br>- Cannot be framed<br>- Clickjacking prevented<br>- CSP `frame-ancestors` also set | ⚠️ Verify headers | | | |
| 36.3 | X-Content-Type-Options | 1. Serve wrong MIME<br>2. Check header<br>3. Test sniffing | - `nosniff` present<br>- Browser doesn't sniff<br>- Content-Type respected<br>- XSS via sniffing prevented | ⚠️ Verify headers | | | |
| 36.4 | Strict-Transport-Security (HSTS) | 1. Access via HTTPS<br>2. Check HSTS<br>3. Verify max-age<br>4. includeSubDomains | - HSTS present<br>- `max-age` ≥ 31536000<br>- `includeSubDomains`<br>- `preload` optional | ⚠️ Infrastructure-dependent | | | |
| 36.5 | Referrer-Policy | 1. Navigate between pages<br>2. Check Referer<br>3. Verify policy | - Referrer-Policy present<br>- Restrictive (`no-referrer`, `strict-origin-when-cross-origin`)<br>- Sensitive URLs not leaked | ⚠️ Verify headers | | | |
| 36.6 | Permissions-Policy | 1. Check header<br>2. Verify features | - Unnecessary features disabled<br>- Camera, mic, geolocation restricted | ❌ Verify Permissions-Policy | | | |
| 36.7 | Cache-Control | 1. Check sensitive page headers<br>2. Verify caching | - `no-store, no-cache` on sensitive pages<br>- Authenticated content not cached | ⚠️ Verify cache headers | | | |
| 36.8 | Server Information | 1. Check Server, X-Powered-By headers<br>2. Verify hidden | - Removed or generic<br>- Version numbers hidden | ⚠️ Verify headers | | | |
| 36.9 | Cookie Security Flags | 1. Login<br>2. Inspect cookies<br>3. Check flags | - Secure flag<br>- HttpOnly flag<br>- SameSite flag | ⚠️ Verify cookie flags | | | |
| 36.10 | CORS Configuration | 1. Cross-origin requests<br>2. Check CORS<br>3. Verify origins | - Specific origins whitelisted<br>- NOT `Access-Control-Allow-Origin: *`<br>- Credentials flag proper | ⚠️ Verify CORS | | | |
| 36.11 | Security Headers Audit | 1. Run securityheaders.com scan<br>2. Verify all headers | - All required headers present<br>- Score A or better | ⚠️ Integration test | | | |
| 36.12 | Cookie Scope | 1. Check cookie Path/Domain<br>2. Verify scope | - Correctly scoped<br>- Not overly broad | ⚠️ Verify cookie scope | | | |

---

### **Security Domain:** Network Security

### **Test Case No.: 37** — Cross-cutting: Network Security

**Process/Function Name:** Network-Level Security Controls

**Function Description:** Tests network-level security controls (infrastructure-dependent).

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 37.1 | Open Port Scanning | 1. Nmap scan<br>2. Check open ports | - Only 443, 80, 22 open<br>- Other ports filtered | ❌ Infrastructure | | | |
| 37.2 | Firewall Configuration | 1. Test firewall rules<br>2. Verify | - Default deny<br>- Specific allow rules | ❌ Infrastructure | | | |
| 37.3 | Database Network Security | 1. Direct DB connection from internet<br>2. Verify | - Not exposed<br>- Only app server connects<br>- SSL required | ❌ Infrastructure | | | |
| 37.4 | MinIO Network Security | 1. Direct MinIO access<br>2. Verify | - Not publicly accessible<br>- Presigned URLs only | ❌ Infrastructure | | | |
| 37.5 | DDoS Protection | 1. High traffic simulation<br>2. Verify protection | - Rate limiting<br>- CDN/WAF<br>- Service available | ✅ `rate-limiter.ts` | | | |
| 37.6 | SSH Security | 1. SSH connection attempt<br>2. Verify | - Key-based only<br>- Root login disabled<br>- Fail2ban | ❌ Infrastructure | | | |
| 37.7 | Service Banner Grabbing | 1. Banner grab on ports<br>2. Verify | - Versions hidden<br>- Generic responses | ❌ Infrastructure | | | |
| 37.8 | Network Segmentation | 1. Map network architecture<br>2. Verify | - DMZ, VLANs, segmentation | ❌ Infrastructure | | | |
| 37.9 | TLS Configuration | 1. SSL Labs test<br>2. Verify | - TLS 1.2 minimum<br>- Strong ciphers<br>- No SSLv3/TLS 1.0/1.1 | ❌ Infrastructure | | | |

---

### **Security Domain:** Penetration Testing

### **Test Case No.: 38** — Cross-cutting: Penetration Testing

**Process/Function Name:** External Penetration Testing

**Function Description:** Tests requiring external security tools (OWASP ZAP, Burp Suite, SQLMap, etc.).

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Impl. Status** | **Actual Results** | **PASS/FAIL** | **Remarks** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 38.1 | OWASP ZAP Automated Scan | 1. Run ZAP spider + active scan<br>2. Document findings | - No critical vulns<br>- Findings documented | ❌ Tool-based | | | |
| 38.2 | Burp Suite Testing | 1. Proxy through Burp<br>2. Manual exploitation | - No auth bypass<br>- Auth properly enforced | ❌ Tool-based | | | |
| 38.3 | SQL Injection (SQLMap) | 1. SQLMap against all inputs<br>2. Verify | - No injection<br>- Prisma protection | ✅ Prisma ORM | | | |
| 38.4 | Auth Bypass Attempts | 1. Password reset exploit<br>2. Token manipulation | - All bypass attempts fail | ✅ `api-auth.ts` | | | |
| 38.5 | Privilege Escalation | 1. Vertical + horizontal escalation<br>2. Verify | - Role changes blocked<br>- Server-side enforcement | ✅ `api-auth.ts:133-143, 205-210` | | | |
| 38.6 | Business Logic Testing | 1. Workflow bypasses<br>2. Race conditions | - State transitions validated<br>- Integrity checks | ⚠️ Verify business logic | | | |
| 38.7 | API Penetration Test | 1. All endpoints + rate limit bypass<br>2. Verify | - All secured<br>- Rate limiting effective | ✅ `rate-limiter.ts` | | | |
| 38.8 | File Upload Exploitation | 1. Malicious files<br>2. Polyglot<br>3. Path traversal | - Blocked<br>- No RCE | ⚠️ Verify file upload security | | | |
| 38.9 | Session Hijacking | 1. Token prediction<br>2. Fixation<br>3. XSS token theft | - Tokens unpredictable<br>- Fixation prevented<br>- XSS prevented | ⚠️ Verify session security | | | |
| 38.10 | Sensitive Data Exposure | 1. Search for exposed credentials<br>2. Info leakage | - No credentials exposed<br>- Sensitive data encrypted | ✅ `sanitize-response.ts` | | | |
| 38.11 | Security Misconfiguration | 1. Default creds<br>2. Debug endpoints<br>3. Security headers | - No default creds<br>- Debug disabled<br>- All headers present | ✅ `error-handler.ts:51` (NODE_ENV) | | | |
| 38.12 | DoS Testing | 1. Resource exhaustion<br>2. ReDoS<br>3. XML bomb | - Rate limiting<br>- Resource limits | ✅ `rate-limiter.ts` | | | |
| 38.13 | Vulnerability Scanning | 1. Nessus/OpenVAS scan<br>2. Verify | - No critical vulns<br>- Remediation plan | ❌ Tool-based | | | |
| 38.14 | Security Headers Scan | 1. securityheaders.com<br>2. Verify | - All critical headers present | ❌ Tool-based | | | |

---

## 4. Audit Trail Deep-Dive

### 4.1 Audit Event Types Implemented (per `transforms_security_requirements.md`)

| Category | Events | Impl. Status |
| --- | --- | --- |
| **Authentication** | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_EXPIRED`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED` | ✅ |
| **Password** | `PASSWORD_CHANGED`, `ADMIN_PASSWORD_RESET` | ✅ |
| **Workflow** | `REQUEST_SUBMITTED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_UPDATED`, `REQUEST_WITHDRAWN` | ✅ |
| **Employee** | `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_DELETED` | ✅ |
| **User Management** | `USER_CREATED`, `USER_UPDATED`, `USER_DELETED` | ✅ |
| **Complaints** | `COMPLAINT_SUBMITTED`, `COMPLAINT_UPDATED`, `COMPLAINT_RESOLVED` | ✅ |
| **File Operations** | `FILE_UPLOADED`, `FILE_DELETED`, `FILE_DOWNLOADED`, `FILE_PREVIEWED` | ✅ |
| **Institutions** | `INSTITUTION_CREATED`, `INSTITUTION_UPDATED` | ✅ |
| **Access Control** | `UNAUTHORIZED_ACCESS`, `ACCESS_DENIED`, `FORBIDDEN_ROUTE` | ✅ |
| **Authorization** | `ROLE_VIOLATION`, `PERMISSION_DENIED` | ✅ |
| **Suspicious Activity** | `MULTIPLE_FAILED_ATTEMPTS`, `SUSPICIOUS_REQUEST`, `POTENTIAL_BREACH` | ✅ |
| **Forwarding/Cancellation** | (Workflow forwarding, cancellation events) | ⚠️ Verify |
| **Manual Entry Window changes** | (Manual entry window change event) | ⚠️ Verify |
| **HRIMS Configuration changes** | (HRIMS config change event) | ❌ Not implemented |
| **Role/Institution Assignment** | (Role/institution assignment events) | ⚠️ Verify |
| **Complaint Review** | (Complaint review event — distinct from update) | ⚠️ Verify |
| **Complaint Closure** | `COMPLAINT_RESOLVED` (closure) | ✅ (via resolved) |

### 4.2 Audit Record Fields (per spec)

Every audit record must contain per `transforms_security_requirements.md`:

| Field | Required For | Impl. Status |
| --- | --- | --- |
| User ID | All events | ✅ `audit-db.ts` |
| Username | All events | ✅ `audit-db.ts` |
| Event Type / Action | All events | ✅ `audit-db.ts` |
| Timestamp | All events | ✅ `audit-db.ts` (created_at) |
| Source IP Address | All events | ✅ `audit-db.ts` (ip_address) |
| Workflow ID | Workflow events | ⚠️ Verify (in additional_data) |
| Previous Status | Workflow events | ⚠️ Verify (in additional_data) |
| New Status | Workflow events | ⚠️ Verify (in additional_data) |
| Administrator User ID | Admin events | ✅ (user_id) |
| Action Type | Admin events | ✅ (action) |
| Previous Value | Admin/change events | ⚠️ Verify (in additional_data) |
| New Value | Admin/change events | ⚠️ Verify (in additional_data) |
| Complaint ID | Complaint events | ⚠️ Verify (entity_id) |
| User ID (complaint actor) | Complaint events | ✅ (user_id) |
| Action (complaint) | Complaint events | ✅ (action) |

### 4.3 Immutability Verification

| Layer | Check | Status |
| --- | --- | --- |
| **API** | `/api/audit/logs` exports only `GET` — no POST/PUT/PATCH/DELETE | ✅ `audit/logs/route.ts` |
| **UI** | Audit trail page has no edit/delete buttons, no context menus, no bulk actions | ✅ `page.tsx` |
| **Database** | `writeAuditLog()` performs INSERT only — no UPDATE/DELETE SQL | ✅ `audit-db.ts:138` |
| **Codebase** | `grep -r "UPDATE audit.audit_log"` returns no results | ✅ |

### 4.4 Access Control

| Layer | Enforcement | Status |
| --- | --- | --- |
| **Page (client-side)** | `<RouteGuard>` wraps page — Admin role only | ✅ `route-permissions-config.ts:20` |
| **API (server-side)** | Role check: Admin or CSCS only — 403 otherwise | ✅ `audit/logs/route.ts:49-54` |
| **API (server-side)** | Cookie parse failure → 401 | ✅ `audit/logs/route.ts:40-43` |
| **Export** | CSV export uses same API, inherits access control | ✅ `page.tsx:239-308` |

### 4.5 Audit Trail UI Features to Verify Manually

| Feature | Expected Behavior | Impl. Status |
| --- | --- | --- |
| Route guard | Only Admin can access `/dashboard/admin/audit-trail` | ✅ |
| Stats dashboard | 5 cards: Total Events, Blocked Attempts, Critical Events, Success Rate, By Category | ✅ |
| Filters | Search (username/IP), Category, Event Type, Date range | ✅ |
| Pagination | 50 logs/page, page navigation | ✅ |
| CSV Export | Downloads `audit-trail-{date}.csv` with all visible columns | ✅ |
| Severity badges | CRITICAL/ERROR=destructive, WARNING=secondary, INFO=default | ✅ |
| Status badges | Success (green), Rejected (red), Blocked (red), Allowed (blue) | ✅ |
| Rich details | Request type, employee name/ZAN ID, review stage, rejection reason | ✅ |
| Device info | Browser/OS tooltip, IP in monospace | ✅ |
| Empty state | "No audit logs found" message | ✅ |
| Loading state | Skeleton placeholder | ✅ |
| Edit/delete UI | NONE — read-only | ✅ |

---

## 5. Traceability Matrix — 30 Requirements

| Req # | Requirement | Test Cases | Impl. Coverage |
| --- | --- | --- | --- |
| 1 | Authentication & Identity Assurance | TC 1.1–1.17 | ✅ Mostly implemented; MFA ✅, password history/expiry ❌, re-auth ❌ |
| 2 | Session Security | TC 2.1–2.14 | ✅ Mostly; absolute lifetime ❌, invalidation on pwd change ❌ |
| 3 | Authorization & Least Privilege | TC 3.1–3.10 | ✅ Implemented |
| 4 | Institution Data Isolation | TC 4.1–4.8 | ⚠️ Partial; report/sync filtering ❌ |
| 5 | Employee Profile Protection | TC 5.1–5.7 | ⚠️ Partial; sensitive field masking ✅ |
| 6 | Employee Creation Integrity | TC 6.1–6.8 | ⚠️ Partial; audit ✅, dedup ❌ |
| 7 | Bulk Upload Security | TC 7.1–7.9 | ⚠️ Partial; audit ✅, validation gaps |
| 8 | Workflow Security & Approval Integrity | TC 8.1–8.9 | ⚠️ Partial; audit ✅, transition/chain verification needed |
| 9 | Complaint Management Security | TC 9.1–9.7 | ✅ Mostly; ownership ✅, audit ✅ |
| 10 | File & Document Security | TC 10.1–10.14 | ⚠️ Partial; audit ✅, malware scanning ❌, integrity ❌ |
| 11 | HRIMS Integration Security | TC 11.1–11.8 | ❌ Not implemented |
| 12 | Reporting & Export Security | TC 12.1–12.8 | ❌ Not implemented |
| 13 | Notification Security | TC 13.1–13.6 | ⚠️ Partial |
| 14 | Administrative Security | TC 14.1–14.8 | ✅ Mostly; RBAC ✅, audit ✅, SoD ⚠️ |
| 15 | Audit Trail & Accountability | TC 15.1–15.30 | ✅ Mostly; forwarding/cancel/HRIMS config ⚠️/❌ |
| 16 | Background Processing Security | TC 16.1–16.7 | ⚠️ Partial |
| 17 | IDOR Protection | TC 17.1–17.6 | ✅ Mostly |
| 18 | Workflow State Integrity | TC 18.1–18.6 | ⚠️ Partial |
| 19 | Non-Repudiation | TC 19.1–19.6 | ✅ Mostly |
| 20 | Data Integrity Protection | TC 20.1–20.6 | ✅ Input validation ✅; sync/integrity ⚠️/❌ |
| 21 | Audit Log Protection | TC 21.1–21.6 | ✅ Implemented (INSERT-only, GET-only API) |
| 22 | Government Data Classification | TC 22.1–22.5 | ❌ Not implemented |
| 23 | Restricted Government Data Protection | TC 23.1–23.6 | ❌ Not implemented |
| 24 | Accountability & Traceability | TC 24.1–24.6 | ✅ Mostly; correlation IDs ⚠️ |
| 25 | Separation of Duties | TC 25.1–25.5 | ⚠️ Partial; dual auth ❌ |
| 26 | Security Monitoring & Detection | TC 26.1–26.6 | ✅ Mostly |
| 27 | Export & Data Extraction Control | TC 27.1–27.6 | ❌ Not implemented |
| 28 | Administrative Change Control | TC 28.1–28.5 | ⚠️ Partial |
| 29 | Synchronization Accountability | TC 29.1–29.5 | ❌ Not implemented |
| 30 | Government Information Confidentiality | TC 30.1–30.6 | ⚠️ Partial |

---

## 6. Implementation Status Summary

### 6.1 Implemented (✅)

- Authentication: login, failed login handling, lockout, MFA, brute-force protection, rate limiting, password change/reset audit
- Authorization: RBAC, route guards, deny-by-default, per-request validation, IDOR prevention
- Audit Trail: 30+ event types, INSERT-only storage, GET-only API, Admin/CSCS access control, CSV export, rich UI with filters/pagination
- Audit Log Protection: immutability (API/UI/DB layers), append-only storage, restricted access, integrity health checks
- Input Validation: Zod schemas, DOMPurify sanitization, response sanitization (24 sensitive fields)
- CSRF Protection: double-submit cookie, token generation/validation, origin validation, audit logging
- Rate Limiting: 5 tiers (auth/write/read/upload/download)
- Error Handling: standardized errors, production-safe (no stack traces), Zod validation errors

### 6.2 Partially Implemented (⚠️)

- Session Security: signing scheme, session fixation rotation, concurrent session policy, cookie flags, re-auth for sensitive ops
- Institution Isolation: report/sync filtering
- Employee Profile Protection: per-route object-level authorization
- Employee Creation: duplicate detection, business rule validation
- Bulk Upload: file type/size validation, error handling, transaction integrity
- Workflow: state machine, transition validation, chain enforcement
- File Security: malware scanning, integrity validation, path traversal
- Complaint: authorization checks for resolution
- Notification: content minimization, audit logging
- Administrative: role/institution assignment authorization, SoD enforcement
- Background Processing: job authorization, ownership, retry, dedup
- Security Monitoring: escalation detection, IDOR detection, alerting
- Non-Repudiation: decision logging, change tracking
- Data Integrity: business rules, consistency checks
- Accountability: correlation IDs
- Separation of Duties: self-approval block, dual authorization
- Network: DDoS via rate limiter (rest infrastructure-dependent)
- Password: hashing algorithm verification, reset flow, enumeration prevention

### 6.3 Not Implemented (❌)

- HRIMS Integration Security (Req 11) — entire domain
- Reporting & Export Security (Req 12) — entire domain
- Export & Data Extraction Control (Req 27) — entire domain
- Synchronization Accountability (Req 29) — entire domain
- Government Data Classification Enforcement (Req 22) — entire domain
- Restricted Government Data Protection (Req 23) — entire domain
- Password History, Password Expiry, Reauthentication for high-risk actions
- Absolute Session Lifetime, Session Invalidation on Password Change
- Default password security (employee JIT)
- Duplicate detection (employee creation, bulk upload)
- Malware scanning (ClamAV)
- File integrity validation
- XML/XXE protection
- Common password dictionary check
- Dual authorization for critical actions
- Configuration integrity validation
- HRIMS configuration change audit logging
- Workflow forwarding/cancellation audit events (verify)
- Manual entry window change audit (verify)
- Role/institution assignment audit (verify)
- Infrastructure: firewall, DB/MinIO network isolation, SSH hardening, TLS, segmentation, banner grabbing, DNS security, IDS/IPS

---

## 7. Vulnerability Tracking

| Vuln ID | Test Case | Severity | CVSS | Description | Steps to Reproduce | Impact | Remediation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |

*To be filled during test execution.*

---

## 8. Execution Schedule

| Phase | Test Cases | Start Date | End Date | Responsible |
| --- | --- | --- | --- | --- |
| Phase 1 | TC 1 (Auth), TC 2 (Session) | | | |
| Phase 2 | TC 3 (RBAC), TC 4 (Institution) | | | |
| Phase 3 | TC 5–7 (Employee, Bulk Upload) | | | |
| Phase 4 | TC 8–9 (Workflow, Complaint) | | | |
| Phase 5 | TC 10 (File), TC 11 (HRIMS) | | | |
| Phase 6 | TC 12–13 (Reporting, Notification) | | | |
| Phase 7 | TC 14 (Admin), TC 15 (Audit) | | | |
| Phase 8 | TC 16–21 (Background, IDOR, Workflow, Non-Rep, Integrity, Audit Protection) | | | |
| Phase 9 | TC 22–26 (Classification, Restricted, Accountability, SoD, Monitoring) | | | |
| Phase 10 | TC 27–30 (Export, Change Control, Sync, Confidentiality) | | | |
| Phase 11 | TC 31–38 (Injection, CSRF, Password, API, Error, Headers, Network, Pentest) | | | |
| Remediation | All failed tests | | | |
| Re-testing | Corrected items | | | |
| Sign-off | — | | | |

---

## 9. Sign-Off

I hereby certify that Security UAT for the Civil Service Management System (CSMS) has been completed:

- ☐ All critical vulnerabilities resolved
- ☐ All high-severity vulnerabilities resolved or risk-accepted
- ☐ Medium vulnerabilities documented with remediation plan
- ☐ No unmitigated critical or high vulnerabilities
- ☐ Audit trail is immutable, append-only, and access-controlled
- ☐ Audit trail UI at `/dashboard/admin/audit-trail` is verified: read-only, Admin-only, with search/export/filter
- ☐ All 30 security requirements verified (implemented, partial, or documented gap)
- ☐ System is ready for production deployment from a security perspective

| Role | Name | Signature | Date |
| --- | --- | --- | --- |
| **Security Officer** | | | |
| **Test Lead** | | | |
| **Application Developer** | | | |
| **Project Manager** | | | |
| **Business Owner** | | | |

---

**End of UAT_Security_review.md**

*Based on: `Security_requirements_and_Controls.md` (30 requirements), `transforms_security_requirements.md` (Req 15 audit detail), `sample.md` (format reference), `UAT_Security.md` (codebase implementation map)*
*Codebase branch: `feat/err01-batch3-wrap-handler`*
*Date: 2026-06-25*
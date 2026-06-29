# User Acceptance Testing — Security (UAT_Security)

**System:** Civil Service Management System (CSMS)  
**Date:** 2026-06-25  
**Status:** DRAFT — Pending Execution  

---

## Table of Contents

1. [Document Control](#1-document-control)
2. [Introduction & Scope](#2-introduction--scope)
3. [Codebase Implementation Map](#3-codebase-implementation-map)
4. [Test Coverage by Security Domain](#4-test-coverage-by-security-domain)
5. [Test Cases](#5-test-cases)
   - [TC-AUTH — Authentication Security](#tc-auth--authentication-security)
   - [TC-RBAC — Authorization & Access Control](#tc-rbac--authorization--access-control)
   - [TC-SESSION — Session Management](#tc-session--session-management)
   - [TC-INJECT — Input Validation & Injection Prevention](#tc-inject--input-validation--injection-prevention)
   - [TC-CSRF — Cross-Site Request Forgery Protection](#tc-csrf--cross-site-request-forgery-protection)
   - [TC-FILE — File Upload Security](#tc-file--file-upload-security)
   - [TC-PASS — Password Security & Cryptography](#tc-pass--password-security--cryptography)
   - [TC-API — API Security & Rate Limiting](#tc-api--api-security--rate-limiting)
   - [TC-DATA — Data Protection & Privacy](#tc-data--data-protection--privacy)
   - [TC-HEADER — Security Headers & Configuration](#tc-header--security-headers--configuration)
   - [TC-ERROR — Error Handling & Information Disclosure](#tc-error--error-handling--information-disclosure)
   - [TC-AUDIT — Audit Trail & Logging](#tc-audit--audit-trail--logging)
   - [TC-NET — Network Security](#tc-net--network-security)
   - [TC-PENTEST — Penetration Testing](#tc-pentest--penetration-testing)
6. [Audit Trail Deep-Dive](#6-audit-trail-deep-dive)
7. [Traceability Matrix](#7-traceability-matrix)
8. [Vulnerability Tracking](#8-vulnerability-tracking)
9. [Execution Schedule](#9-execution-schedule)
10. [Sign-Off](#10-sign-off)

---

## 1. Document Control

| Field | Value |
|---|---|
| **Document Title** | UAT_Security — Security Testing |
| **Project** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Base Documents** | `transforms_security_requirements.md`, `Security_requirements_and_Controls.md`, `sample.md` |
| **Codebase Branch** | `feat/err01-batch3-wrap-handler` |
| **Environment** | `http://localhost:9002` |

---

## 2. Introduction & Scope

### 2.1 Purpose

This UAT document consolidates three source documents into a single **codebase-verified** security test suite. Every test case includes:

- The **requirement** from the security specifications
- The **expected behaviour** from the generic UAT (`sample.md`)
- **Codebase implementation references** (file paths and line numbers) showing what's actually built
- A **status column** for pass/fail recording during test execution

### 2.2 Source Documents Mapped

| Source Document | Focus | How It's Used |
|---|---|---|
| `transforms_security_requirements.md` | Requirement 15 — Audit Trail & Accountability | Test cases TC-AUDIT-01 through TC-AUDIT-14, Section 6 deep-dive |
| `Security_requirements_and_Controls.md` | 30 security requirements across all domains | All test domains, traceability matrix (Section 7) |
| `sample.md` | 140 test cases across 14 security domains | Test case structure, step-by-step procedures |

### 2.3 Security Standards Coverage

- OWASP Top 10 (2021) — A01 through A10
- NIST Cybersecurity Framework — Identify, Protect, Detect, Respond, Recover
- ISO/IEC 27001:2013 — Information security management
- Zanzibar Government Data Protection Requirements

### 2.4 Test Environment Access

| Role | Used For |
|---|---|
| **Admin** | Audit trail, user management, system configuration |
| **CSCS** | Cross-institution oversight, audit log view |
| **HHRMD** | Commission-level approvals, institution management |
| **HRMO** | Commission-level approvals |
| **HRRP** | Workflow approvals and forwarding |
| **HRO** | Request submission, employee management |
| **DO** | Disciplinary actions, complaint handling |
| **EMPLOYEE** | Complaint submission, self-service |
| **PO** | Reports (read-only) |

---

## 3. Codebase Implementation Map

This section maps all security-related code in the codebase to the security requirements they fulfill.

### 3.1 Authentication & Session Management

| File | What It Implements | Requirements |
|---|---|---|
| `src/lib/api-auth.ts` | `verifyAuth()` — cookie-based auth verification; `withAuth()` — HOF wrapper for API routes | Req 1, 3 |
| `prisma/schema.prisma` (User model) | `failedLoginAttempts`, `isManuallyLocked`, `loginLockedUntil`, `loginLockoutReason`, `loginLockoutType`, `lastActivity` | Req 1 |
| `prisma/schema.prisma` (Session model) | `sessionToken`, `ipAddress`, `userAgent`, `deviceInfo`, `lastActivity`, `expiresAt`, `isSuspicious` | Req 2, 3 |
| `prisma/schema.prisma` (MfaToken model) | `tokenType` (OTP/MAGIC_LINK), `attempts`, `expiresAt`, `usedAt`, `ipAddress` | Req 1 (MFA) |

### 3.2 Authorization & Access Control

| File | What It Implements | Requirements |
|---|---|---|
| `src/lib/route-permissions-config.ts` | Canonical RBAC config — maps route patterns to allowed roles | Req 3, 14 |
| `src/lib/route-permissions.ts` | `canAccessRoute()`, `getAllowedRolesForRoute()` helpers | Req 3 |
| `src/components/auth/route-guard.tsx` | Client-side `RouteGuard` component — shows loading/denied/granted states | Req 3 |
| `src/hooks/use-route-guard.ts` | `useRouteGuard()` hook — checks auth, checks permission, supports redirect or error UI | Req 3 |

### 3.3 Audit Trail & Logging

| File | What It Implements | Requirements |
|---|---|---|
| `src/app/dashboard/admin/audit-trail/page.tsx` | Audit trail UI — filterable table, stats, CSV export, pagination, severity badges | Req 15 |
| `src/app/api/audit/logs/route.ts` | `GET /api/audit/logs` — read-only query endpoint with filters; Admin/CSCS only | Req 15 |
| `src/app/api/audit/log/route.ts` | `POST /api/audit/log` — client-side event logging (e.g. unauthorized access) | Req 15, 26 |
| `src/lib/audit-logger.ts` | Core audit engine — `logAuditEvent()`, 14 convenience functions, IP extraction | Req 15 |
| `src/lib/audit-db.ts` | Raw SQL layer — `writeAuditLog()` (INSERT only), partitioned queries, `ensurePartitions()` | Req 15, 21 |
| `src/lib/audit-wrapper.ts` | `withAuditLogging()` — automatic audit on mutating API routes | Req 15, 19 |
| `src/lib/audit-health.ts` | `checkAuditHealth()` — connectivity, ingestion, partition coverage | Req 26 |

### 3.4 Input Validation, CSRF & Error Handling

| File | What It Implements | Requirements |
|---|---|---|
| `src/lib/api-schemas.ts` | Zod schemas + `validateRequest()` — body/query validation with auto-sanitization | Req 4, 20 |
| `src/lib/sanitize-input.ts` | `sanitizeText()`, `sanitizeRichText()`, `sanitizeObject()` — DOMPurify-based | Req 4, 20 |
| `src/lib/sanitize-response.ts` | `sanitizeUser()`, `maskSessionToken()` — strips 24 sensitive fields from responses | Req 9, 20 |
| `src/lib/csrf-utils.ts` | Double-submit cookie pattern — HMAC-SHA256 token generation, signing, verification | Req 5 |
| `src/lib/api-csrf-middleware.ts` | `validateCSRF()`, `withCSRFProtection()`, `withCSRF()` middleware | Req 5 |
| `src/lib/error-handler.ts` | `AppError` class, `withErrorHandler()` / `wrapHandler()` — safe, standardized API errors | Req 11, 20 |

### 3.5 Rate Limiting

| File | What It Implements | Requirements |
|---|---|---|
| `src/lib/rate-limiter.ts` | Redis-based rate limiter — 5 tiers (auth/write/read/upload/download); `withRateLimit()` HOF | Req 1, 8, 26 |

### 3.6 Audit Trail UI (Deep Dive)

The audit trail at `/dashboard/admin/audit-trail` (`src/app/dashboard/admin/audit-trail/page.tsx`) implements:

| Feature | Implementation | Line(s) |
|---|---|---|
| **Route guard** | Wrapped in `<RouteGuard>` — only Admin role can access | 313 |
| **Stats dashboard** | 5 cards: Total Events, Blocked Attempts, Critical Events, Success Rate, By Category | 322–409 |
| **Filters** | Search username/IP, Category dropdown (7 categories), Event Type dropdown (30+ types), Date range | 418–565 |
| **Pagination** | 50 logs per page, page number navigation | 145–146, 719–781 |
| **CSV Export** | Downloads `audit-trail-{date}.csv` with all visible columns | 239–308 |
| **Severity badges** | CRITICAL=destructive, ERROR=destructive, WARNING=secondary, INFO=default | 108–125 |
| **Status badges** | Green "Success", Red "Rejected", Red "Blocked", Blue "Allowed" | 700–708 |
| **Rich details** | Request type, employee name/ZAN ID, review stage, rejection reason | 646–685 |
| **Device info** | Browser/OS tooltip, IP address in monospace | 687–698 |
| **Empty state** | "No audit logs found" message when no results match | 584–585 |
| **Loading state** | 10-row skeleton placeholder | 579–581 |

The API at `src/app/api/audit/logs/route.ts`:
- **Only exports GET** — no POST/PUT/PATCH/DELETE (immutability enforced at API level) — lines 1–107
- **Role check** — Admin or CSCS only, returns 403 otherwise — lines 49–54
- **Stats mode** — `?statsOnly=true` returns aggregated statistics — lines 61–74
- **Filters** — startDate, endDate, eventType, eventCategory, severity, userId, username, attemptedRoute, limit, offset — lines 77–99

---

## 4. Test Coverage by Security Domain

| # | Domain | Tests | Requirements Covered |
|---|---|---|---|
| TC-AUTH | Authentication Security | 14 | Req 1, 7 |
| TC-RBAC | Authorization & Access Control | 10 | Req 3, 4, 5, 9, 14, 17 |
| TC-SESSION | Session Management | 12 | Req 2, 3 |
| TC-INJECT | Input Validation & Injection Prevention | 14 | Req 4, 20 |
| TC-CSRF | Cross-Site Request Forgery | 12 | Req 5 |
| TC-FILE | File Upload Security | 14 | Req 6, 7, 10 |
| TC-PASS | Password Security & Cryptography | 14 | Req 1 |
| TC-API | API Security & Rate Limiting | 14 | Req 1, 3, 8, 16 |
| TC-DATA | Data Protection & Privacy | 14 | Req 4, 5, 9, 22, 23 |
| TC-HEADER | Security Headers & Configuration | 14 | Req 10 |
| TC-ERROR | Error Handling & Information Disclosure | 14 | Req 11 |
| TC-AUDIT | Audit Trail & Logging | 14 | Req 15, 19, 21, 24 |
| TC-NET | Network Security | 14 | Req 13 |
| TC-PENTEST | Penetration Testing | 14 | Req 14, 26 |
| | **TOTAL** | **182** | |

---

## 5. Test Cases

---

### TC-AUTH — Authentication Security

**Requirements:** Req 1 (Authentication & Identity Assurance), Req 7 (Password Security)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-AUTH-01 | Valid user login | 1. `/login` 2. Valid credentials 3. Submit | - Authenticated, session created<br>- Redirected to dashboard<br>- Role in user object correct | `api-auth.ts:86-161` (verifyAuth) | ⬜ |
| TC-AUTH-02 | Invalid username/email | 1. `/login` 2. Non-existent username 3. Any password | - Generic error: "Invalid username/email or password"<br>- No account enumeration<br>- Failed attempt logged | `audit-logger.ts:216-244` (logLoginAttempt) | ⬜ |
| TC-AUTH-03 | Invalid password | 1. `/login` 2. Valid username 3. Wrong password | - Same generic error as TC-AUTH-02<br>- No indication of which field is wrong<br>- Account NOT locked after single attempt | `audit-logger.ts:216-244` | ⬜ |
| TC-AUTH-04 | SQL injection in login | 1. `/login` 2. `' OR '1'='1` etc. in username 3. Submit | - Login fails<br>- No SQL error messages<br>- No auth bypass<br>- Prisma parameterized queries prevent injection | Prisma ORM (parameterized) | ⬜ |
| TC-AUTH-05 | Account lockout | 1. Wrong password × N attempts 2. 6th attempt 3. Correct password during lockout | - Locked after threshold<br>- Lockout duration enforced<br>- Correct password still denied during lockout | `schema.prisma:User.failedLoginAttempts, loginLockedUntil` | ⬜ |
| TC-AUTH-06 | Inactive account login | 1. Set user `active=false` in DB 2. Login with valid credentials | - Login fails with inactive message<br>- No session created<br>- Event logged | `api-auth.ts:140-142` (checks `user.active`) | ⬜ |
| TC-AUTH-07 | Employee self-service login | 1. Employee login with ZAN ID + ZSSF + Payroll | - Authenticated<br>- JIT account creation<br>- Employee role assigned | Login form (not in api-auth.ts) | ⬜ |
| TC-AUTH-08 | Employee login — invalid | 1. Invalid ZAN ID + any ZSSF/Payroll | - Generic error<br>- No employee enumeration | | ⬜ |
| TC-AUTH-09 | Default password security | 1. New employee account 2. Check default password | - NOT predictable (not ZAN ID)<br>- Random strong password<br>- Force change on first login | | ⬜ |
| TC-AUTH-10 | Brute force protection | 1. Automated rapid login attempts (100+) | - Rate limiting enforced<br>- IP-based blocking<br>- Account lockout triggered | `rate-limiter.ts:16` auth tier: 5 req/min | ⬜ |
| TC-AUTH-11 | Credential stuffing | 1. Known compromised credentials 2. Automated attempts | - Attack detected<br>- IP blocked/rate limited<br- Affected accounts flagged | `rate-limiter.ts` | ⬜ |
| TC-AUTH-12 | MFA verification | 1. Login 2. MFA prompt 3. Valid/invalid/expired OTP | - Valid OTP → access<br>- Invalid → denied<br>- Expired → rejected<br>- Limited OTP attempts | `schema.prisma:MfaToken` (attempts, expiresAt, usedAt) | ⬜ |
| TC-AUTH-13 | Password change | 1. Change password in profile 2. Verify | - Current password required<br>- New password validated<br>- Password changed in DB<br- Event logged: `PASSWORD_CHANGED` | `audit-logger.ts:57` (AuditEventType.PASSWORD_CHANGED) | ⬜ |
| TC-AUTH-14 | Admin password reset | 1. Admin resets another user's password | - Password reset<br>- Event logged: `ADMIN_PASSWORD_RESET` | `audit-logger.ts:58` (AuditEventType.ADMIN_PASSWORD_RESET) | ⬜ |

---

### TC-RBAC — Authorization & Access Control

**Requirements:** Req 3 (Authorization & Least Privilege), Req 4 (Institution Data Isolation), Req 5 (Employee Profile Protection), Req 9 (Complaint Security), Req 14 (Administrative Security), Req 17 (IDOR Protection)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-RBAC-01 | Admin — full access | 1. Login as Admin 2. All admin features 3. CRUD users | - Access to all admin panels<br>- User CRUD works<br>- Actions logged | `route-permissions-config.ts:20` (admin routes → Admin only) | ⬜ |
| TC-RBAC-02 | Employee — limited access | 1. Login as EMPLOYEE 2. Admin panels 3. Other employees' data | - 403 on admin routes<br>- RouteGuard shows "Access Denied"<br>- Cannot see other data | `route-guard.tsx:97-131` (denied UI) | ⬜ |
| TC-RBAC-03 | Institution isolation | 1. HRO from Institution A 2. View Institution B employees 3. API direct calls | - Only Institution A data visible<br>- API enforces institutionId filter<br>- Cross-institution access blocked | `api-auth.ts` (institutionId in context) | ⬜ |
| TC-RBAC-04 | CSC/HHRMD — cross-institution | 1. HHRMD login 2. Multiple institutions | - Full system-wide visibility<br>- No institution filter | | ⬜ |
| TC-RBAC-05 | Vertical privilege escalation | 1. Employee modifies session/role 2. Attempt admin operations | - Role modification ineffective<br>- Server validates role from DB<br>- Attempt logged | `api-auth.ts:133-143` (database lookup) | ⬜ |
| TC-RBAC-06 | Horizontal privilege escalation (IDOR) | 1. Employee A 2. Access Employee B's data via ID manipulation | - Access denied<br>- User ID verified against session<br>- Attempt logged as security event | `audit-logger.ts:23` UNAUTHORIZED_ACCESS | ⬜ |
| TC-RBAC-07 | API authorization | 1. List endpoints 2. Call without auth 3. Invalid token 4. Wrong role | - 401 without auth<br>- 403 for wrong role<br>- No data leakage | `api-auth.ts:196-215` (withAuth) | ⬜ |
| TC-RBAC-08 | Role switching attack | 1. Change role in localStorage 2. Refresh | - Client-side change ineffective<br>- Server re-validates from DB | `api-auth.ts` (database re-verification) | ⬜ |
| TC-RBAC-09 | Session hijacking | 1. Capture another user's session token 2. Use it | - Token bound to user<br>- IP/UA validation<br>- Session invalidated on mismatch | `schema.prisma:Session` (ipAddress, userAgent, isSuspicious) | ⬜ |
| TC-RBAC-10 | Complaint access control | 1. Employee A creates complaint 2. Employee B tries to view it | - Employee B cannot see it<br>- Only owner/DO/HHRMD can access | `route-permissions-config.ts:81-84` | ⬜ |

---

### TC-SESSION — Session Management

**Requirements:** Req 2 (Session Security), Req 3 (Authorization)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-SESSION-01 | Session creation on login | 1. Login 2. Inspect storage 3. Check tokens | - Secure session token generated<br>- Stored in cookie (`auth-storage`)<br>- Bound to user ID | `api-auth.ts` | ⬜ |
| TC-SESSION-02 | Session token security | 1. Capture token 2. Analyze structure 3. Attempt modification | - Cryptographically signed<br>- Modified tokens rejected<br- JWT-like structure | | ⬜ |
| TC-SESSION-03 | Session expiration | 1. Login 2. Wait for timeout 3. Access protected resource | - Session expires after inactivity<br>- Redirect to login<br>- Cannot use expired session | `schema.prisma:Session.expiresAt` | ⬜ |
| TC-SESSION-04 | Session fixation | 1. Create pre-login session 2. Note session ID 3. Login | - New session ID generated on login<br>- Old session invalidated | | ⬜ |
| TC-SESSION-05 | Session hijacking protection | 1. Capture session 2. Use from different IP/UA | - IP-bound session tracking<br>- Suspicious change detected<br>`Session.isSuspicious` flag | `schema.prisma:Session` (ipAddress, userAgent, isSuspicious) | ⬜ |
| TC-SESSION-06 | Concurrent session handling | 1. Login from Browser A 2. Login same user from Browser B | - Previous session invalidated OR<br>- Max concurrent sessions enforced | | ⬜ |
| TC-SESSION-07 | Logout functionality | 1. Login 2. Capture token 3. Logout 4. Reuse token | - Session invalidated<br>- Token removed<br>- Cannot reuse | `audit-logger.ts:28` (LOGOUT event) | ⬜ |
| TC-SESSION-08 | Token refresh | 1. Login 2. Near-expiry token 3. Refresh | - Refresh works before expiry<br>- New token issued<br>- Old token invalidated | | ⬜ |
| TC-SESSION-09 | Session storage security | 1. Inspect localStorage/sessionStorage/cookies | - httpOnly cookies (XSS protection)<br>- SameSite flag (CSRF)<br>- No sensitive data in localStorage | | ⬜ |
| TC-SESSION-10 | Cross-tab session sync | 1. Login in Tab A 2. Logout in Tab B 3. Check Tab A | - Logout syncs across tabs<br>- All tabs redirect to login | `hooks/use-inactivity-timeout.ts` | ⬜ |
| TC-SESSION-11 | Remember Me | 1. Login with "Remember Me" 2. Close browser 3. Reopen | - Session persists<br>- Longer-lived token<br>- Still re-auth for sensitive ops | | ⬜ |
| TC-SESSION-12 | Session validation endpoint | 1. Call API without token 2. Invalid token 3. Expired 4. Valid | - 401 for invalid/expired<br>- Returns user data for valid | `api-auth.ts:86-161` | ⬜ |

---

### TC-INJECT — Input Validation & Injection Prevention

**Requirements:** Req 4 (Institution Data Isolation), Req 20 (Data Integrity Protection)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-INJECT-01 | SQL injection — login form | 1. SQL payloads in username 2. Submit | - All blocked<br>- No SQL errors<br>- No auth bypass | Prisma parameterized queries | ⬜ |
| TC-INJECT-02 | SQL injection — search | 1. UNION-based payloads 2. Employee/institution search | - No injection possible<br>- Prisma prevents injection | Prisma ORM | ⬜ |
| TC-INJECT-03 | SQL injection — numeric params | 1. `1 OR 1=1`, `1; DROP TABLE` in IDs | - Numeric validation via Zod<br>- Type safety prevents injection | `api-schemas.ts` (Zod validation) | ⬜ |
| TC-INJECT-04 | Stored XSS | 1. `<script>alert('XSS')</script>` in profile 2. View page | - Payload sanitized<br>- HTML entities encoded<br>- Scripts don't execute | `sanitize-input.ts` (DOMPurify) | ⬜ |
| TC-INJECT-05 | Reflected XSS | 1. `?name=<script>alert(1)</script>` in URL | - URL params sanitized<br>- Content encoded<br>- CSP blocks inline scripts | `sanitize-input.ts` | ⬜ |
| TC-INJECT-06 | DOM-based XSS | 1. innerHTML injections, eval() attempts | - No innerHTML with user data<br>- React escapes by default<br>- No eval() with user input | React escaping, DOMPurify | ⬜ |
| TC-INJECT-07 | Command injection | 1. `; ls -la`, `&& whoami` in file ops | - No command injection possible<br>- No shell execution with user input | | ⬜ |
| TC-INJECT-08 | Path traversal | 1. `../../etc/passwd` in file endpoints | - Traversal blocked<br>- No access outside allowed dirs<br>- Filename sanitized | | ⬜ |
| TC-INJECT-09 | Email header injection | 1. `\nCC:hacker@evil.com` in email inputs | - Newlines blocked<br>- Cannot inject additional recipients | | ⬜ |
| TC-INJECT-10 | Input length validation | 1. 10,000+ char strings in all text fields | - Max length enforced<br>- No crashes<br>- Validation errors returned | `api-schemas.ts` (Zod) | ⬜ |
| TC-INJECT-11 | Special characters & Unicode | 1. Emoji, null bytes, RTL override | - Handled correctly<br>- Null bytes rejected<br>- UTF-8 encoded | `sanitize-input.ts` | ⬜ |
| TC-INJECT-12 | Content type validation | 1. JSON to form endpoint 2. Form data to JSON API | - Content-Type validated<br>- Mismatched content rejected | | ⬜ |
| TC-INJECT-13 | Mass assignment | 1. POST with extra fields: `role: "Admin"` | - Extra fields ignored<br>- Only allowed fields processed | `api-schemas.ts` (Zod schema whitelisting) | ⬜ |
| TC-INJECT-14 | Object sanitization | 1. Submit nested object with HTML payloads | - All string values sanitized recursively | `sanitize-input.ts:sanitizeObject()` | ⬜ |

---

### TC-CSRF — Cross-Site Request Forgery Protection

**Requirements:** Req 5 (CSRF Protection via double-submit cookie pattern)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-CSRF-01 | CSRF token generation | 1. Login 2. Inspect forms for CSRF token | - Token present in all forms<br>- Cryptographically random<br>- Unique per session | `csrf-utils.ts:generateCSRFToken()` | ⬜ |
| TC-CSRF-02 | CSRF token validation | 1. Submit without token 2. Invalid token 3. Expired token 4. Another user's token | - 403 without token<br>- Invalid/expired rejected<br>- Token bound to user session | `csrf-utils.ts:validateCSRFTokens()` | ⬜ |
| TC-CSRF-03 | State-changing GET | 1. `<img src="/api/users/delete?id=1">` sent to authenticated user | - GET requests don't modify state<br>- Only POST/PUT/DELETE change state | `csrf-utils.ts:requiresCSRFProtection()` (safe methods skip) | ⬜ |
| TC-CSRF-04 | Malicious form attack | 1. External form posting to CSMS | - Blocked — missing CSRF token<br>- Origin header validated<br>- SameSite cookie prevents inclusion | `api-csrf-middleware.ts` | ⬜ |
| TC-CSRF-05 | SameSite cookie attribute | 1. Inspect cookies 2. Check SameSite | - SameSite=Lax or Strict<br>- Not sent on cross-site POST | `csrf-utils.ts:CSRF_COOKIE_NAME` | ⬜ |
| TC-CSRF-06 | Origin header validation | 1. POST with different Origin header | - Cross-origin requests rejected<br>- Only allowed origins accepted | `api-csrf-middleware.ts` | ⬜ |
| TC-CSRF-07 | Double-submit cookie pattern | 1. Check cookie/header match 2. Modify cookie value | - Values must match<br>- Mismatch → rejected<br>- Violation logged | `csrf-utils.ts:validateCSRFTokens()`, `logCSRFViolation()` | ⬜ |
| TC-CSRF-08 | CSRF on critical operations | 1. Password change 2. Role modification 3. User deletion via CSRF | - All critical ops protected<br>- CSRF tokens required<br>- Re-auth for sensitive ops | `api-csrf-middleware.ts` | ⬜ |
| TC-CSRF-09 | JSON-based CSRF | 1. JSON payload CSRF attack | - Preflight triggered<br>- CORS restricts origins<br>- Token still validated | | ⬜ |
| TC-CSRF-10 | Login CSRF | 1. External form posting to login | - Login endpoint CSRF-protected<br>- Token on login form | | ⬜ |
| TC-CSRF-11 | CSRF audit logging | 1. Trigger CSRF violation | - `logCSRFViolation()` called<br>- Event recorded in audit trail | `csrf-utils.ts:logCSRFViolation()` | ⬜ |
| TC-CSRF-12 | Custom header requirement | 1. API call without x-csrf-token header | - CSRF token required in header<br>- Missing → rejected | `csrf-utils.ts:CSRF_HEADER_NAME` | ⬜ |

---

### TC-FILE — File Upload Security

**Requirements:** Req 6 (Employee Creation Integrity), Req 7 (Bulk Upload Security), Req 10 (File & Document Security)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-FILE-01 | Valid PDF upload | 1. Upload allowed PDF | - Upload succeeds<br>- Stored in MinIO<br>- URL returned | | ⬜ |
| TC-FILE-02 | Executable rejection | 1. Upload .exe, .bat, .sh | - Rejected<br>- Error displayed<br>- Not stored | | ⬜ |
| TC-FILE-03 | MIME type spoofing | 1. Rename .exe to .pdf 2. Upload | - Rejected despite extension<br>- MIME type checked | | ⬜ |
| TC-FILE-04 | File size limit | 1. 1MB (allowed) 2. 2MB (limit) 3. 3MB (over) | - Under limit accepted<br>- Over limit rejected | Rate limiter upload tier: 10 req/min | ⬜ |
| TC-FILE-05 | Filename sanitization | 1. `../../etc/passwd.pdf`, `<script>.pdf`, `file;rm -rf /.pdf` | - Sanitized<br>- Path traversal blocked<br>- Only safe chars | `sanitize-input.ts` | ⬜ |
| TC-FILE-06 | Double extension | 1. `file.pdf.exe`, `file.php.pdf` | - Detected<br>- Rejected or normalized<br>- No code execution | | ⬜ |
| TC-FILE-07 | File upload audit | 1. Upload file 2. Check audit trail | - `FILE_UPLOADED` event logged<br>- User, filename, timestamp recorded | `audit-logger.ts:59` (FILE_UPLOADED), `logFileAction()` | ⬜ |
| TC-FILE-08 | File download audit | 1. Download file 2. Check audit trail | - `FILE_DOWNLOADED` event logged | `audit-logger.ts:61` (FILE_DOWNLOADED) | ⬜ |
| TC-FILE-09 | File delete audit | 1. Delete file 2. Check audit trail | - `FILE_DELETED` event logged | `audit-logger.ts:60` (FILE_DELETED) | ⬜ |
| TC-FILE-10 | File preview audit | 1. Preview file 2. Check audit trail | - `FILE_PREVIEWED` event logged | `audit-logger.ts:62` (FILE_PREVIEWED) | ⬜ |
| TC-FILE-11 | Upload rate limiting | 1. Upload 10+ files rapidly | - Rate limited (upload tier: 10/min)<br>- 429 after threshold | `rate-limiter.ts:19` | ⬜ |
| TC-FILE-12 | Malicious PDF | 1. PDF with embedded JS | - Detected/sanitized<br>- Served with safe headers | | ⬜ |
| TC-FILE-13 | Concurrent uploads | 1. Multiple files simultaneously | - No race conditions<br>- Unique filenames guaranteed | | ⬜ |
| TC-FILE-14 | File storage security | 1. Check MinIO access | - Files outside web root<br>- Presigned URLs<br>- No directory listing | | ⬜ |

---

### TC-PASS — Password Security & Cryptography

**Requirements:** Req 1 (Authentication & Identity Assurance — password hashing, policies)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-PASS-01 | Password complexity | 1. Try "password", "12345678", "qwerty" 2. Try strong password | - Weak rejected<br>- Min length, uppercase, lowercase, numbers enforced | | ⬜ |
| TC-PASS-02 | Password hashing | 1. Create user 2. Check DB | - Not plaintext<br>- bcrypt/Argon2id<br>- Salted | (Not in api-auth.ts — would be in auth route) | ⬜ |
| TC-PASS-03 | Hash uniqueness | 1. Multiple users with same password 2. Compare hashes | - Each hash unique<br>- Different salts | | ⬜ |
| TC-PASS-04 | Password change security | 1. Change password 2. Verify | - Current password required<br>- Validated against policy<br>- Audit event: PASSWORD_CHANGED | `audit-logger.ts:57` | ⬜ |
| TC-PASS-05 | Password reset (email) | 1. Request reset 2. Receive email | - Reset token random<br>- Single-use<br>- Expires (15-60 min) | | ⬜ |
| TC-PASS-06 | Reset token security | 1. Use token 2. Reuse same token 3. Expired token | - Used token invalidated<br>- Expired rejected<br>- Bound to user | | ⬜ |
| TC-PASS-07 | Reset rate limiting | 1. Request reset 5+ times rapidly | - Rate limited<br>- No email flood | `rate-limiter.ts:16` (auth tier) | ⬜ |
| TC-PASS-08 | Common password dictionary | 1. Set "Password123", "Qwerty123" | - Common passwords blocked<br>- Dictionary check | | ⬜ |
| TC-PASS-09 | Password enumeration prevention | 1. Reset for existing user 2. Reset for non-existing email | - Same response for both<br>- No user enumeration | | ⬜ |
| TC-PASS-10 | Credential stuffing protection | 1. Automated password guessing | - Detected<br>- Rate limited<br>- Lockout triggered | `rate-limiter.ts` | ⬜ |
| TC-PASS-11 | Password in transit | 1. Capture network traffic during login | - HTTPS enforced<br>- TLS 1.2+<br>- No password in URL | (Infrastructure) | ⬜ |
| TC-PASS-12 | Audit: password changed | 1. Change password 2. Check audit trail | - `PASSWORD_CHANGED` event in audit log | `audit-logger.ts:57` | ⬜ |
| TC-PASS-13 | Audit: admin password reset | 1. Admin resets password 2. Check audit trail | - `ADMIN_PASSWORD_RESET` event in audit log | `audit-logger.ts:58` | ⬜ |
| TC-PASS-14 | Audit: account locked | 1. Trigger account lockout | - `ACCOUNT_LOCKED` event in audit log | `audit-logger.ts:55` | ⬜ |

---

### TC-API — API Security & Rate Limiting

**Requirements:** Req 1 (Rate Limiting), Req 3 (Authorization), Req 8 (Workflow Security), Req 16 (Background Processing)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-API-01 | API auth enforcement | 1. Call all endpoints without auth | - All protected: 401<br>- Public endpoints defined | `api-auth.ts:86-161` (verifyAuth) | ⬜ |
| TC-API-02 | API authorization | 1. Regular user calls admin endpoints | - 403 Forbidden<br>- Role-based access enforced | `api-auth.ts:205-210` (role check) | ⬜ |
| TC-API-03 | Rate limiting — read | 1. 100+ read requests in 60s | - 429 after threshold<br>- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset | `rate-limiter.ts:18` (read: 100/min) | ⬜ |
| TC-API-04 | Rate limiting — auth | 1. 5+ login attempts in 60s | - 429 after threshold (5/min)<br>- Stricter than other tiers | `rate-limiter.ts:16` (auth: 5/min) | ⬜ |
| TC-API-05 | Rate limiting — write | 1. 30+ write requests in 60s | - 429 after threshold (30/min) | `rate-limiter.ts:17` (write: 30/min) | ⬜ |
| TC-API-06 | Rate limiting — upload | 1. 10+ uploads in 60s | - 429 after threshold (10/min) | `rate-limiter.ts:19` (upload: 10/min) | ⬜ |
| TC-API-07 | API enumeration prevention | 1. Iterate user IDs sequentially | - UUIDs prevent enumeration<br>- Same error for missing/unauthorized | | ⬜ |
| TC-API-08 | Mass assignment | 1. POST extra fields (role, isAdmin) | - Extra fields ignored<br>- Zod schema whitelist enforced | `api-schemas.ts` | ⬜ |
| TC-API-09 | Parameter tampering | 1. Modify URL params 2. Inject additional params | - All validated<br>- Unexpected params rejected | `api-schemas.ts` (Zod) | ⬜ |
| TC-API-10 | Response data leakage | 1. Inspect all API responses | - No password hashes<br>- No internal IDs<br>- PII masked | `sanitize-response.ts` (24 sensitive fields) | ⬜ |
| TC-API-11 | Error message disclosure | 1. Trigger API errors | - Generic messages<br>- No stack traces (production)<br>- Standardized format | `error-handler.ts:86-94` (production safety) | ⬜ |
| TC-API-12 | HTTP method security | 1. POST to GET endpoint 2. DELETE on read-only | - 405 Method Not Allowed<br>- GET is read-only | `audit/logs/route.ts` (only GET exported) | ⬜ |
| TC-API-13 | Batch/pagination limits | 1. Request 1000+ records at once | - Max page size enforced<br>- Pagination required | `audit-db.ts:264` (default limit 100) | ⬜ |
| TC-API-14 | Token security | 1. Capture + analyze API tokens | - Cryptographically secure<br>- Short-lived<br>- Token binding | | ⬜ |

---

### TC-DATA — Data Protection & Privacy

**Requirements:** Req 4 (Institution Data Isolation), Req 5 (Employee Profile Protection), Req 9 (Complaint Management Security), Req 22 (Data Classification), Req 23 (Restricted Data Protection)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-DATA-01 | HTTPS/TLS enforcement | 1. Access via HTTP | - Redirects to HTTPS<br>- Valid cert<br>- TLS 1.2+ | (Infrastructure) | ⬜ |
| TC-DATA-02 | Data encryption at rest | 1. Check database 2. File storage | - DB encrypted at rest<br>- MinIO encrypted<br>- AES-256 | (Infrastructure) | ⬜ |
| TC-DATA-03 | PII — passwords | 1. Check logs, API responses, error messages | - Never in plaintext<br>- Not logged<br>- Never in API responses | `sanitize-response.ts` | ⬜ |
| TC-DATA-04 | PII — personal data | 1. Review employee data display 2. Export | - Only necessary PII collected<br>- Access logged<br>- Export controls | `sanitize-response.ts` | ⬜ |
| TC-DATA-05 | Sensitive data in logs | 1. Review application logs 2. Search for PII | - No PII (passwords, ZAN IDs)<br>- Logsanitized<br>- Log access controlled | `sanitize-response.ts:maskSessionToken()` | ⬜ |
| TC-DATA-06 | Response sanitization | 1. Call user API 2. Check sensitive fields hidden | - 24 sensitive fields stripped<br>- `passwordHash`, `failedLoginAttempts`, etc. not in response | `sanitize-response.ts:SENSITIVE_USER_FIELDS` | ⬜ |
| TC-DATA-07 | Institution data isolation | 1. HRO queries employees 2. Check institution filter | - Results filtered by institutionId<br>- Cannot see other institutions | `api-auth.ts` (institutionId context) | ⬜ |
| TC-DATA-08 | Cross-institution blocked | 1. HRO from Inst A accesses Inst B employee | - Access denied<br>- Security event logged: cross-institution attempt | `audit-logger.ts` Security Event types | ⬜ |
| TC-DATA-09 | Complaint confidentiality | 1. Employee A creates complaint 2. Employee B tries | - Employee B cannot see it<br>- Only owner/DO/HHRMD | `route-permissions-config.ts:81-84` | ⬜ |
| TC-DATA-10 | Session data security | 1. Inspect cookies/session | - `auth-storage` in cookie<br>- httpOnly? Secure? SameSite? | | ⬜ |
| TC-DATA-11 | Audit: employee created | 1. Create employee 2. Check audit | - `EMPLOYEE_CREATED` event<br>- Performer, timestamp, employee details | `audit-logger.ts:46` | ⬜ |
| TC-DATA-12 | Audit: employee updated | 1. Update employee 2. Check audit | - `EMPLOYEE_UPDATED` event<br- Previous/new values tracked | `audit-logger.ts:47` | ⬜ |
| TC-DATA-13 | Audit: employee deleted | 1. Delete employee 2. Check audit | - `EMPLOYEE_DELETED` event (CRITICAL severity) | `audit-logger.ts:48` | ⬜ |
| TC-DATA-14 | Audit: user created/updated/deleted | 1. CRUD user 2. Check audit | - `USER_CREATED`, `USER_UPDATED`, `USER_DELETED` events | `audit-logger.ts:49-51` | ⬜ |

---

### TC-HEADER — Security Headers & Configuration

**Requirements:** Req 10 (File & Document Security headers), Req 11 (Error Handling — information disclosure)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-HEADER-01 | Content-Security-Policy | 1. Check response headers | - CSP header present<br>- Restrictive policy<br>- Inline scripts blocked | (next.config.ts or middleware) | ⬜ |
| TC-HEADER-02 | X-Frame-Options | 1. Attempt to embed in iframe | - `DENY` or `SAMEORIGIN`<br>- Clickjacking prevented | | ⬜ |
| TC-HEADER-03 | X-Content-Type-Options | 1. Check header | - `nosniff`<br>- MIME sniffing prevented | | ⬜ |
| TC-HEADER-04 | Strict-Transport-Security | 1. Check HSTS header | - max-age ≥ 31536000<br>- includeSubDomains | | ⬜ |
| TC-HEADER-05 | Referrer-Policy | 1. Navigate between pages 2. Check Referer | - Restrictive policy (no-referrer, strict-origin-when-cross-origin) | | ⬜ |
| TC-HEADER-06 | Permissions-Policy | 1. Check header | - Unnecessary features disabled | | ⬜ |
| TC-HEADER-07 | Cache-Control | 1. Check sensitive page headers | - `no-store, no-cache` on sensitive pages<br>- Authenticated content not cached | | ⬜ |
| TC-HEADER-08 | Server information | 1. Check Server, X-Powered-By headers | - Removed or generic<br>- Version numbers hidden | | ⬜ |
| TC-HEADER-09 | Cookie security flags | 1. Login 2. Inspect cookies | - Secure flag<br>- HttpOnly flag<br>- SameSite flag | | ⬜ |
| TC-HEADER-10 | CORS configuration | 1. Cross-origin requests | - Specific origins whitelisted<br>- NOT `Access-Control-Allow-Origin: *` | | ⬜ |
| TC-HEADER-11 | Error page | 1. Trigger 404, 500 | - Generic messages<br>- No stack traces<br>- Custom pages | `error-handler.ts` | ⬜ |
| TC-HEADER-12 | TLS configuration | 1. SSL Labs test | - TLS 1.2 minimum<br>- Strong ciphers<br>- No SSLv3/TLS 1.0/1.1 | (Infrastructure) | ⬜ |
| TC-HEADER-13 | Security headers audit | 1. Run securityheaders.com scan | - All required headers present | (Integration test) | ⬜ |
| TC-HEADER-14 | Cookie scope | 1. Check cookie Path/Domain | - Correctly scoped<br>- Not overly broad | | ⬜ |

---

### TC-ERROR — Error Handling & Information Disclosure

**Requirements:** Req 11 (Error Handling)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-ERROR-01 | Generic error messages | 1. Trigger various errors | - Generic messages<br>- No technical details<br>- Consistent format | `error-handler.ts:86-94` | ⬜ |
| TC-ERROR-02 | Stack trace suppression | 1. Cause exception 2. Check response | - No stack traces in production<br>- Only in dev mode<br>- Errors logged server-side | `error-handler.ts:51` (isProduction check) | ⬜ |
| TC-ERROR-03 | Database error handling | 1. Trigger constraint violation | - DB errors not exposed<br>- No SQL in messages<br>- No table/column names | `error-handler.ts:68-81` (AppError handling) | ⬜ |
| TC-ERROR-04 | File path disclosure | 1. Trigger file errors | - No FS paths in errors<br>- No directory structure | `error-handler.ts` | ⬜ |
| TC-ERROR-05 | API error responses | 1. Call API with invalid data | - Consistent format: `{ success, message, errorCode }` | `error-handler.ts:86-93` | ⬜ |
| TC-ERROR-06 | Validation error messages | 1. Submit invalid form data | - Field-level Zod errors<br>- User can correct<br>- No internals | `error-handler.ts:68-80` (ZodError) | ⬜ |
| TC-ERROR-07 | 404 error page | 1. Non-existent pages | - Custom 404<br>- No directory listing<br>- No route enumeration | | ⬜ |
| TC-ERROR-08 | 500 error page | 1. Trigger internal error | - Custom 500<br>- Generic message<br>- Error logged server-side | `error-handler.ts:84-93` | ⬜ |
| TC-ERROR-09 | Auth error messages | 1. Failed login 2. Invalid token 3. Session expired | - Generic "Invalid credentials"<br>- Don't reveal which field is wrong | `api-auth.ts:46-53` (unauthenticated/invalidSession) | ⬜ |
| TC-ERROR-10 | CORS error handling | 1. Invalid CORS requests | - Properly handled<br>- No origin whitelist info leaked | | ⬜ |
| TC-ERROR-11 | Timeout handling | 1. Trigger request timeout | - Graceful timeout message<br>- Retry offered | | ⬜ |
| TC-ERROR-12 | Sensitive data in logs | 1. Review logs for PII | - No passwords, ZAN IDs, or tokens in logs | `sanitize-response.ts` | ⬜ |
| TC-ERROR-13 | Client-side error handling | 1. Trigger JS errors | - React error boundaries<br>- Graceful degradation<br>- No app crash | | ⬜ |
| TC-ERROR-14 | Third-party API errors | 1. Simulate HRIMS/MinIO failure | - Graceful handling<br>- No third-party details exposed<br>- User informed of service issue | | ⬜ |

---

### TC-AUDIT — Audit Trail & Logging

**Requirements:** Req 15 (Audit Trail & Accountability), Req 19 (Non-Repudiation), Req 21 (Audit Log Protection), Req 24 (Accountability & Traceability)

**Related files:**
- `src/app/dashboard/admin/audit-trail/page.tsx` — Audit trail UI
- `src/app/api/audit/logs/route.ts` — Audit query API (GET only)
- `src/app/api/audit/log/route.ts` — Client-side audit log submit (POST)
- `src/lib/audit-logger.ts` — Audit event definitions and logging
- `src/lib/audit-db.ts` — Raw SQL insert (append-only)
- `src/lib/audit-wrapper.ts` — Automatic audit wrapper for APIs

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-AUDIT-01 | Successful login logged | 1. Login 2. Check audit trail | - `LOGIN_SUCCESS` event<br>- Category: AUTHENTICATION<br>- Severity: INFO<br>- Username, IP, timestamp | `audit-logger.ts:26` (LOGIN_SUCCESS), `:216-244` (logLoginAttempt) | ⬜ |
| TC-AUDIT-02 | Failed login logged | 1. Failed login 2. Check audit trail | - `LOGIN_FAILED` event<br>- Category: AUTHENTICATION<br>- Severity: WARNING<br>- wasBlocked: true | `audit-logger.ts:27` (LOGIN_FAILED) | ⬜ |
| TC-AUDIT-03 | Logout logged | 1. Logout 2. Check audit trail | - `LOGOUT` event<br>- Category: AUTHENTICATION<br>- Severity: INFO | `audit-logger.ts:28` (LOGOUT) | ⬜ |
| TC-AUDIT-04 | Account lockout logged | 1. Trigger lockout 2. Check audit trail | - `ACCOUNT_LOCKED` event<br>- Category: SECURITY<br>- Severity: WARNING | `audit-logger.ts:55` (ACCOUNT_LOCKED) | ⬜ |
| TC-AUDIT-05 | Workflow submission logged | 1. Submit promotion/lwop/confirmation 2. Check audit | - `REQUEST_SUBMITTED` event<br>- Category: DATA_MODIFICATION<br>- Request type, employee details | `audit-logger.ts:43` (REQUEST_SUBMITTED), `:420-457` (logRequestSubmission) | ⬜ |
| TC-AUDIT-06 | Workflow approval logged | 1. Approve a request 2. Check audit | - `REQUEST_APPROVED` event<br>- Approver ID, request type, review stage | `audit-logger.ts:41` (REQUEST_APPROVED), `:330-369` (logRequestApproval) | ⬜ |
| TC-AUDIT-07 | Workflow rejection logged | 1. Reject a request with reason 2. Check audit | - `REQUEST_REJECTED` event<br>- Rejection reason, review stage, severity: WARNING | `audit-logger.ts:42` (REQUEST_REJECTED), `:374-415` (logRequestRejection) | ⬜ |
| TC-AUDIT-08 | Workflow update logged | 1. Update existing request 2. Check audit | - `REQUEST_UPDATED` event<br>- Update details, performer | `audit-logger.ts:44` (REQUEST_UPDATED), `:462-499` (logRequestUpdate) | ⬜ |
| TC-AUDIT-09 | Workflow withdrawal logged | 1. Withdraw request 2. Check audit | - `REQUEST_WITHDRAWN` event | `audit-logger.ts:45` (REQUEST_WITHDRAWN) | ⬜ |
| TC-AUDIT-10 | Complaint actions logged | 1. Submit/update/resolve complaint 2. Check audit | - `COMPLAINT_SUBMITTED`, `COMPLAINT_UPDATED`, `COMPLAINT_RESOLVED` | `audit-logger.ts:52-54`, `:590-634` (logComplaintAction) | ⬜ |
| TC-AUDIT-11 | Admin actions logged | 1. Create/edit/delete user 2. Check audit | - `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`<br>- DELELED is CRITICAL severity | `audit-logger.ts:49-51`, `:548-585` (logUserAction) | ⬜ |
| TC-AUDIT-12 | Institution actions logged | 1. Create/edit institution 2. Check audit | - `INSTITUTION_CREATED`, `INSTITUTION_UPDATED` | `audit-logger.ts:63-64`, `:688-724` (logInstitutionAction) | ⬜ |
| TC-AUDIT-13 | Audit log immutability | 1. Check UI for edit/delete options 2. Check API for non-GET methods | - No edit/delete UI in audit trail<br>- Only GET exported at `/api/audit/logs`<br>- SQL is INSERT-only | `audit/logs/route.ts` (only GET), `audit-db.ts:115-193` (INSERT-only) | ⬜ |
| TC-AUDIT-14 | Audit access control | 1. Non-admin calls audit API 2. Non-admin accesses audit page | - API returns 403 for non-Admin/CSCS<br>- RouteGuard shows "Access Denied"<br>- Attempt logged as security event | `audit/logs/route.ts:49-54`, `route-permissions-config.ts:20` | ⬜ |

---

### TC-NET — Network Security

**Requirements:** Req 13 (Notification Security — network level)

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-NET-01 | Open port scanning | 1. Nmap scan | - Only 443, 80, 22 open<br>- Other ports filtered | (Infrastructure) | ⬜ |
| TC-NET-02 | Firewall configuration | 1. Test firewall rules | - Default deny<br>- Specific allow rules | (Infrastructure) | ⬜ |
| TC-NET-03 | Database network security | 1. Direct DB connection from internet | - Not exposed<br>- Only app server can connect<br>- SSL required | (Infrastructure) | ⬜ |
| TC-NET-04 | MinIO network security | 1. Direct MinIO access | - Not publicly accessible<br>- Presigned URLs only | (Infrastructure) | ⬜ |
| TC-NET-05 | DDoS protection | 1. High traffic simulation | - Rate limiting<br>- CDN/WAF<br>- Service available | `rate-limiter.ts` | ⬜ |
| TC-NET-06 | SSH security | 1. SSH connection attempt | - Key-based only<br>- Root login disabled<br>- Fail2ban | (Infrastructure) | ⬜ |
| TC-NET-07 | Service banner grabbing | 1. Banner grab on ports | - Versions hidden<br>- Generic responses | (Infrastructure) | ⬜ |
| TC-NET-08 | Network segmentation | 1. Map network architecture | - DMZ, VLANs, segmentation | (Infrastructure) | ⬜ |
| TC-NET-09 | Load balancer security | 1. Check LB config | - SSL termination proper<br>- Health checks active | (Infrastructure) | ⬜ |
| TC-NET-10 | DNS security | 1. DNS queries 2. DNSSEC | - DNSSEC<br>- Zone transfers restricted | (Infrastructure) | ⬜ |
| TC-NET-11 | IDS/IPS detection | 1. Simulate attack patterns | - Detected<br>- Alerts generated | (Infrastructure) | ⬜ |
| TC-NET-12 | Network monitoring | 1. Check monitoring tools | - Traffic monitored<br>- Anomaly detection | (Infrastructure) | ⬜ |
| TC-NET-13 | VPN security | 1. VPN connection test | - AES-256<br>- MFA for VPN | (Infrastructure) | ⬜ |
| TC-NET-14 | API gateway security | 1. Test API gateway | - Rate limiting, WAF, auth at gateway | `rate-limiter.ts` | ⬜ |

---

### TC-PENTEST — Penetration Testing

**Requirements:** Req 14 (Administrative Security), Req 26 (Security Monitoring & Detection)

**Note:** The following tests require external security tools (OWASP ZAP, Burp Suite, SQLMap, etc.) and are manual/infrastructure-dependent. They are listed for completeness per the source `sample.md` document.

| ID | Scenario | Steps | Expected | Codebase Reference | Result |
|---|---|---|---|---|---|
| TC-PENTEST-01 | OWASP ZAP automated scan | 1. Run ZAP spider + active scan | - No critical vulns<br>- Findings documented | (Tool-based) | ⬜ |
| TC-PENTEST-02 | Burp Suite testing | 1. Proxy through Burp 2. Manual exploitation | - No auth bypass<br>- Auth properly enforced | (Tool-based) | ⬜ |
| TC-PENTEST-03 | SQL injection (SQLMap) | 1. SQLMap against all inputs | - No injection possible<br>- Prisma protection | Prisma ORM (parameterized) | ⬜ |
| TC-PENTEST-04 | Auth bypass attempts | 1. Password reset exploit 2. Token manipulation | - All bypass attempts fail | `api-auth.ts` | ⬜ |
| TC-PENTEST-05 | Privilege escalation | 1. Vertical + horizontal escalation | - Role changes blocked<br>- Server-side enforcement | `api-auth.ts:133-143, 205-210` | ⬜ |
| TC-PENTEST-06 | Business logic testing | 1. Workflow bypasses 2. Race conditions | - State transitions validated<br>- Integrity checks | | ⬜ |
| TC-PENTEST-07 | API penetration test | 1. All endpoints + rate limit bypass | - All secured<br>- Rate limiting effective | `rate-limiter.ts` | ⬜ |
| TC-PENTEST-08 | File upload exploitation | 1. Malicious files 2. Polyglot 3. Path traversal | - Blocked<br>- No RCE | | ⬜ |
| TC-PENTEST-09 | Session hijacking | 1. Token prediction 2. Fixation 3. XSS token theft | - Tokens unpredictable<br>- Session fixation prevented<br>- XSS prevented | | ⬜ |
| TC-PENTEST-10 | Sensitive data exposure | 1. Search for exposed credentials 2. Info leakage | - No credentials exposed<br>- Sensitive data encrypted | `sanitize-response.ts` | ⬜ |
| TC-PENTEST-11 | Security misconfiguration | 1. Default creds 2. Debug endpoints 3. Security headers | - No default creds<br>- Debug disabled<br>- All headers present | `error-handler.ts:51` (NODE_ENV) | ⬜ |
| TC-PENTEST-12 | DoS testing | 1. Resource exhaustion 2. ReDoS 3. XML bomb | - Rate limiting<br>- Resource limits | `rate-limiter.ts` | ⬜ |
| TC-PENTEST-13 | Vulnerability scanning | 1. Nessus/OpenVAS scan | - No critical vulns<br>- Remediation plan | (Tool-based) | ⬜ |
| TC-PENTEST-14 | Security headers scan | 1. securityheaders.com | - All critical headers present | (Tool-based) | ⬜ |

---

## 6. Audit Trail Deep-Dive

### 6.1 Audit Event Types Currently Implemented

The codebase defines 30+ event types in `src/lib/audit-logger.ts`:

**Access Control (3):**
- `UNAUTHORIZED_ACCESS`, `ACCESS_DENIED`, `FORBIDDEN_ROUTE`

**Authentication (4):**
- `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_EXPIRED`

**Authorization (2):**
- `ROLE_VIOLATION`, `PERMISSION_DENIED`

**Suspicious Activity (3):**
- `MULTIPLE_FAILED_ATTEMPTS`, `SUSPICIOUS_REQUEST`, `POTENTIAL_BREACH`

**Request Management (5):**
- `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_SUBMITTED`, `REQUEST_UPDATED`, `REQUEST_WITHDRAWN`

**Employee (3):**
- `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_DELETED`

**User Management (3):**
- `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`

**Complaints (3):**
- `COMPLAINT_SUBMITTED`, `COMPLAINT_UPDATED`, `COMPLAINT_RESOLVED`

**Account (2):**
- `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`

**Password (2):**
- `PASSWORD_CHANGED`, `ADMIN_PASSWORD_RESET`

**File Operations (4):**
- `FILE_UPLOADED`, `FILE_DELETED`, `FILE_DOWNLOADED`, `FILE_PREVIEWED`

**Institutions (2):**
- `INSTITUTION_CREATED`, `INSTITUTION_UPDATED`

**Total: 36 event types** across 6 categories (SECURITY, ACCESS, AUTHENTICATION, AUTHORIZATION, SYSTEM, DATA_MODIFICATION)

### 6.2 Audit Record Fields

Every audit record contains (from `audit-db.ts` INSERT):

| Field | Type | Source |
|---|---|---|
| `user_id` | UUID | From auth context |
| `username` | VARCHAR | From auth context |
| `user_role` | VARCHAR | From auth context |
| `action` | VARCHAR | Event type (e.g. `LOGIN_SUCCESS`) |
| `event_category` | VARCHAR | SECURITY, ACCESS, AUTHENTICATION, etc. |
| `severity` | VARCHAR | INFO, WARNING, ERROR, CRITICAL |
| `entity_type` | VARCHAR | SYSTEM (default) |
| `entity_id` | UUID | Optional related entity |
| `ip_address` | INET | From `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip` |
| `device_info` | JSONB | Browser, OS, device, UA, screen resolution |
| `request_method` | VARCHAR | HTTP method |
| `request_route` | VARCHAR | The attempted API route |
| `is_authenticated` | BOOLEAN | Whether user had a valid session |
| `was_blocked` | BOOLEAN | Whether the action was blocked |
| `block_reason` | TEXT | Why it was blocked |
| `additional_data` | JSONB | Rich context (request type, employee, stage, etc.) |
| `created_at` | TIMESTAMPTZ | Auto-set by DB |

### 6.3 Immutability Verification

| Layer | Check | Status |
|---|---|---|
| **API** | `/api/audit/logs` only exports `GET` handler — no POST/PUT/PATCH/DELETE | ✅ `audit/logs/route.ts:36` |
| **UI** | Audit trail page has no edit/delete buttons, no context menus, no bulk actions | ✅ `page.tsx:589-714` |
| **Database** | `writeAuditLog()` performs `INSERT INTO audit.audit_log (...) VALUES (...)` — no UPDATE or DELETE SQL exists in the module | ✅ `audit-db.ts:138` |
| **Codebase** | `grep -r "UPDATE audit.audit_log"` returns no results | ✅ |

### 6.4 Access Control

| Layer | Enforcement | Reference |
|---|---|---|
| **Page (client-side)** | `<RouteGuard>` wraps the page — only Admin role allowed | `route-permissions-config.ts:20` |
| **API (server-side)** | Role check: `user.role !== 'Admin' && user.role !== 'CSCS'` → 403 | `audit/logs/route.ts:49-54` |
| **API (server-side)** | Cookie parse fails → 401 | `audit/logs/route.ts:40-43` |
| **Export** | CSV export fetches from same API, inherits same access control | `page.tsx:239-308` |

---

## 7. Traceability Matrix

| Req # | Requirement | Domain | Test Cases | Implementation File(s) |
|---|---|---|---|---|
| 1 | Authentication & Identity Assurance | AUTH, PASS, API | TC-AUTH-01–14, TC-PASS-01–14, TC-API-03–04 | `api-auth.ts`, `schema.prisma:User/MfaToken`, `rate-limiter.ts` |
| 2 | Session Security | SESSION | TC-SESSION-01–12 | `schema.prisma:Session`, `api-auth.ts` |
| 3 | Authorization & Least Privilege | RBAC, SESSION, API | TC-RBAC-01–10, TC-SESSION-01, TC-API-01–02 | `route-permissions-config.ts`, `route-guard.tsx`, `use-route-guard.ts`, `api-auth.ts` |
| 4 | Institution Data Isolation | DATA, INJECT | TC-DATA-07–08, TC-INJECT-01–14 | `api-auth.ts` (institutionId), `sanitize-input.ts` |
| 5 | Employee Profile Protection | RBAC, DATA | TC-RBAC-06, TC-DATA-03–06 | `sanitize-response.ts`, `api-auth.ts` |
| 6 | Employee Creation Integrity | FILE | TC-FILE-01–14 | (File upload/creation routes) |
| 7 | Bulk Upload Security | FILE | TC-FILE-01–14 | (Upload routes) |
| 8 | Workflow Security | API | TC-API-05–06 | `rate-limiter.ts` |
| 9 | Complaint Management Security | RBAC, DATA | TC-RBAC-10, TC-DATA-09 | `route-permissions-config.ts:81-84` |
| 10 | File & Document Security | HEADER, FILE | TC-HEADER-01–14, TC-FILE-01–14 | (File routes) |
| 11 | Error Handling | ERROR | TC-ERROR-01–14 | `error-handler.ts` |
| 12 | Reporting & Export Security | — | — | (Report routes) |
| 13 | Notification Security | NET | TC-NET-01–14 | (Notification routes) |
| 14 | Administrative Security | RBAC, PENTEST | TC-RBAC-01, TC-PENTEST-01–14 | `route-permissions-config.ts:20` |
| 15 | **Audit Trail & Accountability** | **AUDIT** | **TC-AUDIT-01–14** | **`audit-logger.ts`, `audit-db.ts`, `audit/logs/route.ts`, `audit-trail/page.tsx`** |
| 16 | Background Processing Security | API | TC-API-13 | (Job routes) |
| 17 | Direct Object Reference Protection | RBAC | TC-RBAC-06 | `audit-logger.ts:23` (UNAUTHORIZED_ACCESS) |
| 18 | Workflow State Integrity | AUDIT | TC-AUDIT-05–09 | `audit-logger.ts:41-45` |
| 19 | Non-Repudiation | AUDIT | TC-AUDIT-01–14 | `audit-logger.ts`, `audit-wrapper.ts` |
| 20 | Data Integrity Protection | INJECT | TC-INJECT-01–14 | `sanitize-input.ts`, `sanitize-response.ts`, `error-handler.ts` |
| 21 | Audit Log Protection | AUDIT | TC-AUDIT-13 | `audit-db.ts` (INSERT-only), `audit/logs/route.ts` (GET-only) |
| 22 | Government Data Classification | DATA | TC-DATA-01–14 | `sanitize-response.ts` |
| 23 | Restricted Government Data Protection | DATA | TC-DATA-01–14 | `sanitize-response.ts` |
| 24 | Accountability & Traceability | AUDIT | TC-AUDIT-01–14 | `audit-logger.ts`, `audit-wrapper.ts` |
| 25 | Separation of Duties | RBAC | TC-RBAC-01–10 | `route-permissions-config.ts` |
| 26 | Security Monitoring & Detection | PENTEST, AUDIT | TC-PENTEST-01–14, TC-AUDIT-01–14 | `audit-health.ts`, `rate-limiter.ts`, `audit-logger.ts` |
| 27 | Export & Data Extraction Control | — | — | (Export routes) |
| 28 | Administrative Change Control | RBAC | TC-RBAC-01 | `route-permissions-config.ts` |
| 29 | Synchronization Accountability | AUDIT | TC-AUDIT-05–09 | `audit-logger.ts` |
| 30 | Government Information Confidentiality | DATA | TC-DATA-01–14 | `sanitize-response.ts` |

---

## 8. Vulnerability Tracking

| Vuln ID | Test Case | Severity | CVSS | Description | Steps to Reproduce | Impact | Remediation | Status |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

*To be filled during test execution.*

---

## 9. Execution Schedule

| Phase | Test Cases | Start Date | End Date | Responsible |
|---|---|---|---|---|
| Phase 1 | TC-AUTH, TC-RBAC | | | |
| Phase 2 | TC-SESSION, TC-INJECT | | | |
| Phase 3 | TC-CSRF, TC-FILE | | | |
| Phase 4 | TC-PASS, TC-API | | | |
| Phase 5 | TC-DATA, TC-HEADER | | | |
| Phase 6 | TC-ERROR, TC-AUDIT | | | |
| Phase 7 | TC-NET | | | |
| Phase 8 | TC-PENTEST | | | |
| Remediation | All failed tests | | | |
| Re-testing | Corrected items | | | |
| Sign-off | — | | | |

---

## 10. Sign-Off

I hereby certify that Security UAT for the Civil Service Management System (CSMS) has been completed:

- ☐ All critical vulnerabilities resolved
- ☐ All high-severity vulnerabilities resolved or risk-accepted
- ☐ Medium vulnerabilities documented with remediation plan
- ☐ No unmitigated critical or high vulnerabilities
- ☐ Audit trail is immutable, append-only, and access-controlled
- ☐ Audit trail UI at `/dashboard/admin/audit-trail` is verified: read-only, Admin-only, with search/export/filter
- ☐ System is ready for production deployment from a security perspective

| Role | Name | Signature | Date |
|---|---|---|---|
| **Security Officer** | | | |
| **Test Lead** | | | |
| **Application Developer** | | | |
| **Project Manager** | | | |
| **Business Owner** | | | |

---

**End of UAT_Security.md**  
*Based on: `transforms_security_requirements.md`, `Security_requirements_and_Controls.md`, `sample.md`*  
*Codebase verified against: `feat/err01-batch3-wrap-handler` branch*  
*Date: 2026-06-25*

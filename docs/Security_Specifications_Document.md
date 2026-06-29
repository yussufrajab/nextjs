# Security Specifications Document

**System:** Civil Service Management System (CSMS)
**Version:** 1.0
**Date:** 2026-05-29
**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Authentication](#2-authentication)
3. [Authorization and Access Control](#3-authorization-and-access-control)
4. [Session Management](#4-session-management)
5. [API Security](#5-api-security)
6. [Input Validation and Data Protection](#6-input-validation-and-data-protection)
7. [File Upload Security](#7-file-upload-security)
8. [Security Headers and Browser Protection](#8-security-headers-and-browser-protection)
9. [Cryptography and Secrets Management](#9-cryptography-and-secrets-management)
10. [Audit Trail and Logging](#10-audit-trail-and-logging)
11. [Network and Infrastructure Security](#11-network-and-infrastructure-security)
12. [Data at Rest and in Transit](#12-data-at-rest-and-in-transit)
13. [Security Findings and Recommendations](#13-security-findings-and-recommendations)
14. [Compliance Matrix](#14-compliance-matrix)

---

## 1. Executive Summary

The CSMS is a Next.js 14 full-stack application serving Zanzibar's civil service HR operations. It manages sensitive government employee data including personal identifiers, employment records, promotions, and financial information. This document specifies the security controls implemented across authentication, authorization, data protection, file handling, and audit mechanisms, along with identified gaps requiring remediation.

---

## 2. Authentication

### 2.1 Password Hashing

| Property | Value |
|----------|-------|
| Algorithm | bcrypt |
| Salt Rounds | 10 |
| Library | `bcryptjs` v2.4.3 |
| Timing-Safe Comparison | Yes (`bcrypt.compare`) |

**Implementation:** `src/lib/password-utils.ts`

### 2.2 Password Policy

| Requirement | Specification |
|-------------|---------------|
| Minimum Length | 8 characters |
| Complexity | At least one uppercase, lowercase, digit, or special character |
| Strength Evaluation | `zxcvbn` library for crack-time estimation |
| History Check | Last 3 passwords cannot be reused |
| Temporary Passwords | Auto-generated on account creation (must be changed on first login) |

**Implementation:** `src/lib/password-utils.ts`

### 2.3 Login Flow

**Endpoint:** `POST /api/auth/login`

1. Rate-limited at auth tier (5 requests/60s per IP)
2. Input validated with Zod schema
3. Username or email lookup
4. Password verification via bcrypt
5. Account lockout after 5 failed attempts (30-minute window)
6. MFA required if user has an email address (OTP + magic link)
7. Session creation with database-backed token
8. Audit logging of success/failure

**Implementation:** `src/app/api/auth/login/route.ts`

### 2.4 Multi-Factor Authentication (MFA)

| Property | Value |
|----------|-------|
| Method | Email-based OTP (6-digit code) and magic link |
| OTP Expiry | 10 minutes |
| Delivery | SMTP via Nodemailer |
| Fallback | Users without email skip MFA |

**Implementation:** `src/lib/mfa-utils.ts`, `src/lib/email.ts`

### 2.5 Account Lockout

| Property | Value |
|----------|-------|
| Max Failed Attempts | 5 |
| Lockout Duration | 30 minutes |
| Scope | Per-user, per-IP |
| Reset | Automatic after lockout period expires |

**Implementation:** `src/lib/account-lockout-utils.ts`

### 2.6 Password Change

**Endpoint:** `POST /api/auth/change-password`

1. Current password verification required
2. New password complexity validation
3. Password history check (last 3)
4. Same-password check
5. Rate-limited at auth tier
6. Lockout after 5 failed attempts

**Implementation:** `src/app/api/auth/change-password/route.ts`

---

## 3. Authorization and Access Control

### 3.1 Role-Based Access Control (RBAC)

The system implements 9 distinct roles:

| Role | Code | Description |
|------|------|-------------|
| Employee | `EMPLOYEE` | Basic employee access to own records |
| Human Resource Officer | `HRO` | Institution-level HR operations |
| Head of HRMD | `HHRMD` | Department-level HR management |
| HRMO Officer | `HRMO` | Ministry-level HR operations |
| Disciplinary Officer | `DO` | Disciplinary case management |
| Civil Service Commission Secretary | `CSCS` | Commission-level oversight |
| HR Planning Officer | `HRRP` | HR resource planning |
| Planning Officer | `PO` | Strategic planning |
| Administrator | `Admin` | System administration |

### 3.2 Route Protection (Middleware)

**Implementation:** `middleware.ts`

- Role-based route protection for all dashboard pages
- Pattern-based URL matching with allowed role arrays
- Default-deny policy: unmatched routes are blocked
- Unauthenticated users redirected to login
- Unauthorized users redirected to dashboard with error
- Blocked access attempts logged to audit trail

### 3.3 API Route Authorization

**Implementation:** `src/lib/api-auth.ts`

| Function | Purpose |
|----------|---------|
| `verifyAuth()` | Reads auth state from cookie, verifies user exists and is active in database |
| `withAuth()` | Higher-order function wrapping API routes with authentication and optional RBAC |

- Role checks are case-insensitive
- 28 API routes protected with `withAuth` or `verifyAuth`

### 3.4 Route Permission Matrix

**Implementation:** `src/lib/route-permissions.ts`

Route permissions are defined as URL patterns with associated allowed roles. The same configuration is used both in middleware (server-side) and for client-side navigation guards.

---

## 4. Session Management

### 4.1 Session Model

**Database Table:** `Session`

| Field | Type | Description |
|-------|------|-------------|
| `sessionToken` | String (unique) | 64-character hex token from `crypto.randomBytes(32)` |
| `userId` | String | Foreign key to User |
| `ipAddress` | String | Client IP address |
| `userAgent` | String | Client browser/OS fingerprint |
| `deviceInfo` | String | Parsed device information |
| `location` | String | Geographic location |
| `createdAt` | DateTime | Session creation timestamp |
| `lastActivity` | DateTime | Last activity timestamp |
| `expiresAt` | DateTime | Session expiration timestamp |
| `isSuspicious` | Boolean | Suspicious activity flag |

### 4.2 Session Lifecycle

| Property | Value |
|----------|-------|
| Token Generation | `crypto.randomBytes(32).toString('hex')` |
| Session Expiry | 24 hours |
| Inactivity Timeout | 2 hours |
| Warning Before Timeout | 5 minutes |
| Max Concurrent Sessions | 3 per user |
| Excess Session Policy | Login rejected with `SESSION_LIMIT_REACHED` |

**Implementation:** `src/lib/session-manager.ts`, `src/lib/session-timeout-utils.ts`

### 4.3 Auth Cookie

| Property | Value |
|----------|-------|
| Name | `auth-storage` |
| Path | `/` |
| Expiry | 7 days |
| SameSite | Strict |

**Implementation:** `src/store/auth-store.ts`, `src/lib/auth-cookie-helper.ts`

---

## 5. API Security

### 5.1 Rate Limiting

**Implementation:** `src/lib/rate-limiter.ts`

Redis-based rate limiting with configurable tiers:

| Tier | Requests | Window | Applies To |
|------|----------|--------|------------|
| `auth` | 5 | 60s | Login, password change |
| `write` | 30 | 60s | Create/update operations |
| `read` | 100 | 60s | Read-only queries |
| `upload` | 10 | 60s | File uploads |
| `download` | 60 | 60s | File downloads |

**Response Headers:**
- `X-RateLimit-Limit`: Maximum requests in window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Window reset timestamp

### 5.2 CSRF Protection

**Implementation:** `src/lib/csrf-utils.ts`

| Property | Value |
|----------|-------|
| Pattern | Double-submit cookie |
| Token Size | 32 bytes (`crypto.randomBytes`) |
| Signing | HMAC-SHA256 |
| Comparison | Timing-safe (`crypto.timingSafeEqual`) |
| Cookie Secure | True (production) |
| Cookie SameSite | Strict |
| Cookie HttpOnly | False (required for JS access) |

### 5.3 Input Validation

**Implementation:** `src/lib/api-schemas.ts`

- Zod schema validation for request bodies
- `validateRequest()` helper function for type-safe validation
- Schemas defined for employee queries, file uploads, notifications, dashboard metrics

### 5.4 CORS Configuration

| Property | Value |
|----------|-------|
| Scope | Per-route (not global) |
| Allowed Origins | Configured via `ALLOWED_ORIGINS` env var |
| Current Setting | `http://localhost:9002` |

---

## 6. Input Validation and Data Protection

### 6.1 Database Security

| Property | Value |
|----------|-------|
| ORM | Prisma Client v6.19.1 |
| SQL Injection Prevention | Parameterized queries (automatic via Prisma) |
| Raw SQL | Parameterized with `$1, $2, ...` placeholders (audit DB) |

**Implementation:** `prisma/schema.prisma`, `src/lib/audit-db.ts`

### 6.2 Response Sanitization

**Implementation:** `src/lib/sanitize-response.ts`

24 sensitive fields stripped from API responses:
- Password hashes
- Session tokens
- MFA secrets
- Internal metadata fields

Helper functions: `sanitizeUser()`, `sanitizeUsers()`

### 6.3 Sensitive Data in Logs

- Session tokens masked for logging
- Structured logging via `pino` with component-specific child loggers
- Log files written to `/var/log/csms/app/app.log` in production

---

## 7. File Upload Security

### 7.1 Validation Pipeline

**Implementation:** `src/lib/file-validation.ts`

5-stage validation pipeline:

| Stage | Check | Details |
|-------|-------|---------|
| 1 | Extension Blocklist | 18 blocked extensions (.exe, .bat, .sh, .php, .asp, etc.) |
| 2 | MIME Type Blocklist | 12 blocked MIME types |
| 3 | Context Allowlist | PDF, DOC/DOCX, CSV, images per context |
| 4 | Magic-Byte Verification | Detects actual file type from header bytes |
| 5 | ClamAV Scanning | TCP INSTREAM protocol malware scanning |

### 7.2 File Size Limits

| Context | Max Size |
|---------|----------|
| Default | 1 MB |
| Profile Photos | 1 MB |
| Documents | 1 MB |
| Certificates | 1 MB |

### 7.3 ClamAV Integration

**Implementation:** `src/lib/clamav.ts`

| Property | Value |
|----------|-------|
| Protocol | TCP INSTREAM |
| Configuration | `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMAV_TIMEOUT` |
| Enabled | `CLAMAV_ENABLED=true` |
| Fail Policy | Fail-closed (uploads rejected if ClamAV unavailable) |

### 7.4 Object Storage (MinIO)

**Implementation:** `src/lib/minio.ts`

| Property | Value |
|----------|-------|
| Object Key Format | `{timestamp}-{random}-{sanitized-filename}` |
| Presigned URL Expiry | 24 hours (configurable) |
| Access Control | Presigned URLs for download, direct upload to bucket |

---

## 8. Security Headers and Browser Protection

### 8.1 HTTP Security Headers

**Implementation:** `next.config.ts`

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` (production) | Force HTTPS |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unnecessary APIs |
| `X-Permitted-Cross-Domain-Policies` | `none` | Restrict Flash/PDF policies |
| `Cross-Origin-Embedder-Policy` | `require-corp` | Cross-origin isolation |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | Cross-origin isolation |
| `X-Powered-By` | Removed | Hide framework fingerprint |

### 8.2 Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https://placehold.co https://*.googleusercontent.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://generativelanguage.googleapis.com http://localhost:* https://localhost:*;
frame-src 'self' https://accounts.google.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self';
```

---

## 9. Cryptography and Secrets Management

### 9.1 Cryptographic Operations

| Operation | Algorithm | Implementation |
|-----------|-----------|----------------|
| Password Hashing | bcrypt (10 rounds) | `src/lib/password-utils.ts` |
| Session Tokens | `crypto.randomBytes(32)` | `src/lib/session-manager.ts` |
| CSRF Tokens | `crypto.randomBytes(32)` + HMAC-SHA256 | `src/lib/csrf-utils.ts` |
| Token Comparison | `crypto.timingSafeEqual` | `src/lib/csrf-utils.ts` |

### 9.2 Environment Variables

| Variable | Purpose | Sensitivity |
|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL connection string | Critical |
| `MINIO_ACCESS_KEY` | MinIO access credential | Critical |
| `MINIO_SECRET_KEY` | MinIO secret credential | Critical |
| `SMTP_USER` | Email service account | High |
| `SMTP_PASS` | Email service password | High |
| `CSRF_SECRET` | CSRF token signing key | Critical |
| `HRIMS_API_TOKEN` | External HRIMS integration token | High |
| `GEMINI_API_KEY` | Google AI service key | High |

### 9.3 Secret Storage Files

| File | Location | Status |
|------|----------|--------|
| `.env` | Project root | Contains production credentials |
| `.env.local` | Project root | Contains API keys and service credentials |
| `.env.test` | Project root | Contains test environment credentials |
| `.env.backup` | `backedDB/env/` | Contains backup credentials |

---

## 10. Audit Trail and Logging

### 10.1 Audit Event Types

**Implementation:** `src/lib/audit-logger.ts`

| Category | Events |
|----------|--------|
| Authentication | `LOGIN_SUCCESS`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_CHANGE`, `MFA_*` |
| Authorization | `UNAUTHORIZED_ACCESS`, `ROLE_VIOLATION` |
| Employee Operations | `EMPLOYEE_CREATED`, `EMPLOYEE_UPDATED`, `EMPLOYEE_DELETED` |
| Request Workflow | `REQUEST_APPROVED`, `REQUEST_REJECTED`, `REQUEST_RETURNED` |
| File Operations | `FILE_UPLOADED`, `FILE_DOWNLOADED`, `FILE_DELETED` |
| Session | `SESSION_CREATED`, `SESSION_TERMINATED`, `SESSION_EXPIRED` |

### 10.2 Severity Levels

| Level | Code | Description |
|-------|------|-------------|
| INFO | 0 | Normal operations |
| WARNING | 1 | Suspicious activity, policy violations |
| ERROR | 2 | Failed operations, system errors |
| CRITICAL | 3 | Security breaches, data compromise |

### 10.3 Audit Database

**Implementation:** `src/lib/audit-db.ts`

| Property | Value |
|----------|-------|
| Storage | Dedicated `audit.audit_log` PostgreSQL table |
| Partitioning | Monthly table partitions |
| Query Method | Parameterized raw SQL (pg Pool) |
| IP Storage | PostgreSQL `inet` type with fallback to NULL |

### 10.4 Structured Application Logging

**Implementation:** `src/lib/logger.ts`

| Property | Value |
|----------|-------|
| Library | `pino` v10.3.1 |
| Format | JSON (production), pretty-printed (development) |
| Output | `/var/log/csms/app/app.log` (production) |
| Component Loggers | auth, db, email, file, session, rate-limit, csrf, worker, cron |

---

## 11. Network and Infrastructure Security

### 11.1 Application Server

| Property | Value |
|----------|-------|
| Framework | Next.js 14 |
| Port | 9002 |
| Process Manager | PM2 (ecosystem.config.js) |
| TLS Termination | Reverse proxy (nginx/external) |

### 11.2 Database

| Property | Value |
|----------|-------|
| Engine | PostgreSQL |
| ORM | Prisma Client v6.19.1 |
| Connection | Via `DATABASE_URL` environment variable |

### 11.3 Object Storage

| Property | Value |
|----------|-------|
| Service | MinIO |
| Protocol | S3-compatible |
| Access | Presigned URLs with configurable expiry |

### 11.4 Message Queue

| Property | Value |
|----------|-------|
| Service | Redis (via ioredis) |
| Queue Library | BullMQ v5.66.4 |
| Purpose | Background job processing, rate limiting |

---

## 12. Data at Rest and in Transit

### 12.1 Data Classification

| Category | Examples | Storage |
|----------|----------|---------|
| Critical | Passwords, session tokens, API keys | Hashed (bcrypt) or encrypted |
| Sensitive PII | ZAN IDs, phone numbers, emails, ZSSF numbers, payroll numbers | Plaintext in database |
| Confidential | Employee records, promotion requests, disciplinary actions | Plaintext in database |
| Internal | Audit logs, system configuration | Plaintext in database |

### 12.2 Encryption Status

| Data State | Protection |
|------------|------------|
| Passwords at rest | bcrypt hashed |
| Session tokens at rest | Cryptographically random, database-stored |
| PII at rest | **Not encrypted** |
| Data in transit | HTTPS (via reverse proxy / HSTS) |
| File storage | MinIO server-side (configuration-dependent) |

---

## 13. Security Findings and Recommendations

### 13.1 Critical Findings

| ID | Finding | Location | Recommendation |
|----|---------|----------|----------------|
| C-01 | Auth cookie not `httpOnly` or `Secure` -- entire auth state readable by JavaScript, vulnerable to XSS exfiltration | `src/store/auth-store.ts:40`, `src/lib/auth-cookie-helper.ts:39` | Set `httpOnly: true` and `secure: true` on auth cookies. Use server-side session validation in middleware instead of trusting client-side cookie. |
| C-02 | Middleware trusts client-side `auth-storage` cookie without server-side session validation -- cookie forgery bypasses authentication | `middleware.ts:241-266` | Validate session tokens against the database in middleware. Do not rely on client-set cookie contents for authentication decisions. |
| C-03 | CSRF protection applied to only 2 of 50+ state-changing API routes | `src/app/api/files/upload/route.ts`, `src/app/api/test/csrf/route.ts` | Apply CSRF protection middleware to all POST, PUT, PATCH, DELETE routes. |
| C-04 | CSRF secret uses unchanged default value | `.env:38`, `src/lib/csrf-utils.ts:19` | Generate and rotate a strong, unique CSRF secret for each environment. |
| C-05 | Production credentials stored in `.env`, `.env.local`, `.env.test`, `.env.backup` files on disk | Project root, `backedDB/env/` | Move secrets to a vault (HashiCorp Vault, AWS Secrets Manager). Rotate all exposed credentials immediately. |

### 13.2 High Findings

| ID | Finding | Location | Recommendation |
|----|---------|----------|----------------|
| H-01 | MFA bypassed for users without email addresses | `src/app/api/auth/login/route.ts:325` | Enforce alternative MFA method (TOTP, SMS) for all users. |
| H-02 | Logout and change-password routes accept `userId` from request body without authentication verification | `src/app/api/auth/logout/route.ts`, `src/app/api/auth/change-password/route.ts` | Require `withAuth` wrapper and derive `userId` from validated session, not request body. |
| H-03 | MinIO access key logged in plaintext | `src/lib/minio.ts:11-18` | Remove credential logging. Mask sensitive values in all log output. |
| H-04 | CSP includes `'unsafe-eval'` and `'unsafe-inline'` for scripts | `next.config.ts:59` | Remove `unsafe-eval` and `unsafe-inline`. Use nonces or hashes for inline scripts. |
| H-05 | No field-level encryption for sensitive PII | `prisma/schema.prisma` | Implement application-level encryption for ZAN IDs, phone numbers, emails, and financial identifiers. |
| H-06 | SMTP TLS certificate validation disabled (`rejectUnauthorized: false`) | `src/lib/email.ts:32` | Enable strict TLS certificate validation for production SMTP connections. |
| H-07 | `Math.random()` used for temporary password generation (not cryptographically secure) | `src/lib/password-utils.ts:152-153` | Use `crypto.randomInt()` or `crypto.randomBytes()` for all password generation. |

### 13.3 Medium Findings

| ID | Finding | Location | Recommendation |
|----|---------|----------|----------------|
| M-01 | Rate limiting applied to only 8 API routes | Various route files | Apply rate limiting middleware to all API routes with appropriate tiers. |
| M-02 | Rate limiter fails open when Redis unavailable | `src/lib/rate-limiter.ts:91-93` | Implement fallback in-memory rate limiting or fail-closed policy for sensitive routes. |
| M-03 | No global CORS configuration | Only `src/app/api/external/employees/route.ts` | Add global CORS middleware with restrictive defaults. |
| M-04 | Sensitive data response sanitization coverage unclear | `src/lib/sanitize-response.ts` | Audit all API routes to ensure `sanitizeUser()` is consistently applied. |

---

## 14. Compliance Matrix

| Control Area | Implemented | Gaps |
|--------------|-------------|------|
| Authentication | bcrypt, MFA, account lockout | MFA bypass for email-less users |
| Authorization | RBAC with 9 roles, route protection | Missing `withAuth` on several routes |
| Session Management | Database-backed, 2h timeout, max 3 concurrent | Cookie security flags incomplete |
| Input Validation | Zod schemas | Inconsistent coverage across routes |
| CSRF Protection | HMAC-SHA256 double-submit | Only 2 routes protected |
| Security Headers | Comprehensive (HSTS, CSP, X-Frame, etc.) | CSP weakened by unsafe-eval/inline |
| File Upload Security | 5-stage validation + ClamAV | None significant |
| Audit Trail | Comprehensive event logging | None significant |
| Secrets Management | Environment variables | Hardcoded defaults, file-based storage |
| Data Encryption | Password hashing (bcrypt) | PII stored in plaintext |
| Rate Limiting | Redis-based, 5 tiers | Limited route coverage |
| Logging | Structured JSON via pino | Credential leakage in MinIO logger |

---

*Document generated: 2026-05-29*
*Next review: Quarterly or upon significant system changes*

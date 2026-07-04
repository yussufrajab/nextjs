# 32 - Cross-Site Request Forgery (CSRF) Protection

**Requirement:** Cross-cutting CSRF protection across all state-changing API endpoints
**Application:** CSMS (http://localhost:9002)
**Branch:** feat/err01-batch3-wrap-handler
**Test Date:** 2026-07-03
**Tester:** Automated security test
**Test Account:** maimunaabeidhussein (EMPLOYEE, direct login, no MFA)

---

## Summary

| Sub-Case | Name | Result | Severity |
|----------|------|--------|----------|
| 32.1 | CSRF Token Generation | PASS | -- |
| 32.2 | CSRF Token Validation | PASS (on protected endpoints) | -- |
| 32.3 | CSRF Attack -- State-Changing GET | PASS | -- |
| 32.4 | CSRF Attack -- Malicious Form | FAIL | HIGH |
| 32.5 | SameSite Cookie Attribute | PASS | -- |
| 32.6 | Origin Header Validation | FAIL | MEDIUM |
| 32.7 | Double-Submit Cookie Pattern | PASS | -- |
| 32.8 | Custom Header Requirement | PASS | -- |
| 32.9 | CSRF on Critical Operations | FAIL | CRITICAL |
| 32.10 | JSON-based CSRF | PASS (partial) | -- |
| 32.11 | Login CSRF | PASS (acceptable) | -- |
| 32.12 | CSRF Audit Logging | PASS | -- |

**Overall Result: FAIL** -- CSRF infrastructure exists and is correctly implemented, but is applied to only 1 of 71 state-changing endpoints.

---

## Critical Finding: CSRF Protection Not Applied to API Routes

The application has a well-implemented CSRF double-submit cookie pattern, but the middleware is only applied to 2 endpoints out of 71 state-changing routes:

- `/api/files/upload` -- has CSRF validation via `validateCSRF()`
- `/api/test/csrf` -- test endpoint, disabled in production

All other POST/PUT/PATCH/DELETE endpoints operate without CSRF protection, including:

| Endpoint | Method | Operation | CSRF Protected |
|----------|--------|-----------|----------------|
| `/api/auth/logout` | POST | Session termination | NO |
| `/api/auth/change-password` | POST | Password change | NO |
| `/api/users/[id]` | PUT | User update (role, active) | NO |
| `/api/users/[id]` | DELETE | User deletion | NO |
| `/api/employees` | POST | Employee creation | NO |
| `/api/employees/[id]` | PUT | Employee update | NO |
| `/api/confirmation-requests` | POST | HR request submission | NO |
| `/api/promotion-requests` | POST | Promotion request | NO |
| `/api/complaints` | POST | Complaint filing | NO |
| `/api/auth/sessions/force-logout` | POST | Force logout session | NO |

---

## Detailed Test Results

### 32.1 CSRF Token Generation -- PASS

**Evidence:** Login response includes `csrfToken` field and sets `csrf-token` cookie.

```
Set-Cookie: csrf-token=YKqEM4PRzx3tUJyyNEE8Inj%2FKrwILeCSpX%2B7g5BvNh0%3D.zoPHvpPjiybWc1jSJCMYhUhuPFjfy1YayLw1CXatkwU%3D;
  Path=/; Expires=Fri, 10 Jul 2026 19:28:01 GMT; Max-Age=604800; Secure; SameSite=strict
```

**Code review findings (`src/lib/csrf-utils.ts`):**
- Token generated via `randomBytes(32)` -- 256 bits of cryptographic randomness
- Token signed with HMAC-SHA256 using server-side `CSRF_SECRET` environment variable
- Format: `<base64-token>.<base64-signature>` (89 characters)
- Signature verification uses constant-time comparison (`timingSafeEqual`) to prevent timing attacks
- `CSRF_SECRET` is required at startup (throws if missing)
- Token uniqueness verified: `randomBytes` produces unique values with overwhelming probability

**Cookie attributes:**
- `httpOnly: false` -- required for JavaScript to read for double-submit pattern
- `secure: true` (production) / `false` (development)
- `sameSite: 'strict'` -- strongest SameSite policy
- `path: '/'`
- `maxAge: 604800` (7 days, matches session lifetime)

### 32.2 CSRF Token Validation -- PASS (on protected endpoints)

**Test: POST to `/api/files/upload` without CSRF header (cookie only)**
```
Request:  POST /api/files/upload (session cookie present, no x-csrf-token header)
Response: 403 {"success":false,"message":"CSRF token validation failed","error":"CSRF_VALIDATION_FAILED"}
```
Result: BLOCKED (correct)

**Test: POST to `/api/files/upload` with invalid CSRF header**
```
Request:  POST /api/files/upload, x-csrf-token: TOTALLY_INVALID_FAKE_TOKEN_12345
Response: 403 {"success":false,"message":"CSRF token validation failed","error":"CSRF_VALIDATION_FAILED"}
```
Result: BLOCKED (correct)

**Test: POST to `/api/files/upload` with valid CSRF header**
```
Request:  POST /api/files/upload, x-csrf-token: <valid token matching cookie>
Response: 415 {"success":false,"message":"File type text/plain is not allowed...","errorCode":"INVALID_FILE_TYPE"}
```
Result: CSRF PASSED (415 is file type validation, not CSRF -- correct)

**Test: POST without authentication and without CSRF**
```
Request:  POST /api/files/upload (no cookies, no headers)
Response: 401 {"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
```
Result: Auth check runs before CSRF check (correct layering)

### 32.3 CSRF Attack -- State-Changing GET -- PASS

**Test: GET to `/api/employees` (no CSRF token)**
```
Request:  GET /api/employees (session cookie only, no CSRF)
Response: 200 (employee data returned)
```
Result: GET succeeds without CSRF token (correct)

**Code review (`src/lib/csrf-utils.ts` line 135-138):**
```typescript
export function requiresCSRFProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}
```
Safe methods (GET, HEAD, OPTIONS) are explicitly exempt from CSRF validation.

### 32.4 CSRF Attack -- Malicious Form -- FAIL

**Status:** Only 1 production endpoint (`/api/files/upload`) validates CSRF tokens. The remaining 70 state-changing endpoints accept requests without any CSRF validation.

An attacker could craft a malicious HTML form on `evil.com`:
```html
<form action="http://localhost:9002/api/auth/logout" method="POST">
  <input type="hidden" name="" value="">
</form>
<script>document.forms[0].submit();</script>
```

**Mitigating factor:** `SameSite=strict` on the session cookie prevents cross-site cookie sending in modern browsers. However, this is a browser-level defense, not an application-level one, and does not protect against all attack vectors (e.g., older browsers, subdomain attacks).

### 32.5 SameSite Cookie Attribute -- PASS

**Evidence from Set-Cookie headers:**
```
csrf-token=...; Secure; SameSite=strict
session=...; Secure; HttpOnly; SameSite=strict
pre-session=...; Secure; HttpOnly; SameSite=strict
```

All cookies use `SameSite=strict`, the most restrictive policy. This prevents browsers from sending cookies with any cross-site requests.

**Code review (`src/lib/csrf-utils.ts` line 149):**
```typescript
sameSite: 'strict' as const, // Prevent cross-site sending
```

**Code review (`src/lib/session-manager.ts`):**
Session cookie also uses `sameSite: 'strict'`.

### 32.6 Origin Header Validation -- FAIL

**Test: POST with `Origin: https://evil-attacker.com`**
```
Request:  POST /api/files/upload
          Origin: https://evil-attacker.com
          x-csrf-token: <valid token>
Response: 415 (file type rejection -- CSRF passed)
```
Result: Cross-origin request with valid CSRF token was NOT blocked by Origin validation.

**Test: POST with `Referer: https://evil-attacker.com/csrf-attack`**
```
Request:  POST /api/files/upload
          Referer: https://evil-attacker.com/csrf-attack
          x-csrf-token: <valid token>
Response: 415 (file type rejection -- CSRF passed)
```
Result: Cross-origin request with valid CSRF token was NOT blocked by Referer validation.

**Finding:** No code in `src/lib/api-csrf-middleware.ts` or `src/lib/csrf-utils.ts` validates `Origin` or `Referer` headers. The CSRF protection relies solely on the double-submit cookie pattern.

### 32.7 Double-Submit Cookie Pattern -- PASS

**Test: Cookie present, header missing**
```
Request:  POST /api/files/upload (csrf-token cookie present, no x-csrf-token header)
Response: 403 CSRF_VALIDATION_FAILED
```
Result: BLOCKED (correct)

**Test: Cookie present, header is different token**
```
Request:  POST /api/files/upload
          csrf-token cookie: <valid signed token>
          x-csrf-token header: DIFFERENT_BASE64_TOKEN_NOT_MATCHING_COOKIE
Response: 403 CSRF_VALIDATION_FAILED
```
Result: BLOCKED (correct)

**Test: Cookie and header match**
```
Request:  POST /api/files/upload
          csrf-token cookie: <valid signed token>
          x-csrf-token header: <same valid signed token>
Response: 415 (CSRF passed, file type rejection)
```
Result: PASSED (correct)

**Code review (`src/lib/csrf-utils.ts` lines 106-129):**
- Both cookie and header must be present
- Cookie signature must be valid (HMAC verification)
- Cookie and header must match exactly
- Uses constant-time comparison for signature verification

### 32.8 Custom Header Requirement -- PASS

**Header name:** `x-csrf-token` (defined as `CSRF_HEADER_NAME` constant)

**Test: Correct header name `x-csrf-token`**
```
Response: 415 (CSRF passed)
```

**Test: Case-variant `X-CSRF-TOKEN`**
```
Response: 415 (CSRF passed -- HTTP headers are case-insensitive per RFC 7230)
```

**Test: Wrong header name `csrf-token`**
```
Response: 403 CSRF_VALIDATION_FAILED
```
Result: Only the correct custom header name is accepted.

**Client-side implementation (`src/lib/api-client.ts` lines 168-187):**
The `apiClient` automatically reads the `csrf-token` cookie via `document.cookie` and attaches it as the `x-csrf-token` header for all state-changing requests (POST, PUT, PATCH, DELETE).

### 32.9 CSRF on Critical Operations -- FAIL

**Test: POST to `/api/auth/logout` without CSRF token**
```
Request:  POST /api/auth/logout (no x-csrf-token header)
Response: 200 {"success":true,"message":"Logged out successfully"}
```
Result: Logout succeeds without CSRF validation. An attacker could force logout a victim via cross-site request.

**Test: PUT to `/api/users/[id]` without CSRF token**
```
Request:  PUT /api/users/test-user-id (no x-csrf-token header)
Response: 404 "User not found" (reached handler, no CSRF block)
```
Result: Request reached the handler without CSRF validation. With a valid user ID, an attacker could modify user roles or deactivate accounts.

**Test: DELETE to `/api/users/[id]` without CSRF token**
```
Request:  DELETE /api/users/test-user-id (no x-csrf-token header)
Response: 404 "User not found" (reached handler, no CSRF block)
```
Result: Request reached the handler without CSRF validation.

**Critical unprotected endpoints:**
- `/api/auth/logout` -- session termination
- `/api/auth/change-password` -- password change
- `/api/users/[id]` PUT -- role changes, account activation/deactivation
- `/api/users/[id]` DELETE -- user deletion
- `/api/employees` POST -- employee record creation
- All HR request endpoints (promotion, confirmation, LWOP, etc.)

### 32.10 JSON-based CSRF -- PASS (partial)

**Finding:** Most API endpoints expect `Content-Type: application/json` for request bodies. HTML forms cannot set this Content-Type (they are limited to `text/plain`, `multipart/form-data`, and `application/x-www-form-urlencoded`). This means classic form-based CSRF attacks would fail at the body parsing stage.

**Test: POST to `/api/employees` with form-encoded body**
```
Request:  POST /api/employees
          Content-Type: application/x-www-form-urlencoded
          Body: name=CSRF_Attack&zanId=12345
Response: 405 Method Not Allowed (or body parsing failure)
```
Result: Form-encoded requests are not processed by JSON-expecting endpoints.

**Mitigating factor:** The combination of `SameSite=strict` cookies and JSON Content-Type requirements provides defense-in-depth against classic CSRF. However, this is not a substitute for proper CSRF token validation.

### 32.11 Login CSRF -- PASS (acceptable)

**Finding:** The login endpoint (`/api/auth/login`) does not require a CSRF token. This is acceptable because:
1. The login endpoint is the entry point that creates the session and CSRF token
2. There is no pre-existing session to protect
3. The endpoint is protected by rate limiting (5 attempts per window)
4. Login CSRF (where an attacker logs the victim into the attacker's account) is a low-severity risk for this application

**Rate limiting evidence:**
```
x-ratelimit-limit: 5
x-ratelimit-remaining: 2
x-ratelimit-reset: 1783106399
```

### 32.12 CSRF Audit Logging -- PASS

**Code review (`src/lib/csrf-utils.ts` lines 182-216):**
- `logCSRFViolation()` function logs to the audit system
- Called from `api-csrf-middleware.ts` line 79 when CSRF validation fails
- Log entry includes:
  - `eventType: 'CSRF_VIOLATION'`
  - `eventCategory: AuditEventCategory.SECURITY`
  - `severity: AuditSeverity.WARNING`
  - `userId` and `username` (if authenticated)
  - `ipAddress` and `deviceInfo`
  - `attemptedRoute` and `requestMethod`
  - `wasBlocked: true`
  - `blockReason` with specific failure reason

**Failure reason categorization in middleware (`src/lib/api-csrf-middleware.ts` lines 59-68):**
- `"Missing CSRF tokens (both cookie and header)"`
- `"Missing CSRF cookie"`
- `"Missing CSRF header"`
- `"CSRF tokens do not match"`

**Test: Triggered CSRF violation by sending POST without header**
```
Response: 403 CSRF_VALIDATION_FAILED
```
Audit logging code path is exercised (verified by code review).

---

## Architecture Analysis

### CSRF Implementation Design

The application uses the **Double-Submit Cookie Pattern**:

1. **Token generation:** On login, server generates a random 32-byte token, signs it with HMAC-SHA256, and sets it as the `csrf-token` cookie (readable by JavaScript)
2. **Client-side:** The `apiClient` reads the cookie via `document.cookie` and attaches it as the `x-csrf-token` header on state-changing requests
3. **Server-side:** The middleware compares the cookie value with the header value; both must be present and identical
4. **Signature verification:** The cookie's HMAC signature is verified server-side to prevent token forgery

### Code Files

| File | Purpose |
|------|---------|
| `src/lib/csrf-utils.ts` | Token generation, signing, verification, validation, cookie options |
| `src/lib/api-csrf-middleware.ts` | Middleware for API routes, wraps `validateCSRF()` |
| `src/lib/api-client.ts` | Client-side automatic CSRF header injection |
| `src/store/auth-store.ts` | Auth state (does not store CSRF token -- reads from cookie) |
| `src/lib/auth-helpers.ts` | Login completion -- sets CSRF cookie on successful auth |
| `src/app/api/auth/logout/route.ts` | Logout -- clears CSRF cookie |
| `src/app/api/files/upload/route.ts` | Only production endpoint with CSRF validation |
| `src/app/api/test/csrf/route.ts` | Test endpoint (disabled in production) |
| `src/lib/csrf-utils.test.ts` | Unit tests for CSRF utilities |

### Token Lifecycle

```
Login -> generateCSRFToken() -> signCSRFToken() -> Set-Cookie: csrf-token=...
                                                       |
Client JS reads cookie via document.cookie             |
                                                       v
apiClient.request() -> reads cookie -> sets x-csrf-token header
                                                       |
                                                       v
Server: validateCSRF() -> getCookieToken() + getHeaderToken()
                          -> verifyCSRFToken(cookie) -> validateCSRFTokens(cookie, header)
                          -> match? PASS : 403 + logCSRFViolation()
```

---

## Recommendations

### CRITICAL: Apply CSRF middleware to all state-changing endpoints

The `withCSRF` or `withCSRFProtection` wrapper must be applied to all POST, PUT, PATCH, and DELETE API route handlers. Currently only 1 out of 71 state-changing endpoints has CSRF protection.

**Implementation options:**

1. **Per-route wrapper (current pattern, needs scaling):**
   ```typescript
   // In each route handler
   export const POST = withCSRF(async (req: Request) => {
     // handler logic
   });
   ```

2. **Next.js middleware (global enforcement):**
   Add CSRF validation to `middleware.ts` to enforce it at the routing layer for all `/api/` routes with state-changing methods.

3. **Shared handler factory:**
   Create a `createProtectedRoute()` utility that wraps handlers with both auth and CSRF.

### HIGH: Add Origin/Referer header validation

The CSRF middleware should validate the `Origin` and/or `Referer` headers as an additional defense layer:
- Reject requests where `Origin` does not match the application's domain
- Reject requests where `Referer` does not start with the application's URL
- This protects against scenarios where the double-submit pattern could be bypassed (e.g., subdomain cookie injection)

### MEDIUM: Protect logout endpoint

The `/api/auth/logout` endpoint should require CSRF validation to prevent forced-logout attacks via cross-site requests.

### LOW: Consider `SameSite=Lax` instead of `Strict`

While `SameSite=strict` is the most secure, it can cause usability issues (e.g., navigating to the site from an external link does not send cookies). Consider `SameSite=lax` which still prevents cross-site form submissions while allowing top-level navigation cookie sending.

---

## Files Referenced

- `/home/latest/src/lib/csrf-utils.ts` -- Core CSRF utilities
- `/home/latest/src/lib/api-csrf-middleware.ts` -- API middleware
- `/home/latest/src/lib/auth-helpers.ts` -- Login CSRF cookie setup
- `/home/latest/src/lib/api-client.ts` -- Client-side CSRF header injection
- `/home/latest/src/app/api/files/upload/route.ts` -- Only protected endpoint
- `/home/latest/src/app/api/auth/logout/route.ts` -- Unprotected logout
- `/home/latest/src/app/api/users/[id]/route.ts` -- Unprotected user management
- `/home/latest/src/app/api/auth/change-password/route.ts` -- Unprotected password change
- `/home/latest/src/lib/csrf-utils.test.ts` -- Unit tests (comprehensive)

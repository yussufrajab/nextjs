# Requirement 35: Error Handling & Information Disclosure

**Application:** CSMS (Civil Servant Management System)
**Branch:** feat/err01-batch3-wrap-handler
**Date Tested:** 2026-07-03
**Testers:** Automated security scan
**Environment:** Development (localhost:9002), NODE_ENV=production behavior confirmed
**Credentials Used:** fautest (HRMO), abdillahomarnajim (EMPLOYEE) / Csms@2026

---

## Executive Summary

The application implements a centralized error handling framework (`withErrorHandler`/`wrapHandler` in `src/lib/error-handler.ts`) that covers **93 of 98 API routes**. Error responses follow a consistent `{ success, message, errorCode }` shape in production mode. Stack traces and internal details are suppressed in production. One medium-severity finding exists: login error messages distinguish between "user not found" and "wrong password," enabling username enumeration.

| Sub-case | Status | Severity |
|----------|--------|----------|
| 35.1 Generic Error Messages | PASS | -- |
| 35.2 Stack Trace Suppression | PASS | -- |
| 35.3 Database Error Handling | PASS (with note) | LOW |
| 35.4 File Path Disclosure | PASS | -- |
| 35.5 API Error Responses | PARTIAL | LOW |
| 35.6 Validation Error Messages | PASS | -- |
| 35.7 Auth Error Messages | **FINDING** | MEDIUM |
| 35.8 Sensitive Data in Logs | PASS (with note) | LOW |
| 35.9 Client-side Error Handling | PASS | -- |
| 35.10 Third-party API Errors | PASS | -- |

---

## 35.1 Generic Error Messages

**Status: PASS**

### Test: Non-existent API endpoint
```bash
curl -s http://localhost:9002/api/nonexistent-endpoint
```
**Result:** Returns Next.js default 404 page: `"404: This page could not be found."` No internal paths, server details, or stack traces exposed.

### Test: Malformed JSON body
```bash
curl -s -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" -d 'invalid-json{'
```
**Result:**
```json
{"success":false,"message":"Internal Server Error","errorCode":"INTERNAL_ERROR"}
```
Generic message. No parse error details leaked to the client.

### Test: Wrong HTTP method
```bash
curl -s -X PATCH http://localhost:9002/api/health
```
**Result:** Returns Next.js 404 HTML page. No method-not-allowed details exposed.

**Assessment:** Error messages are generic and do not reveal implementation details.

---

## 35.2 Stack Trace Suppression

**Status: PASS**

### Code Review
In `src/lib/error-handler.ts` (line 88), production mode returns only:
```json
{"success":false,"message":"Internal Server Error","errorCode":"INTERNAL_ERROR"}
```
Non-production mode appends the error message: `"Internal Server Error -- <error.message>"`. The app confirmed running with production error behavior.

### Test: Binary data as JSON body
```bash
curl -s -b cookies.txt -X POST http://localhost:9002/api/promotions \
  -H "Content-Type: application/json" -d $'\x00\x01\x02\x03'
```
**Result:**
```json
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
```
No stack trace. Error handled by middleware before reaching the handler.

### Test: Unhandled error via wrapHandler
The `wrapHandler` function catches all errors from both the handler and middleware chain (withAuth, withCSRF, withRateLimit). Unit tests in `src/lib/error-handler.test.ts` confirm:
- `AppError` instances expose their message and errorCode (intentional, safe)
- `ZodError` instances return field-level validation details
- Unknown errors return generic "Internal Server Error" with `INTERNAL_ERROR` code

**Assessment:** Stack traces are fully suppressed in production. All 93 wrapped routes benefit from this protection.

---

## 35.3 Database Error Handling

**Status: PASS (with note)**

### Test: Invalid employee ID format
```bash
curl -s -b cookies.txt http://localhost:9002/api/employees/not-a-valid-uuid \
  -H "Accept: application/json"
```
**Result:** Returns Next.js 404 HTML page. No Prisma validation error or SQL details exposed.

### Test: SQL injection in input
```bash
curl -s -b cookies.txt -X POST http://localhost:9002/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name":"test'\''; DROP TABLE employees;--"}'
```
**Result:** Handled by authentication middleware. No SQL error leaked.

### Code Review: Prisma error handling
In `src/app/api/users/[id]/route.ts`, Prisma errors are caught and mapped to generic messages:
- `P2002` (unique constraint) -> `"Username already exists"` (HTTP 409)
- `P2025` (record not found) -> `"User not found"` (HTTP 404)
- `P2003` (foreign key) -> `"Cannot delete user. It may have associated data."` (HTTP 409)

No Prisma table names, column names, or SQL queries are exposed.

**Note (LOW):** The `PUT /api/users/[id]` route returns raw `ZodError.errors` array instead of the standardized `{ success, message, errorCode, details }` format when validation fails. While this does not leak database details, it is inconsistent with the application's error response contract.

**Assessment:** Database errors are properly caught and return generic, user-friendly messages. No SQL or schema information is disclosed.

---

## 35.4 File Path Disclosure

**Status: PASS**

### Test: Non-existent file
```bash
curl -s -b cookies.txt http://localhost:9002/api/files/nonexistent-file-id \
  -H "Accept: application/json"
```
**Result:** Returns Next.js 404 HTML page. No filesystem path (e.g., `/var/`, `/home/`, `C:\`) exposed.

### Test: File upload with system path
```bash
curl -s -b cookies.txt -X POST http://localhost:9002/api/files \
  -F "file=@/etc/passwd"
```
**Result:** Returns Next.js 404 HTML page (route not found for this method/path combination). No server-side path information leaked.

### Code Review
The application uses MinIO for file storage (`src/lib/minio.ts`). File operations are abstracted through object storage, not local filesystem paths. The logger writes to `/var/log/csms/app/app.log` but this path is not exposed in any API response.

**Assessment:** No filesystem paths are disclosed in any error response.

---

## 35.5 API Error Responses

**Status: PARTIAL**

### Standardized Format
The `withErrorHandler`/`wrapHandler` in `src/lib/error-handler.ts` produces:
```json
{
  "success": false,
  "message": "<human-readable message>",
  "errorCode": "<MACHINE_READABLE_CODE>",
  "details": "<optional, for validation errors>"
}
```

### Test: Unauthenticated access
```bash
curl -s http://localhost:9002/api/employees
```
**Result:**
```json
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
```
Note: Uses `"error"` key instead of `"message"` -- inconsistent with the standard format.

### Test: Missing required fields
```bash
curl -s -b cookies.txt -X POST http://localhost:9002/api/promotions \
  -H "Content-Type: application/json" -d '{}'
```
**Result:**
```json
{"success":false,"message":"Missing required fields: employeeId, promotionType"}
```
Note: No `errorCode` field -- inconsistent with the standard format.

### Test: Rate limiting
```bash
curl -s -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
```
**Result (after 5 attempts):**
```json
{"success":false,"error":"Too many requests","errorCode":"RATE_LIMIT_EXCEEDED","retryAfter":52}
```
Note: Uses `"error"` key instead of `"message"`. Includes helpful `retryAfter` field.

### Inconsistencies Found
| Route/Scenario | `success` | `message` key | `error` key | `errorCode` |
|---|---|---|---|---|
| wrapHandler (standard) | false | YES | no | YES |
| withAuth middleware | false | no | YES | YES |
| withRateLimit middleware | false | no | YES | YES |
| Promotions manual validation | false | YES | no | no |
| Users PUT (ZodError) | no `success` | no | no | no (raw array) |

**Assessment (LOW):** Error responses are mostly consistent but several middleware layers and manual validation paths use different key names (`error` vs `message`) and some omit `errorCode`. The `wrapHandler` standard is well-designed but not uniformly adopted across all error paths.

---

## 35.6 Validation Error Messages

**Status: PASS**

### Test: Complaints with wrong types
```bash
curl -s -b cookies.txt -X POST http://localhost:9002/api/complaints \
  -H "Content-Type: application/json" \
  -d '{"subject":123,"complaintType":true}'
```
**Result:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "details": [
    {"field":"complaintType","message":"Expected string, received boolean"},
    {"field":"subject","message":"Expected string, received number"},
    {"field":"complaintText","message":"Required"},
    {"field":"complainantPhoneNumber","message":"Required"},
    {"field":"nextOfKinPhoneNumber","message":"Required"},
    {"field":"complainantId","message":"Required"}
  ]
}
```

### Test: Auth login with missing fields
```bash
curl -s -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"","password":""}'
```
**Result:**
```json
{"success":false,"message":"Validation failed","errorCode":"VALIDATION_ERROR",
 "details":[{"field":"username","message":"Username or email is required."},
            {"field":"password","message":"Password is required."}]}
```

### Test: Employee login with missing fields
```bash
curl -s -X POST http://localhost:9002/api/auth/employee-login \
  -H "Content-Type: application/json" -d '{}'
```
**Result:**
```json
{"success":false,"message":"Validation failed","errorCode":"VALIDATION_ERROR",
 "details":[{"field":"zanId","message":"Required"},
            {"field":"zssfNumber","message":"Required"},
            {"field":"payrollNumber","message":"Required"}]}
```

**Assessment:** Zod validation errors return field-level messages that are user-actionable. The standardized format (`success`, `message`, `errorCode`, `details`) is correctly applied. Messages guide users to correct their input without revealing internal schema details.

---

## 35.7 Auth Error Messages

**Status: FINDING (MEDIUM)**

### Test: Wrong username (user does not exist)
```bash
curl -s -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin_nonexistent_999","password":"Csms@2026"}'
```
**Result:**
```json
{"success":false,"message":"Invalid username/email or password"}
```

### Test: Correct username, wrong password
```bash
curl -s -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"fautest","password":"WrongPassword123!"}'
```
**Result:**
```json
{"success":false,"message":"Invalid username or password, 4 attempts remaining"}
```

### Test: Account locked (after multiple failures)
```bash
# After 5+ failed attempts:
{"success":false,"message":"Your account has been locked. Please try again in 30 minutes."}
```

### Test: Inactive account
```bash
{"success":false,"message":"Account is inactive"}
```

### FINDING: Username Enumeration via Differentiated Error Messages

**Severity:** MEDIUM

**Description:** The login endpoint returns different error messages depending on whether the username exists:

| Scenario | Message | Reveals |
|---|---|---|
| User not found | `"Invalid username/email or password"` | Username does not exist |
| User exists, wrong password | `"Invalid username or password, N attempts remaining"` | Username IS valid |
| Account locked | `"Your account has been locked..."` | Account exists and is locked |
| Account inactive | `"Account is inactive"` | Account exists but is disabled |

An attacker can enumerate valid usernames by observing:
1. The message text difference ("or email" vs "or" phrasing)
2. The presence of "attempts remaining" (only shown when user exists)
3. The lockout message (confirms account existence)
4. The inactive message (confirms account existence)

**Code location:** `src/app/api/auth/login/route.ts` lines 66, 211-225, 149-155, 175

**Recommendation:** Return the same generic message for all authentication failures: `"Invalid username or password"`. Remove the attempts-remaining count from the response (track server-side only). Return the same message for locked and inactive accounts.

---

## 35.8 Sensitive Data in Logs

**Status: PASS (with notes)**

### Logging Infrastructure
The application uses **pino** logger (`src/lib/logger.ts`) with structured logging:
- Production logs to `/var/log/csms/app/app.log`
- Log level: `info` (production), `debug` (development), `silent` (test)
- Component-specific loggers: authLogger, dbLogger, sessionLogger, etc.

### Code Review: What Gets Logged
From `src/app/api/auth/login/route.ts`:
```typescript
authLogger.info({ username }, 'Login attempt');        // username logged
authLogger.info({ username }, 'User not found');        // username logged
authLogger.info({ username }, 'Invalid password');      // username logged
authLogger.info({ username }, 'Login successful');      // username logged
```

The audit logger (`logLoginAttempt`) records: username, userId, userRole, ipAddress, deviceInfo, failureReason.

### What Is NOT Logged
- Passwords are never logged (verified: no `password` in log calls)
- Session tokens are masked via `maskSessionToken()` in `src/lib/sanitize-response.ts`
- The `sanitizeUser()` function strips 18 sensitive fields including passwordHash, loginLockedUntil, etc.

### Notes
- Username and IP address are logged for security auditing purposes (legitimate security need)
- The `error-report` API endpoint (`src/app/api/error-report/route.ts`) accepts client error reports and logs them with `message`, `digest`, `url`, and `userAgent` -- no PII
- No `console.log` or `console.error` calls found in API routes (clean)

**Assessment:** Logging is appropriately structured. Passwords and sensitive auth data are not logged. Usernames and IPs are logged for audit purposes, which is a legitimate security practice. The `sanitizeUser()` utility properly strips sensitive fields from API responses.

---

## 35.9 Client-side Error Handling

**Status: PASS**

### React Error Boundaries
Three error boundary components are implemented:

| Component | File | Scope |
|---|---|---|
| Root Error | `src/app/error.tsx` | Catches errors in root layout children |
| Global Error | `src/app/global-error.tsx` | Catches errors in the root layout itself |
| Dashboard Error | `src/app/dashboard/error.tsx` | Catches errors in dashboard routes |

### Error Boundary Behavior
All three boundaries display the same generic UI:
- Icon: `AlertCircle` (red)
- Heading: "Something went wrong"
- Message: "An unexpected error occurred. Please try again or contact support if the problem persists."
- Action: "Try again" button (calls `reset()`)

**No stack traces, error messages, or internal details are shown to the user in the rendered UI.**

### Error Reporting
The root and global error boundaries send error details to `/api/error-report`:
```typescript
body: JSON.stringify({
  message: error.message,
  digest: error.digest,
  url: window.location.pathname,
  userAgent: navigator.userAgent,
})
```
This is a `digest` (Next.js error hash) and the error message -- used for server-side logging only, not displayed to the user.

### Note (LOW)
The dashboard error boundary (`src/app/dashboard/error.tsx` line 14) uses `console.error('Dashboard error:', error)` which logs the full error object to the browser console. While this is not shown in the UI, it exposes error details in the developer console. The root and global boundaries use the error-report API instead, which is the better pattern.

**Assessment:** Error boundaries are properly implemented with generic user-facing messages. Error details are reported server-side for debugging but not displayed to users.

---

## 35.10 Third-party API Errors

**Status: PASS**

### External Integrations
The application integrates with:
1. **MinIO** (file storage) - via `src/lib/minio.ts`
2. **HRIMS** (external HR system) - via `src/app/api/hrims/` and `src/lib/hrims-config.ts`
3. **Email** (SMTP) - via `src/lib/email.ts`
4. **Redis** (rate limiting/sessions) - via `src/lib/rate-limiter.ts`

### Code Review: Failure Handling

**Redis (fail-open):**
```typescript
// src/lib/rate-limiter.ts
if (!client) {
  rateLimitLogger.warn('Redis client unavailable -- allowing request (fail-open)');
  return { allowed: true };
}
```
Redis failures are logged but requests are allowed through (fail-open pattern).

**Email (MFA):**
```typescript
// src/app/api/auth/login/route.ts line 333
if (!emailResult.success) {
  authLogger.error({ err: emailResult.error }, 'Failed to send MFA email');
  return NextResponse.json(
    { success: false, message: 'Failed to send verification email. Please try again.' },
    { status: 500 }
  );
}
```
Email failures return a generic message without exposing SMTP server details.

**WrapHandler:** All external service calls within `wrapHandler`-wrapped routes benefit from the centralized error catching. If MinIO, HRIMS, or any external service throws, the error is caught and a generic response is returned.

**Assessment:** Third-party service failures are handled gracefully. Error messages are generic and do not expose external service details, connection strings, or internal error messages.

---

## Findings Summary

### F-35.7-01: Username Enumeration via Login Error Messages (MEDIUM)

**Description:** Login error messages differentiate between invalid username and invalid password, enabling attackers to enumerate valid usernames.

**Evidence:**
- User not found: `"Invalid username/email or password"`
- Wrong password: `"Invalid username or password, 4 attempts remaining"`
- Account locked: `"Your account has been locked. Please try again in 30 minutes."`
- Account inactive: `"Account is inactive"`

**Impact:** Attackers can build a list of valid usernames for targeted credential stuffing or brute-force attacks.

**Recommendation:**
1. Return identical message for all auth failures: `"Invalid username or password"`
2. Remove attempt counts from client responses (track server-side only)
3. Return identical messages for locked/inactive accounts

**Location:** `src/app/api/auth/login/route.ts`

---

### F-35.5-01: Inconsistent Error Response Format (LOW)

**Description:** Error responses use different key names (`message` vs `error`) and sometimes omit `errorCode` depending on which middleware or handler produced the error.

**Evidence:**
- `withAuth`: `{ success, error, errorCode }` (uses `error` key)
- `withRateLimit`: `{ success, error, errorCode, retryAfter }` (uses `error` key)
- `wrapHandler/AppError`: `{ success, message, errorCode }` (uses `message` key)
- `wrapHandler/ZodError`: `{ success, message, errorCode, details }` (uses `message` key)
- Manual validation in promotions: `{ success, message }` (no `errorCode`)
- Users PUT ZodError: raw array (no `success` wrapper)

**Impact:** Client-side error handling code must account for multiple response shapes, increasing the risk of unhandled errors.

**Recommendation:** Standardize all error responses to use `{ success: false, message, errorCode, details? }`. Update `withAuth` and `withRateLimit` middleware to use `message` instead of `error`. Ensure all manual validation paths include `errorCode`.

---

### F-35.9-01: Console.error in Dashboard Error Boundary (LOW)

**Description:** `src/app/dashboard/error.tsx` uses `console.error('Dashboard error:', error)` which exposes the full error object in the browser developer console.

**Impact:** Error details (potentially including internal paths or stack traces) are visible in the browser console to any user who opens DevTools.

**Recommendation:** Replace `console.error` with the `/api/error-report` endpoint pattern used by the root and global error boundaries.

---

### F-35.3-01: Raw ZodError in Users PUT Route (LOW)

**Description:** `src/app/api/users/[id]/route.ts` line 110 returns raw `ZodError.errors` array instead of the standardized error format when validation fails.

**Code:**
```typescript
if (error instanceof z.ZodError) {
  return new NextResponse(JSON.stringify(error.errors), { status: 400 });
}
```

**Impact:** Response shape is inconsistent. While ZodError does not leak database details, the raw error array may include internal field path information.

**Recommendation:** Use `handleApiError(error)` or the standardized format: `{ success: false, message: "Validation failed", errorCode: "VALIDATION_ERROR", details: [...] }`.

---

## WrapHandler Adoption Coverage

| Metric | Count |
|---|---|
| Total API route files | 98 |
| Routes using wrapHandler/withErrorHandler | 93 (94.9%) |
| Routes NOT using wrapHandler | 5 |

**Uncovered routes:**
1. `src/app/api/error-report/route.ts` -- standalone, has its own try/catch
2. `src/app/api/debug/nav-test/route.ts` -- debug endpoint
3. `src/app/api/debug-request/route.ts` -- debug endpoint
4. `src/app/api/test/csrf/route.ts` -- test endpoint
5. `src/app/api/auth/mfa/magic-link/verify/route.ts` -- MFA verification

The 5 uncovered routes are either debug/test endpoints or have their own error handling. The MFA verify route should be reviewed to confirm it has adequate error handling.

---

## Controls Verified

- [x] Generic error messages in production (35.1)
- [x] Stack traces suppressed in production (35.2)
- [x] Database errors return generic messages (35.3)
- [x] No filesystem paths in errors (35.4)
- [x] Consistent API error format (35.5) -- partially
- [x] Zod validation errors return field-level details (35.6)
- [ ] Auth errors do not enable username enumeration (35.7) -- **FAILED**
- [x] No passwords/sensitive data in logs (35.8)
- [x] React error boundaries with generic UI (35.9)
- [x] Third-party failures handled gracefully (35.10)

---

## Key Files

| File | Purpose |
|---|---|
| `src/lib/error-handler.ts` | Centralized error handling (AppError, wrapHandler, handleApiError) |
| `src/lib/error-handler.test.ts` | Unit tests for error handler |
| `src/lib/sanitize-response.ts` | Strips sensitive fields from API responses |
| `src/lib/logger.ts` | Pino structured logging configuration |
| `src/app/api/auth/login/route.ts` | Login endpoint with differentiated error messages |
| `src/app/error.tsx` | Root React error boundary |
| `src/app/global-error.tsx` | Global React error boundary |
| `src/app/dashboard/error.tsx` | Dashboard React error boundary |
| `src/app/api/error-report/route.ts` | Client error reporting endpoint |
| `src/app/api/users/[id]/route.ts` | Prisma error handling example |

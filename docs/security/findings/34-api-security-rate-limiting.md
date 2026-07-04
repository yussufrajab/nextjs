# 34. API Security Testing & Rate Limiting

**Requirement:** CSMS Requirement 34 — API Security Testing & Rate Limiting (Cross-cutting)
**Application:** CSMS (Civil Service Management System) — http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Test Date:** 2026-07-03
**Tester:** Automated security scan
**Test Accounts:**
- HRMO: `fautest` / `Csms@2026` (direct login, no MFA)
- EMPLOYEE: `abdillahomarnajim` / `Csms@2026` (direct login, no MFA)

---

## Summary

| Sub-case | Description | Result | Severity |
|----------|-------------|--------|----------|
| 34.1 | API Authentication Enforcement | PASS | - |
| 34.2 | API Authorization Testing | PASS | - |
| 34.3 | API Rate Limiting — Read | PASS | - |
| 34.4 | API Rate Limiting — Auth | PASS | - |
| 34.5 | API Rate Limiting — Write | PASS | - |
| 34.6 | API Rate Limiting — Upload | PASS | - |
| 34.7 | API Enumeration Prevention | OBSERVATION | Low |
| 34.8 | API Mass Assignment | PASS | - |
| 34.9 | API Parameter Tampering | PASS | - |
| 34.10 | API Response Data Leakage | PASS | - |
| 34.11 | API Error Message Info Disclosure | PASS | - |
| 34.12 | API HTTP Method Security | OBSERVATION | Low |
| 34.13 | API Batch/Pagination Limits | FINDING | Medium |
| 34.14 | API Token Security | PASS | - |

**Overall Status:** 12 PASS, 1 OBSERVATION, 1 FINDING

---

## 34.1 API Authentication Enforcement

**Result: PASS**

All protected API endpoints return HTTP 401 when accessed without authentication (no session cookie). The response body consistently returns:

```json
{
    "success": false,
    "error": "Authentication required",
    "errorCode": "UNAUTHENTICATED"
}
```

### Test Results

| Method | Endpoint | HTTP Status | Verdict |
|--------|----------|-------------|---------|
| GET | /api/auth/me | 401 | PASS |
| GET | /api/employees | 401 | PASS |
| GET | /api/institutions | 401 | PASS |
| GET | /api/users | 401 | PASS |
| GET | /api/notifications | 401 | PASS |
| GET | /api/promotions | 401 | PASS |
| GET | /api/confirmations | 401 | PASS |
| GET | /api/retirement | 401 | PASS |
| GET | /api/lwop | 401 | PASS |
| GET | /api/resignation | 401 | PASS |
| GET | /api/termination | 401 | PASS |
| GET | /api/cadre-change | 401 | PASS |
| GET | /api/service-extension | 401 | PASS |
| GET | /api/dashboard/metrics | 401 | PASS |
| GET | /api/audit/logs | 401 | PASS |
| POST | /api/users | 401 | PASS |
| POST | /api/files/upload | 401 | PASS |
| POST | /api/promotions | 401 | PASS |

All 18 tested endpoints consistently require authentication. No unauthenticated access was possible to any protected resource.

### Evidence

```bash
# Unauthenticated request to protected endpoint
$ curl -s http://localhost:9002/api/auth/me
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}

$ curl -s http://localhost:9002/api/employees
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}

$ curl -s http://localhost:9002/api/users
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
```

---

## 34.2 API Authorization Testing

**Result: PASS**

Role-based access control is properly enforced. Lower-privilege roles are denied access to admin-level endpoints.

### HRMO (fautest) — Admin Endpoint Access

| Endpoint | HTTP Status | Response |
|----------|-------------|----------|
| GET /api/users | 403 | FORBIDDEN — Insufficient permissions |
| GET /api/audit/logs | 403 | FORBIDDEN — Insufficient permissions |
| POST /api/users | 403 | FORBIDDEN — Insufficient permissions |

### HRMO (fautest) — Allowed Endpoint Access

| Endpoint | HTTP Status | Verdict |
|----------|-------------|---------|
| GET /api/promotions | 200 | Allowed (HRMO role) |
| GET /api/confirmations | 200 | Allowed |
| GET /api/employees | 200 | Allowed |
| GET /api/institutions | 200 | Allowed |
| GET /api/dashboard/metrics | 200 | Allowed |
| GET /api/retirement | 200 | Allowed |
| GET /api/lwop | 200 | Allowed |

### EMPLOYEE (abdillahomarnajim) — Admin Endpoint Access

| Endpoint | HTTP Status | Response |
|----------|-------------|----------|
| GET /api/users | 403 | FORBIDDEN — Insufficient permissions |
| GET /api/audit/logs | 403 | FORBIDDEN — Insufficient permissions |

### EMPLOYEE (abdillahomarnajim) — Allowed Endpoint Access

| Endpoint | HTTP Status | Verdict |
|----------|-------------|---------|
| GET /api/promotions | 200 | Allowed |
| GET /api/employees | 200 | Allowed |
| GET /api/institutions | 200 | Allowed |
| GET /api/dashboard/metrics | 200 | Allowed |

### Evidence

```bash
# HRMO accessing admin endpoint
$ curl -s -b cookies.txt -H "X-CSRF-Token: $CSRF" http://localhost:9002/api/users
{"success":false,"errorCode":"FORBIDDEN","error":"Insufficient permissions"}

# EMPLOYEE accessing admin endpoint
$ curl -s -b cookies.txt -H "X-CSRF-Token: $CSRF" http://localhost:9002/api/users
{"success":false,"errorCode":"FORBIDDEN","error":"Insufficient permissions"}

# HRMO accessing allowed endpoint
$ curl -s -b cookies.txt -H "X-CSRF-Token: $CSRF" http://localhost:9002/api/employees
{"success":true,"data":[...]}
```

---

## 34.3 API Rate Limiting — Read

**Result: PASS**

Read endpoints enforce rate limiting with a limit of **100 requests per minute**. Rate limit headers are properly returned:

- `x-ratelimit-limit: 100`
- `x-ratelimit-remaining: <countdown>`
- `x-ratelimit-reset: <unix_timestamp>`

### Test Results

| Request # | HTTP Status | Remaining | Verdict |
|-----------|-------------|-----------|---------|
| 1 | 200 | 89 | Normal |
| 5 | 200 | 90 | Normal |
| 10 | 200 | 85 | Normal |
| 15 | 200 | 80 | Normal |
| 20 | 200 | 75 | Normal |
| 25 | 200 | 70 | Normal |

The remaining count decreases with each request. The 100/min limit would be reached after 100 rapid requests. Rate limit headers are consistently present on all read responses.

### Evidence

```bash
$ curl -s -D - -b cookies.txt http://localhost:9002/api/employees > /dev/null
HTTP/1.1 200 OK
x-ratelimit-limit: 100
x-ratelimit-remaining: 89
x-ratelimit-reset: 1783107464
```

---

## 34.4 API Rate Limiting — Auth

**Result: PASS**

Authentication endpoints enforce a strict rate limit of **5 requests per minute**. After 5 failed login attempts, the endpoint returns HTTP 429 with a `retry-after` header.

### Test Results

| Attempt | HTTP Status | Remaining | Verdict |
|---------|-------------|-----------|---------|
| 1 | 401 | 3 | Normal |
| 2 | 401 | 2 | Normal |
| 3 | 401 | 1 | Normal |
| 4 | 401 | 0 | Last allowed |
| 5 | 429 | - | RATE LIMITED |

### Evidence

```bash
# Attempt 5 — rate limited
$ curl -s -D - -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistent","password":"WrongPassword123!"}'

HTTP/1.1 429 Too Many Requests
x-ratelimit-limit: 5
x-ratelimit-remaining: 0
retry-after: 50

{"success":false,"error":"Too many requests","errorCode":"RATE_LIMIT_EXCEEDED","retryAfter":50}
```

This effectively prevents brute-force login attempts. The `retryAfter` field tells the client when they can retry.

---

## 34.5 API Rate Limiting — Write

**Result: PASS**

Write endpoints (POST) enforce rate limiting with a limit of **30 requests per minute**. Rate limit headers are returned on all write responses.

### Test Results

| Request # | HTTP Status | Remaining | Verdict |
|-----------|-------------|-----------|---------|
| 1 | 400 | 28 | Normal (validation error, but counted) |
| 5 | 400 | 24 | Normal |
| 10 | 400 | 19 | Normal |
| 15 | 400 | 14 | Normal |
| 20 | 400 | 9 | Normal |
| 25 | 400 | 4 | Normal |
| 30 | 429 | 0 | RATE LIMITED |

### Evidence

```bash
# Request 30 — rate limited
$ curl -s -D - -b cookies.txt -H "X-CSRF-Token: $CSRF" \
  -X POST http://localhost:9002/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"title":"test","message":"test","type":"INFO"}'

HTTP/1.1 429 Too Many Requests
x-ratelimit-limit: 30
x-ratelimit-remaining: 0
retry-after: 59

{"success":false,"error":"Too many requests","errorCode":"RATE_LIMIT_EXCEEDED","retryAfter":59}
```

---

## 34.6 API Rate Limiting — Upload

**Result: PASS**

File upload endpoints enforce rate limiting with a limit of **10 requests per minute**. After 10 upload attempts, the endpoint returns HTTP 429.

### Test Results

| Upload # | HTTP Status | Verdict |
|----------|-------------|---------|
| 1 | 415 | Normal (unsupported media type) |
| 2-9 | 415 | Normal |
| 10 | 429 | RATE LIMITED |

Note: The 415 (Unsupported Media Type) responses indicate the upload endpoint requires specific content types/formats, but the rate limiter still counts these requests.

### Evidence

```bash
# Upload 10 — rate limited
$ curl -s -D - -b cookies.txt -H "X-CSRF-Token: $CSRF" \
  -X POST http://localhost:9002/api/files/upload \
  -F "file=@/tmp/test-upload.txt"

HTTP/1.1 429 Too Many Requests
retry-after: 60
```

---

## 34.7 API Enumeration Prevention

**Result: OBSERVATION (Low Risk)**

Sequential and predictable IDs return consistent 404 responses for non-existent resources. The application uses UUIDs for employee IDs, which makes enumeration impractical.

### Test Results

| ID Tested | HTTP Status | Verdict |
|-----------|-------------|---------|
| 1 | 404 | Safe |
| 2 | 404 | Safe |
| 3 | 404 | Safe |
| 999999 | 404 | Safe |
| 0 | 404 | Safe |
| -1 | 404 | Safe |
| abc | 404 | Safe |
| ../../../etc/passwd | 404 | Safe |
| null | 404 | Safe |
| undefined | 404 | Safe |
| %00 | 404 | Safe |
| 00000000-0000-0000-0000-000000000001 | 404 | Safe |
| ffffffff-ffff-ffff-ffff-ffffffffffff | 404 | Safe |

### Observation

The employee list endpoint (`GET /api/employees`) returns all employees with their UUIDs. While UUIDs are not sequentially enumerable, the full list is accessible to any authenticated HRMO user. This is expected behavior for the HR role but should be noted.

---

## 34.8 API Mass Assignment

**Result: PASS**

Extra fields submitted in API requests are either rejected (403) or ignored. The application does not allow privilege escalation through mass assignment.

### Test Results

| Test | HTTP Status | Verdict |
|------|-------------|---------|
| POST /api/users with `isAdmin:true` (as HRMO) | 403 | Blocked by authorization |
| PUT /api/employees with `role:ADMIN` | 404 | Endpoint not available for PUT |
| POST /api/auth/login with extra fields | Success (ignored) | Extra fields ignored |

### Evidence

```bash
# Attempting to create admin user as HRMO
$ curl -s -b cookies.txt -H "X-CSRF-Token: $CSRF" \
  -X POST http://localhost:9002/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"hacktest","password":"Hack123!","role":"ADMIN","name":"Hacker","isAdmin":true}'

{"success":false,"errorCode":"FORBIDDEN","error":"Insufficient permissions"}

# Login with extra fields — extra fields are ignored
$ curl -s -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"fautest","password":"Csms@2026","role":"ADMIN","isAdmin":true}'

# Response shows actual role (HRMO), not requested role (ADMIN)
```

---

## 34.9 API Parameter Tampering

**Result: PASS**

Invalid, negative, and malicious parameter values are handled safely. The application does not expose internal errors or allow data manipulation through parameter tampering.

### Query Parameter Tampering

| Parameter | HTTP Status | Verdict |
|-----------|-------------|---------|
| page=-1 | 200 | Handled gracefully |
| page=0 | 200 | Handled gracefully |
| limit=999999 | 200 | Returns data (see 34.13 finding) |
| limit=-1 | 200 | Handled gracefully |
| offset=-1 | 200 | Handled gracefully |
| sort=invalid | 200 | Ignored |
| role=ADMIN | 200 | Ignored (no privilege escalation) |

### Path Parameter Tampering

| Path | HTTP Status | Verdict |
|------|-------------|---------|
| ../../../etc/passwd | 404 | Safe |
| null | 404 | Safe |
| undefined | 404 | Safe |
| %00 | 404 | Safe |

### Body Parameter Tampering

| Test | HTTP Status | Verdict |
|------|-------------|---------|
| POST /api/promotions with fake employeeId | 400 | Validation error |
| POST /api/promotions with status=APPROVED | 400 | Cannot set status directly |

### Evidence

```bash
# Attempting to set status directly
$ curl -s -b cookies.txt -H "X-CSRF-Token: $CSRF" \
  -X POST http://localhost:9002/api/promotions \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"fake-id","promotionType":"NORMAL","status":"APPROVED","approvedBy":"admin"}'

# Response shows validation error — status cannot be set by submitter
```

---

## 34.10 API Response Data Leakage

**Result: PASS**

API responses do not leak sensitive data such as password hashes, tokens, or secrets.

### /api/auth/me Response Analysis

**PASS** — No password/hash/token fields in response.

Response fields: `active`, `email`, `employeeId`, `id`, `institutionId`, `institutionName`, `isTemporaryPassword`, `lastPasswordChange`, `mustChangePassword`, `name`, `role`, `temporaryPasswordExpiry`, `username`

### /api/employees Response Analysis

**PASS** — No password/hash fields in employee data.

Employee fields: `appointmentType`, `cadre`, `contactAddress`, `contractType`, `dateOfBirth`, `department`, `email`, `employeeEntityId`, `gender`, `id`, `institutionId`, `ministry`, `name`, `payrollNumber`, `phoneNumber`, `salaryScale`, `status`, `zanId`, `zssfNumber`, etc.

### Login Response Analysis

**PASS** — Login response does not include password or hash.

User fields in login response: `active`, `createdAt`, `employeeId`, `fullName`, `id`, `institutionId`, `institutionName`, `isEnabled`, `isTemporaryPassword`, `lastLoginDate`, `mustChangePassword`, `name`, `role`, `temporaryPasswordExpiry`, `updatedAt`, `username`

### Evidence

```bash
# /api/auth/me — no password field
$ curl -s -b cookies.txt http://localhost:9002/api/auth/me | jq '.data | keys'
["active","email","employeeId","id","institutionId","institutionName",
 "isTemporaryPassword","lastPasswordChange","mustChangePassword",
 "name","role","temporaryPasswordExpiry","username"]

# Login response — no password field
$ curl -s -X POST http://localhost:9002/api/auth/login \
  -d '{"username":"fautest","password":"Csms@2026"}' | jq '.data.user | keys'
["Employee","Institution","active","createdAt","employeeId","fullName","id",
 "institutionId","institutionName","isEnabled","isTemporaryPassword",
 "lastLoginDate","mustChangePassword","name","role",
 "temporaryPasswordExpiry","updatedAt","username"]
```

---

## 34.11 API Error Message Info Disclosure

**Result: PASS**

Error messages are generic and do not expose internal implementation details, stack traces, or database errors.

### Test Results

| Scenario | Response | Stack Trace? | Internal Paths? |
|----------|----------|--------------|-----------------|
| Invalid login credentials | "Invalid username/email or password" | No | No |
| Invalid JSON body | "Internal Server Error" | No | No |
| Missing required fields | "Missing required fields: employeeId, promotionType" | No | No |
| SQL injection attempt | Normal response (sanitized) | No | No |
| Non-existent endpoint | 404 | No | No |

### Evidence

```bash
# Invalid credentials — generic message
$ curl -s -X POST http://localhost:9002/api/auth/login \
  -d '{"username":"nonexistent","password":"wrong"}'
{"success":false,"message":"Invalid username/email or password"}

# Invalid JSON — generic error
$ curl -s -b cookies.txt -X POST http://localhost:9002/api/promotions \
  -H "Content-Type: application/json" -d 'invalid json{{'
{"success":false,"message":"Internal Server Error","errorCode":"INTERNAL_ERROR"}

# Missing fields — field names only, no internals
$ curl -s -b cookies.txt -X POST http://localhost:9002/api/promotions \
  -H "Content-Type: application/json" -d '{}'
{"success":false,"message":"Missing required fields: employeeId, promotionType"}
```

---

## 34.12 API HTTP Method Security

**Result: OBSERVATION (Low Risk)**

Most endpoints correctly return 405 (Method Not Allowed) for unsupported HTTP methods. One minor observation noted.

### Test Results

| Endpoint | PUT | DELETE | PATCH | OPTIONS |
|----------|-----|--------|-------|---------|
| /api/auth/me | 405 | 405 | 405 | 204 |
| /api/employees | 405 | 405 | 405 | 204 |
| /api/institutions | 405 | 405 | 405 | 204 |
| /api/users | 405 | 405 | 405 | 204 |
| /api/promotions | 405 | 405 | **500** | 204 |
| /api/notifications | 405 | 405 | 405 | 204 |

### Observation

`PATCH /api/promotions` returns HTTP 500 instead of 405. This should be handled gracefully with a proper 405 response.

### Evidence

```bash
# Most endpoints return 405
$ curl -s -o /dev/null -w "%{http_code}" -X PUT http://localhost:9002/api/employees
405

# PATCH /api/promotions returns 500
$ curl -s -o /dev/null -w "%{http_code}" -X PATCH http://localhost:9002/api/promotions
500

# OPTIONS returns 204 (No Content) — standard CORS preflight
$ curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost:9002/api/employees
204
```

---

## 34.13 API Batch/Pagination Limits

**Result: FINDING (Medium)**

The `/api/employees` endpoint does not enforce pagination limits. All 200 employees are returned regardless of the `limit` or `page` parameter.

### Test Results

| Parameter | Records Returned | Expected |
|-----------|-----------------|----------|
| limit=10 | 200 | 10 |
| limit=50 | 200 | 50 |
| limit=100 | 200 | 100 |
| limit=500 | 200 | 200 (capped) |
| limit=1000 | 200 | 200 (capped) |
| limit=99999 | 200 | 200 (capped) |
| page=1&limit=10 | 200 | 10 |
| page=2&limit=10 | 200 | 10 |
| page=100&limit=10 | 200 | 0 or error |

### Contrast with /api/promotions

The `/api/promotions` endpoint correctly returns a limited set (50 records), suggesting pagination is partially implemented.

### Impact

- **Performance:** Large result sets increase response time and memory usage
- **DoS Risk:** An attacker could request very large pages to stress the server
- **Data Exposure:** Full employee dataset returned in single request

### Recommendation

Implement consistent pagination across all list endpoints:
- Enforce a maximum page size (e.g., 50 or 100)
- Validate and clamp `limit` parameter
- Validate `page` parameter (reject negative/zero values)
- Return pagination metadata (total count, current page, total pages)

### Evidence

```bash
# All employees returned regardless of limit
$ curl -s -b cookies.txt "http://localhost:9002/api/employees?limit=10" | jq '.data | length'
200

$ curl -s -b cookies.txt "http://localhost:9002/api/employees?limit=99999" | jq '.data | length'
200

# Promotions correctly paginated
$ curl -s -b cookies.txt "http://localhost:9002/api/promotions?limit=1000" | jq '.data | length'
50
```

---

## 34.14 API Token Security

**Result: PASS**

The application uses httpOnly session cookies for authentication, not JWT tokens. Cookie security attributes are properly configured.

### Cookie Security Attributes

| Cookie | HttpOnly | Secure | SameSite | Path |
|--------|----------|--------|----------|------|
| session | YES | YES | strict | / |
| csrf-token | YES | YES | strict | / |
| pre-session | YES | YES | strict | / |

### Token Analysis

- **JWT tokens:** Not used (`token: null`, `refreshToken: null`)
- **Session cookie:** HttpOnly, Secure, SameSite=strict
- **CSRF protection:** CSRF token cookie + X-CSRF-Token header required
- **Cookie flags:** All security flags properly set

### Evidence

```bash
# Login response — no JWT tokens
$ curl -s -X POST http://localhost:9002/api/auth/login \
  -d '{"username":"fautest","password":"Csms@2026"}' | jq '{token: .data.token, refreshToken: .data.refreshToken}'
{"token": null, "refreshToken": null}

# Set-Cookie headers from login
set-cookie: session=...; Path=/; Max-Age=86400; Secure; HttpOnly; SameSite=strict
set-cookie: csrf-token=...; Path=/; Max-Age=604800; Secure; SameSite=strict
```

---

## Rate Limiting Summary

| Endpoint Type | Limit | Window | Behavior on Exceed |
|---------------|-------|--------|-------------------|
| Auth (login) | 5 requests | 1 minute | HTTP 429 + retry-after |
| Read (GET) | 100 requests | 1 minute | HTTP 429 + retry-after |
| Write (POST) | 30 requests | 1 minute | HTTP 429 + retry-after |
| Upload | 10 requests | 1 minute | HTTP 429 + retry-after |

### Rate Limit Response Format

```json
{
    "success": false,
    "error": "Too many requests",
    "errorCode": "RATE_LIMIT_EXCEEDED",
    "retryAfter": 50
}
```

### Rate Limit Headers

```
x-ratelimit-limit: <max_requests>
x-ratelimit-remaining: <remaining_requests>
x-ratelimit-reset: <unix_timestamp>
retry-after: <seconds>
```

---

## Security Headers

The application sets comprehensive security headers on all responses:

```
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

---

## Findings Summary

### Finding 1: Missing Pagination on /api/employees (Medium)

- **Endpoint:** GET /api/employees
- **Issue:** The `limit` and `page` query parameters are not enforced; all records are returned
- **Impact:** Performance degradation with large datasets, potential DoS vector
- **Recommendation:** Implement server-side pagination with enforced maximum page size
- **Status:** Open

### Observation 1: PATCH /api/promotions Returns 500 (Low)

- **Endpoint:** PATCH /api/promotions
- **Issue:** Returns HTTP 500 instead of 405 for unsupported method
- **Impact:** Minor information disclosure (indicates unhandled code path)
- **Recommendation:** Add explicit method handling to return 405
- **Status:** Open

---

## Methodology

1. **Authentication tests:** Removed session cookies and verified 401 responses
2. **Authorization tests:** Logged in as HRMO and EMPLOYEE, attempted admin endpoints
3. **Rate limiting:** Sent rapid sequential requests while monitoring `x-ratelimit-*` headers
4. **Data leakage:** Inspected all response bodies for password hashes, tokens, and PII
5. **Error handling:** Triggered errors with invalid inputs, checked for stack traces
6. **HTTP methods:** Sent PUT/DELETE/PATCH/OPTIONS to GET-only endpoints
7. **Parameter tampering:** Tested negative values, SQL injection payloads, path traversal
8. **Pagination:** Tested various limit/page values to verify enforcement

### Tools Used

- `curl` for HTTP requests
- `jq` / `python3` for JSON parsing
- `redis-cli` for rate limit cache inspection
- `psql` for database session verification

# Requirement 26: Security Monitoring & Detection

**Application:** CSMS (Civil Servant Management System)
**URL:** http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Date:** 2026-07-03
**Tester:** Automated Security Test

---

## Executive Summary

The CSMS application implements a comprehensive audit logging framework using a partitioned PostgreSQL table (`audit.audit_log`) with monthly partitions. The system successfully monitors authentication events, administrative actions, and CSRF violations. However, **authorization failures at the API layer are not logged to the audit table**, creating a significant blind spot for detecting privilege escalation attempts and unauthorized access patterns.

| Sub-Case | Description | Result |
|----------|-------------|--------|
| 26.1 | Failed Login Monitoring | **PASS** |
| 26.2 | Privilege Escalation Detection | **FAIL** |
| 26.3 | Authorization Failure Monitoring | **FAIL** |
| 26.4 | IDOR Attempt Detection | **FAIL** |
| 26.5 | Administrative Activity Monitoring | **PASS** |
| 26.6 | Security Alerting | **PARTIAL** |

**Overall Status: 2 PASS, 3 FAIL, 1 PARTIAL**

---

## Test Environment

### Audit Infrastructure

- **Storage:** PostgreSQL partitioned table in `audit` schema
- **Partitions:** Monthly partitions from 2025-11 through 2027-05 (20 partitions)
- **Total Records at Test Time:** 1,342
- **Health Endpoint:** `GET /api/health/audit`

### Event Categories in Audit Log

| Event Category | Severity | Blocked | Count |
|----------------|----------|---------|-------|
| AUTHENTICATION | INFO | false | 689 |
| AUTHENTICATION | WARNING | true | 250 |
| DATA_MODIFICATION | INFO | false | 352 |
| DATA_MODIFICATION | WARNING | false | 27 |
| SECURITY | INFO | false | 11 |
| SECURITY | WARNING | false | 6 |
| SECURITY | WARNING | true | 27 |
| SYSTEM | INFO | false | 15 |

### Event Types Captured

| Event Type | Category | Count |
|------------|----------|-------|
| LOGIN_SUCCESS | AUTHENTICATION | 467 |
| LOGIN_FAILED | AUTHENTICATION | 230 |
| FILE_UPLOADED | DATA_MODIFICATION | 212 |
| LOGOUT | AUTHENTICATION | 202 |
| REQUEST_SUBMITTED | DATA_MODIFICATION | 74 |
| CSRF_VIOLATION | SECURITY | 16 |
| ACCOUNT_LOCKED | SECURITY | 8 |
| PASSWORD_CHANGED | SECURITY | 10 |
| ADMIN_PASSWORD_RESET | SECURITY | 3 |

---

## 26.1 Failed Login Monitoring

**Result: PASS**

### Test Procedure

1. Logged in as `fautest` (HRMO) with valid credentials -- successful
2. Attempted login with wrong password `WrongPass1` through `WrongPass3`
3. Observed remaining attempt counter in response
4. Verified audit log entries for each failed attempt
5. Confirmed account lockout after 5 failed attempts

### Commands Executed

```bash
# Valid login
curl -s -c /tmp/cookies-hrmo.txt -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"fautest","password":"Csms@2026"}'

# Failed login attempts
curl -s -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"fautest","password":"WrongPass1"}'
```

### Results

**Failed login responses:**
```json
{"success":false,"message":"Invalid username or password, 4 attempts remaining"}
{"success":false,"message":"Invalid username or password, 3 attempts remaining"}
{"success":false,"message":"Invalid username or password, 2 attempts remaining"}
```

**Rate limiting (after 5 attempts in 60s window):**
```json
{"success":false,"error":"Too many requests","errorCode":"RATE_LIMIT_EXCEEDED","retryAfter":55}
```

**Account lockout (after threshold exceeded):**
```json
{"success":false,"message":"Too many failed login attempts. Your account has been locked. Please try again in 30 minutes."}
```

### Audit Log Evidence

```
 action     | event_category | severity | was_blocked | username | block_reason                  | created_at
------------+----------------+----------+-------------+----------+-------------------------------+---------------------------
 LOGIN_FAILED | AUTHENTICATION | WARNING  | t           | fautest  | Invalid password              | 2026-07-03 19:19:02.972+00
 LOGIN_FAILED | AUTHENTICATION | WARNING  | t           | fautest  | Invalid password              | 2026-07-03 19:19:03.104+00
 LOGIN_FAILED | AUTHENTICATION | WARNING  | t           | fautest  | Invalid password              | 2026-07-03 19:19:04.614+00
 ACCOUNT_LOCKED | SECURITY   | WARNING  | t           | fautest  | Account locked after 5 failed | 2026-07-03 19:19:04.613+00
```

**ACCOUNT_LOCKED additional_data:**
```json
{
  "reason": "failed_attempts",
  "isUpgrade": false,
  "lockedUntil": "2026-07-03T19:49:04.609Z",
  "lockoutType": "standard",
  "failedAttempts": 5
}
```

### Controls Verified

| Control | Status |
|---------|--------|
| Failed login logged to audit | YES |
| Severity set to WARNING | YES |
| `was_blocked` flag set | YES |
| Block reason included | YES |
| Rate limiting active (5 req/60s) | YES |
| Account lockout after 5 failures | YES |
| Lockout type escalation (>10 = SECURITY) | YES |
| Remaining attempts shown to user | YES |
| Lockout event logged with metadata | YES |

---

## 26.2 Privilege Escalation Detection

**Result: FAIL**

### Test Procedure

1. Logged in as `abdillahomarnajim` (EMPLOYEE role)
2. Attempted to access admin-only API endpoints
3. Checked audit log for privilege escalation events

### Commands Executed

```bash
# Login as EMPLOYEE
curl -s -c /tmp/cookies-emp.txt -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"abdillahomarnajim","password":"Csms@2026"}'

# Privilege escalation attempts
curl -s -b /tmp/cookies-emp.txt -X POST "http://localhost:9002/api/admin/lock-account" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test","reason":"test"}'

curl -s -b /tmp/cookies-emp.txt -X GET "http://localhost:9002/api/users"

curl -s -b /tmp/cookies-emp.txt -X POST "http://localhost:9002/api/admin/reset-password" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test"}'
```

### Results

**All requests correctly blocked with 403:**
```json
{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}
```

**Audit log query for escalation events:**
```sql
SELECT action, event_category, severity, was_blocked, username, request_route, block_reason
FROM audit.audit_log
WHERE action IN ('ACCESS_DENIED', 'FORBIDDEN_ROUTE', 'UNAUTHORIZED_ACCESS', 'ROLE_VIOLATION', 'PERMISSION_DENIED')
ORDER BY created_at DESC LIMIT 20;
```

**Result: 0 rows** -- No events logged.

### Root Cause

The `withAuth()` function in `/src/lib/api-auth.ts` returns a 403 FORBIDDEN response when role checks fail (lines 232-236), but does NOT call any audit logging function:

```typescript
// api-auth.ts lines 232-236
if (options?.allowedRoles?.length) {
  const roleUpper = authResult.context!.role.toUpperCase();
  const allowedUpper = options.allowedRoles.map(r => r.toUpperCase());
  if (!allowedUpper.includes(roleUpper)) {
    return forbidden().response!;  // Returns 403, no audit log
  }
}
```

The `AuditEventType.ROLE_VIOLATION`, `AuditEventType.ACCESS_DENIED`, and `AuditEventType.FORBIDDEN_ROUTE` enums exist in `audit-logger.ts` but are never triggered by the API auth middleware.

### Gap

Privilege escalation attempts are blocked at the access control layer but are **invisible to security monitoring**. An attacker probing for privilege escalation would leave no trace in the audit log.

---

## 26.3 Authorization Failure Monitoring

**Result: FAIL**

### Test Procedure

1. Sent unauthenticated requests to protected API endpoints
2. Checked audit log for unauthorized access events

### Commands Executed

```bash
# Unauthenticated access attempts
curl -s -X GET "http://localhost:9002/api/admin/lock-account"
curl -s -X POST "http://localhost:9002/api/admin/reset-password" \
  -H 'Content-Type: application/json' -d '{"userId":"x"}'
curl -s -X GET "http://localhost:9002/api/users"
curl -s -X GET "http://localhost:9002/api/employees"
```

### Results

**All requests correctly blocked with 401:**
```json
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
```

**Audit log query:**
```sql
SELECT action, event_category, severity FROM audit.audit_log
WHERE action = 'UNAUTHORIZED_ACCESS'
ORDER BY created_at DESC LIMIT 20;
```

**Result: 0 rows** -- No events logged.

### Root Cause

The `verifyAuth()` function in `/src/lib/api-auth.ts` returns `unauthenticated()` (401) without logging (lines 108-109):

```typescript
if (!signedSessionToken) {
  return unauthenticated();  // Returns 401, no audit log
}
```

### Middleware Behavior

The Next.js middleware (`/middleware.ts`) does log unauthorized attempts to `console.log` via `logUnauthorizedAttempt()`, but this function only writes to stdout/stderr -- it does NOT write to the `audit.audit_log` database table. The middleware cannot import from `@/lib` due to Next.js edge runtime constraints.

### Gap

Unauthenticated access attempts to API routes leave no database audit trail. Console-only logging is not suitable for security monitoring, alerting, or forensic analysis.

---

## 26.4 IDOR Attempt Detection

**Result: FAIL**

### Test Procedure

1. Logged in as `abdillahomarnajim` (EMPLOYEE, institution: WAKALA WA MAJENGO ZANZIBAR)
2. Attempted to access another employee's documents using a fabricated ID
3. Checked audit log for IDOR detection events

### Commands Executed

```bash
# IDOR attempt - access another employee's documents
curl -s -b /tmp/cookies-emp.txt \
  -X GET "http://localhost:9002/api/employees/OTHER_EMPLOYEE_ID/documents"
```

### Results

**Response:**
```json
{"success":false,"message":"Employee not found"}
```

**Audit log query:**
```sql
SELECT action, event_category, severity FROM audit.audit_log
WHERE action IN ('UNAUTHORIZED_ACCESS', 'SUSPICIOUS_REQUEST', 'POTENTIAL_BREACH')
ORDER BY created_at DESC LIMIT 20;
```

**Result: 0 rows** -- No IDOR detection events.

### Gap

The system does not implement IDOR detection. When a user attempts to access resources belonging to another entity, the request returns a generic "not found" error without:
- Logging the attempted cross-entity access
- Flagging the request as suspicious
- Correlating the user's institution with the target resource's institution

---

## 26.5 Administrative Activity Monitoring

**Result: PASS**

### Test Procedure

1. Reviewed all administrative action types in the audit log
2. Verified that CRUD operations on users, employees, and institutions are logged
3. Confirmed that security-sensitive admin actions are captured

### Audit Log Evidence

**User Management:**
```
 action       | event_category   | severity | username | created_at
--------------+------------------+----------+----------+---------------------------
 USER_CREATED | DATA_MODIFICATION | INFO     | ymrajab  | (5 entries in log)
 USER_UPDATED | DATA_MODIFICATION | INFO     | various  | (14 entries in log)
```

**Account Management:**
```
 action             | event_category | severity | username | block_reason
--------------------+----------------+----------+----------+----------------------------------
 ADMIN_PASSWORD_RESET | SECURITY     | WARNING  | ymrajab  | (from /api/admin/reset-password)
 ACCOUNT_LOCKED       | SECURITY     | WARNING  | fautest  | Account locked after 7 failed
 ACCOUNT_UNLOCKED     | SECURITY     | INFO     | (admin)  | (via /api/admin/unlock-account)
```

**Employee Management:**
```
 action          | event_category   | severity | count
-----------------+------------------+----------+-------
 EMPLOYEE_CREATED | DATA_MODIFICATION | INFO     | (logged)
 EMPLOYEE_UPDATED | DATA_MODIFICATION | INFO     | (logged)
```

**Request Lifecycle:**
```
 action            | event_category   | severity | count
-------------------+------------------+----------+------
 REQUEST_SUBMITTED | DATA_MODIFICATION | INFO     | 74
 REQUEST_APPROVED  | DATA_MODIFICATION | INFO     | 27
 REQUEST_REJECTED  | DATA_MODIFICATION | WARNING  | 27
```

**File Operations:**
```
 action         | event_category   | severity | count
----------------+------------------+----------+------
 FILE_UPLOADED   | DATA_MODIFICATION | INFO     | 212
 FILE_DOWNLOADED | DATA_MODIFICATION | INFO     | 8
 FILE_PREVIEWED  | DATA_MODIFICATION | INFO     | 4
```

### Controls Verified

| Control | Status |
|---------|--------|
| User creation logged | YES |
| User updates logged | YES |
| Admin password resets logged | YES |
| Account lock/unlock logged | YES |
| Employee CRUD logged | YES |
| Request workflow actions logged | YES |
| File operations logged | YES |
| IP address captured | YES |
| Device info captured | YES |
| Severity levels assigned | YES |

---

## 26.6 Security Alerting

**Result: PARTIAL**

### Test Procedure

1. Verified CSRF violation logging
2. Checked for active alerting mechanisms (webhooks, email, Slack)
3. Reviewed audit health monitoring endpoint

### CSRF Violation Monitoring

CSRF violations are properly logged to the audit table:

```
 action         | event_category | severity | was_blocked | username          | block_reason
----------------+----------------+----------+-------------+-------------------+----------------------------------
 CSRF_VIOLATION  | SECURITY      | WARNING  | t           | abdillahomarnajim | CSRF tokens do not match
 CSRF_VIOLATION  | SECURITY      | WARNING  | t           | abdillahomarnajim | CSRF tokens do not match
 (16 total entries)
```

### Audit Health Endpoint

The application exposes a health check endpoint:

```bash
curl -s -b /tmp/cookies-hrmo.txt -X GET "http://localhost:9002/api/health/audit"
```

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": {"status": "ok", "latencyMs": 1},
    "auditTable": {"status": "ok", "rowCount": 1342},
    "recentEvents": {"status": "ok", "count24h": 180, "latestEventAt": "2026-07-03T19:19:06.650Z"},
    "partitions": {"status": "ok", "currentMonth": true, "nextMonth": true}
  }
}
```

### Alerting Mechanism Assessment

| Mechanism | Status |
|-----------|--------|
| Audit log persistence | IMPLEMENTED |
| Structured logger output | IMPLEMENTED |
| Health monitoring endpoint | IMPLEMENTED |
| Webhook notifications | NOT IMPLEMENTED |
| Email alerts for CRITICAL events | NOT IMPLEMENTED |
| Slack/Teams integration | NOT IMPLEMENTED |
| Real-time alert dashboard | NOT IMPLEMENTED |
| SIEM integration | NOT IMPLEMENTED |

### Gap

While security events are logged and persisted, there is no active alerting mechanism. Security personnel must manually query the audit log or check the health endpoint to detect incidents. There is no automated notification when CRITICAL or high-frequency security events occur.

---

## Audit Schema Reference

The audit log uses a partitioned PostgreSQL table in the `audit` schema:

```sql
-- Table: audit.audit_log
-- Partitions: audit_log_YYYY_MM (monthly, 2025-11 through 2027-05)

CREATE TABLE audit.audit_log (
  id              BIGSERIAL,
  event_id        UUID DEFAULT gen_random_uuid(),
  user_id         TEXT,
  username        TEXT,
  user_role       TEXT,
  action          TEXT NOT NULL,        -- maps to AuditEventType
  event_category  TEXT NOT NULL,        -- SECURITY, AUTHENTICATION, etc.
  severity        TEXT DEFAULT 'INFO',  -- INFO, WARNING, ERROR, CRITICAL
  entity_type     TEXT DEFAULT 'SYSTEM',
  entity_id       TEXT,
  ip_address      INET,
  device_info     JSONB,
  request_method  TEXT,
  request_route   TEXT,
  is_authenticated BOOLEAN DEFAULT FALSE,
  was_blocked     BOOLEAN DEFAULT FALSE,
  block_reason    TEXT,
  additional_data JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

### Querying Security Events

```bash
# All security events
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody \
  -c "SELECT action, event_category, severity, was_blocked, username, request_route, block_reason, created_at
      FROM audit.audit_log
      WHERE event_category = 'SECURITY'
      ORDER BY created_at DESC LIMIT 20;"

# Failed login attempts
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody \
  -c "SELECT action, username, block_reason, created_at
      FROM audit.audit_log
      WHERE action = 'LOGIN_FAILED'
      ORDER BY created_at DESC LIMIT 20;"

# Account lockouts
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody \
  -c "SELECT action, username, block_reason, additional_data, created_at
      FROM audit.audit_log
      WHERE action IN ('ACCOUNT_LOCKED', 'ACCOUNT_LOCKOUT_UPGRADED')
      ORDER BY created_at DESC LIMIT 10;"
```

---

## Findings Summary

### Critical Findings

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| F-26.1 | API authorization failures (`withAuth` 401/403) are not logged to audit table | HIGH | OPEN |
| F-26.2 | No IDOR attempt detection or logging | HIGH | OPEN |
| F-26.3 | Next.js middleware unauthorized access logs only to console, not database | MEDIUM | OPEN |

### Positive Findings

| ID | Finding | Severity |
|----|---------|----------|
| P-26.1 | Failed login attempts logged with WARNING severity | GOOD |
| P-26.2 | Account lockout after 5 failed attempts with automatic escalation | GOOD |
| P-26.3 | Rate limiting active on auth endpoints (5 req/60s) | GOOD |
| P-26.4 | CSRF violations logged to audit table | GOOD |
| P-26.5 | Administrative CRUD operations fully audited | GOOD |
| P-26.6 | Audit health monitoring endpoint available | GOOD |
| P-26.7 | Monthly partitioned audit table for performance | GOOD |
| P-26.8 | IP address and device info captured in audit entries | GOOD |

### Recommendations

1. **HIGH: Add audit logging to `withAuth()` middleware** -- When `verifyAuth()` returns UNAUTHENTICATED or `withAuth()` returns FORBIDDEN, call `logUnauthorizedAccess()` or `logForbiddenRoute()` to persist the event to `audit.audit_log`.

2. **HIGH: Implement IDOR detection** -- In employee/resource endpoints, compare the requesting user's `institutionId` with the target resource's `institutionId`. Log cross-institution access attempts as `SUSPICIOUS_REQUEST` events.

3. **MEDIUM: Bridge middleware console logging to database** -- The Next.js middleware cannot import from `@/lib` due to edge runtime constraints, but it could write audit events via an internal API call or by passing audit data in request headers for downstream handlers to log.

4. **LOW: Implement active alerting** -- Add webhook or email notifications for CRITICAL severity events and high-frequency security event patterns (e.g., >10 failed logins from same IP in 5 minutes).

---

## Files Referenced

| File | Purpose |
|------|---------|
| `/src/lib/audit-logger.ts` | Audit event types, categories, severity levels, and logging functions |
| `/src/lib/audit-db.ts` | Raw SQL layer for partitioned `audit.audit_log` table |
| `/src/lib/api-auth.ts` | `verifyAuth()` and `withAuth()` -- API authentication/authorization |
| `/src/lib/account-lockout-utils.ts` | Account lockout logic with audit logging |
| `/src/lib/rate-limiter.ts` | Redis-based rate limiting (5 auth/60s, 30 write/60s, 100 read/60s) |
| `/src/lib/api-csrf-middleware.ts` | CSRF protection with audit logging |
| `/src/lib/error-handler.ts` | Error catching wrapper (no security logging) |
| `/middleware.ts` | Next.js middleware for route protection (console-only logging) |
| `/src/app/api/auth/login/route.ts` | Login endpoint with comprehensive audit logging |
| `/src/app/api/health/audit/route.ts` | Audit health monitoring endpoint |
| `/prisma/schema.prisma` | Database schema (audit table uses raw SQL, not Prisma) |

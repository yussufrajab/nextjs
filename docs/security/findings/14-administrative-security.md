# Security Test Document: Requirement 14 -- Administrative Security

## Document Information

| Field | Value |
|---|---|
| **Application** | CSMS (Civil Servant Management System) |
| **URL** | http://localhost:9002 |
| **Branch** | feat/err01-batch3-wrap-handler |
| **Test Date** | 2026-07-04 |
| **Tester** | Automated Security Audit |
| **Requirement** | 14 -- Administrative Security |

## Test Environment

| Component | Details |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Database** | PostgreSQL (nody) via Prisma ORM |
| **Auth** | HMAC-signed session cookies + MFA (OTP) |
| **Rate Limiting** | Redis-backed (auth: 5/min, write: 30/min, read: 100/min) |
| **Test Accounts** | `ymrajab` (Admin, MFA), `skawesu` (HRO, MFA), `abdillahomarnajim` (EMPLOYEE, no MFA) |

## Test Cases

### 14.1 -- Administrative RBAC

**Objective:** Verify non-admin users cannot perform admin-only operations.

**Endpoints Tested:**
- `POST /api/admin/lock-account` -- protected by `withAuth({ allowedRoles: ['Admin'] })`
- `POST /api/admin/reset-password` -- protected by `withAuth({ allowedRoles: ['Admin'] })`
- `POST /api/admin/unlock-account` -- protected by `withAuth({ allowedRoles: ['Admin'] })`
- `GET /api/admin/cleanup-sessions` -- NO authentication
- `GET /api/admin/hrims-settings` -- NO authentication

**Results:**

| Actor | Endpoint | HTTP | Result |
|---|---|---|---|
| EMPLOYEE | POST /api/admin/lock-account | 403 | FORBIDDEN -- correctly blocked |
| HRO | POST /api/admin/lock-account | 403 | FORBIDDEN -- correctly blocked |
| Admin | POST /api/admin/lock-account | 400/200 | Allowed (validation or success) |
| EMPLOYEE | POST /api/admin/reset-password | 403 | FORBIDDEN -- correctly blocked |
| HRO | POST /api/admin/reset-password | 403 | FORBIDDEN -- correctly blocked |
| Admin | POST /api/admin/reset-password | 200 | Allowed |
| EMPLOYEE | POST /api/admin/unlock-account | 403 | FORBIDDEN -- correctly blocked |
| HRO | POST /api/admin/unlock-account | 403 | FORBIDDEN -- correctly blocked |
| Admin | POST /api/admin/unlock-account | 400/200 | Allowed (validation or success) |
| EMPLOYEE | GET /api/admin/cleanup-sessions | 200 | **ALLOWED -- no auth** |
| EMPLOYEE | GET /api/admin/hrims-settings | 200 | **ALLOWED -- no auth** |
| HRO | GET /api/admin/cleanup-sessions | 200 | **ALLOWED -- no auth** |
| HRO | GET /api/admin/hrims-settings | 200 | **ALLOWED -- no auth** |

**Verdict:** PARTIAL PASS -- Protected endpoints correctly enforce RBAC. However, 3 admin routes have NO authentication at all.

---

### 14.2 -- Privileged Access Control

**Objective:** Verify privileged operations require authentication and proper authorization.

**Results:**

| Test | HTTP | Result |
|---|---|---|
| Unauthenticated -> POST /api/admin/lock-account | 401 | UNAUTHENTICATED -- correctly blocked |
| Unauthenticated -> POST /api/admin/reset-password | 401 | UNAUTHENTICATED -- correctly blocked |
| Unauthenticated -> POST /api/admin/unlock-account | 401 | UNAUTHENTICATED -- correctly blocked |
| Unauthenticated -> GET /api/admin/cleanup-sessions | 200 | **VULNERABILITY: No auth required** |
| Unauthenticated -> POST /api/admin/cleanup-sessions | 200 | **VULNERABILITY: Can list/cleanup sessions** |
| Unauthenticated -> GET /api/admin/hrims-settings | 200 | **VULNERABILITY: Exposes config + API keys** |
| Unauthenticated -> PUT /api/admin/hrims-settings | 200 | **VULNERABILITY: Can modify config** |
| Unauthenticated -> POST /api/admin/trigger-password-check | 403 | Dev-mode guard only (not auth) |
| Unauthenticated -> GET /api/health/audit | 200 | **VULNERABILITY: Audit endpoint exposed** |

**Vulnerable Routes (NO authentication):**

1. **`/api/admin/cleanup-sessions` (GET/POST)** -- `src/app/api/admin/cleanup-sessions/route.ts`
   - Exposes session statistics (total, active, expired, suspicious)
   - Allows `cleanup-all` action to delete ALL sessions
   - Allows `list-sessions` to enumerate all active sessions
   - Wrapped only in `wrapHandler()`, no `withAuth`

2. **`/api/admin/hrims-settings` (GET/PUT/POST)** -- `src/app/api/admin/hrims-settings/route.ts`
   - GET returns full HRIMS config including `_fullApiKey` and `_fullToken` (unmasked)
   - PUT allows changing host, port, API key, and token
   - POST tests HRIMS connection with provided credentials
   - Wrapped only in `wrapHandler()`, no `withAuth`

3. **`/api/admin/trigger-password-check` (POST)** -- `src/app/api/admin/trigger-password-check/route.ts`
   - Guarded only by `process.env.NODE_ENV !== 'development'` check
   - Contains `// TODO: Add admin authentication check` comment
   - No `withAuth` wrapper

4. **`/api/health/audit` (GET)** -- `src/app/api/health/audit/route.ts`
   - Exposes audit log data without authentication

**Verdict:** FAIL -- 4 routes expose privileged operations without authentication.

---

### 14.3 -- User Management Authorization

**Objective:** Verify unauthorized user CRUD operations are blocked.

**Endpoints Tested:**
- `GET /api/users` -- protected by `withAuth({ allowedRoles: ['ADMIN', 'HHRMD', 'HRO'] })`
- `POST /api/users` -- protected by `withAuth({ allowedRoles: ['ADMIN'] })`
- `PUT /api/users/[id]` -- **NO authentication**
- `DELETE /api/users/[id]` -- **NO authentication**

**Results:**

| Actor | Endpoint | HTTP | Result |
|---|---|---|---|
| EMPLOYEE | GET /api/users | 403 | FORBIDDEN -- correctly blocked |
| EMPLOYEE | POST /api/users | 403 | FORBIDDEN -- correctly blocked |
| Unauthenticated | PUT /api/users/[id] | 200 | **VULNERABILITY: Can update any user** |
| Unauthenticated | DELETE /api/users/[id] | 409 | Blocked by FK constraint (not auth) |
| EMPLOYEE | PUT /api/users/[id] | 200 | **VULNERABILITY: Can update any user** |
| EMPLOYEE | DELETE /api/users/[id] | 409 | Blocked by FK constraint (not auth) |

**Critical Finding:** `PUT /api/users/[id]` and `DELETE /api/users/[id]` in `src/app/api/users/[id]/route.ts` have NO authentication wrapper. The PUT handler uses `getAuthContext(req)` only for audit logging (line 94), not for access control. The DELETE handler has no auth check at all.

**Proof of Exploit:**
```bash
# Unauthenticated user can change any user's name, role, password, institution
curl -X PUT http://localhost:9002/api/users/<admin-id> \
  -H 'Content-Type: application/json' \
  -d '{"name":"HACKED","role":"EMPLOYEE","password":"hacked123"}'
# Returns HTTP 200 with updated user data
```

**Verdict:** FAIL -- Critical authentication bypass on PUT/DELETE user endpoints.

---

### 14.4 -- Role Assignment Authorization

**Objective:** Verify unauthorized role assignment is blocked.

**Results:**

| Test | HTTP | Result |
|---|---|---|
| Unauthenticated PUT /api/users/[id] role=Admin | 200 | **VULNERABILITY: Role changed to Admin** |
| EMPLOYEE POST /api/users role=Admin | 403 | Correctly blocked (withAuth) |

**Critical Finding:** An unauthenticated attacker can escalate any user to Admin role:
```bash
curl -X PUT http://localhost:9002/api/users/<target-id> \
  -H 'Content-Type: application/json' \
  -d '{"role":"Admin"}'
# Returns HTTP 200, role changed in DB
```

**Additional Issue:** The `role` field accepts any string value with no enum validation:
- Schema: `z.string().min(1)` (no allowed values list)
- Database: `text` column with no CHECK constraint
- System has inconsistent role names: both "Admin" and "ADMIN" exist in the database

**Verdict:** FAIL -- Complete role escalation bypass via unauthenticated PUT endpoint.

---

### 14.5 -- Institution Assignment Authorization

**Objective:** Verify unauthorized institution assignment is blocked.

**Results:**

| Test | HTTP | Result |
|---|---|---|
| Unauthenticated PUT /api/users/[id] institutionId | 200 | **VULNERABILITY: Institution changed** |

**Finding:** An unauthenticated attacker can reassign any user to any institution:
```bash
curl -X PUT http://localhost:9002/api/users/<admin-id> \
  -H 'Content-Type: application/json' \
  -d '{"institutionId":"<different-institution-id>"}'
# Returns HTTP 200, institution changed in DB
```

**Verdict:** FAIL -- Institution reassignment possible without authentication.

---

### 14.6 -- Configuration Change Authorization

**Objective:** Verify unauthorized configuration changes are blocked.

**Results:**

| Test | HTTP | Result |
|---|---|---|
| Unauthenticated GET /api/admin/hrims-settings | 200 | **VULNERABILITY: Config exposed** |
| Unauthenticated PUT /api/admin/hrims-settings | 200 | **VULNERABILITY: Config changed** |
| Unauthenticated POST /api/admin/cleanup-sessions (cleanup-all) | 200 | **VULNERABILITY: All sessions wiped** |

**Critical Findings:**

1. **HRIMS Settings Exposure:** GET returns `_fullApiKey` and `_fullToken` (unmasked API credentials) to any unauthenticated caller.

2. **HRIMS Settings Modification:** PUT allows changing the HRIMS host, port, API key, and token. An attacker could redirect HRIMS integration to a malicious server.

3. **Session Destruction:** POST with `{"action":"cleanup-all"}` deletes ALL active sessions, effectively performing a denial-of-service attack by logging out all users.

**Verdict:** FAIL -- Configuration readable and writable without authentication.

---

### 14.7 -- Administrative Audit Logging

**Objective:** Verify USER_CREATED, USER_UPDATED, and USER_DELETED events are logged.

**Audit Log Schema:** `audit.audit_log` (PostgreSQL partitioned table)

**Results:**

| Event Type | Logged? | Notes |
|---|---|---|
| USER_CREATED | YES | Logged via `logUserAction` in POST /api/users |
| USER_UPDATED | YES | Logged via `logUserAction` in PUT /api/users/[id] |
| USER_DELETED | N/A | DELETE blocked by FK constraints; no successful deletes observed |
| ADMIN_PASSWORD_RESET | YES | Logged in reset-password route |
| ACCOUNT_LOCKED | YES | Logged in lock-account route |
| LOGIN_SUCCESS | YES | Logged in auth flow |
| LOGIN_FAILED | YES | Logged in auth flow |

**Issue Found:** Unauthenticated PUT /api/users/[id] changes are logged with `username='system'` and `user_role='ADMIN'` and `is_authenticated=true`. This is misleading because:
- The actor is not authenticated
- The actor is not an admin
- The audit trail falsely indicates an admin made the change

**Sample audit entries from unauthenticated changes:**
```
action=USER_UPDATED | username=system | user_role=ADMIN | route=/api/users/<id> | is_authenticated=t
```

**Verdict:** PARTIAL PASS -- Audit logging exists for user management events, but unauthenticated changes are incorrectly attributed to an authenticated admin.

---

### 14.8 -- Separation of Duties

**Objective:** Verify conflicting roles are blocked.

**Results:**

| Test | Result |
|---|---|
| Admin cannot lock another Admin | PASS -- Returns 403 "Cannot lock another administrator account" |
| Role field validation | FAIL -- Accepts any string (e.g., "INVALID_ROLE_xyz") |
| Role consistency | FAIL -- Both "Admin" and "ADMIN" exist in DB |

**Findings:**

1. **Admin-to-Admin Protection:** The `lock-account` route correctly checks `if (user.role === 'Admin')` and returns 403, preventing one admin from locking another. This is a proper separation of duties control.

2. **No Role Enum Validation:** The `role` field in both `POST /api/users` and `PUT /api/users/[id]` uses `z.string().min(1)` with no allowed values list. The database column is `text` with no CHECK constraint. Any string can be assigned as a role.

3. **Inconsistent Role Names:** The database contains both "Admin" (3 users) and "ADMIN" (1 user) as separate role values. The `withAuth` middleware and lock-account check use case-insensitive comparison, but this inconsistency could cause issues in role-based logic.

**Verdict:** PARTIAL PASS -- Admin-to-admin protection exists, but no role enum validation or consistency enforcement.

---

## Summary Matrix

| ID | Test Case | Result | Severity |
|---|---|---|---|
| 14.1 | Administrative RBAC | PARTIAL PASS | Medium |
| 14.2 | Privileged Access Control | **FAIL** | **Critical** |
| 14.3 | User Management Authorization | **FAIL** | **Critical** |
| 14.4 | Role Assignment Authorization | **FAIL** | **Critical** |
| 14.5 | Institution Assignment Authorization | **FAIL** | **Critical** |
| 14.6 | Configuration Change Authorization | **FAIL** | **Critical** |
| 14.7 | Administrative Audit Logging | PARTIAL PASS | Medium |
| 14.8 | Separation of Duties | PARTIAL PASS | Medium |

**Overall: FAIL** -- 5 of 8 test cases failed, all at Critical severity.

---

## Critical Vulnerabilities

### V1: Authentication Bypass on User Management (PUT/DELETE)

**File:** `src/app/api/users/[id]/route.ts`
**Lines:** 29 (PUT), 122 (DELETE)
**Severity:** Critical
**CVSS:** 9.8

The PUT and DELETE handlers on `/api/users/[id]` have no `withAuth` wrapper. Any unauthenticated request can:
- Change any user's name, email, phone number
- Change any user's role (including escalating to Admin)
- Change any user's password
- Change any user's institution assignment
- Toggle user active/inactive status

**Recommendation:** Wrap both handlers with `withAuth` and restrict to `allowedRoles: ['ADMIN']`.

### V2: Unauthenticated Admin Routes

**Files:**
- `src/app/api/admin/cleanup-sessions/route.ts`
- `src/app/api/admin/hrims-settings/route.ts`
- `src/app/api/admin/trigger-password-check/route.ts`

**Severity:** Critical

Three admin routes have no authentication:
- `cleanup-sessions`: Exposes session data, allows wiping all sessions (DoS)
- `hrims-settings`: Exposes full API keys/tokens, allows config modification
- `trigger-password-check`: Only guarded by dev-mode check

**Recommendation:** Add `withAuth({ allowedRoles: ['Admin'] })` to all three routes.

### V3: No Role Enum Validation

**Files:**
- `src/app/api/users/route.ts` (line ~47: `role: z.string().min(1)`)
- `src/app/api/users/[id]/route.ts` (line ~23: `role: z.string().optional()`)

**Severity:** High

The role field accepts any arbitrary string. Combined with V1, an attacker can assign any role value.

**Recommendation:** Define a `RoleEnum` with allowed values (`Admin`, `HHRMD`, `HRO`, `HRMO`, `EMPLOYEE`, `DO`, `PO`, `CSCS`, `HRRP`) and use it in Zod schemas.

---

## Recommendations

1. **Immediate:** Add `withAuth` to PUT/DELETE handlers in `src/app/api/users/[id]/route.ts`
2. **Immediate:** Add `withAuth({ allowedRoles: ['Admin'] })` to all unprotected admin routes
3. **High:** Add role enum validation to user creation and update schemas
4. **High:** Normalize role names (resolve "Admin" vs "ADMIN" inconsistency)
5. **Medium:** Fix audit logging to correctly attribute unauthenticated changes (mark `is_authenticated=false`, use "unauthenticated" as username)
6. **Medium:** Add database CHECK constraint on the `role` column
7. **Low:** Remove `_fullApiKey` and `_fullToken` fields from hrims-settings GET response (always return masked values)

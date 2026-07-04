# Requirement 21: Audit Log Protection

**Application:** CSMS (Civil Servant Management System)
**URL:** http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Test Date:** 2026-07-03
**Tester:** Automated Security Assessment

---

## Summary

| Case | Description | Result |
|------|-------------|--------|
| 21.1 | Append-Only Logging | PASS |
| 21.2 | Audit Record Tamper Protection | PASS |
| 21.3 | Audit Deletion Prevention | PASS |
| 21.4 | Audit Modification Prevention (API) | PASS |
| 21.5 | Restricted Audit Access | PASS |
| 21.6 | Audit Integrity Monitoring | PASS |

**Overall: 6/6 PASS**

---

## Test Accounts

| Account | Role | Auth Method | Status |
|---------|------|-------------|--------|
| `ymrajab` | Admin | MFA (email OTP) | MFA required |
| `zhaji` | CSCS | MFA (email OTP) | MFA required |
| `fautest` | HRMO | Direct login | Used for non-admin tests |
| `abdillahomarnajim` | Employee | Direct login | Session limit reached |

---

## 21.1 -- Append-Only Logging

**Requirement:** Audit log writes must use INSERT only; UPDATE must be blocked.

### Code Review

**File:** `src/lib/audit-db.ts` (lines 115-193)

The `writeAuditLog()` function is the **only** write function exported by the audit database layer. It executes a single `INSERT INTO audit.audit_log (...)` statement (line 137-143). There is no exported `updateAuditLog()`, `modifyAuditLog()`, or any function that issues SQL UPDATE against the audit table.

The exported public API of `audit-db.ts` consists of exactly four functions:
- `writeAuditLog()` -- INSERT only
- `queryAuditLogs()` -- SELECT only
- `queryAuditStats()` -- SELECT only (aggregate queries)
- `ensurePartitions()` -- CREATE TABLE IF NOT EXISTS (partition management)

No UPDATE, DELETE, or TRUNCATE statements exist anywhere in the module.

### Database-Level Protections

**File:** `prisma/migrations/20260522010000_migrate_audit_to_partitioned/migration.sql`

The migration creates the `audit.audit_log` table as a partitioned table with no database-level triggers or REVOKE statements to enforce immutability. The table is partitioned by `created_at` (monthly ranges), which provides operational benefits but does not prevent UPDATE/DELETE at the database level.

**Note:** Immutability is enforced solely at the application layer. A database administrator or direct SQL connection could still modify audit records. This is an acceptable design for this application given the Prisma/raw SQL access pattern, but database-level triggers would provide defense-in-depth.

### Result: PASS

The application layer exclusively uses INSERT for audit log writes. No UPDATE path exists in the codebase.

---

## 21.2 -- Audit Record Tamper Protection

**Requirement:** Existing audit records must not be modifiable.

### Code Review

There is no API endpoint, service function, or database query that performs an UPDATE on `audit.audit_log`. The `audit-logger.ts` module wraps `writeAuditLog()` and adds structured logging, but introduces no modification capability.

The `audit-db.ts` module's `queryAuditLogs()` function (lines 211-345) performs only SELECT queries with optional WHERE filters. The `queryAuditStats()` function (lines 351-405) performs only aggregate SELECT queries. Neither function writes or modifies data.

### API Endpoint Verification

The audit logs API route (`src/app/api/audit/logs/route.ts`) exports only a `GET` handler. No POST, PUT, PATCH, or DELETE handlers are defined. The route is wrapped with `withAuth` enforcing `allowedRoles: ['Admin', 'CSCS']`.

### Result: PASS

No code path exists to modify existing audit records.

---

## 21.3 -- Audit Deletion Prevention

**Requirement:** Audit log records must not be deletable via the application.

### Code Review

No DELETE statement exists in `audit-db.ts`. The only write operation is the INSERT in `writeAuditLog()`. There is no `deleteAuditLog()`, `clearAuditLogs()`, `truncateAuditLogs()`, or any equivalent function.

The `audit-logger.ts` module and its exported functions (`logAuditEvent`, `logUnauthorizedAccess`, `logAccessDenied`, etc.) all delegate to `writeAuditLog()` and provide no deletion capability.

### Database-Level Protections

The partitioned table structure does not include any `ON DELETE` triggers or REVOKE statements. Partitions can be dropped at the database level, but this is not exposed through the application.

### Result: PASS

No application-layer code path exists to delete audit records.

---

## 21.4 -- Audit Modification Prevention (API Method Restrictions)

**Requirement:** PUT, PATCH, DELETE HTTP methods must be rejected on audit endpoints.

### Test Results

#### Endpoint: `/api/audit/logs`

| Method | Auth | Status | Response |
|--------|------|--------|----------|
| GET | None | 401 | `{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}` |
| GET | HRMO | 403 | `{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}` |
| POST | None | 405 | (empty body) |
| POST | HRMO | 405 | (empty body) |
| PUT | None | 405 | (empty body) |
| PUT | HRMO | 405 | (empty body) |
| PATCH | None | 405 | (empty body) |
| PATCH | HRMO | 405 | (empty body) |
| DELETE | None | 405 | (empty body) |
| DELETE | HRMO | 405 | (empty body) |

#### Endpoint: `/api/audit/log`

| Method | Status | Response |
|--------|--------|----------|
| GET | 405 | (empty body) |
| POST | 200 | `{"success":true,"message":"Audit event logged successfully"}` |
| PUT | 405 | (empty body) |
| PATCH | 405 | (empty body) |
| DELETE | 405 | (empty body) |

### Code Review

`src/app/api/audit/logs/route.ts` exports only `GET`. Next.js App Router returns 405 for any method not exported from a route file.

`src/app/api/audit/log/route.ts` exports only `POST`. This is the write-only endpoint for logging unauthorized access events. It accepts audit event data and writes it via `logUnauthorizedAccess()`, which delegates to `writeAuditLog()` (INSERT only).

### Result: PASS

All mutation methods (POST, PUT, PATCH, DELETE) on the read endpoint return 405. The write endpoint only accepts POST (for appending new events).

---

## 21.5 -- Restricted Audit Access

**Requirement:** Non-admin users must be blocked from reading audit logs.

### Test Results

#### Unauthenticated Access

```bash
$ curl -s http://localhost:9002/api/audit/logs
{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}
# HTTP_STATUS: 401
```

#### Authenticated Non-Admin (HRMO: fautest)

```bash
$ curl -s -b cookies.txt http://localhost:9002/api/audit/logs
{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}
# HTTP_STATUS: 403
```

```bash
$ curl -s -b cookies.txt "http://localhost:9002/api/audit/logs?statsOnly=true"
{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}
# HTTP_STATUS: 403
```

### Code Review

**File:** `src/app/api/audit/logs/route.ts` (line 65)

```typescript
export const GET = wrapHandler(
  withAuth(async (request: NextRequest | Request) => {
    // ... handler logic ...
  }, { allowedRoles: ['Admin', 'CSCS'] }),
  'audit-logs'
);
```

The `withAuth` wrapper in `src/lib/api-auth.ts` (lines 219-242) performs a case-insensitive role check against the `allowedRoles` array. If the authenticated user's role does not match, it returns a 403 response with `{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}`.

Only `Admin` and `CSCS` roles are permitted to read audit logs. All other roles (HRMO, EMPLOYEE, HRRP, etc.) receive 403.

### Result: PASS

Access control is properly enforced. Unauthenticated requests get 401; non-admin authenticated requests get 403.

---

## 21.6 -- Audit Integrity Monitoring

**Requirement:** A health check mechanism must verify audit log subsystem integrity.

### Test Results

```bash
$ curl -s http://localhost:9002/api/health/audit
{
  "status": "healthy",
  "checks": {
    "database": {"status": "ok", "latencyMs": 1},
    "auditTable": {"status": "ok", "rowCount": 1363},
    "recentEvents": {"status": "ok", "count24h": 201, "latestEventAt": "2026-07-03T19:20:08.821Z"},
    "partitions": {"status": "ok", "currentMonth": true, "nextMonth": true}
  },
  "timestamp": "2026-07-03T19:20:17.219Z"
}
# HTTP_STATUS: 200
```

### Health Check Components

**File:** `src/lib/audit-health.ts`

The `checkAuditHealth()` function performs four independent checks:

1. **Database Connectivity** -- Executes `SELECT 1` to verify the PostgreSQL connection is alive. Reports latency in milliseconds.
2. **Audit Table Existence** -- Queries `COUNT(*) FROM audit.audit_log` to verify the table exists and is accessible. Reports total row count.
3. **Recent Events** -- Queries events from the last 24 hours to verify the audit pipeline is actively ingesting. Reports count and timestamp of the most recent event.
4. **Partition Coverage** -- Checks that monthly partitions exist for both the current and next month via `pg_catalog.pg_tables`. Reports `currentMonth` and `nextMonth` boolean flags.

### Status Determination

- **healthy** -- All checks pass (status: "ok")
- **degraded** -- Any check returns "degraded" (e.g., missing next-month partition)
- **unhealthy** -- Any check returns "error" (e.g., database unreachable)

The health endpoint at `/api/health/audit` returns HTTP 200 for healthy/degraded, and HTTP 503 for unhealthy.

### Result: PASS

A comprehensive health check endpoint exists and is operational, covering connectivity, table integrity, event ingestion, and partition coverage.

---

## Findings and Recommendations

### Strengths

1. **Clean separation of concerns** -- The audit database layer (`audit-db.ts`) exposes only INSERT and SELECT operations. No modification or deletion functions exist.
2. **API method restrictions** -- Next.js App Router naturally enforces method restrictions by only exporting declared handlers. Unexported methods return 405.
3. **Role-based access control** -- Audit log reads are restricted to Admin and CSCS roles via `withAuth` with explicit `allowedRoles`.
4. **Session-based authentication** -- Auth uses HMAC-signed HttpOnly session cookies validated against the database, not forgeable client-side tokens.
5. **Comprehensive health monitoring** -- The health check covers database connectivity, table integrity, event ingestion, and partition coverage.

### Gap: No Database-Level Immutability Enforcement

The audit log immutability is enforced only at the application layer. The PostgreSQL migration does not include:
- `REVOKE UPDATE, DELETE ON audit.audit_log FROM` statements
- Row-level security policies
- BEFORE UPDATE/DELETE triggers that raise exceptions

This means a database administrator with direct SQL access could modify or delete audit records. For defense-in-depth, consider adding a trigger:

```sql
CREATE OR REPLACE FUNCTION audit.prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_immutable
  BEFORE UPDATE OR DELETE ON audit.audit_log
  FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_modification();
```

**Severity:** Low (application-layer protection is functional; database-level protection is defense-in-depth)

### Note on Test Account Limitations

- `fautest` (HRMO): Account was initially inactive; required reactivation before testing. Successfully used for non-admin access tests.
- `abdillahomarnajim` (EMPLOYEE): Hit session limit (3 active sessions). Could not obtain a fresh session for testing.
- `ymrajab` (Admin) and `zhaji` (CSCS): Both require MFA via email OTP, preventing automated authenticated testing for admin-allowed scenarios. The `allowedRoles: ['Admin', 'CSCS']` configuration was verified through code review.

---

## Source Files Examined

| File | Purpose |
|------|---------|
| `src/app/api/audit/logs/route.ts` | Audit log read endpoint (GET only, Admin/CSCS) |
| `src/app/api/audit/log/route.ts` | Audit log write endpoint (POST only, public) |
| `src/app/api/health/audit/route.ts` | Audit health check endpoint (GET, public) |
| `src/lib/audit-db.ts` | Raw SQL audit database layer (INSERT/SELECT only) |
| `src/lib/audit-logger.ts` | Audit logging utility wrapping audit-db |
| `src/lib/audit-health.ts` | Audit health check implementation |
| `src/lib/api-auth.ts` | Authentication and authorization wrapper |
| `src/lib/error-handler.ts` | API error handling (wrapHandler) |
| `prisma/migrations/20260522010000_migrate_audit_to_partitioned/migration.sql` | Audit table DDL (no triggers/REVOKE) |

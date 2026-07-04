# Requirement 6: Employee Creation Integrity — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 6)
> **Related:** `5-employee-profile-protection.md`, `4-institution-data-isolation-consolidated.md`

---

## Test Environment

| Role | Username | Institution | Institution ID | Session Status |
|------|----------|-------------|----------------|----------------|
| HRO (Inst A) | `skawesu` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| HHRMD (CSC) | `skhamis` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| Admin | `ymrajab` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |

---

## Employee Creation Endpoint Inventory

| Route | Method | Auth | Role | Institution | Duplicate Check | Audit Log |
|-------|--------|------|------|-------------|-----------------|-----------|
| `/api/employees/manual-entry` | POST | ✅ Yes | HRO only | Forced to user's | ZAN ID (DB), Payroll (app) | ✅ Yes |
| `/api/employees/bulk-upload` | POST | ✅ Yes | HRO, ADMIN | Forced to user's | ZAN ID (DB), Payroll (app), intra-file | ✅ Yes |
| `/api/employees/bulk-upload` | PUT | ✅ Yes | HRO, ADMIN | Forced to user's | Same as POST | ✅ Yes |
| `/api/hrims/sync-employee` | POST | ❌ **No** | Any | By vote number | Upsert by ZAN ID | ❌ **No** |
| `/api/hrims/fetch-employee` | POST | ❌ **No** | Any | By vote number | Upsert by ZAN ID | ❌ **No** |
| `/api/hrims/bulk-fetch` | POST | ❌ **No** | Any | By vote number | Upsert by ZAN ID | ❌ **No** |
| `/api/hrims/fetch-by-institution` | POST | ❌ **No** | Any | By vote/TIN | Upsert by ZAN ID | ❌ **No** |
| `/api/hrims/search-employee` | GET/POST | ❌ **No** | Any | By vote number | N/A (read-only) | ❌ **No** |
| `/api/hrims/test` | GET/POST | ❌ **No** | Any | N/A | N/A | ❌ **No** |
| `/api/employees/validate` | POST | ❌ **No** | Any | None | Checks all 3 fields | ❌ **No** |

---

## Duplicate Prevention Mechanisms

### Database Constraints (Prisma Schema)

| Field | Constraint | Enforcement Level |
|-------|------------|-------------------|
| `zanId` | `@unique` | ✅ Database-level |
| `payrollNumber` | `@@index` only | ⚠️ Application-level only |
| `zssfNumber` | No constraint | ❌ No enforcement |

### Application-Level Checks

| Endpoint | ZAN ID | Payroll Number | ZSSF Number |
|----------|--------|----------------|-------------|
| Manual Entry | `findUnique` (DB) | `findFirst` (app) | ❌ Not checked |
| Bulk Upload (intra-file) | Set-based | Set-based | Set-based |
| Bulk Upload (vs DB) | `findUnique` (DB) | `findFirst` (app) | ❌ Not checked |
| Validate | `findUnique` (DB) | `findFirst` (app) | `findFirst` (app) |
| HRIMS sync | Upsert | ❌ Not checked | ❌ Not checked |
| HRIMS fetch | Upsert | ❌ Not checked | ❌ Not checked |
| HRIMS bulk | Upsert | ❌ Not checked | ❌ Not checked |

---

## Test Case No.: 6 — Requirement 6: Employee Creation Integrity

**Process/Function Name:** Employee Record Creation & Duplicate Prevention

**Function Description:** Tests that employee records are created only through authorized processes with proper validation.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 6.1 | Employee Creation Authorization | 1. Unauthorized user creates employee<br>2. Authorized user creates employee | - Unauthorized blocked<br>- Authorized allowed<br>- Audit logged | ⚠️ Verify creation routes | **PARTIAL PASS — Manual entry secure, HRIMS sync unauthenticated.**<br><br>**✅ Manual entry (POST /api/employees/manual-entry):**<br>- Requires HRO role (`allowedRoles: ['HRO']`) ✅<br>- HHRMD blocked: `{"success":false,"error":"Invalid or expired session"}` ✅<br>- Institution forced to user's institution ✅<br>- `manualEntryEnabled` flag checked ✅<br>- Time window enforced ✅<br><br>**✅ Bulk upload (POST /api/employees/bulk-upload):**<br>- Requires HRO or ADMIN role ✅<br>- Unauthenticated blocked: `{"success":false,"message":"Authentication required"}` ✅<br>- Institution forced to user's institution ✅<br><br>**❌ HRIMS sync-employee (POST /api/hrims/sync-employee):**<br>- No authentication required<br>- Any anonymous user can trigger employee sync<br>- Returns 500 (HRIMS connection error), not 401<br><br>**❌ HRIMS fetch-employee (POST /api/hrims/fetch-employee):**<br>- No authentication required<br>- Any anonymous user can fetch employee data from HRIMS<br><br>**❌ HRIMS bulk-fetch (POST /api/hrims/bulk-fetch):**<br>- No authentication required<br>- Successfully started bulk fetch: `"Bulk fetch started for TUME YA UTUMISHI SERIKALINI"`<br><br>**❌ HRIMS test endpoint:**<br>- No authentication required<br>- Returns full HRIMS API test results | **PARTIAL** | **P0:** Add authentication to all HRIMS endpoints. |
| 6.2 | Unique Payroll Number Validation | 1. Create employee with existing payroll number<br>2. Check validation | - Duplicate rejected<br>- Error displayed | ⚠️ Verify schema constraints | **FAIL — No database-level unique constraint.**<br><br>**✅ Application-level check in manual entry:**<br>`findFirst` query returns 409 if payroll exists.<br><br>**✅ Application-level check in bulk upload:**<br>Intra-file duplicate detection + DB check.<br><br>**❌ No database-level unique constraint:**<br>`payrollNumber` only has `@@index`, not `@unique`.<br><br>**❌ Duplicate payroll numbers exist in DB:**<br>```sql<br>SELECT "payrollNumber", COUNT(*) FROM "Employee"<br>GROUP BY "payrollNumber" HAVING COUNT(*) > 1<br>```<br>Result: 5+ duplicate payroll numbers found:<br>- `124523` → 2 records<br>- `124961` → 2 records<br>- `130363` → 2 records<br>- `135191` → 2 records<br>- `137824` → 2 records<br><br>**Root cause:** HRIMS sync uses upsert by ZAN ID only, does not check payroll uniqueness. Concurrent requests could also create duplicates. | **FAIL** | **P1:** Add `@unique` constraint to `payrollNumber` (after deduplication). |
| 6.3 | Unique ZanID Validation | 1. Duplicate ZanID<br>2. Submit | - Rejected<br>- No duplicates in DB | ⚠️ Verify schema constraints | **PASS — Database-level unique constraint enforced.**<br><br>**✅ Prisma schema:**<br>`zanId String @unique` — database-level constraint<br><br>**✅ Application-level check:**<br>`findUnique` query in manual entry and bulk upload.<br><br>**✅ DB verification:**<br>```sql<br>SELECT "zanId", COUNT(*) FROM "Employee"<br>GROUP BY "zanId" HAVING COUNT(*) > 1<br>```<br>Result: 0 duplicate ZAN IDs found.<br><br>**✅ Validate endpoint confirms:**<br>`POST /api/employees/validate {"zanId":"610187320"}` → `{"zanIdExists":true}`<br><br>**Note:** HRIMS sync uses upsert pattern (update if exists, create if not), which is idempotent. | **PASS** | ZAN ID uniqueness enforced at database level. |
| 6.4 | Unique ZSSF Validation | 1. Duplicate ZSSF<br>2. Submit | - Rejected<br>- No duplicates | ⚠️ Verify schema constraints | **FAIL — No unique constraint, duplicates exist.**<br><br>**❌ No database-level unique constraint:**<br>`zssfNumber` has no `@unique` or `@@index`.<br><br>**❌ No application-level check in creation endpoints:**<br>Manual entry does NOT check ZSSF uniqueness.<br>Bulk upload checks intra-file only, NOT against DB.<br><br>**❌ Duplicate ZSSF numbers exist in DB:**<br>```sql<br>SELECT "zssfNumber", COUNT(*) FROM "Employee"<br>GROUP BY "zssfNumber" HAVING COUNT(*) > 1<br>```<br>Result: 5+ duplicate ZSSF numbers found:<br>- `00076967` → 2 records<br>- `00048323` → 2 records<br>- `00101235` → 2 records<br>- `00044832` → 2 records<br>- `00120314` → 2 records<br><br>**Only validate endpoint checks:**<br>`POST /api/employees/validate {"zssfNumber":"00119711"}` → `{"zssfNumberExists":true}`<br>But this is unauthenticated and not used during creation. | **FAIL** | **P1:** Add ZSSF uniqueness check to creation endpoints. Consider `@unique` constraint. |
| 6.5 | Duplicate Detection | 1. Create employee matching existing record<br>2. Check detection | - Duplicate flagged<br>- User warned | ❌ Verify duplicate detection | **PARTIAL PASS — ZAN ID detected, payroll/ZSSF gaps.**<br><br>**✅ ZAN ID duplicate detection:**<br>- Database constraint prevents duplicates<br>- Application check returns 409<br><br>**⚠️ Payroll number duplicate detection:**<br>- Application check in manual entry/bulk upload<br>- But no DB constraint → concurrent requests could create duplicates<br>- HRIMS sync does NOT check payroll uniqueness<br><br>**❌ ZSSF number duplicate detection:**<br>- No check in manual entry<br>- Intra-file only in bulk upload<br>- No DB constraint<br>- HRIMS sync does NOT check ZSSF uniqueness<br><br>**❌ No fuzzy duplicate detection:**<br>No name + DOB matching for potential duplicates (e.g., same person with different ZAN IDs). | **PARTIAL** | **P1:** Add payroll/ZSSF checks to all creation paths. |
| 6.6 | Institution Validation | 1. Create employee with wrong institution<br>2. Submit | - Rejected<br>- Institution must match user's | ⚠️ Verify validation | **PASS — Institution properly validated.**<br><br>**✅ Manual entry:**<br>- `institutionId` forced to `auth.institutionId` (line 176)<br>- Cannot override via request body<br>- User must have non-null institutionId<br><br>**✅ Bulk upload:**<br>- Same forced institution pattern<br>- HRO cannot create employees for other institutions<br><br>**✅ HRIMS sync:**<br>- Institution looked up by `voteNumber`<br>- Returns 404 if vote number not found<br>- Employee associated with found institution<br><br>**Test result:** Invalid vote number `999` → `"Institution with vote number 999 not found"` | **PASS** | Institution validation works for all creation paths. |
| 6.7 | Audit Logging on Creation | 1. Create employee<br>2. Check audit | - `EMPLOYEE_CREATED` event<br>- Performer, timestamp, details | ✅ `audit-logger.ts:46` | **PARTIAL PASS — Manual/bulk logged, HRIMS not logged.**<br><br>**✅ Manual entry audit logging:**<br>`logEmployeeAction()` called with:<br>- action: `CREATED`<br>- eventType: `EMPLOYEE_CREATED`<br>- userId, username, role<br>- ipAddress, deviceInfo<br>- additionalData: `{ dataSource: 'MANUAL_ENTRY', institutionId, employeeName, employeeZanId }`<br><br>**✅ Bulk upload audit logging:**<br>Per-employee `logEmployeeAction()` with `dataSource: 'BULK_UPLOAD'` and `batchRow`.<br><br>**✅ Audit logs verified:**<br>4 `EMPLOYEE_CREATED` events found in audit trail.<br><br>**❌ HRIMS sync NOT audit logged:**<br>sync-employee, fetch-employee, bulk-fetch — none call `logEmployeeAction()`.<br><br>**❌ Validate endpoint NOT audit logged:**<br>Read-only, but could log enumeration attempts. | **PARTIAL** | **P1:** Add audit logging to all HRIMS sync endpoints. |
| 6.8 | Business Rule Validation | 1. Create employee with invalid data (e.g., future DOB)<br>2. Submit | - Business rules enforced<br>- Invalid data rejected | ⚠️ Verify business rules | **PARTIAL PASS — Basic validation exists, gaps remain.**<br><br>**✅ Manual entry validation:**<br>- Required fields: name, gender, zanId, dateOfBirth, zssfNumber, payrollNumber<br>- Phone regex: `/^0\d{9}$/`<br>- Returns 400 with specific error messages<br><br>**✅ Bulk upload validation:**<br>- Required fields: name, gender, zanId, dateOfBirth, zssfNumber, payrollNumber, cadre, ministry, department, employmentDate<br>- Gender: must be "Male" or "Female"<br>- Phone regex: `/^0\d{9}$/`<br>- Date format: YYYY-MM-DD<br>- Status enum: On Probation, Confirmed, Retired, On Leave, Suspended<br><br>**❌ No date validation:**<br>- No check for future dates (DOB, employment date)<br>- No check for reasonable age (e.g., DOB not 1800)<br><br>**❌ No name validation:**<br>- No length limits<br>- No character restrictions<br>- Could inject HTML/scripts in name field<br><br>**❌ No ZAN ID format validation:**<br>- No length check<br>- No format check (should be numeric?)<br><br>**✅ Input sanitization:**<br>`sanitize-input.ts` uses DOMPurify for XSS prevention on stored strings. | **PARTIAL** | **P2:** Add date range validation, name length limits, ZAN ID format check. |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 6.1 | Employee Creation Authorization | ⚠️ **PARTIAL** | Manual entry secure; HRIMS sync endpoints unauthenticated |
| 6.2 | Unique Payroll Number Validation | ❌ **FAIL** | No DB constraint; duplicate payroll numbers exist |
| 6.3 | Unique ZanID Validation | ✅ **PASS** | Database-level unique constraint enforced |
| 6.4 | Unique ZSSF Validation | ❌ **FAIL** | No constraint; duplicate ZSSF numbers exist |
| 6.5 | Duplicate Detection | ⚠️ **PARTIAL** | ZAN ID detected; payroll/ZSSF gaps |
| 6.6 | Institution Validation | ✅ **PASS** | Institution properly forced/validated |
| 6.7 | Audit Logging on Creation | ⚠️ **PARTIAL** | Manual/bulk logged; HRIMS not logged |
| 6.8 | Business Rule Validation | ⚠️ **PARTIAL** | Basic validation; no date/name/format checks |

**Overall: 2 PASS, 4 PARTIAL, 2 FAIL**

---

## Complete Vulnerability List (Section 6)

| Vuln ID | Case ID | Severity | Description | Impact | Remediation |
|---------|---------|----------|-------------|--------|-------------|
| CR-01 | 6.1 | 🔴 Critical | HRIMS sync-employee unauthenticated | Anonymous users can create/update employee records | Add `withAuth()` |
| CR-02 | 6.1 | 🔴 Critical | HRIMS fetch-employee unauthenticated | Anonymous users can fetch employee data from HRIMS | Add `withAuth()` |
| CR-03 | 6.1 | 🔴 Critical | HRIMS bulk-fetch unauthenticated | Anonymous users can trigger bulk sync | Add `withAuth()` |
| CR-04 | 6.1 | 🟠 High | HRIMS test endpoint unauthenticated | Exposes HRIMS API test results | Add auth or disable in production |
| CR-05 | 6.2 | 🟠 High | No `@unique` on payrollNumber | Duplicate payroll numbers exist; concurrent creates possible | Add `@unique` constraint |
| CR-06 | 6.4 | 🟠 High | No `@unique` on zssfNumber | Duplicate ZSSF numbers exist | Add uniqueness check |
| CR-07 | 6.7 | 🟠 High | HRIMS sync not audit logged | No audit trail for HRIMS-created employees | Add `logEmployeeAction()` |
| CR-08 | 6.5 | 🟡 Medium | No ZSSF check in manual entry | ZSSF duplicates can be created | Add ZSSF uniqueness check |
| CR-09 | 6.5 | 🟡 Medium | No payroll/ZSSF check in HRIMS sync | HRIMS sync can create duplicates | Add uniqueness checks |
| CR-10 | 6.8 | 🟡 Medium | No date range validation | Future dates, unreasonable ages accepted | Add date validation |
| CR-11 | 6.8 | 🟡 Low | No name length/format validation | Potential XSS via name field | Add name validation |

---

## Unauthenticated HRIMS Endpoints — Detail

### Endpoints Without Authentication

| Endpoint | Method | Risk | Data Exposed |
|----------|--------|------|--------------|
| `/api/hrims/sync-employee` | POST | 🔴 Critical | Creates/updates employees |
| `/api/hrims/fetch-employee` | POST | 🔴 Critical | Fetches employee PII from HRIMS |
| `/api/hrims/bulk-fetch` | POST | 🔴 Critical | Triggers bulk employee sync |
| `/api/hrims/fetch-by-institution` | POST | 🔴 Critical | Queues institution-wide sync |
| `/api/hrims/search-employee` | GET/POST | 🟠 High | Returns employee data + documents |
| `/api/hrims/sync-documents` | POST | 🟠 High | Syncs employee documents |
| `/api/hrims/sync-certificates` | POST | 🟠 High | Syncs employee certificates |
| `/api/hrims/test` | GET/POST | 🟠 High | Exposes HRIMS API test results |
| `/api/hrims/sync-status/[jobId]` | GET | 🟡 Medium | Job status information |

### Test Results

```bash
# Test: Bulk fetch without auth (should return 401, returns 200)
curl -X POST "http://localhost:9002/api/hrims/bulk-fetch" \
  -H "Content-Type: application/json" \
  -d '{"institutionVoteNumber":"037","mode":"fast"}'

# Response:
{"success":true,"message":"Bulk fetch started for TUME YA UTUMISHI SERIKALINI..."}

# Test: Search employee without auth (should return 401, returns 200/404)
curl "http://localhost:9002/api/hrims/search-employee?zanId=610187320&institutionVoteNumber=037"

# Response:
{"success":false,"message":"Employee not found in the specified institution"}

# Test: HRIMS test endpoint without auth (should return 401, returns 200)
curl "http://localhost:9002/api/hrims/test"

# Response: Full HRIMS API test results
```

---

## Duplicate Data in Database

### Payroll Number Duplicates

```sql
SELECT "payrollNumber", COUNT(*) as count
FROM "Employee"
WHERE "payrollNumber" IS NOT NULL
GROUP BY "payrollNumber"
HAVING COUNT(*) > 1
LIMIT 5;
```

| Payroll Number | Count |
|----------------|-------|
| 124523 | 2 |
| 124961 | 2 |
| 130363 | 2 |
| 135191 | 2 |
| 137824 | 2 |

### ZSSF Number Duplicates

```sql
SELECT "zssfNumber", COUNT(*) as count
FROM "Employee"
WHERE "zssfNumber" IS NOT NULL
GROUP BY "zssfNumber"
HAVING COUNT(*) > 1
LIMIT 5;
```

| ZSSF Number | Count |
|-------------|-------|
| 00076967 | 2 |
| 00048323 | 2 |
| 00101235 | 2 |
| 00044832 | 2 |
| 00120314 | 2 |

### ZAN ID Duplicates

```sql
SELECT "zanId", COUNT(*) as count
FROM "Employee"
GROUP BY "zanId"
HAVING COUNT(*) > 1;
```

**Result:** 0 duplicates (unique constraint enforced ✅)

---

## What's Working Correctly

| # | Check | Result |
|---|-------|--------|
| 1 | Manual entry HRO-only authorization | ✅ `allowedRoles: ['HRO']` |
| 2 | Bulk upload HRO/ADMIN authorization | ✅ `allowedRoles: ['HRO', 'ADMIN']` |
| 3 | Institution forced to user's (manual/bulk) | ✅ Cannot override |
| 4 | `manualEntryEnabled` flag check | ✅ Returns 403 if disabled |
| 5 | Time window enforcement | ✅ `manualEntryStartDate/EndDate` |
| 6 | ZAN ID database unique constraint | ✅ `@unique` |
| 7 | ZAN ID application-level check | ✅ `findUnique` before create |
| 8 | Payroll application-level check | ✅ `findFirst` in manual/bulk |
| 9 | Intra-file duplicate detection (bulk) | ✅ Set-based ZAN/payroll/ZSSF |
| 10 | Required field validation | ✅ Returns 400 with specific errors |
| 11 | Phone number regex validation | ✅ `/^0\d{9}$/` |
| 12 | Gender enum validation | ✅ Male/Female only |
| 13 | Date format validation (bulk) | ✅ YYYY-MM-DD |
| 14 | Status enum validation (bulk) | ✅ On Probation, Confirmed, etc. |
| 15 | Manual entry audit logging | ✅ `EMPLOYEE_CREATED` event |
| 16 | Bulk upload audit logging | ✅ Per-employee `EMPLOYEE_CREATED` |
| 17 | Institution validation (HRIMS) | ✅ Vote number lookup |
| 18 | File validation (bulk upload) | ✅ MIME, size, malware scan |
| 19 | Rate limiting (bulk upload) | ✅ 10/min upload tier |
| 20 | Input sanitization (XSS) | ✅ DOMPurify |

---

## Remediation Priority

### P0 — Immediate (Block Production Deployment)

| # | Action | Affected Endpoint |
|---|--------|-------------------|
| 1 | Add `withAuth()` to sync-employee | `/api/hrims/sync-employee` |
| 2 | Add `withAuth()` to fetch-employee | `/api/hrims/fetch-employee` |
| 3 | Add `withAuth()` to bulk-fetch | `/api/hrims/bulk-fetch` |
| 4 | Add `withAuth()` to fetch-by-institution | `/api/hrims/fetch-by-institution` |
| 5 | Add `withAuth()` to search-employee | `/api/hrims/search-employee` |
| 6 | Add `withAuth()` to sync-documents | `/api/hrims/sync-documents` |
| 7 | Add `withAuth()` to sync-certificates | `/api/hrims/sync-certificates` |
| 8 | Add `withAuth()` to test endpoint (or disable) | `/api/hrims/test` |

### P1 — Short-Term (Before Go-Live)

| # | Action | Affected Endpoint |
|---|--------|-------------------|
| 9 | Add `@unique` constraint to `payrollNumber` | Database schema |
| 10 | Add ZSSF uniqueness check to manual entry | `/api/employees/manual-entry` |
| 11 | Add ZSSF uniqueness check to bulk upload | `/api/employees/bulk-upload` |
| 12 | Add payroll/ZSSF checks to HRIMS sync | `/api/hrims/sync-employee` |
| 13 | Add audit logging to all HRIMS endpoints | All HRIMS endpoints |
| 14 | Deduplicate existing payroll/ZSSF duplicates | Database cleanup |

### P2 — Medium-Term

| # | Action | Affected Endpoint |
|---|--------|-------------------|
| 15 | Add date range validation (DOB, employment) | All creation endpoints |
| 16 | Add name length/format validation | All creation endpoints |
| 17 | Add ZAN ID format validation | All creation endpoints |
| 18 | Consider `@unique` on `zssfNumber` | Database schema |

---

## Verification Commands

```bash
# Test CR-01: HRIMS sync without auth (should return 401, returns 500)
curl -X POST "http://localhost:9002/api/hrims/sync-employee" \
  -H "Content-Type: application/json" \
  -d '{"zanId":"123","institutionVoteNumber":"037"}'

# Test CR-03: HRIMS bulk-fetch without auth (should return 401, returns 200)
curl -X POST "http://localhost:9002/api/hrims/bulk-fetch" \
  -H "Content-Type: application/json" \
  -d '{"institutionVoteNumber":"037","mode":"fast"}'

# Test CR-04: HRIMS test without auth (should return 401, returns 200)
curl "http://localhost:9002/api/hrims/test"

# Test 6.2: Check for payroll duplicates
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.\$queryRaw\`SELECT \"payrollNumber\", COUNT(*) FROM \"Employee\" GROUP BY \"payrollNumber\" HAVING COUNT(*) > 1 LIMIT 5\`;
  console.log('Payroll duplicates:', d);
  await prisma.\$disconnect();
}
main();
"

# Test 6.3: ZAN ID uniqueness (should be 0 duplicates)
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.\$queryRaw\`SELECT \"zanId\", COUNT(*) FROM \"Employee\" GROUP BY \"zanId\" HAVING COUNT(*) > 1\`;
  console.log('ZAN ID duplicates:', d.length);
  await prisma.\$disconnect();
}
main();
"

# Test 6.7: Check audit logs for employee creation
curl -b admin-session "http://localhost:9002/api/audit/logs?action=EMPLOYEE_CREATED&limit=5"
```

---

## References

- `src/app/api/employees/manual-entry/route.ts` — Single employee creation (HRO only)
- `src/app/api/employees/bulk-upload/route.ts` — CSV bulk upload (HRO/ADMIN)
- `src/app/api/employees/validate/route.ts` — Uniqueness pre-check (unauthenticated)
- `src/app/api/hrims/sync-employee/route.ts` — Single employee sync (unauthenticated)
- `src/app/api/hrims/fetch-employee/route.ts` — Employee fetch with docs (unauthenticated)
- `src/app/api/hrims/bulk-fetch/route.ts` — Bulk employee fetch (unauthenticated)
- `src/app/api/hrims/fetch-by-institution/route.ts` — Institution sync queue (unauthenticated)
- `src/app/api/hrims/search-employee/route.ts` — Employee search (unauthenticated)
- `src/app/api/hrims/test/route.ts` — HRIMS test harness (unauthenticated)
- `prisma/schema.prisma` — Employee model with `@unique` on zanId only
- `src/lib/audit-logger.ts` — `logEmployeeAction()` for creation audit
- `src/lib/api-auth.ts` — `withAuth()` authentication wrapper
- `src/lib/file-validation.ts` — File upload validation

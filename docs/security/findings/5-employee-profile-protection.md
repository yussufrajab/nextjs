# Requirement 5: Employee Profile Protection — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 5)
> **Related:** `3-authorization-least-privilege.md`, `4-institution-data-isolation-consolidated.md`

---

## Test Environment

| Role | Username | Institution | Institution ID | Session Status |
|------|----------|-------------|----------------|----------------|
| HRO (Inst A) | `skawesu` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| HRO (Inst B) | `lela` | Baraza la Mitihani | `cmd1545dfaf1f7a12e14814` | ✅ Authenticated |
| HHRMD (CSC) | `skhamis` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| Admin | `ymrajab` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |

---

## Employee API Endpoint Inventory

| Route | Method | Auth | Role Restriction | Institution Filter | Ownership Check | Rate Limit |
|-------|--------|------|------------------|-------------------|-----------------|------------|
| `/api/employees` | GET | ✅ Yes | Any | Conditional (CSC=all, others=scoped) | No | Yes (read) |
| `/api/employees/search` | GET | ✅ Yes | 8 roles explicit | Yes + post-query validation | No | Yes (read) |
| `/api/employees/manual-entry` | POST | ✅ Yes | HRO only | Forced to user's institution | Yes (forced) | No |
| `/api/employees/bulk-upload` | POST/PUT | ✅ Yes | HRO, ADMIN | Forced to user's institution | Yes (forced) | Yes (upload) |
| `/api/employees/[id]/documents` | POST/GET | ✅ Yes | HRO, ADMIN | HRO: yes; CSC: no | HRO: institution check | Yes |
| `/api/employees/[id]/certificates` | POST/GET/DELETE | ✅ Yes | Varies by method | HRO: yes + MANUAL_ENTRY | HRO: institution + dataSource | Yes |
| `/api/employees/[id]/fetch-documents` | POST | ✅ Yes | Any | **None** | **None** | Yes |
| `/api/employees/[id]/fetch-photo` | POST | ✅ Yes | Any | **None** | **None** | Yes |
| `/api/employees/validate` | POST | ❌ **No** | None | None | None | ❌ **None** |
| `/api/employees/urgent-actions` | GET | ❌ **No** | None (client-supplied) | Client-supplied (forgeable) | None | ❌ **None** |
| `/api/employees/email` | PATCH | ✅ Yes | Any | No | EMPLOYEE: own-only | Yes |
| `/api/employees/email/check` | GET | ❌ **No** | None | None | None | ❌ **None** |

---

## Test Case No.: 5 — Requirement 5: Employee Profile Protection

**Process/Function Name:** Employee Data Access & Modification Protection

**Function Description:** Tests that employee information is protected from unauthorized access, modification, or disclosure.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 5.1 | Object-Level Authorization | 1. Access employee record via API<br>2. Try another user's employee | - Authorization on every object access<br>- Only authorized records returned | ⚠️ Verify per route | **PARTIAL PASS — Critical gaps found.**<br><br>**✅ Employee list (GET /api/employees):**<br>HRO sees only own institution employees (5,553 records). Institution filter applied via `shouldApplyInstitutionFilter()`.<br><br>**✅ Employee search (GET /api/employees/search):**<br>Post-query validation blocks cross-institution results. Returns 403 if unauthorized employees found.<br><br>**❌ Employee by ID — no ownership check:**<br>`GET /api/employees?id=<cross-institution-employee>` returns full record including ZAN ID, ZSSF, payroll, phone, address, DOB.<br><br>**Test result:** HRO (Inst A) accessed employee from Inst B:<br>```<br>Name: Arafa Muhamad Salum<br>Institution: cmd06xe4b0010e6bqt54zkblq (NOT HRO's)<br>ZAN ID: 610187320<br>ZSSF: 00119711<br>Payroll: 676141<br>```<br><br>**Root cause:** Employee lookup by ID has no institution ownership check. Any authenticated user can access any employee by ID. | **FAIL** | **P0 Critical:** Add institution ownership check to employee ID lookup. |
| 5.2 | Employee Ownership Validation | 1. Employee A accesses Employee B<br>2. Check validation | - Ownership verified<br>- Access denied if not owner | ⚠️ Verify per route | **FAIL — No ownership validation on direct ID access.**<br><br>**❌ Cross-institution employee access:**<br>HRO (TUME YA UTUMISHI SERIKALINI) successfully accessed employee from different institution (cmd06xe4b...).<br><br>**✅ Document ownership check:**<br>`GET /api/employees/<cross-institution>/documents` → `{"success":false,"message":"Access denied"}`<br><br>**✅ Certificate ownership check:**<br>`GET /api/employees/<cross-institution>/certificates` → `{"success":false,"message":"Access denied"}`<br><br>**❌ Fetch-photo no ownership check:**<br>`POST /api/employees/<cross-institution>/fetch-photo` → 200, photo fetched and stored.<br><br>**❌ Fetch-documents no ownership check:**<br>`POST /api/employees/<cross-institution>/fetch-documents` → 200 (no docs found, but no 403). | **FAIL** | **P0:** Add ownership check to employee ID lookup, fetch-photo, fetch-documents. |
| 5.3 | Profile Access Validation | 1. Employee views own profile<br>2. Employee views another's profile | - Self-access allowed<br>- Other denied | ⚠️ Verify employee routes | **FAIL — Employee can access any employee record.**<br><br>**❌ No self-only restriction:**<br>Employee role has no restriction on which employee records they can view. The `/api/employees` endpoint allows any authenticated user to query.<br><br>**✅ Employee email update restricted:**<br>`PATCH /api/employees/email` restricts EMPLOYEE role to updating only their own email (line 73-79).<br><br>**Gap:** Employee role should only see their own employee record, not all employees in the system. | **FAIL** | **P1:** Add employee self-only restriction for EMPLOYEE role. |
| 5.4 | Record Update Authorization | 1. Attempt to update employee record<br>2. Verify authorization | - Only authorized roles can update<br>- Unauthorized update blocked | ⚠️ Verify update routes | **PARTIAL PASS — Update restrictions exist but gaps remain.**<br><br>**✅ Manual entry (POST /api/employees/manual-entry):**<br>- HRO only (`allowedRoles: ['HRO']`)<br>- Institution forced to user's institution<br>- `manualEntryEnabled` flag required<br>- Time window enforced<br>- Uniqueness checks on ZAN ID, payroll<br><br>**✅ Bulk upload (POST/PUT /api/employees/bulk-upload):**<br>- HRO and ADMIN only<br>- Institution forced to user's institution<br>- File validation via `validateFileUpload()`<br><br>**❌ Email update — no institution check:**<br>`PATCH /api/employees/email` allows HRO to update any employee's email (no institution ownership check for HRO role).<br><br>**❌ No direct employee record update endpoint:**<br>No PUT/PATCH for employee fields (name, cadre, etc.) — updates only via HRIMS sync or manual entry. | **PARTIAL** | **P1:** Add institution check to email update for HRO. |
| 5.5 | Sensitive Field Protection | 1. View employee record<br>2. Check for sensitive fields (ZAN ID, ZSSF, Payroll) | - Sensitive fields masked/controlled<br>- Full value only when necessary | ✅ `sanitize-response.ts` (24 fields) | **FAIL — No employee field masking exists.**<br><br>**❌ All sensitive fields returned in full:**<br><br>Tested via `GET /api/employees?id=<employee>`:<br>```<br>zanId: 320016831          ← Full ZAN ID exposed<br>zssfNumber: 00055571      ← Full ZSSF exposed<br>payrollNumber: 836964     ← Full payroll exposed<br>phoneNumber: 0773152142   ← Full phone exposed<br>contactAddress: S/K/244, Mariyam Clinic, PEMBA  ← Full address exposed<br>dateOfBirth: 1983-05-10   ← Full DOB exposed<br>placeOfBirth: KENDWA      ← Full birthplace exposed<br>```<br><br>**Also exposed via search endpoint:**<br>`GET /api/employees/search?q=Arafa` returns same unmasked fields.<br><br>**Root cause:** `sanitize-response.ts` only handles User objects (passwords, lockout fields). No equivalent exists for Employee objects.<br><br>**Impact:** All 40,000+ employee records expose PII to any authenticated user. | **FAIL** | **P0 Critical:** Create `sanitizeEmployee()` function to mask ZAN ID, ZSSF, payroll, phone, address. |
| 5.6 | Access Logging | 1. Access employee record<br>2. Check audit trail | - Access event logged<br>- User, employee, timestamp recorded | ⚠️ Verify access logging | **PARTIAL PASS — Creation/update logged, access not logged.**<br><br>**✅ Employee creation logged:**<br>`logEmployeeAction()` called on manual-entry with action 'CREATED'.<br><br>**✅ Document operations logged:**<br>`logFileAction()` called on document upload/download.<br><br>**✅ Certificate operations logged:**<br>`logFileAction()` called on certificate CRUD.<br><br>**❌ Employee list access NOT logged:**<br>`GET /api/employees` does not log access events. No record of who viewed employee records.<br><br>**❌ Employee search NOT logged:**<br>`GET /api/employees/search` does not log search queries or results accessed.<br><br>**❌ Employee detail access NOT logged:**<br>`GET /api/employees?id=<employee>` does not log which employee records were viewed.<br><br>**Recommendation:** Log employee record access for audit trail, especially for sensitive fields. | **PARTIAL** | **P1:** Add access logging for employee record views. |
| 5.7 | Record Integrity Validation | 1. Modify employee record<br>2. Check integrity | - Tampering detected<br>- Integrity preserved | ⚠️ Verify checksums/versioning | **PARTIAL PASS — No checksums, but controlled update paths.**<br><br>**✅ Controlled update paths:**<br>- Manual entry: HRO only, institution forced<br>- Bulk upload: HRO/ADMIN only, institution forced<br>- HRIMS sync: External system, validated<br><br>**❌ No checksum/version field:**<br>Employee records have no `checksum`, `version`, or `hash` field for integrity verification.<br><br>**❌ No tamper detection:**<br>If an employee record is modified (e.g., via direct DB access), there's no mechanism to detect the change.<br><br>**✅ DataSource tracking:**<br>`dataSource` field tracks origin (HRIMS, MANUAL_ENTRY, BULK_UPLOAD).<br><br>**Recommendation:** Add `updatedAt` timestamp and consider checksums for critical fields. | **PARTIAL** | **P2:** Consider adding integrity checksums for employee records. |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 5.1 | Object-Level Authorization | ❌ **FAIL** | Employee by ID has no ownership check; full PII exposed |
| 5.2 | Employee Ownership Validation | ❌ **FAIL** | Cross-institution access works for employee lookup, fetch-photo, fetch-documents |
| 5.3 | Profile Access Validation | ❌ **FAIL** | EMPLOYEE role can access any employee record |
| 5.4 | Record Update Authorization | ⚠️ **PARTIAL** | Manual entry/bulk upload secure; email update lacks institution check |
| 5.5 | Sensitive Field Protection | ❌ **FAIL** | All sensitive fields (ZAN ID, ZSSF, payroll, phone, address) unmasked |
| 5.6 | Access Logging | ⚠️ **PARTIAL** | Creation/CRUD logged; record views not logged |
| 5.7 | Record Integrity Validation | ⚠️ **PARTIAL** | Controlled update paths; no checksums or tamper detection |

**Overall: 0 PASS, 3 PARTIAL, 4 FAIL**

---

## Complete Vulnerability List (Section 5)

| Vuln ID | Case ID | Severity | Description | Impact | Remediation |
|---------|---------|----------|-------------|--------|-------------|
| EMP-01 | 5.1, 5.2 | 🔴 Critical | Employee lookup by ID has no institution ownership check | Any authenticated user can access any employee's full PII | Add `employee.institutionId === auth.institutionId` check |
| EMP-02 | 5.5 | 🔴 Critical | No employee field masking — ZAN ID, ZSSF, payroll, phone, address exposed | 40,000+ employee records' PII exposed to all authenticated users | Create `sanitizeEmployee()` to mask sensitive fields |
| EMP-03 | 5.1, 5.2 | 🟠 High | `/api/employees/validate` unauthenticated — ZAN ID enumeration | Attacker can enumerate all ZAN IDs in database | Add authentication + rate limiting |
| EMP-04 | 5.1, 5.2 | 🟠 High | `/api/employees/urgent-actions` unauthenticated — role spoofing | Anonymous users see all institutions' employee data | Add authentication, use session for role |
| EMP-05 | 5.1, 5.2 | 🟠 High | `/api/employees/email/check` unauthenticated — email enumeration | Attacker can enumerate employee emails | Add authentication |
| EMP-06 | 5.2 | 🟠 High | `/api/employees/[id]/fetch-photo` no institution check | HRO can fetch photos from any institution | Add institution ownership check |
| EMP-07 | 5.2 | 🟠 High | `/api/employees/[id]/fetch-documents` no institution check | HRO can trigger HRIMS fetch for any employee | Add institution ownership check |
| EMP-08 | 5.1 | 🟠 High | Employee list `?institutionId=` overrides session filter | HRO views employees from any institution | Remove or validate query param against session |
| EMP-09 | 5.3 | 🟡 Medium | EMPLOYEE role can access any employee record | Employee self-service sees all employees | Add self-only restriction for EMPLOYEE role |
| EMP-10 | 5.4 | 🟡 Medium | Email update has no institution check for HRO | HRO can update any employee's email | Add institution ownership check |
| EMP-11 | 5.6 | 🟡 Medium | Employee record views not audit logged | No audit trail for PII access | Add access logging for employee views |
| EMP-12 | 5.7 | 🟡 Low | No integrity checksums on employee records | Cannot detect tampering | Add checksum/version field |

---

## Unauthenticated Endpoints — Detail

### 1. `/api/employees/validate` — ZAN ID Enumeration

**Risk:** 🟠 High

```bash
# Test: Unauthenticated ZAN ID check
curl -X POST "http://localhost:9002/api/employees/validate" \
  -H "Content-Type: application/json" \
  -d '{"zanId":"610187320"}'

# Response:
{"success":true,"zanIdExists":true,"payrollNumberExists":false,"zssfNumberExists":false}
```

**Impact:** Attacker can enumerate all ZAN IDs, payroll numbers, and ZSSF numbers in the database. No authentication. No rate limiting.

**Remediation:** Add `withAuth()` and rate limiting.

---

### 2. `/api/employees/urgent-actions` — Role Spoofing

**Risk:** 🟠 High

```bash
# Test: Unauthenticated with role spoofing
curl "http://localhost:9002/api/employees/urgent-actions?userRole=HHRMD"

# Response: Returns 3 employees with names, ZAN IDs, statuses, dates
```

**Impact:** Anonymous users can access employee data by claiming a CSC role via query parameter. No authentication. Client-supplied `userRole` and `userInstitutionId` are trusted.

**Remediation:** Add `withAuth()`, use `auth.role` and `auth.institutionId` from session.

---

### 3. `/api/employees/email/check` — Email Enumeration

**Risk:** 🟡 Medium

```bash
# Test: Unauthenticated email check
curl "http://localhost:9002/api/employees/email/check?email=info@zanajira.go.tz"

# Response:
{"inUse":false}
```

**Impact:** Attacker can enumerate which email addresses are in use across User and Employee tables.

**Remediation:** Add authentication.

---

## Sensitive Field Exposure — Detail

### Fields Exposed Without Masking

| Field | Example Value | Risk Level | Should Mask? |
|-------|---------------|------------|--------------|
| `zanId` | `320016831` | 🔴 High | Yes — partial mask (e.g., `***16831`) |
| `zssfNumber` | `00055571` | 🔴 High | Yes — partial mask |
| `payrollNumber` | `836964` | 🔴 High | Yes — partial mask |
| `phoneNumber` | `0773152142` | 🟠 Medium | Yes — partial mask |
| `contactAddress` | `S/K/244, Mariyam Clinic, PEMBA` | 🟠 Medium | Yes — redact for non-privileged |
| `dateOfBirth` | `1983-05-10` | 🟡 Low | Consider masking |
| `placeOfBirth` | `KENDWA` | 🟡 Low | Consider masking |

### Recommended Sanitization

```typescript
// Proposed sanitizeEmployee() function
const SENSITIVE_EMPLOYEE_FIELDS = {
  zanId: (val) => val ? '***' + val.slice(-4) : val,
  zssfNumber: (val) => val ? '***' + val.slice(-4) : val,
  payrollNumber: (val) => val ? '***' + val.slice(-4) : val,
  phoneNumber: (val) => val ? '***' + val.slice(-4) : val,
  contactAddress: () => '[REDACTED]',
};

function sanitizeEmployee(employee, requestingRole) {
  if (['HRO', 'HHRMD', 'HRMO', 'ADMIN'].includes(requestingRole)) {
    return employee; // Full access for privileged roles
  }
  // Mask sensitive fields for other roles
  const sanitized = { ...employee };
  for (const [field, maskFn] of Object.entries(SENSITIVE_EMPLOYEE_FIELDS)) {
    if (sanitized[field]) {
      sanitized[field] = maskFn(sanitized[field]);
    }
  }
  return sanitized;
}
```

---

## What's Working Correctly

| # | Check | Result |
|---|-------|--------|
| 1 | Employee list institution filtering (default) | ✅ HRO sees own institution only |
| 2 | Employee search post-query validation | ✅ 403 if cross-institution results |
| 3 | Document access ownership check | ✅ "Access denied" for cross-institution |
| 4 | Certificate access ownership check | ✅ "Access denied" for cross-institution |
| 5 | Manual entry institution forced | ✅ Cannot override institutionId |
| 6 | Bulk upload institution forced | ✅ Cannot override institutionId |
| 7 | Manual entry uniqueness checks | ✅ ZAN ID, payroll checked |
| 8 | Manual entry time window | ✅ manualEntryStartDate/EndDate enforced |
| 9 | Email update EMPLOYEE self-only | ✅ EMPLOYEE can only update own email |
| 10 | Document upload audit logging | ✅ logFileAction() called |
| 11 | Certificate CRUD audit logging | ✅ logFileAction() called |
| 12 | Employee creation audit logging | ✅ logEmployeeAction() called |
| 13 | DataSource tracking | ✅ HRIMS/MANUAL_ENTRY/BULK_UPLOAD |

---

## Remediation Priority

### P0 — Immediate (Block Production Deployment)

| # | Action | Affected Endpoint |
|---|--------|-------------------|
| 1 | Add institution ownership check to employee ID lookup | `/api/employees?id=<employee>` |
| 2 | Create `sanitizeEmployee()` for sensitive field masking | All employee endpoints |
| 3 | Add `withAuth()` to validate endpoint | `/api/employees/validate` |
| 4 | Add `withAuth()` to urgent-actions endpoint | `/api/employees/urgent-actions` |
| 5 | Add `withAuth()` to email/check endpoint | `/api/employees/email/check` |
| 6 | Add institution check to fetch-photo | `/api/employees/[id]/fetch-photo` |
| 7 | Add institution check to fetch-documents | `/api/employees/[id]/fetch-documents` |

### P1 — Short-Term (Before Go-Live)

| # | Action | Affected Endpoint |
|---|--------|-------------------|
| 8 | Remove `institutionId` query param override | `/api/employees` |
| 9 | Add EMPLOYEE self-only restriction | `/api/employees` |
| 10 | Add institution check to email update | `/api/employees/email` |
| 11 | Add access logging for employee views | All employee GET endpoints |
| 12 | Add rate limiting to validate endpoint | `/api/employees/validate` |

### P2 — Medium-Term

| # | Action | Affected Endpoint |
|---|--------|-------------------|
| 13 | Add integrity checksums to employee records | Database schema |
| 14 | Add `updatedAt` tracking | Database schema |

---

## Verification Commands

```bash
# Test EMP-01: Cross-institution employee access (should return 403, returns 200)
curl -b session.txt "http://localhost:9002/api/employees?id=<other-institution-employee>"

# Test EMP-02: Sensitive field exposure (should be masked, returns full)
curl -b session.txt "http://localhost:9002/api/employees?id=<employee>" | grep zanId

# Test EMP-03: Unauthenticated validation (should return 401, returns 200)
curl -X POST "http://localhost:9002/api/employees/validate" \
  -H "Content-Type: application/json" -d '{"zanId":"610187320"}'

# Test EMP-04: Unauthenticated urgent-actions (should return 401, returns 200)
curl "http://localhost:9002/api/employees/urgent-actions?userRole=HHRMD"

# Test EMP-05: Unauthenticated email check (should return 401, returns 200)
curl "http://localhost:9002/api/employees/email/check?email=test@test.com"

# Test EMP-06: Fetch-photo cross-institution (should return 403, returns 200)
curl -b session.txt -X POST "http://localhost:9002/api/employees/<other-emp>/fetch-photo"

# Test EMP-08: Institution override (should return own institution only)
curl -b session.txt "http://localhost:9002/api/employees?institutionId=<other-institution>"
```

---

## References

- `src/app/api/employees/route.ts` — Main employee list (institution filter overridable)
- `src/app/api/employees/search/route.ts` — Search with post-query validation
- `src/app/api/employees/validate/route.ts` — **Unauthenticated** validation endpoint
- `src/app/api/employees/urgent-actions/route.ts` — **Unauthenticated** with role spoofing
- `src/app/api/employees/email/check/route.ts` — **Unauthenticated** email check
- `src/app/api/employees/[id]/documents/route.ts` — Document CRUD with ownership check
- `src/app/api/employees/[id]/certificates/route.ts` — Certificate CRUD with ownership check
- `src/app/api/employees/[id]/fetch-documents/route.ts` — HRIMS sync, **no institution check**
- `src/app/api/employees/[id]/fetch-photo/route.ts` — Photo sync, **no institution check**
- `src/app/api/employees/email/route.ts` — Email update, EMPLOYEE self-only
- `src/lib/sanitize-response.ts` — User field masking only (no employee masking)
- `src/lib/role-utils.ts` — `shouldApplyInstitutionFilter()`, CSC roles

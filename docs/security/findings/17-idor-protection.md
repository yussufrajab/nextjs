# Requirement 17: Direct Object Reference (IDOR) Protection

**Application:** CSMS (Civil Service Management System)  
**URL:** http://localhost:9002  
**Branch:** feat/err01-batch3-wrap-handler  
**Test Date:** 2026-07-03  
**Tester:** Automated Security Test  

---

## Executive Summary

**Overall Status: FAIL**

The CSMS application contains **critical IDOR vulnerabilities** in the employee data API. Any authenticated EMPLOYEE user can access the full personal records (including payroll numbers, ZSSF numbers, addresses, dates of birth, phone numbers, and document URLs) of **any other employee** in the system, regardless of institution or relationship. The vulnerability exists because the primary employee lookup endpoint (`GET /api/employees?id=<uuid>`) performs **no ownership or institution-level authorization check** on the single-employee code path.

Additionally, employee certificates and documents endpoints only enforce institution-level filtering for the HRO role, leaving EMPLOYEE, HRMO, and other roles unrestricted. No IDOR-related access attempts are logged in the audit system.

---

## Test Environment

### Test Accounts

| Account | Username | Role | Employee ID | Institution |
|---------|----------|------|-------------|-------------|
| User 1 | `abdillahomarnajim` | EMPLOYEE | `92f9adf9-15d0-445e-a3db-d24adf76b4dd` | WAKALA WA MAJENGO ZANZIBAR (`cmd06xe30000fe6bqe6ljiz1v`) |
| User 2 | `abdullaameiramour` | EMPLOYEE | `97ce0547-8122-45b9-822e-75c61a88f744` | WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO (`cmd06xe3l000oe6bq5drrocqt`) |

### API Endpoints Tested

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees?id=<uuid>` | GET | Single employee lookup (VULNERABLE) |
| `/api/employees` | GET | Employee list (properly filtered) |
| `/api/employees/[id]/certificates` | GET | Employee certificates (VULNERABLE for non-HRO) |
| `/api/employees/[id]/documents` | GET | Employee documents (VULNERABLE for non-HRO) |
| `/api/employees/[id]/fetch-documents` | POST | HRIMS document fetch (auth-only, no role check) |
| `/api/employees/[id]/fetch-photo` | POST | HRIMS photo fetch (auth-only, no role check) |
| `/api/files/employee-documents/<id>_<type>.pdf` | GET | Direct file download |
| `/api/auth/me` | GET | Current user profile (properly scoped) |

### Authentication Mechanism

- **Session Cookie:** HMAC-SHA256 signed HttpOnly cookie (`session`)
- **Format:** `<raw-token>.<expiry-unix-ms>.<hmac-signature>`
- **Session Storage:** PostgreSQL `Session` table with IP/UA binding
- **Session Limit:** Max 3 concurrent sessions per user
- **Expiry:** 24 hours

---

## Test Results

### 17.1 -- Object Ownership Validation

**Status: FAIL**

#### 17.1a -- User1 accesses OWN employee record

**Command:**
```bash
curl -s -b "session=<user1-session>" \
  "http://localhost:9002/api/employees?id=92f9adf9-15d0-445e-a3db-d24adf76b4dd"
```

**Result:** HTTP 200 -- PASS

```
success=true, data=[{name: "ABDILLAH OMAR NAJIM", zanId: "60363181", status: "Confirmed"}]
```

Users can access their own employee data. This is expected behavior.

#### 17.1b -- User1 accesses OTHER employee (User2) data

**Command:**
```bash
curl -s -b "session=<user1-session>" \
  "http://localhost:9002/api/employees?id=97ce0547-8122-45b9-822e-75c61a88f744"
```

**Result:** HTTP 200 -- **VULNERABILITY**

```
Exposed data for User2 (Abdulla Ameir Amour):
  name: Abdulla Ameir Amour
  zanId: 620161606
  payrollNumber: 773194
  zssfNumber: 00116024
  phoneNumber: 0773622167
  dateOfBirth: 1996-03-04T00:00:00.000Z
  contactAddress: 49, Mkarafuuni, ZANZIBAR
  institutionId: cmd059ion0000e6d85kexfukl
  status: On Probation
  gender: Female
```

**Severity:** CRITICAL -- Full PII including payroll, ZSSF, phone, address, and DOB exposed.

#### 17.1c -- User2 accesses OTHER employee (User1) data (reverse direction)

**Command:**
```bash
curl -s -b "session=<user2-session>" \
  "http://localhost:9002/api/employees?id=92f9adf9-15d0-445e-a3db-d24adf76b4dd"
```

**Result:** HTTP 200 -- **VULNERABILITY**

```
Exposed data for User1 (ABDILLAH OMAR NAJIM):
  name: ABDILLAH OMAR NAJIM
  zanId: 60363181
  payrollNumber: 383356
  zssfNumber: 00128420
  dateOfBirth: 1992-05-28T00:00:00.000Z
  contactAddress: Sh/mss/c/610, Fuoni mambosasa zoni C, Zanzibar
  institutionId: cmd06xe30000fe6bqe6ljiz1v
```

**Severity:** CRITICAL -- Bidirectional IDOR confirmed. Any employee can access any other employee's data.

**Root Cause:** In `src/app/api/employees/route.ts` (lines 45-100), the `?id=` code path performs a direct `db.employee.findUnique()` with no ownership or institution check:

```typescript
// Line 46-64: No authorization check before querying
if (employeeId) {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    include: { Institution: { ... }, EmployeeCertificate: { ... } },
  });
  // Returns data directly with no ownership verification
}
```

---

### 17.2 -- Object-Level Authorization

**Status: FAIL**

#### 17.2a -- User1 accesses User2's certificates

**Command:**
```bash
curl -s -b "session=<user1-session>" \
  "http://localhost:9002/api/employees/97ce0547-8122-45b9-822e-75c61a88f744/certificates"
```

**Result:** HTTP 200 -- **VULNERABILITY**

```
2 certificates accessed:
  - Educational Certification: Educational Certification
  - Educational Certification: Educational Certification 2
```

**Root Cause:** In `src/app/api/employees/[id]/certificates/route.ts` (lines 246-254), institution filtering only applies to HRO role:

```typescript
// Line 247-253: Only HRO is restricted
if (userRole === 'HRO') {
  if (employee.institutionId !== userInstitutionId) {
    return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 });
  }
}
// EMPLOYEE, HRMO, DO, CSCS, PO roles: NO CHECK
```

#### 17.2b -- User1 accesses User2's documents

**Command:**
```bash
curl -s -b "session=<user1-session>" \
  "http://localhost:9002/api/employees/97ce0547-8122-45b9-822e-75c61a88f744/documents"
```

**Result:** HTTP 200 -- **VULNERABILITY**

```
4 documents accessed:
  - ardhil-hali: /api/files/employee-documents/97ce0547-8122-45b9-822e-75c61a88f744_ardhilHali.pdf
  - confirmation-letter: /api/files/employee-documents/97ce0547-8122-45b9-822e-75c61a88f744_confirmationLetter.pdf
  - job-contract: /api/files/employee-documents/97ce0547-8122-45b9-822e-75c61a88f744_jobContract.pdf
  - birth-certificate: /api/files/employee-documents/97ce0547-8122-45b9-822e-75c61a88f744_birthCertificate.pdf
```

**Root Cause:** Same pattern as certificates -- `src/app/api/employees/[id]/documents/route.ts` (lines 193-201) only checks HRO role.

#### 17.2c -- User2 accesses User1's documents

**Result:** HTTP 200 -- **VULNERABILITY** (4 documents accessed, same as above)

#### 17.2d -- Unauthenticated access

**Command:**
```bash
curl -s "http://localhost:9002/api/employees?id=92f9adf9-15d0-445e-a3db-d24adf76b4dd"
```

**Result:** HTTP 401 -- PASS

```json
{"success": false, "error": "Authentication required", "errorCode": "UNAUTHENTICATED"}
```

Authentication is required. The vulnerability is only exploitable by authenticated users.

---

### 17.3 -- Resource Access Validation

**Status: PARTIAL PASS**

#### 17.3a -- Employee list endpoint (institution filtering)

**Command:**
```bash
curl -s -b "session=<user1-session>" "http://localhost:9002/api/employees"
```

**Result:** HTTP 200 -- PASS

```
Total employees returned: 4
Unique institutions: 1
Own institution only: True
```

The list endpoint properly filters by institution for EMPLOYEE users. Only employees from the user's own institution are returned.

#### 17.3b -- File download endpoint

**Command:**
```bash
curl -s -o /dev/null -w "%{http_code}" -b "session=<user1-session>" \
  "http://localhost:9002/api/files/employee-documents/97ce0547-8122-45b9-822e-75c61a88f744_ardhilHali.pdf"
```

**Result:** HTTP 401 -- PASS (session expired during test, but file URLs are still exposed via the documents endpoint)

**Note:** While the file download endpoint itself requires authentication, the document URLs are leaked through the IDOR-vulnerable `/api/employees/[id]/documents` endpoint, which could enable direct file access with a valid session.

#### 17.3c -- fetch-documents and fetch-photo endpoints

**Result:** HTTP 405 (GET) / auth-only (POST)

These endpoints use `verifyAuth()` only with no role or institution check. Any authenticated user can trigger HRIMS document/photo fetches for any employee.

---

### 17.4 -- Secure Object References

**Status: PASS (with caveat)**

#### UUID Format Verification

```
Employee IDs:
  92f9adf9-15d0-445e-a3db-d24adf76b4dd -> UUID v4: True
  97ce0547-8122-45b9-822e-75c61a88f744 -> UUID v4: True

User IDs:
  emp_94e5c58390bec815fbe3ad8c929cae0c -> UUID: False (custom prefix)
  emp_dd10bcb6a744a884874be2d97015b018 -> UUID: False (custom prefix)
```

Employee IDs use UUID v4 format (non-sequential, 36-character with dashes). This prevents simple enumeration attacks. However, UUIDs are **not secret** -- they appear in API responses and can be collected through the unprotected list endpoint or leaked through other means.

**Caveat:** User IDs use a custom `emp_` prefix format rather than standard UUIDs. While still non-sequential, the prefix is predictable.

---

### 17.5 -- Server-Side Identifier Validation

**Status: PASS**

#### Non-existent UUID

**Command:**
```bash
curl -s -b "session=<session>" "http://localhost:9002/api/employees?id=not-a-uuid"
```

**Result:**
```json
{"success": false, "message": "Employee not found"}
```

The server validates that the provided ID corresponds to an existing employee and returns a 404 for non-existent IDs. No SQL injection or error leakage observed.

#### Invalid format

**Command:**
```bash
curl -s -b "session=<session>" "http://localhost:9002/api/employees?id=1"
```

**Result:** `{"success": false, "message": "Employee not found"}`

Sequential integer IDs are handled gracefully. The server does not crash or leak information.

---

### 17.6 -- Access Denial Logging

**Status: FAIL**

#### Audit Log Analysis

```
Total audit entries for July 2026: 360+
Event types logged:
  LOGIN_SUCCESS: 294
  LOGIN_FAILED: 133
  USER_UPDATED: 23
  LOGOUT: 16
  ACCOUNT_LOCKED: 11
  FILE_UPLOADED: 9
  CSRF_VIOLATION: 7
  FILE_DOWNLOADED: 5
  ...
  UNAUTHORIZED_ACCESS: 1 (test entry only, route=/test)
```

**IDOR-related audit entries for employee endpoints: 0**

The audit logging infrastructure exists (`src/lib/audit-logger.ts`) with event types including `UNAUTHORIZED_ACCESS`, `ACCESS_DENIED`, `FORBIDDEN_ROUTE`, `ROLE_VIOLATION`, and `PERMISSION_DENIED`. However, **none of these are triggered** when:

- An employee accesses another employee's data via `?id=`
- An employee accesses another employee's certificates
- An employee accesses another employee's documents
- An employee from a different institution accesses restricted resources

The only `UNAUTHORIZED_ACCESS` entry in the audit log was a manual test entry (`route=/test`), not from actual IDOR attempts.

**Impact:** Without access denial logging, there is no way to detect or investigate IDOR exploitation. An attacker could enumerate the entire employee database without leaving a trace in the audit system.

---

## Vulnerability Summary

| Test Case | Description | Status | Severity |
|-----------|-------------|--------|----------|
| 17.1 | Object Ownership Validation | **FAIL** | CRITICAL |
| 17.2 | Object-Level Authorization | **FAIL** | CRITICAL |
| 17.3 | Resource Access Validation | **PARTIAL PASS** | MEDIUM |
| 17.4 | Secure Object References | **PASS** | -- |
| 17.5 | Server-Side Identifier Validation | **PASS** | -- |
| 17.6 | Access Denial Logging | **FAIL** | HIGH |

---

## Detailed Findings

### Finding 1: IDOR on Employee Data Lookup (CRITICAL)

**Endpoint:** `GET /api/employees?id=<employee-uuid>`  
**File:** `src/app/api/employees/route.ts` (lines 45-100)  
**Impact:** Any authenticated user can retrieve the full personal record of any employee in the system, including:
- Full name, gender, date of birth, place of birth
- ZAN ID, payroll number, ZSSF number
- Phone number, email, contact address
- Institution, department, cadre, salary scale
- Employment dates, contract type, status
- Document URLs (ardhilHali, jobContract, birthCertificate)

**Reproduction:**
```bash
# Login as any employee
curl -s -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"any-employee","password":"..."}'

# Access any other employee's data
curl -s -b "session=<token>" \
  "http://localhost:9002/api/employees?id=<any-employee-uuid>"
```

**Fix:** Add ownership or institution-level check on the `?id=` code path. At minimum, restrict EMPLOYEE role to only see their own record. For HRO/HRMO roles, enforce institution filtering.

### Finding 2: IDOR on Employee Certificates (HIGH)

**Endpoint:** `GET /api/employees/[id]/certificates`  
**File:** `src/app/api/employees/[id]/certificates/route.ts` (lines 246-254)  
**Impact:** Any authenticated non-HRO user can access any employee's certificates.

**Fix:** Apply institution filtering for all roles, not just HRO. Or require that EMPLOYEE role can only access their own certificates.

### Finding 3: IDOR on Employee Documents (HIGH)

**Endpoint:** `GET /api/employees/[id]/documents`  
**File:** `src/app/api/employees/[id]/documents/route.ts` (lines 193-201)  
**Impact:** Any authenticated non-HRO user can access any employee's document URLs, enabling direct file download.

**Fix:** Same as Finding 2 -- apply institution filtering for all roles.

### Finding 4: Missing IDOR Audit Logging (HIGH)

**Impact:** IDOR exploitation leaves no audit trail, making detection and investigation impossible.

**Fix:** Add `logAccessDenied()` or `logUnauthorizedAccess()` calls in the employee endpoints when:
- A user attempts to access another user's employee record
- A user attempts to access certificates/documents of an employee outside their institution
- Any cross-object access attempt is detected

---

## Recommendations

1. **Immediate (Critical):** Add ownership check to `GET /api/employees?id=<uuid>` -- EMPLOYEE role should only access their own record; HRO/HRMO should be institution-scoped.

2. **High Priority:** Extend institution-level filtering to all roles on certificates and documents endpoints, not just HRO.

3. **High Priority:** Wire audit logging to all employee data access endpoints, logging `UNAUTHORIZED_ACCESS` events when cross-object access is attempted.

4. **Medium Priority:** Add role-based access control to `fetch-documents` and `fetch-photo` endpoints (currently auth-only).

5. **Low Priority:** Consider adding rate limiting on employee data enumeration (e.g., limit how many different `?id=` lookups a user can perform per minute).

---

## Source Files Referenced

| File | Issue |
|------|-------|
| `src/app/api/employees/route.ts` | No ownership check on `?id=` path (line 45-100) |
| `src/app/api/employees/[id]/certificates/route.ts` | HRO-only institution check (line 247-253) |
| `src/app/api/employees/[id]/documents/route.ts` | HRO-only institution check (line 193-201) |
| `src/app/api/employees/[id]/fetch-documents/route.ts` | Auth-only, no role/institution check |
| `src/app/api/employees/[id]/fetch-photo/route.ts` | Auth-only, no role/institution check |
| `src/lib/api-auth.ts` | `verifyAuth()` -- session validation (working correctly) |
| `src/lib/audit-logger.ts` | Audit infrastructure exists but not wired to IDOR detection |
| `src/lib/role-utils.ts` | `shouldApplyInstitutionFilter()` -- only used on list path |

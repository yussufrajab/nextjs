# Institution Filtering in APIs — Security Test Report

**Date:** 2026-07-03  
**Test Type:** Institution Filtering Verification (Section 4.5)  
**Tested by:** Automated security scan (Claude Code)  
**Application:** CSMS — Civil Service Management System  
**Target:** `http://localhost:9002`

---

## Executive Summary

This report verifies whether API responses are properly filtered by institution and whether cross-institution data access is prevented. Testing was performed with two authenticated roles:

| Role | Username | Institution | Scope |
|------|----------|-------------|-------|
| **HRO** | skawesu | TUME YA UTUMISHI SERIKALINI (`cmd059ion0000e6d85kexfukl`) | Should see ONLY their institution |
| **HHRMD** | skhamis | TUME YA UTUMISHI SERIKALINI (`cmd059ion0000e6d85kexfukl`) | CSC role — should see ALL institutions |

### Key Findings

- **GET list endpoints** — Institution filtering is **working correctly** for all request types
- **GET single-record endpoints** — Mostly blocked (405 Method Not Allowed), except Cadre Change which **leaks cross-institution data**
- **PATCH endpoints** — **ALL 8 request types** allow cross-institution modification — a critical vulnerability

---

## Test 1: List Endpoint Institution Filtering

### Methodology
Called each API endpoint with both HRO and HHRMD sessions. Compared the number of records and unique institutions returned.

### Results

| Endpoint | HRO Records | HRO Institutions | HHRMD Records | HHRMD Institutions | Filtering |
|----------|-------------|------------------|---------------|-------------------|-----------|
| `GET /api/employees` | 34 | 1 | 200 | 25 | ✅ Working |
| `GET /api/promotions` | 12 | 1 | 50 | 32 | ✅ Working |
| `GET /api/confirmations` | 0 | 0 | 19 | 4 | ✅ Working |
| `GET /api/lwop` | 7 | 1 | 50 | 16 | ✅ Working |
| `GET /api/cadre-change` | 5 | 1 | 43 | 19 | ✅ Working |
| `GET /api/retirement` | 5 | 1 | 43 | 18 | ✅ Working |
| `GET /api/resignation` | 3 | 1 | 20 | 8 | ✅ Working |
| `GET /api/service-extension` | 4 | 1 | 21 | 7 | ✅ Working |
| `GET /api/termination` | 7 | 1 | 24 | 5 | ✅ Working |
| `GET /api/dashboard/metrics` | 34 emp | Own inst | 35,289 emp | All | ✅ Working |
| `GET /api/institutions` | 75 | All | 75 | All | ✅ Reference data (shared) |

### Analysis

**All list endpoints correctly filter by institution for HRO.** The `shouldApplyInstitutionFilter()` utility from `src/lib/role-utils.ts` is properly applied. HRO consistently sees only records belonging to their institution (`cmd059ion0000e6d85kexfukl`), while HHRMD (a CSC role) sees all institutions.

**Dashboard metrics** are also correctly scoped — HRO sees 34 employees (their institution), HHRMD sees 35,289 (all institutions).

**Institutions list** returns all 75 institutions to both roles. This is acceptable as institutions are shared reference data needed for form dropdowns and display purposes.

---

## Test 2: Single-Record GET Access by ID

### Methodology
Used HHRMD's data to find record IDs from institutions OTHER than HRO's institution. Then attempted `GET /[endpoint]/[id]` as HRO.

### Cross-Institution IDs Used

| Request Type | Record ID | Employee | Institution |
|-------------|-----------|----------|-------------|
| Promotion | `c484ab41-adfa-4123-817b-0c134878db9d` | Yassir Shaaban Seif | WIZARA YA AFYA |
| LWOP | `7a97c392-3cc5-4c13-a703-6b8da472e74e` | Salma Hemed Mansour | WIZARA YA AFYA |
| Confirmation | `57ae7d4d-c4d9-48c0-90ef-f4d4ab0be098` | Thamarat Khamis Shaibu | WIZARA YA AFYA |
| Cadre Change | `68bffddf-5922-4362-9dc6-68970592dbcd` | Yassir Shaaban Seif | WIZARA YA AFYA |
| Retirement | `4fa4221f-c628-4309-8e18-2680996704aa` | Zuhura Mwita Haji | WIZARA YA AFYA |
| Resignation | `4df21881-d311-41b8-bcee-09a3f1d9d4ed` | Zuhura Mwita Haji | WIZARA YA AFYA |
| Service Extension | `c01e8a7f-3307-4c2c-b105-faf2412aac3b` | Yahya Faki Khamis | WIZARA YA AFYA |
| Termination | `a8512fb3-6c77-420f-a2c0-5023e274e172` | Yahya Faki Khamis | WIZARA YA AFYA |

### Results

| Request Type | HTTP Status | Result |
|-------------|-------------|--------|
| Promotion | 405 | ✅ Method Not Allowed (no GET on single record) |
| LWOP | 405 | ✅ Method Not Allowed |
| Confirmation | 405 | ✅ Method Not Allowed |
| **Cadre Change** | **200** | **🔴 EXPOSED — Full record returned** |
| Retirement | 405 | ✅ Method Not Allowed |
| Resignation | 405 | ✅ Method Not Allowed |
| Service Extension | 405 | ✅ Method Not Allowed |
| Termination | 405 | ✅ Method Not Allowed |

### Finding 1: Cadre Change GET by ID — Cross-Institution Data Leak

| Property | Value |
|----------|-------|
| **Severity** | 🔴 HIGH |
| **Endpoint** | `GET /api/cadre-change/[id]` |
| **Test** | HRO (TUME YA UTUMISHI SERIKALINI) requests cadre change from WIZARA YA AFYA |
| **Result** | HTTP 200 — Full record returned |

**Evidence:**
```
HRO → GET /api/cadre-change/68bffddf-5922-4362-9dc6-68970592dbcd
Response: HTTP 200
{
  "id": "68bffddf-5922-4362-9dc6-68970592dbcd",
  "status": "Approved by HRRP - Awaiting Commission Review",
  "reviewStage": "hrrp_review",
  "newCadre": "Mhudumu wa Afya Daraja la II",
  "reason": "kuna uhitaji",
  "Employee": { "name": "Yassir Shaaban Seif", "Institution": { "name": "WIZARA YA AFYA" } }
}
```

**Risk:** An HRO user can view the full details of any cadre change request by ID, including employee name, reason, and proposed cadre — from any institution.

**Fix:** Add institution check in `GET /api/cadre-change/[id]` — verify the record's employee belongs to the same institution as the authenticated user (for non-CSC roles).

---

## Test 3: Cross-Institution Record Modification (PATCH)

### Methodology
Used HHRMD's data to find record IDs from other institutions. Then attempted `PATCH /[endpoint]/[id]` as HRO with `{"status":"APPROVED"}`.

### Results — CRITICAL

| # | Request Type | Endpoint | HTTP | Result |
|---|-------------|----------|------|--------|
| 1 | **Promotion** | `PATCH /api/promotions/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 2 | **LWOP** | `PATCH /api/lwop/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 3 | **Confirmation** | `PATCH /api/confirmations/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 4 | **Cadre Change** | `PATCH /api/cadre-change/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 5 | **Retirement** | `PATCH /api/retirement/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 6 | **Resignation** | `PATCH /api/resignation/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 7 | **Service Extension** | `PATCH /api/service-extension/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |
| 8 | **Termination** | `PATCH /api/termination/[id]` | **200** | **🔴 MODIFIED — Status changed to APPROVED** |

### Finding 2: ALL Workflow PATCH Endpoints Allow Cross-Institution Modification

| Property | Value |
|----------|-------|
| **Severity** | 🔴 CRITICAL |
| **Endpoints** | ALL `PATCH /[request-type]/[id]` endpoints (8 total) |
| **Test** | HRO (TUME YA UTUMISHI SERIKALINI) approves requests from WIZARA YA AFYA |
| **Result** | HTTP 200 — All 8 request types successfully modified |

**Evidence (one example per type):**

**Promotion:**
```
HRO → PATCH /api/promotions/c484ab41-adfa-4123-817b-0c134878db9d
Body: {"status":"APPROVED","action":"commission_approve"}
Response: HTTP 200 — status: "APPROVED"
Employee: Yassir Shaaban Seif (WIZARA YA AFYA)
```

**LWOP:**
```
HRO → PATCH /api/lwop/7a97c392-3cc5-4c13-a703-6b8da472e74e
Response: HTTP 200 — status: "APPROVED"
Employee: Salma Hemed Mansour (WIZARA YA AFYA)
```

**Confirmation:**
```
HRO → PATCH /api/confirmations/57ae7d4d-c4d9-48c0-90ef-f4d4ab0be098
Response: HTTP 200 — status: "APPROVED"
Employee: Thamarat Khamis Shaibu (WIZARA YA AFYA)
```

**Cadre Change:**
```
HRO → PATCH /api/cadre-change/68bffddf-5922-4362-9dc6-68970592dbcd
Response: HTTP 200 — status: "APPROVED"
Employee: Yassir Shaaban Seif (WIZARA YA AFYA)
```

**Retirement:**
```
HRO → PATCH /api/retirement/4fa4221f-c628-4309-8e18-2680996704aa
Response: HTTP 200 — status: "APPROVED"
Employee: Zuhura Mwita Haji (WIZARA YA AFYA)
```

**Resignation:**
```
HRO → PATCH /api/resignation/4df21881-d311-41b8-bcee-09a3f1d9d4ed
Response: HTTP 200 — status: "APPROVED"
Employee: Zuhura Mwita Haji (WIZARA YA AFYA)
```

**Service Extension:**
```
HRO → PATCH /api/service-extension/c01e8a7f-3307-4c2c-b105-faf2412aac3b
Response: HTTP 200 — status: "APPROVED"
Employee: Yahya Faki Khamis (WIZARA YA AFYA)
```

**Termination:**
```
HRO → PATCH /api/termination/a8512fb3-6c77-420f-a2c0-5023e274e172
Response: HTTP 200 — status: "APPROVED"
Employee: Yahya Faki Khamis (WIZARA YA AFYA)
```

**Root Cause:** The PATCH handlers for all workflow endpoints check authentication (`verifyAuth`) but do NOT verify that the record's employee belongs to the same institution as the authenticated user. The institution filtering is only applied to GET list queries, not to individual record modifications.

**Risk:**
- An HRO user can approve/reject promotions, confirmations, LWOP, cadre changes, retirements, resignations, service extensions, and terminations for ANY employee in ANY institution
- This completely bypasses the institutional separation of duties
- Could lead to unauthorized promotions, fraudulent retirements, or improper terminations across the entire civil service

**Fix:** Add institution verification to all PATCH handlers:
```typescript
// In each PATCH handler, after fetching the record:
if (shouldApplyInstitutionFilter(auth.role)) {
  const record = await prisma.promotionRequest.findUnique({
    where: { id },
    include: { Employee: { select: { institutionId: true } } }
  });
  if (record.Employee.institutionId !== auth.institutionId) {
    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  }
}
```

---

## Test 4: Employee ID Lookup

### Methodology
Found an employee ID from a different institution via HHRMD's view. Attempted `GET /api/employees?id=[cross-institution-id]` as HRO.

### Result

| Test | Result |
|------|--------|
| HRO → `GET /api/employees?id=64eadd66-...` (different institution) | ✅ No data returned (blocked) |

**Verdict:** The employee ID lookup correctly applies institution filtering. HRO cannot access employees from other institutions by ID.

---

## Test 5: User and Institution Lists

### Users (`GET /api/users`)

| Role | Result | Filtering |
|------|--------|-----------|
| Admin | 200 — All users | ✅ Admin should see all |
| HRO | 200 — All users | ⚠️ HRO sees ALL users across all institutions |
| HHRMD | 200 — All users | ✅ CSC role should see all |

**Finding 3:** HRO can see ALL users across all institutions. The `/api/users` endpoint has `allowedRoles: ['ADMIN', 'HHRMD', 'HRO']` but no institution filtering. An HRO user can enumerate all users system-wide, including their roles, last activity, and employee IDs.

| Property | Value |
|----------|-------|
| **Severity** | 🟡 MEDIUM |
| **Endpoint** | `GET /api/users` |
| **Impact** | HRO can see all users across all institutions (names, roles, last activity) |

**Fix:** Add institution filtering to `GET /api/users` for HRO role.

### Institutions (`GET /api/institutions`)

| Role | Result | Filtering |
|------|--------|-----------|
| HRO | 200 — 75 institutions | Shared reference data |
| HHRMD | 200 — 75 institutions | Shared reference data |

**Verdict:** Institutions are shared reference data. Returning all institutions is acceptable for form dropdowns and display purposes.

---

## Summary of Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | `GET /api/cadre-change/[id]` — Cross-institution data leak | 🔴 HIGH | Confirmed |
| **2** | **`PATCH` on ALL 8 workflow types — Cross-institution modification** | **🔴 CRITICAL** | **Confirmed** |
| 3 | `GET /api/users` — HRO sees all users across institutions | 🟡 MEDIUM | Confirmed |

### What's Working Correctly

| # | Check | Result |
|---|-------|--------|
| 1 | Employee list filtering | ✅ HRO sees 34 (1 inst), HHRMD sees 200 (25 inst) |
| 2 | Promotion list filtering | ✅ HRO sees 12 (1 inst), HHRMD sees 50 (32 inst) |
| 3 | Confirmation list filtering | ✅ HRO sees 0, HHRMD sees 19 (4 inst) |
| 4 | LWOP list filtering | ✅ HRO sees 7 (1 inst), HHRMD sees 50 (16 inst) |
| 5 | Cadre Change list filtering | ✅ HRO sees 5 (1 inst), HHRMD sees 43 (19 inst) |
| 6 | Retirement list filtering | ✅ HRO sees 5 (1 inst), HHRMD sees 43 (18 inst) |
| 7 | Resignation list filtering | ✅ HRO sees 3 (1 inst), HHRMD sees 20 (8 inst) |
| 8 | Service Extension list filtering | ✅ HRO sees 4 (1 inst), HHRMD sees 21 (7 inst) |
| 9 | Termination list filtering | ✅ HRO sees 7 (1 inst), HHRMD sees 24 (5 inst) |
| 10 | Dashboard metrics filtering | ✅ HRO: 34 emp, HHRMD: 35,289 emp |
| 11 | Employee ID lookup filtering | ✅ Cross-institution lookup returns no data |
| 12 | Single-record GET (most types) | ✅ Returns 405 Method Not Allowed |

---

## Recommended Fixes

### P0 — Critical: Add Institution Check to All PATCH Handlers

All 8 workflow PATCH endpoints need institution verification:

1. `PATCH /api/promotions/[id]`
2. `PATCH /api/lwop/[id]`
3. `PATCH /api/confirmations/[id]`
4. `PATCH /api/cadre-change/[id]`
5. `PATCH /api/retirement/[id]`
6. `PATCH /api/resignation/[id]`
7. `PATCH /api/service-extension/[id]`
8. `PATCH /api/termination/[id]`

**Implementation pattern:**
```typescript
// After verifyAuth and fetching the record:
if (shouldApplyInstitutionFilter(auth.role)) {
  const employee = await prisma.employee.findUnique({
    where: { id: record.employeeId },
    select: { institutionId: true }
  });
  if (employee.institutionId !== auth.institutionId) {
    return NextResponse.json(
      { success: false, error: "Access denied: cross-institution access not allowed" },
      { status: 403 }
    );
  }
}
```

### P1 — High: Add Institution Check to Cadre Change GET

`GET /api/cadre-change/[id]` should verify the record's employee belongs to the same institution.

### P2 — Medium: Add Institution Filtering to Users List

`GET /api/users` should filter by institution for HRO role (only show users from their institution).

---

## Files Referenced

- `src/lib/role-utils.ts` — `isCSCRole()`, `shouldApplyInstitutionFilter()`
- `src/app/api/promotions/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/lwop/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/confirmations/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/cadre-change/[id]/route.ts` — GET and PATCH handlers (no institution check)
- `src/app/api/retirement/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/resignation/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/service-extension/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/termination/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/users/route.ts` — GET handler (no institution filtering)

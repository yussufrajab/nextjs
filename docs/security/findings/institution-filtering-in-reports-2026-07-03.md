# Institution Filtering in Reports — Security Test Report

**Date:** 2026-07-03  
**Test Type:** Institution Filtering in Reports (Section 4.6)  
**Tested by:** Automated security scan (Claude Code)  
**Application:** CSMS — Civil Service Management System  
**Target:** `http://localhost:9002/api/reports`

---

## Executive Summary

The `/api/reports` endpoint has **critical security flaws** in institution filtering:

1. **No authentication required** — anyone can generate reports
2. **No server-side institution filtering** — all data across all institutions returned by default
3. **Role spoofing** — `userRole` is a client-supplied query parameter
4. **HRO sees all institutions** — even authenticated HRO users get unfiltered data
5. **XSS in report data** — complaint subjects contain unescaped HTML/script tags

---

## Test 1: Unauthenticated Report Access

### Methodology
Called `GET /api/reports?reportType=X` without any session cookie.

### Results

| Report Type | HTTP | Success | Records | Institutions |
|------------|------|---------|---------|-------------|
| `lwop` | 200 | ✅ true | **63** | **17** |
| `cadre-change` | 200 | ✅ true | **43** | — |
| `retirement` | 200 | ✅ true | **43** | **18** |
| `resignation` | 200 | ✅ true | **20** | **8** |
| `service-extension` | 200 | ✅ true | **21** | — |
| `termination` | 200 | ✅ true | **24** | **5** |
| `complaints` | 200 | ✅ true | **29** | — |
| `promotions` | 200 | false | 0 | — |
| `confirmations` | 200 | false | 0 | — |

**Finding 1:** 7 out of 9 report types are fully accessible without authentication. An unauthenticated user can generate reports containing employee names, ZAN IDs, gender, institutions, request details, and commission decisions across the entire civil service.

| Property | Value |
|----------|-------|
| **Severity** | 🔴 CRITICAL |
| **Endpoint** | `GET /api/reports` |
| **Auth Required** | ❌ NONE |
| **Impact** | Full HR report data exposed to unauthenticated users |

---

## Test 2: Institution Filtering — No Filter Applied

### Methodology
Called reports without `institutionId` parameter to check if data is filtered by default.

### Results

**LWOP Report (no filter):**
```
63 records across 17 institutions
  WIZARA YA AFYA: 38
  TUME YA UTUMISHI SERIKALINI: 7
  WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO: 3
  OFISI YA RAIS, TAWALA ZA MIKOA, SERIKALI ZA MITAA NA IDARA MAALUMU ZA SMZ: 2
  ... and 13 more institutions
```

**Retirement Report (no filter):**
```
43 records across 18 institutions
```

**Termination Report (no filter):**
```
24 records across 5 institutions
```

**Finding 2:** Without the `institutionId` parameter, reports return data from ALL institutions. There is no default institution scoping based on the user's role or session.

| Property | Value |
|----------|-------|
| **Severity** | 🔴 CRITICAL |
| **Impact** | All institution data returned when no filter specified |

---

## Test 3: Institution Filtering — Client-Supplied Filter

### Methodology
Called reports with `institutionId=X` query parameter to test if filtering works.

### Results

| Filter | LWOP Records | Institutions |
|--------|-------------|-------------|
| No filter | 63 | 17 |
| `institutionId=TUME YA UTUMISHI SERIKALINI` | 7 | 1 |
| `institutionId=MAMLAKA YA KUDHIBITI...` | 0 | 0 |

**Finding 3:** The institution filter works when provided, but it is **optional and client-supplied**. The server does NOT enforce institution scoping based on the authenticated user's role. An attacker simply omits the `institutionId` parameter to get all data.

| Property | Value |
|----------|-------|
| **Severity** | 🔴 HIGH |
| **Impact** | Institution filtering is opt-in, not enforced |

---

## Test 4: Role Spoofing via `userRole` Parameter

### Methodology
The complaints report blocks HRO/HRRP roles. Tested if passing a different `userRole` bypasses this restriction.

### Results

| `userRole` Value | Complaints Access | Records |
|-----------------|-------------------|---------|
| `HRO` | ❌ BLOCKED | "Access denied: Complaint reports are restricted to CSC roles only." |
| `HRRP` | ❌ BLOCKED | Same |
| `HHRMD` | ✅ Allowed | 29 |
| `CSCS` | ✅ Allowed | 29 |
| `Admin` | ✅ Allowed | 29 |
| `DO` | ✅ Allowed | 29 |

**Finding 4:** The complaints report restriction is based on a **client-supplied `userRole` query parameter**, not the server-side session role. An HRO user can simply pass `userRole=CSCS` to access all complaints.

| Property | Value |
|----------|-------|
| **Severity** | 🔴 CRITICAL |
| **Endpoint** | `GET /api/reports?reportType=complaints&userRole=CSCS` |
| **Impact** | Any user can bypass role restrictions by spoofing the userRole parameter |

**Evidence:**
```
# HRO user (should be blocked from complaints):
GET /api/reports?reportType=complaints&userRole=HRO
→ BLOCKED: "Access denied: Complaint reports are restricted to CSC roles only."

# Same HRO user, spoofing role:
GET /api/reports?reportType=complaints&userRole=CSCS
→ 29 records returned (all complaints across all institutions)
```

---

## Test 5: Authenticated HRO Access — No Filtering

### Methodology
Called reports with a valid HRO session cookie to check if the server applies institution filtering based on the authenticated user.

### Results

| Report Type | HRO Session | Records | Expected | Verdict |
|------------|-------------|---------|----------|---------|
| `lwop` | ✅ Authenticated | 63 (17 institutions) | 7 (1 institution) | ❌ NOT FILTERED |
| `retirement` | ✅ Authenticated | 43 (18 institutions) | Own institution only | ❌ NOT FILTERED |
| `termination` | ✅ Authenticated | 24 (5 institutions) | Own institution only | ❌ NOT FILTERED |
| `complaints` | ✅ Authenticated | 29 | Blocked or own only | ❌ NOT FILTERED |

**Finding 5:** Even with a valid authenticated HRO session, the reports endpoint returns ALL data across ALL institutions. The server ignores the session's `institutionId` and `role` entirely.

| Property | Value |
|----------|-------|
| **Severity** | 🔴 CRITICAL |
| **Impact** | Authenticated HRO users see all institution data in reports |

**Comparison with other endpoints:**
```
# Employee list (correctly filtered):
HRO → GET /api/employees → 34 employees, 1 institution ✅

# Report (NOT filtered):
HRO → GET /api/reports?reportType=lwop → 63 records, 17 institutions ❌
```

---

## Test 6: Report Field Exposure

### LWOP Report Fields
```
sn, employeeName, zanId, gender, institution, duration, reason, 
startDate, endDate, status, commissionDecision
```

### Complaints Report Fields
```
sn, complainant, gender, complaintType, subject, date, 
status, commissionDecision
```

### Sample LWOP Record
```json
{
  "sn": 1,
  "employeeName": "Samira Moh'd Fadhil",
  "zanId": "610309160",
  "gender": "Female",
  "institution": "TUME YA UTUMISHI SERIKALINI",
  "duration": "13 months",
  "reason": "AMEPATA FURSA",
  "startDate": "1/7/2026",
  "endDate": "1/7/2027",
  "status": "Inasubiri",
  "commissionDecision": "-"
}
```

### Finding 6: XSS in Report Data

| Property | Value |
|----------|-------|
| **Severity** | 🟠 HIGH |
| **Endpoint** | `GET /api/reports?reportType=complaints` |
| **Impact** | Complaint subject field contains unescaped HTML/script tags |

**Evidence:**
```
Complaint subject: <script>alert(1)</script>
```

This indicates stored XSS — the complaint subject was saved with raw HTML and is returned unescaped in the report. If this data is rendered in a frontend report viewer without sanitization, it would execute arbitrary JavaScript.

---

## Summary of Findings

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Reports accessible without authentication | 🔴 CRITICAL | Confirmed |
| 2 | No default institution filtering — all data returned | 🔴 CRITICAL | Confirmed |
| 3 | Institution filter is optional/client-supplied | 🔴 HIGH | Confirmed |
| 4 | Role spoofing via `userRole` parameter | 🔴 CRITICAL | Confirmed |
| 5 | Authenticated HRO sees all institutions in reports | 🔴 CRITICAL | Confirmed |
| 6 | Stored XSS in complaint subject field | 🟠 HIGH | Confirmed |

### What's Working (Partial)

| Check | Result |
|-------|--------|
| `institutionId` filter works when provided | ✅ Returns only matching records |
| Complaints blocked for HRO/HRRP `userRole` values | ✅ Blocked (but bypassable) |
| Invalid report type rejected | ✅ Returns error |

---

## Recommended Fixes

### P0 — Critical: Add Authentication to Reports

```typescript
// In /api/reports/route.ts
const authResult = await verifyAuth(req);
if (!authResult.authenticated) {
  return authResult.response;
}
const auth = authResult.context;
```

### P0 — Critical: Enforce Server-Side Institution Filtering

```typescript
// Use the authenticated user's role and institution, NOT client params
const userRole = auth.role;           // from session, NOT from query
const userInstitutionId = auth.institutionId;  // from session

if (shouldApplyInstitutionFilter(userRole)) {
  // Force filter to user's institution
  filters.institutionId = userInstitutionId;
}

// For complaints: use actual role, not spoofed value
if (['HRO', 'HRRP'].includes(userRole)) {
  // Block complaints report for institutional roles
  return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
}
```

### P1 — High: Sanitize Report Data

Ensure all data returned in reports is sanitized. Strip or escape HTML tags from:
- Complaint `subject` field
- Complaint `details` field
- Any free-text fields

### P2 — Medium: Remove Client-Supplied `userRole` Parameter

The `userRole` query parameter should be removed entirely. The server should always derive the role from the authenticated session.

---

## Test Data Reference

| Institution | ID | HRO Access to Reports |
|------------|-----|----------------------|
| TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | Should be limited to this only |
| WIZARA YA AFYA | `cmd06nn7u0003e67wa4hiyie7` | Should be BLOCKED |
| MAMLAKA YA KUDHIBITI... | `cmd06xe45000xe6bqb6qc19ys` | Should be BLOCKED |

### Report Types Tested

| Report Type | Auth Required | Institution Filter | Role Restriction |
|------------|---------------|-------------------|-----------------|
| `lwop` | ❌ No | ❌ No (client-supplied) | ❌ No |
| `cadre-change` | ❌ No | ❌ No | ❌ No |
| `retirement` | ❌ No | ❌ No | ❌ No |
| `resignation` | ❌ No | ❌ No | ❌ No |
| `service-extension` | ❌ No | ❌ No | ❌ No |
| `termination` | ❌ No | ❌ No | ❌ No |
| `complaints` | ❌ No | ❌ No | ⚠️ Client-supplied userRole |
| `promotions` | ❌ No | ❌ No | ❌ No |
| `confirmations` | ❌ No | ❌ No | ❌ No |

---

## Files Referenced

- `src/app/api/reports/route.ts` — Report endpoint (no auth, client-supplied filters)
- `src/lib/api-auth.ts` — `verifyAuth()` (not used in reports)
- `src/lib/role-utils.ts` — `shouldApplyInstitutionFilter()` (not used in reports)

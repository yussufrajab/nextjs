# Requirement 4: Institution Data Isolation — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Base Documents:** `UAT_Security_review_By_AMINA (1).md` (Section 4), `4.1-institution-access-control.md`, `4.3-institution-context-validation.md`, `4.4-institution-filtering-in-queries.md`, `institution-filtering-in-apis-2026-07-03.md`, `institution-filtering-in-reports-2026-07-03.md`, `institution-validation-during-synchronization-2026-07-03.md`, `need-to-know-access-control-2026-07-03.md`

---

## Test Environment

| Role | Username | Institution | Institution ID |
|------|----------|-------------|----------------|
| HRO (Inst A) | `skawesu` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |
| HRO (Inst B) | `lela` | Baraza la Mitihani | `cmd1545dfaf1f7a12e14814` |
| HHRMD (CSC) | `skhamis` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |
| Admin | `ymrajab` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` |

---

## Test Case No.: 4 — Requirement 4: Institution Data Isolation

**Process/Function Name:** Institution-Based Access Control & Data Isolation

**Function Description:** Tests that users can only access data within their authorized institution.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 4.1 | Institution-Based Access Control | 1. Login as HRO from Institution A<br>2. Attempt to view Institution B employees<br>3. Try Institution B's requests<br>4. Direct API calls | - Only own institution data visible<br>- API filters by institutionId<br>- Direct object reference blocked<br>- DB-level filter enforced | ✅ `api-auth.ts` (institutionId context) | **PARTIAL PASS — Critical gaps found.**<br><br>**✅ Employee list:** HRO sees 200 employees, all from own institution (`cmd059ion...`). DB cross-check confirms 3 promotions for other institutions are correctly NOT returned.<br><br>**✅ Request list endpoints (8 types):** All return only own institution data. `shouldApplyInstitutionFilter()` correctly applied in promotions, confirmations, lwop, cadre-change, resignation, retirement, termination, service-extension.<br><br>**❌ IDOR on PATCH endpoints:** ALL 8 `[id]` PATCH endpoints allow cross-institution modification. HRO_B (Baraza la Mitihani) successfully modified promotion, confirmation, LWOP, cadre-change, resignation, retirement requests belonging to Institution A. HTTP 200 returned for all.<br><br>**❌ Cadre Change GET by ID:** `GET /api/cadre-change/[id]` returns full record from other institutions (HTTP 200). Other 7 types return 405 (no GET handler).<br><br>**❌ Employee list override:** `GET /api/employees?institutionId=<other>` overrides session filter — HRO sees 200 employees from other institution.<br><br>**❌ Cross-institution promotion creation:** `POST /api/promotions` with `employeeId` from other institution succeeds (HTTP 200). No institution ownership check on employee. | **FAIL** | **Critical vulnerabilities:**<br>1. IDOR on all 8 PATCH endpoints (P0)<br>2. Employee list query param override (P0)<br>3. Cross-institution promotion creation (P0)<br>4. Cadre Change GET leaks data (P1)<br><br>**Working correctly:**<br>- Employee list filtering (without override)<br>- All 8 request list endpoint filtering<br>- Dashboard metrics filtering<br>- Employee documents/certificates ownership check |
| 4.2 | CSC Internal — Cross-Institution | 1. Login as HHRMD (CSC internal)<br>2. View multiple institutions<br>3. Access requests from all | - Full system-wide access<br>- No institution filter<br>- CSC roles enforced<br>- Access logged | ⚠️ Verify role behavior | **PASS.**<br><br>HHRMD (skhamis) sees all institutions:<br>- Employees: 200 records, 25 institutions<br>- Promotions: 50 records, 32 institutions<br>- Dashboard: 35,289 employees (all institutions)<br><br>`CSC_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS']` correctly bypasses institution filter via `shouldApplyInstitutionFilter()` in `src/lib/role-utils.ts`.<br><br>**Note:** CSC roles can also modify requests from ANY institution via PATCH — this is by design for commission-level operations. | **PASS** | CSC role behavior is correctly implemented. HHRMD has legitimate need for cross-institution access for commission review workflow. |
| 4.3 | Institution Context Validation | 1. Attempt to inject institutionId in request body<br>2. Modify session institutionId | - Server uses session institutionId<br>- Cannot override via request | ✅ `api-auth.ts` | **FAIL — Multiple injection vectors found.**<br><br>**✅ Session cookie tampering blocked:** Session cookie is HMAC-signed. Direct modification causes signature verification failure. Custom `X-Institution-Id` header is ignored.<br><br>**✅ Dashboard metrics:** Correctly uses `auth.institutionId` from session. No client override possible.<br><br>**✅ Most CREATE routes:** `manual-entry`, `bulk-upload`, `search` correctly force `auth.institutionId`. Comment in code: "FORCE institutionId to user's institution (security)".<br><br>**❌ Employee list query param override:** `GET /api/employees?institutionId=<other>` overrides auth-based filter. HRO sees employees from other institution.<br><br>**❌ Cross-institution employeeId injection:** `POST /api/promotions` accepts `employeeId` from any institution. No check that `employee.institutionId === auth.institutionId`.<br><br>**❌ User institution assignment:** `PUT /api/users/[id]` accepts `institutionId` in body. Any authenticated user can change any user's institution. No role check.<br><br>**❌ Unauthenticated endpoints accept institutionId:** `GET /api/reports`, `GET /api/employees/urgent-actions`, `GET /api/complaints` all accept institutionId/role from client params with NO authentication.<br><br>**❌ HRIMS endpoints (7 routes):** No authentication. Accept `institutionVoteNumber` from body. Return validation errors (not 401), confirming no auth check. | **FAIL** | **Session-based institutionId is secure**, but many routes don't use it. Routes accept institutionId from client input (query params, body) instead of session.<br><br>**Critical fixes needed:**<br>1. Remove `institutionId` query param override in employees GET<br>2. Add institution ownership check on POST/CREATE handlers<br>3. Add auth to reports, urgent-actions, complaints<br>4. Add auth to all HRIMS endpoints |
| 4.4 | Institution Filtering in Queries | 1. List employees<br>2. Check query WHERE clause<br>3. Verify filter applied | - All queries include institutionId<br>- Cannot bypass filter | ⚠️ Verify all query paths | **FAIL — Inconsistent application.**<br><br>**✅ Properly filtered (13 endpoints):**<br>- `GET /api/promotions` — uses `shouldApplyInstitutionFilter()` → `whereClause.Employee = { institutionId }`<br>- `GET /api/confirmations` — same pattern<br>- `GET /api/lwop` — same pattern<br>- `GET /api/cadre-change` — same pattern<br>- `GET /api/resignation` — same pattern<br>- `GET /api/retirement` — same pattern<br>- `GET /api/termination` — same pattern<br>- `GET /api/service-extension` — same pattern<br>- `GET /api/employees/search` — uses `auth.institutionId`<br>- `GET /api/employees/[id]/documents` — ownership check<br>- `GET /api/employees/[id]/certificates` — ownership check<br>- `GET /api/dashboard/metrics` — uses `shouldApplyInstitutionFilter()`<br>- `GET /api/confirmation-requests` — uses `shouldApplyInstitutionFilter()`<br><br>**❌ NOT filtered (9 endpoints):**<br>- `GET /api/complaints` — NO auth, NO filter (client-supplied params)<br>- `GET /api/employees` — filter overridable via `?institutionId=`<br>- `GET /api/users` — returns all institutions' users<br>- `GET /api/reports` — NO auth, NO filter<br>- `GET /api/employees/urgent-actions` — NO auth, NO filter<br>- `GET /api/lwop-requests` — NO auth, NO filter<br>- `GET /api/retirement-requests` — NO auth, NO filter<br>- `GET /api/service-extension-requests` — NO auth, NO filter<br>- `GET /api/requests/track` — NO auth, NO filter<br><br>**DB Cross-Check:** 3 promotions exist for other institutions — correctly NOT returned to HRO in list view. Filter mechanism works when applied. | **FAIL** | The query filter mechanism (`shouldApplyInstitutionFilter()`) works correctly when used. Problem is **inconsistent application** — 13 endpoints use it, 9 skip it entirely or allow override. |
| 4.5 | Institution Filtering in APIs | 1. Call employee API<br>2. Call request API<br>3. Check responses | - API responses filtered<br>- No cross-institution data | ⚠️ Verify all API routes | **FAIL — Critical IDOR and data leak issues.**<br><br>**✅ List endpoints filtered:** All 8 request type list endpoints correctly filter by institution. Employee list filters correctly (without query param override).<br><br>**❌ ALL 8 PATCH endpoints allow cross-institution modification:**<br>- `PATCH /api/promotions/[id]` — HRO modifies other institution's promotion (HTTP 200)<br>- `PATCH /api/lwop/[id]` — same (HTTP 200)<br>- `PATCH /api/confirmations/[id]` — same (HTTP 200)<br>- `PATCH /api/cadre-change/[id]` — same (HTTP 200)<br>- `PATCH /api/retirement/[id]` — same (HTTP 200)<br>- `PATCH /api/resignation/[id]` — same (HTTP 200)<br>- `PATCH /api/service-extension/[id]` — same (HTTP 200)<br>- `PATCH /api/termination/[id]` — same (HTTP 200)<br><br>**Root cause:** PATCH handlers verify auth but do NOT check `existingRequest.Employee.institutionId === auth.institutionId`.<br><br>**❌ Cadre Change GET by ID leaks data:** `GET /api/cadre-change/[id]` returns full record from other institutions.<br><br>**❌ Users endpoint:** Returns all 216 users across multiple institutions to HRO.<br><br>**✅ Employee ID lookup:** `GET /api/employees?id=<cross-institution>` correctly returns no data.<br><br>**✅ Employee documents/certificates:** Returns "Access denied" for other institution's employees. | **FAIL** | **P0 Critical:** Add institution ownership check to all 8 PATCH handlers.<br><br>**P1 High:** Add institution check to cadre-change GET.<br><br>**P2 Medium:** Add institution filter to users list for HRO. |
| 4.6 | Institution Filtering in Reports | 1. Generate report<br>2. Verify institution filter | - Reports scoped to institution<br>- No cross-institution data in report | ❌ Verify report routes | **FAIL — Complete breakdown.**<br><br>**❌ No authentication:** `GET /api/reports` returns data without any session cookie. 7 of 9 report types fully accessible unauthenticated.<br><br>**❌ No institution filtering:** Without `institutionId` param, reports return ALL institutions' data:<br>- LWOP: 63 records, 17 institutions<br>- Retirement: 43 records, 18 institutions<br>- Termination: 24 records, 5 institutions<br>- Complaints: 29 records, all institutions<br><br>**❌ Institution filter is optional/client-supplied:** Server does NOT enforce institution scoping. Attacker simply omits `institutionId` to get all data.<br><br>**❌ Role spoofing:** `userRole` is client-supplied query param. HRO passes `userRole=CSCS` to access complaints report (which should be blocked for HRO).<br><br>**❌ Authenticated HRO sees all:** Even with valid session, HRO gets unfiltered data. Server ignores session's `institutionId` and `role` entirely.<br><br>**❌ XSS in report data:** Complaint subjects contain unescaped `<script>` tags — stored XSS vulnerability.<br><br>**Partial working:** `institutionId` filter works when provided (returns only matching records). Invalid report types rejected. | **FAIL** | **P0 Critical:**<br>1. Add `verifyAuth()` to reports GET<br>2. Use `auth.role` and `auth.institutionId` (not client params)<br>3. Apply `shouldApplyInstitutionFilter()`<br><br>**P1 High:** Sanitize report data (XSS in complaint subjects) |
| 4.7 | Institution Validation During Synchronization | 1. Sync data<br>2. Verify institution validation | - Sync validates institution<br>- No cross-institution pollution | ❌ Verify HRIMS sync | **FAIL — Critical vulnerabilities in HRIMS sync.**<br><br>**❌ 11 of 13 HRIMS endpoints have NO authentication:**<br>- `GET /api/admin/hrims-settings` — exposes full API key + token<br>- `PUT /api/admin/hrims-settings` — allows config modification<br>- `POST /api/hrims/bulk-fetch` — triggers bulk sync for any institution<br>- `POST /api/hrims/fetch-by-institution` — same<br>- `POST /api/hrims/fetch-employee` — retrieves employee data<br>- `GET /api/hrims/search-employee` — returns full PII (name, DOB, phone, address, salary, ZAN ID)<br>- `POST /api/hrims/sync-employee` — creates/updates employees<br>- `POST /api/hrims/sync-documents` — writes documents<br>- `POST /api/hrims/sync-certificates` — writes certificates<br>- `GET /api/hrims/test` — runs HRIMS diagnostics<br><br>**❌ No institution filtering on sync:** Even authenticated HRO can trigger sync for ANY institution by providing different `institutionVoteNumber`.<br><br>**❌ HRIMS credentials exposed:** `GET /api/admin/hrims-settings` returns `_fullApiKey` and `_fullToken` without auth. Attacker gains direct access to government HRIMS system.<br><br>**❌ Config modification:** `PUT /api/admin/hrims-settings` allows redirecting sync to malicious server (tested and reverted).<br><br>**✅ Only 2 endpoints have auth:** `fetch-documents-by-institution` and `fetch-photos-by-institution` require HHRMD/ADMIN/CSCS role.<br><br>**Sample PII exposed:**<br>```json<br>{"name":"Mohamed Hamdu Mbaraka","zanId":"520027318","gender":"Male","dateOfBirth":"1983-05-31","phoneNumber":"0779553308","salaryScale":"ZPSB-08","cadre":"Mhudumu wa Afya"}<br>``` | **FAIL** | **P0 Critical:**<br>1. Rotate HRIMS credentials immediately (compromised)<br>2. Add `withAuth()` to ALL 11 unauthenticated endpoints<br>3. Remove `_fullApiKey`/`_fullToken` from GET response<br><br>**P1:** Add institution filtering to sync operations<br>**P1:** Add role-based access (HHRMD/ADMIN/CSCS only)<br>**P1:** Remove test endpoint from production |
| 4.8 | Cross-Institution Access Attempt Logged | 1. Attempt cross-institution access<br>2. Check audit trail | - Attempt logged as security event<br>- User/IP recorded | ✅ `audit-logger.ts` (security events) | **PARTIAL PASS — Logging exists but gaps remain.**<br><br>**✅ Audit infrastructure exists:**<br>- `UNAUTHORIZED_ACCESS` event type defined in `audit-logger.ts:23`<br>- `ACCESS_DENIED` event type defined<br>- `ROLE_VIOLATION` event type defined<br>- `PERMISSION_DENIED` event type defined<br>- All events include userId, username, IP, timestamp, deviceInfo<br><br>**✅ Audit log is immutable:** INSERT-only SQL, GET-only API, no edit/delete UI.<br><br>**✅ Audit access restricted:** Admin/CSCS only — 403 for other roles.<br><br>**⚠️ Gap: IDOR on PATCH not logged as security event:** When HRO modifies another institution's promotion via `PATCH /api/promotions/[id]`, the action is logged as a normal `REQUEST_APPROVED` event — NOT as `UNAUTHORIZED_ACCESS` or cross-institution violation. The audit trail shows the action was performed but does NOT flag it as a security violation.<br><br>**⚠️ Gap: No cross-institution detection:** There is no code that checks whether a cross-institution access attempt occurred and logs it as a security event. The `UNAUTHORIZED_ACCESS` event type exists but is not triggered by cross-institution PATCH/POST attempts.<br><br>**⚠️ Gap: Unauthenticated access not logged:** Endpoints without auth (reports, complaints, urgent-actions, HRIMS) process requests without any audit trail since `verifyAuth()` is never called.<br><br>**✅ What IS logged:** Login success/failure, password changes, workflow submissions/approvals/rejections, user CRUD, complaint CRUD, file operations. | **PARTIAL** | **Audit infrastructure is solid** but cross-institution violations are not detected or flagged.<br><br>**P1:** Add institution ownership check before workflow actions and log `UNAUTHORIZED_ACCESS` when mismatch detected.<br><br>**P1:** Add audit logging to currently unauthenticated endpoints (after adding auth). |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 4.1 | Institution-Based Access Control | ❌ **FAIL** | IDOR on all 8 PATCH endpoints; employee list override; cross-institution promotion creation |
| 4.2 | CSC Internal — Cross-Institution | ✅ **PASS** | CSC roles correctly bypass institution filter |
| 4.3 | Institution Context Validation | ❌ **FAIL** | Session secure but query param/body injection works on multiple endpoints |
| 4.4 | Institution Filtering in Queries | ❌ **FAIL** | 13 endpoints filtered, 9 endpoints NOT filtered |
| 4.5 | Institution Filtering in APIs | ❌ **FAIL** | All 8 PATCH endpoints allow cross-institution modification |
| 4.6 | Institution Filtering in Reports | ❌ **FAIL** | No auth, no filtering, role spoofing, XSS |
| 4.7 | Institution Validation During Synchronization | ❌ **FAIL** | 11/13 HRIMS endpoints unauthenticated; credentials exposed |
| 4.8 | Cross-Institution Access Attempt Logged | ⚠️ **PARTIAL** | Audit infra exists but cross-institution violations not detected |

**Overall: 1 PASS, 1 PARTIAL, 6 FAIL**

---

## Complete Vulnerability List (Section 4)

| Vuln ID | Case ID | Severity | CVSS | Description | Impact | Remediation | Status |
|---------|---------|----------|------|-------------|--------|-------------|--------|
| INST-01 | 4.1, 4.5 | 🔴 Critical | 9.1 | IDOR on all 8 PATCH endpoints — HRO can approve/reject requests from any institution | Unauthorized workflow actions across entire civil service | Add institution ownership check to all PATCH handlers | Confirmed |
| INST-02 | 4.1, 4.3 | 🔴 Critical | 8.6 | Employee list `?institutionId=` overrides session filter | HRO views employees from any institution | Remove or validate query param against `auth.institutionId` | Confirmed |
| INST-03 | 4.1, 4.3 | 🔴 Critical | 8.6 | Cross-institution promotion creation via `employeeId` in body | HRO creates promotions for other institutions' employees | Add `employee.institutionId === auth.institutionId` check | Confirmed |
| INST-04 | 4.6 | 🔴 Critical | 9.8 | Reports endpoint has NO authentication | Unauthenticated access to all HR report data | Add `verifyAuth()` to reports GET | Confirmed |
| INST-05 | 4.6 | 🔴 Critical | 9.8 | Reports have NO institution filtering | All institutions' data returned | Use `auth.institutionId` for filtering | Confirmed |
| INST-06 | 4.6 | 🔴 Critical | 9.1 | Reports role spoofing via `userRole` param | HRO accesses complaints by passing `userRole=CSCS` | Remove client-supplied `userRole`, use `auth.role` | Confirmed |
| INST-07 | 4.7 | 🔴 Critical | 9.8 | HRIMS credentials exposed without authentication | Attacker gains direct HRIMS access | Add auth, remove full credentials from response | Confirmed |
| INST-08 | 4.7 | 🔴 Critical | 9.1 | HRIMS config modifiable without authentication | Redirect sync to malicious server | Add auth with ADMIN role check | Confirmed |
| INST-09 | 4.7 | 🔴 Critical | 8.6 | 7 HRIMS sync endpoints unauthenticated | Bulk data sync/retrieval without auth | Add `withAuth()` to all endpoints | Confirmed |
| INST-10 | 4.1, 4.5 | 🟠 High | 7.5 | Cadre Change GET by ID leaks cross-institution data | Full record visible to HRO from other institution | Add institution check to GET handler | Confirmed |
| INST-11 | 4.3 | 🟠 High | 7.5 | `PUT /api/users/[id]` allows institution change without auth | Any user can change any user's institution | Add `withAuth({ allowedRoles: ['ADMIN'] })` | Confirmed |
| INST-12 | 4.4 | 🟠 High | 7.5 | Complaints endpoint unauthenticated with no filtering | All complaints accessible without login | Add `verifyAuth()`, use session for filtering | Confirmed |
| INST-13 | 4.4 | 🟡 Medium | 5.3 | Users endpoint returns all institutions' users | HRO can enumerate all users | Add institution filter for HRO role | Confirmed |
| INST-14 | 4.6 | 🟠 High | 7.5 | XSS in report complaint subjects | Stored XSS via unescaped `<script>` tags | Sanitize all report data fields | Confirmed |
| INST-15 | 4.8 | 🟡 Medium | 4.3 | Cross-institution violations not flagged in audit trail | Security events not detected | Add institution check + `UNAUTHORIZED_ACCESS` logging | Confirmed |

---

## Remediation Priority

### P0 — Immediate (Block Production Deployment)

| # | Action | Affected Endpoints |
|---|--------|-------------------|
| 1 | Add `verifyAuth()` to all unauthenticated endpoints | `/api/reports`, `/api/complaints`, `/api/employees/urgent-actions`, `/api/requests/track`, `/api/lwop-requests`, `/api/retirement-requests`, `/api/service-extension-requests` |
| 2 | Add `withAuth()` with ADMIN role to HRIMS admin endpoints | `/api/admin/hrims-settings` (GET/PUT) |
| 3 | Add `withAuth()` to all HRIMS sync endpoints | `/api/hrims/*` (11 endpoints) |
| 4 | Rotate HRIMS credentials (compromised) | API key + token exposed |
| 5 | Add institution ownership check to all 8 PATCH handlers | `/api/promotions/[id]`, `/api/lwop/[id]`, `/api/confirmations/[id]`, `/api/cadre-change/[id]`, `/api/retirement/[id]`, `/api/resignation/[id]`, `/api/service-extension/[id]`, `/api/termination/[id]` |
| 6 | Add institution ownership check to promotion POST | `/api/promotions` |
| 7 | Remove `institutionId` query param override in employees GET | `/api/employees` |

### P1 — Short-Term (Before Go-Live)

| # | Action | Affected Endpoints |
|---|--------|-------------------|
| 8 | Add institution check to cadre-change GET | `/api/cadre-change/[id]` |
| 9 | Add `withAuth({ allowedRoles: ['ADMIN'] })` to user PUT/DELETE | `/api/users/[id]` |
| 10 | Use `auth.role` and `auth.institutionId` in reports (not client params) | `/api/reports` |
| 11 | Sanitize report data (XSS in complaint subjects) | `/api/reports` |
| 12 | Add institution filter to users list for HRO | `/api/users` |
| 13 | Add `UNAUTHORIZED_ACCESS` logging for cross-institution attempts | All PATCH/POST handlers |

### P2 — Medium-Term

| # | Action | Affected Endpoints |
|---|--------|-------------------|
| 14 | Remove HRIMS test endpoint from production | `/api/hrims/test` |
| 15 | Remove `_fullApiKey`/`_fullToken` from settings response | `/api/admin/hrims-settings` |
| 16 | Add CSRF protection to HRIMS sync endpoints | `/api/hrims/*` |
| 17 | Add rate limiting to bulk sync endpoints | `/api/hrims/bulk-fetch` |

---

## Verification Commands

```bash
# Test 1: IDOR on PATCH (should return 403, returns 200)
curl -b session.txt -X PATCH "http://localhost:9002/api/promotions/<other-institution-id>" \
  -H "Content-Type: application/json" -d '{"status":"APPROVED"}'

# Test 2: Employee list override (should return 403, returns 200)
curl -b session.txt "http://localhost:9002/api/employees?institutionId=<other-institution>"

# Test 3: Unauthenticated reports (should return 401, returns 200)
curl "http://localhost:9002/api/reports?reportType=lwop"

# Test 4: HRIMS credentials leak (should return 401, returns 200)
curl "http://localhost:9002/api/admin/hrims-settings"

# Test 5: Cross-institution promotion (should return 403, returns 200)
curl -b session.txt -X POST "http://localhost:9002/api/promotions" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"<other-institution-employee>","promotionType":"Experience",...}'

# Test 6: Unauthenticated complaints (should return 401, returns 200)
curl "http://localhost:9002/api/complaints?userId=any&userRole=CSCS"
```

---

## References

- `src/lib/api-auth.ts` — `verifyAuth()`, `withAuth()`, `AuthContext` (institutionId)
- `src/lib/role-utils.ts` — `shouldApplyInstitutionFilter()`, `CSC_ROLES`
- `src/app/api/promotions/[id]/route.ts` — PATCH handler (no institution check)
- `src/app/api/employees/route.ts` — GET handler (query param override)
- `src/app/api/reports/route.ts` — No auth, client-supplied params
- `src/app/api/complaints/route.ts` — No auth, client-supplied params
- `src/app/api/admin/hrims-settings/route.ts` — No auth, exposes credentials
- `src/app/api/hrims/*/route.ts` — 11 endpoints without auth
- `src/lib/audit-logger.ts` — `UNAUTHORIZED_ACCESS`, `ACCESS_DENIED` events

# Requirement 7: Bulk Upload Security — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 7)
> **Related:** `5-employee-profile-protection.md`, `6-employee-creation-integrity.md`

---

## Test Environment

| Role | Username | Institution | Institution ID | Session Status |
|------|----------|-------------|----------------|----------------|
| HRO | `skawesu` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| Admin | `ymrajab` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| EMPLOYEE | `abdillahomarnajim` | — | — | ✅ Authenticated |

**Note:** Manual entry was enabled for HRO's institution via DB update for testing:
```sql
UPDATE "Institution" SET "manualEntryEnabled" = true
WHERE id = 'cmd059ion0000e6d85kexfukl';
```

---

## Bulk Upload API Endpoint Inventory

| Route | Method | Auth | Role Restriction | Institution Filter | Rate Limit | File Validation |
|-------|--------|------|------------------|-------------------|------------|-----------------|
| `/api/employees/bulk-upload` | POST | ✅ Yes | HRO only (code blocks Admin) | Forced to user's institution | Yes (upload: 10/min) | ✅ Multi-step pipeline |
| `/api/employees/bulk-upload` | PUT | ✅ Yes | HRO only (code blocks Admin) | Forced to user's institution | Yes (upload: 10/min) | N/A (JSON body) |

**Source:** `src/app/api/employees/bulk-upload/route.ts` (562 lines)

---

## Test Case No.: 7 — Requirement 7: Bulk Upload Security

**Process/Function Name:** Mass Employee Import Security

**Function Description:** Tests that bulk upload operations are protected from abuse and properly validated.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 7.1 | Upload Authorization | 1. Unauthorized user bulk uploads<br>2. Authorized user bulk uploads | - Unauthorized blocked<br>- Authorized allowed | ⚠️ Verify upload routes | **PARTIAL PASS — Authorization enforced but Admin role blocked.**<br><br>**✅ EMPLOYEE blocked:**<br>`POST /api/employees/bulk-upload` → HTTP 403 `{"error":"Insufficient permissions","errorCode":"FORBIDDEN"}`<br><br>**✅ No auth blocked:**<br>`POST /api/employees/bulk-upload` → HTTP 401 `{"error":"Authentication required","errorCode":"UNAUTHENTICATED"}`<br><br>**✅ HRO authorized:**<br>`POST /api/employees/bulk-upload` → HTTP 200 (file validation proceeds)<br><br>**❌ Admin blocked despite `allowedRoles`:**<br>`POST /api/employees/bulk-upload` as Admin → HTTP 403 `{"error":"Unauthorized"}`<br><br>**Root cause:** `withAuth({ allowedRoles: ['HRO', 'ADMIN'] })` passes Admin through middleware, but explicit check at line 103 `if (role !== 'HRO')` rejects Admin. Same issue at line 441 for PUT.<br><br>**Code reference:** `route.ts:103` and `route.ts:441` | **PARTIAL** | **P1 Bug:** Admin should be allowed. Change `role !== 'HRO'` to `!['HRO','ADMIN'].includes(role)`. |
| 7.2 | File Type Validation | 1. Upload CSV<br>2. Upload XLSX<br>3. Upload .exe | - Allowed types accepted<br>- Executables rejected | ⚠️ Verify file validation | **PASS — Multi-step validation pipeline works correctly.**<br><br>**✅ Valid CSV accepted:**<br>`POST` with `employees.csv` (text/csv) → HTTP 200 `{"success":true,"message":"File validated successfully"}`<br><br>**✅ .exe blocked (extension blocklist):**<br>`POST` with `evil.exe` → HTTP 403 `{"error":"File extension is not allowed: .exe","errorCode":"BLOCKED_FILE_TYPE"}`<br><br>**✅ .sh blocked (extension blocklist):**<br>`POST` with `script.sh` → HTTP 403 `{"error":"File extension is not allowed: .sh","errorCode":"BLOCKED_FILE_TYPE"}`<br><br>**✅ .php blocked (extension blocklist):**<br>`POST` with `shell.php` → HTTP 403 `{"error":"File extension is not allowed: .php","errorCode":"BLOCKED_FILE_TYPE"}`<br><br>**✅ PDF rejected (MIME allowlist):**<br>`POST` with `employees.pdf` (application/pdf) → HTTP 415 `{"error":"File type application/pdf is not allowed for context \"bulkUpload\"","errorCode":"INVALID_FILE_TYPE"}`<br><br>**⚠️ MIME spoofing partial bypass:**<br>`POST` with EXE content but `filename=data.csv; type=text/csv` → HTTP 400 `{"error":"File must contain header row and at least one data row"}`<br>EXE binary content passes the text/csv heuristic (≥85% printable ASCII in first 512 bytes) but fails CSV parsing. Not a security risk in practice since the content must be valid CSV to proceed.<br><br>**Validation pipeline (5 steps):**<br>1. Extension blocklist (`.exe`, `.sh`, `.php`, `.bat`, `.vbs`, etc.)<br>2. MIME blocklist (`application/x-executable`, etc.)<br>3. MIME allowlist (`text/csv`, `application/vnd.ms-excel`, `text/plain` only)<br>4. Size limit (1MB for bulkUpload context)<br>5. Magic-byte verification (content-type matching)<br><br>**Code reference:** `file-validation.ts:329-417` | **PASS** | OK. MIME spoofing is mitigated by CSV parsing requirement. |
| 7.3 | File Size Validation | 1. Upload 1MB file<br>2. Upload 100MB file | - Under limit accepted<br>- Over limit rejected | ⚠️ Verify size limit | **PASS — Size limit enforced correctly.**<br><br>**✅ Under 1MB accepted:**<br>228KB CSV (4,000 rows) → HTTP 200 (validation proceeds)<br><br>**✅ Over 1MB rejected:**<br>1.09MB CSV → HTTP 413 `{"error":"File size 1.09MB exceeds the 1MB limit for context \"bulkUpload\"","errorCode":"FILE_TOO_LARGE"}`<br><br>**Configuration:**<br>- `bulkUpload.maxSize = 1 * MB` (1,048,576 bytes)<br>- Config in `file-validation.ts:58-61`<br><br>**Rate limiting (upload tier):**<br>- 10 requests per 60 seconds per IP<br>- After 10 requests: HTTP 429 with `retryAfter` field<br>- Rate limit enforced BEFORE file validation (returns 429 even for invalid files)<br><br>**Code reference:** `file-validation.ts:367-374`, `rate-limiter.ts:19` | **PASS** | OK |
| 7.4 | Duplicate Detection | 1. Bulk upload with existing employees<br>2. Check handling | - Duplicates flagged<br>- User warned<br>- Skipped or updated | ❌ Verify duplicate handling | **PASS — Duplicates detected at multiple levels.**<br><br>**✅ Within-file duplicate detection:**<br>- ZAN ID duplicates: Detected via `zanIds` Set<br>- ZSSF Number duplicates: Detected via `zssfNumbers` Set<br>- Payroll Number duplicates: Detected via `payrollNumbers` Set<br>Duplicates moved from `validEmployees` to `invalidEmployees` with error message.<br><br>**✅ Database duplicate detection:**<br>- ZAN ID: `prisma.employee.findUnique({ where: { zanId } })` (unique constraint)<br>- Payroll Number: `prisma.employee.findFirst({ where: { payrollNumber } })`<br><br>**⚠️ ZSSF Number NOT checked against database:**<br>Only checked within file, not against existing DB records. Duplicate ZSSF numbers can be inserted via bulk upload if not in the same file.<br><br>**Code reference:** `route.ts:348-408` | **PARTIAL** | **P2:** Add ZSSF Number database duplicate check in POST validation. |
| 7.5 | Employee Validation Rules | 1. Upload with invalid employees<br>2. Check validation | - Invalid rows rejected<br>- Valid rows processed | ⚠️ Verify row validation | **PASS — Comprehensive per-row validation.**<br><br>**✅ Required fields validated (10 fields):**<br>name, gender, zanId, dateOfBirth, zssfNumber, payrollNumber, cadre, ministry, department, employmentDate<br>Missing fields produce descriptive error: `"Name is required"`, `"Gender is required"`, etc.<br><br>**✅ Gender validation:**<br>Must be "Male" or "Female". `"Other"` → `"Gender must be \"Male\" or \"Female\""`<br><br>**✅ Phone number validation:**<br>Regex: `/^0\d{9}$/` (10 digits starting with 0). `"abc"` → `"Phone number must be 10 digits starting with 0"`<br><br>**✅ Date format validation:**<br>Must be YYYY-MM-DD. `"not-a-date"` → `"... must be in format YYYY-MM-DD"`<br>Validated for: dateOfBirth, recentTitleDate, employmentDate, confirmationDate, retirementDate<br><br>**✅ Status validation:**<br>Must be one of: On Probation, Confirmed, Retired, On Leave, Suspended. Default: "On Probation"<br><br>**✅ Duplicate detection within file:**<br>Duplicate ZAN IDs, ZSSF Numbers, and Payroll Numbers flagged with `"Duplicate ... within file"` error.<br><br>**✅ Database duplicate check:**<br>Existing ZAN ID → `"An employee with this ZanID already exists in database"`<br>Existing Payroll → `"An employee with this Payroll Number already exists in database"`<br><br>**Code reference:** `route.ts:268-346` | **PASS** | OK |
| 7.6 | Institution Validation | 1. Upload with wrong institution<br>2. Submit | - Rejected<br>- Institution verified | ⚠️ Verify institution check | **PASS — Institution forced from session.**<br><br>**✅ Institution from auth context:**<br>Line 99: `institutionId = auth.institutionId` (from signed session)<br><br>**✅ Fallback to DB lookup:**<br>If `institutionId` missing from auth, fetched from `prisma.user.findUnique()` (lines 111-129).<br><br>**✅ Cannot override via request:**<br>Institution ID is never read from request body/query params. It's always derived from the authenticated user's session.<br><br>**✅ Institution feature gate:**<br>`manualEntryEnabled` must be true for the institution (line 141).<br><br>**✅ Time window enforcement:**<br>`manualEntryStartDate` and `manualEntryEndDate` checked (lines 152-170).<br><br>**✅ Employee creation uses session institution:**<br>Line 518: `institutionId: institutionId` (from session, not from uploaded data)<br><br>**Code reference:** `route.ts:99-170`, `route.ts:518` | **PASS** | OK |
| 7.7 | Import Audit Logging | 1. Perform bulk upload<br>2. Check audit | - Import event logged<br>- Count, file, user recorded | ✅ `audit-logger.ts:59` (FILE_UPLOADED) | **PARTIAL PASS — Creation logged, validation not logged.**<br><br>**✅ Employee creation audit logged:**<br>PUT endpoint calls `logEmployeeAction()` for each created employee (lines 538-549):<br>- Action: `CREATED`<br>- Employee ID, name, performer ID/username/role<br>- IP address, device info<br>- Additional data: `{ dataSource: 'BULK_UPLOAD', institutionId, batchRow }`<br><br>**❌ POST validation NOT audit logged:**<br>The POST endpoint (file validation) does not log any audit events. No record of who uploaded which files for validation.<br><br>**❌ File metadata NOT captured:**<br>Filename, file size, row count not recorded in audit log.<br><br>**Code reference:** `route.ts:538-549` (PUT only) | **PARTIAL** | **P1:** Add audit logging for POST validation endpoint. Log filename, size, row count. |
| 7.8 | Import Error Handling | 1. Upload with errors<br>2. Check error report | - Errors reported per row<br>- Valid rows still processed OR full rollback | ⚠️ Verify error handling | **PASS — Per-row error reporting with partial success.**<br><br>**✅ Per-row error reporting:**<br>Each invalid row includes `errors[]` array with specific error messages.<br><br>**✅ Mixed valid/invalid handling:**<br>CSV with 3 rows (2 valid, 1 invalid):<br>```json<br>{"totalRows":3,"validRows":2,"invalidRows":1,<br> "validEmployees":[...2 employees...],<br> "invalidEmployees":[{row:3, errors:["Name is required"]}]}```<br><br>**✅ Two-phase process:**<br>1. POST validates and returns results (no DB writes)<br>2. PUT confirms and creates only valid employees<br><br>**✅ Failed employees reported in PUT:**<br>`failedEmployees[]` array includes row number, name, and error message for each failure.<br><br>**Code reference:** `route.ts:416-426` (POST response), `route.ts:528-535` (PUT error handling) | **PASS** | OK |
| 7.9 | Transaction Integrity | 1. Upload partial-invalid file<br>2. Verify DB state | - Transaction integrity<br>- All-or-nothing or documented partial success | ⚠️ Verify transaction behavior | **PARTIAL PASS — Per-employee creation, no batch transaction.**<br><br>**✅ PUT empty array blocked:**<br>`PUT` with `{"employees":[]}` → HTTP 400 `{"error":"No valid employees to create"}`<br><br>**✅ PUT no auth blocked:**<br>`PUT` without cookie → HTTP 401 `{"error":"Authentication required"}`<br><br>**✅ PUT EMPLOYEE blocked:**<br>`PUT` as EMPLOYEE → HTTP 403 `{"error":"Insufficient permissions"}`<br><br>**❌ No database transaction wrapping:**<br>Employees created in a `for` loop (lines 481-535) without `prisma.$transaction()`. If creation fails midway, some employees are created and others are not.<br><br>**❌ No rollback on partial failure:**<br>`failedEmployees` are tracked but successful creates are not rolled back. Result returns both `created` and `failed` counts.<br><br>**Code reference:** `route.ts:478-535` | **PARTIAL** | **P2:** Wrap employee creation in `prisma.$transaction()` for atomicity. |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 7.1 | Upload Authorization | ⚠️ **PARTIAL** | Admin blocked by explicit `role !== 'HRO'` check despite `allowedRoles` config |
| 7.2 | File Type Validation | ✅ **PASS** | Multi-step pipeline: extension blocklist → MIME blocklist → allowlist → size → magic-byte |
| 7.3 | File Size Validation | ✅ **PASS** | 1MB limit enforced; rate limiting at 10 uploads/min per IP |
| 7.4 | Duplicate Detection | ⚠️ **PARTIAL** | Within-file duplicates detected; ZSSF not checked against DB |
| 7.5 | Employee Validation Rules | ✅ **PASS** | 10 required fields, gender/phone/date/status validation, duplicate detection |
| 7.6 | Institution Validation | ✅ **PASS** | Institution forced from session; manual entry feature gate + time window |
| 7.7 | Import Audit Logging | ⚠️ **PARTIAL** | PUT creation logged; POST validation not logged |
| 7.8 | Import Error Handling | ✅ **PASS** | Per-row errors, two-phase validate-then-confirm, partial success reporting |
| 7.9 | Transaction Integrity | ⚠️ **PARTIAL** | No `prisma.$transaction()` wrapping; partial creates not rolled back |

**Overall: 4 PASS, 4 PARTIAL, 0 FAIL**

---

## Complete Vulnerability List (Section 7)

| Vuln ID | Case ID | Severity | Description | Impact | Remediation |
|---------|---------|----------|-------------|--------|-------------|
| BU-01 | 7.1 | 🟠 High | Admin role blocked from bulk upload despite `allowedRoles: ['HRO', 'ADMIN']` | Admin cannot perform bulk uploads; role-based access inconsistency | Change `role !== 'HRO'` to `!['HRO','ADMIN'].includes(role)` at lines 103 and 441 |
| BU-02 | 7.4 | 🟡 Medium | ZSSF Number not checked against database during bulk upload validation | Duplicate ZSSF numbers can be inserted via bulk upload if not in same file | Add `prisma.employee.findFirst({ where: { zssfNumber } })` check in POST validation |
| BU-03 | 7.7 | 🟡 Medium | POST validation endpoint has no audit logging | No record of who uploaded which files, when, or how many rows | Add `logAuditEvent()` call in POST with filename, size, row counts |
| BU-04 | 7.9 | 🟡 Medium | Employee creation in PUT not wrapped in database transaction | Partial creates on failure; inconsistent DB state | Wrap creation loop in `prisma.$transaction()` |
| BU-05 | 7.2 | 🔵 Low | MIME spoofing: EXE content passes text/csv heuristic | EXE binary passes 85% printable ASCII check; fails at CSV parsing stage | Consider stricter magic-byte checks for CSV context; not exploitable in practice |

---

## Rate Limiting Analysis

| Tier | Limit | Window | Observed Behavior |
|------|-------|--------|-------------------|
| `upload` | 10 requests | 60 seconds | Enforced per IP; returns HTTP 429 with `retryAfter` seconds |
| `auth` | 5 requests | 60 seconds | Aggressive; blocks login attempts quickly |

**Observations:**
- Rate limiter fires BEFORE file validation — even invalid files count toward the limit
- Rate limit response: `{"success":false,"error":"Too many requests","errorCode":"RATE_LIMIT_EXCEEDED","retryAfter":N}`
- Headers: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `retry-after`
- Redis-backed; persists across requests

---

## File Validation Pipeline Detail

The `validateFileUpload()` function in `file-validation.ts` implements a 5-step pipeline:

```
Step 1: Extension Blocklist → 403 BLOCKED_FILE_TYPE
  Blocked: .exe, .bat, .cmd, .sh, .ps1, .vbs, .wsf, .msi, .com, .scr,
           .pif, .dll, .reg, .hta, .cpl, .inf, .jsp, .php, .asp, .aspx

Step 1b: MIME Blocklist → 403 BLOCKED_FILE_TYPE
  Blocked: application/x-executable, application/x-msdos-program, etc.

Step 2: MIME Allowlist → 415 INVALID_FILE_TYPE
  Allowed for bulkUpload: text/csv, application/vnd.ms-excel, text/plain

Step 3: Size Limit → 413 FILE_TOO_LARGE
  bulkUpload: 1MB (1,048,576 bytes)

Step 4: Magic-Byte Verification → 415 FILE_CONTENT_MISMATCH
  Detects: PDF, DOC, DOCX, JPEG, PNG, GIF, WebP
  CSV/text: heuristic (≥85% printable ASCII in first 512 bytes)

Step 5: ClamAV Scan → 403 MALWARE_DETECTED (if enabled)
  Optional; controlled by CLAMAV_ENABLED env var
```

---

## Two-Phase Upload Process

The bulk upload uses a two-phase process:

### Phase 1: POST — Validate
1. Auth check (HRO/Admin)
2. Institution check (manualEntryEnabled + time window)
3. File validation (5-step pipeline)
4. CSV parsing with header mapping
5. Per-row validation (required fields, formats, duplicates)
6. Database duplicate check (ZAN ID, Payroll Number)
7. Returns `validEmployees[]` and `invalidEmployees[]`

### Phase 2: PUT — Confirm
1. Auth check (HRO/Admin)
2. Institution check
3. Creates each valid employee individually
4. Audit logs each creation
5. Returns `created` and `failed` counts

**Security implication:** Phase 1 returns validated employee data including sensitive fields (ZAN ID, ZSSF, Payroll) to the client. This data is then sent back in Phase 2 PUT request. The client could modify data between phases.

---

## Recommendations Summary

| Priority | ID | Recommendation | Effort |
|----------|-----|----------------|--------|
| P1 | BU-01 | Fix Admin role check in bulk upload handler | Low |
| P1 | BU-03 | Add audit logging for POST validation endpoint | Low |
| P2 | BU-02 | Add ZSSF database duplicate check | Low |
| P2 | BU-04 | Wrap PUT creation in `prisma.$transaction()` | Medium |
| P3 | BU-05 | Tighten CSV magic-byte detection | Low |

---

## Test Execution Notes

- **Rate limiting** impacted testing: upload tier (10/min) and auth tier (5/min) required significant wait times between test batches
- **Session management:** Max 3 concurrent sessions per user; old sessions had to be cleared via DB for testing
- **MFA flow:** All accounts require OTP verification; OTPs queried from `MfaToken` table for automated testing
- **Manual entry gate:** HRO's institution required `manualEntryEnabled = true` to be set in DB for testing
- **Cookie handling:** Session cookies have `Secure` flag; curl over HTTP requires manual `Cookie:` header injection

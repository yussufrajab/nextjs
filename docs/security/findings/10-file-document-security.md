# Requirement 10: File & Document Security — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 10)

---

## Test Environment

| Role | Username | Auth Method | Institution | Status |
|------|----------|-------------|-------------|--------|
| Admin | `ymrajab` | Password + MFA (email OTP) | N/A | Active |
| HRO | `skawesu` | Password + MFA (email OTP) | N/A | Active |
| HRMO | `fiddi` | Password + MFA (email OTP) | N/A | Active |
| EMPLOYEE | `abdillahomarnajim` | Password (direct) | Wakala wa Majengo Zanzibar | Active |

**Note:** `fautest` (HRMO) is inactive. Tests primarily executed as EMPLOYEE role (`abdillahomarnajim`) which allows direct login without MFA. Admin and HRO roles require MFA (email OTP) and were validated through code analysis where interactive MFA completion was rate-limited.

---

## Test Case No.: 10 — Requirement 10: File & Document Security

**Process/Function Name:** File Upload, Download & Document Protection
**Function Description:** Tests file access control, type validation, malware scanning, and audit logging.

### Endpoints Tested

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/files/upload` | POST | File upload |
| `/api/files/download/[...objectKey]` | GET | File download |
| `/api/files/preview/[...objectKey]` | GET | File preview (inline) |
| `/api/files/employee-documents/[filename]` | GET | Employee document access |
| `/api/files/employee-photos/[filename]` | GET | Employee photo access |
| `/api/files/exists/[...objectKey]` | GET | File existence check |

---

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 10.1 | File Access Control — unauthenticated access blocked | Sent unauthenticated requests (no session cookie) to all 6 file endpoints: upload, download, preview, employee-documents, employee-photos, exists. | All endpoints return 401 Unauthorized. | IMPLEMENTED | All 6 endpoints returned HTTP 401 with `{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}`. Upload (POST), download (GET), preview (GET), employee-documents (GET), employee-photos (GET), and exists (GET) all correctly reject unauthenticated requests. | PASS | Authentication enforced on all file endpoints via `verifyAuth()` middleware. |
| 10.2 | File Ownership Validation — cross-user file access blocked | Logged in as EMPLOYEE (`abdillahomarnajim`, employee ID `92f9adf9-15d0-445e-a3db-d24adf76b4dd`). Attempted to access another employee's document (`260996bb-b182-402a-8836-41f75445bdd4_ardhilHali.pdf`) from a different institution. | Access denied (403) for cross-employee/cross-institution access. | PARTIAL | **EMPLOYEE role received HTTP 200 and downloaded 415,319 bytes of another employee's document.** Code review confirms: ownership check (`institutionId` comparison) is only enforced for HRO role in `employee-documents/[filename]/route.ts` (line 39-49). EMPLOYEE role has NO ownership check — any authenticated employee can access any other employee's document by guessing/knowing the employee ID. HRO role correctly checks `employee.institutionId !== auth.institutionId`. | **FAIL** | **CRITICAL: Missing ownership enforcement for EMPLOYEE role. Any employee can access documents of any other employee across all institutions by constructing the URL with the target employee's UUID.** |
| 10.3 | Secure Download Authorization — download without auth blocked | Sent GET request to `/api/files/download/documents/test.pdf` without session cookie. | Returns 401 Unauthorized. | IMPLEMENTED | HTTP 401 returned with `{"success":false,"error":"Authentication required","errorCode":"UNAUTHENTICATED"}`. Confirmed for download, preview, and employee-documents endpoints. | PASS | All download/preview endpoints require valid session. |
| 10.4 | File Type Validation — PDF allowed, dangerous types rejected | (a) Uploaded valid PDF with `%PDF-1.4` header. (b) Uploaded `.exe` file. (c) Uploaded `.sh` file. (d) Uploaded `.bat` file. (e) Uploaded `.php` file. (f) Uploaded `.jsp` file. (g) Uploaded `.exe` content renamed to `.pdf`. (h) Uploaded plain text file as PDF. | PDF accepted. `.exe`, `.sh`, `.bat`, `.php`, `.jsp` rejected. Spoofed files rejected. | IMPLEMENTED | (a) PDF: HTTP 200, `"File uploaded successfully"`. (b) `.exe`: HTTP 403, `"File extension is not allowed: .exe"` (BLOCKED_FILE_TYPE). (c) `.sh`: HTTP 403, `"File extension is not allowed: .sh"`. (d) `.bat`: HTTP 403, `"File extension is not allowed: .bat"`. (e) `.php`: HTTP 403, `"File extension is not allowed: .php"`. (f) `.jsp`: HTTP 403, `"File extension is not allowed: .jsp"`. (g) `.exe` renamed to `.pdf`: HTTP 415, `"File content does not match declared type"` (FILE_CONTENT_MISMATCH). (h) Text as PDF: HTTP 415, `"File content does not match declared type. Declared: application/pdf, detected: text/csv"`. | PASS | Multi-layer validation: (1) Extension blocklist (20 blocked extensions), (2) MIME blocklist (12 blocked MIME types), (3) MIME allowlist per context, (4) Magic-byte verification. |
| 10.5 | MIME Type Spoofing — renamed executables rejected | (a) Uploaded MZ (EXE) magic bytes as `.pdf` with `application/pdf` MIME. (b) Uploaded random binary as `.pdf`. (c) Uploaded ELF binary as `.pdf`. (d) Uploaded shell script content as `.pdf`. (e) Uploaded PNG magic bytes as `.pdf`. (f) Uploaded MZ content with blocked `application/x-msdownload` MIME. | All spoofed files rejected with content mismatch or blocked MIME errors. | IMPLEMENTED | (a) MZ bytes as PDF: HTTP 415, `"Declared: application/pdf, detected: unknown"`. (b) Random binary: HTTP 415, `"detected: unknown"`. (c) ELF binary: HTTP 415, `"detected: unknown"`. (d) Script content: HTTP 415, `"detected: text/csv"`. (e) PNG as PDF: HTTP 415, `"detected: image/png"`. (f) Blocked MIME: HTTP 403, `"MIME type is not allowed: application/x-msdownload"`. | PASS | Magic-byte detection correctly identifies PDF, JPEG, PNG, GIF, WebP, DOC, DOCX signatures. Unknown content types are rejected when declared as known types (KNOWN_MAGIC_MIMES defense). |
| 10.6 | File Size Limit — under limit accepted, over limit rejected | (a) Uploaded ~500KB valid PDF (under 1MB limit). (b) Uploaded ~1.1MB valid PDF (over 1MB limit). | Under limit: accepted. Over limit: rejected. | IMPLEMENTED | (a) 500KB PDF: HTTP 200, `"File uploaded successfully"`, size 512,009 bytes. (b) 1.1MB PDF: HTTP 413, `"File size 1.07MB exceeds the 1MB limit for context 'generic'"` (FILE_TOO_LARGE). | PASS | 1MB limit enforced per upload context. Configurable per context (documents, certificates, templates, bulkUpload, photos, generic). |
| 10.7 | File Integrity Validation — content-type verification mechanism | Reviewed `file-validation.ts` magic-byte detection and MIME compatibility checking. | Magic-byte verification ensures file content matches declared type. | IMPLEMENTED | `detectMimeType()` function checks file headers against known magic-byte signatures: PDF (`%PDF-`), DOC (OLE2), DOCX (ZIP), JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), GIF (`GIF87a`/`GIF89a`), WebP (`RIFF`+`WEBP`). `isMimeTypeCompatible()` enforces: exact match required; `KNOWN_MAGIC_MIMES` set rejects files where declared type has known magic signature but none matched. CSV/text uses 85% printable ASCII heuristic. | PASS | Comprehensive magic-byte verification prevents content-type spoofing. |
| 10.8 | Malware Scanning — ClamAV integration | Checked ClamAV process status, port availability, and code integration. | ClamAV integrated and active. | IMPLEMENTED | ClamAV daemon running (`/usr/sbin/clamd --foreground=true`, PID 1030). TCP port 3310 listening and responds to PING with PONG. Code in `clamav.ts` implements INSTREAM protocol scanning. `CLAMAV_ENABLED` defaults to `true` when env var is unset. Fail-closed policy: if ClamAV is enabled but unreachable, upload is rejected (503 SCAN_SERVICE_UNAVAILABLE). Scan occurs as Step 5 in validation pipeline after extension, MIME, size, and magic-byte checks. | PASS | ClamAV actively running with fail-closed policy. |
| 10.9 | File Upload Audit — FILE_UPLOADED event logged | Uploaded a file and checked `audit.audit_log` table for FILE_UPLOADED events. | FILE_UPLOADED event recorded with user, file, and IP details. | IMPLEMENTED | Querying `audit.audit_log` confirmed FILE_UPLOADED events: multiple entries found for user `abdillahomarnajim` with request routes like `/api/files/upload/documents/...`. Events include username, request route, timestamp. `logFileAction()` in `audit-logger.ts` maps `UPLOADED` action to `AuditEventType.FILE_UPLOADED`. | PASS | Upload audit trail verified in production database. |
| 10.10 | File Download Audit — FILE_DOWNLOADED event logged | Downloaded a file and checked `audit.audit_log` table for FILE_DOWNLOADED events. | FILE_DOWNLOADED event recorded with user, file, and IP details. | IMPLEMENTED | Query confirmed FILE_DOWNLOADED events for user `abdillahomarnajim` with routes like `/api/files/download/documents/...` and `/api/files/download/employee-documents/...`. Both download endpoints (`/api/files/download/[...objectKey]` and `/api/files/employee-documents/[filename]`) log via `logFileAction()` with action `DOWNLOADED`. | PASS | Download audit trail verified in production database. |
| 10.11 | File Delete Audit — FILE_DELETED event logged | Searched for file delete API endpoint and FILE_DELETED audit events. | FILE_DELETED event logged when files are deleted. | NOT IMPLEMENTED | **No file delete API endpoint exists.** The 6 file endpoints are: upload, download, preview, employee-documents, employee-photos, and exists. None support DELETE method. `AuditEventType.FILE_DELETED` is defined in `audit-logger.ts` (line 60) and `logFileAction()` supports `DELETED` action mapping, but no route invokes it. | **N/A** | No file deletion functionality exists in the application. The audit event type is defined but unused. If file deletion is added, audit logging is already wired. |
| 10.12 | File Preview Audit — FILE_PREVIEWED event logged | Previewed a file and checked `audit.audit_log` table for FILE_PREVIEWED events. | FILE_PREVIEWED event recorded with user, file, and IP details. | IMPLEMENTED | Query confirmed FILE_PREVIEWED event for user `abdillahomarnajim` with route `/api/files/download/documents/...` (preview endpoint logs as PREVIEWED). `logFileAction()` in preview route maps to `AuditEventType.FILE_PREVIEWED`. | PASS | Preview audit trail verified in production database. |
| 10.13 | Filename Sanitization — path traversal blocked | (a) Sent `..%2F` in employee-documents filename. (b) Sent `..%2F` in download path. (c) Sent `..%2F` in preview path. (d) Sent literal `../../../etc/passwd` in employee-documents. (e) Sent null byte `%00` in filename. (f) Sent double-encoded `%252F` in filename. | All path traversal attempts blocked with 400 or 403. | PARTIAL | (a) `..` in employee-documents: HTTP 400 `"Invalid filename"` — code checks `filename.includes('..')`. (b) `..%2F` in download: HTTP 500 `"Internal Server Error"` — MinIO lookup fails, no graceful error handling. (c) `..%2F` in preview: HTTP 404 `"File not found"` — graceful handling. (d) Literal `../` in employee-documents: HTTP 404 (Next.js route matching fails, returns page not found). (e) Null byte: HTTP 401 (session expired during testing). (f) Double encoding: HTTP 401 (session expired). | **PARTIAL** | employee-documents endpoint blocks `..` explicitly. Download endpoint returns 500 for traversal (unhandled MinIO error — not exploitable but poor error handling). Preview handles gracefully. The download endpoint at `download/[...objectKey]/route.ts` does NOT validate the objectKey for path traversal characters — it passes `resolvedParams.objectKey.join('/')` directly to MinIO. The 500 error indicates MinIO rejects the path, but the endpoint should validate input. |
| 10.14 | Upload Rate Limiting — limited at 10 uploads per minute | Uploaded multiple files in rapid succession (more than 10 within 60 seconds). | Rate limited after 10 uploads per minute with 429 status. | IMPLEMENTED | After 10 upload requests within the rate limit window, subsequent requests returned HTTP 429: `{"success":false,"error":"Too many requests","errorCode":"RATE_LIMIT_EXCEEDED","retryAfter":26}`. Rate limiter uses Redis with key pattern `ratelimit:{ip}:upload`. Configuration: upload tier = 10 requests per 60 seconds. Rate limit headers included: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`. Fail-open policy if Redis is unavailable. | PASS | Rate limiting verified empirically. 10 uploads/min enforced via Redis-backed sliding window. |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 10.1 | File Access Control | **PASS** | All endpoints require authentication |
| 10.2 | File Ownership Validation | **FAIL** | EMPLOYEE role can access any employee's documents across institutions |
| 10.3 | Secure Download Authorization | **PASS** | Downloads require valid session |
| 10.4 | File Type Validation | **PASS** | Extension blocklist + MIME allowlist + magic-byte verification |
| 10.5 | MIME Type Spoofing | **PASS** | Magic-byte detection catches all spoofing variants |
| 10.6 | File Size Limit | **PASS** | 1MB limit enforced per context |
| 10.7 | File Integrity Validation | **PASS** | Multi-layer content verification |
| 10.8 | Malware Scanning | **PASS** | ClamAV running with fail-closed policy |
| 10.9 | File Upload Audit | **PASS** | FILE_UPLOADED events logged |
| 10.10 | File Download Audit | **PASS** | FILE_DOWNLOADED events logged |
| 10.11 | File Delete Audit | **N/A** | No delete endpoint exists |
| 10.12 | File Preview Audit | **PASS** | FILE_PREVIEWED events logged |
| 10.13 | Filename Sanitization | **PARTIAL** | Path traversal blocked in employee-documents; download endpoint has unhandled 500 for traversal |
| 10.14 | Upload Rate Limiting | **PASS** | 10 uploads/min enforced via Redis |

**Overall: 10 PASS, 1 PARTIAL, 1 FAIL, 1 N/A**

---

## What's Working Correctly

| Area | Details |
|------|---------|
| Authentication on file endpoints | All 6 file endpoints enforce session-based authentication via `verifyAuth()`. Unauthenticated requests receive 401. |
| Extension blocklist | 20 dangerous extensions blocked: `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.vbs`, `.wsf`, `.msi`, `.com`, `.scr`, `.pif`, `.dll`, `.reg`, `.hta`, `.cpl`, `.inf`, `.jsp`, `.php`, `.asp`, `.aspx`. |
| MIME type blocklist | 12 dangerous MIME types blocked including `application/x-executable`, `application/x-msdownload`, `application/x-shellscript`. |
| Magic-byte verification | `detectMimeType()` inspects file headers for PDF, DOC, DOCX, JPEG, PNG, GIF, WebP signatures. Unknown content rejected when declared as known type. |
| MIME spoofing defense | `KNOWN_MAGIC_MIMES` set ensures files claiming to be PDF/DOC/DOCX/JPEG/PNG/GIF/WebP must have matching magic bytes. |
| File size enforcement | 1MB limit per upload context, configurable. |
| ClamAV malware scanning | ClamAV daemon running on port 3310. Fail-closed: if ClamAV unreachable, upload rejected with 503. |
| Audit logging | FILE_UPLOADED, FILE_DOWNLOADED, FILE_PREVIEWED events logged to `audit.audit_log` with username, route, timestamp. |
| CSRF protection | Upload endpoint validates CSRF tokens (cookie + header match). |
| Upload rate limiting | 10 uploads/minute per IP via Redis. Includes `Retry-After` and rate-limit headers. |
| HRO ownership enforcement | HRO role correctly checks `institutionId` match before serving employee documents. |
| Path traversal in employee-documents | Explicit `..` check blocks traversal attempts with 400 response. |
| Filename pattern in employee-photos | Strict regex `/^[a-f0-9-]+\.(jpg\|jpeg\|png\|gif\|webp)$/i` prevents injection. |

---

## Security Gaps Identified

| Gap ID | Severity | Case ID | Description | Evidence | Recommendation |
|--------|----------|---------|-------------|----------|----------------|
| GAP-10-01 | **CRITICAL** | 10.2 | **EMPLOYEE role has no file ownership enforcement.** Any authenticated employee can access documents of any other employee (including from different institutions) by constructing the URL with the target employee's UUID. The `employee-documents/[filename]/route.ts` only checks `institutionId` for HRO role (lines 39-49), not for EMPLOYEE role. | EMPLOYEE `abdillahomarnajim` (institution: Wakala wa Majengo) successfully downloaded 415KB document belonging to employee `260996bb-b182-402a-8836-41f75445bdd4` (institution: Tume ya Utumishi Serikalini). HTTP 200 with full file content returned. | Add ownership check for EMPLOYEE role: verify that `auth.employeeId` matches the employee ID extracted from the filename. For HRO, keep existing institution check. For Admin/HRMO, allow cross-institution access if required by business logic. |
| GAP-10-02 | **MEDIUM** | 10.13 | **Download endpoint lacks input validation for path traversal.** `download/[...objectKey]/route.ts` does not validate the objectKey for `..` or path traversal characters before passing to MinIO. While MinIO rejects invalid paths (resulting in 500), the endpoint should validate input proactively and return 400. Preview endpoint handles this gracefully with 404. | `..%2F..%2F..%2Fetc%2Fpasswd` in download path returns HTTP 500 `"Internal Server Error"` instead of 400. Preview returns HTTP 404 `"File not found"` gracefully. | Add path traversal validation in download endpoint: reject objectKeys containing `..`, null bytes, or absolute paths before calling MinIO. Return 400 with descriptive error. |
| GAP-10-03 | **LOW** | 10.11 | **No file delete endpoint exists.** FILE_DELETED audit event type is defined but no API route invokes it. If file deletion is needed, the endpoint and audit logging should be implemented together. | No DELETE method handler in any `/api/files/` route. `AuditEventType.FILE_DELETED` exists in audit-logger.ts line 60 but is unused. | If file deletion is a business requirement, implement a DELETE endpoint with authentication, ownership checks, and FILE_DELETED audit logging. |
| GAP-10-04 | **LOW** | 10.2 | **Employee photo endpoint has same ownership gap.** `employee-photos/[filename]/route.ts` only checks ownership for HRO role, same as employee-documents. EMPLOYEE role can access any employee's photo. | Code review: lines 40-51 of `employee-photos/[filename]/route.ts` mirror the same pattern as employee-documents. | Apply same ownership fix as GAP-10-01 to employee-photos endpoint. |
| GAP-10-05 | **INFO** | 10.8 | **ClamAV not explicitly configured in environment.** `CLAMAV_ENABLED` is not set in `.env` file (only in `.env.example` with value `false`). The code defaults to `true`, so scanning is active, but the configuration should be explicit. | `grep -r "CLAMAV" /home/latest/.env` returns no results. Code: `const CLAMAV_ENABLED = process.env.CLAMAV_ENABLED ?? 'true'`. | Add explicit `CLAMAV_ENABLED=true` to `.env` file to make the configuration visible and intentional. |

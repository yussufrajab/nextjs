# Requirement 9: Complaint Management Security — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 9)
> **Related:** `5-employee-profile-protection.md`, `8-workflow-security-approval-integrity.md`

---

## Test Environment

| Role | Username | Institution | Session Status |
|------|----------|-------------|----------------|
| HRO | `skawesu` | TUME YA UTUMISHI SERIKALINI | ✅ Authenticated |
| EMPLOYEE | `abdillahomarnajim` | — | ✅ Authenticated |

---

## Complaint API Endpoint Inventory

| Route | Method | Auth | Role Restriction | Ownership Check | Rate Limit |
|-------|--------|------|------------------|-----------------|------------|
| `/api/complaints` | GET | ❌ **No** | None (client-supplied via query) | None | ❌ **None** |
| `/api/complaints` | POST | ❌ **No** | None | None (complainantId from body) | ❌ **None** |
| `/api/complaints/[id]` | PUT | ❌ **No** | None | None | ❌ **None** |
| `/api/complaints/mfa-initiate` | POST | ✅ Yes | EMPLOYEE only | Yes (complainantId = auth.userId) | Yes (auth) |
| `/api/complaints/mfa-verify` | POST | ❌ **No** | None (MFA-verified) | Yes (complainantId = mfaResult.userId) | Yes |
| `/api/complaints/magic-link-verify` | POST | ❌ **No** | None (MFA-verified) | Yes | Yes |

**Source:** `src/app/api/complaints/route.ts` (231 lines), `src/app/api/complaints/[id]/route.ts` (154 lines)

---

## Critical Security Finding: All Complaint Endpoints Unauthenticated

### Discovery

The three core complaint endpoints (`GET`, `POST`, `PUT`) use `wrapHandler` but do **NOT** call `verifyAuth()` or `withAuth()`. There is no session validation whatsoever.

### Code Evidence

**`/api/complaints` POST (line 26):**
```typescript
export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json();
  // ... directly creates complaint from body
  // NO verifyAuth() call
  // NO withAuth() middleware
  // complainantId taken from request body, not session
}, 'complaints');
```

**`/api/complaints` GET (line 114):**
```typescript
export const GET = wrapHandler(async (req: Request) => {
  const userId = searchParams.get('userId');    // ← Client-supplied!
  const userRole = searchParams.get('userRole'); // ← Client-supplied!
  // ... queries based on client-supplied userId and userRole
  // NO verifyAuth() call
}, 'complaints');
```

**`/api/complaints/[id]` PUT (line 29):**
```typescript
export const PUT = wrapHandler(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  // ... updates complaint directly
  // NO verifyAuth() call
  // NO role check
  // NO ownership check
}, 'complaints');
```

### Contrast with Authenticated Endpoint

**`/api/complaints/mfa-initiate` (line 11):**
```typescript
export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  // ✅ Uses withAuth - authenticated
  // ✅ Validates complainantId === auth.userId
}), 'auth'), 'complaints-mfa-initiate');
```

---

## Test Case No.: 9 — Requirement 9: Complaint Management Security

**Process/Function Name:** Complaint Confidentiality, Integrity, and Ownership

**Function Description:** Tests that complaints are protected for confidentiality and only accessible by authorized parties.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 9.1 | Complaint Ownership Validation | 1. Employee A creates complaint<br>2. Employee B attempts access | - Owner validated<br>- Employee B blocked | ✅ `route-permissions-config.ts:81-84` | **FAIL — No authentication on GET endpoint.**<br><br>**❌ Unauthenticated access returns ALL complaints:**<br>`GET /api/complaints?userId=anyone&userRole=Admin` → HTTP 200 with 29 complaints (all complaints in system)<br><br>**❌ Role spoofing via query parameter:**<br>Passing `userRole=Admin` in query string grants Admin-level access.<br>Passing `userRole=DO` or `userRole=HHRMD` returns all complaints.<br><br>**✅ EMPLOYEE self-filter works (when role is EMPLOYEE):**<br>`userRole=EMPLOYEE` filters to `complainantId = userId`. But userId is also client-supplied.<br><br>**Test result:**<br>```<br>GET /api/complaints?userId=anyone&userRole=Admin<br>→ 29 complaints with phone numbers, details, next of kin<br>```<br><br>**Root cause:** No `verifyAuth()` in GET handler. `userId` and `userRole` from query params. | **FAIL** | **P0 Critical:** Add `verifyAuth()` to GET. Use session userId/role, not query params. |
| 9.2 | Complaint Access Control | 1. List complaints<br>2. Access specific complaint | - Only own/assigned complaints visible<br>- Others blocked | ✅ `route-permissions-config.ts:81-84` | **FAIL — All complaints accessible without authentication.**<br><br>**❌ Full complaint details exposed:**<br>Unauthenticated GET returns: subject, details, complainantPhoneNumber, nextOfKinPhoneNumber, officerComments, internalNotes, rejectionReason, attachments, status, reviewStage.<br><br>**Test result (unauthenticated):**<br>```<br>Subject: <script>alert(1)</script><br>Phone: 0999876876<br>NextOfKin: 0987890890<br>Status: Submitted<br>```<br><br>**Note:** XSS attempt stored in complaint subject field. | **FAIL** | **P0 Critical:** Add authentication to GET endpoint. |
| 9.3 | Complaint Authorization Checks | 1. Unauthorized user views complaint<br>2. Authorized (DO/HHRMD) views | - Unauthorized blocked<br>- DO/HHRMD allowed | ⚠️ Verify authorization | **FAIL — No authorization on any endpoint.**<br><br>**❌ POST creates complaints without auth:**<br>`POST /api/complaints` with valid `complainantId` → HTTP 201 (complaint created)<br>No session required. No role check. No MFA.<br><br>**❌ PUT updates complaints without auth:**<br>`PUT /api/complaints/<id>` → HTTP 200 (complaint updated)<br>Can change status, officer comments, internal notes, rejection reason.<br><br>**Test result:**<br>```<br>POST /api/complaints (no auth, no cookie)<br>→ HTTP 201: {"id":"5631057e-...","status":"Submitted"}<br>```<br><br>**Only `/api/complaints/mfa-initiate` is authenticated** (uses `withAuth`). | **FAIL** | **P0 Critical:** Add `verifyAuth()` to POST and PUT. |
| 9.4 | Complaint Status Validation | 1. Attempt invalid status transition<br>2. Submit | - Invalid transition blocked<br>- Valid allowed | ⚠️ Verify status logic | **FAIL — No status transition validation.**<br><br>**❌ Arbitrary status injection:**<br>`PUT /api/complaints/<id>` with `{"status":"Closed - Satisfied"}` → HTTP 200 (status changed)<br>No validation that the transition is valid.<br><br>**❌ No state machine:**<br>The PUT endpoint accepts any status string. No validation of current→next transition.<br><br>**Test result:**<br>```<br>PUT /api/complaints/<id> (no auth)<br>{"status":"Closed - Satisfied","officerComments":"Fake resolution"}<br>→ HTTP 200: status changed to "Closed - Satisfied"<br>```<br><br>**Valid statuses observed in DB:** Submitted, Under Review, Resolved - Pending Employee Confirmation, Awaiting More Information, Closed - Satisfied, Closed - Commission Decision (Resolved/Rejected) | **FAIL** | **P0:** Add status transition validation. |
| 9.5 | Complaint Audit Logging | 1. Submit/update/resolve complaint<br>2. Check audit | - `COMPLAINT_SUBMITTED`, `COMPLAINT_UPDATED`, `COMPLAINT_RESOLVED` logged | ✅ `audit-logger.ts:52-54` | **PARTIAL PASS — Logging exists but reviewer info can be spoofed.**<br><br>**✅ COMPLAINT_SUBMITTED logged:**<br>Audit log shows 5 complaint submissions with user, role, timestamp.<br><br>**✅ COMPLAINT_UPDATED logged:**<br>PUT endpoint calls `logComplaintAction()` (line 141).<br><br>**❌ Reviewer info from request body:**<br>`performedById: validatedData.reviewedById || updatedComplaint.complainantId`<br>The `reviewedById` comes from the request body, not from an authenticated session.<br><br>**❌ Unauthenticated actions logged with spoofed identity:**<br>Attacker can supply any `reviewedById` in the PUT body.<br><br>**Audit log entries:**<br>```<br>COMPLAINT_SUBMITTED | Ali Mmanga | EMPLOYEE | 2026-06-16<br>COMPLAINT_SUBMITTED | Fauzia Makame Ame | EMPLOYEE | 2026-05-29<br>COMPLAINT_SUBMITTED | ABDILLAH OMAR NAJIM | EMPLOYEE | 2026-05-26<br>``` | **PARTIAL** | **P0:** Audit logging meaningless without authentication. |
| 9.6 | Confidential Information Protection | 1. View complaint<br>2. Check confidential fields | - Confidential data protected<br>- Only authorized see it | ⚠️ Verify field protection | **FAIL — All complaint fields exposed without authentication.**<br><br>**❌ Full PII exposure:**<br>Unauthenticated GET returns all fields:<br>- `complainantPhoneNumber` (e.g., 0999876876)<br>- `nextOfKinPhoneNumber` (e.g., 0987890890)<br>- `details` (full complaint text)<br>- `officerComments`<br>- `internalNotes`<br>- `rejectionReason`<br>- `attachments`<br><br>**❌ No field masking or role-based field filtering:**<br>All roles (including spoofed) see all fields.<br><br>**⚠️ XSS in stored data:**<br>Complaint subject contains `<script>alert(1)</script>` — stored XSS not sanitized on input. | **FAIL** | **P0 Critical:** Add auth + field-level access control. Sanitize inputs. |
| 9.7 | Complaint Resolution Authorization | 1. Unauthorized resolves complaint<br>2. Authorized resolves | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ⚠️ Verify resolution routes | **FAIL — Anyone can resolve complaints without authentication.**<br><br>**❌ Unauthenticated resolution:**<br>`PUT /api/complaints/<id>` with `{"status":"Closed - Satisfied"}` → HTTP 200<br>No role check. No ownership check. No authentication.<br><br>**Test result:**<br>```<br>PUT /api/complaints/5631057e-... (no auth)<br>{"status":"Closed - Satisfied","officerComments":"Fake resolution"}<br>→ HTTP 200: complaint closed<br>```<br><br>**Impact:** Any unauthenticated user can:<br>- View all complaints (29 in system)<br>- Submit complaints impersonating any employee<br>- Close/resolve any complaint<br>- Modify internal notes and officer comments | **FAIL** | **P0 Critical:** Add authentication + role check (DO/HHRMD only) for resolution. |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 9.1 | Complaint Ownership Validation | ❌ **FAIL** | No auth on GET; role spoofing via query params; all 29 complaints exposed |
| 9.2 | Complaint Access Control | ❌ **FAIL** | Full complaint details (phone, next of kin, notes) exposed without auth |
| 9.3 | Complaint Authorization Checks | ❌ **FAIL** | POST creates complaints without auth; PUT updates without auth |
| 9.4 | Complaint Status Validation | ❌ **FAIL** | No status transition validation; arbitrary status injection |
| 9.5 | Complaint Audit Logging | ⚠️ **PARTIAL** | Logging exists but reviewer info from request body, not session |
| 9.6 | Confidential Information Protection | ❌ **FAIL** | All PII fields exposed; no field masking; stored XSS in subject |
| 9.7 | Complaint Resolution Authorization | ❌ **FAIL** | Anyone can close/resolve complaints without authentication |

**Overall: 0 PASS, 1 PARTIAL, 6 FAIL**

---

## Complete Vulnerability List (Section 9)

| Vuln ID | Case ID | Severity | Description | Impact | Remediation |
|---------|---------|----------|-------------|--------|-------------|
| CP-01 | 9.1-9.7 | 🔴 Critical | All complaint endpoints (GET, POST, PUT) have NO authentication | Complete data breach: all 29 complaints with PII accessible; complaints can be created/modified/deleted by anyone | Add `verifyAuth()` to all complaint endpoints |
| CP-02 | 9.1 | 🔴 Critical | GET endpoint takes userId and userRole from query parameters | Role spoofing: attacker passes `userRole=Admin` to see all complaints | Use session userId/role, not query params |
| CP-03 | 9.3 | 🔴 Critical | POST endpoint accepts client-supplied complainantId | Impersonation: attacker creates complaints as any employee | Use `auth.userId` from session as complainantId |
| CP-04 | 9.7 | 🔴 Critical | PUT endpoint allows complaint resolution without auth or role check | Anyone can close/resolve complaints; tamper with officer comments and internal notes | Add auth + role check (DO/HHRMD only) |
| CP-05 | 9.4 | 🟠 High | No status transition validation on PUT | Invalid status transitions; arbitrary status injection | Implement state machine: Submitted → Under Review → Resolved → Closed |
| CP-06 | 9.6 | 🟠 High | All complaint fields exposed without role-based filtering | Internal notes, officer comments, rejection reasons visible to all | Add field-level access control based on role |
| CP-07 | 9.6 | 🟠 High | Stored XSS in complaint subject field | `<script>alert(1)</script>` stored and returned in responses | Sanitize input on creation; encode output on display |
| CP-08 | 9.5 | 🟡 Medium | Audit log reviewer info comes from request body | Spoofed reviewer identity in audit trail | Use authenticated user ID for audit logging |

---

## MFA Flow Analysis

The complaint system has a separate MFA-protected flow for EMPLOYEE submissions:

### MFA Flow (Authenticated)
1. **`POST /api/complaints/mfa-initiate`** (authenticated via `withAuth`)
   - Validates `complainantId === auth.userId`
   - Creates MFA token, sends magic link email
   - Only for EMPLOYEE role

2. **`POST /api/complaints/mfa-verify`** (unauthenticated but MFA-verified)
   - Verifies OTP token
   - Validates `complainantId === mfaResult.userId`
   - Creates complaint

### Direct Flow (Unauthenticated — CRITICAL)
1. **`POST /api/complaints`** — Anyone can submit with any `complainantId`
2. **`GET /api/complaints`** — Anyone can read all complaints
3. **`PUT /api/complaints/[id]`** — Anyone can modify any complaint

The MFA flow exists but is bypassed entirely by the direct endpoints.

---

## Recommendations Summary

| Priority | ID | Recommendation | Effort |
|----------|-----|----------------|--------|
| P0 | CP-01 | Add `verifyAuth()` to GET, POST, PUT complaint endpoints | Low |
| P0 | CP-02 | Use session userId/role instead of query parameters in GET | Low |
| P0 | CP-03 | Use `auth.userId` as complainantId in POST | Low |
| P0 | CP-04 | Add role check to PUT (DO/HHRMD for resolution) | Low |
| P1 | CP-05 | Implement status transition validation state machine | Medium |
| P1 | CP-06 | Add field-level access control (internalNotes, officerComments) | Medium |
| P1 | CP-07 | Sanitize complaint input fields (prevent XSS) | Low |
| P2 | CP-08 | Use authenticated user ID in audit logging | Low |

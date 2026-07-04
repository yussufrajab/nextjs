# Requirement 18: Workflow State Integrity — Security Test Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Related:** `8-workflow-security-approval-integrity.md`, `3-authorization-least-privilege.md`

---

## Test Environment

| Role | Username | Institution | Institution ID | Session Status |
|------|----------|-------------|----------------|----------------|
| HRMO | `fautest` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | Authenticated (intermittent lockouts) |
| EMPLOYEE | `abdillahomarnajim` | WAKALA WA MAJENGO ZANZIBAR | `cmd06xe30000fe6bqe6ljiz1v` | Authenticated |

**Credentials:** All accounts use password `Csms@2026`

---

## Workflow State Machine Architecture

### Critical Finding: No Formal State Machine Exists

The application has **no centralized state machine, no status enum, and no transition validation table.** The `status` field on every request model in the Prisma schema is typed as `String`, not an enum. Any string value can be written to the database.

**Prisma Schema (all request models):**
```prisma
model PromotionRequest {
  status      String    // Free-form string, no enum constraint
  reviewStage String    // Free-form string, no enum constraint
  // ...
}
model LwopRequest {
  status      String
  reviewStage String
  // ...
}
// Same pattern for: ConfirmationRequest, ResignationRequest,
// RetirementRequest, SeparationRequest, ServiceExtensionRequest, CadreChangeRequest
```

### Dual PATCH Endpoint Architecture (Inconsistent Security)

A critical architectural flaw: **two separate PATCH endpoints exist for the same resources with different security postures.**

| Endpoint | Method | Role Checks | Transition Validation | Used By |
|----------|--------|-------------|----------------------|---------|
| `PATCH /api/promotions` | PATCH | Yes (HRRP, HHRMD, HRMO, HRO per action) | Implicit (status string matching) | Frontend |
| `PATCH /api/promotions/[id]` | PUT/PATCH | **NONE** | **NONE** | Direct API access |
| `PATCH /api/lwop/[id]` | PUT/PATCH | **NONE** | **NONE** | Direct API access |
| `PATCH /api/confirmations/[id]` | PUT/PATCH | **NONE** | **NONE** | Direct API access |
| All other `[id]` endpoints | PUT/PATCH | **NONE** | **NONE** | Direct API access |

**Code evidence** — `src/app/api/promotions/route.ts` (collection PATCH, lines 408-436):
```typescript
// Has role-based authorization
if (isHrrpAction)          -> only ['HRRP']
if (isCommissionDecision)  -> only ['HHRMD', 'HRMO']
if (isInitialReviewAction) -> only ['HHRMD', 'HRMO']
if (isResubmission)        -> only ['HRO', 'HRRP']
else                       -> "Invalid update action" (403)
```

**Code evidence** — `src/app/api/lwop/[id]/route.ts` (individual PATCH, lines 24-176):
```typescript
// NO role check, NO transition validation, NO status enum
async function handleUpdate(req, { params }) {
  const authResult = await verifyAuth(req);  // Only checks authentication
  // ... directly writes any status to database
  const updatedRequest = await db.lwopRequest.update({
    where: { id },
    data: validatedData,  // Any string accepted for status
  });
}
```

### Intended Workflow (Enforced Only on Collection Endpoint)

```
HRO submits → "Pending HRRP Review" (reviewStage: initial)
                ↓
HRRP approves → "Approved by HRRP - Awaiting Commission Review" (reviewStage: hrrp_review)
HRRP rejects  → "Rejected by HRRP - Awaiting HRO Correction" (reviewStage: initial)
                ↓ (HRO corrects & resubmits)
"Pending HRRP Review" (loops back)
                ↓ (HHRMD/HRMO reviews)
Commission approves → "Approved by Commission" (terminal)
Commission rejects  → "Rejected by Commission - Request Concluded" (terminal)
```

---

## Test Results

### Test Case Table

| ID | Test Case | Category | Severity | Steps | Expected Result | Actual Result | Status |
|----|-----------|----------|----------|-------|-----------------|---------------|--------|
| 18.1 | State Machine Enforcement | Integrity | Critical | 1. Login as EMPLOYEE 2. PATCH `/api/lwop/[id]` with arbitrary status `"HACKED_STATUS_MAGIC_VALUE"` | Request rejected with 400/403 | HTTP 200 — arbitrary status written to DB | FAIL |
| 18.1b | Empty Status String | Integrity | High | PATCH with `{"status":"","reviewStage":""}` | Rejected — status cannot be empty | HTTP 200 — empty string written to DB | FAIL |
| 18.1c | Null Status | Integrity | Low | PATCH with `{"status":null}` | Rejected | HTTP 400 — Zod validation rejects null | PASS |
| 18.1d | XSS in Status Field | Integrity | High | PATCH with `{"status":"<script>alert(1)</script>"}` | Rejected or sanitized | HTTP 200 — XSS payload stored verbatim | FAIL |
| 18.2 | Transition Validation | Integrity | Critical | 1. Request at "Pending HRRP Review" 2. PATCH directly to "Approved by Commission" | Rejected — must follow HRRP gate first | HTTP 200 — skipped entire HRRP review phase | FAIL |
| 18.2b | Skip to Terminal Rejection | Integrity | Critical | PATCH from "Pending HRRP Review" to "Rejected by Commission - Request Concluded" | Rejected — must go through review phases | HTTP 200 — terminal state set directly | FAIL |
| 18.2c | Skip HRRP Gate | Integrity | Critical | PATCH to "Approved by HRMO - Awaiting Commission Decision" | Rejected — HRRP must approve first | HTTP 200 — HRRP gate bypassed | FAIL |
| 18.3 | Status Change Authorization | Authorization | Critical | 1. Login as EMPLOYEE 2. PATCH `/api/lwop/[id]` with HRRP approval status | Rejected — EMPLOYEE cannot perform HRRP actions | HTTP 200 — EMPLOYEE successfully performed HRRP approval | FAIL |
| 18.3b | EMPLOYEE Commission Approval | Authorization | Critical | EMPLOYEE sets status to "Approved by Commission" | Rejected — only HHRMD/HRMO can approve | HTTP 200 — EMPLOYEE approved as commission | FAIL |
| 18.4 | Workflow Ownership Validation | Authorization | Critical | 1. Login as EMPLOYEE (institution A) 2. PATCH LWOP request from institution B | Rejected — cannot modify other institution's requests | HTTP 200 — cross-institution modification succeeded | FAIL |
| 18.4b | Cross-Institution Data Exposure | Authorization | High | GET `/api/lwop-requests` as EMPLOYEE | Only own institution's requests returned | All 63 LWOP requests from all institutions returned (endpoint has NO authentication) | FAIL |
| 18.5 | Workflow Audit Logging | Audit | Medium | 1. Change status via API 2. Query audit logs | All status changes logged | Partial — only changes containing "approved"/"rejected" are logged; arbitrary status changes are NOT logged | PARTIAL |
| 18.5b | Audit Log Access Control | Audit | Medium | Query `/api/audit/logs` as HRMO | HRMO can view audit logs | HTTP 403 — only Admin role can access audit logs | PARTIAL |
| 18.6 | Workflow Integrity — Reviewer Spoofing | Integrity | Critical | PATCH with `reviewedById` set to different user ID | Spoofed ID rejected or overridden | PASS — `reviewedById` correctly overridden to authenticated user's ID | PASS |
| 18.6b | Extra Field Injection | Integrity | Medium | PATCH with injected `employeeId` and `submittedById` | Injected fields rejected | PASS — Zod schema strips unknown fields | PASS |
| 18.6c | Terminal State Immutability | Integrity | Critical | 1. Set to "Approved by Commission" 2. Revert to "Pending HRRP Review" | Rejected — terminal states must be immutable | HTTP 200 — terminal state successfully reverted to pending | FAIL |

---

## Detailed Test Evidence

### 18.1a — Arbitrary Status String Injection

**Request:**
```bash
curl -s -H "Cookie: session=$EMP_SESSION" \
  -X PATCH "http://localhost:9002/api/lwop/5723ae09-85c3-4adc-8ac1-20bc6d21a72c" \
  -H 'Content-Type: application/json' \
  -d '{"status":"HACKED_STATUS_MAGIC_VALUE","reviewStage":"injected_stage"}'
```

**Response (HTTP 200):**
```json
{
  "id": "5723ae09-85c3-4adc-8ac1-20bc6d21a72c",
  "status": "HACKED_STATUS_MAGIC_VALUE",
  "reviewStage": "injected_stage",
  "duration": "13 months",
  "employeeId": "66d30bb6-0b29-4483-8768-eabea4ee5fa0",
  "submittedById": "69b8c30e-ffab-466c-8c86-6e6d1c1ff4ee"
}
```

**Impact:** Any authenticated user can set any arbitrary status string on any request, completely bypassing the intended workflow.

### 18.2a — Skip to Terminal State

**Request:**
```bash
curl -s -H "Cookie: session=$EMP_SESSION" \
  -X PATCH "http://localhost:9002/api/lwop/5723ae09-85c3-4adc-8ac1-20bc6d21a72c" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Approved by Commission","reviewStage":"commission_review","reviewedById":"fake-reviewer"}'
```

**Response (HTTP 200):**
```json
{
  "status": "Approved by Commission",
  "reviewStage": "commission_review"
}
```

**Impact:** An EMPLOYEE can directly approve their own LWOP request (or anyone else's) without any review, skipping the entire HRRP gate and commission review process.

### 18.3a — Unauthorized Role Action

**Request (EMPLOYEE performing HRRP approval):**
```bash
curl -s -H "Cookie: session=$EMP_SESSION" \
  -X PATCH "http://localhost:9002/api/lwop/5723ae09-85c3-4adc-8ac1-20bc6d21a72c" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Approved by HRRP - Awaiting Commission Review","hrrpReviewedById":"emp_94e5c58390bec815fbe3ad8c929cae0c"}'
```

**Response (HTTP 200):**
```json
{
  "status": "Approved by HRRP - Awaiting Commission Review"
}
```

**Impact:** Any authenticated user can impersonate any workflow role (HRRP, HHRMD, HRMO, Commission) by simply setting the appropriate status string.

### 18.4 — Cross-Institution Ownership Bypass

**Request (EMPLOYEE from WAKALA WA MAJENGO ZANZIBAR modifying TUME YA UTUMISHI SERIKALINI request):**
```bash
curl -s -H "Cookie: session=$EMP_SESSION" \
  -X PATCH "http://localhost:9002/api/lwop/5723ae09-85c3-4adc-8ac1-20bc6d21a72c" \
  -H 'Content-Type: application/json' \
  -d '{"status":"Approved by HRRP - Awaiting Commission Review"}'
```

**Response (HTTP 200):** Status changed successfully.

**Additional finding:** `GET /api/lwop-requests` has **no authentication at all** — it accepts `userRole` and `userInstitutionId` as query parameters, making all LWOP data publicly accessible.

### 18.6c — Terminal State Reversal

**Request sequence:**
```bash
# Step 1: Set to terminal state
curl -s -H "Cookie: session=$EMP_SESSION" \
  -X PATCH "http://localhost:9002/api/lwop/$ID" \
  -d '{"status":"Approved by Commission","reviewedById":"..."}'
# Response: HTTP 200, status = "Approved by Commission"

# Step 2: Revert terminal state back to pending
curl -s -H "Cookie: session=$EMP_SESSION" \
  -X PATCH "http://localhost:9002/api/lwop/$ID" \
  -d '{"status":"Pending HRRP Review","reviewStage":"initial"}'
# Response: HTTP 200, status = "Pending HRRP Review"
```

**Impact:** Terminal decisions (approved/rejected by commission) can be reversed by any authenticated user, undermining the finality of workflow decisions.

---

## Comparison: Collection vs Individual PATCH Endpoints

| Test | `PATCH /api/promotions` (collection) | `PATCH /api/promotions/[id]` (individual) |
|------|--------------------------------------|-------------------------------------------|
| Arbitrary status | 403 "Invalid update action" | 200 — accepted |
| Skip to terminal | 403 "Invalid update action" | 200 — accepted |
| EMPLOYEE performing HRRP action | 403 — role check blocks | 200 — no role check |
| Reviewer ID spoofing | Overridden to auth user | Overridden to auth user |

**The collection endpoint has proper workflow security. The individual [id] endpoint has none.**

---

## Audit Logging Analysis

### What Gets Logged

| Event Type | Trigger | Logged? |
|-----------|---------|---------|
| `REQUEST_SUBMITTED` | POST creates request | Yes (via `logRequestSubmission`) |
| `REQUEST_APPROVED` | Status contains "approved" (case-insensitive) | Yes (via `logRequestApproval`) |
| `REQUEST_REJECTED` | Status contains "rejected" (case-insensitive) | Yes (via `logRequestRejection`) |
| Arbitrary status change | Status = "HACKED_STATUS" | **NOT logged** |
| Empty status change | Status = "" | **NOT logged** |
| XSS status injection | Status = "<script>..." | **NOT logged** |
| Cross-institution tampering | Any status on wrong institution | **NOT logged** (no institution check) |

### Audit Log Access

- `/api/audit/logs` requires **Admin** role — HRMO, HHRMD, and other CSC roles cannot query audit logs
- `/api/health/audit` is unauthenticated and confirms: 1,579 total rows, 417 events in last 24 hours
- Audit logging fails silently (`.catch(() => {})` on submission logging) — failures do not surface

---

## Summary Matrix

| Sub-Case | Test | Result | Severity |
|----------|------|--------|----------|
| 18.1 | State Machine Enforcement | **FAIL** — arbitrary status strings accepted | Critical |
| 18.2 | Transition Validation | **FAIL** — any-to-any transition allowed, no phase enforcement | Critical |
| 18.3 | Status Change Authorization | **FAIL** — any role can perform any action via [id] endpoint | Critical |
| 18.4 | Workflow Ownership Validation | **FAIL** — cross-institution modification allowed, unauthenticated data access | Critical |
| 18.5 | Workflow Audit Logging | **PARTIAL** — only approval/rejection events logged, not arbitrary changes | Medium |
| 18.6 | Workflow Integrity Checks | **MIXED** — reviewer spoofing blocked (PASS), terminal state immutability not enforced (FAIL) | Critical |

**Overall Assessment: 5 of 6 sub-cases FAILED. Workflow state integrity is critically deficient.**

---

## Root Cause Analysis

1. **No centralized state machine:** Status transitions are validated (partially) only in the collection PATCH handler, not in the individual [id] handler. Each request type reimplements similar but inconsistent logic.

2. **Free-form status strings:** The Prisma schema uses `String` for `status` and `reviewStage` instead of an enum. No database-level constraint prevents invalid values.

3. **Dual endpoint architecture:** Two PATCH endpoints exist for each resource type. The collection endpoint (`/api/promotions`) has role-based authorization; the individual endpoint (`/api/promotions/[id]`) does not. Attackers can bypass the secure endpoint by calling the insecure one directly.

4. **No transition guard:** There is no function that checks "from status X, only transitions Y and Z are allowed." The only check is whether the user's role matches the target status action — and this check only exists on the collection endpoint.

5. **No immutability for terminal states:** Once a request reaches "Approved by Commission" or "Rejected by Commission - Request Concluded," it can be modified by any authenticated user.

6. **Unauthenticated list endpoint:** `GET /api/lwop-requests` accepts `userRole` and `userInstitutionId` as query parameters with no server-side authentication, exposing all LWOP data publicly.

---

## Recommendations

### Critical (Immediate)

1. **Add role-based authorization to all [id] PATCH/PUT endpoints.** Port the role-check logic from the collection PATCH handler to every individual resource handler. At minimum, add `checkRoleAuthorization()` calls matching the collection endpoint's authorization matrix.

2. **Implement a centralized state machine.** Create a `workflow-state-machine.ts` utility that defines valid transitions per request type and is called by ALL update endpoints (both collection and individual).

3. **Enforce status enum at database level.** Change `status String` to a Prisma enum or add a CHECK constraint that limits values to the known status catalog.

4. **Add institution-level ownership checks to [id] endpoints.** Before allowing any mutation, verify the authenticated user's institution matches the request's employee institution (or the user has a CSC role).

5. **Add authentication to `GET /api/lwop-requests`.** Replace the query-parameter-based role/institution with `verifyAuth()`.

### High (Short-term)

6. **Enforce terminal state immutability.** Before allowing any update, check if the current status is terminal ("Approved by Commission" or "Rejected by Commission - Request Concluded") and reject modifications.

7. **Log ALL status changes to audit log.** Currently only "approved"/"rejected" changes are logged. Log every status change regardless of the target status value.

8. **Sanitize status input.** Strip HTML tags and limit status string length to prevent XSS and injection via the status field.

### Medium (Medium-term)

9. **Consolidate PATCH endpoints.** Remove the individual [id] PATCH endpoints or redirect them through the same authorization logic as the collection endpoint.

10. **Add transition validation to Zod schemas.** Extend the update schemas to validate that the target status is a valid transition from the current status.

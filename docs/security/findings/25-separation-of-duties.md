# Requirement 25: Separation of Duties -- Security Test Results

**Application:** CSMS (http://localhost:9002)
**Branch:** feat/err01-batch3-wrap-handler
**Test Date:** 2026-07-03
**Tester:** Automated Security Audit

---

## Executive Summary

The CSMS application implements role-based separation of duties through a multi-stage workflow (HRO submit -> HRRP review -> Commission decision). However, **two critical findings** were identified: (1) admin API routes `/api/admin/cleanup-sessions` and `/api/admin/hrims-settings` lack authentication entirely, allowing unauthenticated access to session data and sensitive HRIMS credentials; and (2) the HRRP role can both submit and auto-approve requests in a single action, bypassing the intended two-person review. Self-approval blocking is achieved implicitly through role-based authorization rather than explicit submitter-reviewer identity comparison.

**Overall Assessment: PARTIAL FAIL -- 1 Critical, 2 Medium, 1 Low finding**

---

## Test Accounts

| Account | Username | Role | Email | Auth Method |
|---------|----------|------|-------|-------------|
| Admin | ymrajab | Admin | Yes | MFA (email OTP) |
| HRMO | fautest | HRMO | No | Direct login |
| HRO | skawesu | HRO | Yes | MFA (email OTP) |
| EMPLOYEE | abdillahomarnajim | EMPLOYEE | No | Direct login |
| HHRMD | skhamis | HHRMD | Yes | MFA (email OTP) |

All accounts use password `Csms@2026`.

---

## Test Case 25.1: Role Separation Controls

**Objective:** Verify that system roles are properly separated and no single user can perform conflicting actions.

### Test 25.1.1: EMPLOYEE Cannot Submit HR Requests

**Method:** Attempted to create promotion and confirmation requests as EMPLOYEE role.

```bash
# Login as EMPLOYEE (abdillahomarnajim)
curl -s -c /tmp/cookies-abdillah.txt -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"abdillahomarnajim","password":"Csms@2026"}'

# Attempt to create promotion request
curl -s -b /tmp/cookies-abdillah.txt -X POST http://localhost:9002/api/promotions \
  -H 'Content-Type: application/json' \
  -d '{"employeeId":"emp1","promotionType":"Experience","proposedCadre":"Senior Officer"}'
```

**Result:** EMPLOYEE cannot submit confirmation requests (explicit role check blocks):
```json
{"success":false,"message":"Unauthorized: EMPLOYEE cannot perform this action. Allowed roles: HRO, HRRP"}
```

**PASS** -- EMPLOYEE role correctly blocked from submitting HR requests.

### Test 25.1.2: HRMO Cannot Submit Requests (Only Approve)

**Method:** Attempted to create promotion and confirmation requests as HRMO (fautest).

```bash
# Login as HRMO (fautest)
curl -s -c /tmp/cookies-fautest.txt -X POST http://localhost:9002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"fautest","password":"Csms@2026"}'

# Attempt to submit confirmation request
curl -s -b /tmp/cookies-fautest.txt -X POST http://localhost:9002/api/confirmations \
  -H 'Content-Type: application/json' \
  -d '{"employeeId":"emp1"}'
```

**Result:**
```json
{"success":false,"message":"Unauthorized: HRMO cannot perform this action. Allowed roles: HRO, HRRP"}
```

**PASS** -- HRMO correctly restricted to approval functions only.

### Test 25.1.3: HRMO Cannot Perform HRRP Actions

**Method:** Attempted HRRP-specific rejection as HRMO.

```bash
curl -s -b /tmp/cookies-fautest.txt -X PATCH http://localhost:9002/api/promotions \
  -H 'Content-Type: application/json' \
  -d '{"id":"nonexistent-id","status":"Rejected by HRRP - Awaiting HRO Correction"}'
```

**Result:**
```json
{"success":false,"message":"Unauthorized: HRMO cannot perform this action. Allowed roles: HRRP"}
```

**PASS** -- HRMO correctly blocked from HRRP-specific actions.

### Test 25.1.4: HRMO Cannot Resubmit (HRO/HRRP Only)

```bash
curl -s -b /tmp/cookies-fautest.txt -X PATCH http://localhost:9002/api/promotions \
  -H 'Content-Type: application/json' \
  -d '{"id":"nonexistent-id","status":"Pending HRRP Review"}'
```

**Result:**
```json
{"success":false,"message":"Unauthorized: HRMO cannot perform this action. Allowed roles: HRO, HRRP"}
```

**PASS** -- Resubmission correctly restricted to HRO/HRRP roles.

### Test 25.1.5: Workflow Stage Enforcement

**Method:** Code analysis of the promotion PATCH handler authorization logic.

From `src/app/api/promotions/route.ts` (lines 408-437):
```typescript
const isHrrpAction = isHrrpApproval || isHrrpRejection;
const isCommissionDecision = updateData.reviewedById !== undefined && !isHrrpAction && (...);
const isInitialReviewAction = updateData.reviewedById !== undefined && !isHrrpAction && !isCommissionDecision;
const isResubmission = updateData.status === 'Pending HRRP Review' && !updateData.reviewedById;

let authCheck;
if (isHrrpAction) {
  authCheck = checkRoleAuthorization(userRole, ['HRRP']);
} else if (isCommissionDecision || isInitialReviewAction) {
  authCheck = checkRoleAuthorization(userRole, ['HHRMD', 'HRMO']);
} else if (isResubmission) {
  authCheck = checkRoleAuthorization(userRole, ['HRO', 'HRRP']);
}
```

**PASS** -- Each workflow stage has distinct role authorization.

### 25.1 Assessment: PASS

Role separation is enforced at the API level. The workflow correctly assigns:
- **Submit:** HRO or HRRP only
- **HRRP Review:** HRRP only
- **Commission Decision:** HHRMD or HRMO only
- **Resubmission after rejection:** HRO or HRRP only

**Supporting files:**
- `/home/latest/src/lib/route-permissions-config.ts` -- Route-level RBAC configuration
- `/home/latest/src/lib/role-utils.ts` -- CSC role definitions and institution filtering
- `/home/latest/src/app/api/promotions/route.ts` -- Promotion workflow authorization
- `/home/latest/src/app/api/confirmations/route.ts` -- Confirmation workflow authorization

---

## Test Case 25.2: Administrative Segregation

**Objective:** Verify that administrative functions are properly segregated and accessible only to Admin role.

### Test 25.2.1: Admin Routes Protected with Role Check

**Method:** Attempted to access admin lock-account and reset-password as HRMO.

```bash
# HRMO attempting lock-account
curl -s -b /tmp/cookies-fautest.txt -X POST http://localhost:9002/api/admin/lock-account \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test","reason":"test reason here"}'

# HRMO attempting reset-password
curl -s -b /tmp/cookies-fautest.txt -X POST http://localhost:9002/api/admin/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test"}'
```

**Result:** Both return:
```json
{"success":false,"error":"Insufficient permissions","errorCode":"FORBIDDEN"}
```

**PASS** -- lock-account and reset-password correctly require Admin role.

### Test 25.2.2: CRITICAL -- Admin Cleanup-Sessions Route Lacks Authentication

**Method:** Accessed admin cleanup-sessions endpoint without any authentication cookie.

```bash
curl -s -X POST http://localhost:9002/api/admin/cleanup-sessions \
  -H 'Content-Type: application/json' \
  -d '{"action":"list-sessions"}'
```

**Result:** Full session data returned without authentication:
```json
{
  "success": true,
  "totalSessions": 7,
  "sessionsByUser": {
    "skawesu": {
      "count": 3,
      "active": 3,
      "sessions": [
        {
          "id": "cmr5aui8v00dl3pxde6vn0kgu",
          "ipAddress": "::1",
          "createdAt": "2026-07-03T19:01:23.552Z",
          "expiresAt": "2026-07-04T19:01:23.551Z"
        }
      ]
    },
    "ymrajab": { "count": 1, "active": 1, "sessions": [...] }
  }
}
```

**FAIL (CRITICAL)** -- The `/api/admin/cleanup-sessions` route has NO authentication and NO role check. An unauthenticated attacker can:
1. List all active sessions for all users (information disclosure)
2. Delete all sessions (`action: "cleanup-all"`) causing denial of service
3. Delete sessions for specific users (`action: "cleanup-user"`)

**Root Cause:** The route uses `wrapHandler` but does NOT use `withAuth` or `verifyAuth`. See `src/app/api/admin/cleanup-sessions/route.ts` lines 56-143.

### Test 25.2.3: CRITICAL -- Admin HRIMS Settings Route Lacks Authentication

**Method:** Accessed admin HRIMS settings endpoint without authentication.

```bash
curl -s http://localhost:9002/api/admin/hrims-settings
```

**Result:** Sensitive configuration exposed:
```json
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

**FAIL (CRITICAL)** -- The `/api/admin/hrims-settings` route exposes HRIMS API keys and tokens without any authentication. The `_fullApiKey` and `_fullToken` fields are included in the response, providing full credentials for the HRIMS integration.

**Root Cause:** The route uses `wrapHandler` but does NOT use `withAuth` or `verifyAuth`. See `src/app/api/admin/hrims-settings/route.ts` lines 13-41.

### Test 25.2.4: Admin Trigger-Password-Check Dev-Only Protection

**Method:** Code analysis of trigger-password-check route.

From `src/app/api/admin/trigger-password-check/route.ts`:
```typescript
if (process.env.NODE_ENV !== 'development') {
  return NextResponse.json({ success: false, message: '...' }, { status: 403 });
}
```

**PASS (with note)** -- Protected by environment check in production, but lacks authentication even in development mode. The TODO comment `// TODO: Add admin authentication check` confirms this is known incomplete.

### 25.2 Assessment: FAIL (CRITICAL)

| Route | Auth Required | Role Check | Status |
|-------|--------------|------------|--------|
| `/api/admin/lock-account` | Yes | Admin only | PASS |
| `/api/admin/reset-password` | Yes | Admin only | PASS |
| `/api/admin/unlock-account` | Yes | Admin only | PASS |
| `/api/admin/cleanup-sessions` | **NO** | **NO** | **FAIL** |
| `/api/admin/hrims-settings` | **NO** | **NO** | **FAIL** |
| `/api/admin/trigger-password-check` | No (dev-only) | No | WARN |

**Supporting files:**
- `/home/latest/src/app/api/admin/cleanup-sessions/route.ts` -- Missing auth (lines 56-143)
- `/home/latest/src/app/api/admin/hrims-settings/route.ts` -- Missing auth (lines 13-41)
- `/home/latest/src/app/api/admin/lock-account/route.ts` -- Properly protected
- `/home/latest/src/app/api/admin/reset-password/route.ts` -- Properly protected

---

## Test Case 25.3: Approval Separation (Self-Approval Blocking)

**Objective:** Verify that a user cannot both submit and approve the same request.

### Test 25.3.1: Reviewer ID Override Prevents Impersonation

**Method:** Code analysis of reviewer ID handling.

From `src/app/api/promotions/route.ts` (lines 457-463):
```typescript
// The authenticated user is the reviewer -- ignore any client-supplied reviewer id.
if (updateData.reviewedById !== undefined) {
  updateData.reviewedById = auth.userId;
}
if (updateData.hrrpReviewedById !== undefined) {
  updateData.hrrpReviewedById = auth.userId;
}
```

**PASS** -- The server always overrides the reviewer ID with the authenticated user's ID, preventing a user from claiming another user performed the review.

### Test 25.3.2: Implicit Self-Approval Blocking via Role Separation

**Method:** Analysis of whether a single user can both submit and approve.

The workflow enforces separation through role-based authorization:
- **HRO** can only submit (not in approval role lists)
- **HRRP** can only approve HRRP-stage actions (not in submission role list for commission decisions)
- **HHRMD/HRMO** can only make commission decisions (not in submission role lists)

Since each user has exactly one role, and submission/approval require different roles, self-approval is implicitly blocked.

**PASS** -- Self-approval is prevented through role separation, though there is no explicit `submittedById !== reviewedById` check.

### Test 25.3.3: HRRP Auto-Approval Bypass

**Method:** Code analysis of HRRP submission behavior.

From `src/app/api/promotions/route.ts` (lines 241-251):
```typescript
const isHRRP = auth.role === 'HRRP';
const initialStatus = isHRRP
  ? 'Approved by HRRP - Awaiting Commission Review'
  : 'Pending HRRP Review';
const initialReviewStage = isHRRP ? 'hrrp_review' : 'initial';
const hrrpData = isHRRP
  ? {
      hrrpReviewedById: auth.userId,
      hrrpReviewedAt: new Date(),
    }
  : {};
```

**FINDING (MEDIUM)** -- When HRRP submits a request, it is automatically approved (status set to "Approved by HRRP - Awaiting Commission Review") with `hrrpReviewedById` set to the submitter's own ID. This means HRRP can effectively submit AND approve in a single action, bypassing the intended two-person review at the HRRP stage.

This is a design-level concern: the HRRP role combines submission and approval authority. While commission review (HHRMD/HRMO) still provides a second check, the HRRP review stage does not enforce independent verification.

### Test 25.3.4: EMPLOYEE Cannot Approve

```bash
# Attempt to approve as EMPLOYEE
curl -s -b /tmp/cookies-abdillah.txt -X PATCH http://localhost:9002/api/promotions \
  -H 'Content-Type: application/json' \
  -d '{"id":"test","status":"Approved by Commission","reviewedById":"auto","commissionLetterKey":"test.pdf"}'
```

**Result:** Session expired (EMPLOYEE session had expired during testing). However, code analysis confirms EMPLOYEE is not in any approval role lists.

**PASS** -- EMPLOYEE role cannot approve any requests.

### 25.3 Assessment: PASS (with MEDIUM finding)

Self-approval is prevented through role-based authorization. The `reviewedById` server-side override prevents impersonation. However, the HRRP auto-approval pattern means the HRRP review stage does not provide true independent verification.

**Supporting files:**
- `/home/latest/src/app/api/promotions/route.ts` -- Lines 241-251 (HRRP auto-approve), lines 457-463 (reviewer override)
- `/home/latest/src/app/api/confirmations/route.ts` -- Same pattern
- `/home/latest/src/app/api/lwop/route.ts` -- Same pattern

---

## Test Case 25.4: Independent Verification Controls

**Objective:** Verify that self-verification is prevented and independent review is enforced.

### Test 25.4.1: Audit Trail Captures Reviewer Identity

**Method:** Code analysis of audit logging for approvals.

From `src/app/api/promotions/route.ts` (lines 528-598):
```typescript
const auditReviewerId = isHrrpAction
  ? (updateData.hrrpReviewedById || userId)
  : updateData.reviewedById;

if (auditReviewerId && updateData.status) {
  const reviewer = await db.user.findUnique({
    where: { id: auditReviewerId },
    select: { username: true, role: true },
  });

  if (reviewer) {
    if (isApproval) {
      await logRequestApproval({
        requestType: 'Promotion',
        requestId: id,
        approvedById: auditReviewerId,
        approvedByUsername: reviewer.username,
        approvedByRole: reviewer.role || 'Unknown',
        // ...
      });
    }
  }
}
```

**PASS** -- All approvals and rejections are logged with the reviewer's identity (ID, username, role) and contextual information (IP address, device info, review stage).

### Test 25.4.2: No Explicit Submitter-Reviewer Identity Check

**Method:** Search for explicit checks comparing submitter and reviewer IDs.

```bash
grep -rn "submittedById.*===.*reviewedById\|submittedById.*!==.*reviewedById" /home/latest/src/
```

**Result:** No explicit submitter-reviewer comparison found in any API route.

**FINDING (LOW)** -- While role-based authorization implicitly prevents self-verification, there is no explicit server-side check that compares `submittedById` to `reviewedById`. This means if role assignments were incorrectly configured (e.g., a user assigned multiple roles), self-verification could occur. Defense-in-depth would suggest adding explicit identity comparison.

### Test 25.4.3: Complaints Endpoint Lacks Authentication

**Method:** Attempted to submit a complaint without authentication.

```bash
curl -s -X POST http://localhost:9002/api/complaints \
  -H 'Content-Type: application/json' \
  -d '{"complaintType":"general","subject":"Test complaint subject","complaintText":"This is a test complaint with enough characters","complainantPhoneNumber":"0777-123-456","nextOfKinPhoneNumber":"0777-654-321","complainantId":"fake-user-id-12345"}'
```

**Result:** Internal server error (likely due to invalid user ID), but the endpoint does not use `verifyAuth` or `withAuth`. The `complainantId` is taken from the request body without verification.

**FINDING (MEDIUM)** -- The complaints POST endpoint at `src/app/api/complaints/route.ts` does not verify authentication. While the request fails due to database constraints (invalid user ID), the endpoint accepts the `complainantId` from the client without verifying it matches the authenticated user. This could allow submitting complaints on behalf of other users if valid IDs were known.

### 25.4 Assessment: PARTIAL PASS

Audit logging is comprehensive. However, the lack of explicit submitter-reviewer identity checks and the unauthenticated complaints endpoint represent gaps in independent verification.

**Supporting files:**
- `/home/latest/src/app/api/promotions/route.ts` -- Audit logging (lines 528-598)
- `/home/latest/src/app/api/complaints/route.ts` -- Missing auth verification
- `/home/latest/src/lib/audit-logger.ts` -- Audit logging utilities

---

## Test Case 25.5: Dual Authorization for Critical Actions

**Objective:** Verify that critical actions require approval from at least two different users.

### Test 25.5.1: Multi-Stage Workflow Enforcement

**Method:** Code analysis of the complete approval workflow.

The promotion workflow requires involvement from multiple roles:

| Stage | Action | Required Role | Status Set |
|-------|--------|---------------|------------|
| 1 | Submit | HRO | "Pending HRRP Review" |
| 2 | HRRP Review | HRRP | "Approved by HRRP - Awaiting Commission Review" |
| 3 | Commission Decision | HHRMD/HRMO | "Approved by Commission" / "Rejected by Commission" |

**PASS** -- The workflow design requires at least two different users (HRO + HRRP, or HRO + HHRMD/HRMO) for a request to be fully processed.

### Test 25.5.2: Commission Letter Requirement

**Method:** Test that commission decisions require documentation.

```bash
# Attempt commission decision without letter
curl -s -b /tmp/cookies-fautest.txt -X PATCH http://localhost:9002/api/promotions \
  -H 'Content-Type: application/json' \
  -d '{"id":"nonexistent-id","status":"Approved by Commission","reviewedById":"auto"}'
```

**Result:**
```json
{"success":false,"message":"Commission letter is required for commission decisions"}
```

**PASS** -- Commission decisions require a commission letter document, adding a documentation-based verification step.

### Test 25.5.3: Admin Cannot Lock Another Admin

**Method:** Code analysis of admin lock-account route.

From `src/app/api/admin/lock-account/route.ts` (lines 43-52):
```typescript
// Prevent locking another admin (optional safety check)
if (user.role === 'Admin') {
  return NextResponse.json(
    {
      success: false,
      message: 'Cannot lock another administrator account',
    },
    { status: 403 }
  );
}
```

**PASS** -- Admin accounts cannot lock other admin accounts, preventing single-admin takeover.

### Test 25.5.4: HRRP Auto-Approval Weakens Dual Authorization

**Method:** Analysis of HRRP submission flow.

When HRRP submits a request:
1. Status is immediately set to "Approved by HRRP"
2. `hrrpReviewedById` is set to the submitting HRRP's own ID
3. The request goes directly to commission review

**FINDING (MEDIUM)** -- The HRRP auto-approval pattern means that for HRRP-initiated requests, the HRRP review stage does not involve a second person. The request effectively bypasses one of the three review stages. While commission review (HHRMD/HRMO) still provides a second check, the intended three-stage workflow is reduced to two stages for HRRP submissions.

This affects all request types with the HRRP workflow:
- Promotions (`/api/promotions`)
- Confirmations (`/api/confirmations`)
- LWOP (`/api/lwop`)
- Service Extensions (`/api/service-extension`)
- Cadre Changes (`/api/cadre-change`)
- Retirements (`/api/retirement`)
- Resignations (`/api/resignation`)
- Terminations (`/api/termination`)

### 25.5 Assessment: PARTIAL PASS

The multi-stage workflow design supports dual authorization. Commission letter requirements add documentation-based verification. However, the HRRP auto-approval pattern weakens the dual authorization requirement for HRRP-initiated requests.

**Supporting files:**
- `/home/latest/src/app/api/promotions/route.ts` -- Multi-stage workflow
- `/home/latest/src/app/api/admin/lock-account/route.ts` -- Admin-to-admin protection
- All request type routes follow the same HRRP auto-approval pattern

---

## Findings Summary

| ID | Severity | Test Case | Finding | Status |
|----|----------|-----------|---------|--------|
| 25.2-A | **CRITICAL** | 25.2.2 | `/api/admin/cleanup-sessions` has no authentication -- unauthenticated users can list/delete all sessions | OPEN |
| 25.2-B | **CRITICAL** | 25.2.3 | `/api/admin/hrims-settings` has no authentication -- exposes HRIMS API keys and tokens | OPEN |
| 25.3-A | MEDIUM | 25.3.3 | HRRP can submit and auto-approve in single action, bypassing independent HRRP review | OPEN |
| 25.4-A | MEDIUM | 25.4.3 | Complaints endpoint lacks authentication and accepts client-supplied `complainantId` | OPEN |
| 25.5-A | MEDIUM | 25.5.4 | HRRP auto-approval weakens dual authorization for all request types | OPEN |
| 25.4-B | LOW | 25.4.2 | No explicit `submittedById !== reviewedById` check (relies on implicit role separation) | OPEN |

---

## Recommendations

### Critical (Immediate)

1. **Add authentication to admin routes:** Add `withAuth({ allowedRoles: ['Admin'] })` to `/api/admin/cleanup-sessions` and `/api/admin/hrims-settings` routes. These routes currently have NO authentication.

2. **Remove sensitive data from HRIMS settings response:** The `_fullApiKey` and `_fullToken` fields should never be returned in API responses. Only masked values should be exposed.

### Medium (Short-term)

3. **Add explicit self-approval blocking:** Add server-side checks comparing `submittedById` to the authenticated user's ID before allowing approval actions. This provides defense-in-depth beyond role separation.

4. **Authenticate complaints endpoint:** Add `verifyAuth` to the complaints POST endpoint and validate that `complainantId` matches the authenticated user.

5. **Consider removing HRRP auto-approval:** If independent HRRP review is required, remove the auto-approval behavior when HRRP submits. Instead, require a separate HRRP user to review HRRP-initiated requests.

### Low (Long-term)

6. **Add explicit submitter-reviewer comparison:** Even with role separation, add `if (existingRequest.submittedById === auth.userId) { return 403 }` as defense-in-depth.

---

## Files Examined

- `/home/latest/src/lib/route-permissions-config.ts` -- Route RBAC configuration
- `/home/latest/src/lib/role-utils.ts` -- CSC role definitions
- `/home/latest/src/lib/constants.ts` -- Role constants
- `/home/latest/src/lib/api-auth.ts` -- Authentication wrapper
- `/home/latest/src/app/api/promotions/route.ts` -- Promotion workflow (670 lines)
- `/home/latest/src/app/api/promotions/[id]/route.ts` -- Promotion single-item endpoint
- `/home/latest/src/app/api/confirmations/route.ts` -- Confirmation workflow (635 lines)
- `/home/latest/src/app/api/lwop/route.ts` -- LWOP workflow
- `/home/latest/src/app/api/complaints/route.ts` -- Complaints (no auth)
- `/home/latest/src/app/api/admin/cleanup-sessions/route.ts` -- Admin sessions (no auth)
- `/home/latest/src/app/api/admin/hrims-settings/route.ts` -- Admin HRIMS config (no auth)
- `/home/latest/src/app/api/admin/lock-account/route.ts` -- Admin lock account (protected)
- `/home/latest/src/app/api/admin/reset-password/route.ts` -- Admin reset password (protected)
- `/home/latest/src/app/api/admin/trigger-password-check/route.ts` -- Admin password check (dev-only)
- `/home/latest/src/app/api/admin/unlock-account/route.ts` -- Admin unlock (protected)
- `/home/latest/src/app/api/auth/login/route.ts` -- Login flow
- `/home/latest/src/lib/route-permissions.test.ts` -- Existing RBAC unit tests

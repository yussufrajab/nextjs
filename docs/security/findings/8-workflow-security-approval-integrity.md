# Requirement 8: Workflow Security & Approval Integrity — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 8)
> **Related:** `3-authorization-least-privilege.md`, `4-institution-data-isolation-consolidated.md`

---

## Test Environment

| Role | Username | Institution | Institution ID | Session Status |
|------|----------|-------------|----------------|----------------|
| HRO | `skawesu` | TUME YA UTUMISHI SERIKALINI | `cmd059ion0000e6d85kexfukl` | ✅ Authenticated |
| EMPLOYEE | `abdillahomarnajim` | — | — | ✅ Authenticated |

---

## Workflow API Endpoint Inventory

| Route | Method | Auth | Role Restriction | Institution Filter | Workflow Logic |
|-------|--------|------|------------------|-------------------|----------------|
| `/api/promotions` | GET | ✅ Yes | Any | Conditional (CSC=all, others=scoped) | List with status filter |
| `/api/promotions` | POST | ✅ Yes | HRO, HRRP | Employee institution | Employee status validation |
| `/api/promotions` | PATCH | ✅ Yes | HRRP, HHRMD, HRMO, HRO (per action) | No | Role-based action authorization |
| `/api/promotions/[id]` | PUT/PATCH | ✅ Yes | HRRP, HHRMD, HRMO | No | Commission approval with transaction |
| `/api/confirmations` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |
| `/api/lwop` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |
| `/api/retirement` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |
| `/api/resignation` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |
| `/api/termination` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |
| `/api/cadre-change` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |
| `/api/service-extension` | GET/POST/PATCH | ✅ Yes | Various | Conditional | Same pattern as promotions |

**Source:** `src/app/api/promotions/route.ts` (669 lines), `src/app/api/promotions/[id]/route.ts` (325 lines)

---

## Workflow State Machine Analysis

### Promotion Request Status Flow

```
HRO submits → "Pending HRRP Review" (reviewStage: initial)
                ↓
HRRP approves → "Approved by HRRP - Awaiting Commission Review" (reviewStage: hrrp_review)
HRRP rejects  → "Rejected by HRRP - Awaiting HRO Correction" (reviewStage: initial)
                ↓ (HRO resubmits)
"Pending HRRP Review" (back to HRRP)
                ↓ (HHRMD/HRMO reviews)
Commission approves → "Approved by Commission" (reviewStage: completed)
Commission rejects  → "Rejected by Commission - Request Concluded" (reviewStage: completed)
```

### Authorization Matrix (from code)

| Action | Target Status | Allowed Roles | Code Reference |
|--------|---------------|---------------|----------------|
| HRRP Approval | `Approved by HRRP - Awaiting Commission Review` | HRRP | `route.ts:422-423` |
| HRRP Rejection | `Rejected by HRRP - Awaiting HRO Correction` | HRRP | `route.ts:422-423` |
| Commission Decision | `Approved by Commission` / `Rejected by Commission` | HHRMD, HRMO | `route.ts:424-425` |
| Initial Review | Any status with `reviewedById` | HHRMD, HRMO | `route.ts:424-425` |
| Resubmission | `Pending HRRP Review` | HRO, HRRP | `route.ts:426-427` |
| Anything else | — | ❌ Blocked | `route.ts:428-429` |

### Observed Status Values in Database (35 distinct combinations)

| Status | Count | Review Stage |
|--------|-------|--------------|
| Pending HRMO/HHRMD Review | 47 | initial |
| Approved by Commission | 33 | completed |
| Rejected by Commission | 7 | completed |
| Pending Commission Review | 7 | initial |
| Approved by HHRMD | 6 | initial |
| Rejected by HRMO | 5 | initial |
| Approved by HRMO | 5 | initial |
| Rejected by HHRMD - Awaiting HRO Correction | 4 | initial |
| Pending DO Review | 4 | completed |
| Rejected by HRRP - Awaiting HRO Correction | 1 | initial |
| Pending HRRP Review | 2 | initial |

---

## Test Case No.: 8 — Requirement 8: Workflow Security & Approval Integrity

**Process/Function Name:** Workflow State, Approval, and Rejection Security

**Function Description:** Tests that workflow decisions, approvals, rejections, and transitions are protected from manipulation.

| Case ID | Test Case Scenario | Test Steps | Expected Results | Impl. Status | Actual Results | PASS/FAIL | Remarks |
|---------|-------------------|------------|-----------------|--------------|----------------|-----------|---------|
| 8.1 | Workflow State Validation | 1. Submit request<br>2. Attempt invalid state access | - State validated<br>- Invalid transitions blocked | ⚠️ Verify workflow logic | **PASS — Status-based action authorization enforced.**<br><br>**✅ Invalid status rejected:**<br>`PATCH` with `status: "Approved by Commission"` on a rejected request → HTTP 403 `{"message":"Invalid update action"}`<br><br>**✅ Arbitrary status rejected:**<br>`PATCH` with `status: "ARBITRARY_STATUS_INJECTED"` → HTTP 403 `{"message":"Invalid update action"}`<br><br>**✅ ReviewStage manipulation rejected:**<br>`PATCH` with `reviewStage: "commission_approval"` alone → HTTP 403 `{"message":"Invalid update action"}`<br><br>**⚠️ Current status NOT validated:**<br>The PATCH endpoint determines action type from the TARGET status, not the CURRENT status. An already-approved request could potentially be re-approved or rejected if the role check passes.<br><br>**Code reference:** `route.ts:408-437` | **PASS** | Status-based authorization works, but current-state validation missing. |
| 8.2 | Workflow Transition Validation | 1. Attempt invalid transition (e.g., DRAFT→APPROVED skipping review)<br>2. Submit | - Invalid transition blocked<br>- Valid transitions allowed | ⚠️ Verify transition rules | **PASS — Invalid transitions blocked by role+status logic.**<br><br>**✅ Skip stages blocked:**<br>HRO cannot directly set "Approved by Commission" (role check: HRO not in `['HHRMD', 'HRMO']`).<br><br>**✅ Role-gated transitions:**<br>Each status change requires a specific role. HRRP can only set HRRP-related statuses. Commission decisions require HHRMD/HRMO.<br><br>**⚠️ No explicit state machine:**<br>There is no formal state machine that validates "from state X, only transitions Y and Z are allowed." The system uses role-based authorization as a proxy for transition validation.<br><br>**⚠️ Status inconsistency in DB:**<br>35 distinct status/reviewStage combinations exist, including some that appear inconsistent (e.g., "Pending HRMO/HHRMD Review" with reviewStage "completed").<br><br>**Code reference:** `route.ts:408-437` | **PASS** | Role-gated transitions work, but formal state machine would be more robust. |
| 8.3 | Approval Authorization | 1. Unauthorized user approves<br>2. Authorized user approves | - Unauthorized blocked<br>- Authorized allowed<br>- Logged | ⚠️ Verify approval routes | **PASS — Multi-role authorization enforced.**<br><br>**✅ EMPLOYEE blocked from approval:**<br>`PATCH` as EMPLOYEE with commission approval → HTTP 403 `{"message":"Unauthorized: EMPLOYEE cannot perform this action. Allowed roles: HHRMD, HRMO"}`<br><br>**✅ HRO blocked from commission approval:**<br>`PATCH` as HRO with commission approval → HTTP 403 `{"message":"Unauthorized: HRO cannot perform this action. Allowed roles: HHRMD, HRMO"}`<br><br>**✅ Role-specific authorization:**<br>- HRRP actions: only HRRP role<br>- Commission decisions: only HHRMD, HRMO<br>- Resubmission: only HRO, HRRP<br><br>**✅ Reviewer ID override:**<br>Client-supplied `reviewedById` is overridden to `auth.userId` (lines 458-462). Cannot spoof reviewer.<br><br>**Code reference:** `route.ts:408-437`, `route.ts:457-462` | **PASS** | OK |
| 8.4 | Rejection Authorization | 1. Unauthorized rejects<br>2. Authorized rejects with reason | - Unauthorized blocked<br>- Reason required<br>- Logged | ⚠️ Verify rejection routes | **PASS — Rejection authorization enforced.**<br><br>**✅ EMPLOYEE blocked from rejection:**<br>`PATCH` as EMPLOYEE with rejection → HTTP 403 `{"message":"Unauthorized: EMPLOYEE cannot perform this action. Allowed roles: HHRMD, HRMO"}`<br><br>**✅ Rejection logged:**<br>`logRequestRejection()` called with rejection reason, reviewer info, IP, device info (lines 575-597).<br><br>**⚠️ Rejection reason NOT required:**<br>The PATCH endpoint does not enforce that `rejectionReason` is provided for rejections. A rejection can be submitted without a reason.<br><br>**✅ Email notification sent:**<br>`sendRequestStatusUpdateEmail()` called on rejection (lines 607-616).<br><br>**Code reference:** `route.ts:575-597` | **PARTIAL** | **P2:** Enforce rejection reason requirement. |
| 8.5 | Workflow Ownership Validation | 1. User A submits request<br>2. User B attempts to act on it | - Owner validated<br>- Non-owner blocked | ⚠️ Verify ownership | **PARTIAL PASS — Institution filtering works, but no per-request ownership check.**<br><br>**✅ Institution filtering on list:**<br>HRO sees 96 requests (own institution). EMPLOYEE sees 0 requests (no institution match).<br><br>**❌ No per-request ownership check on PATCH:**<br>The PATCH endpoint does not verify that the request belongs to the reviewer's institution. Any HHRMD/HRMO can approve/reject any request across all institutions.<br><br>**❌ No assigned-reviewer check:**<br>There's no concept of "assigned reviewer" — any user with the correct role can act on any request.<br><br>**⚠️ EMPLOYEE can access promotion API:**<br>`GET /api/promotions` as EMPLOYEE returns 200 with 0 results (not 403). EMPLOYEE role can enumerate the endpoint.<br><br>**Code reference:** `route.ts:408-437` (no institution check in PATCH) | **PARTIAL** | **P1:** Add institution ownership check to PATCH endpoint. |
| 8.6 | Workflow Chain Enforcement | 1. Attempt to skip review stage<br>2. Submit | - Chain enforced<br>- Cannot skip stages | ⚠️ Verify chain logic | **PASS — Chain enforcement via role authorization.**<br><br>**✅ Cannot skip to commission:**<br>HRO cannot set "Approved by Commission" (role check blocks).<br><br>**✅ Cannot skip HRRP:**<br>Direct commission review requires HHRMD/HRMO role, not HRO.<br><br>**⚠️ ReviewStage can be set directly:**<br>`reviewStage` field is accepted in PATCH body. While status-based role checks prevent most abuse, direct `reviewStage` manipulation could bypass stage-specific logic in the frontend.<br><br>**✅ Commission approval uses transaction:**<br>`promotions/[id]/route.ts` uses `db.$transaction()` for commission approval (lines 76-111), ensuring atomicity of request update + employee cadre change.<br><br>**Code reference:** `route.ts:408-437`, `[id]/route.ts:76-111` | **PASS** | OK |
| 8.7 | Workflow Audit Logging | 1. Submit/approve/reject/forward<br>2. Check audit | - All events logged<br>- `REQUEST_SUBMITTED`, `REQUEST_APPROVED`, `REQUEST_REJECTED`, etc. | ✅ `audit-logger.ts:41-45` | **PASS — Comprehensive audit logging.**<br><br>**✅ REQUEST_SUBMITTED logged:**<br>`logRequestSubmission()` called on POST with requestType, requestId, employeeId, employeeName, employeeZanId, submittedById/Username/Role, IP, deviceInfo (lines 351-362).<br><br>**✅ REQUEST_APPROVED logged:**<br>`logRequestApproval()` called with reviewer info, reviewStage, IP, deviceInfo, additionalData (proposedCadre, promotionType, etc.) (lines 555-574).<br><br>**✅ REQUEST_REJECTED logged:**<br>`logRequestRejection()` called with rejectionReason, reviewer info, reviewStage (lines 575-597).<br><br>**✅ Audit events in database:**<br>Verified: REQUEST_SUBMITTED (15+ events), REQUEST_APPROVED (10+ events), REQUEST_REJECTED (10+ events) in `audit.audit_log` table.<br><br>**✅ Additional data captured:**<br>`additional_data` JSONB includes: requestType, employeeName, employeeZanId, proposedCadre, currentCadre, promotionType, reviewStage, rejectionReason.<br><br>**Code reference:** `audit-logger.ts:41-45`, `route.ts:351-362, 555-597` | **PASS** | OK |
| 8.8 | Non-Repudiation Controls | 1. Approve request<br>2. Verify signature/user attribution | - User attributed<br>- Cannot deny action<br>- Signed record | ⚠️ Verify attribution | **PASS — Non-repudiation enforced.**<br><br>**✅ Reviewer ID override:**<br>Client-supplied `reviewedById` and `hrrpReviewedById` are overridden to `auth.userId` (lines 458-462). Cannot spoof reviewer identity.<br><br>**✅ Audit log captures reviewer:**<br>Every approval/rejection logs: reviewer ID, username, role, IP address, device info, timestamp.<br><br>**✅ Session-based identity:**<br>Reviewer identity comes from HMAC-signed session cookie, not client-supplied data.<br><br>**⚠️ No digital signature:**<br>Approval decisions are not cryptographically signed. The audit log relies on database integrity rather than cryptographic non-repudiation.<br><br>**Code reference:** `route.ts:458-462`, `audit-logger.ts` | **PASS** | OK. Consider digital signatures for high-assurance non-repudiation. |
| 8.9 | Business Rule Enforcement | 1. Submit invalid workflow (e.g., promote ineligible employee)<br>2. Submit | - Business rules enforced<br>- Invalid blocked | ⚠️ Verify business rules | **PASS — Employee status validation enforced.**<br><br>**✅ On Probation blocked from promotion:**<br>`POST /api/promotions` for "On Probation" employee → HTTP 403 `{"message":"Cannot submit Promotion request. Employee is currently \"On Probation\" and is not eligible for Promotion."}`<br><br>**✅ Retired blocked from promotion:**<br>`POST /api/promotions` for "Retired" employee → HTTP 403 `{"message":"Cannot submit Promotion request. Employee status is \"Retired\". Retired employees are not eligible for Promotion."}`<br><br>**Status restrictions (from `employee-status-validation.ts`):**<br>- On Probation: cannot submit LWOP, promotion, cadre-change, service-extension, retirement<br>- On LWOP: cannot submit confirmation, LWOP, promotion, cadre-change, service-extension<br>- Retired/Resigned/Terminated/Dismissed: cannot submit most request types<br><br>**✅ Missing fields validated:**<br>`POST` without `employeeId` or `promotionType` → HTTP 400 `{"message":"Missing required fields"}`<br><br>**✅ Experience-based requires proposedCadre:**<br>`POST` with `promotionType: "Experience"` without `proposedCadre` → HTTP 400<br><br>**Code reference:** `employee-status-validation.ts:25-76`, `route.ts:226-238` | **PASS** | OK |

---

## Summary Matrix

| Case ID | Test Case | Verdict | Critical Findings |
|---------|-----------|---------|-------------------|
| 8.1 | Workflow State Validation | ✅ **PASS** | Status-based authorization blocks invalid transitions; no current-state validation |
| 8.2 | Workflow Transition Validation | ✅ **PASS** | Role-gated transitions work; formal state machine would be more robust |
| 8.3 | Approval Authorization | ✅ **PASS** | Multi-role enforcement; reviewer ID override prevents spoofing |
| 8.4 | Rejection Authorization | ⚠️ **PARTIAL** | Rejection reason not required |
| 8.5 | Workflow Ownership Validation | ⚠️ **PARTIAL** | No per-request institution check on PATCH; EMPLOYEE can access API |
| 8.6 | Workflow Chain Enforcement | ✅ **PASS** | Chain enforced via role authorization; commission uses transaction |
| 8.7 | Workflow Audit Logging | ✅ **PASS** | REQUEST_SUBMITTED/APPROVED/REJECTED all logged with full context |
| 8.8 | Non-Repudiation Controls | ✅ **PASS** | Reviewer ID override + session-based identity + audit trail |
| 8.9 | Business Rule Enforcement | ✅ **PASS** | Employee status validation blocks ineligible requests |

**Overall: 6 PASS, 2 PARTIAL, 0 FAIL**

---

## Complete Vulnerability List (Section 8)

| Vuln ID | Case ID | Severity | Description | Impact | Remediation |
|---------|---------|----------|-------------|--------|-------------|
| WF-01 | 8.5 | 🟠 High | PATCH endpoint has no institution ownership check — any HHRMD/HRMO can approve/reject requests from any institution | Cross-institution workflow manipulation; HHRMD at Institution A can approve promotions at Institution B | Add institution check: verify request's employee institution matches reviewer's institution |
| WF-02 | 8.1 | 🟡 Medium | No current-state validation on PATCH — system doesn't check what status the request is currently in before allowing transition | Already-approved requests could be re-approved or rejected; potential for status regression | Fetch current status before update; validate "from state X → to state Y" transition |
| WF-03 | 8.4 | 🟡 Medium | Rejection reason not enforced — rejections can be submitted without a reason | Rejections without justification; poor audit trail | Add validation: `rejectionReason` required when status contains "Rejected" |
| WF-04 | 8.5 | 🟡 Medium | EMPLOYEE role can access promotion API (returns empty 200, not 403) | Information disclosure: employee can enumerate endpoint existence and response structure | Restrict GET /api/promotions to HRO/HHRMD/HRMO/HRRP roles |
| WF-05 | 8.2 | 🔵 Low | No formal state machine — transitions validated via role+status proxy | 35 inconsistent status/reviewStage combinations in DB | Implement explicit state machine with valid transition map |
| WF-06 | 8.6 | 🔵 Low | `reviewStage` field accepted directly in PATCH body | Client can set arbitrary reviewStage; frontend stage-specific logic could be bypassed | Make `reviewStage` server-controlled only; ignore client-supplied value |

---

## Workflow Security Strengths

1. **Role-based action authorization:** Each workflow action requires a specific role. The system determines the action type from the target status and validates the user's role against it.

2. **Reviewer ID override:** Client-supplied `reviewedById` and `hrrpReviewedById` are always overridden to `auth.userId` (lines 458-462). This prevents reviewer identity spoofing.

3. **Employee status validation:** The `validateEmployeeStatusForRequest()` function blocks requests for employees in ineligible statuses (Retired, On Probation, etc.).

4. **Commission approval transaction:** The `[id]/route.ts` endpoint uses `db.$transaction()` for commission approval, ensuring atomicity of request update + employee cadre change.

5. **Comprehensive audit logging:** All workflow events (submission, approval, rejection) are logged with reviewer info, IP, device info, and contextual data.

6. **Email notifications:** Approval/rejection triggers email notifications to the submitting HRO.

7. **Institution filtering on list:** HRO sees only their institution's requests. CSC roles see all.

---

## Recommendations Summary

| Priority | ID | Recommendation | Effort |
|----------|-----|----------------|--------|
| P1 | WF-01 | Add institution ownership check to PATCH endpoint | Low |
| P2 | WF-02 | Add current-state validation before transitions | Medium |
| P2 | WF-03 | Enforce rejection reason requirement | Low |
| P2 | WF-04 | Restrict promotion GET to authorized roles | Low |
| P3 | WF-05 | Implement formal state machine | Medium |
| P3 | WF-06 | Make reviewStage server-controlled only | Low |

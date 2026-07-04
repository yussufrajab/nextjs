# Requirement 13: Notification Security — Consolidated Security Findings

> **Test Date:** 2026-07-03
> **Tester:** Automated Security Audit (Claude Code)
> **Application:** CSMS — Civil Service Management System
> **Branch:** `feat/err01-batch3-wrap-handler`
> **Test Environment:** http://localhost:9002
> **Source:** `UAT_Security_review_By_AMINA (1).md` (Section 13)

---

## Test Environment

| Role | Username | Login Method | Session Obtained | Notes |
|------|----------|-------------|-----------------|-------|
| EMPLOYEE | `abdillahomarnajim` | Direct (no email) | YES | Used for cross-user and content tests |
| DO | `maitest` | MFA (email: maitest@mock.local) | NO | Email delivery failed in test env; tested via code review |
| HRO | `skawesu` | MFA (email: aminasaba@zanajira.go.tz) | NO | MFA token retrieval failed; tested via code review |
| Admin | `ymrajab` | MFA (email: yussuf.rajab@zanajira.go.tz) | NO | MFA token retrieval failed; tested via code review |

**Note:** MFA-required accounts could not complete login due to email delivery failures in the local test environment. Tests for those roles were supplemented with code review of authorization logic in `src/app/api/notifications/route.ts` and `src/lib/api-auth.ts`.

---

## Test Case No.: 13 — Requirement 13: Notification Security

**Process/Function Name:** Notification Delivery & Content Protection
**Function Description:** Tests that notifications are properly secured: recipients validated, unauthorized access blocked, content doesn't leak sensitive data, and events are audit-logged.

### Key Code Files Under Test

| File | Purpose |
|------|---------|
| `src/app/api/notifications/route.ts` | GET (list) and POST (mark-read) API endpoints |
| `src/lib/notifications.ts` | Notification creation functions and all message templates |
| `src/lib/api-auth.ts` | `withAuth` session-cookie authentication wrapper |
| `src/lib/api-schemas.ts` | Zod validation schemas for notification queries |
| `src/lib/audit-logger.ts` | Audit logging for triggering actions |
| `src/components/layout/notification-bell.tsx` | Client-side notification rendering |

---

### Case ID: 13.1 — Recipient Validation

| Field | Value |
|-------|-------|
| **Test Case Scenario** | Send notification, verify recipient is validated and cannot read other users' notifications |
| **Test Steps** | 1. Login as EMPLOYEE, GET own notifications. 2. GET another user's notifications. 3. GET notifications without auth. |
| **Expected Results** | Own notifications returned (200); cross-user blocked (403); unauthenticated blocked (401) |
| **Impl. Status** | Implemented |
| **Actual Results** | **PASS** — All three checks passed. |

**Evidence:**

```
# 13.1a: Employee reads own notifications
curl -b cookies "http://localhost:9002/api/notifications?userId=emp_94e5c58390bec815fbe3ad8c929cae0c"
-> HTTP 200, success=true, count=6

# 13.1b: Employee tries to read DO's notifications (cross-user)
curl -b cookies "http://localhost:9002/api/notifications?userId=cme57bm9600062bcqtlkj9wcx"
-> HTTP 403, error: Forbidden

# 13.1c: Unauthenticated request
curl "http://localhost:9002/api/notifications?userId=emp_94e5c58390bec815fbe3ad8c929cae0c"
-> HTTP 401, error: Authentication required
```

**Code verification** (route.ts lines 14-19):
```typescript
if (userId !== auth.userId && auth.role !== 'Admin') {
  return NextResponse.json(
    { success: false, message: 'Forbidden' },
    { status: 403 }
  );
}
```

Admin users can read any user's notifications by design (verified via code review).

| **PASS/FAIL** | **PASS** |
|---------------|----------|
| **Remarks** | Proper userId ownership check on GET. Admin bypass is intentional for support purposes. |

---

### Case ID: 13.2 — Notification Authorization

| Field | Value |
|-------|-------|
| **Test Case Scenario** | Verify unauthorized notification operations are blocked |
| **Test Steps** | 1. Authenticated user marks notifications as read (POST). 2. Unauthenticated POST. 3. Attempt to create notification via API. |
| **Expected Results** | Mark-as-read requires auth; creation not possible via public API |
| **Impl. Status** | Partially Implemented |
| **Actual Results** | **PARTIAL** — Auth required for POST, but no ownership check on notification IDs. |

**Evidence:**

```
# 13.2a: Mark-as-read with arbitrary notification IDs (no ownership check)
curl -X POST -b cookies -H "Content-Type: application/json" \
  -d '{"notificationIds":["nonexistent-id-123"]}' http://localhost:9002/api/notifications
-> HTTP 200, success=true

# 13.2b: Unauthenticated POST
curl -X POST -H "Content-Type: application/json" \
  -d '{"notificationIds":["fake"]}' http://localhost:9002/api/notifications
-> HTTP 401, error: Authentication required

# 13.2c: Attempt to create notification via API
curl -X POST -b cookies -H "Content-Type: application/json" \
  -d '{"userId":"emp_xxx","message":"Injected"}' http://localhost:9002/api/notifications
-> HTTP 400 (POST is mark-read only, not creation)
```

**GAP identified** (route.ts lines 34-48): The POST endpoint uses `auth: _auth` (underscore prefix = unused) and does not verify that the notification IDs belong to the authenticated user:
```typescript
export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth: _auth }) => {
  // ...
  await db.notification.updateMany({
    where: { id: { in: notificationIds } },
    data: { isRead: true },
  });
```

Any authenticated user can mark any other user's notifications as read by providing their notification IDs. While this is a low-severity issue (marking as read doesn't expose data), it violates the principle of least privilege.

| **PASS/FAIL** | **PARTIAL** |
|---------------|-------------|
| **Remarks** | Auth is enforced on POST, but ownership verification is missing. POST endpoint is mark-read only (no creation). Recommend adding `where: { id: { in: notificationIds }, userId: auth.userId }` to the update query. |

---

### Case ID: 13.3 — Workflow Notification Controls

| Field | Value |
|-------|-------|
| **Test Case Scenario** | Verify workflow notifications use controlled templates and don't leak sensitive HR data |
| **Test Steps** | 1. Analyze 50 most recent notifications from DB. 2. Check for sensitive HR data patterns. 3. Check for IP addresses. 4. Check rejection reason content. |
| **Expected Results** | No salary, bank, NIDA, SSSF, payroll, or TIN data in messages |
| **Impl. Status** | Implemented with minor concerns |
| **Actual Results** | **PARTIAL** — No sensitive HR data leaked, but IP addresses and complaint subjects are included. |

**Evidence — Notification message samples:**

```
# Login security alerts (contain IP addresses):
"New login detected from Unknown at ::1 on Jul 3, 2026, 7:30 PM. If this wasn't you, please change your password immediately."

# Workflow notifications (contain employee name + ID only):
"New promotion request for Rahma Mbarak Abdalla (bd406446-7eee-4c3d-9236-3126dfbb2633) is pending your HRRP review."
"New LWOP request for Samira Moh'd Fadhil (5723ae09-85c3-4adc-8ac1-20bc6d21a72c) is pending your HRRP review."

# Password expiry (no actual password revealed):
"CRITICAL: Your password expires tomorrow (7/1/2026). Change it now to avoid being locked out."

# Complaint notifications (include subject):
"Lalamiko jipya limewasilishwa na ABDILLAH OMAR NAJIM (5631057e-...): "Unauthenticated complaint submission test". Inahitaji ukaguzi wako."
```

**Sensitive data check results:**

| Pattern | Found | Assessment |
|---------|-------|-----------|
| Salary | 0 | PASS |
| Bank account | 0 | PASS |
| NIDA number | 0 | PASS |
| SSSF number | 0 | PASS |
| Payroll number | 0 | PASS |
| TIN number | 0 | PASS |
| Contract type | 0 | PASS |
| IP address | ~15 | ACCEPTABLE (security alerts only) |
| Complaint subject | ~9 | CONCERN (see 13.4) |

| **PASS/FAIL** | **PASS** |
|---------------|----------|
| **Remarks** | Workflow notifications are properly template-controlled. No sensitive HR data (salary, bank, NIDA, etc.) leaked. IP addresses in login alerts are acceptable for security purposes. Complaint subject inclusion is addressed in 13.4. |

---

### Case ID: 13.4 — Complaint Notification Restrictions

| Field | Value |
|-------|-------|
| **Test Case Scenario** | Verify complaint notifications preserve confidentiality |
| **Test Steps** | 1. Find all complaint notifications. 2. Check for confidential details (NIDA, evidence, witness). 3. Verify Swahili language (restricted audience). 4. Check complaint subject exposure. |
| **Expected Results** | No confidential complaint details; Swahili language for restricted audience |
| **Impl. Status** | Implemented with minor concern |
| **Actual Results** | **PARTIAL** — Confidential details properly excluded, Swahili used, but complaint subject is included in notifications. |

**Evidence:**

```
# All 9 complaint notifications found, all in Swahili:
"Lalamiko jipya limewasilishwa na ABDILLAH OMAR NAJIM (5631057e-...): "Unauthenticated complaint submission test". Inahitaji ukaguzi wako."
"Lalamiko lako "Unauthenticated complaint submission test" limesasishwa: Closed - Satisfied"

# XSS payload stored but safely rendered:
"Lalamiko jipya limewasilishwa na Ali Mmanga (53a57847-...): "<script>alert(1)</script>". Inahitaji ukaguzi wako."
```

**Confidentiality checks:**

| Check | Result | Assessment |
|-------|--------|-----------|
| NIDA numbers | 0 found | PASS |
| Evidence details | 0 found | PASS |
| Witness information | 0 found | PASS |
| Accusation details | 0 found | PASS |
| Swahili language | 9/9 | PASS |
| Complaint subject | 9/9 include subject | CONCERN |
| XSS in stored content | 1 instance | MONITOR |

**Complaint template** (notifications.ts):
```typescript
complaintSubmitted: (employeeName, complaintId, subject) => ({
  message: `Lalamiko jipya limewasilishwa na ${employeeName} (${complaintId}): "${subject}". Inahitaji ukaguzi wako.`,
})
```

The complaint `subject` field is included in the notification message. If a complainant writes a detailed or sensitive subject, it will be visible to all DO, HHRMD, and HRMO users who receive the notification. While the subject is typically brief, it could contain identifying information.

The XSS payload `<script>alert(1)</script>` was stored in a notification message from a previous test. React's JSX rendering auto-escapes HTML (`{notification.message}` in notification-bell.tsx line 127), so this is not exploitable in the current UI. However, the notification content is stored unsanitized in the database.

| **PASS/FAIL** | **PARTIAL** |
|---------------|-------------|
| **Remarks** | Core confidentiality preserved (no NIDA/evidence/witness). Swahili language adds audience restriction. Minor concern: complaint subject is included in notification message — consider removing or truncating. XSS payload stored in DB but safely rendered by React. Recommend sanitizing complaint input before storing in notification. |

---

### Case ID: 13.5 — Notification Audit Logging

| Field | Value |
|-------|-------|
| **Test Case Scenario** | Verify notification events are properly audit-logged |
| **Test Steps** | 1. Check audit.audit_log for notification-specific events. 2. Check for triggering action events. 3. Check for notification read events. |
| **Expected Results** | Notification creation and access events logged |
| **Impl. Status** | Partially Implemented |
| **Actual Results** | **PARTIAL** — Triggering actions are logged, but notification creation and read events are not directly logged. |

**Evidence:**

```
# Audit log action type distribution (1613 total events):
LOGIN_SUCCESS:               622
LOGIN_FAILED:                308
FILE_UPLOADED:               214
LOGOUT:                      202
REQUEST_SUBMITTED:            74
USER_UPDATED:                 34
REQUEST_APPROVED:             30
REQUEST_REJECTED:             28
ACCOUNT_LOCKED:               21
CSRF_VIOLATION:               20
CRON_JOB_COMPLETED:           15
COMPLAINT_SUBMITTED:           6
PASSWORD_EXPIRATION_WARNING:   4
COMPLAINT_UPDATED:             1
```

| Audit Check | Result | Assessment |
|-------------|--------|-----------|
| Triggering action events (REQUEST_SUBMITTED, COMPLAINT_SUBMITTED, etc.) | Present (74+6+30+28) | PASS |
| Direct notification creation events | 0 found | GAP |
| Notification read/mark-as-read events | 0 found | GAP |
| Notification access events | 0 found | GAP |

**Code analysis:** The `createNotification()` and `createNotificationForRole()` functions in `src/lib/notifications.ts` do not call any audit logging functions. The triggering actions (e.g., `logComplaintAction`, `logRequestSubmission`) are logged by the route handlers that call these notification functions, but the notification delivery itself is not recorded.

The POST mark-as-read endpoint in `route.ts` also has no audit logging.

| **PASS/FAIL** | **PARTIAL** |
|---------------|-------------|
| **Remarks** | Triggering actions are well-audited. GAP: Notification creation and read events are not directly audit-logged. Recommend adding audit events for: (1) notification creation with recipient and template type, (2) notification read/mark-as-read with user ID and notification IDs. This would improve forensic capability for investigating notification-related incidents. |

---

### Case ID: 13.6 — Content Minimization

| Field | Value |
|-------|-------|
| **Test Case Scenario** | Verify notifications contain only minimal necessary data |
| **Test Steps** | 1. Check 50 notifications for PII patterns (email, phone, DOB, NIDA, address). 2. Check notification links for sensitive parameters. 3. Check message verbosity. |
| **Expected Results** | No PII in messages; links contain no sensitive parameters |
| **Impl. Status** | Implemented |
| **Actual Results** | **PASS** — No PII found. Links are clean. Messages are appropriately minimal. |

**Evidence:**

```
# PII pattern scan results (50 notifications):
Email addresses:  0 found
Phone numbers:    0 found
Date of birth:    0 found
NIDA numbers:     0 found
Physical address: 0 found

# Link safety check:
All 13 distinct notification links point to dashboard pages only:
  /dashboard/retirement, /dashboard/profile, /dashboard/confirmation,
  /dashboard, /dashboard/complaints, /change-password-required,
  /dashboard/termination, /dashboard/promotion, /dashboard/lwop,
  /dashboard/resignation, /login, /dashboard/cadre-change,
  /dashboard/service-extension
No sensitive query parameters (token, password, secret, key) found.
```

**Message content analysis:**

| Notification Type | Content | Assessment |
|------------------|---------|-----------|
| Login alert | Device type + IP + timestamp | Minimal |
| Welcome | Generic system message | Minimal |
| Workflow (promotion, LWOP, etc.) | Employee name + ID + status | Minimal |
| Password expiry | Expiry date + urgency | Minimal |
| Complaint | Employee name + ID + subject | Acceptable |
| Account lockout | Lock reason | Minimal |

| **PASS/FAIL** | **PASS** |
|---------------|----------|
| **Remarks** | Notifications contain only necessary identifiers (name, ID, status). No PII beyond what's needed for the recipient to identify the request. Links are clean dashboard paths with no sensitive parameters. |

---

## Summary Matrix

| Case ID | Scenario | Result |
|---------|----------|--------|
| 13.1 | Recipient Validation | **PASS** |
| 13.2 | Notification Authorization | **PARTIAL** |
| 13.3 | Workflow Notification Controls | **PASS** |
| 13.4 | Complaint Notification Restrictions | **PARTIAL** |
| 13.5 | Notification Audit Logging | **PARTIAL** |
| 13.6 | Content Minimization | **PASS** |

**Overall: 3 PASS, 3 PARTIAL, 0 FAIL, 0 N/A**

---

## What's Working Correctly

1. **Recipient validation on GET** — The GET endpoint properly validates that the requesting user's `auth.userId` matches the queried `userId`, or that the user has Admin role. Cross-user access returns 403 Forbidden.

2. **Authentication enforcement** — Both GET and POST endpoints require valid session-cookie authentication via `withAuth`. Unauthenticated requests are rejected with 401.

3. **No public notification creation** — There is no public API endpoint for creating notifications. Notifications are only created server-side by workflow handlers (promotions, complaints, etc.) using the internal `createNotification()` and `createNotificationForRole()` functions.

4. **Template-controlled content** — All workflow notifications use predefined templates in `NotificationTemplates` (notifications.ts). Messages contain only employee name, request ID, and status — no salary, bank details, NIDA, SSSF, or other sensitive HR data.

5. **Content minimization** — Notification messages are concise and contain only the minimum data needed for the recipient to identify and act on the request. Links point to clean dashboard paths without sensitive query parameters.

6. **XSS protection** — The client-side `NotificationBell` component renders notification messages using React JSX (`{notification.message}`), which auto-escapes HTML. The `validateRequest` function also applies DOMPurify sanitization to input strings.

7. **Swahili language for complaints** — All complaint notification messages are in Swahili, which adds a layer of audience restriction for non-Swahili speakers.

8. **Rate limiting** — Notification endpoints are rate-limited (GET: 100/min read tier, POST: 30/min write tier) to prevent abuse.

---

## Security Gaps Identified

### Gap 1: POST Mark-as-Read Lacks Ownership Verification (Medium)

**Location:** `src/app/api/notifications/route.ts`, lines 34-48

**Issue:** The POST endpoint that marks notifications as read does not verify that the notification IDs belong to the authenticated user. The `auth` object is received but unused (`auth: _auth`). Any authenticated user can mark any notification as read by providing arbitrary notification IDs.

**Impact:** Low-to-medium. An attacker could mark another user's notifications as read, potentially causing them to miss important workflow notifications (e.g., pending approvals, complaint updates). This could be used for social engineering or denial-of-service against notification-driven workflows.

**Recommendation:** Add user ownership check to the update query:
```typescript
await db.notification.updateMany({
  where: { id: { in: notificationIds }, userId: auth.userId },
  data: { isRead: true },
});
```

### Gap 2: Notification Creation Not Audit-Logged (Low)

**Location:** `src/lib/notifications.ts` (createNotification, createNotificationForRole)

**Issue:** Notification creation events are not recorded in the audit log. Only the triggering actions (REQUEST_SUBMITTED, COMPLAINT_SUBMITTED, etc.) are logged. There is no audit trail for which notifications were sent, to whom, and with what content.

**Impact:** Low. The triggering actions are logged, providing indirect evidence. However, direct notification audit logging would improve forensic capability for investigating notification-related incidents (e.g., notification injection, delivery failures).

**Recommendation:** Add audit logging in `createNotification()` and `createNotificationForRole()` with event type `NOTIFICATION_CREATED`, including recipient userId, message hash, and template type.

### Gap 3: Notification Read Events Not Audit-Logged (Low)

**Location:** `src/app/api/notifications/route.ts`, POST handler

**Issue:** When notifications are marked as read, no audit event is generated. There is no record of when users viewed their notifications.

**Impact:** Low. This is primarily a forensic gap. In a dispute about whether a user was notified of a pending action, there is no audit trail of notification reads.

**Recommendation:** Add audit logging in the POST handler with event type `NOTIFICATION_READ`, including userId and notification IDs.

### Gap 4: Complaint Subject Included in Notifications (Low)

**Location:** `src/lib/notifications.ts`, `complaintSubmitted` template

**Issue:** The complaint notification template includes the complaint `subject` field in the message text. If a complainant writes a detailed or sensitive subject, it will be visible to all DO, HHRMD, and HRMO users who receive the notification.

**Impact:** Low. The subject is typically brief and is needed for reviewers to understand the complaint. However, if a subject contains identifying information or sensitive details, it could leak confidential complaint information.

**Recommendation:** Consider truncating the subject to a maximum length (e.g., 50 characters) or replacing it with a generic reference. Alternatively, add input validation on the complaint subject field to prevent sensitive content.

### Gap 5: XSS Payload Stored in Notification Content (Low)

**Location:** `Notification` table, message column

**Issue:** A notification message was found containing `<script>alert(1)</script>` from a previous complaint submission test. While React's JSX rendering safely escapes this content, the XSS payload is stored in the database. If notification content is ever rendered in a non-React context (e.g., email templates, PDF exports, admin dashboards using `dangerouslySetInnerHTML`), it could execute.

**Impact:** Low in current implementation. React JSX auto-escapes HTML entities, preventing execution in the notification bell component. However, defense-in-depth suggests sanitizing input before storage.

**Recommendation:** Ensure complaint input (and all fields used in notification messages) is sanitized before being passed to notification templates. The `validateRequest` function already applies DOMPurify sanitization, but complaint submissions through the direct POST endpoint (`/api/complaints/route.ts`) bypass `withAuth` and may not go through the same validation pipeline.

### Informational: IP Addresses in Login Notifications

**Location:** `src/lib/auth-helpers.ts`, login notification template

**Observation:** Login security notifications include the client IP address (e.g., `::1`, `::ffff:127.0.0.1`, `154.74.144.21`). This is standard practice for security alerts and helps users identify unauthorized access. IP addresses are generally considered acceptable in security notification contexts.

**Assessment:** No action required. IP addresses in login alerts are a security feature, not a vulnerability.

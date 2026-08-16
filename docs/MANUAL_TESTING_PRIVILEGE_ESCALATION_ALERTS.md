# Manual Testing Guide — Privilege Escalation Alerts

This document explains how to manually verify the four fixes that make the
CSMS active security monitoring functional end-to-end. Each section covers one
fix, what it does, the prerequisites, the exact steps to trigger it, and the
observable result that confirms it works.

## Table of contents

1. [Fix 1 — Self-role-change attempt is logged as CRITICAL](#fix-1--self-role-change-attempt-is-logged-as-critical)
2. [Fix 2 — RBAC-denied role-management probes elevated to CRITICAL](#fix-2--rbac-denied-role-management-probes-elevated-to-critical)
3. [Fix 3 — POTENTIAL_BREACH added to audit dashboard dropdown](#fix-3--potential_breach-added-to-audit-dashboard-dropdown)
4. [Fix 4 — Alert pipeline activated in production](#fix-4--alert-pipeline-activated-in-production)
5. [Automated test verification (fast path)](#automated-test-verification-fast-path)

---

## Conventions used in this guide

| Placeholder | Meaning |
|---|---|
| `$BASE` | The CSMS base URL, e.g. `http://localhost:9002` (dev) or `https://csms.zanajira.go.tz` (prod) |
| `$ADMIN_USER` | A username with the `Admin` role |
| `$ADMIN_PASS` | That admin's password |
| `$HRO_USER` | A username with the `HRO` role (low privilege) |
| `$HRO_PASS` | That HRO user's password |
| `$ADMIN_ID` | The database `User.id` of the admin account (UUID) |
| `$HRO_ID` | The database `User.id` of the HRO account (UUID) |

All `curl` examples use a cookie jar (`-c` / `-b`) to persist the session and
CSRF cookies across requests. Replace the placeholders with real values from
your environment. UAT credentials are in `docs/UAT-TESTING-CREDENTIALS.md`.

### Two test accounts you need

You need **two** logged-in accounts to test self-escalation (an admin cannot
target themselves — that is the attack we are testing the block for, so we
need a second admin to act on, or the same admin targeting their own ID):

- **Admin A** — a user with `role = "Admin"`. Used to attempt the self-role-change.
- **Admin B** — a second admin (or any target user). Not strictly required for
  Fix 1, but needed if you also want to confirm a *legitimate* role change still
  works after the fix (regression check).
- **HRO user** — a low-privilege account used to test Fix 2 (RBAC denial).

> **Admin accounts with MFA enabled will require an OTP.** If your admin has
> MFA, the login response returns `403 MFA_REQUIRED` and you must complete the
> MFA flow via `/api/auth/mfa/verify` before the session cookie is issued. To
> keep the curl examples short, use an admin **without** MFA for these tests,
> or complete MFA in the browser first and copy the `session` cookie.

---

## Fix 1 — Self-role-change attempt is logged as CRITICAL

**File:** `src/app/api/users/[id]/route.ts:68-99`

**What it does:** When an admin sends `PUT /api/users/<their-own-id>` with a
`role` field in the body, the handler blocks the change (403) AND emits a
`CRITICAL POTENTIAL_BREACH` audit event with `blockReason:
"SELF_ROLE_CHANGE_BLOCKED"` and `additionalData.selfRoleChange: true`. Before
this fix the 403 was returned silently — no audit row, no alert.

### Prerequisites

- CSMS is running (`pnpm dev` or the production server).
- An admin account you can log into.
- That admin's `User.id` (UUID). You can find it in the database:
  ```sql
  SELECT id, username, role FROM "User" WHERE role = 'Admin' LIMIT 5;
  ```
- A CSRF token (the double-submit cookie pattern). The `csrf-token` cookie is
  set automatically on login. You read its value and send it back as the
  `x-csrf-token` header.

### Steps

#### 1. Log in as the admin and save cookies

```bash
# Mint a CSRF token first (GET sets the csrf-token cookie).
curl -s -c /tmp/admin_cookies.txt "$BASE/api/auth/csrf-token"

# Log in (the login endpoint also requires the CSRF header).
CSRF=$(grep -oP 'csrf-token\s+\K\S+' /tmp/admin_cookies.txt)
curl -s -c /tmp/admin_cookies.txt -b /tmp/admin_cookies.txt \
  -X POST "$BASE/api/auth/login" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" \
  | jq .
```

If the response includes `"session"` in the Set-Cookie header or a `user`
object, login succeeded. If you see `MFA_REQUIRED`, complete the MFA flow
first (see `src/app/api/auth/mfa/verify/route.ts`) or use a non-MFA admin.

> **Step-up re-auth note:** The PUT role-change endpoint calls
> `requireReauth(req, 'users.role-change', auth)` at line 63-66. If your
> admin does not have a fresh `reauth` cookie, the PUT will return
> `401 REAUTH_REQUIRED` **before** reaching the self-role-change block. To
> get a reauth cookie:
> ```bash
> curl -s -c /tmp/admin_cookies.txt -b /tmp/admin_cookies.txt \
>   -X POST "$BASE/api/auth/reauth" \
>   -H "content-type: application/json" \
>   -H "x-csrf-token: $CSRF" \
>   -d '{"scope":"users.role-change","password":"'"$ADMIN_PASS"'"}' \
>   | jq .
> ```
> This sets a 5-minute `reauth` cookie. Now retry the PUT below.

#### 2. Attempt to change your own role

```bash
CSRF=$(grep -oP 'csrf-token\s+\K\S+' /tmp/admin_cookies.txt)
curl -s -b /tmp/admin_cookies.txt \
  -X PUT "$BASE/api/users/$ADMIN_ID" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"role":"Admin"}' \
  -w "\nHTTP_STATUS:%{http_code}\n"
```

#### 3. Expected result

| Observable | Expected value |
|---|---|
| HTTP status | `403` |
| Response body | `Cannot change your own role. Ask another admin.` |
| Database mutation | **None** — `db.user.update` is never called. |
| Audit log row | One `POTENTIAL_BREACH` row at `CRITICAL` severity (see verification below). |
| Email alert | One email sent to `SECURITY_ALERT_EMAIL_TO` (see Fix 4). |

#### 4. Verify the audit row was written

```bash
# The audit API is Admin/CSCS-gated. Use the admin session cookie.
curl -s -b /tmp/admin_cookies.txt \
  "$BASE/api/audit/logs?eventType=POTENTIAL_BREACH&limit=5" \
  | jq '.data.logs[] | {
    severity,
    eventType,
    wasBlocked,
    blockReason,
    additionalData: .additionalData
  }'
```

You should see a row matching:

```json
{
  "severity": "CRITICAL",
  "eventType": "POTENTIAL_BREACH",
  "wasBlocked": true,
  "blockReason": "SELF_ROLE_CHANGE_BLOCKED",
  "additionalData": {
    "targetUserId": "<your admin id>",
    "previousRole": "Admin",
    "attemptedNewRole": "Admin",
    "privilegeEscalation": true,
    "selfRoleChange": true
  }
}
```

You can also verify directly in PostgreSQL:

```sql
SELECT severity, action, was_blocked, block_reason, additional_data
FROM   audit.audit_log
WHERE  action = 'POTENTIAL_BREACH'
  AND  block_reason = 'SELF_ROLE_CHANGE_BLOCKED'
ORDER  BY created_at DESC
LIMIT  5;
```

`block_reason` must be `'SELF_ROLE_CHANGE_BLOCKED'` and
`additional_data->>'selfRoleChange'` must be `'true'`.

### Regression check (optional)

Confirm a **legitimate** role change on a *different* user still works (no
false positive on the block):

```bash
curl -s -b /tmp/admin_cookies.txt \
  -X PUT "$BASE/api/users/$HRO_ID" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"role":"HRMO"}' \
  -w "\nHTTP_STATUS:%{http_code}\n"
```

This should return `200` (not 403) and produce a `USER_UPDATED` audit row, not
a `POTENTIAL_BREACH` (unless HRO→HRMO is part of an escalation burst — see the
role-privilege module for burst rules).

---

## Fix 2 — RBAC-denied role-management probes elevated to CRITICAL

**File:** `src/lib/audit-logger.ts:282-328`

**What it does:** The `withAuth({ allowedRoles: ['Admin'] })` middleware blocks
non-admin users from calling `PUT /api/users/:id` and other role-management
endpoints. Before this fix, the resulting `FORBIDDEN_ROUTE` audit event was
logged at `ERROR` severity, which sits **below** the default `CRITICAL` alert
threshold — so the event was recorded in the audit trail but **no email/webhook
alert was sent**.

This fix adds a `CRITICAL_RBAC_ROUTES` list and a `rbacRouteSeverity()`
function. When the denied route is a user/account-management path
(`/api/users`, `/api/users/bulk`, `/api/admin/unlock-account`,
`/api/admin/lock-account`, `/api/admin/reset-password`), the `FORBIDDEN_ROUTE`
event is logged at `CRITICAL` instead of `ERROR`, so it clears the alert
threshold and pages the SOC. Routine route denials (e.g. an HRO hitting an
employee-only route) stay at `ERROR`.

### Prerequisites

- A low-privilege account (e.g. `HRO`).
- That user's `User.id`.

### Steps

#### 1. Log in as the HRO user

```bash
curl -s -c /tmp/hro_cookies.txt "$BASE/api/auth/csrf-token"
CSRF=$(grep -oP 'csrf-token\s+\K\S+' /tmp/hro_cookies.txt)
curl -s -c /tmp/hro_cookies.txt -b /tmp/hro_cookies.txt \
  -X POST "$BASE/api/auth/login" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d "{\"username\":\"$HRO_USER\",\"password\":\"$HRO_PASS\"}" \
  | jq .
```

#### 2. Attempt to call the admin-only user update endpoint

The HRO user tries to change another user's role — an operation reserved for
Admin:

```bash
CSRF=$(grep -oP 'csrf-token\s+\K\S+' /tmp/hro_cookies.txt)
curl -s -b /tmp/hro_cookies.txt \
  -X PUT "$BASE/api/users/$ADMIN_ID" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{"role":"Admin"}' \
  -w "\nHTTP_STATUS:%{http_code}\n"
```

> You do **not** need a `reauth` cookie here. The RBAC check in `withAuth`
> runs **before** the handler (and therefore before `requireReauth`), so the
> request is denied at the role gate, not at re-auth.

#### 3. Expected result

| Observable | Expected value |
|---|---|
| HTTP status | `403` |
| Response | The `forbidden()` response (empty body or a short JSON error). |
| Audit log row | One `FORBIDDEN_ROUTE` row at **`CRITICAL`** severity. |
| `additionalData` | `requiredRoles: ["Admin"]`, `actualRole: "HRO"`. |
| Email alert | One email sent to `SECURITY_ALERT_EMAIL_TO` (see Fix 4). |

#### 4. Verify the severity is CRITICAL (not ERROR)

```bash
# Use the admin session to query the audit API.
curl -s -b /tmp/admin_cookies.txt \
  "$BASE/api/audit/logs?eventType=FORBIDDEN_ROUTE&limit=5" \
  | jq '.data.logs[] | select(.attemptedRoute | startswith("/api/users")) | {
    severity,
    eventType,
    wasBlocked,
    attemptedRoute,
    additionalData
  }'
```

You should see:

```json
{
  "severity": "CRITICAL",
  "eventType": "FORBIDDEN_ROUTE",
  "wasBlocked": true,
  "attemptedRoute": "/api/users/<admin id>",
  "additionalData": {
    "requiredRoles": ["Admin"],
    "actualRole": "HRO"
  }
}
```

Direct SQL check:

```sql
SELECT severity, action, was_blocked,
       (additional_data->>'requiredRoles') AS required,
       (additional_data->>'actualRole')    AS actual_role
FROM   audit.audit_log
WHERE  action = 'FORBIDDEN_ROUTE'
  AND  request_route LIKE '/api/users%'
ORDER  BY created_at DESC
LIMIT  5;
```

`severity` must be `'CRITICAL'` for the `/api/users*` route.

### Contrast check — routine denial stays at ERROR

To confirm the fix is narrow and does not over-alert, trigger a denial on a
**non-role-management** route. For example, have the HRO user call an
admin-only endpoint that is **not** in the `CRITICAL_RBAC_ROUTES` list (e.g.
`/api/admin/trigger-password-check`):

```bash
curl -s -b /tmp/hro_cookies.txt \
  -X POST "$BASE/api/admin/trigger-password-check" \
  -H "content-type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d '{}' \
  -w "\nHTTP_STATUS:%{http_code}\n"
```

Then verify the resulting `FORBIDDEN_ROUTE` row is at `ERROR` severity, not
`CRITICAL`:

```bash
curl -s -b /tmp/admin_cookies.txt \
  "$BASE/api/audit/logs?eventType=FORBIDDEN_ROUTE&limit=10" \
  | jq '.data.logs[] | select(.attemptedRoute == "/api/admin/trigger-password-check") | .severity'
```

Expected: `"ERROR"` (not `"CRITICAL"`). This confirms the elevation is scoped
to role/credential-management routes only.

### The elevated routes (the full list)

These are the exact paths that trigger CRITICAL severity on RBAC denial
(`src/lib/audit-logger.ts:289-295`):

| Route | Why it is CRITICAL |
|---|---|
| `/api/users` (+ sub-paths like `/api/users/<id>`) | User create/update/list — role assignment |
| `/api/users/bulk` | Bulk user creation with role field |
| `/api/admin/unlock-account` | Account-state override |
| `/api/admin/lock-account` | Account-state override |
| `/api/admin/reset-password` | Credential override |

The matcher is prefix-based: `/api/users/<any-id>` matches because it starts
with `/api/users/`. See `rbacRouteSeverity()` at line 297-304.

---

## Fix 3 — POTENTIAL_BREACH added to audit dashboard dropdown

**File:** `src/app/dashboard/admin/audit-trail/page.tsx:531`

**What it does:** The admin audit-trail dashboard has an "Event Type" filter
dropdown. Before this fix, `POTENTIAL_BREACH` was a valid `eventType` the API
accepted but it was **missing from the dropdown** — operators could only find
escalation alerts by filtering on `SECURITY` category + `CRITICAL` severity.
This fix adds `<SelectItem value="POTENTIAL_BREACH">Potential Breach</SelectItem>`
to the dropdown so the alerts are one click away.

### Prerequisites

- A running CSMS instance.
- An admin or CSCS account (the audit-trail page is gated to `Admin` and `CSCS`).

### Steps

1. Open a browser and log in as an Admin (or CSCS) user.
2. Navigate to **Dashboard → Admin → Audit Trail**
   (`/dashboard/admin/audit-trail`).
3. Locate the **Event Type** filter dropdown (the third control in the filter
   row, labelled with a placeholder like "All Event Types").
4. Open the dropdown and scroll through the list.

### Expected result

- The list contains an entry labelled **"Potential Breach"** with value
  `POTENTIAL_BREACH`. It appears after "Complaint Resolved" and before
  "Password Changed" (line 531 in the source).
- Selecting it filters the audit log table to show only `POTENTIAL_BREACH`
  events.

### Verification steps

1. **Trigger a POTENTIAL_BREACH first** — run the self-role-change test from
   Fix 1, or the RBAC-denial test from Fix 2. This creates at least one
   `POTENTIAL_BREACH` row.
2. Return to the audit-trail page, select **"Potential Breach"** from the
   dropdown, and click **Refresh**.
3. The table should now show only rows with `eventType = POTENTIAL_BREACH`,
   each with a red `AlertTriangle` destructive severity badge reading
   `CRITICAL`.

### API-level check (no browser needed)

The dropdown sends `eventType=POTENTIAL_BREACH` as a query parameter to
`GET /api/audit/logs`. You can confirm the API honours it directly:

```bash
curl -s -b /tmp/admin_cookies.txt \
  "$BASE/api/audit/logs?eventType=POTENTIAL_BREACH&limit=10" \
  | jq '.data.logs | length, .[].severity'
```

Every returned row should have `eventType: "POTENTIAL_BREACH"` and
`severity: "CRITICAL"`.

---

## Fix 4 — Alert pipeline activated in production

**Files:** `.env.production:64-72`, `.env.local:57-61`

**What it does:** The alerting code (`src/lib/security-alerts.ts`) was fully
wired but **disabled by default** — all `SECURITY_ALERT_*` environment
variables were commented out, so `loadConfig()` returned `enabled: false` and
`dispatchSecurityAlert()` returned early without sending anything. The audit
row was still written (the audit table is the system of record), but no
email or webhook was actually delivered.

This fix uncomments and sets the two variables that activate the email
channel in both the production and local environments:

```
SECURITY_ALERT_EMAIL_TO=tume.serikalini@zanajira.go.tz
SECURITY_ALERT_SEVERITY_THRESHOLD=CRITICAL
```

It uses the already-configured SMTP server (`SMTP_HOST=mx.egaz.go.tz`,
`SMTP_PORT=25`, `SMTP_USER=tume.serikalini@zanajira.go.tz`).

### The full alert chain (now active)

```
logAuditEvent({ severity: CRITICAL, ... })
  ├─ writeAuditLog()          → audit.audit_log table (always written)
  ├─ logger.info()            → structured log (always written)
  └─ dispatchSecurityAlert()  → sendEmailAlert() → sendEmail() → SMTP → mailbox
                                  ↑ only fires if severity ≥ threshold
```

### Prerequisites

- The SMTP server (`mx.egaz.go.tz`) must be reachable from the CSMS host.
- The `SECURITY_ALERT_EMAIL_TO` mailbox must be accessible for you to check
  inbound mail.
- An event that produces a CRITICAL audit row (Fix 1 or Fix 2 will do).
- The server must be restarted after changing `.env` files so the new
  variables are loaded (Next.js reads env at boot, not per-request).

### Steps

#### 1. Confirm the env vars are set in the running process

```bash
# On the CSMS host, after restarting the app:
printenv | grep SECURITY_ALERT
```

Expected output:

```
SECURITY_ALERT_EMAIL_TO=tume.serikalini@zanajira.go.tz
SECURITY_ALERT_SEVERITY_THRESHOLD=CRITICAL
```

If either is missing, the server was not restarted after the `.env` edit.
Restart it (`pm2 restart all` or `pnpm dev`) and re-check.

#### 2. Trigger a CRITICAL event

Run the self-role-change test from **Fix 1** (the cleanest single trigger).
This produces a `CRITICAL POTENTIAL_BREACH` audit row and calls
`dispatchSecurityAlert`.

#### 3. Check the inbox

Open the `tume.serikalini@zanajira.go.tz` mailbox (webmail / IMAP client) and
look for a new email with the subject:

```
[CSMS Security Alert][CRITICAL] POTENTIAL_BREACH
```

The email body is a monospace `<pre>` block containing:

```
Severity:    CRITICAL
Event:       POTENTIAL_BREACH
Category:    SECURITY
Environment: <production|development>
Time (UTC):  <timestamp>

Message:     Audit event POTENTIAL_BREACH on /api/users/<id>
User:        <username>
Role:        Admin
IP:          <client ip>
Route:       PUT /api/users/<id>
Blocked:     yes (SELF_ROLE_CHANGE_BLOCKED)

Additional data:
{ ... JSON ... }
```

#### 4. If no email arrives — troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `printenv` shows no `SECURITY_ALERT_*` | Server not restarted after `.env` edit | Restart the app process |
| Email never arrives, no error in logs | `SECURITY_ALERT_EMAIL_TO` not set or empty | Confirm the var is uncommented in the active `.env` file |
| Email never arrives, log shows "suppressed by dedup" | Dedup window active (default 30s) | Wait 30s and trigger again, or set `SECURITY_ALERT_DEDUP_SECONDS=0` |
| Log shows "email send returned failure" | SMTP unreachable or auth failed | Check `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and network connectivity to `mx.egaz.go.tz:25` |
| Log shows "dispatchSecurityAlert swallowed unexpected error" | Unexpected exception in the dispatch path | Check the full error in `logs/production-error.log` or `logs/worker-error.log` |
| Event logged at `ERROR` (not `CRITICAL`) | The route is not in `CRITICAL_RBAC_ROUTES` | Confirm the route is one of the five listed in Fix 2; otherwise it correctly stays at ERROR |

#### 5. Verify the dedup window (optional)

The alert pipeline deduplicates emails by `eventType` within a configurable
window (default 30 seconds, env: `SECURITY_ALERT_DEDUP_SECONDS`). Two
`POTENTIAL_BREACH` events within 30s produce only **one** email. To verify:

```bash
# Set a short dedup window for testing (add to .env, restart):
# SECURITY_ALERT_DEDUP_SECONDS=0   # disables dedup entirely
```

With dedup disabled, every CRITICAL event sends an email. With the default
30s window, a burst of escalations sends one email per 30s per event type —
this is intentional, to avoid flooding the mailbox during an attack.

### Webhook channel (optional)

The email channel is now active. The **webhook/SIEM** channel is still
commented out (lines 71-72 of `.env.production`). To also page a SIEM/SOC,
uncomment and set:

```
SECURITY_ALERT_WEBHOOK_URL=https://your-siem.example.gov/webhook
SECURITY_ALERT_WEBHOOK_TOKEN=<bearer token>
```

The webhook receives a JSON POST with Bearer auth. Both channels are
independent — an email failure does not block the webhook, and vice versa
(`src/lib/security-alerts.ts:313-316`).

---

## Automated test verification (fast path)

If you only want to confirm the code is correct without doing the manual HTTP
tests above, run the three affected test suites:

```bash
npx vitest run \
  src/lib/audit-logger.test.ts \
  src/lib/role-privilege.test.ts \
  src/app/api/users/\[id\]/route.test.ts
```

### What the automated tests cover

| Test file | Tests | What it verifies |
|---|---|---|
| `src/app/api/users/[id]/route.test.ts` | 9 | Fix 1 (self-role-change → CRITICAL + no DB write), plus the original escalation/lateral/demotion/burst/high-privilege paths. |
| `src/lib/audit-logger.test.ts` | 11 | Fix 2 (user-management route denial → CRITICAL; routine route denial → ERROR), plus the existing `getClientIp` and IP-ban event tests. |
| `src/lib/role-privilege.test.ts` | 14 | The underlying escalation classification + burst detection logic (unchanged by these fixes, but exercised by the route tests). |

The specific test cases that map to each fix:

- **Fix 1:** `blocks self-role-change with a CRITICAL POTENTIAL_BREACH and no DB write`
  (`route.test.ts`) — asserts `res.status === 403`,
  `mockLogAuditEvent` called once with `eventType: 'POTENTIAL_BREACH'`,
  `severity: 'CRITICAL'`, `wasBlocked: true`,
  `blockReason: 'SELF_ROLE_CHANGE_BLOCKED'`,
  `additionalData.selfRoleChange === true`, and
  `mockDbUserUpdate` **not** called.

- **Fix 2:** `elevates a user-management route denial to CRITICAL`
  + `keeps a routine route denial at ERROR` (`audit-logger.test.ts`) —
  asserts `writeAuditLog` receives `severity: 'CRITICAL'` for
  `/api/users/<id>` and `severity: 'ERROR'` for `/api/employees`.

- **Fix 3:** No automated test (UI dropdown). Verify manually per the steps
  above. The API filter `eventType=POTENTIAL_BREACH` is covered implicitly by
  the audit-logger query tests.

- **Fix 4:** No automated test (environment config). Verify per the
  `printenv` + inbox-check steps above.

### Expected output

```
 Test Files  3 passed (3)
      Tests  34 passed (34)
```

If any test fails, the fix has regressed — do not deploy until green.
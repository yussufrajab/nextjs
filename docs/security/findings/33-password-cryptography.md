# Requirement 33: Password Security & Cryptography

**Application:** CSMS (Civil Service Management System)
**URL:** http://localhost:9002
**Branch:** feat/err01-batch3-wrap-handler
**Test Date:** 2026-07-03
**Tester:** Automated Security Test

---

## Summary

| Sub-case | Description | Result | Severity |
|----------|-------------|--------|----------|
| 33.1 | Password Complexity Requirements | FINDING | Medium |
| 33.2 | Password Hashing Verification | PASS | -- |
| 33.3 | Password Hash Uniqueness | PASS | -- |
| 33.4 | Password Change Security | PASS | -- |
| 33.5 | Password Reset -- Email Verification | N/A | -- |
| 33.6 | Password Reset -- Token Security | N/A | -- |
| 33.7 | Password Reset Rate Limiting | PASS | -- |
| 33.8 | Common Password Dictionary | PASS | -- |
| 33.9 | Password Enumeration Prevention | FINDING | Medium |
| 33.10 | Credential Stuffing Protection | PASS | -- |
| 33.11 | Password in Transit Security | PASS | -- |
| 33.12 | Password Storage Audit | PASS | -- |
| 33.13 | Audit: Password Changed | PASS | -- |
| 33.14 | Audit: Admin Password Reset / Account Locked | PASS | -- |

**Overall: 10 PASS, 2 FINDINGS, 2 N/A (no user-facing password reset exists)**

---

## 33.1 Password Complexity Requirements

**Result: FINDING (Medium)**

### Test

The application validates password complexity via `validatePasswordComplexity()` in `/home/latest/src/lib/password-utils.ts`.

### Finding: Complexity Rule Uses OR Logic (Not AND)

The validation function requires passwords to be at least 8 characters and contain **at least ONE** of: uppercase, lowercase, digit, or special character. This is an OR condition, not AND.

```typescript
// password-utils.ts line 43
return hasUppercase || hasLowercase || hasNumber || hasSpecial;
```

### Evidence

| Password | Length | Character Types | Result | Reason |
|----------|--------|-----------------|--------|--------|
| `Short1!` | 7 | upper+lower+digit+special | REJECTED | Too short (< 8) |
| *(empty)* | 0 | -- | REJECTED | Validation error |
| `abcdefgh` | 8 | lowercase only | REJECTED | zxcvbn common |
| `12345678` | 8 | digits only | REJECTED | zxcvbn common |
| `qwplmnzr` | 8 | lowercase only | **ACCEPTED** | Passes complexity (has lowercase), not common per zxcvbn |
| `XmktQpLz` | 8 | upper+lower | REJECTED | (current password was already changed by prior test) |

The password `qwplmnzr` (8 lowercase letters, no uppercase/digit/special) was accepted. This means passwords like `qwplmnzr`, `bdfhjlnp`, or `zxcmpwrl` are valid.

### Recommendation

Change the complexity rule from OR to AND, requiring at least two or three character classes:
```typescript
const classCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
return classCount >= 2; // or >= 3 for stricter policy
```

---

## 33.2 Password Hashing Verification

**Result: PASS**

### Test

Queried the database for password hash format of test accounts.

### Evidence

```
fautest:          $2a$10$5a4TtTNfS2hWAYybMNdS6..NFA7LRH5Xztz5hsKNMiWuVUqVPdd1y
abdillahomarnajim: $2a$10$twx.EZhKVqTjviGhuccPnetm4Fx7nzl6J3ZUjV3gzp21Lq2D3WBzG
```

### Analysis

| Property | Value | Status |
|----------|-------|--------|
| Algorithm | bcrypt (`$2a$`) | PASS |
| Cost factor | 10 (2^10 = 1,024 iterations) | PASS |
| Salt | Embedded in hash (22-char portion after cost) | PASS |
| Hash length | 60 characters (standard bcrypt) | PASS |

### Source Code Confirmation

```typescript
// password-utils.ts
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
```

The `bcryptjs` library is used with a cost factor of 10, which is the industry standard minimum.

---

## 33.3 Password Hash Uniqueness

**Result: PASS**

### Test

Both test accounts use the same password (`Csms@2026`). Verified that their stored hashes differ.

### Evidence

```
fautest hash:          $2a$10$5a4TtTNfS2hWAYybMNdS6..NFA7LRH5Xztz5hsKNMiWuVUqVPdd1y
abdillahomarnajim hash: $2a$10$twx.EZhKVqTjviGhuccPnetm4Fx7nzl6J3ZUjV3gzp21Lq2D3WBzG
```

Hashes are **different** despite identical passwords, confirming that bcrypt generates unique salts per hash.

---

## 33.4 Password Change Security

**Result: PASS**

### Test 1: Wrong Current Password

```
POST /api/auth/change-password
{"userId":"cme57cciu00082bcqnbw9sjm9","currentPassword":"WrongPassword123!","newPassword":"NewSecureP@ss1"}

Response (401):
{
  "success": false,
  "message": "Current password is incorrect. 4 attempts remaining."
}
```

The endpoint requires and validates the current password before allowing a change.

### Test 2: Same Password as Current

```
POST /api/auth/change-password
{"userId":"cme57cciu00082bcqnbw9sjm9","currentPassword":"Csms@2026","newPassword":"Csms@2026"}

Response (400):
{
  "success": false,
  "message": "New password must be different from your current password."
}
```

### Test 3: Password History Reuse

The application stores the last 3 password hashes in `passwordHistory`. Attempting to reuse a recent password:

```
POST /api/auth/change-password
{"userId":"...","currentPassword":"Csms@2026!","newPassword":"Csms@2026"}

Response (400):
{
  "success": false,
  "message": "You cannot reuse any of your last 3 passwords. Please choose a different password."
}
```

### Test 4: Failed Attempts Lockout

After 5 failed password change attempts, the account is locked for 30 minutes:

```
Attempt 1: "Current password is incorrect. 4 attempts remaining."
Attempt 2: "Current password is incorrect. 3 attempts remaining."
Attempt 3: "Current password is incorrect. 2 attempts remaining."
Attempt 4: "Current password is incorrect. 1 attempt remaining."
Attempt 5: "Too many failed attempts. Your account has been locked for 30 minutes."
```

### Additional Security Measures

After a successful password change:
- All other sessions for the user are terminated (force re-login on other devices)
- Password expiration is reset
- `PASSWORD_CHANGED` audit event is logged
- Temporary password flags are cleared

---

## 33.5 Password Reset -- Email Verification

**Result: N/A**

### Analysis

The application does **not** have a user-facing password reset flow. There is no `/api/auth/forgot-password` or `/api/auth/reset-password` endpoint (both return 404).

Password resets are performed exclusively by administrators via `POST /api/admin/reset-password`, which:
- Requires Admin role authentication
- Generates a temporary password (or accepts a custom one)
- Returns the plaintext temporary password to the admin (one-time only)
- Sets `isTemporaryPassword = true` and `mustChangePassword = true`
- Temporary password expires in 7 days

Since there is no email-based reset flow, this sub-case is not applicable.

---

## 33.6 Password Reset -- Token Security

**Result: N/A**

### Analysis

Since there is no user-facing password reset flow, there are no reset tokens to evaluate. The admin reset endpoint returns the temporary password directly in the response and does not use email-based tokens.

---

## 33.7 Password Reset Rate Limiting

**Result: PASS**

### Test: IP-Based Rate Limiting

The application uses Redis-backed rate limiting with the following tiers:

| Tier | Limit | Window |
|------|-------|--------|
| `auth` | 5 requests | 60 seconds |
| `write` | 30 requests | 60 seconds |
| `read` | 100 requests | 60 seconds |

Authentication endpoints (login, change-password, employee-login, MFA) use the `auth` tier (5 req/60s).

### Evidence

After 5 rapid requests to `/api/auth/change-password`:

```json
{
  "success": false,
  "error": "Too many requests",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 52
}
```

Response headers include:
```
Retry-After: 52
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <unix_timestamp>
```

### Additional Lockout Mechanisms

| Mechanism | Threshold | Duration |
|-----------|-----------|----------|
| Password change lockout | 5 failed attempts | 30 minutes |
| Login account lockout (standard) | 5 failed attempts | 30 minutes (auto-unlock) |
| Login account lockout (security) | >10 failed attempts | Admin unlock required |

---

## 33.8 Common Password Dictionary

**Result: PASS**

### Test

Attempted to set common/weak passwords via the change-password endpoint.

### Evidence

| Password | Result | Reason |
|----------|--------|--------|
| `password123` | REJECTED | zxcvbn score <= 1 (common) |
| `letmein123` | REJECTED | zxcvbn score <= 1 (common) |
| `qwerty123` | REJECTED | zxcvbn score <= 1 (common) |
| `admin1234` | REJECTED | zxcvbn score <= 1 (common) |
| `welcome123` | REJECTED | zxcvbn score <= 1 (common) |
| `P@ssw0rd` | REJECTED | zxcvbn score <= 1 (common) |

### Implementation

The application uses the `zxcvbn` library (Dropbox's password strength estimator) via `isCommonPassword()`:

```typescript
export function isCommonPassword(password: string): boolean {
  if (!password) return true;
  const result = zxcvbn(password);
  return result.score <= 1; // Scores 0 and 1 are considered "common"
}
```

Passwords scoring 0 or 1 on zxcvbn's 0-4 scale are rejected. This effectively blocks dictionary words, common patterns, and keyboard walks.

---

## 33.9 Password Enumeration Prevention

**Result: FINDING (Medium)**

### Test

Compared login responses for existing vs non-existing users with wrong passwords.

### Evidence

```
Non-existing user (nonexistent_user_xyz) with any password:
  -> "Invalid username/email or password"

Existing user (fautest) with wrong password:
  -> "Invalid username or password, 4 attempts remaining"
```

### Finding

The response messages differ between existing and non-existing users:

1. **Non-existing user:** `"Invalid username/email or password"` (generic)
2. **Existing user with wrong password:** `"Invalid username or password, N attempts remaining"` (includes attempt counter)

The attempt counter disclosure (`4 attempts remaining`, `3 attempts remaining`, etc.) confirms that the username exists in the system, enabling username enumeration.

### Recommendation

Use a consistent generic message for all failed login attempts regardless of whether the user exists. Do not include the remaining attempt count in the initial response, or include it for all requests (even non-existing users) to maintain consistency.

---

## 33.10 Credential Stuffing Protection

**Result: PASS**

### Test

Performed 5 consecutive failed login attempts with wrong passwords.

### Evidence

```
Attempt 1: "Invalid username or password, 4 attempts remaining"
Attempt 2: "Invalid username or password, 3 attempts remaining"
Attempt 3: "Invalid username or password, 2 attempts remaining"
Attempt 4: "Invalid username or password, 1 attempt remaining"
Attempt 5: "Too many failed login attempts. Your account has been locked.
           Please try again in 30 minutes."
```

### Account State After Lockout

```sql
SELECT username, active, "failedLoginAttempts", "loginLockoutType"
FROM "User" WHERE username = 'fautest';

 username | active | failedLoginAttempts | loginLockoutType
----------+--------+---------------------+------------------
 fautest  | f      |                   5 | standard
```

- Account is deactivated (`active = false`)
- Lockout type is `standard` (auto-unlocks after 30 minutes)
- After >10 attempts, escalates to `security` lockout (requires admin unlock)

### Audit Logging

Lockout events are logged to `audit.audit_log`:

```
action: ACCOUNT_LOCKED
severity: WARNING
block_reason: Account locked after 5 failed login attempts
additional_data: {
  "reason": "failed_attempts",
  "lockoutType": "standard",
  "failedAttempts": 5,
  "lockedUntil": "2026-07-03T20:00:15.690Z"
}
```

---

## 33.11 Password in Transit Security

**Result: PASS**

### Test

Checked HTTP security headers and cookie flags.

### Evidence

**HSTS Header:**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- Max-age: 63,072,000 seconds (2 years)
- Include subdomains: yes
- Preload: yes

**Session Cookie Flags:**
```
Set-Cookie: session=<value>; Path=/; Max-Age=86400; Secure; HttpOnly; SameSite=strict
```

**CSRF Token Cookie Flags:**
```
Set-Cookie: csrf-token=<value>; Path=/; Max-Age=604800; Secure; SameSite=strict
```
- Not HttpOnly by design (needs JS access for CSRF protection)

**Pre-Session Cookie Flags:**
```
Set-Cookie: pre-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=strict
```

**Other Security Headers:**
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'; upgrade-insecure-requests; ...
```

### Cookie Security Summary

| Cookie | Secure | HttpOnly | SameSite | Max-Age |
|--------|--------|----------|----------|---------|
| session | Yes | Yes | strict | 24 hours |
| csrf-token | Yes | No (by design) | strict | 7 days |
| pre-session | Yes | Yes | strict | 0 (cleared) |

---

## 33.12 Password Storage Audit

**Result: PASS**

### Test 1: API Response Analysis

Scanned all API responses for password hashes or plaintext passwords.

**Login response (`POST /api/auth/login`):**
- No `password` field in response
- No bcrypt hashes in response body
- Returns user metadata only (id, name, username, role, etc.)

**Auth/me response (`GET /api/auth/me`):**
- Fields containing "password" are metadata only:
  - `mustChangePassword: false`
  - `isTemporaryPassword: false`
  - `temporaryPasswordExpiry: null`
  - `lastPasswordChange: "2026-07-03T19:32:03.223Z"`
- No actual password hash or plaintext password

### Test 2: Database Storage

```sql
SELECT username, password FROM "User" WHERE username = 'fautest';

 username | password
----------+--------------------------------------------------------------
 fautest  | $2a$10$5a4TtTNfS2hWAYybMNdS6..NFA7LRH5Xztz5hsKNMiWuVUqVPdd1y
```

- Passwords stored as bcrypt hashes only
- No plaintext password storage
- Password history stored as array of bcrypt hashes

### Test 3: Admin Reset Response

The admin password reset endpoint (`POST /api/admin/reset-password`) returns the temporary password in plaintext to the admin, but only once in the response:

```json
{
  "success": true,
  "data": {
    "temporaryPassword": "<plaintext>",
    "wasGenerated": true,
    "expiresAt": "2026-07-10T..."
  }
}
```

This is by design -- the admin needs to communicate the temporary password to the user. The password is hashed before storage.

---

## 33.13 Audit: Password Changed

**Result: PASS**

### Test

Performed a password change and verified audit log entry.

### Evidence

```sql
SELECT action, severity, username, created_at, additional_data
FROM audit.audit_log
WHERE action = 'PASSWORD_CHANGED'
ORDER BY created_at DESC LIMIT 1;

 action           | severity | username | created_at                  | additional_data
------------------+----------+----------+-----------------------------+-----------------------------------------------
 PASSWORD_CHANGED | INFO     | fautest  | 2026-07-03 19:32:03.229618+00 | {
                  |          |          |                               |   "newExpirationDate": "2026-10-01T19:32:03.229Z",
                  |          |          |                               |   "sessionsInvalidated": true,
                  |          |          |                               |   "wasTemporaryPassword": false
                  |          |          |                               | }
```

### Audit Fields Captured

| Field | Value |
|-------|-------|
| action | `PASSWORD_CHANGED` |
| event_category | `SECURITY` |
| severity | `INFO` |
| username | (user who changed password) |
| ip_address | (client IP) |
| request_route | `/api/auth/change-password` |
| additional_data | `wasTemporaryPassword`, `newExpirationDate`, `sessionsInvalidated` |

---

## 33.14 Audit: Admin Password Reset / Account Locked

**Result: PASS**

### Test 1: Admin Password Reset Audit

```sql
SELECT action, severity, username, created_at, additional_data
FROM audit.audit_log
WHERE action = 'ADMIN_PASSWORD_RESET'
ORDER BY created_at DESC LIMIT 1;

 action               | severity | username | created_at                 | additional_data
----------------------+----------+----------+----------------------------+--------------------------------------------
 ADMIN_PASSWORD_RESET | WARNING  | ymrajab  | 2026-07-03 08:21:46.74121+00 | {
                      |          |          |                              |   "targetUserId": "cmd059ir10002e6d86l802ljc",
                      |          |          |                              |   "targetUsername": "skhamis",
                      |          |          |                              |   "wasGenerated": true
                      |          |          |                              | }
```

### Test 2: Account Lock Audit

```sql
SELECT action, severity, username, created_at, block_reason, additional_data
FROM audit.audit_log
WHERE action = 'ACCOUNT_LOCKED'
ORDER BY created_at DESC LIMIT 1;

 action         | severity | username | created_at                  | block_reason                              | additional_data
----------------+----------+----------+-----------------------------+-------------------------------------------+------------------------------------
 ACCOUNT_LOCKED | WARNING  | fautest  | 2026-07-03 19:30:30.163836+00 | Account locked after 5 failed login attempts | {
                |          |          |                             |                                           |   "reason": "failed_attempts",
                |          |          |                             |                                           |   "lockoutType": "standard",
                |          |          |                             |                                           |   "failedAttempts": 5,
                |          |          |                             |                                           |   "lockedUntil": "2026-07-03T20:00:30.160Z"
                |          |          |                             |                                           | }
```

### Audit Event Types Covered

| Event Type | Severity | Trigger |
|------------|----------|---------|
| `PASSWORD_CHANGED` | INFO | User changes own password |
| `ADMIN_PASSWORD_RESET` | WARNING | Admin resets user password |
| `ACCOUNT_LOCKED` | WARNING | Account locked after failed attempts |
| `ACCOUNT_LOCKOUT_UPGRADED` | CRITICAL | Lockout escalated from standard to security |
| `ADMIN_ACCOUNT_LOCK` | WARNING | Admin manually locks account |
| `ADMIN_ACCOUNT_UNLOCK` | INFO | Admin unlocks account |
| `LOGIN_SUCCESS` | INFO | Successful login |
| `LOGIN_FAILED` | WARNING | Failed login attempt |

---

## Findings Summary

### Finding 1: Password Complexity Uses OR Logic (Medium)

**Location:** `/home/latest/src/lib/password-utils.ts`, line 43

**Description:** The `validatePasswordComplexity()` function requires only ONE character class (uppercase, lowercase, digit, or special) instead of requiring multiple classes. This allows passwords like `qwplmnzr` (8 lowercase letters) to be accepted.

**Impact:** Weaker password policy than expected. Users can set passwords that meet the minimum length but lack character diversity.

**Recommendation:** Require at least 2-3 character classes using an AND or threshold check.

### Finding 2: Username Enumeration via Login Response (Medium)

**Location:** `/home/latest/src/app/api/auth/login/route.ts`, lines 189-229

**Description:** Login failure responses differ between existing and non-existing users. Existing users receive `"Invalid username or password, N attempts remaining"` while non-existing users receive `"Invalid username/email or password"`. The attempt counter confirms username existence.

**Impact:** Attackers can enumerate valid usernames by observing response differences, which can be used for targeted attacks.

**Recommendation:** Use a single generic error message for all failed login attempts, e.g., `"Invalid username or password"`. Consider logging remaining attempts server-side without exposing the count in the response.

---

## Source Files

| Component | Path |
|-----------|------|
| Password utilities | `/home/latest/src/lib/password-utils.ts` |
| Login endpoint | `/home/latest/src/app/api/auth/login/route.ts` |
| Change password endpoint | `/home/latest/src/app/api/auth/change-password/route.ts` |
| Admin reset password | `/home/latest/src/app/api/admin/reset-password/route.ts` |
| Rate limiter | `/home/latest/src/lib/rate-limiter.ts` |
| Account lockout | `/home/latest/src/lib/account-lockout-utils.ts` |
| Audit logger | `/home/latest/src/lib/audit-logger.ts` |
| Password expiration | `/home/latest/src/lib/password-expiration-utils.ts` |
| Prisma schema | `/home/latest/prisma/schema.prisma` |

# Audit Severity Levels Guide

## Overview

The CSMS audit logging system uses four severity levels to classify security events. This helps administrators prioritize their response to security incidents.

---

## Severity Levels

### 1. INFO (Informational)

**Purpose**: Normal system operations and successful actions
**Color**: Blue
**Response**: No action required - just monitoring

**Examples**:

- ✅ Successful user login
- ✅ User logged out
- ✅ Password changed successfully
- ✅ Session refreshed

**How to Test**:

1. **Successful Login**:
   - Go to https://test.zanajira.go.tz/login
   - Login with correct credentials
   - Check audit trail - you'll see INFO level "LOGIN_SUCCESS" event

2. **Logout**:
   - Click logout button
   - Check audit trail - you'll see INFO level "LOGOUT" event

---

### 2. WARNING (Potential Issue)

**Purpose**: Suspicious activity or policy violations that should be monitored
**Color**: Yellow/Orange
**Response**: Monitor and investigate if pattern emerges

**Examples**:

- ⚠️ Unauthorized access attempt (authenticated user trying wrong route)
- ⚠️ Failed login attempt (wrong password)
- ⚠️ Expired session access attempt
- ⚠️ User accessing edge of their permissions

**How to Test**:

1. **Unauthorized Route Access** (Already tested):
   - Login as DO user
   - Try to access: https://test.zanajira.go.tz/dashboard/admin/users
   - Result: WARNING level "UNAUTHORIZED_ACCESS" event

2. **Failed Login**:
   - Go to https://test.zanajira.go.tz/login
   - Enter correct username but wrong password
   - Result: WARNING level "LOGIN_FAILED" event

3. **Multiple Failed Attempts**:
   - Try wrong password 3+ times
   - Result: WARNING level "MULTIPLE_FAILED_ATTEMPTS" event

---

### 3. ERROR (Security Violation)

**Purpose**: Clear security violations or system errors
**Color**: Red
**Response**: Investigate immediately

**Examples**:

- 🔴 Accessing explicitly forbidden routes
- 🔴 Role escalation attempt
- 🔴 Accessing routes with tampered session data
- 🔴 Attempting to access deleted/disabled user account

**How to Test**:

1. **Forbidden Route** (Strict violation):
   - Login as EMPLOYEE user
   - Try to access: https://test.zanajira.go.tz/dashboard/admin/audit-trail
   - Result: ERROR level "FORBIDDEN_ROUTE" event

2. **Session Tampering** (if implemented):
   - Manually edit browser cookies to change role
   - Try to access admin routes
   - Result: ERROR level "PERMISSION_DENIED" event

---

### 4. CRITICAL (Security Breach)

**Purpose**: Severe security incidents requiring immediate action
**Color**: Dark Red
**Response**: Immediate investigation and response required

**Examples**:

- 🚨 Multiple rapid unauthorized attempts (brute force)
- 🚨 Suspected account compromise
- 🚨 System administrator account lockout
- 🚨 Potential security breach detected
- 🚨 Unauthorized data export attempt

**How to Test**:

1. **Rapid Failed Login Attempts** (Brute Force):
   - Try to login with wrong password 5+ times in 1 minute
   - Result: CRITICAL level "POTENTIAL_BREACH" event

2. **Multiple Unauthorized Access Attempts**:
   - As DO user, try to access 5+ different admin routes rapidly
   - Result: CRITICAL level "SUSPICIOUS_REQUEST" event

3. **Session Hijacking Detection** (if implemented):
   - Login from one IP, then same session from different IP
   - Result: CRITICAL level "POTENTIAL_BREACH" event

---

## Severity Decision Matrix

| Event Type             | Authenticated? | Repeated?  | Severity     |
| ---------------------- | -------------- | ---------- | ------------ |
| Login Success          | N/A            | N/A        | **INFO**     |
| Login Failed           | No             | No         | **WARNING**  |
| Login Failed           | No             | Yes (2-4x) | **WARNING**  |
| Login Failed           | No             | Yes (5+x)  | **CRITICAL** |
| Unauthorized Access    | Yes            | No         | **WARNING**  |
| Unauthorized Access    | Yes            | Yes (2-4x) | **ERROR**    |
| Unauthorized Access    | Yes            | Yes (5+x)  | **CRITICAL** |
| Unauthenticated Access | No             | N/A        | **WARNING**  |
| Forbidden Route        | Yes            | N/A        | **ERROR**    |
| Session Tampering      | Any            | N/A        | **CRITICAL** |
| Password Changed       | Yes            | N/A        | **INFO**     |
| Logout                 | Yes            | N/A        | **INFO**     |

---

## Current Implementation Status

### ✅ Implemented:

- INFO: Login success, Logout
- WARNING: Unauthorized access, Failed login

### 🔄 To Be Implemented:

- ERROR: Forbidden routes, Role violations
- CRITICAL: Brute force detection, Rapid unauthorized attempts

---

## Testing Checklist

### INFO Events:

- [ ] Login with correct credentials
- [ ] Logout normally
- [ ] Change password successfully

### WARNING Events:

- [x] DO user → Admin route (unauthorized access)
- [ ] Wrong password (single attempt)
- [ ] DO user → HRMO route (unauthorized access)

### ERROR Events:

- [ ] EMPLOYEE user → Admin route (forbidden)
- [ ] Tampered session data
- [ ] Access with expired/invalid token

### CRITICAL Events:

- [ ] 5+ failed logins in 1 minute
- [ ] 5+ unauthorized access attempts in 1 minute
- [ ] Session from multiple IPs

---

## Monitoring Recommendations

### Daily Review:

- Check for any CRITICAL events
- Review ERROR events for patterns

### Weekly Review:

- Analyze WARNING events for trends
- Review user access patterns

### Monthly Review:

- Generate statistics report
- Review all event types for security posture

---

**Last Updated**: 2025-12-27
**Version**: 1.0

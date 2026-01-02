# USER ACCEPTANCE TEST (UAT) DOCUMENT - VERSION 2.0

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item                   | Details                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| **Document Title**     | User Acceptance Test - Civil Service Management System (Version 2.0) |
| **Project Name**       | Civil Service Management System (CSMS)                               |
| **Version**            | 2.0                                                                  |
| **Date Prepared**      | December 27, 2025                                                    |
| **Previous Version**   | 1.0 (December 23, 2025)                                              |
| **Test Environment**   | https://csms.zanajira.go.tz                                          |
| **Employee Login URL** | https://csms.zanajira.go.tz/employee-login                           |
| **Prepared By**        | **\*\*\*\***\_\_\_**\*\*\*\***                                       |
| **Reviewed By**        | **\*\*\*\***\_\_\_**\*\*\*\***                                       |
| **Approved By**        | **\*\*\*\***\_\_\_**\*\*\*\***                                       |

---

## Version 2.0 Updates

This version includes comprehensive testing for **implemented security features**:

**New Test Cases Added:**

- **Test Case #21: Security Features** (Comprehensive security testing)
  - Password Expiration Policy (60/90 days, grace period, warnings)
  - Account Lockout Policy (5 failed attempts, 30-min lockout, security lockout)
  - Session Management (3 concurrent sessions, 24-hour expiration)
  - Inactivity Timeout (7-minute auto-logout)
  - Suspicious Login Detection (IP/device tracking)
  - Enhanced Audit Logging (request approvals/rejections, security events)

**Updated Sections:**

- Test objectives updated to include security compliance verification
- Test data requirements expanded for security testing
- Additional test deliverables for security audit reports
- Sign-off conditions updated with security requirements

---

## 1. Introduction

### 1.1 Purpose

This User Acceptance Test (UAT) document verifies that the Civil Service Management System (CSMS) meets all business requirements for managing civil service employees in Zanzibar. The system provides comprehensive HR lifecycle management from hiring through separation, including approval workflows, document management, reporting capabilities, **and comprehensive security controls**.

**Version 2.0 Focus:** This version emphasizes testing of implemented security features including password expiration, account lockout, session management, inactivity timeout, suspicious login detection, and comprehensive audit logging.

### 1.2 Scope

The UAT covers the following CSMS functionalities:

**Request Management Modules:**

- Confirmation Requests (Probation completion)
- Promotion Requests (Experience-based & Education-based)
- Leave Without Pay (LWOP) Requests
- Cadre Change Requests
- Retirement Requests (Voluntary, Compulsory, Illness)
- Resignation Requests
- Service Extension Requests
- Termination/Dismissal Requests

**Other Modules:**

- Complaint Management (Employee grievances)
- Employee Profile Management
- Request Status Tracking
- Recent Activities & Audit Trail
- Reports and Analytics (10 report types)
- HRIMS Integration (External data sync)
- User & Institution Management
- Dashboard & Notifications

**Security Modules (NEW in v2.0):**

- Password Expiration and Management
- Account Lockout and Recovery
- Session Management and Concurrent Session Control
- Inactivity Timeout and Auto-Logout
- Suspicious Login Detection and Alerting
- Comprehensive Audit Logging and Trail
- Data Modification Tracking

### 1.3 Test Objectives

- Verify all 9 user roles function with correct permissions
- Validate all 8 request type workflows
- Test role-based access control (CSC vs Institution-based)
- Confirm data isolation between institutions
- Test file upload/download (MinIO storage, PDF only, 2MB max)
- Validate notification system (English & Swahili)
- Ensure employee status restrictions work correctly
- Test reporting system (10 report types, bilingual)
- Verify HRIMS integration functionality
- Confirm approval workflows and status tracking
- **✓ Test password expiration policy (60/90 days, grace period)** (NEW)
- **✓ Verify account lockout after failed login attempts** (NEW)
- **✓ Test session management and concurrent session limits** (NEW)
- **✓ Validate inactivity timeout and auto-logout** (NEW)
- **✓ Test suspicious login detection and alerting** (NEW)
- **✓ Verify comprehensive audit logging for all critical events** (NEW)
- **✓ Confirm data modification tracking for compliance** (NEW)

---

## 2. Test Environment

### 2.1 System Access

| Component                   | Specification                              |
| --------------------------- | ------------------------------------------ |
| **Production URL**          | https://csms.zanajira.go.tz                |
| **Employee Portal**         | https://csms.zanajira.go.tz/employee-login |
| **Framework**               | Next.js 14 Full-Stack Application          |
| **Database**                | PostgreSQL with Prisma ORM                 |
| **Storage**                 | MinIO S3-Compatible Object Storage         |
| **Port**                    | 9002                                       |
| **Session Timeout**         | 7 minutes inactivity, 24 hours absolute    |
| **Max Concurrent Sessions** | 3 per user                                 |
| **Password Expiration**     | Admin: 60 days, Users: 90 days             |
| **Account Lockout**         | 5 failed attempts = 30-min lockout         |

### 2.2 Test User Accounts

| Role         | Username   | Password    | Institution Access           | Description                                         |
| ------------ | ---------- | ----------- | ---------------------------- | --------------------------------------------------- |
| **HRO**      | kmnyonge   | password123 | Institution only             | HR Officer - Submits requests                       |
| **HHRMD**    | skhamis    | password123 | All institutions             | Head of HR - Approves HR & Disciplinary             |
| **HRMO**     | fiddi      | password123 | All institutions             | HR Management Officer - Approves HR requests        |
| **DO**       | mussi      | password123 | All institutions             | Disciplinary Officer - Handles complaints           |
| **PO**       | mishak     | password123 | All institutions (read-only) | Planning Officer - Views reports                    |
| **CSCS**     | zhaji      | password123 | All institutions             | CSC Secretary - Executive oversight                 |
| **HRRP**     | kmhaji     | password123 | Institution only             | HR Responsible Personnel - Institutional supervisor |
| **ADMIN**    | akassim    | password123 | System-wide                  | Administrator - System management                   |
| **EMPLOYEE** | (See Note) | N/A         | Own data only                | Employee - Submit complaints, view profile          |

**Note:** Employee login requires ZanID, payroll number, and ZSSF number for the specific employee.

**Security Testing Accounts:**

- Create temporary test accounts for password expiration testing (with different password ages)
- Create accounts for account lockout testing (can be locked/unlocked during test)
- Use existing accounts for session management testing

### 2.3 Test Data Requirements

- Sample employees in various statuses (On Probation, Confirmed, On LWOP, Retired, etc.)
- Multiple institutions with assigned HR Officers
- Test documents (PDF files, max 2MB) for upload testing
- Employees with complete profiles including photos and documents
- Historical requests for reporting tests
- **Test accounts with passwords nearing expiration (14, 7, 3, 1 days)** (NEW)
- **Test accounts with expired passwords (in grace period and beyond)** (NEW)
- **Test accounts for failed login attempt testing** (NEW)
- **Multiple devices/browsers for session management testing** (NEW)
- **Historical audit log data for audit trail verification** (NEW)

---

## 3. Test Cases

**Note:** Test Cases 1-20 from Version 1.0 remain unchanged and include:

1. User Authentication and Role-Based Access (12 scenarios)
2. Employee Confirmation Requests (12 scenarios)
3. Promotion Requests (10 scenarios)
4. LWOP Requests (8 scenarios)
5. Cadre Change Requests (6 scenarios)
6. Retirement Requests (8 scenarios)
7. Resignation Requests (5 scenarios)
8. Service Extension Requests (6 scenarios)
9. Termination/Dismissal Requests (7 scenarios)
10. Complaint Management (13 scenarios)
11. Employee Profile Management (10 scenarios)
12. Request Status Tracking (8 scenarios)
13. Recent Activities & Audit Trail (7 scenarios)
14. Reports and Analytics (14 scenarios)
15. Dashboard and Metrics (8 scenarios)
16. User Management (Admin) (12 scenarios)
17. Institution Management (Admin) (10 scenarios)
18. HRIMS Integration (13 scenarios)
19. File Upload & Document Management (11 scenarios)
20. Notifications System (12 scenarios)

**Total Scenarios in Test Cases 1-20:** 172 scenarios

**New in Version 2.0:**

---

### **Module:** Security Features (NEW)

### **Test Case No.: 21**

**Process/Function Name:** Comprehensive Security Controls Testing

**Function Description:** This module tests all implemented security features including password expiration policy (Admin: 60 days, Users: 90 days), 7-day grace period, account lockout after failed login attempts (5 attempts = 30-min lockout, 11+ = security lockout), session management (max 3 concurrent sessions, 24-hour expiration), inactivity timeout (7-minute auto-logout), suspicious login detection, and comprehensive audit logging for all security events and data modifications.

#### **Section 21.1: Password Expiration Policy**

| **Case ID** | **Test Case Scenario**                       | **Test Steps**                                                                                                          | **Expected Results**                                                                                                                                                                                                                       | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------- | ----------- |
| 21.1.1      | Admin Password Expiration (60 Days)          | 1. Create admin user<br>2. Set password creation date to 61 days ago (manual DB update for testing)<br>3. Attempt login | - Login blocked<br>- Message: "Password has expired"<br>- Redirected to password change page<br>- Grace period activated (7 days)<br>- User can change password during grace period                                                        |                    |               |             |
| 21.1.2      | Standard User Password Expiration (90 Days)  | 1. Create standard user (HRO, HRMO, etc.)<br>2. Set password date to 91 days ago<br>3. Attempt login                    | - Login blocked<br>- Password expiration message shown<br>- Grace period starts<br>- Can change password within 7 days                                                                                                                     |                    |               |             |
| 21.1.3      | Password Warning - 14 Days Before Expiration | 1. Set user password to expire in 14 days<br>2. Login<br>3. View notifications                                          | - Login successful<br>- Warning notification displayed: "Password expires in 14 days"<br>- User can continue using system<br>- Warning level 1 logged                                                                                      |                    |               |             |
| 21.1.4      | Password Warning - 7 Days                    | 1. Set password to expire in 7 days<br>2. Login                                                                         | - More urgent warning: "Password expires in 7 days"<br>- Notification created<br>- Warning level 2 logged                                                                                                                                  |                    |               |             |
| 21.1.5      | Password Warning - 3 Days                    | 1. Set password to expire in 3 days<br>2. Login                                                                         | - Critical warning: "Password expires in 3 days"<br>- Warning level 3 logged<br>- User prompted to change password soon                                                                                                                    |                    |               |             |
| 21.1.6      | Password Warning - 1 Day                     | 1. Set password to expire tomorrow<br>2. Login                                                                          | - Final warning: "Password expires tomorrow"<br>- Warning level 4 logged<br>- Strong recommendation to change password                                                                                                                     |                    |               |             |
| 21.1.7      | Grace Period - Days 1-7                      | 1. Set password as expired<br>2. Attempt login<br>3. Change password                                                    | - Login allowed during grace period<br>- Forced password change prompt<br>- Shows days remaining (7, 6, 5... 1)<br>- Can change password and continue<br>- Password expiration reset after change                                          |                    |               |             |
| 21.1.8      | Grace Period Expiration                      | 1. Set password expired 8 days ago (beyond grace)<br>2. Attempt login                                                   | - Login blocked completely<br>- Message: "Password expired beyond grace period"<br>- Account locked<br>- Admin must unlock and reset password<br>- Cannot login until admin intervention                                                   |                    |               |             |
| 21.1.9      | Password Change Resets Expiration            | 1. Login with password near expiration<br>2. Change password<br>3. Verify new expiration date                           | - Password changed successfully<br>- passwordExpiresAt updated to:<br>&nbsp;&nbsp;• +60 days for Admin<br>&nbsp;&nbsp;• +90 days for others<br>- lastPasswordChange updated to now<br>- Warning level reset to 0<br>- Grace period cleared |                    |               |             |
| 21.1.10     | Admin Password Reset Resets Expiration       | 1. Admin resets user password<br>2. User logs in with new password<br>3. Check expiration date                          | - New password expiration set based on role<br>- User notified of new password<br>- Must change on first login (planned)<br>- Expiration timer starts from reset date                                                                      |                    |               |             |
| 21.1.11     | Automated Daily Expiration Check             | 1. Verify cron job runs daily<br>2. Check for warning notifications created<br>3. Check for grace periods activated     | - Cron job executes daily<br>- Warning notifications generated for users at warning levels<br>- Grace periods automatically activated on expiration<br>- Logs show cron execution                                                          |                    |               |             |
| 21.1.12     | No Duplicate Warnings                        | 1. Receive warning at level 2 (7 days)<br>2. Login again next day (still at level 2)<br>3. Check notifications          | - Only one notification for each warning level<br>- lastExpirationWarningLevel tracks last sent<br>- No duplicate warnings at same level<br>- New warning only when level increases                                                        |                    |               |             |

#### **Section 21.2: Account Lockout Policy**

| **Case ID** | **Test Case Scenario**                 | **Test Steps**                                                                                                                         | **Expected Results**                                                                                                                                                                                                                                                                                                                                                                                    | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 21.2.1      | Failed Login Attempt #1                | 1. Enter valid username<br>2. Enter wrong password<br>3. Submit login                                                                  | - Login fails<br>- Error: "Invalid username or password"<br>- failedLoginAttempts = 1<br>- Message shows: "4 attempts remaining"<br>- Account not locked                                                                                                                                                                                                                                                |                    |               |             |
| 21.2.2      | Failed Login Attempts #2-4             | 1. Fail login 3 more times<br>2. Check remaining attempts                                                                              | - Each failure increments counter<br>- Messages show: "3 remaining", "2 remaining", "1 remaining"<br>- Account still active<br>- Can still attempt login                                                                                                                                                                                                                                                |                    |               |             |
| 21.2.3      | 5th Failed Attempt - Standard Lockout  | 1. Fail login 5th time<br>2. Check account status                                                                                      | - Account locked immediately<br>- failedLoginAttempts = 5<br>- loginLockedUntil = NOW() + 30 minutes<br>- loginLockoutType = 'standard'<br>- loginLockoutReason = 'failed_attempts'<br>- active = false<br>- Audit log entry created (WARNING severity)<br>- Message: "Account locked for 30 minutes"                                                                                                   |                    |               |             |
| 21.2.4      | Login During 30-Min Lockout            | 1. Wait 10 minutes<br>2. Attempt login with correct password                                                                           | - Login blocked<br>- Message: "Account locked. Try again in X minutes"<br>- Shows remaining lockout time<br>- Countdown displayed                                                                                                                                                                                                                                                                       |                    |               |             |
| 21.2.5      | Auto-Unlock After 30 Minutes           | 1. Wait 31 minutes after lockout<br>2. Attempt login with correct password                                                             | - Cron job auto-unlocks account<br>- active = true<br>- failedLoginAttempts = 0<br>- Lockout fields cleared<br>- Login successful<br>- Session created                                                                                                                                                                                                                                                  |                    |               |             |
| 21.2.6      | 11th Failed Attempt - Security Lockout | 1. Fail login 11 times (simulate)<br>2. Check account status                                                                           | - Account locked permanently<br>- loginLockoutType = 'security'<br>- loginLockedUntil = null (no auto-unlock)<br>- active = false<br>- Audit log entry created (CRITICAL severity)<br>- Message: "Account locked. Contact administrator"<br>- Requires admin unlock                                                                                                                                     |                    |               |             |
| 21.2.7      | Security Lockout - No Auto-Unlock      | 1. Account locked with security lockout<br>2. Wait 24 hours<br>3. Attempt login                                                        | - Account remains locked<br>- No auto-unlock despite time passed<br>- Message: "Contact administrator"<br>- Only admin can unlock                                                                                                                                                                                                                                                                       |                    |               |             |
| 21.2.8      | Administrator Manual Lock              | 1. Login as Admin<br>2. Navigate to Users<br>3. Select user<br>4. Click "Lock Account"<br>5. Enter reason and notes<br>6. Confirm lock | - Account locked immediately<br>- isManuallyLocked = true<br>- lockedBy = admin user ID<br>- lockedAt = current timestamp<br>- loginLockoutReason = 'admin_lock'<br>- lockoutNotes saved<br>- active = false<br>- Audit log created (ADMIN_ACCOUNT_LOCK event)                                                                                                                                          |                    |               |             |
| 21.2.9      | Administrator Unlock Account           | 1. Login as Admin<br>2. Select locked user<br>3. Click "Unlock Account"<br>4. Enter verification notes<br>5. Confirm unlock            | - Account unlocked<br>- isManuallyLocked = false<br>- lockedBy = null<br>- loginLockedUntil = null<br>- failedLoginAttempts = 0<br>- All lockout fields cleared<br>- active = true<br>- Audit log created (ADMIN_ACCOUNT_UNLOCK event)<br>- User can login immediately                                                                                                                                  |                    |               |             |
| 21.2.10     | Lockout Status API                     | 1. Get account lockout status via API<br>2. Verify returned information                                                                | - API returns:<br>&nbsp;&nbsp;• isLocked: boolean<br>&nbsp;&nbsp;• lockoutType: standard/security/null<br>&nbsp;&nbsp;• lockoutReason<br>&nbsp;&nbsp;• lockedUntil<br>&nbsp;&nbsp;• remainingMinutes<br>&nbsp;&nbsp;• failedAttempts<br>&nbsp;&nbsp;• isManuallyLocked<br>&nbsp;&nbsp;• canAutoUnlock<br>- All fields accurate                                                                          |                    |               |             |
| 21.2.11     | Failed Attempts Reset on Success       | 1. Fail login 3 times<br>2. Login with correct password<br>3. Check failed attempts counter                                            | - Login successful<br>- failedLoginAttempts = 0<br>- Counter reset<br>- No lockout applied                                                                                                                                                                                                                                                                                                              |                    |               |             |
| 21.2.12     | Audit Log for All Lockouts             | 1. Trigger standard lockout<br>2. Trigger security lockout<br>3. Admin manual lock<br>4. Admin unlock<br>5. Check audit logs           | - All events logged:<br>&nbsp;&nbsp;• ACCOUNT_LOCKED (standard)<br>&nbsp;&nbsp;• ACCOUNT_LOCKED (security)<br>&nbsp;&nbsp;• ADMIN_ACCOUNT_LOCK<br>&nbsp;&nbsp;• ADMIN_ACCOUNT_UNLOCK<br>- Each with full details:<br>&nbsp;&nbsp;• User ID, username<br>&nbsp;&nbsp;• IP address<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Reason<br>&nbsp;&nbsp;• Failed attempt count<br>&nbsp;&nbsp;• Lockout type |                    |               |             |

#### **Section 21.3: Session Management**

| **Case ID** | **Test Case Scenario**                  | **Test Steps**                                                                                                            | **Expected Results**                                                                                                                                                                                                                                                                                                       | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 21.3.1      | Single Session Creation                 | 1. Login with valid credentials<br>2. Check session created in database                                                   | - Session created successfully<br>- Unique sessionToken (64-char hex)<br>- expiresAt = NOW() + 24 hours<br>- lastActivity = NOW()<br>- ipAddress captured<br>- userAgent captured<br>- deviceInfo parsed<br>- HTTP-only secure cookie set                                                                                  |                    |               |             |
| 21.3.2      | Second Session - Same User, Same Device | 1. Login on same browser<br>2. Open new tab, login again<br>3. Check session count                                        | - Second session created<br>- User now has 2 active sessions<br>- Both sessions valid<br>- Can switch between tabs<br>- Both remain authenticated                                                                                                                                                                          |                    |               |             |
| 21.3.3      | Third Session - Different Device        | 1. User has 2 sessions (desktop)<br>2. Login on mobile device<br>3. Check session count                                   | - Third session created<br>- User has 3 concurrent sessions<br>- All 3 remain active<br>- deviceInfo shows different device<br>- IP may differ (mobile network)                                                                                                                                                            |                    |               |             |
| 21.3.4      | Fourth Session - Oldest Terminated      | 1. User has 3 sessions<br>2. Login on 4th device/browser<br>3. Check sessions                                             | - New session created<br>- Oldest session automatically terminated<br>- User still has 3 sessions (not 4)<br>- Oldest session deleted from database<br>- Log entry: "Terminated oldest session for user"<br>- New session is one of the 3 remaining                                                                        |                    |               |             |
| 21.3.5      | Session List for User                   | 1. Login<br>2. Query active sessions for user<br>3. View session details                                                  | - API returns all active sessions<br>- Each shows:<br>&nbsp;&nbsp;• Session ID<br>&nbsp;&nbsp;• Device info<br>&nbsp;&nbsp;• IP address<br>&nbsp;&nbsp;• Created timestamp<br>&nbsp;&nbsp;• Last activity<br>&nbsp;&nbsp;• Expiration time<br>&nbsp;&nbsp;• isSuspicious flag<br>- Ordered by creation (most recent first) |                    |               |             |
| 21.3.6      | 24-Hour Absolute Expiration             | 1. Create session<br>2. Set creation time to 25 hours ago (DB manipulation)<br>3. Make API request                        | - Session validation fails<br>- expiresAt exceeded<br>- Session deleted automatically<br>- User logged out<br>- Message: "Session expired. Please login again"<br>- Redirected to login                                                                                                                                    |                    |               |             |
| 21.3.7      | Session Token Security                  | 1. Create session<br>2. Check cookie attributes<br>3. Try to access token via JavaScript                                  | - Cookie has attributes:<br>&nbsp;&nbsp;• HttpOnly (cannot access via JS)<br>&nbsp;&nbsp;• Secure (HTTPS only)<br>&nbsp;&nbsp;• SameSite=Lax<br>&nbsp;&nbsp;• Path=/<br>&nbsp;&nbsp;• Max-Age=86400 (24 hours)<br>- JavaScript console.log(document.cookie) does NOT show session token<br>- Token never in URL or logs    |                    |               |             |
| 21.3.8      | Manual Session Termination (Logout)     | 1. Login<br>2. Click Logout button<br>3. Verify session deleted                                                           | - Logout request processed<br>- Session deleted from database<br>- Cookie cleared<br>- Redirected to login page<br>- Audit log entry: LOGOUT event<br>- Subsequent requests fail authentication                                                                                                                            |                    |               |             |
| 21.3.9      | Terminate All User Sessions (Admin)     | 1. User has 3 active sessions<br>2. Admin calls terminateAllUserSessions(userId)<br>3. Verify all sessions terminated     | - All user sessions deleted<br>- Session count = 0<br>- User logged out on all devices<br>- Audit log entries for each termination<br>- Function returns count (3)                                                                                                                                                         |                    |               |             |
| 21.3.10     | Session Cleanup Cron Job                | 1. Create sessions with various expiration times<br>2. Run session cleanup function<br>3. Verify expired sessions deleted | - Cron job finds sessions with expiresAt < NOW()<br>- Deletes all expired sessions<br>- Returns count of deleted sessions<br>- Active sessions remain<br>- Database cleaned up<br>- Log: "Cleaned up X expired sessions"                                                                                                   |                    |               |             |
| 21.3.11     | Last Activity Tracking                  | 1. Login<br>2. Make API request (page load, form submit)<br>3. Check lastActivity field                                   | - lastActivity updated on every request<br>- Timestamp = request time<br>- Used for inactivity timeout calculation                                                                                                                                                                                                         |                    |               |             |
| 21.3.12     | Concurrent Session Limit Enforcement    | 1. Attempt to create 5 sessions quickly<br>2. Verify only 3 remain                                                        | - First 3 sessions created normally<br>- 4th session triggers deletion of 1st<br>- 5th session triggers deletion of 2nd<br>- Final state: sessions 3, 4, 5 active<br>- Sessions 1, 2 terminated<br>- Max 3 enforced consistently                                                                                           |                    |               |             |

#### **Section 21.4: Inactivity Timeout**

| **Case ID** | **Test Case Scenario**                         | **Test Steps**                                                                                                        | **Expected Results**                                                                                                                                                                                                                                                                                                   | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 21.4.1      | Activity Resets Timeout                        | 1. Login<br>2. Wait 3 minutes<br>3. Click link (make request)<br>4. Wait another 6 minutes<br>5. Make another request | - Timeout timer resets on each activity<br>- lastActivity updated each time<br>- Total elapsed 9 minutes but user NOT logged out<br>- Timer resets to 0 on activity<br>- User remains authenticated                                                                                                                    |                    |               |             |
| 21.4.2      | 6-Minute Inactivity Warning                    | 1. Login<br>2. Wait exactly 6 minutes without activity<br>3. Check for warning                                        | - Client-side warning displayed:<br>&nbsp;&nbsp;"You will be logged out in 1 minute due to inactivity"<br>- Countdown timer shown (60 seconds)<br>- Warning modal/banner appears<br>- User can click to stay active                                                                                                    |                    |               |             |
| 21.4.3      | Stay Active During Warning                     | 1. Receive 6-minute warning<br>2. Click "Stay Logged In" button<br>3. Verify session continues                        | - Activity registered<br>- lastActivity updated<br>- Timer reset to 0<br>- Warning dismissed<br>- User remains logged in                                                                                                                                                                                               |                    |               |             |
| 21.4.4      | 7-Minute Inactivity Auto-Logout                | 1. Login<br>2. Do not interact for 7+ minutes<br>3. Session checked                                                   | - After 7 minutes of inactivity:<br>&nbsp;&nbsp;• Session invalidated<br>&nbsp;&nbsp;• User automatically logged out<br>&nbsp;&nbsp;• Redirected to login page<br>&nbsp;&nbsp;• Message: "Logged out due to inactivity"<br>- Session deleted or marked expired<br>- Audit log: SESSION_EXPIRED event                   |                    |               |             |
| 21.4.5      | Request After Timeout                          | 1. Let session timeout (7 min)<br>2. Attempt API request or page navigation                                           | - Request rejected<br>- Authentication fails<br>- Error: "Session expired"<br>- Redirected to login<br>- Must re-authenticate                                                                                                                                                                                          |                    |               |             |
| 21.4.6      | Multiple Users - Independent Timeouts          | 1. User A logs in<br>2. User B logs in 2 minutes later<br>3. Both go inactive                                         | - User A timeout: 7 minutes from A's login<br>- User B timeout: 7 minutes from B's login<br>- Timeouts are independent<br>- Each user tracked separately<br>- User A logs out 2 min before User B                                                                                                                      |                    |               |             |
| 21.4.7      | Background Activity Not Reset (if implemented) | 1. Login<br>2. Background polling/heartbeat occurs<br>3. Check if timeout resets                                      | - If background requests DON'T reset timeout:<br>&nbsp;&nbsp;• User still times out at 7 min<br>&nbsp;&nbsp;• Only foreground activity counts<br>- If they DO reset:<br>&nbsp;&nbsp;• User stays logged in indefinitely<br>&nbsp;&nbsp;• (Depends on implementation)                                                   |                    |               |             |
| 21.4.8      | Timeout Configuration                          | 1. Check timeout settings in code/config<br>2. Verify values                                                          | - SESSION_TIMEOUT_MS = 420000 (7 minutes)<br>- SESSION_WARNING_BEFORE_MS = 60000 (1 minute)<br>- Settings match Security Policy Document<br>- Configurable if needed                                                                                                                                                   |                    |               |             |
| 21.4.9      | Timeout Applies to All Roles                   | 1. Login as Admin, HRO, HHRMD, Employee<br>2. Test timeout for each                                                   | - 7-minute timeout applies equally:<br>&nbsp;&nbsp;• Administrators<br>&nbsp;&nbsp;• HRO, HHRMD, HRMO, DO<br>&nbsp;&nbsp;• Planning Officer<br>&nbsp;&nbsp;• CSC Secretary<br>&nbsp;&nbsp;• Employees<br>- No role exceptions<br>- Consistent enforcement                                                              |                    |               |             |
| 21.4.10     | Timeout Info API                               | 1. Call getSessionTimeoutInfo(lastActivity)<br>2. Verify response                                                     | - API returns:<br>&nbsp;&nbsp;• isTimedOut: boolean<br>&nbsp;&nbsp;• isWarning: boolean<br>&nbsp;&nbsp;• remainingTimeMs: number<br>&nbsp;&nbsp;• remainingMinutes: number<br>&nbsp;&nbsp;• remainingSeconds: number<br>&nbsp;&nbsp;• timeoutMinutes: 7<br>&nbsp;&nbsp;• lastActivity: Date<br>- Calculations accurate |                    |               |             |

#### **Section 21.5: Suspicious Login Detection**

| **Case ID** | **Test Case Scenario**                 | **Test Steps**                                                                                                             | **Expected Results**                                                                                                                                                                                                                                                                                                      | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 21.5.1      | First Login - No Suspicion             | 1. New user logs in for first time<br>2. Check suspicious flag                                                             | - No recent sessions to compare<br>- isSuspicious = false<br>- Login allowed<br>- Session created normally<br>- No alert                                                                                                                                                                                                  |                    |               |             |
| 21.5.2      | Login from Known IP                    | 1. User logs in from IP X<br>2. Logout<br>3. Login again from same IP X                                                    | - IP address matches previous session<br>- isSuspicious = false<br>- reasons = [] (empty)<br>- Login allowed<br>- No notification                                                                                                                                                                                         |                    |               |             |
| 21.5.3      | Login from New IP Address              | 1. User logs in from IP X (establish history)<br>2. Login from different IP Y<br>3. Check detection                        | - New IP detected<br>- isSuspicious = true<br>- reasons = ["Login from new IP address"]<br>- Login still allowed (non-blocking)<br>- Session flagged as suspicious<br>- Audit log entry created                                                                                                                           |                    |               |             |
| 21.5.4      | Login from New Device Type             | 1. User logs in from Windows PC (establish)<br>2. Login from Mobile device<br>3. Check detection                           | - New device type detected<br>- isSuspicious = true<br>- reasons = ["Login from new device type: Mobile"]<br>- Login allowed<br>- Session flagged<br>- Audit log entry                                                                                                                                                    |                    |               |             |
| 21.5.5      | Concurrent Login from Different IP     | 1. User logged in from IP X<br>2. Without logging out, login from IP Y<br>3. Check detection                               | - Concurrent sessions detected from different IPs<br>- isSuspicious = true<br>- reasons = ["Concurrent login from different IP address"]<br>- shouldNotify = true (high risk)<br>- User notification created<br>- Both sessions allowed<br>- Security team alerted (if configured)                                        |                    |               |             |
| 21.5.6      | Rapid Successive Login - Different IPs | 1. User logs in from IP X<br>2. Within 3 minutes, login from IP Y<br>3. Check detection                                    | - Rapid IP change detected (< 5 minutes)<br>- isSuspicious = true<br>- reasons = ["Rapid login from different IP within 5 minutes"]<br>- shouldNotify = true (critical risk)<br>- User notification created<br>- Audit log: CRITICAL severity<br>- Login allowed but flagged                                              |                    |               |             |
| 21.5.7      | User Notification for Suspicious Login | 1. Trigger suspicious login (new IP + new device)<br>2. Check notifications for user                                       | - Notification created for user<br>- Message: "Suspicious login detected from new location/device"<br>- Includes: device, IP, timestamp<br>- User can review and report if unauthorized<br>- Link to view session details                                                                                                 |                    |               |             |
| 21.5.8      | Suspicious Login Audit Log             | 1. Trigger various suspicious scenarios<br>2. Check audit logs                                                             | - All suspicious logins logged<br>- eventType: LOGIN_SUCCESS with isSuspicious flag<br>- additionalData contains:<br>&nbsp;&nbsp;• Suspicious reasons<br>&nbsp;&nbsp;• IP address<br>&nbsp;&nbsp;• Device info<br>&nbsp;&nbsp;• Previous IP/device for comparison<br>- severity: WARNING or ERROR<br>- All reasons listed |                    |               |             |
| 21.5.9      | Multiple Suspicious Indicators         | 1. User logs in from new IP AND new device AND concurrent<br>2. Check detection                                            | - Multiple reasons detected:<br>&nbsp;&nbsp;• "New IP address"<br>&nbsp;&nbsp;• "New device type"<br>&nbsp;&nbsp;• "Concurrent login"<br>- isSuspicious = true<br>- shouldNotify = true<br>- All reasons in audit log<br>- High-priority alert                                                                            |                    |               |             |
| 21.5.10     | Device Parsing Accuracy                | 1. Login from Windows PC<br>2. Login from Mac<br>3. Login from Mobile (iOS)<br>4. Login from Tablet<br>5. Login from Linux | - Device types parsed correctly:<br>&nbsp;&nbsp;• "Windows PC"<br>&nbsp;&nbsp;• "Mac"<br>&nbsp;&nbsp;• "Mobile Device"<br>&nbsp;&nbsp;• "Tablet"<br>&nbsp;&nbsp;• "Linux PC"<br>- Stored in deviceInfo field<br>- User agent captured                                                                                     |                    |               |             |
| 21.5.11     | Detection Does Not Block Login         | 1. Trigger any suspicious login<br>2. Verify login succeeds                                                                | - Suspicious detection is NON-BLOCKING<br>- User can login despite flags<br>- Session created successfully<br>- Authentication completes<br>- Only flagged and logged, not prevented                                                                                                                                      |                    |               |             |
| 21.5.12     | Historical Session Window (30 Days)    | 1. User logs in from IP X<br>2. Wait 31 days (simulate)<br>3. Login from IP X again                                        | - Sessions older than 30 days NOT considered<br>- May trigger "new IP" if no recent activity<br>- Only last 10 sessions checked<br>- Historical window: 30 days                                                                                                                                                           |                    |               |             |

#### **Section 21.6: Comprehensive Audit Logging**

| **Case ID** | **Test Case Scenario**            | **Test Steps**                                                                                                                                                                                                                                                                                         | **Expected Results**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 21.6.1      | Login Success Audit Log           | 1. Login with valid credentials<br>2. Check audit log                                                                                                                                                                                                                                                  | - eventType: LOGIN_SUCCESS<br>- eventCategory: AUTHENTICATION<br>- severity: INFO<br>- userId, username, userRole captured<br>- ipAddress captured<br>- userAgent captured<br>- attemptedRoute: /api/auth/login<br>- requestMethod: POST<br>- isAuthenticated: true<br>- wasBlocked: false<br>- timestamp recorded                                                                                                                                                                                                                                                          |                    |               |             |
| 21.6.2      | Login Failed Audit Log            | 1. Login with wrong password<br>2. Check audit log                                                                                                                                                                                                                                                     | - eventType: LOGIN_FAILED<br>- eventCategory: AUTHENTICATION<br>- severity: WARNING<br>- username captured (userId null if not found)<br>- ipAddress, userAgent captured<br>- blockReason: "Invalid password"<br>- wasBlocked: true<br>- additionalData includes failed attempt count                                                                                                                                                                                                                                                                                       |                    |               |             |
| 21.6.3      | Request Approval Audit Log        | 1. Login as HHRMD<br>2. Approve a promotion request<br>3. Check audit log                                                                                                                                                                                                                              | - eventType: REQUEST_APPROVED<br>- eventCategory: DATA_MODIFICATION<br>- severity: INFO<br>- userId: HHRMD user ID<br>- username: "skhamis"<br>- userRole: "HHRMD"<br>- ipAddress and userAgent captured<br>- attemptedRoute: /api/promotions/<id><br>- requestMethod: PATCH or PUT<br>- wasBlocked: false<br>- additionalData:<br>&nbsp;&nbsp;• requestType: "Promotion"<br>&nbsp;&nbsp;• requestId<br>&nbsp;&nbsp;• employeeId, employeeName, employeeZanId<br>&nbsp;&nbsp;• reviewStage<br>&nbsp;&nbsp;• action: "APPROVED"<br>&nbsp;&nbsp;• proposedCadre, currentCadre |                    |               |             |
| 21.6.4      | Request Rejection Audit Log       | 1. Login as HHRMD<br>2. Reject a request with reason<br>3. Check audit log                                                                                                                                                                                                                             | - eventType: REQUEST_REJECTED<br>- eventCategory: DATA_MODIFICATION<br>- severity: WARNING<br>- All user and request details captured<br>- blockReason: rejection reason provided<br>- additionalData:<br>&nbsp;&nbsp;• action: "REJECTED"<br>&nbsp;&nbsp;• rejectionReason<br>&nbsp;&nbsp;• All request context                                                                                                                                                                                                                                                            |                    |               |             |
| 21.6.5      | All Request Types Logged          | 1. Approve/reject requests of each type:<br>&nbsp;&nbsp;- Confirmation<br>&nbsp;&nbsp;- Promotion<br>&nbsp;&nbsp;- LWOP<br>&nbsp;&nbsp;- Cadre Change<br>&nbsp;&nbsp;- Retirement<br>&nbsp;&nbsp;- Resignation<br>&nbsp;&nbsp;- Service Extension<br>&nbsp;&nbsp;- Termination<br>2. Verify all logged | - Each approval/rejection logged<br>- requestType field shows type<br>- All 8 request types have audit entries<br>- Consistent log format<br>- All include employee details                                                                                                                                                                                                                                                                                                                                                                                                 |                    |               |             |
| 21.6.6      | Account Lockout Audit Log         | 1. Fail login 5 times to trigger lockout<br>2. Check audit log                                                                                                                                                                                                                                         | - eventType: ACCOUNT_LOCKED<br>- eventCategory: SECURITY<br>- severity: WARNING (standard) or CRITICAL (security)<br>- All user details<br>- blockReason: "Account locked after X failed attempts"<br>- additionalData:<br>&nbsp;&nbsp;• failedAttempts: 5<br>&nbsp;&nbsp;• lockoutType: "standard"<br>&nbsp;&nbsp;• lockedUntil: timestamp<br>&nbsp;&nbsp;• reason: "failed_attempts"                                                                                                                                                                                      |                    |               |             |
| 21.6.7      | Admin Account Lock/Unlock Audit   | 1. Admin locks a user account<br>2. Admin unlocks the account<br>3. Check audit logs                                                                                                                                                                                                                   | - ADMIN_ACCOUNT_LOCK event:<br>&nbsp;&nbsp;• userId: admin ID<br>&nbsp;&nbsp;• additionalData.targetUserId<br>&nbsp;&nbsp;• reason, notes<br>&nbsp;&nbsp;• severity: WARNING<br>- ADMIN_ACCOUNT_UNLOCK event:<br>&nbsp;&nbsp;• userId: admin ID<br>&nbsp;&nbsp;• additionalData.targetUserId<br>&nbsp;&nbsp;• verificationNotes<br>&nbsp;&nbsp;• previousReason<br>&nbsp;&nbsp;• severity: INFO                                                                                                                                                                             |                    |               |             |
| 21.6.8      | Unauthorized Access Audit         | 1. Login as HRO<br>2. Attempt to access Admin-only route<br>3. Check audit log                                                                                                                                                                                                                         | - eventType: UNAUTHORIZED_ACCESS or ACCESS_DENIED<br>- eventCategory: SECURITY or AUTHORIZATION<br>- severity: WARNING or ERROR<br>- userId, username, userRole<br>- attemptedRoute captured<br>- blockReason: role violation<br>- wasBlocked: true<br>- Access denied                                                                                                                                                                                                                                                                                                      |                    |               |             |
| 21.6.9      | Audit Log Retrieval API           | 1. Call getAuditLogs() with filters<br>2. Verify results                                                                                                                                                                                                                                               | - API returns audit logs with:<br>&nbsp;&nbsp;• Pagination (limit, offset)<br>&nbsp;&nbsp;• Filters:<br>&nbsp;&nbsp;&nbsp;- Date range<br>&nbsp;&nbsp;&nbsp;- Event type<br>&nbsp;&nbsp;&nbsp;- Event category<br>&nbsp;&nbsp;&nbsp;- Severity<br>&nbsp;&nbsp;&nbsp;- User ID<br>&nbsp;&nbsp;&nbsp;- Username<br>&nbsp;&nbsp;&nbsp;- Route<br>- Results sorted by timestamp DESC<br>- Total count returned                                                                                                                                                                  |                    |               |             |
| 21.6.10     | Audit Statistics API              | 1. Call getAuditStatistics()<br>2. Verify statistics                                                                                                                                                                                                                                                   | - Returns:<br>&nbsp;&nbsp;• totalEvents<br>&nbsp;&nbsp;• blockedAttempts<br>&nbsp;&nbsp;• criticalEvents<br>&nbsp;&nbsp;• eventsByType (top 10)<br>&nbsp;&nbsp;• eventsBySeverity<br>- Date range filtering works<br>- Counts accurate                                                                                                                                                                                                                                                                                                                                      |                    |               |             |
| 21.6.11     | Audit Log Retention               | 1. Check audit logs from various dates<br>2. Verify retention policy                                                                                                                                                                                                                                   | - Security events: retained 1+ year<br>- Authentication events: 90+ days<br>- Data modification events: 7+ years (compliance)<br>- No auto-deletion currently (manual archival)<br>- All logs accessible                                                                                                                                                                                                                                                                                                                                                                    |                    |               |             |
| 21.6.12     | Admin Audit Trail Page            | 1. Login as Admin or CSC Secretary<br>2. Navigate to Audit Trail page<br>3. View and filter logs                                                                                                                                                                                                       | - Page loads with recent audit events<br>- Filters available:<br>&nbsp;&nbsp;• Event type dropdown<br>&nbsp;&nbsp;• Category dropdown<br>&nbsp;&nbsp;• Date range picker<br>&nbsp;&nbsp;• User search<br>- Table displays:<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Event type<br>&nbsp;&nbsp;• User<br>&nbsp;&nbsp;• Action/details<br>&nbsp;&nbsp;• IP address<br>&nbsp;&nbsp;• Result (blocked/allowed)<br>- Can export to CSV/PDF<br>- Pagination works<br>- Real-time updates (if polling)                                                                          |                    |               |             |
| 21.6.13     | Data Modification Category        | 1. Filter audit logs by category: DATA_MODIFICATION<br>2. View results                                                                                                                                                                                                                                 | - Shows only data modification events:<br>&nbsp;&nbsp;• REQUEST_APPROVED<br>&nbsp;&nbsp;• REQUEST_REJECTED<br>&nbsp;&nbsp;• REQUEST_SUBMITTED<br>&nbsp;&nbsp;• REQUEST_UPDATED<br>&nbsp;&nbsp;• Employee/User modifications<br>- All with detailed before/after data<br>- Employee context included                                                                                                                                                                                                                                                                         |                    |               |             |
| 21.6.14     | IP Address and User Agent Capture | 1. Make requests from different devices<br>2. Check audit logs<br>3. Verify IP and user agent captured                                                                                                                                                                                                 | - IP address captured for all events<br>- Handles proxy headers:<br>&nbsp;&nbsp;• x-forwarded-for<br>&nbsp;&nbsp;• x-real-ip<br>&nbsp;&nbsp;• cf-connecting-ip (Cloudflare)<br>- User agent string stored<br>- Device info parsed and stored<br>- Accurate for all request types                                                                                                                                                                                                                                                                                            |                    |               |             |
| 21.6.15     | Audit Log Integrity               | 1. Attempt to modify audit log via API<br>2. Verify immutability                                                                                                                                                                                                                                       | - Audit logs are INSERT-only<br>- No UPDATE or DELETE operations allowed via app<br>- Database constraints prevent tampering<br>- Timestamps server-generated (non-modifiable)<br>- Foreign key constraints enforced                                                                                                                                                                                                                                                                                                                                                        |                    |               |             |
| 21.6.16     | Console Logging                   | 1. Perform various actions<br>2. Check server console/logs                                                                                                                                                                                                                                             | - All audit events logged to console simultaneously:<br>&nbsp;&nbsp;[AUDIT] <SEVERITY> - <EVENT_TYPE>: {details}<br>- Real-time visibility<br>- Structured JSON format<br>- Useful for monitoring/debugging<br>- Can be captured by log aggregation tools                                                                                                                                                                                                                                                                                                                   |                    |               |             |

#### **Section 21.7: Security Integration Testing**

| **Case ID** | **Test Case Scenario**                  | **Test Steps**                                                                                                                                                                                                                                         | **Expected Results**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 21.7.1      | Password Expiration + Account Lockout   | 1. Set password expired beyond grace period<br>2. Attempt login                                                                                                                                                                                        | - Account locked due to password expiration<br>- loginLockoutReason: "password_expired"<br>- Cannot login<br>- Admin must unlock and reset password                                                                                                                                                                                                                                                                                                                                                                       |                    |               |             |
| 21.7.2      | Session Management + Inactivity Timeout | 1. Login (create session)<br>2. Wait 7 minutes inactive<br>3. Check session status                                                                                                                                                                     | - Session expired due to inactivity<br>- Session deleted or marked invalid<br>- Next request redirects to login<br>- Both mechanisms work together                                                                                                                                                                                                                                                                                                                                                                        |                    |               |             |
| 21.7.3      | Suspicious Login + Audit Log            | 1. Trigger suspicious login (new IP)<br>2. Verify both systems activate                                                                                                                                                                                | - Suspicious login detected<br>- Session flagged (isSuspicious = true)<br>- Audit log created with:<br>&nbsp;&nbsp;• LOGIN_SUCCESS event<br>&nbsp;&nbsp;• additionalData.suspiciousReasons<br>&nbsp;&nbsp;• Flagged in audit trail<br>- Both systems coordinated                                                                                                                                                                                                                                                          |                    |               |             |
| 21.7.4      | Account Lockout + Audit Trail           | 1. Trigger account lockout<br>2. Admin unlocks<br>3. User logs in successfully<br>4. Review complete audit trail                                                                                                                                       | - Complete audit history:<br>&nbsp;&nbsp;• Multiple LOGIN_FAILED events<br>&nbsp;&nbsp;• ACCOUNT_LOCKED event<br>&nbsp;&nbsp;• ADMIN_ACCOUNT_UNLOCK event<br>&nbsp;&nbsp;• LOGIN_SUCCESS event<br>- Full timeline visible<br>- All context preserved                                                                                                                                                                                                                                                                      |                    |               |             |
| 21.7.5      | Request Approval + Audit + Notification | 1. HRO submits request<br>2. HHRMD approves<br>3. Check all systems                                                                                                                                                                                    | - Request updated in database<br>- Employee status changed<br>- Audit log created (REQUEST_APPROVED)<br>- Notification sent to HRO<br>- All systems synchronized<br>- No data loss or inconsistency                                                                                                                                                                                                                                                                                                                       |                    |               |             |
| 21.7.6      | Security Across All User Roles          | 1. Test each security feature with each role:<br>&nbsp;&nbsp;- HRO, HHRMD, HRMO, DO, PO, CSCS, HRRP, ADMIN, EMPLOYEE<br>2. Verify consistent enforcement                                                                                               | - All security policies apply equally:<br>&nbsp;&nbsp;• Password expiration (role-based periods)<br>&nbsp;&nbsp;• Account lockout<br>&nbsp;&nbsp;• Session management<br>&nbsp;&nbsp;• Inactivity timeout<br>&nbsp;&nbsp;• Audit logging<br>- No role exceptions<br>- Admins follow same rules (except admin functions)                                                                                                                                                                                                   |                    |               |             |
| 21.7.7      | End-to-End Security Scenario            | 1. New user created<br>2. Login (first time)<br>3. Session created<br>4. Approve a request<br>5. Logout<br>6. Password nears expiration<br>7. Warning notification<br>8. Password expires<br>9. Grace period<br>10. Change password<br>11. Login again | - Complete lifecycle tracked:<br>&nbsp;&nbsp;• User creation logged<br>&nbsp;&nbsp;• First login logged<br>&nbsp;&nbsp;• Session created with 24hr expiry<br>&nbsp;&nbsp;• Approval logged with details<br>&nbsp;&nbsp;• Logout logged<br>&nbsp;&nbsp;• Warning notifications generated<br>&nbsp;&nbsp;• Password expiration activated<br>&nbsp;&nbsp;• Grace period tracking<br>&nbsp;&nbsp;• Password change resets expiration<br>&nbsp;&nbsp;• New login successful<br>- All events in audit log<br>- No gaps in trail |                    |               |             |
| 21.7.8      | Security Performance Under Load         | 1. Simulate 50 concurrent logins<br>2. Trigger various security events<br>3. Check system responsiveness                                                                                                                                               | - All logins processed<br>- Session creation handles concurrency<br>- Account lockouts tracked correctly<br>- Audit logs all created<br>- No lost events<br>- Database transactions handled<br>- Performance acceptable (< 2 sec response)                                                                                                                                                                                                                                                                                |                    |               |             |

---

## 4. Security Compliance Verification

### 4.1 Security Policy Compliance Checklist

| Security Control                          | Implementation | Test Case | Status | Notes |
| ----------------------------------------- | -------------- | --------- | ------ | ----- |
| **Password Expiration - Admin (60 days)** | ✓ Implemented  | 21.1.1    |        |       |
| **Password Expiration - Users (90 days)** | ✓ Implemented  | 21.1.2    |        |       |
| **Grace Period (7 days)**                 | ✓ Implemented  | 21.1.7    |        |       |
| **Password Warnings (14/7/3/1 days)**     | ✓ Implemented  | 21.1.3-6  |        |       |
| **Account Lockout (5 attempts)**          | ✓ Implemented  | 21.2.3    |        |       |
| **Standard Lockout (30 min)**             | ✓ Implemented  | 21.2.5    |        |       |
| **Security Lockout (11+ attempts)**       | ✓ Implemented  | 21.2.6    |        |       |
| **Manual Admin Lock/Unlock**              | ✓ Implemented  | 21.2.8-9  |        |       |
| **Max 3 Concurrent Sessions**             | ✓ Implemented  | 21.3.4    |        |       |
| **24-Hour Session Expiration**            | ✓ Implemented  | 21.3.6    |        |       |
| **7-Minute Inactivity Timeout**           | ✓ Implemented  | 21.4.4    |        |       |
| **1-Minute Warning**                      | ✓ Implemented  | 21.4.2    |        |       |
| **Suspicious Login Detection**            | ✓ Implemented  | 21.5.3-6  |        |       |
| **Audit Logging - Authentication**        | ✓ Implemented  | 21.6.1-2  |        |       |
| **Audit Logging - Data Modification**     | ✓ Implemented  | 21.6.3-5  |        |       |
| **Audit Logging - Security Events**       | ✓ Implemented  | 21.6.6-8  |        |       |
| **IP Address Tracking**                   | ✓ Implemented  | 21.6.14   |        |       |
| **User Agent Tracking**                   | ✓ Implemented  | 21.6.14   |        |       |
| **Session Token Security**                | ✓ Implemented  | 21.3.7    |        |       |
| **Audit Log Retention**                   | ✓ Implemented  | 21.6.11   |        |       |

### 4.2 Security Standards Alignment

**Tested Against:**

- Security Policy Document Version 2.0
- ISO 27001 Access Control Requirements
- Tanzania/Zanzibar Data Protection Requirements
- Industry Best Practices for Session Management
- OWASP Security Guidelines

---

## 5. Test Results Summary

### 5.1 Test Coverage

| Test Case No. | Module                                    | Number of Scenarios | Passed | Failed | Not Executed | Pass Rate |
| ------------- | ----------------------------------------- | ------------------- | ------ | ------ | ------------ | --------- |
| 1             | User Authentication and Role-Based Access | 12                  |        |        |              |           |
| 2             | Employee Confirmation Requests            | 12                  |        |        |              |           |
| 3             | Promotion Requests                        | 10                  |        |        |              |           |
| 4             | LWOP Requests                             | 8                   |        |        |              |           |
| 5             | Cadre Change Requests                     | 6                   |        |        |              |           |
| 6             | Retirement Requests                       | 8                   |        |        |              |           |
| 7             | Resignation Requests                      | 5                   |        |        |              |           |
| 8             | Service Extension Requests                | 6                   |        |        |              |           |
| 9             | Termination/Dismissal Requests            | 7                   |        |        |              |           |
| 10            | Complaint Management                      | 13                  |        |        |              |           |
| 11            | Employee Profile Management               | 10                  |        |        |              |           |
| 12            | Request Status Tracking                   | 8                   |        |        |              |           |
| 13            | Recent Activities & Audit Trail           | 7                   |        |        |              |           |
| 14            | Reports and Analytics                     | 14                  |        |        |              |           |
| 15            | Dashboard and Metrics                     | 8                   |        |        |              |           |
| 16            | User Management (Admin)                   | 12                  |        |        |              |           |
| 17            | Institution Management (Admin)            | 10                  |        |        |              |           |
| 18            | HRIMS Integration                         | 13                  |        |        |              |           |
| 19            | File Upload & Document Management         | 11                  |        |        |              |           |
| 20            | Notifications System                      | 12                  |        |        |              |           |
| **21**        | **Security Features (NEW)**               | **72**              |        |        |              |           |
|               | **21.1 Password Expiration Policy**       | 12                  |        |        |              |           |
|               | **21.2 Account Lockout Policy**           | 12                  |        |        |              |           |
|               | **21.3 Session Management**               | 12                  |        |        |              |           |
|               | **21.4 Inactivity Timeout**               | 10                  |        |        |              |           |
|               | **21.5 Suspicious Login Detection**       | 12                  |        |        |              |           |
|               | **21.6 Comprehensive Audit Logging**      | 16                  |        |        |              |           |
|               | **21.7 Security Integration Testing**     | 8                   |        |        |              |           |
| **TOTAL**     |                                           | **244**             |        |        |              |           |

### 5.2 Defect Summary

| Severity          | Count | Description                                 |
| ----------------- | ----- | ------------------------------------------- |
| **Critical**      |       | System unusable, data loss, security breach |
| **High**          |       | Major functionality broken, no workaround   |
| **Medium**        |       | Functionality broken but workaround exists  |
| **Low**           |       | Minor issues, cosmetic problems             |
| **Enhancement**   |       | Suggested improvements                      |
| **TOTAL DEFECTS** |       |                                             |

### 5.3 Test Execution Summary

| Metric                   | Value | Notes                                 |
| ------------------------ | ----- | ------------------------------------- |
| **Total Test Scenarios** | 244   | 172 from v1.0 + 72 security scenarios |
| **Scenarios Executed**   |       |                                       |
| **Scenarios Passed**     |       |                                       |
| **Scenarios Failed**     |       |                                       |
| **Scenarios Blocked**    |       |                                       |
| **Not Executed**         |       |                                       |
| **Pass Rate**            |       | Target: ≥ 95%                         |
| **Test Start Date**      |       |                                       |
| **Test End Date**        |       |                                       |
| **Test Duration**        |       |                                       |
| **Testers Involved**     |       |                                       |

### 5.4 Security Test Results (NEW)

| Security Control            | Scenarios | Passed | Failed | Compliance Status |
| --------------------------- | --------- | ------ | ------ | ----------------- |
| Password Expiration Policy  | 12        |        |        |                   |
| Account Lockout Policy      | 12        |        |        |                   |
| Session Management          | 12        |        |        |                   |
| Inactivity Timeout          | 10        |        |        |                   |
| Suspicious Login Detection  | 12        |        |        |                   |
| Comprehensive Audit Logging | 16        |        |        |                   |
| Security Integration        | 8         |        |        |                   |
| **TOTAL SECURITY**          | **72**    |        |        |                   |

**Security Compliance Target:** 100% (All security controls must pass)

### 5.5 Known Issues and Limitations

| Issue ID | Description | Severity | Workaround | Status | Target Resolution |
| -------- | ----------- | -------- | ---------- | ------ | ----------------- |
|          |             |          |            |        |                   |

### 5.6 Test Environment Issues

| Issue | Description | Impact | Resolution |
| ----- | ----------- | ------ | ---------- |
|       |             |        |            |

---

## 6. Sign-Off

### 6.1 UAT Completion Sign-Off

I hereby certify that User Acceptance Testing for the Civil Service Management System (CSMS) Version 2.0 has been completed according to this test plan and that the system:

**Core Functionality:**

- ☐ Meets all specified business requirements for civil service HR management
- ☐ All 9 user roles function correctly with appropriate permissions
- ☐ All 8 request types work through complete approval workflows
- ☐ Role-based access control functions properly (CSC vs Institution-based)
- ☐ Data isolation between institutions is maintained
- ☐ File upload and document management works correctly (MinIO)
- ☐ Notification system functions in English and Swahili
- ☐ Employee status restrictions are enforced
- ☐ All 10 report types generate correctly with bilingual columns
- ☐ Dashboard metrics are accurate and real-time
- ☐ HRIMS integration functions as expected (if applicable)

**Security Requirements (NEW in v2.0):**

- ☐ Password expiration policy enforced (Admin: 60 days, Users: 90 days)
- ☐ Password warning notifications generated (14/7/3/1 days)
- ☐ Grace period functionality works (7 days)
- ☐ Account lockout after 5 failed attempts (30-minute lockout)
- ☐ Security lockout after 11+ failed attempts (admin unlock required)
- ☐ Manual admin lock/unlock functionality works
- ☐ Session management limits to 3 concurrent sessions
- ☐ 24-hour absolute session expiration enforced
- ☐ 7-minute inactivity timeout auto-logout works
- ☐ 1-minute warning before timeout displayed
- ☐ Suspicious login detection identifies anomalies
- ☐ Comprehensive audit logging captures all critical events
- ☐ IP address and user agent tracking implemented
- ☐ Request approval/rejection audit trail complete
- ☐ All security events logged with proper severity levels
- ☐ Audit log retention meets compliance requirements

**System Quality:**

- ☐ Performance is acceptable under expected load
- ☐ Security requirements are met and tested
- ☐ All critical and high priority defects resolved
- ☐ System is stable and production-ready
- ☐ **Is ready for production deployment**

| Role                                        | Name | Signature | Date |
| ------------------------------------------- | ---- | --------- | ---- |
| **Civil Service Commission Representative** |      |           |      |
| **Project Manager**                         |      |           |      |
| **UAT Lead**                                |      |           |      |
| **HR Director**                             |      |           |      |
| **IT Manager**                              |      |           |      |
| **Information Security Officer**            |      |           |      |
| **Business Analyst**                        |      |           |      |

### 6.2 Conditions for Production Release

**Pre-Deployment Checklist:**

☐ All critical defects resolved
☐ All high priority defects resolved
☐ Medium priority defects documented with workarounds
☐ User roles and permissions verified and approved
☐ Test data cleansed from production database
☐ Production user accounts created for all institutions

**Security Readiness (NEW):**

☐ All 72 security test scenarios passed
☐ Password expiration policy configured and tested
☐ Account lockout policy active and verified
☐ Session management limits enforced
☐ Inactivity timeout configured (7 minutes)
☐ Audit logging enabled for all events
☐ Security monitoring dashboard operational
☐ Incident response procedures documented
☐ Security admin accounts created and tested
☐ Password reset procedures tested
☐ Account unlock procedures verified

**Documentation and Training:**

☐ User training completed for all roles
☐ Security awareness training conducted
☐ User documentation finalized (manuals, guides)
☐ Security policy document distributed
☐ System administration procedures documented
☐ Security incident response plan documented

**Technical Readiness:**

☐ Backup and recovery procedures tested
☐ Production environment configured and tested
☐ MinIO storage configured for production
☐ HRIMS integration tested in production (if applicable)
☐ Rollback plan prepared and tested
☐ Production deployment plan reviewed and approved
☐ Support team trained and ready
☐ Monitoring and alerting configured
☐ Security event logging configured

**Approvals:**

☐ Stakeholder approval received
☐ Security team sign-off obtained
☐ IT management approval received
☐ Business owner approval obtained

---

## 7. Appendix

### 7.1 Test User Accounts Reference

| Role     | Username | Password    | Institution          | Access Level                 | Primary Functions               |
| -------- | -------- | ----------- | -------------------- | ---------------------------- | ------------------------------- |
| HRO      | kmnyonge | password123 | Institution-specific | Institution only             | Submit HR requests              |
| HHRMD    | skhamis  | password123 | CSC                  | All institutions             | Approve HR & Disciplinary       |
| HRMO     | fiddi    | password123 | CSC                  | All institutions             | Approve HR requests only        |
| DO       | mussi    | password123 | CSC                  | All institutions             | Handle complaints, terminations |
| PO       | mishak   | password123 | CSC                  | All institutions (read-only) | View reports only               |
| CSCS     | zhaji    | password123 | CSC                  | All institutions             | Executive oversight             |
| HRRP     | kmhaji   | password123 | Institution-specific | Institution only             | Institutional supervision       |
| ADMIN    | akassim  | password123 | System-wide          | All system data              | System management               |
| EMPLOYEE | (varies) | N/A         | Own data only        | Personal data                | Submit complaints, view profile |

**Employee Login:** Requires ZanID + Payroll Number + ZSSF Number

**Security Testing Accounts:** Additional test accounts should be created with varying password ages, lockout statuses, and session configurations for comprehensive security testing.

### 7.2 Request Type Summary

| Request Type          | Database Model          | Approvers   | Status Change on Approval     | Special Fields                     |
| --------------------- | ----------------------- | ----------- | ----------------------------- | ---------------------------------- |
| Confirmation          | ConfirmationRequest     | HHRMD, HRMO | On Probation → Confirmed      | confirmationDate                   |
| Promotion             | PromotionRequest        | HHRMD, HRMO | Updates cadre                 | promotionType, proposedCadre       |
| LWOP                  | LwopRequest             | HHRMD, HRMO | Active → On LWOP              | duration, startDate, endDate       |
| Cadre Change          | CadreChangeRequest      | HHRMD, HRMO | Updates cadre                 | newCadre, studiedOutsideCountry    |
| Retirement            | RetirementRequest       | HHRMD, HRMO | Active → Retired              | retirementType, illnessDescription |
| Resignation           | ResignationRequest      | HHRMD, HRMO | Active → Resigned             | effectiveDate                      |
| Service Extension     | ServiceExtensionRequest | HHRMD, HRMO | Extends retirementDate        | requestedExtensionPeriod           |
| Termination/Dismissal | SeparationRequest       | HHRMD, DO   | Active → Terminated/Dismissed | type (TERMINATION/DISMISSAL)       |
| Complaint             | Complaint               | HHRMD, DO   | Various review statuses       | complaintType, case ID             |

### 7.3 Employee Status Codes

| Status       | Description                   | Can Submit Requests                                        | Notes                         |
| ------------ | ----------------------------- | ---------------------------------------------------------- | ----------------------------- |
| On Probation | Initial hiring period         | Limited (no LWOP, Promotion, Cadre, Extension, Retirement) | Must complete probation first |
| Confirmed    | Passed probation              | Yes (all except Confirmation again)                        | Full active status            |
| On LWOP      | Leave without pay             | No (cannot submit new requests)                            | Temporary status              |
| Retired      | Employment ended (retirement) | No                                                         | Final status                  |
| Resigned     | Voluntarily left              | No                                                         | Final status                  |
| Terminated   | Involuntary separation        | No                                                         | Final status                  |
| Dismissed    | Disciplinary separation       | No                                                         | Final status                  |

### 7.4 File Upload Specifications

| Aspect                | Specification                                                                     |
| --------------------- | --------------------------------------------------------------------------------- |
| **Allowed File Type** | PDF only                                                                          |
| **Maximum File Size** | 2MB                                                                               |
| **Storage System**    | MinIO S3-Compatible Object Storage                                                |
| **Validation**        | Client-side and server-side                                                       |
| **Features**          | Upload, Download, Preview (in-browser)                                            |
| **Organization**      | By type: request-documents/, employee-photos/, employee-documents/, certificates/ |

### 7.5 Report Types and Swahili Translations

| Report Type              | Swahili Name                        | Includes                    | Export Formats |
| ------------------------ | ----------------------------------- | --------------------------- | -------------- |
| Confirmation Report      | Ripoti ya Kuthibitishwa Kazini      | All confirmations           | PDF, Excel     |
| Promotion Report         | Ripoti ya Kupandishwa Cheo          | All promotions (both types) | PDF, Excel     |
| LWOP Report              | Ripoti ya Likizo Bila Malipo        | All LWOP requests           | PDF, Excel     |
| Cadre Change Report      | Ripoti ya Kubadilishwa Kada         | All cadre changes           | PDF, Excel     |
| Retirement Report        | Ripoti ya Kustaafu                  | All 3 retirement types      | PDF, Excel     |
| Resignation Report       | Ripoti ya Kuacha Kazi               | All resignations            | PDF, Excel     |
| Service Extension Report | Ripoti ya Nyongeza ya Utumishi      | All service extensions      | PDF, Excel     |
| Termination Report       | Ripoti ya Kufukuzwa/Kuachishwa Kazi | Terminations & dismissals   | PDF, Excel     |
| Complaints Report        | Ripoti ya Malalamiko                | All complaints              | PDF, Excel     |
| All Requests             | Ripoti ya Maombi Yote               | Combined view               | PDF, Excel     |

### 7.6 Status Translation Reference

| English Status                    | Swahili Translation        |
| --------------------------------- | -------------------------- |
| Approved / Approved by Commission | Imekamilika                |
| Pending                           | Inasubiri                  |
| Rejected                          | Imekataliwa                |
| Under Review                      | Inakaguliwa                |
| More Info Requested               | Taarifa Zaidi Zinahitajika |
| Resolved                          | Imetatuliwa                |

### 7.7 Security Configuration Reference (NEW)

| Security Control                | Configuration               | Value                      |
| ------------------------------- | --------------------------- | -------------------------- |
| **Password Expiration - Admin** | Days before expiration      | 60 days                    |
| **Password Expiration - Users** | Days before expiration      | 90 days                    |
| **Grace Period**                | Days after expiration       | 7 days                     |
| **Warning Level 1**             | Days before expiration      | 14 days                    |
| **Warning Level 2**             | Days before expiration      | 7 days                     |
| **Warning Level 3**             | Days before expiration      | 3 days                     |
| **Warning Level 4**             | Days before expiration      | 1 day                      |
| **Failed Login Threshold**      | Attempts before lockout     | 5 attempts                 |
| **Standard Lockout Duration**   | Auto-unlock time            | 30 minutes                 |
| **Security Lockout Threshold**  | Attempts for permanent lock | 11+ attempts               |
| **Max Concurrent Sessions**     | Sessions per user           | 3 sessions                 |
| **Absolute Session Expiration** | Maximum session lifetime    | 24 hours                   |
| **Inactivity Timeout**          | Minutes before auto-logout  | 7 minutes                  |
| **Inactivity Warning**          | Warning before timeout      | 1 minute                   |
| **Session Token Length**        | Characters (hexadecimal)    | 64 characters (256-bit)    |
| **Password Hash Algorithm**     | bcrypt rounds               | 10 salt rounds             |
| **Suspicious Login Window**     | Historical session window   | 30 days / last 10 sessions |
| **Audit Log Retention**         | Minimum retention period    | 1-7 years (by type)        |

### 7.8 Technology Stack Reference

| Component               | Technology            | Version/Details                           |
| ----------------------- | --------------------- | ----------------------------------------- |
| **Framework**           | Next.js               | 14 (App Router)                           |
| **Database**            | PostgreSQL            | with Prisma ORM                           |
| **Storage**             | MinIO                 | S3-compatible object storage              |
| **Authentication**      | Session-based         | bcryptjs for password hashing (10 rounds) |
| **Session Security**    | HTTP-only Cookies     | Secure, SameSite=Lax                      |
| **State Management**    | Zustand               | For auth state                            |
| **Validation**          | Zod                   | + React Hook Form                         |
| **UI Components**       | Radix UI              | + shadcn/ui components                    |
| **Styling**             | Tailwind CSS          | Utility-first CSS                         |
| **Charts**              | Recharts              | Dashboard visualizations                  |
| **PDF Generation**      | jsPDF                 | + jsPDF-autotable for reports             |
| **Excel Export**        | XLSX                  | Library for Excel files                   |
| **AI Integration**      | Google Genkit         | (if complaint rewriting tested)           |
| **Audit Logging**       | Custom Implementation | INSERT-only with Prisma                   |
| **Security Monitoring** | Custom Dashboard      | Real-time event tracking                  |

### 7.9 Glossary

| Term                   | Definition                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| **CSMS**               | Civil Service Management System                                      |
| **CSC**                | Civil Service Commission - Central HR authority in Zanzibar          |
| **HRO**                | HR Officer - Institution-based role that submits requests            |
| **HHRMD**              | Head of Human Resources Management Development - Senior CSC approver |
| **HRMO**               | Human Resource Management Officer - CSC approver for HR requests     |
| **DO**                 | Disciplinary Officer - Handles complaints and terminations           |
| **PO**                 | Planning Officer - Read-only access to reports                       |
| **CSCS**               | Civil Service Commission Secretary - Executive oversight             |
| **HRRP**               | Human Resource Responsible Personnel - Institutional supervisor      |
| **LWOP**               | Leave Without Pay                                                    |
| **ZanID**              | Zanzibar National ID Number                                          |
| **ZSSF**               | Zanzibar Social Security Fund Number                                 |
| **MinIO**              | Object storage system for files and documents                        |
| **HRIMS**              | Human Resource Information Management System (external)              |
| **UAT**                | User Acceptance Testing                                              |
| **Grace Period**       | Period after password expiration where login still allowed (7 days)  |
| **Standard Lockout**   | 30-minute auto-unlock lockout after 5 failed attempts                |
| **Security Lockout**   | Permanent lockout after 11+ failed attempts (admin unlock required)  |
| **Session Token**      | 256-bit cryptographic token for session authentication               |
| **Inactivity Timeout** | Auto-logout after 7 minutes of no activity                           |
| **Suspicious Login**   | Login flagged due to new IP, device, or rapid changes                |
| **Audit Trail**        | Complete log of all system events and data modifications             |
| **bcrypt**             | Password hashing algorithm with 10 salt rounds                       |

### 7.10 Common Test Scenarios Matrix

| Scenario                    | HRO | HHRMD | HRMO | DO  | EMPLOYEE | ADMIN      |
| --------------------------- | --- | ----- | ---- | --- | -------- | ---------- |
| Submit Confirmation Request | ✓   | ✗     | ✗    | ✗   | ✗        | ✗          |
| Approve Confirmation        | ✗   | ✓     | ✓    | ✗   | ✗        | ✗          |
| Submit Complaint            | ✗   | ✗     | ✗    | ✗   | ✓        | ✗          |
| Handle Complaint            | ✗   | ✓     | ✗    | ✓   | ✗        | ✗          |
| Approve Termination         | ✗   | ✓     | ✗    | ✓   | ✗        | ✗          |
| View All Institutions       | ✗   | ✓     | ✓    | ✓   | ✗        | ✓          |
| Generate Reports            | ✗   | ✓     | ✓    | ✓   | ✗        | ✓          |
| View Reports Only           | ✗   | ✗     | ✗    | ✗   | ✗        | PO role    |
| Create Users                | ✗   | ✗     | ✗    | ✗   | ✗        | ✓          |
| Create Institutions         | ✗   | ✗     | ✗    | ✗   | ✗        | ✓          |
| HRIMS Integration           | ✗   | ✗     | ✗    | ✗   | ✗        | ✓          |
| Unlock User Account         | ✗   | ✗     | ✗    | ✗   | ✗        | ✓          |
| Reset User Password         | ✗   | ✗     | ✗    | ✗   | ✗        | ✓          |
| View Audit Logs             | ✗   | ✗     | ✗    | ✗   | ✗        | ✓ (+ CSCS) |

### 7.11 Audit Event Types Reference (NEW)

| Event Type           | Category          | Severity         | Description                           | Retention |
| -------------------- | ----------------- | ---------------- | ------------------------------------- | --------- |
| LOGIN_SUCCESS        | AUTHENTICATION    | INFO             | Successful user login                 | 90 days   |
| LOGIN_FAILED         | AUTHENTICATION    | WARNING          | Failed login attempt                  | 90 days   |
| LOGOUT               | AUTHENTICATION    | INFO             | User logout                           | 90 days   |
| SESSION_EXPIRED      | AUTHENTICATION    | INFO             | Session timeout or expiration         | 90 days   |
| PASSWORD_CHANGED     | SECURITY          | INFO             | User changed password                 | 1+ year   |
| PASSWORD_RESET       | SECURITY          | WARNING          | Admin reset user password             | 1+ year   |
| ACCOUNT_LOCKED       | SECURITY          | WARNING/CRITICAL | Account locked (standard or security) | 1+ year   |
| ADMIN_ACCOUNT_LOCK   | SECURITY          | WARNING          | Admin manually locked account         | 1+ year   |
| ADMIN_ACCOUNT_UNLOCK | SECURITY          | INFO             | Admin unlocked account                | 1+ year   |
| REQUEST_SUBMITTED    | DATA_MODIFICATION | INFO             | New request created                   | 7+ years  |
| REQUEST_APPROVED     | DATA_MODIFICATION | INFO             | Request approved                      | 7+ years  |
| REQUEST_REJECTED     | DATA_MODIFICATION | WARNING          | Request rejected                      | 7+ years  |
| REQUEST_UPDATED      | DATA_MODIFICATION | INFO             | Request details modified              | 7+ years  |
| UNAUTHORIZED_ACCESS  | AUTHORIZATION     | WARNING          | Role-based access violation           | 1+ year   |
| ACCESS_DENIED        | SECURITY          | ERROR            | Access blocked                        | 1+ year   |
| SUSPICIOUS_LOGIN     | SECURITY          | WARNING/ERROR    | Login from new IP/device              | 1+ year   |
| DATA_EXPORT          | DATA_MODIFICATION | INFO             | Report or data exported               | 7+ years  |

### 7.12 Security Test Data Requirements (NEW)

| Test Data Type                 | Quantity  | Purpose                   | Configuration                                    |
| ------------------------------ | --------- | ------------------------- | ------------------------------------------------ |
| **Expired Password Accounts**  | 5+        | Test password expiration  | Set password dates: 61, 91, 100, 65, 95 days ago |
| **Near Expiration Accounts**   | 4         | Test warning levels       | Set passwords to expire in: 14, 7, 3, 1 days     |
| **Grace Period Accounts**      | 3         | Test grace period         | Passwords expired: 1, 4, 7 days ago              |
| **Lockout Test Accounts**      | 5         | Test account lockout      | Clean accounts for failed login tests            |
| **Multi-Session Users**        | 3         | Test concurrent sessions  | Accounts for 1, 2, 3+ sessions                   |
| **Multi-Device Test Accounts** | 2         | Test device detection     | Access from PC, mobile, tablet                   |
| **Historical Login Data**      | All users | Test suspicious detection | Minimum 30 days of login history                 |

---

**End of UAT Document**

_Version: 2.0_
_Date: December 27, 2025_
_Previous Version: 1.0 (December 23, 2025)_
_Document Status: Ready for UAT Execution_
_Major Updates: Comprehensive Security Testing (72 new test scenarios)_
_System URL: https://csms.zanajira.go.tz_
_Security Policy Reference: Security_Policy_Document_v2.md_

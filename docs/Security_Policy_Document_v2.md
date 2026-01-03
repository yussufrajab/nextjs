# SECURITY POLICY DOCUMENT - VERSION 2.0

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item                 | Details                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| **Document Title**   | Security Policy Document - Civil Service Management System (Version 2.0) |
| **Project Name**     | Civil Service Management System (CSMS)                                   |
| **Version**          | 2.0                                                                      |
| **Date Prepared**    | December 27, 2025                                                        |
| **Effective Date**   | January 1, 2026                                                          |
| **Review Date**      | January 1, 2027                                                          |
| **Classification**   | RESTRICTED                                                               |
| **Approved By**      | Civil Service Commission                                                 |
| **Document Owner**   | Chief Information Security Officer                                       |
| **Previous Version** | 1.0 (December 26, 2025)                                                  |

---

## Revision Summary

### Version 2.0 Changes

This version reflects **implemented security enhancements** based on the Security Policy requirements:

**New Implementations:**

1. **Comprehensive Audit Logging System** - Full event tracking for security and compliance
2. **Password Expiration Policy** - Role-based password aging with grace periods
3. **Account Lockout Policy** - Automated lockout after failed login attempts
4. **Session Management** - Concurrent session limits and suspicious login detection
5. **Inactivity Timeout** - Automatic logout after 7 minutes of inactivity
6. **Enhanced Authentication** - Multi-factor credential validation for employees
7. **Data Modification Tracking** - Detailed audit trail for all request approvals/rejections

**Status Updates:**

- Password policy: Enhanced from basic to comprehensive
- Session management: From planned to fully implemented
- Audit logging: From basic to enterprise-grade
- Access control: Enhanced with suspicious activity detection

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Security Objectives](#2-security-objectives)
3. [Security Standards](#3-security-standards)
4. [Acceptable Use Policy](#4-acceptable-use-policy)
5. [Password Policy](#5-password-policy) - **UPDATED**
6. [Access Control Policy](#6-access-control-policy) - **UPDATED**
7. [Session Management Policy](#7-session-management-policy) - **NEW**
8. [Account Lockout Policy](#8-account-lockout-policy) - **NEW**
9. [Audit and Logging Policy](#9-audit-and-logging-policy) - **UPDATED**
10. [Data Protection Policy](#10-data-protection-policy)
11. [Network Security Policy](#11-network-security-policy)
12. [Physical Security Policy](#12-physical-security-policy)
13. [Incident Response Policy](#13-incident-response-policy)
14. [Compliance and Audit](#14-compliance-and-audit)
15. [Policy Enforcement](#15-policy-enforcement)
16. [Appendices](#16-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Security Policy Document establishes the security framework for the Civil Service Management System (CSMS) to protect the confidentiality, integrity, and availability of civil service employee information and HR management processes. This policy applies to all users, administrators, and systems that interact with CSMS.

**Version 2.0 Update:** This version documents the **actual implemented security controls** deployed in production, including comprehensive audit logging, password expiration, account lockout, and session management features.

### 1.2 Scope

This policy covers:

- All CSMS users (9 user roles)
- All system components (application, database, storage)
- All data processed by CSMS
- All access methods (web, employee portal)
- All integration points (HRIMS, MinIO)
- All physical and virtual infrastructure

### 1.3 Applicability

This policy applies to:

**Personnel:**

- Civil Service Commission staff
- HR Officers (HRO)
- HR Management Officers (HRMO, HHRMD)
- Disciplinary Officers (DO)
- Planning Officers (PO)
- CSC Secretaries (CSCS)
- Institutional HR Personnel (HRRP)
- System Administrators
- IT Support Staff
- Third-party contractors
- Civil service employees

**Systems:**

- CSMS application (https://csms.zanajira.go.tz)
- Employee portal (https://employee.zanajira.go.tz)
- PostgreSQL database
- MinIO object storage
- HRIMS integration
- Supporting infrastructure

### 1.4 Authority

This policy is authorized by the Civil Service Commission of Zanzibar and is binding on all users. Non-compliance may result in:

- Suspension of system access
- Disciplinary action
- Legal prosecution (for criminal violations)
- Contract termination (for contractors)

### 1.5 Policy Review

This policy shall be reviewed:

- Annually on January 21st
- Following significant security incidents
- Upon major system changes
- When regulatory requirements change
- At the discretion of the Chief Information Security Officer (CISO)

---

## 2. Security Objectives

### 2.1 Primary Security Objectives

The CSMS security program aims to achieve the following objectives:

#### 2.1.1 Confidentiality

**Objective:** Protect sensitive civil service employee information from unauthorized disclosure.

**Implementation:**

- Role-based access control (RBAC)
- Data encryption in transit (HTTPS/TLS)
- Secure authentication mechanisms
- Comprehensive access logging and monitoring
- Data classification and handling procedures
- Need-to-know access principles
- Session management and timeout controls

**Protected Information:**

- Personal Identifiable Information (PII):
  - ZanID numbers
  - Payroll numbers
  - ZSSF numbers
  - Phone numbers
  - Contact addresses
  - Dates of birth
- Employment information:
  - Salary scales
  - Performance evaluations
  - Disciplinary records
  - Complaints and grievances
- HR request details
- Institutional data

#### 2.1.2 Integrity

**Objective:** Ensure accuracy and completeness of data throughout its lifecycle.

**Implementation:**

- Input validation on all forms
- Database constraints and foreign keys
- Audit trails for all modifications
- Checksums for file uploads
- Transaction logging
- Regular data integrity checks
- Backup and recovery procedures

**Protected Processes:**

- Employee status changes
- Request approvals and rejections
- Cadre updates
- Document uploads
- User account modifications
- Institution management

#### 2.1.3 Availability

**Objective:** Ensure CSMS is available to authorized users when needed.

**Implementation:**

- 99.5% uptime target
- Regular system maintenance
- Backup and disaster recovery plans
- Automated monitoring and alerting
- Redundancy for critical components
- Performance optimization
- DDoS protection

**Service Levels:**

- System availability: 24/7/365
- Support hours: Monday-Friday, 8:00-15:00 EAT
- Emergency support: 24/7
- Maximum planned downtime: 4 hours/month
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours

### 2.2 Secondary Security Objectives

#### 2.2.1 Accountability

**Objective:** Ensure all actions can be attributed to specific users.

**Implementation:**

- Unique user accounts (no shared accounts)
- Comprehensive audit logging system
  - Login/logout tracking
  - Request approval/rejection logging
  - Data modification tracking
  - Unauthorized access attempts
  - Administrative actions
- Non-repudiation mechanisms
- Session tracking with device and IP information
- Action attribution in all records

#### 2.2.2 Privacy

**Objective:** Protect individual privacy rights in accordance with Zanzibar data protection laws.

**Implementation:**

- Privacy by design principles
- Data minimization
- Purpose limitation
- Consent management
- Right to access personal data
- Data retention policies

#### 2.2.3 Compliance

**Objective:** Ensure compliance with legal, regulatory, and policy requirements.

**Implementation:**

- Regular compliance audits
- Policy adherence monitoring
- Documentation of compliance activities
- Remediation of non-compliance
- Staff training and awareness

### 2.3 Security Metrics

**Key Performance Indicators (KPIs):**

| Metric                             | Target           | Measurement Frequency | Status      |
| ---------------------------------- | ---------------- | --------------------- | ----------- |
| System Availability                | 99.5%            | Monthly               | ✓ Monitored |
| Unauthorized Access Attempts       | < 10/month       | Monthly               | ✓ Logged    |
| Security Incidents                 | 0 critical/month | Monthly               | ✓ Tracked   |
| Password Policy Compliance         | 100%             | Quarterly             | ✓ Enforced  |
| Account Lockouts (Failed Attempts) | Tracked          | Real-time             | ✓ Automated |
| Security Training Completion       | 100% annually    | Annually              | Manual      |
| Vulnerability Remediation          | < 30 days        | Continuous            | Manual      |
| Backup Success Rate                | 100%             | Daily                 | ✓ Monitored |
| Audit Log Retention                | 90 days minimum  | Continuous            | ✓ Automated |
| Session Timeout Compliance         | 100%             | Real-time             | ✓ Enforced  |

---

## 5. Password Policy

### 5.1 Purpose

This Password Policy establishes requirements for password creation, management, and protection to prevent unauthorized access to CSMS.

**Version 2.0 Update:** This section reflects the **implemented password expiration and management system** with role-based expiration periods, grace periods, and automated warnings.

### 5.2 Password Requirements

#### 5.2.1 Password Complexity

**Enhanced Implemented Requirements :**

- **Minimum length**: 8 characters
- **Character types**: Must include at least one of:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&\*()\_+-=[]{}|;:,.<>?)

**Prohibited Passwords:**

- Dictionary words
- Personal information (name, birth date, ZanID, etc.)
- Common passwords (password, 123456, admin, etc.)
- Sequential characters (abc123, qwerty, etc.)
- Repeated characters (aaaa, 1111, etc.)
- Previously used passwords (last 5 passwords)
- Institution name
- Role name

#### 5.2.2 Password Creation

**Process:**

1. **Initial Password Assignment**:
   - Administrator assigns temporary password
   - Temporary password must be changed on first login
   - Temporary password valid for 7 days only

2. **User Password Change**:
   - Current password required
   - New password must meet complexity requirements
   - Confirmation required
   - Password expiration automatically

3. **Password Validation**:
   - Real-time strength indicator
   - Complexity check before acceptance
   - History check (prevent reuse)

### 5.3 Password Expiration - **IMPLEMENTED**

#### 5.3.1 Expiration Periods

**Implemented Policy:**

| User Role                            | Expiration Period  | Implementation Status |
| ------------------------------------ | ------------------ | --------------------- |
| **Administrators**                   | 60 days            | ✓ IMPLEMENTED         |
| **Standard Users** (All other roles) | 90 days            | ✓ IMPLEMENTED         |
| **Service Accounts**                 | 180 days (planned) | Planned               |

**System Implementation:**

- Password expiration calculated from last password change
- Expiration date stored in `passwordExpiresAt` field
- Automated daily checks for expiring passwords
- Cron job runs password expiration checks

#### 5.3.2 Grace Period - **IMPLEMENTED**

**Grace Period Configuration:**

- **Duration**: 7 days after expiration
- **Purpose**: Allow users to change expired passwords without admin intervention
- **Status**: ✓ IMPLEMENTED

**Grace Period Behavior:**

1. Password expires at `passwordExpiresAt`
2. Grace period starts automatically
3. User can still login but must change password
4. After grace period expires:
   - Account locked
   - Admin unlock required

#### 5.3.3 Warning Notifications - **IMPLEMENTED**

**Warning Levels:**

| Days Before Expiration | Warning Level | Action                     | Status        |
| ---------------------- | ------------- | -------------------------- | ------------- |
| 14 days                | Level 1       | First warning notification | ✓ IMPLEMENTED |
| 7 days                 | Level 2       | Second warning             | ✓ IMPLEMENTED |
| 3 days                 | Level 3       | Urgent warning             | ✓ IMPLEMENTED |
| 1 day                  | Level 4       | Final warning              | ✓ IMPLEMENTED |
| 0 days (expired)       | Level 5       | Grace period activated     | ✓ IMPLEMENTED |

**Warning Mechanism:**

- Automated daily cron job checks expiration status
- Notifications created in database
- Last warning level tracked to prevent duplicate warnings
- Progressive warning system

### 5.4 Password Management

#### 5.4.1 Password Protection

**User Responsibilities:**

**MUST:**

- ✓ Keep passwords confidential
- ✓ Memorize passwords (do not write down)
- ✓ Use password manager if needed (approved tools only)
- ✓ Create unique password for CSMS
- ✓ Logout when leaving workstation unattended
- ✓ Change password immediately if compromised
- ✓ Report lost/stolen credentials immediately
- ✓ Change password before grace period expires

**MUST NOT:**

- ✗ Share password with anyone
- ✗ Write password on paper
- ✗ Store password in plain text file
- ✗ Send password via email or messaging
- ✗ Use same password for multiple systems
- ✗ Reveal password to IT support (they should reset, not ask)
- ✗ Auto-save password in browser (on shared computers)
- ✗ Ignore password expiration warnings

#### 5.4.2 Password Storage

**System Requirements:**

- Passwords hashed using bcrypt
- Salt rounds: 10 minimum
- Unique salt per password
- No reversible encryption
- No plaintext storage ever
- Hashes not logged or displayed

**Administrator Obligations:**

- Cannot view user passwords
- Can only reset passwords
- Must follow same password rules
- Additional security training required
- Can unlock accounts after password expiration

#### 5.4.3 Password Expiration Tracking - **IMPLEMENTED**

**Database Fields:**

- `passwordExpiresAt`: Date when password expires
- `lastPasswordChange`: Date of last password change
- `gracePeriodStartedAt`: Date grace period began
- `lastExpirationWarningLevel`: Last warning level sent (0-5)

**Automated Processes:**

- Cron job checks password expiration daily
- Sends warning notifications based on warning levels
- Activates grace period on expiration
- Locks accounts after grace period
- Updates warning levels automatically

### 5.5 Password Reset

#### 5.5.1 Standard Password Reset Process

**User-Initiated Reset:**

1. User contacts system administrator (if locked)
2. Administrator verifies identity:
   - Full name
   - Institution
   - Employee ID or ZanID
3. Administrator resets password using admin interface
4. Temporary password communicated securely (in person or secure channel)
5. User must change on first login
6. Password reset logged in audit trail
7. **Password expiration automatically recalculated** (IMPLEMENTED)

**Security Considerations:**

- Identity verification required
- No password reset via email/phone without verification
- Temporary password valid 7 days
- Previous password invalidated immediately
- Account unlocked if locked due to expiration

#### 5.5.2 Emergency Reset

**For Compromised Accounts:**

1. Immediate password invalidation
2. Active sessions terminated
3. Account locked temporarily
4. Security review initiated
5. User notified
6. Incident logged
7. Password reset after verification
8. **New password expiration set** (IMPLEMENTED)

#### 5.5.3 Administrator Password Reset

**Special Procedures:**

- Requires two administrators (recommended)
- Approval from supervisor required
- Enhanced identity verification
- Logged with detailed justification
- Security review triggered
- **Password expiration automatically set** (IMPLEMENTED)

### 5.6 Multi-Factor Authentication (MFA)

**Current Status:**

- Not implemented (planned for future)

**Employee Authentication:**

- **Three-Factor Credential System** (IMPLEMENTED):
  - ZanID number
  - Payroll number
  - ZSSF number
- All three credentials required for employee login
- Provides enhanced security over single-factor

**Recommended MFA Implementation (Future):**

- **Phase 1**: MFA for administrators and HHRMD
- **Phase 2**: MFA for all CSC roles (HRMO, DO, CSCS)
- **Phase 3**: MFA for all users

**MFA Methods:**

- SMS one-time password (OTP)
- Email OTP
- Authenticator app (Google Authenticator, Microsoft Authenticator)
- Hardware tokens (for high-security accounts)

### 5.7 Password Policy Compliance

#### 5.7.1 Monitoring - **IMPLEMENTED**

**Automated Compliance Checks:**

- ✓ Password age monitoring (cron job)
- ✓ Failed login attempt tracking
- ✓ Password expiration warning generation
- ✓ Grace period tracking
- ✓ Account lockout for expired passwords

**Manual Compliance Checks:**

- Password complexity validation
- Shared account detection
- Weak password identification

#### 5.7.2 Enforcement - **IMPLEMENTED**

**Automated Enforcement:**

- ✓ Password expiration enforcement (60/90 days)
- ✓ Grace period enforcement (7 days)
- ✓ Account lockout after grace period
- ✓ Warning notification generation
- ✓ Password reset workflow
- ✓ Account lockout after failed attempts (5 attempts)

**Manual Enforcement:**

- Quarterly password compliance audits
- User security awareness training
- Policy violation investigations
- Disciplinary actions for violations

---

## 6. Access Control Policy

### 6.1 Purpose

This Access Control Policy defines how access to CSMS resources is granted, managed, and revoked to ensure only authorized users can access appropriate data and functions.

**Version 2.0 Update:** This section reflects **enhanced access controls** with implemented session management, suspicious login detection, and comprehensive audit logging.

### 6.2 Access Control Principles

#### 6.2.1 Least Privilege

**Definition:**
Users are granted the minimum level of access required to perform their job functions.

**Implementation:**

- Role-based access control (RBAC)
- Default deny approach
- Granular permissions
- Time-limited elevated access
- Regular access reviews
- **Session-based access control** (IMPLEMENTED)

**Examples:**

- HRO can only submit requests, not approve
- HRMO cannot access complaints module
- Planning Officer has read-only access
- Employees can only view own data

#### 6.2.2 Separation of Duties

**Definition:**
Critical functions require multiple people to prevent fraud or error.

**Implementation:**

- Requestor and approver are different users
- HRO cannot approve own institution's requests
- User creation and approval separate
- Sensitive operations require dual authorization
- All approval actions logged

#### 6.2.3 Need-to-Know

**Definition:**
Access granted only to data necessary for legitimate business purpose.

**Implementation:**

- Institution-based data isolation
- Role-based data visibility
- Contextual access restrictions
- Query result filtering
- **Access attempts logged for audit** (IMPLEMENTED)

#### 6.2.4 Defense in Depth

**Definition:**
Multiple layers of security controls.

**Implementation:**

- Network perimeter security
- Application-level authentication
- Database access controls
- API authorization checks
- Audit logging at each layer
- Session management
- Inactivity timeout
- Suspicious login detection

### 6.3 Authentication and Authorization

#### 6.3.1 Authentication Methods - **ENHANCED**

**Standard Login (Staff Users):**

- Username or email + password
- Session-based authentication
- HTTP-only secure cookies
- Session timeout: 7 minutes inactivity
- Maximum 3 concurrent sessions
- Failed attempt tracking
- Account lockout after 5 failed attempts

**Employee Login:**

- **Three-Factor Credential System**:
  - ZanID + Payroll Number + ZSSF Number
  - All three credentials verified simultaneously
  - Read-only session
  - Limited functionality
- **Session tracking**
- **Suspicious login detection**

**API Authentication (Future):**

- API keys for service accounts
- OAuth 2.0 for integrations
- JWT tokens for stateless APIs

#### 6.3.2 Session Validation - **IMPLEMENTED**

**Session Security Features:**

- ✓ Unique session ID per login
- ✓ Session stored server-side
- ✓ HTTP-only cookies (not accessible to JavaScript)
- ✓ Secure flag (HTTPS only)
- ✓ SameSite attribute (CSRF protection)
- ✓ Session timeout: 24 hours absolute expiration
- ✓ Inactivity timeout: 7 minutes
- ✓ Automatic logout on timeout
- ✓ Session regeneration on privilege change
- ✓ IP address tracking
- ✓ User agent tracking
- ✓ Device information tracking
- ✓ Last activity timestamp

**Session Database Schema:**

```
Session:
  - id: UUID
  - userId: Foreign key to User
  - sessionToken: Unique token (64-char hex)
  - ipAddress: Client IP
  - userAgent: Browser/device string
  - deviceInfo: Parsed device type
  - location: Geographic info (optional)
  - expiresAt: 24-hour expiration
  - lastActivity: Last request timestamp
  - isSuspicious: Suspicious login flag
  - createdAt: Session creation time
```

### 6.4 Concurrent Session Management

#### 6.4.1 Session Limits

**Policy:**

- **Maximum concurrent sessions per user: 3**
- **Enforcement: Automatic** (oldest session terminated)
- **Status: ✓ IMPLEMENTED**

**Implementation:**

- On new login, system checks active sessions
- If user has 3 or more sessions:
  - Oldest session(s) automatically terminated
  - User can continue with new session
  - Terminated sessions logged

**Session Types Counted:**

- Active web browser sessions
- Employee portal sessions
- API sessions (if applicable)

**Benefits:**

- Prevents session accumulation
- Limits attack surface from compromised credentials
- Allows legitimate multi-device usage
- Automatic cleanup of abandoned sessions

#### 6.4.2 Session Monitoring - **IMPLEMENTED**

**Tracked Session Information:**

- ✓ Session ID and token
- ✓ User ID and username
- ✓ IP address
- ✓ Device type (Windows, Mac, Mobile, etc.)
- ✓ Browser user agent
- ✓ Creation timestamp
- ✓ Last activity timestamp
- ✓ Expiration time
- ✓ Suspicious flag

**Session Management API:**

- Get active sessions for user
- Terminate specific session
- Terminate all user sessions
- Auto-cleanup expired sessions (cron job)
- Session count per user

**User Visibility:**

- Users can view their active sessions (planned)
- Shows device, location, last activity
- Option to terminate individual sessions (planned)

### 6.5 Suspicious Login Detection

#### 6.5.1 Detection Criteria

**Suspicious Indicators:**

1. **New IP Address**
   - Login from IP not seen in last 30 days
   - Severity: Medium
   - Action: Flag as suspicious, allow login

2. **New Device Type**
   - Login from device type not previously used
   - Examples: First mobile login, new PC
   - Severity: Medium
   - Action: Flag as suspicious, allow login

3. **Concurrent Different IPs**
   - User logged in from multiple IPs simultaneously
   - Severity: High
   - Action: Flag as suspicious, notify user

4. **Rapid IP Change**
   - Login from different IP within 5 minutes
   - Potential account takeover indicator
   - Severity: Critical
   - Action: Flag as suspicious, notify user, log event

**Detection System:**

- Runs on every login attempt
- Compares against last 10 sessions (30 days)
- Non-blocking (doesn't prevent login)
- Creates notifications for suspicious activity

#### 6.5.2 Response Actions

**Automated Responses:**

- ✓ Mark session as suspicious (`isSuspicious = true`)
- ✓ Log detailed audit event with reasons
- ✓ Track IP addresses and devices
- ✓ Create user notification (for high-risk logins)

**User Notification Triggers:**

- New IP AND new device
- Concurrent logins from different IPs
- Rapid successive logins from different IPs

**Administrator Alerts (Planned):**

- Multiple suspicious logins in short period
- Suspicious logins for high-privilege accounts
- Patterns indicating credential stuffing

#### 6.5.3 User Response

**User Actions:**

- Review notification about suspicious login
- Verify if login was authorized
- Report unauthorized access immediately
- Change password if account compromised
- Administrator can lock account pending investigation

**Investigation Process:**

1. User reports suspicious login
2. Administrator reviews session history
3. Check audit logs for activity
4. Lock account if necessary
5. Security review conducted
6. Password reset required
7. Re-enable account after verification

---

## 7. Session Management Policy - **NEW SECTION**

### 7.1 Purpose

This Session Management Policy establishes controls for user session lifecycle management, including creation, maintenance, timeout, and termination to protect against unauthorized access and session hijacking attacks.

**Status:** ✓ FULLY IMPLEMENTED

### 7.2 Session Creation

#### 7.2.1 Session Establishment

**Requirements:**

- Successful authentication required
- Unique session token generated (64-character hexadecimal)
- Session stored in database with metadata
- Secure, HTTP-only cookie issued to client

**Session Token Generation:**

- Cryptographically secure random bytes
- 256-bit entropy (32 bytes = 64 hex characters)
- Unpredictable and non-sequential
- Never reused

**Session Metadata:**

- User ID and username
- IP address (with proxy detection)
- User agent string
- Device type (parsed from user agent)
- Geographic location (optional)
- Creation timestamp
- Expiration time (24 hours from creation)
- Last activity timestamp
- Suspicious flag

### 7.3 Session Timeout - **IMPLEMENTED**

#### 7.3.1 Absolute Timeout

**Policy:**

- **Maximum session duration: 24 hours**
- **After 24 hours: Automatic session expiration**
- **Action: User must re-authenticate**

**Implementation:**

- Session `expiresAt` set to 24 hours from creation
- Database check on every request
- Expired sessions automatically deleted
- User redirected to login page

#### 7.3.2 Inactivity Timeout - **IMPLEMENTED**

**Policy:**

- **Inactivity period: 7 minutes**
- **Warning: 1 minute before timeout (6 minutes)**
- **Action: Automatic logout after 7 minutes of inactivity**

**Implementation:**

- `lastActivity` field updated on every API request
- Client-side timer tracks inactivity
- Warning displayed at 6 minutes
- Automatic logout at 7 minutes
- Session invalidated on server

**Inactivity Definition:**

- No HTTP requests to API
- No page navigation
- No form submissions
- No data updates

**User Activity Reset:**

- Any API call resets timer
- Page navigation resets timer
- Form submission resets timer
- Background polling does NOT reset timer (if implemented)

#### 7.3.3 Timeout Configuration

**Timeout Settings:**

| Setting                     | Value     | Enforcement     | Status        |
| --------------------------- | --------- | --------------- | ------------- |
| Absolute session timeout    | 24 hours  | Server-side     | ✓ IMPLEMENTED |
| Inactivity timeout          | 7 minutes | Server + Client | ✓ IMPLEMENTED |
| Warning before timeout      | 1 minute  | Client-side     | ✓ IMPLEMENTED |
| Grace period (post-warning) | None      | N/A             | N/A           |

**Exceptions:**

- No exceptions for administrators
- No exceptions for high-privilege users
- Emergency access requires re-authentication

### 7.4 Concurrent Session Management - **IMPLEMENTED**

#### 7.4.1 Concurrent Session Limits

**Policy:**

- **Maximum concurrent sessions: 3 per user**
- **Enforcement: Automatic (oldest terminated)**

**Rationale:**

- Allows legitimate multi-device usage
- Prevents unlimited session accumulation
- Limits attack surface from compromised credentials
- Balances security and usability

**Implementation:**

1. On login, count active sessions for user
2. If count >= 3:
   - Order sessions by creation date (oldest first)
   - Calculate excess: `excess = count - 3 + 1`
   - Delete oldest `excess` session(s)
   - Continue with new login
3. Create new session
4. Log session creation and any terminations

**Example Scenarios:**

**Scenario 1: Normal Usage**

- User has 2 active sessions (Desktop, Laptop)
- Logs in on Mobile
- Result: 3 total sessions (all active)

**Scenario 2: Limit Reached**

- User has 3 active sessions (Desktop, Laptop, Tablet)
- Logs in on Mobile
- Result: Desktop session terminated, 3 sessions remain (Laptop, Tablet, Mobile)

**Scenario 3: Session Cleanup**

- User has 3 active sessions, 2 expired sessions
- Expired sessions don't count toward limit
- Cron job deletes expired sessions automatically

### 7.5 Session Termination

#### 7.5.1 Explicit Logout

**User-Initiated Logout:**

- User clicks logout button
- Session deleted from database
- Cookie cleared on client
- User redirected to login page
- Logout event logged in audit trail

**Logout Process:**

1. Receive logout request
2. Validate session token
3. Delete session from database
4. Clear authentication cookies
5. Log logout event with timestamp
6. Redirect to login page
7. Return success response

#### 7.5.2 Automatic Termination

**Triggers for Automatic Termination:**

1. **Session Expiration (24 hours)**
   - Session `expiresAt` passed
   - Session deleted automatically
   - User must re-authenticate

2. **Inactivity Timeout (7 minutes)**
   - Last activity > 7 minutes ago
   - Session invalidated
   - User logged out automatically

3. **Concurrent Session Limit**
   - User exceeds 3 sessions
   - Oldest session(s) terminated
   - Remaining sessions continue

4. **Password Change**
   - User changes password
   - All sessions terminated except current
   - User must re-login on other devices

5. **Account Lockout**
   - Failed login attempts threshold reached
   - Password expiration
   - Administrator lock
   - All sessions terminated immediately

6. **Security Event**
   - Suspected account compromise
   - Administrator-initiated session kill
   - All sessions terminated
   - User must contact administrator

#### 7.5.3 Session Cleanup

**Automatic Cleanup (Cron Job):**

- Runs: Every hour (configurable)
- Deletes: Sessions with `expiresAt < NOW()`
- Logs: Number of sessions cleaned
- **Status: ✓ IMPLEMENTED**

**Benefits:**

- Prevents database bloat
- Removes abandoned sessions
- Ensures accurate session counts
- Maintains system performance

### 7.6 Session Security

#### 7.6.1 Session Token Protection

**Token Security:**

- Stored in HTTP-only cookie (JavaScript cannot access)
- Secure flag enabled (HTTPS only)
- SameSite=Lax (CSRF protection)
- Never exposed in URLs or logs
- Cryptographically random and unique
- 256-bit entropy

**Cookie Configuration:**

```
Set-Cookie: session=<token>;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=86400
```

#### 7.6.2 Session Fixation Prevention

**Protections:**

- New session token on authentication
- Session regeneration on privilege change
- Old session token invalidated
- No session ID accepted from URL parameters

#### 7.6.3 Session Hijacking Prevention

**Protections:**

- ✓ IP address tracking (detect IP changes)
- ✓ User agent validation
- ✓ Suspicious login detection
- ✓ HTTPS enforcement
- ✓ HTTP-only cookies
- ✓ Session timeouts
- ✓ Audit logging

**Hijacking Detection:**

- Sudden IP address change (logged, flagged)
- User agent change (logged, flagged)
- Concurrent different IPs (logged, user notified)

### 7.7 Session Monitoring and Audit

#### 7.7.1 Session Logging - **IMPLEMENTED**

**Logged Events:**

- ✓ Session creation (login)
- ✓ Session termination (logout, timeout, admin kill)
- ✓ Session validation failures
- ✓ Concurrent session limit triggers
- ✓ Suspicious session flags
- ✓ Session cleanup operations

**Logged Data:**

- User ID and username
- Session token (first 10 characters for identification)
- IP address
- Device information
- Timestamp
- Termination reason
- Suspicious indicators

#### 7.7.2 Session Management API - **IMPLEMENTED**

**Available Functions:**

```typescript
// Session creation
createSession(userId, ipAddress, userAgent, isSuspicious);

// Session validation
validateSession(sessionToken);

// Session termination
terminateSession(sessionToken);
terminateAllUserSessions(userId);

// Session queries
getUserActiveSessions(userId);
getUserSessionCount(userId);

// Session cleanup
cleanupExpiredSessions();
autoUnlockExpiredAccounts();
```

**Administrator Functions (Planned):**

- View all active sessions
- Terminate sessions by user
- Terminate sessions by IP
- Generate session reports

---

## 8. Account Lockout Policy - **NEW SECTION**

### 8.1 Purpose

This Account Lockout Policy establishes controls to prevent unauthorized access through repeated failed login attempts (brute force attacks) and manage account lockouts for security and compliance purposes.

**Status:** ✓ FULLY IMPLEMENTED

### 8.2 Failed Login Attempt Tracking

#### 8.2.1 Attempt Limits - **IMPLEMENTED**

**Policy:**

- **Maximum consecutive failed attempts: 5**
- **Tracking: Per user account**
- **Counter reset: On successful login**

**Implementation:**

- Failed login counter stored in user record: `failedLoginAttempts`
- Incremented on each failed login
- Reset to 0 on successful authentication
- Tracked across all login methods (staff and employee)

**Attempt Tracking:**

- Username/email identified
- Failed password verification
- Counter incremented
- Remaining attempts calculated: `5 - failedLoginAttempts`
- User informed of remaining attempts

#### 8.2.2 Lockout Triggers

**Account Locked When:**

1. ✓ 5 consecutive failed login attempts
2. ✓ Password expired beyond grace period (7 days)
3. ✓ Administrator manual lock
4. ✓ Security review requirement

### 8.3 Lockout Types - **IMPLEMENTED**

#### 8.3.1 Standard Lockout

**Characteristics:**

- **Trigger:** 5-10 failed login attempts
- **Duration:** 30 minutes
- **Auto-unlock:** Yes (after 30 minutes)
- **Status:** ✓ IMPLEMENTED

**Implementation:**

```
On 5th failed attempt:
  - failedLoginAttempts = 5
  - loginLockedUntil = NOW() + 30 minutes
  - loginLockoutType = 'standard'
  - loginLockoutReason = 'failed_attempts'
  - active = false (account disabled)
```

**Auto-Unlock Process:**

- Cron job runs periodically (hourly)
- Checks for accounts with `loginLockedUntil < NOW()`
- Where `loginLockoutType = 'standard'`
- Resets: `active = true`, `failedLoginAttempts = 0`, clears lockout fields

**User Experience:**

- Login blocked with message: "Account locked due to too many failed attempts. Try again in X minutes."
- Countdown timer shown
- Automatic unlock after 30 minutes
- No administrator intervention required

#### 8.3.2 Security Lockout

**Characteristics:**

- **Trigger:** More than 10 failed login attempts
- **Duration:** Indefinite
- **Auto-unlock:** No
- **Unlock:** Requires administrator intervention
- **Status:** ✓ IMPLEMENTED

**Implementation:**

```
On 11th failed attempt:
  - failedLoginAttempts = 11
  - loginLockedUntil = null (no auto-unlock)
  - loginLockoutType = 'security'
  - loginLockoutReason = 'failed_attempts'
  - active = false
```

**Security Review:**

- Administrator notified of security lockout
- Manual investigation required
- Review failed login attempts in audit log
- Verify legitimate user vs. attack
- Identity verification required for unlock

**Rationale:**

- Excessive failed attempts indicate:
  - Credential stuffing attack
  - Brute force attack
  - Compromised account
- Requires human review before unlock

#### 8.3.3 Administrative Lockout

**Characteristics:**

- **Trigger:** Administrator manual action
- **Duration:** Indefinite
- **Auto-unlock:** No
- **Unlock:** Requires administrator intervention
- **Status:** ✓ IMPLEMENTED

**Reasons for Admin Lock:**

- Suspected account compromise
- Employee termination (access revocation)
- Security investigation
- Policy violation
- Requested by management

**Implementation:**

```
Administrator lockout:
  - isManuallyLocked = true
  - lockedBy = <admin_user_id>
  - lockedAt = NOW()
  - loginLockoutType = 'security'
  - loginLockoutReason = 'admin_lock'
  - lockoutNotes = <reason/notes>
  - active = false
```

**Unlock Process:**

- Administrator reviews lockout reason
- Verifies identity of user
- Checks for resolution of issue
- Documents unlock reason
- Unlocks account via admin interface

### 8.4 Lockout Response Actions - **IMPLEMENTED**

#### 8.4.1 Standard Lockout Actions

**Immediate Actions:**

1. ✓ Increment failed login counter
2. ✓ Set lockout expiration (30 minutes)
3. ✓ Deactivate account (`active = false`)
4. ✓ Log lockout event to audit log
5. ✓ Return lockout message to user

**Audit Log Entry:**

```json
{
  "eventType": "ACCOUNT_LOCKED",
  "eventCategory": "SECURITY",
  "severity": "WARNING",
  "userId": "<user_id>",
  "username": "<username>",
  "ipAddress": "<client_ip>",
  "userAgent": "<browser_string>",
  "blockReason": "Account locked after 5 failed login attempts",
  "additionalData": {
    "failedAttempts": 5,
    "lockoutType": "standard",
    "lockedUntil": "<timestamp>",
    "reason": "failed_attempts"
  }
}
```

**User Message:**

```
"Account locked due to too many failed login attempts.
Please try again in 30 minutes or contact your administrator."
```

#### 8.4.2 Security Lockout Actions

**Immediate Actions:**

1. ✓ Increment failed login counter
2. ✓ Set lockout type to 'security'
3. ✓ Deactivate account
4. ✓ Log CRITICAL severity audit event
5. ✓ Alert administrators (planned)

**Audit Log Entry:**

```json
{
  "eventType": "ACCOUNT_LOCKED",
  "eventCategory": "SECURITY",
  "severity": "CRITICAL",
  "userId": "<user_id>",
  "username": "<username>",
  "ipAddress": "<client_ip>",
  "userAgent": "<browser_string>",
  "blockReason": "Account locked after 11 failed login attempts",
  "additionalData": {
    "failedAttempts": 11,
    "lockoutType": "security",
    "lockedUntil": null,
    "reason": "failed_attempts",
    "requiresAdminUnlock": true
  }
}
```

**Administrator Alert:**

- Email/notification sent to security team (planned)
- Includes: username, IP, attempt count, timestamp
- Requires investigation and manual unlock

**User Message:**

```
"Account locked for security reasons.
Please contact your system administrator to unlock your account."
```

### 8.5 Account Unlock Procedures - **IMPLEMENTED**

#### 8.5.1 Automatic Unlock (Standard Lockout)

**Process:**

- Cron job runs hourly
- Queries accounts:
  - `active = false`
  - `isManuallyLocked = false`
  - `loginLockoutType = 'standard'`
  - `loginLockedUntil < NOW()`
- Updates matched accounts:
  - `active = true`
  - `loginLockedUntil = null`
  - `loginLockoutReason = null`
  - `loginLockoutType = null`
  - `failedLoginAttempts = 0`

**Status:** ✓ IMPLEMENTED

#### 8.5.2 Manual Unlock (Administrator)

**Unlock Process:**

1. Administrator logs into admin panel
2. Navigates to locked user account
3. Reviews lockout information:
   - Lockout reason
   - Failed attempt count
   - Lockout timestamp
   - IP addresses of attempts
4. Verifies user identity (phone call, in-person)
5. Clicks "Unlock Account" button
6. Enters verification notes
7. Confirms unlock
8. System updates:
   - `isManuallyLocked = false`
   - `lockedBy = null`
   - `lockedAt = null`
   - `loginLockedUntil = null`
   - `loginLockoutReason = null`
   - `loginLockoutType = null`
   - `lockoutNotes = null`
   - `failedLoginAttempts = 0`
   - `active = true`
9. Audit log entry created:

```json
{
  "eventType": "ADMIN_ACCOUNT_UNLOCK",
  "eventCategory": "SECURITY",
  "severity": "INFO",
  "userId": "<admin_id>",
  "username": "<admin_username>",
  "additionalData": {
    "targetUserId": "<unlocked_user_id>",
    "targetUsername": "<unlocked_username>",
    "previousReason": "failed_attempts",
    "failedAttempts": 11,
    "verificationNotes": "<admin notes>"
  }
}
```

**Status:** ✓ IMPLEMENTED (API and utility functions ready)

### 8.6 Lockout Status Information - **IMPLEMENTED**

#### 8.6.1 Lockout Status API

**Get Lockout Status:**

```typescript
interface AccountLockoutStatus {
  isLocked: boolean;
  lockoutType: 'standard' | 'security' | null;
  lockoutReason:
    | 'failed_attempts'
    | 'password_expired'
    | 'admin_lock'
    | 'security_review'
    | null;
  lockedUntil: Date | null;
  remainingMinutes: number;
  failedAttempts: number;
  isManuallyLocked: boolean;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockoutNotes: string | null;
  canAutoUnlock: boolean;
}
```

**Status Calculation:**

- `isLocked`: Determined by checking:
  - `isManuallyLocked = true`, OR
  - `loginLockoutType = 'security'`, OR
  - `loginLockedUntil > NOW()`
- `remainingMinutes`: `CEIL((lockedUntil - NOW()) / 60000)`
- `canAutoUnlock`: `!isManuallyLocked && lockoutType == 'standard'`

#### 8.6.2 User Feedback

**During Login Attempt:**

```
Failed Attempt 1-4:
  "Invalid username or password. X attempts remaining."

Failed Attempt 5 (Standard Lockout):
  "Account locked for 30 minutes due to too many failed attempts.
   Please try again at HH:MM or contact your administrator."

Failed Attempt 11+ (Security Lockout):
  "Account locked for security reasons.
   Please contact your system administrator."

Manual Lock:
  "Your account has been locked by an administrator.
   Please contact your system administrator for assistance."
```

**Admin Interface:**

- List of locked accounts
- Lockout reason and type
- Time remaining (if standard)
- Unlock button (if authorized)
- View audit logs of failed attempts

### 8.7 Related Security Controls

#### 8.7.1 Integration with Password Policy

**Locked Due to Password Expiration:**

- After grace period expires (7 days after expiration)
- Account automatically locked
- `loginLockoutReason = 'password_expired'`
- User must contact administrator
- Administrator resets password
- Account unlocked automatically on password reset

#### 8.7.2 Integration with Audit Logging

**All Lockout Events Logged:**

- ✓ Failed login attempts
- ✓ Account lockouts (standard, security, admin)
- ✓ Account unlocks (auto, manual)
- ✓ Lockout type changes
- ✓ Administrator lock/unlock actions

**Audit Log Categories:**

- SECURITY (lockouts due to failed attempts)
- AUTHENTICATION (login failures)
- SYSTEM (auto-unlock events)

**Severity Levels:**

- INFO: Successful unlocks
- WARNING: Standard lockouts
- ERROR: Failed unlock attempts
- CRITICAL: Security lockouts (11+ attempts)

---

## 9. Audit and Logging Policy - **UPDATED**

### 9.1 Purpose

This Audit and Logging Policy establishes comprehensive logging requirements for security monitoring, compliance, incident investigation, and forensic analysis.

**Version 2.0 Update:** This section reflects the **fully implemented enterprise-grade audit logging system** with comprehensive event tracking, categorization, and retention policies.

### 9.2 Audit Logging System - **IMPLEMENTED**

#### 9.2.1 System Overview

**Implementation Status:** ✓ FULLY IMPLEMENTED

**Features:**

- ✓ Centralized audit log database
- ✓ Automated event capture
- ✓ Comprehensive event categorization
- ✓ Severity level assignment
- ✓ IP address and user agent tracking
- ✓ Foreign key relationships to users
- ✓ Structured additional data (JSON)
- ✓ Real-time logging
- ✓ Query and search API
- ✓ Statistical analysis functions

**Database Schema:**

```sql
AuditLog:
  - id: UUID (primary key)
  - timestamp: DateTime (default: NOW())
  - eventType: String (e.g., 'LOGIN_SUCCESS', 'UNAUTHORIZED_ACCESS')
  - eventCategory: String (SECURITY, AUTHENTICATION, DATA_MODIFICATION, etc.)
  - severity: String (INFO, WARNING, ERROR, CRITICAL)
  - userId: UUID (nullable, foreign key to User)
  - username: String (nullable)
  - userRole: String (nullable)
  - ipAddress: String (nullable)
  - userAgent: String (nullable, browser info)
  - attemptedRoute: String (URL/endpoint)
  - requestMethod: String (GET, POST, PUT, PATCH, DELETE)
  - isAuthenticated: Boolean (default: false)
  - wasBlocked: Boolean (default: true)
  - blockReason: String (nullable)
  - additionalData: JSON (nullable, structured data)
```

**Indexes:**

- Primary key: `id`
- Foreign key: `userId` -> `User(id)`
- Indexes on: `timestamp`, `eventType`, `eventCategory`, `severity`, `userId`

### 9.3 Event Categories - **IMPLEMENTED**

#### 9.3.1 Security Events

**Category:** `SECURITY`

**Event Types:**

- `UNAUTHORIZED_ACCESS`: User tried to access unauthorized resource
- `ACCESS_DENIED`: Authenticated user denied access to resource
- `FORBIDDEN_ROUTE`: Role tried to access forbidden route
- `ACCOUNT_LOCKED`: Account locked due to failed attempts
- `ADMIN_ACCOUNT_LOCK`: Administrator manually locked account
- `ADMIN_ACCOUNT_UNLOCK`: Administrator unlocked account
- `SUSPICIOUS_REQUEST`: Unusual or potentially malicious request
- `POTENTIAL_BREACH`: Detected potential security breach

**Logged Information:**

- User ID and username (if known)
- User role
- IP address
- User agent
- Attempted resource/route
- Block reason
- Failure details
- Severity level

#### 9.3.2 Authentication Events

**Category:** `AUTHENTICATION`

**Event Types:**

- `LOGIN_SUCCESS`: Successful authentication
- `LOGIN_FAILED`: Failed authentication attempt
- `LOGOUT`: User logout
- `SESSION_EXPIRED`: Session timed out
- `PASSWORD_CHANGED`: User changed password
- `PASSWORD_RESET`: Administrator reset password

**Logged Information:**

- User ID and username
- IP address
- User agent
- Device information
- Timestamp
- Failure reason (if applicable)
- Session information

#### 9.3.3 Authorization Events

**Category:** `AUTHORIZATION`

**Event Types:**

- `ROLE_VIOLATION`: Action not permitted for user role
- `PERMISSION_DENIED`: Specific permission check failed
- `ACCESS_DENIED`: Resource access denied

**Logged Information:**

- User ID, username, and role
- Attempted action
- Required permission
- Resource identifier
- Denial reason

#### 9.3.4 Data Modification Events - **IMPLEMENTED**

**Category:** `DATA_MODIFICATION`

**Event Types:**

- `REQUEST_APPROVED`: HR request approved
- `REQUEST_REJECTED`: HR request rejected
- `REQUEST_SUBMITTED`: New HR request submitted
- `REQUEST_UPDATED`: HR request modified
- `EMPLOYEE_CREATED`: New employee record created
- `EMPLOYEE_UPDATED`: Employee record modified
- `USER_CREATED`: New user account created
- `USER_UPDATED`: User account modified
- `INSTITUTION_UPDATED`: Institution record modified

**Logged Information for Request Approvals/Rejections:**

```json
{
  "eventType": "REQUEST_APPROVED" or "REQUEST_REJECTED",
  "eventCategory": "DATA_MODIFICATION",
  "severity": "INFO" (approved) or "WARNING" (rejected),
  "userId": "<reviewer_user_id>",
  "username": "<reviewer_username>",
  "userRole": "<reviewer_role>",
  "ipAddress": "<client_ip>",
  "userAgent": "<browser_info>",
  "attemptedRoute": "/api/<request_type>/<request_id>",
  "requestMethod": "PUT" or "PATCH",
  "isAuthenticated": true,
  "wasBlocked": false,
  "blockReason": "<rejection_reason>" (for rejections only),
  "additionalData": {
    "requestType": "Promotion | Confirmation | LWOP | ...",
    "requestId": "<uuid>",
    "employeeId": "<employee_uuid>",
    "employeeName": "Full Name",
    "employeeZanId": "ZAN-XXXXX",
    "reviewStage": "initial | commission | final",
    "action": "APPROVED" or "REJECTED",
    "rejectionReason": "..." (for rejections),
    "proposedCadre": "..." (for promotions),
    "currentCadre": "..." (for context),
    ... other request-specific data ...
  }
}
```

**Status:** ✓ FULLY IMPLEMENTED for all 8 request types:

- Promotions
- Confirmations
- LWOP
- Retirement
- Cadre Change
- Resignation
- Service Extension
- Termination/Dismissal

#### 9.3.5 System Events

**Category:** `SYSTEM`

**Event Types:**

- `SYSTEM_START`: Application startup
- `SYSTEM_STOP`: Application shutdown
- `CONFIGURATION_CHANGE`: System configuration modified
- `BACKUP_COMPLETED`: Backup successfully completed
- `BACKUP_FAILED`: Backup operation failed

**Logged Information:**

- Event timestamp
- System component
- Configuration changes
- Success/failure status

### 9.4 Severity Levels - **IMPLEMENTED**

**Severity Classification:**

| Level        | Description             | Examples                                                                    | Response                  |
| ------------ | ----------------------- | --------------------------------------------------------------------------- | ------------------------- |
| **INFO**     | Normal operations       | Successful logins, request approvals, normal data access                    | Log only                  |
| **WARNING**  | Attention needed        | Failed login attempts, access denied, request rejections, standard lockouts | Log + Monitor             |
| **ERROR**    | Error condition         | Authentication failures, system errors, forbidden routes                    | Log + Alert               |
| **CRITICAL** | Critical security event | Security lockouts (11+ failed attempts), potential breaches, admin locks    | Log + Alert + Investigate |

**Severity Assignment:**

- Automated based on event type
- Manual override for special cases
- Escalation procedures defined

### 9.5 Logged Events Inventory - **IMPLEMENTED**

#### 9.5.1 Authentication and Access

| **Event**           | **Status** | **Category**   | **Severity**  | **Logged Data**                   |
| ------------------- | ---------- | -------------- | ------------- | --------------------------------- |
| Successful login    | ✓          | AUTHENTICATION | INFO          | User, IP, device, timestamp       |
| Failed login        | ✓          | AUTHENTICATION | WARNING       | Username, IP, device, reason      |
| Logout              | ✓          | AUTHENTICATION | INFO          | User, IP, timestamp               |
| Session timeout     | ✓          | AUTHENTICATION | INFO          | User, session, duration           |
| Unauthorized access | ✓          | SECURITY       | WARNING/ERROR | User, IP, attempted route, reason |
| Access denied       | ✓          | AUTHORIZATION  | WARNING       | User, role, resource, reason      |
| Forbidden route     | ✓          | SECURITY       | ERROR         | User, role, route                 |
| Password change     | Planned    | AUTHENTICATION | INFO          | User, timestamp                   |
| Password reset      | Planned    | AUTHENTICATION | WARNING       | User, admin, timestamp            |

#### 9.5.2 Account Management

| **Event**                      | **Status** | **Category** | **Severity** | **Logged Data**                        |
| ------------------------------ | ---------- | ------------ | ------------ | -------------------------------------- |
| Account lockout (5 attempts)   | ✓          | SECURITY     | WARNING      | User, IP, attempt count, lockout type  |
| Account lockout (11+ attempts) | ✓          | SECURITY     | CRITICAL     | User, IP, attempt count                |
| Admin account lock             | ✓          | SECURITY     | WARNING      | Admin, target user, reason, notes      |
| Admin account unlock           | ✓          | SECURITY     | INFO         | Admin, target user, verification notes |
| User created                   | Planned    | SYSTEM       | INFO         | Admin, new user, role                  |
| User updated                   | Planned    | SYSTEM       | INFO         | Admin, target user, changes            |
| User deleted                   | Planned    | SYSTEM       | WARNING      | Admin, deleted user                    |
| Role changed                   | Planned    | SYSTEM       | WARNING      | Admin, user, old role, new role        |

#### 9.5.3 Data Modifications - **IMPLEMENTED**

| **Event**           | **Status** | **Category**      | **Severity** | **Logged Data**                           |
| ------------------- | ---------- | ----------------- | ------------ | ----------------------------------------- |
| Request approved    | ✓          | DATA_MODIFICATION | INFO         | Reviewer, employee, request type, details |
| Request rejected    | ✓          | DATA_MODIFICATION | WARNING      | Reviewer, employee, request type, reason  |
| Request submitted   | ✓          | DATA_MODIFICATION | INFO         | Submitter, employee, request type         |
| Request updated     | ✓          | DATA_MODIFICATION | INFO         | User, request, changes                    |
| Employee created    | Planned    | DATA_MODIFICATION | INFO         | User, employee details                    |
| Employee updated    | Planned    | DATA_MODIFICATION | INFO         | User, employee, changes                   |
| Document uploaded   | Planned    | DATA_MODIFICATION | INFO         | User, employee, document type             |
| Document downloaded | Planned    | DATA_MODIFICATION | INFO         | User, employee, document type             |

#### 9.5.4 Administrative Actions

| **Event**             | **Status** | **Category** | **Severity** | **Logged Data**                      |
| --------------------- | ---------- | ------------ | ------------ | ------------------------------------ |
| HRIMS sync initiated  | Planned    | SYSTEM       | INFO         | Admin, sync type, timestamp          |
| HRIMS sync completed  | Planned    | SYSTEM       | INFO         | Admin, record count, duration        |
| Institution created   | Planned    | SYSTEM       | INFO         | Admin, institution details           |
| Institution updated   | Planned    | SYSTEM       | INFO         | Admin, institution, changes          |
| Report generated      | Planned    | SYSTEM       | INFO         | User, report type, parameters        |
| System config changed | Planned    | SYSTEM       | WARNING      | Admin, setting, old value, new value |

### 9.6 Audit Log Retention - **IMPLEMENTED**

#### 9.6.1 Retention Periods

| **Log Type**             | **Retention Period** | **Rationale**               | **Status**    |
| ------------------------ | -------------------- | --------------------------- | ------------- |
| Security events          | 1 year               | Security investigation      | ✓ IMPLEMENTED |
| Authentication events    | 90 days              | Login monitoring            | ✓ IMPLEMENTED |
| Authorization events     | 90 days              | Access control verification | ✓ IMPLEMENTED |
| Data modification events | 7 years              | Compliance requirement      | ✓ IMPLEMENTED |
| System events            | 90 days              | Operational troubleshooting | ✓ IMPLEMENTED |
| Critical incidents       | Indefinite           | Legal/forensic purposes     | ✓ IMPLEMENTED |

**Implementation:**

- Database-level retention (not auto-deleted)
- Manual archival process (planned)
- Backup retention aligned with log retention
- Compliance logs (7 years) identified by category

#### 9.6.2 Log Archival

**Process (Planned):**

1. Monthly archival of logs older than 90 days (except compliance logs)
2. Compressed archive files
3. Encrypted storage
4. Offsite backup
5. Index maintained for search
6. Restoration procedure documented

**Compliance Logs:**

- DATA_MODIFICATION category: 7-year retention
- Never automatically deleted
- Annual review of storage requirements

### 9.7 Audit Log Access and Protection

#### 9.7.1 Access Control

**Who Can Access Audit Logs:**

- System Administrators
- Security Officers
- Compliance Auditors (read-only)
- Authorized investigators

**Access Levels:**

- Read: View audit logs
- Query: Search and filter logs
- Export: Download audit reports
- Delete: Purge expired logs (administrators only)

**Access Logging:**

- All audit log access is logged
- Prevents unauthorized tampering
- Audit the auditors

#### 9.7.2 Log Integrity

**Protection Measures:**

- Database-level immutability (no UPDATE operation)
- INSERT-only audit log table
- Foreign key constraints
- Timestamping (server-side, non-modifiable)
- Checksum/hash (planned)
- Backup logs separately from operational data

**Tamper Detection:**

- Regular integrity checks (planned)
- Checksum verification
- Anomaly detection
- Alert on suspicious modifications

### 9.8 Audit Log Query and Analysis - **IMPLEMENTED**

#### 9.8.1 Query API

**Available Filters:**

- Date range (`startDate`, `endDate`)
- Event type
- Event category
- Severity level
- User ID
- Username (partial match)
- IP address
- Attempted route
- Pagination (limit, offset)

**Query Function:**

```typescript
getAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  eventCategory?: string;
  severity?: string;
  userId?: string;
  username?: string;
  attemptedRoute?: string;
  limit?: number;
  offset?: number;
})
```

**Status:** ✓ IMPLEMENTED

#### 9.8.2 Statistics and Reporting - **IMPLEMENTED**

**Available Statistics:**

```typescript
getAuditStatistics(filters?: {
  startDate?: Date;
  endDate?: Date;
}) => {
  totalEvents: number;
  blockedAttempts: number;
  criticalEvents: number;
  eventsByType: Array<{ eventType: string, count: number }>;
  eventsBySeverity: Array<{ severity: string, count: number }>;
}
```

**Status:** ✓ IMPLEMENTED

**Reporting Capabilities:**

- Total event count
- Blocked attempt count
- Critical event count
- Events grouped by type (top 10)
- Events grouped by severity
- Custom date range analysis

#### 9.8.3 Admin Interface

**Audit Trail Dashboard:**

- Real-time event feed
- Event type filters
- Severity filters
- User/role filters
- Date range selector
- Search functionality
- Export to CSV/PDF
- Event detail view

**Status:** implemented

### 9.9 Real-Time Monitoring and Alerting

#### 9.9.1 Real-Time Logging - **IMPLEMENTED**

**Console Logging:**

- All audit events logged to console simultaneously
- Format: `[AUDIT] <SEVERITY> - <EVENT_TYPE>: {details}`
- Enables real-time monitoring during development/troubleshooting
- Production logs can be captured by log aggregation tools

**Example:**

```
[AUDIT] CRITICAL - ACCOUNT_LOCKED: {
  user: 'jdoe',
  role: 'HRO',
  route: '/api/auth/login',
  blocked: true,
  reason: 'Account locked after 11 failed login attempts'
}
```

#### 9.9.2 Alerting (Planned)

**Alert Triggers:**

- CRITICAL severity events
- Multiple failed logins (5+ in 5 minutes)
- Suspicious login patterns
- Security lockouts
- Admin account usage
- Unauthorized access attempts
- Data modification anomalies

**Alert Channels:**

- Email to security team
- SMS for critical events
- Dashboard notification
- Webhook integration (for SIEM)

**Status:** Planned (alert thresholds defined, delivery pending)

### 9.10 Compliance and Legal Requirements

#### 9.10.1 Compliance Logging

**Requirements:**

- Tanzania/Zanzibar Data Protection Act
- Employment Records Act
- Freedom of Information Act
- ISO 27001 compliance
- Industry best practices

**Logged for Compliance:**

- All data access (who accessed what, when)
- All data modifications (who changed what, when, why)
- All authentication events
- All authorization failures
- All administrative actions

#### 9.10.2 Legal Hold

**Process:**

- In case of litigation or investigation
- Identified audit logs marked for legal hold
- Prevented from deletion/archival
- Preserved until legal matter resolved
- Chain of custody maintained

**Status:** Process defined (technical implementation pending)

### 9.11 Audit Log Format

#### 9.11.1 Standard Log Entry

**Example: Request Approval**

```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "timestamp": "2025-12-27T14:30:45.123Z",
  "eventType": "REQUEST_APPROVED",
  "eventCategory": "DATA_MODIFICATION",
  "severity": "INFO",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "skhamis",
  "userRole": "HHRMD",
  "ipAddress": "41.216.74.xx",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...",
  "attemptedRoute": "/api/promotions/12345",
  "requestMethod": "PATCH",
  "isAuthenticated": true,
  "wasBlocked": false,
  "blockReason": null,
  "additionalData": {
    "requestType": "Promotion",
    "requestId": "12345",
    "employeeId": "emp-001",
    "employeeName": "John Doe",
    "employeeZanId": "ZAN-00123",
    "reviewStage": "commission",
    "action": "APPROVED",
    "proposedCadre": "Senior Officer",
    "currentCadre": "Officer"
  }
}
```

**Example: Failed Login**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2025-12-27T10:15:30.456Z",
  "eventType": "LOGIN_FAILED",
  "eventCategory": "AUTHENTICATION",
  "severity": "WARNING",
  "userId": null,
  "username": "jdoe",
  "userRole": null,
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...",
  "attemptedRoute": "/api/auth/login",
  "requestMethod": "POST",
  "isAuthenticated": false,
  "wasBlocked": true,
  "blockReason": "Invalid password",
  "additionalData": {
    "failedAttempts": 3,
    "remainingAttempts": 2,
    "accountLockedAt": null
  }
}
```

---

## 10. Data Protection Policy

[Content remains largely the same as Version 1.0, with updates to reference implemented audit logging]

### 10.1 Purpose

This Data Protection Policy ensures the confidentiality, integrity, and availability of data processed by CSMS in compliance with data protection regulations.

**Version 2.0 Update:** All data access and modifications are now comprehensively logged in the audit trail system for compliance and security monitoring.

[Sections 10.2 - 10.8 continue with same content as Version 1.0]

---

## 11. Network Security Policy

[Content same as Version 1.0]

---

## 12. Physical Security Policy

[Content same as Version 1.0]

---

## 13. Incident Response Policy

[Content same as Version 1.0, with reference to enhanced audit logging for incident investigation]

---

## 14. Compliance and Audit

### 14.1 Compliance Requirements

[Content same as Version 1.0]

### 14.2 Audit Requirements

#### 14.2.1 Internal Audits - **ENHANCED**

**Frequency:**

- Security audits: Quarterly
- Access reviews: Quarterly
- Compliance checks: Annually
- Technical audits: Semi-annually
- **Audit log reviews: Weekly** (NEW)

**Scope:**

- User access appropriateness
- Policy compliance
- Security control effectiveness
- Data handling practices
- Incident response readiness
- **Audit trail completeness** (NEW)
- **Security event trends** (NEW)

**Enhanced Capabilities:**

- ✓ Automated audit log analysis
- ✓ Statistical reporting
- ✓ Trend identification
- ✓ Anomaly detection
- ✓ Compliance verification

[Rest of section 14 continues as Version 1.0]

---

## 15. Policy Enforcement

[Content same as Version 1.0, with reference to automated enforcement via implemented systems]

---

## 16. Appendices

### Appendix A: Definitions

[Same as Version 1.0, with additions:]

| Term                 | Definition                                                               |
| -------------------- | ------------------------------------------------------------------------ |
| **Audit Trail**      | Chronological record of system activities providing documentary evidence |
| **Session**          | Period of authenticated user activity with defined timeout               |
| **Lockout**          | Temporary or permanent denial of access due to security policy violation |
| **Grace Period**     | Time allowance after password expiration before account lockout          |
| **Suspicious Login** | Authentication from new IP, device, or unusual pattern                   |

### Appendix B: Contact Information

[Same as Version 1.0]

### Appendix C: Security Incident Report Form

[Same as Version 1.0]

### Appendix D: Policy Acknowledgment Form

[Same as Version 1.0]

### Appendix E: Implemented Security Features - **NEW**

| **Security Feature**                           | **Status**    | **Implementation Date** | **Version** |
| ---------------------------------------------- | ------------- | ----------------------- | ----------- |
| Comprehensive Audit Logging                    | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Password Expiration (Admin: 60d, User: 90d)    | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| 7-Day Grace Period                             | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Password Warning Notifications (14/7/3/1 days) | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Account Lockout (5 failed attempts)            | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Standard Lockout (30 min auto-unlock)          | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Security Lockout (11+ attempts, admin unlock)  | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Session Management (3 concurrent max)          | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| 24-Hour Session Expiration                     | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| 7-Minute Inactivity Timeout                    | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Suspicious Login Detection                     | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Employee Three-Factor Authentication           | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Request Approval/Rejection Audit Logging       | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| IP Address and User Agent Tracking             | ✓ IMPLEMENTED | Dec 2025                | 2.0         |
| Automated Session Cleanup                      | ✓ IMPLEMENTED | Dec 2025                | 2.0         |

### Appendix F: Security Implementation Roadmap - **NEW**

**Phase 1: Completed (Version 2.0)**

- ✓ Audit logging system
- ✓ Password expiration
- ✓ Account lockout
- ✓ Session management
- ✓ Inactivity timeout
- ✓ Suspicious login detection

**Phase 2: Planned (Version 3.0)**

- Enhanced password complexity (12+ chars)
- Multi-factor authentication (MFA)
- Real-time security alerts
- Advanced threat detection
- Automated security reporting
- User session dashboard

**Phase 3: Future Considerations**

- Biometric authentication
- Behavioral analytics
- Machine learning anomaly detection
- Advanced SIEM integration
- Automated incident response
- Zero-trust architecture

---

## Document Approval

| Role            | Name                               | Signature                | Date                     |
| --------------- | ---------------------------------- | ------------------------ | ------------------------ |
| **Prepared By** | Chief Information Security Officer | **\*\***\_\_\_\_**\*\*** | December 27, 2025        |
| **Reviewed By** | IT Manager                         | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |
| **Reviewed By** | Legal Department                   | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |
| **Approved By** | Civil Service Commission           | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |

---

## Revision History

| Version | Date       | Author | Changes                                                                                                                                                                   |
| ------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | 2025-12-26 | CISO   | Initial release                                                                                                                                                           |
| 2.0     | 2025-12-27 | CISO   | Updated to reflect implemented security features: audit logging, password expiration, account lockout, session management, inactivity timeout, suspicious login detection |

---

**NEXT REVIEW DATE: January 1, 2027**

**END OF DOCUMENT**

---

**CLASSIFICATION: RESTRICTED**
**DISTRIBUTION: Civil Service Commission Staff, System Administrators, Security Personnel**

# USER ACCEPTANCE TEST (UAT) DOCUMENT

## SECURITY TESTING - CSMS (Civil Service Management System)

---

## Document Control

| Item                 | Details                                               |
| -------------------- | ----------------------------------------------------- |
| **Document Title**   | User Acceptance Test - Security & Penetration Testing |
| **Project Name**     | Civil Service Management System (CSMS)                |
| **Version**          | 1.0                                                   |
| **Date Prepared**    | December 23, 2025                                     |
| **Test Environment** | http://10.0.225.15:9002                               |
| **Database**         | PostgreSQL "nody" database                            |
| **Prepared By**      | **\*\*\*\***\_\_\_**\*\*\*\***                        |
| **Reviewed By**      | **\*\*\*\***\_\_\_**\*\*\*\***                        |
| **Approved By**      | **\*\*\*\***\_\_\_**\*\*\*\***                        |

---

## 1. Introduction

### 1.1 Purpose

This User Acceptance Test (UAT) document is designed to verify that the Civil Service Management System (CSMS) meets industry-standard security requirements and is protected against common vulnerabilities and security threats. This document covers comprehensive security testing including penetration testing to ensure the system is ready for production deployment.

### 1.2 Scope

The UAT covers the following security testing areas:

- Authentication & Authorization Testing
- Session Management Security
- Input Validation & Injection Attacks Prevention
- Cross-Site Request Forgery (CSRF) Protection
- Cross-Site Scripting (XSS) Prevention
- File Upload Security
- Password Security & Cryptography
- API Security Testing
- Data Protection & Privacy
- Security Headers & Configurations
- Error Handling & Information Disclosure
- Audit Trail & Logging
- Network Security
- Penetration Testing

### 1.3 Test Objectives

- Verify authentication mechanisms are secure and properly implemented
- Validate authorization controls prevent unauthorized access
- Ensure session management is secure against hijacking and fixation
- Test input validation and protection against injection attacks
- Verify CSRF and XSS protections are in place
- Validate file upload security controls
- Ensure password policies and hashing are implemented correctly
- Test API security and rate limiting
- Verify data protection and encryption mechanisms
- Confirm security headers are properly configured
- Test error handling doesn't leak sensitive information
- Validate comprehensive audit logging is in place
- Perform penetration testing to identify vulnerabilities

### 1.4 Security Standards Reference

This UAT is based on industry-standard security frameworks:

- OWASP Top 10 (2021)
- NIST Cybersecurity Framework
- ISO/IEC 27001:2013
- CWE/SANS Top 25 Most Dangerous Software Errors
- PCI DSS (where applicable for payment data)

---

## 2. Test Environment

### 2.1 Hardware/Software Requirements

| Component              | Specification                     |
| ---------------------- | --------------------------------- |
| **Application Server** | http://10.0.225.15:9002           |
| **Platform**           | Next.js 14 Full-Stack Application |
| **Database**           | PostgreSQL "nody" database        |
| **Storage**            | MinIO Object Storage              |
| **Framework**          | Next.js 14 with TypeScript        |
| **ORM**                | Prisma                            |
| **Authentication**     | bcryptjs, JWT (planned)           |

### 2.2 Security Testing Tools Required

- **Penetration Testing:** Burp Suite Professional / OWASP ZAP
- **Vulnerability Scanner:** Nessus / OpenVAS
- **SQL Injection Testing:** SQLMap
- **XSS Testing:** XSStrike / Manual testing
- **Password Cracking:** John the Ripper / Hashcat
- **Network Scanning:** Nmap
- **Traffic Analysis:** Wireshark
- **Browser DevTools:** Chrome/Firefox Developer Tools
- **API Testing:** Postman / Insomnia
- **Load Testing:** JMeter / Artillery
- **SSL/TLS Testing:** SSL Labs / testssl.sh

### 2.3 Access Requirements

- Admin user credentials
- Multiple test user accounts with different roles
- Employee test accounts
- Database access for verification
- Network access to application server
- Access to application logs
- Source code access (for white-box testing)

### 2.4 Test Data Requirements

- Multiple user accounts with different roles (HRO, HHRMD, HRMO, DO, EMPLOYEE, CSCS, HRRP, PO, Admin)
- Test employee records
- Sample institutions
- Test documents and files for upload
- Known vulnerable payloads for injection testing
- SQL injection test strings
- XSS test payloads
- CSRF tokens (if implemented)

---

## 3. Test Cases

---

### **Security Domain:** Authentication Security

### **Test Case No.: 1**

**Process/Function Name:** User Authentication & Login Security

**Function Description:** This module tests the security of user authentication mechanisms including login processes, password verification, account lockout, and protection against brute force attacks. Tests both standard user login and employee self-service login.

| **Case ID** | **Test Case Scenario**               | **Test Steps**                                                                                                                                                                             | **Expected Results**                                                                                                                                                                            | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 1.1         | Valid User Login                     | 1. Navigate to login page<br>2. Enter valid username/email<br>3. Enter correct password<br>4. Submit login form                                                                            | - User successfully authenticated<br>- Session created<br>- User redirected to appropriate dashboard<br>- User object contains correct role<br>- No sensitive data in response                  |                    |               |             |
| 1.2         | Invalid Username/Email               | 1. Navigate to login page<br>2. Enter non-existent username/email<br>3. Enter any password<br>4. Submit login form                                                                         | - Login fails<br>- Generic error message: "Invalid username/email or password"<br>- No indication if username exists or not<br>- No account enumeration possible<br>- Failed attempt logged     |                    |               |             |
| 1.3         | Invalid Password                     | 1. Navigate to login page<br>2. Enter valid username<br>3. Enter incorrect password<br>4. Submit login form                                                                                | - Login fails<br>- Same generic error message<br>- No specific indication password is wrong<br>- Failed attempt logged<br>- Account not locked after single attempt                             |                    |               |             |
| 1.4         | SQL Injection in Login               | 1. Navigate to login page<br>2. Enter SQL injection payloads in username:<br>&nbsp;&nbsp;• `admin' OR '1'='1`<br>&nbsp;&nbsp;• `' OR 1=1--`<br>&nbsp;&nbsp;• `admin'--`<br>3. Submit login | - Login fails<br>- No SQL error messages<br>- Injection attempt blocked<br>- No authentication bypass<br>- Attempt logged as security event                                                     |                    |               |             |
| 1.5         | Account Lockout Testing              | 1. Attempt login with wrong password<br>2. Repeat 5 times consecutively<br>3. Attempt 6th login<br>4. Try correct password after lockout                                                   | - Account locked after N failed attempts<br>- Lockout message displayed<br>- Lockout duration enforced<br>- Admin notification sent<br>- Cannot login even with correct password during lockout |                    |               |             |
| 1.6         | Inactive Account Login               | 1. Create user account<br>2. Set account status to inactive in database<br>3. Attempt to login with valid credentials                                                                      | - Login fails<br>- Message indicates account is inactive<br>- No session created<br>- Security event logged<br>- User cannot access system                                                      |                    |               |             |
| 1.7         | Employee Self-Service Login          | 1. Navigate to employee login<br>2. Enter valid ZAN ID<br>3. Enter valid ZSSF Number<br>4. Enter valid Payroll Number<br>5. Submit login                                                   | - Employee authenticated successfully<br>- User account auto-created on first login (JIT)<br>- Employee role assigned<br>- Default password set securely<br>- Session created                   |                    |               |             |
| 1.8         | Employee Login - Invalid Credentials | 1. Navigate to employee login<br>2. Enter invalid ZAN ID<br>3. Enter any ZSSF and Payroll numbers<br>4. Submit                                                                             | - Login fails<br>- Generic error message<br>- No employee enumeration possible<br>- Failed attempt logged                                                                                       |                    |               |             |
| 1.9         | Default Password Security            | 1. Create new employee account<br>2. Check default password assignment<br>3. Attempt login with default password<br>4. Verify password change requirement                                  | - Default password is NOT predictable (not ZAN ID)<br>- Strong random password generated<br>- User forced to change on first login<br>- Password change enforced before access                  |                    |               |             |
| 1.10        | Password Brute Force Protection      | 1. Use automated tool (Hydra/Burp Intruder)<br>2. Attempt 100+ login attempts rapidly<br>3. Monitor response times and lockout                                                             | - Rate limiting enforced<br>- IP-based blocking after threshold<br>- CAPTCHA presented after N attempts<br>- Account lockout triggered<br>- Admin alert generated                               |                    |               |             |
| 1.11        | Credential Stuffing Attack           | 1. Use known compromised credential lists<br>2. Attempt automated login attempts<br>3. Monitor detection mechanisms                                                                        | - Attack detected<br>- IP blocked/rate limited<br>- Security team notified<br>- Affected accounts flagged<br>- Users notified of suspicious activity                                            |                    |               |             |
| 1.12        | Multi-Factor Authentication (MFA)    | 1. Login with valid credentials<br>2. Verify MFA prompt<br>3. Enter correct OTP/code<br>4. Test incorrect OTP<br>5. Test expired OTP                                                       | - MFA required for sensitive roles<br>- Valid OTP grants access<br>- Invalid OTP denies access<br>- Expired OTP rejected<br>- Limited OTP attempts before lockout                               |                    |               |             |

---

### **Security Domain:** Authorization & Access Control

### **Test Case No.: 2**

**Process/Function Name:** Role-Based Access Control (RBAC) & Authorization

**Function Description:** This module tests the implementation of role-based access control, ensuring users can only access resources and perform actions authorized for their role. Tests vertical and horizontal privilege escalation vulnerabilities.

| **Case ID** | **Test Case Scenario**                 | **Test Steps**                                                                                                                                                   | **Expected Results**                                                                                                                                                                                            | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 2.1         | Admin Role - Full Access               | 1. Login as Admin user<br>2. Attempt to access all admin features<br>3. Try CRUD operations on users<br>4. Access system configurations                          | - Admin can access all admin panels<br>- Can create/edit/delete users<br>- Can view system settings<br>- Can access all institutions' data<br>- Admin actions logged                                            |                    |               |             |
| 2.2         | Employee Role - Limited Access         | 1. Login as EMPLOYEE<br>2. Attempt to access admin panels<br>3. Try to view other employees' data<br>4. Attempt admin operations                                 | - Cannot access admin features<br>- 403 Forbidden on admin routes<br>- Can only see own data<br>- Cannot perform admin operations<br>- Access denial logged                                                     |                    |               |             |
| 2.3         | Institution-Based Access Control       | 1. Login as HRO from Institution A<br>2. Attempt to view employees from Institution B<br>3. Try to access Institution B's requests<br>4. Test API direct calls   | - Can only see own institution data<br>- API filters by institutionId<br>- Cannot access other institutions via API<br>- Direct object reference blocked<br>- Filter enforced at database level                 |                    |               |             |
| 2.4         | CSC Internal Roles - Cross-Institution | 1. Login as HHRMD (CSC internal)<br>2. View employees from multiple institutions<br>3. Access requests from all institutions<br>4. Verify full system visibility | - Can view all institutions' data<br>- No institution filter applied<br>- Full system-wide access<br>- CSC role privileges enforced<br>- Access logged                                                          |                    |               |             |
| 2.5         | Vertical Privilege Escalation          | 1. Login as regular EMPLOYEE<br>2. Modify request to include admin role in JWT/session<br>3. Attempt admin operations<br>4. Directly call admin API endpoints    | - Role modification blocked<br>- Server validates role from database<br>- Admin operations denied<br>- Security alert generated<br>- Attack attempt logged                                                      |                    |               |             |
| 2.6         | Horizontal Privilege Escalation        | 1. Login as Employee A<br>2. Find Employee B's ID<br>3. Modify API request to access Employee B's data<br>4. Attempt to update Employee B's profile              | - Access denied to other users' data<br>- User ID verified against session<br>- Cannot modify other users' data<br>- Insecure Direct Object Reference (IDOR) prevented<br>- Attempt logged                      |                    |               |             |
| 2.7         | API Authorization Testing              | 1. Obtain API endpoint list<br>2. Call each endpoint without authentication<br>3. Call with invalid/expired token<br>4. Call with wrong role                     | - All API routes require authentication<br>- Unauthenticated calls return 401<br>- Invalid tokens rejected<br>- Role-based access enforced<br>- No data leakage on denied requests                              |                    |               |             |
| 2.8         | Role Switching Attack                  | 1. Login with one role<br>2. Change role in localStorage/cookie<br>3. Refresh page<br>4. Attempt operations                                                      | - Client-side role change ineffective<br>- Server validates role from database<br>- No unauthorized access granted<br>- Session invalidated on mismatch<br>- Attack detected and logged                         |                    |               |             |
| 2.9         | Session Hijacking via Role             | 1. Capture another user's session token<br>2. Use token to access system<br>3. Attempt operations as hijacked user                                               | - Token validation includes user binding<br>- IP address validation enforced<br>- User agent validation<br>- Session invalidated on suspicious activity<br>- User notified of session hijack                    |                    |               |             |
| 2.10        | Complaint Access Control               | 1. Login as EMPLOYEE A<br>2. Create complaint<br>3. Logout and login as EMPLOYEE B<br>4. Attempt to access Employee A's complaint                                | - Employee B cannot see Employee A's complaint<br>- Complaint access restricted to owner<br>- DO/HHRMD can see complaints assigned to them<br>- Proper complaint routing enforced<br>- Access violations logged |                    |               |             |

---

### **Security Domain:** Session Management Security

### **Test Case No.: 3**

**Process/Function Name:** Session Management & Token Security

**Function Description:** This module tests session creation, maintenance, expiration, and security. Includes testing for session fixation, session hijacking, and proper session lifecycle management.

| **Case ID** | **Test Case Scenario**       | **Test Steps**                                                                                                                                            | **Expected Results**                                                                                                                                                                                           | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 3.1         | Session Creation on Login    | 1. Login with valid credentials<br>2. Inspect session storage<br>3. Check for session tokens<br>4. Verify session attributes                              | - Secure session token generated<br>- Token stored in httpOnly cookie (not localStorage)<br>- Session ID cryptographically random<br>- Session bound to user ID<br>- Creation timestamp recorded               |                    |               |             |
| 3.2         | Session Token Security       | 1. Login and capture session token<br>2. Analyze token structure<br>3. Attempt to decode/modify token<br>4. Use modified token                            | - Token is cryptographically signed<br>- Cannot be decoded without key<br>- Modified tokens rejected<br>- JWT uses strong algorithm (RS256/HS256)<br>- Token includes expiration claim                         |                    |               |             |
| 3.3         | Session Expiration           | 1. Login to system<br>2. Wait for session timeout period<br>3. Attempt to access protected resource<br>4. Check token validity                            | - Session expires after inactivity period (30 min)<br>- Expired session redirects to login<br>- Token marked as expired<br>- Cannot use expired token<br>- User prompted to re-authenticate                    |                    |               |             |
| 3.4         | Session Fixation Attack      | 1. Create session without logging in<br>2. Note session ID<br>3. Login with valid credentials<br>4. Check if session ID changed                           | - New session ID generated on login<br>- Old session invalidated<br>- Session fixation prevented<br>- Cannot reuse pre-login session<br>- Old session ID doesn't work                                          |                    |               |             |
| 3.5         | Session Hijacking Protection | 1. Login and capture session token<br>2. Use token from different IP address<br>3. Use token with different User-Agent<br>4. Monitor detection mechanisms | - IP address bound to session<br>- Suspicious IP change detected<br>- User-Agent validation enforced<br>- Session invalidated on mismatch<br>- User notified of unusual activity                               |                    |               |             |
| 3.6         | Concurrent Session Handling  | 1. Login from Browser A<br>2. Login same user from Browser B<br>3. Verify both sessions<br>4. Check session limits                                        | - Previous session invalidated OR<br>- Both sessions allowed with limit<br>- Max concurrent sessions enforced<br>- User notified of new login<br>- Session list viewable by user                               |                    |               |             |
| 3.7         | Logout Functionality         | 1. Login to system<br>2. Capture session token<br>3. Logout<br>4. Attempt to use old token                                                                | - Session token invalidated<br>- Token removed from client<br>- Cannot reuse logged-out token<br>- Database session cleared<br>- Redirect to login page                                                        |                    |               |             |
| 3.8         | Token Refresh Mechanism      | 1. Login to system<br>2. Wait for access token to near expiration<br>3. Use refresh token<br>4. Verify new access token                                   | - Refresh token works before expiration<br>- New access token issued<br>- Refresh token rotated (not reused)<br>- Old refresh token invalidated<br>- Refresh token has longer lifetime                         |                    |               |             |
| 3.9         | Session Storage Security     | 1. Login to system<br>2. Inspect browser storage (localStorage, sessionStorage, cookies)<br>3. Check for sensitive data<br>4. Verify storage flags        | - Tokens in httpOnly cookies (XSS protection)<br>- Cookies have Secure flag (HTTPS only)<br>- SameSite flag set (CSRF protection)<br>- No sensitive data in localStorage<br>- Session data encrypted if stored |                    |               |             |
| 3.10        | Cross-Tab Session Sync       | 1. Login in Tab A<br>2. Logout in Tab B<br>3. Check Tab A session status<br>4. Verify synchronization                                                     | - Logout syncs across all tabs<br>- All tabs redirect to login<br>- Session state synchronized<br>- No zombie sessions<br>- Broadcast channel or storage events used                                           |                    |               |             |
| 3.11        | Remember Me Functionality    | 1. Login with "Remember Me" checked<br>2. Close browser<br>3. Reopen browser<br>4. Check session persistence                                              | - Session persists after browser close<br>- Longer-lived refresh token issued<br>- Still requires re-auth for sensitive ops<br>- "Remember Me" token secure<br>- User can revoke persistent sessions           |                    |               |             |
| 3.12        | Session Validation Endpoint  | 1. Call `/api/auth/session` without token<br>2. Call with invalid token<br>3. Call with expired token<br>4. Call with valid token                         | - Unauthenticated returns 401<br>- Invalid token returns 401<br>- Expired token returns 401<br>- Valid token returns user data<br>- **CRITICAL:** Endpoint actually validates (not always true)                |                    |               |             |

---

### **Security Domain:** Input Validation & Injection Prevention

### **Test Case No.: 4**

**Process/Function Name:** Input Validation, Sanitization & Injection Attack Prevention

**Function Description:** This module tests input validation mechanisms and protection against various injection attacks including SQL injection, NoSQL injection, Command injection, LDAP injection, and other code injection vulnerabilities.

| **Case ID** | **Test Case Scenario**                 | **Test Steps**                                                                                                                                                                                                 | **Expected Results**                                                                                                                                                               | **Actual Results**                                                                                                                                                              | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------- | --- |
| 4.1         | SQL Injection - Login Form             | 1. Enter SQL payloads in username field:<br>&nbsp;&nbsp;• `' OR '1'='1`<br>&nbsp;&nbsp;• `admin'--`<br>&nbsp;&nbsp;• `' OR '1'='1'--`<br>2. Submit login<br>3. Check for SQL errors                            | - All payloads blocked<br>- No SQL syntax errors shown<br>- No authentication bypass<br>- Parameterized queries used<br>- Injection attempts logged                                |                                                                                                                                                                                 |               |             |
| 4.2         | SQL Injection - Search Fields          | 1. Use SQLMap or manual payloads in search:<br>&nbsp;&nbsp;• `1' UNION SELECT NULL--`<br>&nbsp;&nbsp;• `1' AND 1=1--`<br>2. Test employee search<br>3. Test institution search                                 | - No SQL injection possible<br>- Prisma ORM prevents injection<br>- No raw SQL queries vulnerable<br>- Error messages generic<br>- No database structure exposed                   |                                                                                                                                                                                 |               |             |
| 4.3         | SQL Injection - Numeric Parameters     | 1. Test ID parameters with SQL:<br>&nbsp;&nbsp;• `1 OR 1=1`<br>&nbsp;&nbsp;• `1'; DROP TABLE users--`<br>2. Test pagination parameters<br>3. Test filtering parameters                                         | - Numeric validation enforced<br>- Non-numeric input rejected<br>- No SQL execution<br>- Type validation via Zod<br>- Prisma type safety prevents injection                        |                                                                                                                                                                                 |               |             |
| 4.4         | Cross-Site Scripting (XSS) - Stored    | 1. Enter XSS payloads in user profile:<br>&nbsp;&nbsp;• `<script>alert('XSS')</script>`<br>&nbsp;&nbsp;• `<img src=x onerror=alert(1)>`<br>2. Save data<br>3. View profile page<br>4. Check if script executes | - XSS payloads sanitized<br>- HTML entities encoded<br>- Scripts don't execute<br>- Output properly escaped<br>- Content Security Policy enforced                                  |                                                                                                                                                                                 |               |             |
| 4.5         | Cross-Site Scripting (XSS) - Reflected | 1. Test URL parameters with XSS:<br>&nbsp;&nbsp;• `?name=<script>alert(1)</script>`<br>&nbsp;&nbsp;• `?search=<img src=x onerror=alert(1)>`<br>2. Check if payload reflected in page<br>3. Verify encoding     | - URL parameters sanitized<br>- Reflected content encoded<br>- No script execution<br>- CSP blocks inline scripts<br>- XSS filter active                                           |                                                                                                                                                                                 |               |             |
| 4.6         | Cross-Site Scripting (XSS) - DOM-based | 1. Test client-side JavaScript with XSS<br>2. Manipulate DOM via input:<br>&nbsp;&nbsp;• innerHTML injections<br>&nbsp;&nbsp;• eval() usage<br>3. Test React component props                                   | - No innerHTML usage with user data<br>- React escapes by default<br>- No eval() or Function() with user input<br>- DOMPurify used if needed<br>- Secure coding practices followed |                                                                                                                                                                                 |               |             |
| 4.7         | Command Injection                      | 1. If file operations exist, test:<br>&nbsp;&nbsp;• `; ls -la`<br>&nbsp;&nbsp;• `                                                                                                                              | cat /etc/passwd`<br>&nbsp;&nbsp;• `&& whoami`<br>2. Test any system calls<br>3. Test file upload filenames                                                                         | - No command injection possible<br>- No shell command execution with user input<br>- File operations sanitized<br>- Allowlist validation used<br>- Dangerous characters blocked |               |             |     |
| 4.8         | LDAP Injection                         | 1. If LDAP auth exists, test:<br>&nbsp;&nbsp;• `_)(uid=_))(                                                                                                                                                    | (uid=_`<br>&nbsp;&nbsp;• `admin)(&(password=_))`<br>2. Test search filters<br>3. Attempt authentication bypass                                                                     | - LDAP queries parameterized<br>- Special characters escaped<br>- No LDAP injection possible<br>- Input validation strict<br>- Authentication not bypassed                      |               |             |     |
| 4.9         | Path Traversal                         | 1. Test file access endpoints:<br>&nbsp;&nbsp;• `../../etc/passwd`<br>&nbsp;&nbsp;• `..\..\windows\system32`<br>2. Test file download features<br>3. Test image/document URLs                                  | - Path traversal blocked<br>- Absolute path validation<br>- No access outside allowed directories<br>- Filename sanitization enforced<br>- Allowlist of directories                |                                                                                                                                                                                 |               |             |
| 4.10        | XML/XXE Injection                      | 1. If XML parsing exists, test:<br>&nbsp;&nbsp;• External entity definitions<br>&nbsp;&nbsp;• Billion laughs attack<br>2. Upload malicious XML<br>3. Test API with XML                                         | - External entities disabled<br>- XML parser securely configured<br>- DTD processing disabled<br>- File disclosure prevented<br>- DoS via XML prevented                            |                                                                                                                                                                                 |               |             |
| 4.11        | Email Header Injection                 | 1. Test email inputs with headers:<br>&nbsp;&nbsp;• `test@test.com\nCC:hacker@evil.com`<br>&nbsp;&nbsp;• `test\r\nBCC:spam@spam.com`<br>2. Test contact forms<br>3. Test notification emails                   | - Newline characters blocked<br>- Email headers validated<br>- Cannot inject additional recipients<br>- Email library handles safely<br>- SMTP injection prevented                 |                                                                                                                                                                                 |               |             |
| 4.12        | Input Length Validation                | 1. Submit extremely long strings (10,000+ chars)<br>2. Test all text fields<br>3. Check for buffer overflows<br>4. Test performance impact                                                                     | - Maximum length enforced<br>- Database constraints respected<br>- No application crashes<br>- Validation errors returned<br>- DoS via long input prevented                        |                                                                                                                                                                                 |               |             |
| 4.13        | Special Characters & Unicode           | 1. Test with special characters:<br>&nbsp;&nbsp;• Emoji: 😀🎉<br>&nbsp;&nbsp;• Unicode: \u0000, \u202E<br>&nbsp;&nbsp;• Null bytes: \0<br>2. Test right-to-left override<br>3. Test Unicode normalization      | - Special characters handled correctly<br>- UTF-8 encoding enforced<br>- Null bytes rejected<br>- No character encoding vulnerabilities<br>- Unicode normalized properly           |                                                                                                                                                                                 |               |             |
| 4.14        | Content Type Validation                | 1. Submit JSON to form endpoint<br>2. Submit form data to JSON API<br>3. Change Content-Type header<br>4. Test MIME type confusion                                                                             | - Content-Type validated<br>- Mismatched content rejected<br>- JSON parsing errors handled<br>- No type confusion vulnerabilities<br>- Strict content type enforcement             |                                                                                                                                                                                 |               |             |

---

### **Security Domain:** Cross-Site Request Forgery (CSRF) Protection

### **Test Case No.: 5**

**Process/Function Name:** CSRF Protection & Same-Origin Policy

**Function Description:** This module tests protection against Cross-Site Request Forgery attacks where attackers trick authenticated users into performing unwanted actions. Tests CSRF token implementation, SameSite cookies, and origin validation.

| **Case ID** | **Test Case Scenario**           | **Test Steps**                                                                                                                                                                                                                                    | **Expected Results**                                                                                                                                                                                     | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 5.1         | CSRF Token Generation            | 1. Login to application<br>2. Inspect forms for CSRF tokens<br>3. Check token presence in requests<br>4. Verify token randomness                                                                                                                  | - CSRF token present in all forms<br>- Token cryptographically random<br>- Unique token per session<br>- Token in hidden field or header<br>- Token rotates periodically                                 |                    |               |             |
| 5.2         | CSRF Token Validation            | 1. Submit form without CSRF token<br>2. Submit with invalid token<br>3. Submit with expired token<br>4. Submit with another user's token                                                                                                          | - Request rejected without token (403)<br>- Invalid token rejected<br>- Expired token rejected<br>- Token bound to user session<br>- Error message doesn't leak info                                     |                    |               |             |
| 5.3         | CSRF Attack - State-Changing GET | 1. Create malicious link:<br>&nbsp;&nbsp;• `<img src="/api/users/delete?id=1">`<br>2. Send to authenticated user<br>3. Check if action executes                                                                                                   | - GET requests don't modify state<br>- State changes only on POST/PUT/DELETE<br>- Action not executed via GET<br>- CSRF protection not bypassed<br>- Security best practices followed                    |                    |               |             |
| 5.4         | CSRF Attack - Malicious Form     | 1. Create external page with form:<br>`html<br><form action="http://csms.app/api/users" method="POST"><br>  <input name="role" value="Admin"><br>  <input type="submit"><br></form>`<br>2. Auto-submit on page load<br>3. Test if action succeeds | - Request blocked due to missing CSRF token<br>- Origin header validated<br>- Referer header checked<br>- SameSite cookie prevents inclusion<br>- User not compromised                                   |                    |               |             |
| 5.5         | SameSite Cookie Attribute        | 1. Login and inspect cookies<br>2. Check SameSite attribute<br>3. Attempt cross-site request<br>4. Verify cookie behavior                                                                                                                         | - Cookies have `SameSite=Lax` or `Strict`<br>- Cookies not sent on cross-site POST<br>- CSRF protection via SameSite<br>- Compatible with user workflow<br>- Fallback CSRF tokens still present          |                    |               |             |
| 5.6         | Origin Header Validation         | 1. Send POST request with different Origin<br>2. Set Origin to attacker domain<br>3. Omit Origin header<br>4. Test API endpoints                                                                                                                  | - Origin header validated<br>- Cross-origin requests rejected<br>- Only allowed origins accepted<br>- No origin defaults to reject<br>- CORS properly configured                                         |                    |               |             |
| 5.7         | Referer Header Validation        | 1. Send request with wrong Referer<br>2. Send request without Referer<br>3. Test various Referer spoofing                                                                                                                                         | - Referer validated for sensitive operations<br>- Missing Referer handled securely<br>- Referer from other domains rejected<br>- Validation as defense-in-depth<br>- Not sole CSRF protection            |                    |               |             |
| 5.8         | Double-Submit Cookie Pattern     | 1. Check if CSRF token in cookie matches request<br>2. Modify cookie value<br>3. Send request with mismatched token                                                                                                                               | - CSRF token in both cookie and request<br>- Values must match<br>- Mismatched tokens rejected<br>- Secure random values<br>- Defense-in-depth approach                                                  |                    |               |             |
| 5.9         | Custom Header Requirement        | 1. Test API endpoints<br>2. Send request without custom header<br>3. Check if custom header required                                                                                                                                              | - Custom header required (e.g., X-Requested-With)<br>- Simple CORS preflight triggered<br>- Cross-origin requests must be explicit<br>- Header validation enforced<br>- Additional CSRF protection layer |                    |               |             |
| 5.10        | CSRF on Critical Operations      | 1. Test critical functions:<br>&nbsp;&nbsp;• Password change<br>&nbsp;&nbsp;• Email change<br>&nbsp;&nbsp;• Role modification<br>&nbsp;&nbsp;• User deletion<br>2. Attempt CSRF attacks                                                           | - All critical operations protected<br>- CSRF tokens required<br>- Additional confirmation required<br>- Re-authentication for sensitive ops<br>- Multiple layers of protection                          |                    |               |             |
| 5.11        | JSON-based CSRF                  | 1. Attempt CSRF with JSON payload<br>2. Set Content-Type: application/json<br>3. Test if CORS preflight blocks                                                                                                                                    | - JSON requests trigger preflight<br>- CORS headers restrict origins<br>- CSRF token still validated<br>- Content-Type validation enforced<br>- JSON APIs protected                                      |                    |               |             |
| 5.12        | Login CSRF                       | 1. Create form that posts to login<br>2. Pre-fill with attacker credentials<br>3. Trick user to submit<br>4. User logged in as attacker                                                                                                           | - Login endpoint protected against CSRF<br>- CSRF token on login form<br>- User not logged in as attacker<br>- Session fixation prevented<br>- Login CSRF mitigated                                      |                    |               |             |

---

### **Security Domain:** File Upload Security

### **Test Case No.: 6**

**Process/Function Name:** File Upload Security & Validation

**Function Description:** This module tests security controls around file upload functionality including file type validation, size limits, malware prevention, and secure storage. Tests for malicious file upload vulnerabilities.

| **Case ID** | **Test Case Scenario**           | **Test Steps**                                                                                                                                                                               | **Expected Results**                                                                                                                                                              | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 6.1         | File Type Validation - PDF Only  | 1. Navigate to file upload<br>2. Attempt to upload allowed file (PDF)<br>3. Verify successful upload<br>4. Check file stored correctly                                                       | - PDF files upload successfully<br>- File stored in MinIO<br>- URL generated and returned<br>- Metadata saved to database<br>- File accessible via URL                            |                    |               |             |
| 6.2         | File Type Rejection - Executable | 1. Attempt to upload .exe file<br>2. Try .bat, .sh, .app files<br>3. Test with disguised extensions (.pdf.exe)<br>4. Monitor rejection                                                       | - Executable files rejected<br>- Error message displayed<br>- No file stored<br>- Content type verified (not just extension)<br>- Magic number validation                         |                    |               |             |
| 6.3         | File Type Validation - MIME Type | 1. Create .exe file<br>2. Rename to .pdf<br>3. Attempt upload<br>4. Verify detection                                                                                                         | - File rejected despite .pdf extension<br>- MIME type checked<br>- Magic bytes verified<br>- Content inspection performed<br>- MIME type spoofing prevented                       |                    |               |             |
| 6.4         | File Size Limit Enforcement      | 1. Attempt to upload 1MB PDF (allowed)<br>2. Attempt 2MB PDF (at limit)<br>3. Attempt 3MB PDF (over limit)<br>4. Attempt 100MB file                                                          | - Files under 2MB accepted<br>- Files at 2MB accepted<br>- Files over 2MB rejected<br>- Clear error message<br>- No DoS via large files                                           |                    |               |             |
| 6.5         | Malicious PDF Upload             | 1. Create PDF with embedded JavaScript<br>2. Create PDF with form actions<br>3. Create PDF with file attachments<br>4. Upload and check sanitization                                         | - Malicious PDFs detected/sanitized<br>- Embedded scripts removed<br>- File served with correct headers<br>- X-Content-Type-Options: nosniff<br>- Content-Disposition: attachment |                    |               |             |
| 6.6         | Filename Sanitization            | 1. Upload file with special chars:<br>&nbsp;&nbsp;• `../../etc/passwd.pdf`<br>&nbsp;&nbsp;• `<script>alert(1)</script>.pdf`<br>&nbsp;&nbsp;• `file;rm -rf /.pdf`<br>2. Check stored filename | - Filename sanitized<br>- Special characters removed/replaced<br>- Path traversal attempts blocked<br>- Only safe characters allowed<br>- Unique filename generated               |                    |               |             |
| 6.7         | Double Extension Attack          | 1. Upload files:<br>&nbsp;&nbsp;• `file.pdf.exe`<br>&nbsp;&nbsp;• `file.php.pdf`<br>&nbsp;&nbsp;• `file.pdf.jsp`<br>2. Check if file executed                                                | - Double extensions detected<br>- File rejected or extension normalized<br>- No code execution<br>- Proper MIME validation<br>- Files not executable on server                    |                    |               |             |
| 6.8         | Polyglot File Attack             | 1. Create file valid as both PDF and script<br>2. Upload polyglot file<br>3. Attempt to execute<br>4. Check file handling                                                                    | - Polyglot files detected<br>- Strict file format validation<br>- No code execution possible<br>- File served safely<br>- Content type enforced                                   |                    |               |             |
| 6.9         | Virus/Malware Scanning           | 1. Upload EICAR test file<br>2. Upload known malware samples (in safe environment)<br>3. Check for virus scanning<br>4. Verify detection                                                     | - EICAR file detected and blocked<br>- Malware scanning performed<br>- ClamAV or similar integrated<br>- Infected files quarantined<br>- Admin notified                           |                    |               |             |
| 6.10        | File Storage Security            | 1. Upload legitimate file<br>2. Check MinIO storage location<br>3. Verify access controls<br>4. Test direct URL access                                                                       | - Files stored outside web root<br>- MinIO bucket permissions correct<br>- No directory listing<br>- Presigned URLs with expiration<br>- URLs not easily guessable                |                    |               |             |
| 6.11        | File Download Security           | 1. Download uploaded file<br>2. Check HTTP headers<br>3. Verify Content-Disposition<br>4. Test MIME type sniffing                                                                            | - Content-Disposition: attachment<br>- X-Content-Type-Options: nosniff<br>- Correct Content-Type header<br>- No inline execution<br>- Safe download enforced                      |                    |               |             |
| 6.12        | File Upload Rate Limiting        | 1. Upload 10 files rapidly<br>2. Continue uploading<br>3. Test for rate limits<br>4. Monitor storage quota                                                                                   | - Upload rate limited per user<br>- Excessive uploads blocked<br>- Storage quota enforced<br>- No DoS via file uploads<br>- Admin notified of abuse                               |                    |               |             |
| 6.13        | Metadata Exposure                | 1. Upload file with metadata (EXIF, etc.)<br>2. Download file<br>3. Check if metadata present<br>4. Verify PII in metadata                                                                   | - Sensitive metadata stripped<br>- EXIF data removed if applicable<br>- No PII leakage via metadata<br>- Author/company info removed<br>- Metadata sanitization performed         |                    |               |             |
| 6.14        | Concurrent Upload Handling       | 1. Upload multiple files simultaneously<br>2. Test race conditions<br>3. Verify all files stored correctly<br>4. Check for conflicts                                                         | - Concurrent uploads handled<br>- No race conditions<br>- Unique filenames guaranteed<br>- All files stored successfully<br>- No data corruption                                  |                    |               |             |

---

### **Security Domain:** Password Security & Cryptography

### **Test Case No.: 7**

**Process/Function Name:** Password Policies, Hashing & Cryptographic Security

**Function Description:** This module tests password security including password policies, strength requirements, secure hashing algorithms, password reset mechanisms, and protection against password-related attacks.

| **Case ID** | **Test Case Scenario**              | **Test Steps**                                                                                                                                                   | **Expected Results**                                                                                                                                                                                                              | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 7.1         | Password Complexity Requirements    | 1. Attempt password change<br>2. Try weak passwords:<br>&nbsp;&nbsp;• "password"<br>&nbsp;&nbsp;• "12345678"<br>&nbsp;&nbsp;• "qwerty"<br>3. Try strong password | - Weak passwords rejected<br>- Requirements enforced:<br>&nbsp;&nbsp;• Min 8 characters<br>&nbsp;&nbsp;• Uppercase + lowercase<br>&nbsp;&nbsp;• Numbers<br>&nbsp;&nbsp;• Special characters recommended<br>- Clear error messages |                    |               |             |
| 7.2         | Password Hashing Verification       | 1. Create new user<br>2. Check password in database<br>3. Verify hashing algorithm<br>4. Test hash strength                                                      | - Password not stored in plaintext<br>- bcrypt hashing used<br>- Salt automatically generated<br>- Cost factor ≥ 10 (2^10 iterations)<br>- Hashes non-reversible                                                                  |                    |               |             |
| 7.3         | Password Hash Uniqueness            | 1. Create multiple users with same password<br>2. Compare hashes in database<br>3. Verify salt uniqueness                                                        | - Each hash is unique<br>- Salt generated per password<br>- Same password produces different hashes<br>- Rainbow table attacks prevented<br>- Proper bcrypt implementation                                                        |                    |               |             |
| 7.4         | Password Change Security            | 1. Login as user<br>2. Navigate to change password<br>3. Enter current password<br>4. Enter new password<br>5. Submit change                                     | - Current password required<br>- New password validated against policy<br>- Cannot reuse last N passwords<br>- Password updated in database<br>- User notified of change                                                          |                    |               |             |
| 7.5         | Password Reset - Email Verification | 1. Request password reset<br>2. Receive reset email<br>3. Check reset link/token<br>4. Verify token properties                                                   | - Reset email sent to verified address<br>- Token cryptographically random<br>- Token single-use only<br>- Token expires (15-60 minutes)<br>- Token not predictable                                                               |                    |               |             |
| 7.6         | Password Reset - Token Security     | 1. Obtain reset token<br>2. Use token to reset password<br>3. Attempt to reuse token<br>4. Test expired token                                                    | - Valid token resets password<br>- Token invalidated after use<br>- Expired tokens rejected<br>- Token bound to user account<br>- Cannot reset other users' passwords                                                             |                    |               |             |
| 7.7         | Password Reset Rate Limiting        | 1. Request password reset<br>2. Immediately request again<br>3. Repeat 5+ times<br>4. Monitor rate limiting                                                      | - Rate limiting enforced<br>- Max N requests per time period<br>- Email flood prevented<br>- User notified of limit<br>- Account not locked                                                                                       |                    |               |             |
| 7.8         | Common Password Dictionary          | 1. Attempt to set common passwords:<br>&nbsp;&nbsp;• "Password123"<br>&nbsp;&nbsp;• "Qwerty123"<br>&nbsp;&nbsp;• "Welcome1"<br>2. Check rejection                | - Common passwords blocked<br>- Dictionary check performed<br>- Have I Been Pwned API used<br>- User educated on password strength<br>- Suggestions provided                                                                      |                    |               |             |
| 7.9         | Password Entropy Check              | 1. Test password strength meter<br>2. Try various complexity levels<br>3. Verify strength calculation<br>4. Check user feedback                                  | - Strength meter displays<br>- Entropy calculated correctly<br>- Visual feedback provided<br>- User educated on strength<br>- Encourages strong passwords                                                                         |                    |               |             |
| 7.10        | Password Enumeration Prevention     | 1. Request reset for existing user<br>2. Request reset for non-existing email<br>3. Compare responses<br>4. Check for timing differences                         | - Same response for both scenarios<br>- Generic message shown<br>- No user enumeration possible<br>- Timing attacks mitigated<br>- Email existence not revealed                                                                   |                    |               |             |
| 7.11        | Credential Stuffing Protection      | 1. Attempt automated password guessing<br>2. Use leaked credential lists<br>3. Test detection mechanisms<br>4. Verify blocking                                   | - Automated attempts detected<br>- Rate limiting enforced<br>- CAPTCHA presented<br>- Account lockout after threshold<br>- Security team alerted                                                                                  |                    |               |             |
| 7.12        | Password Storage Audit              | 1. Review database schema<br>2. Check password field properties<br>3. Verify no plaintext passwords<br>4. Check access controls                                  | - Password field non-readable format<br>- Database encrypted at rest<br>- Access controls on password table<br>- No passwords in logs<br>- Backup encryption verified                                                             |                    |               |             |
| 7.13        | Legacy Hash Migration               | 1. If legacy hashes exist, verify migration<br>2. Test old hash format<br>3. Verify rehashing on login<br>4. Check upgrade process                               | - Legacy hashes identified<br>- Rehashed to bcrypt on login<br>- Secure migration process<br>- No password resets required<br>- Gradual upgrade strategy                                                                          |                    |               |             |
| 7.14        | Password in Transit Security        | 1. Submit password over network<br>2. Capture network traffic<br>3. Verify encryption<br>4. Check for HTTPS enforcement                                          | - HTTPS enforced for all password forms<br>- TLS 1.2+ used<br>- Strong cipher suites<br>- No password in URL parameters<br>- Secure transmission verified                                                                         |                    |               |             |

---

### **Security Domain:** API Security Testing

### **Test Case No.: 8**

**Process/Function Name:** API Security, Rate Limiting & Abuse Prevention

**Function Description:** This module tests API security including authentication, authorization, rate limiting, input validation, and protection against API abuse and automated attacks.

| **Case ID** | **Test Case Scenario**                   | **Test Steps**                                                                                                                                                  | **Expected Results**                                                                                                                                                                                                     | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------- | ----------- |
| 8.1         | API Authentication Enforcement           | 1. List all API endpoints<br>2. Call each without authentication<br>3. Call with invalid token<br>4. Monitor responses                                          | - All protected endpoints require auth<br>- Return 401 Unauthorized<br>- No data leakage<br>- Public endpoints clearly defined<br>- Auth mechanism consistent                                                            |                    |               |             |
| 8.2         | API Authorization Testing                | 1. Login as regular user<br>2. Call admin API endpoints<br>3. Call other users' endpoints<br>4. Verify access control                                           | - Admin APIs reject regular users (403)<br>- Cannot access other users' data<br>- Role-based access enforced<br>- Ownership validation performed<br>- Authorization consistent                                           |                    |               |             |
| 8.3         | API Rate Limiting - General              | 1. Make 100 requests to API endpoint<br>2. Monitor response headers<br>3. Check for rate limit enforcement<br>4. Test limit reset                               | - Rate limit enforced<br>- Headers include:<br>&nbsp;&nbsp;• X-RateLimit-Limit<br>&nbsp;&nbsp;• X-RateLimit-Remaining<br>&nbsp;&nbsp;• X-RateLimit-Reset<br>- 429 Too Many Requests returned<br>- Limit resets correctly |                    |               |             |
| 8.4         | API Rate Limiting - Authentication       | 1. Attempt 20+ login attempts<br>2. Test from same IP<br>3. Test with different usernames<br>4. Monitor blocking                                                | - Login endpoint rate limited<br>- Stricter limits than other endpoints<br>- IP-based and username-based limits<br>- Progressive delays implemented<br>- Brute force prevented                                           |                    |               |             |
| 8.5         | API Enumeration Prevention               | 1. Iterate user IDs: /api/users/1, /api/users/2...<br>2. Test sequential access<br>3. Check response differences<br>4. Verify protection                        | - User enumeration prevented<br>- Same response for missing/unauthorized<br>- UUIDs used instead of sequential IDs<br>- No information leakage<br>- Timing attacks mitigated                                             |                    |               |             |
| 8.6         | API Mass Assignment Vulnerability        | 1. Send POST with extra fields:<br>`json<br>{<br>  "name": "User",<br>  "role": "Admin",<br>  "isActive": true<br>}<br>`<br>2. Check if unauthorized fields set | - Extra fields ignored<br>- Only allowed fields processed<br>- Role/permission fields protected<br>- Schema validation enforced<br>- No privilege escalation                                                             |                    |               |             |
| 8.7         | API Parameter Tampering                  | 1. Modify URL parameters<br>2. Change request body values<br>3. Inject additional parameters<br>4. Test validation                                              | - All parameters validated<br>- Type checking enforced<br>- Range validation performed<br>- Unexpected parameters rejected<br>- No parameter pollution                                                                   |                    |               |             |
| 8.8         | API Response Data Leakage                | 1. Call various API endpoints<br>2. Inspect response data<br>3. Check for excessive data<br>4. Verify field filtering                                           | - Only necessary fields returned<br>- No password hashes in responses<br>- No internal IDs exposed<br>- PII properly masked<br>- Response filtering implemented                                                          |                    |               |             |
| 8.9         | API Error Message Information Disclosure | 1. Trigger various API errors<br>2. Check error responses<br>3. Verify no sensitive data<br>4. Test stack traces                                                | - Generic error messages<br>- No stack traces in production<br>- No database structure revealed<br>- No file paths exposed<br>- Error codes standardized                                                                 |                    |               |             |
| 8.10        | API CORS Configuration                   | 1. Send OPTIONS request<br>2. Check CORS headers<br>3. Test cross-origin requests<br>4. Verify allowed origins                                                  | - CORS headers present<br>- Only trusted origins allowed<br>- NOT `Access-Control-Allow-Origin: *`<br>- Credentials flag properly set<br>- Preflight requests handled                                                    |                    |               |             |
| 8.11        | API HTTP Method Security                 | 1. Test endpoints with wrong methods<br>2. Send POST to GET endpoint<br>3. Try DELETE on read-only resource<br>4. Verify restrictions                           | - Only allowed methods accepted<br>- 405 Method Not Allowed returned<br>- GET requests read-only<br>- State changes only on POST/PUT/DELETE<br>- Method validation enforced                                              |                    |               |             |
| 8.12        | API Batch Request Abuse                  | 1. Send batch/bulk API requests<br>2. Request 1000+ records at once<br>3. Test pagination limits<br>4. Monitor performance                                      | - Batch size limited<br>- Maximum page size enforced<br>- No DoS via large requests<br>- Pagination required for large datasets<br>- Resource limits enforced                                                            |                    |               |             |
| 8.13        | API Token Security                       | 1. Capture API tokens<br>2. Analyze token structure<br>3. Check token lifetime<br>4. Test token revocation                                                      | - Tokens cryptographically secure<br>- Short-lived access tokens<br>- Refresh token rotation<br>- Token revocation works<br>- Token binding to user/session                                                              |                    |               |             |
| 8.14        | API GraphQL Security (if applicable)     | 1. Test GraphQL introspection<br>2. Attempt deep nested queries<br>3. Test query complexity<br>4. Batch query abuse                                             | - Introspection disabled in production<br>- Query depth limited<br>- Query complexity scored<br>- Batch query limits enforced<br>- No DoS via complex queries                                                            |                    |               |             |

---

### **Security Domain:** Data Protection & Privacy

### **Test Case No.: 9**

**Process/Function Name:** Data Encryption, Privacy & Sensitive Information Protection

**Function Description:** This module tests encryption of data at rest and in transit, protection of Personally Identifiable Information (PII), data masking, and compliance with privacy regulations.

| **Case ID** | **Test Case Scenario**           | **Test Steps**                                                                                                                   | **Expected Results**                                                                                                                                                            | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 9.1         | HTTPS/TLS Enforcement            | 1. Access application via HTTP<br>2. Check for redirect to HTTPS<br>3. Verify certificate validity<br>4. Test SSL/TLS version    | - HTTP redirects to HTTPS<br>- Valid SSL/TLS certificate<br>- TLS 1.2 or higher<br>- Strong cipher suites<br>- HSTS header present                                              |                    |               |             |
| 9.2         | Certificate Validation           | 1. Check SSL certificate<br>2. Verify certificate chain<br>3. Check expiration date<br>4. Verify certificate details             | - Certificate from trusted CA<br>- Chain of trust complete<br>- Not expired or near expiration<br>- Correct domain name<br>- No certificate warnings                            |                    |               |             |
| 9.3         | Data Encryption at Rest          | 1. Access database server<br>2. Check database encryption<br>3. Verify file storage encryption<br>4. Check backup encryption     | - Database encrypted at rest<br>- File storage encrypted (MinIO)<br>- Backup files encrypted<br>- Encryption keys securely stored<br>- Strong encryption algorithms (AES-256)   |                    |               |             |
| 9.4         | Encryption Key Management        | 1. Locate encryption keys<br>2. Verify key storage<br>3. Check key rotation<br>4. Test key access controls                       | - Keys not hardcoded in code<br>- Keys in secure key management system<br>- Regular key rotation<br>- Access to keys restricted<br>- Key backup and recovery process            |                    |               |             |
| 9.5         | PII Protection - ZAN ID          | 1. Search for ZAN ID numbers<br>2. Check display in UI<br>3. Verify masking<br>4. Check logs and responses                       | - ZAN ID masked in UI (e.g., XXX-XX-1234)<br>- Full ZAN ID only when necessary<br>- Not logged in plaintext<br>- Not in error messages<br>- Access controlled                   |                    |               |             |
| 9.6         | PII Protection - Passwords       | 1. Check password storage<br>2. Review application logs<br>3. Check API responses<br>4. Verify error messages                    | - Passwords never in plaintext<br>- Not logged anywhere<br>- Never in API responses<br>- Not in error messages<br>- Hashed in database only                                     |                    |               |             |
| 9.7         | PII Protection - Personal Data   | 1. Review employee data display<br>2. Check data export features<br>3. Verify data minimization<br>4. Test data access logs      | - Only necessary PII collected<br>- Data minimization practiced<br>- Access to PII logged<br>- Export controls implemented<br>- Purpose limitation enforced                     |                    |               |             |
| 9.8         | Data Masking in Non-Production   | 1. Access test/staging environment<br>2. Check for production data<br>3. Verify data masking<br>4. Test anonymization            | - No real PII in test environments<br>- Production data anonymized<br>- Masking applied to sensitive fields<br>- Synthetic test data used<br>- Data retention policies followed |                    |               |             |
| 9.9         | Sensitive Data in Logs           | 1. Review application logs<br>2. Search for PII patterns<br>3. Check error logs<br>4. Verify log sanitization                    | - No PII in logs (ZAN ID, passwords, etc.)<br>- Logs sanitized automatically<br>- Sensitive data redacted<br>- Log access controlled<br>- Retention period defined              |                    |               |             |
| 9.10        | Right to Access (Data Subject)   | 1. User requests their data<br>2. System generates data export<br>3. Verify completeness<br>4. Check format                      | - User can request their data<br>- All user data included<br>- Machine-readable format (JSON/CSV)<br>- Delivered within reasonable time<br>- Audit trail of request             |                    |               |             |
| 9.11        | Right to Deletion (Data Subject) | 1. User requests account deletion<br>2. Initiate deletion process<br>3. Verify data removal<br>4. Check backups                  | - User can request deletion<br>- Data deleted across all systems<br>- Backups marked for deletion<br>- Anonymization of required records<br>- Deletion confirmation provided    |                    |               |             |
| 9.12        | Data Breach Response             | 1. Simulate data breach scenario<br>2. Check detection mechanisms<br>3. Verify notification process<br>4. Test incident response | - Breach detection in place<br>- Incident response plan exists<br>- Affected users notified<br>- Authorities notified (if required)<br>- Breach documented and logged           |                    |               |             |
| 9.13        | Third-Party Data Sharing         | 1. Review third-party integrations<br>2. Check data sharing agreements<br>3. Verify data minimization<br>4. Test access controls | - Data sharing documented<br>- Only necessary data shared<br>- User consent obtained<br>- Third-party agreements in place<br>- Data processing agreements (DPA)                 |                    |               |             |
| 9.14        | Database Backup Security         | 1. Locate database backups<br>2. Check backup encryption<br>3. Verify access controls<br>4. Test backup restoration              | - Backups encrypted<br>- Stored securely off-site<br>- Access strictly controlled<br>- Regular backup testing<br>- Retention policy enforced                                    |                    |               |             |

---

### **Security Domain:** Security Headers & Configurations

### **Test Case No.: 10**

**Process/Function Name:** HTTP Security Headers & Server Configuration

**Function Description:** This module tests the implementation of security-related HTTP headers and proper server configurations that protect against common web vulnerabilities like clickjacking, MIME sniffing, and XSS.

| **Case ID** | **Test Case Scenario**           | **Test Steps**                                                                                                                              | **Expected Results**                                                                                                                                                                             | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------------- | ----------- |
| 10.1        | Content-Security-Policy (CSP)    | 1. Load application<br>2. Check response headers<br>3. Verify CSP header<br>4. Test inline scripts blocked                                  | - CSP header present<br>- Restrictive policy defined<br>- Inline scripts/styles blocked<br>- Only whitelisted sources allowed<br>- `default-src 'self'` or stricter                              |                    |               |             |
| 10.2        | X-Frame-Options Header           | 1. Attempt to embed app in iframe<br>2. Check X-Frame-Options header<br>3. Verify frame blocking<br>4. Test clickjacking prevention         | - Header present: `DENY` or `SAMEORIGIN`<br>- App cannot be framed by other sites<br>- Clickjacking prevented<br>- CSP frame-ancestors also set<br>- Both headers for compatibility              |                    |               |             |
| 10.3        | X-Content-Type-Options Header    | 1. Serve content with wrong MIME type<br>2. Check header presence<br>3. Test MIME sniffing behavior<br>4. Verify protection                 | - Header present: `nosniff`<br>- Browser doesn't MIME-sniff<br>- Content-Type respected<br>- XSS via content sniffing prevented<br>- Applied to all responses                                    |                    |               |             |
| 10.4        | Strict-Transport-Security (HSTS) | 1. Access site via HTTPS<br>2. Check for HSTS header<br>3. Verify max-age value<br>4. Test includeSubDomains                                | - HSTS header present<br>- `max-age` ≥ 31536000 (1 year)<br>- `includeSubDomains` directive<br>- `preload` directive (optional)<br>- HTTPS enforced for duration                                 |                    |               |             |
| 10.5        | Referrer-Policy Header           | 1. Navigate between pages<br>2. Check Referer header sent<br>3. Verify Referrer-Policy<br>4. Test cross-origin referrer                     | - Referrer-Policy header present<br>- Restrictive policy (e.g., `no-referrer`, `strict-origin-when-cross-origin`)<br>- Sensitive URLs not leaked<br>- Privacy protected                          |                    |               |             |
| 10.6        | Permissions-Policy Header        | 1. Check for Permissions-Policy<br>2. Verify disabled features<br>3. Test feature access<br>4. Verify restrictions                          | - Header present (formerly Feature-Policy)<br>- Unnecessary features disabled<br>- Camera/microphone restricted<br>- Geolocation controlled<br>- Third-party restrictions                        |                    |               |             |
| 10.7        | X-XSS-Protection Header          | 1. Check for X-XSS-Protection<br>2. Verify value<br>3. Test with CSP<br>4. Browser XSS filter                                               | - Header present: `1; mode=block`<br>- XSS auditor enabled<br>- CSP provides primary protection<br>- Defense-in-depth approach<br>- Backward compatibility                                       |                    |               |             |
| 10.8        | Cache-Control Headers            | 1. Check caching headers on sensitive pages<br>2. Verify no-cache directives<br>3. Test browser back button<br>4. Check authenticated pages | - Sensitive pages: `Cache-Control: no-store, no-cache`<br>- `Pragma: no-cache` for HTTP/1.0<br>- Authenticated content not cached<br>- Static assets properly cached<br>- Private data protected |                    |               |             |
| 10.9        | Server Information Disclosure    | 1. Check Server header<br>2. Check X-Powered-By<br>3. Review error pages<br>4. Test information leakage                                     | - Server header removed or generic<br>- X-Powered-By header removed<br>- Version numbers not exposed<br>- Technology stack not revealed<br>- Minimal information disclosure                      |                    |               |             |
| 10.10       | Cookie Security Flags            | 1. Login and capture cookies<br>2. Inspect cookie attributes<br>3. Verify security flags<br>4. Test cookie behavior                         | - `Secure` flag set (HTTPS only)<br>- `HttpOnly` flag set (XSS protection)<br>- `SameSite=Lax` or `Strict` (CSRF protection)<br>- Appropriate expiration<br>- Path and Domain correctly set      |                    |               |             |
| 10.11       | CORS Configuration Security      | 1. Send cross-origin requests<br>2. Check CORS headers<br>3. Verify allowed origins<br>4. Test credentials handling                         | - Specific origins whitelisted<br>- NOT `Access-Control-Allow-Origin: *`<br>- `Access-Control-Allow-Credentials` carefully set<br>- Preflight requests handled<br>- Methods/headers restricted   |                    |               |             |
| 10.12       | Error Page Security              | 1. Trigger 404 error<br>2. Trigger 500 error<br>3. Check error page content<br>4. Verify no information leakage                             | - Generic error messages<br>- No stack traces shown<br>- No file paths revealed<br>- No database errors exposed<br>- Custom error pages used                                                     |                    |               |             |
| 10.13       | DNS Security (DNSSEC)            | 1. Check DNS records<br>2. Verify DNSSEC signing<br>3. Test DNS spoofing protection<br>4. Validate chain of trust                           | - DNSSEC enabled<br>- DNS records signed<br>- Chain of trust validated<br>- DNS spoofing prevented<br>- SPF/DMARC records configured                                                             |                    |               |             |
| 10.14       | TLS Configuration Security       | 1. Test SSL/TLS configuration<br>2. Check cipher suites<br>3. Test for vulnerabilities<br>4. Use SSL Labs or testssl.sh                     | - TLS 1.2 minimum (TLS 1.3 preferred)<br>- Strong cipher suites only<br>- No SSLv3, TLS 1.0, TLS 1.1<br>- Forward secrecy enabled<br>- A+ rating on SSL Labs                                     |                    |               |             |

---

### **Security Domain:** Error Handling & Information Disclosure

### **Test Case No.: 11**

**Process/Function Name:** Secure Error Handling & Information Leakage Prevention

**Function Description:** This module tests error handling mechanisms to ensure they don't leak sensitive information while providing meaningful feedback to users and logging sufficient detail for debugging.

| **Case ID** | **Test Case Scenario**        | **Test Steps**                                                                                                                         | **Expected Results**                                                                                                                                                                   | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 11.1        | Generic Error Messages        | 1. Trigger various application errors<br>2. Check user-facing messages<br>3. Verify generic responses<br>4. Test different error types | - Generic user-friendly messages<br>- No technical details to users<br>- Consistent error format<br>- Error codes provided<br>- Help/support information                               |                    |               |             |
| 11.2        | Stack Trace Suppression       | 1. Cause application exception<br>2. Check error response<br>3. Verify no stack trace in response<br>4. Check browser console          | - No stack traces in production<br>- Stack traces only in dev mode<br>- Internal errors logged server-side<br>- Users don't see code details<br>- `NODE_ENV=production` enforced       |                    |               |             |
| 11.3        | Database Error Handling       | 1. Trigger database constraint violation<br>2. Cause connection error<br>3. Generate query errors<br>4. Check responses                | - Database errors not exposed<br>- No SQL in error messages<br>- No table/column names revealed<br>- Generic "Database error" message<br>- Full error logged internally                |                    |               |             |
| 11.4        | File Path Disclosure          | 1. Trigger file-related errors<br>2. Cause module loading errors<br>3. Check error messages<br>4. Verify no paths exposed              | - No file system paths in errors<br>- No directory structure revealed<br>- No module paths shown<br>- No `/home/`, `/var/`, etc. exposed<br>- Path normalization applied               |                    |               |             |
| 11.5        | API Error Responses           | 1. Call API with invalid data<br>2. Trigger various API errors<br>3. Check error response structure<br>4. Verify consistency           | - Consistent error format:<br>`json<br>{<br>  "error": "Error message",<br>  "code": "ERROR_CODE",<br>  "status": 400<br>}<br>`<br>- No internal details<br>- Proper HTTP status codes |                    |               |             |
| 11.6        | Validation Error Messages     | 1. Submit invalid form data<br>2. Trigger Zod validation errors<br>3. Check error details<br>4. Verify helpful messages                | - Specific validation errors shown<br>- Field-level error messages<br>- No system internals exposed<br>- User can correct input<br>- Multiple errors displayed                         |                    |               |             |
| 11.7        | 404 Error Page                | 1. Access non-existent pages<br>2. Test various invalid URLs<br>3. Check 404 page content<br>4. Verify no enumeration                  | - Custom 404 page shown<br>- No file/directory listing<br>- No route enumeration possible<br>- Navigation back to valid pages<br>- 404 status code returned                            |                    |               |             |
| 11.8        | 500 Internal Server Error     | 1. Trigger internal server error<br>2. Check error page<br>3. Verify user message<br>4. Check logging                                  | - Custom 500 error page<br>- Generic message to user<br>- Error ID for support reference<br>- Full error logged server-side<br>- Admin notification for critical errors                |                    |               |             |
| 11.9        | Authentication Error Messages | 1. Failed login attempts<br>2. Invalid token errors<br>3. Session expiration<br>4. Check message specificity                           | - Generic auth error messages<br>- Don't reveal if username exists<br>- Don't specify which field wrong<br>- "Invalid credentials" standard message<br>- Prevents user enumeration     |                    |               |             |
| 11.10       | CORS Error Handling           | 1. Send invalid CORS requests<br>2. Check CORS error responses<br>3. Verify no origin leakage<br>4. Test error messages                | - CORS errors properly handled<br>- No origin whitelisting info revealed<br>- Generic CORS error message<br>- Preflight errors handled<br>- No configuration details exposed           |                    |               |             |
| 11.11       | Timeout Error Handling        | 1. Trigger request timeout<br>2. Database query timeout<br>3. External API timeout<br>4. Check messages                                | - Timeout errors graceful<br>- User-friendly timeout message<br>- Retry mechanism offered<br>- No resource names exposed<br>- Proper timeout values set                                |                    |               |             |
| 11.12       | Logging Sensitive Data        | 1. Review application logs<br>2. Trigger various operations<br>3. Check what gets logged<br>4. Verify data sanitization                | - No passwords logged<br>- PII redacted or hashed<br>- Request IDs for correlation<br>- Sufficient debug info<br>- Log levels appropriate                                              |                    |               |             |
| 11.13       | Client-Side Error Handling    | 1. Trigger JavaScript errors<br>2. Check browser console<br>3. Verify error reporting<br>4. Test error boundaries                      | - React error boundaries in place<br>- Graceful degradation<br>- User sees friendly message<br>- Errors reported to monitoring<br>- App doesn't crash                                  |                    |               |             |
| 11.14       | Third-Party API Errors        | 1. Simulate HRIMS API failure<br>2. MinIO service down<br>3. Check error handling<br>4. Verify user communication                      | - External errors handled gracefully<br>- User informed of service issue<br>- No third-party details exposed<br>- Retry logic implemented<br>- Fallback mechanisms                     |                    |               |             |

---

### **Security Domain:** Audit Trail & Logging

### **Test Case No.: 12**

**Process/Function Name:** Security Audit Logging & Monitoring

**Function Description:** This module tests the implementation of comprehensive audit logging for security events, user actions, and system activities. Ensures logs are complete, protected, and useful for security monitoring and incident response.

| **Case ID** | **Test Case Scenario**        | **Test Steps**                                                                                                                                                                      | **Expected Results**                                                                                                                                                                                                                      | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 12.1        | Authentication Event Logging  | 1. Perform successful login<br>2. Failed login attempt<br>3. Logout<br>4. Check audit logs                                                                                          | - All auth events logged:<br>&nbsp;&nbsp;• Login success/failure<br>&nbsp;&nbsp;• Logout<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Username<br>&nbsp;&nbsp;• IP address<br>&nbsp;&nbsp;• User agent<br>- Passwords NOT logged           |                    |               |             |
| 12.2        | Authorization Failure Logging | 1. Attempt unauthorized access<br>2. Try to access other user's data<br>3. Attempt admin operation as user<br>4. Review logs                                                        | - All authorization failures logged<br>- User attempting access<br>- Resource attempted<br>- Timestamp<br>- IP address<br>- Security alerts generated                                                                                     |                    |               |             |
| 12.3        | Data Access Logging           | 1. View employee record<br>2. Export data<br>3. Download documents<br>4. Check audit trail                                                                                          | - Sensitive data access logged:<br>&nbsp;&nbsp;• Who accessed<br>&nbsp;&nbsp;• What data<br>&nbsp;&nbsp;• When (timestamp)<br>&nbsp;&nbsp;• From where (IP)<br>&nbsp;&nbsp;• Action performed<br>- Retention policy defined               |                    |               |             |
| 12.4        | Data Modification Logging     | 1. Create new user<br>2. Update employee record<br>3. Delete complaint<br>4. Review change logs                                                                                     | - All CRUD operations logged<br>- Before and after values<br>- User who made change<br>- Timestamp<br>- Change reason (if applicable)<br>- Immutable audit trail                                                                          |                    |               |             |
| 12.5        | Security Event Logging        | 1. Trigger security events:<br>&nbsp;&nbsp;• SQL injection attempt<br>&nbsp;&nbsp;• XSS attempt<br>&nbsp;&nbsp;• CSRF attack<br>&nbsp;&nbsp;• Brute force<br>2. Check security logs | - All security events logged<br>- Attack type identified<br>- Source IP address<br>- Payload/details<br>- Timestamp<br>- Automated alerts triggered                                                                                       |                    |               |             |
| 12.6        | Administrative Action Logging | 1. Login as admin<br>2. Create user account<br>3. Change user role<br>4. Modify system settings<br>5. Review admin logs                                                             | - All admin actions logged<br>- Administrator identity<br>- Action performed<br>- Target of action<br>- Timestamp<br>- Admin actions flagged for review                                                                                   |                    |               |             |
| 12.7        | File Upload/Download Logging  | 1. Upload document<br>2. Download file<br>3. Delete file<br>4. Check file operation logs                                                                                            | - File operations logged:<br>&nbsp;&nbsp;• Upload/download/delete<br>&nbsp;&nbsp;• User performing action<br>&nbsp;&nbsp;• File name/type/size<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Success/failure<br>- Virus scan results logged |                    |               |             |
| 12.8        | Log Integrity Protection      | 1. Access log files<br>2. Attempt to modify logs<br>3. Check integrity mechanisms<br>4. Verify tamper detection                                                                     | - Logs write-only or append-only<br>- Modifications detected<br>- Hash/signature verification<br>- Centralized log management<br>- Tampering triggers alerts                                                                              |                    |               |             |
| 12.9        | Log Retention and Rotation    | 1. Check log retention policy<br>2. Verify log rotation<br>3. Test old log archival<br>4. Check storage management                                                                  | - Retention policy defined (e.g., 1 year)<br>- Logs rotated daily/weekly<br>- Archived logs compressed<br>- Storage limits managed<br>- Compliance with regulations                                                                       |                    |               |             |
| 12.10       | Log Access Controls           | 1. Attempt to access logs as regular user<br>2. Login as admin<br>3. Check log viewing permissions<br>4. Verify audit of log access                                                 | - Logs restricted to authorized personnel<br>- Role-based log access<br>- Log access itself logged<br>- Secure log storage location<br>- Encrypted logs at rest                                                                           |                    |               |             |
| 12.11       | Centralized Logging           | 1. Check logging infrastructure<br>2. Verify log aggregation<br>3. Test log shipping<br>4. Review log management system                                                             | - Logs shipped to central system<br>- ELK stack or similar<br>- Real-time log streaming<br>- Searchable and indexed<br>- Dashboard and alerting                                                                                           |                    |               |             |
| 12.12       | Session Activity Logging      | 1. Perform various actions in session<br>2. Change pages<br>3. Submit forms<br>4. Review session logs                                                                               | - User session tracked<br>- Session ID in logs<br>- Session start/end logged<br>- Activity timeline<br>- Correlation between events                                                                                                       |                    |               |             |
| 12.13       | Error and Exception Logging   | 1. Trigger application errors<br>2. Cause exceptions<br>3. Check error logs<br>4. Verify detail level                                                                               | - All errors logged with:<br>&nbsp;&nbsp;• Stack trace<br>&nbsp;&nbsp;• User context<br>&nbsp;&nbsp;• Request details<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Error severity<br>- PII redacted from logs                              |                    |               |             |
| 12.14       | Alerting and Monitoring       | 1. Trigger security events<br>2. Simulate attacks<br>3. Check alert generation<br>4. Verify notification system                                                                     | - Real-time alerts for:<br>&nbsp;&nbsp;• Brute force attempts<br>&nbsp;&nbsp;• Multiple failed logins<br>&nbsp;&nbsp;• Unauthorized access<br>&nbsp;&nbsp;• Injection attempts<br>- Admin notification<br>- Integration with SIEM         |                    |               |             |

---

### **Security Domain:** Network Security

### **Test Case No.: 13**

**Process/Function Name:** Network Security, Firewall & Infrastructure Protection

**Function Description:** This module tests network-level security including firewall configurations, port security, DDoS protection, and network segmentation.

| **Case ID** | **Test Case Scenario**         | **Test Steps**                                                                                                                                              | **Expected Results**                                                                                                                                                                                           | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 13.1        | Open Port Scanning             | 1. Run Nmap scan on application server<br>2. Identify open ports<br>3. Verify only necessary ports open<br>4. Check service versions                        | - Only required ports open:<br>&nbsp;&nbsp;• 443 (HTTPS)<br>&nbsp;&nbsp;• 80 (HTTP with redirect)<br>&nbsp;&nbsp;• 22 (SSH - restricted IPs)<br>- All other ports filtered/closed<br>- No unnecessary services |                    |               |             |
| 13.2        | Firewall Configuration         | 1. Test firewall rules<br>2. Attempt connections from unauthorized IPs<br>3. Check ingress/egress filtering<br>4. Verify rule completeness                  | - Firewall properly configured<br>- Default deny policy<br>- Specific allow rules only<br>- Source IP restrictions<br>- Egress filtering in place                                                              |                    |               |             |
| 13.3        | Network Segmentation           | 1. Map network architecture<br>2. Check database accessibility<br>3. Test internal service access<br>4. Verify segmentation                                 | - Database not directly accessible from internet<br>- Internal services segmented<br>- DMZ properly configured<br>- VLANs or subnets separate concerns<br>- Least privilege network access                     |                    |               |             |
| 13.4        | DDoS Protection                | 1. Simulate high traffic load<br>2. Test rate limiting<br>3. Check CDN/WAF protection<br>4. Monitor service availability                                    | - DDoS mitigation in place<br>- Rate limiting enforced<br>- CDN caching reduces load<br>- WAF filters malicious traffic<br>- Service remains available                                                         |                    |               |             |
| 13.5        | Database Network Security      | 1. Attempt direct database connection from internet<br>2. Test from application server<br>3. Check PostgreSQL security<br>4. Verify connection restrictions | - Database not exposed to internet<br>- Only application server can connect<br>- PostgreSQL listening on localhost or private IP<br>- Strong database passwords<br>- SSL required for connections              |                    |               |             |
| 13.6        | MinIO Storage Network Security | 1. Access MinIO directly<br>2. Test bucket permissions<br>3. Check API access controls<br>4. Verify network restrictions                                    | - MinIO not publicly accessible<br>- API restricted to application server<br>- Bucket permissions properly set<br>- Access via presigned URLs only<br>- Network ACLs enforced                                  |                    |               |             |
| 13.7        | Internal API Network Security  | 1. Test HRIMS API connectivity<br>2. Check internal network access<br>3. Verify API authentication<br>4. Test from external network                         | - HRIMS API not exposed to internet<br>- Accessible only from internal network<br>- VPN required for remote access<br>- API keys secured<br>- Network isolation enforced                                       |                    |               |             |
| 13.8        | SSH Access Security            | 1. Attempt SSH connection<br>2. Test password authentication<br>3. Check key-based auth<br>4. Verify access restrictions                                    | - SSH key-based auth only<br>- Password auth disabled<br>- Root login disabled<br>- Limited to specific IP ranges<br>- Fail2ban or similar implemented                                                         |                    |               |             |
| 13.9        | Service Banner Grabbing        | 1. Perform banner grabbing<br>2. Check service version disclosure<br>3. Test various ports<br>4. Verify information leakage                                 | - Service banners minimized<br>- Version numbers not disclosed<br>- Generic responses only<br>- No OS fingerprinting info<br>- Stealth mode where possible                                                     |                    |               |             |
| 13.10       | VPN Security (if applicable)   | 1. Test VPN connectivity<br>2. Check encryption strength<br>3. Verify authentication<br>4. Test access controls                                             | - Strong VPN encryption (AES-256)<br>- Multi-factor authentication<br>- Per-user access controls<br>- VPN logs maintained<br>- Split tunneling configured properly                                             |                    |               |             |
| 13.11       | Network Intrusion Detection    | 1. Simulate attack patterns<br>2. Test IDS/IPS detection<br>3. Check alert generation<br>4. Verify response                                                 | - IDS/IPS deployed<br>- Attack patterns detected<br>- Alerts generated in real-time<br>- Automated blocking of threats<br>- Integration with SIEM                                                              |                    |               |             |
| 13.12       | DNS Security                   | 1. Perform DNS queries<br>2. Test DNS cache poisoning<br>3. Check DNSSEC<br>4. Verify zone transfers                                                        | - DNSSEC enabled<br>- Zone transfers restricted<br>- DNS cache poisoning prevented<br>- SPF, DKIM, DMARC configured<br>- DNS over HTTPS (DoH) considered                                                       |                    |               |             |
| 13.13       | Load Balancer Security         | 1. Test load balancer configuration<br>2. Check SSL termination<br>3. Verify health checks<br>4. Test failover                                              | - SSL properly terminated<br>- Strong SSL configuration<br>- Health checks active<br>- Session persistence configured<br>- DDoS protection at LB level                                                         |                    |               |             |
| 13.14       | Network Monitoring             | 1. Check network monitoring tools<br>2. Review traffic analysis<br>3. Test anomaly detection<br>4. Verify alerting                                          | - Network traffic monitored<br>- Baseline established<br>- Anomalies detected<br>- Real-time alerts<br>- Dashboard for visibility                                                                              |                    |               |             |

---

### **Security Domain:** Penetration Testing

### **Test Case No.: 14**

**Process/Function Name:** Comprehensive Penetration Testing & Vulnerability Assessment

**Function Description:** This module covers comprehensive penetration testing including automated scanning, manual exploitation attempts, and vulnerability assessment to identify security weaknesses before production deployment.

| **Case ID** | **Test Case Scenario**            | **Test Steps**                                                                                                                              | **Expected Results**                                                                                                                                            | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 14.1        | Automated Vulnerability Scanning  | 1. Run Nessus/OpenVAS scan<br>2. Scan for known vulnerabilities<br>3. Check CVE database<br>4. Review scan results                          | - No critical vulnerabilities<br>- No high-severity issues<br>- Medium issues documented<br>- Remediation plan for findings<br>- Regular scanning scheduled     |                    |               |             |
| 14.2        | OWASP ZAP Automated Scan          | 1. Configure ZAP for application<br>2. Run automated spider<br>3. Active scan all endpoints<br>4. Review findings                           | - No critical vulnerabilities<br>- SQL injection not possible<br>- XSS prevented<br>- CSRF protection verified<br>- Findings documented                         |                    |               |             |
| 14.3        | Burp Suite Security Testing       | 1. Proxy traffic through Burp<br>2. Test authentication<br>3. Fuzzing inputs<br>4. Manual exploitation                                      | - No authentication bypass<br>- Input validation robust<br>- No injection vulnerabilities<br>- Session management secure<br>- Authorization properly enforced   |                    |               |             |
| 14.4        | SQL Injection Penetration Test    | 1. Use SQLMap against all inputs<br>2. Test various injection techniques<br>3. Blind SQL injection attempts<br>4. Time-based injection      | - No SQL injection possible<br>- SQLMap unsuccessful<br>- Database not accessible<br>- Error-based injection blocked<br>- Prisma ORM protection effective       |                    |               |             |
| 14.5        | Authentication Bypass Attempts    | 1. Password reset exploitation<br>2. Session fixation<br>3. Token manipulation<br>4. OAuth/SSO bypass (if applicable)                       | - No authentication bypass possible<br>- Password reset secure<br>- Tokens properly validated<br>- Session management secure<br>- All bypass attempts fail      |                    |               |             |
| 14.6        | Privilege Escalation Testing      | 1. Attempt vertical escalation (user to admin)<br>2. Horizontal escalation (user to user)<br>3. Parameter tampering<br>4. IDOR exploitation | - No privilege escalation possible<br>- Role changes blocked<br>- Authorization enforced server-side<br>- IDOR prevented<br>- Access controls effective         |                    |               |             |
| 14.7        | Business Logic Testing            | 1. Test workflow bypasses<br>2. Race condition exploitation<br>3. Price manipulation (if applicable)<br>4. Workflow step skipping           | - Business logic enforced<br>- Cannot skip workflow steps<br>- Race conditions handled<br>- State transitions validated<br>- Integrity checks in place          |                    |               |             |
| 14.8        | API Security Penetration Test     | 1. Test all API endpoints<br>2. GraphQL query exploitation (if applicable)<br>3. API rate limit bypass<br>4. Mass assignment                | - All API endpoints secured<br>- Rate limiting effective<br>- Mass assignment prevented<br>- API abuse not possible<br>- Documentation accurate                 |                    |               |             |
| 14.9        | File Upload Exploitation          | 1. Upload malicious files<br>2. Polyglot file attacks<br>3. Path traversal via filename<br>4. RCE attempts via file upload                  | - Malicious uploads blocked<br>- No code execution<br>- File validation robust<br>- Storage security effective<br>- No RCE possible                             |                    |               |             |
| 14.10       | Session Hijacking Attempts        | 1. Session token prediction<br>2. Session fixation<br>3. XSS to steal tokens<br>4. Man-in-the-middle                                        | - Session tokens unpredictable<br>- Session fixation prevented<br>- XSS prevented (no token theft)<br>- HTTPS enforced<br>- Session security robust             |                    |               |             |
| 14.11       | Sensitive Data Exposure           | 1. Search for exposed credentials<br>2. Check for information leakage<br>3. Test data encryption<br>4. Verify data protection               | - No credentials exposed<br>- API keys not in client code<br>- Sensitive data encrypted<br>- No PII leakage<br>- Data protection effective                      |                    |               |             |
| 14.12       | Security Misconfiguration Testing | 1. Check default credentials<br>2. Test debugging endpoints<br>3. Verify security headers<br>4. Check for sample code                       | - No default credentials<br>- Debug mode disabled<br>- All security headers present<br>- No sample/test code in production<br>- Proper configuration            |                    |               |             |
| 14.13       | Denial of Service Testing         | 1. Resource exhaustion attempts<br>2. Application-level DoS<br>3. Regular expression DoS (ReDoS)<br>4. XML bomb (if applicable)             | - DoS attempts mitigated<br>- Rate limiting effective<br>- Resource limits enforced<br>- No ReDoS vulnerabilities<br>- Service remains available                |                    |               |             |
| 14.14       | Social Engineering Testing        | 1. Phishing simulation (with permission)<br>2. Password reset social engineering<br>3. Support desk impersonation<br>4. User awareness      | - Users aware of phishing<br>- Security training effective<br>- Support desk verification procedures<br>- No credential disclosure<br>- Security culture strong |                    |               |             |

---

## 4. Test Execution Schedule

| Phase                                                        | Start Date | End Date | Responsible Party |
| ------------------------------------------------------------ | ---------- | -------- | ----------------- |
| **Phase 1:** Authentication & Authorization (Test Cases 1-2) |            |          |                   |
| **Phase 2:** Session & Input Validation (Test Cases 3-4)     |            |          |                   |
| **Phase 3:** CSRF & File Security (Test Cases 5-6)           |            |          |                   |
| **Phase 4:** Password & API Security (Test Cases 7-8)        |            |          |                   |
| **Phase 5:** Data Protection & Headers (Test Cases 9-10)     |            |          |                   |
| **Phase 6:** Error Handling & Logging (Test Cases 11-12)     |            |          |                   |
| **Phase 7:** Network Security (Test Case 13)                 |            |          |                   |
| **Phase 8:** Penetration Testing (Test Case 14)              |            |          |                   |
| **Security Review Meeting**                                  |            |          |                   |
| **Remediation Period**                                       |            |          |                   |
| **Re-testing Critical Findings**                             |            |          |                   |
| **UAT Sign-off**                                             |            |          |                   |

---

## 5. Test Entry and Exit Criteria

### 5.1 Entry Criteria

- Application development completed
- CSMS test environment configured
- Security testing tools installed and configured
- Test user accounts created with various roles
- Source code available for white-box testing
- Security testing team briefed
- Test cases reviewed and approved
- Stakeholder approval obtained

### 5.2 Exit Criteria

- All test cases executed
- At least 95% of test cases passed
- All critical vulnerabilities resolved
- All high-severity vulnerabilities resolved or accepted with risk
- Medium vulnerabilities documented with remediation plan
- Penetration testing completed
- Security scan results acceptable
- Remediation verified through re-testing
- Security documentation updated
- Sign-off received from security team and stakeholders

---

## 6. Vulnerability Severity Levels

### 6.1 Severity Classification

| Severity          | Risk Score | Description                                                                | Examples                                                                   | Response Time        |
| ----------------- | ---------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------- |
| **Critical**      | 9.0-10.0   | Allows full system compromise, data breach, or RCE                         | SQL injection with data access, Authentication bypass, RCE vulnerabilities | Immediate (24 hours) |
| **High**          | 7.0-8.9    | Significant security impact, potential data exposure                       | Stored XSS, Privilege escalation, CSRF on critical functions               | 48 hours             |
| **Medium**        | 4.0-6.9    | Moderate security impact, requires user interaction or specific conditions | Reflected XSS, Session fixation, Missing security headers                  | 7 days               |
| **Low**           | 0.1-3.9    | Minor security issue, limited impact                                       | Information disclosure, Cookie missing Secure flag                         | 30 days              |
| **Informational** | 0.0        | Security best practices, no immediate risk                                 | Recommendations, Hardening suggestions                                     | As feasible          |

### 6.2 Vulnerability Tracking Template

| Vulnerability ID | Test Case | Severity | CVSS Score | Description | Steps to Reproduce | Impact | Remediation | Status | Resolution |
| ---------------- | --------- | -------- | ---------- | ----------- | ------------------ | ------ | ----------- | ------ | ---------- |
|                  |           |          |            |             |                    |        |             |        |            |
|                  |           |          |            |             |                    |        |             |        |            |

---

## 7. Security Assumptions and Dependencies

### 7.1 Assumptions

- Testing will be performed in isolated environment
- Test data used will not contain real PII
- Production system not affected by testing
- Security tools are up-to-date
- Testers have appropriate authorization
- Network infrastructure properly configured
- SSL/TLS certificates valid and current
- Backup and recovery procedures in place

### 7.2 Dependencies

- Test environment mirrors production configuration
- All application features deployed and functional
- Security testing tools accessible
- Database populated with test data
- MinIO storage operational
- Network access to all required systems
- Admin credentials available
- Source code access for white-box testing
- Stakeholder availability for risk acceptance decisions

---

## 8. Security Risks and Mitigation

| Risk                                           | Impact | Probability | Mitigation Strategy                                                     |
| ---------------------------------------------- | ------ | ----------- | ----------------------------------------------------------------------- |
| False sense of security from passed tests      | High   | Medium      | Combine automated and manual testing, regular security assessments      |
| Test disrupts production services              | High   | Low         | Use isolated test environment, coordinate with ops team                 |
| Test data contains real PII                    | High   | Low         | Use synthetic test data only, verify data sanitization                  |
| Incomplete vulnerability coverage              | Medium | Medium      | Use multiple testing methodologies, engage external penetration testers |
| Security vulnerabilities discovered during UAT | High   | High        | Allocate remediation time, prioritize critical findings                 |
| Insufficient time for thorough testing         | Medium | Medium      | Prioritize critical security controls, extend timeline if needed        |
| Lack of security expertise on team             | High   | Low         | Engage security consultants, provide security training                  |
| Resistance to fixing security issues           | Medium | Low         | Executive sponsorship, demonstrate business risk                        |

---

## 9. Test Deliverables

1. **Vulnerability Assessment Report**
   - All identified vulnerabilities with severity ratings
   - CVSS scores and risk classifications
   - Detailed reproduction steps
   - Evidence (screenshots, logs, traffic captures)

2. **Penetration Testing Report**
   - Executive summary
   - Methodology and scope
   - Findings with exploitation details
   - Remediation recommendations
   - Re-test results

3. **Security Compliance Report**
   - OWASP Top 10 compliance
   - Security best practices adherence
   - Gap analysis
   - Compliance with organizational security policies

4. **Completed UAT Document**
   - All test cases with pass/fail results
   - Actual results documented
   - Tester signatures and dates

5. **Remediation Tracking**
   - Remediation plan for all findings
   - Status tracking for each vulnerability
   - Re-test verification

6. **Security Recommendations**
   - Security hardening guide
   - Best practices documentation
   - Future security improvements

7. **UAT Sign-off Document**
   - Security team approval
   - Management acceptance
   - Risk acceptance for known issues

---

## 10. Roles and Responsibilities

| Role                      | Responsibility                                      | Name | Signature |
| ------------------------- | --------------------------------------------------- | ---- | --------- |
| **Security Test Lead**    | Overall security testing coordination and reporting |      |           |
| **Penetration Tester**    | Manual penetration testing and exploitation         |      |           |
| **Security Analyst**      | Vulnerability assessment and analysis               |      |           |
| **Application Developer** | Vulnerability remediation                           |      |           |
| **System Administrator**  | Infrastructure security testing support             |      |           |
| **DBA**                   | Database security testing                           |      |           |
| **Security Officer**      | Security policy compliance and sign-off             |      |           |
| **Project Manager**       | Overall UAT coordination and approval               |      |           |

---

## 11. Test Results Summary

### 11.1 Overall Security Test Statistics

| Metric                    | Count | Percentage |
| ------------------------- | ----- | ---------- |
| Total Test Cases          | 140   | 100%       |
| Test Cases Executed       |       |            |
| Test Cases Passed         |       |            |
| Test Cases Failed         |       |            |
| Test Cases Blocked        |       |            |
| Test Cases Not Applicable |       |            |

### 11.2 Vulnerability Summary

| Severity          | Count | Resolved | Accepted Risk | In Progress | Open |
| ----------------- | ----- | -------- | ------------- | ----------- | ---- |
| **Critical**      |       |          |               |             |      |
| **High**          |       |          |               |             |      |
| **Medium**        |       |          |               |             |      |
| **Low**           |       |          |               |             |      |
| **Informational** |       |          |               |             |      |
| **TOTAL**         |       |          |               |             |      |

### 11.3 Security Test Results by Domain

| Test Case No. | Security Domain                         | Total Cases | Passed | Failed | Pass % |
| ------------- | --------------------------------------- | ----------- | ------ | ------ | ------ |
| 1             | Authentication Security                 | 12          |        |        |        |
| 2             | Authorization & Access Control          | 10          |        |        |        |
| 3             | Session Management Security             | 12          |        |        |        |
| 4             | Input Validation & Injection Prevention | 14          |        |        |        |
| 5             | CSRF Protection                         | 12          |        |        |        |
| 6             | File Upload Security                    | 14          |        |        |        |
| 7             | Password Security & Cryptography        | 14          |        |        |        |
| 8             | API Security Testing                    | 14          |        |        |        |
| 9             | Data Protection & Privacy               | 14          |        |        |        |
| 10            | Security Headers & Configurations       | 14          |        |        |        |
| 11            | Error Handling & Information Disclosure | 14          |        |        |        |
| 12            | Audit Trail & Logging                   | 14          |        |        |        |
| 13            | Network Security                        | 14          |        |        |        |
| 14            | Penetration Testing                     | 14          |        |        |        |
| **TOTAL**     |                                         | **140**     |        |        |        |

---

## 12. Security Sign-Off

### 12.1 Security UAT Completion Sign-Off

I hereby certify that Security User Acceptance Testing for the Civil Service Management System (CSMS) has been completed according to the security test plan and that the system:

- ☐ Meets all critical security requirements
- ☐ Has no unmitigated critical or high vulnerabilities
- ☐ Implements industry-standard security controls
- ☐ Complies with OWASP Top 10 guidelines
- ☐ Has acceptable residual risk for known issues
- ☐ Is ready for production deployment from a security perspective

| Role                      | Name | Signature | Date |
| ------------------------- | ---- | --------- | ---- |
| **Security Officer**      |      |           |      |
| **Penetration Test Lead** |      |           |      |
| **Security Analyst**      |      |           |      |
| **IT Security Manager**   |      |           |      |
| **CISO (if applicable)**  |      |           |      |
| **Project Manager**       |      |           |      |
| **Business Owner**        |      |           |      |

### 12.2 Conditions for Production Release

☐ All critical vulnerabilities resolved and verified
☐ All high-severity vulnerabilities resolved or risk accepted by management
☐ Medium vulnerabilities documented with remediation timeline
☐ Penetration testing completed successfully
☐ Security scan results acceptable
☐ Security monitoring and logging operational
☐ Incident response plan in place
☐ Security documentation updated
☐ Security team trained on incident response
☐ Backup and disaster recovery tested
☐ SSL/TLS certificates valid
☐ Firewall rules reviewed and approved
☐ Security baselines established
☐ Continuous security monitoring enabled

---

## 13. Appendix

### 13.1 Security Testing Tools Reference

| Tool                        | Purpose                          | Version/URL                             |
| --------------------------- | -------------------------------- | --------------------------------------- |
| **Burp Suite Professional** | Web application security testing | https://portswigger.net/burp            |
| **OWASP ZAP**               | Automated vulnerability scanning | https://www.zaproxy.org/                |
| **Nessus**                  | Vulnerability assessment         | https://www.tenable.com/products/nessus |
| **SQLMap**                  | SQL injection testing            | https://sqlmap.org/                     |
| **XSStrike**                | XSS detection                    | https://github.com/s0md3v/XSStrike      |
| **Nmap**                    | Network scanning                 | https://nmap.org/                       |
| **Wireshark**               | Network traffic analysis         | https://www.wireshark.org/              |
| **John the Ripper**         | Password cracking                | https://www.openwall.com/john/          |
| **Metasploit**              | Penetration testing framework    | https://www.metasploit.com/             |
| **SSL Labs**                | SSL/TLS testing                  | https://www.ssllabs.com/ssltest/        |
| **testssl.sh**              | TLS/SSL testing script           | https://testssl.sh/                     |

### 13.2 OWASP Top 10 (2021) Mapping

| OWASP Risk                                          | Test Case Coverage    | Status |
| --------------------------------------------------- | --------------------- | ------ |
| A01:2021-Broken Access Control                      | Test Cases 2, 6, 14   |        |
| A02:2021-Cryptographic Failures                     | Test Cases 7, 9, 10   |        |
| A03:2021-Injection                                  | Test Case 4           |        |
| A04:2021-Insecure Design                            | Test Cases 2, 14      |        |
| A05:2021-Security Misconfiguration                  | Test Cases 10, 13, 14 |        |
| A06:2021-Vulnerable and Outdated Components         | Test Case 14          |        |
| A07:2021-Identification and Authentication Failures | Test Cases 1, 3, 7    |        |
| A08:2021-Software and Data Integrity Failures       | Test Cases 6, 12      |        |
| A09:2021-Security Logging and Monitoring Failures   | Test Case 12          |        |
| A10:2021-Server-Side Request Forgery (SSRF)         | Test Case 14          |        |

### 13.3 Compliance Standards Reference

| Standard      | Requirement                                  | Test Coverage        |
| ------------- | -------------------------------------------- | -------------------- |
| **NIST CSF**  | Identify, Protect, Detect, Respond, Recover  | All test cases       |
| **ISO 27001** | Information security management              | Test Cases 9, 12, 13 |
| **PCI DSS**   | Payment card data protection (if applicable) | Test Cases 7, 9, 10  |
| **GDPR**      | Data protection and privacy                  | Test Cases 9, 11, 12 |

### 13.4 Critical Security Controls Checklist

- ☐ Authentication mechanisms secure
- ☐ Authorization properly enforced
- ☐ Session management secure
- ☐ Input validation comprehensive
- ☐ CSRF protection implemented
- ☐ XSS prevention effective
- ☐ SQL injection prevented
- ☐ File upload security controls in place
- ☐ Password hashing strong (bcrypt)
- ☐ HTTPS enforced everywhere
- ☐ Security headers configured
- ☐ Audit logging comprehensive
- ☐ Error handling doesn't leak information
- ☐ API security controls active
- ☐ Data encryption at rest and in transit
- ☐ Rate limiting implemented
- ☐ Firewall properly configured
- ☐ Network segmentation in place
- ☐ Regular security scanning scheduled
- ☐ Incident response plan documented

### 13.5 Security Testing Glossary

| Term              | Definition                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **XSS**           | Cross-Site Scripting - Injection of malicious scripts into web pages                        |
| **CSRF**          | Cross-Site Request Forgery - Unauthorized actions performed on behalf of authenticated user |
| **SQL Injection** | Insertion of malicious SQL queries via input fields                                         |
| **IDOR**          | Insecure Direct Object Reference - Unauthorized access via direct reference to objects      |
| **SSRF**          | Server-Side Request Forgery - Server tricked into making unauthorized requests              |
| **RCE**           | Remote Code Execution - Ability to execute arbitrary code on target system                  |
| **DoS**           | Denial of Service - Making service unavailable to legitimate users                          |
| **CVSS**          | Common Vulnerability Scoring System - Standardized vulnerability severity rating            |
| **OWASP**         | Open Web Application Security Project - Nonprofit focused on web security                   |
| **SIEM**          | Security Information and Event Management - Centralized security monitoring                 |
| **WAF**           | Web Application Firewall - Filters malicious HTTP traffic                                   |
| **IDS/IPS**       | Intrusion Detection/Prevention System - Network security monitoring                         |

---

**End of Security UAT Document**

_Version: 1.0_
_Date: December 23, 2025_
_Document Status: DRAFT - Pending Security Review and Approval_

**CONFIDENTIAL - SECURITY TESTING DOCUMENT**
_This document contains sensitive security information and should be protected accordingly._

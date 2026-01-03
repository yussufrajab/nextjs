# SECURITY POLICY DOCUMENT

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item               | Details                                                    |
| ------------------ | ---------------------------------------------------------- |
| **Document Title** | Security Policy Document - Civil Service Management System |
| **Project Name**   | Civil Service Management System (CSMS)                     |
| **Version**        | 1.0                                                        |
| **Date Prepared**  | December 26, 2025                                          |
| **Effective Date** | January 1, 2026                                            |
| **Review Date**    | January 1, 2027                                            |
| **Classification** | RESTRICTED                                                 |
| **Approved By**    | Civil Service Commission                                   |
| **Document Owner** | Chief Information Security Officer                         |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Security Objectives](#2-security-objectives)
3. [Security Standards](#3-security-standards)
4. [Acceptable Use Policy](#4-acceptable-use-policy)
5. [Password Policy](#5-password-policy)
6. [Access Control Policy](#6-access-control-policy)
7. [Data Protection Policy](#7-data-protection-policy)
8. [Network Security Policy](#8-network-security-policy)
9. [Physical Security Policy](#9-physical-security-policy)
10. [Incident Response Policy](#10-incident-response-policy)
11. [Compliance and Audit](#11-compliance-and-audit)
12. [Policy Enforcement](#12-policy-enforcement)
13. [Appendices](#13-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Security Policy Document establishes the security framework for the Civil Service Management System (CSMS) to protect the confidentiality, integrity, and availability of civil service employee information and HR management processes. This policy applies to all users, administrators, and systems that interact with CSMS.

### 1.2 Scope

This policy covers:

- All CSMS users (9 user roles)
- All system components (application, database, storage)
- All data processed by CSMS
- All access methods (web, mobile, API)
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

- Annually on January 1st
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
- Access logging and monitoring
- Data classification and handling procedures
- Need-to-know access principles

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
- Monitoring and alerting
- Redundancy for critical components
- Performance optimization
- DDoS protection

**Service Levels:**

- System availability: 24/7/365
- Support hours: Monday-Friday, 8:00-17:00 EAT
- Emergency support: 24/7
- Maximum planned downtime: 4 hours/month
- Recovery Time Objective (RTO): 4 hours
- Recovery Point Objective (RPO): 24 hours

### 2.2 Secondary Security Objectives

#### 2.2.1 Accountability

**Objective:** Ensure all actions can be attributed to specific users.

**Implementation:**

- Unique user accounts (no shared accounts)
- Comprehensive audit logging
- Non-repudiation mechanisms
- Session tracking
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

| Metric                       | Target           | Measurement Frequency |
| ---------------------------- | ---------------- | --------------------- |
| System Availability          | 99.5%            | Monthly               |
| Unauthorized Access Attempts | < 10/month       | Monthly               |
| Security Incidents           | 0 critical/month | Monthly               |
| Password Policy Compliance   | 100%             | Quarterly             |
| Security Training Completion | 100% annually    | Annually              |
| Vulnerability Remediation    | < 30 days        | Continuous            |
| Backup Success Rate          | 100%             | Daily                 |
| Audit Log Retention          | 90 days minimum  | Continuous            |

---

## 3. Security Standards

### 3.1 Applicable Standards

CSMS security implementation adheres to the following international and national standards:

#### 3.1.1 International Standards

**ISO/IEC 27001:2013 - Information Security Management**

- Information security management system (ISMS)
- Risk assessment and treatment
- Security controls implementation
- Continuous improvement

**ISO/IEC 27002:2013 - Code of Practice for Information Security Controls**

- Security control guidelines
- Implementation guidance
- Best practices

**NIST Cybersecurity Framework**

- Identify
- Protect
- Detect
- Respond
- Recover

**OWASP Top 10 - Web Application Security**

- Protection against:
  - Injection attacks
  - Broken authentication
  - Sensitive data exposure
  - XML external entities
  - Broken access control
  - Security misconfiguration
  - Cross-site scripting (XSS)
  - Insecure deserialization
  - Using components with known vulnerabilities
  - Insufficient logging and monitoring

#### 3.1.2 National Standards

**Tanzania/Zanzibar Data Protection Regulations**

- Personal data protection requirements
- Data subject rights
- Data controller obligations
- Cross-border data transfer restrictions

**Zanzibar e-Government Standards**

- Government system security requirements
- Interoperability standards
- Service delivery standards

### 3.2 Technical Standards

#### 3.2.1 Encryption Standards

**Data in Transit:**

- **Protocol**: TLS 1.2 or higher
- **Cipher Suites**: AES-256-GCM or stronger
- **Certificate Authority**: Trusted CA certificates only
- **Certificate Validity**: Maximum 397 days
- **Key Exchange**: ECDHE or DHE
- **Perfect Forward Secrecy**: Required

**Data at Rest:**

- **Database Encryption**: AES-256 encryption (implementation pending)
- **File Storage**: MinIO with encryption enabled
- **Backup Encryption**: AES-256 encryption

#### 3.2.2 Authentication Standards

**Password Hashing:**

- **Algorithm**: bcrypt
- **Work Factor**: 10 rounds minimum
- **Salt**: Unique per password
- **Storage**: Hashed passwords only, never plaintext

**Session Management:**

- **Session Timeout**: 24 hours of inactivity
- **Session Storage**: Secure, HTTP-only cookies
- **Session Regeneration**: On authentication and privilege escalation
- **Concurrent Sessions**: Limited per user

#### 3.2.3 Application Security Standards

**Input Validation:**

- Server-side validation required
- Client-side validation for UX only
- Whitelist validation preferred
- Length limits enforced
- Type checking required

**Output Encoding:**

- Context-appropriate encoding
- HTML entity encoding
- JavaScript encoding
- URL encoding
- SQL parameterization

**Error Handling:**

- Generic error messages to users
- Detailed logging server-side
- No sensitive information in errors
- Graceful degradation

### 3.3 Security Architecture Standards

#### 3.3.1 Layered Security (Defense in Depth)

**Layer 1: Perimeter Security**

- Firewall rules
- DDoS protection
- Intrusion detection/prevention
- Network segmentation

**Layer 2: Network Security**

- HTTPS/TLS for all communications
- VPN for administrative access
- Network monitoring
- Port restrictions

**Layer 3: Application Security**

- Authentication and authorization
- Input validation
- Session management
- CSRF protection
- XSS prevention

**Layer 4: Data Security**

- Encryption at rest
- Encryption in transit
- Data classification
- Access controls
- Backup encryption

**Layer 5: Physical Security**

- Data center access controls
- Environmental controls
- Video surveillance
- Asset management

#### 3.3.2 Principle of Least Privilege

**Implementation:**

- Users granted minimum necessary permissions
- Role-based access control (RBAC)
- Separation of duties
- Regular access reviews
- Time-limited elevated privileges

**Examples:**

- HRO can only access own institution data
- HRMO cannot access complaints/terminations
- DO cannot access other HR requests
- Planning Officer: read-only access
- Employees can only view own data

### 3.4 Development and Deployment Standards

#### 3.4.1 Secure Development Lifecycle (SDLC)

**Phases:**

1. **Requirements**: Security requirements definition
2. **Design**: Threat modeling, security architecture
3. **Development**: Secure coding practices, code reviews
4. **Testing**: Security testing, vulnerability scanning
5. **Deployment**: Secure configuration, hardening
6. **Maintenance**: Patch management, monitoring

**Secure Coding Practices:**

- OWASP Secure Coding Guidelines
- Input validation
- Output encoding
- Parameterized queries
- Error handling
- Logging and monitoring
- Dependencies management

#### 3.4.2 Change Management

**Requirements:**

- All changes documented
- Security review for changes
- Testing in staging environment
- Rollback procedures defined
- Change approval required
- Post-deployment verification

---

## 4. Acceptable Use Policy

### 4.1 Purpose

This Acceptable Use Policy (AUP) defines authorized and prohibited uses of the CSMS system. All users must comply with this policy.

### 4.2 Authorized Use

#### 4.2.1 General Authorized Use

CSMS may be used for:

**✓ Legitimate Business Purposes:**

- Submitting HR requests for civil service employees
- Reviewing and approving HR requests
- Viewing employee profiles within authorization scope
- Generating reports for planning and analytics
- Managing user accounts (administrators only)
- Syncing data from HRIMS (administrators only)
- Submitting employee complaints/grievances
- Responding to complaints (HHRMD, DO)

**✓ Within Role Authorization:**

- HRO: Submit requests for own institution
- HHRMD: Approve all request types
- HRMO: Approve HR requests (not complaints/terminations)
- DO: Handle complaints and terminations
- PO: View and generate reports
- CSCS: Monitor and oversee activities
- HRRP: View institution data
- ADMIN: System administration
- EMPLOYEE: View own profile, submit complaints

#### 4.2.2 Data Access

**Authorized Data Access:**

- Access only to data necessary for job function
- Institution-based roles: Own institution only
- CSC roles: All institutions as required
- Employees: Own data only
- Administrators: All data for administration purposes only

### 4.3 Prohibited Use

#### 4.3.1 Strictly Prohibited Activities

**❌ Account Misuse:**

- Sharing login credentials with others
- Using another person's account
- Attempting to access accounts without authorization
- Creating unauthorized user accounts
- Circumventing authentication mechanisms

**❌ Data Misuse:**

- Accessing data without legitimate business need
- Disclosing confidential information to unauthorized persons
- Copying or downloading data for personal use
- Modifying data without authorization
- Deleting or destroying data without authorization
- Exporting data to unauthorized systems

**❌ System Misuse:**

- Attempting to gain unauthorized access to system resources
- Exploiting security vulnerabilities
- Installing unauthorized software or tools
- Introducing malware, viruses, or malicious code
- Conducting security testing without authorization
- Degrading system performance intentionally
- Bypassing security controls

**❌ Malicious Activities:**

- Hacking, cracking, or penetration testing without authorization
- Denial of service attacks
- Social engineering attacks
- Phishing or spoofing
- Credential stuffing or brute force attacks

**❌ Inappropriate Content:**

- Uploading offensive, obscene, or inappropriate content
- Submitting false or fraudulent information
- Creating fake or misleading requests
- Harassment or threatening communications
- Discriminatory or hateful content

#### 4.3.2 Prohibited Data Practices

**❌ Data Handling Violations:**

- Storing CSMS data on personal devices without authorization
- Transmitting CSMS data via personal email accounts
- Posting CSMS data on social media or public forums
- Printing confidential documents without business need
- Leaving confidential documents unattended
- Discussing confidential information in public areas

**❌ External Sharing:**

- Sharing employee personal information with external parties without authorization
- Publishing CSMS data on external websites
- Providing CSMS access to unauthorized third parties
- Transferring data across borders without proper authorization

### 4.4 Personal Use

**Limited Personal Use:**

- Incidental personal use permitted if:
  - Does not interfere with work duties
  - Does not violate any policy provisions
  - Does not compromise security
  - Does not consume significant resources
  - Does not involve confidential data

**Examples of Acceptable Limited Personal Use:**

- Checking personal email during break (not using CSMS)
- Brief personal phone calls during break

**Examples of Unacceptable Personal Use:**

- Using CSMS to manage personal business
- Storing personal files in CSMS
- Using CSMS infrastructure for personal projects

### 4.5 Monitoring and Privacy

#### 4.5.1 User Monitoring

**Notice:**
Users acknowledge and consent that:

- All CSMS activities may be monitored
- System logs are maintained
- Access patterns are analyzed
- Suspicious activities are investigated
- No expectation of privacy when using CSMS

**Monitoring Purposes:**

- Security incident detection
- Performance optimization
- Compliance verification
- Audit requirements
- Troubleshooting
- Usage analytics

#### 4.5.2 Audit Logging

**Logged Activities:**

- Login attempts (successful and failed)
- Logout events
- Request submissions
- Approvals and rejections
- Data modifications
- User account changes
- Document uploads and downloads
- Report generation
- Password changes
- Administrative actions

**Log Retention:**

- Standard logs: 90 days minimum
- Security-related logs: 1 year
- Compliance logs: 7 years
- Critical incident logs: Indefinite

### 4.6 Reporting Violations

#### 4.6.1 Obligation to Report

**All users must report:**

- Suspected security breaches
- Policy violations
- Unauthorized access attempts
- Lost or stolen credentials
- Suspicious activities
- Accidental data disclosure
- System vulnerabilities

**Reporting Channels:**

- Immediate supervisor
- System Administrator: admin@csms.zanajira.go.tz
- Security Officer: security@csms.zanajira.go.tz
- Anonymous hotline: (if established)

#### 4.6.2 Non-Retaliation

Users who report security incidents or policy violations in good faith will not face retaliation.

### 4.7 Consequences of Violations

#### 4.7.1 Disciplinary Actions

Violations may result in:

**First Offense (Minor):**

- Warning and counseling
- Mandatory security training
- Temporary access restriction

**Repeat or Serious Offense:**

- Access suspension
- Formal disciplinary action
- Termination of employment
- Contract cancellation (contractors)
- Legal prosecution (criminal violations)

**Immediate Termination Offenses:**

- Deliberate data theft
- System sabotage
- Fraud or embezzlement
- Selling confidential information
- Introducing malware
- Hacking or unauthorized access

---

## 5. Password Policy

### 5.1 Purpose

This Password Policy establishes requirements for password creation, management, and protection to prevent unauthorized access to CSMS.

### 5.2 Password Requirements

#### 5.2.1 Password Complexity

**Current Requirements:**

- **Minimum length**: 6 characters
- **Character types**: No specific requirements (to be enhanced)

**Recommended Enhanced Requirements (To Be Implemented):**

- **Minimum length**: 12 characters
- **Character types**: Must include at least three of:
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

**Password Examples:**

❌ **Weak Passwords:**

- `password` (dictionary word)
- `123456` (sequential)
- `admin2024` (predictable)
- `johndoe` (personal info)

✅ **Strong Passwords:**

- `Zi@nz1b@r2024!HR` (12+ chars, mixed types)
- `MyC$MS#P@ssw0rd` (12+ chars, mixed types)
- `Civ!lS3rv1c3#2024` (12+ chars, mixed types)

#### 5.2.2 Password Creation

**Process:**

1. **Initial Password Assignment**:
   - Administrator assigns temporary password
   - Temporary password must be changed on first login
   - Temporary password valid for 7 days only

2. **User Password Change**:
   - Current password required
   - New password must meet complexity requirements
   - New password cannot match last 5 passwords
   - Confirmation required

3. **Password Validation**:
   - Real-time strength indicator
   - Complexity check before acceptance
   - Blacklist check (common passwords)
   - History check (previous passwords)

### 5.3 Password Management

#### 5.3.1 Password Protection

**User Responsibilities:**

**MUST:**

- ✓ Keep passwords confidential
- ✓ Memorize passwords (do not write down)
- ✓ Use password manager if needed (approved tools only)
- ✓ Create unique password for CSMS
- ✓ Logout when leaving workstation unattended
- ✓ Change password immediately if compromised
- ✓ Report lost/stolen credentials immediately

**MUST NOT:**

- ✗ Share password with anyone
- ✗ Write password on paper
- ✗ Store password in plain text file
- ✗ Send password via email or messaging
- ✗ Use same password for multiple systems
- ✗ Reveal password to IT support (they should reset, not ask)
- ✗ Auto-save password in browser (on shared computers)

#### 5.3.2 Password Storage

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

#### 5.3.3 Password Expiration

**Current Policy:**

- No automatic expiration (to be enhanced)

**Recommended Policy (To Be Implemented):**

- **Standard Users**: 90 days
- **Administrators**: 60 days
- **Service Accounts**: 180 days
- Grace period: 7 days before expiration
- Warning notifications: 14, 7, 3, 1 days before expiration

**Exceptions:**

- Emergency password reset: No expiration delay
- System-generated passwords: Must change on first login

### 5.4 Password Reset

#### 5.4.1 Standard Password Reset Process

**User-Initiated Reset:**

1. User contacts system administrator
2. Administrator verifies identity:
   - Full name
   - Institution
   - Employee ID or ZanID
   - Security questions (if implemented)
3. Administrator resets password
4. Temporary password sent securely (in person or secure channel)
5. User must change on first login
6. Password reset logged

**Security Considerations:**

- Identity verification required
- No password reset via email/phone without verification
- Temporary password valid 7 days
- Previous password invalidated immediately

#### 5.4.2 Emergency Reset

**For Compromised Accounts:**

1. Immediate password invalidation
2. Active sessions terminated
3. Account locked temporarily
4. Security review initiated
5. User notified
6. Incident logged
7. Password reset after verification

#### 5.4.3 Administrator Password Reset

**Special Procedures:**

- Requires two administrators
- Approval from supervisor required
- Enhanced identity verification
- Logged with detailed justification
- Security review triggered

### 5.5 Multi-Factor Authentication (MFA)

**Current Status:**

- Not implemented (planned for future)

**Recommended Implementation:**

- **Phase 1**: MFA for administrators and HHRMD
- **Phase 2**: MFA for all CSC roles (HRMO, DO, CSCS)
- **Phase 3**: MFA for all users

**MFA Methods:**

- SMS one-time password (OTP)
- Email OTP
- Authenticator app (Google Authenticator, Microsoft Authenticator)
- Hardware tokens (for high-security accounts)

### 5.6 Service Account Passwords

**Requirements:**

- Complex passwords (20+ characters)
- No human-readable patterns
- Stored in secure password vault
- Access logged and audited
- Rotated every 180 days
- Used only for automated processes

**Examples:**

- Database connection passwords
- HRIMS API keys
- MinIO access keys
- Integration service accounts

### 5.7 Password Policy Compliance

#### 5.7.1 Monitoring

**Compliance Checks:**

- Password age monitoring
- Failed login attempt tracking
- Password complexity validation
- Shared account detection
- Weak password identification

#### 5.7.2 Enforcement

**Automated Enforcement:**

- Password complexity validation at creation
- Password history check (prevent reuse)
- Account lockout after failed attempts (5 attempts)
- Automatic expiration (when implemented)
- Forced password change for expired passwords

**Manual Enforcement:**

- Quarterly password compliance audits
- User security awareness training
- Policy violation investigations
- Disciplinary actions for violations

### 5.8 Account Lockout Policy

#### 5.8.1 Lockout Triggers

**Account Locked After:**

- 5 consecutive failed login attempts
- Password expired and grace period exceeded
- Administrator-initiated lock
- Suspected compromise
- Extended inactivity (90 days)

#### 5.8.2 Lockout Duration

**Standard Lockout:**

- Duration: 30 minutes automatic unlock
- Manual unlock: Administrator can unlock immediately after verification

**Security Lockout:**

- Requires administrator unlock
- Identity verification required
- Incident review may be required

#### 5.8.3 Unlock Process

1. User contacts administrator
2. Administrator verifies identity
3. Administrator reviews failed login attempts
4. If legitimate: Unlock account
5. If suspicious: Security review before unlock
6. User may need to reset password
7. Unlock action logged

---

## 6. Access Control Policy

### 6.1 Purpose

This Access Control Policy defines how access to CSMS resources is granted, managed, and revoked to ensure only authorized users can access appropriate data and functions.

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

**Examples:**

- HRO submits confirmation → HHRMD/HRMO approves (different users)
- Administrator creates user → Supervisor approves (if implemented)
- Financial transactions require dual approval (if applicable)

#### 6.2.3 Need-to-Know

**Definition:**
Access granted only to data necessary for legitimate business purpose.

**Implementation:**

- Institution-based data isolation
- Role-based data visibility
- Contextual access restrictions
- Query result filtering

**Examples:**

- HRO sees only own institution employees
- Employee sees only own profile and complaints
- HRRP sees only own institution data
- PO cannot modify data, only view

#### 6.2.4 Defense in Depth

**Definition:**
Multiple layers of security controls.

**Implementation:**

- Network perimeter security
- Application-level authentication
- Database access controls
- API authorization checks
- Audit logging at each layer

### 6.3 User Access Management

#### 6.3.1 Access Request Process

**New User Access:**

1. **Request Initiation**:
   - Supervisor submits access request
   - Includes: User details, role, institution, justification
   - Submitted to IT/Security team

2. **Approval**:
   - Supervisor approval
   - Security review (for sensitive roles)
   - Management approval (for CSC roles)

3. **Provisioning**:
   - Administrator creates account
   - Assigns appropriate role
   - Links to institution
   - Generates temporary password
   - Communicates credentials securely

4. **User Activation**:
   - User logs in first time
   - Changes temporary password
   - Reviews acceptable use policy
   - Acknowledges security awareness

5. **Verification**:
   - Access tested
   - Permissions verified
   - User trained on role functions

**Access Request Documentation:**

- Request form completed
- Approvals documented
- Account creation logged
- Credentials delivered securely
- Acknowledgment signed

#### 6.3.2 Access Modification

**Change of Role or Responsibilities:**

1. **Change Request**:
   - Supervisor submits change request
   - Specifies old and new roles
   - Justification provided

2. **Review and Approval**:
   - Security review
   - Management approval
   - Access impact analysis

3. **Implementation**:
   - Old permissions revoked
   - New permissions granted
   - User notified
   - Change logged

4. **Verification**:
   - Access tested
   - Old access verified removed
   - User re-trained if needed

**Temporary Elevated Access:**

- Maximum duration: 24 hours
- Justification required
- Approval required
- Enhanced logging
- Automatic revocation

#### 6.3.3 Access Revocation

**User Departure:**

**Immediate Revocation (Day of Departure):**

- Account disabled
- Active sessions terminated
- Access tokens invalidated
- Physical access removed

**Post-Departure:**

- Email forwarding (if applicable)
- Data ownership transfer
- Account archived (not deleted)
- Equipment returned
- Exit interview

**Termination for Cause:**

- Immediate account disablement
- No advance notice
- Enhanced monitoring before termination (if suspected)
- Legal hold on data if needed
- Security incident review

**Temporary Leave:**

- Account disabled during leave
- Re-enabled upon return
- Password reset required
- Access verification upon return

#### 6.3.4 Access Reviews

**Quarterly Access Reviews:**

**Process:**

1. Generate user access report
2. Department heads review staff access
3. Verify access still appropriate
4. Identify excessive permissions
5. Document review results
6. Remediate issues within 30 days

**Review Criteria:**

- User still employed?
- Role still current?
- Institution correct?
- Permissions appropriate?
- Last login date acceptable?
- Any suspicious activity?

**Annual Comprehensive Review:**

- All user accounts reviewed
- All permissions validated
- Inactive accounts identified
- Compliance verification
- Security posture assessment

### 6.4 Role-Based Access Control (RBAC)

#### 6.4.1 User Roles and Permissions

**Role Definitions:**

| Role                          | Code     | Access Scope                 | Primary Functions           | Permissions                                                                                  |
| ----------------------------- | -------- | ---------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| **Administrator**             | ADMIN    | System-wide                  | System administration       | - User CRUD<br>- Institution CRUD<br>- HRIMS sync<br>- System config                         |
| **HR Officer**                | HRO      | Institution only             | Submit HR requests          | - Submit requests<br>- View own institution<br>- Track requests                              |
| **Head of HR & Disciplinary** | HHRMD    | All institutions             | Approve all requests        | - Approve all types<br>- View all institutions<br>- Handle complaints                        |
| **HR Management Officer**     | HRMO     | All institutions             | Approve HR requests         | - Approve HR requests<br>- Cannot approve complaints/terminations<br>- View all institutions |
| **Disciplinary Officer**      | DO       | All institutions             | Handle disciplinary matters | - Approve complaints<br>- Approve terminations<br>- View all institutions                    |
| **Planning Officer**          | PO       | All institutions (read-only) | Reports and analytics       | - View reports only<br>- Cannot approve/submit<br>- All institutions                         |
| **CSC Secretary**             | CSCS     | All institutions (executive) | Executive oversight         | - View all activities<br>- Cannot approve<br>- System-wide visibility                        |
| **HR Responsible Personnel**  | HRRP     | Institution only             | Institutional supervision   | - View own institution<br>- Cannot approve<br>- Monitor activities                           |
| **Employee**                  | EMPLOYEE | Own data only                | Self-service                | - View own profile<br>- Submit complaints<br>- View own requests                             |

#### 6.4.2 Permission Matrix

**Module Access:**

| Module                | ADMIN | HRO   | HHRMD | HRMO  | DO    | PO    | CSCS  | HRRP    | EMPLOYEE |
| --------------------- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ------- | -------- |
| **Dashboard**         | ✓     | ✓     | ✓     | ✓     | ✓     | ✗     | ✓     | ✓       | ✗        |
| **Employees**         | ✓     | ✓\*   | ✓     | ✓     | ✓     | ✓ (R) | ✓ (R) | ✓\* (R) | ✓\*\*    |
| **Confirmations**     | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Promotions**        | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **LWOP**              | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Cadre Change**      | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Retirement**        | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Resignation**       | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Service Extension** | ✗     | ✓ (S) | ✓ (A) | ✓ (A) | ✗     | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Termination**       | ✗     | ✓ (S) | ✓ (A) | ✗     | ✓ (A) | ✓ (R) | ✓ (R) | ✓\* (R) | ✗        |
| **Complaints**        | ✗     | ✗     | ✓ (A) | ✗     | ✓ (A) | ✓ (R) | ✓ (R) | ✗       | ✓ (S)    |
| **Reports**           | ✓     | ✓\*   | ✓     | ✓     | ✓     | ✓     | ✓     | ✓\*     | ✗        |
| **User Management**   | ✓     | ✗     | ✗     | ✗     | ✗     | ✗     | ✗     | ✗       | ✗        |
| **Institutions**      | ✓     | ✗     | ✗     | ✗     | ✗     | ✗     | ✗     | ✗       | ✗        |
| **HRIMS Integration** | ✓     | ✗     | ✗     | ✗     | ✗     | ✗     | ✗     | ✗       | ✗        |

**Legend:**

- ✓ = Full access
- ✓\* = Institution-filtered access
- ✓\*\* = Own data only
- (S) = Submit only
- (A) = Approve/Review
- (R) = Read only
- ✗ = No access

#### 6.4.3 Data Filtering Rules

**Institution-Based Filtering:**

**HRO, HRRP (Institution-Based Roles):**

```sql
WHERE institutionId = user.institutionId
```

- See only employees from own institution
- See only requests from own institution
- Cannot access other institutions

**CSC Roles (HHRMD, HRMO, DO, PO, CSCS):**

```sql
-- No filter, can see all institutions
```

- System-wide visibility
- All institutions accessible
- Optional institution filter for convenience

**Employee:**

```sql
WHERE employeeId = user.employeeId
-- OR
WHERE complainantId = user.id
```

- See only own employee profile
- See only own complaints

**Administrator:**

- Full access to all data for administration purposes
- Access must be for legitimate administrative functions
- All access logged and audited

### 6.5 Authentication and Authorization

#### 6.5.1 Authentication Methods

**Standard Login (Staff Users):**

- Username or email + password
- Session-based authentication
- No JWT tokens (simplified approach)
- HTTP-only secure cookies

**Employee Login:**

- ZanID + Payroll Number + ZSSF Number
- Three-factor credential verification
- Read-only session
- Limited functionality

**API Authentication (Future):**

- API keys for service accounts
- OAuth 2.0 for integrations
- JWT tokens for stateless APIs

#### 6.5.2 Authorization Checks

**Access Control Flow:**

1. **Authentication**: Verify user identity
2. **Session Validation**: Check active session
3. **Role Verification**: Confirm user role
4. **Permission Check**: Verify action authorized for role
5. **Data Scope Check**: Ensure access to specific data allowed
6. **Action Logging**: Log access attempt
7. **Access Granted/Denied**: Return result

**Implementation:**

```typescript
// Pseudo-code for authorization check
function authorize(user, action, resource) {
  // 1. Check if user is authenticated
  if (!user.authenticated) {
    return deny('Not authenticated');
  }

  // 2. Check if user is active
  if (!user.active) {
    return deny('Account inactive');
  }

  // 3. Check role-based permission
  if (!hasPermission(user.role, action)) {
    return deny('Insufficient permissions');
  }

  // 4. Check data scope
  if (!canAccessResource(user, resource)) {
    return deny('Cannot access this resource');
  }

  // 5. Log access
  logAccess(user, action, resource);

  // 6. Grant access
  return allow();
}
```

#### 6.5.3 Session Management

**Session Security:**

- Unique session ID per login
- Session stored server-side
- HTTP-only cookies (not accessible to JavaScript)
- Secure flag (HTTPS only)
- SameSite attribute (CSRF protection)
- Session timeout: 24 hours inactivity
- Automatic logout on timeout
- Session regeneration on privilege change

**Concurrent Sessions:**

- Limited to 3 concurrent sessions per user (recommended)
- Oldest session terminated when limit exceeded
- User notified of concurrent logins (if suspicious)

**Session Termination:**

- Explicit logout
- Inactivity timeout
- Password change
- Role change
- Account deactivation
- Security incident

### 6.6 Remote Access

**Current Status:**

- Web-based access only
- HTTPS required
- No VPN requirement for users

**Future Considerations:**

- VPN for administrative access
- IP whitelisting for sensitive roles
- Geographic restrictions (Zanzibar/Tanzania only)
- Device registration

### 6.7 Third-Party Access

#### 6.7.1 External System Integration

**HRIMS Integration:**

- API key authentication
- Read-only access to employee data
- Rate limiting applied
- Connection logging
- Periodic access review

**Future Integrations:**

- Formal security review required
- Data sharing agreement
- Limited access scope
- Regular audits
- Revocable access

#### 6.7.2 Vendor/Contractor Access

**Requirements:**

- Non-disclosure agreement (NDA)
- Background check
- Time-limited access
- Supervised access for critical systems
- Enhanced logging
- Regular review
- Immediate revocation upon contract end

---

## 7. Data Protection Policy

### 7.1 Purpose

This Data Protection Policy ensures the confidentiality, integrity, and availability of data processed by CSMS in compliance with data protection regulations.

### 7.2 Data Classification

#### 7.2.1 Classification Levels

**LEVEL 1: PUBLIC**

- **Definition**: Information intended for public distribution
- **Examples**:
  - Public job postings
  - General HR policies
  - System user guide
- **Handling**: No special restrictions

**LEVEL 2: INTERNAL USE**

- **Definition**: Information for internal government use
- **Examples**:
  - Institutional statistics
  - General reports
  - Training materials
- **Handling**:
  - Access restricted to authorized users
  - Not for public distribution
  - Basic access controls

**LEVEL 3: CONFIDENTIAL**

- **Definition**: Sensitive information requiring protection
- **Examples**:
  - Employee personal information
  - Performance evaluations
  - HR requests details
  - Salary information
- **Handling**:
  - Role-based access control
  - Encryption in transit
  - Access logging
  - Secure disposal

**LEVEL 4: RESTRICTED**

- **Definition**: Highly sensitive information
- **Examples**:
  - Disciplinary records
  - Termination reasons
  - Complaints with sensitive allegations
  - Medical information
  - National security related data
- **Handling**:
  - Strict need-to-know access
  - Encryption at rest and in transit
  - Comprehensive audit trail
  - Approval required for access
  - Secure storage and disposal

#### 7.2.2 Data Classification Matrix

| Data Type                     | Classification | Access         | Encryption     | Retention                |
| ----------------------------- | -------------- | -------------- | -------------- | ------------------------ |
| Employee Name, Institution    | Confidential   | Role-based     | Transit        | 7 years after separation |
| ZanID, Payroll, ZSSF          | Restricted     | Strict         | Rest + Transit | 7 years after separation |
| Contact Info (Phone, Address) | Confidential   | Role-based     | Transit        | 7 years after separation |
| Salary, Cadre                 | Confidential   | Role-based     | Transit        | 7 years after separation |
| Performance Evaluations       | Confidential   | Role-based     | Transit        | 7 years                  |
| Disciplinary Records          | Restricted     | Strict         | Rest + Transit | 10 years                 |
| Complaints                    | Restricted     | HHRMD/DO only  | Rest + Transit | 10 years                 |
| HR Request Details            | Confidential   | Role-based     | Transit        | 7 years                  |
| Medical Information           | Restricted     | Minimal        | Rest + Transit | 10 years                 |
| User Credentials              | Restricted     | Admin only     | Hashed         | Account lifetime         |
| System Logs                   | Internal       | Admin/Security | Transit        | 90 days-7 years          |
| Reports                       | Confidential   | Role-based     | Transit        | As per content           |

### 7.3 Data Collection and Processing

#### 7.3.1 Data Minimization

**Principle:**
Collect only data necessary for specified purpose.

**Implementation:**

- Required fields only in forms
- Optional fields clearly marked
- Regular review of data collected
- Removal of unnecessary data elements
- Purpose limitation

**Examples:**

- Employee profile: Collect only fields needed for HR management
- Complaints: Collect only information needed for resolution
- Reports: Include only necessary data points

#### 7.3.2 Purpose Limitation

**Principle:**
Data used only for specified, explicit, legitimate purposes.

**Purposes:**

- **Primary**: Civil service HR management
- **Secondary**:
  - Reporting and analytics
  - Compliance and audit
  - System administration
  - Legal requirements

**Prohibited Uses:**

- Marketing or commercial purposes
- Political purposes
- Discrimination
- Unauthorized sharing

#### 7.3.3 Data Accuracy

**Requirements:**

- Data validated at entry
- Regular data quality checks
- Correction mechanisms
- Data verification processes
- Audit trails for changes

**Processes:**

- HRIMS sync for authoritative data
- Employee self-service for updates
- Regular data quality audits
- Correction procedures

### 7.4 Data Subject Rights

#### 7.4.1 Right to Access

**Employees' Rights:**

- Access own personal data
- Request copy of data held
- Understand how data is processed
- View data processing history

**Process:**

- Employee submits request
- Identity verification
- Data compiled and provided
- Response within 30 days

#### 7.4.2 Right to Rectification

**Rights:**

- Correct inaccurate data
- Complete incomplete data

**Process:**

- Employee requests correction
- Supporting evidence provided
- Review and verification
- Correction made if valid
- Employee notified

#### 7.4.3 Right to Erasure ("Right to be Forgotten")

**Limitations:**

- Cannot delete if legal retention requirement exists
- HR records retained per retention policy
- Audit trails must be maintained

**Applicable Scenarios:**

- Employee withdrawal of consent (where consent is basis)
- Data no longer necessary for purpose
- Unlawfully processed data

#### 7.4.4 Right to Object

**Rights:**

- Object to certain processing activities
- Opt-out of non-essential processing

**Process:**

- Request submitted
- Review of objection
- Processing stopped if valid
- Alternative arrangements made if possible

### 7.5 Data Retention and Disposal

#### 7.5.1 Retention Periods

| Data Type                  | Retention Period              | Basis                |
| -------------------------- | ----------------------------- | -------------------- |
| Active Employee Records    | Employment duration + 7 years | Legal requirement    |
| Separated Employee Records | 7 years after separation      | Legal requirement    |
| Disciplinary Records       | 10 years                      | Legal requirement    |
| Complaints                 | 10 years after resolution     | Legal requirement    |
| HR Requests                | 7 years after decision        | Business need        |
| Performance Evaluations    | 7 years                       | Business need        |
| Payroll Records            | 7 years                       | Legal requirement    |
| User Accounts (Staff)      | Account lifetime + 1 year     | Business need        |
| Audit Logs (Security)      | 1 year                        | Security requirement |
| Audit Logs (Compliance)    | 7 years                       | Legal requirement    |
| Backups                    | 90 days (rotating)            | Business continuity  |
| System Logs                | 90 days                       | Operational          |

#### 7.5.2 Secure Disposal

**Digital Data:**

- Secure deletion (overwriting)
- Database record purging
- Backup removal
- Cryptographic erasure (if encrypted)
- Disposal verification

**Physical Documents:**

- Shredding (cross-cut)
- Secure disposal service
- Certificate of destruction
- Disposal logging

**Process:**

1. Data identified for disposal
2. Retention period verified expired
3. Legal hold checked (none)
4. Approval obtained
5. Secure disposal executed
6. Disposal documented
7. Verification completed

### 7.6 Data Sharing and Disclosure

#### 7.6.1 Internal Sharing

**Permitted:**

- Within CSMS based on role and need
- To supervisors for management purposes
- To auditors for compliance purposes
- To IT for technical support

**Requirements:**

- Legitimate business purpose
- Access controls in place
- Need-to-know basis
- Logging enabled

#### 7.6.2 External Sharing

**Permitted Recipients:**

- Government agencies (with legal basis)
- Law enforcement (with legal order)
- Auditors (with NDA)
- Courts (with subpoena/court order)

**Requirements:**

- Legal basis established
- Data sharing agreement
- Minimum necessary data
- Secure transfer method
- Recipient obligations defined
- Disclosure logged

**Prohibited:**

- Commercial entities (without consent)
- Foreign governments (without treaty)
- Unauthorized third parties
- Public disclosure of confidential data

#### 7.6.3 Cross-Border Data Transfer

**Current Policy:**

- Data hosted in Zanzibar/Tanzania only
- No routine cross-border transfers

**If Required:**

- Adequacy decision or safeguards required
- Data subject notification
- Legal review
- Approval from data protection officer
- Transfer agreement

### 7.7 Data Breach Response

#### 7.7.1 Breach Definition

**Personal Data Breach:**
Breach of security leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data.

**Examples:**

- Unauthorized access to employee records
- Accidental disclosure of confidential data
- Lost or stolen device with data
- Ransomware encryption
- Database exposure
- Email sent to wrong recipient

#### 7.7.2 Breach Response Process

**1. Detection and Reporting (0-1 hour):**

- Breach detected
- Incident response team notified
- Initial assessment

**2. Containment (1-4 hours):**

- Stop the breach
- Isolate affected systems
- Preserve evidence
- Prevent further damage

**3. Assessment (4-24 hours):**

- Determine scope
- Identify affected data
- Assess impact
- Classify severity

**4. Notification (24-72 hours):**

- **Supervisory Authority**: Within 72 hours if high risk
- **Data Subjects**: Without undue delay if high risk
- **Management**: Immediate
- **Law Enforcement**: If criminal

**5. Remediation (Ongoing):**

- Fix vulnerabilities
- Restore systems
- Implement controls
- Monitor for recurrence

**6. Post-Incident Review (Within 30 days):**

- Root cause analysis
- Lessons learned
- Process improvements
- Policy updates

#### 7.7.3 Breach Notification

**To Supervisory Authority:**

- Description of breach
- Data categories affected
- Number of data subjects
- Likely consequences
- Measures taken or proposed
- Contact point for information

**To Data Subjects:**

- Description in clear language
- Contact point for information
- Likely consequences
- Measures taken or proposed
- Recommendations for mitigation

### 7.8 Data Protection Officer (DPO)

**Responsibilities:**

- Monitor compliance with data protection laws
- Advise on data protection impact assessments
- Cooperate with supervisory authority
- Act as contact point
- Conduct training and awareness

**Contact:**

- Email: dpo@csms.zanajira.go.tz
- Phone: (to be assigned)

---

## 8. Network Security Policy

### 8.1 Network Architecture

#### 8.1.1 Network Segmentation

**Zones:**

1. **Public Zone**: Web server, reverse proxy
2. **Application Zone**: CSMS application servers
3. **Database Zone**: PostgreSQL database
4. **Storage Zone**: MinIO object storage
5. **Management Zone**: Administrative access

**Segmentation Benefits:**

- Limit blast radius of breaches
- Granular access control
- Traffic monitoring
- Defense in depth

#### 8.1.2 Firewall Rules

**Default Policy:**

- Default deny all
- Explicit allow required

**Allowed Traffic:**

- HTTPS (443) from Internet to Web Server
- Application to Database (5432)
- Application to MinIO (9000)
- Management Zone to all (restricted IPs)
- HRIMS API calls (outbound HTTPS)

**Denied Traffic:**

- Direct Internet to Database
- Direct Internet to MinIO
- Lateral movement between zones (except authorized)

### 8.2 Encryption

#### 8.2.1 Data in Transit

**Requirements:**

- **TLS Version**: 1.2 minimum, 1.3 preferred
- **Cipher Suites**: Strong ciphers only (AES-256-GCM)
- **Certificate**: Valid from trusted CA
- **HSTS**: HTTP Strict Transport Security enabled
- **Perfect Forward Secrecy**: Required

**Application:**

- All web traffic (HTTPS)
- Database connections (SSL/TLS)
- MinIO API calls (HTTPS)
- HRIMS integration (HTTPS)

#### 8.2.2 Data at Rest

**Current:**

- MinIO with encryption enabled
- Database encryption (to be implemented)

**Recommended:**

- Full database encryption
- Encrypted backups
- Encrypted file system

### 8.3 Network Monitoring

#### 8.3.1 Intrusion Detection/Prevention

**IDS/IPS Deployment:**

- Network-based IDS (NIDS)
- Signature-based detection
- Anomaly detection
- Automated response (blocking)

**Monitored Activities:**

- Port scanning
- Brute force attacks
- SQL injection attempts
- XSS attempts
- Unusual traffic patterns
- Data exfiltration attempts

#### 8.3.2 Log Collection

**Network Logs:**

- Firewall logs
- Proxy logs
- VPN logs (if applicable)
- DNS logs
- Load balancer logs

**Retention:**

- Real-time monitoring
- 90 days retention
- Long-term archival for incidents

### 8.4 Wireless Security

**If Wireless Used:**

- WPA3 encryption
- Strong passphrase
- Hidden SSID
- MAC filtering
- Guest network segregation
- Regular security audits

### 8.5 DDoS Protection

**Mitigation:**

- Rate limiting
- Traffic filtering
- Cloud-based DDoS protection
- Capacity planning
- Incident response plan

---

## 9. Physical Security Policy

### 9.1 Data Center Security

#### 9.1.1 Access Control

**Physical Access:**

- Badge-controlled entry
- Biometric authentication (fingerprint/retina)
- Visitor log and escort requirement
- Security guard presence
- Video surveillance 24/7

**Access Authorization:**

- Administrator access with approval
- Visitor access with sponsor and purpose
- Contractor access with background check
- Access log maintained
- Periodic access review

#### 9.1.2 Environmental Controls

**Requirements:**

- Temperature control (18-27°C)
- Humidity control (40-60%)
- Fire suppression system
- Power backup (UPS + generator)
- Redundant cooling
- Water leak detection

### 9.2 Equipment Security

#### 9.2.1 Server Security

**Physical Security:**

- Locked server racks
- Tamper-evident seals
- Asset tagging and inventory
- Secure disposal procedures

#### 9.2.2 Workstation Security

**Requirements:**

- Screen lock after 5 minutes inactivity
- Complex password for system login
- Full disk encryption (recommended)
- Antivirus installed and updated
- Automatic security updates
- Clean desk policy

### 9.3 Media Handling

**Removable Media:**

- USB drives: Prohibited for CSMS data
- External hard drives: Encrypted, authorized only
- CD/DVD: Controlled use, secure disposal

**Backup Media:**

- Encrypted backups
- Secure storage (offsite)
- Access log
- Regular testing
- Secure disposal when retired

---

## 10. Incident Response Policy

### 10.1 Incident Types

**Security Incidents:**

- Unauthorized access
- Malware infection
- Data breach
- Denial of service
- Phishing attack
- Insider threat
- Physical security breach
- Lost/stolen credentials

### 10.2 Incident Response Team

**Team Members:**

- **Incident Response Manager**: Coordinates response
- **Technical Lead**: Technical investigation and remediation
- **Security Officer**: Security analysis and containment
- **Legal Representative**: Legal implications
- **Communications Officer**: Internal/external communications
- **System Administrator**: System recovery

### 10.3 Incident Response Process

**1. Preparation:**

- Incident response plan documented
- Team trained
- Tools and resources ready
- Contact lists updated

**2. Identification:**

- Incident detected
- Initial assessment
- Severity classification
- Incident declared

**3. Containment:**

- **Short-term**: Isolate affected systems
- **Long-term**: Temporary fixes, backups

**4. Eradication:**

- Remove threat
- Patch vulnerabilities
- Verify removal

**5. Recovery:**

- Restore systems
- Verify functionality
- Resume operations
- Enhanced monitoring

**6. Lessons Learned:**

- Post-incident review
- Document findings
- Update procedures
- Implement improvements

### 10.4 Incident Severity Classification

| Severity     | Definition                             | Response Time     | Examples                                      |
| ------------ | -------------------------------------- | ----------------- | --------------------------------------------- |
| **Critical** | Immediate threat to data or operations | 15 minutes        | Active breach, ransomware, system down        |
| **High**     | Significant risk                       | 1 hour            | Malware detected, unauthorized access attempt |
| **Medium**   | Moderate risk                          | 4 hours           | Policy violation, suspicious activity         |
| **Low**      | Minimal risk                           | Next business day | Failed login attempts, minor policy violation |

### 10.5 Reporting

**Internal Reporting:**

- Immediate: Supervisor, IT, Security
- 24 hours: Management, incident report
- Post-incident: Lessons learned report

**External Reporting:**

- Data Protection Authority: Within 72 hours (breach)
- Law Enforcement: If criminal
- Data Subjects: Without undue delay (high risk breach)

---

## 11. Compliance and Audit

### 11.1 Compliance Requirements

**Legal Compliance:**

- Tanzania/Zanzibar Data Protection Act
- Employment regulations
- Records retention laws
- Freedom of information (where applicable)

**Standards Compliance:**

- ISO/IEC 27001
- NIST Cybersecurity Framework
- OWASP Top 10

### 11.2 Audit Requirements

#### 11.2.1 Internal Audits

**Frequency:**

- Security audits: Quarterly
- Access reviews: Quarterly
- Compliance checks: Annually
- Technical audits: Semi-annually

**Scope:**

- User access appropriateness
- Policy compliance
- Security control effectiveness
- Data handling practices
- Incident response readiness

#### 11.2.2 External Audits

**Independent Security Assessment:**

- Penetration testing: Annually
- Vulnerability assessment: Quarterly
- Security architecture review: Annually

**Compliance Audits:**

- Data protection compliance
- Regulatory compliance
- Industry standards compliance

### 11.3 Audit Logging

**Logged Events:**

- Authentication events
- Authorization failures
- Data access and modifications
- Administrative actions
- Security incidents
- System changes

**Log Protection:**

- Tamper-evident
- Encrypted storage
- Restricted access
- Regular review
- Long-term retention

---

## 12. Policy Enforcement

### 12.1 Roles and Responsibilities

**Chief Information Security Officer (CISO):**

- Overall security program ownership
- Policy development and maintenance
- Security strategy
- Compliance oversight

**System Administrators:**

- Policy implementation
- Technical controls
- User account management
- Security monitoring

**Supervisors/Managers:**

- User compliance enforcement
- Access request approval
- Security awareness
- Incident reporting

**All Users:**

- Policy compliance
- Security awareness
- Incident reporting
- Protecting credentials

### 12.2 Training and Awareness

**Mandatory Training:**

- New user orientation: Before access granted
- Annual security awareness: All users
- Role-specific training: Within 30 days of role assignment
- Incident response training: Response team members

**Training Topics:**

- Security policies and procedures
- Password security
- Phishing awareness
- Data handling
- Incident reporting
- Acceptable use

### 12.3 Compliance Monitoring

**Automated Monitoring:**

- Failed login attempts
- Unauthorized access attempts
- Policy violations (file uploads, etc.)
- Unusual activity patterns

**Manual Reviews:**

- Access reviews (quarterly)
- Log reviews (weekly)
- Compliance audits (annually)
- Security assessments (annually)

### 12.4 Non-Compliance Consequences

**Progressive Discipline:**

1. **First Offense (Minor)**: Warning, counseling
2. **Second Offense**: Written warning, mandatory training
3. **Serious/Repeat**: Suspension, access revocation
4. **Critical**: Termination, legal action

**Immediate Action Offenses:**

- Deliberate data theft
- System sabotage
- Malicious activity
- Fraud

---

## 13. Appendices

### Appendix A: Definitions

| Term                | Definition                                                    |
| ------------------- | ------------------------------------------------------------- |
| **Authentication**  | Process of verifying identity                                 |
| **Authorization**   | Process of granting access rights                             |
| **Confidentiality** | Ensuring information is not disclosed to unauthorized parties |
| **Encryption**      | Converting data to unreadable format                          |
| **Integrity**       | Ensuring data accuracy and completeness                       |
| **Personal Data**   | Information relating to identified or identifiable individual |
| **Vulnerability**   | Weakness that can be exploited                                |
| **Threat**          | Potential cause of unwanted incident                          |
| **Risk**            | Likelihood and impact of threat exploiting vulnerability      |

### Appendix B: Contact Information

| Role                        | Contact | Email                        | Phone            |
| --------------------------- | ------- | ---------------------------- | ---------------- |
| **CISO**                    | (Name)  | ciso@csms.zanajira.go.tz     | +255 XX XXX XXXX |
| **System Administrator**    | (Name)  | admin@csms.zanajira.go.tz    | +255 XX XXX XXXX |
| **Security Officer**        | (Name)  | security@csms.zanajira.go.tz | +255 XX XXX XXXX |
| **Data Protection Officer** | (Name)  | dpo@csms.zanajira.go.tz      | +255 XX XXX XXXX |
| **Incident Response**       | (24/7)  | incident@csms.zanajira.go.tz | +255 XX XXX XXXX |

### Appendix C: Security Incident Report Form

**Incident Details:**

- Date/Time of incident:
- Reported by:
- Incident type:
- Severity level:
- Systems affected:
- Description:

**Initial Response:**

- Actions taken:
- Systems isolated:
- Evidence preserved:

**Impact Assessment:**

- Data affected:
- Number of users impacted:
- Estimated damage:

**Resolution:**

- Remediation steps:
- Verification completed:
- Lessons learned:

### Appendix D: Policy Acknowledgment Form

I acknowledge that I have read, understood, and agree to comply with the CSMS Security Policy Document.

I understand that:

- Non-compliance may result in disciplinary action
- All system activity is monitored and logged
- I am responsible for protecting my credentials
- I must report security incidents immediately

**User Information:**

- Name: **\*\***\_\_\_\_**\*\***
- Role: **\*\***\_\_\_\_**\*\***
- Institution: **\*\***\_\_\_\_**\*\***
- Employee ID: **\*\***\_\_\_\_**\*\***

**Signature:** **\*\***\_\_\_\_**\*\***
**Date:** **\*\***\_\_\_\_**\*\***

**Supervisor Approval:**

- Supervisor Name: **\*\***\_\_\_\_**\*\***
- Signature: **\*\***\_\_\_\_**\*\***
- Date: **\*\***\_\_\_\_**\*\***

---

## Document Approval

| Role            | Name                               | Signature                | Date                     |
| --------------- | ---------------------------------- | ------------------------ | ------------------------ |
| **Prepared By** | Chief Information Security Officer | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |
| **Reviewed By** | IT Manager                         | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |
| **Reviewed By** | Legal Department                   | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |
| **Approved By** | Civil Service Commission           | **\*\***\_\_\_\_**\*\*** | **\*\***\_\_\_\_**\*\*** |

---

## Revision History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2025-12-26 | CISO   | Initial release |

---

**NEXT REVIEW DATE: January 1, 2027**

**END OF DOCUMENT**

---

**CLASSIFICATION: RESTRICTED**
**DISTRIBUTION: Civil Service Commission Staff, System Administrators, Security Personnel**

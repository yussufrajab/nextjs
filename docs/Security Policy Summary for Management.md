# Security Policy Summary for Management

## Civil Service Management System (CSMS)

**Document Version:** 2.0
 **Prepared For:** Civil Service Commission Management
 **Purpose:** Executive overview of the CSMS Security Policy framework

------

## 1. Executive Overview 

The Civil Service Management System (CSMS) handles highly sensitive employee information including personal identification details, salary information, disciplinary records, and employment history. This security policy establishes a comprehensive framework to protect this information from unauthorized access, modification, or disclosure while ensuring the system remains available to authorized users when needed.

The security program operates under the authority of the Civil Service Commission of Zanzibar and applies to all personnel who interact with the system, including staff members, administrators, contractors, and civil service employees themselves. Version 2.0 of the policy reflects significant enhancements that have been fully implemented in the system, including automated password management, session security controls, and comprehensive activity monitoring.

------

## 2. Core Security Objectives

The CSMS security program is built around three fundamental objectives that guide all security decisions and controls implemented within the system.

### 2.1 Protecting Information Confidentiality

The first priority is ensuring that sensitive employee information remains accessible only to individuals who legitimately need access for their official duties. This objective is achieved through multiple layers of controls including role-based access restrictions, encrypted data transmission, secure login procedures, and continuous monitoring of system access patterns. Employees can only view their own personal information, while HR officers can only access data from their assigned institutions. Senior officials with system-wide access have their activities logged and monitored to prevent misuse.

The system protects several categories of sensitive information including personal identification numbers (ZanID, Payroll Number, ZSSF Number), contact information, salary scales, performance evaluations, disciplinary records, and complaint details. Any unauthorized disclosure of this information could harm employees and undermine public confidence in the civil service system.

### 2.2 Maintaining Data Integrity

The second objective focuses on ensuring that all information within CSMS remains accurate, complete, and reliable. The system implements multiple safeguards to prevent unauthorized modification of records. All changes to employee data, request submissions, and approval actions are recorded in detailed audit trails. This means every modification can be traced back to the specific user who made it, along with the time and circumstances of the change.

Critical processes such as employee status changes, request approvals, cadre updates, and document management are protected by validation checks and database constraints that prevent accidental or intentional data corruption. Regular backup procedures ensure that data can be recovered if any integrity issues are discovered.

### 2.3 Ensuring System Availability

The third objective guarantees that authorized users can access CSMS whenever needed for legitimate work purposes. The system targets 99.5% uptime availability, with comprehensive backup and disaster recovery procedures in place. Maximum planned downtime is limited to 4 hours per month, primarily scheduled during low-activity periods. The system is designed to recover operations within 4 hours following any major disruption, with data recovery possible within 24 hours of any incident.

------

## 3. User Roles and Access Controls

CSMS employs a carefully designed access control system that ensures users can only access information and functions necessary for their specific job responsibilities. This approach, known as "least privilege," minimizes the potential impact of any single compromised account while maintaining operational efficiency.

### 3.1 Defined User Roles

The system distinguishes between nine distinct user roles, each with specific access permissions:

| Role Category                           | Access Scope                 | Primary Functions                                           |
| --------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| **HR Officers (HRO)**                   | Own institution only         | Submit HR requests, track submissions                       |
| **HR Management Officers (HRMO)**       | All institutions             | Approve HR requests (excluding complaints and terminations) |
| **Head of HR and Disciplinary (HHRMD)** | All institutions             | Approve all request types, handle complaints                |
| **Disciplinary Officers (DO)**          | All institutions             | Handle complaints and terminations                          |
| **Planning Officers (PO)**              | All institutions (read-only) | Generate reports and analytics only                         |
| **CSC Secretaries (CSCS)**              | All institutions             | Executive oversight and monitoring                          |
| **Institutional HR Personnel (HRRP)**   | Own institution only         | Monitor institutional activities                            |
| **System Administrators**               | System-wide                  | Manage user accounts and system configuration               |
| **Employees**                           | Own data only                | View personal profile, submit complaints                    |

### 3.2 Separation of Duties

A critical principle embedded in the system is separation of duties, which ensures that no single individual can control all aspects of any critical process. For example, HR officers who submit confirmation requests cannot approve those same requests within their own institution. Approval authority rests with separate officials in higher-level positions, creating a system of checks and balances that prevents potential fraud or errors going undetected.

### 3.3 Data Filtering and Visibility

Access controls are implemented at multiple levels to enforce appropriate data visibility. HR officers and institutional HR personnel can only see employees and requests from their own institutions. Central commission officials with system-wide access can view information across all institutions but cannot modify data outside their authorized functions. Regular access reviews are conducted to ensure permissions remain appropriate as personnel roles change.

------

## 4. Authentication and Password Security

### 4.1 Login Requirements

All users must authenticate before accessing CSMS. Staff users log in using their username or email combined with a password. Civil service employees access the system through a separate employee portal using three-factor credential verification (ZanID number, Payroll Number, and ZSSF Number) to ensure stronger identity verification for personal data access.

### 4.2 Password Requirements

Password security has been significantly enhanced in Version 2.0 with the following implemented controls:

| Requirement            | Standard Users                                    | Administrators                                    |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------- |
| Minimum Length         | 8 characters                                      | 8 characters                                      |
| Character Types        | Uppercase, lowercase, numbers, special characters | Uppercase, lowercase, numbers, special characters |
| Expiration Period      | 90 days                                           | 60 days                                           |
| Grace Period           | 7 days                                            | 7 days                                            |
| Failed Attempt Lockout | 5 attempts                                        | 5 attempts                                        |

Passwords cannot match common patterns such as dictionary words, personal information (names, birth dates, employee IDs), sequential characters (123456, qwerty), or previously used passwords. The system automatically blocks reuse of the last five passwords and prevents selection of obviously weak combinations.

### 4.3 Password Expiration and Warnings

Automated systems now track password expiration and notify users in advance. Warning notifications are sent at 14 days, 7 days, 3 days, and 1 day before expiration. During the 7-day grace period following expiration, users can still log in but must change their password immediately. Accounts are automatically locked after the grace period expires and require administrator intervention to restore access.

### 4.4 Account Lockout Protections

The system implements intelligent lockout mechanisms to prevent unauthorized access attempts:

- **Standard Lockout:** After 5 consecutive failed login attempts, accounts are automatically locked for 30 minutes. Users see a countdown timer and can attempt again when the lockout expires.
- **Security Lockout:** After 11 or more failed attempts, accounts are locked indefinitely and require manual administrator review. This threshold is designed to catch brute force attacks while allowing legitimate users who simply misremember their password to regain access after a brief wait.
- **Administrative Lockout:** Administrators can manually lock accounts when security concerns arise, such as suspected compromise, employee termination, or policy violations.

------

## 5. Session Security and Monitoring

### 5.1 Session Management

Version 2.0 introduces comprehensive session security controls to prevent unauthorized access through stolen or hijacked sessions. Each login creates a unique session token with the following characteristics:

- Sessions automatically expire after 24 hours of continuous use, requiring re-authentication
- Users are automatically logged out after 7 minutes of inactivity
- A warning appears 1 minute before automatic logout
- Concurrent sessions are limited to 3 per user; the oldest session is terminated when the limit is reached

### 5.2 Suspicious Login Detection

The system monitors login activity for indicators of potential compromise and flags suspicious activity for investigation:

| Indicator                                     | Severity | System Response                      |
| --------------------------------------------- | -------- | ------------------------------------ |
| Login from new IP address not used in 30 days | Medium   | Flagged, login allowed               |
| Login from new device type                    | Medium   | Flagged, login allowed               |
| Simultaneous logins from different locations  | High     | Flagged, user notified               |
| Rapid successive logins from different IPs    | Critical | Flagged, user notified, event logged |

Users receive notifications when suspicious activity is detected on their accounts and are encouraged to verify the activity and change their password if unauthorized access is suspected.

### 5.3 Monitoring and Audit Logging

All system activities are logged comprehensively to enable security monitoring, incident investigation, and compliance verification. The system tracks and records login attempts (successful and failed), data access and modifications, request submissions and approvals, user account changes, document uploads and downloads, report generation, password changes, and administrative actions.

Log retention periods vary based on sensitivity: standard logs are retained for minimum 90 days, security-related logs for 1 year, compliance logs for 7 years, and critical incident logs indefinitely. This retention schedule supports both operational security monitoring and any required regulatory or legal investigations.

------

## 6. Acceptable Use Guidelines

### 6.1 Authorized Use

CSMS is provided for legitimate business purposes related to civil service human resource management. Appropriate uses include submitting HR requests for employees within one's authorized scope, viewing employee profiles necessary for job functions, generating reports for planning and analytics purposes, and managing user accounts (for administrators only).

### 6.2 Prohibited Activities

Strict prohibitions protect the system and its data from misuse. The following activities are strictly forbidden:

**Account Misuse:** Sharing login credentials with others, using another person's account, attempting to access accounts without authorization, creating unauthorized user accounts, or circumventing authentication mechanisms.

**Data Misuse:** Accessing data without legitimate business need, disclosing confidential information to unauthorized persons, copying or downloading data for personal use, modifying or deleting data without authorization, or exporting data to unauthorized systems.

**System Misuse:** Attempting unauthorized access to system resources, exploiting security vulnerabilities, installing unauthorized software, introducing malware or viruses, conducting security testing without authorization, degrading system performance intentionally, or bypassing security controls.

**Malicious Activities:** Hacking, denial of service attacks, social engineering, phishing, or credential stuffing attacks are criminal violations that will result in legal prosecution.

### 6.3 Personal Use Limitations

Limited personal use of CSMS is permitted only if it does not interfere with work duties, violate any policy provisions, compromise security, consume significant resources, or involve confidential data. Personal activities should be conducted using personal devices and accounts, never using CSMS infrastructure for personal business.

### 6.4 Data Handling Requirements

Strict requirements govern how CSMS data must be handled:

- CSMS data must never be stored on personal devices without authorization
- Data must never be transmitted via personal email accounts
- Confidential information must not be discussed in public areas or posted on social media
- Printing of confidential documents requires legitimate business need
- Personal information must not be shared with external parties without proper authorization

------

## 7. Compliance and Standards

### 7.1 International Standards

CSMS security implementation aligns with internationally recognized frameworks and standards:

**ISO/IEC 27001:2013** provides the foundation for the Information Security Management System, guiding risk assessment, security control implementation, and continuous improvement processes.

**ISO/IEC 27002:2013** offers detailed guidelines for implementing specific security controls and best practices across the system.

**NIST Cybersecurity Framework** provides a structured approach to identifying, protecting, detecting, responding to, and recovering from cybersecurity threats, covering protections against injection attacks, authentication vulnerabilities, data exposure, access control weaknesses, and other common threats.

### 7.2 National and Local Standards

The system also complies with Tanzania and Zanzibar regulatory requirements:

**Tanzania/Zanzibar Data Protection Regulations** establish requirements for personal data protection, data subject rights, data controller obligations, and restrictions on cross-border data transfers.

**Zanzibar e-Government Standards** define government system security requirements, interoperability standards, and service delivery expectations that CSMS must meet.

------

## 8. Consequences of Non-Compliance

### 8.1 Disciplinary Actions

Violations of security policies result in proportionate responses:

**First Offense (Minor):** Warning and counseling, mandatory security training, and temporary access restriction.

**Repeat or Serious Offense:** Access suspension, formal disciplinary action, termination of employment for staff, contract cancellation for contractors, and potential legal prosecution for criminal violations.

**Immediate Termination Offenses:** The following violations result in immediate termination and possible legal action: deliberate data theft, system sabotage, fraud or embezzlement, selling confidential information, introducing malware, and hacking or unauthorized access.

### 8.2 Reporting Obligations

All users are obligated to report suspected security breaches, policy violations, unauthorized access attempts, lost or stolen credentials, suspicious activities, accidental data disclosure, and system vulnerabilities. Reports should be directed to immediate supervisors, system administrators, or security officers through official channels.

------

## 9. Key Performance Indicators

The effectiveness of the security program is measured against established targets:

| Metric                       | Target          | Measurement Frequency |
| ---------------------------- | --------------- | --------------------- |
| System Availability          | 99.5%           | Monthly               |
| Password Policy Compliance   | 100%            | Quarterly             |
| Security Training Completion | 100%            | Annually              |
| Backup Success Rate          | 100%            | Daily                 |
| Critical Security Incidents  | 0 per month     | Monthly               |
| Audit Log Retention          | Minimum 90 days | Continuous            |

------

## 10. Summary for Management

The CSMS Security Policy represents a mature, comprehensive security framework designed to protect sensitive civil servant information while enabling efficient government operations. Version 2.0 reflects significant investment in automated security controls that reduce reliance on manual processes and provide consistent enforcement of security requirements.

Key achievements in the current implementation include fully automated password management with expiration tracking, comprehensive session security with timeout and concurrent session controls, intelligent suspicious login detection that alerts users to potential account compromise, robust account lockout mechanisms that balance security with usability, and complete audit logging that supports both security monitoring and compliance verification.

The layered security approach ensures that multiple controls protect each aspect of the system, from network perimeter defenses through application-level authentication to database access controls. Regular access reviews, automated monitoring, and clear consequences for policy violations create a security-conscious environment that protects both employee privacy and institutional integrity.

Management support for security awareness training and policy enforcement remains essential to the program's success. All personnel must understand their responsibilities regarding password protection, data handling, and reporting security concerns. The investment in security controls is only effective when users consistently follow established procedures and remain vigilant against potential threats.

------

**Document Classification:** RESTRICTED
 **Approved By:** Civil Service Commission
 **Review Date:** January 1, 2027
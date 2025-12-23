# Civil Service Management System (CSMS) - User Roles and Access Guide

## System Links

- **Main System Link**: [https://csms.zanajira.go.tz](https://csms.zanajira.go.tz)
- **Employee Login (for complaints)**: [https://csms.zanajira.go.tz/employee-login](https://csms.zanajira.go.tz/employee-login)

---

## Overview

The Civil Service Management System (CSMS) is a comprehensive platform designed to streamline human resource management processes across public institutions in Zanzibar. The system provides role-based access control, ensuring that each user category has appropriate permissions aligned with their responsibilities. This document outlines the various user roles, their permissions, system access levels, and login credentials for authorized personnel.

The CSMS platform serves as a centralized hub for managing employee lifecycle processes including confirmation, promotion, leave without pay, change of cadre, retirement, resignation, disciplinary actions, and service extensions. Additionally, the system facilitates complaint management and provides strategic planning capabilities through comprehensive reporting and analytics modules. Each user role is carefully designed to maintain proper segregation of duties while ensuring efficient workflow management across different levels of the organizational hierarchy.

Understanding these user roles is essential for proper system utilization, effective workflow management, and maintaining data security. The following sections provide detailed descriptions of each user role, their specific responsibilities, access privileges, and the corresponding login credentials for testing and operational purposes.

---

## User Roles and Permissions

### 1. HR Officer (HRO)

The HR Officer role is designed for human resource personnel working within specific institutions other than the Civil Service Commission (CSC). This role serves as the primary initiator for HR-related requests within their respective institutions, acting as a bridge between employees and the central HR management functions at CSC.

**Core Responsibilities:**

The HR Officer is responsible for submitting requests on behalf of employees across all system modules with the exception of the Complaints module. This includes processing requests for confirmation of appointment, promotion, leave without pay, change of cadre, retirement, and resignation. The HRO plays a critical role in ensuring that all employee requests are properly documented and submitted according to established procedures before they reach the Civil Service Commission for further processing.

**Workflow and Interaction with CSC:**

Requests submitted by HR Officers from different institutions are directed to the Civil Service Commission for review. The CSC reviewers have the authority to approve, reject, or forward requests back to the HR Officer for rectification if any deficiencies are identified. This bidirectional workflow ensures that incomplete or incorrect applications are addressed promptly and that only properly completed requests proceed through the approval pipeline.

**Data Visibility:**

The HR Officer has restricted access limited to information related to their specific institution only. This means they cannot view, access, or retrieve data from other institutions within the system. This restriction maintains data privacy and ensures that each institution's HR information remains confidential and accessible only to authorized personnel within that institution.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | kmnyonge |
| Password | password123 |

---

### 2. Head of HR Management (HHRMD)

The Head of HR Management represents a senior internal position within the Civil Service Commission. This role carries significant authority over HR processes and serves as a key decision-maker in the employee lifecycle management workflow. The HHRMD operates as an internal CSC user with comprehensive oversight capabilities.

**Core Responsibilities:**

The HHRMD possesses approval and rejection authority for a wide range of HR requests including Confirmation, Promotion, LWOP (Leave Without Pay), Change of Cadre, Retirement, and Resignation. Beyond these standard HR processes, the HHRMD also has authority over disciplinary matters including Approving or rejecting Complaints, Termination, and Dismissal requests. Additionally, this role is responsible for approving Service Extension requests for eligible employees. The HHRMD also maintains access to system reports and notifications, enabling them to monitor ongoing activities and track workflow status across various modules.

**Data Visibility:**

Unlike the HR Officer role which is institution-restricted, the HHRMD as an internal CSC user has the privilege to view all data from different institutions. This comprehensive access enables the HHRMD to exercise oversight across the entire civil service HR landscape, identify trends, ensure consistency in decision-making, and maintain a holistic view of HR activities across all public institutions under CSC jurisdiction.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | skhamis |
| Password | password123 |

---

### 3. Human Resource Management Officer (HRMO)

The Human Resource Management Officer serves as an internal user within the Civil Service Commission with specific approval authority over core HR processes. This role complements the HHRMD by handling day-to-day HR request processing while maintaining the same level of data access within their approved domains.

**Core Responsibilities:**

The HRMO has approval and rejection authority for Confirmation, Promotion, LWOP (Leave Without Pay), Change of Cadre, Retirement, Resignation, and Service Extension requests. These responsibilities align with standard employee lifecycle management processes, enabling the HRMO to process routine HR matters efficiently. The role also includes access to system reports and notifications, allowing the HRMO to stay informed about pending requests, completed transactions, and system-wide activities relevant to their functions.

**Data Visibility:**

The HRMO, being an internal CSC user, has access to view all data from different institutions. However, this access is specifically scoped to modules that the HRMO is authorized to approve. This means the HRMO can access and process data across institutions, but only within the specific HR modules where they have been granted approval authority. This approach ensures proper segregation of duties while maintaining operational efficiency.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | fiddi |
| Password | password123 |

---

### 4. Disciplinary Officer (DO)

The Disciplinary Officer role focuses specifically on handling employee conduct issues, complaints, and severe disciplinary actions. This specialized role ensures that disciplinary matters receive dedicated attention from officers with appropriate expertise in handling such sensitive HR functions.

**Core Responsibilities:**

The Disciplinary Officer has approval and rejection authority for Complaints, Termination, and Dismissal requests. These responsibilities cover the full spectrum of disciplinary actions from initial complaint handling through to the most severe employment actions. The DO also maintains access to system reports and notifications, enabling effective tracking of disciplinary cases, monitoring of pending actions, and generation of relevant analytics for reporting purposes.

**Data Visibility:**

Similar to other internal CSC roles, the Disciplinary Officer has access to view all data from different institutions, but this access is specifically scoped to matters related to disciplinary functions. This means the DO can access complaint data, termination cases, and dismissal requests across all institutions while maintaining focus on their area of expertise without access to unrelated HR modules.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | mussi |
| Password | password123 |

---

### 5. Employee (EMP)

The Employee role provides individual civil servants with direct access to the system for submitting complaints and viewing their personal information. This role represents the largest user base of the CSMS system and serves as the primary entry point for employee-initiated interactions with the HR management system.

**Core Responsibilities:**

Employees have the ability to submit complaints through the system, which will be handled by either the HHRMD or DO depending on who attends to the case first. This parallel processing capability ensures that employee complaints receive timely attention without creating bottlenecks in the complaint resolution workflow. Employees also have read-only access to their own profile information, allowing them to verify and review their personal data maintained in the system. Additionally, employees can view complaints that they themselves have submitted, enabling them to track the status of their submitted issues.

**Data Visibility and Restrictions:**

Employees operate under strict data isolation rules. They are not permitted to view other employees' data under any circumstances. This restriction ensures complete privacy of employee information and prevents unauthorized access to sensitive personal or employment data. Each employee can only see their own information and the complaints they personally submitted.

**Login Requirements:**

To successfully login as an employee, users must correctly enter their ZanID number, payroll number, and ZSSF (Zanzibar Social Security Fund) number for the specific employee. This multi-factor authentication approach ensures that only legitimate employees can access the system and prevents unauthorized access to employee information.

**Login Portal:**

Employees can access the system through the dedicated employee login portal at: [https://csms.zanajira.go.tz/employee-login](https://csms.zanajira.go.tz/employee-login)

---

### 6. Planning Officer (PO)

The Planning Officer role is an internal position within the Civil Service Commission focused on strategic workforce planning and data analysis. This role transforms raw HR data into actionable insights that support evidence-based decision-making at the leadership level.

**Core Responsibilities:**

The Planning Officer is responsible for monitoring performance metrics, tracking workforce trends, and analyzing strategic HR data across the civil service. The role includes viewing system-generated reports across all institutions, accessing dashboards and analytical reports, generating and analyzing aggregated data to support strategic planning initiatives, and exporting or downloading reports and visual analytics for presentation purposes or external use. These capabilities enable the Planning Officer to provide valuable analytical support to CSC leadership and other stakeholders.

**Data Visibility:**

The Planning Officer has read-only access to reports across all CSMS modules but does not have access to dashboards. This distinction ensures that the Planning Officer can access the detailed data and analytics needed for planning purposes while maintaining appropriate separation from operational dashboards that may contain sensitive or action-oriented information. The read-only access prevents any modification of data or approval workflows, maintaining the integrity of the planning function as an analytical rather than operational role.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | mishak |
| Password | password123 |

---

### 7. Civil Service Commission Secretary (CSCS)

The Civil Service Commission Secretary represents the highest authority within the Commission and has comprehensive oversight capabilities across the entire CSMS system. This role provides executive-level visibility into all HR activities and ensures accountability at all levels of the organization.

**Core Responsibilities:**

The CSC Secretary can view all actions performed by the Head of HR Management (HHRMD), HR Management Officer (HRMO), and Disciplinary Officer (DO), including the current status of each action (such as Pending, Approved, or Rejected). This comprehensive oversight capability enables the Secretary to monitor the effectiveness of the approval workflow, identify bottlenecks, and ensure that all actions are processed according to established policies and timelines. Additionally, the Secretary can access employee profiles across all public institutions, view and navigate through a dashboard displaying task statuses, and access a left-side navigation menu showing the status of tasks being carried out by HHRMDs, HRMOs, and DOs in each module. The Secretary also has authority to view and download institutional and system-wide reports from all modules.

**Data Visibility:**

The CSC Secretary has the most comprehensive access level in the system, encompassing all data across all institutions and modules. This unrestricted access supports the Secretary's role in maintaining overall accountability and oversight of civil service HR management throughout Zanzibar's public institutions.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | zhaji |
| Password | password123 |

---

### 8. Human Resource Responsible Personnel (HRRP)

The Human Resource Responsible Personnel role serves as a supervisory HR figure within specific institutions, such as Directors of Administration or HR Managers. This role provides institutional-level oversight and supervision of HR functions, bridging the gap between institutional HR operations and central CSC oversight.

**Core Responsibilities:**

The HRRP is responsible for supervising HR Officers within their institution. In the CSMS, this role includes viewing a dashboard summarizing HR activities specific to their institution, accessing employee profiles within their institution only, viewing and downloading reports related to their institution, and tracking the status of requests submitted by their institution's HR Officer across various modules including Confirmation, Promotion, LWOP, and other HR processes. This role enables institutional leadership to maintain visibility and control over HR activities within their domain while remaining connected to the broader civil service HR management structure.

**Data Visibility:**

The HRRP has institution-restricted access, meaning they can only view data, profiles, and reports related to their specific institution. This restriction ensures that sensitive institutional data remains protected while still providing sufficient visibility for effective supervision and management of HR functions within the institution. The HRRP cannot access data from other institutions, maintaining proper data isolation.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | kmhaji |
| Password | password123 |

---

### 9. Administrator (Admin)

The Administrator role provides technical and operational management capabilities for the CSMS system. This role is critical for maintaining system health, user management, and overall operational efficiency of the platform.

**Core Responsibilities:**

The Administrator is responsible for overseeing all technical and operational aspects of the system, including user accounts, access levels, module configurations, system logs, and overall system health. These responsibilities ensure that all users can perform their functions securely and efficiently. The Administrator has specific authority for User Management including creating, updating, and deactivating user accounts, resetting user passwords, and searching for users based on their names, ZanID, or institutions. Additionally, the Administrator handles Institution Creation, including adding new institutions to the system such as Wakala wa Vipimo Zanzibar, Wizara ya Elimu, Wizara ya Afya, Wizara ya Habari, Wizara ya Fedha, and others. After creating institutions, the Administrator creates the corresponding HR Officers who will manage HR requests from those institutions.

**System Configuration Authority:**

The Administrator has the authority to configure module settings, manage access controls, and maintain the overall system configuration. This includes setting up new workflows, defining approval hierarchies, and ensuring that the system remains aligned with evolving organizational requirements. The Administrator also monitors system logs and health metrics to identify and address potential issues proactively.

**Login Credentials:**

| Field | Value |
|-------|-------|
| Username | akassim |
| Password | password123 |

---

## System Access Summary

| Role | Username | Primary Function | Data Scope |
|------|----------|------------------|------------|
| HR Officer (HRO) | kmnyonge | Submit HR requests | Institution only |
| Head of HR Management (HHRMD) | skhamis | Approve/Reject HR & Disciplinary | All institutions |
| HR Management Officer (HRMO) | fiddi | Approve/Reject HR requests | All institutions (specific modules) |
| Disciplinary Officer (DO) | mussi | Handle Complaints/Terminations | All institutions (disciplinary) |
| Employee (EMP) | N/A | Submit complaints, view profile | Own data only |
| Planning Officer (PO) | mishak | View reports, analyze data | All institutions (read-only) |
| CSC Secretary (CSCS) | zhaji | Executive oversight | All institutions |
| HR Responsible Personnel (HRRP) | kmhaji | Institutional supervision | Institution only |
| Administrator | akassim | System management | All system data |

---

## Important Notes

### Password Security

All login credentials provided in this document are for testing and initial access purposes. In a production environment, it is strongly recommended that all users change their passwords upon first login and follow established password policies including regular password rotation and use of strong, unique passwords.

### Employee Login Requirements

Employees seeking to submit complaints must ensure they have accurate identification information including their ZanID, payroll number, and ZSSF number. This information is required for proper authentication and to ensure that complaints are correctly associated with the submitting employee.

### Institutional Setup

For new institutions to be added to the system (such as Wakala wa Vipimo Zanzibar, Wizara ya Elimu, Wizara ya Afya, Wizara ya Habari, or Wizara ya Fedha), the Administrator must first create the institution through the admin interface. Once the institution is created, the Administrator can then create the corresponding HR Officer user account that will manage HR requests for that institution.

### Workflow Escalation

HR requests from external institution HROs that are submitted to CSC may be rejected, confirmed, or forwarded back to the HR Officer for rectification depending on the completeness and accuracy of the submitted documentation. This ensures quality control and maintains the integrity of HR processes across all institutions.

---

*Document Version: 1.0*
*Last Updated: December 2025*
*System: Civil Service Management System (CSMS)*
*URL: https://csms.zanajira.go.tz*

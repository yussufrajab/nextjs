# Concept Note: Civil Service Management System (CSMS)

**Project Title:** Civil Service Management System (CSMS)
**Project Code:** CSMS-2025
**Implementing Agency:** Civil Service Commission (CSC), Revolutionary Government of Zanzibar
**Document Version:** 1.0
**Date:** January 1, 2025
**Document Status:** Final

---

## Executive Summary

The Civil Service Management System (CSMS) is a comprehensive digital platform designed to modernize and automate human resource management processes for Zanzibar's civil service. The system addresses the critical need to transition from manual, paper-based HR operations to an integrated digital solution that serves over 50,000 civil servants across 41 government institutions.

**Project Duration:** 31 weeks (January - August 2025)
**Team Size:** 9 Full-Time Equivalents (FTE)
**Total Investment:** [To be determined by procurement]
**Expected Benefits:** 70% reduction in HR processing time, improved transparency, enhanced decision-making capabilities, comprehensive audit trails, and seamless integration with existing government systems.

The CSMS platform leverages modern web technologies (Next.js 14, PostgreSQL, Prisma ORM) to deliver a secure, scalable, and user-friendly solution that manages the complete employee lifecycle from hiring through retirement.

---

## 1. Project Background & Context

### 1.1 Organizational Context

The Revolutionary Government of Zanzibar's Civil Service Commission (CSC) is responsible for managing the affairs of over 50,000 civil servants distributed across 41 government institutions. The CSC oversees critical HR functions including employee confirmations, promotions, transfers, leave management, retirements, and disciplinary actions.

### 1.2 Current Situation

Prior to the CSMS initiative, the CSC relied heavily on manual, paper-based processes for all HR operations:

- **Manual Processing:** All HR requests (confirmations, promotions, leave applications, etc.) were submitted and processed using physical documents
- **Multiple Handoffs:** Each request required physical transfer between multiple approval levels (HRO → HHRMD → HRMO → DO → CSCS)
- **Limited Visibility:** Employees and institutions had no real-time visibility into request status
- **Data Silos:** Employee records and HR data were fragmented across different systems and filing cabinets
- **Slow Decision-Making:** Processing times for HR requests ranged from weeks to months
- **Compliance Challenges:** Difficulty in maintaining audit trails and ensuring compliance with civil service regulations
- **HRIMS Integration Gap:** The existing HR Information Management System (HRIMS) lacked modern workflow capabilities and user-friendly interfaces

### 1.3 Strategic Alignment

The CSMS project aligns with:

- Zanzibar's Digital Transformation Strategy
- E-Government initiatives for improved service delivery
- Public Service Reform Program objectives
- Transparency and accountability goals for civil service management

---

## 2. Problem Statement

### 2.1 Core Problems

The CSC faces several critical challenges with the current manual HR management approach:

1. **Inefficiency:** HR request processing takes 4-8 weeks on average, with some cases extending to months
2. **Lack of Transparency:** Employees cannot track their request status, leading to frequent inquiries and frustration
3. **Data Integrity Issues:** Manual data entry leads to errors, inconsistencies, and data quality problems
4. **Compliance Risks:** Difficult to ensure adherence to civil service regulations and probation period requirements (12-18 months)
5. **Limited Reporting:** Generating management reports requires manual data compilation from multiple sources
6. **Scalability Constraints:** Manual processes cannot scale to handle increasing civil service population
7. **Audit Trail Gaps:** Insufficient documentation of decision-making processes and approval workflows
8. **Resource Intensive:** Significant staff time devoted to manual document handling and data entry
9. **Communication Delays:** No automated notification system for request status updates
10. **Complaint Management:** No structured system for handling employee grievances and complaints

### 2.2 Impact Analysis

These problems result in:

- **Operational Costs:** High administrative overhead for manual processing
- **Service Delivery:** Delayed HR actions affecting employee satisfaction and institutional operations
- **Decision Quality:** Limited data-driven insights for workforce planning and policy-making
- **Risk Exposure:** Compliance violations and legal challenges due to process inconsistencies
- **Reputation:** Negative perception of civil service efficiency and responsiveness

---

## 3. Proposed Solution

### 3.1 Solution Overview

The Civil Service Management System (CSMS) is a comprehensive, web-based platform that digitizes and automates the entire spectrum of civil service HR operations. The system provides:

- **Digital Workflow Engine:** Automated routing and approval workflows for all HR request types
- **Role-Based Access Control:** Secure access for 9 distinct user roles with appropriate permissions
- **Employee Self-Service Portal:** Employees can submit requests, track status, and access their records
- **Integrated Document Management:** Digital storage and retrieval of all HR-related documents
- **Real-Time Notifications:** Automated alerts for request submissions, approvals, and status changes
- **Comprehensive Reporting:** Pre-built and custom reports for management decision-making
- **HRIMS Integration:** Seamless synchronization with existing HR Information Management System
- **Audit Trail:** Complete logging of all system activities for compliance and accountability
- **AI-Powered Features:** Intelligent complaint rewriting and document processing capabilities

### 3.2 Technology Architecture

**Platform:** Full-stack Next.js 14 application
**Frontend:** React-based UI with Tailwind CSS and Radix UI components
**Backend:** Next.js API routes providing RESTful services
**Database:** PostgreSQL with Prisma ORM for data management
**File Storage:** MinIO S3-compatible object storage for document management
**Background Processing:** BullMQ with Redis for asynchronous tasks and HRIMS synchronization
**AI Integration:** Google Genkit for intelligent features
**Security:** JWT authentication, bcrypt password hashing, CSRF protection, comprehensive security headers
**Deployment:** Production environment at https://csms.zanajira.go.tz

### 3.3 Key Features

1. **Request Management:** 8 HR request types with automated workflows
   - Employee Confirmation
   - Promotion Requests
   - Leave Without Pay (LWOP)
   - Cadre Change
   - Retirement Processing
   - Resignation Processing
   - Service Extension
   - Termination/Dismissal

2. **Complaint Management System:** Digital grievance handling with AI-assisted complaint rewriting

3. **User Role Management:** 9 distinct roles with granular permissions
   - Human Resource Officer (HRO) - Institution level
   - Head of Human Resource Management Division (HHRMD) - CSC
   - Human Resource Management Officer (HRMO) - CSC
   - Director of Operations (DO) - CSC
   - Principal Officer (PO) - Executive level
   - Chief Secretary Civil Service (CSCS) - Executive level
   - Head of Research and Planning (HRRP) - Planning
   - System Administrator (ADMIN) - Technical
   - Employee (EMPLOYEE) - Self-service

4. **Advanced Security Features:**
   - Password expiration policies (Admin: 60 days, Users: 90 days)
   - Account lockout after failed login attempts (5 attempts = 30-min lockout)
   - Session management (max 3 concurrent sessions, 24-hour expiration)
   - Inactivity timeout (7 minutes)
   - Suspicious login detection
   - Comprehensive audit logging

5. **Reporting & Analytics:** 10+ standard reports for workforce management and decision-making

6. **HRIMS Integration:** Background synchronization with existing HRIMS database

---

## 4. Objectives & Expected Benefits

### 4.1 Primary Objectives

1. **Automate HR Workflows:** Digitize and streamline all 8 HR request types with automated approval routing
2. **Improve Transparency:** Provide real-time visibility into request status for all stakeholders
3. **Enhance Data Quality:** Ensure data integrity through validation and centralized database management
4. **Ensure Compliance:** Enforce civil service regulations and maintain comprehensive audit trails
5. **Improve Service Delivery:** Reduce HR request processing time by 70%
6. **Enable Data-Driven Decisions:** Provide management with timely, accurate reports and analytics
7. **Integrate Systems:** Seamlessly connect with existing HRIMS for data consistency
8. **Secure Information:** Protect sensitive employee data with enterprise-grade security measures

### 4.2 Expected Benefits

#### 4.2.1 Quantitative Benefits

- **70% reduction** in HR request processing time (from 4-8 weeks to 1-2 weeks)
- **90% reduction** in manual data entry errors
- **100% digital** document storage eliminating physical filing requirements
- **95%+ user satisfaction** rate based on UAT results
- **<5 seconds** average page load time for optimal user experience
- **<1.5 seconds** login response time
- **99.5% system availability** ensuring continuous service
- **50,000+ employees** supported across 41 institutions
- **244 test scenarios** validated during User Acceptance Testing

#### 4.2.2 Qualitative Benefits

- **Improved Transparency:** Employees can track request status in real-time
- **Enhanced Accountability:** Complete audit trails for all HR actions
- **Better Decision-Making:** Management access to real-time workforce analytics
- **Increased Employee Satisfaction:** Faster processing and self-service capabilities
- **Reduced Operational Costs:** Lower administrative overhead and paper consumption
- **Compliance Assurance:** Automated enforcement of civil service regulations
- **Risk Mitigation:** Reduced errors and improved data security
- **Scalability:** Platform can accommodate civil service growth
- **Knowledge Management:** Centralized repository of HR policies and procedures
- **Professional Image:** Modern digital platform enhancing CSC reputation

---

## 5. Scope Overview

### 5.1 In-Scope Components

#### 5.1.1 Functional Scope

**Core HR Request Types (8):**

1. Employee Confirmation Requests
2. Promotion Requests
3. Leave Without Pay (LWOP) Requests
4. Cadre Change Requests
5. Retirement Processing
6. Resignation Processing
7. Service Extension Requests
8. Termination/Dismissal Processing

**Supporting Functions:**

- User authentication and authorization
- Employee profile management
- Institution management
- Complaint/grievance management
- Document upload, storage, and retrieval
- Notification system (email and in-app)
- Reporting and analytics (10+ reports)
- Audit logging and tracking
- HRIMS integration and synchronization
- Certificate generation
- System administration

#### 5.1.2 User Roles (9)

1. **HRO (Human Resource Officer):** 41 officers (one per institution) - Submit and track requests
2. **HHRMD (Head of HR Management Division):** Review and process incoming requests
3. **HRMO (Human Resource Management Officer):** Technical review and recommendation
4. **DO (Director of Operations):** Operational approval authority
5. **PO (Principal Officer):** Executive review for high-level decisions
6. **CSCS (Chief Secretary Civil Service):** Final approval authority for critical decisions
7. **HRRP (Head of Research and Planning):** Access to analytics and planning reports
8. **ADMIN (System Administrator):** System configuration and user management
9. **EMPLOYEE:** Self-service portal for request submission and tracking

#### 5.1.3 Coverage

- **Institutions:** 41 government institutions across Zanzibar
- **Employees:** 50,000+ civil servants
- **Concurrent Users:** Support for 100+ simultaneous users
- **Data Volume:** Scalable to handle growing employee and request records

### 5.2 Out-of-Scope Components

The following are explicitly excluded from the current project scope:

- **Mobile Applications:** Native iOS/Android apps (web interface is responsive)
- **Payroll Processing:** Salary computation and disbursement (managed by separate system)
- **Recruitment System:** External hiring and job posting (future enhancement)
- **Training Management:** Employee training and development tracking
- **Performance Appraisal:** Annual performance evaluation system
- **Leave Management:** Regular leave (annual, sick) tracking beyond LWOP
- **Biometric Integration:** Fingerprint or facial recognition systems
- **SMS Notifications:** Mobile SMS alerts (email and in-app notifications only)
- **Third-Party System Integration:** Beyond HRIMS (e.g., pension systems, banks)
- **Offline Mode:** System requires internet connectivity

---

## 6. High-Level Requirements

### 6.1 Functional Requirements

1. **User Management:**
   - User registration and authentication
   - Role-based access control (9 roles)
   - Password management with security policies
   - Session management and security

2. **HR Request Processing:**
   - Digital request submission with document upload
   - Automated workflow routing based on request type
   - Multi-level approval process
   - Request status tracking and history
   - Rejection with comments and resubmission capability
   - Automated notifications at each stage

3. **Employee Information Management:**
   - Centralized employee database
   - Profile viewing and updating
   - Employment history tracking
   - Document repository per employee

4. **Institution Management:**
   - 41 institution profiles
   - Institutional hierarchy management
   - HRO assignment per institution

5. **Complaint Management:**
   - Digital complaint submission
   - AI-powered complaint rewriting
   - Complaint routing and resolution tracking

6. **Reporting:**
   - Pre-defined management reports
   - Custom report generation
   - Export capabilities (PDF, Excel)
   - Real-time dashboards

7. **Integration:**
   - HRIMS data synchronization
   - Background job processing
   - API for future integrations

### 6.2 Non-Functional Requirements

1. **Performance:**
   - Page load time: <5 seconds
   - Login response: <1.5 seconds
   - Report generation: <30 seconds for 10,000 records
   - System availability: 99.5% uptime

2. **Security:**
   - Data encryption in transit (HTTPS/TLS)
   - Password hashing (bcrypt with 10-12 rounds)
   - JWT-based authentication
   - CSRF protection
   - Security headers (CSP, HSTS, X-Frame-Options, etc.)
   - Comprehensive audit logging
   - Role-based authorization
   - Account lockout policies
   - Session timeout

3. **Scalability:**
   - Support 50,000+ employees
   - Handle 100+ concurrent users
   - Accommodate growing data volumes
   - Horizontal scaling capability

4. **Usability:**
   - Intuitive user interface
   - Responsive design (desktop, tablet, mobile browsers)
   - Bilingual support (Swahili/English) - partial implementation
   - Accessibility considerations
   - Context-sensitive help

5. **Reliability:**
   - Data backup and recovery
   - Error handling and logging
   - Database transaction integrity

6. **Maintainability:**
   - Well-documented codebase
   - Modular architecture
   - Configuration management
   - Version control

---

## 7. Success Criteria

The CSMS project will be considered successful when the following criteria are met:

### 7.1 Technical Success Criteria

1. **Functional Completeness:**
   - All 8 HR request types fully operational
   - All 9 user roles implemented with appropriate permissions
   - HRIMS integration functioning with background synchronization
   - 95%+ UAT pass rate achieved (244 test scenarios)

2. **Performance Benchmarks:**
   - Login response time <1.5 seconds
   - Dashboard load time <5 seconds
   - Report generation <30 seconds for large datasets
   - System uptime ≥99.5%

3. **Security Validation:**
   - All 72 security test scenarios passed
   - Penetration testing completed with no critical vulnerabilities
   - Audit logging capturing all required events
   - Password policies enforced across all user types

4. **Quality Assurance:**
   - Zero critical bugs in production
   - All UAT test cases passed (244 scenarios across 21 test cases)
   - Performance test benchmarks met
   - Security assessment completed

### 7.2 User Acceptance Criteria

1. **User Satisfaction:**
   - 90%+ user satisfaction rating from training participants
   - Positive feedback from all 9 user role groups
   - Successful completion of role-specific training (2-4 hours per role)

2. **Operational Adoption:**
   - All 41 institutions onboarded
   - All HROs trained and actively using the system
   - CSC officers (HHRMD, HRMO, DO) processing requests digitally
   - Employee self-service portal utilized by end users

### 7.3 Business Impact Criteria

1. **Process Improvement:**
   - 70% reduction in HR request processing time
   - Real-time request status visibility for all stakeholders
   - Reduction in manual data entry errors by 90%

2. **Compliance:**
   - Complete audit trails for all HR transactions
   - Adherence to civil service regulations enforced by system
   - Probation period requirements (12-18 months) automatically tracked

3. **Integration:**
   - Successful daily synchronization with HRIMS
   - Data consistency maintained between CSMS and HRIMS
   - No data integrity issues post-integration

### 7.4 Project Delivery Criteria

1. **Timeline:**
   - Project completed within 31-week schedule
   - All milestones met with acceptable variance (±1 week)

2. **Documentation:**
   - All technical documentation completed (SRS, SDD, User Manual, etc.)
   - All QA documentation delivered (UAT reports, test results, review reports)
   - Training materials finalized and distributed
   - Operations and maintenance manuals provided

3. **Stakeholder Approval:**
   - UAT sign-off from CSC
   - Production deployment approval
   - Training completion certification
   - Final project acceptance by steering committee

---

## 8. Stakeholders

### 8.1 Primary Stakeholders

| Stakeholder                                | Role              | Interest/Involvement                                           |
| ------------------------------------------ | ----------------- | -------------------------------------------------------------- |
| **Civil Service Commission (CSC)**         | Project Owner     | Oversees project, provides requirements, approves deliverables |
| **Chief Secretary Civil Service (CSCS)**   | Executive Sponsor | Strategic direction, final approval authority                  |
| **Director of Operations (DO)**            | Operations Lead   | Operational approval, business process validation              |
| **Head of HR Management Division (HHRMD)** | Functional Lead   | HR process expertise, user requirements                        |
| **41 Government Institutions**             | End Users         | Submit HR requests, benefit from system                        |
| **50,000+ Civil Servants**                 | End Beneficiaries | Self-service capabilities, request tracking                    |

### 8.2 Secondary Stakeholders

| Stakeholder                   | Role                | Interest/Involvement                               |
| ----------------------------- | ------------------- | -------------------------------------------------- |
| **IT Department**             | Technical Support   | System administration, maintenance, infrastructure |
| **HRIMS Team**                | Integration Partner | Data synchronization, technical coordination       |
| **Project Management Office** | Governance          | Project oversight, risk management                 |
| **Quality Assurance Team**    | QA Validators       | Testing, quality validation, UAT coordination      |
| **Training Coordinators**     | Change Management   | User training, adoption support                    |

### 8.3 External Stakeholders

| Stakeholder                  | Role             | Interest/Involvement                            |
| ---------------------------- | ---------------- | ----------------------------------------------- |
| **E-Government Authority**   | Compliance       | E-GAZ QA standards, compliance verification     |
| **Ministry of Finance**      | Budget Authority | Funding approval, financial oversight           |
| **Auditor General's Office** | Audit Authority  | Audit trail requirements, compliance validation |

---

## 9. Initial Budget & Timeline Estimates

### 9.1 Project Timeline

**Total Duration:** 31 weeks (January 1, 2025 - August 5, 2025)

#### Phase Breakdown:

| Phase                            | Duration | Period                | Key Deliverables                                                    |
| -------------------------------- | -------- | --------------------- | ------------------------------------------------------------------- |
| **Phase 1: Inception**           | 2 weeks  | Jan 1-14, 2025        | Project charter, stakeholder analysis, initial requirements         |
| **Phase 2: Planning & Design**   | 4 weeks  | Jan 15 - Feb 11, 2025 | SRS, SDD, architecture, database design, UI/UX mockups              |
| **Phase 3: Development**         | 12 weeks | Feb 12 - May 6, 2025  | Core system development, HRIMS integration, features implementation |
| **Phase 4: Testing**             | 4 weeks  | May 7 - Jun 3, 2025   | Unit testing, integration testing, factory testing                  |
| **Phase 5: UAT**                 | 3 weeks  | Jun 4-24, 2025        | User acceptance testing, bug fixes, refinements                     |
| **Phase 6: Deployment**          | 2 weeks  | Jun 25 - Jul 8, 2025  | Production deployment, data migration, go-live support              |
| **Phase 7: Post-Launch Support** | 4 weeks  | Jul 9 - Aug 5, 2025   | Hypercare, issue resolution, optimization, stabilization            |

### 9.2 Team Composition

**Total Team Size:** 9 Full-Time Equivalents (FTE)

| Role                       | FTE | Responsibility                                                     |
| -------------------------- | --- | ------------------------------------------------------------------ |
| **Project Manager**        | 1   | Planning, coordination, risk management, stakeholder communication |
| **Business Analyst**       | 1   | Requirements gathering, process mapping, UAT coordination          |
| **Full-Stack Developers**  | 3   | Next.js development, API implementation, UI/UX implementation      |
| **Database Administrator** | 1   | PostgreSQL management, Prisma schema, optimization, backups        |
| **QA Engineers**           | 2   | Test planning, UAT execution, quality assurance, defect tracking   |
| **DevOps Engineer**        | 1   | Deployment, infrastructure, monitoring, CI/CD, security            |

### 9.3 Budget Estimate

**Note:** Detailed budget to be finalized during procurement process. Key cost components include:

1. **Human Resources:**
   - Team salaries and benefits (9 FTE × 31 weeks)
   - Training costs for end users

2. **Technology Infrastructure:**
   - Production server infrastructure
   - Database server (PostgreSQL)
   - Object storage (MinIO)
   - SSL certificates
   - Domain and hosting

3. **Software Licenses:**
   - Development tools and IDEs
   - Testing tools
   - Monitoring and analytics tools

4. **Integration Costs:**
   - HRIMS integration development
   - API development and testing

5. **Training & Change Management:**
   - User training sessions (41 institutions)
   - Training materials development
   - Change management activities

6. **Contingency:**
   - 10-15% contingency for risks and unforeseen requirements

### 9.4 Key Milestones

| Milestone                    | Target Date  | Deliverable                                    |
| ---------------------------- | ------------ | ---------------------------------------------- |
| M1: Project Kickoff          | Jan 1, 2025  | Project charter, team mobilization             |
| M2: Requirements Signed-Off  | Feb 11, 2025 | Approved SRS document                          |
| M3: Design Approved          | Feb 11, 2025 | Approved SDD, architecture, database design    |
| M4: Development Complete     | May 6, 2025  | All features implemented, code complete        |
| M5: Factory Testing Complete | Jun 3, 2025  | Factory test results, defects resolved         |
| M6: UAT Sign-Off             | Jun 24, 2025 | UAT report, user acceptance                    |
| M7: Production Go-Live       | Jul 8, 2025  | System live in production                      |
| M8: Project Closure          | Aug 5, 2025  | Final documentation, lessons learned, handover |

---

## 10. Risks & Assumptions

### 10.1 Key Risks

1. **Integration Complexity:** HRIMS integration may encounter technical challenges (Mitigation: Early integration testing, fallback plans)
2. **User Adoption:** Resistance to change from manual to digital processes (Mitigation: Comprehensive training, change management)
3. **Data Quality:** Existing HRIMS data may have quality issues (Mitigation: Data cleansing, validation rules)
4. **Scope Creep:** Additional requirements emerging during development (Mitigation: Change control process, prioritization)
5. **Resource Availability:** Team members or stakeholders may have competing priorities (Mitigation: Resource planning, escalation protocols)

_(Full risk register maintained separately in Risk_Register.md with 60 identified risks)_

### 10.2 Key Assumptions

1. **Infrastructure Availability:** Production servers and infrastructure will be provisioned on time
2. **HRIMS Access:** Technical access to HRIMS database and APIs will be granted
3. **Stakeholder Availability:** Key stakeholders will be available for requirements validation and UAT
4. **Data Migration:** Existing employee data from HRIMS can be migrated successfully
5. **Internet Connectivity:** All 41 institutions have reliable internet access
6. **Browser Compatibility:** Users have access to modern web browsers (Chrome, Firefox, Edge)

---

## 11. Next Steps

### 11.1 Immediate Actions

1. **Secure Budget Approval:** Finalize budget and obtain financial authorization
2. **Mobilize Project Team:** Recruit and onboard 9 FTE team members
3. **Establish Governance:** Set up steering committee and project governance structure
4. **Initiate Planning Phase:** Begin detailed requirements gathering
5. **Stakeholder Engagement:** Conduct kickoff meetings with all 41 institutions

### 11.2 Critical Success Factors

1. **Executive Sponsorship:** Strong support from CSCS and CSC leadership
2. **User Engagement:** Active participation from all stakeholder groups
3. **Technical Expertise:** Skilled team with Next.js, PostgreSQL, and integration experience
4. **Change Management:** Effective training and communication strategy
5. **Quality Focus:** Rigorous testing and QA throughout project lifecycle
6. **Risk Management:** Proactive identification and mitigation of risks

---

## 12. Approval & Sign-Off

### 12.1 Document Review

| Reviewer | Title                                  | Date             | Signature        |
| -------- | -------------------------------------- | ---------------- | ---------------- |
| [Name]   | Chief Secretary Civil Service (CSCS)   | \***\*\_\_\*\*** | \***\*\_\_\*\*** |
| [Name]   | Director of Operations (DO)            | \***\*\_\_\*\*** | \***\*\_\_\*\*** |
| [Name]   | Head of HR Management Division (HHRMD) | \***\*\_\_\*\*** | \***\*\_\_\*\*** |
| [Name]   | Project Manager                        | \***\*\_\_\*\*** | \***\*\_\_\*\*** |

### 12.2 Document Approval

**Approved By:**
Name: **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***
Title: Chief Secretary Civil Service (CSCS)
Date: **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***
Signature: **\*\***\*\***\*\***\_\_\_**\*\***\*\***\*\***

---

## Document Control

| Version | Date            | Author            | Changes                                      |
| ------- | --------------- | ----------------- | -------------------------------------------- |
| 1.0     | January 1, 2025 | CSMS Project Team | Initial concept note for e-GAZ QA compliance |

---

**Document Classification:** Official - Government of Zanzibar
**Distribution:** CSC, E-Government Authority, Project Stakeholders
**Next Review:** Upon project initiation

---

_This concept note has been prepared for the Civil Service Management System (CSMS) project to support e-GAZ Quality Assurance compliance requirements._

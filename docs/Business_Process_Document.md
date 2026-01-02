# BUSINESS PROCESS DOCUMENT (FINAL VERSION)
## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | Business Process Document - Final Version |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Date Prepared** | January 2025 |
| **Prepared By** | Business Analysis Team |
| **Reviewed By** | Project Stakeholders |
| **Approved By** | Civil Service Commission |
| **Status** | Final |

---

## Executive Summary

This Business Process Document provides comprehensive documentation of all business processes implemented in the Civil Service Management System (CSMS). The document serves as the authoritative reference for understanding how HR workflows operate within the system, detailing the step-by-step procedures for each of the nine core business processes.

The CSMS manages the complete employee lifecycle across Zanzibar's civil service, serving 50,000+ employees across 41 government institutions. This document formalizes the transformation from manual, paper-based HR processes to automated, digital workflows that ensure transparency, accountability, and efficiency.

**Processes Covered:**
1. Employee Confirmation Process
2. Promotion Request Process
3. Leave Without Pay (LWOP) Process
4. Change of Cadre Process
5. Service Extension Process
6. Retirement Process
7. Resignation Process
8. Termination and Dismissal Process
9. Complaint Management Process

Each process is documented with detailed workflow steps, actor responsibilities, decision points, data requirements, document specifications, business rules, and status transitions.

---

## Table of Contents

1. [Document Purpose and Scope](#1-document-purpose-and-scope)
2. [Process Overview and Principles](#2-process-overview-and-principles)
3. [Common Process Elements](#3-common-process-elements)
4. [Process 1: Employee Confirmation](#4-process-1-employee-confirmation)
5. [Process 2: Promotion Request](#5-process-2-promotion-request)
6. [Process 3: Leave Without Pay (LWOP)](#6-process-3-leave-without-pay-lwop)
7. [Process 4: Change of Cadre](#7-process-4-change-of-cadre)
8. [Process 5: Service Extension](#8-process-5-service-extension)
9. [Process 6: Retirement](#9-process-6-retirement)
10. [Process 7: Resignation](#10-process-7-resignation)
11. [Process 8: Termination and Dismissal](#11-process-8-termination-and-dismissal)
12. [Process 9: Complaint Management](#12-process-9-complaint-management)
13. [Process Metrics and KPIs](#13-process-metrics-and-kpis)
14. [Appendices](#appendices)

---

## 1. Document Purpose and Scope

### 1.1 Purpose

This Business Process Document serves multiple critical purposes:

**For Operations:**
- Provides standard operating procedures for all HR workflows
- Ensures consistency in process execution across all institutions
- Serves as training material for new users
- Acts as reference guide for existing users

**For Compliance:**
- Documents adherence to civil service regulations
- Provides audit trail of process design and implementation
- Demonstrates transparency in HR decision-making
- Supports quality assurance and e-GAZ compliance

**For System Development:**
- Validates that implemented system matches business requirements
- Serves as basis for user acceptance testing
- Guides future system enhancements and modifications
- Documents business rules coded into the system

**For Management:**
- Enables process monitoring and performance measurement
- Supports continuous process improvement initiatives
- Facilitates identification of bottlenecks and inefficiencies
- Provides framework for strategic HR planning

### 1.2 Scope

This document covers all nine core business processes implemented in CSMS Version 1.0:

**In Scope:**
- All HR request workflows from initiation to completion
- Complaint management from submission to resolution
- Actor roles and responsibilities at each process step
- Decision points and approval criteria
- Data requirements and validation rules
- Document requirements and specifications
- Status transitions and notifications
- Business rules and constraints
- Exception handling procedures

**Out of Scope:**
- Technical system architecture and implementation details (see System Design Document)
- Database schema and data models (see Technical Architecture Document)
- User interface specifications (see User Manual)
- System administration procedures (see Administrator Manual)
- Security and access control details (see Security Assessment Report)
- Performance and scalability specifications (see Performance Test Report)

### 1.3 Audience

This document is intended for:
- **HR Officers (HRO):** To understand request submission procedures
- **HHRMD/HRMO/DO:** To understand review and approval workflows
- **CSCS/PO:** To understand process oversight and monitoring
- **System Administrators:** To understand business context for technical support
- **Training Coordinators:** To develop user training materials
- **Auditors:** To verify process compliance and control effectiveness
- **Project Team:** To validate system implementation against requirements

### 1.4 Document Conventions

**Process Flow Notation:**
- `[Action]` - Represents a process step or action
- `{Decision}` - Represents a decision point
- `→` - Indicates process flow direction
- `●` - Represents process start
- `■` - Represents process end

**Status Values:**
- All request statuses are shown in UPPERCASE (e.g., PENDING, APPROVED, REJECTED)
- Review stages are shown in Title Case (e.g., HR Officer Review, HHRMD Review)

**Role Abbreviations:**
- HRO = HR Officer (institution-specific)
- HHRMD = Head of HR Management Division (CSC internal)
- HRMO = HR Management Officer (CSC internal)
- DO = Disciplinary Officer (CSC internal)
- EMP = Employee
- CSCS = Civil Service Commission Secretary
- PO = Planning Officer
- HRRP = HR Responsible Personnel
- ADMIN = System Administrator

---

## 2. Process Overview and Principles

### 2.1 Process Framework

All HR request processes in CSMS follow a standardized framework designed to ensure consistency, transparency, and accountability:

**Standard Process Pattern:**

```
1. REQUEST INITIATION
   ● Employee triggers need for HR action
   ↓
   HRO reviews employee eligibility
   ↓
   HRO prepares and submits request in system

2. INITIAL VALIDATION
   ↓
   System validates data completeness
   ↓
   System checks business rules
   ↓
   {Validation Passes?}

   NO → Return to HRO with error messages
   YES → Continue

3. ROUTING AND NOTIFICATION
   ↓
   Request routed to appropriate approver (HHRMD/HRMO/DO)
   ↓
   Email/system notification sent to approver
   ↓
   Request status: PENDING

4. REVIEW AND DECISION
   ↓
   Approver reviews request details and documents
   ↓
   {Decision}

   APPROVE:
   ↓
   Upload decision letter
   ↓
   Update employee record
   ↓
   Status: APPROVED
   ↓
   Notify HRO

   REJECT:
   ↓
   Enter rejection reason
   ↓
   Status: REJECTED
   ↓
   Notify HRO

   SEND BACK:
   ↓
   Specify rectification needed
   ↓
   Status: SENT_BACK
   ↓
   Notify HRO to resubmit

5. CLOSURE AND AUDIT
   ↓
   Audit log entry created
   ↓
   All actions timestamped
   ↓
   Complete request history maintained
   ↓
   ■ Process Complete
```

### 2.2 Core Process Principles

The CSMS processes are designed according to the following principles:

#### 2.2.1 Transparency
- Every request has a unique tracking ID
- Status visible to all authorized stakeholders
- Complete audit trail of all actions
- Clear documentation of decisions and rationale

#### 2.2.2 Accountability
- Every action attributed to specific user
- All decisions require named approver
- Timestamps recorded for all activities
- Immutable audit logs prevent tampering

#### 2.2.3 Efficiency
- Automated routing to appropriate approvers
- Instant notifications reduce delays
- Digital document management eliminates physical routing
- Parallel processing where appropriate (multiple pending requests)

#### 2.2.4 Data Quality
- Validation at point of entry
- Mandatory field enforcement
- Business rule checking before submission
- Document format and size verification

#### 2.2.5 Compliance
- All processes aligned with civil service regulations
- Required documents enforced by system
- Approval authority properly segregated
- Data retention policies enforced

#### 2.2.6 User-Centric Design
- Clear error messages guide users
- Intuitive workflow progression
- Role-based interfaces show only relevant information
- Contextual help and guidance

### 2.3 Actor Roles and Responsibilities

#### HR Officer (HRO)
**Institutional Role:** One HRO per institution (41 institutions)

**Responsibilities:**
- Receive HR requests from employees within their institution
- Verify employee eligibility for requested action
- Gather required documents from employee
- Submit requests in CSMS on behalf of employees
- Monitor request status and follow up
- Rectify and resubmit requests sent back by approvers
- Communicate outcomes to employees
- Maintain institutional HR records

**Data Access:** Limited to their own institution only

**Applicable Processes:** All except Complaints (employee self-service)

#### Head of HR Management Division (HHRMD)
**CSC Internal Role:** Senior approver with broad authority

**Responsibilities:**
- Approve or reject Confirmation requests
- Approve or reject Promotion requests
- Approve or reject LWOP requests
- Approve or reject Cadre Change requests (HHRMD-only authority)
- Approve or reject Retirement requests
- Approve or reject Resignation requests
- Approve or reject Service Extension requests
- Approve or reject Termination requests (disciplinary)
- Resolve or reject Complaints
- Upload decision letters for approved requests
- Provide rejection rationale for rejected requests
- Review and send back incomplete requests to HRO

**Data Access:** All institutions (CSC-wide view)

**Applicable Processes:** All 9 processes

#### HR Management Officer (HRMO)
**CSC Internal Role:** Operational approver for standard HR requests

**Responsibilities:**
- Approve or reject Confirmation requests
- Approve or reject Promotion requests
- Approve or reject LWOP requests
- Approve or reject Retirement requests
- Approve or reject Resignation requests
- Approve or reject Service Extension requests
- Upload decision letters for approved requests
- Provide rejection rationale for rejected requests
- Review and send back incomplete requests to HRO

**Data Access:** All institutions (CSC-wide view)

**Applicable Processes:** 6 processes (excludes Cadre Change, Termination/Dismissal, Complaints)

**Note:** HRMO cannot approve Cadre Change (HHRMD-only), Termination/Dismissal (DO/HHRMD-only), or Complaints (DO/HHRMD-only)

#### Disciplinary Officer (DO)
**CSC Internal Role:** Specialist for disciplinary and complaint matters

**Responsibilities:**
- Approve or reject Termination requests
- Approve or reject Dismissal requests
- Resolve or reject Complaints
- Document disciplinary actions and evidence
- Escalate complex cases to HHRMD
- Maintain confidentiality of sensitive matters

**Data Access:** All institutions (CSC-wide view, disciplinary matters only)

**Applicable Processes:** Termination/Dismissal, Complaints

#### Employee (EMP)
**End User Role:** Individual civil servants

**Responsibilities:**
- Submit complaints directly via employee portal
- Authenticate using ZanID + Payroll Number + ZSSF Number
- Provide accurate complaint information
- Upload supporting evidence
- Track complaint status
- View own employee profile (read-only)

**Data Access:** Own data only

**Applicable Processes:** Complaint submission only

**Note:** Employees do NOT submit HR requests directly; they work through their institution's HRO

### 2.4 System-Wide Business Rules

The following business rules apply across all or multiple processes:

#### BR-001: Request Uniqueness
Each request must have a unique system-generated ID with the following format:
- Confirmation: `CONF-[Institution]-YYYY-NNNNNN`
- Promotion: `PROM-[Institution]-YYYY-NNNNNN`
- LWOP: `LWOP-[Institution]-YYYY-NNNNNN`
- Cadre Change: `CADR-[Institution]-YYYY-NNNNNN`
- Service Extension: `SEXT-[Institution]-YYYY-NNNNNN`
- Retirement: `RETR-[Institution]-YYYY-NNNNNN`
- Resignation: `RESN-[Institution]-YYYY-NNNNNN`
- Termination/Dismissal: `TERM-[Institution]-YYYY-NNNNNN`
- Complaint: `COMP-YYYY-NNNNNN`

#### BR-002: Document Requirements
- All uploaded documents must be in PDF format only
- Maximum file size: 2MB per document
- Document names must be descriptive and relevant
- At least one supporting document required per request (process-specific)

#### BR-003: Status Transitions
Valid status transitions for all requests:
- `PENDING` → `APPROVED` (approver action)
- `PENDING` → `REJECTED` (approver action)
- `PENDING` → `SENT_BACK` (approver action)
- `SENT_BACK` → `PENDING` (HRO resubmission)
- No reverse transitions allowed (audit integrity)

#### BR-004: Review Stage Tracking
Each request tracks review stage:
- `Submitted` - HRO has submitted request
- `Under Review` - Approver is reviewing
- `Decision Made` - Approved/Rejected/Sent Back
- Review stage independent of status for detailed tracking

#### BR-005: Approval Authority
- HRO can submit but NOT approve requests
- HHRMD can approve ALL request types
- HRMO can approve ONLY: Confirmation, Promotion, LWOP, Retirement, Resignation, Service Extension
- DO can approve ONLY: Termination, Dismissal, Complaints
- Employees can ONLY submit Complaints (not HR requests)

#### BR-006: Institutional Data Isolation
- HRO can view/submit requests for their institution ONLY
- HRRP can view requests for their institution ONLY
- CSC internal users (HHRMD, HRMO, DO, CSCS, PO) can view ALL institutions
- Employees can view ONLY their own data

#### BR-007: Mandatory Fields
All requests require:
- Employee identification (Name, ZanID, Payroll Number)
- Institution
- Request type and specific details
- At least one supporting document
- Submitter information (HRO user ID)
- Submission date (auto-generated)

#### BR-008: Notification Rules
System automatically sends notifications:
- To approver when request submitted (PENDING)
- To HRO when request approved (APPROVED)
- To HRO when request rejected (REJECTED)
- To HRO when request sent back (SENT_BACK)
- To employee when complaint status changes (Complaints only)

#### BR-009: Audit Logging
All actions must be logged:
- User ID of actor
- Action type (Create, Update, Approve, Reject, etc.)
- Timestamp (date and time)
- IP address
- Before and after values (for updates)
- Related request/complaint ID

#### BR-010: Data Retention
- Approved requests: Retained indefinitely
- Rejected requests: Retained for 5 years
- Audit logs: Retained for 10 years (immutable)
- Employee records: Retained for 10 years post-retirement
- Documents: Retained per request retention policy

---

## 3. Common Process Elements

Before detailing each specific process, this section documents elements common to multiple or all processes.

### 3.1 Request Status Lifecycle

All HR requests follow this status lifecycle:

```
     [HRO Submits Request]
              ↓
         ┌─────────┐
         │ PENDING │ ← Initial status upon submission
         └────┬────┘
              │
     [Approver Reviews]
              │
       ┌──────┼──────┬──────────┐
       │      │      │          │
       ↓      ↓      ↓          ↓
  ┌─────────┐ │ ┌────────┐ ┌───────────┐
  │APPROVED │ │ │REJECTED│ │ SENT_BACK │
  └─────────┘ │ └────────┘ └─────┬─────┘
              │                   │
          ┌───┴────┐              │
          │ FINAL  │              │
          │ STATUS │              │
          └────────┘              │
                           [HRO Rectifies]
                                  │
                                  ↓
                            Resubmission
                                  │
                                  ↓
                            Return to PENDING
```

**Status Definitions:**

| Status | Description | Actor | Next Actions |
|--------|-------------|-------|--------------|
| **PENDING** | Request submitted, awaiting review | System | Approver reviews, HRO can view status |
| **APPROVED** | Request approved by authorized approver | HHRMD/HRMO/DO | Employee record updated, HRO notified, process complete |
| **REJECTED** | Request denied by approver | HHRMD/HRMO/DO | HRO notified with reason, process complete |
| **SENT_BACK** | Request returned to HRO for corrections | HHRMD/HRMO/DO | HRO rectifies and resubmits, returns to PENDING |

### 3.2 Review Stages

Within each status, review stages provide more granular tracking:

| Review Stage | Description | Typical Duration |
|--------------|-------------|------------------|
| **Submitted** | HRO has submitted request | Immediate |
| **Under Review** | Approver is actively reviewing | 1-5 business days |
| **Decision Made** | Approver has made final decision | Terminal stage |

### 3.3 Document Management

#### 3.3.1 Document Upload Process

```
[HRO Selects Document]
         ↓
[System Validates]
    ├── Format: Must be PDF
    ├── Size: Must be ≤ 2MB
    └── Name: Must be descriptive
         ↓
    {Valid?}
         │
    YES  │  NO
     ↓   └──→ Show error message
[Upload to MinIO]
     ↓
[Generate URL]
     ↓
[Store URL in Database]
     ↓
[Display in Request Form]
```

#### 3.3.2 Document Viewing Process

```
[User Clicks Document]
         ↓
[System Checks Permissions]
    {Authorized?}
         │
    YES  │  NO
     ↓   └──→ Access Denied
[Retrieve from MinIO]
     ↓
[Display PDF Preview]
     or
[Download PDF]
```

#### 3.3.3 Required Documents by Process

| Process | Required Documents | Optional Documents |
|---------|-------------------|-------------------|
| **Confirmation** | • Confirmation letter<br>• IPA certificate<br>• Performance appraisal | • Additional certificates |
| **Promotion** | • New qualification certificate<br>• TCU verification (if foreign)<br>• Performance appraisals (2+ years) | • Supporting letters |
| **LWOP** | • LWOP application letter<br>• Reason justification document | • Supporting evidence |
| **Cadre Change** | • Qualification certificates<br>• TCU verification (if applicable) | • Transfer approval letter |
| **Service Extension** | • Extension request letter<br>• Employee consent form | • Medical fitness (if applicable) |
| **Retirement** | • Retirement application<br>• Medical certificate (illness type)<br>• ID documents | • Pension documents |
| **Resignation** | • Resignation letter<br>• 3-month notice (or payment proof) | • Exit clearance |
| **Termination/Dismissal** | • Disciplinary report<br>• Evidence documents<br>• Investigation findings | • Witness statements |
| **Complaint** | • Complaint description<br>• Evidence (if available) | • Supporting documents |

### 3.4 Notification System

#### 3.4.1 Notification Triggers

| Event | Recipient | Notification Type | Content |
|-------|-----------|-------------------|---------|
| Request Submitted | Approver (HHRMD/HRMO/DO) | Email + In-app | New request awaiting review |
| Request Approved | HRO | Email + In-app | Request [ID] approved |
| Request Rejected | HRO | Email + In-app | Request [ID] rejected - see reason |
| Request Sent Back | HRO | Email + In-app | Request [ID] needs rectification |
| Complaint Submitted | DO/HHRMD | Email + In-app | New complaint [ID] submitted |
| Complaint Resolved | Employee | Email + In-app | Your complaint [ID] has been resolved |

#### 3.4.2 Notification Format

**Email Notification Template:**
```
Subject: [CSMS] [Action] - [Request Type] Request [ID]

Dear [Recipient Name],

[Action Message]

Request Details:
- Request ID: [ID]
- Request Type: [Type]
- Employee: [Name]
- Institution: [Institution Name]
- Submitted By: [HRO Name]
- Submitted Date: [Date]

[Action-specific details]

Please log in to CSMS to view full details:
https://csms.zanajira.go.tz

Regards,
CSMS Automated Notification System
```

**In-App Notification:**
- Displayed in notification bell icon (top right)
- Unread count badge
- Click to view details
- Mark as read functionality
- Link to relevant request/complaint

### 3.5 Approval Decision Letter

For APPROVED requests, approvers must upload a decision letter:

**Decision Letter Requirements:**
- PDF format, max 2MB
- Official CSC letterhead
- Reference to request ID
- Employee name and details
- Approval decision statement
- Effective date (where applicable)
- Authorized signatory
- Date of approval

**Decision Letter Storage:**
- Uploaded via approver interface
- Stored in MinIO object storage
- URL saved in request record
- Viewable by HRO, approver, CSCS, HRRP, PO
- Part of permanent employee record

### 3.6 Rejection Reason Documentation

For REJECTED requests, approvers must provide rejection reason:

**Rejection Reason Requirements:**
- Free text field (minimum 20 characters)
- Must clearly state reason for rejection
- Reference specific deficiency or regulation
- Stored in database (not separate document)
- Visible to HRO, CSCS, HRRP

**Common Rejection Reasons by Process:**
- **Confirmation:** "Employee has not completed minimum 12-month probation period"
- **Promotion:** "Insufficient service years (minimum 2 years required)"
- **LWOP:** "Reason provided is on prohibited list as per regulations"
- **Service Extension:** "Employee has already used maximum 2 lifetime extensions"
- **Retirement:** "Medical certificate does not support illness retirement claim"

### 3.7 Send Back (Rectification) Process

When approver identifies correctable deficiencies:

```
[Approver Reviews Request]
         ↓
    {Issue Found}
         ↓
    {Correctable?}
    /           \
  YES           NO
   ↓             ↓
[Send Back]  [Reject]
   ↓
[Enter Rectification Instructions]
   ↓
[Status → SENT_BACK]
   ↓
[Notify HRO]
   ↓
[HRO Receives Notification]
   ↓
[HRO Reviews Instructions]
   ↓
[HRO Makes Corrections]
   ├─ Update form fields
   ├─ Upload missing documents
   └─ Replace incorrect documents
   ↓
[HRO Clicks "Resubmit"]
   ↓
[System Validation]
   ↓
[Status → PENDING]
   ↓
[Notify Approver of Resubmission]
   ↓
[Approver Reviews Again]
```

**Rectification Instruction Examples:**
- "Please upload TCU verification letter for foreign qualification"
- "Employee confirmation date is incorrect - please verify and update"
- "Missing performance appraisal document for last year"
- "LWOP duration exceeds 3-year maximum - please adjust"

---

## 4. Process 1: Employee Confirmation

### 4.1 Process Overview

**Purpose:** To formalize the employment status of employees who have successfully completed their probationary period, transitioning them from "On Probation" status to "Confirmed" status.

**Trigger:** Employee completes minimum probation period (12-18 months from employment date)

**Process Owner:** Head of HR Management Division (HHRMD)

**Frequency:** Ongoing (as employees complete probation periods)

**Applicable Regulations:** Civil Service Commission Employment Regulations, Section 5.2 - Confirmation of Appointment

### 4.2 Process Eligibility Criteria

An employee is eligible for confirmation if ALL of the following conditions are met:

| Criterion | Requirement | System Validation |
|-----------|-------------|-------------------|
| **Probation Duration** | Minimum 12 months from employment date | ✓ Automatic calculation |
| **Current Status** | Employee status = "On Probation" | ✓ Database check |
| **Performance** | Satisfactory performance appraisals | Manual verification (HRO) |
| **No Active Disciplinary Actions** | No pending termination/dismissal | Manual verification (HRO) |
| **No Previous Confirmation** | Employee not already confirmed | ✓ Database check |

### 4.3 Process Flow Diagram

```
START: Employee Completes 12+ Months
          ↓
    [HRO Identifies Eligible Employee]
          ↓
    [HRO Logs into CSMS]
          ↓
    [Navigate to Confirmation Requests]
          ↓
    [Click "New Confirmation Request"]
          ↓
    [Search and Select Employee]
          ↓
    {Employee Eligible?}
     /              \
   YES              NO
    ↓                ↓
[Fill Request Form]  [Error Message: Employee Not Eligible]
    ↓                ↓
[Upload Documents]   END
 • Confirmation letter
 • IPA certificate
 • Performance appraisal
    ↓
{All Documents Uploaded?}
    /        \
  YES         NO
   ↓           ↓
[Submit]    [Show Missing Documents Error]
   ↓
[System Validation]
 • Check probation period ≥ 12 months
 • Verify document formats (PDF)
 • Check file sizes (≤ 2MB)
 • Validate mandatory fields
   ↓
{Validation Passes?}
   /        \
 YES         NO
  ↓           ↓
[Create Request]  [Show Validation Errors]
[Generate ID: CONF-XXX-2025-000001]  ↓
[Status: PENDING]              Return to Form
[Review Stage: Submitted]
  ↓
[Route to HHRMD/HRMO]
  ↓
[Send Notification to Approver]
  ↓
[Send Confirmation to HRO]
  ↓
────────── APPROVAL WORKFLOW ──────────
  ↓
[HHRMD/HRMO Receives Notification]
  ↓
[Logs into CSMS]
  ↓
[Navigate to Pending Confirmations]
  ↓
[Select Request to Review]
  ↓
[Review Employee Details]
[Review Request Information]
[View/Download Uploaded Documents]
  ↓
[Update Review Stage: Under Review]
  ↓
{Decision}
  │
  ├─── APPROVE ───┐
  │               ↓
  │        [Upload Decision Letter (PDF)]
  │               ↓
  │        [Set Decision Date]
  │               ↓
  │        [Set Commission Decision Date]
  │               ↓
  │        [Click "Approve"]
  │               ↓
  │        [Status → APPROVED]
  │        [Review Stage → Decision Made]
  │               ↓
  │        [Update Employee Status: "Confirmed"]
  │        [Update Employee Confirmation Date]
  │               ↓
  │        [Store Decision Letter URL]
  │               ↓
  │        [Create Audit Log Entry]
  │               ↓
  │        [Send Notification to HRO]
  │               ↓
  │        END (Approved)
  │
  ├─── REJECT ───┐
  │              ↓
  │       [Enter Rejection Reason (≥20 chars)]
  │              ↓
  │       [Click "Reject"]
  │              ↓
  │       [Status → REJECTED]
  │       [Review Stage → Decision Made]
  │              ↓
  │       [Store Rejection Reason]
  │              ↓
  │       [Create Audit Log Entry]
  │              ↓
  │       [Send Notification to HRO]
  │              ↓
  │       END (Rejected)
  │
  └─── SEND BACK ───┐
                    ↓
             [Enter Rectification Instructions]
                    ↓
             [Click "Send Back"]
                    ↓
             [Status → SENT_BACK]
             [Review Stage → Submitted]
                    ↓
             [Store Instructions]
                    ↓
             [Create Audit Log Entry]
                    ↓
             [Send Notification to HRO]
                    ↓
             [HRO Receives Notification]
                    ↓
             [HRO Reviews Instructions]
                    ↓
             [HRO Makes Corrections]
                    ↓
             [HRO Clicks "Resubmit"]
                    ↓
             [Status → PENDING]
             [Review Stage → Submitted]
                    ↓
             Return to Approval Workflow
```

### 4.4 Detailed Process Steps

#### Phase 1: Request Submission (HRO)

**Step 1.1: Identify Eligible Employee**
- **Actor:** HRO
- **Action:** Review institution employees to identify those who have completed 12+ months probation
- **Tools:** Employee list in CSMS, filtered by "On Probation" status
- **Output:** List of confirmation-eligible employees

**Step 1.2: Access Confirmation Request Module**
- **Actor:** HRO
- **Action:** Login to CSMS → Navigate to "Confirmation Requests" → Click "New Request"
- **Precondition:** HRO must be logged in with valid credentials
- **Interface:** CSMS Dashboard → Confirmation Menu

**Step 1.3: Select Employee**
- **Actor:** HRO
- **Action:** Search employee by name, ZanID, or payroll number → Select from results
- **System Validation:**
  - Employee must belong to HRO's institution
  - Employee status must be "On Probation"
  - Employee must have ≥ 12 months service
  - No existing pending confirmation request
- **Error Handling:** Display specific error if employee ineligible

**Step 1.4: Complete Request Form**
- **Actor:** HRO
- **Fields:**
  - Employee Information (auto-filled from employee record)
    - Name
    - ZanID
    - Payroll Number
    - Institution
    - Employment Date
    - Probation Period Completed (calculated)
  - Request-Specific Information
    - Proposed Confirmation Date
    - Supporting Notes/Comments (optional)
- **Validation:**
  - Confirmation date must be ≥ 12 months after employment date
  - Confirmation date cannot be in the future
  - All mandatory fields must be filled

**Step 1.5: Upload Required Documents**
- **Actor:** HRO
- **Required Documents:**
  1. **Confirmation Letter** - Official letter requesting employee confirmation
  2. **IPA Certificate** - Institute of Public Administration certificate
  3. **Performance Appraisal** - Most recent performance evaluation

- **Upload Process:**
  - Click "Upload" button for each document type
  - Select PDF file from computer (max 2MB)
  - System validates format and size
  - System uploads to MinIO storage
  - System displays document name and size
  - Option to preview or remove uploaded document

- **Validation:**
  - All three documents must be uploaded
  - Each file must be PDF format
  - Each file must be ≤ 2MB
  - Clear error messages if validation fails

**Step 1.6: Review and Submit**
- **Actor:** HRO
- **Action:** Review all entered information → Click "Submit Request"
- **System Processing:**
  1. Final validation of all data
  2. Generate unique Request ID (e.g., CONF-MoE-2025-000042)
  3. Set status to PENDING
  4. Set review stage to Submitted
  5. Record submission timestamp
  6. Record submitter (HRO user ID)
  7. Route to HHRMD/HRMO queue
  8. Send email notification to HHRMD/HRMO
  9. Send in-app notification to HHRMD/HRMO
  10. Display success message to HRO with Request ID
  11. Create audit log entry

#### Phase 2: Request Review and Decision (HHRMD/HRMO)

**Step 2.1: Receive and Access Request**
- **Actor:** HHRMD or HRMO
- **Trigger:** Email + In-app notification of new confirmation request
- **Action:** Login to CSMS → Navigate to "Pending Confirmations" → View list
- **Display:** List shows:
  - Request ID
  - Employee Name
  - Institution
  - Submission Date
  - Days Pending
  - HRO who submitted

**Step 2.2: Open Request Details**
- **Actor:** HHRMD/HRMO
- **Action:** Click on request to view full details
- **System Action:** Update review stage to "Under Review"
- **Information Displayed:**
  - Employee Profile Information
    - Photo
    - Name, ZanID, Payroll Number
    - Institution
    - Employment Date
    - Probation Period Completed
    - Current Status
  - Request Information
    - Request ID
    - Submitted By (HRO name)
    - Submission Date
    - Proposed Confirmation Date
    - Supporting Notes
  - Uploaded Documents
    - Confirmation Letter (with preview/download option)
    - IPA Certificate (with preview/download option)
    - Performance Appraisal (with preview/download option)
  - Request History/Timeline
    - Submission event
    - Any previous send-back events (if resubmission)

**Step 2.3: Review Request Content**
- **Actor:** HHRMD/HRMO
- **Activities:**
  1. Verify employee eligibility
     - Check probation period ≥ 12 months
     - Verify employment date
     - Confirm current status is "On Probation"
  2. Review uploaded documents
     - Open and review confirmation letter
     - Verify IPA certificate authenticity
     - Review performance appraisal ratings
  3. Check for any red flags
     - Disciplinary actions
     - Performance issues
     - Attendance problems
  4. Verify proposed confirmation date is appropriate

**Step 2.4: Make Decision**

The approver has three options:

**Option A: APPROVE**
- **When:** Request meets all criteria, employee deserves confirmation
- **Required Actions:**
  1. Click "Approve" button
  2. Upload Decision Letter (PDF, official CSC letterhead, ≤ 2MB)
  3. Set Decision Date (date of approval)
  4. Set Commission Decision Date (official commission decision date)
  5. Optionally add internal notes
  6. Click "Confirm Approval"

- **System Processing:**
  1. Update request status to APPROVED
  2. Update review stage to Decision Made
  3. Store decision letter URL
  4. Record decision date and commission decision date
  5. Record approver (user ID)
  6. Record approval timestamp
  7. **Update Employee Record:**
     - Change status from "On Probation" to "Confirmed"
     - Set confirmation date to decision date
     - Update confirmation letter URL
  8. Create audit log entry
  9. Send email notification to HRO (approval notification)
  10. Send in-app notification to HRO
  11. Display success message to approver

**Option B: REJECT**
- **When:** Employee does not meet criteria or has performance/disciplinary issues
- **Required Actions:**
  1. Click "Reject" button
  2. Enter detailed rejection reason (minimum 20 characters, free text)
  3. Optionally add internal notes
  4. Click "Confirm Rejection"

- **System Processing:**
  1. Update request status to REJECTED
  2. Update review stage to Decision Made
  3. Store rejection reason
  4. Record approver (user ID)
  5. Record rejection timestamp
  6. Create audit log entry
  7. Send email notification to HRO (rejection with reason)
  8. Send in-app notification to HRO
  9. Display success message to approver
  10. **Employee status remains "On Probation"** (not updated)

**Option C: SEND BACK**
- **When:** Request has correctable deficiencies (missing/incorrect documents, data errors)
- **Required Actions:**
  1. Click "Send Back" button
  2. Enter rectification instructions (specific, actionable guidance)
  3. Optionally add internal notes
  4. Click "Confirm Send Back"

- **System Processing:**
  1. Update request status to SENT_BACK
  2. Reset review stage to Submitted
  3. Store rectification instructions
  4. Record approver (user ID)
  5. Record send-back timestamp
  6. Create audit log entry
  7. Send email notification to HRO (send-back with instructions)
  8. Send in-app notification to HRO
  9. Display success message to approver

#### Phase 3: Rectification and Resubmission (if Sent Back)

**Step 3.1: HRO Receives Send-Back Notification**
- **Actor:** HRO
- **Trigger:** Email + In-app notification
- **Content:** Request ID, reason for send-back, specific instructions

**Step 3.2: HRO Accesses Sent-Back Request**
- **Actor:** HRO
- **Action:** Login to CSMS → Navigate to "My Requests" → Filter by "Sent Back" status
- **Display:** Request shown with SENT_BACK status and rectification instructions prominently displayed

**Step 3.3: HRO Makes Corrections**
- **Actor:** HRO
- **Actions** (based on instructions):
  - Update form fields if data was incorrect
  - Upload missing documents
  - Replace incorrect documents
  - Add additional information requested
- **Interface:** Same as original submission form, pre-filled with existing data
- **Validation:** Same validations as original submission

**Step 3.4: HRO Resubmits Request**
- **Actor:** HRO
- **Action:** Review corrections → Click "Resubmit" button
- **System Processing:**
  1. Validate all corrections
  2. Update request status to PENDING
  3. Reset review stage to Submitted
  4. Retain original Request ID (no new ID generated)
  5. Record resubmission timestamp
  6. Add resubmission event to request history
  7. Route back to HHRMD/HRMO queue
  8. Send notification to HHRMD/HRMO (resubmission notification)
  9. Create audit log entry
  10. Display success message to HRO

**Step 3.5: Return to Step 2.1**
- Process continues with approver review of resubmitted request

### 4.5 Data Requirements

#### Database Tables Involved

**Primary Table:** `ConfirmationRequest`

**Fields:**
```typescript
id: String (Primary Key, UUID)
status: String ("PENDING" | "APPROVED" | "REJECTED" | "SENT_BACK")
reviewStage: String ("Submitted" | "Under Review" | "Decision Made")
documents: String[] (Array of MinIO URLs)
rejectionReason: String? (nullable, required if REJECTED)
employeeId: String (Foreign Key → Employee)
submittedById: String (Foreign Key → User, HRO)
reviewedById: String? (Foreign Key → User, HHRMD/HRMO)
decisionDate: DateTime? (nullable, set when approved)
commissionDecisionDate: DateTime? (nullable, set when approved)
createdAt: DateTime (auto-generated)
updatedAt: DateTime (auto-updated)
```

**Related Tables:**
- `Employee` - Employee being confirmed
- `User` - HRO who submitted, HHRMD/HRMO who reviewed
- `Institution` - Employee's institution
- `AuditLog` - All actions logged
- `Notification` - Notifications sent

#### Data Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| employeeId | Must exist in Employee table | "Employee not found" |
| employeeId | Employee status must be "On Probation" | "Employee is not on probation" |
| employeeId | Employment date ≥ 12 months ago | "Employee has not completed minimum probation period" |
| documents | Array must contain exactly 3 URLs | "All required documents must be uploaded" |
| documents | Each URL must be valid MinIO path | "Invalid document reference" |
| status | Must be one of enum values | "Invalid status value" |
| decisionDate | Cannot be in the future | "Decision date cannot be in future" |
| rejectionReason | Required if status = REJECTED | "Rejection reason is required" |
| rejectionReason | Minimum 20 characters if provided | "Rejection reason must be at least 20 characters" |

### 4.6 Business Rules

**BR-CONF-001: Probation Period Validation**
- Employee must have completed minimum 12 months from employment date
- System calculates: `TODAY - employmentDate ≥ 365 days`
- If false, system prevents request submission

**BR-CONF-002: Single Active Request**
- Employee can have only ONE active (PENDING or SENT_BACK) confirmation request at a time
- System checks for existing requests before allowing new submission
- If active request exists, show error: "Employee already has a pending confirmation request"

**BR-CONF-003: Status-Based Eligibility**
- Only employees with status "On Probation" can be confirmed
- Employees with status "Confirmed", "Retired", "Resigned", etc. cannot be confirmed
- System enforces via database query filter

**BR-CONF-004: Document Requirement Enforcement**
- All three documents (Confirmation Letter, IPA Certificate, Performance Appraisal) are mandatory
- System prevents submission if any document missing
- Each document must meet format (PDF) and size (≤ 2MB) requirements

**BR-CONF-005: Approval Authority**
- HHRMD can approve/reject/send-back confirmation requests
- HRMO can approve/reject/send-back confirmation requests
- DO CANNOT approve confirmation requests (not in scope of authority)
- HRO CANNOT approve requests (can only submit)

**BR-CONF-006: Employee Record Update**
- Employee status updated ONLY when request APPROVED
- Status remains unchanged if REJECTED or SENT_BACK
- Confirmation date set to decision date when approved
- Changes to employee record are immediate and permanent

**BR-CONF-007: Decision Letter Requirement**
- Decision letter (PDF) REQUIRED for APPROVED requests
- Decision letter NOT required for REJECTED or SENT_BACK
- Decision letter uploaded by approver, not HRO
- Decision letter stored permanently in employee record

**BR-CONF-008: Request Immutability After Decision**
- Once status is APPROVED or REJECTED, request cannot be edited
- Only SENT_BACK requests can be edited (by HRO) and resubmitted
- Audit log maintains complete history even if edited

**BR-CONF-009: Resubmission Retention**
- Resubmitted requests retain original Request ID
- Request history shows all submission/send-back/resubmission events
- Each resubmission creates new audit log entry
- No limit on number of send-back/resubmit cycles

**BR-CONF-010: Notification Timing**
- Notifications sent immediately upon status change
- Email notifications sent asynchronously (non-blocking)
- In-app notifications appear in real-time
- Failed email notifications logged but don't block process

### 4.7 Exception Handling

| Exception Scenario | System Behavior | User Guidance |
|-------------------|-----------------|---------------|
| **Employee not found** | Show error, prevent submission | "Selected employee does not exist or has been deleted. Please refresh and try again." |
| **Probation period insufficient** | Show error, prevent submission | "Employee has only completed [X] months of probation. Minimum 12 months required." |
| **Document upload fails** | Allow retry, show error | "Document upload failed. Please check file format (PDF) and size (≤ 2MB) and try again." |
| **Network timeout during submission** | Transaction rollback, allow retry | "Submission failed due to network error. Please check your connection and try again." |
| **Approver uploads invalid decision letter** | Show error, require re-upload | "Decision letter must be PDF format and ≤ 2MB. Please upload a valid file." |
| **Employee record update fails** | Transaction rollback, log error, alert admin | "System error occurred. Please contact administrator. Error ID: [XXX]" |
| **Duplicate submission detected** | Prevent submission, show existing request | "Employee already has pending confirmation request [ID]. Please view existing request." |

### 4.8 Process Metrics

**Key Performance Indicators (KPIs):**

| Metric | Definition | Target | Measurement Frequency |
|--------|------------|--------|----------------------|
| **Average Processing Time** | Days from submission to decision | ≤ 5 business days | Weekly |
| **Approval Rate** | % of requests approved | ≥ 85% | Monthly |
| **Send-Back Rate** | % of requests sent back | ≤ 15% | Monthly |
| **Rejection Rate** | % of requests rejected | ≤ 10% | Monthly |
| **Resubmission Success Rate** | % of sent-back requests eventually approved | ≥ 90% | Monthly |
| **Overdue Requests** | Requests pending > 10 days | 0 | Daily |
| **Document Compliance** | % of requests with all required docs on first submission | ≥ 90% | Monthly |

### 4.9 Process Outputs

**Successful Completion (Approved):**
1. Request record with status APPROVED
2. Updated employee record:
   - Status changed to "Confirmed"
   - Confirmation date set
   - Confirmation letter URL stored
3. Decision letter stored in MinIO
4. Audit log entries
5. Notifications sent to HRO
6. Employee eligible for promotions and other confirmed-employee processes

**Unsuccessful Completion (Rejected):**
1. Request record with status REJECTED
2. Rejection reason documented
3. Employee record unchanged (remains "On Probation")
4. Audit log entries
5. Notifications sent to HRO
6. Employee may be subject to further review or dismissal

**Pending Rectification (Sent Back):**
1. Request record with status SENT_BACK
2. Rectification instructions documented
3. Employee record unchanged
4. Audit log entries
5. Notifications sent to HRO
6. Awaiting HRO corrections and resubmission

---

## 5. Process 2-9: Summary of Remaining Processes

**Note:** The remaining processes (Promotion, LWOP, Cadre Change, Service Extension, Retirement, Resignation, Termination/Dismissal, and Complaints) follow the same general workflow pattern as Employee Confirmation, with specific variations documented below.

### 5.1 Common Pattern (All Remaining Processes)

All processes share this structure:
1. **Eligibility Check** → HRO validates employee meets criteria
2. **Request Submission** → HRO fills form, uploads documents, submits
3. **System Validation** → Automated business rule checking
4. **Routing** → Request sent to appropriate approver
5. **Review and Decision** → HHRMD/HRMO/DO approves, rejects, or sends back
6. **Employee Record Update** → Status/data updated if approved
7. **Notifications** → All parties notified of outcome

### 5.2 Process-Specific Variations

#### **Process 2: Promotion Request (PROM-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Two Promotion Types:**
  1. Education-Based: Employee acquired new degree/qualification
  2. Performance-Based: Consecutive exceptional performance appraisals (2+ years)

- **Eligibility Criteria:**
  - Must be "Confirmed" employee (not on probation)
  - Minimum 2 years in current cadre
  - For education-based: New qualification must be higher than current
  - For foreign qualifications: TCU verification letter required

- **Required Documents:**
  - Educational certificates (for education-based)
  - TCU verification letter (if qualification from foreign institution)
  - Performance appraisals (2+ consecutive years for performance-based)
  - Promotion request letter

- **Business Rules:**
  - **BR-PROM-001:** Employee must be "Confirmed" status
  - **BR-PROM-002:** Minimum 2-year service in current cadre
  - **BR-PROM-003:** TCU verification mandatory for foreign qualifications (system flag: studiedOutsideCountry = true)
  - **BR-PROM-004:** Proposed cadre must be higher than current cadre
  - **BR-PROM-005:** Maximum 1 pending promotion request per employee

- **Data Fields:**
  - proposedCadre: String
  - promotionType: "Education-Based" | "Performance-Based"
  - studiedOutsideCountry: Boolean
  - commissionDecisionReason: String (optional notes)

- **Employee Record Impact (if APPROVED):**
  - Update cadre to proposedCadre
  - Update salaryScale (if applicable)
  - Add entry to promotion history

---

#### **Process 3: Leave Without Pay - LWOP (LWOP-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Purpose:** Grant unpaid leave for valid personal reasons
- **Duration Range:** Minimum 1 month, Maximum 3 years
- **Frequency Limit:** Maximum 2 LWOP periods per employee (lifetime)

- **Eligibility Criteria:**
  - Must be "Confirmed" employee
  - No outstanding loan guarantees (employee guaranteed someone's loan)
  - Reason must NOT be on prohibited list
  - Has not exceeded 2 lifetime LWOP periods

- **Prohibited LWOP Reasons:**
  - Political campaigning
  - Working for competitor organization
  - Activities conflicting with civil service ethics
  (HRO must verify reason is acceptable)

- **Required Documents:**
  - LWOP application letter
  - Justification document explaining reason
  - Supporting evidence (varies by reason)

- **Business Rules:**
  - **BR-LWOP-001:** Duration validation (1 month ≤ duration ≤ 3 years)
  - **BR-LWOP-002:** Maximum 2 LWOP periods per employee (system counts previous LWOPs)
  - **BR-LWOP-003:** Reason cannot be on prohibited list (manual verification by HHRMD/HRMO)
  - **BR-LWOP-004:** Employee cannot have outstanding loan guarantees (manual verification)
  - **BR-LWOP-005:** Start and end dates must be specified

- **Data Fields:**
  - duration: String (e.g., "6 months", "2 years")
  - reason: String (free text)
  - startDate: DateTime
  - endDate: DateTime
  - documents: String[] (application letter, justification, evidence)

- **Employee Record Impact (if APPROVED):**
  - Status updated to "On LWOP"
  - LWOP start and end dates recorded
  - Payroll integration triggered (suspend salary)
  - LWOP history incremented

---

#### **Process 4: Change of Cadre (CADR-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Purpose:** Transfer employee to different job category/cadre
- **Approval Authority:** HHRMD ONLY (HRMO cannot approve)
- **Basis:** Organizational need or employee qualification upgrade

- **Eligibility Criteria:**
  - Must be "Confirmed" employee
  - New cadre must be aligned with qualifications
  - Organizational approval obtained (pre-system submission)

- **Required Documents:**
  - Cadre change request letter
  - Educational certificates supporting new cadre
  - TCU verification (if foreign qualification)
  - Organizational approval letter

- **Business Rules:**
  - **BR-CADR-001:** Only HHRMD can approve (HRMO restricted)
  - **BR-CADR-002:** TCU verification required if studiedOutsideCountry = true
  - **BR-CADR-003:** Employee must meet educational requirements for new cadre
  - **BR-CADR-004:** Cadre change must be justified (reason field mandatory)

- **Data Fields:**
  - newCadre: String
  - reason: String (justification for change)
  - studiedOutsideCountry: Boolean
  - documents: String[]

- **Employee Record Impact (if APPROVED):**
  - Update cadre to newCadre
  - Update salaryScale (if applicable)
  - Update department (if cadre change involves department change)
  - Add entry to cadre change history

---

#### **Process 5: Service Extension (SEXT-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Purpose:** Extend service beyond normal retirement age
- **Trigger:** Employee approaching retirement date
- **Duration:** 6 months to 3 years per extension
- **Frequency Limit:** Maximum 2 lifetime extensions

- **Eligibility Criteria:**
  - Employee must have retirement date set
  - Retirement date must be approaching (within 6 months)
  - Has not exceeded 2 lifetime extensions
  - Employee must provide consent
  - Organizational need must exist (justification)

- **Required Documents:**
  - Service extension request letter
  - Justification document (why extension needed)
  - Employee consent form (signed)
  - Medical fitness certificate (optional but recommended)

- **Business Rules:**
  - **BR-SEXT-001:** Employee must have retirementDate set in system
  - **BR-SEXT-002:** Request must be submitted before retirement date
  - **BR-SEXT-003:** Extension period: 6 months ≤ duration ≤ 3 years
  - **BR-SEXT-004:** Maximum 2 lifetime extensions (system counts previous extensions)
  - **BR-SEXT-005:** Employee consent mandatory (verified by HRO)
  - **BR-SEXT-006:** 90-day expiration notification sent automatically

- **Data Fields:**
  - currentRetirementDate: DateTime
  - requestedExtensionPeriod: String (e.g., "1 year", "18 months")
  - justification: String (organizational need)
  - documents: String[]

- **Employee Record Impact (if APPROVED):**
  - Update retirementDate (extend by requested period)
  - Status remains "Confirmed" (or current status)
  - Service extension history incremented
  - System schedules 90-day expiration notification

---

#### **Process 6: Retirement (RETR-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Three Retirement Types:**
  1. **Compulsory:** Age-based mandatory retirement (e.g., age 60)
  2. **Voluntary:** Employee chooses to retire early
  3. **Illness:** Medical condition prevents continued service

- **Eligibility Criteria:**
  - Must be "Confirmed" employee
  - For compulsory: Employee reached retirement age
  - For voluntary: Employee meets minimum service requirements
  - For illness: Medical certificate required

- **Required Documents:**
  - **All Types:**
    - Retirement application letter
    - ID documents
  - **Illness Retirement (Additional):**
    - Medical certificate from recognized medical facility
    - Medical board report (if applicable)
  - **Optional:**
    - Pension application documents

- **Business Rules:**
  - **BR-RETR-001:** Retirement type must be specified
  - **BR-RETR-002:** For illness retirement, medical certificate mandatory
  - **BR-RETR-003:** Proposed retirement date cannot be in the past
  - **BR-RETR-004:** For compulsory, employee must have reached retirement age
  - **BR-RETR-005:** Pension system integration (notification sent if approved)

- **Data Fields:**
  - retirementType: "Compulsory" | "Voluntary" | "Illness"
  - illnessDescription: String? (required only if type = Illness)
  - proposedDate: DateTime
  - delayReason: String? (if proposed date differs from official retirement date)
  - documents: String[]

- **Employee Record Impact (if APPROVED):**
  - Status updated to "Retired"
  - Retirement date set to proposedDate
  - Retirement type recorded
  - Pension system notified (future integration)
  - Payroll integration triggered (final settlement)

---

#### **Process 7: Resignation (RESN-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Two Notice Types:**
  1. **3-Month Notice:** Standard resignation (free, no payment)
  2. **24-Hour Notice:** Immediate resignation with 3-month salary payment

- **Eligibility Criteria:**
  - Must be "Confirmed" employee (probationary employees use Dismissal process)
  - Must provide proper notice or payment
  - No outstanding obligations (manual verification by HRO)

- **Required Documents:**
  - Resignation letter (stating notice type)
  - For 24-hour notice: Payment proof (3 months' salary)
  - Exit clearance form (optional, recommended)

- **Business Rules:**
  - **BR-RESN-001:** Effective date must be ≥ 3 months from submission (if 3-month notice)
  - **BR-RESN-002:** For 24-hour notice, payment proof required
  - **BR-RESN-003:** Resignation cannot be withdrawn after approval (final decision)
  - **BR-RESN-004:** Employee must have "Confirmed" status (not probationary)

- **Data Fields:**
  - effectiveDate: DateTime
  - reason: String? (optional, employee's stated reason)
  - documents: String[] (resignation letter, payment proof if applicable)

- **Employee Record Impact (if APPROVED):**
  - Status updated to "Resigned"
  - Effective resignation date recorded
  - Payroll integration triggered (final settlement)
  - Exit procedures initiated

---

#### **Process 8: Termination and Dismissal (TERM-XXX-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Approval Authority:** DO or HHRMD ONLY (disciplinary matter)
- **Two Types:**
  1. **Termination:** For "Confirmed" employees (disciplinary action)
  2. **Dismissal:** For "On Probation" employees (performance/conduct)

- **Trigger:** Disciplinary investigation conclusion or probation failure

- **Eligibility Criteria:**
  - For Termination: Employee must be "Confirmed"
  - For Dismissal: Employee must be "On Probation"
  - Disciplinary process must be completed
  - Evidence must be documented

- **Required Documents:**
  - Disciplinary investigation report
  - Evidence documents (witness statements, violation records)
  - Employee response (if provided)
  - Disciplinary committee decision (if applicable)

- **Business Rules:**
  - **BR-TERM-001:** Only DO or HHRMD can approve (HRMO excluded)
  - **BR-TERM-002:** Type must match employee status (Termination for Confirmed, Dismissal for Probation)
  - **BR-TERM-003:** Comprehensive evidence required (minimum 1 document)
  - **BR-TERM-004:** Reason must be clearly documented
  - **BR-TERM-005:** Decision is immutable once approved (cannot be reversed)

- **Data Fields:**
  - type: "Termination" | "Dismissal"
  - reason: String (detailed explanation)
  - documents: String[] (investigation report, evidence)
  - employeeId: String

- **Employee Record Impact (if APPROVED):**
  - Status updated to "Terminated" or "Dismissed"
  - Termination/dismissal date recorded
  - Termination reason stored
  - Payroll integration triggered (final settlement, no severance typically)
  - Employee loses access to system

---

#### **Process 9: Complaint Management (COMP-YYYY-NNNNNN)**

**Unique Characteristics:**
- **Submitter:** EMPLOYEE (self-service, not via HRO)
- **Authentication:** ZanID + Payroll Number + ZSSF Number
- **Portal:** Separate employee login portal (https://csms.zanajira.go.tz/employee-login)
- **Approvers:** DO or HHRMD (whoever responds first)
- **AI Enhancement:** Google Genkit AI rewrites complaint if poorly formatted

**Complaint Categories:**
1. **Unconfirmed Employees:** Probation-related complaints
2. **Job-Related:** Work conditions, assignments, disputes
3. **Other:** Miscellaneous employee concerns

**Process Flow Differences:**

```
[Employee Accesses Employee Portal]
          ↓
[Enter ZanID + Payroll Number + ZSSF Number]
          ↓
{Authentication Successful?}
    /            \
  YES             NO
   ↓               ↓
[View Profile + Complaints Option]  [Error: Invalid Credentials]
   ↓
[Click "Submit New Complaint"]
   ↓
[Select Complaint Category]
 • Unconfirmed Employees
 • Job-Related
 • Other
   ↓
[Fill Complaint Form]
 • Subject
 • Details (free text)
 • Incident date (optional)
 • Complainant phone number
 • Next of kin phone number
   ↓
[Upload Evidence (optional, PDF, 1MB max)]
   ↓
{AI Enhancement?}
   ↓
[Google Genkit analyzes complaint text]
[If poorly formatted, AI rewrites for clarity]
[User reviews AI suggestion]
[User can accept or keep original]
   ↓
[Submit Complaint]
   ↓
[System Processing:]
 • Generate Unique ID: COMP-2025-000123
 • Status: PENDING
 • Review Stage: Submitted
 • Assign to: DO or HHRMD (based on category)
 • Send notifications
   ↓
[Employee Receives Confirmation with Complaint ID]
   ↓
────────── RESOLUTION WORKFLOW ──────────
   ↓
[DO/HHRMD Receives Notification]
   ↓
[Reviews Complaint Details]
   ↓
{Decision}
  │
  ├─── RESOLVE ───┐
  │               ↓
  │        [Document Resolution Action]
  │        [Enter Officer Comments]
  │        [Status → RESOLVED]
  │        [Notify Employee]
  │
  ├─── REJECT ───┐
  │              ↓
  │       [Enter Rejection Reason]
  │       [Status → REJECTED]
  │       [Notify Employee]
  │
  └─── ESCALATE ───┐
                   ↓
            [Forward to HHRMD (if DO initiated)]
            [Add Internal Notes]
            [Assigned Officer → HHRMD]
            [Notify HHRMD]
            [Return to Review]
```

**Required Documents:**
- Complaint description (embedded in form, not separate document)
- Evidence documents (optional, PDF, 1MB max per file)

**Business Rules:**
- **BR-COMP-001:** Only employees can submit complaints (not HRO)
- **BR-COMP-002:** Employee must authenticate with all three IDs (ZanID, Payroll, ZSSF)
- **BR-COMP-003:** Complaint ID format: COMP-YYYY-NNNNNN (no institution prefix)
- **BR-COMP-004:** DO and HHRMD both have resolution authority
- **BR-COMP-005:** Complaints can be escalated from DO to HHRMD
- **BR-COMP-006:** Employee can view only their own complaints
- **BR-COMP-007:** Evidence documents optional (unlike HR requests)
- **BR-COMP-008:** AI rewriting is optional (employee can decline)

**Data Fields:**
```typescript
id: String (e.g., COMP-2025-000045)
complaintType: "Unconfirmed Employees" | "Job-Related" | "Other"
subject: String
details: String (complaint description)
complainantPhoneNumber: String
nextOfKinPhoneNumber: String
attachments: String[] (MinIO URLs, optional)
status: "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED"
reviewStage: String
officerComments: String? (resolution notes)
internalNotes: String? (for DO/HHRMD only)
rejectionReason: String? (if rejected)
complainantId: String (Foreign Key → User/Employee)
assignedOfficerRole: "DO" | "HHRMD"
reviewedById: String? (Foreign Key → User)
createdAt: DateTime
updatedAt: DateTime
```

**Employee Record Impact:**
- NO direct employee record update (complaints don't change status)
- Complaint history viewable by employee
- Resolution actions may trigger separate HR processes (e.g., if complaint leads to confirmation)

**AI Enhancement (Google Genkit):**
- Analyzes complaint text for clarity and completeness
- If poorly written, suggests improved version
- Maintains factual accuracy (doesn't change facts)
- Employee reviews and approves AI suggestion
- Original text always retained
- Employee can decline AI suggestion

---

## 13. Process Metrics and KPIs

### 13.1 Overall HR Request Metrics

| Metric | Target | Measurement | Reporting Frequency |
|--------|--------|-------------|-------------------|
| **Overall Processing Time** | ≤ 7 business days | Average days from submission to decision | Weekly |
| **Request Volume by Type** | - | Count of each request type | Monthly |
| **Approval Rate** | ≥ 80% | Approved / Total Submitted | Monthly |
| **Rejection Rate** | ≤ 15% | Rejected / Total Submitted | Monthly |
| **Send-Back Rate** | ≤ 20% | Sent Back / Total Submitted | Monthly |
| **First-Time Submission Success** | ≥ 75% | Approved on first submission / Total | Monthly |
| **Overdue Requests** | 0 | Requests pending > 10 days | Daily |
| **HRO Performance** | - | Requests by institution, approval rates | Monthly |
| **Approver Workload** | Balanced | Requests per approver | Weekly |

### 13.2 Process-Specific Targets

| Process | Average Processing Time | Approval Rate Target | Critical SLA |
|---------|------------------------|---------------------|--------------|
| **Confirmation** | 5 days | ≥ 85% | 10 days |
| **Promotion** | 7 days | ≥ 75% | 14 days |
| **LWOP** | 5 days | ≥ 80% | 10 days |
| **Cadre Change** | 10 days | ≥ 70% | 21 days |
| **Service Extension** | 7 days | ≥ 85% | 14 days |
| **Retirement** | 7 days | ≥ 90% | 14 days |
| **Resignation** | 3 days | ≥ 95% | 7 days |
| **Termination/Dismissal** | 14 days | ≥ 60% | 30 days |
| **Complaints** | 10 days | ≥ 70% resolution | 21 days |

### 13.3 Data Quality Metrics

| Metric | Target | Impact |
|--------|--------|--------|
| **Document Upload Compliance** | ≥ 95% | All required docs on first submission |
| **Data Completeness** | 100% | All mandatory fields filled |
| **Resubmission Success Rate** | ≥ 90% | Sent-back requests eventually approved |
| **Employee Record Accuracy** | 100% | Status updates applied correctly |
| **Audit Log Completeness** | 100% | All actions logged |

---

## 14. Continuous Improvement

### 14.1 Process Review Cycle

- **Monthly:** Review process metrics and identify bottlenecks
- **Quarterly:** Analyze rejection reasons and update guidance
- **Semi-Annually:** Stakeholder feedback sessions
- **Annually:** Comprehensive process optimization review

### 14.2 Improvement Areas

1. **Reduce Send-Back Rate:** Improve HRO training, enhance form validation
2. **Accelerate Processing Time:** Set SLA reminders, escalate overdue requests
3. **Enhance Document Quality:** Provide templates, examples, checklists
4. **Optimize Approval Workflows:** Balance workload among approvers
5. **Improve User Experience:** Simplify forms, add contextual help

---

## Appendices

### Appendix A: Process Comparison Matrix

| Aspect | Confirmation | Promotion | LWOP | Cadre Change | Service Ext | Retirement | Resignation | Term/Dismiss | Complaints |
|--------|-------------|-----------|------|--------------|-------------|------------|-------------|--------------|------------|
| **Submitter** | HRO | HRO | HRO | HRO | HRO | HRO | HRO | HRO | Employee |
| **Approver** | HHRMD/HRMO | HHRMD/HRMO | HHRMD/HRMO | HHRMD only | HHRMD/HRMO | HHRMD/HRMO | HHRMD/HRMO | DO/HHRMD | DO/HHRMD |
| **Eligible Status** | On Probation | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Any | Any |
| **Min Duration** | 12 months | 2 years | 1 month | - | 6 months | - | 3 months | - | - |
| **Max Duration** | 18 months | - | 3 years | - | 3 years | - | - | - | - |
| **Frequency Limit** | Once | Multiple | 2 lifetime | Multiple | 2 lifetime | Once | Once | - | Unlimited |
| **Decision Letter** | Required | Required | Required | Required | Required | Required | Required | Optional | N/A |
| **Status Change** | → Confirmed | Update Cadre | → On LWOP | Update Cadre | Extend Date | → Retired | → Resigned | → Terminated | None |
| **Reversible** | No | No | No | No | No | No | No | No | N/A |

### Appendix B: Document Requirements Summary

| Process | Mandatory Documents | Optional Documents | Max File Size |
|---------|-------------------|-------------------|---------------|
| **Confirmation** | Confirmation letter, IPA certificate, Performance appraisal | - | 2MB each |
| **Promotion** | Qualification certificates, Performance appraisals, TCU verification (if foreign) | Supporting letters | 2MB each |
| **LWOP** | LWOP application, Justification | Supporting evidence | 2MB each |
| **Cadre Change** | Request letter, Educational certificates, TCU (if foreign) | Org approval letter | 2MB each |
| **Service Extension** | Request letter, Justification, Employee consent | Medical fitness | 2MB each |
| **Retirement** | Retirement application, ID documents, Medical cert (illness type) | Pension docs | 2MB each |
| **Resignation** | Resignation letter, Payment proof (24-hr notice) | Exit clearance | 2MB each |
| **Termination/Dismissal** | Investigation report, Evidence documents | Witness statements | 2MB each |
| **Complaints** | Complaint description (inline) | Evidence | 1MB each |

### Appendix C: Status Transition Rules

```
Employee Status Transitions:

"On Probation" → "Confirmed" (via Confirmation Approval)
"On Probation" → "Dismissed" (via Dismissal Approval)
"Confirmed" → "Promoted" (cadre update, via Promotion Approval)
"Confirmed" → "On LWOP" (via LWOP Approval)
"Confirmed" → "Retired" (via Retirement Approval)
"Confirmed" → "Resigned" (via Resignation Approval)
"Confirmed" → "Terminated" (via Termination Approval)
"On LWOP" → "Confirmed" (upon LWOP period expiration)
[Status changes are one-way and irreversible]
```

### Appendix D: Glossary of Terms

| Term | Definition |
|------|------------|
| **Approver** | HHRMD, HRMO, or DO authorized to approve requests |
| **Audit Log** | Immutable record of all system actions |
| **Decision Letter** | Official PDF document confirming approval of HR request |
| **HRO** | HR Officer at institution level who submits requests |
| **MinIO** | Object storage system for documents (S3-compatible) |
| **Probation Period** | Initial 12-18 month evaluation period for new employees |
| **Rectification** | Corrections made by HRO after request sent back |
| **Review Stage** | Granular tracking within status (Submitted, Under Review, Decision Made) |
| **Send Back** | Approver returns request to HRO for corrections |
| **TCU** | Tanzania Commission for Universities (foreign qualification verification) |
| **ZanID** | Zanzibar National ID Number |
| **ZSSF** | Zanzibar Social Security Fund Number |

### Appendix E: Business Rule Reference

**Complete list of all business rules across all 9 processes:**

**Confirmation:** BR-CONF-001 through BR-CONF-010
**Promotion:** BR-PROM-001 through BR-PROM-005
**LWOP:** BR-LWOP-001 through BR-LWOP-005
**Cadre Change:** BR-CADR-001 through BR-CADR-004
**Service Extension:** BR-SEXT-001 through BR-SEXT-006
**Retirement:** BR-RETR-001 through BR-RETR-005
**Resignation:** BR-RESN-001 through BR-RESN-004
**Termination/Dismissal:** BR-TERM-001 through BR-TERM-005
**Complaints:** BR-COMP-001 through BR-COMP-008

(Refer to individual process sections for detailed rule descriptions)

---

## Document Approvals

This Business Process Document has been reviewed and approved by:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Head of HR Management Division (HHRMD)** | | | |
| **Business Analyst** | | | |
| **Project Manager** | | | |
| **Civil Service Commission Secretary (CSCS)** | | | |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 0.1 | Jan 10, 2025 | Business Analyst | Initial draft |
| 0.2 | Jan 15, 2025 | Business Analyst | Added all 9 processes |
| 0.3 | Jan 20, 2025 | Business Analyst | Added metrics and appendices |
| 1.0 | Jan 25, 2025 | Business Analyst | Final version for approval |

---

**END OF BUSINESS PROCESS DOCUMENT**

*This document is confidential and proprietary to the Civil Service Commission of Zanzibar. Unauthorized distribution or reproduction is prohibited.*

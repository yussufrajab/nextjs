# USER ACCEPTANCE TEST (UAT) DOCUMENT

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item                   | Details                                                |
| ---------------------- | ------------------------------------------------------ |
| **Document Title**     | User Acceptance Test - Civil Service Management System |
| **Project Name**       | Civil Service Management System (CSMS)                 |
| **Version**            |                                                        |
| **Date Prepared**      |                                                        |
| **Test Environment**   | https://test.zanajira.go.tz                            |
| **Employee Login URL** | https://test.zanajira.go.tz/employee-login             |
| **Prepared By**        |                                                        |
| **Reviewed By**        |                                                        |
| **Approved By**        |                                                        |

---

## 1. Introduction

### 1.1 Purpose

This User Acceptance Test (UAT) document verifies that the Civil Service Management System (CSMS) meets all business requirements for managing civil service employees in Zanzibar. The system provides comprehensive HR lifecycle management from hiring through separation, including approval workflows, document management, and reporting capabilities.

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

### 1.3 Test Objectives

- Verify all  user roles function with correct permissions
- Validate all  request type workflows
- Test role-based access control (CSC vs Institution-based)
- Confirm data isolation between institutions
- Test file upload/download (MinIO storage, PDF only, 1MB max)
- Validate notification system (English & Swahili)
- Ensure employee status restrictions work correctly
- Test reporting system (10 report types, bilingual)
- Verify HRIMS integration functionality
- Confirm approval workflows and status tracking

---

## 2. Test Environment

### 2.1 System Access

| Component           | Specification                              |
| ------------------- | ------------------------------------------ |
| **Production URL**  | https://csms.zanajira.go.tz                |
| **Employee Portal** | https://csms.zanajira.go.tz/employee-login |
| **Framework**       | Next.js 16 Full-Stack Application          |
| **Database**        | PostgreSQL with Prisma ORM                 |
| **Storage**         | MinIO S3-Compatible Object Storage         |
| **Port**            | 9002                                       |

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

### 2.3 Test Data Requirements

- Sample employees in various statuses (On Probation, Confirmed, On LWOP, Retired, etc.)
- Multiple institutions with assigned HR Officers
- Test documents (PDF files, max 2MB) for upload testing
- Employees with complete profiles including photos and documents
- Historical requests for reporting tests

---

## 3. Test Cases

---

### **Module:** User Authentication and Role-Based Access

### **Test Case No.: 1**

**Process/Function Name:** User Authentication and Role-Based Access Control

**Function Description:** This module handles user login, session management, and role-based access control. The system supports 9 user roles with different permission levels and data visibility scopes. CSC roles (HHRMD, HRMO, DO, PO, CSCS) can access all institutions while institution-based roles (HRO, HRRP, EMPLOYEE) are restricted to their own institution.

| **Case ID** | **Test Case Scenario**                   | **Test Steps**                                               | **Expected Results**                                         | **Actual Results** | **PASS/FAIL** |
| ----------- | ---------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------ | ------------- |
| 1.1         | Login as HRO (Institution-based)         | 1. Navigate to https://test.zanajira.go.tz<br>2. Enter username: kmnyonge<br>3. Enter password: password123<br>4. Click Login | - Login successful<br>- Redirected to dashboard<br>- Can only see own institution's data<br>- Welcome notification created<br>- User role displayed correctly |                    |               |
| 1.2         | Login as HHRMD (CSC Role)                | 1. Navigate to login page<br>2. Enter username: skhamis<br>3. Enter password: password123<br>4. Click Login | - Login successful<br>- Can access all institution data<br>- Has approval permissions for HR & Disciplinary modules<br>- Dashboard shows system-wide metrics |                    |               |
| 1.3         | Login as HRMO (CSC Role)                 | 1. Login with username: fiddi<br>2. Password: password123    | - Login successful<br>- Can view all institutions<br>- Has approval authority for Confirmation, Promotion, LWOP, Cadre Change, Retirement, Resignation, Service Extension<br>- Cannot access Complaints/Termination |                    |               |
| 1.4         | Login as DO (Disciplinary Officer)       | 1. Login with username: mussi<br>2. Password: password123    | - Login successful<br>- Access to all institutions<br>- Can approve Complaints, Termination, Dismissal<br>- Cannot access other HR modules |                    |               |
| 1.5         | Login as Planning Officer (Read-only)    | 1. Login with username: mishak<br>2. Password: password123   | - Login successful<br>- Can view reports from all modules<br>- Cannot approve or submit requests<br>- Read-only access to all institutions<br>- No dashboard access |                    |               |
| 1.6         | Login as CSC Secretary (Executive)       | 1. Login with username: zhaji<br>2. Password: password123    | - Login successful<br>- Can view all actions by HHRMD, HRMO, DO<br>- Dashboard shows task statuses<br>- Can access all employee profiles<br>- Can download all reports |                    |               |
| 1.7         | Login as HRRP (Institutional Supervisor) | 1. Login with username: kmhaji<br>2. Password: password123   | - Login successful<br>- Can view own institution's data only<br>- Dashboard shows institutional HR activities<br>- Can view employee profiles in institution<br>- Can track requests from institution |                    |               |
| 1.8         | Login as Administrator                   | 1. Login with username: akassim<br>2. Password: password123  | - Login successful<br>- Access to user management<br>- Can create/update/deactivate users<br>- Can create institutions<br>- Can reset passwords<br>- Access to HRIMS integration tools |                    |               |
| 1.9         | Employee Login with ZanID                | 1. Navigate to https://csms.zanajira.go.tz/employee-login<br>2. Enter valid ZanID<br>3. Enter payroll number<br>4. Enter ZSSF number<br>5. Submit | - Login successful<br>- Can view own profile<br>- Can submit complaints<br>- Can view own submitted complaints<br>- Cannot view other employees' data |                    |               |
| 1.10        | Invalid Login Credentials                | 1. Enter invalid username<br>2. Enter wrong password<br>3. Attempt login | - Login fails<br>- Error message displayed<br>- User not authenticated<br>- Redirected to login page |                    |               |
| 1.11        | Inactive User Account                    | 1. Login with deactivated user account<br>2. Submit credentials | - Login fails<br>- Message: "Account is not active"<br>- User cannot access system |                    |               |
| 1.12        | Session Management                       | 1. Login successfully<br>2. Navigate to multiple pages<br>3. Verify session persists | - Session maintained across pages<br>- User data accessible<br>- No repeated login required<br>- Logout clears session |                    |               |

---

### **Module:** Employee Confirmation Requests

### **Test Case No.: 2**

**Process/Function Name:** Employee Confirmation Request Submission and Approval

**Function Description:** This module handles confirmation of employees who have completed their probationary period. HRO submits confirmation requests which are reviewed and approved by HHRMD or HRMO. Upon approval, employee status changes from "On Probation" to "Confirmed" and confirmation date is recorded.

| **Case ID** | **Test Case Scenario**                                 | **Test Steps**                                                                                                                                                                                                       | **Expected Results**                                                                                                                                                                                                                                                             | **Actual Results** | **PASS/FAIL** | **Remarks** |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------- | ----------- |
| 2.1         | Submit Confirmation Request (HRO)                      | 1. Login as HRO (kmnyonge)<br>2. Navigate to Confirmation module<br>3. Click "New Confirmation Request"<br>4. Select employee on probation<br>5. Upload supporting documents (PDF)<br>6. Submit request              | - Request form loads<br>- Can select employees with "On Probation" status<br>- File upload works (PDF, max 2MB)<br>- Request submitted successfully<br>- Status: "Pending"<br>- Notification sent to HHRMD & DO<br>- Request ID generated                                        |                    |               |             |
| 2.2         | Restriction: Cannot Confirm Already Confirmed Employee | 1. Login as HRO<br>2. Attempt to submit confirmation for employee already confirmed<br>3. Submit                                                                                                                     | - System blocks submission<br>- Error: "Employee already confirmed"<br>- Request not created                                                                                                                                                                                     |                    |               |             |
| 2.3         | Document Upload - Valid PDF                            | 1. Create confirmation request<br>2. Upload PDF document (< 2MB)<br>3. Submit                                                                                                                                        | - PDF upload successful<br>- File stored in MinIO<br>- File reference saved in request<br>- Can download/preview uploaded file                                                                                                                                                   |                    |               |             |
| 2.4         | Document Upload - Invalid File Type                    | 1. Create confirmation request<br>2. Attempt to upload non-PDF file (e.g., .docx, .jpg)<br>3. Try to submit                                                                                                          | - File upload rejected<br>- Error: "Only PDF files allowed"<br>- Request not submitted                                                                                                                                                                                           |                    |               |             |
| 2.5         | Document Upload - Oversized File                       | 1. Create confirmation request<br>2. Upload PDF > 2MB<br>3. Attempt submit                                                                                                                                           | - Upload rejected<br>- Error: "File size exceeds 2MB limit"<br>- Request not submitted                                                                                                                                                                                           |                    |               |             |
| 2.6         | HHRMD Review and Approve                               | 1. Login as HHRMD (skhamis)<br>2. Navigate to Confirmations<br>3. View pending confirmation request<br>4. Review details and documents<br>5. Click "Approve"<br>6. Provide comments (optional)<br>7. Submit approval | - Pending requests visible<br>- Request details complete<br>- Documents downloadable/previewable<br>- Approval recorded<br>- Status changed to "Approved by Commission"<br>- Employee status updated to "Confirmed"<br>- confirmationDate recorded<br>- HRO notified of approval |                    |               |             |
| 2.7         | HRMO Review and Approve                                | 1. Login as HRMO (fiddi)<br>2. View pending confirmations<br>3. Approve a request                                                                                                                                    | - HRMO can approve confirmations<br>- Same approval flow as HHRMD<br>- Employee status updated correctly<br>- Notifications sent                                                                                                                                                 |                    |               |             |
| 2.8         | Reject Confirmation Request                            | 1. Login as HHRMD or HRMO<br>2. View pending confirmation<br>3. Click "Reject"<br>4. Enter rejection reason<br>5. Submit rejection                                                                                   | - Rejection reason required<br>- Status changed to "Rejected"<br>- Employee status remains "On Probation"<br>- HRO notified with rejection reason<br>- Request visible in history                                                                                                |                    |               |             |
| 2.9         | View Confirmation Request (CSC Secretary)              | 1. Login as CSCS (zhaji)<br>2. Navigate to dashboard<br>3. View confirmation requests                                                                                                                                | - Can see all confirmations<br>- View status (Pending, Approved, Rejected)<br>- Can see who approved/rejected<br>- Can view decision dates<br>- Cannot modify requests                                                                                                           |                    |               |             |
| 2.10        | Institution Filter (HRO)                               | 1. Login as HRO<br>2. View confirmations list                                                                                                                                                                        | - Only sees confirmations from own institution<br>- Cannot see other institutions' requests<br>- Filter applied automatically                                                                                                                                                    |                    |               |             |
| 2.11        | Institution Access (CSC Roles)                         | 1. Login as HHRMD/HRMO/DO<br>2. View confirmations list                                                                                                                                                              | - Can see confirmations from ALL institutions<br>- No institution filter restriction<br>- Can filter by institution manually                                                                                                                                                     |                    |               |             |
| 2.12        | Confirmation Report Generation                         | 1. Login as any CSC role<br>2. Navigate to Reports<br>3. Select "Confirmation Report"<br>4. Set date range<br>5. Generate report                                                                                     | - Report shows all confirmations in range<br>- Bilingual columns (English/Swahili)<br>- Status in Swahili (Imekamilika, Inasubiri, Imekataliwa)<br>- Can export to PDF/Excel<br>- Total count displayed                                                                          |                    |               |             |

---

continue prepare tables for other modules ....  and for other tests .....

---

### 

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

### 13.2 Request Type Summary

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

### 13.3 Employee Status Codes

| Status       | Description                   | Can Submit Requests                                        | Notes                         |
| ------------ | ----------------------------- | ---------------------------------------------------------- | ----------------------------- |
| On Probation | Initial hiring period         | Limited (no LWOP, Promotion, Cadre, Extension, Retirement) | Must complete probation first |
| Confirmed    | Passed probation              | Yes (all except Confirmation again)                        | Full active status            |
| On LWOP      | Leave without pay             | No (cannot submit new requests)                            | Temporary status              |
| Retired      | Employment ended (retirement) | No                                                         | Final status                  |
| Resigned     | Voluntarily left              | No                                                         | Final status                  |
| Terminated   | Involuntary separation        | No                                                         | Final status                  |
| Dismissed    | Disciplinary separation       | No                                                         | Final status                  |

### 13.4 File Upload Specifications

| Aspect                | Specification                                                                     |
| --------------------- | --------------------------------------------------------------------------------- |
| **Allowed File Type** | PDF only                                                                          |
| **Maximum File Size** | 2MB                                                                               |
| **Storage System**    | MinIO S3-Compatible Object Storage                                                |
| **Validation**        | Client-side and server-side                                                       |
| **Features**          | Upload, Download, Preview (in-browser)                                            |
| **Organization**      | By type: request-documents/, employee-photos/, employee-documents/, certificates/ |

### 13.5 Report Types and Swahili Translations

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

### 13.6 Status Translation Reference

| English Status                    | Swahili Translation        |
| --------------------------------- | -------------------------- |
| Approved / Approved by Commission | Imekamilika                |
| Pending                           | Inasubiri                  |
| Rejected                          | Imekataliwa                |
| Under Review                      | Inakaguliwa                |
| More Info Requested               | Taarifa Zaidi Zinahitajika |
| Resolved                          | Imetatuliwa                |

### 13.7 Technology Stack Reference

| Component            | Technology    | Version/Details                 |
| -------------------- | ------------- | ------------------------------- |
| **Framework**        | Next.js       | 14 (App Router)                 |
| **Database**         | PostgreSQL    | with Prisma ORM                 |
| **Storage**          | MinIO         | S3-compatible object storage    |
| **Authentication**   | Session-based | bcryptjs for password hashing   |
| **State Management** | Zustand       | For auth state                  |
| **Validation**       | Zod           | + React Hook Form               |
| **UI Components**    | Radix UI      | + shadcn/ui components          |
| **Styling**          | Tailwind CSS  | Utility-first CSS               |
| **Charts**           | Recharts      | Dashboard visualizations        |
| **PDF Generation**   | jsPDF         | + jsPDF-autotable for reports   |
| **Excel Export**     | XLSX          | Library for Excel files         |
| **AI Integration**   | Google Genkit | (if complaint rewriting tested) |

### 13.8 Glossary

| Term      | Definition                                                           |
| --------- | -------------------------------------------------------------------- |
| **CSMS**  | Civil Service Management System                                      |
| **CSC**   | Civil Service Commission - Central HR authority in Zanzibar          |
| **HRO**   | HR Officer - Institution-based role that submits requests            |
| **HHRMD** | Head of Human Resources Management Development - Senior CSC approver |
| **HRMO**  | Human Resource Management Officer - CSC approver for HR requests     |
| **DO**    | Disciplinary Officer - Handles complaints and terminations           |
| **PO**    | Planning Officer - Read-only access to reports                       |
| **CSCS**  | Civil Service Commission Secretary - Executive oversight             |
| **HRRP**  | Human Resource Responsible Personnel - Institutional supervisor      |
| **LWOP**  | Leave Without Pay                                                    |
| **ZanID** | Zanzibar National ID Number                                          |
| **ZSSF**  | Zanzibar Social Security Fund Number                                 |
| **MinIO** | Object storage system for files and documents                        |
| **HRIMS** | Human Resource Information Management System (external)              |
| **UAT**   | User Acceptance Testing                                              |

### 13.9 Common Test Scenarios Matrix

| Scenario                    | HRO | HHRMD | HRMO | DO  | EMPLOYEE | ADMIN   |
| --------------------------- | --- | ----- | ---- | --- | -------- | ------- |
| Submit Confirmation Request | ✓   | ✗     | ✗    | ✗   | ✗        | ✗       |
| Approve Confirmation        | ✗   | ✓     | ✓    | ✗   | ✗        | ✗       |
| Submit Complaint            | ✗   | ✗     | ✗    | ✗   | ✓        | ✗       |
| Handle Complaint            | ✗   | ✓     | ✗    | ✓   | ✗        | ✗       |
| Approve Termination         | ✗   | ✓     | ✗    | ✓   | ✗        | ✗       |
| View All Institutions       | ✗   | ✓     | ✓    | ✓   | ✗        | ✓       |
| Generate Reports            | ✗   | ✓     | ✓    | ✓   | ✗        | ✓       |
| View Reports Only           | ✗   | ✗     | ✗    | ✗   | ✗        | PO role |
| Create Users                | ✗   | ✗     | ✗    | ✗   | ✗        | ✓       |
| Create Institutions         | ✗   | ✗     | ✗    | ✗   | ✗        | ✓       |
| HRIMS Integration           | ✗   | ✗     | ✗    | ✗   | ✗        | ✓       |

---

**End of UAT Document**

_Version: 1.0_
_Date: 
_Document Status: Ready for UAT Execution_
_Based on: Actual CSMS Implementation Analysis_
_System URL: https://csms.zanajira.go.tz_

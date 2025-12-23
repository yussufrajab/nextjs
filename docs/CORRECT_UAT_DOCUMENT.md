# USER ACCEPTANCE TEST (UAT) DOCUMENT
## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | User Acceptance Test - Civil Service Management System |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Date Prepared** | December 23, 2025 |
| **Test Environment** | https://csms.zanajira.go.tz |
| **Employee Login URL** | https://csms.zanajira.go.tz/employee-login |
| **Prepared By** | ___________________ |
| **Reviewed By** | ___________________ |
| **Approved By** | ___________________ |

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

---

## 2. Test Environment

### 2.1 System Access

| Component | Specification |
|-----------|--------------|
| **Production URL** | https://csms.zanajira.go.tz |
| **Employee Portal** | https://csms.zanajira.go.tz/employee-login |
| **Framework** | Next.js 14 Full-Stack Application |
| **Database** | PostgreSQL with Prisma ORM |
| **Storage** | MinIO S3-Compatible Object Storage |
| **Port** | 9002 |

### 2.2 Test User Accounts

| Role | Username | Password | Institution Access | Description |
|------|----------|----------|-------------------|-------------|
| **HRO** | kmnyonge | password123 | Institution only | HR Officer - Submits requests |
| **HHRMD** | skhamis | password123 | All institutions | Head of HR - Approves HR & Disciplinary |
| **HRMO** | fiddi | password123 | All institutions | HR Management Officer - Approves HR requests |
| **DO** | mussi | password123 | All institutions | Disciplinary Officer - Handles complaints |
| **PO** | mishak | password123 | All institutions (read-only) | Planning Officer - Views reports |
| **CSCS** | zhaji | password123 | All institutions | CSC Secretary - Executive oversight |
| **HRRP** | kmhaji | password123 | Institution only | HR Responsible Personnel - Institutional supervisor |
| **ADMIN** | akassim | password123 | System-wide | Administrator - System management |
| **EMPLOYEE** | (See Note) | N/A | Own data only | Employee - Submit complaints, view profile |

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

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 1.1 | Login as HRO (Institution-based) | 1. Navigate to https://csms.zanajira.go.tz<br>2. Enter username: kmnyonge<br>3. Enter password: password123<br>4. Click Login | - Login successful<br>- Redirected to dashboard<br>- Can only see own institution's data<br>- Welcome notification created<br>- User role displayed correctly | | | |
| 1.2 | Login as HHRMD (CSC Role) | 1. Navigate to login page<br>2. Enter username: skhamis<br>3. Enter password: password123<br>4. Click Login | - Login successful<br>- Can access all institution data<br>- Has approval permissions for HR & Disciplinary modules<br>- Dashboard shows system-wide metrics | | | |
| 1.3 | Login as HRMO (CSC Role) | 1. Login with username: fiddi<br>2. Password: password123 | - Login successful<br>- Can view all institutions<br>- Has approval authority for Confirmation, Promotion, LWOP, Cadre Change, Retirement, Resignation, Service Extension<br>- Cannot access Complaints/Termination | | | |
| 1.4 | Login as DO (Disciplinary Officer) | 1. Login with username: mussi<br>2. Password: password123 | - Login successful<br>- Access to all institutions<br>- Can approve Complaints, Termination, Dismissal<br>- Cannot access other HR modules | | | |
| 1.5 | Login as Planning Officer (Read-only) | 1. Login with username: mishak<br>2. Password: password123 | - Login successful<br>- Can view reports from all modules<br>- Cannot approve or submit requests<br>- Read-only access to all institutions<br>- No dashboard access | | | |
| 1.6 | Login as CSC Secretary (Executive) | 1. Login with username: zhaji<br>2. Password: password123 | - Login successful<br>- Can view all actions by HHRMD, HRMO, DO<br>- Dashboard shows task statuses<br>- Can access all employee profiles<br>- Can download all reports | | | |
| 1.7 | Login as HRRP (Institutional Supervisor) | 1. Login with username: kmhaji<br>2. Password: password123 | - Login successful<br>- Can view own institution's data only<br>- Dashboard shows institutional HR activities<br>- Can view employee profiles in institution<br>- Can track requests from institution | | | |
| 1.8 | Login as Administrator | 1. Login with username: akassim<br>2. Password: password123 | - Login successful<br>- Access to user management<br>- Can create/update/deactivate users<br>- Can create institutions<br>- Can reset passwords<br>- Access to HRIMS integration tools | | | |
| 1.9 | Employee Login with ZanID | 1. Navigate to https://csms.zanajira.go.tz/employee-login<br>2. Enter valid ZanID<br>3. Enter payroll number<br>4. Enter ZSSF number<br>5. Submit | - Login successful<br>- Can view own profile<br>- Can submit complaints<br>- Can view own submitted complaints<br>- Cannot view other employees' data | | | |
| 1.10 | Invalid Login Credentials | 1. Enter invalid username<br>2. Enter wrong password<br>3. Attempt login | - Login fails<br>- Error message displayed<br>- User not authenticated<br>- Redirected to login page | | | |
| 1.11 | Inactive User Account | 1. Login with deactivated user account<br>2. Submit credentials | - Login fails<br>- Message: "Account is not active"<br>- User cannot access system | | | |
| 1.12 | Session Management | 1. Login successfully<br>2. Navigate to multiple pages<br>3. Verify session persists | - Session maintained across pages<br>- User data accessible<br>- No repeated login required<br>- Logout clears session | | | |

---

### **Module:** Employee Confirmation Requests
### **Test Case No.: 2**

**Process/Function Name:** Employee Confirmation Request Submission and Approval

**Function Description:** This module handles confirmation of employees who have completed their probationary period. HRO submits confirmation requests which are reviewed and approved by HHRMD or HRMO. Upon approval, employee status changes from "On Probation" to "Confirmed" and confirmation date is recorded.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 2.1 | Submit Confirmation Request (HRO) | 1. Login as HRO (kmnyonge)<br>2. Navigate to Confirmation module<br>3. Click "New Confirmation Request"<br>4. Select employee on probation<br>5. Upload supporting documents (PDF)<br>6. Submit request | - Request form loads<br>- Can select employees with "On Probation" status<br>- File upload works (PDF, max 2MB)<br>- Request submitted successfully<br>- Status: "Pending"<br>- Notification sent to HHRMD & DO<br>- Request ID generated | | | |
| 2.2 | Restriction: Cannot Confirm Already Confirmed Employee | 1. Login as HRO<br>2. Attempt to submit confirmation for employee already confirmed<br>3. Submit | - System blocks submission<br>- Error: "Employee already confirmed"<br>- Request not created | | | |
| 2.3 | Document Upload - Valid PDF | 1. Create confirmation request<br>2. Upload PDF document (< 2MB)<br>3. Submit | - PDF upload successful<br>- File stored in MinIO<br>- File reference saved in request<br>- Can download/preview uploaded file | | | |
| 2.4 | Document Upload - Invalid File Type | 1. Create confirmation request<br>2. Attempt to upload non-PDF file (e.g., .docx, .jpg)<br>3. Try to submit | - File upload rejected<br>- Error: "Only PDF files allowed"<br>- Request not submitted | | | |
| 2.5 | Document Upload - Oversized File | 1. Create confirmation request<br>2. Upload PDF > 2MB<br>3. Attempt submit | - Upload rejected<br>- Error: "File size exceeds 2MB limit"<br>- Request not submitted | | | |
| 2.6 | HHRMD Review and Approve | 1. Login as HHRMD (skhamis)<br>2. Navigate to Confirmations<br>3. View pending confirmation request<br>4. Review details and documents<br>5. Click "Approve"<br>6. Provide comments (optional)<br>7. Submit approval | - Pending requests visible<br>- Request details complete<br>- Documents downloadable/previewable<br>- Approval recorded<br>- Status changed to "Approved by Commission"<br>- Employee status updated to "Confirmed"<br>- confirmationDate recorded<br>- HRO notified of approval | | | |
| 2.7 | HRMO Review and Approve | 1. Login as HRMO (fiddi)<br>2. View pending confirmations<br>3. Approve a request | - HRMO can approve confirmations<br>- Same approval flow as HHRMD<br>- Employee status updated correctly<br>- Notifications sent | | | |
| 2.8 | Reject Confirmation Request | 1. Login as HHRMD or HRMO<br>2. View pending confirmation<br>3. Click "Reject"<br>4. Enter rejection reason<br>5. Submit rejection | - Rejection reason required<br>- Status changed to "Rejected"<br>- Employee status remains "On Probation"<br>- HRO notified with rejection reason<br>- Request visible in history | | | |
| 2.9 | View Confirmation Request (CSC Secretary) | 1. Login as CSCS (zhaji)<br>2. Navigate to dashboard<br>3. View confirmation requests | - Can see all confirmations<br>- View status (Pending, Approved, Rejected)<br>- Can see who approved/rejected<br>- Can view decision dates<br>- Cannot modify requests | | | |
| 2.10 | Institution Filter (HRO) | 1. Login as HRO<br>2. View confirmations list | - Only sees confirmations from own institution<br>- Cannot see other institutions' requests<br>- Filter applied automatically | | | |
| 2.11 | Institution Access (CSC Roles) | 1. Login as HHRMD/HRMO/DO<br>2. View confirmations list | - Can see confirmations from ALL institutions<br>- No institution filter restriction<br>- Can filter by institution manually | | | |
| 2.12 | Confirmation Report Generation | 1. Login as any CSC role<br>2. Navigate to Reports<br>3. Select "Confirmation Report"<br>4. Set date range<br>5. Generate report | - Report shows all confirmations in range<br>- Bilingual columns (English/Swahili)<br>- Status in Swahili (Imekamilika, Inasubiri, Imekataliwa)<br>- Can export to PDF/Excel<br>- Total count displayed | | | |

---

### **Module:** Promotion Requests
### **Test Case No.: 3**

**Process/Function Name:** Employee Promotion Request Submission and Approval

**Function Description:** This module manages promotion requests with two types: Experience-based (requires 3 years performance appraisals) and Education-based (requires educational certificates). HRO submits promotion requests which are approved by HHRMD or HRMO. Upon approval, employee cadre is updated.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 3.1 | Submit Experience-Based Promotion | 1. Login as HRO<br>2. Navigate to Promotions<br>3. Click "New Promotion Request"<br>4. Select employee<br>5. Select promotion type: "Experience-based"<br>6. Enter proposed cadre<br>7. Upload required documents:<br>&nbsp;&nbsp;- Performance appraisal Y1<br>&nbsp;&nbsp;- Performance appraisal Y2<br>&nbsp;&nbsp;- Performance appraisal Y3<br>&nbsp;&nbsp;- CSC promotion form<br>&nbsp;&nbsp;- Letter of request<br>8. Submit | - Form loads correctly<br>- Promotion type dropdown functional<br>- Proposed cadre field editable<br>- All 5 document uploads work<br>- Documents stored in MinIO<br>- Request submitted successfully<br>- Status: "Pending"<br>- Notifications sent to HHRMD & DO | | | |
| 3.2 | Submit Education-Based Promotion | 1. Login as HRO<br>2. Create new promotion request<br>3. Select promotion type: "Education-based"<br>4. Enter proposed cadre<br>5. Upload required documents:<br>&nbsp;&nbsp;- Educational certificate<br>&nbsp;&nbsp;- TCU form (if studied outside country)<br>&nbsp;&nbsp;- Letter of request<br>6. Submit | - Education-based type selectable<br>- Required documents different from experience<br>- "Studied Outside Country" checkbox works<br>- All documents uploaded successfully<br>- Request created with correct type<br>- Notifications sent | | | |
| 3.3 | Employee Status Restriction - On Probation | 1. Login as HRO<br>2. Attempt to submit promotion for employee with status "On Probation"<br>3. Submit | - System blocks submission<br>- Error: "Cannot submit promotion for employee on probation"<br>- Request not created | | | |
| 3.4 | Employee Status Restriction - On LWOP | 1. Attempt promotion for employee "On LWOP"<br>2. Submit | - Submission blocked<br>- Error message displayed<br>- Request not created | | | |
| 3.5 | Employee Status Restriction - Separated | 1. Attempt promotion for:<br>&nbsp;&nbsp;- Retired employee<br>&nbsp;&nbsp;- Resigned employee<br>&nbsp;&nbsp;- Terminated employee<br>&nbsp;&nbsp;- Dismissed employee | - All attempts blocked<br>- Error messages displayed<br>- No requests created for separated employees | | | |
| 3.6 | HHRMD Approve Promotion | 1. Login as HHRMD (skhamis)<br>2. View pending promotions<br>3. Open specific request<br>4. Review promotion type and documents<br>5. Click "Approve"<br>6. Add comments<br>7. Submit approval | - Pending promotions visible<br>- All details and documents accessible<br>- Promotion type clearly displayed<br>- Proposed cadre shown<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee cadre updated to proposed cadre<br>- HRO notified | | | |
| 3.7 | HRMO Approve Promotion | 1. Login as HRMO (fiddi)<br>2. Approve a pending promotion | - HRMO has approval authority<br>- Same workflow as HHRMD<br>- Cadre updated on approval<br>- Notifications sent | | | |
| 3.8 | Reject Promotion with Reason | 1. Login as HHRMD or HRMO<br>2. View pending promotion<br>3. Click "Reject"<br>4. Enter detailed rejection reason<br>5. Submit | - Rejection reason mandatory<br>- Status: "Rejected"<br>- Employee cadre NOT updated<br>- HRO notified with reason<br>- Request in history | | | |
| 3.9 | View All Documents in Promotion | 1. Login as HHRMD<br>2. Open promotion request<br>3. View all uploaded documents<br>4. Download each document<br>5. Preview documents | - All documents listed<br>- Document names shown<br>- Download links work<br>- PDF preview functional<br>- Files open correctly | | | |
| 3.10 | Promotion Report with Types | 1. Login as CSC role<br>2. Navigate to Reports<br>3. Generate "Promotion Report"<br>4. Filter by date range | - Report shows all promotions<br>- Promotion type column included (Experience/Education)<br>- Proposed cadre shown<br>- Status in Swahili<br>- Bilingual columns<br>- Export works | | | |

---

### **Module:** Leave Without Pay (LWOP) Requests
### **Test Case No.: 4**

**Process/Function Name:** LWOP Request Submission and Approval

**Function Description:** This module handles Leave Without Pay requests where employees request unpaid leave for specified duration. HRO submits LWOP requests with start date, end date, duration, and reason. Upon approval by HHRMD or HRMO, employee status changes to "On LWOP".

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 4.1 | Submit LWOP Request | 1. Login as HRO<br>2. Navigate to LWOP module<br>3. Click "New LWOP Request"<br>4. Select employee<br>5. Enter start date<br>6. Enter end date<br>7. Enter duration (e.g., "6 months")<br>8. Enter reason for LWOP<br>9. Upload supporting documents<br>10. Submit | - LWOP form loads<br>- Date pickers functional<br>- Duration field accepts text<br>- Reason field required<br>- Document upload works<br>- Request submitted<br>- Status: "Pending"<br>- Notifications sent to HHRMD & DO | | | |
| 4.2 | Date Validation | 1. Create LWOP request<br>2. Enter end date before start date<br>3. Attempt submit | - Validation error displayed<br>- Error: "End date must be after start date"<br>- Form submission blocked | | | |
| 4.3 | Restriction - Employee Already On LWOP | 1. Attempt to submit LWOP for employee with status "On LWOP"<br>2. Submit | - System blocks submission<br>- Error: "Employee already on LWOP"<br>- Request not created | | | |
| 4.4 | HHRMD Approve LWOP | 1. Login as HHRMD<br>2. View pending LWOP requests<br>3. Review request details (dates, duration, reason)<br>4. Approve request | - Pending requests visible<br>- All details shown (start, end, duration, reason)<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee status changed to "On LWOP"<br>- HRO notified | | | |
| 4.5 | HRMO Approve LWOP | 1. Login as HRMO<br>2. Approve LWOP request | - HRMO can approve<br>- Employee status updated to "On LWOP"<br>- Notifications sent | | | |
| 4.6 | Reject LWOP Request | 1. Login as HHRMD or HRMO<br>2. Reject LWOP<br>3. Provide rejection reason | - Rejection reason required<br>- Status: "Rejected"<br>- Employee status unchanged<br>- HRO notified with reason | | | |
| 4.7 | LWOP Report Generation | 1. Navigate to Reports<br>2. Select "LWOP Report"<br>3. Set date range<br>4. Generate | - Report shows all LWOP requests<br>- Includes start date, end date, duration<br>- Reason displayed<br>- Status in Swahili<br>- Export works | | | |
| 4.8 | Track LWOP Status | 1. Login as HRO<br>2. Navigate to Track Status<br>3. Filter by LWOP requests | - All LWOP requests listed<br>- Current status visible<br>- Can view request details<br>- Timeline shown | | | |

---

### **Module:** Cadre Change Requests
### **Test Case No.: 5**

**Process/Function Name:** Employee Cadre Change Request and Approval

**Function Description:** This module handles requests for changing employee cadre/professional category. HRO submits cadre change requests specifying new cadre and reason. Optional field indicates if employee studied outside country. Upon approval, employee cadre is updated.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 5.1 | Submit Cadre Change Request | 1. Login as HRO<br>2. Navigate to Cadre Change<br>3. Click "New Request"<br>4. Select employee<br>5. View current cadre (auto-displayed)<br>6. Enter new cadre<br>7. Enter reason for change<br>8. Check "Studied Outside Country" if applicable<br>9. Upload supporting documents<br>10. Submit | - Form loads correctly<br>- Current cadre auto-populated<br>- New cadre field editable<br>- Reason field required<br>- "Studied Outside Country" checkbox functional<br>- Document upload works<br>- Request submitted<br>- Status: "Pending"<br>- Notifications sent | | | |
| 5.2 | Employee Status Restrictions | 1. Attempt cadre change for employee:<br>&nbsp;&nbsp;- On Probation<br>&nbsp;&nbsp;- On LWOP<br>&nbsp;&nbsp;- Retired<br>&nbsp;&nbsp;- Resigned<br>&nbsp;&nbsp;- Terminated<br>&nbsp;&nbsp;- Dismissed | - All submissions blocked<br>- Error messages displayed<br>- No requests created | | | |
| 5.3 | HHRMD Approve Cadre Change | 1. Login as HHRMD<br>2. View pending cadre change<br>3. Review current vs new cadre<br>4. Review reason and documents<br>5. Approve request | - Request details complete<br>- Current and new cadre clearly shown<br>- Reason visible<br>- "Studied Outside" flag shown if checked<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee cadre updated to new cadre<br>- HRO notified | | | |
| 5.4 | HRMO Approve Cadre Change | 1. Login as HRMO<br>2. Approve cadre change | - HRMO has approval authority<br>- Cadre updated on approval<br>- Workflow same as HHRMD | | | |
| 5.5 | Reject Cadre Change | 1. Login as HHRMD/HRMO<br>2. Reject request<br>3. Provide reason | - Rejection reason required<br>- Status: "Rejected"<br>- Employee cadre NOT updated<br>- Notification sent with reason | | | |
| 5.6 | Cadre Change Report | 1. Navigate to Reports<br>2. Generate "Cadre Change Report"<br>3. Filter by date | - Report shows all cadre changes<br>- Shows old and new cadre<br>- Reason included<br>- Status displayed<br>- Export functional | | | |

---

### **Module:** Retirement Requests
### **Test Case No.: 6**

**Process/Function Name:** Employee Retirement Request Submission and Approval

**Function Description:** This module manages retirement requests with three types: Voluntary (employee choice), Compulsory (reaching retirement age), and Illness (health-related). HRO submits retirement requests with proposed date and type-specific details. Upon approval, employee status changes to "Retired".

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 6.1 | Submit Voluntary Retirement | 1. Login as HRO<br>2. Navigate to Retirement<br>3. Click "New Request"<br>4. Select employee<br>5. Select retirement type: "Voluntary"<br>6. Enter proposed retirement date<br>7. Upload supporting documents<br>8. Submit | - Retirement form loads<br>- Type dropdown shows 3 options<br>- Voluntary selected<br>- Proposed date field functional<br>- Document upload works<br>- Request submitted<br>- Status: "Pending"<br>- Notifications sent | | | |
| 6.2 | Submit Compulsory Retirement | 1. Login as HRO<br>2. Create retirement request<br>3. Select type: "Compulsory"<br>4. Enter proposed date<br>5. Submit | - Compulsory type selectable<br>- For employees reaching retirement age<br>- Request created successfully<br>- Type recorded correctly | | | |
| 6.3 | Submit Illness-Based Retirement | 1. Login as HRO<br>2. Create retirement request<br>3. Select type: "Illness"<br>4. Enter illness description (required for this type)<br>5. Enter proposed date<br>6. Upload medical documents<br>7. Submit | - Illness type selectable<br>- Illness description field appears<br>- Description required for illness type<br>- Medical documents uploadable<br>- Request submitted<br>- Illness description saved | | | |
| 6.4 | Retirement with Delay Reason | 1. Create retirement request<br>2. Enter delay reason (optional field)<br>3. Submit | - Delay reason field available<br>- Optional field (not required)<br>- Saved if provided<br>- Request submitted successfully | | | |
| 6.5 | HHRMD Approve Retirement | 1. Login as HHRMD<br>2. View pending retirement<br>3. Review type (Voluntary/Compulsory/Illness)<br>4. Review proposed date<br>5. Review illness description if applicable<br>6. Approve | - Retirement type clearly displayed<br>- Proposed date shown<br>- Illness description visible for illness type<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee status changed to "Retired"<br>- retirementDate updated<br>- HRO notified | | | |
| 6.6 | HRMO Approve Retirement | 1. Login as HRMO<br>2. Approve retirement request | - HRMO can approve<br>- Employee status updated to "Retired"<br>- Retirement date recorded | | | |
| 6.7 | Reject Retirement | 1. Login as HHRMD/HRMO<br>2. Reject retirement<br>3. Provide reason | - Rejection reason required<br>- Status: "Rejected"<br>- Employee status unchanged<br>- Notification sent | | | |
| 6.8 | Retirement Report by Type | 1. Navigate to Reports<br>2. Generate "Retirement Report"<br>3. View all 3 types | - Report shows all retirements<br>- Type column (Voluntary/Compulsory/Illness)<br>- Proposed date shown<br>- Illness description for illness type<br>- Status displayed<br>- Export works | | | |

---

### **Module:** Resignation Requests
### **Test Case No.: 7**

**Process/Function Name:** Employee Resignation Request and Approval

**Function Description:** This module handles voluntary resignation requests. HRO submits resignation with effective date and reason. Upon approval by HHRMD or HRMO, employee status changes to "Resigned".

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 7.1 | Submit Resignation Request | 1. Login as HRO<br>2. Navigate to Resignation<br>3. Click "New Request"<br>4. Select employee<br>5. Enter effective resignation date<br>6. Enter reason for resignation<br>7. Upload supporting documents<br>8. Submit | - Resignation form loads<br>- Effective date picker works<br>- Reason field required<br>- Document upload functional<br>- Request submitted<br>- Status: "Pending"<br>- Notifications sent to HHRMD & DO | | | |
| 7.2 | HHRMD Approve Resignation | 1. Login as HHRMD<br>2. View pending resignations<br>3. Review effective date and reason<br>4. Approve | - Pending resignations visible<br>- Effective date and reason shown<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee status changed to "Resigned"<br>- HRO notified | | | |
| 7.3 | HRMO Approve Resignation | 1. Login as HRMO<br>2. Approve resignation | - HRMO can approve<br>- Employee status updated to "Resigned"<br>- Notifications sent | | | |
| 7.4 | Reject Resignation | 1. Login as HHRMD/HRMO<br>2. Reject resignation<br>3. Provide reason | - Rejection reason required<br>- Status: "Rejected"<br>- Employee status unchanged<br>- Notification sent | | | |
| 7.5 | Resignation Report | 1. Navigate to Reports<br>2. Generate "Resignation Report"<br>3. Filter by date | - Report shows all resignations<br>- Effective date column<br>- Reason displayed<br>- Status shown<br>- Export works | | | |

---

### **Module:** Service Extension Requests
### **Test Case No.: 8**

**Process/Function Name:** Service Extension Request and Approval

**Function Description:** This module handles requests to extend employment beyond retirement age. HRO submits extension requests with current retirement date, requested extension period, and justification. Upon approval by HHRMD or HRMO, retirement date is extended.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 8.1 | Submit Service Extension Request | 1. Login as HRO<br>2. Navigate to Service Extension<br>3. Click "New Request"<br>4. Select employee (near retirement)<br>5. View current retirement date (auto-displayed)<br>6. Enter requested extension period (e.g., "2 years")<br>7. Enter detailed justification<br>8. Upload supporting documents<br>9. Submit | - Form loads correctly<br>- Current retirement date shown<br>- Extension period field accepts text<br>- Justification field required<br>- Document upload works<br>- Request submitted<br>- Status: "Pending"<br>- Notifications sent | | | |
| 8.2 | Restriction - Employee On Probation | 1. Attempt service extension for employee "On Probation"<br>2. Submit | - Submission blocked<br>- Error: "Cannot extend service for employee on probation"<br>- Request not created | | | |
| 8.3 | HHRMD Approve Service Extension | 1. Login as HHRMD<br>2. View pending service extensions<br>3. Review current retirement date<br>4. Review requested period and justification<br>5. Approve | - Request details complete<br>- Current retirement date shown<br>- Extension period visible<br>- Justification readable<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee retirement date extended<br>- HRO notified | | | |
| 8.4 | HRMO Approve Service Extension | 1. Login as HRMO<br>2. Approve extension | - HRMO can approve<br>- Retirement date updated<br>- Workflow same as HHRMD | | | |
| 8.5 | Reject Service Extension | 1. Login as HHRMD/HRMO<br>2. Reject extension<br>3. Provide reason | - Rejection reason required<br>- Status: "Rejected"<br>- Retirement date NOT changed<br>- Notification sent | | | |
| 8.6 | Service Extension Report | 1. Navigate to Reports<br>2. Generate "Service Extension Report" | - Report shows all extensions<br>- Current retirement date<br>- Requested period<br>- Justification<br>- Status shown<br>- Export works | | | |

---

### **Module:** Termination and Dismissal Requests
### **Test Case No.: 9**

**Process/Function Name:** Employee Termination/Dismissal Request and Approval

**Function Description:** This module handles involuntary separation requests. Uses SeparationRequest model with two types: TERMINATION (normal separation) and DISMISSAL (disciplinary). Only approved by HHRMD or DO (not HRMO). Upon approval, employee status changes to "Terminated" or "Dismissed".

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 9.1 | Submit Termination Request | 1. Login as HRO<br>2. Navigate to Termination<br>3. Click "New Request"<br>4. Select employee<br>5. Select type: "TERMINATION"<br>6. Enter reason for termination<br>7. Upload supporting documents<br>8. Submit | - Termination form loads<br>- Type dropdown shows TERMINATION and DISMISSAL<br>- Reason field required<br>- Document upload works<br>- Request submitted<br>- Status: "Pending"<br>- Notifications sent to HHRMD & DO | | | |
| 9.2 | Submit Dismissal Request | 1. Login as HRO<br>2. Create new request<br>3. Select type: "DISMISSAL"<br>4. Enter disciplinary reason<br>5. Upload evidence documents<br>6. Submit | - DISMISSAL type selectable<br>- For disciplinary cases<br>- Reason required<br>- Documents uploaded<br>- Request created<br>- Type: DISMISSAL | | | |
| 9.3 | HHRMD Approve Termination | 1. Login as HHRMD<br>2. View pending terminations<br>3. Review type and reason<br>4. Approve | - Type clearly shown (TERMINATION/DISMISSAL)<br>- Reason visible<br>- Documents accessible<br>- Approval recorded<br>- Status: "Approved by Commission"<br>- Employee status changed to "Terminated" or "Dismissed"<br>- HRO notified | | | |
| 9.4 | DO Approve Dismissal | 1. Login as DO (mussi)<br>2. View pending dismissals<br>3. Approve dismissal request | - DO has approval authority for terminations<br>- Can approve DISMISSAL type<br>- Employee status updated to "Dismissed"<br>- Notifications sent | | | |
| 9.5 | HRMO Cannot Approve Termination | 1. Login as HRMO (fiddi)<br>2. Navigate to Termination module<br>3. Verify access | - HRMO does NOT have access to Termination module<br>- Cannot view or approve terminations<br>- Module not visible in navigation | | | |
| 9.6 | Reject Termination/Dismissal | 1. Login as HHRMD or DO<br>2. Reject request<br>3. Provide detailed reason | - Rejection reason required<br>- Status: "Rejected"<br>- Employee status unchanged<br>- Notification sent with reason | | | |
| 9.7 | Termination Report | 1. Navigate to Reports<br>2. Generate "Termination Report"<br>3. Filter by date | - Report shows all terminations and dismissals<br>- Type column (TERMINATION/DISMISSAL)<br>- Reason displayed<br>- Status shown<br>- Export works | | | |

---

### **Module:** Complaint Management
### **Test Case No.: 10**

**Process/Function Name:** Employee Complaint Submission and Resolution

**Function Description:** This module allows employees to submit complaints/grievances which are handled by HHRMD or DO. Employees can login via employee portal using ZanID, payroll number, and ZSSF number. Complaints have review workflow with status tracking and notifications in Swahili.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 10.1 | Employee Login for Complaint | 1. Navigate to https://csms.zanajira.go.tz/employee-login<br>2. Enter valid ZanID<br>3. Enter payroll number<br>4. Enter ZSSF number<br>5. Click Submit | - Employee login form loads<br>- All 3 fields required<br>- Login successful with correct credentials<br>- Redirected to employee dashboard<br>- Can view own profile<br>- Cannot see other employees' data | | | |
| 10.2 | Submit Complaint as Employee | 1. Login as employee<br>2. Navigate to Complaints<br>3. Click "Submit Complaint"<br>4. Select complaint type<br>5. Enter subject (min 5 chars)<br>6. Enter details (min 20 chars)<br>7. Enter complainant phone number<br>8. Enter next of kin phone number<br>9. Upload attachments (optional)<br>10. Submit | - Complaint form loads<br>- Complaint type dropdown populated<br>- Subject requires min 5 characters<br>- Details requires min 20 characters<br>- Phone number fields required<br>- Attachment upload optional (PDF, 2MB max)<br>- Complaint submitted<br>- Case ID generated<br>- Notification sent in Swahili to HHRMD & DO | | | |
| 10.3 | Complaint Subject Validation | 1. Create complaint<br>2. Enter subject with less than 5 characters<br>3. Attempt submit | - Validation error<br>- Error: "Subject must be at least 5 characters"<br>- Form not submitted | | | |
| 10.4 | Complaint Details Validation | 1. Create complaint<br>2. Enter details with less than 20 characters<br>3. Attempt submit | - Validation error<br>- Error: "Details must be at least 20 characters"<br>- Form not submitted | | | |
| 10.5 | HHRMD Review Complaint | 1. Login as HHRMD (skhamis)<br>2. View complaints list<br>3. Open specific complaint<br>4. Review case ID, type, subject, details<br>5. View attachments if any<br>6. Take action (Resolve, Request more info) | - Complaints visible to HHRMD<br>- All details shown (type, subject, details, phone numbers)<br>- Case ID displayed<br>- Attachments downloadable<br>- Can update status<br>- Can add officer comments<br>- Action recorded | | | |
| 10.6 | DO Review Complaint | 1. Login as DO (mussi)<br>2. View complaints<br>3. Handle complaint | - DO can view all complaints<br>- Same access as HHRMD<br>- Can resolve complaints<br>- Can request more info<br>- Actions recorded | | | |
| 10.7 | Assign Officer to Complaint | 1. Login as HHRMD or DO<br>2. Open complaint<br>3. Assign to specific officer role<br>4. Save assignment | - assignedOfficerRole field available<br>- Can assign to specific role<br>- Assignment saved<br>- Assigned officer notified | | | |
| 10.8 | Resolve Complaint | 1. Login as HHRMD or DO<br>2. Open complaint<br>3. Add resolution notes<br>4. Mark as "Resolved"<br>5. Submit | - Resolution notes field available<br>- Status changed to "Resolved"<br>- Employee notified in Swahili<br>- Resolution visible to employee | | | |
| 10.9 | Request More Information | 1. Login as HHRMD or DO<br>2. Open complaint<br>3. Select "Request More Info"<br>4. Enter what info is needed<br>5. Submit | - Status updated to "More Info Requested"<br>- Employee notified in Swahili<br>- Employee can respond with additional info | | | |
| 10.10 | Employee View Complaint Status | 1. Login as employee<br>2. Navigate to "My Complaints"<br>3. View submitted complaints | - All own complaints listed<br>- Case ID visible<br>- Status clearly shown<br>- Can view details<br>- Can see officer comments<br>- Cannot see other employees' complaints | | | |
| 10.11 | Complaint Notification in Swahili | 1. Submit complaint as employee<br>2. Check HHRMD/DO notifications | - Notification sent in Swahili<br>- Includes case ID<br>- Contains link to complaint<br>- Professional Swahili language | | | |
| 10.12 | Complaints Report | 1. Navigate to Reports<br>2. Generate "Complaints Report"<br>3. Filter by date range | - Report shows all complaints<br>- Case ID, type, subject displayed<br>- Status shown<br>- Resolution notes if resolved<br>- Export works | | | |
| 10.13 | HRMO Cannot Access Complaints | 1. Login as HRMO (fiddi)<br>2. Check for Complaints module | - HRMO does NOT have access to Complaints<br>- Module not visible<br>- Only HHRMD and DO can handle complaints | | | |

---

### **Module:** Employee Profile Management
### **Test Case No.: 11**

**Process/Function Name:** Employee Profile Viewing and Updates

**Function Description:** This module displays comprehensive employee information including personal details, employment info, contact data, and documents. Different roles have different viewing permissions. CSC roles can view all employees, institution-based roles only their institution.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 11.1 | View Employee Profile (HRO) | 1. Login as HRO<br>2. Navigate to Employees<br>3. Search for employee in own institution<br>4. View profile | - Can search employees<br>- Only sees employees from own institution<br>- Profile shows:<br>&nbsp;&nbsp;• Name, gender, date of birth<br>&nbsp;&nbsp;• ZanID, payroll number, ZSSF number<br>&nbsp;&nbsp;• Cadre, salary scale<br>&nbsp;&nbsp;• Department, ministry<br>&nbsp;&nbsp;• Employment dates<br>&nbsp;&nbsp;• Status (On Probation, Confirmed, etc.)<br>&nbsp;&nbsp;• Contact info<br>&nbsp;&nbsp;• Profile photo if available | | | |
| 11.2 | View Employee Profile (CSC Roles) | 1. Login as HHRMD/HRMO/DO<br>2. Navigate to Employees<br>3. Search any employee<br>4. View profile | - Can search ALL employees across institutions<br>- No institution filter<br>- Full profile access<br>- All fields visible | | | |
| 11.3 | View Employee Documents | 1. View employee profile<br>2. Navigate to Documents section<br>3. View available documents:<br>&nbsp;&nbsp;- Ardhil Hali<br>&nbsp;&nbsp;- Birth Certificate<br>&nbsp;&nbsp;- Confirmation Letter<br>&nbsp;&nbsp;- Job Contract | - Documents section visible<br>- Document URLs displayed if exist<br>- Can download/preview each document<br>- PDF files open correctly | | | |
| 11.4 | View Employee Photo | 1. View employee profile<br>2. Check profile photo | - Profile photo displayed if exists<br>- Photo loads from MinIO<br>- Image displays correctly<br>- If no photo, placeholder shown | | | |
| 11.5 | View Employee Certificates | 1. View employee profile<br>2. Navigate to Certificates/Education<br>3. View educational qualifications | - Certificates listed<br>- Educational qualifications shown<br>- Institution names displayed<br>- Can download certificate files | | | |
| 11.6 | Employee Search Functionality | 1. Navigate to Employees<br>2. Search by name<br>3. Search by ZanID<br>4. View results | - Search by name works<br>- Search by ZanID works<br>- Results filtered correctly<br>- Quick and responsive | | | |
| 11.7 | View Urgent Actions for Employees | 1. Login as CSC role<br>2. Navigate to "Urgent Actions"<br>3. View employees needing attention | - List of employees with upcoming dates:<br>&nbsp;&nbsp;• Near retirement<br>&nbsp;&nbsp;• Probation ending soon<br>&nbsp;&nbsp;• Other urgent items<br>- Actionable items highlighted<br>- Can click to view details | | | |
| 11.8 | Employee View Own Profile | 1. Login as employee<br>2. View own profile | - Can see own complete profile<br>- All personal data visible<br>- Cannot edit (read-only)<br>- Cannot see other employees | | | |
| 11.9 | HRRP View Institution Employees | 1. Login as HRRP (kmhaji)<br>2. Navigate to Employees<br>3. View employee list | - Sees only employees from own institution<br>- Can view full profiles<br>- Institution filter applied<br>- Cannot see other institutions | | | |
| 11.10 | CSC Secretary View All Profiles | 1. Login as CSCS (zhaji)<br>2. Navigate to Employees<br>3. View any employee profile | - Can access all employee profiles<br>- No restrictions<br>- Full visibility across institutions | | | |

---

### **Module:** Request Status Tracking
### **Test Case No.: 12**

**Process/Function Name:** Track Status of All Requests

**Function Description:** This module provides a centralized view to track status of all submitted requests across all request types. Users can filter by request type, status, and date. Shows current status, approval timeline, and request details.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 12.1 | View All Requests (HRO) | 1. Login as HRO<br>2. Navigate to "Track Status"<br>3. View all requests | - Shows all requests from own institution:<br>&nbsp;&nbsp;• Confirmations<br>&nbsp;&nbsp;• Promotions<br>&nbsp;&nbsp;• LWOP<br>&nbsp;&nbsp;• Cadre Changes<br>&nbsp;&nbsp;• Retirements<br>&nbsp;&nbsp;• Resignations<br>&nbsp;&nbsp;• Service Extensions<br>&nbsp;&nbsp;• Terminations<br>- Cannot see other institutions<br>- Request count displayed | | | |
| 12.2 | Filter by Request Type | 1. Navigate to Track Status<br>2. Filter by specific type (e.g., Promotions)<br>3. View filtered results | - Filter dropdown works<br>- Shows only selected type<br>- Count updates<br>- Can clear filter | | | |
| 12.3 | Filter by Status | 1. Filter by status:<br>&nbsp;&nbsp;- Pending<br>&nbsp;&nbsp;- Approved<br>&nbsp;&nbsp;- Rejected<br>2. View results | - Status filter functional<br>- Shows only selected status<br>- Can select multiple statuses<br>- Results accurate | | | |
| 12.4 | Search Requests | 1. Enter employee name<br>2. Search<br>3. View results | - Search works across all fields<br>- Results relevant<br>- Fast response | | | |
| 12.5 | View Request Details | 1. Click on specific request<br>2. View detailed information | - Request details page opens<br>- All information displayed<br>- Status clearly shown<br>- Documents accessible<br>- Approval history visible | | | |
| 12.6 | View Approval Timeline | 1. Open approved/rejected request<br>2. View timeline | - Timeline shows:<br>&nbsp;&nbsp;• Submission date<br>&nbsp;&nbsp;• Review date<br>&nbsp;&nbsp;• Approval/rejection date<br>&nbsp;&nbsp;• Approver name<br>&nbsp;&nbsp;• Comments<br>- Visual progress indicator | | | |
| 12.7 | Track Status (CSC Roles) | 1. Login as HHRMD/HRMO/DO<br>2. Navigate to Track Status | - Can see requests from ALL institutions<br>- Can filter by institution<br>- Full visibility across system | | | |
| 12.8 | Track Status (Employee) | 1. Login as employee<br>2. View complaints status | - Can only see own complaints<br>- Status clearly shown<br>- Cannot see other employees' items | | | |

---

### **Module:** Recent Activities & Audit Trail
### **Test Case No.: 13**

**Process/Function Name:** Recent Activities Feed and System Audit

**Function Description:** This module displays chronological feed of recent system activities including request submissions, approvals, rejections, and other significant actions. Provides audit trail for accountability and system monitoring.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 13.1 | View Recent Activities Dashboard | 1. Login to CSMS<br>2. Navigate to Dashboard<br>3. View Recent Activities section | - Recent activities widget visible<br>- Shows last 10-20 activities<br>- Chronological order (newest first)<br>- Activity types shown:<br>&nbsp;&nbsp;• Request submissions<br>&nbsp;&nbsp;• Approvals<br>&nbsp;&nbsp;• Rejections<br>&nbsp;&nbsp;• Status changes<br>- User who performed action shown<br>- Timestamp displayed | | | |
| 13.2 | View Recent Activities Page | 1. Navigate to "Recent Activities"<br>2. View full activity log | - Full activity list displayed<br>- Pagination works<br>- Can filter by date range<br>- Can filter by activity type<br>- Can search activities | | | |
| 13.3 | Activity Details | 1. Click on specific activity<br>2. View details | - Activity details shown:<br>&nbsp;&nbsp;• User name<br>&nbsp;&nbsp;• Action type<br>&nbsp;&nbsp;• Affected entity (employee/request)<br>&nbsp;&nbsp;• Timestamp<br>&nbsp;&nbsp;• Before/after values (if applicable)<br>- Link to related record | | | |
| 13.4 | Filter Activities by Type | 1. Apply activity type filter<br>2. View filtered results | - Filter works correctly<br>- Shows only selected types<br>- Can select multiple types<br>- Results update immediately | | | |
| 13.5 | Filter by Date Range | 1. Set start date<br>2. Set end date<br>3. View activities in range | - Date filter functional<br>- Shows activities in range<br>- Can use quick options (Today, This Week, This Month) | | | |
| 13.6 | Audit Trail Access (CSC Secretary) | 1. Login as CSCS (zhaji)<br>2. View audit trail<br>3. See all actions by HHRMD, HRMO, DO | - Complete audit visibility<br>- Can see all user actions<br>- Full system-wide audit trail<br>- Export capability | | | |
| 13.7 | Institution-Filtered Activities (HRO) | 1. Login as HRO<br>2. View recent activities | - Only sees activities from own institution<br>- Cannot see other institutions' activities<br>- Filter automatically applied | | | |

---

### **Module:** Reports and Analytics
### **Test Case No.: 14**

**Process/Function Name:** Report Generation and Data Analytics

**Function Description:** This module provides comprehensive reporting across all request types. Supports 10 report types with bilingual columns (English/Swahili), date filtering, institution filtering, and export to PDF/Excel. Available to CSC roles and Planning Officer.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 14.1 | Access Reports Module (CSC Roles) | 1. Login as HHRMD/HRMO/DO/CSCS<br>2. Navigate to Reports<br>3. View available reports | - Reports module accessible<br>- All 10 report types listed:<br>&nbsp;&nbsp;1. Confirmation Report<br>&nbsp;&nbsp;2. Promotion Report<br>&nbsp;&nbsp;3. LWOP Report<br>&nbsp;&nbsp;4. Cadre Change Report<br>&nbsp;&nbsp;5. Retirement Report<br>&nbsp;&nbsp;6. Resignation Report<br>&nbsp;&nbsp;7. Service Extension Report<br>&nbsp;&nbsp;8. Termination Report<br>&nbsp;&nbsp;9. Complaints Report<br>&nbsp;&nbsp;10. All Requests<br>- Can select any report type | | | |
| 14.2 | Access Reports (Planning Officer) | 1. Login as PO (mishak)<br>2. Navigate to Reports | - PO can access Reports module<br>- All report types available<br>- Read-only access<br>- Cannot approve/submit requests<br>- No dashboard access | | | |
| 14.3 | Generate Confirmation Report | 1. Select "Confirmation Report"<br>2. Set date range (from/to)<br>3. Select institution (optional)<br>4. Click Generate | - Report generated successfully<br>- Bilingual columns (English/Swahili)<br>- Shows all confirmations in range<br>- Columns include:<br>&nbsp;&nbsp;• Employee name<br>&nbsp;&nbsp;• Institution<br>&nbsp;&nbsp;• Submission date<br>&nbsp;&nbsp;• Status (Imekamilika/Inasubiri/Imekataliwa)<br>&nbsp;&nbsp;• Decision date<br>- Total count displayed | | | |
| 14.4 | Generate Promotion Report | 1. Select "Promotion Report"<br>2. Set date range<br>3. Generate | - Report shows all promotions<br>- Columns include:<br>&nbsp;&nbsp;• Employee name<br>&nbsp;&nbsp;• Promotion type (Experience/Education)<br>&nbsp;&nbsp;• Current cadre<br>&nbsp;&nbsp;• Proposed cadre<br>&nbsp;&nbsp;• Status<br>&nbsp;&nbsp;• Submission date<br>- Bilingual headers<br>- Status in Swahili | | | |
| 14.5 | Generate LWOP Report | 1. Select "LWOP Report"<br>2. Set filters<br>3. Generate | - Report shows all LWOP requests<br>- Includes:<br>&nbsp;&nbsp;• Duration<br>&nbsp;&nbsp;• Start date<br>&nbsp;&nbsp;• End date<br>&nbsp;&nbsp;• Reason<br>&nbsp;&nbsp;• Status<br>- Total count<br>- Export ready | | | |
| 14.6 | Generate Retirement Report | 1. Select "Retirement Report"<br>2. Generate with filters | - Shows all 3 retirement types<br>- Columns include:<br>&nbsp;&nbsp;• Retirement type (Voluntary/Compulsory/Illness)<br>&nbsp;&nbsp;• Proposed date<br>&nbsp;&nbsp;• Illness description (if applicable)<br>&nbsp;&nbsp;• Status<br>- Bilingual format | | | |
| 14.7 | Generate Complaints Report | 1. Select "Complaints Report"<br>2. Set date range<br>3. Generate | - All complaints shown<br>- Includes:<br>&nbsp;&nbsp;• Case ID<br>&nbsp;&nbsp;• Complaint type<br>&nbsp;&nbsp;• Subject<br>&nbsp;&nbsp;• Status<br>&nbsp;&nbsp;• Assigned officer<br>&nbsp;&nbsp;• Resolution notes (if resolved)<br>- Export works | | | |
| 14.8 | Generate All Requests Report | 1. Select "All Requests"<br>2. Set date range<br>3. Generate | - Combined report of ALL request types<br>- Request type column shows type<br>- All requests in one view<br>- Can filter by institution<br>- Export functionality | | | |
| 14.9 | Export Report to PDF | 1. Generate any report<br>2. Click "Export to PDF"<br>3. Download file | - PDF generation works<br>- Uses jsPDF library<br>- All data included<br>- Bilingual headers preserved<br>- Proper formatting<br>- File downloads successfully | | | |
| 14.10 | Export Report to Excel | 1. Generate any report<br>2. Click "Export to Excel"<br>3. Download file | - Excel export works<br>- Uses XLSX library<br>- All columns included<br>- Data accurate<br>- File opens in Excel<br>- Formatting preserved | | | |
| 14.11 | Filter Report by Institution | 1. Generate report<br>2. Select specific institution<br>3. View filtered results | - Institution filter works<br>- Shows only selected institution<br>- Count updates correctly<br>- Export includes filtered data | | | |
| 14.12 | Filter Report by Date Range | 1. Set "From Date"<br>2. Set "To Date"<br>3. Generate | - Date range filter accurate<br>- Shows only records in range<br>- Validation on dates (To >= From)<br>- Clear date selection | | | |
| 14.13 | Reports Access Restriction (HRO) | 1. Login as HRO<br>2. Navigate to Reports<br>3. Generate report | - HRO may have limited report access<br>- Can only see own institution's reports<br>- Institution filter pre-applied | | | |
| 14.14 | Reports Bilingual Status Display | 1. Generate any report<br>2. View Status column | - Status normalized to Swahili:<br>&nbsp;&nbsp;• "Approved" → "Imekamilika"<br>&nbsp;&nbsp;• "Pending" → "Inasubiri"<br>&nbsp;&nbsp;• "Rejected" → "Imekataliwa"<br>- Consistent across all reports<br>- Professional Swahili terms | | | |

---

### **Module:** Dashboard and Metrics
### **Test Case No.: 15**

**Process/Function Name:** Dashboard Overview and Key Metrics

**Function Description:** The dashboard provides at-a-glance metrics for HR activities including counts of pending requests, employees by status, and recent activities. Different dashboards for different roles (CSC roles see all institutions, institution-based see only their institution).

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 15.1 | View Dashboard (HRO) | 1. Login as HRO (kmnyonge)<br>2. View dashboard | - Dashboard loads<br>- Metrics for own institution:<br>&nbsp;&nbsp;• Total employees<br>&nbsp;&nbsp;• Pending confirmations<br>&nbsp;&nbsp;• Pending promotions<br>&nbsp;&nbsp;• Employees on LWOP<br>&nbsp;&nbsp;• Pending cadre changes<br>&nbsp;&nbsp;• Pending retirements<br>&nbsp;&nbsp;• Pending resignations<br>&nbsp;&nbsp;• Pending service extensions<br>- Recent activities shown<br>- Quick action buttons | | | |
| 15.2 | View Dashboard (HHRMD) | 1. Login as HHRMD (skhamis)<br>2. View dashboard | - System-wide metrics shown<br>- Includes all institutions<br>- Pending approvals highlighted<br>- Can see:<br>&nbsp;&nbsp;• Total pending requests by type<br>&nbsp;&nbsp;• Open complaints<br>&nbsp;&nbsp;• Pending terminations<br>&nbsp;&nbsp;• Employees needing attention<br>- Recent activities from all institutions | | | |
| 15.3 | View Dashboard (CSC Secretary) | 1. Login as CSCS (zhaji)<br>2. View executive dashboard | - Executive-level dashboard<br>- Shows task statuses by HHRMD, HRMO, DO<br>- Navigation menu with status of tasks<br>- System-wide overview<br>- All institutions visible<br>- Can drill down into details | | | |
| 15.4 | View Dashboard (HRRP) | 1. Login as HRRP (kmhaji)<br>2. View institutional dashboard | - Dashboard shows institution summary<br>- HR activities for institution<br>- Employee profiles accessible<br>- Request tracking for institution<br>- Can view institutional reports | | | |
| 15.5 | Dashboard Metrics Accuracy | 1. View dashboard metrics<br>2. Click on metric (e.g., "Pending Confirmations")<br>3. Verify count matches actual list | - Metric counts accurate<br>- Clicking metric navigates to detailed list<br>- List count matches dashboard metric<br>- Real-time updates | | | |
| 15.6 | Recent Activities Widget | 1. View dashboard<br>2. Check Recent Activities section | - Shows last 10-20 activities<br>- Activity type and user shown<br>- Timestamp displayed<br>- Can click to view details<br>- "View All" link to full activities page | | | |
| 15.7 | Quick Action Buttons | 1. View dashboard<br>2. Use quick action buttons | - Quick actions available:<br>&nbsp;&nbsp;• Submit New Request<br>&nbsp;&nbsp;• View Pending Approvals<br>&nbsp;&nbsp;• Generate Reports<br>- Buttons navigate correctly<br>- Role-appropriate actions shown | | | |
| 15.8 | Planning Officer Dashboard Access | 1. Login as PO (mishak)<br>2. Attempt to access dashboard | - PO does NOT have dashboard access<br>- Redirected to Reports instead<br>- Only reports available to PO | | | |

---

### **Module:** User Management (Admin)
### **Test Case No.: 16**

**Process/Function Name:** User Account Management

**Function Description:** This module allows administrators to create, update, and deactivate user accounts. Admin can create users for all 9 roles, assign them to institutions, reset passwords, and search users. Only accessible to ADMIN role.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 16.1 | Login as Administrator | 1. Navigate to login<br>2. Enter username: akassim<br>3. Enter password: password123<br>4. Login | - Admin login successful<br>- Access to User Management<br>- Access to Institution Management<br>- Access to HRIMS Integration tools<br>- Can manage all system configurations | | | |
| 16.2 | Create New User | 1. Login as Admin<br>2. Navigate to User Management<br>3. Click "Create User"<br>4. Enter name (min 2 chars)<br>5. Enter username (min 3 chars)<br>6. Enter email (valid format)<br>7. Enter password<br>8. Enter phone (10 digits)<br>9. Select role<br>10. Select institution<br>11. Submit | - User creation form loads<br>- All validations work:<br>&nbsp;&nbsp;• Name min 2 chars<br>&nbsp;&nbsp;• Username min 3 chars, unique<br>&nbsp;&nbsp;• Email valid format, unique<br>&nbsp;&nbsp;• Phone 10 digits<br>- Role dropdown shows all 9 roles<br>- Institution dropdown populated<br>- Password hashed with bcrypt<br>- User created successfully<br>- Account active by default | | | |
| 16.3 | Create User - Validation Errors | 1. Attempt to create user with:<br>&nbsp;&nbsp;- Duplicate username<br>&nbsp;&nbsp;- Duplicate email<br>&nbsp;&nbsp;- Invalid email format<br>&nbsp;&nbsp;- Short username (< 3 chars)<br>&nbsp;&nbsp;- Invalid phone number | - Duplicate username rejected<br>- Duplicate email rejected<br>- Invalid email format error<br>- Username length validation<br>- Phone number validation<br>- Clear error messages for each | | | |
| 16.4 | Update User Details | 1. Navigate to Users list<br>2. Select user to edit<br>3. Update name, email, phone<br>4. Change role<br>5. Change institution<br>6. Save changes | - User edit form loads<br>- Current values pre-filled<br>- Can update all fields except username<br>- Role can be changed<br>- Institution can be changed<br>- Changes saved successfully<br>- Updated data reflected | | | |
| 16.5 | Deactivate User Account | 1. Select active user<br>2. Click "Deactivate"<br>3. Confirm action | - Deactivation confirmation shown<br>- User account set to inactive (active = false)<br>- User cannot login when deactivated<br>- Account still in database<br>- Can be reactivated later | | | |
| 16.6 | Reactivate User Account | 1. Select deactivated user<br>2. Click "Activate"<br>3. Confirm | - User account reactivated (active = true)<br>- User can login again<br>- All previous data intact | | | |
| 16.7 | Reset User Password | 1. Select user<br>2. Click "Reset Password"<br>3. Enter new password<br>4. Confirm | - Password reset form appears<br>- New password required<br>- Password hashed with bcrypt<br>- Password updated successfully<br>- User can login with new password | | | |
| 16.8 | Search Users by Name | 1. Navigate to User Management<br>2. Enter name in search box<br>3. Search | - Search works<br>- Results filtered by name<br>- Partial match supported<br>- Case-insensitive | | | |
| 16.9 | Search Users by ZanID | 1. Enter ZanID in search<br>2. Search | - Search by ZanID works<br>- Returns matching user (if linked to employee)<br>- Accurate results | | | |
| 16.10 | Search Users by Institution | 1. Filter users by institution<br>2. View results | - Institution filter works<br>- Shows only users from selected institution<br>- Count updates correctly | | | |
| 16.11 | View All Users List | 1. Navigate to Users<br>2. View complete list | - All users displayed<br>- Shows: name, username, email, role, institution<br>- Active status indicator<br>- Pagination if many users<br>- Can sort by columns | | | |
| 16.12 | User Management Access Control | 1. Login as non-admin (HRO, HHRMD, etc.)<br>2. Attempt to access User Management | - Non-admin users cannot access User Management<br>- Module not visible in navigation<br>- Direct URL access blocked<br>- Only ADMIN role has access | | | |

---

### **Module:** Institution Management (Admin)
### **Test Case No.: 17**

**Process/Function Name:** Institution Creation and Management

**Function Description:** This module allows administrators to create and manage institutions (ministries, departments, agencies). Admin can add new institutions with details like name, vote number, TIN, contact info. Required before creating HR Officers for institutions.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 17.1 | Create New Institution | 1. Login as Admin<br>2. Navigate to Institution Management<br>3. Click "Create Institution"<br>4. Enter institution name (unique)<br>5. Enter email<br>6. Enter phone number<br>7. Enter vote number<br>8. Enter TIN number (unique)<br>9. Submit | - Institution creation form loads<br>- Name field required and unique<br>- Email field (optional)<br>- Phone field (optional)<br>- Vote number field<br>- TIN field unique<br>- Institution created successfully<br>- Can now create HRO for this institution | | | |
| 17.2 | Institution Name Uniqueness | 1. Create institution<br>2. Attempt to create another with same name<br>3. Submit | - Duplicate name rejected<br>- Error: "Institution name already exists"<br>- Validation works | | | |
| 17.3 | TIN Number Uniqueness | 1. Create institution with specific TIN<br>2. Attempt another institution with same TIN<br>3. Submit | - Duplicate TIN rejected<br>- Error message displayed<br>- TIN must be unique | | | |
| 17.4 | Update Institution Details | 1. Select existing institution<br>2. Click Edit<br>3. Update email, phone, vote number<br>4. Save | - Edit form loads with current data<br>- Can update all fields<br>- Changes saved successfully<br>- Updated data displayed | | | |
| 17.5 | View All Institutions | 1. Navigate to Institutions<br>2. View list | - All institutions listed<br>- Shows: name, email, phone, vote number, TIN<br>- Can search institutions<br>- Pagination if many institutions | | | |
| 17.6 | View Institution Details | 1. Click on specific institution<br>2. View details page | - Institution details shown<br>- List of employees from institution<br>- List of HROs for institution<br>- Institutional statistics | | | |
| 17.7 | Search Institutions | 1. Enter institution name in search<br>2. Search | - Search works<br>- Filters by name<br>- Results accurate<br>- Case-insensitive | | | |
| 17.8 | Create HRO After Institution Creation | 1. Create new institution<br>2. Navigate to User Management<br>3. Create user with role HRO<br>4. Assign to newly created institution<br>5. Save | - Can create HRO for new institution<br>- Institution available in dropdown<br>- HRO linked to institution<br>- HRO can only see own institution's data | | | |
| 17.9 | Institution List for Non-Admin Users | 1. Login as HRO/HRRP<br>2. View institutions (if accessible) | - May have limited institution view<br>- Can only see own institution<br>- No edit capability | | | |
| 17.10 | Institution Management Access Control | 1. Login as non-admin user<br>2. Attempt to access Institution Management | - Non-admin cannot access<br>- Module not visible<br>- Only ADMIN can manage institutions | | | |

---

### **Module:** HRIMS Integration
### **Test Case No.: 18**

**Process/Function Name:** HRIMS External System Integration

**Function Description:** This module integrates with external HRIMS (Human Resource Information Management System) to sync employee data, photos, documents, and certificates. Admin can test connection, fetch employees individually or in bulk, sync photos and documents. Data stored in CSMS database and MinIO.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 18.1 | Access HRIMS Integration (Admin) | 1. Login as Admin (akassim)<br>2. Navigate to HRIMS Integration<br>3. View available tools | - HRIMS integration accessible to Admin only<br>- Test interface available<br>- Options visible:<br>&nbsp;&nbsp;• Test connection<br>&nbsp;&nbsp;• Fetch single employee<br>&nbsp;&nbsp;• Bulk fetch employees<br>&nbsp;&nbsp;• Fetch photos<br>&nbsp;&nbsp;• Fetch documents<br>&nbsp;&nbsp;• Sync certificates | | | |
| 18.2 | Test HRIMS Connection | 1. Navigate to Test HRIMS<br>2. Click "Test Connection"<br>3. View results | - Connection test executes<br>- Shows success/failure status<br>- Displays response from HRIMS<br>- Response time shown<br>- Error details if failed | | | |
| 18.3 | Fetch Single Employee by ZanID | 1. Enter employee ZanID<br>2. Click "Fetch Employee"<br>3. View result | - Request sent to HRIMS<br>- Employee data retrieved if exists<br>- Data includes:<br>&nbsp;&nbsp;• Personal info (name, gender, DOB)<br>&nbsp;&nbsp;• Employment info (cadre, department)<br>&nbsp;&nbsp;• IDs (ZanID, payroll, ZSSF)<br>&nbsp;&nbsp;• Dates (employment, confirmation, retirement)<br>- Data not auto-saved yet | | | |
| 18.4 | Fetch Single Employee by Payroll Number | 1. Enter payroll number instead of ZanID<br>2. Fetch employee | - Payroll number search works<br>- Employee data retrieved<br>- Same data fields as ZanID search | | | |
| 18.5 | Sync Employee to CSMS | 1. Fetch employee from HRIMS<br>2. Click "Sync to CSMS"<br>3. Verify in database | - Employee data synced to CSMS database<br>- Record created or updated in Employee table<br>- All fields mapped correctly<br>- Dates converted from ISO strings to DateTime<br>- Institution linked if exists<br>- Success notification shown | | | |
| 18.6 | Bulk Fetch Employees by Institution | 1. Select institution/vote code<br>2. Set page number and size<br>3. Click "Bulk Fetch"<br>4. Monitor progress | - Bulk fetch initiated<br>- Progress shown (e.g., via Server-Sent Events)<br>- Multiple employees retrieved<br>- Can fetch in pages (pagination)<br>- All employees from institution retrieved<br>- Success/failure count displayed | | | |
| 18.7 | Fetch Employee Photo | 1. Navigate to Get Photo<br>2. Enter employee ZanID or payroll number<br>3. Click "Fetch Photo" | - Photo fetched from HRIMS<br>- Photo in base64 format<br>- Photo preview shown<br>- Can download photo<br>- Photo stored in MinIO<br>- profileImageUrl updated in employee record | | | |
| 18.8 | Bulk Fetch Photos by Institution | 1. Select institution<br>2. Click "Fetch All Photos"<br>3. Monitor progress | - Bulk photo fetch initiated<br>- Progress updates shown<br>- Photos downloaded for all employees<br>- Stored in MinIO<br>- Employee records updated with URLs<br>- Success/failure summary | | | |
| 18.9 | Fetch Employee Documents | 1. Navigate to Get Documents<br>2. Enter employee identifier<br>3. Select document types:<br>&nbsp;&nbsp;- Ardhil Hali<br>&nbsp;&nbsp;- Birth Certificate<br>&nbsp;&nbsp;- Confirmation Letter<br>&nbsp;&nbsp;- Job Contract<br>4. Click "Fetch Documents" | - Documents fetched from HRIMS<br>- Retrieved in base64 format (PDF)<br>- Documents stored in MinIO<br>- Employee record updated with URLs:<br>&nbsp;&nbsp;• ardhilHaliUrl<br>&nbsp;&nbsp;• birthCertificateUrl<br>&nbsp;&nbsp;• confirmationLetterUrl<br>&nbsp;&nbsp;• jobContractUrl<br>- Can preview/download documents | | | |
| 18.10 | Bulk Fetch Documents by Institution | 1. Select institution<br>2. Select document types<br>3. Click "Fetch All Documents"<br>4. Monitor progress | - Bulk document fetch initiated<br>- Progress shown per employee<br>- Split requests by document type (prevents timeout)<br>- All documents downloaded<br>- Stored in MinIO<br>- Employee records updated<br>- Success/failure summary | | | |
| 18.11 | Sync Employee Certificates | 1. Enter employee identifier<br>2. Click "Sync Certificates"<br>3. View results | - Educational certificates fetched from HRIMS<br>- Certificate data includes:<br>&nbsp;&nbsp;• Qualification name<br>&nbsp;&nbsp;• Institution<br>&nbsp;&nbsp;• Year completed<br>- Certificates stored in EmployeeCertificate table<br>- Linked to employee<br>- Certificate files stored in MinIO | | | |
| 18.12 | HRIMS Error Handling | 1. Fetch employee that doesn't exist<br>2. Attempt sync during HRIMS downtime<br>3. Test with invalid credentials | - "Employee not found" message for non-existent<br>- Connection error shown for downtime<br>- Authentication error for invalid credentials<br>- Errors logged<br>- User-friendly error messages<br>- System remains stable | | | |
| 18.13 | HRIMS Integration Access Control | 1. Login as non-admin (HRO, HHRMD, etc.)<br>2. Attempt to access HRIMS tools | - Non-admin users cannot access HRIMS integration<br>- Tools not visible<br>- Only ADMIN can sync data from HRIMS | | | |

---

### **Module:** File Upload and Document Management
### **Test Case No.: 19**

**Process/Function Name:** File Upload, Storage, and Retrieval (MinIO)

**Function Description:** This module handles all file uploads in the system including request documents, employee photos, certificates, and other attachments. Uses MinIO S3-compatible object storage. Enforces file type (PDF only) and size (2MB max) restrictions. Provides download and preview capabilities.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 19.1 | Upload Valid PDF Document | 1. Navigate to any request form (e.g., Confirmation)<br>2. Click "Upload Document"<br>3. Select PDF file (< 2MB)<br>4. Upload | - File selection dialog opens<br>- PDF file accepted<br>- Upload progress shown<br>- File uploaded to MinIO<br>- Object key generated<br>- Success message displayed<br>- File reference saved | | | |
| 19.2 | Upload Multiple Documents | 1. Create request requiring multiple documents<br>2. Upload document 1<br>3. Upload document 2<br>4. Upload document 3<br>5. Submit request | - Multiple file uploads work<br>- Each file stored separately<br>- All object keys saved in documents array<br>- All files accessible after submission | | | |
| 19.3 | File Type Restriction - Non-PDF | 1. Attempt to upload non-PDF file:<br>&nbsp;&nbsp;- .docx (Word)<br>&nbsp;&nbsp;- .jpg (Image)<br>&nbsp;&nbsp;- .xlsx (Excel)<br>&nbsp;&nbsp;- .txt (Text) | - All non-PDF files rejected<br>- Error: "Only PDF files are allowed"<br>- Upload blocked<br>- User prompted to convert to PDF | | | |
| 19.4 | File Size Restriction - Oversized | 1. Attempt to upload PDF > 2MB<br>2. Try to submit | - File size checked before upload<br>- Error: "File size exceeds 2MB limit"<br>- Upload rejected<br>- File not sent to server<br>- Clear size limit message | | | |
| 19.5 | Download Uploaded Document | 1. View request with uploaded documents<br>2. Click download link<br>3. Download file | - Download link functional<br>- File downloads correctly<br>- Original filename preserved<br>- File opens without errors<br>- Content intact | | | |
| 19.6 | Preview PDF Document | 1. View request with PDF document<br>2. Click "Preview"<br>3. View in browser | - Preview opens in new tab/modal<br>- PDF displays correctly<br>- Can scroll through pages<br>- Can zoom in/out<br>- Close preview returns to request | | | |
| 19.7 | Check File Existence | 1. System checks if file exists in MinIO<br>2. Verify before displaying download link | - File existence API works<br>- Returns true/false correctly<br>- Download link only shown if file exists<br>- Handles missing files gracefully | | | |
| 19.8 | Upload Employee Photo | 1. Navigate to employee profile (admin)<br>2. Upload employee photo<br>3. Save | - Photo upload works<br>- Image displayed in profile<br>- Stored in MinIO<br>- profileImageUrl updated<br>- Photo visible across system | | | |
| 19.9 | MinIO Storage Organization | 1. Upload various file types across modules<br>2. Check MinIO storage structure | - Files organized by type:<br>&nbsp;&nbsp;• request-documents/<br>&nbsp;&nbsp;• employee-photos/<br>&nbsp;&nbsp;• employee-documents/<br>&nbsp;&nbsp;• certificates/<br>- Unique object keys prevent collisions<br>- Files retrievable by key | | | |
| 19.10 | File Upload Error Handling | 1. Simulate MinIO unavailability<br>2. Attempt file upload<br>3. View error | - Upload fails gracefully<br>- Error message: "File upload failed"<br>- User can retry<br>- Form data preserved<br>- No partial uploads | | | |
| 19.11 | File Security and Access | 1. Attempt to access file with invalid key<br>2. Attempt to access without authentication | - Invalid keys return 404<br>- Authentication required for file access<br>- Files not publicly accessible<br>- Role-based access enforced | | | |

---

### **Module:** Notifications System
### **Test Case No.: 20**

**Process/Function Name:** System Notifications and Alerts

**Function Description:** This module handles automated notifications for request submissions, approvals, rejections, and other system events. Notifications sent to specific user roles in English and Swahili. Users can view, mark as read, and manage notifications.

| **Case ID** | **Test Case Scenario** | **Test Steps** | **Expected Results** | **Actual Results** | **PASS/FAIL** | **Remarks** |
|-------------|------------------------|----------------|----------------------|-------------------|---------------|-------------|
| 20.1 | Request Submission Notification | 1. Login as HRO<br>2. Submit any request (e.g., Confirmation)<br>3. Login as HHRMD<br>4. Check notifications | - HRO submits request<br>- Notification created for HHRMD role<br>- Notification created for DO role<br>- Notification contains:<br>&nbsp;&nbsp;• Request type<br>&nbsp;&nbsp;• Employee name<br>&nbsp;&nbsp;• Request ID<br>&nbsp;&nbsp;• Link to request<br>- Notification marked as unread<br>- Appears in notification bell | | | |
| 20.2 | Approval Notification to Submitter | 1. HHRMD approves request<br>2. HRO checks notifications | - Approval notification sent to HRO<br>- Notification message: "Request approved"<br>- Includes request details<br>- Link to view approved request<br>- Unread indicator shown | | | |
| 20.3 | Rejection Notification with Reason | 1. HHRMD rejects request with reason<br>2. HRO checks notifications | - Rejection notification sent<br>- Message: "Request rejected"<br>- Rejection reason included in notification<br>- Link to view request<br>- Marked as unread | | | |
| 20.4 | Complaint Notification in Swahili | 1. Employee submits complaint<br>2. HHRMD/DO check notifications | - Notification sent in Swahili<br>- Contains case ID<br>- Professional Swahili message<br>- Link to complaint<br>- Marked as unread | | | |
| 20.5 | Welcome Notification on First Login | 1. Create new user<br>2. User logs in for first time<br>3. Check notifications | - Welcome notification created<br>- Message welcomes user to CSMS<br>- Brief system introduction<br>- Helpful tips included<br>- Marked as unread | | | |
| 20.6 | View All Notifications | 1. Login with user who has notifications<br>2. Click notification bell<br>3. View notification list | - Notification dropdown/panel opens<br>- All notifications listed<br>- Newest first (chronological)<br>- Unread count displayed<br>- Unread notifications highlighted | | | |
| 20.7 | Mark Notification as Read | 1. Open notification<br>2. Click/view notification | - Notification marked as read automatically<br>- Unread indicator removed<br>- Unread count decreases<br>- Notification remains in list | | | |
| 20.8 | Notification Link Navigation | 1. View notification<br>2. Click notification link<br>3. Navigate to related item | - Link navigates correctly to:<br>&nbsp;&nbsp;• Request detail page<br>&nbsp;&nbsp;• Complaint page<br>&nbsp;&nbsp;• Employee profile<br>- Opens in same window<br>- Shows correct item | | | |
| 20.9 | Notification Filtering | 1. View notifications<br>2. Filter by:<br>&nbsp;&nbsp;- Unread only<br>&nbsp;&nbsp;- Read only<br>&nbsp;&nbsp;- All | - Filter works correctly<br>- Shows only selected type<br>- Count updates<br>- Can clear filter | | | |
| 20.10 | Notification Role Targeting | 1. Submit different request types<br>2. Check who receives notifications | - Correct roles notified:<br>&nbsp;&nbsp;• Most requests → HHRMD & DO<br>&nbsp;&nbsp;• Complaints → HHRMD & DO<br>&nbsp;&nbsp;• Approvals → Original submitter<br>- No unnecessary notifications<br>- Role-based targeting accurate | | | |
| 20.11 | Notification Persistence | 1. Receive notification<br>2. Logout<br>3. Login again<br>4. Check notifications | - Notifications persist across sessions<br>- Unread status maintained<br>- All notifications visible<br>- No data loss | | | |
| 20.12 | Clear All Notifications | 1. View notifications<br>2. Click "Mark all as read" or "Clear all"<br>3. Verify | - All notifications marked as read<br>- Unread count = 0<br>- Notifications remain in history<br>- Can still access old notifications | | | |

---

## 4. Test Execution Schedule

| Phase | Test Cases | Start Date | End Date | Responsible Party |
|-------|-----------|------------|----------|------------------|
| **Phase 1:** Authentication & Access Control | TC 1 | | | |
| **Phase 2:** Core Request Workflows | TC 2-9 | | | |
| **Phase 3:** Complaints & Employee Profile | TC 10-11 | | | |
| **Phase 4:** Tracking & Activities | TC 12-13 | | | |
| **Phase 5:** Reports & Dashboard | TC 14-15 | | | |
| **Phase 6:** Administration | TC 16-18 | | | |
| **Phase 7:** File Management & Notifications | TC 19-20 | | | |
| **UAT Sign-off** | All | | | |

---

## 5. Test Entry and Exit Criteria

### 5.1 Entry Criteria
- CSMS application deployed to test environment
- Database populated with test data (employees, institutions)
- All 9 user roles configured with test accounts
- MinIO storage configured and accessible
- HRIMS integration endpoint available (if testing integration)
- Test institutions created with assigned HROs
- Test documents prepared (PDF files < 2MB)
- Browser compatibility verified (Chrome, Firefox, Safari, Edge)

### 5.2 Exit Criteria
- All 20 test cases executed (130+ individual test scenarios)
- At least 95% of test scenarios passed
- All critical defects resolved
- All high priority defects resolved or have workarounds
- Role-based access control verified for all 9 roles
- All 8 request type workflows tested and approved
- File upload system (MinIO) fully functional
- Reports generating correctly (10 report types)
- Notifications working in both English and Swahili
- HRIMS integration tested (if in scope)
- Performance acceptable for typical loads
- Security requirements validated
- User acceptance documented
- Sign-off received from stakeholders

---

## 6. Defect Management

### 6.1 Defect Severity Levels

| Severity | Description | Example | Response Time |
|----------|-------------|---------|---------------|
| **Critical** | System crash, data loss, security breach, authentication failure | Cannot login, database corruption, data exposed | Immediate |
| **High** | Major functionality broken, approval workflow fails, data integrity issues | Cannot submit requests, approvals not updating employee status | 24 hours |
| **Medium** | Functionality impaired but workaround exists, non-critical features broken | Reports slow to generate, minor validation issues | 48 hours |
| **Low** | Minor issue, cosmetic problem, UI inconsistency | Button misalignment, typo in label, color mismatch | Next sprint |

### 6.2 Defect Tracking Template

| Defect ID | Test Case | Module | Severity | Description | Steps to Reproduce | Actual Result | Expected Result | Assigned To | Status | Resolution |
|-----------|-----------|--------|----------|-------------|-------------------|---------------|----------------|-------------|--------|------------|
| | | | | | | | | | | |

---

## 7. Assumptions and Dependencies

### 7.1 Assumptions
- All test user accounts remain active during UAT
- Test data accurately represents production scenarios
- Network connectivity to CSMS stable
- MinIO storage has sufficient capacity for test files
- HRIMS integration endpoint available for integration tests
- Testers have appropriate devices and browsers
- Test environment mirrors production configuration
- All institutions and employees in test data are valid

### 7.2 Dependencies
- PostgreSQL database operational
- MinIO object storage accessible
- Next.js application running on port 9002
- Test user credentials valid and documented
- Test institutions created with HROs assigned
- Sample employees exist in various statuses
- PDF test documents available (<2MB)
- Email notifications configured (if testing email)
- HRIMS API accessible (if testing integration)

---

## 8. Risks and Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Test data insufficient or inaccurate | High | Medium | Work with dev team to populate comprehensive, realistic test data |
| User account lockouts during testing | Medium | Low | Have admin credentials ready to reset passwords, verify account statuses |
| MinIO storage unavailable | High | Low | Verify MinIO health before starting UAT, have IT support on standby |
| HRIMS integration endpoint down | Medium | Medium | Test HRIMS integration separately, can skip if not critical for initial UAT |
| File upload failures | High | Low | Pre-test file upload with various sizes and types before formal UAT |
| Role confusion during testing | Medium | Medium | Clearly document which test account to use for each test case |
| Browser compatibility issues | Medium | Low | Test on multiple browsers (Chrome, Firefox, Safari) during UAT |
| Time constraints for complete testing | High | Medium | Prioritize critical workflows (confirmations, promotions, complaints), defer low-priority tests if needed |

---

## 9. Test Deliverables

1. **Completed UAT Test Case Document** - This document with all results filled in
2. **Defect Log** - All identified issues with severity, status, and resolution
3. **Test Execution Logs** - Daily logs of tests performed
4. **Screenshots** - Evidence of key test scenarios (especially failures)
5. **Test Data Documentation** - List of test accounts, employees, institutions used
6. **UAT Sign-off Document** - Formal approval from stakeholders
7. **Lessons Learned** - Issues encountered and recommendations
8. **User Feedback Documentation** - Comments and suggestions from testers
9. **Production Readiness Report** - Assessment of system readiness
10. **Training Materials** - Based on UAT findings, document user guides

---

## 10. Roles and Responsibilities

| Role | Responsibility | Name | Signature |
|------|---------------|------|-----------|
| **UAT Coordinator** | Overall UAT planning, execution, and reporting | | |
| **Test Lead** | Test case execution, defect logging, daily status updates | | |
| **Business Analyst** | Requirements validation, test case review | | |
| **HR Representative** | Business process validation, real-world scenario testing | | |
| **System Administrator** | Test environment maintenance, user account management | | |
| **Developer** | Defect resolution, technical support during UAT | | |
| **Civil Service Commission (CSC) Representative** | Approval workflow validation, policy compliance | | |
| **Project Manager** | UAT approval and sign-off, stakeholder coordination | | |

---

## 11. Test Results Summary

### 11.1 Overall Test Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Test Cases** | 20 | 100% |
| **Total Test Scenarios** | 130+ | 100% |
| Test Cases Executed | | |
| Test Cases Passed | | |
| Test Cases Failed | | |
| Test Cases Blocked | | |
| Test Cases Not Executed | | |

### 11.2 Test Case Results by Module

| Test Case No. | Module | Total Scenarios | Passed | Failed | Pass % | Remarks |
|---------------|--------|-----------------|--------|--------|--------|---------|
| 1 | Authentication & Role-Based Access | 12 | | | | |
| 2 | Employee Confirmation Requests | 12 | | | | |
| 3 | Promotion Requests | 10 | | | | |
| 4 | LWOP Requests | 8 | | | | |
| 5 | Cadre Change Requests | 6 | | | | |
| 6 | Retirement Requests | 8 | | | | |
| 7 | Resignation Requests | 5 | | | | |
| 8 | Service Extension Requests | 6 | | | | |
| 9 | Termination/Dismissal Requests | 7 | | | | |
| 10 | Complaint Management | 13 | | | | |
| 11 | Employee Profile Management | 10 | | | | |
| 12 | Request Status Tracking | 8 | | | | |
| 13 | Recent Activities & Audit Trail | 7 | | | | |
| 14 | Reports and Analytics | 14 | | | | |
| 15 | Dashboard and Metrics | 8 | | | | |
| 16 | User Management (Admin) | 12 | | | | |
| 17 | Institution Management (Admin) | 10 | | | | |
| 18 | HRIMS Integration | 13 | | | | |
| 19 | File Upload & Document Management | 11 | | | | |
| 20 | Notifications System | 12 | | | | |
| **TOTAL** | | **130+** | | | | |

---

## 12. Sign-Off

### 12.1 UAT Completion Sign-Off

I hereby certify that User Acceptance Testing for the Civil Service Management System (CSMS) has been completed according to this test plan and that the system:

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
- ☐ Performance is acceptable under expected load
- ☐ Security requirements are met
- ☐ Is ready for production deployment

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Civil Service Commission Representative** | | | |
| **Project Manager** | | | |
| **UAT Lead** | | | |
| **HR Director** | | | |
| **IT Manager** | | | |
| **Business Analyst** | | | |

### 12.2 Conditions for Production Release

☐ All critical defects resolved
☐ All high priority defects resolved
☐ Medium priority defects documented with workarounds
☐ User roles and permissions verified and approved
☐ Test data cleansed from production database
☐ Production user accounts created for all institutions
☐ User training completed for all roles
☐ User documentation finalized (manuals, guides)
☐ System administration procedures documented
☐ Backup and recovery procedures tested
☐ Production environment configured and tested
☐ MinIO storage configured for production
☐ HRIMS integration tested in production (if applicable)
☐ Rollback plan prepared and tested
☐ Production deployment plan reviewed and approved
☐ Support team trained and ready
☐ Stakeholder approval received

---

## 13. Appendix

### 13.1 Test User Accounts Reference

| Role | Username | Password | Institution | Access Level | Primary Functions |
|------|----------|----------|-------------|--------------|-------------------|
| HRO | kmnyonge | password123 | Institution-specific | Institution only | Submit HR requests |
| HHRMD | skhamis | password123 | CSC | All institutions | Approve HR & Disciplinary |
| HRMO | fiddi | password123 | CSC | All institutions | Approve HR requests only |
| DO | mussi | password123 | CSC | All institutions | Handle complaints, terminations |
| PO | mishak | password123 | CSC | All institutions (read-only) | View reports only |
| CSCS | zhaji | password123 | CSC | All institutions | Executive oversight |
| HRRP | kmhaji | password123 | Institution-specific | Institution only | Institutional supervision |
| ADMIN | akassim | password123 | System-wide | All system data | System management |
| EMPLOYEE | (varies) | N/A | Own data only | Personal data | Submit complaints, view profile |

**Employee Login:** Requires ZanID + Payroll Number + ZSSF Number

### 13.2 Request Type Summary

| Request Type | Database Model | Approvers | Status Change on Approval | Special Fields |
|-------------|----------------|-----------|--------------------------|----------------|
| Confirmation | ConfirmationRequest | HHRMD, HRMO | On Probation → Confirmed | confirmationDate |
| Promotion | PromotionRequest | HHRMD, HRMO | Updates cadre | promotionType, proposedCadre |
| LWOP | LwopRequest | HHRMD, HRMO | Active → On LWOP | duration, startDate, endDate |
| Cadre Change | CadreChangeRequest | HHRMD, HRMO | Updates cadre | newCadre, studiedOutsideCountry |
| Retirement | RetirementRequest | HHRMD, HRMO | Active → Retired | retirementType, illnessDescription |
| Resignation | ResignationRequest | HHRMD, HRMO | Active → Resigned | effectiveDate |
| Service Extension | ServiceExtensionRequest | HHRMD, HRMO | Extends retirementDate | requestedExtensionPeriod |
| Termination/Dismissal | SeparationRequest | HHRMD, DO | Active → Terminated/Dismissed | type (TERMINATION/DISMISSAL) |
| Complaint | Complaint | HHRMD, DO | Various review statuses | complaintType, case ID |

### 13.3 Employee Status Codes

| Status | Description | Can Submit Requests | Notes |
|--------|-------------|-------------------|-------|
| On Probation | Initial hiring period | Limited (no LWOP, Promotion, Cadre, Extension, Retirement) | Must complete probation first |
| Confirmed | Passed probation | Yes (all except Confirmation again) | Full active status |
| On LWOP | Leave without pay | No (cannot submit new requests) | Temporary status |
| Retired | Employment ended (retirement) | No | Final status |
| Resigned | Voluntarily left | No | Final status |
| Terminated | Involuntary separation | No | Final status |
| Dismissed | Disciplinary separation | No | Final status |

### 13.4 File Upload Specifications

| Aspect | Specification |
|--------|--------------|
| **Allowed File Type** | PDF only |
| **Maximum File Size** | 2MB |
| **Storage System** | MinIO S3-Compatible Object Storage |
| **Validation** | Client-side and server-side |
| **Features** | Upload, Download, Preview (in-browser) |
| **Organization** | By type: request-documents/, employee-photos/, employee-documents/, certificates/ |

### 13.5 Report Types and Swahili Translations

| Report Type | Swahili Name | Includes | Export Formats |
|------------|--------------|----------|----------------|
| Confirmation Report | Ripoti ya Kuthibitishwa Kazini | All confirmations | PDF, Excel |
| Promotion Report | Ripoti ya Kupandishwa Cheo | All promotions (both types) | PDF, Excel |
| LWOP Report | Ripoti ya Likizo Bila Malipo | All LWOP requests | PDF, Excel |
| Cadre Change Report | Ripoti ya Kubadilishwa Kada | All cadre changes | PDF, Excel |
| Retirement Report | Ripoti ya Kustaafu | All 3 retirement types | PDF, Excel |
| Resignation Report | Ripoti ya Kuacha Kazi | All resignations | PDF, Excel |
| Service Extension Report | Ripoti ya Nyongeza ya Utumishi | All service extensions | PDF, Excel |
| Termination Report | Ripoti ya Kufukuzwa/Kuachishwa Kazi | Terminations & dismissals | PDF, Excel |
| Complaints Report | Ripoti ya Malalamiko | All complaints | PDF, Excel |
| All Requests | Ripoti ya Maombi Yote | Combined view | PDF, Excel |

### 13.6 Status Translation Reference

| English Status | Swahili Translation |
|---------------|---------------------|
| Approved / Approved by Commission | Imekamilika |
| Pending | Inasubiri |
| Rejected | Imekataliwa |
| Under Review | Inakaguliwa |
| More Info Requested | Taarifa Zaidi Zinahitajika |
| Resolved | Imetatuliwa |

### 13.7 Technology Stack Reference

| Component | Technology | Version/Details |
|-----------|-----------|-----------------|
| **Framework** | Next.js | 14 (App Router) |
| **Database** | PostgreSQL | with Prisma ORM |
| **Storage** | MinIO | S3-compatible object storage |
| **Authentication** | Session-based | bcryptjs for password hashing |
| **State Management** | Zustand | For auth state |
| **Validation** | Zod | + React Hook Form |
| **UI Components** | Radix UI | + shadcn/ui components |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Charts** | Recharts | Dashboard visualizations |
| **PDF Generation** | jsPDF | + jsPDF-autotable for reports |
| **Excel Export** | XLSX | Library for Excel files |
| **AI Integration** | Google Genkit | (if complaint rewriting tested) |

### 13.8 Glossary

| Term | Definition |
|------|------------|
| **CSMS** | Civil Service Management System |
| **CSC** | Civil Service Commission - Central HR authority in Zanzibar |
| **HRO** | HR Officer - Institution-based role that submits requests |
| **HHRMD** | Head of Human Resources Management Development - Senior CSC approver |
| **HRMO** | Human Resource Management Officer - CSC approver for HR requests |
| **DO** | Disciplinary Officer - Handles complaints and terminations |
| **PO** | Planning Officer - Read-only access to reports |
| **CSCS** | Civil Service Commission Secretary - Executive oversight |
| **HRRP** | Human Resource Responsible Personnel - Institutional supervisor |
| **LWOP** | Leave Without Pay |
| **ZanID** | Zanzibar National ID Number |
| **ZSSF** | Zanzibar Social Security Fund Number |
| **MinIO** | Object storage system for files and documents |
| **HRIMS** | Human Resource Information Management System (external) |
| **UAT** | User Acceptance Testing |

### 13.9 Common Test Scenarios Matrix

| Scenario | HRO | HHRMD | HRMO | DO | EMPLOYEE | ADMIN |
|----------|-----|-------|------|----|----|-------|
| Submit Confirmation Request | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Approve Confirmation | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Submit Complaint | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Handle Complaint | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Approve Termination | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| View All Institutions | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Generate Reports | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ |
| View Reports Only | ✗ | ✗ | ✗ | ✗ | ✗ | PO role |
| Create Users | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Create Institutions | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| HRIMS Integration | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

---

**End of UAT Document**

*Version: 1.0*
*Date: December 23, 2025*
*Document Status: Ready for UAT Execution*
*Based on: Actual CSMS Implementation Analysis*
*System URL: https://csms.zanajira.go.tz*

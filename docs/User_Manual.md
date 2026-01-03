# USER MANUAL

## Civil Service Management System (CSMS)

**System Version:** 1.0
**Document Version:** 1.0
**Date:** December 25, 2025
**Prepared For:** Zanzibar Civil Service Commission

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Getting Started](#3-getting-started)
4. [User Roles and Permissions](#4-user-roles-and-permissions)
5. [Feature Descriptions](#5-feature-descriptions)
6. [Step-by-Step Procedures](#6-step-by-step-procedures)
7. [Reports and Analytics](#7-reports-and-analytics)
8. [Troubleshooting](#8-troubleshooting)
9. [Frequently Asked Questions](#9-frequently-asked-questions)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Purpose of This Manual

This User Manual provides comprehensive guidance for using the Civil Service Management System (CSMS). It contains step-by-step instructions, feature descriptions, and troubleshooting information to help you efficiently manage civil service HR operations in Zanzibar.

**Who Should Use This Manual:**

- Human Resources Officers (HRO)
- HR Management Officers (HRMO)
- Head of HR and Disciplinary (HHRMD)
- Disciplinary Officers (DO)
- Civil Service Commission Staff
- Planning Officers (PO)
- Administrators
- Employees

### 1.2 Document Conventions

Throughout this manual, the following conventions are used:

| Convention | Meaning                              | Example                                      |
| ---------- | ------------------------------------ | -------------------------------------------- |
| **Bold**   | Important terms, buttons, menu items | Click **Submit**                             |
| _Italic_   | Field names, filenames               | Enter employee name in _Name_ field          |
| `Code`     | System messages, URLs                | Navigate to `https://csms.zanajira.go.tz`    |
| 📋 Note    | Additional information               | 📋 **Note:** PDF files only, max 2MB         |
| ⚠️ Warning | Important warnings                   | ⚠️ **Warning:** This action cannot be undone |
| ✅ Tip     | Helpful tips                         | ✅ **Tip:** Use Ctrl+F to search             |

### 1.3 Getting Help

If you encounter issues not covered in this manual:

1. **Check the Troubleshooting section** (Section 8)
2. **Review Frequently Asked Questions** (Section 9)
3. **Contact System Administrator:**
   - **Email:** csms-support@zanajira.go.tz
   - **Phone:** +255 24 223 XXXX
4. **Submit a support ticket** through the system

---

## 2. System Overview

### 2.1 What is CSMS?

The **Civil Service Management System (CSMS)** is a comprehensive web-based application designed to manage the complete lifecycle of civil service employees in Zanzibar. The system handles employee records, HR requests, approvals, complaints, and reporting.

### 2.2 Key Features

**Core Modules:**

1. **Employee Profile Management** - Comprehensive employee records with photos and documents
2. **Request Management** - 8 types of HR requests with approval workflows
3. **Complaint Management** - Employee grievance handling
4. **Reporting System** - 10 report types with bilingual support
5. **HRIMS Integration** - External data synchronization
6. **Notifications** - Real-time alerts in English and Swahili
7. **Audit Trail** - Complete activity tracking
8. **User Management** - Role-based access control

**Request Types Managed:**

1. ✅ **Confirmation Requests** - Probation completion
2. 📈 **Promotion Requests** - Experience or education-based
3. 🏖️ **LWOP Requests** - Leave without pay
4. 🔄 **Cadre Change Requests** - Job title changes
5. 🎓 **Retirement Requests** - Voluntary, compulsory, or illness-based
6. 📝 **Resignation Requests** - Voluntary separation
7. ⏱️ **Service Extension Requests** - Post-retirement extensions
8. ⛔ **Termination/Dismissal** - Disciplinary separations

### 2.3 System Architecture

```
┌─────────────────────────────────────────────────────┐
│              CSMS WEB APPLICATION                   │
│         https://csms.zanajira.go.tz                │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Dashboard │  │Requests  │  │Reports   │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │Employees │  │Complaints│  │Settings  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
├─────────────────────────────────────────────────────┤
│              Next.js API Layer                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌───────────────────┐      │
│  │  PostgreSQL DB   │  │  MinIO Storage    │      │
│  │  (Employee Data) │  │  (PDF Documents)  │      │
│  └──────────────────┘  └───────────────────┘      │
└─────────────────────────────────────────────────────┘
```

### 2.4 Browser Requirements

**Supported Browsers:**

- ✅ Google Chrome 90+ (Recommended)
- ✅ Mozilla Firefox 88+
- ✅ Microsoft Edge 90+
- ✅ Safari 14+

**Screen Resolution:**

- Minimum: 1366 x 768
- Recommended: 1920 x 1080

**Internet Connection:**

- Minimum: 2 Mbps
- Recommended: 5 Mbps or higher

---

## 3. Getting Started

### 3.1 Accessing the System

#### Staff Login

**Step 1:** Open your web browser and navigate to:

```
https://csms.zanajira.go.tz
```

**Step 2:** You will see the login screen:

```
╔══════════════════════════════════════════╗
║   CIVIL SERVICE MANAGEMENT SYSTEM        ║
║                                          ║
║   ┌────────────────────────────────┐    ║
║   │ Username: [____________]       │    ║
║   │                                │    ║
║   │ Password: [____________]       │    ║
║   │                                │    ║
║   │  [ ] Remember me               │    ║
║   │                                │    ║
║   │      [    Login    ]           │    ║
║   │                                │    ║
║   │  Employee Login →              │    ║
║   └────────────────────────────────┘    ║
║                                          ║
║   © 2025 Zanzibar Civil Service         ║
╚══════════════════════════════════════════╝
```

**Step 3:** Enter your credentials:

- **Username:** Your assigned username (e.g., kmnyonge)
- **Password:** Your password

**Step 4:** Click **Login**

✅ **Tip:** Check "Remember me" if using a secure personal device

#### Employee Portal Login

Employees use a different login method:

**Step 1:** Navigate to:

```
https://csms.zanajira.go.tz/employee-login
```

**Step 2:** Enter your credentials:

```
╔══════════════════════════════════════════╗
║   EMPLOYEE PORTAL                        ║
║                                          ║
║   ┌────────────────────────────────┐    ║
║   │ ZAN ID: [____________]         │    ║
║   │                                │    ║
║   │ Payroll Number: [____________] │    ║
║   │                                │    ║
║   │ ZSSF Number: [____________]    │    ║
║   │                                │    ║
║   │      [    Login    ]           │    ║
║   │                                │    ║
║   │  ← Back to Staff Login         │    ║
║   └────────────────────────────────┘    ║
╚══════════════════════════════════════════╝
```

**Step 3:** Click **Login**

📋 **Note:** All three fields are required for employee login

### 3.2 First Time Login

After your first successful login:

1. **Welcome notification** appears
2. You are redirected to the **Dashboard**
3. **Change password** modal may appear (if required)

**To change your password on first login:**

1. Enter your _Current Password_
2. Enter your _New Password_ (minimum 8 characters, must contain uppercase, lowercase, and numbers)
3. Confirm your _New Password_
4. Click **Change Password**

**Password Requirements:**

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

✅ **Tip:** Use a password manager to create and store strong passwords

### 3.3 Understanding the Dashboard

After login, you will see the main dashboard:

```
┌────────────────────────────────────────────────────────────┐
│  [☰ CSMS]  Dashboard  Requests  Employees  Reports  [🔔][👤]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Welcome, Khamis Mnyonge (HRO)                            │
│                                                            │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │  Total    │  │ Pending   │  │ Approved  │            │
│  │ Employees │  │ Requests  │  │ This Week │            │
│  │    250    │  │     12    │  │     8     │            │
│  └───────────┘  └───────────┘  └───────────┘            │
│                                                            │
│  Recent Activities                        [Refresh]        │
│  ┌─────────────────────────────────────────────────┐      │
│  │ Date/Time  │ Type         │ Employee  │ Status  │      │
│  ├─────────────────────────────────────────────────┤      │
│  │ 2025-12-25 │ Confirmation │ Ali Juma  │ Pending │      │
│  │ 2025-12-24 │ Promotion    │ Safia K.  │ Approved│      │
│  │ ...        │ ...          │ ...       │ ...     │      │
│  └─────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────┘
```

**Dashboard Components:**

| Component                   | Description                          |
| --------------------------- | ------------------------------------ |
| **Top Navigation Bar**      | Access to main modules and user menu |
| **Statistics Cards**        | Quick overview of key metrics        |
| **Recent Activities**       | Latest request activities            |
| **Notifications Bell (🔔)** | Unread notifications counter         |
| **User Menu (👤)**          | Profile, settings, logout            |

### 3.4 Navigation Menu

Click the **☰ Menu** icon to open the sidebar:

```
┌─────────────────────┐
│  CSMS               │
├─────────────────────┤
│ 🏠 Dashboard        │
│                     │
│ 📋 REQUESTS         │
│  ✅ Confirmation    │
│  📈 Promotion       │
│  🏖️ LWOP           │
│  🔄 Cadre Change    │
│  🎓 Retirement      │
│  📝 Resignation     │
│  ⏱️ Service Ext.   │
│  ⛔ Termination     │
│                     │
│ 📢 Complaints       │
│ 👥 Employees        │
│ 📊 Reports          │
│ ⚙️ Settings         │
│                     │
│ 🚪 Logout           │
└─────────────────────┘
```

📋 **Note:** Menu items visible depend on your user role and permissions

### 3.5 Logging Out

**To log out safely:**

**Option 1:** Using sidebar menu

1. Click **☰ Menu**
2. Scroll to bottom
3. Click **🚪 Logout**

**Option 2:** Using user menu

1. Click **👤** (top right)
2. Select **Logout**

⚠️ **Warning:** Always log out when using shared computers

---

## 4. User Roles and Permissions

### 4.1 Role Overview

CSMS implements role-based access control (RBAC) with 9 distinct roles:

| Role Code    | Full Name                          | Access Scope                 | Primary Function                |
| ------------ | ---------------------------------- | ---------------------------- | ------------------------------- |
| **HRO**      | Human Resources Officer            | Institution only             | Submit HR requests              |
| **HHRMD**    | Head of HR & Disciplinary          | All institutions             | Approve HR & disciplinary       |
| **HRMO**     | HR Management Officer              | All institutions             | Approve HR requests             |
| **DO**       | Disciplinary Officer               | All institutions             | Handle complaints/terminations  |
| **PO**       | Planning Officer                   | All institutions (read-only) | View reports                    |
| **CSCS**     | Civil Service Commission Secretary | All institutions             | Executive oversight             |
| **HRRP**     | HR Responsible Personnel           | Institution only             | Institutional supervisor        |
| **ADMIN**    | Administrator                      | System-wide                  | System management               |
| **EMPLOYEE** | Employee                           | Own data only                | Submit complaints, view profile |

### 4.2 CSC Roles vs Institution Roles

**CSC Roles** (Civil Service Commission):

- **HHRMD**, **HRMO**, **DO**, **PO**, **CSCS**
- Can access data from **ALL institutions**
- Have approval authority across institutions
- See system-wide dashboard

**Institution-Based Roles:**

- **HRO**, **HRRP**
- Can only access data from **their own institution**
- Submit requests for their institution only
- See institution-specific dashboard

**Example:**

- **HRO at OFISI YA RAIS** can only see employees from OFISI YA RAIS
- **HRMO** can see employees from all 41 institutions

### 4.3 Role Permissions Matrix

| Function                      | HRO | HHRMD | HRMO | DO  | PO  | CSCS | HRRP | ADMIN | EMPLOYEE |
| ----------------------------- | --- | ----- | ---- | --- | --- | ---- | ---- | ----- | -------- |
| **View Dashboard**            | ✅  | ✅    | ✅   | ✅  | ❌  | ✅   | ✅   | ✅    | ❌       |
| **Submit Confirmations**      | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Confirmations**     | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Promotions**         | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Promotions**        | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit LWOP**               | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve LWOP**              | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Cadre Change**       | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Cadre Change**      | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Retirement**         | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Retirement**        | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Resignation**        | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Resignation**       | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Service Extension**  | ✅  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Service Extension** | ❌  | ✅    | ✅   | ❌  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Complaints**         | ❌  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ❌    | ✅       |
| **Approve Complaints**        | ❌  | ✅    | ❌   | ✅  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Submit Termination**        | ❌  | ❌    | ❌   | ✅  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **Approve Termination**       | ❌  | ✅    | ❌   | ✅  | ❌  | ❌   | ❌   | ❌    | ❌       |
| **View Reports**              | ✅  | ✅    | ✅   | ✅  | ✅  | ✅   | ✅   | ✅    | ❌       |
| **Export Reports**            | ✅  | ✅    | ✅   | ✅  | ✅  | ✅   | ✅   | ✅    | ❌       |
| **Manage Users**              | ❌  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ✅    | ❌       |
| **Manage Institutions**       | ❌  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ✅    | ❌       |
| **HRIMS Sync**                | ❌  | ❌    | ❌   | ❌  | ❌  | ❌   | ❌   | ✅    | ❌       |
| **View Own Profile**          | ✅  | ✅    | ✅   | ✅  | ✅  | ✅   | ✅   | ✅    | ✅       |
| **Change Password**           | ✅  | ✅    | ✅   | ✅  | ✅  | ✅   | ✅   | ✅    | ✅       |

### 4.4 Request Approval Authority

**HR Requests** (Can be approved by HHRMD OR HRMO):

- ✅ Confirmation
- 📈 Promotion
- 🏖️ LWOP
- 🔄 Cadre Change
- 🎓 Retirement
- 📝 Resignation
- ⏱️ Service Extension

**Disciplinary Requests** (Can be approved by HHRMD OR DO):

- 📢 Complaints
- ⛔ Termination/Dismissal

📋 **Note:** HHRMD has authority over both HR and Disciplinary requests

---

## 5. Feature Descriptions

### 5.1 Employee Profile Management

**Purpose:** Maintain comprehensive records for all civil service employees

**Key Information Stored:**

- Personal details (name, ZAN ID, date of birth, contact)
- Employment details (cadre, salary scale, employment date)
- Status (On Probation, Confirmed, On LWOP, Retired, etc.)
- Institution and department assignment
- Retirement date and confirmation date
- Profile photo
- Official documents (PDF format)
- Educational certificates

**Document Types:**

1. **Ardhil Hali** - Employment verification
2. **Confirmation Letter** - Probation completion
3. **Job Contract** - Employment agreement
4. **Birth Certificate** - Identity verification
5. **Educational Certificates** - Academic qualifications

**Employee Statuses:**

- **On Probation** - New employee in probation period
- **Confirmed** - Successfully completed probation
- **On LWOP** - Currently on leave without pay
- **Retired** - No longer in active service (retirement)
- **Resigned** - Voluntarily left service
- **Dismissed** - Terminated due to disciplinary action
- **Separated** - Other separation reasons

### 5.2 Request Management System

**Workflow Overview:**

```
┌──────────────┐
│ HRO Submits  │
│   Request    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Pending    │
│   Review     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ HHRMD/HRMO/DO Review │
└──────┬───────────────┘
       │
    ┌──┴──┐
    │     │
    ▼     ▼
┌───────┐ ┌─────────┐
│Approve│ │ Reject  │
└───┬───┘ └────┬────┘
    │          │
    ▼          ▼
┌─────────┐ ┌──────────┐
│Employee │ │  HRO     │
│ Status  │ │ Notified │
│ Updated │ │          │
└─────────┘ └──────────┘
```

**Common Request Fields:**

- Employee selection
- Supporting documents (PDF, max 2MB each)
- Request-specific details
- Status tracking
- Approval/rejection reason

**Request Statuses:**

- **Pending** - Awaiting review
- **Approved** - Approved by Commission
- **Rejected** - Rejected with reason
- **Completed** - Fully processed

### 5.3 Notification System

**Notification Types:**

| Event             | Recipient       | Message (English)                | Message (Swahili)                  |
| ----------------- | --------------- | -------------------------------- | ---------------------------------- |
| Login             | User            | Welcome to CSMS!                 | Karibu CSMS!                       |
| Request Submitted | HHRMD, HRMO, DO | New request requires your review | Ombi jipya linahitaji ukaguzi wako |
| Request Approved  | HRO             | Your request has been approved   | Ombi lako limeidhinishwa           |
| Request Rejected  | HRO             | Your request has been rejected   | Ombi lako limekataliwa             |
| Password Changed  | User            | Your password has been changed   | Nenosiri lako limebadilishwa       |

**Notification Features:**

- Real-time alerts
- Bilingual support (English/Swahili)
- Read/unread status
- Notification bell icon with counter
- Direct links to related items

**To view notifications:**

1. Click the **🔔 Bell icon** in top navigation
2. See unread count badge
3. Click to open notification panel
4. Click notification to navigate to related item
5. Mark as read/unread

### 5.4 File Management

**File Upload Specifications:**

| Requirement      | Specification               |
| ---------------- | --------------------------- |
| **File Format**  | PDF only (.pdf)             |
| **Maximum Size** | 2 MB per file               |
| **Storage**      | MinIO S3-compatible storage |
| **Security**     | Secure signed URLs          |
| **Features**     | Upload, Download, Preview   |

**Supported Operations:**

1. **Upload:**
   - Drag and drop or click to browse
   - Automatic validation (format & size)
   - Progress indicator
   - Success/error feedback

2. **Download:**
   - Click download icon
   - File downloaded to browser's default location
   - Original filename preserved

3. **Preview:**
   - In-browser PDF viewer
   - No download required
   - Navigate pages within preview

### 5.5 Search and Filter

**Employee Search:**

- Search by ZAN ID
- Search by Payroll Number
- Search by Name
- Search by Cadre
- Search by Institution

**Request Filters:**

- Filter by status
- Filter by date range
- Filter by request type
- Filter by employee
- Filter by institution (CSC roles only)

**Search Tips:**

- ✅ Partial matching supported
- ✅ Case-insensitive search
- ✅ Use quotation marks for exact match
- ✅ Clear filters to see all results

---

## 6. Step-by-Step Procedures

### 6.1 Employee Confirmation Request

**Purpose:** Confirm employees who have completed probation period

**Prerequisites:**

- Employee must have status "On Probation"
- Employee must have completed probation period (typically 6 months)
- Required documents prepared (PDF format, max 2MB each)

**Step-by-Step Instructions:**

#### Part 1: Submit Confirmation Request (HRO)

**Step 1:** Access Confirmation Module

1. Log in as HRO
2. Click **☰ Menu**
3. Select **Confirmation**

**Step 2:** Start New Request

1. Click **+ New Confirmation Request** button
2. Confirmation form appears

**Step 3:** Search for Employee

1. Locate the _Employee Search_ section
2. Enter employee's **ZAN ID** or **Payroll Number**
3. Click **Search**
4. Employee details populate automatically

**Step 4:** Verify Employee Information
Review the displayed information:

- Employee name
- ZAN ID
- Current status (should be "On Probation")
- Employment date
- Department and institution

⚠️ **Warning:** If employee status is not "On Probation", you cannot submit confirmation

**Step 5:** Upload Supporting Documents

1. Scroll to _Documents_ section
2. Click **Upload Document** or drag PDF file
3. Wait for upload confirmation (progress bar shown)
4. Repeat for multiple documents if needed

📋 **Note:**

- Only PDF files accepted
- Maximum 2MB per file
- Multiple documents can be uploaded

**Step 6:** Review and Submit

1. Review all information carefully
2. Ensure all required documents uploaded
3. Click **Submit Confirmation Request**
4. Confirmation message appears
5. Request status set to "Pending"

**Step 7:** Confirmation
You will see:

```
┌─────────────────────────────────────┐
│  ✓ Success!                         │
│                                     │
│  Confirmation request submitted     │
│  Request ID: CONF-2025-001         │
│  Status: Pending Review             │
│                                     │
│  HHRMD and HRMO have been notified │
│                                     │
│  [   View Request   ]  [   OK   ]  │
└─────────────────────────────────────┘
```

✅ **Tip:** Note the Request ID for future tracking

#### Part 2: Review and Approve Confirmation (HHRMD/HRMO)

**Step 1:** View Pending Confirmations

1. Log in as HHRMD or HRMO
2. Navigate to **Confirmation** module
3. See list of pending requests

**Step 2:** Open Request for Review

1. Click **View Details** on a pending request
2. Request details modal opens

**Step 3:** Review Request Information
Review:

- Employee personal information
- Current employment status
- Employment date
- Supporting documents

**Step 4:** Review Documents

1. Click **Preview** to view documents in browser
2. Click **Download** to save document
3. Verify all required documents present and valid

**Step 5:** Make Decision

**Option A: Approve**

1. Click **Approve** button
2. Optional: Add approval comments
3. Click **Confirm Approval**
4. System updates:
   - Employee status → "Confirmed"
   - Confirmation date set to today
   - Request status → "Approved"
   - HRO receives notification

**Option B: Reject**

1. Click **Reject** button
2. Rejection reason modal appears
3. Enter detailed rejection reason (required)
4. Click **Submit Rejection**
5. System updates:
   - Employee status unchanged
   - Request status → "Rejected"
   - HRO receives notification with reason

**Step 6:** Confirmation
Success message displays:

```
┌─────────────────────────────────────┐
│  ✓ Request Approved                 │
│                                     │
│  Employee: Ali Juma Ali             │
│  Status: Confirmed                  │
│  Confirmation Date: 2025-12-25     │
│                                     │
│  Notification sent to HRO           │
│                                     │
│  [   Close   ]                      │
└─────────────────────────────────────┘
```

#### Part 3: Track Request Status (HRO)

**Step 1:** Navigate to Track Status

1. Click **☰ Menu**
2. Select **Track Status**

**Step 2:** Find Your Request

1. Use search or filter by request type
2. Locate your confirmation request
3. View current status

**Step 3:** View Status Timeline

```
Timeline:
  ● Submitted by HRO        2025-12-25 09:00
  ● Pending Review          2025-12-25 09:01
  ● Approved by HHRMD       2025-12-25 14:30
  ● Employee Confirmed      2025-12-25 14:30
```

---

### 6.2 Promotion Request (Experience-Based)

**Purpose:** Request promotion for employee based on performance/experience

**Prerequisites:**

- Employee must be "Confirmed" (not on probation or LWOP)
- Employee must have minimum 3 years of service
- Performance appraisals for last 3 years (PDF format)
- CSC promotion form completed
- Letter of request from institution

**Step-by-Step Instructions:**

#### Part 1: Submit Promotion Request (HRO)

**Step 1:** Access Promotion Module

1. Log in as HRO
2. Navigate to **Promotion**
3. Click **+ New Promotion Request**

**Step 2:** Search for Employee

1. Enter employee's **ZAN ID** or **Payroll Number**
2. Click **Search**
3. Employee details populate

**Step 3:** Verify Employee Eligibility
System automatically checks:

- ✅ Employee status is "Confirmed"
- ✅ Not currently on LWOP
- ✅ Has at least 3 years of service
- ✅ No pending promotion request

⚠️ **Warning:** If any check fails, you will see error message and cannot proceed

**Step 4:** Select Promotion Type

1. Click on _Promotion Type_ dropdown
2. Select **"Promotion Based on Experience (Performance)"**
3. Form updates to show experience-based fields

**Step 5:** Enter Proposed Cadre

1. In _Proposed Cadre_ field, enter new position
2. Example: "Senior Administrative Officer Grade I"

📋 **Note:** Be specific about grade level

**Step 6:** Upload Required Documents

You must upload 5 documents:

1. **Performance Appraisal Year 1:**
   - Click **Upload** under "Performance Appraisal Form (Year 1)"
   - Select PDF file
   - Wait for upload confirmation

2. **Performance Appraisal Year 2:**
   - Upload second year's appraisal

3. **Performance Appraisal Year 3:**
   - Upload third year's appraisal

4. **CSC Promotion Form:**
   - Upload completed Civil Service Commission promotion form

5. **Letter of Request:**
   - Upload official letter requesting promotion

⚠️ **Warning:** All 5 documents are required. Submit button will be disabled until all uploaded.

**Step 7:** Review and Submit

1. Review employee details
2. Verify proposed cadre correct
3. Confirm all 5 documents uploaded
4. Click **Submit Promotion Request**

**Step 8:** Success Confirmation

```
┌─────────────────────────────────────┐
│  ✓ Promotion Request Submitted      │
│                                     │
│  Employee: Safia Juma Ali           │
│  Type: Experience-based             │
│  Proposed Cadre: Senior HR Officer  │
│  Status: Pending HRMO/HHRMD Review  │
│                                     │
│  Request ID: PROM-2025-042         │
│                                     │
│  [   Track Status   ]  [   OK   ]  │
└─────────────────────────────────────┘
```

#### Part 2: Review and Approve Promotion (HHRMD/HRMO)

**Step 1:** View Pending Promotions

1. Log in as HHRMD or HRMO
2. Navigate to **Promotion** module
3. See list of pending requests

**Step 2:** Open Request Details

1. Click **View Details** on request
2. Details modal opens showing:
   - Employee information
   - Promotion type
   - Proposed cadre
   - All uploaded documents

**Step 3:** Review Documents

1. Click **Preview** on each document
2. Review:
   - Performance appraisal Year 1
   - Performance appraisal Year 2
   - Performance appraisal Year 3
   - CSC promotion form
   - Letter of request

**Step 4:** Verify Promotion Justification
Check:

- ✅ Performance ratings acceptable
- ✅ All appraisals signed and approved
- ✅ Proposed cadre appropriate
- ✅ CSC form correctly filled
- ✅ Letter properly authorized

**Step 5:** Make Decision

**To Approve:**

1. Click **Approve** button
2. Optional: Add comments about approval decision
3. Click **Confirm Approval**
4. System automatically:
   - Updates employee cadre to proposed cadre
   - Sets promotion date to today
   - Changes request status to "Approved"
   - Sends notification to HRO

**To Reject:**

1. Click **Reject** button
2. Enter detailed rejection reason
3. Examples:
   - "Performance appraisals do not meet minimum standards"
   - "Proposed cadre not aligned with current salary scale"
   - "Missing signature on CSC promotion form"
4. Click **Submit Rejection**
5. Employee cadre remains unchanged
6. HRO notified with rejection reason

**Step 6:** Confirmation

```
┌─────────────────────────────────────┐
│  ✓ Promotion Approved               │
│                                     │
│  Employee: Safia Juma Ali           │
│  Previous Cadre: HR Officer         │
│  New Cadre: Senior HR Officer       │
│  Effective Date: 2025-12-25        │
│                                     │
│  Employee record updated            │
│                                     │
│  [   Close   ]                      │
└─────────────────────────────────────┘
```

---

### 6.3 Promotion Request (Education-Based)

**Purpose:** Request promotion based on educational advancement

**Prerequisites:**

- Employee status must be "Confirmed"
- New educational certificate obtained
- TCU form (if studied outside Tanzania)
- Letter of request

**Step-by-Step Instructions:**

**Step 1:** Access Promotion Module

1. Log in as HRO
2. Navigate to **Promotion**
3. Click **+ New Promotion Request**

**Step 2:** Search and Select Employee

1. Search by ZAN ID or Payroll Number
2. Verify employee eligible

**Step 3:** Select Promotion Type

1. Select **"Promotion Based on Education Advancement"**
2. Form updates to show education-based fields

**Step 4:** Enter Proposed Cadre

1. Enter new position based on educational qualification
2. Example: "Assistant Lecturer" (with new Master's degree)

**Step 5:** Upload Educational Certificate

1. Click **Upload** under "Academic Certificate"
2. Select PDF of educational certificate
3. Wait for upload confirmation

**Step 6:** Studied Outside Country?

1. If employee studied outside Tanzania, check **"Employee studied outside the country?"**
2. Additional field appears: "Upload TCU Form"
3. Upload Tanzania Commission for Universities verification form

📋 **Note:** TCU form is required if checkbox is selected

**Step 7:** Upload Letter of Request

1. Upload official letter requesting promotion
2. Ensure letter references new educational qualification

**Step 8:** Review and Submit

1. Verify proposed cadre
2. Confirm certificate uploaded
3. Confirm TCU form uploaded (if applicable)
4. Click **Submit Promotion Request**

**Step 9:** Success Confirmation
Request submitted and notifications sent to HHRMD/HRMO

**Approval Process:** Same as experience-based promotion (see section 6.2, Part 2)

---

### 6.4 Leave Without Pay (LWOP) Request

**Purpose:** Request unpaid leave for employee

**Prerequisites:**

- Employee must be "Confirmed"
- Employee must not already be on LWOP
- Supporting documents prepared

**Step-by-Step Instructions:**

**Step 1:** Access LWOP Module

1. Log in as HRO
2. Navigate to **LWOP**
3. Click **+ New LWOP Request**

**Step 2:** Select Employee

1. Search by ZAN ID or Payroll Number
2. Verify employee status is "Confirmed"

**Step 3:** Enter LWOP Details

1. **Start Date:**
   - Click calendar icon
   - Select start date of leave

2. **End Date:**
   - Click calendar icon
   - Select end date of leave

3. **Duration:**
   - Enter duration in text (e.g., "6 months", "1 year")

4. **Reason:**
   - Enter detailed reason for LWOP
   - Examples: "Further studies abroad", "Personal family matters", "Health reasons"

**Step 4:** Upload Supporting Documents

1. Upload relevant supporting documents
2. Examples:
   - Admission letter (if for studies)
   - Medical certificate (if health-related)
   - Personal statement

**Step 5:** Review and Submit

1. Verify dates are correct
2. Verify end date is after start date
3. Ensure duration specified
4. Click **Submit LWOP Request**

**Step 6:** Approval Process
HHRMD or HRMO reviews and approves:

- If approved: Employee status changes to "On LWOP"
- If rejected: Employee status unchanged

---

### 6.5 Retirement Request

**Purpose:** Process employee retirement (voluntary, compulsory, or medical)

**Prerequisites:**

- Employee must be "Confirmed"
- Appropriate retirement age or conditions met
- Supporting documents

**Step-by-Step Instructions:**

**Step 1:** Access Retirement Module

1. Log in as HRO
2. Navigate to **Retirement**
3. Click **+ New Retirement Request**

**Step 2:** Select Employee

1. Search and select employee
2. Verify employee eligible for retirement

**Step 3:** Select Retirement Type

Choose one of three types:

1. **Voluntary Retirement:**
   - Employee chooses to retire
   - May be before mandatory retirement age

2. **Compulsory Retirement:**
   - Mandatory retirement at age 60
   - System validates retirement age

3. **Medical Retirement:**
   - Retirement due to health reasons
   - Additional field appears: "Illness Description"

**Step 4:** Enter Retirement Details

1. **Proposed Retirement Date:**
   - Select date employee will retire

2. **Reason for Delay (if applicable):**
   - If retiring after mandatory age, explain delay

3. **Illness Description (Medical only):**
   - If medical retirement, describe illness/condition

**Step 5:** Upload Documents
Upload required documents based on retirement type:

**For All Types:**

- Retirement application letter
- Employment verification

**For Medical Retirement:**

- Medical certificate from approved physician
- Medical board recommendation (if applicable)

**Step 6:** Submit Request

1. Review all information
2. Click **Submit Retirement Request**
3. Await HHRMD/HRMO approval

**Step 7:** After Approval
When approved:

- Employee status → "Retired"
- Retirement date recorded
- Employee no longer appears in active employee lists

---

### 6.6 Employee Complaint Submission

**Purpose:** Allow employees to submit grievances

**Prerequisites:**

- Valid employee credentials (ZAN ID, Payroll Number, ZSSF Number)
- Details of complaint
- Supporting evidence (optional)

**Step-by-Step Instructions:**

**Step 1:** Access Employee Portal

1. Navigate to `https://csms.zanajira.go.tz/employee-login`
2. Enter your credentials:
   - ZAN ID
   - Payroll Number
   - ZSSF Number
3. Click **Login**

**Step 2:** Navigate to Complaints

1. After login, you see your employee profile
2. Click **Submit Complaint** button

**Step 3:** Fill Complaint Form

1. **Complaint Type:**
   - Select from dropdown
   - Options: Harassment, Discrimination, Workplace Safety, Other

2. **Subject:**
   - Brief summary of complaint
   - Example: "Workplace harassment by supervisor"

3. **Details:**
   - Detailed description of issue
   - Include dates, locations, witnesses
   - Be specific and factual

4. **Your Phone Number:**
   - Enter your contact phone

5. **Next of Kin Phone Number:**
   - Enter emergency contact

**Step 4:** Upload Supporting Documents (Optional)

1. If you have evidence, click **Upload**
2. Upload documents (PDF, max 2MB each)
3. Examples: emails, photos of issues, written statements

**Step 5:** Review and Submit

1. Review all information
2. Ensure contact numbers correct
3. Click **Submit Complaint**

**Step 6:** Confirmation

```
┌─────────────────────────────────────┐
│  ✓ Complaint Submitted              │
│                                     │
│  Complaint ID: COMP-2025-015       │
│  Status: Pending Review             │
│  Assigned to: Disciplinary Officer  │
│                                     │
│  You will be contacted within       │
│  5 business days                    │
│                                     │
│  [   Track Status   ]  [   OK   ]  │
└─────────────────────────────────────┘
```

**Step 7:** Track Your Complaint

1. Log in anytime to employee portal
2. View your complaint status
3. Check for updates

📋 **Note:** Complaints are confidential and taken seriously

---

### 6.7 User Management (Admin)

**Purpose:** Create and manage user accounts

**Prerequisites:**

- Admin role
- User information
- Institution assignment

**Step-by-Step Instructions:**

**Step 1:** Access User Management

1. Log in as Admin
2. Navigate to **Admin** → **Users**
3. Click **+ Create New User**

**Step 2:** Enter User Information

1. **Username:**
   - Unique username (lowercase, no spaces)
   - Example: "amohamed"

2. **Full Name:**
   - User's complete name
   - Example: "Ahmed Mohamed Ali"

3. **Role:**
   - Select from dropdown:
     - HRO
     - HHRMD
     - HRMO
     - DO
     - PO
     - CSCS
     - HRRP
     - Admin

4. **Institution:**
   - Select institution from dropdown
   - For CSC roles, select "TUME YA UTUMISHI SERIKALINI"
   - For HRO/HRRP, select their institution

5. **Email (optional):**
   - User's email address

6. **Phone Number (optional):**
   - User's contact number

7. **Initial Password:**
   - System generates secure password
   - Or enter custom password

**Step 3:** Set Employee Link (Optional)

1. If user is also an employee, link to employee record
2. Search employee by ZAN ID
3. Select matching employee

**Step 4:** Review and Create

1. Verify all information
2. Click **Create User**
3. User account created

**Step 5:** Communicate Credentials

1. Securely share credentials with new user:
   - Username
   - Initial password
2. Instruct user to change password on first login

⚠️ **Warning:** Never share passwords via insecure channels (email, SMS)

#### Deactivate User

**To deactivate a user account:**

1. Navigate to **Users** list
2. Find user to deactivate
3. Click **Actions** → **Deactivate**
4. Confirm deactivation
5. User can no longer log in

#### Reset User Password

**To reset a user's password:**

1. Find user in Users list
2. Click **Actions** → **Reset Password**
3. System generates new password
4. Securely communicate new password to user

---

### 6.8 HRIMS Data Synchronization (Admin)

**Purpose:** Sync employee data from external HRIMS system

**Prerequisites:**

- Admin role
- HRIMS system accessible
- Institution ID to sync

**Step-by-Step Instructions:**

**Step 1:** Access HRIMS Integration

1. Log in as Admin
2. Navigate to **Admin** → **HRIMS Integration**

**Step 2:** Select Sync Type

Choose one of:

1. **Fetch by Institution:**
   - Sync all employees from one institution
   - Best for initial data load

2. **Fetch Single Employee:**
   - Sync one specific employee
   - Best for updates

3. **Bulk Fetch:**
   - Sync multiple institutions
   - Use carefully (can take long time)

**Step 3:** Fetch by Institution (Example)

1. Click **Fetch by Institution**
2. Select institution from dropdown
3. Click **Start Sync**
4. Progress indicator shows:

   ```
   ┌──────────────────────────────────┐
   │  Syncing Institution Data...     │
   │                                  │
   │  ████████████░░░░░░░ 60%        │
   │                                  │
   │  Fetched 3,000 / 5,000 employees│
   │                                  │
   │  Estimated time: 2 minutes      │
   └──────────────────────────────────┘
   ```

5. Wait for completion (can take 5-15 minutes for large institutions)

**Step 4:** Review Sync Results

```
┌──────────────────────────────────────┐
│  ✓ Sync Completed                    │
│                                      │
│  Institution: OFISI YA RAIS          │
│  Total Employees: 5,234              │
│  New Records: 15                     │
│  Updated Records: 42                 │
│  Errors: 0                           │
│                                      │
│  Sync Time: 8 minutes 32 seconds    │
│                                      │
│  [   View Report   ]  [   Close   ] │
└──────────────────────────────────────┘
```

**Step 5:** Verify Data

1. Navigate to Employees module
2. Filter by institution
3. Spot-check employee records
4. Verify photos and documents synced

⚠️ **Warning:** Large institution syncs can take 10-15 minutes. Do not close browser window.

**Step 6:** Fetch Employee Photos (Separate Step)

After fetching employee data:

1. Click **Fetch Photos by Institution**
2. Select same institution
3. Click **Start Fetch**
4. Wait for completion

**Step 7:** Fetch Employee Documents (Separate Step)

To sync documents:

1. Click **Fetch Documents by Institution**
2. Select institution
3. Click **Start Fetch**
4. Documents saved to MinIO storage

📋 **Note:** Photos and documents are separate operations from employee data sync

---

## 7. Reports and Analytics

### 7.1 Available Reports

CSMS provides 10 comprehensive report types:

| Report Name                     | Description                | Data Included                                          | Permissions               |
| ------------------------------- | -------------------------- | ------------------------------------------------------ | ------------------------- |
| **1. Confirmation Report**      | Employee confirmations     | Employee details, confirmation dates, status           | All roles except Employee |
| **2. Promotion Report**         | Promotions granted         | Employee, promotion type, old/new cadre, approval date | All roles except Employee |
| **3. LWOP Report**              | Leave without pay          | Employee, start date, end date, duration, status       | All roles except Employee |
| **4. Cadre Change Report**      | Job title changes          | Employee, old/new cadre, reason, approval              | All roles except Employee |
| **5. Retirement Report**        | Retirements                | Employee, retirement type, retirement date, status     | All roles except Employee |
| **6. Resignation Report**       | Resignations               | Employee, resignation date, reason                     | All roles except Employee |
| **7. Service Extension Report** | Post-retirement extensions | Employee, extension period, justification              | All roles except Employee |
| **8. Termination Report**       | Dismissals/terminations    | Employee, termination type, reason, date               | All roles except Employee |
| **9. Complaint Report**         | Employee grievances        | Complaint type, status, resolution                     | All roles except Employee |
| **10. Employee List Report**    | All employees              | Complete employee roster with details                  | All roles except Employee |

### 7.2 Generating Reports

**Step-by-Step Instructions:**

**Step 1:** Access Reports Module

1. Log in with appropriate role
2. Click **☰ Menu**
3. Select **Reports**

**Step 2:** Select Report Type

1. You will see report cards:
   ```
   ┌───────────────────┐  ┌───────────────────┐
   │  📋 Confirmation  │  │  📈 Promotion     │
   │     Report        │  │     Report        │
   │                   │  │                   │
   │  [Generate]       │  │  [Generate]       │
   └───────────────────┘  └───────────────────┘
   ```
2. Click **Generate** on desired report

**Step 3:** Configure Report Parameters

Most reports offer filters:

1. **Date Range:**
   - Start Date: [Calendar picker]
   - End Date: [Calendar picker]

2. **Institution (CSC Roles only):**
   - Select specific institution
   - Or select "All Institutions"

3. **Status Filter:**
   - Pending
   - Approved
   - Rejected
   - All

4. **Gender Filter (Employee List):**
   - Male
   - Female
   - All

**Step 4:** Generate Report

1. Click **Generate Report** button
2. System processes request
3. Report displays in browser

**Step 5:** Review Report

Report displays in table format:

```
┌──────────────────────────────────────────────────────┐
│ Confirmation Report                                  │
│ Date Range: 2025-01-01 to 2025-12-31               │
│ Institution: All Institutions                        │
│ Total Records: 156                                   │
├──────────────────────────────────────────────────────┤
│ Date  │ Employee     │ Institution  │ Status       │
├──────────────────────────────────────────────────────┤
│ 12/25 │ Ali Juma     │ OFISI RAIS  │ Imekamilika │
│ 12/24 │ Safia Khamis │ WIZARA AFYA │ Inasubiri   │
│ ...   │ ...          │ ...         │ ...         │
└──────────────────────────────────────────────────────┘
```

### 7.3 Bilingual Report Columns

**Reports include both English and Swahili columns:**

| English Column | Swahili Column     | Values                                                              |
| -------------- | ------------------ | ------------------------------------------------------------------- |
| Status         | Hali               | Pending / Inasubiri, Approved / Imekamilika, Rejected / Imekataliwa |
| Employee Name  | Jina la Mfanyakazi | [Employee names]                                                    |
| Institution    | Taasisi            | [Institution names]                                                 |
| Date           | Tarehe             | [Dates in DD/MM/YYYY]                                               |
| Gender         | Jinsia             | Male / Mwanaume, Female / Mwanamke                                  |
| Department     | Idara              | [Department names]                                                  |

### 7.4 Exporting Reports

**Available Export Formats:**

1. **PDF** - For printing and archiving
2. **Excel** - For further analysis
3. **CSV** - For data import to other systems

**To export a report:**

**Step 1:** Generate report (see section 7.2)

**Step 2:** Click Export Button

- Located at top-right of report
- Shows export options:
  ```
  ┌──────────────┐
  │  Export ▼    │
  ├──────────────┤
  │  📄 PDF      │
  │  📊 Excel    │
  │  📋 CSV      │
  └──────────────┘
  ```

**Step 3:** Select Format

1. Click desired format (PDF, Excel, or CSV)
2. Browser initiates download
3. File saved to Downloads folder

**PDF Export Features:**

- Professional formatting
- Company header/footer
- Page numbers
- Date/time of generation
- Report parameters shown

**Excel Export Features:**

- One sheet per report
- Column headers
- Filterable data
- Formatted dates
- Sum totals where applicable

**CSV Export Features:**

- UTF-8 encoding (supports Swahili characters)
- Comma-separated values
- Headers included
- Compatible with Excel, Google Sheets

### 7.5 Report Scheduling (Future Feature)

📋 **Note:** Report scheduling is planned for future release

Planned features:

- Schedule recurring reports (daily, weekly, monthly)
- Email delivery to stakeholders
- Automatic archiving

---

## 8. Troubleshooting

### 8.1 Login Issues

#### Problem: "Invalid username or password"

**Possible Causes:**

- Incorrect username
- Incorrect password
- Caps Lock enabled
- Account deactivated

**Solutions:**

1. **Check Caps Lock:**
   - Ensure Caps Lock is OFF
   - Passwords are case-sensitive

2. **Verify Username:**
   - Usernames are lowercase
   - No spaces allowed
   - Check with administrator if unsure

3. **Reset Password:**
   - Contact system administrator
   - Request password reset
   - Check email for reset link (if email configured)

4. **Account Status:**
   - Verify account is active
   - Contact administrator to check account status

#### Problem: "Account is not active"

**Cause:** Your account has been deactivated

**Solution:**

1. Contact system administrator
2. Request account reactivation
3. Provide reason for reactivation

#### Problem: "Session expired"

**Cause:** You've been inactive for too long

**Solution:**

1. Click **OK** on session expired message
2. Log in again
3. Continue your work

✅ **Tip:** Save work frequently to avoid data loss

#### Problem: Employee login not working

**Possible Causes:**

- Incorrect ZAN ID
- Incorrect Payroll Number
- Incorrect ZSSF Number
- Employee record not in system

**Solutions:**

1. **Verify Credentials:**
   - Double-check all three identifiers
   - Ensure no extra spaces
   - Check document for correct numbers

2. **Contact HR:**
   - If employee record missing
   - HR can verify details
   - May need HRIMS sync

### 8.2 File Upload Issues

#### Problem: "Only PDF files allowed"

**Cause:** Trying to upload non-PDF file

**Solution:**

1. Convert document to PDF format
2. Use PDF conversion tools:
   - Microsoft Word → Save As → PDF
   - Online converters (Adobe, Smallpdf)
   - Print to PDF
3. Retry upload with PDF file

#### Problem: "File size exceeds 2MB limit"

**Cause:** PDF file larger than 2MB

**Solutions:**

1. **Compress PDF:**
   - Use online PDF compressor
   - Tools: Adobe Compress PDF, Smallpdf, iLovePDF
   - Aim for under 2MB

2. **Reduce PDF Quality:**
   - Re-scan at lower DPI (300 DPI instead of 600 DPI)
   - Remove unnecessary pages
   - Convert color to grayscale

3. **Split Large Documents:**
   - If document is very long
   - Split into multiple 2MB files
   - Upload separately (if system allows multiple uploads)

#### Problem: File upload stuck at "Uploading..."

**Possible Causes:**

- Slow internet connection
- Large file size
- Browser issue
- Server timeout

**Solutions:**

1. **Check Internet Connection:**
   - Test connection speed
   - Ensure stable connection
   - Retry on better network

2. **Wait Longer:**
   - Large files take time
   - 2MB can take 30-60 seconds on slow connections
   - Don't close browser window

3. **Refresh and Retry:**
   - If stuck for >5 minutes
   - Refresh page
   - Start upload again

4. **Try Different Browser:**
   - Switch to Chrome (recommended)
   - Clear browser cache
   - Disable browser extensions

#### Problem: Uploaded file not appearing

**Cause:** Upload may have failed silently

**Solution:**

1. Refresh the page
2. Check if file appears
3. If not, re-upload file
4. Look for success message before proceeding

### 8.3 Search and Filter Issues

#### Problem: Employee not found in search

**Possible Causes:**

- Typo in search term
- Employee not in system
- Institution filter applied
- Employee record not synced from HRIMS

**Solutions:**

1. **Check Search Term:**
   - Verify spelling of name
   - Try partial name (first name only)
   - Try ZAN ID or Payroll Number instead

2. **Clear Filters:**
   - Remove any active filters
   - Try search again

3. **Institution Access:**
   - If HRO role, can only see own institution
   - Verify employee is in your institution
   - Contact CSC role to verify existence

4. **HRIMS Sync:**
   - Employee may not be synced yet
   - Contact administrator
   - Request HRIMS sync for institution

#### Problem: "No results found"

**Cause:** Search criteria too specific or no matching records

**Solutions:**

1. **Broaden Search:**
   - Use fewer search terms
   - Use partial matching
   - Remove some filters

2. **Check Date Ranges:**
   - Expand date range
   - Try "All Time"

3. **Verify Data Exists:**
   - Check with colleagues
   - Confirm records should exist

### 8.4 Request Submission Issues

#### Problem: "Employee not eligible" error

**Causes vary by request type:**

**Confirmation:**

- Employee status not "On Probation"
- Employee already confirmed

**Promotion:**

- Employee status is "On Probation" or "On LWOP"
- Employee has pending promotion request
- Employee has less than 3 years service

**LWOP:**

- Employee already on LWOP
- Employee status not "Confirmed"

**Solutions:**

1. **Verify Employee Status:**
   - Check employee profile
   - Confirm status matches requirement
   - Wait for status change if needed

2. **Check Pending Requests:**
   - Navigate to Track Status
   - Look for pending request for same employee
   - Wait for previous request completion

3. **Service Years:**
   - For promotions, verify employment date
   - Calculate years of service
   - Wait until eligible

#### Problem: Submit button disabled

**Possible Causes:**

- Required fields not filled
- Documents not uploaded
- Form validation errors

**Solutions:**

1. **Check Required Fields:**
   - Look for red asterisks (\*)
   - Fill all required fields
   - Ensure no empty fields

2. **Upload Documents:**
   - Verify all required documents uploaded
   - Check for upload success messages
   - Retry failed uploads

3. **Fix Validation Errors:**
   - Look for red error text
   - Fix indicated issues
   - Example: "End date must be after start date"

#### Problem: Request submitted but not appearing

**Cause:** Display/refresh issue

**Solutions:**

1. **Refresh Page:**
   - Click browser refresh
   - Or press F5 / Ctrl+R

2. **Check Track Status:**
   - Navigate to Track Status module
   - Search for your request
   - Verify submission

3. **Check Notifications:**
   - Open notification panel
   - Look for submission confirmation

### 8.5 Report Issues

#### Problem: Report shows "No data"

**Possible Causes:**

- Date range has no records
- Filters too restrictive
- No data for selected criteria

**Solutions:**

1. **Expand Date Range:**
   - Use wider date range
   - Try "All Time"

2. **Remove Filters:**
   - Clear institution filter
   - Clear status filter
   - Generate with minimal filters

3. **Verify Data Exists:**
   - Check if any requests/employees exist
   - Confirm with colleagues

#### Problem: Report export fails

**Cause:** Browser download settings or large report size

**Solutions:**

1. **Check Browser Settings:**
   - Allow pop-ups for CSMS site
   - Check download permissions
   - Clear browser cache

2. **Reduce Report Size:**
   - Use smaller date range
   - Filter to specific institution
   - Generate smaller reports

3. **Try Different Format:**
   - If PDF fails, try Excel
   - If Excel fails, try CSV

### 8.6 Performance Issues

#### Problem: System slow or unresponsive

**Possible Causes:**

- Internet connection slow
- Server load high
- Browser issues
- Large dataset loading

**Solutions:**

1. **Check Internet Speed:**
   - Run speed test
   - Ensure minimum 2 Mbps
   - Switch to better network if possible

2. **Close Unused Tabs:**
   - Close other browser tabs
   - Free up browser memory

3. **Clear Browser Cache:**
   - Clear browsing data
   - Restart browser
   - Log in again

4. **Try Different Time:**
   - System may be busy
   - Try during off-peak hours
   - Early morning or late afternoon

5. **Use Pagination:**
   - For large lists, use pagination
   - Load 50-100 records at a time
   - Don't load all 5,000 employees at once

#### Problem: Page takes long to load

**Specific Issues:**

**Dashboard loading slowly:**

- Dashboard loads many statistics
- Wait 5-10 seconds
- Refresh if >30 seconds

**Employee list loading slowly:**

- Large institutions have many employees
- Use pagination (default 200 per page)
- Apply filters to reduce dataset

**HRIMS sync taking long:**

- Normal for large institutions
- Can take 5-15 minutes
- Progress indicator shows status
- Do not close browser window

---

## 9. Frequently Asked Questions

### 9.1 General Questions

**Q1: What browsers are supported?**

A: CSMS works best on:

- Google Chrome 90+ (Recommended)
- Mozilla Firefox 88+
- Microsoft Edge 90+
- Safari 14+

**Q2: Can I use CSMS on mobile phone?**

A: CSMS is optimized for desktop/laptop use. While it may work on tablets and phones, some features may not display correctly. We recommend using a computer for best experience.

**Q3: Is my data secure?**

A: Yes. CSMS uses:

- Encrypted connections (HTTPS)
- Role-based access control
- Secure password storage (bcrypt hashing)
- Regular backups
- Audit trail logging

**Q4: Can I access CSMS from home?**

A: Yes, CSMS is accessible from anywhere with internet connection. Use the same URL: https://csms.zanajira.go.tz

**Q5: What if I forget my password?**

A: Contact your system administrator to reset your password. For security reasons, password reset is not self-service.

### 9.2 Employee Management

**Q6: How often is employee data synced from HRIMS?**

A: Data sync frequency depends on administrator schedule. Typically:

- New institutions: Initial sync when added
- Updates: On-demand when requested
- Major updates: Quarterly

Contact administrator for specific sync schedule.

**Q7: Can I edit employee information directly in CSMS?**

A: No. CSMS is read-only for employee data from HRIMS. Employee data must be updated in HRIMS system, then re-synced to CSMS.

**Q8: What does each employee status mean?**

A:

- **On Probation:** New employee in probation period (typically 6 months)
- **Confirmed:** Probation successfully completed, permanent employee
- **On LWOP:** Currently on approved leave without pay
- **Retired:** No longer in active service (reached retirement age)
- **Resigned:** Voluntarily left civil service
- **Dismissed:** Terminated due to disciplinary action
- **Separated:** Other separation from service

### 9.3 Requests

**Q9: How long does request approval take?**

A: Approval timeline varies:

- **Target:** Within 5 business days
- **Simple requests:** 2-3 days
- **Complex requests:** Up to 2 weeks
- **Commission decisions:** May require meeting schedule

Check Track Status for real-time updates.

**Q10: Can I edit a submitted request?**

A: No. Once submitted, requests cannot be edited. If you need to make changes:

1. Wait for rejection
2. HRO can resubmit corrected request
3. Or contact approver to reject with reason

**Q11: What if my request is rejected?**

A: When rejected:

1. You receive notification with rejection reason
2. Review reason carefully
3. Address issues mentioned
4. Submit new request with corrections

**Q12: Can I submit multiple requests for same employee?**

A: Generally no. System blocks multiple pending requests of same type for one employee. You must wait for current request to be approved or rejected before submitting another.

Exception: Different request types can be submitted simultaneously (e.g., one confirmation and one promotion).

**Q13: Why can't I submit promotion for employee on probation?**

A: Employees must be confirmed before promotion. Business rules:

- Complete probation first
- Get confirmation approved
- Then eligible for promotion

**Q14: What documents are required for each request type?**

A:

| Request Type           | Required Documents                                                   |
| ---------------------- | -------------------------------------------------------------------- |
| Confirmation           | Any supporting documents (performance reviews, etc.)                 |
| Promotion (Experience) | Performance appraisals (3 years), CSC form, letter of request        |
| Promotion (Education)  | Educational certificate, TCU form (if applicable), letter of request |
| LWOP                   | Supporting documents based on reason                                 |
| Cadre Change           | Justification letter, supporting documents                           |
| Retirement             | Retirement application, relevant certificates                        |
| Resignation            | Resignation letter                                                   |
| Service Extension      | Extension request, justification                                     |
| Termination            | Disciplinary documentation                                           |

All documents must be PDF format, max 2MB each.

### 9.4 Notifications

**Q15: How do I receive notifications?**

A: Notifications appear in system:

1. Bell icon (🔔) in top navigation
2. Red badge shows unread count
3. Click to view notifications
4. Click notification to navigate to related item

Email notifications may be added in future.

**Q16: Can I disable notifications?**

A: No. Notifications are essential for workflow. However, you can:

- Mark as read to clear badge
- Acknowledge and dismiss

**Q17: What triggers a notification?**

A:

- Someone submits a request (for approvers)
- Your request is approved/rejected (for submitters)
- You receive a complaint (for DO)
- System events (password changed, etc.)

### 9.5 Reports

**Q18: Can I schedule automatic reports?**

A: Not currently. This feature is planned for future release. Currently, reports must be generated manually.

**Q19: Can I customize report columns?**

A: No. Report formats are standardized for consistency across institutions. All relevant data is included.

**Q20: Why do reports show both English and Swahili?**

A: CSMS supports bilingual operations to serve all users. Reports include:

- English columns for technical users
- Swahili columns for wider accessibility
- Status translations (Pending → Inasubiri, etc.)

**Q21: Can I export partial data from report?**

A: Use filters before generating report:

1. Set date range for specific period
2. Filter by institution
3. Filter by status
4. Generate report with filters applied
5. Export filtered report

### 9.6 Files and Documents

**Q22: Why only PDF files?**

A: PDF format ensures:

- Consistent display across all devices
- Cannot be easily edited (integrity)
- Smaller file sizes than Word documents
- Universal compatibility

**Q23: How do I convert Word document to PDF?**

A: Multiple methods:

1. **Microsoft Word:** File → Save As → PDF
2. **Google Docs:** File → Download → PDF
3. **Online converters:** Adobe, Smallpdf, iLovePDF
4. **Print to PDF:** Print dialog → Save as PDF

**Q24: What if my PDF is larger than 2MB?**

A: Compress the PDF:

1. Use online compression tool
2. Reduce scan quality
3. Remove unnecessary pages
4. Re-save with compression

**Q25: Can I preview documents before downloading?**

A: Yes. Click **Preview** button to view PDF in browser without downloading.

**Q26: Where are uploaded files stored?**

A: Files are stored securely in MinIO object storage with:

- Encrypted connections
- Access control
- Backup and redundancy
- Virus scanning (planned)

### 9.7 Roles and Permissions

**Q27: Can HRO see other institutions' data?**

A: No. HRO is institution-based role. You can only see:

- Employees from your institution
- Requests for your institution
- Reports filtered to your institution

**Q28: What's the difference between HHRMD and HRMO?**

A:

| Aspect       | HHRMD                     | HRMO                  |
| ------------ | ------------------------- | --------------------- |
| Full Name    | Head of HR & Disciplinary | HR Management Officer |
| HR Requests  | ✅ Can approve            | ✅ Can approve        |
| Complaints   | ✅ Can approve            | ❌ Cannot approve     |
| Terminations | ✅ Can approve            | ❌ Cannot approve     |
| Scope        | HR + Disciplinary         | HR only               |

**Q29: Can Planning Officer (PO) approve requests?**

A: No. PO is read-only role for reporting and oversight. Cannot approve or submit requests.

**Q30: Can I have multiple roles?**

A: No. Each user account has one role. If you need multiple permissions, contact administrator to assign appropriate role.

### 9.8 Technical Questions

**Q31: What if browser shows "Connection is not secure"?**

A: This shouldn't happen with CSMS production URL (https://csms.zanajira.go.tz). If it does:

1. Verify URL is exactly correct
2. Check with IT department
3. Do not proceed if certificate invalid

**Q32: Can I use CSMS offline?**

A: No. CSMS requires active internet connection to function.

**Q33: What browsers are NOT supported?**

A:

- Internet Explorer (any version)
- Very old browser versions (Chrome <80, Firefox <75)
- Unknown/untested browsers

Use recommended browsers for best experience.

**Q34: Why does system log me out automatically?**

A: For security, sessions expire after period of inactivity (typically 30-60 minutes). This protects your account if you forget to log out.

**Q35: Can I keep my session active longer?**

A: Session timeout is set by administrator for security. Cannot be changed by individual users.

---

## 10. Appendices

### Appendix A: Keyboard Shortcuts

| Shortcut                | Action             | Context         |
| ----------------------- | ------------------ | --------------- |
| `Ctrl + F` or `Cmd + F` | Search within page | Any page        |
| `Ctrl + B` or `Cmd + B` | Toggle sidebar     | Any page        |
| `Esc`                   | Close modal/dialog | When modal open |
| `Tab`                   | Next field         | Forms           |
| `Shift + Tab`           | Previous field     | Forms           |
| `Enter`                 | Submit form        | Forms           |
| `Ctrl + R` or `F5`      | Refresh page       | Any page        |

### Appendix B: System Limits

| Resource           | Limit            | Notes                            |
| ------------------ | ---------------- | -------------------------------- |
| File upload size   | 2 MB             | Per file                         |
| File format        | PDF only         | .pdf extension                   |
| Concurrent uploads | 10 files         | Per request                      |
| Search results     | 200 per page     | Use pagination                   |
| Report records     | Unlimited        | May take time for large datasets |
| Session timeout    | 30-60 minutes    | Varies by config                 |
| Password length    | 8-128 characters | Min/max                          |
| Username length    | 3-50 characters  | Lowercase, no spaces             |

### Appendix C: Request Status Workflow

**Standard Approval Workflow:**

```
┌─────────────────┐
│  HRO Submits    │
│    Request      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Pending      │
│  HRMO/HHRMD/DO  │
│     Review      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Approve │ │  Reject  │
└────┬────┘ └─────┬────┘
     │            │
     ▼            ▼
┌─────────┐ ┌──────────┐
│Employee │ │   HRO    │
│ Status  │ │ Notified │
│ Updated │ │          │
└─────────┘ └──────────┘
```

**Possible Statuses:**

| Status    | Meaning             | Next Action                |
| --------- | ------------------- | -------------------------- |
| Pending   | Awaiting approval   | Approver reviews           |
| Approved  | Commission approved | Employee status updated    |
| Rejected  | Request denied      | HRO notified, can resubmit |
| Completed | Fully processed     | Archived                   |

### Appendix D: Employee Status Change Matrix

| From Status  | To Status             | Triggering Request | Approver                |
| ------------ | --------------------- | ------------------ | ----------------------- |
| On Probation | Confirmed             | Confirmation       | HHRMD/HRMO              |
| Confirmed    | Confirmed (new cadre) | Promotion          | HHRMD/HRMO              |
| Confirmed    | On LWOP               | LWOP               | HHRMD/HRMO              |
| On LWOP      | Confirmed             | LWOP end           | Automatic or HHRMD/HRMO |
| Confirmed    | Retired               | Retirement         | HHRMD/HRMO              |
| Confirmed    | Resigned              | Resignation        | HHRMD/HRMO              |
| Confirmed    | Dismissed             | Termination        | HHRMD/DO                |

📋 **Note:** Once employee is Retired, Resigned, or Dismissed, no further status changes possible.

### Appendix E: Swahili-English Translations

**Common Terms:**

| English      | Swahili          |
| ------------ | ---------------- |
| Status       | Hali             |
| Pending      | Inasubiri        |
| Approved     | Imekamilika      |
| Rejected     | Imekataliwa      |
| Employee     | Mfanyakazi       |
| Request      | Ombi             |
| Confirmation | Uthibitisho      |
| Promotion    | Kupandishwa Cheo |
| Retirement   | Kustaafu         |
| Complaint    | Malalamiko       |
| Institution  | Taasisi          |
| Department   | Idara            |
| Gender       | Jinsia           |
| Male         | Mwanaume         |
| Female       | Mwanamke         |
| Date         | Tarehe           |

### Appendix F: Contact Information

**System Support:**

- **Email:** csms-support@zanajira.go.tz
- **Phone:** +255 24 223 XXXX
- **Hours:** Monday - Friday, 8:00 AM - 4:00 PM

**Civil Service Commission:**

- **Institution:** Tume ya Utumishi Serikalini
- **Address:** [Commission Address]
- **Phone:** +255 24 XXX XXXX

**HRIMS Integration Support:**

- **Technical Team:** hrims-tech@zanajira.go.tz
- **Phone:** +255 24 XXX XXXX

### Appendix G: Document Revision History

| Version | Date       | Author    | Changes         |
| ------- | ---------- | --------- | --------------- |
| 1.0     | 2025-12-25 | CSMS Team | Initial release |

### Appendix H: Glossary

| Term           | Definition                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| **CSMS**       | Civil Service Management System - the web application for managing HR operations |
| **HRIMS**      | Human Resource Information Management System - external system for employee data |
| **CSC**        | Civil Service Commission - governing body for civil service                      |
| **ZAN ID**     | Zanzibar Identification Number - unique employee identifier                      |
| **ZSSF**       | Zanzibar Social Security Fund - pension/social security number                   |
| **LWOP**       | Leave Without Pay - unpaid leave status                                          |
| **HRO**        | Human Resources Officer - submits HR requests                                    |
| **HHRMD**      | Head of HR and Disciplinary - approves HR and disciplinary requests              |
| **HRMO**       | HR Management Officer - approves HR requests                                     |
| **DO**         | Disciplinary Officer - handles complaints and terminations                       |
| **PO**         | Planning Officer - views reports (read-only)                                     |
| **CSCS**       | Civil Service Commission Secretary - executive oversight                         |
| **HRRP**       | HR Responsible Personnel - institutional supervisor                              |
| **MinIO**      | S3-compatible object storage for PDF files                                       |
| **Cadre**      | Job title/position in civil service                                              |
| **Probation**  | Trial period for new employees (typically 6 months)                              |
| **Commission** | The Civil Service Commission - approval authority                                |

---

## Document End

**For technical support, contact:**
CSMS Support Team
Email: csms-support@zanajira.go.tz
Phone: +255 24 223 XXXX

**Version:** 1.0
**Last Updated:** December 25, 2025

© 2025 Zanzibar Civil Service Commission. All Rights Reserved.

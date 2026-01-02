# CODE DOCUMENTATION

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item                 | Details                                              |
| -------------------- | ---------------------------------------------------- |
| **Document Title**   | Code Documentation - Civil Service Management System |
| **Project Name**     | Civil Service Management System (CSMS)               |
| **Version**          | 1.0                                                  |
| **Date Prepared**    | December 26, 2025                                    |
| **System URL**       | https://csms.zanajira.go.tz                          |
| **Technology Stack** | Next.js 14, PostgreSQL, Prisma ORM, MinIO            |
| **API Base URL**     | https://csms.zanajira.go.tz/api                      |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [API Documentation](#3-api-documentation)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Request Workflow System](#5-request-workflow-system)
6. [File Storage & Management](#6-file-storage--management)
7. [HRIMS Integration](#7-hrims-integration)
8. [Notification System](#8-notification-system)
9. [Reporting System](#9-reporting-system)
10. [Code Examples](#10-code-examples)
11. [Error Handling](#11-error-handling)
12. [Security Considerations](#12-security-considerations)

---

## 1. Architecture Overview

### 1.1 Technology Stack

```
Frontend:  Next.js 14 (App Router)
Backend:   Next.js API Routes
Database:  PostgreSQL with Prisma ORM
Storage:   MinIO S3-Compatible Object Storage
State:     Zustand for client-side state management
UI:        Tailwind CSS + Radix UI + shadcn/ui
AI:        Google Genkit for AI-powered features
```

### 1.2 Application Structure

```
/home/latest/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes
│   │   │   ├── auth/              # Authentication endpoints
│   │   │   ├── confirmation-requests/
│   │   │   ├── promotions/
│   │   │   ├── lwop-requests/
│   │   │   ├── cadre-change/
│   │   │   ├── retirement-requests/
│   │   │   ├── resignation/
│   │   │   ├── service-extension-requests/
│   │   │   ├── termination/
│   │   │   ├── complaints/
│   │   │   ├── employees/
│   │   │   ├── users/
│   │   │   ├── institutions/
│   │   │   ├── notifications/
│   │   │   ├── reports/
│   │   │   ├── hrims/            # External HRIMS integration
│   │   │   └── dashboard/
│   │   ├── (pages)/              # Frontend pages
│   │   └── layout.tsx
│   ├── components/                # React components
│   ├── lib/                       # Utility libraries
│   │   ├── db.ts                 # Prisma client
│   │   ├── auth.ts               # Authentication utilities
│   │   └── minio.ts              # MinIO client
│   └── stores/                    # Zustand stores
├── prisma/
│   └── schema.prisma             # Database schema
└── public/                        # Static assets
```

### 1.3 Design Patterns

**Request-Review Pattern:**
All HR requests follow a standard workflow:

1. Submission (HRO)
2. Review (HHRMD/HRMO/DO)
3. Approval/Rejection
4. Employee status update (if approved)
5. Notifications to relevant parties

**Role-Based Access Control:**

- **CSC Roles** (HHRMD, HRMO, DO, PO, CSCS): Access all institutions
- **Institution Roles** (HRO, HRRP): Access only their institution
- **Employee**: Access only own data

**Data Isolation:**
Implemented through Prisma queries with institution filtering based on user role.

---

## 2. Database Schema

### 2.1 Core Models

#### 2.1.1 User Model

```typescript
model User {
  id            String   @id          // Unique identifier (UUID)
  name          String                // Full name (min 2 chars)
  username      String   @unique      // Login username (min 3 chars)
  password      String                // Bcrypt hashed password
  role          String                // User role (see roles below)
  active        Boolean  @default(true)  // Account status
  employeeId    String?  @unique      // Link to Employee record
  institutionId String                // Institution assignment
  phoneNumber   String?               // Contact phone (10 digits)
  email         String?               // Email address
  createdAt     DateTime @default(now())
  updatedAt     DateTime

  // Relations
  Institution   Institution @relation(fields: [institutionId], references: [id])
  Employee      Employee?   @relation(fields: [employeeId], references: [id])
  Notification  Notification[]
  // ... request relations
}
```

**User Roles:**

- `ADMIN`: System administrator
- `HRO`: HR Officer (institution-based)
- `HHRMD`: Head of HR Management & Disciplinary (CSC)
- `HRMO`: HR Management Officer (CSC)
- `DO`: Disciplinary Officer (CSC)
- `PO`: Planning Officer (CSC, read-only)
- `CSCS`: CSC Secretary (executive oversight)
- `HRRP`: HR Responsible Personnel (institutional supervisor)
- `EMPLOYEE`: Employee (own data only)

#### 2.1.2 Employee Model

```typescript
model Employee {
  id                     String    @id
  employeeEntityId       String?           // External HRIMS ID
  name                   String            // Full name
  gender                 String            // Gender
  profileImageUrl        String?           // MinIO photo URL
  dateOfBirth            DateTime?
  placeOfBirth           String?
  region                 String?
  countryOfBirth         String?
  zanId                  String    @unique // Zanzibar ID (unique)
  phoneNumber            String?
  contactAddress         String?
  zssfNumber             String?           // Social Security number
  payrollNumber          String?           // Payroll identifier
  cadre                  String?           // Professional category
  salaryScale            String?
  ministry               String?
  department             String?
  appointmentType        String?
  contractType           String?
  recentTitleDate        DateTime?
  currentReportingOffice String?
  currentWorkplace       String?
  employmentDate         DateTime?
  confirmationDate       DateTime?         // Set when confirmed
  retirementDate         DateTime?
  status                 String?           // Employee status (see below)

  // Document URLs (MinIO)
  ardhilHaliUrl          String?
  confirmationLetterUrl  String?
  jobContractUrl         String?
  birthCertificateUrl    String?

  institutionId          String
  Institution            Institution @relation(fields: [institutionId], references: [id])

  // Relations to requests
  ConfirmationRequest     ConfirmationRequest[]
  PromotionRequest        PromotionRequest[]
  LwopRequest             LwopRequest[]
  CadreChangeRequest      CadreChangeRequest[]
  RetirementRequest       RetirementRequest[]
  ResignationRequest      ResignationRequest[]
  ServiceExtensionRequest ServiceExtensionRequest[]
  SeparationRequest       SeparationRequest[]
  EmployeeCertificate     EmployeeCertificate[]
  User                    User?
}
```

**Employee Status Values:**

- `On Probation`: Newly hired, not yet confirmed
- `Confirmed`: Probation completed, permanent status
- `On LWOP`: Currently on Leave Without Pay
- `Retired`: Separated due to retirement
- `Resigned`: Voluntarily left service
- `Terminated`: Involuntary separation
- `Dismissed`: Disciplinary separation

#### 2.1.3 Institution Model

```typescript
model Institution {
  id          String   @id
  name        String   @unique      // Institution name (unique)
  email       String?
  phoneNumber String?
  voteNumber  String?               // Budget vote number
  tinNumber   String?  @unique      // Tax ID (unique)

  Employee    Employee[]
  User        User[]
}
```

### 2.2 Request Models

All request models follow a similar structure with status tracking, review workflow, and document management.

#### 2.2.1 ConfirmationRequest

```typescript
model ConfirmationRequest {
  id                     String    @id
  status                 String    // Pending, Approved by Commission, Rejected
  reviewStage            String    // Current review stage
  documents              String[]  // Array of MinIO document URLs
  rejectionReason        String?
  employeeId             String
  submittedById          String    // HRO who submitted
  reviewedById           String?   // HHRMD/HRMO who reviewed
  decisionDate           DateTime?
  commissionDecisionDate DateTime?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime

  Employee               Employee  @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Business Rules:**

- Only employees with status "On Probation" can be confirmed
- Upon approval, employee status changes to "Confirmed"
- confirmationDate is set to approval date

#### 2.2.2 PromotionRequest

```typescript
model PromotionRequest {
  id                       String   @id
  status                   String
  reviewStage              String
  proposedCadre            String   // New cadre after promotion
  promotionType            String   // "Experience-based" or "Education-based"
  studiedOutsideCountry    Boolean?
  documents                String[] // Different docs per type
  rejectionReason          String?
  commissionDecisionReason String?
  employeeId               String
  submittedById            String
  reviewedById             String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime

  Employee                 Employee @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Promotion Types:**

1. **Experience-based**: Requires 3 years of performance appraisals
   - Documents: Performance appraisal Y1, Y2, Y3, CSC form, letter of request
2. **Education-based**: Requires educational certificate
   - Documents: Educational certificate, TCU form (if studied abroad), letter of request

**Business Rules:**

- Cannot promote employees on probation, on LWOP, or separated
- Upon approval, employee cadre is updated to proposedCadre

#### 2.2.3 LwopRequest

```typescript
model LwopRequest {
  id              String    @id
  status          String
  reviewStage     String
  duration        String    // e.g., "6 months"
  reason          String    // Reason for LWOP
  startDate       DateTime?
  endDate         DateTime?
  documents       String[]
  rejectionReason String?
  employeeId      String
  submittedById   String
  reviewedById    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime

  Employee        Employee  @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Business Rules:**

- End date must be after start date
- Cannot submit LWOP for employee already on LWOP
- Upon approval, employee status changes to "On LWOP"

#### 2.2.4 CadreChangeRequest

```typescript
model CadreChangeRequest {
  id                    String   @id
  status                String
  reviewStage           String
  newCadre              String   // Target cadre
  reason                String?  // Justification
  studiedOutsideCountry Boolean?
  documents             String[]
  rejectionReason       String?
  employeeId            String
  submittedById         String
  reviewedById          String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime

  Employee              Employee @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Business Rules:**

- Cannot change cadre for employees on probation, on LWOP, or separated
- Upon approval, employee cadre is updated to newCadre

#### 2.2.5 RetirementRequest

```typescript
model RetirementRequest {
  id                 String   @id
  status             String
  reviewStage        String
  retirementType     String   // "Voluntary", "Compulsory", "Illness"
  illnessDescription String?  // Required for illness type
  proposedDate       DateTime // Proposed retirement date
  delayReason        String?  // Optional delay explanation
  documents          String[]
  rejectionReason    String?
  employeeId         String
  submittedById      String
  reviewedById       String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime

  Employee           Employee @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Retirement Types:**

1. **Voluntary**: Employee chooses to retire
2. **Compulsory**: Reached retirement age
3. **Illness**: Health-related retirement (requires illnessDescription)

**Business Rules:**

- Upon approval, employee status changes to "Retired"
- retirementDate is set to proposedDate

#### 2.2.6 ResignationRequest

```typescript
model ResignationRequest {
  id              String   @id
  status          String
  reviewStage     String
  effectiveDate   DateTime // When resignation takes effect
  reason          String?  // Reason for resignation
  documents       String[]
  rejectionReason String?
  employeeId      String
  submittedById   String
  reviewedById    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime

  Employee        Employee @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Business Rules:**

- Upon approval, employee status changes to "Resigned"

#### 2.2.7 ServiceExtensionRequest

```typescript
model ServiceExtensionRequest {
  id                       String   @id
  status                   String
  reviewStage              String
  currentRetirementDate    DateTime // Current planned retirement
  requestedExtensionPeriod String   // e.g., "2 years"
  justification            String   // Reason for extension
  documents                String[]
  rejectionReason          String?
  employeeId               String
  submittedById            String
  reviewedById             String?
  createdAt                DateTime @default(now())
  updatedAt                DateTime

  Employee                 Employee @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Business Rules:**

- Cannot extend service for employees on probation
- Upon approval, employee retirementDate is extended

#### 2.2.8 SeparationRequest (Termination/Dismissal)

```typescript
model SeparationRequest {
  id              String   @id
  type            String   // "TERMINATION" or "DISMISSAL"
  status          String
  reviewStage     String
  reason          String   // Reason for separation
  documents       String[]
  rejectionReason String?
  employeeId      String
  submittedById   String
  reviewedById    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime

  Employee        Employee @relation(fields: [employeeId], references: [id])
  // ... User relations
}
```

**Types:**

1. **TERMINATION**: Normal involuntary separation
2. **DISMISSAL**: Disciplinary separation

**Business Rules:**

- Only approved by HHRMD or DO (not HRMO)
- Upon approval, employee status changes to "Terminated" or "Dismissed"

#### 2.2.9 Complaint

```typescript
model Complaint {
  id                     String   @id
  complaintType          String   // Type of complaint
  subject                String   // Subject (min 5 chars)
  details                String   // Details (min 20 chars)
  complainantPhoneNumber String
  nextOfKinPhoneNumber   String
  attachments            String[] // Optional PDF attachments
  status                 String   // Status of complaint
  reviewStage            String
  officerComments        String?  // Comments from reviewing officer
  internalNotes          String?
  rejectionReason        String?
  complainantId          String   // Employee who submitted
  assignedOfficerRole    String
  reviewedById           String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime

  // ... User relations
}
```

**Business Rules:**

- Only accessible to HHRMD and DO (not HRMO)
- Employees can submit via employee portal
- Case ID generated for tracking
- Notifications sent in Swahili

### 2.3 Supporting Models

#### 2.3.1 Notification

```typescript
model Notification {
  id        String   @id
  message   String   // Notification message
  link      String?  // Link to related resource
  isRead    Boolean  @default(false)
  userId    String
  createdAt DateTime @default(now())

  User      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Usage:**

- Sent when requests are submitted, approved, or rejected
- Bilingual support (English and Swahili)
- Cascade delete when user is deleted

#### 2.3.2 EmployeeCertificate

```typescript
model EmployeeCertificate {
  id         String   @id
  type       String   // Certificate type
  name       String   // Qualification name
  url        String?  // MinIO URL to certificate file
  employeeId String

  Employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
}
```

**Usage:**

- Stores educational qualifications
- Synced from HRIMS
- Cascade delete when employee is deleted

---

## 3. API Documentation

### 3.1 Authentication Endpoints

#### POST /api/auth/login

**Description:** Authenticate user with username and password

**Request Body:**

```typescript
{
  username: string,    // Required, min 3 chars
  password: string     // Required
}
```

**Response (Success - 200):**

```typescript
{
  user: {
    id: string,
    name: string,
    username: string,
    role: string,
    institutionId: string,
    active: boolean
  },
  message: string
}
```

**Response (Error - 401):**

```typescript
{
  error: string; // "Invalid credentials" or "Account is not active"
}
```

**Example:**

```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'kmnyonge',
    password: 'password123',
  }),
});
```

---

#### POST /api/auth/employee-login

**Description:** Employee login using ZanID, payroll number, and ZSSF number

**Request Body:**

```typescript
{
  zanId: string,         // Required, Zanzibar ID
  payrollNumber: string, // Required
  zssfNumber: string     // Required, Social Security number
}
```

**Response (Success - 200):**

```typescript
{
  user: {
    id: string,
    name: string,
    role: "EMPLOYEE",
    employeeId: string,
    institutionId: string
  }
}
```

**Response (Error - 401):**

```typescript
{
  error: string; // "Invalid employee credentials"
}
```

**Business Rules:**

- All three fields must match an employee record
- Creates/returns user account linked to employee
- Employee can only view own data

---

#### POST /api/auth/logout

**Description:** Logout current user and clear session

**Response (200):**

```typescript
{
  message: 'Logged out successfully';
}
```

---

#### GET /api/auth/session

**Description:** Get current user session

**Response (Success - 200):**

```typescript
{
  user: {
    id: string,
    name: string,
    username: string,
    role: string,
    institutionId: string,
    employeeId?: string
  }
}
```

**Response (Unauthorized - 401):**

```typescript
{
  error: 'Not authenticated';
}
```

---

#### POST /api/auth/change-password

**Description:** Change user password

**Request Body:**

```typescript
{
  currentPassword: string,
  newPassword: string
}
```

**Response (Success - 200):**

```typescript
{
  message: 'Password changed successfully';
}
```

---

### 3.2 Confirmation Request Endpoints

#### GET /api/confirmation-requests

**Description:** Get all confirmation requests (filtered by institution for HRO)

**Query Parameters:**

- `status` (optional): Filter by status (Pending, Approved by Commission, Rejected)
- `institutionId` (optional): Filter by institution (CSC roles only)

**Response (200):**

```typescript
{
  confirmationRequests: [
    {
      id: string,
      status: string,
      reviewStage: string,
      documents: string[],
      rejectionReason: string | null,
      decisionDate: string | null,
      commissionDecisionDate: string | null,
      createdAt: string,
      updatedAt: string,
      employee: {
        id: string,
        name: string,
        zanId: string,
        cadre: string,
        status: string,
        institution: {
          id: string,
          name: string
        }
      },
      submittedBy: {
        id: string,
        name: string,
        role: string
      },
      reviewedBy: {
        id: string,
        name: string,
        role: string
      } | null
    }
  ]
}
```

**Authorization:**

- **HRO/HRRP**: See only own institution's requests
- **HHRMD/HRMO/DO/CSCS**: See all institutions' requests
- **PO**: Read-only access for reporting

---

#### POST /api/confirmation-requests

**Description:** Create new confirmation request

**Request Body:**

```typescript
{
  employeeId: string,      // Required, employee must be "On Probation"
  documents: string[]      // Required, MinIO URLs of uploaded PDFs
}
```

**Response (Success - 201):**

```typescript
{
  confirmationRequest: {
    id: string,
    status: "Pending",
    reviewStage: "Pending Approval",
    // ... other fields
  },
  message: "Confirmation request submitted successfully"
}
```

**Response (Error - 400):**

```typescript
{
  error: string; // Validation error (e.g., "Employee already confirmed")
}
```

**Business Rules:**

- Employee must have status "On Probation"
- At least one document required
- Notifications sent to HHRMD and DO
- Only HRO can submit

---

#### PATCH /api/confirmation-requests/[id]

**Description:** Approve or reject confirmation request

**Request Body:**

```typescript
{
  action: "approve" | "reject",
  rejectionReason?: string  // Required if action is "reject"
}
```

**Response (Success - 200):**

```typescript
{
  confirmationRequest: { /* updated request */ },
  message: "Confirmation request approved/rejected successfully"
}
```

**Side Effects (on approval):**

- Employee status → "Confirmed"
- confirmationDate set to current date
- Notification sent to HRO who submitted
- decisionDate and commissionDecisionDate set

**Authorization:**

- Only HHRMD or HRMO can approve/reject

---

### 3.3 Promotion Request Endpoints

#### GET /api/promotions

**Description:** Get all promotion requests (with institution filtering)

**Query Parameters:**

- `status` (optional): Filter by status
- `promotionType` (optional): "Experience-based" or "Education-based"
- `institutionId` (optional): Filter by institution

**Response (200):**

```typescript
{
  promotionRequests: [
    {
      id: string,
      status: string,
      reviewStage: string,
      proposedCadre: string,
      promotionType: "Experience-based" | "Education-based",
      studiedOutsideCountry: boolean | null,
      documents: string[],
      rejectionReason: string | null,
      commissionDecisionReason: string | null,
      createdAt: string,
      employee: {
        id: string,
        name: string,
        cadre: string,  // Current cadre
        institution: { name: string }
      },
      submittedBy: { name: string, role: string },
      reviewedBy: { name: string, role: string } | null
    }
  ]
}
```

---

#### POST /api/promotions

**Description:** Create new promotion request

**Request Body:**

```typescript
{
  employeeId: string,
  promotionType: "Experience-based" | "Education-based",
  proposedCadre: string,
  studiedOutsideCountry?: boolean,
  documents: string[]  // Different requirements per type
}
```

**Document Requirements:**

**Experience-based:**

1. Performance appraisal Year 1 (PDF)
2. Performance appraisal Year 2 (PDF)
3. Performance appraisal Year 3 (PDF)
4. CSC promotion form (PDF)
5. Letter of request (PDF)

**Education-based:**

1. Educational certificate (PDF)
2. TCU form (PDF) - if studiedOutsideCountry = true
3. Letter of request (PDF)

**Response (Success - 201):**

```typescript
{
  promotionRequest: { /* created request */ },
  message: "Promotion request submitted successfully"
}
```

**Business Rules:**

- Employee cannot be "On Probation", "On LWOP", or separated
- Documents must match promotion type
- Notifications sent to HHRMD and DO

---

#### PATCH /api/promotions/[id]

**Description:** Approve or reject promotion request

**Request Body:**

```typescript
{
  action: "approve" | "reject",
  rejectionReason?: string,
  commissionDecisionReason?: string
}
```

**Side Effects (on approval):**

- Employee cadre → proposedCadre
- Notification sent to submitter

**Authorization:**

- HHRMD or HRMO only

---

### 3.4 LWOP Request Endpoints

#### GET /api/lwop-requests

**Description:** Get all LWOP requests

**Response (200):**

```typescript
{
  lwopRequests: [
    {
      id: string,
      status: string,
      duration: string,  // e.g., "6 months"
      reason: string,
      startDate: string | null,
      endDate: string | null,
      documents: string[],
      employee: { /* ... */ },
      submittedBy: { /* ... */ },
      reviewedBy: { /* ... */ }
    }
  ]
}
```

---

#### POST /api/lwop-requests

**Description:** Create LWOP request

**Request Body:**

```typescript
{
  employeeId: string,
  duration: string,
  reason: string,
  startDate: string,  // ISO date string
  endDate: string,    // ISO date string
  documents: string[]
}
```

**Validation:**

- endDate must be after startDate
- Employee cannot already be on LWOP

**Side Effects (on approval):**

- Employee status → "On LWOP"

---

### 3.5 Cadre Change Request Endpoints

#### GET /api/cadre-change

**Description:** Get all cadre change requests

---

#### POST /api/cadre-change

**Description:** Create cadre change request

**Request Body:**

```typescript
{
  employeeId: string,
  newCadre: string,
  reason: string,
  studiedOutsideCountry?: boolean,
  documents: string[]
}
```

**Business Rules:**

- Employee cannot be on probation, on LWOP, or separated
- Upon approval, employee.cadre → newCadre

---

### 3.6 Retirement Request Endpoints

#### GET /api/retirement-requests

**Description:** Get all retirement requests

**Response includes retirementType field**

---

#### POST /api/retirement-requests

**Description:** Create retirement request

**Request Body:**

```typescript
{
  employeeId: string,
  retirementType: "Voluntary" | "Compulsory" | "Illness",
  proposedDate: string,  // ISO date string
  illnessDescription?: string,  // Required if type is "Illness"
  delayReason?: string,
  documents: string[]
}
```

**Side Effects (on approval):**

- Employee status → "Retired"
- employee.retirementDate → proposedDate

---

### 3.7 Resignation Request Endpoints

#### GET /api/resignation

**Description:** Get all resignation requests

---

#### POST /api/resignation

**Description:** Create resignation request

**Request Body:**

```typescript
{
  employeeId: string,
  effectiveDate: string,  // ISO date string
  reason: string,
  documents: string[]
}
```

**Side Effects (on approval):**

- Employee status → "Resigned"

---

### 3.8 Service Extension Request Endpoints

#### GET /api/service-extension-requests

**Description:** Get all service extension requests

---

#### POST /api/service-extension-requests

**Description:** Create service extension request

**Request Body:**

```typescript
{
  employeeId: string,
  currentRetirementDate: string,  // Auto-populated from employee
  requestedExtensionPeriod: string,  // e.g., "2 years"
  justification: string,
  documents: string[]
}
```

**Business Rules:**

- Employee cannot be on probation
- Upon approval, employee.retirementDate is extended

---

### 3.9 Termination/Dismissal Endpoints

#### GET /api/termination

**Description:** Get all termination and dismissal requests

**Response includes type field (TERMINATION or DISMISSAL)**

---

#### POST /api/termination

**Description:** Create termination or dismissal request

**Request Body:**

```typescript
{
  employeeId: string,
  type: "TERMINATION" | "DISMISSAL",
  reason: string,
  documents: string[]
}
```

**Side Effects (on approval):**

- Employee status → "Terminated" or "Dismissed"

**Authorization:**

- Submit: HRO
- Approve/Reject: HHRMD or DO only (NOT HRMO)

---

### 3.10 Complaint Endpoints

#### GET /api/complaints

**Description:** Get all complaints

**Authorization:**

- **HHRMD/DO**: See all complaints
- **Employee**: See only own complaints
- **HRMO**: No access

**Response (200):**

```typescript
{
  complaints: [
    {
      id: string,  // Case ID
      complaintType: string,
      subject: string,
      details: string,
      complainantPhoneNumber: string,
      nextOfKinPhoneNumber: string,
      attachments: string[],
      status: string,
      reviewStage: string,
      officerComments: string | null,
      internalNotes: string | null,
      assignedOfficerRole: string,
      complainant: {
        id: string,
        name: string,
        employee: { name: string, zanId: string }
      },
      reviewedBy: { name: string, role: string } | null,
      createdAt: string
    }
  ]
}
```

---

#### POST /api/complaints

**Description:** Submit a complaint (employee portal)

**Request Body:**

```typescript
{
  complaintType: string,
  subject: string,           // Min 5 chars
  details: string,           // Min 20 chars
  complainantPhoneNumber: string,
  nextOfKinPhoneNumber: string,
  attachments?: string[]     // Optional PDF attachments
}
```

**Validation:**

- subject: minimum 5 characters
- details: minimum 20 characters
- Phone numbers required

**Notifications:**

- Sent in Swahili to HHRMD and DO
- Includes case ID for tracking

---

#### PATCH /api/complaints/[id]

**Description:** Update complaint status or assign officer

**Request Body:**

```typescript
{
  status?: string,  // "Resolved", "More Info Requested", etc.
  officerComments?: string,
  internalNotes?: string,
  assignedOfficerRole?: string
}
```

**Authorization:**

- HHRMD or DO only

---

### 3.11 Employee Endpoints

#### GET /api/employees

**Description:** Get all employees (with institution filtering)

**Query Parameters:**

- `search` (optional): Search by name or ZanID
- `status` (optional): Filter by employee status
- `institutionId` (optional): Filter by institution

**Response (200):**

```typescript
{
  employees: [
    {
      id: string,
      name: string,
      gender: string,
      profileImageUrl: string | null,
      dateOfBirth: string | null,
      zanId: string,
      phoneNumber: string | null,
      zssfNumber: string | null,
      payrollNumber: string | null,
      cadre: string | null,
      salaryScale: string | null,
      ministry: string | null,
      department: string | null,
      employmentDate: string | null,
      confirmationDate: string | null,
      retirementDate: string | null,
      status: string | null,

      // Document URLs
      ardhilHaliUrl: string | null,
      confirmationLetterUrl: string | null,
      jobContractUrl: string | null,
      birthCertificateUrl: string | null,

      institution: {
        id: string,
        name: string,
      },

      // Certificates
      EmployeeCertificate: [{ type: string, name: string, url: string | null }],
    },
  ];
}
```

**Authorization:**

- **HRO/HRRP**: Own institution only
- **CSC roles**: All institutions
- **Employee**: Own record only

---

#### GET /api/employees/[id]

**Description:** Get single employee details

**Response (200):**

```typescript
{
  employee: {
    /* full employee object with relations */
  }
}
```

---

#### PATCH /api/employees/[id]

**Description:** Update employee information

**Request Body:**

```typescript
{
  name?: string,
  phoneNumber?: string,
  contactAddress?: string,
  // ... other updatable fields
}
```

**Authorization:**

- ADMIN or HRO of same institution

---

### 3.12 User Management Endpoints

#### GET /api/users

**Description:** Get all users

**Query Parameters:**

- `search` (optional): Search by name, username, or ZanID
- `institutionId` (optional): Filter by institution

**Response (200):**

```typescript
{
  users: [
    {
      id: string,
      name: string,
      username: string,
      role: string,
      active: boolean,
      email: string | null,
      phoneNumber: string | null,
      institutionId: string,
      institution: {
        id: string,
        name: string,
      },
      employee:
        {
          name: string,
          zanId: string,
        } | null,
    },
  ];
}
```

**Authorization:**

- ADMIN only

---

#### POST /api/users

**Description:** Create new user

**Request Body:**

```typescript
{
  name: string,           // Min 2 chars
  username: string,       // Min 3 chars, unique
  password: string,       // Will be hashed with bcrypt
  email?: string,         // Valid email format, unique
  phoneNumber?: string,   // 10 digits
  role: string,           // One of 9 user roles
  institutionId: string
}
```

**Validation:**

- name: minimum 2 characters
- username: minimum 3 characters, must be unique
- email: valid email format, must be unique
- phoneNumber: 10 digits
- role: must be valid role
- password: hashed with bcrypt (10 rounds)

**Response (Success - 201):**

```typescript
{
  user: { /* created user (password excluded) */ },
  message: "User created successfully"
}
```

---

#### PATCH /api/users/[id]

**Description:** Update user details

**Request Body:**

```typescript
{
  name?: string,
  email?: string,
  phoneNumber?: string,
  role?: string,
  institutionId?: string,
  active?: boolean
}
```

**Note:** Cannot update username (immutable)

---

#### POST /api/users/[id]/reset-password

**Description:** Reset user password

**Request Body:**

```typescript
{
  newPassword: string;
}
```

**Authorization:**

- ADMIN only

---

### 3.13 Institution Endpoints

#### GET /api/institutions

**Description:** Get all institutions

**Response (200):**

```typescript
{
  institutions: [
    {
      id: string,
      name: string,
      email: string | null,
      phoneNumber: string | null,
      voteNumber: string | null,
      tinNumber: string | null,
      _count: {
        Employee: number,
        User: number,
      },
    },
  ];
}
```

---

#### POST /api/institutions

**Description:** Create new institution

**Request Body:**

```typescript
{
  name: string,        // Required, unique
  email?: string,
  phoneNumber?: string,
  voteNumber?: string,
  tinNumber?: string   // Must be unique if provided
}
```

**Authorization:**

- ADMIN only

---

#### PATCH /api/institutions/[id]

**Description:** Update institution

**Request Body:**

```typescript
{
  name?: string,
  email?: string,
  phoneNumber?: string,
  voteNumber?: string,
  tinNumber?: string
}
```

---

### 3.14 Notification Endpoints

#### GET /api/notifications

**Description:** Get current user's notifications

**Query Parameters:**

- `unreadOnly` (optional): boolean - return only unread notifications

**Response (200):**

```typescript
{
  notifications: [
    {
      id: string,
      message: string,
      link: string | null,
      isRead: boolean,
      createdAt: string,
    },
  ];
}
```

---

#### PATCH /api/notifications/[id]/read

**Description:** Mark notification as read

**Response (200):**

```typescript
{
  notification: {
    /* updated notification */
  }
}
```

---

#### PATCH /api/notifications/mark-all-read

**Description:** Mark all user's notifications as read

---

### 3.15 Reports Endpoints

#### POST /api/reports

**Description:** Generate reports

**Request Body:**

```typescript
{
  reportType: "confirmations" | "promotions" | "lwop" | "cadre-changes" |
              "retirements" | "resignations" | "service-extensions" |
              "terminations" | "complaints" | "all-requests",
  startDate?: string,      // ISO date string
  endDate?: string,        // ISO date string
  institutionId?: string,  // Filter by institution
  status?: string          // Filter by status
}
```

**Response (200):**

```typescript
{
  reportType: string,
  generatedAt: string,
  filters: {
    startDate: string | null,
    endDate: string | null,
    institutionId: string | null,
    status: string | null
  },
  data: [
    {
      // Fields vary by report type
      employeeName: string,
      institution: string,
      status: string,        // In Swahili: "Imekamilika", "Inasubiri", "Imekataliwa"
      submissionDate: string,
      decisionDate: string | null,
      // ... type-specific fields
    }
  ],
  summary: {
    total: number,
    approved: number,
    pending: number,
    rejected: number
  }
}
```

**Report Types:**

1. **Confirmations Report**
   - Employee, institution, submission date, status, decision date

2. **Promotions Report**
   - Employee, promotion type, current cadre, proposed cadre, status

3. **LWOP Report**
   - Employee, duration, start date, end date, reason, status

4. **Cadre Changes Report**
   - Employee, current cadre, new cadre, reason, status

5. **Retirements Report**
   - Employee, retirement type, proposed date, illness description, status

6. **Resignations Report**
   - Employee, effective date, reason, status

7. **Service Extensions Report**
   - Employee, current retirement date, extension period, justification, status

8. **Terminations Report**
   - Employee, type (TERMINATION/DISMISSAL), reason, status

9. **Complaints Report**
   - Case ID, complaint type, subject, status, assigned officer, resolution

10. **All Requests Report**
    - Combined view of all request types

**Authorization:**

- All CSC roles (HHRMD, HRMO, DO, CSCS)
- Planning Officer (PO) - read-only access
- HRO - own institution only

**Bilingual Support:**

- Column headers in English and Swahili
- Status values in Swahili:
  - "Approved" → "Imekamilika"
  - "Pending" → "Inasubiri"
  - "Rejected" → "Imekataliwa"

---

### 3.16 Dashboard Endpoints

#### GET /api/dashboard/metrics

**Description:** Get dashboard metrics

**Response (200):**

```typescript
{
  metrics: {
    totalEmployees: number,
    pendingConfirmations: number,
    pendingPromotions: number,
    employeesOnLWOP: number,
    pendingCadreChanges: number,
    pendingRetirements: number,
    pendingResignations: number,
    pendingServiceExtensions: number,
    pendingTerminations: number,
    openComplaints: number,

    // Employee status breakdown
    employeesByStatus: {
      "On Probation": number,
      "Confirmed": number,
      "On LWOP": number,
      "Retired": number,
      "Resigned": number,
      "Terminated": number,
      "Dismissed": number
    },

    // Recent activity count
    recentActivityCount: number
  }
}
```

**Authorization & Filtering:**

- **HRO/HRRP**: Metrics for own institution only
- **CSC roles**: System-wide metrics
- **PO**: No dashboard access (redirected to reports)

---

### 3.17 HRIMS Integration Endpoints

All HRIMS endpoints are **ADMIN only**.

#### GET /api/hrims/test

**Description:** Test connection to external HRIMS

**Response (200):**

```typescript
{
  success: boolean,
  message: string,
  responseTime: number,  // milliseconds
  data?: any             // HRIMS response data
}
```

---

#### POST /api/hrims/fetch-employee

**Description:** Fetch single employee from HRIMS

**Request Body:**

```typescript
{
  zanId?: string,
  payrollNumber?: string  // Either zanId or payrollNumber required
}
```

**Response (200):**

```typescript
{
  employee: {
    // Employee data from HRIMS (not yet saved to CSMS)
    name: string,
    gender: string,
    zanId: string,
    payrollNumber: string,
    zssfNumber: string,
    cadre: string,
    ministry: string,
    department: string,
    employmentDate: string,
    confirmationDate: string | null,
    retirementDate: string | null,
    status: string,
    // ... other fields
  }
}
```

---

#### POST /api/hrims/sync-employee

**Description:** Sync employee from HRIMS to CSMS database

**Request Body:**

```typescript
{
  zanId?: string,
  payrollNumber?: string,
  institutionId: string  // Required for creating employee in CSMS
}
```

**Response (201):**

```typescript
{
  employee: { /* Created/updated employee in CSMS */ },
  message: "Employee synced successfully"
}
```

**Business Logic:**

- Creates or updates employee record
- Converts ISO date strings to DateTime
- Links to institution
- Maps HRIMS fields to CSMS schema

---

#### POST /api/hrims/fetch-by-institution

**Description:** Bulk fetch employees from HRIMS by institution

**Request Body:**

```typescript
{
  voteCode: string,      // Institution vote number
  page?: number,         // Default: 1
  pageSize?: number,     // Default: 50
  autoSync?: boolean,    // If true, auto-save to CSMS
  institutionId?: string // Required if autoSync is true
}
```

**Response (200 - Server-Sent Events):**

```typescript
// Stream of events:
event: progress
data: { fetched: 10, total: 150, page: 1 }

event: employee
data: { employee: { /* employee data */ } }

event: complete
data: { totalFetched: 150, saved: 150, errors: 0 }
```

**Usage:**

- Supports pagination for large institutions
- Can auto-sync to database
- Progress updates via SSE

---

#### POST /api/hrims/fetch-photos-by-institution

**Description:** Bulk fetch employee photos from HRIMS

**Request Body:**

```typescript
{
  voteCode: string,
  page?: number,
  pageSize?: number
}
```

**Response (200 - SSE):**

```typescript
event: progress
data: { processed: 10, total: 150, success: 9, failed: 1 }

event: photo
data: {
  employeeId: string,
  success: boolean,
  url: string | null,
  error?: string
}

event: complete
data: { total: 150, success: 145, failed: 5 }
```

**Business Logic:**

- Fetches photo from HRIMS (base64)
- Uploads to MinIO
- Updates employee.profileImageUrl
- Handles errors gracefully

---

#### POST /api/hrims/fetch-documents-by-institution

**Description:** Bulk fetch employee documents from HRIMS

**Request Body:**

```typescript
{
  voteCode: string,
  page?: number,
  pageSize?: number,
  documentTypes?: string[]  // ["ardhilHali", "birthCertificate", "confirmationLetter", "jobContract"]
}
```

**Response (200 - SSE):**

```typescript
event: progress
data: {
  processed: 10,
  total: 150,
  currentEmployee: "John Doe",
  currentDocument: "ardhilHali"
}

event: document
data: {
  employeeId: string,
  documentType: string,
  success: boolean,
  url: string | null,
  error?: string
}

event: complete
data: {
  total: 150,
  documentsProcessed: 600,
  success: 580,
  failed: 20
}
```

**Business Logic:**

- Fetches documents in base64 from HRIMS
- Uploads to MinIO
- Updates employee URLs (ardhilHaliUrl, birthCertificateUrl, etc.)
- Split requests to prevent timeout
- Streaming progress for large batches

---

#### POST /api/hrims/sync-certificates

**Description:** Sync employee educational certificates from HRIMS

**Request Body:**

```typescript
{
  zanId?: string,
  payrollNumber?: string,
  employeeId: string  // CSMS employee ID
}
```

**Response (200):**

```typescript
{
  certificates: [
    {
      id: string,
      type: string,
      name: string,
      url: string | null,
      employeeId: string
    }
  ],
  message: "Certificates synced successfully"
}
```

**Business Logic:**

- Fetches certificate list from HRIMS
- Creates EmployeeCertificate records
- Optionally stores certificate files in MinIO

---

### 3.18 File Upload Endpoints

File uploads are typically handled via client-side upload to MinIO, then passing the URL to the API.

**MinIO Upload Pattern:**

```typescript
// Client-side upload
const file = event.target.files[0];
if (file.type !== 'application/pdf') {
  throw new Error('Only PDF files allowed');
}
if (file.size > 2 * 1024 * 1024) {
  throw new Error('File size must be less than 2MB');
}

// Upload to MinIO
const formData = new FormData();
formData.append('file', file);
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const { url } = await response.json();
// Use URL in request creation
```

**File Restrictions:**

- **Type**: PDF only
- **Size**: 2MB maximum
- **Storage**: MinIO S3-compatible object storage
- **URL format**: `https://minio.domain.com/bucket/object-key`

---

## 4. Authentication & Authorization

### 4.1 Session Management

**Technology:** Iron Session (encrypted cookies)

**Session Data:**

```typescript
interface SessionData {
  user: {
    id: string;
    username: string;
    role: string;
    institutionId: string;
    employeeId?: string;
  };
}
```

**Session Helpers:**

```typescript
// /src/lib/auth.ts
export async function getSession(req: NextRequest) {
  const session = await getIronSession(req, res, sessionOptions);
  return session.user || null;
}

export async function requireAuth(req: NextRequest) {
  const user = await getSession(req);
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

export async function requireRole(req: NextRequest, roles: string[]) {
  const user = await requireAuth(req);
  if (!roles.includes(user.role)) {
    throw new Error('Unauthorized');
  }
  return user;
}
```

### 4.2 Role-Based Access Control

**Permission Matrix:**

| Feature                   | HRO | HHRMD | HRMO | DO  | PO  | CSCS | HRRP | ADMIN | EMPLOYEE |
| ------------------------- | --- | ----- | ---- | --- | --- | ---- | ---- | ----- | -------- |
| Submit Confirmations      | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Confirmations     | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit Promotions         | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Promotions        | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit LWOP               | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve LWOP              | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit Cadre Change       | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Cadre Change      | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit Retirement         | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Retirement        | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit Resignation        | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Resignation       | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit Service Extension  | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Service Extension | -   | ✓     | ✓    | -   | -   | -    | -    | -     | -        |
| Submit Termination        | ✓   | -     | -    | -   | -   | -    | -    | -     | -        |
| Approve Termination       | -   | ✓     | -    | ✓   | -   | -    | -    | -     | -        |
| Submit Complaints         | -   | -     | -    | -   | -   | -    | -    | -     | ✓        |
| Review Complaints         | -   | ✓     | -    | ✓   | -   | -    | -    | -     | -        |
| View Reports              | ✓\* | ✓     | ✓    | ✓   | ✓   | ✓    | ✓\*  | ✓     | -        |
| Manage Users              | -   | -     | -    | -   | -   | -    | -    | ✓     | -        |
| Manage Institutions       | -   | -     | -    | -   | -   | -    | -    | ✓     | -        |
| HRIMS Integration         | -   | -     | -    | -   | -   | -    | -    | ✓     | -        |
| Dashboard Access          | ✓   | ✓     | ✓    | ✓   | -   | ✓    | ✓    | ✓     | -        |

\* Institution-based roles see only own institution data

**CSC Roles** (All Institutions Access):

- HHRMD, HRMO, DO, PO, CSCS

**Institution Roles** (Own Institution Only):

- HRO, HRRP

### 4.3 Data Isolation

**Implementation Pattern:**

```typescript
// Example: Get confirmation requests with institution filtering
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);

  const where: Prisma.ConfirmationRequestWhereInput = {};

  // Institution-based roles: filter by institution
  if (['HRO', 'HRRP'].includes(user.role)) {
    where.employee = {
      institutionId: user.institutionId,
    };
  }

  // CSC roles: no filter (see all)

  const requests = await prisma.confirmationRequest.findMany({
    where,
    include: {
      employee: {
        include: { institution: true },
      },
      submittedBy: true,
      reviewedBy: true,
    },
  });

  return NextResponse.json({ confirmationRequests: requests });
}
```

**Enforcement Points:**

1. API route handlers check user role
2. Prisma queries include institution filters
3. Frontend hides unauthorized features
4. Middleware validates sessions

---

## 5. Request Workflow System

### 5.1 Standard Workflow

All HR requests follow this pattern:

```
┌─────────────┐
│   PENDING   │ ← Initial status when HRO submits
└──────┬──────┘
       │
       ├── HHRMD/HRMO/DO reviews
       │
       ├─────────────┬─────────────┐
       │             │             │
       ▼             ▼             ▼
┌──────────┐  ┌───────────┐  ┌─────────┐
│ APPROVED │  │ REJECTED  │  │ PENDING │
│   BY     │  │           │  │  MORE   │
│COMMISSION│  │           │  │  INFO   │
└────┬─────┘  └───────────┘  └─────────┘
     │
     └── Side effects:
         • Update employee status/data
         • Send notifications
         • Record decision date
```

### 5.2 Status Values

**Common Statuses:**

- `Pending`: Awaiting review
- `Approved by Commission`: Approved by HHRMD/HRMO/DO
- `Rejected`: Rejected with reason
- `More Info Requested`: Additional information needed

### 5.3 Review Stages

Each request has a `reviewStage` field tracking progression:

- `Pending Approval`: Initial stage
- `Under Review`: Being reviewed
- `Commission Review`: At commission level
- `Completed`: Finalized

### 5.4 Approval Authority

**Request Type → Approvers:**

| Request Type          | Approvers            |
| --------------------- | -------------------- |
| Confirmation          | HHRMD, HRMO          |
| Promotion             | HHRMD, HRMO          |
| LWOP                  | HHRMD, HRMO          |
| Cadre Change          | HHRMD, HRMO          |
| Retirement            | HHRMD, HRMO          |
| Resignation           | HHRMD, HRMO          |
| Service Extension     | HHRMD, HRMO          |
| Termination/Dismissal | HHRMD, DO (NOT HRMO) |
| Complaints            | HHRMD, DO (NOT HRMO) |

### 5.5 Side Effects on Approval

**Request Type → Employee Update:**

| Request           | Employee Field(s) Updated                                    |
| ----------------- | ------------------------------------------------------------ |
| Confirmation      | `status` → "Confirmed"<br>`confirmationDate` → approval date |
| Promotion         | `cadre` → `proposedCadre`                                    |
| LWOP              | `status` → "On LWOP"                                         |
| Cadre Change      | `cadre` → `newCadre`                                         |
| Retirement        | `status` → "Retired"<br>`retirementDate` → `proposedDate`    |
| Resignation       | `status` → "Resigned"                                        |
| Service Extension | `retirementDate` → extended date                             |
| Termination       | `status` → "Terminated"                                      |
| Dismissal         | `status` → "Dismissed"                                       |

### 5.6 Notification Flow

**On Request Submission:**

```typescript
// Notifications sent to:
// - HHRMD
// - DO (if applicable)

await prisma.notification.createMany({
  data: [
    {
      id: generateId(),
      userId: hhrmdUserId,
      message: `New ${requestType} request submitted for ${employeeName}`,
      link: `/requests/${requestType}/${requestId}`,
      createdAt: new Date(),
    },
    // ... DO notification
  ],
});
```

**On Approval/Rejection:**

```typescript
// Notification sent to:
// - Submitter (HRO)

await prisma.notification.create({
  data: {
    id: generateId(),
    userId: submitterId,
    message: `${requestType} request for ${employeeName} has been ${action}`,
    link: `/requests/${requestType}/${requestId}`,
  },
});
```

**Complaint Notifications (Swahili):**

```typescript
await prisma.notification.create({
  data: {
    message: `Malalamiko mpya imewasilishwa: ${subject}`,
    link: `/complaints/${complaintId}`,
  },
});
```

---

## 6. File Storage & Management

### 6.1 MinIO Configuration

**Server:** MinIO S3-Compatible Object Storage

**Configuration:**

```typescript
// /src/lib/minio.ts
import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

export const BUCKET_NAME = process.env.MINIO_BUCKET || 'csms-documents';
```

**Environment Variables:**

```env
MINIO_ENDPOINT=minio.domain.com
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET=csms-documents
```

### 6.2 Upload Pattern

**Client-Side Upload:**

```typescript
async function uploadDocument(file: File): Promise<string> {
  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must be less than 2MB');
  }

  // Upload to MinIO via API
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'confirmation-documents'); // optional

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const { url } = await response.json();
  return url; // MinIO object URL
}
```

**Server-Side Upload Handler:**

```typescript
// /src/app/api/upload/route.ts
import { minioClient, BUCKET_NAME } from '@/lib/minio';
import { generateId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const category = (formData.get('category') as string) || 'documents';

  // Validate
  if (!file) throw new Error('No file provided');
  if (file.type !== 'application/pdf') throw new Error('Only PDF allowed');
  if (file.size > 2 * 1024 * 1024) throw new Error('File too large');

  // Generate unique object name
  const objectName = `${category}/${generateId()}-${file.name}`;

  // Convert File to Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload to MinIO
  await minioClient.putObject(BUCKET_NAME, objectName, buffer, file.size, {
    'Content-Type': file.type,
    'x-uploaded-by': user.id,
  });

  // Generate URL
  const url = `https://${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${objectName}`;

  return NextResponse.json({ url });
}
```

### 6.3 File Download & Preview

**Download:**

```typescript
async function downloadDocument(url: string, filename: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
```

**Preview (PDF):**

```typescript
function PreviewDocument({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      className="w-full h-screen"
      title="Document Preview"
    />
  );
}
```

### 6.4 Document Categories

**Storage Structure in MinIO:**

```
csms-documents/
├── confirmation-documents/
├── promotion-documents/
├── lwop-documents/
├── cadre-change-documents/
├── retirement-documents/
├── resignation-documents/
├── service-extension-documents/
├── termination-documents/
├── complaint-attachments/
├── employee-photos/
├── employee-documents/
│   ├── ardhil-hali/
│   ├── birth-certificates/
│   ├── confirmation-letters/
│   └── job-contracts/
└── certificates/
```

---

## 7. HRIMS Integration

### 7.1 Integration Architecture

**External System:** HRIMS (Human Resource Information Management System)

**Integration Type:** REST API

**Data Flow:**

```
HRIMS (External) ←→ CSMS Admin Tools ←→ CSMS Database
                    ↓
                  MinIO Storage (Photos, Documents)
```

### 7.2 HRIMS API Client

```typescript
// /src/lib/hrims.ts
export class HRIMSClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.HRIMS_API_URL!;
    this.apiKey = process.env.HRIMS_API_KEY!;
  }

  async fetchEmployee(identifier: { zanId?: string; payrollNumber?: string }) {
    const params = new URLSearchParams(identifier as any);
    const response = await fetch(`${this.baseUrl}/employees?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HRIMS API error: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchEmployeesByInstitution(voteCode: string, page = 1, pageSize = 50) {
    const response = await fetch(
      `${this.baseUrl}/employees/by-institution?voteCode=${voteCode}&page=${page}&pageSize=${pageSize}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json();
  }

  async fetchPhoto(identifier: { zanId?: string; payrollNumber?: string }) {
    const params = new URLSearchParams(identifier as any);
    const response = await fetch(`${this.baseUrl}/employees/photo?${params}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();
    return data.photo; // base64 string
  }

  async fetchDocuments(
    identifier: { zanId?: string; payrollNumber?: string },
    documentTypes: string[]
  ) {
    const params = new URLSearchParams({
      ...(identifier as any),
      types: documentTypes.join(','),
    });

    const response = await fetch(
      `${this.baseUrl}/employees/documents?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json(); // Returns { ardhilHali: base64, birthCertificate: base64, ... }
  }

  async fetchCertificates(identifier: {
    zanId?: string;
    payrollNumber?: string;
  }) {
    const params = new URLSearchParams(identifier as any);
    const response = await fetch(
      `${this.baseUrl}/employees/certificates?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    return response.json(); // Returns array of certificates
  }
}

export const hrimsClient = new HRIMSClient();
```

### 7.3 Data Mapping

**HRIMS → CSMS Employee:**

```typescript
function mapHRIMSToEmployee(hrimsData: any, institutionId: string) {
  return {
    id: generateId(),
    employeeEntityId: hrimsData.id,
    name: hrimsData.fullName,
    gender: hrimsData.gender,
    dateOfBirth: hrimsData.dateOfBirth ? new Date(hrimsData.dateOfBirth) : null,
    placeOfBirth: hrimsData.placeOfBirth,
    region: hrimsData.region,
    countryOfBirth: hrimsData.countryOfBirth,
    zanId: hrimsData.zanId,
    phoneNumber: hrimsData.phoneNumber,
    contactAddress: hrimsData.contactAddress,
    zssfNumber: hrimsData.zssfNumber,
    payrollNumber: hrimsData.payrollNumber,
    cadre: hrimsData.cadre,
    salaryScale: hrimsData.salaryScale,
    ministry: hrimsData.ministry,
    department: hrimsData.department,
    appointmentType: hrimsData.appointmentType,
    contractType: hrimsData.contractType,
    recentTitleDate: hrimsData.recentTitleDate
      ? new Date(hrimsData.recentTitleDate)
      : null,
    currentReportingOffice: hrimsData.currentReportingOffice,
    currentWorkplace: hrimsData.currentWorkplace,
    employmentDate: hrimsData.employmentDate
      ? new Date(hrimsData.employmentDate)
      : null,
    confirmationDate: hrimsData.confirmationDate
      ? new Date(hrimsData.confirmationDate)
      : null,
    retirementDate: hrimsData.retirementDate
      ? new Date(hrimsData.retirementDate)
      : null,
    status: hrimsData.status,
    institutionId: institutionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

### 7.4 Bulk Sync Implementation

**With Server-Sent Events (SSE):**

```typescript
// /src/app/api/hrims/fetch-by-institution/route.ts
export async function POST(request: NextRequest) {
  const user = await requireRole(request, ['ADMIN']);
  const {
    voteCode,
    page = 1,
    pageSize = 50,
    autoSync,
    institutionId,
  } = await request.json();

  // Create readable stream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch from HRIMS
        const hrimsData = await hrimsClient.fetchEmployeesByInstitution(
          voteCode,
          page,
          pageSize
        );

        const total = hrimsData.total;
        let processed = 0;

        for (const hrimsEmployee of hrimsData.employees) {
          processed++;

          // Send progress event
          controller.enqueue(
            encoder.encode(
              `event: progress\ndata: ${JSON.stringify({ processed, total, page })}\n\n`
            )
          );

          if (autoSync && institutionId) {
            // Save to CSMS database
            const employee = mapHRIMSToEmployee(hrimsEmployee, institutionId);
            await prisma.employee.upsert({
              where: { zanId: employee.zanId },
              create: employee,
              update: employee,
            });
          }

          // Send employee event
          controller.enqueue(
            encoder.encode(
              `event: employee\ndata: ${JSON.stringify({ employee: hrimsEmployee })}\n\n`
            )
          );
        }

        // Send complete event
        controller.enqueue(
          encoder.encode(
            `event: complete\ndata: ${JSON.stringify({ totalFetched: processed })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

**Client-Side SSE Consumer:**

```typescript
async function syncEmployees(voteCode: string, institutionId: string) {
  const eventSource = new EventSource(
    `/api/hrims/fetch-by-institution?voteCode=${voteCode}&institutionId=${institutionId}&autoSync=true`
  );

  eventSource.addEventListener('progress', (e) => {
    const { processed, total } = JSON.parse(e.data);
    updateProgress(processed, total);
  });

  eventSource.addEventListener('employee', (e) => {
    const { employee } = JSON.parse(e.data);
    console.log('Synced:', employee.name);
  });

  eventSource.addEventListener('complete', (e) => {
    const { totalFetched } = JSON.parse(e.data);
    console.log('Complete:', totalFetched, 'employees synced');
    eventSource.close();
  });

  eventSource.addEventListener('error', (e) => {
    const { error } = JSON.parse(e.data);
    console.error('Error:', error);
    eventSource.close();
  });
}
```

### 7.5 Photo & Document Sync

**Upload Base64 to MinIO:**

```typescript
async function uploadBase64ToMinIO(
  base64Data: string,
  fileName: string,
  category: string
): Promise<string> {
  // Remove data URL prefix if present
  const base64Clean = base64Data.replace(/^data:.+;base64,/, '');

  // Convert to buffer
  const buffer = Buffer.from(base64Clean, 'base64');

  // Generate object name
  const objectName = `${category}/${generateId()}-${fileName}`;

  // Upload to MinIO
  await minioClient.putObject(
    BUCKET_NAME,
    objectName,
    buffer,
    buffer.length,
    { 'Content-Type': 'application/pdf' } // or image/jpeg for photos
  );

  // Return URL
  return `https://${process.env.MINIO_ENDPOINT}/${BUCKET_NAME}/${objectName}`;
}
```

**Sync Photo:**

```typescript
async function syncEmployeePhoto(zanId: string) {
  // Fetch photo from HRIMS
  const photoBase64 = await hrimsClient.fetchPhoto({ zanId });

  if (!photoBase64) {
    return null;
  }

  // Upload to MinIO
  const photoUrl = await uploadBase64ToMinIO(
    photoBase64,
    `${zanId}-photo.jpg`,
    'employee-photos'
  );

  // Update employee record
  await prisma.employee.update({
    where: { zanId },
    data: { profileImageUrl: photoUrl },
  });

  return photoUrl;
}
```

**Sync Documents:**

```typescript
async function syncEmployeeDocuments(zanId: string) {
  // Fetch all documents from HRIMS
  const documents = await hrimsClient.fetchDocuments({ zanId }, [
    'ardhilHali',
    'birthCertificate',
    'confirmationLetter',
    'jobContract',
  ]);

  const urls: any = {};

  // Upload each document
  if (documents.ardhilHali) {
    urls.ardhilHaliUrl = await uploadBase64ToMinIO(
      documents.ardhilHali,
      `${zanId}-ardhil-hali.pdf`,
      'employee-documents/ardhil-hali'
    );
  }

  if (documents.birthCertificate) {
    urls.birthCertificateUrl = await uploadBase64ToMinIO(
      documents.birthCertificate,
      `${zanId}-birth-certificate.pdf`,
      'employee-documents/birth-certificates'
    );
  }

  if (documents.confirmationLetter) {
    urls.confirmationLetterUrl = await uploadBase64ToMinIO(
      documents.confirmationLetter,
      `${zanId}-confirmation-letter.pdf`,
      'employee-documents/confirmation-letters'
    );
  }

  if (documents.jobContract) {
    urls.jobContractUrl = await uploadBase64ToMinIO(
      documents.jobContract,
      `${zanId}-job-contract.pdf`,
      'employee-documents/job-contracts'
    );
  }

  // Update employee record
  await prisma.employee.update({
    where: { zanId },
    data: urls,
  });

  return urls;
}
```

---

## 8. Notification System

### 8.1 Notification Model

```typescript
interface Notification {
  id: string;
  message: string;
  link: string | null;
  isRead: boolean;
  userId: string;
  createdAt: Date;
}
```

### 8.2 Creating Notifications

**Helper Function:**

```typescript
// /src/lib/notifications.ts
export async function createNotification(
  userId: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: {
      id: generateId(),
      userId,
      message,
      link: link || null,
      isRead: false,
      createdAt: new Date(),
    },
  });
}

export async function notifyMultiple(
  userIds: string[],
  message: string,
  link?: string
) {
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      id: generateId(),
      userId,
      message,
      link: link || null,
      isRead: false,
      createdAt: new Date(),
    })),
  });
}
```

### 8.3 Notification Templates

**English:**

```typescript
const templates = {
  confirmationSubmitted: (employeeName: string) =>
    `New confirmation request submitted for ${employeeName}`,
  confirmationApproved: (employeeName: string) =>
    `Confirmation request for ${employeeName} has been approved`,
  confirmationRejected: (employeeName: string) =>
    `Confirmation request for ${employeeName} has been rejected`,
  // ... other templates
};
```

**Swahili (for Complaints):**

```typescript
const swahiliTemplates = {
  complaintSubmitted: (subject: string, caseId: string) =>
    `Malalamiko mpya imewasilishwa: ${subject} (Kesi ${caseId})`,
  complaintResolved: (caseId: string) =>
    `Malalamiko yako (Kesi ${caseId}) imetatuliwa`,
  complaintMoreInfo: (caseId: string) =>
    `Taarifa zaidi zinahitajika kwa malalamiko yako (Kesi ${caseId})`,
};
```

### 8.4 Real-Time Notifications

**Client-Side Polling:**

```typescript
// Hook for fetching notifications
function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    const response = await fetch('/api/notifications');
    const data = await response.json();
    setNotifications(data.notifications);
    setUnreadCount(data.notifications.filter((n) => !n.isRead).length);
  }

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    fetchNotifications();
  }

  async function markAllRead() {
    await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });
    fetchNotifications();
  }

  return { notifications, unreadCount, markAsRead, markAllRead };
}
```

**UI Component:**

```typescript
function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge className="absolute top-0 right-0">{unreadCount}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={notification.isRead ? 'opacity-50' : ''}
              onClick={() => {
                markAsRead(notification.id);
                if (notification.link) {
                  router.push(notification.link);
                }
              }}
            >
              <p>{notification.message}</p>
              <small>{formatDate(notification.createdAt)}</small>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## 9. Reporting System

### 9.1 Report Types

1. **Confirmations Report**
2. **Promotions Report**
3. **LWOP Report**
4. **Cadre Changes Report**
5. **Retirements Report**
6. **Resignations Report**
7. **Service Extensions Report**
8. **Terminations Report**
9. **Complaints Report**
10. **All Requests Report** (combined)

### 9.2 Report Generation

**Backend (API):**

```typescript
// /src/app/api/reports/route.ts
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  const { reportType, startDate, endDate, institutionId, status } =
    await request.json();

  // Build where clause
  const where: any = {};

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (status) {
    where.status = status;
  }

  // Institution filtering
  if (['HRO', 'HRRP'].includes(user.role)) {
    where.employee = { institutionId: user.institutionId };
  } else if (institutionId) {
    where.employee = { institutionId };
  }

  // Fetch data based on report type
  let data: any[] = [];

  switch (reportType) {
    case 'confirmations':
      data = await prisma.confirmationRequest.findMany({
        where,
        include: {
          employee: { include: { institution: true } },
          submittedBy: true,
          reviewedBy: true,
        },
      });
      break;

    case 'promotions':
      data = await prisma.promotionRequest.findMany({
        where,
        include: {
          employee: { include: { institution: true } },
          submittedBy: true,
          reviewedBy: true,
        },
      });
      break;

    // ... other report types

    case 'all-requests':
      // Combine all request types
      const [confirmations, promotions, lwop /* ... */] = await Promise.all([
        prisma.confirmationRequest.findMany({
          where,
          include: { employee: { include: { institution: true } } },
        }),
        prisma.promotionRequest.findMany({
          where,
          include: { employee: { include: { institution: true } } },
        }),
        prisma.lwopRequest.findMany({
          where,
          include: { employee: { include: { institution: true } } },
        }),
        // ... other types
      ]);

      data = [
        ...confirmations.map((r) => ({ ...r, requestType: 'Confirmation' })),
        ...promotions.map((r) => ({ ...r, requestType: 'Promotion' })),
        ...lwop.map((r) => ({ ...r, requestType: 'LWOP' })),
        // ... other types
      ];
      break;
  }

  // Normalize status to Swahili
  const normalizedData = data.map((item) => ({
    ...item,
    statusSwahili: normalizeStatus(item.status),
  }));

  // Calculate summary
  const summary = {
    total: data.length,
    approved: data.filter((r) => r.status === 'Approved by Commission').length,
    pending: data.filter((r) => r.status === 'Pending').length,
    rejected: data.filter((r) => r.status === 'Rejected').length,
  };

  return NextResponse.json({
    reportType,
    generatedAt: new Date().toISOString(),
    filters: { startDate, endDate, institutionId, status },
    data: normalizedData,
    summary,
  });
}

function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Approved by Commission': 'Imekamilika',
    Pending: 'Inasubiri',
    Rejected: 'Imekataliwa',
  };
  return statusMap[status] || status;
}
```

### 9.3 Export to PDF

**Using jsPDF:**

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function exportReportToPDF(reportData: any) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(16);
  doc.text(`${reportData.reportType} Report`, 14, 15);

  // Metadata
  doc.setFontSize(10);
  doc.text(
    `Generated: ${new Date(reportData.generatedAt).toLocaleString()}`,
    14,
    25
  );
  if (reportData.filters.startDate) {
    doc.text(
      `Date Range: ${reportData.filters.startDate} to ${reportData.filters.endDate}`,
      14,
      30
    );
  }

  // Summary
  doc.text(`Total: ${reportData.summary.total}`, 14, 40);
  doc.text(`Approved: ${reportData.summary.approved}`, 14, 45);
  doc.text(`Pending: ${reportData.summary.pending}`, 14, 50);
  doc.text(`Rejected: ${reportData.summary.rejected}`, 14, 55);

  // Table
  const tableData = reportData.data.map((item: any) => [
    item.employee.name,
    item.employee.institution.name,
    new Date(item.createdAt).toLocaleDateString(),
    item.statusSwahili,
    item.decisionDate ? new Date(item.decisionDate).toLocaleDateString() : '-',
  ]);

  (doc as any).autoTable({
    head: [
      [
        'Employee / Mfanyakazi',
        'Institution / Taasisi',
        'Submission / Tarehe',
        'Status / Hali',
        'Decision / Uamuzi',
      ],
    ],
    body: tableData,
    startY: 65,
  });

  // Save
  doc.save(`${reportData.reportType}-report-${Date.now()}.pdf`);
}
```

### 9.4 Export to Excel

**Using XLSX:**

```typescript
import * as XLSX from 'xlsx';

function exportReportToExcel(reportData: any) {
  // Prepare data
  const worksheetData = [
    // Headers (bilingual)
    [
      'Employee / Mfanyakazi',
      'Institution / Taasisi',
      'Submission / Tarehe',
      'Status / Hali',
      'Decision / Uamuzi',
    ],

    // Data rows
    ...reportData.data.map((item: any) => [
      item.employee.name,
      item.employee.institution.name,
      new Date(item.createdAt).toLocaleDateString(),
      item.statusSwahili,
      item.decisionDate
        ? new Date(item.decisionDate).toLocaleDateString()
        : '-',
    ]),
  ];

  // Create workbook
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, reportData.reportType);

  // Add summary sheet
  const summaryData = [
    ['Summary', ''],
    ['Total', reportData.summary.total],
    ['Approved / Imekamilika', reportData.summary.approved],
    ['Pending / Inasubiri', reportData.summary.pending],
    ['Rejected / Imekataliwa', reportData.summary.rejected],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Download
  XLSX.writeFile(
    workbook,
    `${reportData.reportType}-report-${Date.now()}.xlsx`
  );
}
```

---

## 10. Code Examples

### 10.1 Complete Request Submission Flow

**Example: Submitting a Promotion Request**

```typescript
// Frontend component
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PromotionRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    promotionType: 'Experience-based',
    proposedCadre: '',
    studiedOutsideCountry: false,
    documents: [] as string[]
  });

  const handleFileUpload = async (file: File, index: number) => {
    // Validate
    if (file.type !== 'application/pdf') {
      alert('Only PDF files allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File must be less than 2MB');
      return;
    }

    // Upload to MinIO
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'promotion-documents');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const { url } = await response.json();

    // Update documents array
    setFormData(prev => {
      const newDocs = [...prev.documents];
      newDocs[index] = url;
      return { ...prev, documents: newDocs };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      const { promotionRequest } = await response.json();
      alert('Promotion request submitted successfully!');
      router.push(`/promotions/${promotionRequest.id}`);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Employee</label>
        <select
          value={formData.employeeId}
          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          required
        >
          <option value="">Select employee</option>
          {/* Populated from API */}
        </select>
      </div>

      <div>
        <label>Promotion Type</label>
        <select
          value={formData.promotionType}
          onChange={(e) => setFormData({ ...formData, promotionType: e.target.value })}
        >
          <option value="Experience-based">Experience-based</option>
          <option value="Education-based">Education-based</option>
        </select>
      </div>

      <div>
        <label>Proposed Cadre</label>
        <input
          type="text"
          value={formData.proposedCadre}
          onChange={(e) => setFormData({ ...formData, proposedCadre: e.target.value })}
          required
        />
      </div>

      {formData.promotionType === 'Experience-based' && (
        <>
          <div>
            <label>Performance Appraisal Year 1</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 0)}
            />
          </div>
          <div>
            <label>Performance Appraisal Year 2</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 1)}
            />
          </div>
          <div>
            <label>Performance Appraisal Year 3</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 2)}
            />
          </div>
          <div>
            <label>CSC Promotion Form</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 3)}
            />
          </div>
          <div>
            <label>Letter of Request</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 4)}
            />
          </div>
        </>
      )}

      {formData.promotionType === 'Education-based' && (
        <>
          <div>
            <label>Educational Certificate</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 0)}
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={formData.studiedOutsideCountry}
                onChange={(e) => setFormData({ ...formData, studiedOutsideCountry: e.target.checked })}
              />
              Studied Outside Country
            </label>
          </div>
          {formData.studiedOutsideCountry && (
            <div>
              <label>TCU Form</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleFileUpload(e.target.files![0], 1)}
              />
            </div>
          )}
          <div>
            <label>Letter of Request</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => handleFileUpload(e.target.files![0], 2)}
            />
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? 'Submitting...' : 'Submit Promotion Request'}
      </button>
    </form>
  );
}
```

**Backend API Handler:**

```typescript
// /src/app/api/promotions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateId } from '@/lib/utils';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);

  // Only HRO can submit
  if (user.role !== 'HRO') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const {
    employeeId,
    promotionType,
    proposedCadre,
    studiedOutsideCountry,
    documents,
  } = await request.json();

  // Validate employee
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { institution: true },
  });

  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Check institution match
  if (employee.institutionId !== user.institutionId) {
    return NextResponse.json(
      {
        error:
          'Cannot submit promotion for employee from different institution',
      },
      { status: 403 }
    );
  }

  // Validate employee status
  const invalidStatuses = [
    'On Probation',
    'On LWOP',
    'Retired',
    'Resigned',
    'Terminated',
    'Dismissed',
  ];
  if (invalidStatuses.includes(employee.status || '')) {
    return NextResponse.json(
      { error: `Cannot promote employee with status: ${employee.status}` },
      { status: 400 }
    );
  }

  // Validate documents based on type
  if (promotionType === 'Experience-based' && documents.length < 5) {
    return NextResponse.json(
      { error: 'Experience-based promotion requires 5 documents' },
      { status: 400 }
    );
  }

  if (promotionType === 'Education-based') {
    const minDocs = studiedOutsideCountry ? 3 : 2;
    if (documents.length < minDocs) {
      return NextResponse.json(
        { error: `Education-based promotion requires ${minDocs} documents` },
        { status: 400 }
      );
    }
  }

  // Create promotion request
  const promotionRequest = await prisma.promotionRequest.create({
    data: {
      id: generateId(),
      employeeId,
      submittedById: user.id,
      promotionType,
      proposedCadre,
      studiedOutsideCountry: studiedOutsideCountry || false,
      documents,
      status: 'Pending',
      reviewStage: 'Pending Approval',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      employee: { include: { institution: true } },
      submittedBy: true,
    },
  });

  // Send notifications to HHRMD and DO
  const hhrmdUsers = await prisma.user.findMany({
    where: { role: { in: ['HHRMD', 'DO'] }, active: true },
  });

  for (const officer of hhrmdUsers) {
    await createNotification(
      officer.id,
      `New ${promotionType} promotion request submitted for ${employee.name}`,
      `/promotions/${promotionRequest.id}`
    );
  }

  return NextResponse.json(
    {
      promotionRequest,
      message: 'Promotion request submitted successfully',
    },
    { status: 201 }
  );
}
```

### 10.2 Approval Flow Example

**Frontend Approval Component:**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PromotionApprovalPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [promotionRequest, setPromotionRequest] = useState(null);

  useEffect(() => {
    fetchPromotionRequest();
  }, []);

  async function fetchPromotionRequest() {
    const response = await fetch(`/api/promotions/${params.id}`);
    const data = await response.json();
    setPromotionRequest(data.promotionRequest);
  }

  async function handleApprove() {
    if (!confirm('Are you sure you want to approve this promotion request?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/promotions/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      alert('Promotion request approved successfully!');
      router.push('/promotions');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!confirm('Are you sure you want to reject this promotion request?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/promotions/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason })
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      alert('Promotion request rejected');
      router.push('/promotions');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!promotionRequest) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Promotion Request Review</h1>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div>
          <label className="font-semibold">Employee:</label>
          <p>{promotionRequest.employee.name}</p>
        </div>

        <div>
          <label className="font-semibold">Current Cadre:</label>
          <p>{promotionRequest.employee.cadre}</p>
        </div>

        <div>
          <label className="font-semibold">Proposed Cadre:</label>
          <p>{promotionRequest.proposedCadre}</p>
        </div>

        <div>
          <label className="font-semibold">Promotion Type:</label>
          <p>{promotionRequest.promotionType}</p>
        </div>

        <div>
          <label className="font-semibold">Documents:</label>
          <ul>
            {promotionRequest.documents.map((url, index) => (
              <li key={index}>
                <a href={url} target="_blank" className="text-blue-600 hover:underline">
                  Document {index + 1}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="font-semibold">Submitted By:</label>
          <p>{promotionRequest.submittedBy.name} ({promotionRequest.submittedBy.role})</p>
        </div>

        <div>
          <label className="font-semibold">Submission Date:</label>
          <p>{new Date(promotionRequest.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {promotionRequest.status === 'Pending' && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="font-semibold">Rejection Reason (if rejecting):</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full border rounded p-2"
              rows={4}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Approve
            </button>

            <button
              onClick={handleReject}
              disabled={loading}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Backend Approval Handler:**

```typescript
// /src/app/api/promotions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth(request);

  // Only HHRMD or HRMO can approve promotions
  if (!['HHRMD', 'HRMO'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { action, rejectionReason, commissionDecisionReason } =
    await request.json();

  // Validate action
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Validate rejection reason if rejecting
  if (action === 'reject' && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: 'Rejection reason is required' },
      { status: 400 }
    );
  }

  // Find promotion request
  const promotionRequest = await prisma.promotionRequest.findUnique({
    where: { id: params.id },
    include: {
      employee: true,
      submittedBy: true,
    },
  });

  if (!promotionRequest) {
    return NextResponse.json(
      { error: 'Promotion request not found' },
      { status: 404 }
    );
  }

  // Check if already processed
  if (promotionRequest.status !== 'Pending') {
    return NextResponse.json(
      { error: 'Promotion request already processed' },
      { status: 400 }
    );
  }

  const now = new Date();

  if (action === 'approve') {
    // Update promotion request
    await prisma.promotionRequest.update({
      where: { id: params.id },
      data: {
        status: 'Approved by Commission',
        reviewStage: 'Completed',
        reviewedById: user.id,
        commissionDecisionReason: commissionDecisionReason || null,
        updatedAt: now,
      },
    });

    // Update employee cadre
    await prisma.employee.update({
      where: { id: promotionRequest.employeeId },
      data: {
        cadre: promotionRequest.proposedCadre,
        updatedAt: now,
      },
    });

    // Notify submitter
    await createNotification(
      promotionRequest.submittedById,
      `Promotion request for ${promotionRequest.employee.name} has been approved. Cadre updated to ${promotionRequest.proposedCadre}.`,
      `/promotions/${params.id}`
    );
  } else {
    // Reject
    await prisma.promotionRequest.update({
      where: { id: params.id },
      data: {
        status: 'Rejected',
        reviewStage: 'Completed',
        reviewedById: user.id,
        rejectionReason,
        updatedAt: now,
      },
    });

    // Notify submitter
    await createNotification(
      promotionRequest.submittedById,
      `Promotion request for ${promotionRequest.employee.name} has been rejected.`,
      `/promotions/${params.id}`
    );
  }

  // Fetch updated request
  const updatedRequest = await prisma.promotionRequest.findUnique({
    where: { id: params.id },
    include: {
      employee: { include: { institution: true } },
      submittedBy: true,
      reviewedBy: true,
    },
  });

  return NextResponse.json({
    promotionRequest: updatedRequest,
    message: `Promotion request ${action}ed successfully`,
  });
}
```

---

## 11. Error Handling

### 11.1 API Error Responses

**Standard Error Format:**

```typescript
{
  error: string,  // Error message
  code?: string,  // Optional error code
  details?: any   // Optional additional details
}
```

**Common HTTP Status Codes:**

- `200` OK: Successful request
- `201` Created: Resource created successfully
- `400` Bad Request: Validation error or invalid input
- `401` Unauthorized: Not authenticated
- `403` Forbidden: Authenticated but not authorized
- `404` Not Found: Resource not found
- `500` Internal Server Error: Server-side error

### 11.2 Error Handling Pattern

**API Route:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // ... business logic

    return NextResponse.json({
      /* success response */
    });
  } catch (error) {
    console.error('Error:', error);

    if (error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate value for unique field' },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 11.3 Client-Side Error Handling

```typescript
async function makeRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const { error } = await response.json();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}
```

---

## 12. Security Considerations

### 12.1 Authentication Security

**Password Hashing:**

```typescript
import bcrypt from 'bcryptjs';

// Hash password on user creation
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// Verify password on login
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

**Session Security:**

- Sessions stored in encrypted cookies (Iron Session)
- HTTPS required in production
- Session timeout after inactivity

### 12.2 Authorization Checks

**Every API route must:**

1. Verify user is authenticated
2. Check user has appropriate role
3. Validate user has access to requested resource (institution-based filtering)

**Example:**

```typescript
export async function GET(request: NextRequest) {
  // 1. Check authentication
  const user = await requireAuth(request);

  // 2. Check role
  if (!['HRO', 'HHRMD', 'HRMO'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // 3. Apply institution filtering
  const where: any = {};
  if (user.role === 'HRO') {
    where.employee = { institutionId: user.institutionId };
  }

  // ... proceed with query
}
```

### 12.3 Input Validation

**Always validate:**

- Required fields present
- Data types correct
- String lengths within limits
- Email format valid
- File types and sizes correct
- Dates in valid ranges

**Example with Zod:**

```typescript
import { z } from 'zod';

const promotionSchema = z.object({
  employeeId: z.string().uuid(),
  promotionType: z.enum(['Experience-based', 'Education-based']),
  proposedCadre: z.string().min(2),
  studiedOutsideCountry: z.boolean().optional(),
  documents: z.array(z.string().url()).min(2).max(5),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate
  const result = promotionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 }
    );
  }

  // Use validated data
  const data = result.data;
  // ...
}
```

### 12.4 File Upload Security

**Restrictions:**

- PDF only (server-side MIME type verification)
- 2MB maximum size
- Virus scanning (recommended)
- Stored in isolated MinIO bucket
- Access control on MinIO bucket

### 12.5 SQL Injection Prevention

**Prisma ORM provides protection:**

- Parameterized queries by default
- No raw SQL concatenation
- Input sanitization handled automatically

**Safe:**

```typescript
await prisma.employee.findMany({
  where: { name: { contains: userInput } },
});
```

**Unsafe (avoid):**

```typescript
await prisma.$queryRaw(
  `SELECT * FROM Employee WHERE name LIKE '%${userInput}%'`
);
```

### 12.6 Cross-Site Scripting (XSS) Prevention

**Next.js provides:**

- Automatic HTML escaping in JSX
- Content Security Policy headers

**Additional measures:**

- Sanitize HTML content if rendering user input
- Validate and escape in API responses

### 12.7 Cross-Site Request Forgery (CSRF) Protection

**Implemented via:**

- SameSite cookie attribute
- CSRF tokens for state-changing operations
- Verify Origin/Referer headers

---

## End of Code Documentation

This documentation provides comprehensive coverage of the CSMS codebase including:

- Complete API reference for all endpoints
- Database schema documentation with business rules
- Authentication and authorization patterns
- Request workflow implementation
- File storage and HRIMS integration
- Reporting system architecture
- Code examples and best practices
- Error handling and security guidelines

For questions or clarifications, please contact the development team.

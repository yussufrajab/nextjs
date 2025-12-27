# INTERFACE DESIGN DOCUMENT
## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

**Version 1.0 | December 25, 2025**

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | Interface Design Document |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Date Prepared** | December 25, 2025 |
| **Prepared By** | Integration Team |
| **Reviewed By** | System Architect, API Lead |
| **Approved By** | IT Department Head |
| **Status** | Final |

---

## Executive Summary

This Interface Design Document provides comprehensive specifications for all interfaces in the Civil Service Management System (CSMS). It covers internal APIs, external integration points, data formats, communication protocols, and error handling strategies.

**Key Interface Categories:**
- **Internal REST APIs** - 50+ endpoints for frontend-backend communication
- **External Integrations** - HRIMS, SMTP, Google AI (Genkit)
- **File Storage Interface** - MinIO S3-compatible API
- **Database Interface** - Prisma ORM with PostgreSQL
- **Authentication Interface** - JWT-based authentication and session management

---

## Table of Contents

1. [API Specifications](#1-api-specifications)
2. [Integration Points](#2-integration-points)
3. [Data Formats](#3-data-formats)
4. [Protocol Specifications](#4-protocol-specifications)
5. [Error Handling](#5-error-handling)
6. [Interface Security](#6-interface-security)
7. [Versioning Strategy](#7-versioning-strategy)
8. [Appendices](#8-appendices)

---

## 1. API Specifications

### 1.1 API Overview

**Base URL:** `https://csms.zanzibar.go.tz/api`
**Protocol:** HTTPS only
**Authentication:** JWT Bearer Token
**Content Type:** `application/json`
**Character Encoding:** UTF-8

**API Categories:**
1. Authentication APIs (5 endpoints)
2. Employee Management APIs (8 endpoints)
3. Request Management APIs (36 endpoints - 9 request types × 4 operations)
4. Complaint Management APIs (3 endpoints)
5. File Management APIs (6 endpoints)
6. HRIMS Integration APIs (7 endpoints)
7. User Management APIs (4 endpoints)
8. Institution Management APIs (4 endpoints)
9. Notification APIs (2 endpoints)
10. Dashboard & Reporting APIs (2 endpoints)

**Total Endpoints:** 50+ RESTful endpoints

---

### 1.2 Authentication APIs

#### 1.2.1 User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT tokens.

**Request Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Validation Rules:**
- `username`: Required, min 3 characters
- `password`: Required, min 6 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 600,
    "user": {
      "id": "uuid-v4",
      "username": "admin",
      "fullName": "System Administrator",
      "role": "ADMIN",
      "isEnabled": true,
      "employeeId": "uuid-v4 | null",
      "institutionId": "uuid-v4",
      "institutionName": "TUME YA UTUMISHI SERIKALINI",
      "lastLoginDate": "2025-12-25T10:30:00.000Z"
    }
  },
  "message": "Login successful"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Account is locked. Please contact administrator."
}
```

**Business Rules:**
- Account locks after 5 failed login attempts
- JWT expires after 10 minutes
- Refresh token expires after 7 days
- Password must be bcrypt hashed (cost factor: 10)

---

#### 1.2.2 Employee Login

**Endpoint:** `POST /api/auth/employee-login`

**Description:** Self-service login for employees using ZanID.

**Request Body:**
```json
{
  "zanId": "string",
  "password": "string"
}
```

**Response:** Same as User Login

---

#### 1.2.3 Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Invalidate user session and tokens.

**Request Headers:**
```http
Authorization: Bearer {token}
Cookie: token={jwt-token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Side Effects:**
- Clears server-side session (if applicable)
- Client must clear tokens from localStorage
- Invalidates refresh token

---

#### 1.2.4 Token Refresh

**Endpoint:** `POST /api/auth/refresh`

**Description:** Obtain new access token using refresh token.

**Request Headers:**
```http
Content-Type: text/plain
```

**Request Body:** (Plain text, not JSON)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

---

#### 1.2.5 Change Password

**Endpoint:** `POST /api/auth/change-password`

**Request Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Validation Rules:**
- `newPassword`: Min 8 characters, must contain uppercase, lowercase, number

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 1.3 Employee Management APIs

#### 1.3.1 Get Employees (List with Filtering)

**Endpoint:** `GET /api/employees`

**Description:** Retrieve employees with role-based filtering.

**Request Headers:**
```http
Authorization: Bearer {token}
```

**Query Parameters:**
```
?userRole={role}
&userInstitutionId={uuid}
&q={search-term}
&page={number}
&size={number}
```

**Parameter Details:**
- `userRole`: User's role (for RBAC filtering)
- `userInstitutionId`: User's institution ID (for institution-specific filtering)
- `q`: Search query (searches name, zanId, payrollNumber)
- `page`: Page number (default: 0)
- `size`: Page size (default: 50)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "John Doe Mwalimu",
      "zanId": "Z123456789",
      "gender": "Male",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "phoneNumber": "+255777123456",
      "payrollNumber": "PAY001234",
      "zssfNumber": "ZSSF123456",
      "cadre": "Administrative Officer",
      "salaryScale": "PGSS 7",
      "ministry": "Ministry of Health",
      "department": "Human Resources",
      "status": "Active",
      "employmentDate": "2020-03-01T00:00:00.000Z",
      "confirmationDate": "2021-03-01T00:00:00.000Z",
      "retirementDate": "2055-05-15T00:00:00.000Z",
      "institutionId": "uuid-v4",
      "institution": {
        "id": "uuid-v4",
        "name": "Mnazi Mmoja Hospital"
      }
    }
  ]
}
```

**RBAC Filtering Logic:**
```
CSC Roles (HHRMD, HRMO, DO, PO, CSCS):
  - Return ALL employees across ALL institutions

Institution Roles (HRO):
  - Return ONLY employees from user's institution
  - WHERE Employee.institutionId = userInstitutionId
```

---

#### 1.3.2 Get Employee by ID

**Endpoint:** `GET /api/employees/{id}`

**Path Parameters:**
- `id`: Employee UUID

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "name": "John Doe Mwalimu",
    "zanId": "Z123456789",
    // ... all employee fields
    "institution": {
      "id": "uuid-v4",
      "name": "Mnazi Mmoja Hospital"
    }
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Employee not found"
}
```

---

#### 1.3.3 Search Employees

**Endpoint:** `GET /api/employees/search`

**Query Parameters:**
```
?q={search-term}
&institutionId={uuid}
&status={status}
&limit={number}
```

**Search Fields:**
- Employee name
- ZanID
- Payroll number
- ZSSF number

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "John Doe",
      "zanId": "Z123456789",
      "payrollNumber": "PAY001234",
      "institution": {
        "name": "Institution Name"
      }
    }
  ]
}
```

---

#### 1.3.4 Get Employee Documents

**Endpoint:** `GET /api/employees/{id}/documents`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ardhilHaliUrl": "documents/timestamp_random_ardhilhali.pdf",
    "confirmationLetterUrl": "documents/timestamp_random_confirmation.pdf",
    "jobContractUrl": "documents/timestamp_random_contract.pdf",
    "birthCertificateUrl": "documents/timestamp_random_birth_cert.pdf"
  }
}
```

---

#### 1.3.5 Get Employee Certificates

**Endpoint:** `GET /api/employees/{id}/certificates`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "type": "Education",
      "name": "Bachelor of Science",
      "url": "certificates/timestamp_random_bsc_cert.pdf",
      "employeeId": "uuid-v4"
    },
    {
      "id": "uuid-v4",
      "type": "Training",
      "name": "Leadership Training Certificate",
      "url": "certificates/timestamp_random_leadership.pdf",
      "employeeId": "uuid-v4"
    }
  ]
}
```

---

### 1.4 Request Management APIs (Promotion Example)

**Pattern:** All 9 request types follow the same API pattern:
- Promotion
- Confirmation
- LWOP
- Cadre Change
- Retirement
- Resignation
- Termination/Separation
- Service Extension

#### 1.4.1 Get Promotion Requests

**Endpoint:** `GET /api/promotions`

**Query Parameters:**
```
?userId={uuid}
&userRole={role}
&userInstitutionId={uuid}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "status": "Pending HRMO/HHRMD Review",
      "reviewStage": "initial",
      "proposedCadre": "Senior Administrative Officer",
      "promotionType": "Experience",
      "studiedOutsideCountry": false,
      "documents": [
        "documents/timestamp_random_appraisal.pdf",
        "documents/timestamp_random_recommendation.pdf"
      ],
      "employeeId": "uuid-v4",
      "submittedById": "uuid-v4",
      "reviewedById": null,
      "rejectionReason": null,
      "commissionDecisionReason": null,
      "createdAt": "2025-12-20T10:00:00.000Z",
      "updatedAt": "2025-12-20T10:00:00.000Z",
      "Employee": {
        "id": "uuid-v4",
        "name": "John Doe Mwalimu",
        "zanId": "Z123456789",
        "payrollNumber": "PAY001234",
        "department": "Human Resources",
        "cadre": "Administrative Officer",
        "Institution": {
          "id": "uuid-v4",
          "name": "Mnazi Mmoja Hospital"
        }
      },
      "submittedBy": {
        "id": "uuid-v4",
        "name": "HR Officer",
        "username": "hro_hospital"
      },
      "reviewedBy": null
    }
  ]
}
```

---

#### 1.4.2 Create Promotion Request

**Endpoint:** `POST /api/promotions`

**Request Body:**
```json
{
  "employeeId": "uuid-v4",
  "submittedById": "uuid-v4",
  "promotionType": "Experience | Education",
  "proposedCadre": "Senior Administrative Officer",
  "studiedOutsideCountry": false,
  "documents": [
    "documents/timestamp_random_file1.pdf",
    "documents/timestamp_random_file2.pdf"
  ],
  "commissionDecisionReason": "Optional reason"
}
```

**Validation Schema (Zod):**
```typescript
{
  employeeId: z.string().uuid(),
  submittedById: z.string().uuid(),
  promotionType: z.enum(['Experience', 'Education']),
  proposedCadre: z.string().min(1).optional(),
  studiedOutsideCountry: z.boolean().optional(),
  documents: z.array(z.string()).optional(),
  commissionDecisionReason: z.string().optional()
}
.refine(
  (data) => data.promotionType === 'Education' || data.proposedCadre,
  {
    message: "Proposed cadre required for Experience-based promotions",
    path: ["proposedCadre"]
  }
)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "status": "Pending HRMO/HHRMD Review",
    "reviewStage": "initial",
    // ... full promotion request object
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Missing required field: employeeId"
}
```

**Error Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Employee with status 'Retired' cannot submit promotion request"
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Employee not found"
}
```

**Side Effects:**
1. Creates promotion request record
2. Sets initial status and review stage
3. Sends notifications to HHRMD and DO roles
4. Creates audit trail entry

**Notification Triggered:**
```json
{
  "roles": ["HHRMD", "DO"],
  "message": "New promotion request submitted by John Doe Mwalimu (uuid). Requires your review.",
  "link": "/dashboard/promotion"
}
```

---

#### 1.4.3 Update Promotion Request

**Endpoint:** `PATCH /api/promotions/{id}`

**Path Parameters:**
- `id`: Promotion request UUID

**Request Body:**
```json
{
  "status": "Approved by Commission",
  "reviewStage": "approved",
  "reviewedById": "uuid-v4",
  "rejectionReason": null,
  "commissionDecisionReason": "Excellent performance over 5 years"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // Updated promotion request
  }
}
```

**Side Effects:**
- If `status === "Approved by Commission"`:
  - Updates `Employee.cadre` to `request.proposedCadre`
  - Logs cadre change in audit trail

**Business Logic:**
```typescript
if (status === "Approved by Commission") {
  await db.Employee.update({
    where: { id: employeeId },
    data: { cadre: proposedCadre }
  })
}
```

---

### 1.5 Complaint Management APIs

#### 1.5.1 Submit Complaint

**Endpoint:** `POST /api/complaints`

**Request Body:**
```json
{
  "complaintType": "Harassment | Discrimination | Unfair Treatment | Other",
  "subject": "Brief subject (min 5 chars)",
  "complaintText": "Detailed complaint (min 20 chars)",
  "complainantPhoneNumber": "+255XXXXXXXXX",
  "nextOfKinPhoneNumber": "+255XXXXXXXXX",
  "attachments": [
    "documents/timestamp_random_evidence1.pdf",
    "documents/timestamp_random_evidence2.jpg"
  ],
  "complainantId": "uuid-v4",
  "assignedOfficerRole": "DO"
}
```

**Validation Schema:**
```typescript
{
  complaintType: z.string().min(1),
  subject: z.string().min(5),
  complaintText: z.string().min(20),
  complainantPhoneNumber: z.string(),
  nextOfKinPhoneNumber: z.string(),
  attachments: z.array(z.string()).optional(),
  complainantId: z.string().min(1),
  assignedOfficerRole: z.string().optional()
}
```

**Success Response (201 Created):**
```json
{
  "id": "uuid-v4",
  "complaintType": "Harassment",
  "subject": "Workplace harassment complaint",
  "details": "Detailed complaint text...",
  "status": "Submitted",
  "reviewStage": "initial",
  "assignedOfficerRole": "DO",
  "createdAt": "2025-12-25T10:00:00.000Z",
  "updatedAt": "2025-12-25T10:00:00.000Z"
}
```

**Side Effects:**
1. Creates complaint record
2. Sends notifications to DO and HHRMD
3. Sets status to "Submitted"

---

#### 1.5.2 Get Complaints

**Endpoint:** `GET /api/complaints`

**Query Parameters:**
```
?userId={uuid}
&userRole={role}
```

**RBAC Logic:**
```
If userRole === 'EMP':
  - Return only complaints where complainantId = userId

If userRole === 'DO' || userRole === 'HHRMD':
  - Return all complaints assigned to DO or HHRMD

Else (Admin/CSCS):
  - Return all complaints
```

**Success Response (200 OK):**
```json
[
  {
    "id": "uuid-v4",
    "employeeId": "uuid-v4",
    "employeeName": "John Doe",
    "zanId": "Z123456789",
    "department": "HR",
    "complaintType": "Harassment",
    "subject": "Workplace harassment",
    "details": "Detailed complaint...",
    "submissionDate": "2025-12-25T10:00:00.000Z",
    "status": "Under Review",
    "attachments": ["file1.pdf", "file2.jpg"],
    "officerComments": "Under investigation",
    "assignedOfficerRole": "DO",
    "reviewStage": "investigating"
  }
]
```

---

#### 1.5.3 Update Complaint

**Endpoint:** `PATCH /api/complaints/{id}`

**Request Body:**
```json
{
  "status": "Resolved | Under Review | Rejected",
  "reviewStage": "investigating | resolved | rejected",
  "officerComments": "Comments from reviewing officer",
  "internalNotes": "Internal notes (not visible to complainant)",
  "rejectionReason": "Reason if rejected",
  "reviewedById": "uuid-v4"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // Updated complaint
  }
}
```

---

### 1.6 File Management APIs

#### 1.6.1 Upload File

**Endpoint:** `POST /api/files/upload`

**Request Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request Body:** (FormData)
```
file: <binary-file-data>
```

**File Validation:**
- Max size: 2MB for documents, 1MB for images
- Allowed types:
  - Documents: `application/pdf`, `image/jpeg`, `image/png`
  - Images: `image/jpeg`, `image/png`, `image/jpg`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "objectKey": "documents/1703520123456_x7k9m2_employee_certificate.pdf",
    "url": "https://csms.zanzibar.go.tz/api/files/download/documents/1703520123456_x7k9m2_employee_certificate.pdf",
    "etag": "d41d8cd98f00b204e9800998ecf8427e",
    "bucketName": "documents"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "File size exceeds maximum allowed (2MB)"
}
```

**Error Response (415 Unsupported Media Type):**
```json
{
  "success": false,
  "message": "File type not allowed. Supported: PDF, JPEG, PNG"
}
```

**Implementation Flow:**
```
1. Validate file type and size
2. Generate unique object key:
   - folder/timestamp_randomSuffix_sanitizedFilename
3. Ensure MinIO bucket exists
4. Upload to MinIO with metadata:
   - Content-Type
   - Upload-Date
5. Generate presigned URL (24-hour expiry)
6. Return object key and URL
```

---

#### 1.6.2 Download File

**Endpoint:** `GET /api/files/download/{...objectKey}`

**Path Parameters:**
- `objectKey`: Full object path (e.g., `documents/timestamp_random_file.pdf`)

**Response Headers:**
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="file.pdf"
```

**Response Body:** Binary file stream

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "message": "File not found"
}
```

---

#### 1.6.3 Preview File

**Endpoint:** `GET /api/files/preview/{...objectKey}`

**Description:** Same as download but with `inline` disposition for browser preview.

**Response Headers:**
```http
Content-Type: application/pdf
Content-Disposition: inline; filename="file.pdf"
```

---

#### 1.6.4 Check File Exists

**Endpoint:** `GET /api/files/exists/{...objectKey}`

**Success Response (200 OK):**
```json
{
  "exists": true,
  "metadata": {
    "size": 245678,
    "contentType": "application/pdf",
    "lastModified": "2025-12-25T10:00:00.000Z"
  }
}
```

**Not Found Response (200 OK):**
```json
{
  "exists": false
}
```

---

### 1.7 HRIMS Integration APIs

#### 1.7.1 Sync Employee from HRIMS

**Endpoint:** `POST /api/hrims/sync-employee`

**Description:** Fetch and sync employee data from external HRIMS system.

**Request Body:**
```json
{
  "zanId": "Z123456789",
  "payrollNumber": "PAY001234",
  "institutionVoteNumber": "VOTE123",
  "syncDocuments": false,
  "hrimsApiUrl": "https://hrims-api.example.com",
  "hrimsApiKey": "api-key-here"
}
```

**Validation:**
- Either `zanId` OR `payrollNumber` must be provided
- `institutionVoteNumber` is required

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "employeeId": "uuid-v4",
    "zanId": "Z123456789",
    "name": "John Doe Mwalimu",
    "institutionId": "uuid-v4",
    "documentsCount": 3,
    "certificatesCount": 5,
    "documentsStatus": "syncing",
    "certificatesStatus": "syncing"
  },
  "message": "Employee data synced successfully from HRIMS"
}
```

**HRIMS API Call:**
```http
GET https://hrims-api.example.com/api/employee/search?zanId=Z123456789&institutionVoteNumber=VOTE123
Authorization: Bearer {hrimsApiKey}
X-API-Key: {hrimsApiKey}
```

**HRIMS Response Schema:**
```json
{
  "success": true,
  "message": "Employee found successfully",
  "data": {
    "Employee": {
      "zanId": "Z123456789",
      "name": "John Doe Mwalimu",
      "gender": "Male",
      "dateOfBirth": "1990-05-15",
      "photo": {
        "contentType": "image/jpeg",
        "content": "base64-encoded-image-data",
        "lastUpdated": "2025-08-15"
      },
      "cadre": "Administrative Officer",
      "ministry": "Ministry of Health",
      "status": "Active",
      "institutionVoteNumber": "VOTE123",
      "documentStats": {
        "totalDocuments": 3,
        "totalCertificates": 5
      }
    }
  }
}
```

**Flow:**
```
1. Validate request parameters
2. Find institution by vote number
3. Call HRIMS API to fetch employee
4. Validate HRIMS response
5. Upsert employee in database:
   - If exists (by zanId): UPDATE
   - If not exists: CREATE
6. Trigger background sync for documents (if totalDocuments > 0)
7. Trigger background sync for certificates (if totalCertificates > 0)
8. Return immediate response with sync status
```

**Background Sync:**
- Documents and certificates sync asynchronously
- No blocking wait for completion
- Status returned as "syncing" or "completed"

---

#### 1.7.2 Sync Documents

**Endpoint:** `POST /api/hrims/sync-documents`

**Request Body:**
```json
{
  "zanId": "Z123456789",
  "institutionVoteNumber": "VOTE123",
  "hrimsApiUrl": "https://hrims-api.example.com",
  "hrimsApiKey": "api-key-here"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "employeeId": "uuid-v4",
    "documentsSynced": 3,
    "documents": [
      {
        "type": "ardhilHali",
        "url": "documents/timestamp_random_ardhilhali.pdf"
      },
      {
        "type": "confirmationLetter",
        "url": "documents/timestamp_random_confirmation.pdf"
      },
      {
        "type": "jobContract",
        "url": "documents/timestamp_random_contract.pdf"
      }
    ]
  }
}
```

---

#### 1.7.3 Sync Certificates

**Endpoint:** `POST /api/hrims/sync-certificates`

**Request Body:**
```json
{
  "zanId": "Z123456789",
  "institutionVoteNumber": "VOTE123",
  "hrimsApiUrl": "https://hrims-api.example.com",
  "hrimsApiKey": "api-key-here"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "employeeId": "uuid-v4",
    "certificatesSynced": 5,
    "certificates": [
      {
        "id": "uuid-v4",
        "type": "Education",
        "name": "Bachelor of Science",
        "url": "certificates/timestamp_random_bsc.pdf"
      }
    ]
  }
}
```

---

#### 1.7.4 Bulk Fetch by Institution

**Endpoint:** `POST /api/hrims/fetch-by-institution`

**Description:** Fetch multiple employees from an institution.

**Request Body:**
```json
{
  "institutionVoteNumber": "VOTE123",
  "hrimsApiUrl": "https://hrims-api.example.com",
  "hrimsApiKey": "api-key-here",
  "includeDocuments": false,
  "includeCertificates": false
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 150,
    "syncedEmployees": 150,
    "failedEmployees": 0,
    "institutionId": "uuid-v4"
  }
}
```

---

### 1.8 User Management APIs

#### 1.8.1 Get Users

**Endpoint:** `GET /api/users`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "John Doe",
      "username": "jdoe",
      "role": "HRO",
      "active": true,
      "employeeId": "uuid-v4",
      "institutionId": "uuid-v4",
      "institution": {
        "id": "uuid-v4",
        "name": "Institution Name"
      },
      "phoneNumber": "+255777123456",
      "email": "jdoe@example.com",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-12-25T10:00:00.000Z"
    }
  ]
}
```

---

#### 1.8.2 Create User

**Endpoint:** `POST /api/users`

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "jdoe",
  "password": "SecurePassword123!",
  "role": "HRO",
  "active": true,
  "employeeId": "uuid-v4",
  "institutionId": "uuid-v4",
  "phoneNumber": "+255777123456",
  "email": "jdoe@example.com"
}
```

**Validation:**
- Username must be unique
- Password: min 8 chars, uppercase, lowercase, number
- Role must be valid enum
- Institution must exist

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "name": "John Doe",
    "username": "jdoe",
    "role": "HRO",
    // ... (password excluded)
  }
}
```

---

#### 1.8.3 Update User

**Endpoint:** `PATCH /api/users/{id}`

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "active": false,
  "role": "HRMO"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // Updated user
  }
}
```

---

#### 1.8.4 Delete User

**Endpoint:** `DELETE /api/users/{id}`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 1.9 Institution Management APIs

#### 1.9.1 Get Institutions

**Endpoint:** `GET /api/institutions`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "name": "TUME YA UTUMISHI SERIKALINI",
      "email": "info@tume.go.tz",
      "phoneNumber": "+255777123456",
      "voteNumber": "VOTE001",
      "tinNumber": "TIN123456789"
    }
  ]
}
```

---

#### 1.9.2 Create Institution

**Endpoint:** `POST /api/institutions`

**Request Body:**
```json
{
  "name": "Institution Name",
  "email": "info@institution.go.tz",
  "phoneNumber": "+255777123456",
  "voteNumber": "VOTE123",
  "tinNumber": "TIN123456789"
}
```

**Validation:**
- Name must be unique
- TIN must be unique
- Vote number format validation

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "name": "Institution Name",
    // ...
  }
}
```

---

### 1.10 Notification APIs

#### 1.10.1 Get Notifications

**Endpoint:** `GET /api/notifications`

**Query Parameters:**
```
?userId={uuid}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "message": "New promotion request submitted by John Doe...",
      "link": "/dashboard/promotion",
      "isRead": false,
      "userId": "uuid-v4",
      "createdAt": "2025-12-25T10:00:00.000Z"
    }
  ]
}
```

---

#### 1.10.2 Mark Notifications as Read

**Endpoint:** `POST /api/notifications`

**Request Body:**
```json
{
  "notificationIds": ["uuid-v4", "uuid-v4", "uuid-v4"]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notifications marked as read"
}
```

---

### 1.11 Dashboard & Reporting APIs

#### 1.11.1 Get Dashboard Metrics

**Endpoint:** `GET /api/dashboard/metrics`

**Query Parameters:**
```
?userRole={role}
&userInstitutionId={uuid}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 50000,
    "activeRequests": 245,
    "pendingApprovals": 45,
    "completedThisMonth": 120,
    "requestsByType": {
      "promotion": 80,
      "confirmation": 50,
      "lwop": 30,
      "retirement": 20,
      "others": 65
    },
    "requestsByStatus": {
      "pending": 150,
      "approved": 70,
      "rejected": 25
    },
    "recentActivities": [
      {
        "type": "promotion",
        "action": "submitted",
        "employeeName": "John Doe",
        "timestamp": "2025-12-25T10:00:00.000Z"
      }
    ]
  }
}
```

---

#### 1.11.2 Generate Report

**Endpoint:** `GET /api/reports`

**Query Parameters:**
```
?type={report-type}
&startDate={ISO-date}
&endDate={ISO-date}
&institutionId={uuid}
&format={pdf|excel|json}
```

**Report Types:**
- `employee-list`: List of employees
- `requests-summary`: Summary of all requests
- `promotions`: Promotion requests report
- `confirmations`: Confirmation requests report
- `complaints`: Complaints report

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reportType": "promotions",
    "generatedAt": "2025-12-25T10:00:00.000Z",
    "parameters": {
      "startDate": "2025-01-01",
      "endDate": "2025-12-31"
    },
    "results": [
      // Report data
    ],
    "downloadUrl": "/api/reports/download/uuid-v4.pdf"
  }
}
```

---

## 2. Integration Points

### 2.1 External Integration Overview

```
┌──────────────────────────────────────────────────────────┐
│                    CSMS SYSTEM                           │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │         Application Layer                      │    │
│  └────────────────────────────────────────────────┘    │
│           │              │              │               │
│           ↓              ↓              ↓               │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐          │
│  │   HRIMS     │  │   SMTP   │  │ Google   │          │
│  │ Integration │  │  Server  │  │ Genkit   │          │
│  └─────────────┘  └──────────┘  └──────────┘          │
└──────────────────────────────────────────────────────────┘
         │                 │              │
         ↓                 ↓              ↓
┌─────────────────┐  ┌──────────┐  ┌──────────┐
│ External HRIMS  │  │  Gmail   │  │ Google   │
│   REST API      │  │  SMTP    │  │  Gemini  │
│                 │  │  Server  │  │   API    │
└─────────────────┘  └──────────┘  └──────────┘
```

---

### 2.2 HRIMS Integration

**Integration Type:** REST API (HTTP/HTTPS)
**Direction:** Bidirectional (primarily CSMS → HRIMS)
**Authentication:** OAuth 2.0 / API Key
**Data Format:** JSON
**Protocol:** HTTPS (TLS 1.2+)

#### 2.2.1 HRIMS Endpoints (External System)

**Base URL:** `https://hrims-api.example.com`

**Authentication:**
```http
Authorization: Bearer {api-key}
X-API-Key: {api-key}
```

**Endpoint: Search Employee**
```http
GET /api/employee/search?zanId={zanId}&institutionVoteNumber={voteNumber}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee found successfully",
  "data": {
    "Employee": {
      "zanId": "string",
      "payrollNumber": "string",
      "name": "string",
      "gender": "string",
      "dateOfBirth": "ISO-8601",
      "photo": {
        "contentType": "image/jpeg",
        "content": "base64-string",
        "lastUpdated": "ISO-8601"
      },
      "cadre": "string",
      "salaryScale": "string",
      "ministry": "string",
      "department": "string",
      "status": "string",
      "employmentDate": "ISO-8601",
      "confirmationDate": "ISO-8601",
      "retirementDate": "ISO-8601",
      "institutionVoteNumber": "string",
      "documentStats": {
        "totalDocuments": number,
        "totalCertificates": number
      }
    }
  }
}
```

---

**Endpoint: Fetch Documents**
```http
GET /api/employee/documents?zanId={zanId}&institutionVoteNumber={voteNumber}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "type": "ardhilHali | confirmationLetter | jobContract | birthCertificate",
        "contentType": "application/pdf",
        "content": "base64-encoded-pdf",
        "filename": "original-filename.pdf",
        "lastUpdated": "ISO-8601"
      }
    ]
  }
}
```

---

**Endpoint: Fetch Certificates**
```http
GET /api/employee/certificates?zanId={zanId}&institutionVoteNumber={voteNumber}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "certificates": [
      {
        "type": "Education | Training | Professional",
        "name": "Certificate name",
        "contentType": "application/pdf",
        "content": "base64-encoded-pdf",
        "filename": "original-filename.pdf",
        "issueDate": "ISO-8601"
      }
    ]
  }
}
```

---

#### 2.2.2 HRIMS Integration Configuration

**Environment Variables:**
```bash
HRIMS_API_URL=https://hrims-api.example.com
HRIMS_API_KEY=your-api-key-here
HRIMS_MOCK_MODE=false  # Set to true for development/testing
```

**Timeout Settings:**
- Connection timeout: 30 seconds
- Read timeout: 60 seconds

**Retry Logic:**
- Max retries: 3
- Backoff strategy: Exponential (1s, 2s, 4s)
- Retry on: 408, 500, 502, 503, 504

**Circuit Breaker:**
- Failure threshold: 5 consecutive failures
- Reset timeout: 60 seconds
- Half-open state: Allow 1 request

---

#### 2.2.3 Data Mapping (HRIMS ↔ CSMS)

| HRIMS Field | CSMS Field | Transformation |
|-------------|------------|----------------|
| `zanId` | `Employee.zanId` | Direct mapping |
| `fullName` | `Employee.name` | Direct mapping |
| `gender` | `Employee.gender` | Direct mapping |
| `dateOfBirth` | `Employee.dateOfBirth` | Parse ISO-8601 to Date |
| `photo.content` | `Employee.profileImageUrl` | `data:image/jpeg;base64,{content}` |
| `cadre` | `Employee.cadre` | Direct mapping |
| `salaryScale` | `Employee.salaryScale` | Direct mapping |
| `ministry` | `Employee.ministry` | Direct mapping |
| `status` | `Employee.status` | Direct mapping |
| `employmentDate` | `Employee.employmentDate` | Parse ISO-8601 to Date |
| `institutionVoteNumber` | `Institution.voteNumber` | Lookup institution |

---

### 2.3 Email Integration (SMTP)

**Integration Type:** SMTP (Simple Mail Transfer Protocol)
**Direction:** Outbound only (CSMS → Email Server → Recipients)
**Authentication:** SMTP AUTH
**Protocol:** SMTP with STARTTLS

#### 2.3.1 SMTP Configuration

**Environment Variables:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@csms.go.tz
SMTP_PASSWORD=your-app-password
SMTP_FROM=CSMS <noreply@csms.go.tz>
```

**NodeMailer Configuration:**
```typescript
{
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,  // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false  // For self-signed certs (dev only)
  }
}
```

---

#### 2.3.2 Email Templates

**Template: Request Submission Notification**
```
Subject: New {RequestType} Request - {EmployeeName}

Dear {ReviewerName},

A new {requestType} request has been submitted and requires your review.

Employee Details:
- Name: {employeeName}
- ZanID: {zanId}
- Institution: {institutionName}
- Request ID: {requestId}

Please log in to the CSMS to review this request:
https://csms.zanzibar.go.tz/dashboard/{requestType}

Best regards,
Civil Service Management System
```

**Template: Request Approved**
```
Subject: Your {RequestType} Request has been Approved

Dear {EmployeeName},

Congratulations! Your {requestType} request (ID: {requestId}) has been approved.

Details:
- Submitted: {submissionDate}
- Approved: {approvalDate}
- Approved By: {approverName}

You can view the full details here:
https://csms.zanzibar.go.tz/dashboard/{requestType}

Best regards,
Civil Service Commission
```

**Template: Password Reset OTP**
```
Subject: Password Reset - CSMS

Dear {userName},

You have requested to reset your password. Your One-Time Password (OTP) is:

{otpCode}

This OTP will expire in 60 minutes.

If you did not request this, please ignore this email.

Best regards,
CSMS Security Team
```

---

#### 2.3.3 Email Use Cases

| Trigger | Recipients | Template |
|---------|-----------|----------|
| User Registration | New user | Welcome email with credentials |
| Password Reset Request | User | OTP email |
| Request Submission | Reviewers (by role) | Request notification |
| Request Approved | Submitter | Approval notification |
| Request Rejected | Submitter | Rejection with reason |
| Complaint Submitted | DO, HHRMD | Complaint notification |
| Complaint Resolved | Complainant | Resolution notification |

---

### 2.4 AI Integration (Google Genkit)

**Integration Type:** REST API (via Genkit SDK)
**Direction:** CSMS → Genkit → Google Gemini API
**Authentication:** API Key
**Protocol:** HTTPS

#### 2.4.1 Genkit Configuration

**Environment Variables:**
```bash
GOOGLE_API_KEY=your-google-api-key
```

**Genkit Setup:**
```typescript
import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';

export const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Flash,
});
```

---

#### 2.4.2 Complaint Rewriting Flow

**Endpoint (Internal):** Genkit flow, called via server action

**Input:**
```typescript
{
  complaintText: string  // Original complaint text
}
```

**Prompt:**
```
You are an expert in standardizing employee complaints for the civil service commission.

You will receive the original complaint text and rewrite it to conform to the commission's standards, ensuring clarity and compliance, without altering the facts.

Original Complaint: {complaintText}
```

**Output:**
```typescript
{
  rewrittenComplaint: string  // Improved, standardized complaint text
}
```

**AI Model:** Google Gemini 1.5 Flash

**Processing:**
1. Analyze original text
2. Improve grammar and clarity
3. Maintain formal, professional tone
4. Remove inappropriate language
5. Preserve all factual information
6. Return rewritten complaint

---

#### 2.4.3 API Call Flow

```
User writes complaint
       ↓
Click "Improve with AI"
       ↓
Frontend calls: /api/ai/rewrite-complaint
       ↓
Server action: standardizeComplaintFormatting(input)
       ↓
Genkit flow: standardizeComplaintFormattingFlow
       ↓
Genkit prompt: standardizeComplaintFormattingPrompt
       ↓
Google Gemini API call
       ↓
AI processes and returns rewritten text
       ↓
Return to user
       ↓
User reviews and accepts/rejects
```

---

### 2.5 File Storage Integration (MinIO)

**Integration Type:** S3-Compatible Object Storage API
**Direction:** Bidirectional
**Authentication:** Access Key + Secret Key
**Protocol:** HTTP (internal), HTTPS (presigned URLs)

#### 2.5.1 MinIO Configuration

**Environment Variables:**
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=documents
```

**MinIO Client:**
```typescript
import { Client as MinioClient } from 'minio';

const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});
```

---

#### 2.5.2 MinIO Operations

**Upload Object:**
```typescript
await minioClient.putObject(
  bucketName,
  objectKey,
  fileBuffer,
  fileSize,
  {
    'Content-Type': contentType,
    'Upload-Date': new Date().toISOString()
  }
);
```

**Download Object:**
```typescript
const stream = await minioClient.getObject(bucketName, objectKey);
```

**Get Object Metadata:**
```typescript
const stat = await minioClient.statObject(bucketName, objectKey);
// Returns: { size, contentType, lastModified, etag }
```

**Generate Presigned URL:**
```typescript
const url = await minioClient.presignedGetObject(
  bucketName,
  objectKey,
  24 * 60 * 60  // 24 hours
);
```

**Delete Object:**
```typescript
await minioClient.removeObject(bucketName, objectKey);
```

**List Objects:**
```typescript
const stream = minioClient.listObjects(bucketName, prefix, recursive);
stream.on('data', (obj) => console.log(obj));
```

---

#### 2.5.3 Bucket Structure

```
documents/
  ├── ardhilhali/
  │   └── timestamp_random_filename.pdf
  ├── confirmation-letters/
  │   └── timestamp_random_filename.pdf
  ├── contracts/
  │   └── timestamp_random_filename.pdf
  ├── birth-certificates/
  │   └── timestamp_random_filename.pdf
  ├── request-attachments/
  │   └── timestamp_random_filename.pdf
  └── complaint-attachments/
      └── timestamp_random_filename.pdf

certificates/
  └── timestamp_random_filename.pdf

employee-photos/
  └── timestamp_random_filename.jpg

reports/
  └── timestamp_random_report.pdf
```

---

## 3. Data Formats

### 3.1 Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": <any>,
  "message": "Optional success message"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

---

### 3.2 Date/Time Format

**Standard:** ISO 8601
**Format:** `YYYY-MM-DDTHH:mm:ss.sssZ`
**Timezone:** UTC

**Examples:**
```
2025-12-25T10:30:00.000Z  // Full datetime
2025-12-25                // Date only (converted to 00:00:00 UTC)
```

**JavaScript Serialization:**
```typescript
const date = new Date();
date.toISOString();  // "2025-12-25T10:30:00.000Z"
```

**Database Storage:** PostgreSQL `TIMESTAMP WITH TIME ZONE`

---

### 3.3 UUID Format

**Standard:** UUID v4 (RFC 4122)
**Format:** `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
**Generation:** `uuid` npm package

**Example:** `550e8400-e29b-41d4-a716-446655440000`

**Usage:**
- All primary keys (id fields)
- Request IDs
- Employee IDs
- User IDs
- Institution IDs

---

### 3.4 Enum Values

#### 3.4.1 User Roles

```typescript
type Role =
  | 'HRO'      // HR Officer
  | 'HHRMD'    // Head of HR Management Division
  | 'HRMO'     // HR Management Officer
  | 'DO'       // Director's Office
  | 'CSCS'     // Commission Secretary
  | 'EMP'      // Employee
  | 'PO'       // Personnel Officer
  | 'HRRP'     // HR Research & Planning
  | 'ADMIN'    // System Administrator
```

---

#### 3.4.2 Request Statuses

```typescript
type RequestStatus =
  | 'Pending HRMO/HHRMD Review'
  | 'Pending DO Review'
  | 'Pending Commission'
  | 'Approved by Commission'
  | 'Rejected by HRMO'
  | 'Rejected by HHRMD'
  | 'Rejected by DO'
  | 'Rejected by Commission'
```

---

#### 3.4.3 Review Stages

```typescript
type ReviewStage =
  | 'initial'        // Initial submission
  | 'hrmo_review'    // Under HRMO review
  | 'hrmd_approved'  // Approved by HHRMD
  | 'do_approved'    // Approved by DO
  | 'approved'       // Final approval (Commission)
  | 'rejected'       // Rejected
```

---

#### 3.4.4 Promotion Types

```typescript
type PromotionType =
  | 'Experience'   // Experience-based promotion
  | 'Education'    // Education-based promotion
```

---

#### 3.4.5 Complaint Types

```typescript
type ComplaintType =
  | 'Harassment'
  | 'Discrimination'
  | 'Unfair Treatment'
  | 'Other'
```

---

#### 3.4.6 Employee Status

```typescript
type EmployeeStatus =
  | 'Active'
  | 'Probation'
  | 'Confirmed'
  | 'On Leave'
  | 'Suspended'
  | 'Retired'
  | 'Terminated'
  | 'Resigned'
```

---

### 3.5 File Formats

#### 3.5.1 Supported File Types

**Documents:**
- `application/pdf` - PDF documents
- `image/jpeg` - JPEG images
- `image/png` - PNG images
- `image/jpg` - JPG images

**Size Limits:**
- Documents: 2 MB
- Images: 1 MB

**Validation:**
```typescript
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;  // 2MB
const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
```

---

#### 3.5.2 Base64 Encoding (HRIMS Integration)

**Format:**
```
data:{contentType};base64,{base64-encoded-data}
```

**Example:**
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...
```

**Encoding:**
```typescript
const base64 = Buffer.from(binaryData).toString('base64');
```

**Decoding:**
```typescript
const binaryData = Buffer.from(base64String, 'base64');
```

---

### 3.6 Pagination Format

**Request:**
```
GET /api/resources?page=2&size=50
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "size": 50,
    "total": 1500,
    "totalPages": 30,
    "hasNext": true,
    "hasPrevious": true
  }
}
```

---

## 4. Protocol Specifications

### 4.1 HTTP/HTTPS Protocol

**Version:** HTTP/1.1, HTTP/2
**TLS Version:** TLS 1.2, TLS 1.3
**Cipher Suites:** Strong ciphers only (AES-256-GCM)

**Required Headers:**
```http
Content-Type: application/json
Accept: application/json
User-Agent: CSMS-Client/1.0
```

**Optional Headers:**
```http
X-Request-ID: {uuid}          // Request tracking
X-Correlation-ID: {uuid}      // Correlation across services
```

---

### 4.2 JWT Token Specification

**Algorithm:** HS256 (HMAC with SHA-256)
**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "userId": "uuid-v4",
  "username": "admin",
  "role": "ADMIN",
  "institutionId": "uuid-v4",
  "iat": 1703520123,  // Issued at (Unix timestamp)
  "exp": 1703520723   // Expires at (Unix timestamp)
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

**Token Format:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1dWlkLXY0IiwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTcwMzUyMDEyMywiZXhwIjoxNzAzNTIwNzIzfQ.signature
```

**Token Transmission:**
```http
Authorization: Bearer {token}
```

**Token Expiry:**
- Access Token: 10 minutes (600 seconds)
- Refresh Token: 7 days (604800 seconds)

---

### 4.3 CORS Configuration

**Allowed Origins:**
```
https://csms.zanzibar.go.tz
http://localhost:9002  // Development only
```

**Allowed Methods:**
```
GET, POST, PATCH, PUT, DELETE, OPTIONS
```

**Allowed Headers:**
```
Content-Type, Authorization, X-Request-ID
```

**Exposed Headers:**
```
X-Total-Count, X-Request-ID
```

**Credentials:**
```
Access-Control-Allow-Credentials: true
```

**Next.js Configuration:**
```typescript
// next.config.ts
{
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://csms.zanzibar.go.tz' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' }
        ]
      }
    ]
  }
}
```

---

### 4.4 Rate Limiting

**Configuration:**
```
- Per IP: 100 requests per minute
- Per User (authenticated): 1000 requests per hour
- File Upload: 10 requests per minute
- HRIMS Sync: 50 requests per minute
```

**Response Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703520723
```

**Rate Limit Exceeded Response (429):**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

---

### 4.5 WebSocket Protocol (Future)

**Purpose:** Real-time notifications

**URL:** `wss://csms.zanzibar.go.tz/ws`

**Authentication:**
```
ws://csms.zanzibar.go.tz/ws?token={jwt-token}
```

**Message Format:**
```json
{
  "type": "notification",
  "data": {
    "id": "uuid-v4",
    "message": "New request submitted",
    "link": "/dashboard/promotion"
  }
}
```

---

## 5. Error Handling

### 5.1 HTTP Status Codes

| Code | Name | Usage |
|------|------|-------|
| **200** | OK | Successful GET, PATCH, DELETE |
| **201** | Created | Successful POST (resource created) |
| **204** | No Content | Successful DELETE (no response body) |
| **400** | Bad Request | Invalid request parameters, validation errors |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Authenticated but insufficient permissions |
| **404** | Not Found | Resource not found |
| **409** | Conflict | Duplicate resource (e.g., username exists) |
| **415** | Unsupported Media Type | Invalid file type |
| **422** | Unprocessable Entity | Validation failed (business rules) |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server error |
| **502** | Bad Gateway | External service error (HRIMS) |
| **503** | Service Unavailable | Service temporarily unavailable |
| **504** | Gateway Timeout | External service timeout |

---

### 5.2 Error Response Format

**Standard Error:**
```json
{
  "success": false,
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "path": "/api/employees/123",
  "requestId": "uuid-v4"
}
```

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "employeeId",
      "message": "Employee ID is required"
    },
    {
      "field": "proposedCadre",
      "message": "Proposed cadre required for Experience-based promotions"
    }
  ]
}
```

---

### 5.3 Error Codes

**Authentication Errors (AUTH\_\*):**
```
AUTH_INVALID_CREDENTIALS    - Invalid username or password
AUTH_ACCOUNT_LOCKED         - Account locked after failed attempts
AUTH_TOKEN_EXPIRED          - JWT token expired
AUTH_TOKEN_INVALID          - JWT token invalid or malformed
AUTH_INSUFFICIENT_PERMISSIONS - User lacks required permissions
```

**Validation Errors (VAL\_\*):**
```
VAL_REQUIRED_FIELD          - Required field missing
VAL_INVALID_FORMAT          - Invalid data format
VAL_INVALID_ENUM            - Invalid enum value
VAL_FILE_TOO_LARGE          - File exceeds size limit
VAL_INVALID_FILE_TYPE       - File type not allowed
```

**Business Logic Errors (BUS\_\*):**
```
BUS_EMPLOYEE_STATUS_INVALID - Employee status invalid for operation
BUS_DUPLICATE_REQUEST       - Duplicate request exists
BUS_INVALID_STATE_TRANSITION - Invalid workflow state transition
BUS_INSTITUTION_MISMATCH    - User/employee institution mismatch
```

**External Integration Errors (EXT\_\*):**
```
EXT_HRIMS_UNAVAILABLE       - HRIMS service unavailable
EXT_HRIMS_TIMEOUT           - HRIMS request timeout
EXT_HRIMS_INVALID_RESPONSE  - Invalid HRIMS response
EXT_SMTP_FAILED             - Email sending failed
EXT_AI_UNAVAILABLE          - AI service unavailable
```

**System Errors (SYS\_\*):**
```
SYS_DATABASE_ERROR          - Database operation failed
SYS_FILE_STORAGE_ERROR      - File storage operation failed
SYS_INTERNAL_ERROR          - Internal server error
```

---

### 5.4 Error Handling Strategies

#### 5.4.1 Client-Side Error Handling

**Fetch with Error Handling:**
```typescript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  const data = await response.json();
  return data;

} catch (error) {
  if (error.name === 'TypeError') {
    // Network error
    showError('Network error. Please check your connection.');
  } else {
    // API error
    showError(error.message);
  }
}
```

**ApiClient Error Handling:**
```typescript
const response = await apiClient.createEmployee(data);

if (!response.success) {
  // Handle error
  toast.error(response.message);

  if (response.errors) {
    // Display validation errors
    response.errors.forEach(error => {
      setFieldError(error.field, error.message);
    });
  }
  return;
}

// Handle success
toast.success('Employee created successfully');
```

---

#### 5.4.2 Server-Side Error Handling

**API Route Pattern:**
```typescript
export async function POST(req: Request) {
  try {
    // 1. Parse and validate request
    const body = await req.json();
    const validated = schema.parse(body);

    // 2. Business logic
    const result = await performOperation(validated);

    // 3. Success response
    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });

  } catch (error) {
    console.error('[API_ERROR]', error);

    // Validation error (Zod)
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }, { status: 400 });
    }

    // Business logic error
    if (error instanceof BusinessError) {
      return NextResponse.json({
        success: false,
        message: error.message,
        code: error.code
      }, { status: error.statusCode });
    }

    // Database error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        return NextResponse.json({
          success: false,
          message: 'Resource already exists',
          code: 'BUS_DUPLICATE_REQUEST'
        }, { status: 409 });
      }
    }

    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      code: 'SYS_INTERNAL_ERROR'
    }, { status: 500 });
  }
}
```

---

#### 5.4.3 External Integration Error Handling

**HRIMS Integration:**
```typescript
try {
  const response = await fetch(hrimsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(30000)  // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`HRIMS API error: ${response.status}`);
  }

  const data = await response.json();
  return data;

} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout
    console.error('HRIMS request timeout');
    return {
      success: false,
      message: 'HRIMS service timeout',
      code: 'EXT_HRIMS_TIMEOUT'
    };
  }

  // HRIMS unavailable
  console.error('HRIMS service unavailable:', error);

  // Fallback to mock data in development
  if (process.env.HRIMS_MOCK_MODE === 'true') {
    return getMockData();
  }

  return {
    success: false,
    message: 'HRIMS service unavailable',
    code: 'EXT_HRIMS_UNAVAILABLE'
  };
}
```

---

#### 5.4.4 File Upload Error Handling

```typescript
// Size validation
if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json({
    success: false,
    message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
    code: 'VAL_FILE_TOO_LARGE'
  }, { status: 400 });
}

// Type validation
if (!ALLOWED_FILE_TYPES.includes(file.type)) {
  return NextResponse.json({
    success: false,
    message: 'File type not allowed. Supported: PDF, JPEG, PNG',
    code: 'VAL_INVALID_FILE_TYPE'
  }, { status: 415 });
}

// Upload error
try {
  const result = await uploadFile(file, objectKey, contentType);
  return NextResponse.json({
    success: true,
    data: result
  });
} catch (error) {
  console.error('File upload error:', error);
  return NextResponse.json({
    success: false,
    message: 'File upload failed',
    code: 'SYS_FILE_STORAGE_ERROR'
  }, { status: 500 });
}
```

---

### 5.5 Logging and Monitoring

**Log Levels:**
```
ERROR   - System errors, exceptions
WARN    - Business rule violations, deprecated features
INFO    - Normal operations, successful requests
DEBUG   - Detailed debugging information
```

**Log Format:**
```typescript
{
  timestamp: "2025-12-25T10:30:00.000Z",
  level: "ERROR",
  message: "Database connection failed",
  context: {
    requestId: "uuid-v4",
    userId: "uuid-v4",
    endpoint: "/api/employees",
    method: "POST"
  },
  error: {
    name: "PrismaClientKnownRequestError",
    message: "Connection pool timeout",
    stack: "..."
  }
}
```

**Error Tracking:**
- All 5xx errors logged with full stack trace
- All 4xx errors logged with request context
- External integration failures logged separately
- Error aggregation and alerting (future: Sentry)

---

## 6. Interface Security

### 6.1 Authentication Security

**JWT Security:**
- Token signing: HS256 with strong secret (256-bit)
- Short expiry: 10 minutes (reduces token theft risk)
- Refresh token rotation: New refresh token on every refresh
- Token storage: HttpOnly cookies (XSS protection)

**Password Security:**
- Hashing: bcrypt with cost factor 10
- Password requirements: Min 8 chars, uppercase, lowercase, number
- Account lockout: 5 failed attempts, 15-minute lockout
- Password history: Prevent reuse of last 3 passwords

---

### 6.2 API Security

**Input Validation:**
- All inputs validated with Zod schemas
- SQL injection prevention: Prisma ORM (parameterized queries)
- XSS prevention: React auto-escaping + CSP headers
- CSRF protection: SameSite cookies

**Rate Limiting:**
- Global: 100 req/min per IP
- Authenticated: 1000 req/hour per user
- File upload: 10 req/min
- Login attempts: 5 req/15min

**Request Security:**
- All requests over HTTPS
- Strict transport security (HSTS)
- Certificate pinning (production)

---

### 6.3 Data Security

**Encryption:**
- In transit: TLS 1.2/1.3
- At rest: MinIO AES-256
- Passwords: bcrypt (cost 10)
- Sensitive fields: Application-level encryption (future)

**Access Control:**
- Role-based access control (RBAC)
- Institution-based data isolation
- Field-level permissions
- Audit trail for all data access

---

### 6.4 Integration Security

**HRIMS Integration:**
- OAuth 2.0 / API Key authentication
- HTTPS only
- Request signing (HMAC)
- IP whitelisting
- Circuit breaker pattern

**SMTP:**
- TLS encryption (STARTTLS)
- Application-specific passwords
- No plain-text credentials in code

**MinIO:**
- Access key + secret key authentication
- Presigned URLs (time-limited)
- Bucket policies (principle of least privilege)

---

## 7. Versioning Strategy

### 7.1 API Versioning

**Current Version:** v1 (implicit)

**Future Versioning:**
- URL-based versioning: `/api/v2/employees`
- Header-based versioning: `Accept: application/vnd.csms.v2+json`

**Backward Compatibility:**
- Additive changes (new fields): No version bump
- Breaking changes (remove/rename fields): New version
- Deprecation period: 6 months notice

---

### 7.2 Schema Versioning

**Database Schema:**
- Prisma migrations for version control
- Sequential migration files
- Rollback capability

**API Schema:**
- JSON Schema versioning
- OpenAPI/Swagger documentation (future)

---

## 8. Appendices

### Appendix A: Complete API Endpoint List

**Authentication:**
1. `POST /api/auth/login`
2. `POST /api/auth/employee-login`
3. `POST /api/auth/logout`
4. `POST /api/auth/refresh`
5. `POST /api/auth/change-password`

**Employees:**
6. `GET /api/employees`
7. `GET /api/employees/:id`
8. `POST /api/employees`
9. `PATCH /api/employees/:id`
10. `DELETE /api/employees/:id`
11. `GET /api/employees/search`
12. `GET /api/employees/:id/documents`
13. `GET /api/employees/:id/certificates`

**Requests (9 types × 4 operations = 36):**
14-17. Promotion: `GET/POST /api/promotions`, `GET/PATCH /api/promotions/:id`
18-21. Confirmation: `GET/POST /api/confirmations`, `GET/PATCH /api/confirmations/:id`
22-25. LWOP: `GET/POST /api/lwop`, `GET/PATCH /api/lwop/:id`
26-29. Cadre Change: `GET/POST /api/cadre-change`, `GET/PATCH /api/cadre-change/:id`
30-33. Retirement: `GET/POST /api/retirement`, `GET/PATCH /api/retirement/:id`
34-37. Resignation: `GET/POST /api/resignation`, `GET/PATCH /api/resignation/:id`
38-41. Termination: `GET/POST /api/termination`, `GET/PATCH /api/termination/:id`
42-45. Service Extension: `GET/POST /api/service-extension`, `GET/PATCH /api/service-extension/:id`

**Complaints:**
46. `GET /api/complaints`
47. `POST /api/complaints`
48. `PATCH /api/complaints/:id`

**Files:**
49. `POST /api/files/upload`
50. `GET /api/files/download/:objectKey`
51. `GET /api/files/preview/:objectKey`
52. `GET /api/files/exists/:objectKey`

**HRIMS Integration:**
53. `POST /api/hrims/sync-employee`
54. `POST /api/hrims/sync-documents`
55. `POST /api/hrims/sync-certificates`
56. `POST /api/hrims/fetch-by-institution`
57. `POST /api/hrims/bulk-fetch`

**Users:**
58. `GET /api/users`
59. `POST /api/users`
60. `PATCH /api/users/:id`
61. `DELETE /api/users/:id`

**Institutions:**
62. `GET /api/institutions`
63. `POST /api/institutions`
64. `PATCH /api/institutions/:id`
65. `DELETE /api/institutions/:id`

**Notifications:**
66. `GET /api/notifications`
67. `POST /api/notifications`

**Dashboard & Reports:**
68. `GET /api/dashboard/metrics`
69. `GET /api/reports`

**Total:** 69 endpoints

---

### Appendix B: Request/Response Examples

See individual endpoint specifications in Section 1.

---

### Appendix C: Integration Diagrams

See Section 2 for detailed integration architecture diagrams.

---

### Appendix D: Error Code Reference

See Section 5.3 for complete error code listing.

---

## Document Approval

**Prepared By:**
- Name: _______________________
- Title: Integration Architect
- Signature: _______________________
- Date: _______________________

**Reviewed By:**
- Name: _______________________
- Title: System Architect
- Signature: _______________________
- Date: _______________________

**Approved By:**
- Name: _______________________
- Title: IT Department Head
- Signature: _______________________
- Date: _______________________

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Dec 15, 2025 | Integration Team | Initial draft |
| 0.5 | Dec 20, 2025 | Integration Team | Added HRIMS integration |
| 1.0 | Dec 25, 2025 | Integration Team | Final version |

---

**END OF INTERFACE DESIGN DOCUMENT**

*This document is confidential and proprietary to the Civil Service Commission of Zanzibar.*

*For technical questions, contact: api-team@csms.go.tz*

*Version 1.0 | December 25, 2025*

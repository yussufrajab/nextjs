# LOW-LEVEL DESIGN DOCUMENT

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

**Version 1.0 | December 25, 2025**

---

## Document Control

| Item               | Details                                |
| ------------------ | -------------------------------------- |
| **Document Title** | Low-Level Design Document              |
| **Project Name**   | Civil Service Management System (CSMS) |
| **Version**        | 1.0                                    |
| **Date Prepared**  | December 25, 2025                      |
| **Prepared By**    | Development Team                       |
| **Reviewed By**    | Lead Developer, System Architect       |
| **Approved By**    | IT Department Head                     |
| **Status**         | Final                                  |

---

## Executive Summary

This Low-Level Design (LLD) document provides detailed technical specifications for the Civil Service Management System (CSMS). It covers module specifications, class diagrams, sequence diagrams, algorithm designs, and code structure to guide developers in implementing and maintaining the system.

**Key Coverage:**

- Detailed module and class specifications
- Sequence diagrams for critical workflows
- Algorithm designs for core functionalities
- Code structure and organization
- API contracts and data models
- Error handling and validation strategies

---

## Table of Contents

1. [Module Specifications](#1-module-specifications)
2. [Class Diagrams](#2-class-diagrams)
3. [Sequence Diagrams](#3-sequence-diagrams)
4. [Algorithm Designs](#4-algorithm-designs)
5. [Code Structure](#5-code-structure)
6. [API Specifications](#6-api-specifications)
7. [Data Models](#7-data-models)
8. [Error Handling](#8-error-handling)
9. [Appendices](#9-appendices)

---

## 1. Module Specifications

### 1.1 Authentication Module

**Location:** `/src/store/auth-store.ts`, `/src/app/api/auth/`

**Purpose:** Handle user authentication, session management, and token lifecycle.

#### 1.1.1 AuthStore Class

```typescript
class AuthStore {
  // State
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // Methods
  login(username: string, password: string): Promise<User | null>;
  logout(): Promise<void>;
  refreshAuthToken(): Promise<boolean>;
  initializeAuth(): void;
  updateTokenFromApiClient(newAccessToken: string): void;
  setUserManually(user: User): void;
}
```

**Responsibilities:**

- User credential validation
- JWT token management (access + refresh)
- Session persistence using Zustand + localStorage
- Automatic token refresh on 401 errors
- Role-based state management

**Key Algorithms:**

1. **Login Flow:**

   ```
   1. Validate credentials (username, password)
   2. Call API /auth/login
   3. Extract token, refreshToken, user data
   4. Store tokens in localStorage
   5. Update ApiClient with access token
   6. Set auth state (user, role, isAuthenticated)
   7. Return user object
   ```

2. **Token Refresh Algorithm:**

   ```
   1. Check if refreshToken exists
   2. If not, logout and return false
   3. Call API /auth/refresh with refreshToken
   4. If success:
      a. Extract newAccessToken, newRefreshToken
      b. Update API client
      c. Update localStorage
      d. Update store state
      e. Return true
   5. If fail:
      a. Logout user
      b. Return false
   ```

3. **State Rehydration:**
   ```
   1. On app load, restore state from localStorage
   2. Convert date strings back to Date objects
   3. Restore token to ApiClient
   4. Check for role mismatch (state.role vs user.role)
   5. Fix any inconsistencies
   6. Clear stale development data
   ```

**Dependencies:**

- `zustand` - State management
- `apiClient` - API communication
- `localStorage` - Persistence

---

### 1.2 API Client Module

**Location:** `/src/lib/api-client.ts`

**Purpose:** Centralized HTTP client for all backend API calls.

#### 1.2.1 ApiClient Class

```typescript
class ApiClient {
  // Properties
  private baseURL: string;
  private token: string | null;

  // Core Methods
  private request<T>(
    endpoint: string,
    options?: RequestInit,
    retryCount?: number
  ): Promise<ApiResponse<T>>;

  setToken(token: string): void;
  clearToken(): void;

  // Authentication APIs
  login(username: string, password: string): Promise<ApiResponse<any>>;
  logout(): Promise<ApiResponse<void>>;
  refreshToken(refreshToken: string): Promise<ApiResponse<any>>;

  // Employee APIs
  getEmployees(params?: object): Promise<ApiResponse<Employee[]>>;
  getEmployee(id: string): Promise<ApiResponse<Employee>>;
  createEmployee(employee: Partial<Employee>): Promise<ApiResponse<Employee>>;
  updateEmployee(
    id: string,
    employee: Partial<Employee>
  ): Promise<ApiResponse<Employee>>;
  deleteEmployee(id: string): Promise<ApiResponse<void>>;

  // Request APIs (Promotion, Confirmation, LWOP, etc.)
  getPromotionRequests(): Promise<ApiResponse<PromotionRequest[]>>;
  createPromotionRequest(
    data: Partial<PromotionRequest>
  ): Promise<ApiResponse<PromotionRequest>>;
  // ... similar methods for other request types

  // Complaint APIs
  getComplaints(): Promise<ApiResponse<Complaint[]>>;
  createComplaint(data: Partial<Complaint>): Promise<ApiResponse<Complaint>>;
  updateComplaint(
    id: string,
    data: Partial<Complaint>
  ): Promise<ApiResponse<Complaint>>;

  // Institution & User APIs
  getInstitutions(): Promise<ApiResponse<Institution[]>>;
  getUsers(): Promise<ApiResponse<User[]>>;

  // File Upload
  uploadFile(
    file: File,
    endpoint?: string
  ): Promise<ApiResponse<{ url: string }>>;

  // Notifications
  getNotifications(userId: string): Promise<ApiResponse<Notification[]>>;
  markNotificationsAsRead(
    notificationIds: string[]
  ): Promise<ApiResponse<void>>;
}
```

**Key Algorithms:**

1. **Request Method with Auto-Retry:**

   ```
   function request<T>(endpoint, options, retryCount = 0):
     1. Build full URL = baseURL + endpoint
     2. Prepare headers (Content-Type, Authorization if token exists)
     3. Make fetch request with credentials: 'include'
     4. If response is 401 Unauthorized and retryCount == 0:
        a. Attempt token refresh
        b. If refresh successful:
           - Update token
           - Retry request with retryCount = 1
        c. If refresh fails:
           - Clear token
           - Logout user
           - Return failure
     5. Parse response (JSON or text based on Content-Type)
     6. If response not OK:
        a. Return { success: false, message, errors }
     7. If backend already wrapped in {success, data}:
        a. Return as-is
     8. Else wrap in standard format:
        a. Return { success: true, data }
   ```

2. **Token Refresh Logic:**
   ```
   function refreshToken(refreshToken):
     1. Call /auth/refresh endpoint
     2. Send refreshToken as plain text
     3. Receive { token, refreshToken }
     4. Update ApiClient.token
     5. Update localStorage
     6. Update auth store
     7. Return success
   ```

**Error Handling:**

- Network errors → Return `{ success: false, message: 'Network error' }`
- HTTP errors → Return `{ success: false, message, errors }`
- 401 errors → Automatic token refresh + retry

**Dependencies:**

- Native `fetch` API
- `auth-store` (for logout on auth failure)

---

### 1.3 Role-Based Access Control Module

**Location:** `/src/lib/role-utils.ts`

**Purpose:** Implement role-based filtering and access control.

#### 1.3.1 RBAC Functions

```typescript
// Constants
const CSC_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS'];

// Functions
function isCSCRole(userRole: string | null): boolean;
function shouldApplyInstitutionFilter(
  userRole: string | null,
  userInstitutionId: string | null
): boolean;
```

**Key Algorithms:**

1. **isCSCRole:**

   ```
   function isCSCRole(userRole):
     if userRole is null:
       return false
     return CSC_ROLES includes userRole
   ```

2. **shouldApplyInstitutionFilter:**
   ```
   function shouldApplyInstitutionFilter(userRole, userInstitutionId):
     if userRole is null OR userInstitutionId is null:
       return false
     return NOT isCSCRole(userRole)
   ```

**Usage:**

```typescript
// In API routes
if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
  whereClause.Employee = {
    institutionId: userInstitutionId,
  };
}
```

---

### 1.4 Notification Module

**Location:** `/src/lib/notifications.ts`

**Purpose:** Create and send notifications to users.

#### 1.4.1 Notification Functions

```typescript
interface NotificationData {
  message: string
  link?: string
  userId: string
}

async function createNotification(data: NotificationData): Promise<void>
async function createNotificationForRole(
  role: string,
  message: string,
  link?: string
): Promise<void>

const NotificationTemplates = {
  promotionSubmitted(employeeName: string, requestId: string)
  promotionApproved(requestId: string)
  promotionRejected(requestId: string, reason: string)
  complaintSubmitted(employeeName: string, complaintId: string, subject: string)
  // ... other templates
}
```

**Key Algorithms:**

1. **createNotificationForRole:**

   ```
   async function createNotificationForRole(role, message, link):
     1. Query all active users with role = role
     2. Map users to notification objects:
        - id: uuidv4()
        - message
        - link
        - userId
        - isRead: false
     3. Bulk insert notifications using db.notification.createMany
     4. Log success
   ```

2. **Notification Template Pattern:**
   ```
   NotificationTemplates.promotionSubmitted = (employeeName, requestId) => {
     return {
       message: `New promotion request submitted by ${employeeName}...`,
       link: `/dashboard/promotion`
     }
   }
   ```

**Usage in Workflow:**

```typescript
// After creating promotion request
const notification = NotificationTemplates.promotionSubmitted(
  employee.name,
  request.id
);
await createNotificationForRole(
  'HHRMD',
  notification.message,
  notification.link
);
```

---

### 1.5 MinIO Storage Module

**Location:** `/src/lib/minio.ts`

**Purpose:** Handle file storage and retrieval using MinIO object storage.

#### 1.5.1 MinIO Client Functions

```typescript
// Configuration
const minioClient: MinioClient;
const DEFAULT_BUCKET: string;

// Functions
async function ensureBucketExists(bucketName?: string): Promise<void>;
function generateObjectKey(folder: string, originalName: string): string;
async function uploadFile(
  file: Buffer | string,
  objectKey: string,
  contentType: string,
  bucketName?: string
): Promise<UploadResult>;
async function downloadFile(
  objectKey: string,
  bucketName?: string
): Promise<Stream>;
async function getFileMetadata(
  objectKey: string,
  bucketName?: string
): Promise<FileMetadata>;
async function generatePresignedUrl(
  objectKey: string,
  expiry?: number,
  bucketName?: string
): Promise<string>;
async function deleteFile(
  objectKey: string,
  bucketName?: string
): Promise<{ success: boolean }>;
async function listFiles(prefix?: string, bucketName?: string): Promise<any[]>;
```

**Key Algorithms:**

1. **generateObjectKey:**

   ```
   function generateObjectKey(folder, originalName):
     1. Get current timestamp
     2. Generate random 6-char suffix
     3. Sanitize filename (replace non-alphanumeric with _)
     4. Return: `${folder}/${timestamp}_${randomSuffix}_${sanitizedName}`
   ```

2. **uploadFile:**

   ```
   async function uploadFile(file, objectKey, contentType, bucketName):
     1. Ensure bucket exists
     2. Call minioClient.putObject with:
        - bucketName
        - objectKey
        - file (Buffer or string)
        - metadata: { Content-Type, Upload-Date }
     3. Return { success: true, objectKey, etag, bucketName }
   ```

3. **generatePresignedUrl:**
   ```
   async function generatePresignedUrl(objectKey, expiry = 86400, bucketName):
     1. Call minioClient.presignedGetObject(bucketName, objectKey, expiry)
     2. Return presigned URL (valid for 24 hours by default)
   ```

**Usage Example:**

```typescript
// Upload file
const objectKey = generateObjectKey('documents', file.name);
const result = await uploadFile(fileBuffer, objectKey, 'application/pdf');

// Get presigned URL for download
const url = await generatePresignedUrl(objectKey);
```

---

### 1.6 AI Integration Module (Genkit)

**Location:** `/src/ai/flows/complaint-rewriter.ts`

**Purpose:** AI-powered complaint text rewriting using Google Genkit.

#### 1.6.1 Complaint Rewriter Flow

```typescript
interface StandardizeComplaintFormattingInput {
  complaintText: string;
}

interface StandardizeComplaintFormattingOutput {
  rewrittenComplaint: string;
}

async function standardizeComplaintFormatting(
  input: StandardizeComplaintFormattingInput
): Promise<StandardizeComplaintFormattingOutput>;
```

**Key Components:**

1. **Prompt Definition:**

   ```typescript
   const prompt = ai.definePrompt({
     name: 'standardizeComplaintFormattingPrompt',
     input: { schema: StandardizeComplaintFormattingInputSchema },
     output: { schema: StandardizeComplaintFormattingOutputSchema },
     prompt: `You are an expert in standardizing employee complaints...
   
       Original Complaint: {{{complaintText}}}`,
   });
   ```

2. **Flow Definition:**
   ```typescript
   const standardizeComplaintFormattingFlow = ai.defineFlow(
     {
       name: 'standardizeComplaintFormattingFlow',
       inputSchema: StandardizeComplaintFormattingInputSchema,
       outputSchema: StandardizeComplaintFormattingOutputSchema,
     },
     async (input) => {
       const { output } = await prompt(input);
       return output!;
     }
   );
   ```

**Algorithm:**

```
async function standardizeComplaintFormatting(input):
  1. Receive original complaint text
  2. Pass to Genkit flow
  3. Genkit calls Google Gemini API with prompt
  4. AI analyzes text and rewrites it to:
     - Improve grammar and clarity
     - Maintain formal tone
     - Remove inappropriate language
     - Keep facts unchanged
  5. Return rewritten complaint
```

**Usage:**

```typescript
const result = await standardizeComplaintFormatting({
  complaintText: 'Original complaint text here...',
});
console.log(result.rewrittenComplaint);
```

---

## 2. Class Diagrams

### 2.1 Core Domain Classes

```
┌─────────────────────────────────────────────────────────────┐
│                        CORE ENTITIES                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      Institution     │
├──────────────────────┤
│ + id: string         │
│ + name: string       │
│ + email?: string     │
│ + phoneNumber?: string│
│ + voteNumber?: string│
│ + tinNumber?: string │
├──────────────────────┤
│ + getEmployees()     │
│ + getUsers()         │
└──────────────────────┘
         △
         │ 1
         │
         │ *
┌──────────────────────┐       ┌──────────────────────┐
│      Employee        │       │        User          │
├──────────────────────┤       ├──────────────────────┤
│ + id: string         │       │ + id: string         │
│ + employeeEntityId?  │       │ + username: string   │
│ + name: string       │       │ + password: string   │
│ + gender: string     │       │ + role: Role         │
│ + zanId: string      │       │ + active: boolean    │
│ + dateOfBirth?: Date │       │ + employeeId?: string│
│ + phoneNumber?: str  │       │ + institutionId: str │
│ + zssfNumber?: str   │       │ + phoneNumber?: str  │
│ + payrollNumber?: str│       │ + email?: string     │
│ + cadre?: string     │       │ + createdAt: Date    │
│ + salaryScale?: str  │       │ + updatedAt: Date    │
│ + ministry?: string  │       ├──────────────────────┤
│ + department?: str   │       │ + login()            │
│ + status?: string    │       │ + logout()           │
│ + institutionId: str │       │ + changePassword()   │
│ + retirementDate?    │       │ + hasRole()          │
├──────────────────────┤       │ + canAccessResource()│
│ + isActive()         │       └──────────────────────┘
│ + canSubmitRequest() │                │ 1
│ + getRequests()      │                │
│ + getDocuments()     │                │
└──────────────────────┘                │ 0..1
         △                              ↓
         │ 1                    ┌──────────────────────┐
         │                      │   Employee Profile   │
         │ *                    │   (1:1 relationship) │
         ├──────────────────────┘
         │
         ├─────────────┬─────────────┬─────────────┬────────────┐
         │             │             │             │            │
┌────────────────┐ ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌─────────────┐
│  Promotion     │ │Confirmation│ │   LWOP    │ │  Cadre   │ │ Retirement  │
│   Request      │ │  Request   │ │  Request  │ │  Change  │ │   Request   │
├────────────────┤ ├────────────┤ ├───────────┤ ├──────────┤ ├─────────────┤
│ + id: string   │ │ + id: str  │ │ + id: str │ │+ id: str │ │ + id: string│
│ + employeeId   │ │ + employeeId│ │ + employeeId│ │+ employeeId│ │+ employeeId│
│ + submittedById│ │ + submittedById│ │+ submittedById│ │+ submittedById│ │+ submittedById│
│ + reviewedById?│ │ + reviewedById?│ │+ reviewedById?│ │+ reviewedById?│ │+ reviewedById?│
│ + status: str  │ │ + status: str│ │+ status: str│ │+ status: str│ │+ status: str│
│ + reviewStage  │ │ + reviewStage│ │+ reviewStage│ │+ reviewStage│ │+ reviewStage│
│ + documents[]  │ │ + documents[]│ │+ documents[]│ │+ documents[]│ │+ documents[]│
│ + createdAt    │ │ + createdAt  │ │+ createdAt  │ │+ createdAt  │ │+ createdAt  │
│ + updatedAt    │ │ + updatedAt  │ │+ updatedAt  │ │+ updatedAt  │ │+ updatedAt  │
│ + proposedCadre│ │ + decisionDate?│ │+ duration │ │+ newCadre │ │+ retirementType│
│ + promotionType│ │ + commissionDecisionDate?│ │+ reason │ │+ reason  │ │+ proposedDate│
├────────────────┤ ├────────────┤ ├───────────┤ ├──────────┤ ├─────────────┤
│ + submit()     │ │ + submit() │ │ + submit()│ │ + submit()│ │ + submit()  │
│ + approve()    │ │ + approve()│ │ + approve()│ │+ approve()│ │ + approve() │
│ + reject()     │ │ + reject() │ │ + reject()│ │ + reject()│ │ + reject()  │
│ + updateStage()│ │ + updateStage()│ │+ updateStage()│ │+ updateStage()│ │+ updateStage()│
└────────────────┘ └────────────┘ └───────────┘ └──────────┘ └─────────────┘
```

### 2.2 API Client Class Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      API CLIENT LAYER                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│            ApiClient                 │
├──────────────────────────────────────┤
│ - baseURL: string                    │
│ - token: string | null               │
├──────────────────────────────────────┤
│ - request<T>(endpoint, options, retryCount): Promise<ApiResponse<T>>│
│ + setToken(token: string): void      │
│ + clearToken(): void                 │
├──────────────────────────────────────┤
│ # Authentication                     │
│ + login(username, password)          │
│ + logout()                           │
│ + refreshToken(refreshToken)         │
├──────────────────────────────────────┤
│ # Resource APIs                      │
│ + getEmployees(params?)              │
│ + getEmployee(id)                    │
│ + createEmployee(employee)           │
│ + updateEmployee(id, employee)       │
│ + deleteEmployee(id)                 │
├──────────────────────────────────────┤
│ + getPromotionRequests()             │
│ + createPromotionRequest(data)       │
│ + updatePromotionRequest(id, data)   │
├──────────────────────────────────────┤
│ + getComplaints()                    │
│ + createComplaint(data)              │
│ + updateComplaint(id, data)          │
├──────────────────────────────────────┤
│ + getInstitutions()                  │
│ + getUsers()                         │
│ + uploadFile(file, endpoint?)        │
│ + getNotifications(userId)           │
└──────────────────────────────────────┘
                │
                │ uses
                ↓
┌──────────────────────────────────────┐
│         ApiResponse<T>               │
├──────────────────────────────────────┤
│ + success: boolean                   │
│ + data?: T                           │
│ + message?: string                   │
│ + errors?: string[]                  │
└──────────────────────────────────────┘
```

### 2.3 State Management Class Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│          AuthStore                   │
│      (Zustand Store)                 │
├──────────────────────────────────────┤
│ # State                              │
│ + user: User | null                  │
│ + role: Role | null                  │
│ + isAuthenticated: boolean           │
│ + accessToken: string | null         │
│ + refreshToken: string | null        │
├──────────────────────────────────────┤
│ # Actions                            │
│ + login(username, password)          │
│   : Promise<User | null>             │
│ + logout(): Promise<void>            │
│ + refreshAuthToken(): Promise<bool>  │
│ + initializeAuth(): void             │
│ + setUserManually(user): void        │
│ + updateTokenFromApiClient(token)    │
├──────────────────────────────────────┤
│ # Middleware                         │
│ + persist: localStorage              │
│ + partialize: user, role, tokens     │
│ + onRehydrateStorage: restore state  │
└──────────────────────────────────────┘
                │
                │ uses
                ↓
┌──────────────────────────────────────┐
│          ApiClient                   │
│     (Singleton Instance)             │
├──────────────────────────────────────┤
│ + setToken(token)                    │
│ + clearToken()                       │
│ + login(username, password)          │
│ + logout()                           │
│ + refreshToken(refreshToken)         │
└──────────────────────────────────────┘
                │
                │ stores in
                ↓
┌──────────────────────────────────────┐
│        localStorage                  │
├──────────────────────────────────────┤
│ + auth-storage                       │
│   - user                             │
│   - role                             │
│   - isAuthenticated                  │
│   - accessToken                      │
│   - refreshToken                     │
└──────────────────────────────────────┘
```

---

## 3. Sequence Diagrams

### 3.1 User Login Sequence

```
User          LoginForm       AuthStore      ApiClient      API Server      Database
 │                │              │              │              │              │
 │──Enter Creds──>│              │              │              │              │
 │                │──login()────>│              │              │              │
 │                │              │──login()────>│              │              │
 │                │              │              │──POST────────>│              │
 │                │              │              │ /auth/login  │              │
 │                │              │              │              │──Query User──>│
 │                │              │              │              │<──User Data──│
 │                │              │              │              │──Verify Pwd──>│
 │                │              │              │              │<──Match─────│
 │                │              │              │              │──Gen JWT────>│
 │                │              │              │              │<──JWT + User│
 │                │              │              │<──Response───│              │
 │                │              │              │  {token,     │              │
 │                │              │              │   refreshToken,│            │
 │                │              │              │   user}       │             │
 │                │              │<──User Data──│              │              │
 │                │              │──setToken()─>│              │              │
 │                │              │──setState()──>│              │              │
 │                │              │  (user, role,│              │              │
 │                │              │   isAuth, tokens)           │              │
 │                │              │──persist()──>localStorage   │              │
 │                │<──User Data──│              │              │              │
 │<──Navigate─────│              │              │              │              │
 │  Dashboard     │              │              │              │              │
```

### 3.2 Promotion Request Submission Sequence

```
User     PromotionPage   Form      ApiClient    API Route    Database    NotificationService
 │           │            │           │             │            │              │
 │──Fill Form│            │           │             │            │              │
 │──Submit───>│           │           │             │            │              │
 │            │──validate()│           │             │            │              │
 │            │<──valid────│           │             │            │              │
 │            │──createPromotionRequest()           │            │              │
 │            │            │──POST────>│             │            │              │
 │            │            │           │──POST /api/promotions   │              │
 │            │            │           │             │            │              │
 │            │            │           │             │──Validate──│              │
 │            │            │           │             │  Request   │              │
 │            │            │           │             │──Get Emp───>│              │
 │            │            │           │             │<──Employee─│              │
 │            │            │           │             │──Check─────>│              │
 │            │            │           │             │  Status    │              │
 │            │            │           │             │<──Valid────│              │
 │            │            │           │             │──Create────>│              │
 │            │            │           │             │  Request   │              │
 │            │            │           │             │<──Request──│              │
 │            │            │           │             │──Create Notification────>│
 │            │            │           │             │  (HHRMD, DO roles)       │
 │            │            │           │             │<──Success────────────────│
 │            │            │           │<──Response──│            │              │
 │            │            │<──Success─│             │            │              │
 │            │<──Success──│           │             │            │              │
 │<──Redirect─│            │           │             │            │              │
 │  to List   │            │           │             │            │              │
 │            │            │           │             │            │              │
 │                                                                               │
 │                    Notification Sent to Reviewers                            │
 │<──────────────────────────────────────────────────────────────────────────────│
```

### 3.3 File Upload Sequence (MinIO)

```
User      FileUpload     ApiClient   API Route   MinIO       Database
Component                            /api/files  Service
 │            │              │           │           │           │
 │──Select────>│              │           │           │           │
 │   File     │              │           │           │           │
 │──Upload────>│              │           │           │           │
 │            │──Validate────>│           │           │           │
 │            │  (type, size) │           │           │           │
 │            │<──Valid───────│           │           │           │
 │            │──uploadFile()─>│           │           │           │
 │            │              │──POST────>│           │           │
 │            │              │ FormData  │           │           │
 │            │              │           │──Validate─>│           │
 │            │              │           │<──Valid───│           │
 │            │              │           │──Generate─>│           │
 │            │              │           │  ObjectKey│           │
 │            │              │           │<──Key─────│           │
 │            │              │           │──ensureBucket()       │
 │            │              │           │           │──Check────>│
 │            │              │           │           │<──Exists──│
 │            │              │           │──Upload───>│           │
 │            │              │           │  File     │           │
 │            │              │           │<──Success─│           │
 │            │              │           │  (etag)   │           │
 │            │              │           │──Save─────────────────>│
 │            │              │           │  Metadata │           │
 │            │              │           │<──Saved───────────────│
 │            │              │           │──Generate─>│           │
 │            │              │           │  PresignedURL         │
 │            │              │           │<──URL─────│           │
 │            │              │<──Success─│           │           │
 │            │              │  {objectKey, url}     │           │
 │            │<──Success────│           │           │           │
 │<──Display──│              │           │           │           │
 │   Preview  │              │           │           │           │
```

### 3.4 Token Refresh Sequence

```
User       Component    AuthStore    ApiClient    API Route    Database
 │              │           │            │            │            │
 │──Request─────>│           │            │            │            │
 │   Data       │           │            │            │            │
 │              │──API Call─────────────>│            │            │
 │              │           │            │──Request──>│            │
 │              │           │            │  (old token)            │
 │              │           │            │            │            │
 │              │           │            │<──401──────│            │
 │              │           │            │  Unauthorized           │
 │              │           │            │            │            │
 │              │           │            │──Get RefreshToken       │
 │              │           │            │  from localStorage      │
 │              │           │            │            │            │
 │              │           │            │──POST──────>│            │
 │              │           │            │ /auth/refresh           │
 │              │           │            │ refreshToken            │
 │              │           │            │            │──Validate─>│
 │              │           │            │            │<──Valid───│
 │              │           │            │            │──Gen New──>│
 │              │           │            │            │  JWT      │
 │              │           │            │            │<──Tokens──│
 │              │           │            │<──Success──│            │
 │              │           │            │  {token,   │            │
 │              │           │            │   refreshToken}         │
 │              │           │<──updateTokenFromApiClient()         │
 │              │           │──setState()────>│        │            │
 │              │           │  (new tokens)   │        │            │
 │              │           │──persist()──>localStorage            │
 │              │           │            │            │            │
 │              │           │            │──Retry Original Request│
 │              │           │            │  (new token)            │
 │              │           │            │──Request──>│            │
 │              │           │            │<──Success──│            │
 │              │<──Data────────────────│            │            │
 │<──Display────│           │            │            │            │
```

### 3.5 Complaint Rewriting with AI Sequence

```
User      ComplaintForm   Component   Genkit     Google AI    API
 │             │              │         Service     API        │
 │──Write──────>│              │           │         │         │
 │  Complaint  │              │           │         │         │
 │──Click──────>│              │           │         │         │
 │  "Improve   │              │           │         │         │
 │   with AI"  │              │           │         │         │
 │             │──onClick()───>│           │         │         │
 │             │              │──standardizeComplaintFormatting()
 │             │              │           │         │         │
 │             │              │──Call────>│         │         │
 │             │              │  Flow     │         │         │
 │             │              │           │──definePrompt()   │
 │             │              │           │  with context     │
 │             │              │           │──Call────>│       │
 │             │              │           │  Gemini  │       │
 │             │              │           │  API     │       │
 │             │              │           │          │       │
 │             │              │           │          │──Process
 │             │              │           │          │  - Analyze text
 │             │              │           │          │  - Improve grammar
 │             │              │           │          │  - Formalize tone
 │             │              │           │          │  - Remove inappropriate
 │             │              │           │          │    language
 │             │              │           │          │       │
 │             │              │           │<──Result─│       │
 │             │              │           │  Rewritten       │
 │             │              │           │  Complaint       │
 │             │              │<──Return──│         │       │
 │             │              │  {rewrittenComplaint}        │
 │             │<──Display────│           │         │       │
 │             │  Original vs │           │         │       │
 │             │  Improved    │           │         │       │
 │<──View──────│              │           │         │       │
 │  Comparison │              │           │         │       │
 │             │              │           │         │       │
 │──Accept/────>│              │           │         │       │
 │  Reject     │              │           │         │       │
```

---

## 4. Algorithm Designs

### 4.1 Employee Status Validation Algorithm

**Location:** `/src/lib/employee-status-validation.ts`

**Purpose:** Validate if an employee's status allows them to submit specific request types.

```typescript
function validateEmployeeStatusForRequest(
  employeeStatus: string | null | undefined,
  requestType:
    | 'promotion'
    | 'confirmation'
    | 'lwop'
    | 'cadre-change'
    | 'retirement'
): { isValid: boolean; message: string };
```

**Algorithm:**

```
function validateEmployeeStatusForRequest(employeeStatus, requestType):
  // Handle null/undefined status
  if employeeStatus is null or undefined:
    return { isValid: false, message: "Employee status is not set" }

  // Normalize status to lowercase for comparison
  normalizedStatus = employeeStatus.toLowerCase().trim()

  // Define valid statuses for each request type
  validStatuses = {
    'promotion': ['active', 'confirmed'],
    'confirmation': ['active', 'probation', 'on probation'],
    'lwop': ['active', 'confirmed'],
    'cadre-change': ['active', 'confirmed'],
    'retirement': ['active', 'confirmed', 'approaching retirement']
  }

  // Check if request type is supported
  if requestType not in validStatuses:
    return { isValid: false, message: "Invalid request type" }

  // Check if employee status is valid for this request type
  if normalizedStatus in validStatuses[requestType]:
    return { isValid: true, message: "Status is valid" }
  else:
    return {
      isValid: false,
      message: `Employee with status "${employeeStatus}" cannot submit ${requestType} request`
    }
```

**Usage Example:**

```typescript
const validation = validateEmployeeStatusForRequest(
  employee.status,
  'promotion'
);
if (!validation.isValid) {
  return error(validation.message);
}
```

---

### 4.2 Institution Filtering Algorithm

**Purpose:** Apply role-based data filtering for institution-specific data.

**Algorithm:**

```
function getFilteredRequests(userRole, userInstitutionId):
  // Initialize where clause
  whereClause = {}

  // Check if user role requires institution filtering
  if shouldApplyInstitutionFilter(userRole, userInstitutionId):
    // Institution-specific role (HRO, etc.)
    whereClause.Employee = {
      institutionId: userInstitutionId
    }
  else:
    // CSC role (HHRMD, HRMO, DO, PO, CSCS)
    // No filtering - see all institutions
    // whereClause remains empty

  // Query database with filter
  requests = await db.promotionRequest.findMany({
    where: whereClause,
    include: {
      Employee: {
        include: { Institution: true }
      }
    }
  })

  return requests
```

**CSC Role Check:**

```
const CSC_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS']

function isCSCRole(userRole):
  return userRole in CSC_ROLES

function shouldApplyInstitutionFilter(userRole, userInstitutionId):
  if not userRole or not userInstitutionId:
    return false
  return not isCSCRole(userRole)
```

---

### 4.3 Workflow State Transition Algorithm

**Purpose:** Manage request status transitions through approval workflow.

**Algorithm:**

```
function updateRequestStatus(request, action, userRole):
  currentStage = request.reviewStage
  currentStatus = request.status

  // Define state machine
  transitions = {
    'initial': {
      'approve': {
        'HHRMD': { stage: 'hrmd_approved', status: 'Pending DO Review' },
        'HRMO': { stage: 'hrmo_approved', status: 'Pending HHRMD Review' }
      },
      'reject': {
        'HHRMD': { stage: 'rejected', status: 'Rejected by HHRMD' },
        'HRMO': { stage: 'rejected', status: 'Rejected by HRMO' }
      }
    },
    'hrmd_approved': {
      'approve': {
        'DO': { stage: 'do_approved', status: 'Pending Commission' }
      },
      'reject': {
        'DO': { stage: 'rejected', status: 'Rejected by DO' }
      }
    },
    'do_approved': {
      'approve': {
        'CSCS': { stage: 'approved', status: 'Approved by Commission' }
      },
      'reject': {
        'CSCS': { stage: 'rejected', status: 'Rejected by Commission' }
      }
    }
  }

  // Validate transition
  if currentStage not in transitions:
    throw Error("Invalid current stage")

  if action not in transitions[currentStage]:
    throw Error("Invalid action for current stage")

  if userRole not in transitions[currentStage][action]:
    throw Error("User role not authorized for this action")

  // Get new state
  newState = transitions[currentStage][action][userRole]

  // Update request
  request.reviewStage = newState.stage
  request.status = newState.status
  request.reviewedById = currentUserId
  request.updatedAt = now()

  // If final approval, update employee record
  if newState.status == 'Approved by Commission':
    if requestType == 'promotion':
      employee.cadre = request.proposedCadre
    else if requestType == 'confirmation':
      employee.confirmationDate = now()
    // ... other updates

  return request
```

---

### 4.4 Notification Broadcasting Algorithm

**Purpose:** Send notifications to all users with a specific role.

**Algorithm:**

```
async function createNotificationForRole(role, message, link):
  // Step 1: Query all active users with the target role
  users = await db.User.findMany({
    where: {
      role: role,
      active: true
    },
    select: {
      id: true
    }
  })

  // Step 2: Map users to notification objects
  notifications = users.map(user => ({
    id: generateUUID(),
    message: message,
    link: link,
    userId: user.id,
    isRead: false,
    createdAt: now()
  }))

  // Step 3: Bulk insert notifications
  if notifications.length > 0:
    await db.notification.createMany({
      data: notifications
    })

    log(`Created ${notifications.length} notifications for role: ${role}`)
  else:
    log(`No active users found with role: ${role}`)

  return notifications.length
```

**Optimization:** Uses `createMany` for bulk insert instead of individual creates.

---

### 4.5 File Storage Path Generation Algorithm

**Purpose:** Generate unique, collision-free object keys for MinIO storage.

**Algorithm:**

```
function generateObjectKey(folder, originalFileName):
  // Step 1: Get current timestamp (milliseconds)
  timestamp = Date.now()  // e.g., 1703520123456

  // Step 2: Generate random suffix (6 characters)
  randomSuffix = Math.random()
    .toString(36)      // Convert to base36 string
    .substring(2, 8)   // Take 6 characters
  // Result: e.g., "x7k9m2"

  // Step 3: Sanitize original filename
  // Remove special characters except alphanumeric, dots, and dashes
  sanitizedName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, '_')

  // Step 4: Combine into unique key
  objectKey = `${folder}/${timestamp}_${randomSuffix}_${sanitizedName}`

  // Example result: "documents/1703520123456_x7k9m2_employee_certificate.pdf"

  return objectKey
```

**Collision Probability:** Extremely low due to:

- Timestamp (millisecond precision)
- Random 6-character suffix (36^6 = 2.1 billion combinations)
- Original filename preservation

---

### 4.6 Prisma Query Optimization Pattern

**Purpose:** Efficiently fetch related data with selective field loading.

**Pattern:**

```typescript
// Anti-pattern (fetch all fields, N+1 queries)
const requests = await db.promotionRequest.findMany();
for (const request of requests) {
  const employee = await db.employee.findUnique({
    where: { id: request.employeeId },
  });
}

// Optimized pattern (selective fields, single query with joins)
const requests = await db.promotionRequest.findMany({
  where: whereClause,
  include: {
    Employee: {
      select: {
        id: true,
        name: true,
        zanId: true,
        payrollNumber: true,
        Institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    User_PromotionRequest_submittedByIdToUser: {
      select: {
        id: true,
        name: true,
        username: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
});
```

**Benefits:**

- Single database query (no N+1)
- Reduced data transfer (only necessary fields)
- Better performance
- Type safety (TypeScript knows exact shape)

---

## 5. Code Structure

### 5.1 Project Directory Structure

```
/www/wwwroot/nextjs/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Login page
│   │   │   └── employee-login/
│   │   │       └── page.tsx          # Employee self-service login
│   │   │
│   │   ├── dashboard/                # Dashboard pages
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── promotion/            # Promotion requests
│   │   │   ├── confirmation/         # Confirmation requests
│   │   │   ├── lwop/                 # LWOP requests
│   │   │   ├── cadre-change/         # Cadre change requests
│   │   │   ├── retirement/           # Retirement requests
│   │   │   ├── resignation/          # Resignation requests
│   │   │   ├── termination/          # Termination requests
│   │   │   ├── service-extension/    # Service extension requests
│   │   │   ├── complaints/           # Complaint management
│   │   │   ├── reports/              # Reports
│   │   │   ├── admin/                # Admin pages
│   │   │   │   ├── users/
│   │   │   │   ├── institutions/
│   │   │   │   ├── fetch-data/       # HRIMS data sync
│   │   │   │   ├── get-photo/
│   │   │   │   └── get-documents/
│   │   │   └── profile/              # User profile
│   │   │
│   │   ├── api/                      # API Routes (Backend)
│   │   │   ├── auth/                 # Authentication endpoints
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   ├── session/route.ts
│   │   │   │   └── change-password/route.ts
│   │   │   │
│   │   │   ├── employees/            # Employee management
│   │   │   │   ├── route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── documents/route.ts
│   │   │   │       ├── certificates/route.ts
│   │   │   │       ├── fetch-photo/route.ts
│   │   │   │       └── fetch-documents/route.ts
│   │   │   │
│   │   │   ├── promotions/           # Promotion requests
│   │   │   │   ├── route.ts          # GET, POST
│   │   │   │   └── [id]/route.ts     # PATCH, DELETE
│   │   │   │
│   │   │   ├── confirmations/        # Confirmation requests
│   │   │   ├── lwop/                 # LWOP requests
│   │   │   ├── cadre-change/         # Cadre change requests
│   │   │   ├── retirement/           # Retirement requests
│   │   │   ├── resignation/          # Resignation requests
│   │   │   ├── termination/          # Termination requests
│   │   │   ├── service-extension/    # Service extension
│   │   │   │
│   │   │   ├── complaints/           # Complaint management
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   │
│   │   │   ├── files/                # File operations
│   │   │   │   ├── upload/route.ts
│   │   │   │   ├── download/[...objectKey]/route.ts
│   │   │   │   ├── preview/[...objectKey]/route.ts
│   │   │   │   ├── exists/[...objectKey]/route.ts
│   │   │   │   ├── employee-photos/[filename]/route.ts
│   │   │   │   └── employee-documents/[filename]/route.ts
│   │   │   │
│   │   │   ├── hrims/                # HRIMS integration
│   │   │   │   ├── sync-employee/route.ts
│   │   │   │   ├── sync-documents/route.ts
│   │   │   │   ├── sync-certificates/route.ts
│   │   │   │   ├── bulk-fetch/route.ts
│   │   │   │   ├── fetch-by-institution/route.ts
│   │   │   │   └── fetch-employee/route.ts
│   │   │   │
│   │   │   ├── institutions/         # Institution management
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   │
│   │   │   ├── users/                # User management
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   │
│   │   │   ├── notifications/        # Notifications
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   ├── dashboard/            # Dashboard APIs
│   │   │   │   └── metrics/route.ts
│   │   │   │
│   │   │   └── reports/              # Report generation
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home page
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                       # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── table.tsx
│   │   │   ├── file-upload.tsx
│   │   │   ├── file-preview-modal.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/                   # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── notification-bell.tsx
│   │   │   └── user-nav.tsx
│   │   │
│   │   ├── shared/                   # Shared components
│   │   │   ├── page-header.tsx
│   │   │   ├── employee-search.tsx
│   │   │   └── pagination.tsx
│   │   │
│   │   ├── auth/                     # Auth components
│   │   │   ├── login-form.tsx
│   │   │   ├── employee-login-form.tsx
│   │   │   └── change-password-modal.tsx
│   │   │
│   │   └── employee/                 # Employee components
│   │       ├── document-upload.tsx
│   │       └── certificate-upload.tsx
│   │
│   ├── lib/                          # Shared libraries
│   │   ├── api-client.ts             # API client singleton
│   │   ├── db.ts                     # Prisma client
│   │   ├── minio.ts                  # MinIO client
│   │   ├── notifications.ts          # Notification service
│   │   ├── role-utils.ts             # RBAC utilities
│   │   ├── constants.ts              # App constants
│   │   ├── types.ts                  # TypeScript types
│   │   ├── utils.ts                  # Utility functions
│   │   ├── navigation.ts             # Navigation utilities
│   │   ├── backend-config.ts         # Backend config
│   │   ├── debug-logger.ts           # Debug logger
│   │   └── employee-status-validation.ts  # Status validation
│   │
│   ├── store/                        # State management
│   │   └── auth-store.ts             # Zustand auth store
│   │
│   ├── ai/                           # AI integration
│   │   ├── genkit.ts                 # Genkit config
│   │   ├── wrapper.ts                # AI wrapper
│   │   ├── dev.ts                    # Development server
│   │   └── flows/
│   │       └── complaint-rewriter.ts # Complaint AI flow
│   │
│   └── hooks/                        # Custom React hooks
│       └── use-auth.ts               # Auth hook
│
├── prisma/
│   └── schema.prisma                 # Prisma schema
│
├── public/                           # Static assets
│
├── docs/                             # Documentation
│   ├── High_Level_Design_Document_v2.md
│   ├── Low_Level_Design_Document.md
│   ├── Technical_Architecture_Document.md
│   ├── Database_Design_Document.md
│   └── ...
│
├── .env                              # Environment variables
├── .env.example                      # Environment template
├── next.config.ts                    # Next.js config
├── tailwind.config.ts                # Tailwind config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
├── ecosystem.config.js               # PM2 config
└── CLAUDE.md                         # Project instructions
```

### 5.2 Naming Conventions

#### 5.2.1 File Naming

| Type                 | Convention | Example                          |
| -------------------- | ---------- | -------------------------------- |
| **React Components** | PascalCase | `EmployeeSearch.tsx`             |
| **Pages (Next.js)**  | lowercase  | `page.tsx`, `layout.tsx`         |
| **API Routes**       | lowercase  | `route.ts`                       |
| **Libraries**        | kebab-case | `api-client.ts`, `role-utils.ts` |
| **Types**            | lowercase  | `types.ts`                       |
| **Constants**        | lowercase  | `constants.ts`                   |

#### 5.2.2 Variable Naming

| Type                 | Convention                  | Example                                 |
| -------------------- | --------------------------- | --------------------------------------- |
| **Variables**        | camelCase                   | `employeeId`, `userName`                |
| **Constants**        | SCREAMING_SNAKE_CASE        | `CSC_ROLES`, `DEFAULT_BUCKET`           |
| **Types/Interfaces** | PascalCase                  | `Employee`, `ApiResponse<T>`            |
| **Functions**        | camelCase                   | `getUserById()`, `createNotification()` |
| **Components**       | PascalCase                  | `EmployeeSearch`, `LoginForm`           |
| **Hooks**            | camelCase with `use` prefix | `useAuth()`, `useEmployee()`            |

#### 5.2.3 Database Naming

| Type          | Convention            | Example                                     |
| ------------- | --------------------- | ------------------------------------------- |
| **Tables**    | PascalCase            | `Employee`, `PromotionRequest`              |
| **Columns**   | camelCase             | `employeeId`, `createdAt`                   |
| **Relations** | descriptive camelCase | `User_PromotionRequest_submittedByIdToUser` |

---

### 5.3 Code Organization Patterns

#### 5.3.1 API Route Pattern

```typescript
// Pattern for all API routes
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shouldApplyInstitutionFilter } from '@/lib/role-utils';
import { validateEmployeeStatusForRequest } from '@/lib/employee-status-validation';
import {
  createNotificationForRole,
  NotificationTemplates,
} from '@/lib/notifications';
import { v4 as uuidv4 } from 'uuid';

// GET handler
export async function GET(req: Request) {
  try {
    // 1. Extract query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userInstitutionId = searchParams.get('userInstitutionId');

    // 2. Apply RBAC filtering
    let whereClause: any = {};
    if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
      whereClause.Employee = { institutionId: userInstitutionId };
    }

    // 3. Query database
    const data = await db.resource.findMany({
      where: whereClause,
      include: {
        /* relations */
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Transform data if needed
    const transformed = data.map((item) => ({
      ...item,
      // transformations
    }));

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: transformed,
    });
  } catch (error) {
    console.error('[API_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(req: Request) {
  try {
    // 1. Parse body
    const body = await req.json();

    // 2. Validate required fields
    if (!body.requiredField) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field',
        },
        { status: 400 }
      );
    }

    // 3. Validate business rules (e.g., employee status)
    const validation = validateEmployeeStatusForRequest(
      employee.status,
      'requestType'
    );
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 403 }
      );
    }

    // 4. Create resource
    const resource = await db.resource.create({
      data: {
        id: uuidv4(),
        ...body,
        status: 'Pending',
        reviewStage: 'initial',
        updatedAt: new Date(),
      },
      include: {
        /* relations */
      },
    });

    // 5. Send notifications
    const notification = NotificationTemplates.resourceSubmitted(
      resource.name,
      resource.id
    );
    await createNotificationForRole(
      'HHRMD',
      notification.message,
      notification.link
    );

    // 6. Return success
    return NextResponse.json({
      success: true,
      data: resource,
    });
  } catch (error) {
    console.error('[API_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

#### 5.3.2 Component Pattern

```typescript
// Pattern for React components
'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ComponentProps {
  // Props interface
}

export function ComponentName({ /* props */ }: ComponentProps) {
  // 1. State hooks
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 2. Store hooks
  const { user, role } = useAuthStore();

  // 3. Effects
  useEffect(() => {
    fetchData();
  }, []);

  // 4. Handlers
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getData();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    // Handle action
  };

  // 5. Render conditions
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // 6. Main render
  return (
    <Card>
      {/* Component JSX */}
    </Card>
  );
}
```

---

## 6. API Specifications

### 6.1 Authentication APIs

#### 6.1.1 Login

**Endpoint:** `POST /api/auth/login`

**Request:**

```typescript
{
  username: string;
  password: string;
}
```

**Response:**

```typescript
{
  success: boolean
  data?: {
    token: string
    refreshToken: string
    tokenType: 'Bearer'
    expiresIn: number
    user: {
      id: string
      username: string
      fullName: string
      role: Role
      isEnabled: boolean
      employeeId?: string
      institutionId: string
      institutionName: string
      lastLoginDate: string
    }
  }
  message?: string
}
```

**Status Codes:**

- `200`: Success
- `401`: Invalid credentials
- `403`: Account locked
- `500`: Server error

---

#### 6.1.2 Logout

**Endpoint:** `POST /api/auth/logout`

**Request:** None (uses cookies/token)

**Response:**

```typescript
{
  success: boolean
  message?: string
}
```

---

#### 6.1.3 Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Request:** `refreshToken` as plain text

**Response:**

```typescript
{
  success: boolean
  data?: {
    token: string
    refreshToken: string
  }
  message?: string
}
```

---

### 6.2 Employee APIs

#### 6.2.1 Get Employees

**Endpoint:** `GET /api/employees`

**Query Parameters:**

```typescript
{
  userRole?: string
  userInstitutionId?: string
  q?: string          // Search query
  page?: number
  size?: number
}
```

**Response:**

```typescript
{
  success: boolean
  data?: Employee[]
  message?: string
}
```

---

#### 6.2.2 Get Employee by ID

**Endpoint:** `GET /api/employees/:id`

**Response:**

```typescript
{
  success: boolean
  data?: Employee
  message?: string
}
```

---

### 6.3 Request APIs (Promotion Example)

#### 6.3.1 Get Promotion Requests

**Endpoint:** `GET /api/promotions`

**Query Parameters:**

```typescript
{
  userId?: string
  userRole?: string
  userInstitutionId?: string
}
```

**Response:**

```typescript
{
  success: boolean
  data?: PromotionRequest[]
}
```

---

#### 6.3.2 Create Promotion Request

**Endpoint:** `POST /api/promotions`

**Request:**

```typescript
{
  employeeId: string
  submittedById: string
  promotionType: 'Experience' | 'Education'
  proposedCadre?: string           // Required for Experience type
  studiedOutsideCountry?: boolean  // For Education type
  documents?: string[]
}
```

**Response:**

```typescript
{
  success: boolean
  data?: PromotionRequest
  message?: string
}
```

**Status Codes:**

- `200`: Success
- `400`: Missing required fields
- `403`: Employee status invalid for promotion
- `404`: Employee not found
- `500`: Server error

---

#### 6.3.3 Update Promotion Request

**Endpoint:** `PATCH /api/promotions/:id`

**Request:**

```typescript
{
  status?: string
  reviewStage?: string
  reviewedById?: string
  rejectionReason?: string
  commissionDecisionReason?: string
}
```

**Response:**

```typescript
{
  success: boolean
  data?: PromotionRequest
}
```

**Side Effects:**

- If `status === 'Approved by Commission'`, updates employee cadre

---

### 6.4 File APIs

#### 6.4.1 Upload File

**Endpoint:** `POST /api/files/upload`

**Request:** `multipart/form-data`

```typescript
{
  file: File;
}
```

**Response:**

```typescript
{
  success: boolean
  data?: {
    objectKey: string
    url: string      // Presigned URL
    etag: string
    bucketName: string
  }
  message?: string
}
```

---

#### 6.4.2 Download File

**Endpoint:** `GET /api/files/download/[...objectKey]`

**Response:** File stream with headers:

```
Content-Type: <file-content-type>
Content-Disposition: attachment; filename="<filename>"
```

---

### 6.5 HRIMS Integration APIs

#### 6.5.1 Sync Employee

**Endpoint:** `POST /api/hrims/sync-employee`

**Request:**

```typescript
{
  zanId?: string
  payrollNumber?: string
  institutionVoteNumber: string
  syncDocuments?: boolean
  hrimsApiUrl?: string
  hrimsApiKey?: string
}
```

**Response:**

```typescript
{
  success: boolean
  data?: {
    employeeId: string
    zanId: string
    name: string
    institutionId: string
    documentsCount: number
    certificatesCount: number
    documentsStatus: 'syncing' | 'completed'
    certificatesStatus: 'syncing' | 'completed'
  }
  message?: string
}
```

**Flow:**

1. Fetch employee from HRIMS API
2. Upsert employee in database
3. Trigger background sync for documents
4. Trigger background sync for certificates
5. Return immediate response

---

## 7. Data Models

### 7.1 Core Models (Prisma Schema)

#### 7.1.1 User Model

```prisma
model User {
  id                String      @id
  name              String
  username          String      @unique
  password          String      // bcrypt hashed
  role              String      // Role enum
  active            Boolean     @default(true)
  employeeId        String?     @unique
  institutionId     String
  createdAt         DateTime    @default(now())
  updatedAt         DateTime
  phoneNumber       String?
  email             String?

  // Relations
  Employee          Employee?   @relation(fields: [employeeId], references: [id])
  Institution       Institution @relation(fields: [institutionId], references: [id])

  // Request relations (as submitter)
  PromotionRequests_Submitted    PromotionRequest[]     @relation("PromotionRequest_submittedByIdToUser")
  ConfirmationRequests_Submitted ConfirmationRequest[]  @relation("ConfirmationRequest_submittedByIdToUser")
  // ... other request types

  // Request relations (as reviewer)
  PromotionRequests_Reviewed     PromotionRequest[]     @relation("PromotionRequest_reviewedByIdToUser")
  ConfirmationRequests_Reviewed  ConfirmationRequest[]  @relation("ConfirmationRequest_reviewedByIdToUser")
  // ... other request types

  // Notifications
  Notifications     Notification[]

  // Complaints
  Complaints_Filed  Complaint[]  @relation("Complaint_complainantIdToUser")
  Complaints_Reviewed Complaint[] @relation("Complaint_reviewedByIdToUser")
}
```

#### 7.1.2 Employee Model

```prisma
model Employee {
  id                      String    @id
  employeeEntityId        String?
  name                    String
  gender                  String
  profileImageUrl         String?
  dateOfBirth             DateTime?
  placeOfBirth            String?
  region                  String?
  countryOfBirth          String?
  zanId                   String    @unique
  phoneNumber             String?
  contactAddress          String?
  zssfNumber              String?
  payrollNumber           String?
  cadre                   String?
  salaryScale             String?
  ministry                String?
  department              String?
  appointmentType         String?
  contractType            String?
  recentTitleDate         DateTime?
  currentReportingOffice  String?
  currentWorkplace        String?
  employmentDate          DateTime?
  confirmationDate        DateTime?
  retirementDate          DateTime?
  status                  String?

  // Document URLs (optional legacy fields)
  ardhilHaliUrl           String?
  confirmationLetterUrl   String?
  jobContractUrl          String?
  birthCertificateUrl     String?

  // Relations
  institutionId           String
  Institution             Institution @relation(fields: [institutionId], references: [id])

  User                    User?

  // Request types
  PromotionRequests       PromotionRequest[]
  ConfirmationRequests    ConfirmationRequest[]
  LwopRequests            LwopRequest[]
  CadreChangeRequests     CadreChangeRequest[]
  RetirementRequests      RetirementRequest[]
  ResignationRequests     ResignationRequest[]
  SeparationRequests      SeparationRequest[]
  ServiceExtensionRequests ServiceExtensionRequest[]

  // Documents
  Certificates            EmployeeCertificate[]
}
```

#### 7.1.3 PromotionRequest Model

```prisma
model PromotionRequest {
  id                          String   @id
  status                      String
  reviewStage                 String
  proposedCadre               String
  promotionType               String
  studiedOutsideCountry       Boolean?
  documents                   String[]
  rejectionReason             String?
  commissionDecisionReason    String?
  employeeId                  String
  submittedById               String
  reviewedById                String?
  createdAt                   DateTime @default(now())
  updatedAt                   DateTime

  // Relations
  Employee                    Employee @relation(fields: [employeeId], references: [id])
  SubmittedBy                 User     @relation("PromotionRequest_submittedByIdToUser", fields: [submittedById], references: [id])
  ReviewedBy                  User?    @relation("PromotionRequest_reviewedByIdToUser", fields: [reviewedById], references: [id])
}
```

### 7.2 TypeScript Interfaces

#### 7.2.1 ApiResponse Generic

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
```

#### 7.2.2 Role Type

```typescript
type Role =
  | 'HRO' // HR Officer (institution-level)
  | 'HHRMD' // Head of HR Management Division
  | 'HRMO' // HR Management Officer
  | 'DO' // Director's Office
  | 'CSCS' // Commission Secretary
  | 'EMP' // Employee (self-service)
  | 'PO' // Personnel Officer
  | 'HRRP' // HR Research & Planning
  | 'ADMIN'; // System Administrator
```

---

## 8. Error Handling

### 8.1 Error Handling Strategy

#### 8.1.1 API Error Response Format

```typescript
// Standard error response
{
  success: false
  message: string       // User-friendly message
  errors?: string[]     // Detailed validation errors
}
```

#### 8.1.2 HTTP Status Codes

| Code    | Meaning               | Usage                      |
| ------- | --------------------- | -------------------------- |
| **200** | OK                    | Successful request         |
| **400** | Bad Request           | Missing/invalid parameters |
| **401** | Unauthorized          | Authentication failed      |
| **403** | Forbidden             | Insufficient permissions   |
| **404** | Not Found             | Resource doesn't exist     |
| **500** | Internal Server Error | Server error               |

#### 8.1.3 Error Handling Pattern in API Routes

```typescript
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validation errors (400)
    if (!body.requiredField) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required field: requiredField',
        },
        { status: 400 }
      );
    }

    // Not found errors (404)
    const resource = await db.resource.findUnique({ where: { id } });
    if (!resource) {
      return NextResponse.json(
        {
          success: false,
          message: 'Resource not found',
        },
        { status: 404 }
      );
    }

    // Business logic errors (403)
    if (!canPerformAction(user, resource)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Insufficient permissions',
        },
        { status: 403 }
      );
    }

    // Success (200)
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Server errors (500)
    console.error('[API_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

### 8.2 Client-Side Error Handling

```typescript
// In React components
const handleSubmit = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await apiClient.createResource(data);

    if (!response.success) {
      // Display error message to user
      setError(response.message || 'Operation failed');
      return;
    }

    // Success - update UI
    setData(response.data);
    toast.success('Operation successful');
  } catch (error) {
    // Network error or unexpected error
    setError('An unexpected error occurred');
    console.error('Submit error:', error);
  } finally {
    setLoading(false);
  }
};
```

### 8.3 Validation Error Handling (Zod)

```typescript
import { z } from 'zod';

const requestSchema = z
  .object({
    employeeId: z.string().uuid(),
    promotionType: z.enum(['Experience', 'Education']),
    proposedCadre: z.string().min(1).optional(),
  })
  .refine((data) => data.promotionType === 'Education' || data.proposedCadre, {
    message: 'Proposed cadre is required for experience-based promotions',
    path: ['proposedCadre'],
  });

try {
  const validatedData = requestSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: 'Validation failed',
        errors: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      },
      { status: 400 }
    );
  }
}
```

---

## 9. Appendices

### Appendix A: Type Definitions

**Complete TypeScript Type Definitions:**

```typescript
// /src/lib/types.ts

export type Role =
  | 'HRO'
  | 'HHRMD'
  | 'HRMO'
  | 'DO'
  | 'CSCS'
  | 'EMP'
  | 'PO'
  | 'HRRP'
  | 'ADMIN';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  employeeId?: string;
  institutionId: string;
  institution?: Institution;
  createdAt: Date;
  updatedAt: Date;
  phoneNumber?: string;
  email?: string;
}

export interface Employee {
  id: string;
  employeeEntityId?: string;
  name: string;
  gender: string;
  profileImageUrl?: string;
  dateOfBirth?: Date;
  placeOfBirth?: string;
  region?: string;
  countryOfBirth?: string;
  zanId: string;
  phoneNumber?: string;
  contactAddress?: string;
  zssfNumber?: string;
  payrollNumber?: string;
  cadre?: string;
  salaryScale?: string;
  ministry?: string;
  department?: string;
  appointmentType?: string;
  contractType?: string;
  recentTitleDate?: Date;
  currentReportingOffice?: string;
  currentWorkplace?: string;
  employmentDate?: Date;
  confirmationDate?: Date;
  retirementDate?: Date;
  status?: string;
  institutionId: string;
  institution?: Institution;
}

export interface Institution {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  voteNumber?: string;
  tinNumber?: string;
}

export interface Request {
  id: string;
  status: string;
  reviewStage: string;
  documents: string[];
  rejectionReason?: string;
  employeeId: string;
  submittedById: string;
  reviewedById?: string;
  createdAt: Date;
  updatedAt: Date;
  employee?: Employee;
  submittedBy?: User;
  reviewedBy?: User;
}

export interface PromotionRequest extends Request {
  proposedCadre: string;
  promotionType: 'Experience' | 'Education';
  studiedOutsideCountry?: boolean;
  commissionDecisionReason?: string;
}

export interface ConfirmationRequest extends Request {
  decisionDate?: Date;
  commissionDecisionDate?: Date;
}

export interface LwopRequest extends Request {
  duration: string;
  reason: string;
  startDate?: Date;
  endDate?: Date;
}

export interface Notification {
  id: string;
  message: string;
  link?: string;
  isRead: boolean;
  userId: string;
  createdAt: Date;
}

export interface Complaint {
  id: string;
  complaintType: string;
  subject: string;
  details: string;
  complainantPhoneNumber: string;
  nextOfKinPhoneNumber: string;
  attachments: string[];
  status: string;
  reviewStage: string;
  officerComments?: string;
  internalNotes?: string;
  rejectionReason?: string;
  complainantId: string;
  assignedOfficerRole: string;
  reviewedById?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Appendix B: Constants

```typescript
// /src/lib/constants.ts

export const ROLES = {
  HRO: 'HRO',
  HHRMD: 'HHRMD',
  HRMO: 'HRMO',
  DO: 'DO',
  CSCS: 'CSCS',
  EMP: 'EMP',
  PO: 'PO',
  HRRP: 'HRRP',
  ADMIN: 'ADMIN',
} as const;

export const REQUEST_STATUSES = {
  PENDING: 'Pending HRMO/HHRMD Review',
  PENDING_DO: 'Pending DO Review',
  PENDING_COMMISSION: 'Pending Commission',
  APPROVED: 'Approved by Commission',
  REJECTED: 'Rejected',
} as const;

export const REVIEW_STAGES = {
  INITIAL: 'initial',
  HRMD_APPROVED: 'hrmd_approved',
  DO_APPROVED: 'do_approved',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const FILE_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_IMAGE_SIZE: 1 * 1024 * 1024, // 1MB
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
} as const;
```

### Appendix C: Database Indices

**Recommended Indices for Performance:**

```sql
-- User table indices
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_user_institution ON "User"("institutionId");
CREATE INDEX idx_user_employee ON "User"("employeeId");

-- Employee table indices
CREATE INDEX idx_employee_zanid ON "Employee"("zanId");
CREATE INDEX idx_employee_payroll ON "Employee"("payrollNumber");
CREATE INDEX idx_employee_institution ON "Employee"("institutionId");
CREATE INDEX idx_employee_status ON "Employee"(status);

-- Request table indices (example: PromotionRequest)
CREATE INDEX idx_promotion_employee ON "PromotionRequest"("employeeId");
CREATE INDEX idx_promotion_status ON "PromotionRequest"(status);
CREATE INDEX idx_promotion_stage ON "PromotionRequest"("reviewStage");
CREATE INDEX idx_promotion_submitted ON "PromotionRequest"("submittedById");
CREATE INDEX idx_promotion_reviewed ON "PromotionRequest"("reviewedById");
CREATE INDEX idx_promotion_created ON "PromotionRequest"("createdAt");

-- Notification indices
CREATE INDEX idx_notification_user ON "Notification"("userId");
CREATE INDEX idx_notification_read ON "Notification"("isRead");
CREATE INDEX idx_notification_created ON "Notification"("createdAt");
```

### Appendix D: Environment Variables

```bash
# Application
NODE_ENV=production
PORT=9002
NEXT_PUBLIC_API_URL=https://csms.zanzibar.go.tz/api
NEXT_PUBLIC_BACKEND_URL=https://csms.zanzibar.go.tz

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/csms?schema=public"

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=10m

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=documents

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@csms.go.tz
SMTP_PASSWORD=your-password
SMTP_FROM=CSMS <noreply@csms.go.tz>

# HRIMS Integration
HRIMS_API_URL=https://hrims-api.example.com
HRIMS_API_KEY=your-api-key
HRIMS_MOCK_MODE=false

# Google AI (Genkit)
GOOGLE_API_KEY=your-google-api-key
```

---

## Document Approval

**Prepared By:**

- Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Title: Lead Developer
- Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Date: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

**Reviewed By:**

- Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Title: System Architect
- Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Date: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

**Approved By:**

- Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Title: IT Department Head
- Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Date: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

## Revision History

| Version | Date         | Author   | Changes                           |
| ------- | ------------ | -------- | --------------------------------- |
| 0.1     | Dec 15, 2025 | Dev Team | Initial draft                     |
| 0.5     | Dec 20, 2025 | Dev Team | Added sequence diagrams           |
| 1.0     | Dec 25, 2025 | Dev Team | Final version - comprehensive LLD |

---

**END OF LOW-LEVEL DESIGN DOCUMENT**

_This document is confidential and proprietary to the Civil Service Commission of Zanzibar._

_For technical questions, contact: dev-team@csms.go.tz_

_Version 1.0 | December 25, 2025_

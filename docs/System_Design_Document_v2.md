# SYSTEM DESIGN DOCUMENT (SDD) V2

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | System Design Document V2 |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 2.0 |
| **Previous Version** | 1.0 (December 25, 2025) |
| **Date** | January 19, 2026 |
| **Status** | APPROVED |
| **Prepared For** | Zanzibar Civil Service Commission |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 25, 2025 | Architecture Team | Initial design document |
| 2.0 | Jan 19, 2026 | CSMS Technical Team | Updated with production findings, load test results, background job architecture |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Security Architecture](#6-security-architecture)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Background Job Processing](#8-background-job-processing)
9. [File Storage Architecture](#9-file-storage-architecture)
10. [User Interface Design](#10-user-interface-design)
11. [External Integrations](#11-external-integrations)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Performance & Scalability](#13-performance--scalability)
14. [Monitoring & Logging](#14-monitoring--logging)
15. [Testing Architecture](#15-testing-architecture)
16. [Disaster Recovery](#16-disaster-recovery)
17. [Appendices](#17-appendices)

---

## 1. Executive Summary

### 1.1 Overview

The Civil Service Management System (CSMS) is a comprehensive web-based application designed for the Zanzibar Civil Service Commission to manage the complete lifecycle of civil service employees. This document provides detailed technical specifications for the system architecture, database design, API structure, security implementation, and deployment configuration.

### 1.2 System Purpose

CSMS provides:
- **Employee Lifecycle Management**: Hire, confirm, promote, transfer, and separate employees
- **Request Workflow Processing**: 9 types of HR requests with multi-stage approval workflows
- **Complaint Management**: Employee complaint submission and resolution tracking
- **HRIMS Integration**: Real-time synchronization with external HRIMS system
- **Comprehensive Reporting**: Custom reports with export capabilities
- **Audit Trail**: Complete action logging for compliance and security

### 1.3 Key Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Security First** | RBAC, CSRF protection, audit logging, encrypted storage |
| **Scalability** | Background job processing, connection pooling, caching |
| **Maintainability** | TypeScript strict mode, automated testing, clean architecture |
| **Performance** | Parallel queries, optimized indexes, response caching |
| **Reliability** | Error handling, retry mechanisms, graceful degradation |

### 1.4 System Statistics

| Metric | Value |
|--------|-------|
| TypeScript Files | 218 |
| API Endpoints | 78+ |
| Database Models | 17 |
| User Roles | 9 |
| Request Types | 9 |
| Test Files | 8 |
| Unit Tests | 407+ |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  React Server   │  │  React Client   │  │    Tailwind     │             │
│  │   Components    │  │   Components    │  │   + Radix UI    │             │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘             │
└───────────┼─────────────────────┼───────────────────────────────────────────┘
            │                     │
┌───────────┼─────────────────────┼───────────────────────────────────────────┐
│           │    APPLICATION LAYER (Next.js 16)                               │
│  ┌────────▼─────────────────────▼────────┐  ┌─────────────────────────────┐ │
│  │           Next.js API Routes          │  │      Next.js Middleware     │ │
│  │         (78+ REST Endpoints)          │  │   (Auth, RBAC, Logging)     │ │
│  └────────────────────┬──────────────────┘  └─────────────────────────────┘ │
│                       │                                                      │
│  ┌────────────────────▼──────────────────┐  ┌─────────────────────────────┐ │
│  │           Service Layer               │  │     Background Workers      │ │
│  │   (Business Logic, Validation)        │  │   (BullMQ + Redis)          │ │
│  └────────────────────┬──────────────────┘  └──────────────┬──────────────┘ │
└───────────────────────┼─────────────────────────────────────┼───────────────┘
                        │                                     │
┌───────────────────────┼─────────────────────────────────────┼───────────────┐
│                       │    DATA ACCESS LAYER                │               │
│  ┌────────────────────▼──────────────────────────────────────▼─────────────┐│
│  │                         Prisma ORM 6.19                                 ││
│  │              (Type-safe queries, migrations, seeding)                   ││
│  └─────────────────────────────────┬───────────────────────────────────────┘│
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                                    │    DATA LAYER                          │
│  ┌─────────────────┐  ┌────────────▼────────────┐  ┌─────────────────────┐  │
│  │      Redis      │  │     PostgreSQL 15       │  │       MinIO         │  │
│  │   (Job Queue)   │  │     (Primary DB)        │  │  (Object Storage)   │  │
│  └─────────────────┘  └─────────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         EXTERNAL INTEGRATIONS                               │
│  ┌─────────────────────────────────▼───────────────────────────────────────┐│
│  │                          HRIMS API                                      ││
│  │           (External Employee Data Synchronization)                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layered Architecture

| Layer | Responsibility | Technologies |
|-------|---------------|--------------|
| **Presentation** | User interface, routing, forms | React 19, Next.js 16, Tailwind CSS, Radix UI |
| **API** | Request handling, validation, response formatting | Next.js API Routes, Zod validation |
| **Middleware** | Authentication, authorization, logging | Next.js Middleware, Custom middleware |
| **Service** | Business logic, workflow orchestration | TypeScript services |
| **Data Access** | Database queries, ORM operations | Prisma ORM 6.19 |
| **Data** | Persistent storage | PostgreSQL 15, MinIO, Redis |

### 2.3 Component Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CSMS Component Architecture                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    Auth     │  │  Employee   │  │   Request   │  │  Complaint  │     │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Report    │  │    Admin    │  │    Audit    │  │   HRIMS     │     │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │   Files     │  │Notification │  │   Session   │                      │
│  │   Module    │  │   Module    │  │   Module    │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Module Descriptions

| Module | Purpose | Key Features |
|--------|---------|--------------|
| **Auth** | User authentication | Login, logout, password reset, OTP, session management |
| **Employee** | Employee data management | CRUD operations, document storage, certificate management |
| **Request** | HR request workflows | 9 request types, multi-stage approval, status tracking |
| **Complaint** | Complaint handling | Submission, assignment, resolution, escalation |
| **Report** | Report generation | Custom queries, PDF/Excel export, scheduled reports |
| **Admin** | System administration | User management, settings, system configuration |
| **Audit** | Security logging | Action tracking, compliance reporting, access logs |
| **HRIMS** | External integration | Employee sync, document fetch, background processing |
| **Files** | File operations | Upload, download, preview, MinIO integration |
| **Notification** | User notifications | In-app alerts, status updates |
| **Session** | Session management | Multi-device tracking, forced logout, suspicious activity |

---

## 3. Technology Stack

### 3.1 Core Technologies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Next.js | 16.0.7 | Full-stack React framework |
| **Language** | TypeScript | 5.x | Type-safe development |
| **UI Library** | React | 19.2.1 | Component-based UI |
| **Database** | PostgreSQL | 15.x | Primary relational database |
| **ORM** | Prisma | 6.19.1 | Type-safe database access |
| **Object Storage** | MinIO | 8.0.5 | File and document storage |
| **Job Queue** | BullMQ | 5.66.4 | Background job processing |
| **Cache/Queue** | Redis (ioredis) | 5.8.2 | Caching and job queue backend |
| **Styling** | Tailwind CSS | 3.4.17 | Utility-first CSS framework |
| **UI Components** | Radix UI | Various | Accessible component primitives |

### 3.2 Development & Testing

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Unit Testing** | Vitest | 4.0.16 | Fast unit test runner |
| **E2E Testing** | Playwright | 1.57.0 | End-to-end browser testing |
| **Load Testing** | k6 | Latest | Performance and stress testing |
| **Linting** | ESLint | 8.57.1 | Code quality enforcement |
| **Formatting** | Prettier | 3.7.4 | Code style consistency |
| **Git Hooks** | Husky | 9.1.7 | Pre-commit quality gates |
| **Mocking** | MSW | 2.12.7 | API mocking for tests |

### 3.3 Security & Authentication

| Category | Technology | Purpose |
|----------|------------|---------|
| **Password Hashing** | bcryptjs | 2.4.3 | Secure password storage |
| **Validation** | Zod | 3.24.2 | Schema validation |
| **UUID Generation** | uuid | 11.1.0 | Unique identifier generation |
| **HTTP Client** | Axios | 1.9.0 | API requests with interceptors |

### 3.4 AI & Analytics

| Category | Technology | Purpose |
|----------|------------|---------|
| **AI Framework** | Google Genkit | 1.10.0 | AI-powered features |
| **Charting** | Recharts | 2.15.3 | Dashboard visualizations |
| **Date Handling** | date-fns | 4.1.0 | Date manipulation |

### 3.5 Production Infrastructure

| Category | Technology | Purpose |
|----------|------------|---------|
| **Process Manager** | PM2 | Cluster management, auto-restart |
| **Reverse Proxy** | Nginx | SSL termination, load balancing |
| **Control Panel** | aaPanel | Server management |
| **Operating System** | Ubuntu 24.04 LTS | Production server OS |

---

## 4. Database Design

### 4.1 Schema Overview

**Database:** PostgreSQL 15
**ORM:** Prisma 6.19.1
**Total Models:** 17

### 4.2 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CSMS Database Schema                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     1:M      ┌─────────────┐     1:M      ┌─────────────────┐
│ Institution │◄────────────►│  Employee   │◄────────────►│ EmployeeCertif. │
└─────────────┘              └─────────────┘              └─────────────────┘
      │                            │
      │ 1:M                        │ 1:M (All Request Types)
      ▼                            ▼
┌─────────────┐              ┌─────────────────────────────────────────────┐
│    User     │              │                                             │
└─────────────┘              │  ┌──────────────┐  ┌────────────────────┐   │
      │                      │  │ Confirmation │  │    Promotion       │   │
      │ 1:M                  │  │   Request    │  │     Request        │   │
      ▼                      │  └──────────────┘  └────────────────────┘   │
┌─────────────┐              │                                             │
│  AuditLog   │              │  ┌──────────────┐  ┌────────────────────┐   │
└─────────────┘              │  │    LWOP      │  │    Retirement      │   │
      │                      │  │   Request    │  │     Request        │   │
┌─────────────┐              │  └──────────────┘  └────────────────────┘   │
│   Session   │              │                                             │
└─────────────┘              │  ┌──────────────┐  ┌────────────────────┐   │
      │                      │  │ Resignation  │  │   CadreChange      │   │
┌─────────────┐              │  │   Request    │  │     Request        │   │
│Notification │              │  └──────────────┘  └────────────────────┘   │
└─────────────┘              │                                             │
                             │  ┌──────────────┐  ┌────────────────────┐   │
┌─────────────┐              │  │ Separation   │  │ ServiceExtension   │   │
│  Complaint  │◄─────────────┤  │   Request    │  │     Request        │   │
└─────────────┘              │  └──────────────┘  └────────────────────┘   │
                             └─────────────────────────────────────────────┘

┌─────────────────┐
│ SystemSettings  │  (Standalone configuration table)
└─────────────────┘
```

### 4.3 Core Models

#### 4.3.1 User Model

```prisma
model User {
  id                      String    @id
  name                    String
  username                String    @unique
  password                String    // bcrypt hashed
  role                    String    // HRO|HHRMD|HRMO|DO|EMPLOYEE|CSCS|HRRP|PO|Admin
  active                  Boolean   @default(true)
  employeeId              String?   @unique
  institutionId           String

  // Password Policy Fields
  passwordHistory         String[]  @default([])
  isTemporaryPassword     Boolean   @default(false)
  temporaryPasswordExpiry DateTime?
  mustChangePassword      Boolean   @default(false)
  lastPasswordChange      DateTime?

  // Password Expiration Fields
  passwordExpiresAt       DateTime?
  lastExpirationWarning   Int?      @default(0)
  gracePeriodStartedAt    DateTime?

  // Account Lockout Fields
  failedLoginAttempts     Int       @default(0)
  loginLockedUntil        DateTime?
  loginLockoutReason      String?
  isManuallyLocked        Boolean   @default(false)

  // Session Tracking
  lastActivity            DateTime?

  // Relations
  Institution             Institution @relation(...)
  Employee                Employee?   @relation(...)
  AuditLog                AuditLog[]
  Session                 Session[]
  Notification            Notification[]

  // All request type relations (submittedBy, reviewedBy)
  ...
}
```

#### 4.3.2 Employee Model

```prisma
model Employee {
  id                    String    @id
  employeeEntityId      String?   // HRIMS entity ID
  name                  String
  gender                String
  profileImageUrl       String?
  dateOfBirth           DateTime?
  placeOfBirth          String?
  region                String?
  countryOfBirth        String?
  zanId                 String    @unique
  phoneNumber           String?
  contactAddress        String?
  zssfNumber            String?
  payrollNumber         String?
  cadre                 String?
  salaryScale           String?
  ministry              String?
  department            String?
  appointmentType       String?
  contractType          String?
  recentTitleDate       DateTime?
  currentReportingOffice String?
  currentWorkplace      String?
  employmentDate        DateTime?
  confirmationDate      DateTime?
  retirementDate        DateTime?
  status                String?   // On Probation|Confirmed|Retired|...

  // Document URLs
  ardhilHaliUrl         String?
  confirmationLetterUrl String?
  jobContractUrl        String?
  birthCertificateUrl   String?

  institutionId         String
  Institution           Institution @relation(...)

  // Performance Indexes
  @@index([name])
  @@index([payrollNumber])
  @@index([employmentDate(sort: Desc)])
  @@index([status, institutionId])
  @@index([institutionId])
}
```

#### 4.3.3 Request Model Pattern

All 9 request types follow a consistent pattern:

```prisma
model [RequestType]Request {
  id              String    @id
  status          String    // Pending|Approved|Rejected|...
  reviewStage     String    // HRMO Review|HHRMD Review|Commission|...
  documents       String[]  // Array of document URLs
  rejectionReason String?

  employeeId      String
  submittedById   String
  reviewedById    String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime

  // Type-specific fields...

  Employee        Employee  @relation(...)
  SubmittedBy     User      @relation(...)
  ReviewedBy      User?     @relation(...)

  @@index([status])
  @@index([reviewStage])
  @@index([employeeId])
  @@index([createdAt(sort: Desc)])
}
```

### 4.4 Request Types

| Request Type | Purpose | Unique Fields |
|--------------|---------|---------------|
| **ConfirmationRequest** | Employee confirmation after probation | decisionDate, commissionDecisionDate |
| **PromotionRequest** | Employee promotion | proposedCadre, finalCadre, promotionType |
| **LwopRequest** | Leave Without Pay | duration, startDate, endDate, reason |
| **RetirementRequest** | Normal/early/medical retirement | retirementType, proposedDate, illnessDescription |
| **ResignationRequest** | Voluntary resignation | effectiveDate, reason |
| **CadreChangeRequest** | Career path change | originalCadre, newCadre, studiedOutsideCountry |
| **SeparationRequest** | Employment termination | type (Termination/Dismissal), reason |
| **ServiceExtensionRequest** | Retirement extension | currentRetirementDate, requestedExtensionPeriod |

### 4.5 Security & Audit Models

#### AuditLog Model

```prisma
model AuditLog {
  id              String   @id @default(cuid())
  eventType       String   // UNAUTHORIZED_ACCESS, LOGIN_FAILED, ACCESS_DENIED
  eventCategory   String   // SECURITY, ACCESS, AUTHENTICATION
  severity        String   // INFO, WARNING, ERROR, CRITICAL
  userId          String?
  username        String?
  userRole        String?
  ipAddress       String?
  userAgent       String?
  attemptedRoute  String
  requestMethod   String?
  isAuthenticated Boolean  @default(false)
  wasBlocked      Boolean  @default(true)
  blockReason     String?
  timestamp       DateTime @default(now())
  additionalData  Json?

  User            User?    @relation(...)

  @@index([userId])
  @@index([timestamp])
  @@index([eventType])
  @@index([eventCategory])
  @@index([severity])
  @@index([attemptedRoute])
}
```

#### Session Model

```prisma
model Session {
  id           String   @id @default(cuid())
  userId       String
  sessionToken String   @unique
  ipAddress    String?
  userAgent    String?
  deviceInfo   String?
  location     String?
  createdAt    DateTime @default(now())
  lastActivity DateTime @default(now())
  expiresAt    DateTime
  isSuspicious Boolean  @default(false)

  User         User     @relation(...)

  @@index([userId])
  @@index([sessionToken])
  @@index([expiresAt])
}
```

### 4.6 Indexing Strategy

| Index Type | Fields | Purpose |
|------------|--------|---------|
| **Primary Key** | All `id` fields | Unique row identification |
| **Unique** | zanId, username, sessionToken, name (Institution) | Data integrity |
| **Search** | name, payrollNumber | Fast employee search |
| **Foreign Key** | institutionId, employeeId, userId | Join optimization |
| **Status** | status, reviewStage | Workflow queries |
| **Temporal** | createdAt DESC, employmentDate DESC | Recent records |
| **Composite** | status + institutionId, eventType + timestamp | Complex queries |

---

## 5. API Design

### 5.1 API Structure

**Base URL:** `/api/`
**Total Endpoints:** 78+
**Authentication:** Cookie-based sessions
**Response Format:** JSON

### 5.2 Endpoint Categories

#### Authentication (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Staff login |
| POST | `/api/auth/employee-login` | Employee portal login |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/session` | Get current session |
| GET | `/api/auth/sessions` | List user sessions |
| POST | `/api/auth/sessions/force-logout` | Force logout session |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/password-status` | Check password expiration |
| GET | `/api/auth/account-lockout-status` | Check lockout status |
| POST | `/api/auth/activity` | Update last activity |

#### Employees (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/employees` | List employees (paginated) |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get employee details |
| PATCH | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Delete employee |
| GET | `/api/employees/search` | Search employees |
| GET | `/api/employees/urgent-actions` | Get pending actions |
| GET | `/api/employees/[id]/certificates` | Get certificates |
| GET | `/api/employees/[id]/documents` | Get documents |
| POST | `/api/employees/[id]/fetch-photo` | Fetch HRIMS photo |
| POST | `/api/employees/[id]/fetch-documents` | Fetch HRIMS documents |

#### Requests (36+ endpoints)

Each request type (9 types) has similar endpoints:

| Method | Pattern | Description |
|--------|---------|-------------|
| GET | `/api/{type}` | List requests |
| POST | `/api/{type}` | Create request |
| GET | `/api/{type}/[id]` | Get request |
| PATCH | `/api/{type}/[id]` | Update/review request |
| GET | `/api/requests/track` | Track request status |

**Request Types:**
- `/api/confirmations`
- `/api/promotions`
- `/api/lwop`
- `/api/retirement`
- `/api/resignation`
- `/api/cadre-change`
- `/api/service-extension`
- `/api/termination`
- `/api/complaints`

#### Files (6 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file to MinIO |
| GET | `/api/files/download/[...objectKey]` | Download file (streaming) |
| GET | `/api/files/preview/[...objectKey]` | Preview file |
| GET | `/api/files/exists/[...objectKey]` | Check file exists |
| GET | `/api/files/employee-photos/[filename]` | Get employee photo |
| GET | `/api/files/employee-documents/[filename]` | Get employee document |

#### HRIMS Integration (10 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/hrims/fetch-by-institution` | Sync institution employees |
| POST | `/api/hrims/fetch-employee` | Fetch single employee |
| GET | `/api/hrims/search-employee` | Search HRIMS |
| POST | `/api/hrims/bulk-fetch` | Queue bulk fetch job |
| GET | `/api/hrims/sync-status/[jobId]` | Get job status |
| POST | `/api/hrims/sync-employee` | Sync employee data |
| POST | `/api/hrims/sync-documents` | Sync documents |
| POST | `/api/hrims/sync-certificates` | Sync certificates |
| POST | `/api/hrims/fetch-photos-by-institution` | Bulk fetch photos |
| POST | `/api/hrims/fetch-documents-by-institution` | Bulk fetch documents |
| GET | `/api/hrims/test` | Test HRIMS connection |

#### Admin (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| GET | `/api/users/[id]` | Get user |
| PATCH | `/api/users/[id]` | Update user |
| POST | `/api/admin/lock-account` | Lock user account |
| POST | `/api/admin/unlock-account` | Unlock user account |
| POST | `/api/admin/reset-password` | Reset user password |
| POST | `/api/admin/cleanup-sessions` | Clean expired sessions |
| GET | `/api/admin/hrims-settings` | Get HRIMS configuration |
| POST | `/api/admin/hrims-settings` | Update HRIMS configuration |

#### Other (8 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/institutions` | List institutions |
| GET | `/api/institutions/[id]` | Get institution |
| PATCH | `/api/institutions/[id]` | Update institution |
| GET | `/api/dashboard/metrics` | Dashboard statistics |
| GET | `/api/notifications` | User notifications |
| GET | `/api/reports` | Generate reports |
| GET | `/api/audit/logs` | Get audit logs |
| POST | `/api/audit/log` | Create audit log |

### 5.3 Response Formats

#### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "size": 50,
      "total": 500,
      "totalPages": 10
    }
  }
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### 5.4 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized (RBAC) |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limited |
| 500 | Internal Server Error | Server errors |

---

## 6. Security Architecture

### 6.1 Security Overview

**Security Score:** 95% EXCELLENT

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    NETWORK SECURITY                                 │   │
│  │  • TLS 1.2/1.3 encryption • HTTPS enforcement • Nginx reverse proxy│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                    APPLICATION SECURITY                             │   │
│  │  • CSRF protection • XSS prevention • SQL injection prevention     │   │
│  │  • Input validation (Zod) • Security headers (12 headers)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                    AUTHENTICATION                                   │   │
│  │  • bcrypt password hashing • Session-based auth • Account lockout  │   │
│  │  • Password expiration • Password complexity • OTP verification    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                    AUTHORIZATION (RBAC)                             │   │
│  │  • 9 user roles • Route-level permissions • Middleware enforcement │   │
│  │  • Institution-scoped access • Data-level filtering                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                    AUDIT & COMPLIANCE                               │   │
│  │  • Comprehensive audit logging • Security event tracking           │   │
│  │  • Access attempt logging • Data change history                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Security Headers

The following headers are configured in `next.config.ts`:

| Header | Value | Purpose |
|--------|-------|---------|
| X-DNS-Prefetch-Control | off | Disable DNS prefetching |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer control |
| X-XSS-Protection | 1; mode=block | XSS filter |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Feature restrictions |
| Content-Security-Policy | default-src 'self'... | XSS prevention |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Force HTTPS |
| X-Permitted-Cross-Domain-Policies | none | Cross-domain restrictions |
| X-Download-Options | noopen | IE download security |
| Cache-Control | no-store, max-age=0 | Prevent caching |
| Pragma | no-cache | HTTP 1.0 cache control |

### 6.3 OWASP Top 10 Compliance

| Vulnerability | Status | Implementation |
|--------------|--------|----------------|
| A01:2021 Broken Access Control | MITIGATED | RBAC middleware, route permissions |
| A02:2021 Cryptographic Failures | MITIGATED | bcrypt, TLS, AES-256 (MinIO) |
| A03:2021 Injection | MITIGATED | Prisma ORM, Zod validation |
| A04:2021 Insecure Design | MITIGATED | Security-first architecture |
| A05:2021 Security Misconfiguration | MITIGATED | TypeScript strict mode, security headers |
| A06:2021 Vulnerable Components | MITIGATED | Regular dependency updates |
| A07:2021 Auth Failures | MITIGATED | Account lockout, password policy |
| A08:2021 Data Integrity Failures | MITIGATED | CSRF protection, audit logging |
| A09:2021 Security Logging | MITIGATED | Comprehensive AuditLog model |
| A10:2021 SSRF | MITIGATED | URL validation, allowlisted endpoints |

---

## 7. Authentication & Authorization

### 7.1 Authentication Flow

```
┌────────────┐     POST /login      ┌─────────────┐
│   Client   │─────────────────────►│   Server    │
│            │   {username, pass}   │             │
└────────────┘                      └──────┬──────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ Validate     │
                                    │ Credentials  │
                                    └──────┬───────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
       ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
       │ Check        │           │ Verify       │           │ Check        │
       │ Account Lock │           │ Password     │           │ Password     │
       │              │           │ (bcrypt)     │           │ Expiration   │
       └──────┬───────┘           └──────┬───────┘           └──────┬───────┘
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │ Create       │
                                  │ Session      │
                                  └──────┬───────┘
                                         │
                                         ▼
┌────────────┐    Set-Cookie        ┌──────────────┐
│   Client   │◄─────────────────────│   Server     │
│            │  {auth-storage}      │              │
└────────────┘                      └──────────────┘
```

### 7.2 Password Policy

| Policy | Setting | Purpose |
|--------|---------|---------|
| Minimum Length | 8 characters | Basic security |
| Complexity | Uppercase, lowercase, number, special char | Strength |
| History | Last 3 passwords | Prevent reuse |
| Expiration | 60/90 days (configurable) | Regular rotation |
| Grace Period | 7 days after expiration | User notification |
| Temporary Password | 24-hour expiry | Forced change |

### 7.3 Account Lockout Policy

| Trigger | Action | Duration |
|---------|--------|----------|
| 5 failed login attempts | Automatic lockout | 30 minutes |
| 3 failed password change attempts | Lockout | 30 minutes |
| Manual admin lock | Permanent until unlocked | Until admin unlocks |
| Suspicious activity | Flag session | Until review |

### 7.4 Role-Based Access Control (RBAC)

#### 7.4.1 User Roles

| Role | Code | Scope | Description |
|------|------|-------|-------------|
| Human Resource Officer | HRO | Institution | Submit requests for own institution |
| HR Registry & Pension | HRRP | Institution | View requests for own institution |
| Head HRMD | HHRMD | CSC-wide | Approve all requests |
| HR Management Officer | HRMO | CSC-wide | Approve HR requests (not disciplinary) |
| Disciplinary Officer | DO | CSC-wide | Handle disciplinary cases and complaints |
| Civil Service Commission Secretary | CSCS | CSC-wide | Executive oversight, view all |
| Planning Officer | PO | CSC-wide | Reports and analytics only |
| Employee | EMPLOYEE | Self | View own data, submit complaints |
| Administrator | Admin | System | User management, system configuration |

#### 7.4.2 Route Permissions

```typescript
const ROUTE_PERMISSIONS = [
  // Admin-only routes
  { pattern: /^\/dashboard\/admin/, allowedRoles: ['Admin'] },

  // HR Officer routes
  {
    pattern: '/dashboard/confirmation',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP']
  },
  {
    pattern: '/dashboard/promotion',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP']
  },

  // Disciplinary routes (DO, not HRMO)
  {
    pattern: '/dashboard/termination',
    allowedRoles: ['HRO', 'DO', 'HHRMD', 'CSCS', 'HRRP']
  },

  // Complaints (Employee can submit)
  {
    pattern: '/dashboard/complaints',
    allowedRoles: ['EMPLOYEE', 'DO', 'HHRMD', 'CSCS']
  },

  // Reports (includes PO)
  {
    pattern: '/dashboard/reports',
    allowedRoles: ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'HRRP', 'PO']
  },
];
```

### 7.5 Session Management

| Feature | Implementation |
|---------|----------------|
| Session Storage | Database (Session model) + Cookies |
| Session Token | Secure random UUID |
| Session Expiry | Configurable (default 10 minutes idle) |
| Multi-device | Track all active sessions |
| Force Logout | Admin can terminate sessions |
| Suspicious Flag | Automatic detection of anomalies |

---

## 8. Background Job Processing

### 8.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BACKGROUND JOB ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐     Queue Job      ┌───────────────┐     Process     ┌───────┐
│  API Route    │───────────────────►│    Redis      │◄───────────────►│Worker │
│  (Producer)   │                    │   (BullMQ)    │                 │Process│
└───────────────┘                    └───────┬───────┘                 └───────┘
       │                                     │                              │
       │                                     │                              │
       ▼                                     ▼                              ▼
┌───────────────┐                    ┌───────────────┐              ┌───────────┐
│  Return       │                    │  Job Status   │              │ Update DB │
│  Job ID       │                    │  Tracking     │              │ Progress  │
└───────────────┘                    └───────────────┘              └───────────┘
```

### 8.2 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Job Queue** | BullMQ 5.66.4 | Job scheduling and processing |
| **Queue Backend** | Redis (ioredis 5.8.2) | Job persistence |
| **Process Manager** | PM2 | Worker process management |

### 8.3 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'csms-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      max_memory_restart: '1G',
      env: { NODE_ENV: 'production', PORT: 9002 }
    },
    {
      name: 'redis-worker',
      script: 'npm',
      args: 'run worker',
      instances: 1,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'genkit-ai',
      script: 'npm',
      args: 'run genkit:dev',
      instances: 1,
      max_memory_restart: '500M'
    }
  ]
};
```

### 8.4 HRIMS Sync Worker

**Queue Name:** `hrims-sync`
**Concurrency:** 2 parallel jobs
**Rate Limit:** 5 jobs per minute

#### Job Flow:

```
1. API receives sync request
       │
       ▼
2. Add job to BullMQ queue
       │
       ▼
3. Return jobId immediately
       │
       ▼
4. Worker picks up job
       │
       ▼
5. Fetch employees from HRIMS (paginated)
       │
       ▼
6. Update progress (via job.updateProgress)
       │
       ▼
7. Save employees to database (batch)
       │
       ▼
8. Mark job complete
```

#### Worker Configuration:

```typescript
const worker = new Worker<HRIMSSyncJobData>(
  HRIMS_SYNC_QUEUE_NAME,
  processHRIMSSyncJob,
  {
    connection: createRedisConnection(),
    concurrency: 2,          // Process 2 jobs in parallel
    limiter: {
      max: 5,                // Max 5 jobs
      duration: 60000,       // per minute
    },
  }
);
```

### 8.5 Job Types

| Job Type | Queue | Purpose | Timeout |
|----------|-------|---------|---------|
| HRIMS Sync | hrims-sync | Sync institution employees | 15 minutes |
| Document Sync | hrims-sync | Fetch employee documents | 10 minutes |
| Photo Sync | hrims-sync | Fetch employee photos | 10 minutes |

---

## 9. File Storage Architecture

### 9.1 MinIO Configuration

**Technology:** MinIO 8.0.5
**Bucket:** csms-bucket
**Access:** Private (authenticated)

### 9.2 Storage Structure

```
csms-bucket/
├── employee-photos/
│   └── {employeeId}/
│       └── profile.{jpg|png}
├── employee-documents/
│   └── {employeeId}/
│       └── {documentType}_{timestamp}.pdf
├── certificates/
│   └── {employeeId}/
│       └── {certificateId}.pdf
├── request-attachments/
│   └── {requestType}/
│       └── {requestId}/
│           └── {documentId}.pdf
├── complaint-attachments/
│   └── {complaintId}/
│       └── {attachmentId}.{ext}
└── reports/
    └── {reportType}/
        └── {timestamp}_{reportId}.{pdf|xlsx}
```

### 9.3 File Upload Flow

```
┌──────────┐    POST /api/files/upload     ┌──────────┐
│  Client  │──────────────────────────────►│   API    │
│          │   FormData (file, folder)     │  Route   │
└──────────┘                               └────┬─────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    │                           │                           │
                    ▼                           ▼                           ▼
             ┌──────────────┐           ┌──────────────┐           ┌──────────────┐
             │ Validate     │           │ Generate     │           │ Upload to    │
             │ File Type    │           │ Unique Key   │           │ MinIO        │
             │ & Size       │           │              │           │              │
             └──────────────┘           └──────────────┘           └──────────────┘
                                                                          │
                                                                          ▼
┌──────────┐     { url, key, size }      ┌──────────┐              ┌──────────────┐
│  Client  │◄────────────────────────────│   API    │◄─────────────│ Return       │
│          │                             │  Route   │              │ File URL     │
└──────────┘                             └──────────┘              └──────────────┘
```

### 9.4 File Download Flow (Streaming)

```typescript
// Streaming download implementation
const fileStream = await downloadFile(objectKey);

const readable = new ReadableStream({
  start(controller) {
    fileStream.on('data', (chunk: Buffer) => {
      controller.enqueue(new Uint8Array(chunk));
    });
    fileStream.on('end', () => {
      controller.close();
    });
  }
});

return new NextResponse(readable, {
  headers: {
    'Content-Type': metadata.contentType,
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': metadata.size.toString()
  }
});
```

### 9.5 File Validation

| Validation | Rule | Purpose |
|------------|------|---------|
| File Type | PDF, JPEG, PNG only | Security |
| File Size | Max 2MB (standard), 1MB (complaints) | Performance |
| Filename | Sanitized, no special characters | Security |
| Content-Type | Server-side verification | Prevent MIME spoofing |

---

## 10. User Interface Design

### 10.1 Design System

**Framework:** Tailwind CSS 3.4.17 + Radix UI
**Icons:** Lucide React 0.511.0

### 10.2 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #2563eb | Buttons, links, active states |
| Success | #10b981 | Success messages, approved status |
| Warning | #f59e0b | Warning messages, pending status |
| Error | #ef4444 | Error messages, rejected status |
| Neutral | #6b7280 | Text, borders |

### 10.3 Component Library

| Component | Source | Usage |
|-----------|--------|-------|
| Button | Radix UI + Custom | Actions, submissions |
| Dialog/Modal | Radix UI | Confirmations, forms |
| Select | Radix UI | Dropdowns |
| Tabs | Radix UI | Navigation |
| Table | Custom | Data display |
| Form | React Hook Form + Zod | Input handling |
| Toast | Sonner | Notifications |
| Calendar | react-day-picker | Date selection |
| Charts | Recharts | Dashboard visualizations |

### 10.4 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Header: Logo | Navigation | Notifications | User Menu                       │
├────────────────┬────────────────────────────────────────────────────────────┤
│                │                                                            │
│   Sidebar      │                  Main Content Area                         │
│                │                                                            │
│   - Dashboard  │   ┌────────────────────────────────────────────────────┐   │
│   - Employees  │   │  Breadcrumbs: Dashboard > Employees > View         │   │
│   - Requests   │   └────────────────────────────────────────────────────┘   │
│     > Confirm  │                                                            │
│     > Promote  │   ┌────────────────────────────────────────────────────┐   │
│     > LWOP     │   │                                                    │   │
│     > ...      │   │              Page Content                          │   │
│   - Complaints │   │                                                    │   │
│   - Reports    │   │   - Forms                                          │   │
│   - Admin      │   │   - Tables                                         │   │
│                │   │   - Cards                                          │   │
│                │   │   - Charts                                         │   │
│                │   │                                                    │   │
│                │   └────────────────────────────────────────────────────┘   │
│                │                                                            │
├────────────────┴────────────────────────────────────────────────────────────┤
│  Footer: Version | Support Contact                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.5 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | ≥1280px | Full sidebar, multi-column |
| Laptop | 1024-1279px | Compact sidebar |
| Tablet | 768-1023px | Collapsible sidebar |
| Mobile | <768px | Not fully supported (admin notice) |

---

## 11. External Integrations

### 11.1 HRIMS Integration

**Purpose:** Synchronize employee data from government HRIMS system

#### API Configuration

```typescript
const HRIMS_CONFIG = {
  BASE_URL: 'https://hrims.zanzibar.go.tz/api',
  API_KEY: process.env.HRIMS_API_KEY,
  TOKEN: process.env.HRIMS_TOKEN,
  TIMEOUT: 900000,  // 15 minutes
};
```

#### Data Flow

```
┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
│    CSMS      │   POST /Employees  │    HRIMS     │                    │  PostgreSQL  │
│   Worker     │───────────────────►│     API      │                    │   Database   │
│              │  {PageNumber,      │              │                    │              │
│              │   PageSize,        │              │                    │              │
│              │   RequestBody}     │              │                    │              │
└──────┬───────┘                    └──────┬───────┘                    └──────────────┘
       │                                   │                                   ▲
       │                                   │                                   │
       │◄──────────────────────────────────┘                                   │
       │   {employees[], overallDataSize}                                      │
       │                                                                       │
       └───────────────────────────────────────────────────────────────────────┘
                            Upsert employees to database
```

#### Sync Capabilities

| Feature | Description |
|---------|-------------|
| **Full Institution Sync** | Fetch all employees for an institution |
| **Single Employee Sync** | Fetch/update individual employee |
| **Paginated Fetching** | Handle large datasets (5000+ employees) |
| **Document Sync** | Fetch employee documents |
| **Photo Sync** | Fetch employee profile photos |
| **Background Processing** | Non-blocking via BullMQ |
| **Progress Tracking** | Real-time sync progress updates |

### 11.2 Email Integration (SMTP)

**Purpose:** Send password reset OTPs and notifications

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@csms.go.tz
SMTP_PASS=***
```

### 11.3 AI Integration (Google Genkit)

**Purpose:** AI-powered features for complaint analysis

```typescript
// AI-powered complaint rewriting
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [googleAI()],
});
```

---

## 12. Deployment Architecture

### 12.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION INFRASTRUCTURE                            │
└─────────────────────────────────────────────────────────────────────────────┘

                                Internet
                                   │
                                   ▼
                          ┌───────────────┐
                          │    Nginx      │
                          │  (SSL/Proxy)  │
                          │   Port 443    │
                          └───────┬───────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │  csms-app │ │redis-work.│ │ genkit-ai │
            │  (PM2)    │ │  (PM2)    │ │   (PM2)   │
            │ Port 9002 │ │           │ │           │
            └─────┬─────┘ └─────┬─────┘ └───────────┘
                  │             │
                  ▼             ▼
            ┌───────────┐ ┌───────────┐
            │PostgreSQL │ │   Redis   │
            │ Port 5432 │ │ Port 6379 │
            └───────────┘ └───────────┘
                  │
                  ▼
            ┌───────────┐
            │   MinIO   │
            │ Port 9001 │
            └───────────┘
```

### 12.2 Server Specifications

| Component | Specification |
|-----------|---------------|
| **OS** | Ubuntu 24.04 LTS |
| **Kernel** | Linux 6.8.0-90-generic |
| **Control Panel** | aaPanel |
| **Application Path** | /www/wwwroot/nextjspro |

### 12.3 Nginx Configuration

```nginx
server {
    listen 80;
    server_name csms.go.tz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name csms.go.tz;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:9002/api/;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

### 12.4 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/csms"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9001"
MINIO_ACCESS_KEY="***"
MINIO_SECRET_KEY="***"
MINIO_BUCKET="csms-bucket"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# HRIMS Integration
HRIMS_API_KEY="***"
HRIMS_TOKEN="***"

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@csms.go.tz"
SMTP_PASS="***"

# Application
NODE_ENV="production"
PORT="9002"
```

### 12.5 Deployment Process

```bash
# 1. Pull latest code
cd /www/wwwroot/nextjspro
git pull origin main

# 2. Install dependencies
npm install

# 3. Run database migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Restart services
pm2 restart ecosystem.config.js

# 6. Verify status
pm2 status
pm2 logs csms-app --lines 50
```

---

## 13. Performance & Scalability

### 13.1 Current Performance (Load Test Results)

**Test Date:** January 19, 2026
**Tool:** k6

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Max VUs Tested | 300 | N/A | Tested |
| Avg Response Time | 15,042ms | <2,000ms | FAILED |
| p(95) Response Time | 33,251ms | <2,000ms | FAILED |
| HTTP Error Rate | 100% | <5% | FAILED |
| Login Success Rate | 0% | >95% | FAILED |

### 13.2 Performance Bottlenecks Identified

| Issue | Impact | Priority |
|-------|--------|----------|
| Database Connection Exhaustion | 100% login failure | CRITICAL |
| bcrypt CPU Bottleneck | Slow authentication | HIGH |
| No Response Caching | Repeated DB queries | HIGH |
| Sequential File Uploads | Slow multi-file upload | MEDIUM |

### 13.3 Optimization Strategies

#### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_employee_name ON "Employee"(name);
CREATE INDEX idx_employee_payroll ON "Employee"("payrollNumber");
CREATE INDEX idx_employee_status_inst ON "Employee"(status, "institutionId");
```

#### Connection Pooling

```env
# Prisma connection pool
DATABASE_URL="postgresql://...?connection_limit=50&pool_timeout=10"
```

#### Response Caching

```typescript
// Cache dashboard metrics for 60 seconds
headers.set(
  'Cache-Control',
  'public, s-maxage=60, stale-while-revalidate=120'
);
```

#### Query Optimization

```typescript
// Use parallel queries
const [count1, count2, count3] = await Promise.allSettled([
  db.employee.count({ where: clause1 }),
  db.employee.count({ where: clause2 }),
  db.employee.count({ where: clause3 }),
]);
```

### 13.4 Scalability Recommendations

| Improvement | Description | Priority |
|-------------|-------------|----------|
| PgBouncer | Connection pooling proxy | P0 |
| Redis Caching | Session and data caching | P0 |
| Rate Limiting | API request throttling | P1 |
| CDN | Static asset delivery | P2 |
| Read Replicas | Database read scaling | P3 |

---

## 14. Monitoring & Logging

### 14.1 Application Logging

**Log Location:** `/www/wwwroot/nextjspro/logs/`

| Log File | Content |
|----------|---------|
| app-out.log | Application stdout |
| app-error.log | Application errors |
| worker-out.log | Background worker output |
| worker-error.log | Worker errors |
| genkit-out.log | AI service output |
| genkit-error.log | AI service errors |

### 14.2 Log Format

```json
{
  "timestamp": "2026-01-19T10:30:45Z",
  "level": "INFO",
  "message": "User logged in",
  "userId": "uuid",
  "ip": "192.168.1.1",
  "duration": 245
}
```

### 14.3 Audit Logging

All security-relevant events are logged to the `AuditLog` database table:

| Event Type | Category | Severity |
|------------|----------|----------|
| LOGIN_SUCCESS | AUTHENTICATION | INFO |
| LOGIN_FAILED | AUTHENTICATION | WARNING |
| UNAUTHORIZED_ACCESS | ACCESS | ERROR |
| PASSWORD_CHANGED | SECURITY | INFO |
| ACCOUNT_LOCKED | SECURITY | WARNING |
| DATA_EXPORT | ACCESS | INFO |

### 14.4 Health Checks

```typescript
// Database connectivity
await db.$queryRaw`SELECT 1`;

// MinIO connectivity
await minioClient.bucketExists('csms-bucket');

// Redis connectivity
await redis.ping();
```

### 14.5 PM2 Monitoring

```bash
# View process status
pm2 status

# View real-time logs
pm2 logs

# Monitor resources
pm2 monit

# Generate report
pm2 report
```

---

## 15. Testing Architecture

### 15.1 Test Pyramid

```
                    ┌───────────────┐
                    │     E2E       │  ◄── Playwright
                    │    Tests      │      (Critical workflows)
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Integration  │  ◄── Vitest + MSW
                    │    Tests      │      (API endpoints)
                    └───────┬───────┘
                            │
            ┌───────────────▼───────────────┐
            │         Unit Tests            │  ◄── Vitest
            │   (Business logic, utils)     │      (407+ tests)
            └───────────────────────────────┘
```

### 15.2 Test Configuration

```json
// package.json scripts
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
}
```

### 15.3 Unit Test Coverage

| Area | Test File | Status |
|------|-----------|--------|
| Password Utilities | password-utils.test.ts | COVERED |
| Session Management | session-manager.test.ts | COVERED |
| CSRF Protection | csrf-utils.test.ts | COVERED |
| Account Lockout | account-lockout-utils.test.ts | COVERED |
| Password Expiration | password-expiration-utils.test.ts | COVERED |
| Route Permissions | route-permissions.test.ts | COVERED |
| Employee Status | employee-status-validation.test.ts | COVERED |
| Login Form | login-form.test.tsx | COVERED |

### 15.4 Load Testing

```bash
# Available load test commands
npm run loadtest           # Stress test (find breaking point)
npm run loadtest:smoke     # Quick smoke test
npm run loadtest:auth      # Authentication scenarios
npm run loadtest:hr        # HR workflow scenarios
npm run loadtest:files     # File operation scenarios
npm run loadtest:all       # All scenarios combined
```

---

## 16. Disaster Recovery

### 16.1 Backup Strategy

#### Database Backup

```bash
# Daily automated backup (cron)
0 2 * * * pg_dump csms | gzip > /backups/csms_$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "csms_*.sql.gz" -mtime +30 -delete
```

#### MinIO Backup

```bash
# Mirror to backup bucket
mc mirror local/csms-bucket backup/csms-bucket
```

### 16.2 Recovery Procedures

#### Database Recovery

```bash
# Restore from backup
gunzip < /backups/csms_20260119.sql.gz | psql csms
```

#### Application Recovery

```bash
# Restore from git
cd /www/wwwroot/nextjspro
git checkout main
npm install
npm run build
pm2 restart all
```

### 16.3 Failover Strategy

| Component | Primary | Failover |
|-----------|---------|----------|
| Database | PostgreSQL primary | Backup restore |
| Application | PM2 cluster | Auto-restart |
| Files | MinIO primary | Backup mirror |

---

## 17. Appendices

### Appendix A: API Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required |
| AUTH_INVALID | Invalid credentials |
| AUTH_LOCKED | Account locked |
| AUTH_EXPIRED | Session/password expired |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Input validation failed |
| RATE_LIMITED | Too many requests |
| INTERNAL_ERROR | Server error |

### Appendix B: Request Workflow States

| Status | Description |
|--------|-------------|
| Pending HRMO Review | Awaiting HRMO review |
| Pending HHRMD Review | Awaiting HHRMD review |
| Pending Commission Decision | At commission level |
| Approved | Request approved |
| Rejected | Request rejected |
| Returned for Correction | Sent back to submitter |
| Withdrawn | Withdrawn by submitter |

### Appendix C: Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Generate client
npx prisma generate

# Reset database (development only)
npx prisma migrate reset
```

### Appendix D: Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript check

# Production
pm2 start ecosystem.config.js
pm2 status
pm2 logs csms-app
pm2 restart all

# Database
npx prisma studio        # Visual database editor
npx prisma db push       # Push schema changes
```

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Lead Architect** | | | |
| **Lead Developer** | | | |
| **Security Officer** | | | |
| **Database Administrator** | | | |
| **Project Manager** | | | |

---

**END OF SYSTEM DESIGN DOCUMENT V2**

_This document is confidential and proprietary to the Civil Service Commission of Zanzibar._

**Document Version:** 2.0
**Date:** January 19, 2026
**Prepared By:** CSMS Technical Team

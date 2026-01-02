# HIGH-LEVEL DESIGN (HLD) DOCUMENT

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item               | Details                                                      |
| ------------------ | ------------------------------------------------------------ |
| **Document Title** | High-Level Design Document - Civil Service Management System |
| **Project Name**   | Civil Service Management System (CSMS)                       |
| **Version**        | 1.0                                                          |
| **Date**           | December 25, 2025                                            |
| **Prepared By**    | CSMS Development Team                                        |
| **Status**         | Final                                                        |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [System Architecture](#3-system-architecture)
4. [Component Architecture](#4-component-architecture)
5. [Database Design](#5-database-design)
6. [Technology Stack](#6-technology-stack)
7. [Deployment Architecture](#7-deployment-architecture)
8. [Security Architecture](#8-security-architecture)
9. [Integration Architecture](#9-integration-architecture)
10. [Scalability and Performance](#10-scalability-and-performance)
11. [Technology Choices and Rationale](#11-technology-choices-and-rationale)
12. [Appendices](#12-appendices)

---

## 1. Introduction

### 1.1 Purpose

This High-Level Design (HLD) document describes the architectural design of the Civil Service Management System (CSMS) for the Revolutionary Government of Zanzibar. It provides a comprehensive view of the system architecture, components, deployment topology, and technology choices.

### 1.2 Scope

The CSMS is a full-stack web application that manages the complete lifecycle of civil service employees in Zanzibar, including:

- Employee profile management and data synchronization
- Eight types of HR request workflows (Confirmation, Promotion, LWOP, Cadre Change, Retirement, Resignation, Service Extension, Termination)
- Complaint management with AI-powered standardization
- Role-based access control for nine user roles
- Document management with MinIO object storage
- Reporting and analytics capabilities
- Integration with external HRIMS system

### 1.3 Intended Audience

- Technical Architects
- Software Developers
- System Administrators
- Database Administrators
- Project Managers
- Quality Assurance Teams
- Stakeholders

### 1.4 Document Conventions

- **Component**: A logical module of the system
- **Service**: A backend API endpoint or business logic unit
- **Entity**: A database model representing business data
- **Role**: A user type with specific permissions

---

## 2. System Overview

### 2.1 System Context

The Civil Service Management System (CSMS) serves as the central HR management platform for Zanzibar's civil service, managing over 20,000 employees across multiple government institutions.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SYSTEMS                            │
│                                                                     │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐    │
│  │    HRIMS     │      │   MinIO      │      │   Google     │    │
│  │  (Employee   │      │  (Document   │      │   Gemini     │    │
│  │   Database)  │      │   Storage)   │      │    (AI)      │    │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘    │
│         │                     │                     │              │
└─────────┼─────────────────────┼─────────────────────┼──────────────┘
          │                     │                     │
          │                     │                     │
┌─────────▼─────────────────────▼─────────────────────▼──────────────┐
│                                                                     │
│                 CIVIL SERVICE MANAGEMENT SYSTEM                     │
│                          (CSMS)                                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Web Application (Next.js 16)                   │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│  │
│  │  │   Frontend     │  │  Backend API   │  │   Database     ││  │
│  │  │   (React 19)   │◄─┤   (API Routes) │◄─┤  (PostgreSQL)  ││  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘│  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
┌─────────▼─────┐  ┌───────▼──────┐  ┌─────▼──────────┐
│   CSC Staff   │  │ Institution  │  │   Employees    │
│  (9 Roles)    │  │  HR Staff    │  │ (Self-service) │
│               │  │  (HRO, HRRP) │  │                │
└───────────────┘  └──────────────┘  └────────────────┘
```

### 2.2 Key Users and Roles

| Role Category         | Roles                 | Access Level                 | Primary Functions                              |
| --------------------- | --------------------- | ---------------------------- | ---------------------------------------------- |
| **CSC Oversight**     | HHRMD, HRMO, CSCS, DO | All Institutions             | Approve/reject requests, system-wide oversight |
| **Planning**          | PO                    | All Institutions (Read-only) | View reports, analytics                        |
| **Institution Staff** | HRO, HRRP             | Own Institution Only         | Submit requests, manage employees              |
| **System Admin**      | ADMIN                 | System-wide                  | User management, institution management        |
| **End Users**         | EMPLOYEE              | Own Data Only                | View profile, submit complaints                |

### 2.3 Business Processes Supported

```
Employee Lifecycle Management
├── 1. Onboarding (HRIMS Integration)
├── 2. Probation → Confirmation (Confirmation Requests)
├── 3. Career Progression
│   ├── Promotions (Experience/Education-based)
│   └── Cadre Changes
├── 4. Leave Management (LWOP Requests)
├── 5. Complaints and Grievances
├── 6. Separation
│   ├── Retirement (Voluntary/Compulsory/Illness)
│   ├── Resignation
│   ├── Service Extension
│   └── Termination/Dismissal
└── 7. Reporting and Analytics
```

---

## 3. System Architecture

### 3.1 Architectural Style

The CSMS follows a **Full-Stack Monolithic Architecture** using Next.js, consolidating frontend, backend, and API layers in a single deployable application.

**Architecture Pattern**: Layered Architecture with the following layers:

1. **Presentation Layer** (React Components)
2. **Application Layer** (Next.js API Routes)
3. **Business Logic Layer** (Service functions and utilities)
4. **Data Access Layer** (Prisma ORM)
5. **Database Layer** (PostgreSQL)

### 3.2 High-Level Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                             │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              React 19 Frontend (Next.js Pages)               │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ Auth Pages  │  │  Dashboard   │  │   Public Pages   │   │   │
│  │  │ - Login     │  │  - 20+ Pages │  │   - Landing      │   │   │
│  │  │ - Emp Login │  │  - Modules   │  │                  │   │   │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘   │   │
│  │                                                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │           UI Components (51 files)                    │  │   │
│  │  │  - Radix UI + shadcn/ui                               │  │   │
│  │  │  - Custom components (Layout, Auth, Shared, Forms)    │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌───────────────────────────────────────────────────────┐  │   │
│  │  │           State Management (Zustand)                  │  │   │
│  │  │  - Auth Store (user, role, tokens)                    │  │   │
│  │  │  - Persisted to localStorage                          │  │   │
│  │  └───────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ HTTP/REST (Fetch API)
                                │ JSON Payloads
┌───────────────────────────────▼───────────────────────────────────────┐
│                       APPLICATION LAYER                               │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                Next.js API Routes (60+ endpoints)            │   │
│  │                                                              │   │
│  │  Authentication          Employee Management                │   │
│  │  ├─ /api/auth/login     ├─ /api/employees                   │   │
│  │  ├─ /api/auth/logout    ├─ /api/employees/[id]              │   │
│  │  ├─ /api/auth/session   └─ /api/employees/search            │   │
│  │  └─ /api/auth/change-password                               │   │
│  │                                                              │   │
│  │  HR Request Workflows (8 Types)                             │   │
│  │  ├─ /api/confirmations          ├─ /api/retirement          │   │
│  │  ├─ /api/promotions             ├─ /api/resignation         │   │
│  │  ├─ /api/lwop-requests          ├─ /api/service-extension   │   │
│  │  ├─ /api/cadre-change           └─ /api/termination         │   │
│  │                                                              │   │
│  │  File Management                System Management           │   │
│  │  ├─ /api/files/upload           ├─ /api/dashboard/metrics   │   │
│  │  ├─ /api/files/download         ├─ /api/notifications       │   │
│  │  ├─ /api/files/preview          ├─ /api/reports             │   │
│  │  └─ /api/files/exists           ├─ /api/users               │   │
│  │                                  ├─ /api/institutions        │   │
│  │  HRIMS Integration               └─ /api/complaints          │   │
│  │  ├─ /api/hrims/fetch-employee                               │   │
│  │  ├─ /api/hrims/search-employee                              │   │
│  │  ├─ /api/hrims/fetch-by-institution                         │   │
│  │  ├─ /api/hrims/sync-employee                                │   │
│  │  └─ /api/hrims/bulk-fetch                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                             │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Utility Libraries (/src/lib)                │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ API Client   │  │  Role Utils  │  │  Notifications   │  │   │
│  │  │ (599 LOC)    │  │  - RBAC      │  │  - Templates     │  │   │
│  │  │ - Fetch      │  │  - Filtering │  │  - Messaging     │  │   │
│  │  │ - Auth       │  │              │  │                  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │ MinIO Client │  │  Constants   │  │  Type Defs       │  │   │
│  │  │ - Upload     │  │  - Roles     │  │  - Interfaces    │  │   │
│  │  │ - Download   │  │  - Statuses  │  │  - DTOs          │  │   │
│  │  │ - PreSign    │  │              │  │                  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │        AI Integration (Google Genkit)               │   │   │
│  │  │  - Complaint Rewriting Flow                         │   │   │
│  │  │  - Standardization to CSC Format                    │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                      DATA ACCESS LAYER                                │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Prisma ORM Client                         │   │
│  │                                                              │   │
│  │  ┌────────────────────────────────────────────────────────┐ │   │
│  │  │  Type-Safe Database Operations                         │ │   │
│  │  │  - Auto-generated types from schema                    │ │   │
│  │  │  - Query builder with relations                        │ │   │
│  │  │  - Migration management                                │ │   │
│  │  │  - Connection pooling                                  │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ TCP/IP (Port 5432)
┌───────────────────────────────▼───────────────────────────────────────┐
│                         DATABASE LAYER                                │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database: "nody"                     │   │
│  │                                                              │   │
│  │  Core Entities:                                              │   │
│  │  ├─ User (Authentication & Authorization)                    │   │
│  │  ├─ Employee (Staff Records)                                 │   │
│  │  └─ Institution (Government Agencies)                        │   │
│  │                                                              │   │
│  │  Request Entities (8 types):                                │   │
│  │  ├─ PromotionRequest        ├─ RetirementRequest            │   │
│  │  ├─ ConfirmationRequest     ├─ ResignationRequest           │   │
│  │  ├─ LwopRequest              ├─ ServiceExtensionRequest      │   │
│  │  ├─ CadreChangeRequest      └─ SeparationRequest            │   │
│  │                                                              │   │
│  │  Supporting Entities:                                        │   │
│  │  ├─ EmployeeCertificate                                     │   │
│  │  ├─ Complaint                                               │   │
│  │  └─ Notification                                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                            │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  MinIO Storage   │  │  HRIMS API       │  │  Google Gemini   │   │
│  │  (Object Store)  │  │  (Employee Data) │  │  (AI Services)   │   │
│  │  - Documents     │  │  - Sync          │  │  - Complaint     │   │
│  │  - Photos        │  │  - Bulk Fetch    │  │    Rewriting     │   │
│  │  - Certificates  │  │                  │  │                  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### 3.3 Request Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       HR REQUEST WORKFLOW                           │
│                                                                     │
│  1. Request Submission                                              │
│     ┌──────────┐                                                    │
│     │   HRO    │ Creates request for employee                       │
│     └────┬─────┘                                                    │
│          │                                                          │
│          ▼                                                          │
│     ┌────────────────────────────────────────┐                     │
│     │  Frontend Form Validation              │                     │
│     │  - Zod Schema Validation               │                     │
│     │  - Required fields check               │                     │
│     │  - Document upload (PDF, 2MB max)      │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  POST /api/[request-type]              │                     │
│     │  - Authentication check                │                     │
│     │  - Role validation                     │                     │
│     │  - Employee status validation          │                     │
│     │  - Business rule validation            │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  Database Transaction                  │                     │
│     │  - Create request record               │                     │
│     │  - Set status: "PENDING_FIRST_REVIEW"  │                     │
│     │  - Set reviewStage: "HHRMD" or "DO"    │                     │
│     │  - Link employee & submitter           │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  Notification Creation                 │                     │
│     │  - Notify approvers (English/Swahili)  │                     │
│     │  - Include request link                │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  Return Success Response               │                     │
│     │  - Request ID                          │                     │
│     │  - Confirmation message                │                     │
│     └────────────────────────────────────────┘                     │
│                                                                     │
│  2. First Review (HHRMD/HRMO or DO)                                │
│     ┌────────────────────────────────────────┐                     │
│     │  Reviewer accesses dashboard           │                     │
│     │  - Sees pending requests               │                     │
│     │  - Reviews documents                   │                     │
│     │  - Makes decision: Approve/Reject      │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  PUT /api/[request-type]/[id]          │                     │
│     │  - Role validation (must be reviewer)  │                     │
│     │  - Update status                       │                     │
│     │    - Approve: "PENDING_FINAL_APPROVAL" │                     │
│     │    - Reject: "REJECTED"                │                     │
│     │  - Set reviewedById                    │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  Notification to next stage/submitter  │                     │
│     └────────────────────────────────────────┘                     │
│                                                                     │
│  3. Final Approval (CSCS - Commission Secretary)                   │
│     ┌────────────────────────────────────────┐                     │
│     │  CSCS reviews approved requests        │                     │
│     │  - Executive decision                  │                     │
│     │  - Final approval/rejection            │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  PUT /api/[request-type]/[id]          │                     │
│     │  - Update status: "APPROVED"/"REJECTED"│                     │
│     │  - Update employee record if approved  │                     │
│     │    (e.g., confirmationDate, cadre)     │                     │
│     └────────────┬───────────────────────────┘                     │
│                  │                                                  │
│                  ▼                                                  │
│     ┌────────────────────────────────────────┐                     │
│     │  Notification to submitter & employee  │                     │
│     │  - Request outcome                     │                     │
│     │  - Bilingual message                   │                     │
│     └────────────────────────────────────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Architecture

### 4.1 Frontend Component Structure

```
Frontend Components (51 files)
├── Auth Components (/src/components/auth)
│   ├── LoginForm.tsx
│   ├── EmployeeLoginForm.tsx
│   ├── PasswordChangeModal.tsx
│   └── ProtectedRoute wrapper
│
├── Layout Components (/src/components/layout)
│   ├── AppSidebar.tsx (Navigation menu with role-based filtering)
│   ├── AppHeader.tsx (User profile, notifications, logout)
│   ├── UserNav.tsx (User dropdown menu)
│   └── NotificationBell.tsx (Real-time notification indicator)
│
├── Shared Components (/src/components/shared)
│   ├── PageHeader.tsx (Common page title component)
│   ├── EmployeeSearch.tsx (Search autocomplete)
│   ├── Pagination.tsx (Table pagination)
│   └── StatusBadge.tsx (Request status indicators)
│
├── UI Components (/src/components/ui - Radix UI + shadcn)
│   ├── button.tsx, input.tsx, select.tsx
│   ├── dialog.tsx, alert-dialog.tsx
│   ├── table.tsx, card.tsx
│   ├── form.tsx, label.tsx, checkbox.tsx
│   ├── toast.tsx, tooltip.tsx
│   ├── tabs.tsx, accordion.tsx
│   ├── dropdown-menu.tsx, popover.tsx
│   └── 20+ more UI primitives
│
└── Employee Components (/src/components/employee)
    ├── EmployeeProfileView.tsx
    ├── EmployeeDocumentUpload.tsx
    └── EmployeeStatusIndicator.tsx
```

### 4.2 Backend Component Structure

```
Backend API Routes (/src/app/api - 60+ routes)
├── Authentication Module
│   ├── /auth/login/route.ts (User authentication)
│   ├── /auth/logout/route.ts (Session termination)
│   ├── /auth/employee-login/route.ts (Employee self-service login)
│   ├── /auth/change-password/route.ts (Password update)
│   └── /auth/session/route.ts (Session validation)
│
├── Employee Management Module
│   ├── /employees/route.ts (List with institution filtering)
│   ├── /employees/[id]/route.ts (Get employee details)
│   ├── /employees/search/route.ts (Search employees)
│   └── /employees/urgent-actions/route.ts (Urgent action items)
│
├── Request Workflow Modules (8 types, similar structure)
│   ├── /confirmations/
│   │   ├── route.ts (GET: list, POST: create)
│   │   └── [id]/route.ts (GET: detail, PUT: update/approve)
│   ├── /promotions/ (same structure)
│   ├── /lwop-requests/ (same structure)
│   ├── /cadre-change/ (same structure)
│   ├── /retirement/ (same structure)
│   ├── /resignation/ (same structure)
│   ├── /service-extension/ (same structure)
│   └── /termination/ (same structure)
│
├── File Management Module
│   ├── /files/upload/route.ts (Upload to MinIO)
│   ├── /files/download/route.ts (Download from MinIO)
│   ├── /files/preview/route.ts (Generate preview URL)
│   ├── /files/exists/route.ts (Check file existence)
│   ├── /files/employee-documents/route.ts (List docs)
│   └── /files/employee-photos/route.ts (List photos)
│
├── HRIMS Integration Module
│   ├── /hrims/fetch-employee/route.ts (Single employee sync)
│   ├── /hrims/search-employee/route.ts (Search HRIMS)
│   ├── /hrims/fetch-by-institution/route.ts (Bulk by institution)
│   ├── /hrims/fetch-documents-by-institution/route.ts
│   ├── /hrims/fetch-photos-by-institution/route.ts
│   ├── /hrims/sync-employee/route.ts (Sync to local DB)
│   ├── /hrims/sync-documents/route.ts (Sync documents)
│   └── /hrims/bulk-fetch/route.ts (Bulk employee fetch)
│
├── System Management Module
│   ├── /users/route.ts (User CRUD)
│   ├── /users/[id]/route.ts (User detail/update)
│   ├── /institutions/route.ts (Institution CRUD)
│   ├── /institutions/[id]/route.ts (Institution detail)
│   ├── /complaints/route.ts (Complaint management)
│   ├── /notifications/route.ts (User notifications)
│   ├── /dashboard/metrics/route.ts (Dashboard statistics)
│   ├── /reports/route.ts (Report generation)
│   └── /requests/track/route.ts (Request tracking)
```

### 4.3 Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPONENT INTERACTIONS                      │
│                                                                 │
│  User Action (Browser)                                          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ React Page   │ (e.g., /dashboard/confirmation)              │
│  └──────┬───────┘                                               │
│         │ Uses hooks                                            │
│         ▼                                                       │
│  ┌──────────────┐          ┌────────────────┐                  │
│  │ useAuth()    │◄─────────┤  Auth Store    │                  │
│  └──────┬───────┘          │  (Zustand)     │                  │
│         │ Token retrieval  └────────────────┘                  │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ API Client   │ (src/lib/api-client.ts)                      │
│  │ - Adds token │                                               │
│  │ - Handles    │                                               │
│  │   errors     │                                               │
│  └──────┬───────┘                                               │
│         │ HTTP Request                                          │
│         ▼                                                       │
│  ┌──────────────────────────────────────┐                      │
│  │  Next.js API Route Handler           │                      │
│  │  (/src/app/api/[endpoint]/route.ts)  │                      │
│  └──────┬───────────────────────────────┘                      │
│         │                                                       │
│         ├─► Authentication Check (token validation)            │
│         ├─► Role-Based Access Control (RBAC)                   │
│         ├─► Institution Filtering (if applicable)              │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ Business     │                                               │
│  │ Logic        │ (Validation, transformations)                │
│  │ (Utils)      │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ Prisma ORM   │                                               │
│  │ - Query      │                                               │
│  │ - Relations  │                                               │
│  │ - Transactions                                               │
│  └──────┬───────┘                                               │
│         │ SQL                                                   │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ PostgreSQL   │                                               │
│  │ Database     │                                               │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  Response (JSON) ──► API Route ──► API Client ──► React State  │
│                                                       │         │
│                                                       ▼         │
│                                              ┌────────────────┐ │
│                                              │ UI Update      │ │
│                                              │ (Re-render)    │ │
│                                              └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 State Management Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   STATE MANAGEMENT (ZUSTAND)                   │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │               Auth Store (src/store/auth-store.ts)       │ │
│  │                                                          │ │
│  │  State:                                                  │ │
│  │  ├─ user: User | null                                    │ │
│  │  ├─ role: Role | null                                    │ │
│  │  ├─ isAuthenticated: boolean                             │ │
│  │  ├─ accessToken: string | null                           │ │
│  │  ├─ refreshToken: string | null                          │ │
│  │  └─ institutionId: string | null                         │ │
│  │                                                          │ │
│  │  Actions:                                                │ │
│  │  ├─ login(username, password)                            │ │
│  │  ├─ logout()                                             │ │
│  │  ├─ refreshAuthToken()                                   │ │
│  │  ├─ initializeAuth()                                     │ │
│  │  └─ updateTokenFromApiClient(token)                      │ │
│  │                                                          │ │
│  │  Persistence:                                            │ │
│  │  └─ localStorage (zustand/middleware/persist)            │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │            Auth Provider (Hydration wrapper)             │ │
│  │  - Wraps app in root layout                              │ │
│  │  - Ensures Zustand hydration before render               │ │
│  │  - Initializes API client with tokens                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │            Custom Hooks (src/hooks)                      │ │
│  │  ├─ useAuth() - Access auth state & actions              │ │
│  │  ├─ useApiInit() - Initialize API client with token      │ │
│  │  ├─ useFileExists() - Check file existence               │ │
│  │  ├─ useMobile() - Mobile detection                       │ │
│  │  └─ useToast() - Toast notifications                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Design

### 5.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                             │
│                      PostgreSQL: "nody"                             │
│                                                                     │
│  ┌────────────────┐                    ┌────────────────┐          │
│  │  Institution   │                    │      User      │          │
│  ├────────────────┤                    ├────────────────┤          │
│  │ id (PK)        │◄───────────────────┤ id (PK)        │          │
│  │ name (unique)  │ 1              1..* │ username       │          │
│  │ email          │                    │ password       │          │
│  │ phoneNumber    │                    │ role           │          │
│  │ voteNumber     │                    │ active         │          │
│  │ tinNumber      │                    │ institutionId  │          │
│  └────────┬───────┘                    │ employeeId (FK)│          │
│           │                            │ phoneNumber    │          │
│           │ 1                          │ email          │          │
│           │                            └────────┬───────┘          │
│           │                                     │ 1                │
│           │                                     │                  │
│           │                            ┌────────▼───────┐          │
│           │ 1..*                       │   Employee     │          │
│           └────────────────────────────┤ id (PK)        │          │
│                                        │ zanId (unique) │          │
│                                        │ name           │          │
│                                        │ gender         │          │
│                                        │ dateOfBirth    │          │
│                                        │ placeOfBirth   │          │
│                                        │ region         │          │
│                                        │ phoneNumber    │          │
│                                        │ cadre          │          │
│                                        │ salaryScale    │          │
│                                        │ ministry       │          │
│                                        │ department     │          │
│                                        │ employmentDate │          │
│                                        │ confirmationDate│         │
│                                        │ retirementDate │          │
│                                        │ status         │          │
│                                        │ institutionId  │          │
│                                        │ profileImageUrl│          │
│                                        └────────┬───────┘          │
│                                                 │                  │
│                    ┌────────────────────────────┼─────────────┐    │
│                    │                            │             │    │
│         ┌──────────▼──────┐          ┌──────────▼──────┐      │    │
│         │PromotionRequest │          │ConfirmationReq  │      │    │
│         ├─────────────────┤          ├─────────────────┤      │    │
│         │ id (PK)         │          │ id (PK)         │      │    │
│         │ status          │          │ status          │      │    │
│         │ reviewStage     │          │ reviewStage     │      │    │
│         │ proposedCadre   │          │ documents[]     │      │    │
│         │ promotionType   │          │ decisionDate    │      │    │
│         │ documents[]     │          │ employeeId (FK) │      │    │
│         │ employeeId (FK) │          │ submittedById   │      │    │
│         │ submittedById   │          │ reviewedById    │      │    │
│         │ reviewedById    │          └─────────────────┘      │    │
│         │ createdAt       │                                   │    │
│         │ updatedAt       │                                   │    │
│         └─────────────────┘                                   │    │
│                                                               │    │
│         ┌──────────▼──────┐          ┌──────────▼──────┐     │    │
│         │   LwopRequest   │          │ CadreChangeReq  │     │    │
│         ├─────────────────┤          ├─────────────────┤     │    │
│         │ id (PK)         │          │ id (PK)         │     │    │
│         │ status          │          │ status          │     │    │
│         │ reviewStage     │          │ reviewStage     │     │    │
│         │ duration        │          │ newCadre        │     │    │
│         │ reason          │          │ reason          │     │    │
│         │ startDate       │          │ documents[]     │     │    │
│         │ endDate         │          │ employeeId (FK) │     │    │
│         │ documents[]     │          │ submittedById   │     │    │
│         │ employeeId (FK) │          │ reviewedById    │     │    │
│         │ submittedById   │          └─────────────────┘     │    │
│         │ reviewedById    │                                  │    │
│         └─────────────────┘                                  │    │
│                                                              │    │
│         ┌──────────▼──────┐          ┌──────────▼──────┐    │    │
│         │ RetirementReq   │          │ ResignationReq  │    │    │
│         ├─────────────────┤          ├─────────────────┤    │    │
│         │ id (PK)         │          │ id (PK)         │    │    │
│         │ status          │          │ status          │    │    │
│         │ reviewStage     │          │ reviewStage     │    │    │
│         │ retirementType  │          │ effectiveDate   │    │    │
│         │ proposedDate    │          │ reason          │    │    │
│         │ documents[]     │          │ documents[]     │    │    │
│         │ employeeId (FK) │          │ employeeId (FK) │    │    │
│         │ submittedById   │          │ submittedById   │    │    │
│         │ reviewedById    │          │ reviewedById    │    │    │
│         └─────────────────┘          └─────────────────┘    │    │
│                                                              │    │
│         ┌──────────▼──────────┐     ┌──────────▼──────┐     │    │
│         │ServiceExtensionReq  │     │ SeparationReq   │     │    │
│         ├─────────────────────┤     ├─────────────────┤     │    │
│         │ id (PK)             │     │ id (PK)         │     │    │
│         │ status              │     │ type            │     │    │
│         │ reviewStage         │     │ status          │     │    │
│         │currentRetirementDate│     │ reviewStage     │     │    │
│         │requestedExtension   │     │ reason          │     │    │
│         │ justification       │     │ documents[]     │     │    │
│         │ documents[]         │     │ employeeId (FK) │     │    │
│         │ employeeId (FK)     │     │ submittedById   │     │    │
│         │ submittedById       │     │ reviewedById    │     │    │
│         │ reviewedById        │     └─────────────────┘     │    │
│         └─────────────────────┘                             │    │
│                                                              │    │
│                                     ┌──────────▼──────────┐  │    │
│                                     │EmployeeCertificate │  │    │
│                                     ├────────────────────┤  │    │
│                                     │ id (PK)            │  │    │
│                                     │ type               │  │    │
│                                     │ name               │  │    │
│                                     │ url                │  │    │
│                                     │ employeeId (FK)    │  │    │
│                                     └────────────────────┘  │    │
│                                                              │    │
│  ┌─────────────────┐                ┌──────────────────┐    │    │
│  │   Complaint     │                │  Notification    │    │    │
│  ├─────────────────┤                ├──────────────────┤    │    │
│  │ id (PK)         │                │ id (PK)          │    │    │
│  │ complaintType   │                │ message          │    │    │
│  │ subject         │                │ link             │    │    │
│  │ details         │                │ isRead           │    │    │
│  │ status          │                │ userId (FK)      │────┘    │
│  │ reviewStage     │                │ createdAt        │          │
│  │ attachments[]   │                └──────────────────┘          │
│  │ complainantId   │                                              │
│  │ reviewedById    │                                              │
│  └─────────────────┘                                              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

Legend:
  PK = Primary Key
  FK = Foreign Key
  [] = Array/JSON field
  ─► = One-to-Many relationship
  ◄─ = Foreign Key reference
```

### 5.2 Key Database Tables

#### 5.2.1 Core Tables

**User Table**

- Stores authentication and authorization data
- Links to Employee (1-to-1, optional)
- Links to Institution (Many-to-1)
- Supports 9 user roles
- Stores bcrypt-hashed passwords

**Employee Table**

- Central employee master data
- Links to Institution (Many-to-1)
- Links to User (1-to-1, optional for employee self-service)
- Stores personal, work, and HR information
- Maintains employment lifecycle dates
- References document URLs in MinIO

**Institution Table**

- Government agencies/ministries
- Unique name and TIN number
- Links to Users and Employees

#### 5.2.2 Request Tables (8 types)

All request tables follow a common pattern:

- **id**: UUID primary key
- **status**: Workflow state (PENDING_FIRST_REVIEW, PENDING_FINAL_APPROVAL, APPROVED, REJECTED)
- **reviewStage**: Current reviewer role (HHRMD, HRMO, DO, CSCS)
- **documents**: Array of MinIO file URLs
- **employeeId**: Foreign key to Employee
- **submittedById**: Foreign key to User (submitter)
- **reviewedById**: Foreign key to User (current reviewer)
- **rejectionReason**: Optional rejection explanation
- **createdAt/updatedAt**: Timestamps

**Request Types:**

1. **PromotionRequest**: Career advancement (experience/education-based)
2. **ConfirmationRequest**: Probation completion
3. **LwopRequest**: Leave Without Pay
4. **CadreChangeRequest**: Job classification change
5. **RetirementRequest**: End of service (voluntary/compulsory/illness)
6. **ResignationRequest**: Voluntary separation
7. **ServiceExtensionRequest**: Extend retirement age
8. **SeparationRequest**: Termination/dismissal

#### 5.2.3 Supporting Tables

**EmployeeCertificate**

- Stores employee qualifications
- Links to Employee
- Cascade delete when employee deleted

**Complaint**

- Employee grievances
- Supports multiple complaint types
- Workflow similar to requests
- Links to complainant (User) and reviewer

**Notification**

- User notifications
- Links to User
- Bilingual support (English/Swahili)
- Read/unread status

### 5.3 Database Indexes

```sql
-- Unique Constraints
Institution.name (UNIQUE)
Institution.tinNumber (UNIQUE)
Employee.zanId (UNIQUE)
User.username (UNIQUE)
User.employeeId (UNIQUE)

-- Foreign Key Indexes (auto-created by Prisma)
User.institutionId
User.employeeId
Employee.institutionId
PromotionRequest.employeeId
PromotionRequest.submittedById
PromotionRequest.reviewedById
-- (Similar for all request types)
Notification.userId
EmployeeCertificate.employeeId
```

### 5.4 Data Integrity Rules

1. **Referential Integrity**
   - All foreign keys enforced by PostgreSQL
   - EmployeeCertificate has CASCADE delete on employee deletion
   - Notification has CASCADE delete on user deletion

2. **Business Rules Enforced in Application Layer**
   - Employee cannot have multiple pending requests of same type
   - Employee status must be valid for request type
   - Only authorized roles can review specific request types
   - Institution filtering based on user role

3. **Data Validation**
   - ZanID format validation
   - Date range validation (e.g., startDate < endDate for LWOP)
   - Document format validation (PDF only, 2MB max)
   - Enum validation for status, role, reviewStage fields

---

## 6. Technology Stack

### 6.1 Technology Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TECHNOLOGY STACK                            │
│                                                                 │
│  Frontend Layer                                                 │
│  ├─ React 19.2.1 (UI library)                                   │
│  ├─ Next.js 16.0.7 (Framework - App Router)                     │
│  ├─ TypeScript 5.x (Type safety)                                │
│  ├─ Tailwind CSS 3.4.1 (Styling)                                │
│  ├─ Radix UI (Headless UI primitives)                           │
│  ├─ shadcn/ui (Pre-built components)                            │
│  ├─ Lucide React (Icons)                                        │
│  ├─ Zustand 4.5.4 (State management)                            │
│  ├─ React Hook Form 7.54.2 (Form handling)                      │
│  ├─ Zod 3.24.2 (Schema validation)                              │
│  ├─ date-fns 3.6.0 (Date utilities)                             │
│  ├─ Recharts 2.15.1 (Charts & analytics)                        │
│  └─ jsPDF 2.5.1 (PDF generation)                                │
│                                                                 │
│  Backend Layer                                                  │
│  ├─ Next.js 16 API Routes (REST API)                            │
│  ├─ Node.js 20.x (Runtime)                                      │
│  └─ TypeScript 5.x (Type safety)                                │
│                                                                 │
│  Database Layer                                                 │
│  ├─ PostgreSQL (RDBMS)                                          │
│  └─ Prisma 6.19.1 (ORM & migrations)                            │
│                                                                 │
│  File Storage                                                   │
│  └─ MinIO 8.0.5 (S3-compatible object storage)                  │
│                                                                 │
│  AI/ML Integration                                              │
│  ├─ Google Genkit 1.8.0 (AI framework)                          │
│  ├─ Google Generative AI (Gemini API)                           │
│  └─ @genkit-ai/googleai 1.8.0 (Genkit plugin)                   │
│                                                                 │
│  Security                                                       │
│  ├─ bcryptjs 2.4.3 (Password hashing)                           │
│  ├─ JWT (Token-based auth - optional)                           │
│  └─ Session-based authentication                                │
│                                                                 │
│  Development Tools                                              │
│  ├─ ESLint (Linting)                                            │
│  ├─ PostCSS 8 (CSS processing)                                  │
│  ├─ tsx 4.19.0 (TypeScript executor)                            │
│  └─ genkit-cli 1.8.0 (AI development)                           │
│                                                                 │
│  Utilities                                                      │
│  ├─ node-fetch 2.7.0 (HTTP client)                              │
│  ├─ uuid 13.0.0 (ID generation)                                 │
│  ├─ XLSX 0.18.5 (Excel export)                                  │
│  ├─ class-variance-authority (Component variants)               │
│  ├─ clsx + tailwind-merge (Class name utilities)                │
│  └─ dotenv 16.5.0 (Environment config)                          │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Technology Details

#### 6.2.1 Frontend Technologies

| Technology          | Version | Purpose              | Justification                                                                                                                            |
| ------------------- | ------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js**         | 16.0.7  | Full-stack framework | - SSR/SSG capabilities<br>- Built-in API routes<br>- File-based routing<br>- Optimized production builds<br>- Great developer experience |
| **React**           | 19.2.1  | UI library           | - Component-based architecture<br>- Large ecosystem<br>- Strong TypeScript support<br>- Excellent performance                            |
| **TypeScript**      | 5.x     | Type safety          | - Compile-time error checking<br>- Better IDE support<br>- Self-documenting code<br>- Refactoring safety                                 |
| **Tailwind CSS**    | 3.4.1   | CSS framework        | - Utility-first approach<br>- Fast development<br>- Consistent design system<br>- Small bundle size                                      |
| **Radix UI**        | Latest  | Headless components  | - Accessibility built-in<br>- Unstyled primitives<br>- Full keyboard navigation<br>- ARIA compliant                                      |
| **shadcn/ui**       | Latest  | Component library    | - Pre-built accessible components<br>- Based on Radix UI<br>- Customizable with Tailwind<br>- Copy-paste approach                        |
| **Zustand**         | 4.5.4   | State management     | - Lightweight (minimal boilerplate)<br>- Built-in persistence<br>- TypeScript support<br>- Simple API                                    |
| **React Hook Form** | 7.54.2  | Form management      | - Performance (uncontrolled inputs)<br>- Easy validation integration<br>- Type-safe<br>- Reduced re-renders                              |
| **Zod**             | 3.24.2  | Schema validation    | - TypeScript-first validation<br>- Infer types from schemas<br>- Composable validators<br>- Error messages                               |

#### 6.2.2 Backend Technologies

| Technology             | Version | Purpose          | Justification                                                                                                    |
| ---------------------- | ------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Next.js API Routes** | 16.0.7  | Backend API      | - Same codebase as frontend<br>- Type sharing<br>- Simplified deployment<br>- Serverless-ready                   |
| **Prisma**             | 6.19.1  | ORM              | - Type-safe database access<br>- Auto-generated types<br>- Migration management<br>- Great DX with Prisma Studio |
| **PostgreSQL**         | 14+     | Database         | - ACID compliance<br>- JSON support for arrays<br>- Mature and stable<br>- Government-grade reliability          |
| **bcryptjs**           | 2.4.3   | Password hashing | - Industry standard<br>- Configurable rounds<br>- Salt generation<br>- Secure by default                         |

#### 6.2.3 Storage & Integration

| Technology        | Version | Purpose        | Justification                                                                                                |
| ----------------- | ------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| **MinIO**         | 8.0.5   | Object storage | - S3-compatible API<br>- Self-hosted option<br>- Scalable<br>- Cost-effective                                |
| **Google Genkit** | 1.8.0   | AI framework   | - Structured AI flows<br>- Type-safe prompts<br>- Built-in observability<br>- Google ecosystem integration   |
| **Gemini API**    | Latest  | Generative AI  | - High-quality text generation<br>- Multilingual support<br>- Google infrastructure<br>- Competitive pricing |

### 6.3 Development Stack

```
Development Environment
├── IDE: VS Code / WebStorm
├── Node.js: v20.x LTS
├── Package Manager: npm
├── Version Control: Git
├── Database GUI: Prisma Studio
└── API Testing: Thunder Client / Postman

Build & Deployment
├── Build Tool: Next.js built-in (Turbopack)
├── TypeScript Compiler: tsc
├── CSS Processing: PostCSS + Tailwind
└── Asset Optimization: Next.js Image Optimization

Code Quality
├── Linting: ESLint (Next.js config)
├── Type Checking: TypeScript
└── Formatting: Prettier (recommended)
```

---

## 7. Deployment Architecture

### 7.1 Deployment Topology

```
┌──────────────────────────────────────────────────────────────────┐
│                      PRODUCTION ENVIRONMENT                      │
│                   https://csms.zanajira.go.tz                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Load Balancer / Nginx                     │ │
│  │                      (Port 80/443)                          │ │
│  │  - SSL Termination                                          │ │
│  │  - Request routing                                          │ │
│  │  - Static file serving (optional)                           │ │
│  └──────────────────────┬───────────────────────────────────────┘ │
│                         │                                        │
│         ┌───────────────┼───────────────┐                        │
│         │               │               │                        │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐               │
│  │  Next.js    │ │  Next.js    │ │  Next.js    │               │
│  │  Instance 1 │ │  Instance 2 │ │  Instance 3 │               │
│  │  (Port 9002)│ │  (Port 9002)│ │  (Port 9002)│               │
│  │             │ │             │ │             │               │
│  │  Frontend + │ │  Frontend + │ │  Frontend + │               │
│  │  API Routes │ │  API Routes │ │  API Routes │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│         │               │               │                        │
│         └───────────────┼───────────────┘                        │
│                         │                                        │
│          ┌──────────────┼──────────────┐                         │
│          │              │              │                         │
│   ┌──────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐                 │
│   │ PostgreSQL  │ │  MinIO   │ │ Google      │                 │
│   │  Primary    │ │  Storage │ │ Gemini API  │                 │
│   │ (Port 5432) │ │(Port 9000│ │ (External)  │                 │
│   │             │ │          │ │             │                 │
│   │ Database:   │ │ Buckets: │ │ - Complaint │                 │
│   │  "nody"     │ │ - docs   │ │   Rewriting │                 │
│   └──────┬──────┘ │ - photos │ └─────────────┘                 │
│          │        │ - certs  │                                   │
│          │        └──────────┘                                   │
│   ┌──────▼──────┐                                                │
│   │ PostgreSQL  │                                                │
│   │  Standby    │                                                │
│   │ (Optional)  │                                                │
│   │ Replication │                                                │
│   └─────────────┘                                                │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              External Integration (HRIMS)                   │ │
│  │              http://102.207.206.28:9001                     │ │
│  │  - Employee data synchronization                            │ │
│  │  - Document fetching                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 Infrastructure Components

#### 7.2.1 Application Server

```
Next.js Application Server
├── Runtime: Node.js 20.x LTS
├── Port: 9002
├── Mode: Production (npm start)
├── Instances: 3 (recommended for HA)
├── Process Manager: PM2 (recommended)
└── Environment Variables:
    ├── DATABASE_URL
    ├── NEXT_PUBLIC_API_URL
    ├── MINIO_* (credentials & config)
    └── GEMINI_API_KEY
```

#### 7.2.2 Database Server

```
PostgreSQL Server
├── Version: 14+ (recommended)
├── Port: 5432
├── Database: nody
├── User: postgres (change in production)
├── Encoding: UTF-8
├── Timezone: Africa/Dar_es_Salaam (UTC+3)
├── Connection Pool: Managed by Prisma
└── Backup Strategy:
    ├── Daily full backups
    ├── WAL archiving for PITR
    └── Off-site backup replication
```

#### 7.2.3 File Storage Server

```
MinIO Object Storage
├── Version: Latest stable
├── Port: 9000 (API), 9001 (Console)
├── Access: csmsadmin (change in production)
├── Buckets:
│   ├── documents (employee docs)
│   ├── certificates (qualifications)
│   ├── photos (employee photos)
│   └── attachments (complaint files)
├── Retention: Indefinite (government records)
└── Backup: Regular bucket snapshots
```

### 7.3 Deployment Process

```
┌──────────────────────────────────────────────────────────────┐
│                   DEPLOYMENT WORKFLOW                        │
│                                                              │
│  1. Code Repository (Git)                                    │
│     └─ git push origin main                                  │
│                                                              │
│  2. CI/CD Pipeline (Optional)                                │
│     ├─ npm install                                           │
│     ├─ npm run typecheck                                     │
│     ├─ npm run lint                                          │
│     ├─ npm run build                                         │
│     └─ Run tests (if available)                              │
│                                                              │
│  3. Database Migration                                       │
│     ├─ npx prisma migrate deploy                             │
│     └─ Verify schema changes                                 │
│                                                              │
│  4. Build Application                                        │
│     ├─ npm run build                                         │
│     └─ Generate optimized .next folder                       │
│                                                              │
│  5. Deploy to Server                                         │
│     ├─ Copy build artifacts                                  │
│     ├─ Update environment variables                          │
│     └─ Restart application (PM2/systemd)                     │
│                                                              │
│  6. Health Checks                                            │
│     ├─ Verify application responding (Port 9002)             │
│     ├─ Check database connectivity                           │
│     ├─ Verify MinIO access                                   │
│     └─ Test API endpoints                                    │
│                                                              │
│  7. Monitoring                                               │
│     ├─ Application logs                                      │
│     ├─ Error tracking                                        │
│     ├─ Performance metrics                                   │
│     └─ User access logs                                      │
└──────────────────────────────────────────────────────────────┘
```

### 7.4 Environment Configuration

#### 7.4.1 Production Environment Variables

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://csms.zanajira.go.tz/api
NEXT_PUBLIC_BACKEND_URL=https://csms.zanajira.go.tz

# Database
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/nody?schema=public"

# MinIO Storage
MINIO_ENDPOINT=[minio-host]
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=[production-key]
MINIO_SECRET_KEY=[production-secret]
MINIO_BUCKET_NAME=documents
MINIO_BUCKET_CERTIFICATES=certificates
MINIO_BUCKET_PHOTOS=photos
MINIO_BUCKET_ATTACHMENTS=attachments
NEXT_PUBLIC_MINIO_ENDPOINT=https://[minio-domain]:9000

# AI/ML
GEMINI_API_KEY=[production-api-key]

# HRIMS Integration
HRIMS_API_URL=http://102.207.206.28:9001
```

#### 7.4.2 Development Environment Variables

```env
# Application
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:9002/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:9002

# Database
DATABASE_URL="postgresql://postgres:Mamlaka2020@localhost:5432/nody?schema=public"

# MinIO Storage (local)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=csmsadmin
MINIO_SECRET_KEY=Mamlaka2020MinIO
NEXT_PUBLIC_MINIO_ENDPOINT=http://102.207.206.28:9000

# AI/ML
GEMINI_API_KEY=AIzaSyDAI7qb49veOee68LeTI8jHGz_pvEZSjPI
```

### 7.5 Scaling Considerations

#### 7.5.1 Horizontal Scaling

```
Application Tier Scaling
├── Load Balancer: Nginx/HAProxy
├── Application Instances: 3+ (stateless)
├── Session Management: Database-backed sessions
└── Auto-scaling: Based on CPU/Memory

Database Tier Scaling
├── Primary-Replica replication
├── Read replicas for reporting
└── Connection pooling via Prisma

Storage Tier Scaling
├── MinIO distributed mode (4+ nodes)
├── Erasure coding for redundancy
└── S3-compatible backup to cloud
```

#### 7.5.2 Vertical Scaling

```
Recommended Server Specifications

Application Server (Each Instance):
├── CPU: 4 cores
├── RAM: 8 GB
├── Disk: 50 GB SSD
└── Network: 1 Gbps

Database Server:
├── CPU: 8 cores
├── RAM: 16 GB
├── Disk: 500 GB SSD (RAID 10)
└── Network: 1 Gbps

MinIO Server (Distributed Mode):
├── CPU: 4 cores
├── RAM: 8 GB
├── Disk: 2 TB HDD per node (4+ nodes)
└── Network: 10 Gbps (recommended)
```

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                      SECURITY ARCHITECTURE                     │
│                                                                │
│  1. Network Security                                           │
│     ├─ HTTPS/TLS 1.3 (SSL certificates)                        │
│     ├─ Firewall rules (port restrictions)                      │
│     ├─ VPN for admin access (optional)                         │
│     └─ DDoS protection                                         │
│                                                                │
│  2. Application Security                                       │
│     ├─ Authentication (Session-based + JWT option)             │
│     ├─ Authorization (Role-Based Access Control)               │
│     ├─ Input validation (Zod schemas)                          │
│     ├─ XSS protection (React sanitization)                     │
│     ├─ CSRF protection (SameSite cookies)                      │
│     ├─ SQL injection prevention (Prisma ORM)                   │
│     └─ File upload restrictions (PDF only, 2MB max)            │
│                                                                │
│  3. Data Security                                              │
│     ├─ Password hashing (bcrypt, 10 rounds)                    │
│     ├─ Sensitive data encryption at rest                       │
│     ├─ TLS for data in transit                                 │
│     ├─ Database encryption (optional)                          │
│     └─ Regular security backups                                │
│                                                                │
│  4. Access Control                                             │
│     ├─ Role-Based Access Control (9 roles)                     │
│     ├─ Institution-level data isolation                        │
│     ├─ API endpoint authorization checks                       │
│     ├─ Row-level security via application logic                │
│     └─ Session timeout (configurable)                          │
│                                                                │
│  5. Audit & Compliance                                         │
│     ├─ Audit trail (all request changes)                       │
│     ├─ User activity logging                                   │
│     ├─ Document access logs                                    │
│     ├─ Regular security audits                                 │
│     └─ GDPR/data protection compliance                         │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Authentication Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                         │
│                                                                │
│  1. User Login Request                                         │
│     POST /api/auth/login                                       │
│     {                                                          │
│       "username": "kmnyonge",                                  │
│       "password": "password123"                                │
│     }                                                          │
│                                                                │
│  2. Server-Side Processing                                     │
│     ├─ Query User table by username                            │
│     ├─ Retrieve hashed password                                │
│     ├─ Compare: bcrypt.compare(input, hash)                    │
│     ├─ Validate user is active                                 │
│     └─ Check user has valid institution                        │
│                                                                │
│  3. Session Creation (if valid)                                │
│     ├─ Generate session token (optional JWT)                   │
│     ├─ Set HTTP-only cookie (session ID)                       │
│     ├─ Store session data (server-side or token)               │
│     └─ Return user object (without password)                   │
│                                                                │
│  4. Client-Side Storage                                        │
│     ├─ Store user in Zustand (auth store)                      │
│     ├─ Persist to localStorage (encrypted recommended)         │
│     ├─ Store tokens (access + refresh)                         │
│     └─ Initialize API client with token                        │
│                                                                │
│  5. Subsequent Requests                                        │
│     ├─ Include Authorization: Bearer [token]                   │
│     ├─ Server validates token/session                          │
│     ├─ Decode user ID and role from token                      │
│     └─ Apply role-based access control                         │
│                                                                │
│  6. Token Refresh (8-minute interval)                          │
│     ├─ POST /api/auth/refresh-token                            │
│     ├─ Validate refresh token                                  │
│     ├─ Issue new access token                                  │
│     └─ Update client-side storage                              │
│                                                                │
│  7. Logout                                                     │
│     ├─ POST /api/auth/logout                                   │
│     ├─ Invalidate server-side session                          │
│     ├─ Clear client-side storage                               │
│     └─ Redirect to login page                                  │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Authorization Matrix

| Resource/Action            | HRO | HRRP | HHRMD | HRMO | DO  | PO  | CSCS | ADMIN | EMPLOYEE |
| -------------------------- | --- | ---- | ----- | ---- | --- | --- | ---- | ----- | -------- |
| **Employees**              |
| View Own Institution       | ✓   | ✓    | ✓     | ✓    | ✓   | ✓   | ✓    | -     | -        |
| View All Institutions      | -   | -    | ✓     | ✓    | ✓   | ✓   | ✓    | -     | -        |
| View Own Profile           | -   | -    | -     | -    | -   | -   | -    | -     | ✓        |
| **Confirmation Requests**  |
| Create                     | ✓   | ✓    | -     | -    | -   | -   | -    | -     | -        |
| First Review               | -   | -    | ✓     | ✓    | -   | -   | -    | -     | -        |
| Final Approval             | -   | -    | -     | -    | -   | -   | ✓    | -     | -        |
| **Promotion Requests**     |
| Create                     | ✓   | ✓    | -     | -    | -   | -   | -    | -     | -        |
| First Review               | -   | -    | ✓     | ✓    | -   | -   | -    | -     | -        |
| Final Approval             | -   | -    | -     | -    | -   | -   | ✓    | -     | -        |
| **LWOP Requests**          |
| Create                     | ✓   | ✓    | -     | -    | -   | -   | -    | -     | -        |
| First Review               | -   | -    | ✓     | ✓    | -   | -   | -    | -     | -        |
| Final Approval             | -   | -    | -     | -    | -   | -   | ✓    | -     | -        |
| **Complaints**             |
| Create                     | -   | -    | -     | -    | -   | -   | -    | -     | ✓        |
| Review                     | -   | -    | -     | -    | ✓   | -   | -    | -     | -        |
| Approve/Reject             | -   | -    | ✓     | -    | -   | -   | -    | -     | -        |
| **Reports**                |
| View                       | ✓   | ✓    | ✓     | ✓    | ✓   | ✓   | ✓    | -     | -        |
| Export                     | ✓   | ✓    | ✓     | ✓    | ✓   | ✓   | ✓    | -     | -        |
| **User Management**        |
| View Users                 | -   | -    | -     | -    | -   | -   | -    | ✓     | -        |
| Create Users               | -   | -    | -     | -    | -   | -   | -    | ✓     | -        |
| Edit Users                 | -   | -    | -     | -    | -   | -   | -    | ✓     | -        |
| Deactivate Users           | -   | -    | -     | -    | -   | -   | -    | ✓     | -        |
| **Institution Management** |
| View                       | -   | -    | -     | -    | -   | -   | -    | ✓     | -        |
| Create/Edit                | -   | -    | -     | -    | -   | -   | -    | ✓     | -        |

Legend:

- ✓ = Allowed
- - = Not Allowed

### 8.4 Data Protection Measures

```
Data Protection Strategy
├── Personal Data
│   ├─ Employee personal info (encrypted at rest)
│   ├─ ZanID masked in logs
│   ├─ Contact info access controlled
│   └─ GDPR compliance (right to access/delete)
│
├── Authentication Data
│   ├─ Passwords: bcrypt hashed (10 rounds)
│   ├─ Never logged or transmitted in plain text
│   ├─ Password complexity requirements (recommended)
│   └─ Regular password rotation policy
│
├── Documents & Files
│   ├─ Stored in MinIO with access control
│   ├─ Pre-signed URLs with expiration (24 hours)
│   ├─ File type validation (PDF only)
│   ├─ Size limits enforced (2MB max)
│   └─ Virus scanning (recommended)
│
├── Database Security
│   ├─ Connection over TLS
│   ├─ Least privilege database user
│   ├─ Regular security patches
│   ├─ Backup encryption
│   └─ SQL injection prevention (Prisma)
│
└── Application Security
    ├─ Environment variables secured
    ├─ API keys never committed to Git
    ├─ Secrets management (recommended: Vault)
    ├─ Regular dependency updates
    └─ Security vulnerability scanning
```

---

## 9. Integration Architecture

### 9.1 HRIMS Integration

```
┌────────────────────────────────────────────────────────────────┐
│                   HRIMS INTEGRATION FLOW                       │
│                                                                │
│  CSMS (Client)                         HRIMS (External System) │
│                                                                │
│  1. Employee Data Sync                                         │
│     ┌─────────────────┐                ┌─────────────────┐    │
│     │ Admin Dashboard │                │  HRIMS API      │    │
│     │ Data Fetch Page │                │ (Port 9001)     │    │
│     └────────┬────────┘                └────────┬────────┘    │
│              │                                  │              │
│              │ 1. Search Employee               │              │
│              ├─────────────────────────────────►│              │
│              │ GET /api/hrims/search-employee   │              │
│              │ ?zanId=123456789                 │              │
│              │                                  │              │
│              │ 2. Return Employee Data          │              │
│              │◄─────────────────────────────────┤              │
│              │ { name, zanId, employmentDate... }              │
│              │                                  │              │
│              │ 3. Fetch Documents               │              │
│              ├─────────────────────────────────►│              │
│              │ POST /api/hrims/fetch-documents  │              │
│              │                                  │              │
│              │ 4. Return Document URLs/Data     │              │
│              │◄─────────────────────────────────┤              │
│              │ { ardhilHali, confirmation... }  │              │
│              │                                  │              │
│              │ 5. Fetch Photo                   │              │
│              ├─────────────────────────────────►│              │
│              │ POST /api/hrims/fetch-photos     │              │
│              │                                  │              │
│              │ 6. Return Photo Base64/URL       │              │
│              │◄─────────────────────────────────┤              │
│              │                                  │              │
│              │ 7. Sync to Local DB              │              │
│              ├────────────────┐                 │              │
│              │                │                 │              │
│     ┌────────▼────────┐       │                 │              │
│     │ Prisma ORM      │       │                 │              │
│     │ Employee.create │       │                 │              │
│     └────────┬────────┘       │                 │              │
│              │                │                 │              │
│     ┌────────▼────────┐       │                 │              │
│     │ MinIO Storage   │       │                 │              │
│     │ Upload docs/    │       │                 │              │
│     │ photos          │       │                 │              │
│     └─────────────────┘       │                 │              │
│              │                │                 │              │
│              │ 8. Success     │                 │              │
│              │◄───────────────┘                 │              │
│              │                                  │              │
│  2. Bulk Institution Fetch                     │              │
│     ┌─────────────────┐                        │              │
│     │ Admin Dashboard │                        │              │
│     └────────┬────────┘                        │              │
│              │ Fetch by Institution            │              │
│              ├─────────────────────────────────►│              │
│              │ POST /api/hrims/fetch-by-       │              │
│              │      institution                 │              │
│              │ { institutionId, batchSize }     │              │
│              │                                  │              │
│              │ Return Batched Employee List     │              │
│              │◄─────────────────────────────────┤              │
│              │ { employees: [...], total }      │              │
│              │                                  │              │
│              │ (Repeat for documents & photos)  │              │
│              │                                  │              │
│              │ Sync All to Local DB             │              │
│              ├────────────────┐                 │              │
│              │ Transaction    │                 │              │
│              │ Bulk Insert    │                 │              │
│              └────────────────┘                 │              │
└────────────────────────────────────────────────────────────────┘
```

### 9.2 MinIO File Storage Integration

```
┌────────────────────────────────────────────────────────────────┐
│                   FILE UPLOAD/DOWNLOAD FLOW                    │
│                                                                │
│  1. File Upload (Employee Document)                            │
│     ┌─────────────┐                                            │
│     │ User Browser│                                            │
│     └──────┬──────┘                                            │
│            │ Select file (PDF, max 2MB)                        │
│            │                                                   │
│     ┌──────▼────────┐                                          │
│     │ React Form    │                                          │
│     │ - File input  │                                          │
│     │ - Validation  │                                          │
│     └──────┬────────┘                                          │
│            │ FormData (multipart)                              │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ POST /api/files/ │                                       │
│     │      upload      │                                       │
│     └──────┬───────────┘                                       │
│            │ 1. Validate file type/size                        │
│            │ 2. Generate unique object key                     │
│            │    {folder}/{timestamp}_{uuid}_{filename}         │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ MinIO Client     │                                       │
│     │ (minio.ts)       │                                       │
│     └──────┬───────────┘                                       │
│            │ putObject()                                       │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ MinIO Server     │                                       │
│     │ Bucket: documents│                                       │
│     └──────┬───────────┘                                       │
│            │ File stored                                       │
│            │                                                   │
│            │ Return object URL                                 │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ Update DB        │                                       │
│     │ Employee record  │                                       │
│     │ Set document URL │                                       │
│     └──────────────────┘                                       │
│                                                                │
│  2. File Download/Preview                                      │
│     ┌─────────────┐                                            │
│     │ User clicks │                                            │
│     │ View/Download                                            │
│     └──────┬──────┘                                            │
│            │                                                   │
│     ┌──────▼────────┐                                          │
│     │ GET /api/files│                                          │
│     │     /preview  │                                          │
│     │ ?url=minio:// │                                          │
│     └──────┬────────┘                                          │
│            │ 1. Validate user access                           │
│            │ 2. Parse object key                               │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ MinIO Client     │                                       │
│     │ presignedGetUrl  │                                       │
│     └──────┬───────────┘                                       │
│            │ Generate signed URL (24h expiry)                  │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ Return URL       │                                       │
│     │ to client        │                                       │
│     └──────┬───────────┘                                       │
│            │                                                   │
│            │ Browser accesses signed URL                       │
│            ▼                                                   │
│     ┌──────────────────┐                                       │
│     │ MinIO Server     │                                       │
│     │ Serve file       │                                       │
│     └──────────────────┘                                       │
└────────────────────────────────────────────────────────────────┘
```

### 9.3 AI Integration (Google Genkit)

```
┌────────────────────────────────────────────────────────────────┐
│               COMPLAINT REWRITING WITH AI                      │
│                                                                │
│  1. Employee Submits Complaint                                 │
│     ┌─────────────────┐                                        │
│     │ Employee Login  │                                        │
│     │ Complaint Form  │                                        │
│     └────────┬────────┘                                        │
│              │ Raw complaint text                              │
│              │ "am complaint about my salarry not paid"        │
│              ▼                                                 │
│     ┌─────────────────────┐                                    │
│     │ POST /api/complaints│                                    │
│     └────────┬────────────┘                                    │
│              │                                                 │
│              │ Call AI rewriting                               │
│              ▼                                                 │
│     ┌─────────────────────────────────┐                        │
│     │ Genkit Flow                     │                        │
│     │ standardizeComplaintFormatting  │                        │
│     └────────┬────────────────────────┘                        │
│              │                                                 │
│              │ Prompt:                                         │
│              │ "Rewrite the following complaint to conform     │
│              │  to CSC standards while preserving all facts"   │
│              │ Input: {complaintText}                          │
│              ▼                                                 │
│     ┌─────────────────────┐                                    │
│     │ Google Gemini API   │                                    │
│     │ (Generative AI)     │                                    │
│     └────────┬────────────┘                                    │
│              │ Process with LLM                                │
│              │                                                 │
│              │ Return standardized text:                       │
│              │ "I am writing to file a formal complaint        │
│              │  regarding unpaid salary. My salary for the     │
│              │  current period has not been disbursed..."      │
│              ▼                                                 │
│     ┌─────────────────────┐                                    │
│     │ Save to Database    │                                    │
│     │ Complaint.details = │                                    │
│     │   rewritten version │                                    │
│     └─────────────────────┘                                    │
│                                                                │
│  2. Officer Reviews Complaint                                  │
│     ├─ Sees standardized, professional format                  │
│     ├─ Original facts preserved                                │
│     └─ Easier to process and respond                           │
└────────────────────────────────────────────────────────────────┘
```

### 9.4 Integration Points Summary

| Integration       | Type         | Protocol                       | Purpose                        |
| ----------------- | ------------ | ------------------------------ | ------------------------------ |
| **HRIMS**         | External API | HTTP/REST                      | Employee data synchronization  |
| **MinIO**         | Self-hosted  | S3 API                         | Document/file storage          |
| **Google Gemini** | Cloud API    | HTTPS/REST                     | AI-powered complaint rewriting |
| **Prisma**        | ORM          | TCP (PostgreSQL wire protocol) | Database access                |
| **Client-Server** | Internal     | HTTP/REST                      | Frontend-backend communication |

---

## 10. Scalability and Performance

### 10.1 Performance Targets

| Metric                 | Target                    | Current Status                 |
| ---------------------- | ------------------------- | ------------------------------ |
| **Page Load Time**     | < 2 seconds               | Optimized with Next.js SSR     |
| **API Response Time**  | < 500ms (95th percentile) | Prisma query optimization      |
| **Concurrent Users**   | 500+                      | Supported with 3 app instances |
| **Database Queries**   | < 100ms (average)         | Indexed foreign keys           |
| **File Upload**        | < 5s for 2MB PDF          | Direct MinIO upload            |
| **Search Performance** | < 1s for employee search  | Database indexing on zanId     |

### 10.2 Scalability Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                   SCALABILITY ARCHITECTURE                     │
│                                                                │
│  Application Tier (Horizontal Scaling)                         │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Load Balancer (Nginx)                                    │ │
│  │  ├─ Round-robin distribution                              │ │
│  │  ├─ Health checks (every 30s)                             │ │
│  │  └─ Session affinity (optional)                           │ │
│  └────────────┬──────────────┬──────────────┬─────────────────┘ │
│               │              │              │                  │
│    ┌──────────▼───┐   ┌──────▼──────┐   ┌──▼──────────┐      │
│    │ Next.js #1  │   │ Next.js #2  │   │ Next.js #3  │      │
│    │ (Stateless) │   │ (Stateless) │   │ (Stateless) │      │
│    └──────────┬───┘   └──────┬──────┘   └──┬──────────┘      │
│               │              │              │                  │
│               └──────────────┼──────────────┘                  │
│                              │                                 │
│  Database Tier (Replication)                                   │
│  ┌─────────────────────────┐│┌─────────────────────────┐      │
│  │ PostgreSQL Primary      │││ PostgreSQL Standby      │      │
│  │ (Read/Write)            │││ (Read-only replica)     │      │
│  │ - All writes            │││ - Reporting queries     │      │
│  │ - Critical reads        │││ - Analytics             │      │
│  └─────────────────────────┘││ - Backup source         │      │
│               │              ││                         │      │
│               └──────────────┤│                         │      │
│                 Streaming    └┘                         │      │
│                 Replication                             │      │
│                                                                │
│  Storage Tier (Distributed MinIO)                             │
│  ┌────────────┬────────────┬────────────┬────────────┐        │
│  │ MinIO #1   │ MinIO #2   │ MinIO #3   │ MinIO #4   │        │
│  │ (Erasure   │ (Erasure   │ (Erasure   │ (Erasure   │        │
│  │  Coded)    │  Coded)    │  Coded)    │  Coded)    │        │
│  └────────────┴────────────┴────────────┴────────────┘        │
│  Distributed mode: 4+ nodes for redundancy                    │
│                                                                │
│  Caching Layer (Optional)                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Redis Cache                                              │ │
│  │  ├─ Session storage                                       │ │
│  │  ├─ Frequent queries (e.g., user roles, institutions)     │ │
│  │  └─ Rate limiting                                         │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 10.3 Performance Optimization Techniques

#### 10.3.1 Frontend Optimizations

```
React/Next.js Optimizations
├── Code Splitting
│   ├─ Dynamic imports for heavy components
│   ├─ Route-based code splitting (automatic in Next.js)
│   └─ Component lazy loading
│
├── Image Optimization
│   ├─ Next.js Image component (automatic optimization)
│   ├─ WebP format with fallbacks
│   ├─ Lazy loading with placeholders
│   └─ Responsive images (srcset)
│
├── Bundle Size Reduction
│   ├─ Tree shaking (automatic in production build)
│   ├─ Remove unused dependencies
│   ├─ Analyze bundle with @next/bundle-analyzer
│   └─ CDN for third-party libraries
│
├── State Management
│   ├─ Zustand (lightweight, minimal re-renders)
│   ├─ Selective subscriptions
│   └─ Memoization with useMemo/useCallback
│
└── Rendering Strategies
    ├─ Server-Side Rendering (SSR) for initial load
    ├─ Static Generation for public pages
    ├─ Client-side rendering for dynamic dashboards
    └─ Incremental Static Regeneration (ISR) if applicable
```

#### 10.3.2 Backend Optimizations

```
API & Database Optimizations
├── Database Query Optimization
│   ├─ Prisma select (only needed fields)
│   ├─ Eager loading with include (avoid N+1)
│   ├─ Pagination for large datasets
│   ├─ Database indexes on foreign keys
│   └─ Query result caching (Redis)
│
├── API Response Optimization
│   ├─ Compression (gzip/brotli)
│   ├─ Efficient JSON serialization
│   ├─ Streaming for large payloads
│   └─ HTTP/2 multiplexing
│
├── Connection Pooling
│   ├─ Prisma connection pool (default)
│   ├─ Pool size based on server resources
│   └─ Connection timeout configuration
│
└── Async Processing
    ├─ Background jobs for heavy operations (HRIMS sync)
    ├─ Queue system (Bull/BullMQ) if needed
    └─ Webhooks for long-running tasks
```

#### 10.3.3 Caching Strategy

```
Multi-Layer Caching
├── Browser Cache
│   ├─ Static assets (CSS, JS, images) - 1 year
│   ├─ API responses - No cache (sensitive data)
│   └─ Service Worker (optional PWA)
│
├── CDN Cache (if deployed)
│   ├─ Static assets worldwide distribution
│   └─ Edge caching for public content
│
├── Application Cache (Redis - optional)
│   ├─ User sessions (if not using DB sessions)
│   ├─ Institution list (rarely changes)
│   ├─ Role definitions
│   ├─ Navigation menu items
│   └─ TTL: 5-60 minutes depending on data
│
└── Database Query Cache
    ├─ Prisma query result caching
    └─ PostgreSQL query plan cache
```

### 10.4 Monitoring and Observability

```
Monitoring Stack (Recommended)
├── Application Performance Monitoring
│   ├─ Next.js Analytics (Vercel, if deployed)
│   ├─ Custom logging with Winston/Pino
│   ├─ Error tracking (Sentry recommended)
│   └─ Performance metrics (CPU, memory, response times)
│
├── Database Monitoring
│   ├─ PostgreSQL slow query log
│   ├─ Connection pool metrics
│   ├─ Query execution plans
│   └─ Database size and growth
│
├── Infrastructure Monitoring
│   ├─ Server metrics (CPU, RAM, disk, network)
│   ├─ Process monitoring (PM2 dashboard)
│   ├─ Uptime monitoring (Pingdom/UptimeRobot)
│   └─ SSL certificate expiration alerts
│
└── User Analytics
    ├─ User activity tracking
    ├─ Feature usage statistics
    ├─ Error rates by endpoint
    └─ Geographic distribution
```

---

## 11. Technology Choices and Rationale

### 11.1 Why Next.js (Full-Stack Framework)?

**Decision**: Next.js 16 with App Router (instead of separate frontend/backend)

**Rationale**:

1. **Unified Codebase**: Frontend and backend in single repository, simplifying development and deployment
2. **Type Safety**: Shared TypeScript types between frontend and backend eliminates API contract mismatches
3. **Developer Experience**: Hot Module Replacement (HMR), fast refresh, built-in routing
4. **Performance**: Automatic code splitting, image optimization, and SSR/SSG capabilities
5. **Deployment Simplicity**: Single build process, one deployable artifact
6. **Ecosystem**: Large community, extensive plugin ecosystem, excellent documentation
7. **Cost-Effective**: Reduced infrastructure (no need for separate backend service)

**Trade-offs**:

- **Scaling Complexity**: Monolithic architecture may require careful refactoring if microservices needed later
- **Team Structure**: Full-stack developers required (not specialized frontend/backend teams)

### 11.2 Why PostgreSQL?

**Decision**: PostgreSQL 14+ (instead of MySQL, MongoDB, or other databases)

**Rationale**:

1. **ACID Compliance**: Critical for financial and HR data integrity
2. **JSON Support**: Array fields for documents[], flexible schema evolution
3. **Government Standard**: Widely used in government systems, proven reliability
4. **Mature Ecosystem**: 25+ years of development, extensive tooling
5. **Advanced Features**: Full-text search, CTEs, window functions
6. **Open Source**: No licensing costs, community-driven development
7. **Prisma Compatibility**: First-class support in Prisma ORM

**Trade-offs**:

- **Learning Curve**: More complex than simpler databases
- **Setup Complexity**: Requires proper configuration for performance

### 11.3 Why Prisma ORM?

**Decision**: Prisma 6.19.1 (instead of TypeORM, Sequelize, or raw SQL)

**Rationale**:

1. **Type Safety**: Auto-generated types from schema, compile-time safety
2. **Developer Experience**: Prisma Studio for visual database browsing
3. **Migration Management**: Version-controlled schema changes
4. **Query Building**: Intuitive API, prevents SQL injection by design
5. **Performance**: Optimized queries, connection pooling
6. **Tooling**: Excellent VS Code extension, CLI tools
7. **Modern Approach**: Schema-first design, automatic migration generation

**Trade-offs**:

- **Flexibility**: Less control than raw SQL for complex queries
- **Learning Investment**: Different paradigm from traditional ORMs

### 11.4 Why Zustand (State Management)?

**Decision**: Zustand 4.5.4 (instead of Redux, MobX, or Context API)

**Rationale**:

1. **Simplicity**: Minimal boilerplate, easy to learn
2. **Bundle Size**: ~1KB minified, compared to Redux (~10KB)
3. **Performance**: Selective subscriptions, no unnecessary re-renders
4. **Persistence**: Built-in middleware for localStorage
5. **TypeScript Support**: Excellent type inference
6. **No Provider Wrapper**: Direct store access anywhere in app
7. **DevTools**: Compatible with Redux DevTools

**Trade-offs**:

- **Community Size**: Smaller than Redux (but growing rapidly)
- **Middleware Ecosystem**: Fewer plugins compared to Redux

### 11.5 Why Tailwind CSS?

**Decision**: Tailwind CSS 3.4.1 (instead of Bootstrap, Material-UI, or CSS Modules)

**Rationale**:

1. **Utility-First**: Rapid development, no context switching to CSS files
2. **Consistency**: Design system enforced through utility classes
3. **Bundle Size**: PurgeCSS removes unused styles automatically
4. **Customization**: Easy to extend with custom utilities and themes
5. **Responsive Design**: Mobile-first breakpoints built-in
6. **Developer Experience**: Great autocomplete with Tailwind CSS IntelliSense
7. **No Class Name Conflicts**: Scoped by nature of utility classes

**Trade-offs**:

- **HTML Verbosity**: Many classes in markup (mitigated by components)
- **Learning Curve**: Different mental model from traditional CSS

### 11.6 Why Radix UI + shadcn/ui?

**Decision**: Radix UI primitives with shadcn/ui components (instead of Material-UI, Chakra UI)

**Rationale**:

1. **Accessibility**: WCAG 2.1 compliant, full keyboard navigation
2. **Unstyled Primitives**: Full design control with Tailwind
3. **Copy-Paste Approach**: No npm bloat, components in your codebase
4. **Customization**: Complete control over styling and behavior
5. **Modern Design**: Clean, professional UI out of the box
6. **Type Safety**: Full TypeScript support
7. **Composability**: Build complex components from primitives

**Trade-offs**:

- **Manual Updates**: Copy-paste means manual updates for new component versions
- **Setup Time**: Slightly longer initial setup than UI libraries

### 11.7 Why MinIO (Object Storage)?

**Decision**: MinIO 8.0.5 (instead of AWS S3, Azure Blob, or local filesystem)

**Rationale**:

1. **S3 Compatibility**: Standard API, easy migration to cloud if needed
2. **Self-Hosted**: Data sovereignty, no third-party dependencies
3. **Cost-Effective**: No per-GB storage fees, one-time infrastructure cost
4. **Performance**: High-throughput, designed for large files
5. **Scalability**: Distributed mode for redundancy and performance
6. **Government Compliance**: Keeps sensitive documents on-premises
7. **Easy Integration**: Official Node.js SDK with TypeScript support

**Trade-offs**:

- **Infrastructure Management**: Requires server setup and maintenance
- **Backup Responsibility**: Manual backup strategy needed

### 11.8 Why Google Genkit (AI Framework)?

**Decision**: Google Genkit 1.8.0 (instead of LangChain, direct OpenAI API)

**Rationale**:

1. **Type Safety**: TypeScript-first, structured prompts and responses
2. **Observability**: Built-in logging and tracing for AI calls
3. **Local Development**: Genkit Dev UI for testing flows
4. **Google Integration**: Seamless Gemini API integration
5. **Production Ready**: Error handling, retries, fallbacks
6. **Cost Visibility**: Track token usage and costs per flow
7. **Framework Agnostic**: Can swap AI providers easily

**Trade-offs**:

- **Newer Framework**: Smaller community compared to LangChain
- **Google Ecosystem**: Tighter coupling to Google Cloud services

### 11.9 Why bcryptjs (Password Hashing)?

**Decision**: bcryptjs 2.4.3 (instead of Argon2, scrypt, or plain bcrypt)

**Rationale**:

1. **Industry Standard**: Widely trusted for password hashing
2. **Pure JavaScript**: No native bindings, cross-platform compatibility
3. **Configurable Rounds**: Adjust security level (currently 10 rounds)
4. **Salting Built-in**: Automatic salt generation
5. **Node.js Compatible**: Works in serverless and edge environments
6. **Battle-Tested**: Decades of use, proven security

**Trade-offs**:

- **Performance**: Slower than native bcrypt (but security is priority)
- **Not Latest**: Argon2 is more modern, but bcrypt is sufficient

### 11.10 Architecture Decision Summary

| Decision Point | Chosen Technology      | Alternative Considered | Reason for Choice               |
| -------------- | ---------------------- | ---------------------- | ------------------------------- |
| **Framework**  | Next.js 16             | React + Express        | Full-stack DX, unified codebase |
| **Database**   | PostgreSQL             | MySQL, MongoDB         | ACID compliance, JSON support   |
| **ORM**        | Prisma                 | TypeORM, Sequelize     | Type safety, modern DX          |
| **State**      | Zustand                | Redux, Context API     | Simplicity, performance         |
| **Styling**    | Tailwind CSS           | Bootstrap, CSS Modules | Utility-first, consistency      |
| **UI Library** | Radix UI + shadcn      | Material-UI, Chakra    | Accessibility, customization    |
| **Storage**    | MinIO                  | AWS S3, local FS       | Self-hosted, S3-compatible      |
| **AI**         | Google Genkit + Gemini | LangChain + OpenAI     | Type safety, Google ecosystem   |
| **Auth**       | bcrypt + Sessions      | Passport.js, Auth0     | Simplicity, self-contained      |

---

## 12. Appendices

### 12.1 Glossary

| Term          | Definition                                                                |
| ------------- | ------------------------------------------------------------------------- |
| **CSMS**      | Civil Service Management System - the HR management platform for Zanzibar |
| **CSC**       | Civil Service Commission - oversight body for civil service               |
| **HHRMD**     | Head of Human Resource Management Department                              |
| **HRMO**      | Human Resource Management Officer                                         |
| **HRO**       | Human Resource Officer (institution-level)                                |
| **HRRP**      | Human Resource Responsible Personnel                                      |
| **DO**        | Disciplinary Officer                                                      |
| **PO**        | Planning Officer                                                          |
| **CSCS**      | Civil Service Commission Secretary                                        |
| **LWOP**      | Leave Without Pay                                                         |
| **HRIMS**     | Human Resource Information Management System (external employee database) |
| **ZanID**     | Zanzibar National Identification Number                                   |
| **ZSSF**      | Zanzibar Social Security Fund                                             |
| **Cadre**     | Job classification/position category in civil service                     |
| **MinIO**     | S3-compatible object storage system                                       |
| **Prisma**    | Modern database ORM (Object-Relational Mapping) tool                      |
| **Genkit**    | Google's AI development framework                                         |
| **API Route** | Backend endpoint in Next.js App Router                                    |
| **SSR**       | Server-Side Rendering                                                     |
| **SSG**       | Static Site Generation                                                    |

### 12.2 System Requirements

#### 12.2.1 Browser Compatibility

| Browser           | Minimum Version | Status            |
| ----------------- | --------------- | ----------------- |
| Google Chrome     | 90+             | ✓ Fully Supported |
| Mozilla Firefox   | 88+             | ✓ Fully Supported |
| Microsoft Edge    | 90+             | ✓ Fully Supported |
| Safari            | 14+             | ✓ Fully Supported |
| Opera             | 76+             | ✓ Fully Supported |
| Internet Explorer | -               | ✗ Not Supported   |

#### 12.2.2 Development Environment

```
Required Software
├── Node.js: v20.x LTS (minimum v18)
├── npm: v10+ (comes with Node.js)
├── PostgreSQL: v14+ (recommended v16)
├── Git: v2.30+
└── Code Editor: VS Code (recommended)

Optional Tools
├── Docker: For containerized development
├── Prisma Studio: Database GUI (included)
├── Redis: For caching layer (optional)
└── Postman/Thunder Client: API testing
```

### 12.3 Environment Setup Guide

```bash
# 1. Clone repository
git clone <repository-url>
cd csms

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# 4. Set up database
createdb nody  # PostgreSQL command
npx prisma migrate dev  # Run migrations
npx prisma db seed  # Seed initial data

# 5. Set up MinIO
# Install MinIO server
# Create buckets: documents, certificates, photos, attachments

# 6. Start development server
npm run dev  # http://localhost:9002

# 7. (Optional) Start Genkit dev server
npm run genkit:dev  # For AI development
```

### 12.4 API Endpoint Reference

See complete API documentation in separate API Reference Document. Key endpoints:

```
Authentication
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/employee-login
POST   /api/auth/change-password
GET    /api/auth/session

Employees
GET    /api/employees
GET    /api/employees/[id]
GET    /api/employees/search
GET    /api/employees/urgent-actions

Requests (pattern repeats for 8 types)
GET    /api/[request-type]
POST   /api/[request-type]
GET    /api/[request-type]/[id]
PUT    /api/[request-type]/[id]

Files
POST   /api/files/upload
GET    /api/files/download
GET    /api/files/preview
GET    /api/files/exists

System
GET    /api/dashboard/metrics
GET    /api/notifications
GET    /api/reports
GET    /api/users
GET    /api/institutions
```

### 12.5 Database Schema Reference

See `prisma/schema.prisma` for complete schema definition. Summary:

- **12 main models**: User, Employee, Institution, 8 request types, Notification, Complaint, EmployeeCertificate
- **296 lines** of schema definition
- **Foreign key relationships** enforce referential integrity
- **Unique constraints** on zanId, username, institution name/TIN
- **Array fields** for documents (stored as JSON in PostgreSQL)

### 12.6 Deployment Checklist

```
Pre-Deployment
├── ✓ Run type checking: npm run typecheck
├── ✓ Run linting: npm run lint
├── ✓ Build application: npm run build
├── ✓ Test production build locally: npm start
├── ✓ Update environment variables for production
├── ✓ Database migration dry-run
├── ✓ Backup current production database
└── ✓ Security audit: npm audit

Deployment Steps
├── 1. Stop application (PM2 stop csms)
├── 2. Pull latest code (git pull origin main)
├── 3. Install dependencies (npm ci --production)
├── 4. Run database migrations (npx prisma migrate deploy)
├── 5. Build application (npm run build)
├── 6. Start application (PM2 start csms)
├── 7. Verify health checks
└── 8. Monitor error logs for 15 minutes

Post-Deployment
├── ✓ Verify login functionality
├── ✓ Test critical user flows
├── ✓ Check MinIO connectivity
├── ✓ Verify HRIMS integration
├── ✓ Review application logs
├── ✓ Monitor database performance
└── ✓ Notify stakeholders of successful deployment
```

### 12.7 Key Design Patterns Used

| Pattern                 | Where Used                  | Purpose                                 |
| ----------------------- | --------------------------- | --------------------------------------- |
| **Repository Pattern**  | Prisma ORM access           | Abstract database operations            |
| **Factory Pattern**     | API client creation         | Centralized HTTP client configuration   |
| **Observer Pattern**    | Zustand store               | State change subscriptions              |
| **Strategy Pattern**    | Role-based filtering        | Different filtering strategies per role |
| **Singleton Pattern**   | Prisma client, MinIO client | Single instance shared across app       |
| **Provider Pattern**    | Auth context                | Inject auth state to React tree         |
| **HOC Pattern**         | Protected routes            | Wrap pages with authentication check    |
| **Composition Pattern** | UI components               | Build complex UIs from primitives       |

### 12.8 Future Enhancement Recommendations

```
Short-Term (3-6 months)
├── Implement comprehensive test suite (Jest + React Testing Library)
├── Add API rate limiting (express-rate-limit)
├── Implement audit log detailed view
├── Enhanced error boundaries for better UX
├── PWA support (offline capabilities)
└── Email notifications (SendGrid/Resend integration)

Medium-Term (6-12 months)
├── Redis caching layer for performance
├── Real-time notifications (WebSockets/Server-Sent Events)
├── Advanced reporting with charts (Recharts expansion)
├── Multi-language support (i18next)
├── Mobile app (React Native with shared API)
└── Automated testing and CI/CD pipeline

Long-Term (12+ months)
├── Microservices architecture (if scale demands)
├── GraphQL API layer (optional)
├── Machine learning for HR analytics
├── Integration with payroll systems
├── Blockchain for immutable audit trail
└── Cloud migration (AWS/Azure/GCP)
```

### 12.9 Contact Information

| Role                  | Responsibility                      | Contact |
| --------------------- | ----------------------------------- | ------- |
| **Technical Lead**    | Architecture, code review           | TBD     |
| **DevOps Engineer**   | Deployment, infrastructure          | TBD     |
| **Database Admin**    | Database management, backups        | TBD     |
| **Project Manager**   | Timeline, stakeholder communication | TBD     |
| **Quality Assurance** | Testing, UAT coordination           | TBD     |

### 12.10 Document Revision History

| Version | Date       | Author    | Changes                       |
| ------- | ---------- | --------- | ----------------------------- |
| 1.0     | 2025-12-25 | CSMS Team | Initial HLD document creation |

---

## End of Document

**Document Status**: Final
**Last Updated**: December 25, 2025
**Next Review Date**: June 25, 2026

For questions or clarifications about this High-Level Design document, please contact the Technical Lead.

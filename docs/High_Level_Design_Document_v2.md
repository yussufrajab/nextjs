# HIGH-LEVEL DESIGN DOCUMENT
## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

**Version 2.0 | December 25, 2025**

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | High-Level Design Document |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 2.0 |
| **Date Prepared** | December 25, 2025 |
| **Prepared By** | System Design Team |
| **Reviewed By** | Lead Architect, Project Manager |
| **Approved By** | IT Department Head |
| **Status** | Final |

---

## Executive Summary

The Civil Service Management System (CSMS) is a comprehensive web-based application designed to modernize and streamline HR processes for the Civil Service Commission of Zanzibar. This High-Level Design document provides an architectural overview of the system, including component diagrams, deployment architecture, and technology stack rationale.

**Key Design Principles:**
- **Simplicity:** Monolithic full-stack architecture for easier deployment and maintenance
- **Security-First:** Multi-layered security with JWT authentication and RBAC
- **Performance:** Optimized for fast response times and concurrent user access
- **Scalability:** Designed to grow from 50 users to 500+ concurrent users
- **Maintainability:** Clean separation of concerns with layered architecture
- **Integration-Ready:** Prepared for external system integrations (HRIMS, Pension, TCU)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [System Architecture](#2-system-architecture)
3. [Component Architecture](#3-component-architecture)
4. [Deployment Architecture](#4-deployment-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Data Architecture](#6-data-architecture)
7. [Security Architecture](#7-security-architecture)
8. [Integration Architecture](#8-integration-architecture)
9. [Performance & Scalability](#9-performance--scalability)
10. [Appendices](#10-appendices)

---

## 1. System Overview

### 1.1 Purpose

The CSMS is designed to digitize and automate HR lifecycle management for Zanzibar's civil service, covering employee onboarding, promotions, confirmations, leave management, retirements, and separations.

### 1.2 Scope

**In Scope:**
- Employee profile management (50,000+ employees)
- HR workflow automation (9 request types)
- Document management and storage
- Role-based access control (9 user roles)
- Complaint management system
- Reporting and analytics
- HRIMS integration
- Notification system
- Audit trail

**Out of Scope:**
- Payroll processing
- Time and attendance tracking
- Performance appraisal system
- Recruitment portal

### 1.3 Stakeholders

| Role | Responsibilities |
|------|------------------|
| **HRO** | HR Officers at institutions - Submit requests |
| **HHRMD** | Head of HR Management Division - Review/approve requests |
| **HRMO** | HR Management Officers - Process requests |
| **DO** | Director's Office - Final approvals |
| **CSCS** | Civil Service Commission Secretary - Policy oversight |
| **EMP** | Employees - Self-service portal |
| **ADMIN** | System Administrators - System configuration |

---

## 2. System Architecture

### 2.1 Architecture Pattern

**Monolithic Full-Stack Architecture with Layered Design**

The system follows a 6-tier layered architecture pattern, combining frontend and backend in a single deployable unit using Next.js 16.

### 2.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET / USERS                         │
│                    (Web Browsers - HTTPS)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓ HTTPS (Port 443)
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX WEB SERVER                          │
│           - SSL/TLS Termination (Let's Encrypt)                  │
│           - Reverse Proxy                                        │
│           - Load Balancing (Future)                              │
│           - DDoS Protection & Rate Limiting                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓ HTTP (Port 9002)
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 16 APPLICATION                        │
│                      (Port 9002)                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              PRESENTATION LAYER                            │ │
│  │  - React 19 Components                                     │ │
│  │  - Radix UI + shadcn/ui                                    │ │
│  │  - Tailwind CSS                                            │ │
│  │  - Client-Side State (Zustand)                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              API LAYER (Next.js API Routes)                │ │
│  │  - RESTful Endpoints (/api/*)                              │ │
│  │  - Authentication APIs                                     │ │
│  │  - Request Management APIs                                 │ │
│  │  - File Management APIs                                    │ │
│  │  - HRIMS Integration APIs                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              MIDDLEWARE LAYER                              │ │
│  │  - JWT Authentication                                      │ │
│  │  - Role-Based Authorization (RBAC)                         │ │
│  │  - Request Validation (Zod)                                │ │
│  │  - Error Handling                                          │ │
│  │  - Logging & Monitoring                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              BUSINESS LOGIC LAYER                          │ │
│  │  - Workflow Orchestration                                  │ │
│  │  - Business Rules Enforcement                              │ │
│  │  - Notification Service                                    │ │
│  │  - AI Services (Genkit)                                    │ │
│  │  - File Processing                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              DATA ACCESS LAYER                             │ │
│  │  - Prisma ORM Client                                       │ │
│  │  - Database Connection Pool                                │ │
│  │  - Query Optimization                                      │ │
│  │  - Transaction Management                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────┬─────────────────────┬────────────────────────┘
                   │                     │
                   ↓                     ↓
    ┌──────────────────────┐  ┌──────────────────────┐
    │   POSTGRESQL 15      │  │    MINIO STORAGE     │
    │   (Port 5432)        │  │    (Port 9001)       │
    │                      │  │                      │
    │  - Employee Data     │  │  - Profile Photos    │
    │  - User Accounts     │  │  - Documents         │
    │  - Requests          │  │  - Certificates      │
    │  - Institutions      │  │  - Attachments       │
    │  - Audit Logs        │  │  - Reports           │
    │  - Notifications     │  │                      │
    └──────────────────────┘  └──────────────────────┘

    ┌─────────────────────────────────────────────────┐
    │       EXTERNAL INTEGRATIONS (Future)            │
    │  - HRIMS (Employee Data Sync)                   │
    │  - Pension System (Retirement Data)             │
    │  - TCU (Certificate Verification)               │
    │  - SMTP Server (Email Notifications)            │
    │  - Google AI (Genkit - Complaint Rewriting)     │
    └─────────────────────────────────────────────────┘
```

### 2.3 Layered Architecture Details

#### Layer 1: Presentation Layer
- **Technology:** React 19, TypeScript 5
- **UI Framework:** Radix UI, shadcn/ui components
- **Styling:** Tailwind CSS
- **State Management:** Zustand (auth state)
- **Responsibilities:**
  - User interface rendering
  - Form handling and validation
  - Client-side routing
  - Real-time UI updates

#### Layer 2: API Layer
- **Technology:** Next.js API Routes
- **Pattern:** RESTful API
- **Responsibilities:**
  - HTTP request handling
  - Response formatting
  - API versioning
  - Rate limiting

#### Layer 3: Middleware Layer
- **Components:**
  - Authentication middleware (JWT)
  - Authorization middleware (RBAC)
  - Validation middleware (Zod schemas)
  - Error handling middleware
  - Logging middleware
- **Responsibilities:**
  - Request preprocessing
  - Security checks
  - Input validation
  - Error standardization

#### Layer 4: Business Logic Layer
- **Components:**
  - Workflow engines
  - Business rules
  - Notification service
  - AI integration (Genkit)
  - File processing
- **Responsibilities:**
  - Core business logic
  - Workflow orchestration
  - Business rule enforcement
  - Integration coordination

#### Layer 5: Data Access Layer
- **Technology:** Prisma ORM
- **Pattern:** Repository pattern
- **Responsibilities:**
  - Database CRUD operations
  - Query optimization
  - Transaction management
  - Connection pooling

#### Layer 6: Data Layer
- **Components:**
  - PostgreSQL (structured data)
  - MinIO (object storage)
- **Responsibilities:**
  - Data persistence
  - Data integrity
  - Backup and recovery

---

## 3. Component Architecture

### 3.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Auth Pages  │  │  Dashboard  │  │   Reports   │          │
│  │ - Login     │  │  - Overview │  │  - Generate │          │
│  │ - Emp Login │  │  - Metrics  │  │  - Export   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Requests   │  │ Complaints  │  │   Profile   │          │
│  │ - Submit    │  │ - Submit    │  │  - View     │          │
│  │ - Review    │  │ - Review    │  │  - Edit     │          │
│  │ - Approve   │  │ - Track     │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Admin     │  │ Institutions│  │   Users     │          │
│  │ - Users     │  │ - Manage    │  │  - Manage   │          │
│  │ - Settings  │  │ - View      │  │  - Roles    │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      API COMPONENTS                           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   Auth APIs     │  │  Employee APIs  │                   │
│  │ /api/auth       │  │ /api/employees  │                   │
│  │ - login         │  │ - search        │                   │
│  │ - logout        │  │ - [id]          │                   │
│  │ - session       │  │ - documents     │                   │
│  │ - change-pwd    │  │ - certificates  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Request APIs   │  │ Complaint APIs  │                   │
│  │ /api/*-requests │  │ /api/complaints │                   │
│  │ - promotion     │  │ - POST          │                   │
│  │ - confirmation  │  │ - GET           │                   │
│  │ - lwop          │  │ - PATCH [id]    │                   │
│  │ - cadre-change  │  │ - DELETE [id]   │                   │
│  │ - retirement    │  │                 │                   │
│  │ - resignation   │  │                 │                   │
│  │ - termination   │  │                 │                   │
│  │ - service-ext   │  │                 │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   File APIs     │  │   HRIMS APIs    │                   │
│  │ /api/files      │  │ /api/hrims      │                   │
│  │ - upload        │  │ - sync-employee │                   │
│  │ - download      │  │ - sync-docs     │                   │
│  │ - preview       │  │ - sync-certs    │                   │
│  │ - exists        │  │ - bulk-fetch    │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Dashboard APIs │  │  Admin APIs     │                   │
│  │ /api/dashboard  │  │ /api/users      │                   │
│  │ - metrics       │  │ /api/institutions│                  │
│  │                 │  │ /api/reports    │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    SERVICE COMPONENTS                         │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Workflow Orchestration Service              │   │
│  │  - Request lifecycle management                      │   │
│  │  - Status transitions                                │   │
│  │  - Review stage progression                          │   │
│  │  - Approval routing                                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Notification Service                        │   │
│  │  - Email notifications (SMTP)                        │   │
│  │  - In-app notifications                              │   │
│  │  - Notification templates                            │   │
│  │  - Delivery tracking                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          File Management Service                     │   │
│  │  - MinIO client integration                          │   │
│  │  - File upload/download                              │   │
│  │  - Presigned URL generation                          │   │
│  │  - File type validation                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          AI Service (Google Genkit)                  │   │
│  │  - Complaint text rewriting                          │   │
│  │  - AI-powered suggestions                            │   │
│  │  - Natural language processing                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Integration Service                         │   │
│  │  - HRIMS API client                                  │   │
│  │  - Data synchronization                              │   │
│  │  - Error handling & retry logic                      │   │
│  │  - Circuit breaker pattern                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Authentication Service                      │   │
│  │  - JWT token generation/validation                   │   │
│  │  - Password hashing (bcrypt)                         │   │
│  │  - Session management                                │   │
│  │  - Account lockout logic                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    DATA COMPONENTS                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Database Models (Prisma)                    │   │
│  │  - User                  - PromotionRequest          │   │
│  │  - Employee              - ConfirmationRequest       │   │
│  │  - Institution           - LwopRequest               │   │
│  │  - Complaint             - CadreChangeRequest        │   │
│  │  - Notification          - RetirementRequest         │   │
│  │  - EmployeeCertificate   - ResignationRequest       │   │
│  │                          - SeparationRequest         │   │
│  │                          - ServiceExtensionRequest   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Storage Buckets (MinIO)                     │   │
│  │  - documents/            - Employee documents        │   │
│  │  - employee-photos/      - Profile photos            │   │
│  │  - certificates/         - Educational certificates  │   │
│  │  - reports/              - Generated reports         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Request Processing Flow

```
USER REQUEST FLOW
─────────────────

1. User Action (Browser)
   │
   ↓
2. HTTPS Request → Nginx (SSL Termination)
   │
   ↓
3. Reverse Proxy → Next.js App (Port 9002)
   │
   ↓
4. Authentication Middleware
   │ ✓ Validate JWT Token
   │ ✓ Check Session
   │
   ↓
5. Authorization Middleware
   │ ✓ Check User Role
   │ ✓ Check Permissions
   │ ✓ Check Institution Access
   │
   ↓
6. Validation Middleware
   │ ✓ Validate Input (Zod)
   │ ✓ Sanitize Data
   │
   ↓
7. Business Logic Layer
   │ ✓ Execute Workflow
   │ ✓ Apply Business Rules
   │ ✓ Trigger Notifications
   │
   ↓
8. Data Access Layer (Prisma)
   │ ✓ Database Operations
   │ ✓ File Operations (MinIO)
   │
   ↓
9. Response Generation
   │ ✓ Format Response
   │ ✓ Log Activity
   │
   ↓
10. Return Response → User (JSON/HTML)
```

### 3.3 Key Components Description

#### 3.3.1 Frontend Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Authentication Pages** | Next.js Pages, React | User login, employee login |
| **Dashboard** | React, Recharts | Metrics, overview, analytics |
| **Request Forms** | React Hook Form, Zod | Submit/review HR requests |
| **Complaint Management** | React, AI Integration | Submit/track complaints |
| **Profile Management** | React, MinIO | View/edit employee profiles |
| **Admin Panel** | React, Radix UI | User/institution management |
| **Reports** | jsPDF, XLSX | Generate/export reports |

#### 3.3.2 Backend Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Authentication API** | Next.js API, JWT | Login, logout, session management |
| **Request APIs** | Next.js API, Prisma | CRUD for 9 request types |
| **Employee API** | Next.js API, Prisma | Employee data management |
| **File API** | Next.js API, MinIO | Upload, download, preview files |
| **HRIMS API** | Next.js API, Fetch | External system integration |
| **Dashboard API** | Next.js API, Prisma | Metrics and analytics |
| **Notification API** | Next.js API, SMTP | Email and in-app notifications |

#### 3.3.3 Shared Libraries

| Library | Location | Purpose |
|---------|----------|---------|
| **Auth Store** | `/src/store/auth-store.ts` | Zustand auth state |
| **API Client** | `/src/lib/api-client.ts` | HTTP client wrapper |
| **MinIO Client** | `/src/lib/minio.ts` | Object storage operations |
| **Database Client** | `/src/lib/db.ts` | Prisma client instance |
| **Utilities** | `/src/lib/utils.ts` | Helper functions |
| **Constants** | `/src/lib/constants.ts` | App-wide constants |
| **Role Utils** | `/src/lib/role-utils.ts` | RBAC utilities |

---

## 4. Deployment Architecture

### 4.1 Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION SERVER                       │
│                   Ubuntu Server 24.04 LTS                    │
│                  IP: 192.168.1.100 (Internal)                │
│              Domain: csms.zanzibar.go.tz                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NGINX (Port 443/80)                                   │ │
│  │  - SSL Certificate (Let's Encrypt)                     │ │
│  │  - Reverse Proxy to Port 9002                          │ │
│  │  - Logs: /var/log/nginx/                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NEXT.JS APP (Port 9002)                               │ │
│  │  - Process Manager: PM2                                │ │
│  │  - Instances: 2 (cluster mode)                         │ │
│  │  - Location: /www/wwwroot/nextjs/                      │ │
│  │  - Logs: PM2 logs                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                    ↓               ↓                         │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  POSTGRESQL 15          │  │  MINIO                  │  │
│  │  (Port 5432)            │  │  (Port 9001)            │  │
│  │  - Database: csms       │  │  - Bucket: documents    │  │
│  │  - User: postgres       │  │  - Location: /data/minio│  │
│  │  - Data: /var/lib/      │  │  - Access: Internal only│  │
│  │    postgresql/          │  │  - Console: Port 9001   │  │
│  │  - Access: localhost    │  │                         │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  BACKUP SYSTEM                                         │ │
│  │  - Location: /backups/                                 │ │
│  │  - Schedule: Daily 2:00 AM                             │ │
│  │  - Retention: 30 days                                  │ │
│  │  - Components: Database + MinIO files                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Server Infrastructure

**Hardware Specifications:**

| Component | Specification |
|-----------|--------------|
| **CPU** | 8 cores @ 2.5+ GHz |
| **RAM** | 16 GB |
| **Storage** | 1 TB SSD (RAID 1) |
| **Network** | 1 Gbps |
| **Redundancy** | RAID 1 (mirroring) |

**Software Stack:**

| Component | Version | Purpose |
|-----------|---------|---------|
| **OS** | Ubuntu Server 24.04 LTS | Operating system |
| **Node.js** | 18.x LTS | Runtime environment |
| **Next.js** | 16.x | Web framework |
| **PostgreSQL** | 15.x | Database |
| **MinIO** | Latest | Object storage |
| **Nginx** | 1.24+ | Web server |
| **PM2** | Latest | Process manager |

### 4.3 Network Architecture

```
NETWORK TOPOLOGY
────────────────

Internet (Public)
      │
      ↓
   Firewall
      │
      ↓ Port 443 (HTTPS), 80 (HTTP), 22 (SSH - Restricted)
┌─────────────────────────────────┐
│   Production Server             │
│   192.168.1.100                 │
│                                 │
│   Exposed Ports:                │
│   - 443 (HTTPS) → Public        │
│   - 80  (HTTP)  → Public        │
│   - 22  (SSH)   → Restricted IP │
│                                 │
│   Internal Ports (Localhost):   │
│   - 9002 (Next.js)              │
│   - 5432 (PostgreSQL)           │
│   - 9001 (MinIO)                │
└─────────────────────────────────┘
```

**Firewall Rules:**

| Port | Service | Access | Source |
|------|---------|--------|--------|
| 443 | HTTPS | Allow | 0.0.0.0/0 (Public) |
| 80 | HTTP | Allow | 0.0.0.0/0 (Redirect to 443) |
| 22 | SSH | Allow | Admin IPs only |
| 9002 | Next.js | Deny | External (localhost only) |
| 5432 | PostgreSQL | Deny | External (localhost only) |
| 9001 | MinIO | Deny | External (localhost only) |

### 4.4 Deployment Process

```
DEPLOYMENT WORKFLOW
───────────────────

1. Code Repository (Git)
   │
   ↓
2. Developer commits code
   │
   ↓
3. Server: Pull latest code
   │ $ cd /www/wwwroot/nextjs
   │ $ git pull origin main
   │
   ↓
4. Install dependencies
   │ $ npm install
   │
   ↓
5. Run database migrations
   │ $ npx prisma migrate deploy
   │
   ↓
6. Build application
   │ $ npm run build
   │
   ↓
7. Restart application
   │ $ pm2 restart csms
   │
   ↓
8. Verify deployment
   │ $ pm2 status
   │ $ pm2 logs csms
   │ $ curl https://csms.zanzibar.go.tz
   │
   ↓
9. Monitor for errors
   │ - Check PM2 logs
   │ - Check Nginx logs
   │ - Test critical paths
```

### 4.5 Environment Configuration

**.env File Structure:**

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

# HRIMS Integration (Future)
HRIMS_API_URL=https://hrims-api.example.com
HRIMS_API_KEY=your-api-key
HRIMS_MOCK_MODE=false

# Google AI (Genkit)
GOOGLE_API_KEY=your-google-api-key
```

### 4.6 PM2 Configuration

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'csms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 9002',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 9002
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

---

## 5. Technology Stack

### 5.1 Technology Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     TECHNOLOGY STACK                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND                                                    │
│  ├── Framework: Next.js 16 (React 19)                       │
│  ├── Language: TypeScript 5                                 │
│  ├── Styling: Tailwind CSS 3.4                              │
│  ├── UI Components: Radix UI + shadcn/ui                    │
│  ├── Forms: React Hook Form + Zod                           │
│  ├── State Management: Zustand 4.5                          │
│  ├── Charts: Recharts 2.15                                  │
│  ├── Icons: Lucide React                                    │
│  └── PDF: jsPDF, XLSX                                       │
│                                                              │
│  BACKEND                                                     │
│  ├── Runtime: Node.js 18 LTS                                │
│  ├── Framework: Next.js 16 API Routes                       │
│  ├── Language: TypeScript 5                                 │
│  ├── Database: PostgreSQL 15                                │
│  ├── ORM: Prisma 6.19                                       │
│  ├── Storage: MinIO (S3-compatible)                         │
│  ├── Validation: Zod 3.24                                   │
│  ├── Authentication: JWT + bcryptjs                         │
│  └── AI: Google Genkit 1.8                                  │
│                                                              │
│  INFRASTRUCTURE                                              │
│  ├── OS: Ubuntu Server 24.04 LTS                            │
│  ├── Web Server: Nginx 1.24+                                │
│  ├── Process Manager: PM2                                   │
│  ├── SSL: Let's Encrypt                                     │
│  └── Version Control: Git                                   │
│                                                              │
│  INTEGRATIONS                                                │
│  ├── Email: SMTP (NodeMailer)                               │
│  ├── HRIMS: REST API (Future)                               │
│  ├── AI: Google Gemini (via Genkit)                         │
│  └── File Storage: MinIO                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Choices Rationale

#### 5.2.1 Frontend Technologies

**Next.js 16**
- ✅ **Full-stack capability:** Single codebase for frontend + backend
- ✅ **Server-Side Rendering (SSR):** Better SEO and initial page load
- ✅ **API Routes:** No need for separate backend service
- ✅ **File-based routing:** Intuitive and organized
- ✅ **TypeScript support:** First-class TypeScript integration
- ✅ **Production-ready:** Used by Netflix, TikTok, Twitch
- ✅ **Large ecosystem:** Extensive React library ecosystem

**TypeScript 5**
- ✅ **Type safety:** Catch errors at compile-time
- ✅ **Better IDE support:** IntelliSense, autocomplete
- ✅ **Self-documenting:** Types serve as documentation
- ✅ **Refactoring confidence:** Safe code changes
- ✅ **Team collaboration:** Clear interfaces and contracts

**Tailwind CSS**
- ✅ **Rapid development:** Utility-first approach
- ✅ **Small bundle size:** PurgeCSS removes unused styles
- ✅ **Consistency:** Design system built-in
- ✅ **Responsive:** Mobile-first by default
- ✅ **Customizable:** Easy to extend and configure

**Radix UI + shadcn/ui**
- ✅ **Accessibility:** WCAG 2.1 AA compliant
- ✅ **Unstyled:** Full control over styling
- ✅ **Keyboard navigation:** Full keyboard support
- ✅ **ARIA compliant:** Proper accessibility attributes
- ✅ **Focus management:** Automatic focus handling

**React Hook Form + Zod**
- ✅ **Performance:** Minimal re-renders
- ✅ **Type-safe validation:** Zod schemas
- ✅ **Better UX:** Async validation, field-level errors
- ✅ **Small bundle size:** 9KB gzipped
- ✅ **Developer experience:** Simple API

#### 5.2.2 Backend Technologies

**PostgreSQL 15**
- ✅ **ACID compliance:** Critical for HR data integrity
- ✅ **Performance:** Handles millions of rows efficiently
- ✅ **Reliability:** Battle-tested, 30+ years
- ✅ **JSONB support:** Flexible data modeling
- ✅ **Full-text search:** Built-in search capabilities
- ✅ **Open-source:** No licensing costs
- ✅ **Community:** Huge community and resources

**Prisma ORM**
- ✅ **Type-safe queries:** Auto-generated TypeScript types
- ✅ **Developer experience:** Intuitive API, Prisma Studio
- ✅ **Migrations:** Declarative schema migrations
- ✅ **Relations:** Easy relationship management
- ✅ **Query optimization:** Efficient query generation
- ✅ **Active development:** Regular updates and improvements

**MinIO**
- ✅ **S3-compatible:** Standard API, easy migration
- ✅ **On-premises:** Data sovereignty (critical for government)
- ✅ **Performance:** High throughput for large files
- ✅ **Scalability:** Distributed mode available
- ✅ **Encryption:** At-rest encryption built-in
- ✅ **Open-source:** No licensing costs
- ✅ **Versioning:** File versioning support

**Google Genkit**
- ✅ **AI Integration:** Easy AI feature integration
- ✅ **Type-safe:** TypeScript-first framework
- ✅ **Local development:** Built-in dev UI
- ✅ **Flexible:** Multiple AI models support
- ✅ **Production-ready:** Built for deployment

#### 5.2.3 Infrastructure Technologies

**Ubuntu Server 24.04 LTS**
- ✅ **Long-term support:** 5 years of updates
- ✅ **Stability:** Production-proven
- ✅ **Security:** Regular security patches
- ✅ **Community:** Extensive documentation
- ✅ **Free:** No licensing costs

**Nginx**
- ✅ **Performance:** High-concurrency handling
- ✅ **Reverse proxy:** Load balancing ready
- ✅ **SSL/TLS:** Let's Encrypt integration
- ✅ **Lightweight:** Low resource usage
- ✅ **Reliable:** Industry standard

**PM2**
- ✅ **Process management:** Auto-restart, clustering
- ✅ **Monitoring:** Built-in monitoring
- ✅ **Zero-downtime:** Graceful reloads
- ✅ **Logs:** Centralized log management
- ✅ **Free:** Open-source

### 5.3 Technology Comparison

| Category | Chosen | Alternatives Considered | Why Chosen |
|----------|--------|-------------------------|------------|
| **Frontend Framework** | Next.js | Create React App, Vite | Full-stack, SSR, API routes |
| **Backend Framework** | Next.js API | Express, NestJS | Same codebase, simpler deployment |
| **Database** | PostgreSQL | MySQL, MongoDB | ACID, reliability, JSONB |
| **ORM** | Prisma | TypeORM, Drizzle | Type safety, DX, migrations |
| **Storage** | MinIO | AWS S3, File System | On-prem, S3-compatible, free |
| **Styling** | Tailwind CSS | CSS Modules, Styled Components | Rapid dev, utility-first |
| **UI Components** | Radix UI | Material-UI, Chakra UI | Unstyled, accessible |
| **State Management** | Zustand | Redux, Context API | Simple, lightweight |
| **Validation** | Zod | Yup, Joi | Type-safe, composable |

### 5.4 Dependency Summary

**Key Dependencies (package.json):**

```json
{
  "dependencies": {
    "next": "^16.0.7",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "@prisma/client": "^6.19.1",
    "minio": "^8.0.5",
    "zustand": "^4.5.4",
    "zod": "^3.24.2",
    "bcryptjs": "^2.4.3",
    "@radix-ui/*": "Latest",
    "tailwindcss": "^3.4.1",
    "react-hook-form": "^7.54.2",
    "genkit": "^1.8.0",
    "@genkit-ai/googleai": "^1.8.0",
    "jspdf": "^2.5.1",
    "xlsx": "^0.18.5",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "prisma": "^6.19.1",
    "@types/node": "^20",
    "@types/react": "^18"
  }
}
```

---

## 6. Data Architecture

### 6.1 Database Schema Overview

**Total Tables:** 15 core tables

**Table Categories:**
1. **Core Entities** (3 tables)
   - User
   - Employee
   - Institution

2. **HR Requests** (9 tables)
   - PromotionRequest
   - ConfirmationRequest
   - LwopRequest
   - CadreChangeRequest
   - RetirementRequest
   - ResignationRequest
   - SeparationRequest
   - ServiceExtensionRequest
   - EmployeeCertificate

3. **Support Systems** (3 tables)
   - Complaint
   - Notification
   - (Audit logs - future)

### 6.2 Entity Relationship Diagram

```
┌─────────────────┐
│   Institution   │
│─────────────────│
│ id (PK)         │────┐
│ name            │    │
│ voteNumber      │    │
│ tinNumber       │    │
└─────────────────┘    │
                       │ 1:M
                       ↓
               ┌─────────────────┐
               │    Employee     │
               │─────────────────│
        ┌──────│ id (PK)         │──────┐
        │      │ zanId           │      │
        │      │ name            │      │
        │      │ institutionId FK│      │
        │      │ ... (40+ fields)│      │
        │      └─────────────────┘      │
        │                               │
        │ 1:1                           │ 1:M
        ↓                               ↓
┌─────────────────┐          ┌──────────────────────┐
│      User       │          │   Request Tables     │
│─────────────────│          │──────────────────────│
│ id (PK)         │          │ PromotionRequest     │
│ username        │          │ ConfirmationRequest  │
│ password        │          │ LwopRequest          │
│ role            │          │ CadreChangeRequest   │
│ employeeId FK   │          │ RetirementRequest    │
│ institutionId FK│          │ ResignationRequest   │
└─────────────────┘          │ SeparationRequest    │
        │                    │ ServiceExtensionReq  │
        │ 1:M                └──────────────────────┘
        ↓                               │
┌─────────────────┐                     │
│  Notification   │                     │ 1:M
│─────────────────│                     ↓
│ id (PK)         │          ┌──────────────────────┐
│ userId (FK)     │          │ EmployeeCertificate  │
│ message         │          │──────────────────────│
│ isRead          │          │ id (PK)              │
└─────────────────┘          │ employeeId (FK)      │
                             │ type                 │
┌─────────────────┐          │ name                 │
│   Complaint     │          │ url                  │
│─────────────────│          └──────────────────────┘
│ id (PK)         │
│ complainantId FK│
│ reviewedById FK │
│ status          │
│ reviewStage     │
└─────────────────┘
```

### 6.3 Key Relationships

```
Institution
  ↓ (1:M)
  ├─→ Employee (50,000+)
  └─→ User (100+)

Employee
  ↓ (1:M)
  ├─→ PromotionRequest
  ├─→ ConfirmationRequest
  ├─→ LwopRequest
  ├─→ CadreChangeRequest
  ├─→ RetirementRequest
  ├─→ ResignationRequest
  ├─→ SeparationRequest
  ├─→ ServiceExtensionRequest
  └─→ EmployeeCertificate

User
  ↓ (1:M)
  ├─→ Requests (as submitter)
  ├─→ Requests (as reviewer)
  ├─→ Complaints (as complainant)
  ├─→ Complaints (as reviewer)
  └─→ Notifications
```

### 6.4 Storage Architecture

**PostgreSQL Database:**
- **Purpose:** Structured relational data
- **Size:** ~12 GB (current), projected 72 GB (5 years)
- **Records:** 50,000+ employees, 5,000+ requests/year
- **Backup:** Daily automated backups

**MinIO Object Storage:**
- **Purpose:** Unstructured files (photos, documents, PDFs)
- **Size:** ~85 GB (current), projected 740 GB (5 years)
- **Buckets:**
  - `documents/` - Employee documents
  - `employee-photos/` - Profile photos
  - `certificates/` - Educational certificates
  - `reports/` - Generated reports
- **Backup:** Daily sync to backup location

### 6.5 Data Flow

```
DATA FLOW DIAGRAM
─────────────────

EMPLOYEE DATA SYNC (HRIMS Integration)
────────────────────────────────────

External HRIMS System
         │
         ↓ REST API (OAuth 2.0)
    /api/hrims/sync-employee
         │
         ↓ Validation (Zod)
    Business Logic Layer
         │
         ↓ Prisma ORM
    PostgreSQL Database
         │
         ├─→ Employee Table
         └─→ EmployeeCertificate Table


FILE UPLOAD FLOW
────────────────

User Browser
      │
      ↓ HTTPS POST /api/files/upload
   File API
      │
      ├─→ Validation (type, size)
      │
      ↓ MinIO Client
   Object Storage
      │
      └─→ Bucket: documents/
            Key: folder/timestamp_random_filename


REQUEST WORKFLOW
────────────────

User Submits Request
      │
      ↓ POST /api/promotions (example)
   Validation Middleware
      │
      ↓ Create Request Record
   PostgreSQL (status: PENDING)
      │
      ↓ Trigger Notification
   Notification Service
      │
      ├─→ Email to Reviewer (SMTP)
      └─→ In-App Notification (DB)
```

---

## 7. Security Architecture

### 7.1 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY ARCHITECTURE                     │
│                      (Defense in Depth)                      │
└─────────────────────────────────────────────────────────────┘

Layer 1: NETWORK SECURITY
├── Firewall (UFW)
├── SSL/TLS (Let's Encrypt)
├── DDoS Protection (Nginx rate limiting)
└── Intrusion Prevention (fail2ban)

Layer 2: APPLICATION SECURITY
├── JWT Authentication (10-min expiry)
├── Role-Based Access Control (9 roles)
├── Input Validation (Zod schemas)
├── CSRF Protection
├── XSS Prevention (React escaping)
└── SQL Injection Prevention (Prisma ORM)

Layer 3: DATA SECURITY
├── Password Hashing (bcrypt, cost 10)
├── Data Encryption at Rest (MinIO)
├── Data Encryption in Transit (TLS)
└── Secure File Storage (presigned URLs)

Layer 4: OPERATIONAL SECURITY
├── Audit Logging (all actions)
├── Session Management (timeout)
├── Account Lockout (5 failed attempts)
├── Security Monitoring
└── Automated Backups (daily)

Layer 5: PHYSICAL SECURITY
└── Server Room Access Control
```

### 7.2 Authentication Flow

```
USER AUTHENTICATION FLOW
────────────────────────

1. User enters credentials (username, password)
   │
   ↓
2. POST /api/auth/login
   │
   ↓
3. Validate username exists
   │ ✓ User found
   │ ✗ Return "Invalid credentials"
   │
   ↓
4. Check account lockout
   │ ✓ Not locked
   │ ✗ Return "Account locked"
   │
   ↓
5. Verify password (bcrypt.compare)
   │ ✓ Password correct
   │ ✗ Increment failed attempts
   │   └→ Lock account if attempts >= 5
   │
   ↓
6. Generate JWT token
   │ - Payload: { userId, role, institutionId }
   │ - Expiry: 10 minutes
   │ - Secret: JWT_SECRET
   │
   ↓
7. Set HttpOnly cookie
   │ - Name: "token"
   │ - Secure: true (HTTPS only)
   │ - SameSite: "strict"
   │
   ↓
8. Reset failed login attempts
   │
   ↓
9. Return success response
   │ - User data (without password)
   │ - Role information
```

### 7.3 Authorization (RBAC)

**Role Hierarchy:**

```
ADMIN (Super Admin)
  └─→ Full system access

CSCS (Commission Secretary)
  └─→ Policy oversight, all approvals

DO (Director's Office)
  └─→ Final approvals for requests

HHRMD (Head of HRMD)
  └─→ Approve requests, manage HR policies

HRMO (HR Management Officer)
  └─→ Process requests, review submissions

HRO (HR Officer)
  └─→ Submit requests, manage institution employees

HRRP (HR Research & Planning)
  └─→ Reports, analytics, planning

PO (Personnel Officer)
  └─→ View records, limited actions

EMP (Employee)
  └─→ Self-service, view own profile
```

**Permission Matrix:**

| Resource | HRO | HHRMD | HRMO | DO | CSCS | EMP | ADMIN |
|----------|-----|-------|------|----|----|-----|-------|
| View Own Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit Own Profile | ✗ | ✗ | ✗ | ✗ | ✗ | Limited | ✓ |
| Submit Request | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Review Request | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Approve Request | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ |
| View All Employees | Inst | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Manage Users | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| View Reports | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Submit Complaint | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 7.4 Data Protection

**Encryption Standards:**

| Data Type | Method | Key Length |
|-----------|--------|------------|
| Passwords | bcrypt | Cost factor: 10 |
| JWT Tokens | HMAC-SHA256 | 256-bit |
| HTTPS/TLS | TLS 1.2/1.3 | AES-256-GCM |
| MinIO Files | AES | 256-bit |

**Sensitive Data Handling:**

```
PASSWORD STORAGE
────────────────
Plain Password → bcrypt.hash(password, 10) → Hashed Password
                                               ↓
                                        Store in Database

FILE STORAGE
────────────
File Upload → Validation → MinIO Storage → Presigned URL (24h)
                             (Encrypted)        ↓
                                           User Download
```

### 7.5 Audit Trail

**Logged Events:**
- User login/logout
- Password changes
- Request submissions
- Request approvals/rejections
- File uploads/downloads
- User creation/modification
- Institution changes
- Complaint submissions
- Critical system changes

**Audit Log Structure:**
```typescript
{
  timestamp: "2025-12-25T10:30:00Z",
  userId: "uuid",
  action: "REQUEST_APPROVED",
  resource: "PromotionRequest",
  resourceId: "uuid",
  changes: { status: "PENDING" → "APPROVED" },
  ipAddress: "192.168.1.50",
  userAgent: "Mozilla/5.0..."
}
```

---

## 8. Integration Architecture

### 8.1 Integration Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CSMS INTEGRATION HUB                      │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ↓                    ↓                    ↓
    ┌─────────┐        ┌──────────┐        ┌──────────┐
    │  HRIMS  │        │   SMTP   │        │ Google   │
    │   API   │        │  Server  │        │   AI     │
    │         │        │          │        │ (Genkit) │
    │ Employee│        │  Email   │        │Complaint │
    │  Sync   │        │  Notify  │        │ Rewrite  │
    └─────────┘        └──────────┘        └──────────┘
```

### 8.2 HRIMS Integration

**Purpose:** Synchronize employee data from external HR Information Management System

**Integration Type:** REST API

**Data Flow:**

```
HRIMS INTEGRATION FLOW
──────────────────────

User Action: Search Employee by ZanID
         │
         ↓
POST /api/hrims/sync-employee
         │
         ├─→ Validate request (Zod)
         │
         ↓
Fetch from HRIMS API
         │ GET https://hrims-api.example.com/api/employee/search
         │ Headers: Authorization: Bearer {API_KEY}
         │
         ↓
Receive HRIMS Response
         │ {
         │   success: true,
         │   data: {
         │     Employee: { zanId, name, ... },
         │     photo: { content: base64 },
         │     documentStats: { totalDocuments, totalCertificates }
         │   }
         │ }
         │
         ↓
Upsert Employee to Database
         │ - Check if exists (by zanId)
         │ - Update or Create
         │
         ↓
Trigger Background Sync
         │ - Sync Documents (if any)
         │ - Sync Certificates (if any)
         │
         ↓
Return Response to User
         │ { employeeId, syncStatus }
```

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hrims/sync-employee` | POST | Sync single employee |
| `/api/hrims/sync-documents` | POST | Sync employee documents |
| `/api/hrims/sync-certificates` | POST | Sync certificates |
| `/api/hrims/fetch-by-institution` | POST | Bulk fetch by institution |
| `/api/hrims/bulk-fetch` | POST | Bulk fetch multiple employees |

**Security:**
- OAuth 2.0 / API Key authentication
- HTTPS only
- Rate limiting (100 requests/minute)
- Circuit breaker pattern (fail after 3 errors)
- Retry logic with exponential backoff

### 8.3 Email Integration (SMTP)

**Purpose:** Send notifications and alerts to users

**Use Cases:**
- User registration
- Password reset OTP
- Request status updates
- Complaint acknowledgments
- Approval notifications
- System alerts

**Configuration:**
```typescript
{
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  from: 'CSMS <noreply@csms.go.tz>'
}
```

### 8.4 AI Integration (Google Genkit)

**Purpose:** AI-powered complaint text rewriting

**Flow:**

```
AI COMPLAINT REWRITING
──────────────────────

User writes complaint text
         │
         ↓
Click "Improve with AI"
         │
         ↓
POST /api/genkit/rewrite
         │
         ↓
Call Genkit Flow
         │ complaintRewriterFlow.run({
         │   originalText: "...",
         │   context: "formal HR complaint"
         │ })
         │
         ↓
Google Gemini API
         │ - Analyze original text
         │ - Improve grammar/clarity
         │ - Maintain formal tone
         │ - Remove inappropriate language
         │
         ↓
Return improved text
         │
         ↓
Display to user
         │ - Show original vs improved
         │ - User can accept/reject
```

### 8.5 Future Integrations

**Planned Integrations:**

1. **Pension System**
   - **Purpose:** Submit retirement data
   - **Protocol:** REST API
   - **Authentication:** API Key
   - **Data Flow:** CSMS → Pension System (one-way)

2. **TCU (Tanzania Commission for Universities)**
   - **Purpose:** Verify educational certificates
   - **Protocol:** REST API
   - **Authentication:** API Key
   - **Data Flow:** Request/Response

3. **Payroll System**
   - **Purpose:** Sync salary data
   - **Protocol:** REST API
   - **Authentication:** OAuth 2.0
   - **Data Flow:** Bidirectional

---

## 9. Performance & Scalability

### 9.1 Performance Targets

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| **Page Load (First Paint)** | < 2s | 1.5s | ✅ |
| **Login** | < 1.5s | 1.2s | ✅ |
| **Dashboard Load** | < 5s | 3.8s | ✅ |
| **Employee Search** | < 1s | 0.6s | ✅ |
| **Form Submission** | < 2s | 1.4s | ✅ |
| **File Upload (2MB)** | < 5s | 3.5s | ✅ |
| **Report Generation** | < 30s | 18s | ✅ |
| **API Response Time** | < 500ms | 280ms | ✅ |

### 9.2 Scalability Plan

**Current Capacity:**
- Concurrent Users: 50 (90% headroom to 500)
- Database Records: 50,000 employees
- File Storage: 85 GB (90% headroom to 1 TB)
- CPU Usage: 20% (80% headroom)
- RAM Usage: 8 GB / 16 GB (50% headroom)

**Vertical Scaling Path:**

```
Phase 1 (Current)     Phase 2 (2-3 years)   Phase 3 (5+ years)
─────────────         ───────────────────   ──────────────────
8 cores               16 cores              32 cores
16 GB RAM             32 GB RAM             64 GB RAM
1 TB SSD              2 TB SSD              4 TB SSD
500 users             1,000 users           2,000+ users
```

**Horizontal Scaling (Future):**

```
         Load Balancer
         /     |     \
      App1   App2   App3
        \      |     /
     ─────────────────
     │   PostgreSQL  │
     │  (Primary +   │
     │   Replicas)   │
     └───────────────┘
           │
     ┌─────────────┐
     │    MinIO    │
     │ (Distributed)│
     └─────────────┘
```

### 9.3 Performance Optimization

**Database Optimizations:**
- ✅ Proper indexing on frequently queried fields
- ✅ Connection pooling (Prisma)
- ✅ Selective field loading (avoid SELECT *)
- ✅ Pagination for large result sets
- ✅ Query optimization (avoid N+1)

**Application Optimizations:**
- ✅ Server-Side Rendering (SSR)
- ✅ Code splitting (Next.js automatic)
- ✅ Lazy loading components
- ✅ Image optimization (Next.js Image)
- ✅ API response caching

**Network Optimizations:**
- ✅ Gzip compression (Nginx)
- ✅ Browser caching headers
- ✅ HTTP/2 (Nginx)
- ✅ CDN (future consideration)

---

## 10. Appendices

### Appendix A: System Requirements

**Minimum Server Requirements:**
- CPU: 4 cores @ 2.0 GHz
- RAM: 8 GB
- Storage: 500 GB SSD
- Network: 100 Mbps
- OS: Ubuntu 20.04+

**Recommended Server Requirements:**
- CPU: 8 cores @ 2.5+ GHz
- RAM: 16 GB
- Storage: 1 TB SSD (RAID 1)
- Network: 1 Gbps
- OS: Ubuntu 24.04 LTS

**Client Requirements:**
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- JavaScript enabled
- Minimum screen resolution: 1280x720
- Stable internet connection (minimum 1 Mbps)

### Appendix B: Port Reference

| Port | Service | Protocol | Access | Purpose |
|------|---------|----------|--------|---------|
| 443 | HTTPS | TCP | Public | Web application (SSL) |
| 80 | HTTP | TCP | Public | Redirect to HTTPS |
| 22 | SSH | TCP | Restricted | Server administration |
| 9002 | Next.js | TCP | Internal | Application server |
| 5432 | PostgreSQL | TCP | Internal | Database |
| 9001 | MinIO | TCP | Internal | Object storage console |
| 9000 | MinIO API | TCP | Internal | Object storage API |

### Appendix C: File Structure

```
/www/wwwroot/nextjs/          # Application root
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── (auth)/          # Auth pages
│   │   ├── dashboard/       # Dashboard pages
│   │   └── api/             # API routes
│   ├── components/          # React components
│   ├── lib/                 # Shared libraries
│   ├── store/               # State management
│   └── ai/                  # AI integration
├── prisma/
│   └── schema.prisma        # Database schema
├── public/                  # Static files
├── docs/                    # Documentation
├── .env                     # Environment variables
├── package.json             # Dependencies
├── next.config.ts           # Next.js config
└── ecosystem.config.js      # PM2 config
```

### Appendix D: Glossary

| Term | Definition |
|------|------------|
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **API** | Application Programming Interface |
| **bcrypt** | Password hashing algorithm |
| **CDN** | Content Delivery Network |
| **CSRF** | Cross-Site Request Forgery |
| **HRIMS** | Human Resource Information Management System |
| **JWT** | JSON Web Token |
| **LTS** | Long-Term Support |
| **MinIO** | S3-compatible object storage |
| **ORM** | Object-Relational Mapping |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SSR** | Server-Side Rendering |
| **TLS** | Transport Layer Security |
| **XSS** | Cross-Site Scripting |
| **Zod** | TypeScript-first schema validation |

### Appendix E: External References

**Documentation:**
- Next.js: https://nextjs.org/docs
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/docs
- PostgreSQL: https://www.postgresql.org/docs
- Prisma: https://www.prisma.io/docs
- MinIO: https://min.io/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Radix UI: https://www.radix-ui.com/docs

**Security:**
- OWASP Top 10: https://owasp.org/www-project-top-ten
- Let's Encrypt: https://letsencrypt.org
- JWT Best Practices: https://tools.ietf.org/html/rfc8725

### Appendix F: Diagram Conventions

**Symbols Used:**
- `[ ]` - Component/Module
- `→` - Data flow / Dependency
- `↓` - Process flow
- `├──` - Tree structure
- `( )` - Grouping
- `{ }` - Configuration/Data
- `< >` - Protocol/Interface

---

## Document Approval

**Prepared By:**
- Name: _______________________
- Title: System Architect
- Signature: _______________________
- Date: _______________________

**Reviewed By:**
- Name: _______________________
- Title: Project Manager
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
| 1.0 | Dec 15, 2025 | Design Team | Initial draft |
| 1.5 | Dec 20, 2025 | Design Team | Added integration architecture |
| 2.0 | Dec 25, 2025 | Design Team | Final version - comprehensive HLD |

---

**END OF HIGH-LEVEL DESIGN DOCUMENT**

*This document is confidential and proprietary to the Civil Service Commission of Zanzibar.*

*For technical questions, contact: architecture@csms.go.tz*

*Version 2.0 | December 25, 2025*

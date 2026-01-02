# TECHNICAL ARCHITECTURE DOCUMENT

## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

**Version 1.0 | December 25, 2025**

---

## Document Control

| Item               | Details                                |
| ------------------ | -------------------------------------- |
| **Document Title** | Technical Architecture Document        |
| **Project Name**   | Civil Service Management System (CSMS) |
| **Version**        | 1.0                                    |
| **Date Prepared**  | December 25, 2025                      |
| **Prepared By**    | Technical Architecture Team            |
| **Reviewed By**    | Lead Architect, Security Officer       |
| **Approved By**    | IT Department Head                     |
| **Status**         | Final                                  |

---

## Executive Summary

This Technical Architecture Document provides comprehensive architectural design for the Civil Service Management System (CSMS). The system is built on modern, scalable architecture using Next.js 16, PostgreSQL 15, and MinIO object storage, deployed on Ubuntu Server 24.04 LTS.

**Key Architecture Highlights:**

- **Architecture Pattern:** Monolithic Full-Stack with Layered Architecture
- **Deployment Model:** On-premises single-server deployment
- **Scalability:** Designed for vertical and horizontal scaling
- **Security:** Multi-layer security with JWT, RBAC, encryption
- **High Availability:** 99.5% uptime target with automated backups
- **Performance:** Optimized for 500+ concurrent users, 50,000+ employee records

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Infrastructure Architecture](#2-infrastructure-architecture)
3. [Network Architecture](#3-network-architecture)
4. [Security Architecture](#4-security-architecture)
5. [Integration Architecture](#5-integration-architecture)
6. [Technology Stack Rationale](#6-technology-stack-rationale)
7. [Data Architecture](#7-data-architecture)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Performance & Scalability](#9-performance--scalability)
10. [High Availability & Disaster Recovery](#10-high-availability--disaster-recovery)

---

## 1. Architecture Overview

### 1.1 Architecture Vision

The CSMS architecture provides a robust, secure, and scalable platform for managing HR processes across the Civil Service Commission of Zanzibar.

**Architecture Priorities:**

- **Simplicity:** Monolithic architecture for easier management
- **Security:** Multi-layered security approach
- **Performance:** Optimized for fast response times
- **Maintainability:** Clean code structure
- **Scalability:** Ability to grow with needs
- **Reliability:** High availability and disaster recovery

### 1.2 High-Level Architecture

```
Internet (HTTPS)
      ↓
   Firewall
      ↓
Nginx (Port 443) → SSL/TLS Termination
      ↓
Next.js App (Port 9002) → Application Logic
      ↓
  ┌───┴────┐
  ↓        ↓
PostgreSQL  MinIO
(Port 5432) (Port 9001)
```

### 1.3 Layered Architecture

**6 Layers:**

1. **Presentation Layer** - React components, UI
2. **API Layer** - RESTful endpoints
3. **Middleware Layer** - Auth, logging, validation
4. **Service Layer** - Business logic
5. **Data Access Layer** - Prisma ORM
6. **Data Layer** - PostgreSQL + MinIO

---

## 2. Infrastructure Architecture

### 2.1 Server Specifications

**Production Server:**

| Component  | Specification           |
| ---------- | ----------------------- |
| CPU        | 8 cores (2.5+ GHz)      |
| RAM        | 16 GB                   |
| Storage    | 1 TB SSD                |
| Network    | 1 Gbps                  |
| OS         | Ubuntu Server 24.04 LTS |
| Redundancy | RAID 1                  |

### 2.2 Software Stack

**Core Components:**

- Node.js 18 LTS
- Next.js 16
- PostgreSQL 15
- MinIO (Latest)
- Nginx 1.24+
- PM2 (Process Manager)

### 2.3 Directory Structure

```
/www/wwwroot/nextjs/     # Application
/var/lib/postgresql/     # Database
/data/minio/            # Object storage
/backups/               # Backups
```

### 2.4 Resource Allocation

**Current Utilization:**

- CPU: ~20% (80% headroom)
- RAM: ~8GB (50% headroom)
- Storage: ~100GB (90% headroom)
- Concurrent Users: ~50 (90% headroom to 500)

---

## 3. Network Architecture

### 3.1 Network Topology

```
Internet
   ↓
Router/Gateway
   ↓
Firewall
   ↓
Production Server (192.168.1.100)
   ├─ Nginx (443, 80)
   ├─ Next.js (9002)
   ├─ PostgreSQL (5432)
   └─ MinIO (9001)
```

### 3.2 Firewall Configuration

**External Ports (Exposed):**

- 443 (HTTPS) - Public access
- 80 (HTTP) - Redirect to HTTPS
- 22 (SSH) - Restricted IPs only

**Internal Ports (Localhost only):**

- 9002 (Next.js)
- 5432 (PostgreSQL)
- 9001 (MinIO)

### 3.3 SSL/TLS Configuration

**Certificate:** Let's Encrypt (Auto-renewal)
**Protocols:** TLS 1.2, TLS 1.3
**Cipher Suites:** Strong only (AES-256-GCM, etc.)

**Nginx SSL Settings:**

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
add_header Strict-Transport-Security "max-age=31536000" always;
```

### 3.4 Network Security

**DDoS Protection:**

- Rate limiting at Nginx
- Connection limits per IP
- Request size limits

**Intrusion Prevention:**

- fail2ban for SSH, Nginx
- Port scanning detection
- Automated IP blocking

---

## 4. Security Architecture

### 4.1 Defense in Depth

**5 Security Layers:**

1. **Network Security** - Firewall, SSL/TLS, DDoS protection
2. **Application Security** - JWT auth, RBAC, input validation
3. **Data Security** - Encryption, hashing, secure storage
4. **Operational Security** - Logging, monitoring, backups
5. **Physical Security** - Server room access control

### 4.2 Authentication

**JWT Authentication:**

```
User Login → Validate Credentials → Generate JWT
   ↓
JWT Token (10-min expiry)
   ↓
HttpOnly Cookie (Secure, SameSite)
   ↓
Subsequent Requests → Verify JWT → Allow/Deny
```

**Security Measures:**

- bcrypt password hashing (cost 10)
- Account lockout (5 failed attempts)
- Session timeout (10 minutes)
- OTP password reset (60-min expiry)

### 4.3 Authorization (RBAC)

**9 User Roles:**

- HRO, HHRMD, HRMO, DO, EMP, PO, CSCS, HRRP, ADMIN

**Permission Matrix:**

- Role-based resource access
- Institutional data isolation
- Function-level access control

**Authorization Enforcement:**

```typescript
// Middleware checks
requireAuth() → Check JWT validity
requireRole(['HHRMD', 'ADMIN']) → Check role
requireInstitution(institutionId) → Check institution access
```

### 4.4 Data Security

**Encryption:**

- **In Transit:** TLS 1.2/1.3 (all communications)
- **At Rest:** AES-256 (MinIO files)
- **Passwords:** bcrypt hashing
- **Sensitive Fields:** Application-level encryption

**File Security:**

- File type validation (whitelist)
- File size limits (2MB/1MB)
- Virus scanning (future: ClamAV)
- Secure file URLs (signed, time-limited)

### 4.5 Security Monitoring

**Monitoring:**

- Failed login attempts
- Account lockouts
- Unusual access patterns
- Off-hours activity
- Privilege escalation attempts

**Automated Alerts:**

- Critical: Immediate email/SMS
- High: Email within 15 min
- Medium: Daily digest
- Low: Weekly report

### 4.6 Audit Trail

**Complete Audit Logging:**

- All user actions logged
- Immutable audit trail
- Cryptographic signing
- 10-year retention
- Tamper detection

---

## 5. Integration Architecture

### 5.1 Current Integrations

**Email Service (SMTP):**

```
CSMS → NodeMailer → SMTP Server → Recipient
```

**Email Use Cases:**

- User registration
- Password reset OTP
- Request notifications
- Complaint updates
- Scheduled reports

### 5.2 Planned Integrations

**1. HRIMS Integration**

- **Purpose:** Employee data sync
- **Protocol:** REST API + OAuth 2.0
- **Data Flow:** Bidirectional

**2. Pension System**

- **Purpose:** Retirement data submission
- **Protocol:** REST API + API Key
- **Data Flow:** CSMS → Pension System

**3. TCU Integration**

- **Purpose:** Certificate verification
- **Protocol:** REST API + API Key
- **Data Flow:** Request/Response

### 5.3 Integration Security

**Security Measures:**

- OAuth 2.0 / API Keys
- HTTPS (TLS 1.2+)
- Request/response encryption
- Rate limiting
- Error handling with retry logic
- Circuit breaker pattern

---

## 6. Technology Stack Rationale

### 6.1 Frontend Technologies

#### Next.js 16

**Selected:** ✅ Next.js 16

**Why Next.js:**

- Full-stack capability (frontend + API routes)
- Server-side rendering (SSR) for performance
- Excellent developer experience
- TypeScript first-class support
- Huge React ecosystem
- Used by Netflix, TikTok, Twitch

#### TypeScript 5.x

**Why TypeScript:**

- Type safety (catch errors at compile-time)
- Better IDE support (intellisense)
- Safer refactoring
- Self-documenting code
- Team collaboration

#### Tailwind CSS

**Why Tailwind:**

- Rapid UI development
- Small bundle size (PurgeCSS)
- Design system built-in
- Highly customizable
- Mobile-first responsive

#### Radix UI

**Why Radix:**

- WCAG 2.1 AA accessibility
- Unstyled (full control)
- Keyboard navigation
- ARIA compliant
- Focus management

### 6.2 Backend Technologies

#### PostgreSQL 15

**Why PostgreSQL:**

- ACID compliance (critical for HR data)
- Excellent performance
- Handles millions of rows
- JSONB support (flexible data)
- Full-text search
- Rock-solid reliability
- Open-source, free

#### Prisma ORM

**Why Prisma:**

- Type-safe queries
- Auto-generated TypeScript types
- Declarative migrations
- Excellent developer experience
- Visual database browser (Prisma Studio)
- Easy relations

#### MinIO

**Why MinIO:**

- S3-compatible API
- On-premises deployment (data sovereignty)
- High performance
- Scalable (distributed ready)
- Encryption at rest
- Open-source, free
- Versioning support

### 6.3 Technology Stack Summary

| Layer      | Technology        | Version | Rationale                    |
| ---------- | ----------------- | ------- | ---------------------------- |
| OS         | Ubuntu Server LTS | 24.04   | 5-year LTS, stability        |
| Web Server | Nginx             | 1.24+   | Performance, SSL termination |
| Runtime    | Node.js LTS       | 18.x    | JavaScript everywhere        |
| Framework  | Next.js           | 16.x    | Full-stack, SSR, modern      |
| Language   | TypeScript        | 5.x     | Type safety, DX              |
| Database   | PostgreSQL        | 15.x    | ACID, reliability            |
| ORM        | Prisma            | 5.x     | Type-safe, DX                |
| Storage    | MinIO             | Latest  | S3-compatible, on-prem       |
| Styling    | Tailwind CSS      | 3.x     | Rapid dev, small bundle      |
| UI         | Radix UI          | Latest  | Accessibility, unstyled      |

**All technologies are:**

- ✅ Open-source (zero licensing costs)
- ✅ Actively maintained
- ✅ Production-proven
- ✅ Well-documented
- ✅ Large community

---

## 7. Data Architecture

### 7.1 Database Schema

**Total Tables:** ~25 tables

**Table Groups:**

1. Users & Auth (2 tables)
2. Organization (1 table)
3. Employees (3 tables)
4. Requests (10 tables - 9 types + documents)
5. Complaints (3 tables)
6. System (2 tables - audit, notifications)

### 7.2 Data Model

**Normalization:** 3NF (Third Normal Form)

**Key Relationships:**

```
Institution (1:M) Employee
Institution (1:M) User
Employee (1:M) All Request Types
Employee (1:M) Complaints
Employee (1:M) Documents
User (1:M) Requests Submitted
User (1:M) Requests Approved
```

### 7.3 Indexing Strategy

**Index Types:**

1. **Primary Indexes** - All id fields (UUID)
2. **Unique Indexes** - username, email, payrollNumber, zanId
3. **Foreign Key Indexes** - All FK fields
4. **Query Optimization** - status, role, dates
5. **Composite Indexes** - Common query patterns

### 7.4 Data Growth Projection

| Year | Employees | Requests | DB Size | Storage |
| ---- | --------- | -------- | ------- | ------- |
| 2025 | 50,000    | 5,000    | 12 GB   | 85 GB   |
| 2026 | 52,000    | 6,000    | 20 GB   | 200 GB  |
| 2027 | 54,000    | 7,000    | 30 GB   | 320 GB  |
| 2028 | 56,000    | 8,000    | 42 GB   | 450 GB  |
| 2029 | 58,000    | 9,000    | 56 GB   | 590 GB  |
| 2030 | 60,000    | 10,000   | 72 GB   | 740 GB  |

### 7.5 Data Retention

**Retention Policy:**

- Active employees: Indefinite
- Retired employees: 10 years, then archive
- Requests: 10 years, then archive
- Complaints: 10 years, then archive
- Audit logs: 10 years, then archive
- Documents: 10 years, then delete
- Backups: 30 days, then delete

---

## 8. Deployment Architecture

### 8.1 Deployment Process

```
1. Developer commits code → Git repository
2. Pull latest code on server
3. npm install (dependencies)
4. npx prisma migrate deploy (database)
5. npm run build (compile)
6. pm2 restart csms (restart app)
7. Verify deployment
```

### 8.2 Environment Configuration

**Environment Variables (.env):**

```bash
NODE_ENV=production
PORT=9002
DATABASE_URL="postgresql://user:pass@localhost:5432/csms"
JWT_SECRET=secret-key
SMTP_HOST=smtp.gmail.com
MINIO_ENDPOINT=localhost
```

### 8.3 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'csms',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 9002',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
```

### 8.4 Rollback Procedure

**If deployment fails:**

1. Stop application
2. Git reset to previous commit
3. Restore database from backup
4. Rebuild application
5. Restart application
6. Verify rollback

---

## 9. Performance & Scalability

### 9.1 Performance Targets

| Operation         | Target | Current |
| ----------------- | ------ | ------- |
| Login             | <1.5s  | 1.2s ✅ |
| Dashboard Load    | <5s    | 3.8s ✅ |
| Search            | <1s    | 0.6s ✅ |
| Form Submit       | <2s    | 1.4s ✅ |
| Report Generation | <30s   | 18s ✅  |
| File Upload (2MB) | <5s    | 3.5s ✅ |

### 9.2 Optimization Strategies

**Database Optimization:**

- Proper indexing
- Query optimization (avoid N+1)
- Connection pooling
- Selective field loading
- Pagination

**Application Optimization:**

- Server-side rendering (SSR)
- Code splitting
- Lazy loading
- Image optimization
- Caching

**Network Optimization:**

- Gzip compression
- Browser caching
- CDN (future)
- HTTP/2

### 9.3 Scalability Strategy

**Current:** Single-server (8 cores, 16GB RAM)

**Vertical Scaling (Short-term):**

- Upgrade to 16 cores, 32GB RAM
- Upgrade to 32 cores, 64GB RAM

**Horizontal Scaling (Long-term):**

```
           Load Balancer
          /      |      \
      App1     App2    App3
         \      |      /
      Shared PostgreSQL
      Shared MinIO
```

### 9.4 Capacity Planning

**Current Capacity:**

- 500 concurrent users
- 100,000 employees
- 10,000 requests/year
- 500 GB storage

**Headroom:** 90% available

---

## 10. High Availability & Disaster Recovery

### 10.1 High Availability

**Uptime Target:** 99.5% (43.8 hours/year downtime)

**Current Setup:** Single server (no HA)

**Future HA Setup:**

```
Primary Server ←→ Standby Server
      ↓                ↓
  Shared Storage (SAN/NFS)
```

### 10.2 Backup Strategy

**Automated Backups:**

- **Database:** Daily at 2:00 AM (pg_dump)
- **Files:** Daily at 2:00 AM (MinIO sync)
- **Retention:** 30 days
- **Storage:** Local + Offsite (future)

**Backup Verification:**

- Weekly restore test
- Integrity checks
- Backup monitoring

### 10.3 Disaster Recovery

**Recovery Objectives:**

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 24 hours

**Recovery Procedures:**

**Scenario 1: Application Failure**

- Restart PM2 (5 minutes)
- If fails, restore from backup (30 minutes)

**Scenario 2: Database Corruption**

- Restore from latest backup (1 hour)
- Replay transaction logs if available

**Scenario 3: Complete Server Failure**

- Provision new server (2 hours)
- Restore database and files (1 hour)
- Reconfigure and test (1 hour)
- Total: 4 hours (within RTO)

### 10.4 Business Continuity

**Critical Functions:**

- User authentication
- Request submission
- Request approval
- Complaint submission
- Employee profile access

**Continuity Measures:**

- Automated backups
- Documentation (runbooks)
- Trained backup staff
- Disaster recovery drills (semi-annual)

---

## Appendices

### Appendix A: Port Reference

| Port | Service    | Access     | Purpose            |
| ---- | ---------- | ---------- | ------------------ |
| 443  | HTTPS      | Public     | Web application    |
| 80   | HTTP       | Public     | Redirect to 443    |
| 22   | SSH        | Restricted | Server admin       |
| 9002 | Next.js    | Internal   | Application server |
| 5432 | PostgreSQL | Internal   | Database           |
| 9001 | MinIO      | Internal   | Object storage     |

### Appendix B: Key File Locations

```
/www/wwwroot/nextjs/        # Application code
/var/lib/postgresql/        # Database data
/data/minio/                # Object storage
/backups/                   # Backup files
/var/log/nginx/             # Web server logs
/var/log/postgresql/        # Database logs
```

### Appendix C: Technology Versions

- Ubuntu Server: 24.04 LTS
- Node.js: 18.x LTS
- Next.js: 16.x
- TypeScript: 5.x
- PostgreSQL: 15.x
- Prisma: 5.x
- MinIO: Latest stable
- Nginx: 1.24+

### Appendix D: External Resources

**Documentation:**

- Next.js: https://nextjs.org/docs
- PostgreSQL: https://www.postgresql.org/docs/
- Prisma: https://www.prisma.io/docs
- MinIO: https://min.io/docs/minio/linux/

**Security:**

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Let's Encrypt: https://letsencrypt.org/
- fail2ban: https://www.fail2ban.org/

### Appendix E: Glossary

| Term     | Definition                                    |
| -------- | --------------------------------------------- |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **API**  | Application Programming Interface             |
| **CDN**  | Content Delivery Network                      |
| **CSRF** | Cross-Site Request Forgery                    |
| **JWT**  | JSON Web Token                                |
| **LTS**  | Long-Term Support                             |
| **ORM**  | Object-Relational Mapping                     |
| **RBAC** | Role-Based Access Control                     |
| **RPO**  | Recovery Point Objective                      |
| **RTO**  | Recovery Time Objective                       |
| **SLA**  | Service Level Agreement                       |
| **SSR**  | Server-Side Rendering                         |
| **TLS**  | Transport Layer Security                      |
| **XSS**  | Cross-Site Scripting                          |

---

## Document Approval

**Prepared By:**

- Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Title: Lead Architect
- Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Date: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

**Reviewed By:**

- Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Title: Security Officer
- Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Date: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

**Approved By:**

- Name: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Title: IT Department Head
- Signature: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Date: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***

---

## Revision History

| Version | Date         | Author            | Changes                |
| ------- | ------------ | ----------------- | ---------------------- |
| 0.1     | Dec 15, 2025 | Architecture Team | Initial draft          |
| 0.5     | Dec 20, 2025 | Architecture Team | Added security details |
| 1.0     | Dec 25, 2025 | Architecture Team | Final version          |

---

**END OF TECHNICAL ARCHITECTURE DOCUMENT**

_This document is confidential and proprietary to the Civil Service Commission of Zanzibar._

_For technical questions, contact: architecture@csms.go.tz_

_Version 1.0 | December 25, 2025_

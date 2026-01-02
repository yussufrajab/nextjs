# SYSTEM DESIGN DOCUMENT (SDD)
## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

**Version 1.0 | December 25, 2025**

---

## Executive Summary

This System Design Document provides comprehensive technical specifications for implementing the Civil Service Management System (CSMS). The document translates requirements from the SRS into actionable technical designs covering architecture, database, APIs, security, UI, and deployment.

**Key Technologies:**
- Next.js 16 (Full-stack framework)
- TypeScript (Type safety)
- PostgreSQL 15 (Database)
- Prisma ORM (Database access)
- MinIO (Object storage)
- Tailwind CSS (Styling)

---

## Table of Contents

1. System Architecture
2. Database Design
3. API Design
4. Security Architecture
5. User Interface Design
6. File Storage Design
7. Deployment Architecture
8. Performance Optimization
9. Error Handling & Logging
10. Testing Strategy

---

## 1. System Architecture

### 1.1 Layered Architecture

The system follows a layered monolithic architecture:

**Layers (Top to Bottom):**

1. **Presentation Layer**
   - React Server Components (SSR)
   - React Client Components (Interactive)
   - Tailwind CSS + Radix UI

2. **API Layer**
   - Next.js API Routes
   - RESTful endpoints
   - Request validation

3. **Middleware Layer**
   - Authentication (JWT)
   - Authorization (RBAC)
   - Logging & error handling

4. **Service Layer**
   - Business logic
   - Workflow orchestration
   - External service integration

5. **Data Access Layer**
   - Prisma ORM
   - Repository pattern
   - Query optimization

6. **Data Layer**
   - PostgreSQL 15
   - MinIO object storage

### 1.2 Component Architecture

**Key Components:**

- **Auth Module:** Login, password reset, session management
- **Employee Module:** Profile CRUD, document management
- **Request Module:** 9 request types with approval workflows
- **Complaint Module:** Employee complaints with resolution tracking
- **Report Module:** Report generation, scheduling, export
- **Admin Module:** User management, system configuration
- **Audit Module:** Action logging, compliance reporting

---

## 2. Database Design

### 2.1 Schema Overview

**Total Tables:** ~25 tables

**Core Table Groups:**
1. Users & Auth (2 tables)
2. Organization (1 table)
3. Employees (3 tables)
4. Requests (10 tables)
5. Complaints (3 tables)
6. System (2 tables)

### 2.2 Key Entity Relationships

```
Institution (1:M) → Employee
Institution (1:M) → User
Employee (1:M) → All Request Types
Employee (1:M) → Complaints
Employee (1:M) → Documents
User (1:M) → Requests Submitted
User (1:M) → Requests Approved
User (1:M) → Audit Logs
```

### 2.3 Critical Tables (Simplified Schema)

**users:**
- id (UUID, PK)
- username (unique)
- passwordHash
- email (unique)
- role (enum)
- institutionId (FK)
- status (enum)

**employees:**
- id (UUID, PK)
- payrollNumber (unique)
- zanId (unique)
- zssfNumber (unique)
- fullName
- institutionId (FK)
- status (enum)
- employmentDate
- confirmationDate

**confirmation_requests:**
- id (UUID, PK)
- employeeId (FK)
- probationEndDate
- status (enum)
- submittedBy (FK)
- approvedBy (FK)
- submissionDate
- approvalDate

**complaints:**
- id (UUID, PK)
- complaintNumber (unique)
- employeeId (FK)
- category (enum)
- status (enum)
- submittedDate
- assignedTo (FK)
- resolvedBy (FK)

**audit_logs:**
- id (UUID, PK)
- timestamp
- userId (FK)
- actionType
- entityType
- entityId
- beforeValue (JSON)
- afterValue (JSON)

### 2.4 Indexing Strategy

**Primary Indexes:**
- All `id` fields (auto-indexed)

**Unique Indexes:**
- username, email
- payrollNumber, zanId, zssfNumber
- complaintNumber

**Performance Indexes:**
- Foreign keys (institutionId, employeeId, etc.)
- Status fields
- Date fields (submissionDate, employmentDate)
- Composite indexes for common queries

**Example Composite Index:**
```sql
CREATE INDEX idx_requests_status_date 
ON confirmation_requests(status, submission_date DESC);
```

---

## 3. API Design

### 3.1 RESTful API Structure

**Base URL:** `/api/`

**HTTP Methods:**
- GET: Retrieve resources
- POST: Create resources
- PUT: Update resources
- DELETE: Delete resources

### 3.2 Core Endpoints

**Authentication:**
```
POST /api/auth/login
POST /api/auth/employee-login
POST /api/auth/forgot-password
POST /api/auth/verify-otp
POST /api/auth/logout
GET  /api/auth/me
```

**Employees:**
```
GET    /api/employees
GET    /api/employees/{id}
POST   /api/employees
PUT    /api/employees/{id}
DELETE /api/employees/{id}
POST   /api/employees/{id}/documents
```

**Requests (Pattern applies to all 9 types):**
```
GET  /api/requests/confirmation
POST /api/requests/confirmation
GET  /api/requests/confirmation/{id}
POST /api/requests/confirmation/{id}/approve
POST /api/requests/confirmation/{id}/reject
POST /api/requests/confirmation/{id}/send-back
```

**Complaints:**
```
GET  /api/complaints
POST /api/complaints
GET  /api/complaints/{id}
POST /api/complaints/{id}/respond
POST /api/complaints/{id}/resolve
POST /api/complaints/{id}/escalate
```

**Reports:**
```
POST /api/reports/generate
POST /api/reports/custom
POST /api/reports/schedule
```

**Files:**
```
POST /api/files/upload
GET  /api/files/download/{id}
```

### 3.3 Response Formats

**Success:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {}
  }
}
```

**Paginated:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5000,
      "totalPages": 100
    }
  }
}
```

---

## 4. Security Architecture

### 4.1 Authentication System

**JWT Token Structure:**
```json
{
  "userId": "uuid",
  "username": "string",
  "role": "HRO|HHRMD|...",
  "institutionId": "uuid|null",
  "iat": 1234567890,
  "exp": 1234568490
}
```

**Token Lifecycle:**
1. Generate on login
2. Store in httpOnly cookie
3. Validate on each request
4. Refresh on activity (10-min sliding expiration)
5. Invalidate on logout

**Password Security:**
- Bcrypt hashing (cost factor 10)
- Minimum 8 characters
- Complexity requirements enforced
- Password history (last 3)
- OTP for password reset (60-min expiry)

### 4.2 Authorization (RBAC)

**Role Hierarchy:**

**Institution-Level:**
- HRO: Submit requests (own institution)
- HRRP: View requests (own institution)

**CSC-Wide:**
- HHRMD: Approve all requests
- HRMO: Approve HR requests only
- DO: Approve disciplinary requests only
- PO: View reports only
- CSCS: Executive oversight

**System-Wide:**
- ADMIN: User management, system config

**Authorization Middleware:**
```typescript
function checkRole(allowedRoles: UserRole[]) {
  return (req, res, next) => {
    const user = req.user; // from JWT
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
}
```

### 4.3 Data Security

**Encryption:**
- Data in transit: TLS 1.2+
- Data at rest: AES-256 (MinIO)
- Passwords: Bcrypt
- Sensitive fields: Application-level encryption

**File Upload Security:**
- Type validation (PDF, JPEG, PNG only)
- Size limits (2MB standard, 1MB complaints)
- Virus scanning
- Content-type verification
- Filename sanitization

**SQL Injection Prevention:**
- Prisma ORM (parameterized queries)
- No raw SQL (except admin reports)
- Input validation on all endpoints

**XSS Prevention:**
- React auto-escaping
- Content Security Policy headers
- Sanitize user input
- httpOnly cookies

### 4.4 Rate Limiting

**Limits:**
- Authentication: 10 attempts/min per IP
- API calls: 100 requests/min per user
- File uploads: 20 uploads/hour per user
- OTP generation: 5 requests/hour per user

---

## 5. User Interface Design

### 5.1 Design System

**Framework:** Tailwind CSS + Radix UI

**Color Palette:**
- Primary: Blue (#2563eb)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Error: Red (#ef4444)
- Neutral: Gray (#6b7280)

**Typography:**
- Font: Inter (sans-serif)
- Headings: 24-32px (bold)
- Body: 14-16px (regular)
- Small: 12px (labels, captions)

**Spacing:**
- Base unit: 4px (Tailwind scale)
- Padding: 4px, 8px, 12px, 16px, 24px
- Margins: 8px, 16px, 24px, 32px

### 5.2 Component Library

**Reusable Components:**
- Button (Primary, Secondary, Danger, Ghost)
- Input (Text, Email, Tel, Date, Select)
- Table (Sortable, Paginated, Filterable)
- Card (Container for widgets)
- Modal/Dialog
- Toast Notifications
- Badge (Status indicators)
- Tabs
- Accordion
- Dropdown Menu

### 5.3 Layout Structure

**Dashboard Layout:**
```
┌────────────────────────────────────────┐
│  Header (Logo, Nav, User, Notifications)│
├────────┬───────────────────────────────┤
│        │                               │
│ Side   │  Main Content Area            │
│ bar    │  - Widgets                    │
│        │  - Tables                     │
│ - Nav  │  - Forms                      │
│ - Quick│  - Charts                     │
│   Acts │                               │
│        │                               │
├────────┴───────────────────────────────┤
│  Footer (Version, Support)             │
└────────────────────────────────────────┘
```

**Responsive Breakpoints:**
- Desktop: ≥1024px (full layout)
- Tablet: 768-1023px (adapted layout)
- Mobile: <768px (not supported, redirect notice)

### 5.4 Navigation

**Primary Navigation:**
- Dashboard
- Employees
- Requests (with submenu)
- Complaints (DO/HHRMD/EMP)
- Reports
- Admin (ADMIN only)

**Breadcrumbs:**
Dashboard > Employees > John Doe > Edit

**User Menu:**
- Profile
- Settings
- Change Password
- Logout

---

## 6. File Storage Design

### 6.1 MinIO Architecture

**Bucket Structure:**
```
csms-bucket/
├── employee-documents/
│   └── {employeeId}/
│       └── {documentId}.pdf
├── employee-certificates/
│   └── {employeeId}/
│       └── {certificateId}.pdf
├── profile-images/
│   └── {employeeId}/
│       └── profile.jpg
├── request-attachments/
│   └── {requestType}/
│       └── {requestId}/
│           └── {documentId}.pdf
├── complaint-attachments/
│   └── {complaintId}/
│       └── {documentId}.{ext}
└── reports/
    └── {reportType}/
        └── {timestamp}_{reportId}.{pdf|xlsx}
```

### 6.2 File Upload Flow

```
1. User selects file
2. Client validates (type, size)
3. Form submit with multipart/form-data
4. Server validates file
5. Virus scan
6. Generate unique filename
7. Upload to MinIO
8. Save metadata to PostgreSQL
9. Return file URL to client
```

### 6.3 File Download Flow

```
1. User clicks download link
2. Client sends GET request with fileId
3. Server validates user permissions
4. Server retrieves metadata from PostgreSQL
5. Server fetches file from MinIO
6. Server streams file to client
7. Log download in audit trail
```

---

## 7. Deployment Architecture

### 7.1 Server Configuration

**Operating System:** Ubuntu Server 24.04 LTS

**Server Software:**
- **Web Server:** Nginx (reverse proxy)
- **Application:** Next.js (Node.js runtime)
- **Database:** PostgreSQL 15
- **Object Storage:** MinIO
- **Process Manager:** PM2
- **Control Panel:** aaPanel

### 7.2 Nginx Configuration

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

### 7.3 Application Deployment

**Installation Path:** `/www/wwwroot/nextjs`

**Environment Variables (.env):**
```
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/csms"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9001"
MINIO_ACCESS_KEY="admin"
MINIO_SECRET_KEY="secret"
MINIO_BUCKET="csms-bucket"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="600" # 10 minutes

# Email
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="noreply@csms.go.tz"
SMTP_PASS="password"

# App
NODE_ENV="production"
PORT="9002"
```

**PM2 Configuration:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'csms',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 9002',
    cwd: '/www/wwwroot/nextjs',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 9002
    }
  }]
};
```

**Deployment Steps:**
```bash
# 1. Pull latest code
cd /www/wwwroot/nextjs
git pull origin main

# 2. Install dependencies
npm install

# 3. Run migrations
npx prisma migrate deploy

# 4. Build application
npm run build

# 5. Restart PM2
pm2 restart csms

# 6. Check status
pm2 status
pm2 logs csms
```

### 7.4 Database Configuration

**PostgreSQL Setup:**
```sql
-- Create database
CREATE DATABASE csms;

-- Create user
CREATE USER csms_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE csms TO csms_user;

-- Set timezone
ALTER DATABASE csms SET timezone TO 'Africa/Dar_es_Salaam';
```

**Connection Pooling:**
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 5 seconds

**Backup Strategy:**
```bash
# Daily automated backup (cron)
0 2 * * * pg_dump csms > /backups/csms_$(date +\%Y\%m\%d).sql

# Retention: 30 days
find /backups -name "csms_*.sql" -mtime +30 -delete
```

### 7.5 MinIO Configuration

```bash
# Start MinIO
minio server /data/minio --address :9001

# Create bucket
mc alias set local http://localhost:9001 admin secret
mc mb local/csms-bucket
mc policy set download local/csms-bucket

# Enable versioning
mc version enable local/csms-bucket
```

---

## 8. Performance Optimization

### 8.1 Database Optimization

**Query Optimization:**
- Use indexes for frequently queried fields
- Avoid N+1 queries (use Prisma include/select)
- Implement pagination (limit/offset or cursor-based)
- Use database views for complex reports
- Connection pooling

**Example Optimized Query:**
```typescript
// Bad: N+1 query
const employees = await prisma.employee.findMany();
for (const emp of employees) {
  emp.institution = await prisma.institution.findUnique({
    where: { id: emp.institutionId }
  });
}

// Good: Single query with join
const employees = await prisma.employee.findMany({
  include: { institution: true }
});
```

### 8.2 Application Optimization

**Server-Side Rendering (SSR):**
- Use React Server Components for static content
- Client Components only for interactivity
- Reduces JavaScript bundle size

**Code Splitting:**
- Lazy load routes
- Dynamic imports for heavy components
- Separate vendor bundles

**Caching:**
- Static asset caching (Nginx)
- API response caching (future: Redis)
- Browser caching (Cache-Control headers)

### 8.3 File Optimization

**Image Optimization:**
- Compress profile images on upload
- Serve WebP format when supported
- Lazy loading for images

**Document Handling:**
- Stream large files instead of loading into memory
- Implement file chunking for uploads >5MB
- Compress documents before storage

---

## 9. Error Handling & Logging

### 9.1 Error Handling

**Error Types:**
```typescript
class ValidationError extends Error {
  statusCode = 400;
}

class AuthenticationError extends Error {
  statusCode = 401;
}

class AuthorizationError extends Error {
  statusCode = 403;
}

class NotFoundError extends Error {
  statusCode = 404;
}

class InternalError extends Error {
  statusCode = 500;
}
```

**Global Error Handler:**
```typescript
export function errorHandler(error: Error) {
  if (error instanceof ValidationError) {
    return { status: 400, message: error.message };
  }
  if (error instanceof AuthenticationError) {
    return { status: 401, message: "Authentication failed" };
  }
  // ... other error types
  
  // Log unexpected errors
  console.error("Unexpected error:", error);
  return { status: 500, message: "Internal server error" };
}
```

### 9.2 Logging

**Log Levels:**
- ERROR: Application errors
- WARN: Warnings
- INFO: General information
- DEBUG: Debugging information

**Log Format:**
```json
{
  "timestamp": "2025-12-25T10:30:45Z",
  "level": "INFO",
  "message": "User logged in",
  "userId": "uuid",
  "ip": "192.168.1.1",
  "metadata": {}
}
```

**Log Storage:**
- Development: Console
- Production: File (`/www/wwwroot/nextjs/logs/app.log`)
- Rotation: Daily, keep 30 days

---

## 10. Testing Strategy

### 10.1 Test Types

**Unit Tests:**
- Test individual functions
- Service layer logic
- Utility functions
- Framework: Jest

**Integration Tests:**
- Test API endpoints
- Database operations
- File uploads
- Framework: Jest + Supertest

**End-to-End Tests:**
- Test user workflows
- Complete request submission and approval
- Framework: Playwright or Cypress

### 10.2 Test Coverage

**Target:** 80% code coverage

**Priority Testing Areas:**
- Authentication flows
- Request approval workflows
- RBAC authorization
- File upload/download
- Report generation
- Audit logging

### 10.3 Example Tests

**Unit Test:**
```typescript
describe('PasswordService', () => {
  it('should hash password correctly', async () => {
    const password = 'Test@123';
    const hash = await PasswordService.hash(password);
    expect(hash).not.toBe(password);
    expect(await PasswordService.verify(password, hash)).toBe(true);
  });
  
  it('should validate password strength', () => {
    expect(PasswordService.isStrong('Test@123')).toBe(true);
    expect(PasswordService.isStrong('weak')).toBe(false);
  });
});
```

**Integration Test:**
```typescript
describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin@123' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });
  
  it('should fail with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

---

## Appendices

### A. Technology Versions

- Node.js: 18 LTS
- Next.js: 16.x
- React: 18.x
- TypeScript: 5.x
- PostgreSQL: 15.x
- Prisma: 5.x
- MinIO: Latest stable
- Nginx: 1.24+
- Ubuntu: 24.04 LTS

### B. Third-Party Libraries

**Core:**
- next: 16.x
- react: 18.x
- typescript: 5.x
- @prisma/client: 5.x
- tailwindcss: 3.x
- @radix-ui/react-*: Latest

**Utilities:**
- bcrypt: Password hashing
- jsonwebtoken: JWT tokens
- nodemailer: Email sending
- date-fns: Date manipulation
- zod: Schema validation
- lucide-react: Icons

**Development:**
- jest: Testing
- eslint: Linting
- prettier: Code formatting
- ts-node: TypeScript execution

### C. Environment Setup

**Development:**
```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev

# Seed database
npx prisma db seed

# Run development server
npm run dev
```

**Production:**
```bash
# Build application
npm run build

# Start production server
npm start

# Or use PM2
pm2 start ecosystem.config.js
```

### D. Monitoring & Maintenance

**Health Checks:**
- Database connectivity
- MinIO availability
- Disk space usage
- Memory usage
- CPU usage

**Alerts:**
- System errors (500 errors)
- Failed logins (>10/min)
- Disk space <10%
- Database connection failures

**Maintenance Tasks:**
- Database backup (daily)
- Log rotation (daily)
- Index rebuild (weekly)
- Security updates (monthly)
- Performance review (monthly)

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Lead Architect** | | | |
| **Lead Developer** | | | |
| **Database Administrator** | | | |
| **Security Officer** | | | |
| **Project Manager** | | | |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Dec 20, 2025 | Architecture Team | Initial draft |
| 0.5 | Dec 23, 2025 | Architecture Team | Added detailed designs |
| 1.0 | Dec 25, 2025 | Architecture Team | Final version for approval |

---

**END OF SYSTEM DESIGN DOCUMENT**

*This document is confidential and proprietary to the Civil Service Commission of Zanzibar.*

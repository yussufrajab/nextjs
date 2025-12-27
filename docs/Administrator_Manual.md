# ADMINISTRATOR MANUAL
## CIVIL SERVICE MANAGEMENT SYSTEM (CSMS)

---

## Document Control

| Item | Details |
|------|---------|
| **Document Title** | Administrator Manual - Civil Service Management System |
| **Project Name** | Civil Service Management System (CSMS) |
| **Version** | 1.0 |
| **Date Prepared** | December 26, 2025 |
| **System URL** | https://csms.zanajira.go.tz |
| **Prepared For** | System Administrators |
| **Document Status** | Final |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Configuration](#2-system-configuration)
3. [User Management](#3-user-management)
4. [Institution Management](#4-institution-management)
5. [Security Settings](#5-security-settings)
6. [Maintenance Tasks](#6-maintenance-tasks)
7. [HRIMS Integration](#7-hrims-integration)
8. [Backup and Recovery](#8-backup-and-recovery)
9. [Monitoring and Logging](#9-monitoring-and-logging)
10. [Troubleshooting](#10-troubleshooting)
11. [Appendices](#11-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Administrator Manual provides comprehensive guidance for system administrators responsible for managing, configuring, and maintaining the Civil Service Management System (CSMS). The manual covers all administrative tasks including system configuration, user management, security settings, maintenance procedures, and troubleshooting.

### 1.2 Scope

This manual is intended for:
- **System Administrators**: Full system access and configuration
- **Technical Support Staff**: Troubleshooting and maintenance
- **IT Management**: System oversight and planning

### 1.3 System Overview

CSMS is a Next.js 14 full-stack application that manages the entire lifecycle of civil service employees in Zanzibar, from hiring through separation. The system handles:

- Employee lifecycle management (hiring, promotions, transfers, separations)
- HR request workflows with multi-level approvals
- Document management with MinIO object storage
- HRIMS integration for employee data synchronization
- Role-based access control (9 user roles)
- Bilingual support (English/Swahili)
- Comprehensive reporting and analytics

**Key Components:**
- **Frontend/Backend**: Next.js 14 application (port 9002)
- **Database**: PostgreSQL with Prisma ORM (database: "nody")
- **Storage**: MinIO S3-compatible object storage
- **AI Integration**: Google Genkit for AI-powered features

---

## 2. System Configuration

### 2.1 Environment Variables

CSMS uses environment variables for configuration. All sensitive configuration is stored in `.env.local` file.

#### 2.1.1 Database Configuration

```bash
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@host:port/nody?schema=public"
```

**Configuration Steps:**
1. Ensure PostgreSQL server is running
2. Create database: `createdb nody`
3. Update `DATABASE_URL` with correct credentials
4. Run migrations: `npx prisma migrate deploy`
5. Generate Prisma client: `npx prisma generate`

#### 2.1.2 MinIO Configuration

```bash
# MinIO S3-Compatible Storage
MINIO_ENDPOINT=your-minio-endpoint
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=csmsadmin
MINIO_SECRET_KEY=Mamlaka2020MinIO
MINIO_BUCKET_NAME=csms-documents
```

**MinIO Setup:**
1. Install MinIO server
2. Create access credentials
3. Create bucket: `csms-documents`
4. Set bucket policy for private access
5. Update environment variables
6. Test connection via CSMS

**MinIO Access:**
- Console URL: `http://your-minio-endpoint:9001`
- API Endpoint: `http://your-minio-endpoint:9000`

#### 2.1.3 HRIMS Integration

```bash
# HRIMS External System Integration
HRIMS_API_URL=https://hrims-api.zanzibar.go.tz
HRIMS_API_KEY=your-hrims-api-key-here
HRIMS_MOCK_MODE=false
```

**HRIMS Configuration:**
1. Obtain API key from HRIMS administrator
2. Update `HRIMS_API_URL` with production endpoint
3. Set `HRIMS_MOCK_MODE=false` for production
4. Test connection via Admin > HRIMS Integration > Test Connection

#### 2.1.4 Application Configuration

```bash
# Next.js Configuration
NEXT_PUBLIC_API_URL=https://csms.zanajira.go.tz/api
NEXT_PUBLIC_BACKEND_URL=https://csms.zanajira.go.tz
NODE_ENV=production
PORT=9002
```

#### 2.1.5 AI Configuration (Optional)

```bash
# Google Genkit for AI features
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### 2.2 Next.js Configuration

The system configuration is defined in `next.config.ts`:

```typescript
// Key configurations:
- TypeScript errors ignored during build (development flexibility)
- Port: 9002 (dev and production)
- Image domains: placehold.co (for placeholders)
- Production domain: csms.zanajira.go.tz
```

### 2.3 Database Schema

The database uses Prisma ORM with PostgreSQL. Key models:

**Core Entities:**
- `User`: System users with roles and authentication
- `Employee`: Civil service employees
- `Institution`: Government institutions/ministries
- `Notification`: User notifications

**Request Types:**
- `ConfirmationRequest`: Employee confirmation after probation
- `PromotionRequest`: Promotions (experience/education-based)
- `LwopRequest`: Leave Without Pay
- `CadreChangeRequest`: Cadre/category changes
- `RetirementRequest`: Retirements (voluntary/compulsory/illness)
- `ResignationRequest`: Voluntary resignations
- `ServiceExtensionRequest`: Service extensions beyond retirement
- `SeparationRequest`: Terminations and dismissals

**Supporting Entities:**
- `Complaint`: Employee grievances
- `EmployeeCertificate`: Educational certificates

### 2.4 System Requirements

**Server Requirements:**
- **OS**: Linux (Debian/Ubuntu recommended)
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB minimum (excluding MinIO storage)
- **Node.js**: v18.x or v20.x
- **PostgreSQL**: v14.x or higher
- **MinIO**: Latest stable version

**Network Requirements:**
- **Port 9002**: Application (HTTP/HTTPS)
- **Port 5432**: PostgreSQL database
- **Port 9000**: MinIO API
- **Port 9001**: MinIO Console
- **HTTPS**: SSL/TLS certificates for production

### 2.5 Installation and Deployment

#### 2.5.1 Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd csms

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
nano .env.local  # Edit with actual values

# 4. Setup database
npx prisma migrate deploy
npx prisma generate

# 5. Build application
npm run build

# 6. Start production server
npm start
```

#### 2.5.2 Production Deployment

**Using PM2 (Recommended):**

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start npm --name "csms" -- start

# Enable auto-restart on server reboot
pm2 startup
pm2 save

# Monitor application
pm2 monit

# View logs
pm2 logs csms
```

**Using systemd:**

Create `/etc/systemd/system/csms.service`:

```ini
[Unit]
Description=CSMS Application
After=network.target postgresql.service

[Service]
Type=simple
User=csms
WorkingDirectory=/path/to/csms
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable csms
sudo systemctl start csms
sudo systemctl status csms
```

### 2.6 SSL/TLS Configuration

For production, use a reverse proxy (Nginx or Apache) with SSL certificates:

**Nginx Configuration Example:**

```nginx
server {
    listen 80;
    server_name csms.zanajira.go.tz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name csms.zanajira.go.tz;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    location / {
        proxy_pass http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. User Management

### 3.1 Administrator Access

**Default Administrator Credentials:**
- **Username**: akassim
- **Password**: password123
- **Role**: ADMIN

**IMPORTANT**: Change the default password immediately after first login.

### 3.2 User Roles

CSMS supports 9 user roles with different permissions:

| Role | Code | Access Level | Description |
|------|------|--------------|-------------|
| **Administrator** | ADMIN | System-wide | Full system access, user management, HRIMS integration |
| **HR Officer** | HRO | Institution only | Submit requests for own institution |
| **Head of HR & Disciplinary** | HHRMD | All institutions | Approve all HR and disciplinary requests |
| **HR Management Officer** | HRMO | All institutions | Approve HR requests (not complaints/terminations) |
| **Disciplinary Officer** | DO | All institutions | Handle complaints and terminations |
| **Planning Officer** | PO | All institutions (read-only) | View reports only, no approvals |
| **CSC Secretary** | CSCS | All institutions (executive) | View all actions and statuses |
| **HR Responsible Personnel** | HRRP | Institution only | Institutional supervisor, view institution data |
| **Employee** | EMPLOYEE | Own data only | View profile, submit complaints |

### 3.3 Creating Users

#### 3.3.1 Via Admin Panel

1. Login as Administrator
2. Navigate to **User Management**
3. Click **Create User**
4. Fill in required fields:
   - **Name**: Min 2 characters
   - **Username**: Min 3 characters, unique
   - **Email**: Valid email format, unique
   - **Phone Number**: 10 digits, numeric only
   - **Password**: Min 6 characters (will be hashed with bcrypt)
   - **Role**: Select from 9 available roles
   - **Institution**: Select institution (required)
5. Click **Submit**

**Field Validations:**
- Name: Minimum 2 characters
- Username: Minimum 3 characters, must be unique
- Email: Valid email format, must be unique
- Phone: Exactly 10 digits, numeric only
- Password: Minimum 6 characters (hashed with bcrypt)
- Role: Required, one of 9 roles
- Institution: Required

#### 3.3.2 Via API

**Endpoint**: `POST /api/users`

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "jdoe",
  "email": "jdoe@example.com",
  "phoneNumber": "0712345678",
  "password": "SecurePassword123",
  "role": "HRO",
  "institutionId": "institution-uuid"
}
```

**Response (Success):**
```json
{
  "id": "user-uuid",
  "name": "John Doe",
  "username": "jdoe",
  "email": "jdoe@example.com",
  "phoneNumber": "0712345678",
  "role": "HRO",
  "active": true,
  "Institution": "Ministry of Health"
}
```

**Error Responses:**
- `400`: Validation error (missing/invalid fields)
- `409`: Username or email already exists
- `500`: Internal server error

### 3.4 Updating Users

#### 3.4.1 Via Admin Panel

1. Navigate to **User Management**
2. Search/select user to update
3. Click **Edit**
4. Modify fields (all except username can be changed):
   - Name
   - Email
   - Phone number
   - Role
   - Institution
   - Active status
5. Click **Save Changes**

#### 3.4.2 Via API

**Endpoint**: `PUT /api/users/{id}`

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "jdoe.updated@example.com",
  "role": "HRMO",
  "active": false
}
```

### 3.5 User Activation and Deactivation

#### 3.5.1 Deactivating Users

When a user should no longer have access:

1. Navigate to **User Management**
2. Select user
3. Click **Deactivate**
4. Confirm action

**Effects:**
- User account set to `active = false`
- User cannot login
- Data remains in database
- Can be reactivated later

**Login Attempt by Deactivated User:**
- Error message: "Account is inactive"
- HTTP Status: 401 Unauthorized

#### 3.5.2 Reactivating Users

1. Navigate to **User Management**
2. Filter by "Inactive" users
3. Select user
4. Click **Activate**
5. Confirm action

### 3.6 Password Management

#### 3.6.1 Resetting User Passwords

**As Administrator:**

1. Navigate to **User Management**
2. Select user
3. Click **Reset Password**
4. Enter new password (min 6 characters)
5. Confirm

**Password Security:**
- All passwords hashed with bcrypt (salt rounds: 10)
- Never stored in plain text
- No password recovery (admin reset only)

#### 3.6.2 Users Changing Own Password

**Via Change Password Feature:**

1. User logs in
2. Navigate to Profile/Settings
3. Click **Change Password**
4. Enter current password
5. Enter new password
6. Confirm new password
7. Submit

**API Endpoint**: `POST /api/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

### 3.7 Searching and Filtering Users

**Search Options:**
- By name (partial match, case-insensitive)
- By ZanID (if linked to employee)
- By institution
- By role
- By status (active/inactive)

**API Endpoint**: `GET /api/users`

Returns all users with institution names (passwords excluded).

### 3.8 User Data Management

#### 3.8.1 Viewing User Details

**User Information Displayed:**
- Basic info: Name, username, email, phone
- Role and institution
- Active status
- Created and updated dates
- Linked employee (if applicable)

#### 3.8.2 Deleting Users

**Caution**: Deleting users is permanent and should be done carefully.

**API Endpoint**: `DELETE /api/users/{id}`

**Considerations:**
- Associated data (requests, notifications) may have foreign key constraints
- Consider deactivating instead of deleting
- Ensure no active workflows depend on the user

---

## 4. Institution Management

### 4.1 Institution Overview

Institutions represent government ministries, departments, and agencies. Each institution has assigned HR Officers and employees.

**Institution Data:**
- Name (unique, required)
- Email (optional)
- Phone number (optional)
- Vote number (budget/financial code)
- TIN number (Tax Identification Number, unique)

### 4.2 Creating Institutions

#### 4.2.1 Via Admin Panel

1. Login as Administrator
2. Navigate to **Institution Management**
3. Click **Create Institution**
4. Fill in details:
   - **Name**: Unique institution name
   - **Email**: Contact email (optional)
   - **Phone**: Contact phone (optional)
   - **Vote Number**: Budget code
   - **TIN Number**: Unique tax ID
5. Click **Submit**

#### 4.2.2 Via API

**Endpoint**: `POST /api/institutions`

**Request Body:**
```json
{
  "name": "Ministry of Education",
  "email": "info@moe.go.tz",
  "phoneNumber": "0242123456",
  "voteNumber": "VOT001",
  "tinNumber": "123-456-789"
}
```

**Validation:**
- Name must be unique (case-insensitive)
- TIN number must be unique (if provided)
- Name is required, other fields optional

**Error Responses:**
- `409`: Institution name or TIN already exists
- `400`: Invalid data format

### 4.3 Updating Institutions

#### 4.3.1 Via Admin Panel

1. Navigate to **Institution Management**
2. Select institution
3. Click **Edit**
4. Update fields
5. Save changes

#### 4.3.2 Via API

**Endpoint**: `PUT /api/institutions/{id}`

**Request Body:**
```json
{
  "email": "newemail@moe.go.tz",
  "phoneNumber": "0242654321",
  "voteNumber": "VOT001-NEW"
}
```

### 4.4 Viewing Institution Details

**Institution Detail View Shows:**
- Basic information
- List of employees from institution
- Assigned HR Officers (HRO, HRRP)
- Institutional statistics:
  - Total employees
  - Employees by status
  - Pending requests

**API Endpoint**: `GET /api/institutions`

Returns all institutions ordered by name.

### 4.5 Institution-User Relationship

**Creating HRO After Institution:**

1. Create institution first
2. Navigate to User Management
3. Create user with role HRO or HRRP
4. Assign to the new institution
5. HRO can now submit requests for that institution

**Data Isolation:**
- HRO/HRRP can only see own institution data
- CSC roles (HHRMD, HRMO, DO, CSCS, PO) see all institutions
- ADMIN sees all institutions

---

## 5. Security Settings

### 5.1 Authentication

#### 5.1.1 Authentication Methods

**Standard Login:**
- Username/email + password
- Bcrypt password hashing (10 salt rounds)
- Session-based authentication
- No JWT tokens (simplified approach)

**Employee Login:**
- ZanID + Payroll Number + ZSSF Number
- Three-factor verification against employee database
- Read-only access to own data

#### 5.1.2 Login Endpoints

**Standard Login:**
- **Endpoint**: `POST /api/auth/login`
- **Request**: `{ username, password }`
- **Response**: User data with role and institution

**Employee Login:**
- **Endpoint**: `POST /api/auth/employee-login`
- **Request**: `{ zanId, payrollNumber, zssfNumber }`
- **Response**: Employee profile data

**Session Check:**
- **Endpoint**: `GET /api/auth/session`
- **Purpose**: Verify active session

**Logout:**
- **Endpoint**: `POST /api/auth/logout`
- **Purpose**: Clear session

### 5.2 Password Policies

**Current Policy:**
- Minimum 6 characters
- No complexity requirements (can be enhanced)
- Bcrypt hashing with 10 salt rounds
- No password expiration (can be implemented)

**Recommended Enhancements:**
```javascript
// Example enhanced validation (to be implemented):
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Password history (prevent reuse of last 5 passwords)
- Password expiration (90 days)
- Account lockout after 5 failed attempts
```

### 5.3 Role-Based Access Control (RBAC)

#### 5.3.1 Permission Matrix

| Role | User Mgmt | Institution Mgmt | HRIMS | Submit Requests | Approve HR | Approve Disciplinary | Reports | Dashboard |
|------|-----------|------------------|-------|-----------------|------------|---------------------|---------|-----------|
| ADMIN | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| HRO | ✗ | ✗ | ✗ | ✓ (own inst.) | ✗ | ✗ | Limited | ✓ |
| HHRMD | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| HRMO | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ |
| DO | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| PO | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| CSCS | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| HRRP | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Limited | ✓ |
| EMPLOYEE | ✗ | ✗ | ✗ | Complaints only | ✗ | ✗ | ✗ | ✗ |

#### 5.3.2 Access Control Implementation

**Middleware Checks:**
- Every API route should verify user role
- Implement route guards for unauthorized access
- Log access attempts for audit trail

**Example Access Control:**
```typescript
// Check if user is ADMIN
if (user.role !== 'ADMIN') {
  return NextResponse.json(
    { message: 'Unauthorized' },
    { status: 403 }
  );
}

// Check if user can access institution data
if (!['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS', 'ADMIN'].includes(user.role)) {
  // Institution-based role - filter by institution
  if (data.institutionId !== user.institutionId) {
    return NextResponse.json(
      { message: 'Access denied' },
      { status: 403 }
    );
  }
}
```

### 5.4 File Upload Security

#### 5.4.1 File Type Restrictions

**Allowed File Types:**
- PDF only (application/pdf)
- No executable files
- No scripts

**File Size Limits:**
- Maximum: 2MB per file
- Enforced at client and server level

#### 5.4.2 MinIO Security

**Bucket Configuration:**
- Private buckets (no public access)
- Access via signed URLs
- Time-limited access tokens
- Separate buckets for different document types (optional)

**Access Control:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::csms-documents/*"],
      "Condition": {
        "IpAddress": {"aws:SourceIp": ["allowed-ip-range"]}
      }
    }
  ]
}
```

### 5.5 Data Protection

#### 5.5.1 Sensitive Data Handling

**Password Storage:**
- All passwords hashed with bcrypt
- Salt rounds: 10
- Never logged or displayed

**Personal Data:**
- ZanID, payroll numbers encrypted in transit (HTTPS)
- Database access restricted to application only
- No direct database access for users

#### 5.5.2 Session Management

**Session Security:**
- HTTP-only cookies (recommended)
- Secure flag enabled (HTTPS only)
- SameSite attribute set
- Session timeout: 24 hours (configurable)

### 5.6 Audit and Logging

**Security Events to Log:**
- Login attempts (success and failure)
- Password changes
- User creation/modification/deletion
- Role changes
- Access denied attempts
- Critical operations (approvals, rejections)

**Log Storage:**
- Application logs in `/logs` directory
- Structured logging (JSON format recommended)
- Log rotation (daily or by size)
- Retention: 90 days minimum

---

## 6. Maintenance Tasks

### 6.1 Regular Maintenance Schedule

#### 6.1.1 Daily Tasks

**Database Maintenance:**
```bash
# Check database connections
psql -U username -d nody -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -U username -d nody -c "SELECT pg_size_pretty(pg_database_size('nody'));"
```

**Application Health:**
```bash
# Check if application is running
pm2 status csms

# Check memory usage
pm2 info csms

# View recent logs
pm2 logs csms --lines 100
```

**MinIO Health:**
```bash
# Check MinIO service
systemctl status minio

# Check storage usage
mc admin info local
```

#### 6.1.2 Weekly Tasks

**Database Cleanup:**
```sql
-- Vacuum database
VACUUM ANALYZE;

-- Check for bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Log Review:**
- Review error logs for anomalies
- Check for failed login attempts
- Monitor API error rates

**Backup Verification:**
- Verify backup completion
- Test backup restore (quarterly)

#### 6.1.3 Monthly Tasks

**Security Updates:**
```bash
# Update npm packages
npm outdated
npm update

# Check for security vulnerabilities
npm audit
npm audit fix

# Update Prisma
npm install @prisma/client@latest prisma@latest
npx prisma generate
```

**Performance Review:**
- Review slow queries
- Check application response times
- Monitor disk usage trends

**User Audit:**
- Review inactive user accounts
- Verify role assignments
- Check for unused accounts

### 6.2 Database Maintenance

#### 6.2.1 Database Backup

**Automated Daily Backup:**

Create backup script `/usr/local/bin/csms-backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/csms"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/csms_backup_$DATE.sql.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U postgres -d nody | gzip > $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "csms_backup_*.sql.gz" -mtime +30 -delete

# Log backup
echo "$(date): Backup completed - $BACKUP_FILE" >> /var/log/csms-backup.log
```

Make executable:
```bash
chmod +x /usr/local/bin/csms-backup.sh
```

Add to crontab (daily at 2 AM):
```bash
0 2 * * * /usr/local/bin/csms-backup.sh
```

#### 6.2.2 Database Restore

**Restore from Backup:**

```bash
# Stop application
pm2 stop csms

# Restore database
gunzip -c /backups/csms/csms_backup_YYYYMMDD_HHMMSS.sql.gz | psql -U postgres -d nody

# Run migrations (if needed)
cd /path/to/csms
npx prisma migrate deploy

# Restart application
pm2 start csms
```

#### 6.2.3 Database Optimization

**Regular Optimization:**

```sql
-- Analyze tables for query optimization
ANALYZE;

-- Reindex tables
REINDEX DATABASE nody;

-- Update statistics
VACUUM ANALYZE;
```

**Find Slow Queries:**

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- log queries > 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 6.3 MinIO Maintenance

#### 6.3.1 MinIO Backup

**Bucket Mirroring:**

```bash
# Install MinIO Client (mc)
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure alias
mc alias set csms-minio http://your-minio-endpoint:9000 csmsadmin Mamlaka2020MinIO

# Mirror bucket to backup location
mc mirror csms-minio/csms-documents /backups/minio/csms-documents
```

**Automated Backup Script:**

```bash
#!/bin/bash
BACKUP_DIR="/backups/minio"
DATE=$(date +%Y%m%d)

mc mirror csms-minio/csms-documents $BACKUP_DIR/csms-documents-$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "csms-documents-*" -mtime +7 -exec rm -rf {} \;
```

#### 6.3.2 Storage Monitoring

**Check Storage Usage:**

```bash
# Get bucket size
mc du csms-minio/csms-documents

# List large files
mc ls --recursive csms-minio/csms-documents | sort -k3 -rh | head -20
```

### 6.4 Application Maintenance

#### 6.4.1 Log Management

**Configure Log Rotation:**

Create `/etc/logrotate.d/csms`:

```
/var/log/csms/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 csms csms
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### 6.4.2 Clearing Cache and Temp Files

```bash
# Clear Next.js cache
rm -rf /path/to/csms/.next/cache

# Clear npm cache
npm cache clean --force

# Clear temp uploads (if applicable)
find /tmp -name "csms-upload-*" -mtime +1 -delete
```

#### 6.4.3 Dependency Updates

**Update Process:**

```bash
# Check for outdated packages
npm outdated

# Update packages (test in staging first!)
npm update

# Update specific package
npm install package@latest

# Rebuild application
npm run build

# Restart
pm2 restart csms
```

### 6.5 Performance Monitoring

#### 6.5.1 Application Monitoring

**PM2 Monitoring:**

```bash
# Real-time monitoring
pm2 monit

# CPU and memory usage
pm2 list

# Detailed info
pm2 info csms
```

**Performance Metrics:**

```bash
# Install PM2 metrics module
pm2 install pm2-server-monit

# View metrics
pm2 web
```

#### 6.5.2 Database Performance

**Connection Monitoring:**

```sql
-- Active connections
SELECT count(*) as connection_count,
       state,
       usename
FROM pg_stat_activity
GROUP BY state, usename;

-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state = 'active';
```

**Kill Long-Running Query:**

```sql
SELECT pg_cancel_backend(pid);  -- Graceful termination
SELECT pg_terminate_backend(pid);  -- Forceful termination
```

---

## 7. HRIMS Integration

### 7.1 HRIMS Overview

HRIMS (Human Resource Information Management System) is an external system containing employee master data. CSMS integrates with HRIMS to sync employee information, photos, documents, and certificates.

**Integration Capabilities:**
- Test HRIMS connection
- Fetch single employee by ZanID or payroll number
- Bulk fetch employees by institution
- Sync employee photos
- Sync employee documents
- Sync employee certificates

### 7.2 HRIMS Configuration

**Environment Variables:**

```bash
HRIMS_API_URL=https://hrims-api.zanzibar.go.tz
HRIMS_API_KEY=your-api-key
HRIMS_MOCK_MODE=false  # Set to true for testing without actual HRIMS
```

**API Endpoints Used:**

```
GET  /api/employees/search?identifier={zanId|payrollNumber}
GET  /api/employees/{identifier}/photo
GET  /api/employees/{identifier}/documents
GET  /api/employees/{identifier}/certificates
GET  /api/institutions/{voteCode}/employees
```

### 7.3 Testing HRIMS Connection

**Via Admin Panel:**

1. Login as Administrator
2. Navigate to **HRIMS Integration**
3. Click **Test Connection**
4. View results:
   - Success: Connection time, API version
   - Failure: Error message, troubleshooting steps

**Via API:**

```bash
curl -X GET https://csms.zanajira.go.tz/api/hrims/test
```

**Expected Response:**

```json
{
  "success": true,
  "message": "HRIMS connection successful",
  "responseTime": "245ms",
  "apiVersion": "v2.1"
}
```

### 7.4 Syncing Employee Data

#### 7.4.1 Single Employee Sync

**Via Admin Panel:**

1. Navigate to **HRIMS Integration > Fetch Employee**
2. Enter ZanID or Payroll Number
3. Click **Fetch**
4. Review employee data
5. Click **Sync to CSMS** to save

**Via API:**

```bash
# Fetch employee
curl -X POST https://csms.zanajira.go.tz/api/hrims/fetch-employee \
  -H "Content-Type: application/json" \
  -d '{"identifier": "19900101-12345-12345-12"}'

# Sync employee
curl -X POST https://csms.zanajira.go.tz/api/hrims/sync-employee \
  -H "Content-Type: application/json" \
  -d '{"employeeData": {...}}'
```

#### 7.4.2 Bulk Employee Sync

**Via Admin Panel:**

1. Navigate to **HRIMS Integration > Bulk Fetch**
2. Select institution
3. Set page number and page size (default: 50)
4. Click **Start Bulk Fetch**
5. Monitor progress (Server-Sent Events)
6. View summary upon completion

**Bulk Fetch Process:**
- Fetches employees in pages (configurable size)
- Shows real-time progress
- Creates or updates employee records
- Links to institution
- Handles errors gracefully
- Provides success/failure count

**Via API:**

```bash
curl -X POST https://csms.zanajira.go.tz/api/hrims/bulk-fetch \
  -H "Content-Type: application/json" \
  -d '{
    "institutionId": "institution-uuid",
    "pageNumber": 1,
    "pageSize": 50
  }'
```

### 7.5 Syncing Photos

#### 7.5.1 Single Photo Sync

**Process:**
1. Fetch photo from HRIMS (base64 format)
2. Convert to binary
3. Upload to MinIO
4. Update employee `profileImageUrl`

**Via Admin Panel:**

1. Navigate to **HRIMS Integration > Fetch Photos**
2. Enter employee identifier
3. Click **Fetch Photo**
4. Preview photo
5. Click **Save to MinIO**

#### 7.5.2 Bulk Photo Sync

**Via Admin Panel:**

1. Select institution
2. Click **Fetch All Photos**
3. Monitor progress
4. View summary (success/failure count)

**Implementation Notes:**
- Split requests to prevent timeout
- Handles missing photos gracefully
- Stores in MinIO bucket: `csms-documents/photos/`
- Updates employee record with URL

### 7.6 Syncing Documents

#### 7.6.1 Document Types

HRIMS provides 4 document types:
1. **Ardhil Hali**: Employee conduct certificate
2. **Birth Certificate**: Birth certificate
3. **Confirmation Letter**: Confirmation letter
4. **Job Contract**: Employment contract

#### 7.6.2 Single Employee Documents

**Via Admin Panel:**

1. Navigate to **HRIMS Integration > Fetch Documents**
2. Enter employee identifier
3. Select document types
4. Click **Fetch Documents**
5. Preview documents
6. Click **Save to MinIO**

**Storage in Employee Record:**
- `ardhilHaliUrl`
- `birthCertificateUrl`
- `confirmationLetterUrl`
- `jobContractUrl`

#### 7.6.3 Bulk Document Sync

**Process:**
- Fetches documents for all employees in institution
- Split by document type to prevent timeout
- Stores PDFs in MinIO
- Updates employee records

**Via Admin Panel:**

1. Select institution
2. Select document types
3. Click **Fetch All Documents**
4. Monitor progress (can take significant time)
5. View summary

### 7.7 Syncing Certificates

**Educational Certificates:**

**Via Admin Panel:**

1. Enter employee identifier
2. Click **Sync Certificates**
3. Certificates saved to `EmployeeCertificate` table

**Certificate Data:**
- Type (e.g., "Degree", "Diploma")
- Name (qualification name)
- Institution (where studied)
- Year completed
- Certificate file URL (stored in MinIO)

### 7.8 HRIMS Integration Troubleshooting

#### Common Issues

**1. Connection Timeout:**
- Check network connectivity
- Verify HRIMS API URL
- Ensure firewall allows outbound HTTPS

**2. Authentication Failed:**
- Verify `HRIMS_API_KEY` is correct
- Check if API key expired
- Contact HRIMS administrator

**3. Employee Not Found:**
- Verify identifier (ZanID/payroll number)
- Check if employee exists in HRIMS
- Ensure correct format (ZanID: XX-XXXXX-XXXXX-XX)

**4. Bulk Fetch Timeout:**
- Reduce page size (try 25 or 10)
- Fetch in smaller batches
- Check HRIMS server load

**5. Photo/Document Upload Failed:**
- Check MinIO service status
- Verify MinIO credentials
- Ensure sufficient storage space
- Check network connectivity to MinIO

#### Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| HRIMS_001 | Connection timeout | Check network, increase timeout |
| HRIMS_002 | Authentication failed | Verify API key |
| HRIMS_003 | Employee not found | Check identifier |
| HRIMS_004 | Invalid data format | Check API version compatibility |
| HRIMS_005 | Rate limit exceeded | Wait and retry |

---

## 8. Backup and Recovery

### 8.1 Backup Strategy

**Three-Tier Backup Approach:**

1. **Daily Backups**: Automated daily backups (retained 30 days)
2. **Weekly Backups**: Full system backups (retained 12 weeks)
3. **Monthly Backups**: Archived backups (retained 12 months)

### 8.2 Database Backup

#### 8.2.1 Automated Backup Script

**Full Backup Script** (`/usr/local/bin/csms-full-backup.sh`):

```bash
#!/bin/bash

# Configuration
BACKUP_BASE="/backups/csms"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database backup
DB_BACKUP_DIR="$BACKUP_BASE/database"
mkdir -p $DB_BACKUP_DIR
pg_dump -U postgres -d nody | gzip > "$DB_BACKUP_DIR/nody_$DATE.sql.gz"

# Application files backup
APP_BACKUP_DIR="$BACKUP_BASE/application"
mkdir -p $APP_BACKUP_DIR
tar -czf "$APP_BACKUP_DIR/csms_app_$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=.next \
    --exclude=.git \
    /path/to/csms

# MinIO backup
MINIO_BACKUP_DIR="$BACKUP_BASE/minio"
mkdir -p $MINIO_BACKUP_DIR
mc mirror csms-minio/csms-documents "$MINIO_BACKUP_DIR/csms-documents-$DATE"

# Cleanup old backups
find $DB_BACKUP_DIR -name "nody_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $APP_BACKUP_DIR -name "csms_app_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $MINIO_BACKUP_DIR -maxdepth 1 -name "csms-documents-*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;

# Log
echo "$(date): Full backup completed" >> /var/log/csms-backup.log
```

#### 8.2.2 Backup Schedule

**Crontab Configuration:**

```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/csms-full-backup.sh

# Weekly full backup at 3 AM on Sundays
0 3 * * 0 /usr/local/bin/csms-weekly-backup.sh

# Monthly backup at 4 AM on 1st day
0 4 1 * * /usr/local/bin/csms-monthly-backup.sh
```

### 8.3 Restore Procedures

#### 8.3.1 Database Restore

**Full Database Restore:**

```bash
#!/bin/bash

# Stop application
pm2 stop csms

# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS nody;"
psql -U postgres -c "CREATE DATABASE nody;"

# Restore from backup
gunzip -c /backups/csms/database/nody_YYYYMMDD_HHMMSS.sql.gz | psql -U postgres -d nody

# Run migrations (if needed)
cd /path/to/csms
npx prisma migrate deploy
npx prisma generate

# Restart application
pm2 start csms

echo "Database restore completed"
```

#### 8.3.2 Application Restore

```bash
#!/bin/bash

# Stop application
pm2 stop csms

# Backup current application
mv /path/to/csms /path/to/csms.old

# Extract backup
tar -xzf /backups/csms/application/csms_app_YYYYMMDD_HHMMSS.tar.gz -C /path/to/

# Restore node_modules
cd /path/to/csms
npm install

# Rebuild
npm run build

# Restart application
pm2 start csms

echo "Application restore completed"
```

#### 8.3.3 MinIO Restore

```bash
#!/bin/bash

# Remove current bucket (CAREFUL!)
mc rm --recursive --force csms-minio/csms-documents

# Restore from backup
mc mirror /backups/csms/minio/csms-documents-YYYYMMDD csms-minio/csms-documents

echo "MinIO restore completed"
```

### 8.4 Disaster Recovery Plan

#### 8.4.1 Recovery Time Objective (RTO)

**Target RTO: 4 hours**

Recovery sequence:
1. Infrastructure setup (if needed): 1 hour
2. Database restore: 30 minutes
3. Application restore: 30 minutes
4. MinIO restore: 1 hour
5. Testing and verification: 1 hour

#### 8.4.2 Recovery Point Objective (RPO)

**Target RPO: 24 hours**

- Daily backups ensure maximum data loss of 24 hours
- Consider more frequent backups for critical periods

#### 8.4.3 Disaster Recovery Procedure

**Step-by-Step Recovery:**

1. **Assess Situation**
   - Identify failure type (database, application, storage, infrastructure)
   - Determine last known good state
   - Notify stakeholders

2. **Setup Infrastructure** (if needed)
   - Provision new server
   - Install dependencies (Node.js, PostgreSQL, MinIO)
   - Configure network and firewall

3. **Restore Database**
   - Restore latest backup
   - Verify data integrity
   - Run migrations

4. **Restore Application**
   - Extract application backup
   - Install dependencies
   - Configure environment variables
   - Build application

5. **Restore MinIO**
   - Restore document storage
   - Verify file accessibility

6. **Verification**
   - Test login functionality
   - Verify data accuracy
   - Test critical workflows
   - Check integrations (HRIMS)

7. **Go Live**
   - Update DNS (if needed)
   - Notify users
   - Monitor closely for 24 hours

### 8.5 Backup Verification

**Monthly Backup Test:**

```bash
#!/bin/bash

# Create test environment
docker-compose up -d test-postgres

# Restore latest backup to test environment
gunzip -c /backups/csms/database/nody_latest.sql.gz | \
    psql -h localhost -p 5433 -U postgres -d test_nody

# Run verification queries
psql -h localhost -p 5433 -U postgres -d test_nody -c "
    SELECT
        (SELECT COUNT(*) FROM \"User\") as user_count,
        (SELECT COUNT(*) FROM \"Employee\") as employee_count,
        (SELECT COUNT(*) FROM \"Institution\") as institution_count;
"

# Cleanup
docker-compose down test-postgres

echo "Backup verification completed"
```

---

## 9. Monitoring and Logging

### 9.1 Application Monitoring

#### 9.1.1 PM2 Monitoring

**Real-time Monitoring:**

```bash
# Monitor all processes
pm2 monit

# List all processes with status
pm2 list

# Detailed process info
pm2 info csms

# Show logs
pm2 logs csms

# Show only errors
pm2 logs csms --err
```

**PM2 Web Interface:**

```bash
# Start web interface (port 9615)
pm2 web
```

Access at: `http://your-server:9615`

#### 9.1.2 Health Checks

**Create Health Check Endpoint:**

`/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;

    // Check MinIO (optional)
    // await minioClient.bucketExists('csms-documents');

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date(),
      database: 'connected',
      version: process.env.npm_package_version
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

**Automated Health Checks:**

Add to crontab:
```bash
*/5 * * * * curl -f http://localhost:9002/api/health || echo "CSMS health check failed" | mail -s "CSMS Alert" admin@example.com
```

### 9.2 Database Monitoring

#### 9.2.1 Connection Monitoring

**Monitor Active Connections:**

```sql
-- Current connections
SELECT count(*) as total_connections,
       sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_connections,
       sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle_connections
FROM pg_stat_activity
WHERE datname = 'nody';

-- Connections by user
SELECT usename, count(*) as connection_count
FROM pg_stat_activity
WHERE datname = 'nody'
GROUP BY usename;

-- Long-running transactions
SELECT pid, usename, state,
       now() - xact_start AS transaction_duration,
       query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
  AND now() - xact_start > interval '5 minutes'
ORDER BY xact_start;
```

#### 9.2.2 Performance Monitoring

**Slow Queries:**

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slowest queries
SELECT
    substring(query, 1, 50) AS short_query,
    calls,
    round(total_time::numeric, 2) AS total_time_ms,
    round(mean_time::numeric, 2) AS mean_time_ms,
    round((100 * total_time / sum(total_time) OVER ())::numeric, 2) AS percentage
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

**Table Statistics:**

```sql
-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 9.3 MinIO Monitoring

**Storage Usage:**

```bash
# Bucket size
mc du csms-minio/csms-documents

# Server info
mc admin info csms-minio

# Server statistics
mc admin trace csms-minio
```

**MinIO Metrics:**

MinIO provides Prometheus metrics at `/minio/v2/metrics/cluster`

### 9.4 Logging

#### 9.4.1 Application Logs

**Log Locations:**

```
/var/log/csms/application.log    - General application logs
/var/log/csms/error.log          - Error logs
/var/log/csms/access.log         - API access logs
/var/log/csms/security.log       - Security events
```

**Log Levels:**

- **ERROR**: Application errors, exceptions
- **WARN**: Warnings, deprecated usage
- **INFO**: General information, API calls
- **DEBUG**: Detailed debugging information

**PM2 Logs:**

```bash
# View all logs
pm2 logs csms

# View only errors
pm2 logs csms --err

# Export logs
pm2 logs csms --lines 1000 > /tmp/csms-logs.txt
```

#### 9.4.2 Structured Logging

**Recommended Logger: Winston**

```bash
npm install winston
```

**Example Configuration:**

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: '/var/log/csms/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: '/var/log/csms/application.log'
    })
  ]
});

// Usage
logger.info('User logged in', { userId: user.id, role: user.role });
logger.error('Database connection failed', { error: error.message });
```

#### 9.4.3 Security Event Logging

**Events to Log:**

```typescript
// Login attempts
logger.info('Login attempt', {
  event: 'LOGIN_ATTEMPT',
  username: username,
  success: true/false,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

// Password changes
logger.info('Password changed', {
  event: 'PASSWORD_CHANGE',
  userId: user.id,
  changedBy: adminUser.id
});

// Role changes
logger.warn('User role changed', {
  event: 'ROLE_CHANGE',
  userId: user.id,
  oldRole: oldRole,
  newRole: newRole,
  changedBy: adminUser.id
});

// Access denied
logger.warn('Access denied', {
  event: 'ACCESS_DENIED',
  userId: user.id,
  resource: resource,
  action: action
});
```

### 9.5 Alerting

#### 9.5.1 Email Alerts

**Setup Email Notifications:**

Install nodemailer:
```bash
npm install nodemailer
```

**Example Alert Function:**

```typescript
import nodemailer from 'nodemailer';

const sendAlert = async (subject: string, message: string) => {
  const transporter = nodemailer.createTransporter({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'alerts@example.com',
      pass: 'password'
    }
  });

  await transporter.sendMail({
    from: 'CSMS Alerts <alerts@example.com>',
    to: 'admin@example.com',
    subject: subject,
    text: message
  });
};

// Usage
try {
  // Critical operation
} catch (error) {
  await sendAlert(
    'CSMS Critical Error',
    `Error occurred: ${error.message}\nStack: ${error.stack}`
  );
}
```

#### 9.5.2 Alert Conditions

**Critical Alerts:**
- Application crashes
- Database connection failures
- Disk space < 10%
- Failed backups
- Multiple failed login attempts (potential attack)

**Warning Alerts:**
- High memory usage (> 80%)
- Slow database queries (> 5 seconds)
- HRIMS connection failures
- MinIO storage > 80% capacity

---

## 10. Troubleshooting

### 10.1 Common Issues

#### 10.1.1 Application Won't Start

**Symptoms:**
- Application fails to start
- PM2 shows error state
- Port 9002 not responding

**Troubleshooting Steps:**

1. **Check if port is in use:**
```bash
sudo lsof -i :9002
# If another process is using port, kill it:
sudo kill -9 <PID>
```

2. **Check environment variables:**
```bash
cd /path/to/csms
cat .env.local
# Verify all required variables are set
```

3. **Check database connection:**
```bash
psql -U postgres -d nody -c "SELECT 1;"
```

4. **Check application logs:**
```bash
pm2 logs csms --lines 100
# Look for error messages
```

5. **Try manual start:**
```bash
cd /path/to/csms
npm run build
npm start
# Check for specific error messages
```

**Common Fixes:**
- Missing environment variables: Add to `.env.local`
- Database not running: `sudo systemctl start postgresql`
- Build errors: `rm -rf .next && npm run build`
- Module errors: `rm -rf node_modules && npm install`

#### 10.1.2 Database Connection Errors

**Symptoms:**
- "Can't reach database server"
- "Connection refused"
- Prisma client errors

**Troubleshooting Steps:**

1. **Check PostgreSQL status:**
```bash
sudo systemctl status postgresql
```

2. **Verify database exists:**
```bash
psql -U postgres -c "\l" | grep nody
```

3. **Test connection:**
```bash
psql -U postgres -d nody
```

4. **Check connection string:**
```bash
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/nody
```

5. **Check PostgreSQL logs:**
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**Common Fixes:**
- PostgreSQL not running: `sudo systemctl start postgresql`
- Wrong credentials: Update `DATABASE_URL`
- Database doesn't exist: `createdb nody`
- Connection limit reached: Increase `max_connections` in postgresql.conf

#### 10.1.3 MinIO Connection Errors

**Symptoms:**
- File uploads fail
- "MinIO connection error"
- Images/documents not loading

**Troubleshooting Steps:**

1. **Check MinIO status:**
```bash
sudo systemctl status minio
```

2. **Test MinIO connection:**
```bash
mc alias set test-minio http://your-endpoint:9000 access-key secret-key
mc ls test-minio
```

3. **Check MinIO logs:**
```bash
sudo journalctl -u minio -n 100
```

4. **Verify bucket exists:**
```bash
mc ls csms-minio/csms-documents
```

**Common Fixes:**
- MinIO not running: `sudo systemctl start minio`
- Wrong credentials: Update `.env.local`
- Bucket doesn't exist: `mc mb csms-minio/csms-documents`
- Network connectivity: Check firewall rules

#### 10.1.4 Login Issues

**Symptoms:**
- "Invalid credentials" with correct password
- Login hangs or times out
- Session not persisting

**Troubleshooting Steps:**

1. **Verify user exists and is active:**
```sql
SELECT id, username, active FROM "User" WHERE username = 'username';
```

2. **Test password hash:**
```bash
# In Node.js console
const bcrypt = require('bcryptjs');
const isValid = await bcrypt.compare('password', 'stored-hash');
console.log(isValid);
```

3. **Check session storage:**
```bash
# If using file-based sessions
ls -la /tmp/sessions
```

4. **Check browser cookies:**
- Open browser DevTools
- Application > Cookies
- Verify session cookie exists

**Common Fixes:**
- User inactive: Update `active = true`
- Password hash mismatch: Reset password via admin
- Session issues: Clear browser cookies
- Database connection: Check database status

#### 10.1.5 HRIMS Integration Errors

**Symptoms:**
- "HRIMS connection failed"
- Employee data not syncing
- Timeout errors

**Troubleshooting Steps:**

1. **Test HRIMS connection:**
```bash
curl -H "X-API-Key: your-api-key" https://hrims-api.zanzibar.go.tz/api/health
```

2. **Check environment variables:**
```bash
echo $HRIMS_API_URL
echo $HRIMS_API_KEY
```

3. **Test with mock mode:**
```bash
# Set in .env.local
HRIMS_MOCK_MODE=true
# Restart application
pm2 restart csms
```

4. **Check HRIMS logs:**
```bash
pm2 logs csms | grep HRIMS
```

**Common Fixes:**
- Network issues: Check firewall, VPN
- Invalid API key: Contact HRIMS admin
- API endpoint changed: Update `HRIMS_API_URL`
- Timeout: Reduce page size for bulk operations

#### 10.1.6 File Upload Issues

**Symptoms:**
- "File upload failed"
- "File size too large"
- "Invalid file type"

**Troubleshooting Steps:**

1. **Check file size:**
```bash
# Max size is 2MB
ls -lh file.pdf
```

2. **Verify file type:**
```bash
file -b --mime-type file.pdf
# Should be: application/pdf
```

3. **Check MinIO storage space:**
```bash
mc du csms-minio/csms-documents
df -h  # Check disk space
```

4. **Test manual upload to MinIO:**
```bash
mc cp test.pdf csms-minio/csms-documents/test.pdf
```

**Common Fixes:**
- File too large: Compress or split file (max 2MB)
- Wrong file type: Convert to PDF
- MinIO storage full: Clear old files or expand storage
- MinIO not accessible: Check MinIO service status

#### 10.1.7 Performance Issues

**Symptoms:**
- Slow page loads
- API timeouts
- High server load

**Troubleshooting Steps:**

1. **Check server resources:**
```bash
top
htop
free -h
df -h
```

2. **Check database performance:**
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

3. **Check slow queries:**
```sql
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

4. **Check application metrics:**
```bash
pm2 info csms
pm2 monit
```

**Common Fixes:**
- High CPU: Optimize queries, add indexes
- High memory: Restart application, check for memory leaks
- Slow queries: Add database indexes, optimize queries
- Too many connections: Increase connection pool or reduce concurrency

### 10.2 Error Messages Reference

#### 10.2.1 Database Errors

| Error | Description | Solution |
|-------|-------------|----------|
| P2002 | Unique constraint violation | Check for duplicate data (username, email, TIN) |
| P2025 | Record not found | Verify record ID exists in database |
| P1001 | Can't reach database | Check PostgreSQL status, verify DATABASE_URL |
| P1003 | Database does not exist | Create database: `createdb nody` |
| P2003 | Foreign key constraint | Ensure referenced record exists |
| P1002 | Database timeout | Check database performance, increase timeout |

#### 10.2.2 API Errors

| Status Code | Error | Description | Solution |
|-------------|-------|-------------|----------|
| 400 | Bad Request | Invalid input data | Check request body format |
| 401 | Unauthorized | Invalid credentials or inactive account | Verify credentials, check user active status |
| 403 | Forbidden | Insufficient permissions | Verify user role and permissions |
| 404 | Not Found | Resource doesn't exist | Check resource ID |
| 409 | Conflict | Duplicate data | Check for existing records |
| 500 | Internal Server Error | Server-side error | Check logs for details |
| 503 | Service Unavailable | Service down | Check database, MinIO, HRIMS status |

#### 10.2.3 MinIO Errors

| Error | Description | Solution |
|-------|-------------|----------|
| Access Denied | Invalid credentials | Verify MINIO_ACCESS_KEY and MINIO_SECRET_KEY |
| Bucket not found | Bucket doesn't exist | Create bucket: `mc mb csms-minio/csms-documents` |
| Connection refused | MinIO not accessible | Check MinIO service status |
| No such key | File doesn't exist | Verify file path in MinIO |
| Request timeout | MinIO slow or overloaded | Check MinIO performance, increase timeout |

### 10.3 Diagnostic Commands

**System Diagnostics:**

```bash
# Server health
uptime
df -h
free -h
top -bn1 | head -20

# Application status
pm2 status
pm2 info csms
pm2 logs csms --lines 50 --nostream

# Database status
sudo systemctl status postgresql
psql -U postgres -d nody -c "SELECT version();"
psql -U postgres -d nody -c "SELECT count(*) FROM \"User\";"

# MinIO status
sudo systemctl status minio
mc admin info csms-minio

# Network connectivity
curl -I https://csms.zanajira.go.tz
netstat -tulpn | grep :9002
```

**Database Diagnostics:**

```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity WHERE datname = 'nody';

-- Long-running queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 minute';

-- Table counts
SELECT
    'User' as table_name, count(*) as count FROM "User"
UNION ALL
SELECT 'Employee', count(*) FROM "Employee"
UNION ALL
SELECT 'Institution', count(*) FROM "Institution";

-- Database size
SELECT pg_size_pretty(pg_database_size('nody'));
```

### 10.4 Recovery Procedures

#### 10.4.1 Application Recovery

**If application crashes repeatedly:**

```bash
# Stop application
pm2 stop csms

# Clear cache and rebuild
cd /path/to/csms
rm -rf .next
npm run build

# Check for issues
npm run typecheck
npm run lint

# Start application
pm2 start csms

# Monitor logs
pm2 logs csms
```

#### 10.4.2 Database Recovery

**If database is corrupted:**

```bash
# Stop application
pm2 stop csms

# Backup current state
pg_dump nody > /tmp/nody_before_recovery.sql

# Restore from last good backup
gunzip -c /backups/csms/database/nody_YYYYMMDD.sql.gz | psql -U postgres -d nody

# Run migrations
cd /path/to/csms
npx prisma migrate deploy

# Restart application
pm2 start csms
```

#### 10.4.3 Emergency Contacts

**Escalation Path:**

| Issue Severity | Contact | Response Time |
|----------------|---------|---------------|
| Critical (System down) | System Administrator | Immediate |
| High (Major functionality broken) | Technical Lead | 1 hour |
| Medium (Performance degraded) | Support Team | 4 hours |
| Low (Minor issues) | Help Desk | Next business day |

---

## 11. Appendices

### 11.1 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | - | PostgreSQL connection string |
| MINIO_ENDPOINT | Yes | - | MinIO server endpoint |
| MINIO_PORT | Yes | 9000 | MinIO port |
| MINIO_USE_SSL | No | false | Use SSL for MinIO |
| MINIO_ACCESS_KEY | Yes | - | MinIO access key |
| MINIO_SECRET_KEY | Yes | - | MinIO secret key |
| MINIO_BUCKET_NAME | Yes | csms-documents | MinIO bucket name |
| HRIMS_API_URL | Yes | - | HRIMS API endpoint |
| HRIMS_API_KEY | Yes | - | HRIMS API key |
| HRIMS_MOCK_MODE | No | false | Use mock HRIMS (testing) |
| NEXT_PUBLIC_API_URL | No | http://localhost:9002/api | Public API URL |
| NEXT_PUBLIC_BACKEND_URL | No | http://localhost:9002 | Public backend URL |
| NODE_ENV | No | development | Node environment |
| PORT | No | 9002 | Application port |
| GOOGLE_AI_API_KEY | No | - | Google AI API key (optional) |

### 11.2 Default User Accounts

**Production Accounts (Change passwords immediately!):**

| Role | Username | Default Password | Description |
|------|----------|-----------------|-------------|
| ADMIN | akassim | password123 | System administrator |
| HRO | kmnyonge | password123 | HR Officer |
| HHRMD | skhamis | password123 | Head of HR |
| HRMO | fiddi | password123 | HR Management Officer |
| DO | mussi | password123 | Disciplinary Officer |
| PO | mishak | password123 | Planning Officer |
| CSCS | zhaji | password123 | CSC Secretary |
| HRRP | kmhaji | password123 | HR Responsible Personnel |

### 11.3 Database Schema Overview

**Core Tables:**
- User (system users)
- Employee (civil service employees)
- Institution (government institutions)
- Notification (user notifications)

**Request Tables:**
- ConfirmationRequest
- PromotionRequest
- LwopRequest
- CadreChangeRequest
- RetirementRequest
- ResignationRequest
- ServiceExtensionRequest
- SeparationRequest (terminations/dismissals)

**Other Tables:**
- Complaint (employee grievances)
- EmployeeCertificate (educational qualifications)

### 11.4 API Endpoints Reference

**Authentication:**
- `POST /api/auth/login` - Standard login
- `POST /api/auth/employee-login` - Employee login
- `GET /api/auth/session` - Check session
- `POST /api/auth/logout` - Logout
- `POST /api/auth/change-password` - Change password

**User Management:**
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

**Institution Management:**
- `GET /api/institutions` - List all institutions
- `POST /api/institutions` - Create institution
- `PUT /api/institutions/{id}` - Update institution

**HRIMS Integration:**
- `GET /api/hrims/test` - Test connection
- `POST /api/hrims/fetch-employee` - Fetch single employee
- `POST /api/hrims/sync-employee` - Sync employee to CSMS
- `POST /api/hrims/bulk-fetch` - Bulk fetch employees
- `POST /api/hrims/fetch-photos-by-institution` - Bulk fetch photos
- `POST /api/hrims/fetch-documents-by-institution` - Bulk fetch documents
- `POST /api/hrims/sync-certificates` - Sync certificates

### 11.5 System Commands Reference

**Application Management:**
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run linting
npm run typecheck        # Run TypeScript checks
npm run genkit:dev       # Start Genkit dev server
```

**Database Management:**
```bash
npx prisma migrate dev       # Run migrations (dev)
npx prisma migrate deploy    # Run migrations (prod)
npx prisma generate          # Generate Prisma client
npx prisma studio            # Open Prisma Studio
npx prisma db push           # Push schema changes
```

**PM2 Management:**
```bash
pm2 start npm --name csms -- start    # Start app
pm2 stop csms                          # Stop app
pm2 restart csms                       # Restart app
pm2 reload csms                        # Reload (zero-downtime)
pm2 delete csms                        # Delete process
pm2 logs csms                          # View logs
pm2 monit                              # Monitor
pm2 save                               # Save process list
```

### 11.6 Useful SQL Queries

**User Statistics:**
```sql
SELECT role, count(*) as count,
       sum(CASE WHEN active THEN 1 ELSE 0 END) as active_count
FROM "User"
GROUP BY role;
```

**Employee Statistics:**
```sql
SELECT status, count(*) as count
FROM "Employee"
GROUP BY status;
```

**Request Statistics:**
```sql
SELECT 'Confirmation' as request_type, status, count(*) FROM "ConfirmationRequest" GROUP BY status
UNION ALL
SELECT 'Promotion', status, count(*) FROM "PromotionRequest" GROUP BY status
UNION ALL
SELECT 'LWOP', status, count(*) FROM "LwopRequest" GROUP BY status;
```

**Institution Overview:**
```sql
SELECT i.name,
       count(DISTINCT e.id) as employee_count,
       count(DISTINCT u.id) as user_count
FROM "Institution" i
LEFT JOIN "Employee" e ON e."institutionId" = i.id
LEFT JOIN "User" u ON u."institutionId" = i.id
GROUP BY i.id, i.name;
```

### 11.7 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-26 | Initial release |

### 11.8 Support and Contacts

**Technical Support:**
- Email: support@csms.zanajira.go.tz
- Phone: +255 XX XXX XXXX
- Hours: Monday-Friday, 8:00 AM - 5:00 PM EAT

**Emergency Contact:**
- 24/7 Hotline: +255 XX XXX XXXX
- Email: emergency@csms.zanajira.go.tz

---

## End of Document

**Document Version**: 1.0
**Last Updated**: December 26, 2025
**Next Review**: Quarterly or as needed

**Administrator Certification:**

I have read and understood this Administrator Manual and am familiar with the procedures and responsibilities outlined herein.

Administrator Name: ________________
Signature: ________________
Date: ________________

# Backup and Recovery Plan
## Civil Service Management System (CSMS)

---

### Document Control

| **Version** | **Date** | **Author** | **Changes** |
|-------------|----------|------------|-------------|
| 1.0 | 2025-01-15 | CSMS Operations Team | Initial backup and recovery plan |

**Document Classification**: RESTRICTED
**Distribution**: Operations Team, Database Administrators, System Administrators

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Backup Strategy](#2-backup-strategy)
3. [Backup Schedule](#3-backup-schedule)
4. [Backup Procedures](#4-backup-procedures)
5. [Recovery Procedures](#5-recovery-procedures)
6. [RTO/RPO Definitions](#6-rtorpo-definitions)
7. [Testing Procedures](#7-testing-procedures)
8. [Roles and Responsibilities](#8-roles-and-responsibilities)
9. [Backup Monitoring](#9-backup-monitoring)

---

## 1. Introduction

### 1.1 Purpose
This Backup and Recovery Plan defines the strategy, procedures, and responsibilities for protecting CSMS data through regular backups and ensuring timely recovery in the event of data loss or system failure.

### 1.2 Scope
This plan covers:
- PostgreSQL database backups
- MinIO object storage backups
- Application configuration backups
- Backup verification and testing
- Data recovery procedures
- Recovery time and point objectives

### 1.3 Objectives
- **Protect Data**: Ensure all critical data is backed up regularly
- **Enable Recovery**: Facilitate quick and complete data recovery
- **Minimize Downtime**: Reduce system unavailability during recovery
- **Maintain Integrity**: Ensure backup data is accurate and complete
- **Ensure Compliance**: Meet regulatory retention requirements

### 1.4 Backup Components

**What Gets Backed Up**:
1. **PostgreSQL Database** (nody)
   - All tables and data
   - Database schema
   - Indexes and constraints
   - Stored procedures

2. **MinIO Object Storage** (csms-documents bucket)
   - Uploaded PDF documents
   - Supporting documents
   - Employee photos
   - All file versions

3. **Configuration Files**
   - Application configuration (.env.local)
   - Nginx configuration
   - PostgreSQL configuration
   - MinIO configuration
   - PM2 ecosystem configuration

4. **Application Code**
   - Source code (Git repository)
   - Dependencies (package.json, package-lock.json)
   - Build artifacts

---

## 2. Backup Strategy

### 2.1 Backup Approach

**3-2-1 Backup Strategy**:
- **3** copies of data (original + 2 backups)
- **2** different media types (disk + offsite/cloud)
- **1** copy offsite (secure location)

**Backup Types**:

#### 2.1.1 Full Backup
- **What**: Complete copy of all data
- **When**: Weekly (Sunday)
- **Retention**: 12 weeks
- **Purpose**: Complete restore point

#### 2.1.2 Incremental Backup
- **What**: Only changes since last backup
- **When**: Daily
- **Retention**: 30 days
- **Purpose**: Point-in-time recovery

#### 2.1.3 Configuration Backup
- **What**: System and application configurations
- **When**: Weekly (Sunday)
- **Retention**: 12 weeks
- **Purpose**: System rebuild

### 2.2 Backup Locations

**Primary Backup Location**:
- **Path**: `/var/backups/csms/`
- **Storage**: Local disk (200GB allocated)
- **Access**: Root only
- **Encryption**: Sensitive configurations encrypted with GPG

**Secondary Backup Location (Offsite)**:
- **Type**: Network Attached Storage (NAS) or Cloud Storage
- **Path**: `/mnt/backup-nas/csms/` or S3 bucket
- **Sync**: Daily (rsync or aws s3 sync)
- **Encryption**: Encrypted in transit and at rest

**Backup Rotation**:
- Daily backups: Keep last 30 days
- Weekly backups: Keep last 12 weeks
- Monthly backups: Keep last 12 months
- Yearly backups: Keep 7 years (compliance)

### 2.3 Data Classification

| Data Type | Criticality | Backup Frequency | Retention |
|-----------|-------------|------------------|-----------|
| **Database (User, Employee, Requests)** | Critical | Daily | 30 days + 12 weeks + 12 months |
| **Documents (MinIO)** | Critical | Weekly | 4 weeks + 12 months |
| **Application Logs** | High | Daily | 30 days |
| **Configuration Files** | High | Weekly | 12 weeks |
| **Application Code** | Medium | On commit (Git) | Indefinite |
| **Monitoring Metrics** | Medium | Weekly | 90 days |

### 2.4 Backup Security

**Access Control**:
- Backup files owned by root
- Permissions: 600 (read/write owner only)
- Encrypted sensitive data (passwords, API keys)

**Encryption**:
- Configuration backups: GPG symmetric encryption (AES-256)
- Database backups: Compressed (gzip) - consider encryption for production
- Transit encryption: TLS 1.2+ for network transfers

**Audit**:
- Backup access logged
- Backup verification logged
- Failed backups alerted

---

## 3. Backup Schedule

### 3.1 Automated Backup Schedule

| Backup Type | Frequency | Time (EAT) | Script Location | Duration |
|-------------|-----------|------------|-----------------|----------|
| **Database Incremental** | Daily | 02:00 | `/usr/local/bin/backup-csms-db.sh` | ~10 min |
| **Database Full** | Weekly (Sunday) | 03:00 | `/usr/local/bin/backup-csms-db-full.sh` | ~30 min |
| **MinIO Storage** | Weekly (Saturday) | 03:00 | `/usr/local/bin/backup-csms-minio.sh` | ~45 min |
| **Configuration** | Weekly (Sunday) | 04:00 | `/usr/local/bin/backup-csms-config.sh` | ~5 min |
| **Offsite Sync** | Daily | 05:00 | `/usr/local/bin/sync-backups-offsite.sh` | ~30 min |

### 3.2 Backup Windows

**Production Backup Window**: 02:00 - 06:00 EAT (4 hours)

**Rationale**:
- Lowest system usage (minimal user activity)
- Allows 4 hours for all backups to complete
- Before business hours (08:00 start)

**Impact**:
- Database backup: No user impact (online backup)
- MinIO backup: No user impact (mirroring)
- Configuration backup: No user impact

### 3.3 Cron Schedule

**Database Administrator's Crontab**:
```bash
# Database incremental backup - Daily at 02:00
0 2 * * * /usr/local/bin/backup-csms-db.sh >> /var/log/csms/backup-cron.log 2>&1

# Database full backup - Sunday at 03:00
0 3 * * 0 /usr/local/bin/backup-csms-db-full.sh >> /var/log/csms/backup-cron.log 2>&1

# MinIO backup - Saturday at 03:00
0 3 * * 6 /usr/local/bin/backup-csms-minio.sh >> /var/log/csms/backup-cron.log 2>&1

# Configuration backup - Sunday at 04:00
0 4 * * 0 /usr/local/bin/backup-csms-config.sh >> /var/log/csms/backup-cron.log 2>&1

# Offsite sync - Daily at 05:00
0 5 * * * /usr/local/bin/sync-backups-offsite.sh >> /var/log/csms/backup-cron.log 2>&1

# Backup verification - Monday at 09:00
0 9 * * 1 /usr/local/bin/verify-csms-backups.sh >> /var/log/csms/backup-cron.log 2>&1
```

---

## 4. Backup Procedures

### 4.1 Database Backup Procedure

#### 4.1.1 Daily Incremental Backup

**Script**: `/usr/local/bin/backup-csms-db.sh`

```bash
#!/bin/bash
# CSMS Database Incremental Backup
# Runs: Daily at 02:00
# Retention: 30 days

set -e
set -o pipefail

# Configuration
BACKUP_DIR="/var/backups/csms/database"
DB_NAME="nody"
DB_USER="csms_user"
DB_HOST="localhost"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/csms/backup.log"
ALERT_EMAIL="ops-team@csms.zanajira.go.tz"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    echo "Database backup failed: $1" | mail -s "CSMS Backup Failure Alert" "$ALERT_EMAIL"
    exit 1
}

# Start backup
log "=== Starting database incremental backup ==="

# Check if backup directory exists
mkdir -p "$BACKUP_DIR" || error_exit "Failed to create backup directory"

# Check disk space (require 10GB free)
AVAILABLE=$(df -BG "$BACKUP_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE" -lt 10 ]; then
    error_exit "Insufficient disk space: ${AVAILABLE}GB available, 10GB required"
fi

# Set PostgreSQL password
export PGPASSWORD='YourSecurePassword123!'

# Check database connectivity
psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1 || \
    error_exit "Cannot connect to database"

# Perform backup
log "Creating backup file: ${DB_NAME}_${DATE}.sql.gz"
pg_dump -U "$DB_USER" -h "$DB_HOST" "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" || \
    error_exit "pg_dump failed"

# Verify backup file was created
if [ ! -f "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" ]; then
    error_exit "Backup file not created"
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" | cut -f1)
log "Backup created successfully: $BACKUP_SIZE"

# Verify backup integrity
log "Verifying backup integrity..."
gunzip -t "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" || \
    error_exit "Backup integrity check failed"
log "Backup integrity verified"

# Calculate checksum
CHECKSUM=$(md5sum "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" | awk '{print $1}')
echo "$CHECKSUM  ${DB_NAME}_${DATE}.sql.gz" > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz.md5"
log "Checksum calculated: $CHECKSUM"

# Remove old backups
log "Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz.md5" -mtime +$RETENTION_DAYS -delete
log "Old backups removed"

# Unset password
unset PGPASSWORD

# Log completion
log "=== Database incremental backup completed successfully ==="
log "Backup file: $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
log "Backup size: $BACKUP_SIZE"
log "Checksum: $CHECKSUM"

exit 0
```

#### 4.1.2 Weekly Full Backup

**Script**: `/usr/local/bin/backup-csms-db-full.sh`

*(Similar to incremental, with modifications)*:
```bash
# Configuration changes
RETENTION_WEEKS=12

# Remove old backups
find "$BACKUP_DIR" -name "${DB_NAME}_full_*.sql.gz" -mtime +$((RETENTION_WEEKS * 7)) -delete
```

### 4.2 MinIO Object Storage Backup

**Script**: `/usr/local/bin/backup-csms-minio.sh`

```bash
#!/bin/bash
# CSMS MinIO Storage Backup
# Runs: Weekly (Saturday) at 03:00
# Retention: 4 weeks

set -e

# Configuration
BACKUP_DIR="/var/backups/csms/minio"
BUCKET_NAME="csms-documents"
DATE=$(date +%Y%m%d)
RETENTION_WEEKS=4
LOG_FILE="/var/log/csms/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting MinIO storage backup ==="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Mirror MinIO bucket to local backup
log "Mirroring MinIO bucket to local backup..."
mc mirror csms-local/$BUCKET_NAME "$BACKUP_DIR/${BUCKET_NAME}_${DATE}" || {
    log "ERROR: MinIO mirror failed"
    exit 1
}

# Create tarball
log "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "${BUCKET_NAME}_${DATE}.tar.gz" "${BUCKET_NAME}_${DATE}" || {
    log "ERROR: tar creation failed"
    exit 1
}

# Remove temporary directory
rm -rf "${BUCKET_NAME}_${DATE}"

# Verify tarball
BACKUP_SIZE=$(du -h "${BUCKET_NAME}_${DATE}.tar.gz" | cut -f1)
log "Backup created: ${BUCKET_NAME}_${DATE}.tar.gz ($BACKUP_SIZE)"

# Calculate checksum
md5sum "${BUCKET_NAME}_${DATE}.tar.gz" > "${BUCKET_NAME}_${DATE}.tar.gz.md5"

# Remove old backups
find "$BACKUP_DIR" -name "${BUCKET_NAME}_*.tar.gz" -mtime +$((RETENTION_WEEKS * 7)) -delete
find "$BACKUP_DIR" -name "${BUCKET_NAME}_*.tar.gz.md5" -mtime +$((RETENTION_WEEKS * 7)) -delete

log "=== MinIO storage backup completed successfully ==="
exit 0
```

### 4.3 Configuration Backup

**Script**: `/usr/local/bin/backup-csms-config.sh`

```bash
#!/bin/bash
# CSMS Configuration Backup
# Runs: Weekly (Sunday) at 04:00
# Retention: 12 weeks

set -e

# Configuration
BACKUP_DIR="/var/backups/csms/config"
DATE=$(date +%Y%m%d)
RETENTION_WEEKS=12
LOG_FILE="/var/log/csms/backup.log"
GPG_PASSPHRASE="YourGPGPassphrase"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting configuration backup ==="

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create temporary directory
TEMP_DIR=$(mktemp -d)

# Copy configuration files
log "Copying configuration files..."
cp /var/www/csms/.env.local "$TEMP_DIR/env.local"
cp /etc/nginx/sites-available/csms "$TEMP_DIR/nginx-csms.conf"
cp /etc/default/minio "$TEMP_DIR/minio.conf"
cp /var/www/csms/ecosystem.config.js "$TEMP_DIR/pm2-ecosystem.config.js"
cp /etc/postgresql/14/main/postgresql.conf "$TEMP_DIR/postgresql.conf"
cp /etc/postgresql/14/main/pg_hba.conf "$TEMP_DIR/pg_hba.conf"

# Create tarball
cd "$TEMP_DIR"
tar -czf "$BACKUP_DIR/config_${DATE}.tar.gz" .

# Encrypt tarball (contains sensitive passwords)
log "Encrypting configuration backup..."
echo "$GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
    --symmetric --cipher-algo AES256 \
    "$BACKUP_DIR/config_${DATE}.tar.gz"

# Remove unencrypted tarball
rm "$BACKUP_DIR/config_${DATE}.tar.gz"

# Clean up temporary directory
rm -rf "$TEMP_DIR"

log "Configuration backup created: config_${DATE}.tar.gz.gpg"

# Remove old backups
find "$BACKUP_DIR" -name "config_*.tar.gz.gpg" -mtime +$((RETENTION_WEEKS * 7)) -delete

log "=== Configuration backup completed successfully ==="
exit 0
```

### 4.4 Offsite Backup Sync

**Script**: `/usr/local/bin/sync-backups-offsite.sh`

```bash
#!/bin/bash
# Sync backups to offsite location
# Runs: Daily at 05:00

set -e

SOURCE_DIR="/var/backups/csms/"
DEST_DIR="/mnt/backup-nas/csms/"
LOG_FILE="/var/log/csms/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting offsite backup sync ==="

# Check if offsite location is mounted
if ! mountpoint -q /mnt/backup-nas; then
    log "ERROR: Offsite backup location not mounted"
    exit 1
fi

# Sync backups
rsync -avz --delete \
    --exclude="*.tmp" \
    "$SOURCE_DIR" "$DEST_DIR" | tee -a "$LOG_FILE"

log "=== Offsite backup sync completed ==="
exit 0
```

---

## 5. Recovery Procedures

### 5.1 Database Recovery

#### 5.1.1 Full Database Restore

**When**: Complete database loss or corruption

**Prerequisites**:
- Identify backup to restore from
- Ensure sufficient disk space
- Notify stakeholders of downtime

**Procedure**:

```bash
#!/bin/bash
# Full Database Restore Procedure

# STEP 1: Stop application to prevent new connections
pm2 stop csms-production

# STEP 2: Identify backup file
ls -lht /var/backups/csms/database/nody_*.sql.gz | head -5
# Select: BACKUP_FILE="/var/backups/csms/database/nody_20250115_020000.sql.gz"

# STEP 3: Verify backup integrity
gunzip -t $BACKUP_FILE || {
    echo "ERROR: Backup file is corrupted"
    exit 1
}

# STEP 4: Verify checksum
md5sum -c ${BACKUP_FILE}.md5 || {
    echo "WARNING: Checksum mismatch"
    # Proceed with caution
}

# STEP 5: Create safety backup of current database (if accessible)
export PGPASSWORD='YourSecurePassword123!'
pg_dump -U csms_user nody | gzip > /var/backups/csms/pre-restore-$(date +%Y%m%d_%H%M%S).sql.gz

# STEP 6: Drop existing database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS nody;"

# STEP 7: Create new database
sudo -u postgres psql -c "CREATE DATABASE nody OWNER csms_user;"

# STEP 8: Restore from backup
gunzip -c $BACKUP_FILE | psql -U csms_user -h localhost nody

# STEP 9: Verify restore
psql -U csms_user -h localhost nody -c "SELECT COUNT(*) FROM \"User\";"
psql -U csms_user -h localhost nody -c "SELECT COUNT(*) FROM \"Institution\";"
psql -U csms_user -h localhost nody -c "SELECT COUNT(*) FROM \"Employee\";"

# STEP 10: Run Prisma migrations (if needed to bring schema up-to-date)
cd /var/www/csms
npx prisma migrate deploy

# STEP 11: Restart application
pm2 start csms-production

# STEP 12: Verify application health
sleep 10
curl http://localhost:9002/api/health
curl http://localhost:9002/api/health/db

# STEP 13: Document recovery
cat >> /var/log/csms/recovery.log <<EOF
$(date): Full database restore completed
Backup file: $BACKUP_FILE
Restored by: $(whoami)
Verification: Passed
EOF

unset PGPASSWORD
```

**Estimated Time**: 30-60 minutes (depending on database size)
**RTO**: 4 hours (including verification)

#### 5.1.2 Point-in-Time Recovery (PITR)

**When**: Need to recover to specific point in time

**Requirements**:
- WAL (Write-Ahead Log) archiving enabled
- Continuous archiving configured

**Procedure**:
```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
gunzip -c /var/backups/csms/database/nody_full_20250112.sql.gz | \
    psql -U postgres template1 -c "CREATE DATABASE nody;"
gunzip -c /var/backups/csms/database/nody_full_20250112.sql.gz | \
    psql -U postgres nody

# Create recovery configuration
cat > /var/lib/postgresql/14/main/recovery.conf <<EOF
restore_command = 'cp /var/lib/postgresql/14/wal_archive/%f %p'
recovery_target_time = '2025-01-15 14:30:00'
EOF

# Start PostgreSQL (will enter recovery mode)
sudo systemctl start postgresql

# Monitor recovery
tail -f /var/log/postgresql/postgresql-14-main.log

# When recovery complete, remove recovery.conf
# PostgreSQL will create recovery.done
```

### 5.2 MinIO Object Storage Recovery

#### 5.2.1 Full Bucket Restore

```bash
#!/bin/bash
# Full MinIO Bucket Restore

# STEP 1: Identify backup to restore
ls -lht /var/backups/csms/minio/csms-documents_*.tar.gz | head -5
# Select: BACKUP_FILE="/var/backups/csms/minio/csms-documents_20250111.tar.gz"

# STEP 2: Verify backup
tar -tzf $BACKUP_FILE | head -10

# STEP 3: Extract backup
TEMP_DIR=$(mktemp -d)
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# STEP 4: Backup current bucket (if accessible)
mc mirror csms-local/csms-documents /var/backups/csms/minio/pre-restore-$(date +%Y%m%d)

# STEP 5: Restore to MinIO
mc mirror $TEMP_DIR/csms-documents_20250111 csms-local/csms-documents --overwrite

# STEP 6: Verify restore
mc ls csms-local/csms-documents
mc du csms-local/csms-documents

# STEP 7: Clean up
rm -rf $TEMP_DIR

# STEP 8: Document recovery
echo "$(date): MinIO bucket restored from $BACKUP_FILE" >> /var/log/csms/recovery.log
```

**Estimated Time**: 1-2 hours (depending on size)
**RTO**: 4 hours

#### 5.2.2 Single File Recovery

```bash
# Extract backup
tar -xzf /var/backups/csms/minio/csms-documents_20250111.tar.gz

# Find file
find csms-documents_20250111 -name "document123.pdf"

# Copy to MinIO
mc cp csms-documents_20250111/path/to/document123.pdf \
    csms-local/csms-documents/path/to/document123.pdf
```

### 5.3 Configuration Recovery

```bash
#!/bin/bash
# Configuration Restore

# STEP 1: Select backup
BACKUP_FILE="/var/backups/csms/config/config_20250114.tar.gz.gpg"

# STEP 2: Decrypt backup
echo "YourGPGPassphrase" | gpg --batch --passphrase-fd 0 \
    --decrypt $BACKUP_FILE > config_20250114.tar.gz

# STEP 3: Extract to temporary directory
TEMP_DIR=$(mktemp -d)
tar -xzf config_20250114.tar.gz -C $TEMP_DIR

# STEP 4: Review files before restoring
ls -la $TEMP_DIR

# STEP 5: Restore configuration files (review each before copying)
sudo cp $TEMP_DIR/env.local /var/www/csms/.env.local
sudo cp $TEMP_DIR/nginx-csms.conf /etc/nginx/sites-available/csms
sudo cp $TEMP_DIR/minio.conf /etc/default/minio
sudo cp $TEMP_DIR/pm2-ecosystem.config.js /var/www/csms/ecosystem.config.js
sudo cp $TEMP_DIR/postgresql.conf /etc/postgresql/14/main/postgresql.conf
sudo cp $TEMP_DIR/pg_hba.conf /etc/postgresql/14/main/pg_hba.conf

# STEP 6: Restart services
sudo systemctl reload nginx
sudo systemctl restart postgresql
sudo systemctl restart minio
pm2 restart csms-production

# STEP 7: Verify
/usr/local/bin/csms-health-check.sh

# STEP 8: Clean up
rm -rf $TEMP_DIR config_20250114.tar.gz
```

---

## 6. RTO/RPO Definitions

### 6.1 Recovery Objectives

**RPO (Recovery Point Objective)**:
Maximum acceptable data loss measured in time

**RTO (Recovery Time Objective)**:
Maximum acceptable downtime measured in time

### 6.2 CSMS Recovery Objectives

| Component | RPO | RTO | Justification |
|-----------|-----|-----|---------------|
| **Database** | 24 hours | 4 hours | Daily backups, acceptable to lose up to 1 day of data |
| **MinIO Storage** | 7 days | 4 hours | Weekly backups, documents can be re-uploaded if needed |
| **Configuration** | 7 days | 2 hours | Weekly backups, changes are infrequent |
| **Application** | 0 | 1 hour | Code in Git, can redeploy anytime |

### 6.3 Recovery Scenarios

#### Scenario 1: Database Corruption

**Detection**: Monitoring alerts or user reports
**RPO**: Last daily backup (max 24 hours)
**RTO**: 4 hours

**Recovery Steps**:
1. Stop application (5 min)
2. Restore database (30-60 min)
3. Verify restore (30 min)
4. Restart application (5 min)
5. Verify functionality (15 min)
6. Monitor (remaining time)

**Total**: 1.5-2.5 hours (well within 4-hour RTO)

#### Scenario 2: Storage Failure

**Detection**: MinIO health check failure
**RPO**: Last weekly backup (max 7 days)
**RTO**: 4 hours

**Recovery Steps**:
1. Provision new MinIO instance (1 hour)
2. Restore bucket (1-2 hours)
3. Update configuration (30 min)
4. Verify (30 min)

**Total**: 3-4 hours (at RTO limit)

#### Scenario 3: Complete Server Failure

**Detection**: All services down
**RPO**: 24 hours (database), 7 days (storage)
**RTO**: 8 hours

**Recovery Steps**:
1. Provision new server (2 hours)
2. Install software (1 hour)
3. Restore configurations (1 hour)
4. Restore database (1 hour)
5. Restore storage (2 hours)
6. Verify (1 hour)

**Total**: 8 hours

### 6.4 Recovery Priority

**Priority 1 (Critical)** - Restore within 4 hours:
- Database
- Application
- Authentication

**Priority 2 (High)** - Restore within 8 hours:
- Document storage
- Email notifications

**Priority 3 (Medium)** - Restore within 24 hours:
- Audit logs
- Performance metrics
- Reports

---

## 7. Testing Procedures

### 7.1 Backup Verification Testing

#### 7.1.1 Automated Daily Verification

**Script**: `/usr/local/bin/verify-csms-backups.sh`

```bash
#!/bin/bash
# Daily backup verification
# Checks: Existence, integrity, size

BACKUP_DIR="/var/backups/csms/database"
LOG_FILE="/var/log/csms/backup-verification.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Backup Verification Started ==="

# Check if backup exists for today
TODAY=$(date +%Y%m%d)
BACKUP_COUNT=$(find $BACKUP_DIR -name "nody_${TODAY}_*.sql.gz" | wc -l)

if [ $BACKUP_COUNT -eq 0 ]; then
    log "ERROR: No backup found for $TODAY"
    echo "No backup found for $TODAY" | mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
    exit 1
fi

# Get most recent backup
RECENT_BACKUP=$(ls -t $BACKUP_DIR/nody_*.sql.gz | head -1)
log "Checking backup: $RECENT_BACKUP"

# Check file size (should be > 10MB)
SIZE=$(stat -c%s "$RECENT_BACKUP")
MIN_SIZE=$((10 * 1024 * 1024))  # 10MB

if [ $SIZE -lt $MIN_SIZE ]; then
    log "WARNING: Backup size ($SIZE bytes) is suspiciously small"
    echo "Backup size alert: $RECENT_BACKUP is only $SIZE bytes" | \
        mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
fi

# Verify integrity
gunzip -t $RECENT_BACKUP
if [ $? -eq 0 ]; then
    log "✓ Backup integrity verified"
else
    log "ERROR: Backup integrity check failed"
    echo "Backup integrity failed: $RECENT_BACKUP" | \
        mail -s "CSMS Backup CRITICAL Alert" ops-team@csms.zanajira.go.tz
    exit 1
fi

# Verify checksum if available
if [ -f "${RECENT_BACKUP}.md5" ]; then
    md5sum -c "${RECENT_BACKUP}.md5"
    if [ $? -eq 0 ]; then
        log "✓ Checksum verified"
    else
        log "WARNING: Checksum verification failed"
    fi
fi

log "=== Backup Verification Completed Successfully ==="
exit 0
```

#### 7.1.2 Weekly Restore Test

**When**: Every Monday at 10:00 (off-peak)
**Where**: Test/Staging environment
**What**: Restore last week's backup to test database

**Procedure**:
```bash
#!/bin/bash
# Weekly restore test to staging environment

# Identify last week's full backup
BACKUP_FILE=$(find /var/backups/csms/database -name "nody_full_*.sql.gz" -mtime -7 | head -1)

# Restore to test database
export PGPASSWORD='TestPassword'
dropdb -U postgres nody_test --if-exists
createdb -U postgres nody_test -O csms_user_test
gunzip -c $BACKUP_FILE | psql -U csms_user_test nody_test

# Verify row counts
psql -U csms_user_test nody_test -c "SELECT COUNT(*) FROM \"User\";"
psql -U csms_user_test nody_test -c "SELECT COUNT(*) FROM \"Institution\";"

# Document success
echo "$(date): Weekly restore test successful - $BACKUP_FILE" >> \
    /var/log/csms/restore-test.log

unset PGPASSWORD
```

#### 7.1.3 Monthly Full Recovery Drill

**When**: First Saturday of each month
**Duration**: 4 hours
**Participants**: Operations team, DBA

**Objectives**:
- Test complete recovery process
- Verify RTO/RPO targets
- Train team on recovery procedures
- Identify process improvements

**Procedure**:
1. **Planning** (1 week before):
   - Schedule drill
   - Notify participants
   - Prepare test environment
   - Review recovery procedures

2. **Execution** (Day of drill):
   - Simulate failure scenario
   - Execute recovery procedures
   - Time each step
   - Document issues

3. **Verification**:
   - Verify data completeness
   - Verify application functionality
   - Verify performance

4. **Debrief**:
   - Review timeline
   - Identify issues
   - Update procedures
   - Document lessons learned

### 7.2 Disaster Recovery Testing

#### 7.2.1 Quarterly DR Test

**Scope**: Full disaster recovery simulation

**Scenario**: Complete data center loss

**Test Plan**:
1. **T+0**: Disaster declared
2. **T+1 hour**: Provision new infrastructure
3. **T+2 hours**: Restore configurations
4. **T+4 hours**: Restore database and storage
5. **T+6 hours**: Application online
6. **T+8 hours**: Full verification complete

**Success Criteria**:
- System restored within RTO
- Data loss within RPO
- All functionality operational
- Users can access system

### 7.3 Test Documentation

**Test Report Template**:
```
BACKUP RECOVERY TEST REPORT

Test Date: __________
Test Type: [ ] Daily Verification [ ] Weekly Restore [ ] Monthly Drill [ ] Quarterly DR
Performed By: __________

TEST DETAILS:
Backup File: __________
Backup Date: __________
Test Environment: __________

TIMELINE:
Start Time: __________
End Time: __________
Duration: __________

RESULTS:
[ ] Success [ ] Partial Success [ ] Failure

Recovery Steps:
1. [Step] - Duration: __ - Status: [ ] Success [ ] Fail
2. [Step] - Duration: __ - Status: [ ] Success [ ] Fail
...

VERIFICATION:
[ ] Database restored
[ ] Data integrity verified
[ ] Application functional
[ ] Performance acceptable

ISSUES ENCOUNTERED:
1. __________
2. __________

LESSONS LEARNED:
1. __________
2. __________

RECOMMENDATIONS:
1. __________
2. __________

RTO Target: ____ | RTO Actual: ____ | [ ] Met [ ] Not Met
RPO Target: ____ | RPO Actual: ____ | [ ] Met [ ] Not Met

Approved By: __________ Date: __________
```

---

## 8. Roles and Responsibilities

### 8.1 Backup Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Database Administrator** | - Configure and maintain database backups<br>- Monitor backup success<br>- Perform database recovery<br>- Test database restores |
| **System Administrator** | - Configure and maintain storage backups<br>- Monitor backup systems<br>- Maintain backup infrastructure<br>- Perform storage recovery |
| **Operations Manager** | - Oversee backup strategy<br>- Ensure compliance with retention policies<br>- Approve backup procedures<br>- Report to management |
| **Security Officer** | - Ensure backup security<br>- Manage encryption keys<br>- Control backup access<br>- Audit backup procedures |

### 8.2 Recovery Responsibilities

| Role | Authority | Backup Recovery | Full Recovery |
|------|-----------|-----------------|---------------|
| **Database Administrator** | Execute | ✓ | Support |
| **System Administrator** | Execute | Support | ✓ |
| **Operations Manager** | Approve | Support | Coordinate |
| **IT Director** | Authorize | Notify | Approve |

### 8.3 Contact Information

**Emergency Contact List**:
| Role | Name | Phone | Email |
|------|------|-------|-------|
| Database Administrator | [NAME] | [PHONE] | [EMAIL] |
| System Administrator | [NAME] | [PHONE] | [EMAIL] |
| Operations Manager | [NAME] | [PHONE] | [EMAIL] |
| IT Director | [NAME] | [PHONE] | [EMAIL] |

---

## 9. Backup Monitoring

### 9.1 Monitoring Metrics

**Daily Monitoring**:
- Backup completion status (Success/Failure)
- Backup duration (compare to baseline)
- Backup file size (detect anomalies)
- Disk space usage
- Verification test results

**Weekly Monitoring**:
- Backup retention compliance
- Offsite sync status
- Restore test results
- Storage capacity trends

**Monthly Monitoring**:
- Backup strategy effectiveness
- Recovery drill results
- RTO/RPO compliance
- Process improvements

### 9.2 Alerting

**Critical Alerts** (Immediate notification):
- Backup failure
- Backup integrity check failure
- Disk space < 10%
- Offsite sync failure

**Warning Alerts** (Next business day):
- Backup duration > 2x baseline
- Backup size anomaly (> 50% difference)
- Disk space < 20%
- Old backups not cleaned up

**Email Alerts To**:
- ops-team@csms.zanajira.go.tz
- dba@csms.zanajira.go.tz

### 9.3 Backup Dashboard

**Key Metrics Display**:
- Last successful backup (timestamp)
- Backup success rate (last 7 days)
- Current disk usage
- Oldest backup (retention check)
- Next scheduled backup

**Sample Dashboard**:
```
╔══════════════════════════════════════════════╗
║        CSMS Backup Status Dashboard          ║
╠══════════════════════════════════════════════╣
║ Last Database Backup: 2025-01-15 02:05 ✓    ║
║ Last Storage Backup:  2025-01-11 03:15 ✓    ║
║ Last Config Backup:   2025-01-14 04:02 ✓    ║
║                                              ║
║ Success Rate (7d):    100% ████████████     ║
║ Disk Usage:           45% ██████░░░░░░      ║
║                                              ║
║ Oldest Backup:        29 days ago           ║
║ Next Backup:          Today 02:00           ║
║                                              ║
║ Status: ✓ All Systems Operational           ║
╚══════════════════════════════════════════════╝
```

---

## Appendices

### Appendix A: Backup File Naming Convention

```
Format: {component}_{type}_{date}_{time}.{extension}

Examples:
- nody_20250115_020045.sql.gz (Database incremental)
- nody_full_20250112_030015.sql.gz (Database full)
- csms-documents_20250111.tar.gz (MinIO weekly)
- config_20250114.tar.gz.gpg (Configuration)
```

### Appendix B: Retention Policy Summary

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Database Daily | Daily | 30 days | Local + Offsite |
| Database Weekly | Weekly | 12 weeks | Local + Offsite |
| Database Monthly | Monthly | 12 months | Offsite |
| Database Yearly | Yearly | 7 years | Offsite (archive) |
| Storage Weekly | Weekly | 4 weeks | Local + Offsite |
| Storage Monthly | Monthly | 12 months | Offsite |
| Config Weekly | Weekly | 12 weeks | Local + Offsite (encrypted) |

### Appendix C: Backup Checklist

**Daily**:
- [ ] Verify database backup completed
- [ ] Check backup logs for errors
- [ ] Verify backup file size
- [ ] Check disk space

**Weekly**:
- [ ] Verify offsite sync completed
- [ ] Perform restore test
- [ ] Review retention compliance
- [ ] Clean up old backups

**Monthly**:
- [ ] Conduct recovery drill
- [ ] Review backup strategy
- [ ] Test disaster recovery plan
- [ ] Update documentation

---

**Document End**

---

**For backup and recovery support, contact:**

**CSMS Operations Team**
Email: ops-team@csms.zanajira.go.tz
Phone: +255-XXX-XXXX (24/7)

**Revolutionary Government of Zanzibar**
**Civil Service Management System (CSMS)**
**Version 1.0 | January 2025**

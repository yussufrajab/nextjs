# Disaster Recovery Plan (DRP)
## Civil Service Management System (CSMS)

**Document Version:** 1.0
**Last Updated:** December 26, 2025
**Document Owner:** IT Operations Manager
**Review Frequency:** Quarterly
**Next Review Date:** March 26, 2026

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Disaster Recovery Objectives](#disaster-recovery-objectives)
3. [Disaster Scenarios](#disaster-scenarios)
4. [Recovery Strategies](#recovery-strategies)
5. [Recovery Procedures](#recovery-procedures)
6. [Communication Plan](#communication-plan)
7. [Roles and Responsibilities](#roles-and-responsibilities)
8. [Testing Schedule](#testing-schedule)
9. [Maintenance and Updates](#maintenance-and-updates)

---

## Executive Summary

This Disaster Recovery Plan (DRP) establishes procedures for recovering the Civil Service Management System (CSMS) in the event of a disaster that impacts system availability. The plan ensures business continuity, minimizes data loss, and provides clear recovery procedures for all critical system components.

### Critical System Components
- **Application Server**: Next.js 14 application (Port 9002)
- **Database**: PostgreSQL 14+ (nody database)
- **Object Storage**: MinIO S3-compatible storage
- **Web Server**: Nginx reverse proxy
- **Process Manager**: PM2 cluster (4 instances)

### Recovery Objectives
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 24 hours
- **Maximum Tolerable Downtime (MTD)**: 24 hours
- **Service Level Target**: 99.5% uptime (excluding planned maintenance)

---

## Disaster Recovery Objectives

### 1. Recovery Time Objectives (RTO)

| Component | RTO | Description |
|-----------|-----|-------------|
| Database (PostgreSQL) | 4 hours | Time to restore database to operational state |
| Application Server | 2 hours | Time to deploy and start application |
| Object Storage (MinIO) | 4 hours | Time to restore file storage system |
| Web Server (Nginx) | 1 hour | Time to configure and start web server |
| Full System Recovery | 6 hours | Time to restore complete system functionality |

### 2. Recovery Point Objectives (RPO)

| Data Type | RPO | Backup Frequency |
|-----------|-----|------------------|
| Database Data | 24 hours | Daily at 02:00 EAT |
| Employee Documents | 7 days | Weekly on Saturday |
| Application Code | 1 hour | Git repository (continuous) |
| Configuration Files | 7 days | Weekly on Sunday |
| System Logs | 24 hours | Daily rotation and backup |

### 3. Critical Success Factors

- Regular backup verification (daily)
- Offsite backup storage (synchronized at 05:00 EAT)
- Documented recovery procedures (this document)
- Trained recovery team (quarterly training)
- Tested recovery process (quarterly DR drills)
- Updated contact information (monthly verification)
- Vendor support agreements (24/7 availability)

---

## Disaster Scenarios

### Scenario 1: Database Server Failure

**Impact:** Critical - Complete data access loss
**Probability:** Medium (5-10% annually)
**RTO:** 4 hours
**RPO:** 24 hours

**Indicators:**
- Database connection errors in application logs
- PostgreSQL service not responding
- Database corruption errors
- Hardware failure alerts

**Root Causes:**
- Hardware failure (disk, memory, CPU)
- Database corruption
- Operating system crash
- Ransomware attack
- Configuration error during update

**Business Impact:**
- Complete system unavailability
- All HR operations halted
- Employee data inaccessible
- Request processing stopped
- Approximately 500 users affected

---

### Scenario 2: Application Server Failure

**Impact:** High - Application unavailable
**Probability:** Medium (5-10% annually)
**RTO:** 2 hours
**RPO:** 1 hour

**Indicators:**
- HTTP 502/503 errors
- PM2 process crashes
- Node.js out of memory errors
- CPU/Memory exhaustion
- Application not responding to health checks

**Root Causes:**
- Memory leaks in application
- Unhandled exceptions causing crashes
- Deployment errors
- Resource exhaustion
- Operating system issues

**Business Impact:**
- System unavailable to all users
- Business operations halted
- Data entry and processing stopped
- Report generation unavailable

---

### Scenario 3: Storage System Failure (MinIO)

**Impact:** High - Document access loss
**Probability:** Low (1-5% annually)
**RTO:** 4 hours
**RPO:** 7 days

**Indicators:**
- File upload/download failures
- MinIO service not responding
- Storage bucket access errors
- Disk space exhaustion
- S3 API connection errors

**Root Causes:**
- Storage disk failure
- MinIO service crash
- Network connectivity issues
- Data corruption
- Configuration errors

**Business Impact:**
- Employee documents unavailable
- Request attachments inaccessible
- Photo uploads failing
- Document verification halted
- Limited system functionality (read-only operations)

---

### Scenario 4: Complete Server Loss

**Impact:** Critical - Total system loss
**Probability:** Low (1-5% annually)
**RTO:** 6 hours
**RPO:** 24 hours

**Indicators:**
- Server completely unreachable
- No response to ping or SSH
- Physical hardware damage
- Data center notification of hardware failure

**Root Causes:**
- Complete hardware failure
- Fire or physical damage
- Power supply failure
- Natural disaster
- Theft or vandalism
- Severe security breach requiring rebuild

**Business Impact:**
- Complete system outage
- All services unavailable
- All 500+ users affected
- Critical HR operations halted
- Manual fallback procedures required

---

### Scenario 5: Data Center Outage

**Impact:** Critical - Infrastructure loss
**Probability:** Very Low (<1% annually)
**RTO:** 8 hours
**RPO:** 24 hours

**Indicators:**
- Complete loss of connectivity to data center
- Data center provider notifications
- Physical access to facility restricted
- Multiple systems affected

**Root Causes:**
- Natural disasters (flooding, earthquake, fire)
- Extended power outage
- Network infrastructure failure
- Physical security breach
- HVAC failure causing overheating

**Business Impact:**
- Complete system unavailability
- Extended recovery time
- Potential data loss if backups not current
- Failover to alternate site required
- Business continuity procedures activated

---

### Scenario 6: Cyber Security Incident

**Impact:** Critical - Security breach
**Probability:** Medium (5-10% annually)
**RTO:** 12 hours
**RPO:** 24 hours

**Indicators:**
- Unusual authentication patterns
- Unauthorized access attempts
- Malware/ransomware detection
- Data exfiltration alerts
- System file modifications
- Unexpected admin account creation

**Root Causes:**
- Ransomware attack
- Data breach
- Malware infection
- Unauthorized access
- Insider threat
- Phishing attack success

**Business Impact:**
- System must be taken offline for investigation
- Potential data confidentiality breach
- Regulatory compliance implications
- Public trust impact
- Possible legal consequences
- Forensic investigation required

---

### Scenario 7: Network Infrastructure Failure

**Impact:** High - Connectivity loss
**Probability:** Medium (5-10% annually)
**RTO:** 3 hours
**RPO:** 0 hours (no data loss)

**Indicators:**
- Users cannot access system
- Network connectivity errors
- DNS resolution failures
- Firewall or router failures

**Root Causes:**
- ISP outage
- Network equipment failure
- DDoS attack
- DNS server issues
- Firewall misconfiguration

**Business Impact:**
- System unreachable but data intact
- Users cannot perform work
- External integrations (HRIMS) fail
- Email notifications not sent

---

### Scenario 8: Environmental Disaster

**Impact:** Critical - Physical infrastructure
**Probability:** Very Low (<1% annually)
**RTO:** 24 hours
**RPO:** 24 hours

**Indicators:**
- Weather warnings or alerts
- Physical damage to facility
- Power loss
- Evacuation orders

**Root Causes:**
- Flooding
- Tropical storms
- Earthquakes
- Fire
- Extended power outage

**Business Impact:**
- Prolonged system unavailability
- Staff safety concerns
- Potential equipment damage
- Activation of offsite recovery
- Business continuity plan activation

---

## Recovery Strategies

### 1. High Availability Architecture

#### Current Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer (Nginx)                 │
│                  https://csms.zanzibar.go.tz             │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│  PM2 Cluster   │            │  PM2 Cluster    │
│  (4 instances) │            │  (4 instances)  │
│   Port 9002    │            │   Port 9002     │
└───────┬────────┘            └────────┬────────┘
        │                              │
        └──────────┬───────────────────┘
                   │
        ┌──────────▼───────────┐
        │   PostgreSQL DB      │
        │   (nody database)    │
        └──────────┬───────────┘
                   │
        ┌──────────▼───────────┐
        │   MinIO Storage      │
        │  (csms-documents)    │
        └──────────────────────┘
```

#### Recommended High Availability Improvements
1. **Database Replication**: Implement PostgreSQL streaming replication
2. **Load Balancing**: Deploy multiple application servers
3. **Storage Replication**: MinIO distributed mode across multiple nodes
4. **Geographic Redundancy**: Backup site in different location

### 2. Backup Strategy

#### Primary Backups (On-site)
- **Location**: `/var/backups/csms/`
- **Retention**: 30 days (rolling)
- **Schedule**: Daily at 02:00 EAT
- **Components**: Database, configurations, logs

#### Secondary Backups (Network Storage)
- **Location**: Network-attached storage (NAS)
- **Retention**: 90 days
- **Schedule**: Weekly full backups
- **Components**: Database, MinIO data, complete system state

#### Offsite Backups (Remote)
- **Location**: Cloud storage or remote data center
- **Retention**: 365 days (annual archives)
- **Schedule**: Daily synchronization at 05:00 EAT
- **Components**: All critical data and configurations

#### Backup Verification
- **Daily**: Automated integrity checks (md5sum verification)
- **Weekly**: Test restore to staging environment
- **Monthly**: Full disaster recovery drill
- **Quarterly**: Offsite backup validation

### 3. Alternate Site Strategy

#### Cold Site (Current)
- **Location**: Designated backup facility
- **Setup Time**: 6-8 hours
- **Equipment**: Minimal (requires hardware procurement/relocation)
- **Cost**: Low

#### Warm Site (Recommended)
- **Location**: Secondary data center or cloud provider
- **Setup Time**: 2-4 hours
- **Equipment**: Pre-configured servers with periodic updates
- **Cost**: Medium
- **Benefits**: Faster recovery, reduced downtime

#### Hot Site (Future Consideration)
- **Location**: Active secondary site
- **Setup Time**: <1 hour (automatic failover)
- **Equipment**: Fully redundant active system
- **Cost**: High
- **Benefits**: Near-zero downtime, automatic failover

### 4. Data Replication Strategy

#### Database Replication (Recommended Implementation)
```bash
# Primary Server Configuration
# /etc/postgresql/14/main/postgresql.conf

wal_level = replica
max_wal_senders = 3
wal_keep_size = 1GB
synchronous_commit = on

# Standby Server Configuration
primary_conninfo = 'host=primary-db port=5432 user=replication password=xxx'
promote_trigger_file = '/tmp/postgresql.trigger.5432'
```

#### File Storage Replication
```bash
# MinIO Mirror to Secondary Site
mc mirror --watch csms-primary/csms-documents csms-secondary/csms-documents
```

### 5. Recovery Prioritization

#### Priority 1 (Critical - Recover First)
1. Database server
2. Application server (core functionality)
3. Authentication system
4. Network connectivity

#### Priority 2 (High - Recover Second)
1. MinIO storage (documents)
2. Email notifications
3. HRIMS integration
4. Reporting functionality

#### Priority 3 (Medium - Recover Third)
1. Advanced features
2. Analytics and dashboards
3. Historical data access
4. Non-critical integrations

---

## Recovery Procedures

### Procedure 1: Database Server Recovery

#### Prerequisites
- Access to latest database backup
- PostgreSQL 14+ installation available
- Root/sudo access to server
- Database backup verification passed

#### Step-by-Step Recovery

**Step 1: Assess the Situation (15 minutes)**
```bash
# Check database service status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -n 100 /var/log/postgresql/postgresql-14-main.log

# Check disk space
df -h /var/lib/postgresql

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

**Step 2: Stop All Services (10 minutes)**
```bash
# Stop application to prevent connection attempts
pm2 stop csms-production

# Stop PostgreSQL if running
sudo systemctl stop postgresql

# Verify all stopped
pm2 status
sudo systemctl status postgresql
```

**Step 3: Backup Current State (15 minutes)**
```bash
# Even if corrupted, backup current state for analysis
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo tar -czf /tmp/postgresql-failed-state-${TIMESTAMP}.tar.gz \
    /var/lib/postgresql/14/main \
    /etc/postgresql/14/main

# Move to safe location
sudo mv /tmp/postgresql-failed-state-${TIMESTAMP}.tar.gz /var/backups/incident/
```

**Step 4: Restore Database (60 minutes)**
```bash
# Remove corrupted database cluster
sudo -u postgres rm -rf /var/lib/postgresql/14/main/*

# Initialize new cluster
sudo -u postgres /usr/lib/postgresql/14/bin/initdb \
    -D /var/lib/postgresql/14/main

# Copy configuration files
sudo cp /var/backups/csms/config/postgresql.conf \
    /etc/postgresql/14/main/
sudo cp /var/backups/csms/config/pg_hba.conf \
    /etc/postgresql/14/main/

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl status postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE nody;
CREATE USER csms_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nody TO csms_user;
\q
EOF

# Restore from latest backup
LATEST_BACKUP=$(ls -t /var/backups/csms/nody_*.sql.gz | head -1)
echo "Restoring from: $LATEST_BACKUP"

gunzip -c $LATEST_BACKUP | sudo -u postgres psql nody

# Verify restoration
sudo -u postgres psql nody -c "\dt"
sudo -u postgres psql nody -c "SELECT COUNT(*) FROM \"User\";"
sudo -u postgres psql nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

**Step 5: Verify Database Integrity (30 minutes)**
```bash
# Run database integrity checks
sudo -u postgres psql nody <<EOF
-- Check for corruption
SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname))
FROM pg_database;

-- Verify tables
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check for orphaned records
VACUUM ANALYZE;
\q
EOF

# Test database connection from application
cd /var/www/csms
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const count = await prisma.user.count();
    console.log('Database connection successful. User count:', count);
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}
test();
"
```

**Step 6: Restart Application (15 minutes)**
```bash
# Start application
pm2 start ecosystem.config.js

# Wait for startup
sleep 30

# Check application status
pm2 status
pm2 logs csms-production --lines 50

# Test health endpoint
curl http://localhost:9002/api/health

# Test database endpoint
curl http://localhost:9002/api/test-db
```

**Step 7: Verification and Testing (30 minutes)**
```bash
# Test critical functions
# 1. User login
curl -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Database read
curl http://localhost:9002/api/employees?limit=10

# 3. Database write (if appropriate for test environment)
# Perform manual UI testing of key workflows

# Monitor logs for errors
pm2 logs csms-production --lines 100 | grep -i error

# Check database performance
sudo -u postgres psql nody -c "
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 10;
"
```

**Step 8: Resume Normal Operations (15 minutes)**
```bash
# Disable maintenance mode
sudo rm /var/www/html/index.html
sudo systemctl reload nginx

# Send all-clear notification
echo "Database recovery completed at $(date)" | \
  mail -s "CSMS Database Recovery - COMPLETE" it-team@zanzibar.go.tz

# Update incident log
echo "$(date): Database server recovery completed successfully" >> \
  /var/log/csms/incident.log

# Schedule follow-up monitoring
# Add to crontab for next 24 hours: increased monitoring frequency
echo "*/5 * * * * /opt/csms/scripts/enhanced-monitoring.sh" | crontab -
```

**Total Estimated Time: 3 hours**

---

### Procedure 2: Application Server Recovery

#### Prerequisites
- Access to latest application code (Git repository)
- Node.js 18 LTS or 20 LTS installed
- PM2 installed globally
- Database operational

#### Step-by-Step Recovery

**Step 1: Assess Application Status (10 minutes)**
```bash
# Check PM2 status
pm2 status
pm2 logs csms-production --lines 100

# Check process resources
pm2 monit

# Check application files
ls -lh /var/www/csms/
```

**Step 2: Stop Application (5 minutes)**
```bash
# Stop all PM2 processes
pm2 stop all

# Delete PM2 process if corrupted
pm2 delete csms-production

# Verify stopped
pm2 status
ps aux | grep node
```

**Step 3: Backup Current State (10 minutes)**
```bash
# Backup current application directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo tar -czf /var/backups/incident/csms-app-${TIMESTAMP}.tar.gz \
    /var/www/csms \
    --exclude=/var/www/csms/node_modules \
    --exclude=/var/www/csms/.next

# Backup PM2 configuration
pm2 save
sudo cp ~/.pm2/dump.pm2 /var/backups/incident/pm2-dump-${TIMESTAMP}.pm2
```

**Step 4: Restore Application (45 minutes)**
```bash
# Navigate to application directory
cd /var/www/csms

# Pull latest stable code
git fetch origin
git checkout main
git pull origin main

# Or clone fresh if directory corrupted
# cd /var/www
# sudo rm -rf csms
# git clone https://github.com/your-org/csms.git
# cd csms

# Install dependencies
npm ci --production

# Build application
npm run build

# Verify build
ls -lh .next/
```

**Step 5: Restore Configuration (15 minutes)**
```bash
# Restore environment configuration
sudo cp /var/backups/csms/config/.env.production /var/www/csms/.env

# Verify critical environment variables
cat /var/www/csms/.env | grep -E "DATABASE_URL|NEXTAUTH_SECRET|MINIO_"

# Set proper permissions
sudo chown -R csms:csms /var/www/csms
sudo chmod 600 /var/www/csms/.env
```

**Step 6: Database Migration (if needed) (20 minutes)**
```bash
# Check migration status
npx prisma migrate status

# Run pending migrations (if any)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Verify database schema
npx prisma db pull
```

**Step 7: Start Application (15 minutes)**
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Wait for application to initialize
sleep 30

# Check status
pm2 status
pm2 logs csms-production --lines 50

# Monitor CPU and memory
pm2 monit
```

**Step 8: Verification (20 minutes)**
```bash
# Test health endpoint
curl http://localhost:9002/api/health

# Test API endpoints
curl http://localhost:9002/api/auth/session

# Check application logs for errors
pm2 logs csms-production --lines 200 | grep -i error

# Test from external network
curl https://csms.zanzibar.go.tz/api/health

# Perform UI testing
# - Login functionality
# - Dashboard loading
# - Employee search
# - Request submission
# - File upload
```

**Step 9: Resume Operations (10 minutes)**
```bash
# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u csms --hp /home/csms

# Disable maintenance mode
sudo rm /var/www/html/index.html
sudo systemctl reload nginx

# Notify users
echo "Application server recovery completed at $(date)" | \
  mail -s "CSMS Application Recovery - COMPLETE" it-team@zanzibar.go.tz
```

**Total Estimated Time: 2.5 hours**

---

### Procedure 3: Storage System (MinIO) Recovery

#### Prerequisites
- MinIO backup available
- MinIO installed and configured
- Network connectivity operational

#### Step-by-Step Recovery

**Step 1: Assess MinIO Status (10 minutes)**
```bash
# Check MinIO service
sudo systemctl status minio

# Check MinIO logs
sudo journalctl -u minio -n 100

# Check storage disk
df -h /data/minio

# Test MinIO API
mc admin info local
```

**Step 2: Stop MinIO Service (5 minutes)**
```bash
# Stop MinIO
sudo systemctl stop minio

# Verify stopped
sudo systemctl status minio
ps aux | grep minio
```

**Step 3: Backup Current State (15 minutes)**
```bash
# Backup current MinIO data (if accessible)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sudo tar -czf /var/backups/incident/minio-${TIMESTAMP}.tar.gz \
    /data/minio \
    /etc/minio

# Backup MinIO configuration
sudo cp -r /etc/minio /var/backups/incident/minio-config-${TIMESTAMP}
```

**Step 4: Restore MinIO Data (90 minutes)**
```bash
# Clear corrupted data
sudo rm -rf /data/minio/*

# Create bucket directories
sudo mkdir -p /data/minio/csms-documents

# Restore from backup
LATEST_BACKUP=$(ls -t /var/backups/csms/minio_*.tar.gz | head -1)
echo "Restoring from: $LATEST_BACKUP"

sudo tar -xzf $LATEST_BACKUP -C /data/minio/

# Set proper permissions
sudo chown -R minio:minio /data/minio
sudo chmod -R 755 /data/minio
```

**Step 5: Restore MinIO Configuration (10 minutes)**
```bash
# Restore MinIO configuration
sudo cp /var/backups/csms/config/minio /etc/default/minio

# Verify configuration
cat /etc/default/minio | grep -E "MINIO_ROOT_USER|MINIO_VOLUMES"

# Set proper permissions
sudo chmod 600 /etc/default/minio
```

**Step 6: Start MinIO Service (10 minutes)**
```bash
# Start MinIO
sudo systemctl start minio

# Wait for service to initialize
sleep 10

# Check status
sudo systemctl status minio

# Check MinIO logs
sudo journalctl -u minio -n 50
```

**Step 7: Verification (30 minutes)**
```bash
# Configure mc client
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD

# List buckets
mc ls local

# List objects in bucket
mc ls local/csms-documents --recursive | head -20

# Test file upload
echo "Test file $(date)" > /tmp/test.txt
mc cp /tmp/test.txt local/csms-documents/test/test.txt

# Test file download
mc cp local/csms-documents/test/test.txt /tmp/test-download.txt
cat /tmp/test-download.txt

# Verify bucket policy
mc admin policy list local

# Check storage usage
mc admin info local
```

**Step 8: Application Integration Test (15 minutes)**
```bash
# Restart application to reconnect to MinIO
pm2 restart csms-production

# Wait for initialization
sleep 20

# Test file upload through application
# (Perform manual UI test of file upload)

# Check application logs for MinIO errors
pm2 logs csms-production --lines 100 | grep -i minio

# Verify document access
curl -I https://csms.zanzibar.go.tz/api/documents/test-id
```

**Step 9: Resume Operations (10 minutes)**
```bash
# Enable MinIO monitoring
mc admin trace local &

# Schedule data integrity check
mc admin heal local --recursive &

# Notify users
echo "Storage system recovery completed at $(date)" | \
  mail -s "CSMS Storage Recovery - COMPLETE" it-team@zanzibar.go.tz

# Update incident log
echo "$(date): MinIO storage recovery completed" >> \
  /var/log/csms/incident.log
```

**Total Estimated Time: 3 hours**

---

### Procedure 4: Complete System Recovery (Bare Metal)

#### Prerequisites
- Clean Ubuntu 22.04 LTS server
- All backup files accessible
- Network configured
- Root access

#### Step-by-Step Recovery

**Step 1: Prepare Server (30 minutes)**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git vim htop

# Configure hostname
sudo hostnamectl set-hostname csms-prod

# Configure timezone
sudo timedatectl set-timezone Africa/Dar_es_Salaam
```

**Step 2: Install Dependencies (45 minutes)**
```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js and npm
node --version  # Should be v20.x.x
npm --version

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL 14
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-14 postgresql-client-14

# Install Nginx
sudo apt install -y nginx

# Install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
sudo chmod +x minio
sudo mv minio /usr/local/bin/
```

**Step 3: Restore PostgreSQL (60 minutes)**
```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE nody;
CREATE USER csms_user WITH PASSWORD 'your_secure_password';
ALTER USER csms_user WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE nody TO csms_user;
\q
EOF

# Restore database configuration
sudo cp /var/backups/csms/config/postgresql.conf /etc/postgresql/14/main/
sudo cp /var/backups/csms/config/pg_hba.conf /etc/postgresql/14/main/

# Restart PostgreSQL with new config
sudo systemctl restart postgresql

# Restore database from backup
LATEST_DB_BACKUP=$(ls -t /var/backups/csms/nody_*.sql.gz | head -1)
gunzip -c $LATEST_DB_BACKUP | sudo -u postgres psql nody

# Verify database
sudo -u postgres psql nody -c "\dt"
sudo -u postgres psql nody -c "SELECT COUNT(*) FROM \"User\";"
```

**Step 4: Restore Application (45 minutes)**
```bash
# Create application user
sudo useradd -m -s /bin/bash csms

# Create application directory
sudo mkdir -p /var/www/csms
sudo chown csms:csms /var/www/csms

# Clone or restore application
cd /var/www/csms
sudo -u csms git clone https://github.com/your-org/csms.git .

# Or restore from backup
# sudo tar -xzf /var/backups/csms/app-backup.tar.gz -C /var/www/csms/

# Install dependencies
sudo -u csms npm ci --production

# Restore environment configuration
sudo cp /var/backups/csms/config/.env.production /var/www/csms/.env
sudo chown csms:csms /var/www/csms/.env
sudo chmod 600 /var/www/csms/.env

# Build application
sudo -u csms npm run build

# Run database migrations
sudo -u csms npx prisma migrate deploy
sudo -u csms npx prisma generate
```

**Step 5: Restore MinIO (60 minutes)**
```bash
# Create MinIO user and directories
sudo useradd -r -s /sbin/nologin minio
sudo mkdir -p /data/minio
sudo mkdir -p /etc/minio

# Restore MinIO configuration
sudo cp /var/backups/csms/config/minio /etc/default/minio

# Create systemd service
sudo tee /etc/systemd/system/minio.service > /dev/null <<'EOF'
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target

[Service]
User=minio
Group=minio
EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server $MINIO_VOLUMES
Restart=always
LimitNOFILE=65536
TasksMax=infinity
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
EOF

# Restore MinIO data
LATEST_MINIO_BACKUP=$(ls -t /var/backups/csms/minio_*.tar.gz | head -1)
sudo tar -xzf $LATEST_MINIO_BACKUP -C /data/minio/

# Set permissions
sudo chown -R minio:minio /data/minio
sudo chmod -R 755 /data/minio

# Start MinIO
sudo systemctl daemon-reload
sudo systemctl start minio
sudo systemctl enable minio
```

**Step 6: Configure Nginx (30 minutes)**
```bash
# Restore Nginx configuration
sudo cp /var/backups/csms/config/nginx-csms.conf /etc/nginx/sites-available/csms

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

**Step 7: Start Application (30 minutes)**
```bash
# Start application with PM2
cd /var/www/csms
sudo -u csms pm2 start ecosystem.config.js

# Save PM2 configuration
sudo -u csms pm2 save

# Setup PM2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u csms --hp /home/csms

# Verify all services
sudo systemctl status postgresql
sudo systemctl status minio
sudo systemctl status nginx
sudo -u csms pm2 status
```

**Step 8: Comprehensive Verification (60 minutes)**
```bash
# Test database connectivity
sudo -u postgres psql nody -c "SELECT COUNT(*) FROM \"User\";"

# Test MinIO
mc alias set local http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
mc ls local/csms-documents | head -10

# Test application health
curl http://localhost:9002/api/health

# Test external access
curl https://csms.zanzibar.go.tz/api/health

# Perform comprehensive UI testing
# - User login
# - Dashboard access
# - Employee search
# - Request submission
# - Document upload/download
# - Report generation

# Monitor logs for errors
sudo tail -f /var/log/nginx/error.log &
sudo tail -f /var/log/postgresql/postgresql-14-main.log &
sudo -u csms pm2 logs csms-production
```

**Step 9: Post-Recovery Tasks (30 minutes)**
```bash
# Setup monitoring
sudo cp /var/backups/csms/scripts/monitoring.sh /opt/csms/scripts/
sudo chmod +x /opt/csms/scripts/monitoring.sh

# Configure automated backups
sudo crontab -e
# Add:
# 0 2 * * * /opt/csms/scripts/backup-database.sh
# 0 3 * * 6 /opt/csms/scripts/backup-minio.sh
# 0 5 * * * /opt/csms/scripts/sync-offsite.sh

# Setup log rotation
sudo cp /var/backups/csms/config/logrotate-csms /etc/logrotate.d/csms

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Update DNS if needed
# Point csms.zanzibar.go.tz to new server IP

# Notify stakeholders
echo "Complete system recovery finished at $(date)" | \
  mail -s "CSMS System Recovery - COMPLETE" it-team@zanzibar.go.tz,management@zanzibar.go.tz
```

**Total Estimated Time: 6 hours**

---

## Communication Plan

### 1. Communication Objectives

- Provide timely updates to all stakeholders
- Maintain transparency during recovery operations
- Coordinate recovery team activities
- Document all recovery actions
- Manage expectations regarding recovery timeline

### 2. Stakeholder Groups

| Stakeholder Group | Communication Method | Update Frequency | Key Information |
|-------------------|---------------------|------------------|-----------------|
| Executive Management | Email + Phone | Every 2 hours | Impact, ETA, business implications |
| IT Leadership | Phone + Slack | Every hour | Technical details, progress, blockers |
| Recovery Team | Slack + In-person | Continuous | Task assignments, status, coordination |
| End Users | Email + System Banner | Every 4 hours | Availability, expected restoration time |
| HR Department | Email + Phone | Every 2 hours | Operational impact, workarounds |
| PSC Leadership | Email | Every 4 hours | Status summary, regulatory implications |
| IT Support Staff | Slack + Email | Every hour | User impact, support procedures |
| Vendors/Partners | Email | As needed | Required assistance, SLA activation |

### 3. Communication Templates

#### Initial Incident Notification

**Subject:** URGENT: CSMS System Outage - [Disaster Type]

```
TO: [Stakeholder Group]
FROM: IT Operations Manager
DATE: [Current Date and Time]
SEVERITY: [Critical/High/Medium]

INCIDENT SUMMARY:
The Civil Service Management System (CSMS) is currently unavailable due to [brief description of disaster].

IMPACT:
- System Status: Offline
- Affected Users: [Number] users
- Affected Operations: [List key operations]
- Data Loss Risk: [Yes/No - details]

CURRENT ACTIONS:
- Disaster Recovery Plan activated at [time]
- Recovery team mobilized
- [Specific recovery actions initiated]

ESTIMATED RECOVERY:
- Estimated Recovery Time: [X] hours
- Expected Restoration: [Date/Time]
- Recovery Target: [RTO objective]

WORKAROUNDS:
[List any manual procedures or alternatives]

NEXT UPDATE:
Next update will be provided at [time], approximately [X] hours from now.

CONTACT:
For urgent inquiries: [Phone number]
For updates: [Email address]

[Name]
IT Operations Manager
```

#### Hourly Progress Update

**Subject:** CSMS Recovery Update - [Hour] - [Status]

```
TO: Recovery Team, IT Leadership
FROM: Incident Commander
DATE: [Current Date and Time]

PROGRESS UPDATE - Hour [X] of Recovery

COMPLETED TASKS:
✓ [Task 1]
✓ [Task 2]
✓ [Task 3]

IN PROGRESS:
→ [Current task] - [X]% complete, ETA [time]
→ [Current task] - [Status]

PENDING:
○ [Upcoming task]
○ [Upcoming task]

BLOCKERS:
[Any issues preventing progress, or "None"]

REVISED ETA:
[Updated estimated completion time]

TEAM STATUS:
[Team member availability, shift changes, additional resources needed]

NEXT CHECKPOINT: [Time]
```

#### Recovery Completion Notification

**Subject:** CSMS System Restored - Operations Resumed

```
TO: All Stakeholders
FROM: IT Operations Manager
DATE: [Current Date and Time]

RESOLUTION SUMMARY:
The Civil Service Management System (CSMS) has been successfully restored and is now operational.

INCIDENT DETAILS:
- Incident Start: [Date/Time]
- Incident End: [Date/Time]
- Total Downtime: [Duration]
- Root Cause: [Brief description]

RECOVERY ACTIONS:
- [Key recovery step 1]
- [Key recovery step 2]
- [Key recovery step 3]

VERIFICATION COMPLETED:
✓ System functionality verified
✓ Data integrity confirmed
✓ Security checks passed
✓ User access restored
✓ All services operational

DATA IMPACT:
- Data Loss: [None / Details of any data loss]
- Data Recovery Point: [Last backup restored]
- Transactions to Re-enter: [Number, if any]

SYSTEM STATUS:
The system is now available at: https://csms.zanzibar.go.tz
All users can resume normal operations.

ENHANCED MONITORING:
The system will be under enhanced monitoring for the next 24-48 hours to ensure stability.

POST-INCIDENT ACTIONS:
- Post-incident review scheduled for [Date/Time]
- Root cause analysis to be completed by [Date]
- Preventive measures to be implemented

SUPPORT:
If you experience any issues, please contact:
- IT Support: [Phone/Email]
- Help Desk: [Phone/Email]

Thank you for your patience during this incident.

[Name]
IT Operations Manager
```

#### User Communication - System Banner

```html
<div class="alert alert-warning" role="alert">
  <strong>System Maintenance Notice:</strong>
  CSMS is currently undergoing emergency recovery procedures.
  Expected restoration time: [XX:XX EAT].
  We apologize for the inconvenience.
  For urgent HR matters, please contact [phone number].
</div>
```

### 4. Communication Channels

#### Primary Channels
- **Email**: Formal communications, documentation
- **Phone**: Urgent matters, executive updates
- **Slack** (#csms-incident): Real-time team coordination
- **SMS**: Critical alerts to key personnel
- **System Status Page**: Public status updates

#### Emergency Contact List

**Recovery Team**
| Role | Name | Phone | Email | Backup |
|------|------|-------|-------|--------|
| Incident Commander | [Name] | [Phone] | [Email] | [Backup Name] |
| Database Administrator | [Name] | [Phone] | [Email] | [Backup Name] |
| Application Lead | [Name] | [Phone] | [Email] | [Backup Name] |
| Infrastructure Lead | [Name] | [Phone] | [Email] | [Backup Name] |
| Security Officer | [Name] | [Phone] | [Email] | [Backup Name] |

**Executive Management**
| Role | Name | Phone | Email |
|------|------|-------|-------|
| Director General | [Name] | [Phone] | [Email] |
| HR Director | [Name] | [Phone] | [Email] |
| IT Director | [Name] | [Phone] | [Email] |
| PSC Secretary | [Name] | [Phone] | [Email] |

**Vendors and Partners**
| Vendor | Service | Contact | Phone | Email | SLA |
|--------|---------|---------|-------|-------|-----|
| [Hosting Provider] | Infrastructure | [Name] | [Phone] | [Email] | 24/7 |
| [Database Support] | PostgreSQL | [Name] | [Phone] | [Email] | Business hours |
| [Security Firm] | Incident Response | [Name] | [Phone] | [Email] | 24/7 |

### 5. Escalation Procedures

#### Level 1: Initial Response (0-30 minutes)
- **Actions**: Assess incident, activate recovery team, initial notification
- **Contacts**: IT Operations Manager, Recovery Team Lead
- **Communication**: Internal team only

#### Level 2: Recovery In Progress (30 minutes - 2 hours)
- **Actions**: Execute recovery procedures, hourly updates
- **Contacts**: IT Leadership, HR Department
- **Communication**: Internal stakeholders, affected users

#### Level 3: Extended Outage (2-4 hours)
- **Actions**: Activate alternate procedures, vendor support
- **Contacts**: Executive Management, PSC Leadership
- **Communication**: All stakeholders, public announcement

#### Level 4: Critical Escalation (>4 hours)
- **Actions**: Crisis management, media relations, regulatory notification
- **Contacts**: Director General, Government IT Authority
- **Communication**: Full transparency, external communications

---

## Roles and Responsibilities

### 1. Disaster Recovery Team Structure

```
                    Incident Commander
                            |
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Technical Lead   Communications Lead   Logistics Lead
        │                  │                  │
   ┌────┴────┐        ┌────┴────┐       ┌────┴────┐
   │    │    │        │    │    │       │    │    │
  DBA App Infra    Users Mgmt Media   Vendor Site Equip
```

### 2. Role Definitions

#### Incident Commander
**Primary Responsibility**: Overall disaster recovery coordination

**Key Duties**:
- Declare disaster and activate DRP
- Coordinate all recovery activities
- Make critical decisions on recovery strategy
- Approve deviations from standard procedures
- Communicate with executive management
- Determine when to escalate or de-escalate
- Approve return to normal operations

**Authority**:
- Override normal change control procedures
- Authorize emergency expenditures up to $10,000
- Mobilize resources from other departments
- Engage external vendors and contractors

**Backup**: IT Operations Manager (alternate)

---

#### Technical Recovery Lead
**Primary Responsibility**: Execute technical recovery procedures

**Key Duties**:
- Assess technical damage and recovery requirements
- Coordinate technical team members
- Execute recovery procedures
- Monitor recovery progress
- Troubleshoot technical issues
- Verify system functionality post-recovery
- Document all technical actions taken

**Authority**:
- Direct technical team activities
- Access all system resources
- Modify system configurations as needed
- Engage vendor technical support

**Backup**: Senior Systems Administrator

---

#### Database Administrator
**Primary Responsibility**: Database recovery and verification

**Key Duties**:
- Assess database integrity
- Execute database recovery procedures
- Restore from backups
- Verify data integrity
- Run database integrity checks
- Optimize database performance post-recovery
- Document data loss (if any)

**Skills Required**:
- PostgreSQL administration
- Backup/restore procedures
- Database performance tuning
- SQL query optimization

**Backup**: Junior DBA

---

#### Application Recovery Specialist
**Primary Responsibility**: Application server recovery

**Key Duties**:
- Restore application code
- Configure application environment
- Execute database migrations
- Restart application services
- Verify application functionality
- Monitor application performance
- Test critical user workflows

**Skills Required**:
- Next.js application deployment
- Node.js/npm
- PM2 process management
- Git version control

**Backup**: Senior Developer

---

#### Infrastructure Specialist
**Primary Responsibility**: Infrastructure and network recovery

**Key Duties**:
- Restore server infrastructure
- Configure network connectivity
- Restore storage systems (MinIO)
- Configure load balancers and proxies
- Verify firewall and security settings
- Monitor system resources
- Ensure high availability configurations

**Skills Required**:
- Linux system administration
- Nginx configuration
- MinIO administration
- Network configuration

**Backup**: Infrastructure Engineer

---

#### Communications Coordinator
**Primary Responsibility**: Stakeholder communications

**Key Duties**:
- Draft and send incident notifications
- Provide regular status updates
- Manage stakeholder expectations
- Coordinate with media (if needed)
- Update system status page
- Maintain communication log
- Prepare post-incident communications

**Skills Required**:
- Professional communication
- Stakeholder management
- Crisis communication
- Documentation

**Backup**: IT Communications Officer

---

#### Security Officer
**Primary Responsibility**: Security assessment and compliance

**Key Duties**:
- Assess security implications of disaster
- Ensure recovery procedures maintain security
- Investigate if disaster was security-related
- Verify security controls post-recovery
- Document security-related findings
- Coordinate with law enforcement if needed
- Ensure compliance with regulations

**Skills Required**:
- Information security
- Incident response
- Forensics (basic)
- Compliance requirements

**Backup**: Information Security Analyst

---

#### Logistics Coordinator
**Primary Responsibility**: Resource management and support

**Key Duties**:
- Coordinate physical resources
- Arrange vendor support
- Manage recovery site access
- Coordinate team logistics (food, rest, shifts)
- Procure emergency equipment
- Manage documentation
- Coordinate with facilities management

**Skills Required**:
- Project coordination
- Vendor management
- Resource planning
- Documentation

**Backup**: IT Operations Coordinator

---

### 3. RACI Matrix

| Task | Incident Commander | Technical Lead | DBA | App Specialist | Infra Specialist | Comms | Security |
|------|-------------------|----------------|-----|----------------|------------------|-------|----------|
| Declare Disaster | A | C | I | I | I | I | C |
| Assess Damage | I | A | R | R | R | I | R |
| Execute DB Recovery | I | C | A | I | I | I | C |
| Execute App Recovery | I | C | C | A | C | I | I |
| Execute Infra Recovery | I | C | I | I | A | I | C |
| Stakeholder Comms | A | I | I | I | I | R | I |
| Security Assessment | C | I | I | I | I | I | A |
| Vendor Coordination | A | C | R | R | R | I | I |
| Approve RTN | A | C | C | C | C | I | C |
| Post-Incident Report | A | C | R | R | R | R | R |

**Legend**: A = Accountable, R = Responsible, C = Consulted, I = Informed

---

### 4. Team Mobilization Procedures

#### Step 1: Initial Alert
```bash
# Automated alert (if monitoring detects outage)
/opt/csms/scripts/alert-recovery-team.sh "Database Server Failure"

# Or manual alert
# Send SMS/Email to all recovery team members
# Subject: "CSMS DISASTER - [Type] - MOBILIZE IMMEDIATELY"
```

#### Step 2: Acknowledgment
- All team members must acknowledge within 15 minutes
- If no acknowledgment, escalate to backup person

#### Step 3: Assembly
- Virtual assembly: Join Slack channel #csms-incident
- Physical assembly (if needed): IT Operations Center
- Target assembly time: 30 minutes from alert

#### Step 4: Briefing
- Incident Commander provides situation briefing
- Assign roles and tasks
- Establish communication protocols
- Set initial recovery targets

---

## Testing Schedule

### 1. Testing Objectives

- Verify recovery procedures are current and effective
- Train recovery team members
- Identify gaps in procedures or resources
- Meet compliance requirements
- Build confidence in recovery capabilities
- Improve RTO/RPO metrics

### 2. Testing Types

#### Tabletop Exercise (Quarterly)
**Duration**: 2-3 hours
**Participants**: Recovery team, management
**Approach**: Discussion-based walkthrough

**Procedure**:
1. Present disaster scenario
2. Discuss response actions
3. Identify decision points
4. Review communication procedures
5. Document findings and gaps

**Success Criteria**:
- All team members understand their roles
- Communication procedures validated
- Recovery steps documented
- Action items identified for improvement

---

#### Backup Restore Test (Monthly)
**Duration**: 4 hours
**Participants**: DBA, Technical Lead
**Approach**: Restore backup to test environment

**Procedure**:
```bash
# 1. Select random backup from last 30 days
BACKUP_FILE=$(ls /var/backups/csms/nody_*.sql.gz | shuf -n 1)

# 2. Restore to test database
gunzip -c $BACKUP_FILE | psql -h test-db.local -U csms_user csms_test

# 3. Verify data integrity
psql -h test-db.local -U csms_user csms_test <<EOF
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Employee";
SELECT COUNT(*) FROM "Institution";
-- Verify counts match expected ranges
\q
EOF

# 4. Test application connection
# Start test application pointing to restored database
# Verify login and basic functionality

# 5. Document results
echo "Backup Test $(date): $BACKUP_FILE - PASSED" >> /var/log/csms/backup-tests.log
```

**Success Criteria**:
- Backup restores without errors
- Data integrity verified
- Application connects successfully
- Documented completion within 2 hours

---

#### Partial Failover Test (Quarterly)
**Duration**: 6 hours
**Participants**: Full recovery team
**Approach**: Simulate single component failure

**Scenarios** (rotate quarterly):
- Q1: Database failover
- Q2: Application server failover
- Q3: Storage system failover
- Q4: Network/connectivity failover

**Procedure**:
1. Schedule test during maintenance window
2. Notify stakeholders of test
3. Simulate component failure
4. Execute recovery procedures
5. Verify system functionality
6. Return to normal operations
7. Conduct debrief
8. Document lessons learned

**Success Criteria**:
- Recovery completed within RTO
- No data loss (RPO met)
- All functionality restored
- Team coordination effective
- Documentation updated

---

#### Full Disaster Recovery Drill (Annual)
**Duration**: 8-12 hours
**Participants**: Full recovery team, management, vendors
**Approach**: Complete system recovery to alternate site

**Procedure**:
1. **Planning Phase (2 weeks prior)**
   - Schedule drill date
   - Notify all stakeholders
   - Prepare alternate site
   - Review procedures

2. **Execution Phase (Drill Day)**
   ```
   08:00 - Drill kickoff, scenario briefing
   08:30 - Declare disaster, activate DRP
   09:00 - Begin recovery procedures
   12:00 - Checkpoint 1: Database recovery
   14:00 - Checkpoint 2: Application recovery
   16:00 - Checkpoint 3: Full system verification
   17:00 - System operational on alternate site
   18:00 - Return to primary site
   19:00 - Drill conclusion
   ```

3. **Validation Phase**
   - Test all critical functions
   - Verify data integrity
   - Test user access
   - Validate integrations (HRIMS)
   - Performance testing

4. **Debrief Phase**
   - Team debrief (what went well, what didn't)
   - Stakeholder feedback
   - Document lessons learned
   - Create action plan for improvements

**Success Criteria**:
- Full recovery within 6 hours
- All systems functional
- No data loss
- Communication plan executed
- Lessons learned documented
- Improvement plan created

---

### 3. Annual Testing Calendar

| Month | Testing Activity | Focus Area | Duration | Participants |
|-------|-----------------|------------|----------|--------------|
| January | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| February | Tabletop Exercise | Database Failure Scenario | 2 hours | Full team |
| February | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| March | Partial Failover Test | Database Failover (Q1) | 6 hours | Full team |
| March | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| April | Backup Restore Test | Database + MinIO | 4 hours | DBA, Infra Specialist |
| May | Tabletop Exercise | Cyber Security Incident | 2 hours | Full team + Security |
| May | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| June | Partial Failover Test | Application Server (Q2) | 6 hours | Full team |
| June | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| July | Backup Restore Test | Database + MinIO | 4 hours | DBA, Infra Specialist |
| August | Tabletop Exercise | Natural Disaster Scenario | 2 hours | Full team + Management |
| August | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| September | Partial Failover Test | Storage System (Q3) | 6 hours | Full team |
| September | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| October | **FULL DR DRILL** | Complete System Recovery | 12 hours | All participants |
| October | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |
| November | Tabletop Exercise | Data Center Outage | 2 hours | Full team |
| November | Backup Restore Test | Database + MinIO | 4 hours | DBA, Infra Specialist |
| December | Partial Failover Test | Network Failover (Q4) | 6 hours | Full team |
| December | Backup Restore Test | Database | 4 hours | DBA, Tech Lead |

**Total Annual Testing**:
- 12 Backup Restore Tests (monthly)
- 4 Tabletop Exercises (quarterly)
- 4 Partial Failover Tests (quarterly)
- 1 Full DR Drill (annual)

---

### 4. Test Documentation Requirements

#### For Each Test, Document:

**Pre-Test**:
- Test date and time
- Test type and objectives
- Participants and roles
- Scenario description
- Expected outcomes

**During Test**:
- Start time of each major step
- Issues encountered
- Deviations from procedure
- Recovery metrics (time to restore each component)
- Communication effectiveness

**Post-Test**:
- Actual vs. expected RTO
- Actual vs. expected RPO
- Success/failure of each objective
- Issues and resolutions
- Lessons learned
- Action items for improvement
- Procedure updates needed

**Test Report Template**:
```markdown
# Disaster Recovery Test Report

**Test Date**: [Date]
**Test Type**: [Backup Restore / Tabletop / Partial Failover / Full DR Drill]
**Test ID**: DRT-[YYYY]-[MM]-[Number]

## Test Objectives
1. [Objective 1]
2. [Objective 2]

## Participants
- [Role]: [Name]
- [Role]: [Name]

## Scenario
[Description of disaster scenario tested]

## Results Summary
- **Overall Status**: PASS / PARTIAL / FAIL
- **RTO Target**: [X] hours
- **RTO Actual**: [Y] hours
- **RPO Target**: [X] hours
- **RPO Actual**: [Y] hours

## Detailed Results
| Objective | Status | Notes |
|-----------|--------|-------|
| [Obj 1] | PASS | [Notes] |
| [Obj 2] | FAIL | [Reason] |

## Issues Encountered
1. [Issue 1] - Severity: [High/Medium/Low] - Status: [Resolved/Pending]
2. [Issue 2] - Severity: [High/Medium/Low] - Status: [Resolved/Pending]

## Lessons Learned
1. [Lesson 1]
2. [Lesson 2]

## Action Items
| Item | Owner | Due Date | Priority |
|------|-------|----------|----------|
| [Action 1] | [Name] | [Date] | High |
| [Action 2] | [Name] | [Date] | Medium |

## Recommendations
1. [Recommendation 1]
2. [Recommendation 2]

## Procedure Updates
- [ ] [Update to procedure 1]
- [ ] [Update to procedure 2]

**Report Prepared By**: [Name]
**Report Date**: [Date]
**Approved By**: [Incident Commander]
```

---

### 5. Continuous Improvement Process

#### After Each Test:
1. **Immediate Debrief** (within 24 hours)
   - What worked well?
   - What didn't work?
   - What surprised us?

2. **Test Report** (within 3 days)
   - Document findings
   - Create action items
   - Assign owners and due dates

3. **Procedure Updates** (within 1 week)
   - Update DRP based on learnings
   - Update contact lists
   - Update technical procedures
   - Version control all changes

4. **Training Updates** (within 2 weeks)
   - Update training materials
   - Schedule additional training if needed
   - Share knowledge across team

5. **Follow-up** (within 1 month)
   - Verify action items completed
   - Test updated procedures
   - Close out test cycle

---

## Maintenance and Updates

### 1. Document Review Schedule

| Component | Review Frequency | Reviewer | Approver |
|-----------|-----------------|----------|----------|
| Entire DRP | Quarterly | IT Operations Manager | IT Director |
| Recovery Procedures | Monthly | Technical Lead | IT Operations Manager |
| Contact Lists | Monthly | All team leads | IT Operations Manager |
| Communication Templates | Quarterly | Communications Coordinator | IT Operations Manager |
| Test Results | After each test | Test Lead | IT Operations Manager |
| Vendor Contacts | Quarterly | Logistics Coordinator | IT Operations Manager |

### 2. Triggers for Document Updates

**Immediate Update Required**:
- Change in critical infrastructure
- Change in recovery team personnel
- Failed recovery test
- Actual disaster event
- Change in RTO/RPO requirements
- Major security incident

**Update Within 1 Week**:
- New system components added
- Vendor changes
- Network topology changes
- Storage configuration changes
- Backup procedure changes

**Update Within 1 Month**:
- Test results and lessons learned
- Minor procedure improvements
- Contact information changes
- Configuration updates

### 3. Version Control

**Document Versioning**:
- Format: `Major.Minor.Patch`
- Major: Significant restructuring or strategy change
- Minor: New procedures, significant updates
- Patch: Minor corrections, contact updates

**Change Log**:
```markdown
| Version | Date | Author | Changes | Approver |
|---------|------|--------|---------|----------|
| 1.0 | 2025-12-26 | IT Ops Manager | Initial release | IT Director |
| 1.1 | [Date] | [Name] | [Changes] | [Approver] |
```

### 4. Distribution and Training

**Document Distribution**:
- All recovery team members (digital + printed copy)
- IT Operations Center (printed copy in DRP binder)
- Executive management (digital summary)
- Offsite storage (printed copy)
- Secure cloud storage (encrypted digital copy)

**Training Requirements**:
- New recovery team members: Full DRP training within 2 weeks
- Existing team members: Annual refresher training
- Management: Annual DRP overview
- All IT staff: Awareness training (annual)

### 5. Compliance and Audit

**Annual Audit Checklist**:
- [ ] DRP document reviewed and current
- [ ] All tests completed per schedule
- [ ] Test results documented
- [ ] Contact lists verified
- [ ] Backups tested and verified
- [ ] Recovery procedures validated
- [ ] Team training completed
- [ ] Compliance requirements met
- [ ] Vendor SLAs reviewed
- [ ] Improvements implemented

---

## Appendices

### Appendix A: Quick Reference Cards

**Database Recovery Quick Reference**:
```
1. STOP APPLICATION: pm2 stop csms-production
2. STOP DATABASE: sudo systemctl stop postgresql
3. BACKUP CURRENT STATE: tar -czf /tmp/db-backup-$(date +%s).tar.gz /var/lib/postgresql/
4. RESTORE: gunzip -c [BACKUP] | psql nody
5. START DATABASE: sudo systemctl start postgresql
6. VERIFY: psql nody -c "SELECT COUNT(*) FROM \"User\";"
7. START APPLICATION: pm2 start ecosystem.config.js
```

**Application Recovery Quick Reference**:
```
1. STOP APP: pm2 stop all
2. BACKUP: tar -czf /tmp/app-backup-$(date +%s).tar.gz /var/www/csms
3. RESTORE CODE: git pull origin main
4. INSTALL: npm ci --production
5. BUILD: npm run build
6. MIGRATE: npx prisma migrate deploy
7. START: pm2 start ecosystem.config.js
```

### Appendix B: Emergency Contact Numbers

**24/7 Emergency Hotline**: [Phone Number]
**Incident Commander**: [Phone Number]
**IT Director**: [Phone Number]
**Database Support**: [Phone Number]
**Infrastructure Support**: [Phone Number]
**Security Team**: [Phone Number]

### Appendix C: Vendor Support Contacts

[Maintain current list of all vendor contacts with SLA details]

### Appendix D: Recovery Checklists

[Detailed step-by-step checklists for each recovery scenario]

---

## Document Control

**Document Owner**: IT Operations Manager
**Classification**: CONFIDENTIAL - Internal Use Only
**Distribution**: Recovery Team, IT Leadership, Executive Management

**Approval**:

| Role | Name | Signature | Date |
|------|------|-----------|------|
| IT Operations Manager | _________________ | _________________ | _______ |
| IT Director | _________________ | _________________ | _______ |
| HR Director | _________________ | _________________ | _______ |
| Director General | _________________ | _________________ | _______ |

**Change History**:

| Version | Date | Author | Changes | Approver |
|---------|------|--------|---------|----------|
| 1.0 | 2025-12-26 | IT Operations Manager | Initial release | IT Director |

---

*This Disaster Recovery Plan is a living document and must be reviewed and updated regularly to remain effective. All recovery team members are responsible for reporting any gaps or improvements to the document owner.*

**END OF DISASTER RECOVERY PLAN**

# Operations Manual

## Civil Service Management System (CSMS)

---

### Document Control

| **Version** | **Date**   | **Author**           | **Changes**               |
| ----------- | ---------- | -------------------- | ------------------------- |
| 1.0         | 2025-01-15 | CSMS Operations Team | Initial operations manual |

**Document Classification**: RESTRICTED
**Distribution**: System Administrators, Operations Team, Technical Support

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Administration](#2-system-administration)
3. [Routine Maintenance](#3-routine-maintenance)
4. [Backup Procedures](#4-backup-procedures)
5. [Monitoring Procedures](#5-monitoring-procedures)
6. [Alert Handling](#6-alert-handling)
7. [Performance Management](#7-performance-management)
8. [Security Operations](#8-security-operations)
9. [Incident Management](#9-incident-management)
10. [Change Management](#10-change-management)
11. [Capacity Planning](#11-capacity-planning)
12. [Runbooks](#12-runbooks)

---

## 1. Introduction

### 1.1 Purpose

This Operations Manual provides comprehensive guidance for the daily operation, maintenance, and monitoring of the Civil Service Management System (CSMS).

### 1.2 Scope

This manual covers:

- Daily, weekly, and monthly operational tasks
- System administration procedures
- Backup and recovery operations
- Monitoring and alerting procedures
- Incident response and troubleshooting
- Performance optimization
- Security operations

### 1.3 Audience

- System Administrators
- Database Administrators
- DevOps Engineers
- Technical Support Staff
- On-call Engineers

### 1.4 System Overview

**CSMS Architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    Users (Web Browsers)                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Nginx (Reverse Proxy)                   │
│                  Port 443 (HTTPS)                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            Next.js Application (PM2 Cluster)             │
│                     Port 9002                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Instance 1   │  │ Instance 2   │  │ Instance 3   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                    │                   │
           ▼                    ▼                   ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐
│   PostgreSQL     │  │      MinIO       │  │   HRIMS     │
│   Database       │  │  Object Storage  │  │   API       │
│   Port 5432      │  │  Port 9000       │  │   (Remote)  │
└──────────────────┘  └──────────────────┘  └─────────────┘
```

**Key Components**:
| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Web Server | Nginx | 443 | Reverse proxy, SSL termination |
| Application | Next.js 14 | 9002 | Web application and API |
| Process Manager | PM2 | - | Application process management |
| Database | PostgreSQL 14+ | 5432 | Data persistence |
| Object Storage | MinIO | 9000 | Document storage |
| External Integration | HRIMS API | - | Employee data sync |

### 1.5 Operations Team Structure

| Role                          | Responsibilities                                                             | Availability             |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| **Lead System Administrator** | - Overall system health<br>- Critical incident response<br>- Change approval | Business hours + on-call |
| **System Administrator**      | - Daily operations<br>- User support<br>- Routine maintenance                | Business hours           |
| **Database Administrator**    | - Database performance<br>- Backup verification<br>- Query optimization      | Business hours + on-call |
| **DevOps Engineer**           | - Deployment automation<br>- Infrastructure management<br>- Monitoring setup | Business hours           |
| **On-Call Engineer**          | - After-hours support<br>- Emergency response<br>- Incident escalation       | 24/7 rotation            |

---

## 2. System Administration

### 2.1 Daily Administrative Tasks

#### 2.1.1 Morning Health Check (08:00 - 08:30)

**System Status Verification**:

```bash
#!/bin/bash
# Daily health check script
# Location: /usr/local/bin/csms-health-check.sh

echo "===== CSMS Daily Health Check - $(date) ====="

# Check all services
echo -e "\n1. Service Status:"
sudo systemctl status postgresql --no-pager | grep Active
sudo systemctl status minio --no-pager | grep Active
sudo systemctl status nginx --no-pager | grep Active
pm2 status | grep csms-production

# Check application health
echo -e "\n2. Application Health:"
curl -s http://localhost:9002/api/health | jq '.'
curl -s http://localhost:9002/api/health/db | jq '.'
curl -s http://localhost:9002/api/health/minio | jq '.'
curl -s http://localhost:9002/api/health/hrims | jq '.'

# Check disk usage
echo -e "\n3. Disk Usage:"
df -h | grep -E '(Filesystem|/dev/|/mnt/)'

# Check memory usage
echo -e "\n4. Memory Usage:"
free -h

# Check CPU load
echo -e "\n5. CPU Load:"
uptime

# Check database connections
echo -e "\n6. Database Connections:"
sudo -u postgres psql -d nody -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# Check error logs
echo -e "\n7. Recent Errors (last 1 hour):"
pm2 logs csms-production --lines 1000 --nostream | grep -i error | tail -10

# Check MinIO bucket
echo -e "\n8. MinIO Bucket Status:"
mc stat csms-local/csms-documents

echo -e "\n===== Health Check Complete ====="
```

**Health Check Checklist**:

- [ ] All services running (PostgreSQL, MinIO, Nginx, PM2)
- [ ] Application health endpoints responding
- [ ] Disk usage < 80%
- [ ] Memory usage < 80%
- [ ] CPU load < 4.0 (for 4-core system)
- [ ] Database connections < 150
- [ ] No critical errors in logs
- [ ] MinIO bucket accessible

**If Issues Found**: Document in daily log and escalate as needed (see Section 6)

#### 2.1.2 Log Review (Throughout the day)

**Application Logs**:

```bash
# View real-time application logs
pm2 logs csms-production --lines 100

# Search for errors
pm2 logs csms-production --lines 1000 --nostream | grep -i error

# Search for warnings
pm2 logs csms-production --lines 1000 --nostream | grep -i warn

# View logs for specific time range
pm2 logs csms-production --lines 5000 --nostream | grep "2025-01-15 14:"
```

**Nginx Access Logs**:

```bash
# View access log
sudo tail -f /var/log/nginx/csms-access.log

# Check for errors (4xx, 5xx)
sudo grep -E "HTTP/[0-9.]+ (4|5)" /var/log/nginx/csms-access.log | tail -20

# Top accessed URLs today
sudo grep "$(date +%d/%b/%Y)" /var/log/nginx/csms-access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# Top IP addresses
sudo grep "$(date +%d/%b/%Y)" /var/log/nginx/csms-access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

**Database Logs**:

```bash
# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Check for errors
sudo grep -i error /var/log/postgresql/postgresql-14-main.log | tail -20

# Check for slow queries
sudo grep "duration:" /var/log/postgresql/postgresql-14-main.log | grep -v "duration: 0" | tail -20
```

#### 2.1.3 User Management

**Create New User**:

```bash
# Using CSMS API (requires admin authentication)
curl -X POST https://csms.zanajira.go.tz/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "John Doe",
    "username": "jdoe",
    "email": "jdoe@zanajira.go.tz",
    "phoneNumber": "0777123456",
    "role": "HR Officer",
    "institutionId": "inst-001",
    "password": "TempPassword123!"
  }'

# Or use Prisma Studio (development/staging only)
cd /var/www/csms
npx prisma studio
```

**Reset User Password**:

```bash
# Using CSMS API
curl -X PUT https://csms.zanajira.go.tz/api/users/$USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "password": "NewPassword123!"
  }'

# Or directly in database (emergency only)
cd /var/www/csms
node -e "
const bcrypt = require('bcryptjs');
const password = 'NewPassword123!';
bcrypt.genSalt(10).then(salt => {
  bcrypt.hash(password, salt).then(hash => {
    console.log('Hashed password:', hash);
    console.log('Run this SQL:');
    console.log(\`UPDATE \"User\" SET password = '\${hash}' WHERE id = 'USER_ID';\`);
  });
});
"
```

**Deactivate User**:

```bash
# Using CSMS API
curl -X PUT https://csms.zanajira.go.tz/api/users/$USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "isActive": false
  }'

# Or directly in database
sudo -u postgres psql -d nody -c "UPDATE \"User\" SET \"isActive\" = false WHERE id = 'USER_ID';"
```

**View User Activity**:

```bash
# Check user logins today
sudo grep "POST /api/auth/login" /var/log/nginx/csms-access.log | grep "$(date +%d/%b/%Y)" | wc -l

# View recent logins
sudo -u postgres psql -d nody -c "
SELECT u.name, u.email, n.\"createdAt\"
FROM \"Notification\" n
JOIN \"User\" u ON n.\"userId\" = u.id
WHERE n.message LIKE '%logged in%'
ORDER BY n.\"createdAt\" DESC
LIMIT 20;
"
```

#### 2.1.4 Application Management

**Check Application Status**:

```bash
# PM2 status
pm2 status

# Detailed info
pm2 info csms-production

# Monitor in real-time
pm2 monit

# View application uptime
pm2 jlist | jq '.[] | {name: .name, uptime: .pm2_env.pm_uptime}'
```

**Restart Application** (if needed):

```bash
# Graceful restart (zero-downtime)
pm2 reload csms-production

# Hard restart
pm2 restart csms-production

# Restart specific instance
pm2 restart csms-production --update-env

# Scale instances (change cluster size)
pm2 scale csms-production 6  # Scale to 6 instances
```

**Clear Application Cache**:

```bash
# Clear Next.js cache
cd /var/www/csms
rm -rf .next/cache/*

# Restart application
pm2 restart csms-production
```

#### 2.1.5 End of Day Report (17:00)

**Daily Report Template**:

```bash
#!/bin/bash
# Daily report script
# Location: /usr/local/bin/csms-daily-report.sh

REPORT_FILE="/var/log/csms/daily-reports/report-$(date +%Y%m%d).txt"
mkdir -p /var/log/csms/daily-reports

cat > $REPORT_FILE <<EOF
CSMS Daily Operations Report
Date: $(date +%Y-%m-%d)
Generated: $(date)

===== SYSTEM STATUS =====
Uptime: $(uptime -p)
All Services: $(sudo systemctl is-active postgresql minio nginx && pm2 status | grep csms-production | awk '{print $10}')

===== USAGE METRICS =====
Total Users Logged In Today: $(sudo grep "POST /api/auth/login.*200" /var/log/nginx/csms-access.log | grep "$(date +%d/%b/%Y)" | wc -l)
Total Requests Created Today: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"ConfirmationRequest\" WHERE DATE(\"createdAt\") = CURRENT_DATE;")
Total Documents Uploaded Today: $(mc ls csms-local/csms-documents --recursive | grep "$(date +%Y-%m-%d)" | wc -l)

===== RESOURCE USAGE =====
Disk Usage: $(df -h / | tail -1 | awk '{print $5}')
Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
CPU Load: $(uptime | awk -F'load average:' '{print $2}')
Database Connections: $(sudo -u postgres psql -d nody -t -c "SELECT count(*) FROM pg_stat_activity;")

===== ERRORS =====
Application Errors: $(pm2 logs csms-production --lines 5000 --nostream | grep -i error | wc -l)
Nginx Errors: $(sudo grep "$(date +%d/%b/%Y)" /var/log/nginx/csms-error.log | wc -l)

===== ISSUES =====
$(cat /var/log/csms/issues-$(date +%Y%m%d).log 2>/dev/null || echo "No issues reported")

===== MAINTENANCE PERFORMED =====
$(cat /var/log/csms/maintenance-$(date +%Y%m%d).log 2>/dev/null || echo "No maintenance performed")

===== END OF REPORT =====
EOF

# Email report to operations team
mail -s "CSMS Daily Report - $(date +%Y-%m-%d)" ops-team@csms.zanajira.go.tz < $REPORT_FILE

echo "Daily report generated: $REPORT_FILE"
```

**Schedule Daily Report**:

```bash
# Add to crontab
crontab -e

# Add line:
0 17 * * * /usr/local/bin/csms-daily-report.sh
```

### 2.2 User Support Tasks

#### 2.2.1 Common Support Requests

**Password Reset**:

1. Verify user identity
2. Generate temporary password
3. Reset password using API or database
4. Notify user via email
5. Document in support ticket

**Account Unlock**:

```bash
# Check if account is locked
sudo -u postgres psql -d nody -c "SELECT id, username, \"isActive\" FROM \"User\" WHERE username = 'USERNAME';"

# Unlock account
sudo -u postgres psql -d nody -c "UPDATE \"User\" SET \"isActive\" = true WHERE username = 'USERNAME';"
```

**File Recovery**:

```bash
# List all versions of a file in MinIO
mc ls --versions csms-local/csms-documents/path/to/file.pdf

# Restore specific version
mc cp --version-id VERSION_ID csms-local/csms-documents/path/to/file.pdf csms-local/csms-documents/path/to/file-restored.pdf
```

**Request Status Check**:

```bash
# Check request status
sudo -u postgres psql -d nody -c "
SELECT id, \"employeeId\", status, \"currentStage\", \"createdAt\"
FROM \"ConfirmationRequest\"
WHERE id = 'REQUEST_ID';
"
```

#### 2.2.2 Support Ticket Management

**Ticket Priority Guidelines**:

- **P1 (Critical)**: System down, data loss, security breach - Immediate response
- **P2 (High)**: Major functionality broken - 1 hour response
- **P3 (Medium)**: Minor issues - 4 hour response
- **P4 (Low)**: Cosmetic, enhancements - 24 hour response

**Ticket Tracking**:

```bash
# Create daily support summary
cat > /var/log/csms/support-summary-$(date +%Y%m%d).txt <<EOF
Support Summary - $(date +%Y-%m-%d)

Total Tickets: $(grep "TICKET" /var/log/csms/support.log | wc -l)
P1 Tickets: $(grep "TICKET.*P1" /var/log/csms/support.log | wc -l)
P2 Tickets: $(grep "TICKET.*P2" /var/log/csms/support.log | wc -l)
Resolved: $(grep "RESOLVED" /var/log/csms/support.log | wc -l)
Open: $(grep "OPEN" /var/log/csms/support.log | wc -l)

Common Issues:
$(grep "ISSUE:" /var/log/csms/support.log | sort | uniq -c | sort -rn | head -5)
EOF
```

### 2.3 Database Administration

#### 2.3.1 Database Health Checks

**Connection Monitoring**:

```bash
# View active connections
sudo -u postgres psql -d nody -c "
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = 'nody';
"

# View connections by user
sudo -u postgres psql -d nody -c "
SELECT usename, count(*)
FROM pg_stat_activity
WHERE datname = 'nody'
GROUP BY usename;
"

# Kill idle connections (if needed)
sudo -u postgres psql -d nody -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'nody'
  AND state = 'idle'
  AND state_change < current_timestamp - INTERVAL '1 hour';
"
```

**Database Size Monitoring**:

```bash
# Check database size
sudo -u postgres psql -d nody -c "
SELECT pg_size_pretty(pg_database_size('nody')) as database_size;
"

# Check table sizes
sudo -u postgres psql -d nody -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
"

# Check index usage
sudo -u postgres psql -d nody -c "
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC
LIMIT 10;
"
```

**Query Performance**:

```bash
# View slow queries (if pg_stat_statements enabled)
sudo -u postgres psql -d nody -c "
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# View currently running queries
sudo -u postgres psql -d nody -c "
SELECT
    pid,
    now() - query_start as duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND datname = 'nody'
ORDER BY duration DESC;
"
```

#### 2.3.2 Database Maintenance

**Vacuum Operations**:

```bash
# Analyze database (lightweight, can run anytime)
sudo -u postgres psql -d nody -c "ANALYZE;"

# Vacuum database (reclaim space)
sudo -u postgres psql -d nody -c "VACUUM VERBOSE ANALYZE;"

# Vacuum specific table
sudo -u postgres psql -d nody -c "VACUUM VERBOSE ANALYZE \"ConfirmationRequest\";"

# Full vacuum (requires downtime, use during maintenance window)
# First, stop application
pm2 stop csms-production

# Run full vacuum
sudo -u postgres psql -d nody -c "VACUUM FULL VERBOSE ANALYZE;"

# Restart application
pm2 start csms-production
```

**Reindex Operations**:

```bash
# Reindex database (during maintenance window)
pm2 stop csms-production
sudo -u postgres psql -d nody -c "REINDEX DATABASE nody;"
pm2 start csms-production

# Reindex specific table
sudo -u postgres psql -d nody -c "REINDEX TABLE \"User\";"
```

### 2.4 MinIO Object Storage Administration

#### 2.4.1 Storage Monitoring

**Bucket Statistics**:

```bash
# Check bucket size
mc du csms-local/csms-documents

# Count objects
mc ls csms-local/csms-documents --recursive | wc -l

# List recent uploads
mc ls csms-local/csms-documents --recursive | tail -20

# Check bucket versioning
mc version info csms-local/csms-documents

# Check bucket quota (if set)
mc admin bucket quota csms-local/csms-documents
```

**Storage Usage by Date**:

```bash
# Objects uploaded today
mc ls csms-local/csms-documents --recursive | grep "$(date +%Y-%m-%d)"

# Objects uploaded this month
mc ls csms-local/csms-documents --recursive | grep "$(date +%Y-%m)"

# Storage used this month
mc ls csms-local/csms-documents --recursive | grep "$(date +%Y-%m)" | awk '{sum+=$4} END {print sum/1024/1024 " MB"}'
```

#### 2.4.2 Object Lifecycle Management

**Clean Up Old Versions**:

```bash
# List objects with versions
mc ls --versions csms-local/csms-documents --recursive | head -20

# Remove old versions (older than 30 days) - use with caution
# This is typically handled by lifecycle policy
mc ilm export csms-local/csms-documents
```

**Verify Integrity**:

```bash
# Check bucket consistency
mc admin heal csms-local/csms-documents --recursive --dry-run

# Heal bucket (if issues found)
mc admin heal csms-local/csms-documents --recursive
```

---

## 3. Routine Maintenance

### 3.1 Daily Maintenance Tasks

**Daily Checklist** (Performed every business day):

- [ ] **08:00 - Morning Health Check**
  - [ ] Run health check script
  - [ ] Verify all services running
  - [ ] Check resource usage
  - [ ] Review overnight logs

- [ ] **09:00 - User Support**
  - [ ] Review and respond to support tickets
  - [ ] Process password reset requests
  - [ ] Address user issues

- [ ] **12:00 - Midday Check**
  - [ ] Monitor system performance
  - [ ] Check for any errors
  - [ ] Review database connections

- [ ] **15:00 - Log Review**
  - [ ] Review application logs
  - [ ] Review Nginx logs
  - [ ] Review database logs
  - [ ] Investigate any warnings

- [ ] **17:00 - End of Day**
  - [ ] Generate daily report
  - [ ] Document issues and resolutions
  - [ ] Plan next day activities
  - [ ] Handover to on-call engineer

### 3.2 Weekly Maintenance Tasks

**Weekly Checklist** (Performed every Monday):

- [ ] **System Updates Check**

  ```bash
  # Check for available updates
  sudo apt update
  sudo apt list --upgradable

  # Document updates for next maintenance window
  sudo apt list --upgradable > /var/log/csms/updates-$(date +%Y%m%d).txt
  ```

- [ ] **Backup Verification**

  ```bash
  # Verify last 7 days of backups exist
  ls -lh /var/backups/csms/ | tail -10

  # Check backup sizes (should be consistent)
  ls -lh /var/backups/csms/*.sql.gz | tail -7

  # Test restore (on staging/test database)
  # See Section 4.3 for restore procedures
  ```

- [ ] **Database Maintenance**

  ```bash
  # Vacuum and analyze
  sudo -u postgres psql -d nody -c "VACUUM VERBOSE ANALYZE;"

  # Check database bloat
  sudo -u postgres psql -d nody -c "
  SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  "
  ```

- [ ] **Log Rotation Verification**

  ```bash
  # Verify log rotation is working
  ls -lh /var/log/nginx/*.gz | tail -5
  ls -lh /var/log/csms/*.gz | tail -5

  # Check log sizes
  du -sh /var/log/nginx/
  du -sh /var/log/csms/
  ```

- [ ] **Performance Review**

  ```bash
  # Generate weekly performance report
  cat > /var/log/csms/weekly-performance-$(date +%Y%W).txt <<EOF
  Weekly Performance Report
  Week: $(date +%Y-W%W)

  Average Response Time: $(grep "time_total" /var/log/csms/performance.log | awk '{sum+=$2; count++} END {print sum/count "s"}')
  Peak Response Time: $(grep "time_total" /var/log/csms/performance.log | sort -rn | head -1)
  Average CPU Usage: $(grep "CPU" /var/log/csms/monitoring.log | awk '{sum+=$2; count++} END {print sum/count "%"}')
  Peak Memory Usage: $(grep "Memory" /var/log/csms/monitoring.log | sort -rn -k2 | head -1)
  EOF
  ```

- [ ] **Security Review**

  ```bash
  # Check for failed login attempts
  sudo grep "401" /var/log/nginx/csms-access.log | grep "auth/login" | wc -l

  # Check fail2ban status
  sudo fail2ban-client status csms-auth

  # Review user accounts
  sudo -u postgres psql -d nody -c "
  SELECT username, \"isActive\", \"lastLogin\", \"createdAt\"
  FROM \"User\"
  WHERE \"lastLogin\" < current_timestamp - INTERVAL '30 days'
     OR \"lastLogin\" IS NULL;
  "
  ```

- [ ] **Disk Space Management**

  ```bash
  # Clean up old logs (older than 30 days)
  find /var/log/csms/ -name "*.log" -mtime +30 -delete
  find /var/log/nginx/ -name "*.gz" -mtime +30 -delete

  # Clean up old backups (older than 30 days - adjust retention as needed)
  find /var/backups/csms/ -name "*.sql.gz" -mtime +30 -delete

  # Clean up tmp files
  find /tmp -name "csms-*" -mtime +7 -delete
  ```

### 3.3 Monthly Maintenance Tasks

**Monthly Checklist** (Performed first Monday of each month):

- [ ] **System Updates** (During maintenance window)

  ```bash
  # Announce maintenance window
  # Enable maintenance mode
  cp /var/www/csms/maintenance.html /var/www/html/index.html
  sudo systemctl reload nginx

  # Update system packages
  sudo apt update
  sudo apt upgrade -y

  # Update Node.js packages (if needed)
  cd /var/www/csms
  npm outdated
  # Update package.json if needed, test in staging first

  # Restart services
  sudo systemctl restart postgresql
  sudo systemctl restart minio
  sudo systemctl restart nginx
  pm2 restart csms-production

  # Verify all services
  /usr/local/bin/csms-health-check.sh

  # Disable maintenance mode
  sudo rm /var/www/html/index.html
  sudo systemctl reload nginx
  ```

- [ ] **Full Database Maintenance**

  ```bash
  # During maintenance window
  pm2 stop csms-production

  # Full vacuum
  sudo -u postgres psql -d nody -c "VACUUM FULL VERBOSE ANALYZE;"

  # Reindex
  sudo -u postgres psql -d nody -c "REINDEX DATABASE nody;"

  # Restart application
  pm2 start csms-production
  ```

- [ ] **SSL Certificate Check**

  ```bash
  # Check certificate expiration
  echo | openssl s_client -connect csms.zanajira.go.tz:443 2>/dev/null | openssl x509 -noout -dates

  # Renew if needed (or wait for auto-renewal)
  sudo certbot renew --dry-run
  ```

- [ ] **Backup Retention Review**

  ```bash
  # Review backup storage usage
  du -sh /var/backups/csms/

  # Count backups
  ls -1 /var/backups/csms/*.sql.gz | wc -l

  # Verify oldest and newest backup
  ls -ltr /var/backups/csms/*.sql.gz | head -1
  ls -ltr /var/backups/csms/*.sql.gz | tail -1
  ```

- [ ] **Capacity Planning Review**

  ```bash
  # Generate monthly capacity report
  cat > /var/log/csms/capacity-$(date +%Y%m).txt <<EOF
  Monthly Capacity Report
  Month: $(date +%Y-%m)

  Database Size: $(sudo -u postgres psql -d nody -t -c "SELECT pg_size_pretty(pg_database_size('nody'));")
  Database Growth: [Calculate from last month]

  Storage Size: $(mc du csms-local/csms-documents)
  Storage Growth: [Calculate from last month]

  Average Users/Day: [Calculate from logs]
  Average Requests/Day: [Calculate from database]

  Peak Concurrent Users: [From monitoring]
  Peak Database Connections: [From monitoring]

  Projected Growth (Next 6 months):
  - Database: [Calculate based on growth rate]
  - Storage: [Calculate based on growth rate]
  - Users: [Based on rollout plan]
  EOF
  ```

- [ ] **Security Audit**

  ```bash
  # Run security scan
  # Check for vulnerable packages
  npm audit

  # Review user permissions
  sudo -u postgres psql -d nody -c "
  SELECT role, COUNT(*)
  FROM \"User\"
  GROUP BY role;
  "

  # Review recent changes
  git log --since="1 month ago" --oneline
  ```

- [ ] **Performance Optimization**

  ```bash
  # Identify slow queries
  sudo -u postgres psql -d nody -c "
  SELECT
      query,
      calls,
      mean_time,
      max_time
  FROM pg_stat_statements
  WHERE mean_time > 1000
  ORDER BY mean_time DESC
  LIMIT 10;
  "

  # Check missing indexes
  sudo -u postgres psql -d nody -c "
  SELECT
      schemaname,
      tablename,
      seq_scan,
      idx_scan,
      seq_scan - idx_scan as diff
  FROM pg_stat_user_tables
  WHERE seq_scan > idx_scan
  ORDER BY diff DESC;
  "
  ```

### 3.4 Quarterly Maintenance Tasks

**Quarterly Checklist** (Performed every 3 months):

- [ ] **Disaster Recovery Test**
  - [ ] Schedule DR test
  - [ ] Restore backup to test environment
  - [ ] Verify application functionality
  - [ ] Document recovery time
  - [ ] Update DR procedures if needed

- [ ] **Performance Benchmark**
  - [ ] Run load tests
  - [ ] Compare with baseline
  - [ ] Document performance trends
  - [ ] Identify optimization opportunities

- [ ] **Security Penetration Test**
  - [ ] Schedule penetration test
  - [ ] Review and remediate findings
  - [ ] Update security policies

- [ ] **License and Subscription Review**
  - [ ] Review SSL certificates
  - [ ] Review cloud service subscriptions
  - [ ] Review monitoring tools
  - [ ] Renew as needed

- [ ] **Documentation Review**
  - [ ] Review and update Operations Manual
  - [ ] Review and update runbooks
  - [ ] Update contact lists
  - [ ] Archive obsolete documentation

---

## 4. Backup Procedures

### 4.1 Backup Strategy

**Backup Schedule**:
| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| Database (Incremental) | Daily 02:00 | 30 days | /var/backups/csms/ |
| Database (Full) | Weekly (Sunday 03:00) | 12 weeks | /var/backups/csms/ |
| MinIO Objects | Weekly (Saturday 03:00) | 4 weeks | /var/backups/csms/minio/ |
| Configuration Files | Weekly (Sunday 04:00) | 12 weeks | /var/backups/csms/config/ |
| Application Code | On deployment | 12 months | Git repository |

**Recovery Objectives**:

- **RPO (Recovery Point Objective)**: 24 hours (last daily backup)
- **RTO (Recovery Time Objective)**: 4 hours (time to restore and verify)

### 4.2 Backup Procedures

#### 4.2.1 Database Backup

**Daily Backup Script**:

```bash
#!/bin/bash
# Database backup script
# Location: /usr/local/bin/backup-csms-db.sh

set -e  # Exit on error

# Configuration
BACKUP_DIR="/var/backups/csms"
DB_NAME="nody"
DB_USER="csms_user"
DB_HOST="localhost"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/csms/backup.log"

# Create backup directory
mkdir -p $BACKUP_DIR

# Log start
echo "$(date): Starting database backup" >> $LOG_FILE

# Set PostgreSQL password
export PGPASSWORD='YourSecurePassword123!'

# Create backup with compression
pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Check if backup was created
if [ -f "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" ]; then
    BACKUP_SIZE=$(du -h $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz | cut -f1)
    echo "$(date): Database backup completed: ${DB_NAME}_${DATE}.sql.gz ($BACKUP_SIZE)" >> $LOG_FILE

    # Verify backup integrity
    gunzip -t $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz
    if [ $? -eq 0 ]; then
        echo "$(date): Backup integrity verified" >> $LOG_FILE
    else
        echo "$(date): ERROR - Backup integrity check failed" >> $LOG_FILE
        # Send alert
        echo "Database backup integrity check failed" | mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
        exit 1
    fi
else
    echo "$(date): ERROR - Database backup failed" >> $LOG_FILE
    # Send alert
    echo "Database backup failed to create file" | mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
    exit 1
fi

# Remove old backups
echo "$(date): Removing backups older than $RETENTION_DAYS days" >> $LOG_FILE
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log completion
echo "$(date): Backup process completed" >> $LOG_FILE

# Unset password
unset PGPASSWORD

exit 0
```

**Make executable and schedule**:

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-csms-db.sh

# Add to crontab
sudo crontab -e

# Add daily backup at 02:00
0 2 * * * /usr/local/bin/backup-csms-db.sh
```

#### 4.2.2 MinIO Backup

**Weekly MinIO Backup Script**:

```bash
#!/bin/bash
# MinIO backup script
# Location: /usr/local/bin/backup-csms-minio.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/csms/minio"
BUCKET_NAME="csms-documents"
DATE=$(date +%Y%m%d)
RETENTION_WEEKS=4
LOG_FILE="/var/log/csms/backup.log"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "$(date): Starting MinIO backup" >> $LOG_FILE

# Mirror bucket to local backup
mc mirror csms-local/$BUCKET_NAME $BACKUP_DIR/$BUCKET_NAME-$DATE

# Create tarball
cd $BACKUP_DIR
tar -czf $BUCKET_NAME-$DATE.tar.gz $BUCKET_NAME-$DATE

# Remove temporary directory
rm -rf $BUCKET_NAME-$DATE

# Verify tarball
if [ -f "$BACKUP_DIR/$BUCKET_NAME-$DATE.tar.gz" ]; then
    BACKUP_SIZE=$(du -h $BACKUP_DIR/$BUCKET_NAME-$DATE.tar.gz | cut -f1)
    echo "$(date): MinIO backup completed: $BUCKET_NAME-$DATE.tar.gz ($BACKUP_SIZE)" >> $LOG_FILE
else
    echo "$(date): ERROR - MinIO backup failed" >> $LOG_FILE
    exit 1
fi

# Remove old backups (older than retention period)
find $BACKUP_DIR -name "$BUCKET_NAME-*.tar.gz" -mtime +$((RETENTION_WEEKS * 7)) -delete

echo "$(date): MinIO backup process completed" >> $LOG_FILE

exit 0
```

**Schedule weekly backup**:

```bash
sudo chmod +x /usr/local/bin/backup-csms-minio.sh

# Add to crontab (Saturday 03:00)
sudo crontab -e
0 3 * * 6 /usr/local/bin/backup-csms-minio.sh
```

#### 4.2.3 Configuration Backup

**Configuration Backup Script**:

```bash
#!/bin/bash
# Configuration backup script
# Location: /usr/local/bin/backup-csms-config.sh

set -e

BACKUP_DIR="/var/backups/csms/config"
DATE=$(date +%Y%m%d)
LOG_FILE="/var/log/csms/backup.log"

mkdir -p $BACKUP_DIR

echo "$(date): Starting configuration backup" >> $LOG_FILE

# Create temporary directory
TEMP_DIR=$(mktemp -d)

# Copy configuration files
cp /var/www/csms/.env.local $TEMP_DIR/env.local
cp /etc/nginx/sites-available/csms $TEMP_DIR/nginx-csms.conf
cp /etc/default/minio $TEMP_DIR/minio.conf
cp /var/www/csms/ecosystem.config.js $TEMP_DIR/pm2-ecosystem.config.js
cp /etc/postgresql/14/main/postgresql.conf $TEMP_DIR/postgresql.conf
cp /etc/postgresql/14/main/pg_hba.conf $TEMP_DIR/pg_hba.conf

# Create tarball
tar -czf $BACKUP_DIR/config-$DATE.tar.gz -C $TEMP_DIR .

# Encrypt backup (optional but recommended)
gpg --symmetric --cipher-algo AES256 $BACKUP_DIR/config-$DATE.tar.gz
rm $BACKUP_DIR/config-$DATE.tar.gz

# Remove temporary directory
rm -rf $TEMP_DIR

echo "$(date): Configuration backup completed: config-$DATE.tar.gz.gpg" >> $LOG_FILE

# Remove old backups (older than 12 weeks)
find $BACKUP_DIR -name "config-*.tar.gz.gpg" -mtime +84 -delete

exit 0
```

**Schedule weekly backup**:

```bash
sudo chmod +x /usr/local/bin/backup-csms-config.sh

# Add to crontab (Sunday 04:00)
sudo crontab -e
0 4 * * 0 /usr/local/bin/backup-csms-config.sh
```

### 4.3 Restore Procedures

#### 4.3.1 Database Restore

**Full Database Restore**:

```bash
#!/bin/bash
# Database restore procedure
# WARNING: This will overwrite the current database

# 1. Stop application
pm2 stop csms-production

# 2. Identify backup to restore
ls -lh /var/backups/csms/nody_*.sql.gz

# 3. Set backup file
BACKUP_FILE="/var/backups/csms/nody_20250115_020000.sql.gz"

# 4. Create safety backup of current database
echo "Creating safety backup..."
export PGPASSWORD='YourSecurePassword123!'
pg_dump -U csms_user -h localhost nody | gzip > /var/backups/csms/pre-restore-$(date +%Y%m%d_%H%M%S).sql.gz

# 5. Drop and recreate database
echo "Dropping database..."
sudo -u postgres psql -c "DROP DATABASE nody;"
sudo -u postgres psql -c "CREATE DATABASE nody OWNER csms_user;"

# 6. Restore from backup
echo "Restoring from backup..."
gunzip -c $BACKUP_FILE | psql -U csms_user -h localhost nody

# 7. Verify restore
echo "Verifying restore..."
psql -U csms_user -h localhost nody -c "SELECT COUNT(*) FROM \"User\";"
psql -U csms_user -h localhost nody -c "SELECT COUNT(*) FROM \"Institution\";"
psql -U csms_user -h localhost nody -c "SELECT COUNT(*) FROM \"Employee\";"

# 8. Run Prisma migrations (if needed)
cd /var/www/csms
npx prisma migrate deploy

# 9. Restart application
pm2 start csms-production

# 10. Verify application
sleep 10
curl http://localhost:9002/api/health
curl http://localhost:9002/api/health/db

echo "Database restore completed"
unset PGPASSWORD
```

**Partial Data Restore** (Single table):

```bash
# Extract specific table from backup
gunzip -c /var/backups/csms/nody_20250115_020000.sql.gz | grep -A 10000 "CREATE TABLE.*User" > user_table.sql

# Review and edit SQL if needed
nano user_table.sql

# Restore specific table (be cautious - may conflict with existing data)
psql -U csms_user -h localhost nody < user_table.sql
```

#### 4.3.2 MinIO Restore

**Full Bucket Restore**:

```bash
#!/bin/bash
# MinIO restore procedure

# 1. Identify backup to restore
ls -lh /var/backups/csms/minio/csms-documents-*.tar.gz

# 2. Extract backup
BACKUP_FILE="/var/backups/csms/minio/csms-documents-20250115.tar.gz"
TEMP_DIR=$(mktemp -d)
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# 3. Create safety backup of current bucket (optional)
mc mirror csms-local/csms-documents /var/backups/csms/minio/pre-restore-$(date +%Y%m%d)

# 4. Restore to MinIO
mc mirror $TEMP_DIR/csms-documents-20250115 csms-local/csms-documents --overwrite

# 5. Verify restore
mc ls csms-local/csms-documents
mc du csms-local/csms-documents

# 6. Clean up
rm -rf $TEMP_DIR

echo "MinIO restore completed"
```

**Single File Restore**:

```bash
# Extract backup
tar -xzf /var/backups/csms/minio/csms-documents-20250115.tar.gz

# Find file
find csms-documents-20250115 -name "filename.pdf"

# Copy to MinIO
mc cp csms-documents-20250115/path/to/filename.pdf csms-local/csms-documents/path/to/filename.pdf
```

#### 4.3.3 Configuration Restore

**Restore Configuration Files**:

```bash
# 1. Extract backup
BACKUP_FILE="/var/backups/csms/config/config-20250115.tar.gz.gpg"

# 2. Decrypt backup
gpg --decrypt $BACKUP_FILE > config-20250115.tar.gz

# 3. Extract files
mkdir -p /tmp/csms-config-restore
tar -xzf config-20250115.tar.gz -C /tmp/csms-config-restore

# 4. Review files
ls -la /tmp/csms-config-restore

# 5. Restore specific files (review each before copying)
sudo cp /tmp/csms-config-restore/env.local /var/www/csms/.env.local
sudo cp /tmp/csms-config-restore/nginx-csms.conf /etc/nginx/sites-available/csms
sudo cp /tmp/csms-config-restore/minio.conf /etc/default/minio
# ... etc

# 6. Restart services
sudo systemctl reload nginx
sudo systemctl restart minio
pm2 restart csms-production

# 7. Verify
/usr/local/bin/csms-health-check.sh

# 8. Clean up
rm -rf /tmp/csms-config-restore
rm config-20250115.tar.gz
```

### 4.4 Backup Verification

**Weekly Backup Verification Checklist**:

```bash
#!/bin/bash
# Backup verification script
# Location: /usr/local/bin/verify-csms-backups.sh

BACKUP_DIR="/var/backups/csms"
LOG_FILE="/var/log/csms/backup-verification.log"

echo "===== Backup Verification - $(date) =====" >> $LOG_FILE

# 1. Check if daily backups exist (last 7 days)
echo "Checking daily database backups..." >> $LOG_FILE
for i in {0..6}; do
    DATE=$(date -d "$i days ago" +%Y%m%d)
    BACKUP_COUNT=$(find $BACKUP_DIR -name "nody_${DATE}_*.sql.gz" | wc -l)
    if [ $BACKUP_COUNT -eq 0 ]; then
        echo "WARNING: No backup found for $DATE" >> $LOG_FILE
        echo "Missing backup for $DATE" | mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
    else
        echo "✓ Backup exists for $DATE" >> $LOG_FILE
    fi
done

# 2. Check backup sizes (should not be too small)
echo "Checking backup sizes..." >> $LOG_FILE
RECENT_BACKUP=$(ls -t $BACKUP_DIR/nody_*.sql.gz | head -1)
BACKUP_SIZE=$(stat -c%s "$RECENT_BACKUP")
MIN_SIZE=$((10 * 1024 * 1024))  # 10 MB minimum

if [ $BACKUP_SIZE -lt $MIN_SIZE ]; then
    echo "WARNING: Backup size ($BACKUP_SIZE bytes) is suspiciously small" >> $LOG_FILE
    echo "Backup size alert: $RECENT_BACKUP is only $BACKUP_SIZE bytes" | mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
else
    echo "✓ Backup size is acceptable: $(du -h $RECENT_BACKUP | cut -f1)" >> $LOG_FILE
fi

# 3. Verify backup integrity
echo "Verifying backup integrity..." >> $LOG_FILE
gunzip -t $RECENT_BACKUP
if [ $? -eq 0 ]; then
    echo "✓ Backup integrity verified" >> $LOG_FILE
else
    echo "ERROR: Backup integrity check failed" >> $LOG_FILE
    echo "Backup integrity check failed for $RECENT_BACKUP" | mail -s "CSMS Backup Alert" ops-team@csms.zanajira.go.tz
fi

# 4. Test restore (monthly - on first Monday)
if [ $(date +%d) -le 7 ] && [ $(date +%u) -eq 1 ]; then
    echo "Running monthly restore test..." >> $LOG_FILE
    # This should restore to a test database, not production!
    # Implementation depends on your test environment
    echo "Monthly restore test should be performed manually" >> $LOG_FILE
fi

echo "===== Backup Verification Complete =====" >> $LOG_FILE

exit 0
```

**Schedule verification**:

```bash
sudo chmod +x /usr/local/bin/verify-csms-backups.sh

# Run every Monday at 09:00
crontab -e
0 9 * * 1 /usr/local/bin/verify-csms-backups.sh
```

---

## 5. Monitoring Procedures

### 5.1 Monitoring Architecture

**Monitoring Stack**:

```
┌─────────────────────────────────────────────────────────┐
│                      Grafana                             │
│              (Visualization Dashboard)                   │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
┌─────────────────────────────────────────────────────────┐
│                    Prometheus                            │
│              (Metrics Collection & Storage)              │
└─────────────────────────────────────────────────────────┘
                           ▲
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Node Exporter   │ │PM2 Metrics   │ │Postgres      │
│(System Metrics) │ │(App Metrics) │ │Exporter      │
└─────────────────┘ └──────────────┘ └──────────────┘
```

### 5.2 Key Metrics to Monitor

#### 5.2.1 System Metrics

**CPU Monitoring**:

```bash
# Current CPU usage
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

# Per-core CPU usage
mpstat -P ALL 1 1

# Process CPU usage
ps aux --sort=-%cpu | head -10

# Alert if CPU > 80% for 5 minutes
```

**Memory Monitoring**:

```bash
# Memory usage
free -h

# Memory usage percentage
free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}'

# Process memory usage
ps aux --sort=-%mem | head -10

# Alert if Memory > 80%
```

**Disk Monitoring**:

```bash
# Disk usage
df -h

# Disk I/O
iostat -x 1 5

# Inodes usage
df -i

# Alert if Disk > 80%
# Alert if Inodes > 80%
```

#### 5.2.2 Application Metrics

**PM2 Monitoring**:

```bash
# Application status
pm2 status

# Application metrics
pm2 show csms-production

# Memory usage per instance
pm2 list --sort-by-memory

# CPU usage per instance
pm2 list --sort-by-cpu

# Restart count (high restarts indicate issues)
pm2 jlist | jq '.[] | {name: .name, restarts: .pm2_env.restart_time}'

# Alert if restarts > 10 in 1 hour
# Alert if any instance down
```

**Response Time Monitoring**:

```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:9002/api/health

# curl-format.txt content:
cat > curl-format.txt <<EOF
time_namelookup:  %{time_namelookup}s\n
time_connect:  %{time_connect}s\n
time_starttransfer:  %{time_starttransfer}s\n
time_total:  %{time_total}s\n
EOF

# Continuous monitoring
watch -n 60 'curl -w "%{time_total}\n" -o /dev/null -s http://localhost:9002/api/health'

# Alert if response time > 5 seconds
```

**Request Rate Monitoring**:

```bash
# Count requests in last minute
sudo tail -1000 /var/log/nginx/csms-access.log | grep "$(date +%d/%b/%Y:%H:%M)" | wc -l

# Requests per endpoint
sudo tail -10000 /var/log/nginx/csms-access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -10

# Error rate
sudo tail -10000 /var/log/nginx/csms-access.log | grep -cE "HTTP/[0-9.]+ (4|5)"
TOTAL=$(sudo tail -10000 /var/log/nginx/csms-access.log | wc -l)
ERROR_RATE=$(echo "scale=2; $ERRORS / $TOTAL * 100" | bc)

# Alert if error rate > 1%
```

#### 5.2.3 Database Metrics

**Connection Monitoring**:

```bash
# Active connections
sudo -u postgres psql -d nody -t -c "
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
"

# Connection by state
sudo -u postgres psql -d nody -c "
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = 'nody'
GROUP BY state;
"

# Alert if connections > 150
# Alert if idle in transaction > 10
```

**Query Performance**:

```bash
# Slow queries (currently running)
sudo -u postgres psql -d nody -c "
SELECT
    pid,
    now() - query_start as duration,
    query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;
"

# Alert if query duration > 30 seconds
```

**Database Size**:

```bash
# Database size
sudo -u postgres psql -d nody -t -c "
SELECT pg_size_pretty(pg_database_size('nody'));
"

# Table sizes
sudo -u postgres psql -d nody -c "
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 5;
"

# Monitor growth rate weekly
```

#### 5.2.4 Storage Metrics

**MinIO Monitoring**:

```bash
# Bucket size
mc du csms-local/csms-documents

# Object count
mc ls csms-local/csms-documents --recursive | wc -l

# Storage health
mc admin info csms-local

# Alert if bucket size > 80% of quota
```

**File System Monitoring**:

```bash
# Disk space
df -h /
df -h /var
df -h /mnt/minio-data

# Inode usage
df -i

# Alert if disk > 80%
# Alert if inodes > 80%
```

### 5.3 Monitoring Dashboard

**Create Monitoring Dashboard Script**:

```bash
#!/bin/bash
# Live monitoring dashboard
# Location: /usr/local/bin/csms-monitor.sh

while true; do
    clear
    echo "===== CSMS Live Monitoring Dashboard ====="
    echo "Time: $(date)"
    echo ""

    echo "=== SERVICES ==="
    echo -n "PostgreSQL: "
    sudo systemctl is-active postgresql
    echo -n "MinIO: "
    sudo systemctl is-active minio
    echo -n "Nginx: "
    sudo systemctl is-active nginx
    echo -n "Application: "
    pm2 jlist | jq -r '.[0].pm2_env.status'
    echo ""

    echo "=== SYSTEM RESOURCES ==="
    echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Memory: $(free | grep Mem | awk '{printf("%.1f%% used", $3/$2 * 100.0)}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $5 " used"}')"
    echo ""

    echo "=== APPLICATION ==="
    pm2 jlist | jq -r '.[] | "Instances: \(.pm2_env.instances // 1) | Memory: \(.monit.memory / 1024 / 1024 | floor)MB | CPU: \(.monit.cpu)% | Restarts: \(.pm2_env.restart_time)"'
    echo ""

    echo "=== DATABASE ==="
    ACTIVE_CONN=$(sudo -u postgres psql -d nody -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    TOTAL_CONN=$(sudo -u postgres psql -d nody -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'nody';")
    echo "Connections: $TOTAL_CONN total, $ACTIVE_CONN active"
    DB_SIZE=$(sudo -u postgres psql -d nody -t -c "SELECT pg_size_pretty(pg_database_size('nody'));")
    echo "Database Size: $DB_SIZE"
    echo ""

    echo "=== RECENT ACTIVITY (last 60 seconds) ==="
    REQUESTS=$(sudo tail -1000 /var/log/nginx/csms-access.log | grep "$(date +%d/%b/%Y:%H:%M)" | wc -l)
    echo "HTTP Requests: $REQUESTS"
    ERRORS=$(pm2 logs csms-production --lines 100 --nostream | grep -i error | wc -l)
    echo "Application Errors: $ERRORS"
    echo ""

    echo "Press Ctrl+C to exit | Refreshing every 5 seconds..."
    sleep 5
done
```

**Usage**:

```bash
sudo chmod +x /usr/local/bin/csms-monitor.sh
/usr/local/bin/csms-monitor.sh
```

### 5.4 Automated Monitoring Script

**Continuous Monitoring with Alerts**:

```bash
#!/bin/bash
# Automated monitoring with threshold alerts
# Location: /usr/local/bin/csms-automated-monitor.sh
# Run via cron every 5 minutes

LOG_FILE="/var/log/csms/monitoring.log"
ALERT_EMAIL="ops-team@csms.zanajira.go.tz"

# Thresholds
CPU_THRESHOLD=80
MEM_THRESHOLD=80
DISK_THRESHOLD=80
RESPONSE_TIME_THRESHOLD=5
DB_CONN_THRESHOLD=150

# Function to send alert
send_alert() {
    SUBJECT=$1
    MESSAGE=$2
    echo "$MESSAGE" | mail -s "$SUBJECT" $ALERT_EMAIL
    echo "$(date): ALERT - $SUBJECT: $MESSAGE" >> $LOG_FILE
}

# Check CPU
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
if [ $CPU_USAGE -gt $CPU_THRESHOLD ]; then
    send_alert "High CPU Usage" "CPU usage is ${CPU_USAGE}%, threshold is ${CPU_THRESHOLD}%"
fi

# Check Memory
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEM_USAGE -gt $MEM_THRESHOLD ]; then
    send_alert "High Memory Usage" "Memory usage is ${MEM_USAGE}%, threshold is ${MEM_THRESHOLD}%"
fi

# Check Disk
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | cut -d'%' -f1)
if [ $DISK_USAGE -gt $DISK_THRESHOLD ]; then
    send_alert "High Disk Usage" "Disk usage is ${DISK_USAGE}%, threshold is ${DISK_THRESHOLD}%"
fi

# Check Application
APP_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')
if [ "$APP_STATUS" != "online" ]; then
    send_alert "Application Down" "Application status is $APP_STATUS"
fi

# Check Response Time
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:9002/api/health)
if (( $(echo "$RESPONSE_TIME > $RESPONSE_TIME_THRESHOLD" | bc -l) )); then
    send_alert "Slow Response Time" "Response time is ${RESPONSE_TIME}s, threshold is ${RESPONSE_TIME_THRESHOLD}s"
fi

# Check Database Connections
export PGPASSWORD='YourSecurePassword123!'
DB_CONN=$(psql -U csms_user -d nody -h localhost -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'nody';")
if [ $DB_CONN -gt $DB_CONN_THRESHOLD ]; then
    send_alert "High Database Connections" "Database connections: $DB_CONN, threshold is $DB_CONN_THRESHOLD"
fi
unset PGPASSWORD

# Check Services
for SERVICE in postgresql minio nginx; do
    if ! sudo systemctl is-active --quiet $SERVICE; then
        send_alert "Service Down" "$SERVICE is not running"
    fi
done

# Log normal status
echo "$(date): All checks passed - CPU:${CPU_USAGE}% MEM:${MEM_USAGE}% DISK:${DISK_USAGE}% RESP:${RESPONSE_TIME}s DB_CONN:$DB_CONN APP:$APP_STATUS" >> $LOG_FILE

exit 0
```

**Schedule monitoring**:

```bash
sudo chmod +x /usr/local/bin/csms-automated-monitor.sh

# Run every 5 minutes
crontab -e
*/5 * * * * /usr/local/bin/csms-automated-monitor.sh
```

---

## 6. Alert Handling

### 6.1 Alert Categories and Response

| Alert Type                  | Severity | Response Time     | Response Procedure |
| --------------------------- | -------- | ----------------- | ------------------ |
| **System Down**             | Critical | Immediate         | See Section 6.2.1  |
| **High Resource Usage**     | High     | 15 minutes        | See Section 6.2.2  |
| **Database Issues**         | High     | 15 minutes        | See Section 6.2.3  |
| **Performance Degradation** | Medium   | 1 hour            | See Section 6.2.4  |
| **Backup Failure**          | Medium   | Next business day | See Section 6.2.5  |
| **Security Alert**          | Critical | Immediate         | See Section 6.2.6  |

### 6.2 Alert Response Procedures

#### 6.2.1 System Down Alert

**Symptoms**:

- Application not responding
- Health check failing
- Users cannot access system

**Response Procedure**:

```bash
# 1. Verify the issue
curl https://csms.zanajira.go.tz
pm2 status

# 2. Check all services
sudo systemctl status postgresql
sudo systemctl status minio
sudo systemctl status nginx
pm2 status csms-production

# 3. Check logs for root cause
pm2 logs csms-production --lines 100 | grep -i error
sudo tail -50 /var/log/nginx/csms-error.log
sudo tail -50 /var/log/postgresql/postgresql-14-main.log

# 4. Attempt restart (based on which service is down)

# If application is down:
pm2 restart csms-production

# If nginx is down:
sudo systemctl restart nginx

# If PostgreSQL is down:
sudo systemctl restart postgresql

# If MinIO is down:
sudo systemctl restart minio

# 5. Verify recovery
curl https://csms.zanajira.go.tz/api/health

# 6. Monitor for 15 minutes
watch -n 60 'curl -s https://csms.zanajira.go.tz/api/health'

# 7. Document incident
cat >> /var/log/csms/incidents.log <<EOF
$(date): System Down Incident
Root Cause: [Fill in]
Actions Taken: [Fill in]
Recovery Time: [Fill in]
EOF

# 8. Notify stakeholders
echo "System recovered at $(date)" | mail -s "CSMS System Restored" ops-team@csms.zanajira.go.tz
```

**Escalation**: If not resolved in 30 minutes, escalate to Technical Lead

#### 6.2.2 High Resource Usage Alert

**CPU > 80%**:

```bash
# 1. Identify process consuming CPU
top -bn1 | head -20

# 2. If Node.js/PM2 consuming CPU:
pm2 monit
pm2 list

# 3. Check for runaway processes
ps aux --sort=-%cpu | head -10

# 4. If application is the cause:
# Option A: Scale down instances temporarily
pm2 scale csms-production 2

# Option B: Restart application
pm2 restart csms-production

# 5. Check for slow queries
sudo -u postgres psql -d nody -c "
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '10 seconds'
ORDER BY duration DESC;
"

# 6. Kill slow queries if needed (use with caution)
sudo -u postgres psql -d nody -c "SELECT pg_terminate_backend(PID);"

# 7. Monitor recovery
htop
```

**Memory > 80%**:

```bash
# 1. Identify memory-consuming processes
ps aux --sort=-%mem | head -10

# 2. Check PM2 instances memory usage
pm2 list --sort-by-memory

# 3. Restart high-memory instances
pm2 restart csms-production

# 4. Clear system cache (if safe)
sudo sync && sudo sysctl -w vm.drop_caches=3

# 5. Check for memory leaks
pm2 monit
# Watch for continuously increasing memory

# 6. If persistent leak, scale down and investigate
pm2 scale csms-production 2
# Report to development team for code review
```

**Disk > 80%**:

```bash
# 1. Identify large files/directories
sudo du -sh /* | sort -rh | head -10
sudo du -sh /var/* | sort -rh | head -10

# 2. Clean up logs
sudo find /var/log -name "*.log" -mtime +7 -exec truncate -s 0 {} \;
sudo find /var/log -name "*.gz" -mtime +30 -delete

# 3. Clean up old backups (adjust retention as needed)
find /var/backups/csms -name "*.sql.gz" -mtime +30 -delete

# 4. Clean up tmp files
sudo find /tmp -atime +7 -delete

# 5. Clean up Next.js cache
cd /var/www/csms
rm -rf .next/cache/*

# 6. Vacuum database to reclaim space
sudo -u postgres psql -d nody -c "VACUUM FULL;"

# 7. If still critical, expand disk or archive data
# Contact infrastructure team
```

#### 6.2.3 Database Issues Alert

**High Connection Count**:

```bash
# 1. Check connections
sudo -u postgres psql -d nody -c "
SELECT count(*), state
FROM pg_stat_activity
WHERE datname = 'nody'
GROUP BY state;
"

# 2. Identify idle connections
sudo -u postgres psql -d nody -c "
SELECT pid, usename, state, state_change
FROM pg_stat_activity
WHERE datname = 'nody'
  AND state = 'idle'
  AND state_change < current_timestamp - INTERVAL '1 hour';
"

# 3. Kill idle connections
sudo -u postgres psql -d nody -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'nody'
  AND state = 'idle'
  AND state_change < current_timestamp - INTERVAL '1 hour';
"

# 4. Restart application to reset connection pool
pm2 restart csms-production

# 5. Monitor connections
watch -n 10 "sudo -u postgres psql -d nody -t -c 'SELECT count(*) FROM pg_stat_activity WHERE datname = '\''nody'\'';'"
```

**Database Lock**:

```bash
# 1. Identify locked queries
sudo -u postgres psql -d nody -c "
SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"

# 2. Kill blocking query (use with caution)
sudo -u postgres psql -d nody -c "SELECT pg_terminate_backend(BLOCKING_PID);"
```

#### 6.2.4 Performance Degradation Alert

**Slow Response Times**:

```bash
# 1. Test response time
curl -w "@curl-format.txt" -o /dev/null -s https://csms.zanajira.go.tz/api/health

# 2. Check application logs for errors
pm2 logs csms-production --lines 200 | grep -i error

# 3. Check database query performance
sudo -u postgres psql -d nody -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# 4. Check system resources
htop

# 5. Restart application
pm2 restart csms-production

# 6. Clear caches
cd /var/www/csms
rm -rf .next/cache/*

# 7. If persistent, schedule performance review
# Document slow queries and report to development team
```

#### 6.2.5 Backup Failure Alert

**Daily Backup Failed**:

```bash
# 1. Check backup log
tail -50 /var/log/csms/backup.log

# 2. Check disk space
df -h /var/backups/csms

# 3. Manually run backup
/usr/local/bin/backup-csms-db.sh

# 4. Verify backup
ls -lh /var/backups/csms/nody_*.sql.gz | tail -1
gunzip -t /var/backups/csms/nody_$(date +%Y%m%d)_*.sql.gz

# 5. If manual backup successful, investigate cron
crontab -l | grep backup

# 6. Document issue and resolution
echo "$(date): Backup failure resolved - manual backup successful" >> /var/log/csms/incidents.log
```

#### 6.2.6 Security Alert

**Suspicious Login Attempts**:

```bash
# 1. Check failed login attempts
sudo grep "401" /var/log/nginx/csms-access.log | grep "auth/login" | tail -20

# 2. Identify source IPs
sudo grep "401" /var/log/nginx/csms-access.log | grep "auth/login" | awk '{print $1}' | sort | uniq -c | sort -rn

# 3. Block suspicious IPs
sudo ufw deny from SUSPICIOUS_IP

# 4. Check fail2ban
sudo fail2ban-client status csms-auth

# 5. Review recent user activity
sudo -u postgres psql -d nody -c "
SELECT username, \"lastLogin\", \"isActive\"
FROM \"User\"
WHERE \"lastLogin\" > current_timestamp - INTERVAL '1 hour'
ORDER BY \"lastLogin\" DESC;
"

# 6. Document security incident
cat >> /var/log/csms/security-incidents.log <<EOF
$(date): Suspicious Login Attempts
Source IPs: [List IPs]
Actions Taken: [Blocked IPs, etc.]
EOF

# 7. Notify security team
echo "Security alert: Multiple failed login attempts from [IPs]" | mail -s "CSMS Security Alert" security@csms.zanajira.go.tz
```

### 6.3 On-Call Procedures

**On-Call Responsibilities**:

- Monitor alerts during on-call period
- Respond to critical (P1) alerts within 15 minutes
- Escalate issues as needed
- Document all incidents
- Handover to next shift

**On-Call Handover Checklist**:

```
CSMS On-Call Handover

From: ______________ Date: ____________ Time: __________
To: ________________ Date: ____________ Time: __________

SYSTEM STATUS:
[ ] All services operational
[ ] Known issues: ____________________________________
[ ] Ongoing incidents: _______________________________

RECENT ACTIVITY (last 24 hours):
[ ] Alerts received: ____
[ ] Incidents resolved: ____
[ ] Pending tasks: ____________________________________

UPCOMING:
[ ] Scheduled maintenance: ___________________________
[ ] Expected issues: __________________________________

NOTES:
___________________________________________________
___________________________________________________

Signature: __________________
```

---

## 7. Performance Management

### 7.1 Performance Baselines

**Establish Performance Baselines** (measured weekly):
| Metric | Baseline Target | Current | Trend |
|--------|----------------|---------|-------|
| Average Response Time | < 2 seconds | **\_** | ☐ ↑ ☐ → ☐ ↓ |
| Peak Response Time | < 5 seconds | **\_** | ☐ ↑ ☐ → ☐ ↓ |
| Concurrent Users | 200+ | **\_** | ☐ ↑ ☐ → ☐ ↓ |
| Requests/Second | 100+ | **\_** | ☐ ↑ ☐ → ☐ ↓ |
| Database Query Time | < 100ms avg | **\_** | ☐ ↑ ☐ → ☐ ↓ |
| Error Rate | < 0.1% | **\_** | ☐ ↑ ☐ → ☐ ↓ |
| System Uptime | > 99.9% | **\_** | ☐ ↑ ☐ → ☐ ↓ |

### 7.2 Performance Optimization

#### 7.2.1 Application Performance

**Identify Performance Bottlenecks**:

```bash
# 1. Check response times
ab -n 100 -c 10 https://csms.zanajira.go.tz/api/health

# 2. Profile application (if profiling enabled)
pm2 profile csms-production

# 3. Check for memory leaks
pm2 monit
# Watch for continuously increasing memory over time

# 4. Review slow API endpoints
# Parse Nginx logs to find slow endpoints
sudo awk '$NF > 2 {print $7, $NF}' /var/log/nginx/csms-access.log | sort | uniq -c | sort -rn | head -10
```

**Optimize Next.js Application**:

```bash
# 1. Analyze bundle size
cd /var/www/csms
npm run build
# Review build output for large bundles

# 2. Clear build cache
rm -rf .next/cache

# 3. Rebuild
npm run build

# 4. Restart with optimizations
pm2 restart csms-production --update-env
```

**Adjust PM2 Instances**:

```bash
# Scale based on CPU cores and load
# For 4-core system: 4 instances is optimal
pm2 scale csms-production 4

# Monitor performance after scaling
pm2 monit
```

#### 7.2.2 Database Performance

**Optimize Slow Queries**:

```bash
# 1. Identify slow queries
sudo -u postgres psql -d nody -c "
SELECT
    substring(query, 1, 50) AS short_query,
    calls,
    mean_time,
    total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
"

# 2. Analyze query execution plan
sudo -u postgres psql -d nody -c "
EXPLAIN ANALYZE [YOUR_SLOW_QUERY];
"

# 3. Create indexes for frequently queried columns
sudo -u postgres psql -d nody -c "
CREATE INDEX CONCURRENTLY idx_user_email ON \"User\"(email);
CREATE INDEX CONCURRENTLY idx_confirmationrequest_status ON \"ConfirmationRequest\"(status);
"

# 4. Analyze tables after creating indexes
sudo -u postgres psql -d nody -c "ANALYZE;"
```

**Database Connection Pooling**:

```bash
# Check current connection settings in Prisma
cd /var/www/csms
cat prisma/schema.prisma | grep -A 5 "datasource db"

# Optimize connection pool in DATABASE_URL
# Edit .env.local
nano .env.local

# Update DATABASE_URL with connection pool settings:
# DATABASE_URL="postgresql://user:pass@localhost:5432/nody?schema=public&connection_limit=20&pool_timeout=20"

# Restart application
pm2 restart csms-production
```

#### 7.2.3 Cache Management

**Nginx Caching**:

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/csms

# Add caching for static files
location /_next/static {
    proxy_pass http://localhost:9002;
    proxy_cache_valid 200 60m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
    add_header X-Cache-Status $upstream_cache_status;
}

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 7.3 Capacity Planning

**Monthly Capacity Review**:

```bash
# Generate capacity report
cat > /var/log/csms/capacity-$(date +%Y%m).txt <<EOF
Capacity Planning Report
Month: $(date +%Y-%m)

CURRENT USAGE:
Database Size: $(sudo -u postgres psql -d nody -t -c "SELECT pg_size_pretty(pg_database_size('nody'));")
Storage Size: $(mc du csms-local/csms-documents)
Active Users: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"User\" WHERE \"isActive\" = true;")
Total Requests: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"ConfirmationRequest\";")

GROWTH RATE (vs last month):
Database Growth: [Calculate manually]
Storage Growth: [Calculate manually]
User Growth: [Calculate manually]

RESOURCE UTILIZATION:
Avg CPU Usage: [From monitoring logs]
Avg Memory Usage: [From monitoring logs]
Peak Concurrent Users: [From logs]
Peak Database Connections: [From logs]

PROJECTIONS (6 months):
Expected Database Size: [Calculate based on growth]
Expected Storage Size: [Calculate based on growth]
Expected Active Users: [Based on rollout plan]

RECOMMENDATIONS:
- Disk expansion needed: YES / NO
- Memory upgrade needed: YES / NO
- Additional instances needed: YES / NO
- Database optimization needed: YES / NO
EOF

# Review capacity report monthly
cat /var/log/csms/capacity-$(date +%Y%m).txt
```

---

## 8. Security Operations

### 8.1 Security Monitoring

**Daily Security Checks**:

```bash
#!/bin/bash
# Daily security check script
# Location: /usr/local/bin/csms-security-check.sh

LOG_FILE="/var/log/csms/security-check.log"
echo "===== Security Check - $(date) =====" >> $LOG_FILE

# 1. Check for failed login attempts
FAILED_LOGINS=$(sudo grep "401" /var/log/nginx/csms-access.log | grep "auth/login" | grep "$(date +%d/%b/%Y)" | wc -l)
echo "Failed login attempts today: $FAILED_LOGINS" >> $LOG_FILE
if [ $FAILED_LOGINS -gt 50 ]; then
    echo "WARNING: High number of failed logins" >> $LOG_FILE
    echo "High number of failed login attempts: $FAILED_LOGINS" | mail -s "CSMS Security Alert" security@csms.zanajira.go.tz
fi

# 2. Check fail2ban status
BANNED_IPS=$(sudo fail2ban-client status csms-auth | grep "Currently banned" | awk '{print $4}')
echo "Currently banned IPs: $BANNED_IPS" >> $LOG_FILE

# 3. Check for unusual database activity
AFTER_HOURS=$(sudo -u postgres psql -d nody -t -c "
SELECT COUNT(*)
FROM pg_stat_activity
WHERE datname = 'nody'
  AND EXTRACT(HOUR FROM query_start) NOT BETWEEN 6 AND 20;
")
echo "After-hours database connections: $AFTER_HOURS" >> $LOG_FILE

# 4. Check for privilege escalation attempts
ADMIN_LOGINS=$(sudo grep "role.*admin" /var/log/csms/*.log | wc -l)
echo "Admin role logins today: $ADMIN_LOGINS" >> $LOG_FILE

# 5. Check SSL certificate expiration
CERT_EXPIRY=$(echo | openssl s_client -connect csms.zanajira.go.tz:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
echo "SSL certificate expires: $CERT_EXPIRY" >> $LOG_FILE

# 6. Check for security updates
SECURITY_UPDATES=$(sudo apt list --upgradable 2>/dev/null | grep -i security | wc -l)
echo "Pending security updates: $SECURITY_UPDATES" >> $LOG_FILE
if [ $SECURITY_UPDATES -gt 0 ]; then
    echo "WARNING: Security updates available" >> $LOG_FILE
    sudo apt list --upgradable 2>/dev/null | grep -i security >> $LOG_FILE
fi

echo "===== Security Check Complete =====" >> $LOG_FILE
```

**Schedule daily security check**:

```bash
sudo chmod +x /usr/local/bin/csms-security-check.sh

# Run daily at 08:00
crontab -e
0 8 * * * /usr/local/bin/csms-security-check.sh
```

### 8.2 Access Control Management

**Review User Accounts**:

```bash
# List all active users
sudo -u postgres psql -d nody -c "
SELECT id, username, email, role, \"isActive\", \"lastLogin\"
FROM \"User\"
WHERE \"isActive\" = true
ORDER BY \"lastLogin\" DESC NULLS LAST;
"

# List inactive users
sudo -u postgres psql -d nody -c "
SELECT id, username, email, role, \"lastLogin\"
FROM \"User\"
WHERE \"isActive\" = false
ORDER BY username;
"

# List users who haven't logged in for 30+ days
sudo -u postgres psql -d nody -c "
SELECT id, username, email, role, \"lastLogin\"
FROM \"User\"
WHERE \"lastLogin\" < current_timestamp - INTERVAL '30 days'
   OR \"lastLogin\" IS NULL
ORDER BY \"lastLogin\" NULLS FIRST;
"
```

**Review User Roles**:

```bash
# Count users by role
sudo -u postgres psql -d nody -c "
SELECT role, COUNT(*), COUNT(*) FILTER (WHERE \"isActive\" = true) as active
FROM \"User\"
GROUP BY role
ORDER BY COUNT(*) DESC;
"

# List admin users
sudo -u postgres psql -d nody -c "
SELECT username, email, \"isActive\", \"lastLogin\"
FROM \"User\"
WHERE role IN ('System Admin', 'Director General')
ORDER BY \"lastLogin\" DESC NULLS LAST;
"
```

### 8.3 Security Patches

**Apply Security Updates**:

```bash
# 1. Check for security updates
sudo apt update
sudo apt list --upgradable | grep -i security

# 2. Schedule maintenance window (off-hours)
# Enable maintenance mode
cp /var/www/csms/maintenance.html /var/www/html/index.html
sudo systemctl reload nginx

# 3. Apply security updates only
sudo apt upgrade -y --only-upgrade $(sudo apt list --upgradable 2>/dev/null | grep -i security | cut -d'/' -f1)

# 4. Restart services if needed
sudo systemctl restart postgresql
sudo systemctl restart minio
sudo systemctl restart nginx
pm2 restart csms-production

# 5. Verify system
/usr/local/bin/csms-health-check.sh

# 6. Disable maintenance mode
sudo rm /var/www/html/index.html
sudo systemctl reload nginx

# 7. Document
echo "$(date): Security updates applied" >> /var/log/csms/maintenance.log
```

### 8.4 Audit Logging

**Enable Audit Logging**:

```bash
# PostgreSQL audit logging
sudo nano /etc/postgresql/14/main/postgresql.conf

# Add/modify:
log_statement = 'mod'  # Log all modifications (INSERT, UPDATE, DELETE)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_connections = on
log_disconnections = on
log_duration = on
log_min_duration_statement = 1000  # Log queries taking > 1 second

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Review Audit Logs**:

```bash
# Review database audit logs
sudo grep "INSERT\|UPDATE\|DELETE" /var/log/postgresql/postgresql-14-main.log | tail -50

# Review user activity
sudo -u postgres psql -d nody -c "
SELECT
    n.\"userId\",
    u.username,
    n.message,
    n.\"createdAt\"
FROM \"Notification\" n
JOIN \"User\" u ON n.\"userId\" = u.id
WHERE n.\"createdAt\" > current_timestamp - INTERVAL '24 hours'
ORDER BY n.\"createdAt\" DESC
LIMIT 100;
"
```

---

## 9. Incident Management

### 9.1 Incident Response Process

**Incident Response Steps**:

1. **Detection**: Incident detected via monitoring, user report, or alert
2. **Assessment**: Determine severity (P1/P2/P3/P4)
3. **Response**: Execute appropriate response procedure
4. **Resolution**: Fix issue and verify recovery
5. **Documentation**: Document incident and resolution
6. **Post-Mortem**: Review incident and improve procedures

### 9.2 Incident Documentation

**Incident Report Template**:

```bash
# Create incident report
cat > /var/log/csms/incidents/incident-$(date +%Y%m%d-%H%M).txt <<EOF
INCIDENT REPORT

Incident ID: INC-$(date +%Y%m%d-%H%M)
Date: $(date)
Reported By: ______________
Severity: [ ] P1 [ ] P2 [ ] P3 [ ] P4

DESCRIPTION:
[What happened?]

IMPACT:
- Users Affected: ______
- Services Affected: ______
- Duration: ______ minutes

ROOT CAUSE:
[Why did it happen?]

TIMELINE:
$(date +%H:%M): Incident detected
$(date +%H:%M): Response initiated
$(date +%H:%M): Issue resolved

ACTIONS TAKEN:
1. [Action 1]
2. [Action 2]
3. [Action 3]

RESOLUTION:
[How was it fixed?]

PREVENTION:
[How to prevent in future?]

LESSONS LEARNED:
1. [Lesson 1]
2. [Lesson 2]

Documented By: ______________
Reviewed By: ______________
EOF
```

### 9.3 Post-Mortem Process

**Conduct Post-Mortem** (for P1/P2 incidents):

1. Schedule meeting within 24 hours of incident
2. Invite all involved parties
3. Review incident timeline
4. Identify root cause
5. Document lessons learned
6. Create action items to prevent recurrence
7. Update runbooks and procedures

**Post-Mortem Template**:

```
POST-MORTEM: [Incident Title]

Date: ___________
Participants: ___________

INCIDENT SUMMARY:
[Brief description]

IMPACT:
- Duration: ______ hours
- Users affected: ______
- Revenue impact: ______

TIMELINE:
HH:MM - [Event]
HH:MM - [Event]
HH:MM - [Event]

ROOT CAUSE:
[Technical explanation]

WHAT WENT WELL:
1. [Item 1]
2. [Item 2]

WHAT WENT POORLY:
1. [Item 1]
2. [Item 2]

ACTION ITEMS:
1. [Action] - Owner: ______ - Due: ______
2. [Action] - Owner: ______ - Due: ______

LESSONS LEARNED:
1. [Lesson 1]
2. [Lesson 2]
```

---

## 10. Change Management

### 10.1 Change Request Process

**Change Categories**:

- **Standard Change**: Pre-approved, low-risk (e.g., user password reset)
- **Normal Change**: Requires CAB approval (e.g., application update)
- **Emergency Change**: Critical, expedited approval (e.g., security patch)

**Change Request Template**:

```
CHANGE REQUEST

Change ID: CHG-$(date +%Y%m%d-%H%M)
Requested By: ______________
Date: ______________

CHANGE DETAILS:
Type: [ ] Standard [ ] Normal [ ] Emergency
Category: [ ] Application [ ] Database [ ] Infrastructure [ ] Security

Description:
[What will be changed?]

Justification:
[Why is this change needed?]

RISK ASSESSMENT:
Risk Level: [ ] Low [ ] Medium [ ] High
Impact if failed: ______________
Rollback plan: ______________

IMPLEMENTATION:
Implementation Date: ______________
Implementation Window: ______________
Downtime Required: [ ] Yes [ ] No  Duration: ______

TESTING:
[ ] Tested in development
[ ] Tested in staging
[ ] UAT completed

APPROVALS:
Technical Lead: ______________ Date: ______
CAB Chair (if required): ______________ Date: ______
```

### 10.2 Change Implementation

**Change Implementation Checklist**:

- [ ] Change request approved
- [ ] Tested in staging environment
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled
- [ ] Backup completed
- [ ] Change implemented
- [ ] Verification completed
- [ ] Documentation updated
- [ ] Change closure documented

### 10.3 Emergency Changes

**Emergency Change Process** (for critical security issues):

1. **Immediate Assessment**: Confirm emergency status
2. **Verbal Approval**: Get verbal approval from IT Director or Technical Lead
3. **Implement**: Execute change immediately
4. **Document**: Document change during and after implementation
5. **Notify**: Inform CAB and stakeholders
6. **Review**: Conduct post-implementation review within 24 hours

---

## 11. Capacity Planning

### 11.1 Growth Monitoring

**Track Key Growth Metrics**:

```bash
# Monthly growth tracking script
cat > /var/log/csms/growth-$(date +%Y%m).txt <<EOF
Growth Metrics Report
Month: $(date +%Y-%m)

USERS:
Total Users: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"User\";")
Active Users: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"User\" WHERE \"isActive\" = true;")
New Users This Month: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"User\" WHERE DATE_TRUNC('month', \"createdAt\") = DATE_TRUNC('month', CURRENT_DATE);")

REQUESTS:
Total Requests: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"ConfirmationRequest\";")
Requests This Month: $(sudo -u postgres psql -d nody -t -c "SELECT COUNT(*) FROM \"ConfirmationRequest\" WHERE DATE_TRUNC('month', \"createdAt\") = DATE_TRUNC('month', CURRENT_DATE);")

STORAGE:
Database Size: $(sudo -u postgres psql -d nody -t -c "SELECT pg_size_pretty(pg_database_size('nody'));")
Document Storage: $(mc du csms-local/csms-documents)
Total Documents: $(mc ls csms-local/csms-documents --recursive | wc -l)

SYSTEM RESOURCES:
Avg CPU Usage: [From monitoring]
Avg Memory Usage: [From monitoring]
Peak Concurrent Users: [From logs]
EOF
```

### 11.2 Capacity Projections

**Calculate Capacity Needs** (review quarterly):

```
Current Capacity:
- Server: 4 CPU, 16GB RAM, 200GB Disk
- Database: 500GB
- Storage: 1TB

Current Usage:
- Database: ____ GB (____ % utilized)
- Storage: ____ GB (____ % utilized)
- Peak Concurrent Users: ____

Growth Rate (monthly):
- Database: ____ GB/month
- Storage: ____ GB/month
- Users: ____ users/month

Projected Capacity (6 months):
- Database: Current + (Growth Rate × 6) = ____ GB
- Storage: Current + (Growth Rate × 6) = ____ GB
- Users: Current + (Growth Rate × 6) = ____ users

Capacity Threshold (80% utilization):
- Database: 80% of 500GB = 400GB
- Storage: 80% of 1TB = 800GB

Months to Threshold:
- Database: (400GB - Current) / Growth Rate = ____ months
- Storage: (800GB - Current) / Growth Rate = ____ months

RECOMMENDATION:
If months to threshold < 6:
  - [ ] Plan capacity expansion
  - [ ] Budget for hardware/cloud resources
  - [ ] Schedule upgrade
```

---

## 12. Runbooks

### 12.1 Common Operational Procedures

**Runbook Index**:

1. Application Restart
2. Database Restart
3. Emergency Maintenance
4. User Account Recovery
5. Data Recovery
6. Performance Investigation
7. Security Incident Response

### 12.2 Application Restart Runbook

```
RUNBOOK: Application Restart

PURPOSE: Restart the CSMS application with minimal downtime

WHEN TO USE:
- Application is unresponsive
- Memory leak suspected
- After configuration changes
- Performance degradation

PREREQUISITES:
- Confirm no ongoing deployments
- Notify users if during business hours

PROCEDURE:

1. Verify current status
   pm2 status

2. Check if restart is needed
   pm2 logs csms-production --lines 100 | grep -i error

3. Perform graceful restart (zero downtime)
   pm2 reload csms-production

4. Monitor startup
   pm2 logs csms-production --lines 50

5. Verify health
   curl https://csms.zanajira.go.tz/api/health

6. Monitor for 5 minutes
   watch -n 60 'curl -s https://csms.zanajira.go.tz/api/health'

7. Document restart
   echo "$(date): Application restarted - Reason: [REASON]" >> /var/log/csms/maintenance.log

ROLLBACK:
If issues after restart:
   pm2 restart csms-production

VERIFICATION:
✓ All PM2 instances online
✓ Health check passing
✓ No errors in logs
✓ Users can access system

ESTIMATED TIME: 2 minutes
DOWNTIME: 0 minutes (graceful reload)
```

### 12.3 Database Restart Runbook

```
RUNBOOK: Database Restart

PURPOSE: Restart PostgreSQL database safely

WHEN TO USE:
- Database unresponsive
- Configuration changes require restart
- High connection count that won't clear

PREREQUISITES:
- Schedule during maintenance window if possible
- Backup database before restart
- Notify users of potential brief downtime

PROCEDURE:

1. Check database status
   sudo systemctl status postgresql
   sudo -u postgres psql -d nody -c "SELECT version();"

2. Stop application to prevent connection errors
   pm2 stop csms-production

3. Check active connections
   sudo -u postgres psql -d nody -c "SELECT COUNT(*) FROM pg_stat_activity;"

4. Restart PostgreSQL
   sudo systemctl restart postgresql

5. Verify PostgreSQL is running
   sudo systemctl status postgresql

6. Test database connection
   sudo -u postgres psql -d nody -c "SELECT COUNT(*) FROM \"User\";"

7. Start application
   pm2 start csms-production

8. Verify application health
   curl https://csms.zanajira.go.tz/api/health/db

9. Document restart
   echo "$(date): PostgreSQL restarted - Reason: [REASON]" >> /var/log/csms/maintenance.log

ROLLBACK:
If database doesn't start:
   sudo systemctl status postgresql
   sudo tail -50 /var/log/postgresql/postgresql-14-main.log
   Contact DBA

VERIFICATION:
✓ PostgreSQL service active
✓ Database accepting connections
✓ Application can query database
✓ No errors in PostgreSQL logs

ESTIMATED TIME: 5 minutes
DOWNTIME: 1-2 minutes
```

---

## Appendices

### Appendix A: Contact List

| Role              | Name   | Phone   | Email   | Hours                    |
| ----------------- | ------ | ------- | ------- | ------------------------ |
| Lead System Admin | [NAME] | [PHONE] | [EMAIL] | 24/7                     |
| Database Admin    | [NAME] | [PHONE] | [EMAIL] | Business hours + on-call |
| Security Lead     | [NAME] | [PHONE] | [EMAIL] | Business hours           |
| IT Director       | [NAME] | [PHONE] | [EMAIL] | Business hours           |

### Appendix B: System Information

| Component        | Details                     |
| ---------------- | --------------------------- |
| Application URL  | https://csms.zanajira.go.tz |
| Server Location  | /var/www/csms               |
| Logs Location    | /var/log/csms               |
| Backups Location | /var/backups/csms           |
| Database Name    | nody                        |
| MinIO Bucket     | csms-documents              |

### Appendix C: Useful Commands

See Quick Reference sections throughout this manual.

---

**Document End**

---

**For operational support or questions about this manual, contact:**

**CSMS Operations Team**
Email: ops-team@csms.zanajira.go.tz
Phone: +255-XXX-XXXX
Office: IT Department, Government Building

**Revolutionary Government of Zanzibar**
**Civil Service Management System (CSMS)**
**Version 1.0 | January 2025**

# Sanitized Database Backup Guide

**Purpose:** Create and restore database backups without employee data for development/testing environments

---

## 🎯 Overview

The sanitized backup scripts allow you to create database backups that include:

✅ **What's Included:**
- Complete database schema (all table structures including Employee table)
- User accounts and permissions (47 users)
- Institution data (72 institutions)
- Audit logs
- Notifications
- Sessions
- All system configuration

✗ **What's Excluded:**
- Employee records (34,413 employees excluded)
- Employee certificates
- HR requests (promotions, confirmations, LWOP, etc.)
- Cadre change requests
- Retirement/resignation/termination requests
- Service extension requests
- Separation requests
- Complaints

---

## 📋 Use Cases

**Perfect for:**
- Development environments (no real employee PII)
- Testing environments
- Training environments
- Sharing with developers
- Demo/staging systems

**Not suitable for:**
- Production environments
- Systems requiring real employee data
- Reporting/analytics on employee data

---

## 🚀 Quick Start

### Create Sanitized Backup

```bash
cd /home/latest/beky3a/scripts
./backup-database-no-employees.sh
```

**With custom parameters:**
```bash
./backup-database-no-employees.sh -W "your_password" -o /path/to/output
```

### Restore Sanitized Backup

```bash
cd /home/latest/beky3a/scripts
./restore-database-no-employees.sh
```

---

## 📚 Script Documentation

### backup-database-no-employees.sh

Creates a sanitized database backup excluding employee data.

**Location:** `/home/latest/beky3a/scripts/backup-database-no-employees.sh`

**Usage:**
```bash
./backup-database-no-employees.sh [options]
```

**Options:**
- `-h HOST` - Database host (default: localhost)
- `-p PORT` - Database port (default: 5432)
- `-U USER` - Database user (default: postgres)
- `-d DATABASE` - Database name (default: nody)
- `-W PASSWORD` - Database password (will prompt if not provided)
- `-o OUTPUT` - Output directory (default: /home/latest/beky3a/database)
- `--help` - Show help message

**Example:**
```bash
# Basic usage (will prompt for password)
./backup-database-no-employees.sh

# With password
./backup-database-no-employees.sh -W "MyPassword"

# Custom output directory
./backup-database-no-employees.sh -W "MyPassword" -o /backup/sanitized
```

**Output Files:**
- `nody_no_employees_YYYYMMDD_HHMMSS.sql` - Main backup file
- `nody_no_employees_YYYYMMDD_HHMMSS_info.txt` - Information about the backup

---

### restore-database-no-employees.sh

Restores a sanitized database backup.

**Location:** `/home/latest/beky3a/scripts/restore-database-no-employees.sh`

**Usage:**
```bash
./restore-database-no-employees.sh [options]
```

**Options:**
- `-h HOST` - Database host (default: localhost)
- `-p PORT` - Database port (default: 5432)
- `-U USER` - Database user (default: postgres)
- `-d DATABASE` - Database name (default: nody)
- `-W PASSWORD` - Database password (will prompt if not provided)
- `-f FILE` - Specific backup file to restore (auto-detect if not specified)
- `--force` - Skip confirmation prompts
- `--help` - Show help message

**Example:**
```bash
# Interactive restore (will show available backups)
./restore-database-no-employees.sh

# Restore specific file
./restore-database-no-employees.sh -f /path/to/backup.sql

# Non-interactive restore
./restore-database-no-employees.sh -W "MyPassword" --force
```

---

## 🔍 What Happens During Backup

### Phase 1: Schema Backup
Exports complete database schema including:
- All table structures
- All indexes
- All constraints (foreign keys, unique, etc.)
- All sequences
- All extensions

The Employee table structure is included (empty).

### Phase 2: Data Backup
Exports data from all tables EXCEPT:
- Employee
- EmployeeCertificate
- PromotionRequest
- ConfirmationRequest
- LwopRequest
- CadreChangeRequest
- RetirementRequest
- ResignationRequest
- ServiceExtensionRequest
- TerminationRequest
- SeparationRequest
- Complaint

### Phase 3: Combined File
Creates a single SQL file with:
- Header comments explaining what's included/excluded
- Complete schema
- Sanitized data

---

## 🔄 What Happens During Restore

### Phase 1: Verification
- Checks prerequisites (PostgreSQL client)
- Detects available backup files
- Shows backup information

### Phase 2: Confirmation
- Shows warning about data loss
- Requires explicit confirmation (type 'yes')

### Phase 3: Database Recreation
- Drops existing database (if exists)
- Creates fresh database
- Sets proper encoding (UTF-8)

### Phase 4: Data Restoration
- Restores complete schema
- Restores sanitized data
- Rebuilds indexes and constraints

### Phase 5: Verification
- Checks all tables exist
- Counts records in key tables
- Verifies Employee table is empty
- Confirms User and Institution data present

---

## 📊 Backup Statistics

**Example backup (from actual run):**

| Metric | Value |
|--------|-------|
| Database Size | 64 MB (original) |
| Backup Size | 33 MB (sanitized) |
| Users Included | 47 |
| Institutions Included | 72 |
| Employees Excluded | 34,413 |
| Backup Time | ~5 seconds |
| Restore Time | ~10 seconds |

---

## ✅ Verification Checklist

After restoring sanitized backup:

```bash
# 1. Connect to database
psql -U postgres -d nody

# 2. Check tables exist
\dt

# 3. Verify User data
SELECT COUNT(*) FROM "User";
# Expected: 47

# 4. Verify Institution data
SELECT COUNT(*) FROM "Institution";
# Expected: 72

# 5. Verify Employee table is empty
SELECT COUNT(*) FROM "Employee";
# Expected: 0

# 6. Check schema exists
\d "Employee"
# Should show table structure (but empty)

# 7. Exit
\q
```

---

## 🔒 Security Considerations

### Still Contains Sensitive Data

⚠️ Even without employee records, the backup contains:
- User credentials (hashed passwords)
- Audit logs (may contain PII in description fields)
- Institution information

### Best Practices

1. **Storage:**
   - Store in secure location
   - Encrypt at rest
   - Limit access to authorized developers

2. **Transfer:**
   - Use encrypted channels (SCP/SFTP)
   - Avoid public networks
   - Delete from insecure locations

3. **Usage:**
   - Only use in development/test environments
   - Never expose publicly
   - Follow data protection regulations

4. **Disposal:**
   - Securely delete when no longer needed
   - Use `shred` or similar for secure deletion

---

## 🛠️ Troubleshooting

### Backup Issues

**Problem: "Cannot connect to database"**
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection manually
psql -U postgres -d nody -c "SELECT 1;"
```

**Problem: "Permission denied"**
```bash
# Make script executable
chmod +x backup-database-no-employees.sh

# Check you have read access to database
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"User\";"
```

### Restore Issues

**Problem: "Database already exists"**
- The script will prompt to drop it
- Use `--force` to skip prompts
- Or manually drop: `psql -U postgres -c "DROP DATABASE nody;"`

**Problem: "Employee table has data after restore"**
- This shouldn't happen with sanitized backup
- Verify you're using the correct backup file (look for `_no_employees_` in filename)

**Problem: "User/Institution data missing"**
- Check you used correct backup file
- Verify backup completed successfully
- Check info file for what was backed up

---

## 📝 Script Output Examples

### Successful Backup Output

```
╔════════════════════════════════════════════════════════════════╗
║    CSMS Database Backup (Without Employee Data)               ║
║    Sanitized backup for development/testing                   ║
╚════════════════════════════════════════════════════════════════╝

Configuration:
  Host:         localhost
  Port:         5432
  User:         postgres
  Database:     nody
  Output Dir:   /home/latest/beky3a/database
  Timestamp:    20260113_195449

✓ PostgreSQL client tools found
✓ Output directory ready
✓ Database connection successful
✓ Database statistics gathered

Creating sanitized backup (excluding employee data)...

✓ Schema backup created: nody_no_employees_20260113_195449_schema.sql (40K)
✓ Data backup created: nody_no_employees_20260113_195449_data.sql (33M)
✓ Combined backup created: nody_no_employees_20260113_195449.sql (33M)
✓ Information file created: nody_no_employees_20260113_195449_info.txt

╔════════════════════════════════════════════════════════════════╗
║      Sanitized Database Backup Completed Successfully!        ║
╚════════════════════════════════════════════════════════════════╝

Summary:
  Database:     nody
  Location:     /home/latest/beky3a/database
  Timestamp:    20260113_195449

Included Data:
  ✓ Users: 47
  ✓ Institutions: 72
  ✓ Complete schema (all tables)

Excluded Data:
  ✗ Employees: 34413 (excluded)
  ✗ Employee-related requests (excluded)
```

### Successful Restore Output

```
╔════════════════════════════════════════════════════════════════╗
║    CSMS Database Restore (No Employee Data)                   ║
║    Sanitized backup for development/testing                   ║
╚════════════════════════════════════════════════════════════════╝

Configuration:
  Host:         localhost
  Port:         5432
  User:         postgres
  Database:     nody

Available sanitized backups:

  1) nody_no_employees_20260113_195449.sql      33M  2026-01-13 19:54:49

Select backup to restore (1-1) or press Enter for latest:

Selected backup: nody_no_employees_20260113_195449.sql

╔════════════════════════════════════════════════════════════════╗
║                        WARNING!                                ║
║  This will DROP the existing database and ALL its data!       ║
║  This action cannot be undone!                                ║
╚════════════════════════════════════════════════════════════════╝

Type 'yes' to confirm: yes

✓ Database dropped
✓ Database created
✓ Database restored in 8s

Table Verification:
┌─────────────────────────────┬──────────┬─────────────┐
│ Table Name                  │ Records  │ Status      │
├─────────────────────────────┼──────────┼─────────────┤
│ User                        │ 47       │ OK          │
│ Institution                 │ 72       │ OK          │
│ Employee                    │ 0        │ OK (empty)  │
│ AuditLog                    │ 1234     │ OK          │
│ Notification                │ 567      │ OK          │
└─────────────────────────────┴──────────┴─────────────┘

╔════════════════════════════════════════════════════════════════╗
║      Database Restore Completed Successfully!                 ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🎓 Advanced Usage

### Automated Backups

Create a cron job for regular sanitized backups:

```bash
# Edit crontab
crontab -e

# Add daily sanitized backup at 3 AM
0 3 * * * cd /home/latest/beky3a/scripts && ./backup-database-no-employees.sh -W "PASSWORD" >> /var/log/sanitized-backup.log 2>&1
```

### Custom Table Exclusions

To exclude additional tables, edit the script:

```bash
nano backup-database-no-employees.sh

# Find the EXCLUDE_TABLES array and add your tables:
local EXCLUDE_TABLES=(
    "Employee"
    "EmployeeCertificate"
    # ... existing tables ...
    "YourCustomTable"  # Add your table here
)
```

### Restore to Different Database

```bash
./restore-database-no-employees.sh -d nody_dev -W "password"
```

---

## 📞 Support

For issues or questions:

1. Check this guide's troubleshooting section
2. Review script comments for details
3. Check backup info file: `*_info.txt`
4. Verify PostgreSQL logs: `/var/log/postgresql/`

---

## 📋 Quick Reference

**Create backup:**
```bash
cd /home/latest/beky3a/scripts
./backup-database-no-employees.sh
```

**Restore backup:**
```bash
cd /home/latest/beky3a/scripts
./restore-database-no-employees.sh
```

**Check backups:**
```bash
ls -lh /home/latest/beky3a/database/*no_employees*.sql
```

**View backup info:**
```bash
cat /home/latest/beky3a/database/*no_employees*_info.txt
```

**Verify restored database:**
```bash
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"  # Should be 0
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"User\";"      # Should be 47
```

---

**Document Version:** 1.0
**Created:** January 13, 2026
**Author:** CSMS Development Team
**Scripts Location:** `/home/latest/beky3a/scripts/`

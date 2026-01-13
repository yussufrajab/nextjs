# CSMS Sanitized Database Backup Package (beky3a)

**Package:** beky3a - Sanitized Database Backup (No Employee Data)
**Created:** January 13, 2026
**Purpose:** Database backup for development/testing WITHOUT sensitive employee data

---

## 🎯 What This Package Contains

This is a **sanitized backup package** for CSMS that includes the database structure and essential data **WITHOUT employee records**.

### ✅ What's Included

**Database Schema:**
- ✅ Complete table structures (all 16 tables)
- ✅ All indexes and constraints
- ✅ All sequences
- ✅ Employee table structure (empty)

**Data Included:**
- ✅ **47 User accounts** (login credentials, permissions)
- ✅ **72 Institutions** (organizations, departments)
- ✅ **Audit logs** (system activity tracking)
- ✅ **Notifications**
- ✅ **Sessions**
- ✅ **System configuration**

### ❌ What's Excluded

**No Employee Data:**
- ❌ **34,413 Employee records** removed
- ❌ Employee certificates
- ❌ HR requests (promotions, confirmations, LWOP)
- ❌ Cadre change requests
- ❌ Retirement/resignation requests
- ❌ Service extension/termination requests
- ❌ Separation requests
- ❌ Complaints

---

## 📦 Package Contents

```
beky3a/
├── README.md                              # This file
├── QUICK_START.md                         # Quick usage guide
│
├── scripts/                               # Backup & restore scripts
│   ├── backup-database-no-employees.sh   # Create sanitized backup
│   └── restore-database-no-employees.sh  # Restore sanitized backup
│
├── database/                              # Database backups
│   ├── nody_no_employees_*.sql           # Main backup file (33 MB)
│   └── nody_no_employees_*_info.txt      # Backup information
│
└── docs/                                  # Documentation
    └── SANITIZED_BACKUP_GUIDE.md         # Complete guide
```

---

## 🚀 Quick Start

### Create Sanitized Backup

```bash
cd /home/latest/beky3a/scripts
./backup-database-no-employees.sh
```

You'll be prompted for the PostgreSQL password. The script will:
1. Export complete database schema
2. Export data from all tables EXCEPT employee-related tables
3. Create a combined SQL file
4. Generate an information file

**Output:**
- `nody_no_employees_YYYYMMDD_HHMMSS.sql` - Main backup file
- `nody_no_employees_YYYYMMDD_HHMMSS_info.txt` - Backup information

### Restore Sanitized Backup

```bash
cd /home/latest/beky3a/scripts
./restore-database-no-employees.sh
```

The script will:
1. Show available sanitized backups
2. Let you select which backup to restore
3. Confirm the restoration (destructive operation!)
4. Drop and recreate the database
5. Restore the backup
6. Verify the restoration

---

## 💡 Use Cases

### ✅ Perfect For

- **Development Environments** - No sensitive employee PII
- **Testing Environments** - Test features without real data
- **Training Systems** - Train users safely
- **Demo Environments** - Demonstrate features
- **Staging Systems** - Pre-production testing
- **Sharing with Developers** - Share safely without PII

### ❌ Not Suitable For

- Production environments
- Systems requiring real employee data
- Employee reporting or analytics
- HR operations
- Payroll processing

---

## 📊 Current Backup Statistics

**Backup File:** `nody_no_employees_20260113_195449.sql`

| Metric | Value |
|--------|-------|
| Database | nody |
| Size | 33 MB |
| Created | 2026-01-13 19:54:49 UTC |
| Users | 47 |
| Institutions | 72 |
| Employees | 0 (excluded) |
| Tables | 16 (all with schema) |

---

## 🔧 Script Options

### backup-database-no-employees.sh

```bash
./backup-database-no-employees.sh [options]

Options:
  -h HOST       Database host (default: localhost)
  -p PORT       Database port (default: 5432)
  -U USER       Database user (default: postgres)
  -d DATABASE   Database name (default: nody)
  -W PASSWORD   Database password (will prompt if not provided)
  -o OUTPUT     Output directory (default: /home/latest/beky3a/database)
  --help        Show help message
```

**Examples:**
```bash
# Basic usage (will prompt for password)
./backup-database-no-employees.sh

# With password
./backup-database-no-employees.sh -W "MyPassword"

# Custom output directory
./backup-database-no-employees.sh -W "MyPassword" -o /backup/sanitized
```

### restore-database-no-employees.sh

```bash
./restore-database-no-employees.sh [options]

Options:
  -h HOST       Database host (default: localhost)
  -p PORT       Database port (default: 5432)
  -U USER       Database user (default: postgres)
  -d DATABASE   Database name (default: nody)
  -W PASSWORD   Database password (will prompt if not provided)
  -f FILE       Specific backup file to restore (auto-detect if not specified)
  --force       Skip confirmation prompts
  --help        Show help message
```

**Examples:**
```bash
# Interactive restore (shows available backups)
./restore-database-no-employees.sh

# Restore specific file
./restore-database-no-employees.sh -f /path/to/backup.sql

# Non-interactive restore
./restore-database-no-employees.sh -W "MyPassword" --force
```

---

## ✅ Verification After Restore

After restoring, verify the database:

```bash
# Connect to database
psql -U postgres -d nody

# Check Employee table is empty (should be 0)
SELECT COUNT(*) FROM "Employee";

# Check Users are present (should be 47)
SELECT COUNT(*) FROM "User";

# Check Institutions are present (should be 72)
SELECT COUNT(*) FROM "Institution";

# List all tables (should see all 16)
\dt

# Exit
\q
```

---

## 🔒 Security Considerations

### ⚠️ Still Contains Sensitive Data

Even without employee records, this backup contains:
- **User credentials** (hashed passwords)
- **Audit logs** (may contain PII in descriptions)
- **Institution information**

### Best Practices

1. **Storage:**
   - Store in secure location
   - Encrypt at rest
   - Limit access to developers only

2. **Transfer:**
   - Use encrypted channels (SCP/SFTP)
   - Never send via email or public channels
   - Delete from insecure locations after transfer

3. **Usage:**
   - Use ONLY in development/test environments
   - Never expose publicly
   - Follow data protection regulations

4. **Disposal:**
   - Securely delete when no longer needed
   - Use `shred` or similar for secure deletion

---

## 📋 Typical Workflow

### Setting Up a Development Environment

1. **On production/source server:**
   ```bash
   cd /home/latest/beky3a/scripts
   ./backup-database-no-employees.sh
   ```

2. **Transfer to development server:**
   ```bash
   scp /home/latest/beky3a/database/nody_no_employees_*.sql dev-server:/tmp/
   ```

3. **On development server:**
   ```bash
   cd /home/latest/beky3a/scripts
   ./restore-database-no-employees.sh -f /tmp/nody_no_employees_*.sql
   ```

4. **Verify:**
   ```bash
   psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
   # Expected: 0
   ```

5. **Result:**
   - ✅ All users (can login and test authentication)
   - ✅ All institutions (for reference data)
   - ✅ Complete schema (can test all features)
   - ✅ No employee PII (safe for development)

6. **Optional - Add test data:**
   - Add test employees through the application UI
   - Or use SQL to insert sample data
   - Now you can test employee-related features safely

---

## 📚 Documentation

### Quick References

- **README.md** (this file) - Package overview
- **QUICK_START.md** - Quick usage guide
- **docs/SANITIZED_BACKUP_GUIDE.md** - Complete detailed guide

### For More Information

```bash
# View quick start guide
cat /home/latest/beky3a/QUICK_START.md

# View complete guide
cat /home/latest/beky3a/docs/SANITIZED_BACKUP_GUIDE.md

# View script help
./scripts/backup-database-no-employees.sh --help
./scripts/restore-database-no-employees.sh --help
```

---

## 🆘 Troubleshooting

### Backup Issues

**Problem: Cannot connect to database**
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connection
psql -U postgres -d nody -c "SELECT 1;"
```

**Problem: Permission denied**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Restore Issues

**Problem: Database already exists**
- The script will prompt to drop it
- Confirm with 'yes' or use `--force` flag

**Problem: Employee data still present**
- Verify you're using the sanitized backup (filename contains `_no_employees_`)
- Check the info file to confirm what's in the backup

---

## 📊 Comparison with Full Backup

| Feature | Full Backup (beky2a) | Sanitized Backup (beky3a) |
|---------|---------------------|---------------------------|
| Schema | ✅ All tables | ✅ All tables |
| Users | ✅ 47 | ✅ 47 |
| Institutions | ✅ 72 | ✅ 72 |
| Employees | ✅ 34,413 | ❌ 0 |
| HR Requests | ✅ Yes | ❌ No |
| Size | 39 MB | 33 MB |
| Contains PII | High | Minimal |
| Production Use | ✅ Yes | ❌ No |
| Dev/Test Use | ✅ Yes | ✅ Yes (Better) |
| Backup Time | ~30 seconds | ~5 seconds |

---

## 🎓 Advanced Usage

### Automated Backups

Set up a cron job for regular sanitized backups:

```bash
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd /home/latest/beky3a/scripts && ./backup-database-no-employees.sh -W "PASSWORD" >> /var/log/sanitized-backup.log 2>&1
```

### Restore to Different Database

```bash
./restore-database-no-employees.sh -d nody_dev -W "password"
```

---

## 📞 Support

**For issues or questions:**

1. Check the troubleshooting section above
2. Review the complete guide: `docs/SANITIZED_BACKUP_GUIDE.md`
3. Check script output for error messages
4. Verify PostgreSQL logs: `/var/log/postgresql/`

---

## ✨ Summary

This package provides:

✅ **Scripts** to create and restore sanitized database backups
✅ **Complete schema** (all table structures)
✅ **Essential data** (users, institutions, system config)
✅ **No employee PII** (safe for development/testing)
✅ **Documentation** (guides and examples)
✅ **Test backup** already created and ready to use

**Perfect for development environments without sensitive employee data!**

---

**Package Version:** 1.0
**Created:** January 13, 2026
**Database:** nody
**Platform:** Ubuntu 24.04 LTS with PostgreSQL 16
**Maintained By:** CSMS Development Team

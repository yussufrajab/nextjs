# Quick Start - Sanitized Database Backup (beky3a)

**Package:** beky3a - Database backup WITHOUT employee data
**Purpose:** Development/testing environments

---

## 🎯 What This Is

A **sanitized database backup** that includes:
- ✅ Complete schema (all table structures)
- ✅ 47 Users
- ✅ 72 Institutions
- ✅ Audit logs, notifications, system config
- ❌ 0 Employees (34,413 removed for privacy)
- ❌ No HR requests

---

## ⚡ Quick Commands

### Create Backup
```bash
cd /home/latest/beky3a/scripts
./backup-database-no-employees.sh
```

### Restore Backup
```bash
cd /home/latest/beky3a/scripts
./restore-database-no-employees.sh
```

### Verify
```bash
# Should be 0
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"

# Should be 47
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"User\";"
```

---

## 📋 Step-by-Step

### Create a Sanitized Backup

1. Navigate to scripts:
   ```bash
   cd /home/latest/beky3a/scripts
   ```

2. Run backup script:
   ```bash
   ./backup-database-no-employees.sh
   ```

3. Enter PostgreSQL password when prompted

4. Files created:
   - `database/nody_no_employees_YYYYMMDD_HHMMSS.sql`
   - `database/nody_no_employees_YYYYMMDD_HHMMSS_info.txt`

### Restore a Sanitized Backup

1. Navigate to scripts:
   ```bash
   cd /home/latest/beky3a/scripts
   ```

2. Run restore script:
   ```bash
   ./restore-database-no-employees.sh
   ```

3. Select backup from list (or press Enter for latest)

4. Type 'yes' to confirm

5. Wait for restoration to complete

6. Verify:
   ```bash
   psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
   ```
   Should return: 0

---

## 🎯 Use Cases

**Perfect for:**
- Development environments
- Testing features
- Training systems
- Demo environments
- Sharing with developers

**Not for:**
- Production systems
- Real employee data needs
- HR operations

---

## 📦 What You Get

After restore:
- ✅ All table structures (including Employee table, but empty)
- ✅ 47 user accounts (can login and test)
- ✅ 72 institutions (reference data)
- ✅ Empty employee table (add test data as needed)
- ✅ Complete schema (ready for development)

---

## 🔧 Common Options

### Backup with Password
```bash
./backup-database-no-employees.sh -W "MyPassword"
```

### Restore Specific File
```bash
./restore-database-no-employees.sh -f /path/to/backup.sql
```

### Non-Interactive Restore
```bash
./restore-database-no-employees.sh -W "MyPassword" --force
```

---

## ✅ Verification Checklist

After restoring, check:

```bash
# Connect to database
psql -U postgres -d nody

# 1. Employees should be 0
SELECT COUNT(*) FROM "Employee";

# 2. Users should be 47
SELECT COUNT(*) FROM "User";

# 3. Institutions should be 72
SELECT COUNT(*) FROM "Institution";

# 4. All tables should exist
\dt

# Exit
\q
```

---

## 🔄 Typical Workflow

### Setting Up Dev Environment

**On source server:**
```bash
cd /home/latest/beky3a/scripts
./backup-database-no-employees.sh
```

**Transfer to dev server:**
```bash
scp /home/latest/beky3a/database/nody_no_employees_*.sql dev-server:/tmp/
```

**On dev server:**
```bash
cd /home/latest/beky3a/scripts
./restore-database-no-employees.sh -f /tmp/nody_no_employees_*.sql
```

**Result:**
- ✅ Can login with existing users
- ✅ See institutions
- ✅ Test features
- ✅ No employee PII

---

## 📊 Package Info

| Item | Value |
|------|-------|
| Package | beky3a |
| Type | Sanitized backup (no employees) |
| Size | 33 MB |
| Users | 47 |
| Institutions | 72 |
| Employees | 0 (excluded) |
| Tables | 16 (all structures) |

---

## 🆘 Quick Troubleshooting

**Can't connect to database:**
```bash
systemctl status postgresql
```

**Scripts not executable:**
```bash
chmod +x scripts/*.sh
```

**Employee data still present:**
- Verify backup filename contains `_no_employees_`
- Check info file: `cat database/*_info.txt`

---

## 📚 More Information

**Full documentation:**
```bash
cat README.md
cat docs/SANITIZED_BACKUP_GUIDE.md
```

**Script help:**
```bash
./scripts/backup-database-no-employees.sh --help
./scripts/restore-database-no-employees.sh --help
```

---

## 🎉 You're Ready!

1. Create backup: `./backup-database-no-employees.sh`
2. Restore backup: `./restore-database-no-employees.sh`
3. Verify: Check employee count is 0

**Perfect for development without sensitive PII!**

---

**Package:** beky3a
**Created:** January 13, 2026
**Location:** `/home/latest/beky3a/`

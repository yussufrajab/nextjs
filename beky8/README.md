# Database Backup and Restore Guide

This directory contains the database backup and restore scripts for the CSMS (Civil Service Management System) PostgreSQL database managed by Prisma.

## 📁 Directory Contents

- `nody_backup_YYYYMMDD_HHMMSS.backup` - Database backup files (custom PostgreSQL format)
- `restore-database.sh` - Automated restore script
- `README.md` - This file

## 📊 Current Backup Information

**Backup Date:** 2025-12-07
**Database:** nody
**Format:** PostgreSQL custom format (-Fc)
**Total Employees:** 9,101
**Total Institutions:** 72

### Backup Contents:
- ✅ All tables (Employee, Institution, User, etc.)
- ✅ All data and relationships
- ✅ Indexes and constraints
- ✅ Sequences and default values
- ✅ Full schema definition

## 🔄 How to Restore the Database

### Option 1: Automatic Restore (Recommended)

Run the restore script without arguments to use the latest backup:

```bash
cd /home/nextjs/beky8
./restore-database.sh
```

Or specify a specific backup file:

```bash
./restore-database.sh /home/nextjs/beky8/nody_backup_20251207_045738.backup
```

### Option 2: Manual Restore

If you prefer to restore manually:

```bash
# 1. Set the database password
export PGPASSWORD=Mamlaka2020

# 2. Terminate existing connections
psql -h localhost -U postgres -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'nody'
    AND pid <> pg_backend_pid();
"

# 3. Drop and recreate the database
psql -h localhost -U postgres -d postgres -c "DROP DATABASE IF EXISTS nody;"
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE nody;"

# 4. Restore from backup
pg_restore -h localhost -U postgres -d nody -v /home/nextjs/beky8/nody_backup_20251207_045738.backup

# 5. (Optional) Run Prisma migrations
cd /home/nextjs
npx prisma migrate deploy

# 6. Unset password
unset PGPASSWORD
```

## 💾 Creating a New Backup

To create a new backup:

```bash
cd /home/nextjs/beky8
BACKUP_FILE="nody_backup_$(date +%Y%m%d_%H%M%S).backup"
PGPASSWORD=Mamlaka2020 pg_dump -h localhost -U postgres -d nody -F c -b -v -f "$BACKUP_FILE"
```

## ⚠️ Important Notes

1. **Data Loss Warning:** Restoring will **COMPLETELY REPLACE** the current database with the backup data. All current data will be lost!

2. **Prisma Compatibility:** This database is managed by Prisma ORM. After restoring, you may need to run Prisma migrations:
   ```bash
   cd /home/nextjs
   npx prisma migrate deploy
   ```

3. **Active Connections:** The restore script automatically terminates active database connections. Make sure to stop the application before restoring:
   ```bash
   pm2 stop csms-dev
   ```

4. **Backup Format:** The backups use PostgreSQL custom format (-Fc), which is compressed and allows selective restoration.

5. **Storage:** Keep multiple backups in different locations for redundancy.

## 🔍 Verifying the Backup

To verify the backup contents without restoring:

```bash
# List backup contents
pg_restore -l /home/nextjs/beky8/nody_backup_20251207_045738.backup

# Count tables in backup
pg_restore -l /home/nextjs/beky8/nody_backup_20251207_045738.backup | grep TABLE | wc -l
```

## 📋 Database Schema (Prisma-managed)

Main tables included in the backup:
- **Employee** - Employee records (9,101 records)
- **Institution** - Organizations (72 records)
- **User** - System users
- **PromotionRequest** - Promotion requests
- **ConfirmationRequest** - Confirmation requests
- **LwopRequest** - Leave without pay requests
- **CadreChangeRequest** - Cadre change requests
- **RetirementRequest** - Retirement requests
- **ResignationRequest** - Resignation requests
- **SeparationRequest** - Separation requests
- **ServiceExtensionRequest** - Service extension requests
- **Complaint** - Employee complaints
- **Notification** - System notifications
- **EmployeeCertificate** - Employee certificates

## 🆘 Troubleshooting

### Issue: "database is being accessed by other users"
**Solution:** Stop the application first:
```bash
pm2 stop csms-dev
```

### Issue: "pg_restore: error: could not execute query"
**Solution:** Make sure PostgreSQL is running and accessible:
```bash
sudo systemctl status postgresql
```

### Issue: "permission denied"
**Solution:** Make sure the restore script is executable:
```bash
chmod +x /home/nextjs/beky8/restore-database.sh
```

## 📞 Support

For issues or questions:
1. Check the error messages in the restore output
2. Verify PostgreSQL is running: `sudo systemctl status postgresql`
3. Check database credentials in `/home/nextjs/.env`
4. Review Prisma schema: `/home/nextjs/prisma/schema.prisma`

---

**Last Updated:** 2025-12-07
**Backup Version:** 1.0
**Created by:** Claude Code Assistant

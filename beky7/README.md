# CSMS Database Backup and Restore Package

**Created:** December 5, 2025
**Database:** nody (PostgreSQL)
**System:** Civil Service Management System (CSMS)

## 📦 Contents

This backup package contains:

1. **nody_backup_YYYYMMDD_HHMMSS.backup** - PostgreSQL custom format backup (compressed, faster restore)
2. **nody_backup_YYYYMMDD_HHMMSS.sql** - SQL format backup (human-readable, portable)
3. **restore-database.sh** - Automated restoration script
4. **README.md** - This documentation file

## 📊 Database Statistics

The backup includes all data from the CSMS system:

- **Total Employees:** 6,541
- **Database Size:** ~4.1 MB
- **Backup Date:** December 5, 2025

### Key Tables Included:

- Users (system accounts)
- Employees (all 6,541 employee records)
- Institutions (government organizations)
- Promotion Requests
- Confirmation Requests
- LWOP (Leave Without Pay) Requests
- Cadre Change Requests
- Retirement Requests
- Complaints and Reviews
- Audit Trails and Notifications

## 🚀 Quick Start - Restore to New Server

### Prerequisites

1. **PostgreSQL installed** (version 12 or higher recommended)
2. **Sufficient disk space** (at least 1 GB free)
3. **Network access** to the PostgreSQL server
4. **Database credentials** with superuser privileges

### Option 1: Using the Automated Script (Recommended)

```bash
# Make the script executable (if not already)
chmod +x restore-database.sh

# Run the restore script
./restore-database.sh

# Or specify custom connection parameters
./restore-database.sh -h localhost -p 5432 -U postgres -d nody -W YourPassword
```

The script will:

- ✓ Test database connection
- ✓ Create the database if it doesn't exist
- ✓ Restore all data from backup
- ✓ Verify the restoration
- ✓ Display record counts for validation

### Option 2: Manual Restoration

#### Using Custom Format Backup (Faster)

```bash
# Create the database
psql -h localhost -U postgres -c "CREATE DATABASE nody WITH ENCODING='UTF8';"

# Restore from custom backup
pg_restore -h localhost -U postgres -d nody -v nody_backup_*.backup

# Verify restoration
psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

#### Using SQL Format Backup (Alternative)

```bash
# Create the database
psql -h localhost -U postgres -c "CREATE DATABASE nody WITH ENCODING='UTF8';"

# Restore from SQL file
psql -h localhost -U postgres -d nody -f nody_backup_*.sql

# Verify restoration
psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

## 🔧 Post-Restoration Steps

### 1. Update Environment Variables

Update your `.env` file with the new database credentials:

```env
DATABASE_URL="postgresql://postgres:YourPassword@localhost:5432/nody"
```

### 2. Generate Prisma Client

```bash
cd /path/to/your/nextjs/app
npx prisma generate
```

### 3. Verify Database Connection

```bash
# Test Prisma connection
npx prisma db pull

# Or run a simple query
npx prisma studio
```

### 4. Start Your Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🔍 Verification Checklist

After restoration, verify these key metrics:

```sql
-- Should return 6,541
SELECT COUNT(*) FROM "Employee";

-- Check recent records exist
SELECT COUNT(*) FROM "PromotionRequest";
SELECT COUNT(*) FROM "ConfirmationRequest";
SELECT COUNT(*) FROM "Institution";
SELECT COUNT(*) FROM "User";

-- Verify data integrity
SELECT COUNT(*) FROM "Employee" WHERE "firstName" IS NOT NULL;
```

## 📋 Troubleshooting

### Issue: "Database already exists" error

**Solution:** Drop the existing database first:

```bash
psql -h localhost -U postgres -c "DROP DATABASE nody;"
```

Then re-run the restore script.

### Issue: Permission denied errors

**Solution:** Ensure you're using a PostgreSQL user with superuser privileges:

```bash
# Grant superuser (if needed)
psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

### Issue: Connection refused

**Solution:** Check PostgreSQL is running:

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL if needed
sudo systemctl start postgresql
```

### Issue: Encoding errors

**Solution:** Ensure database is created with UTF8 encoding:

```bash
psql -U postgres -c "CREATE DATABASE nody WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;"
```

## 🔐 Security Notes

1. **Protect backup files** - They contain sensitive employee data
2. **Secure credentials** - Never commit passwords to version control
3. **Use environment variables** - Store connection strings in `.env` files
4. **Limit access** - Only authorized personnel should have access to backups
5. **Encrypt in transit** - Use SSL for database connections in production

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Prisma documentation: https://www.prisma.io/docs
3. PostgreSQL documentation: https://www.postgresql.org/docs/

## 📝 Notes

- **Backup Format:** The `.backup` file uses PostgreSQL custom format (compressed)
- **SQL File:** The `.sql` file is plain text and can be edited if needed
- **Compatibility:** Compatible with PostgreSQL 12+
- **Platform:** Works on Linux, macOS, and Windows (with Git Bash or WSL)

## 🏗️ Database Schema Overview

The database follows a comprehensive HR management structure:

### Core Entities

- **Employee** - Full employee records with personal and professional data
- **User** - System authentication and authorization
- **Institution** - Government organizations and departments

### Request Types

- **PromotionRequest** - Employee promotion workflows
- **ConfirmationRequest** - Position confirmations
- **LwopRequest** - Leave without pay requests
- **CadreChangeRequest** - Position/cadre changes
- **RetirementRequest** - Retirement processing
- **Complaint** - Employee complaints and grievances

### Supporting Tables

- **Notification** - System notifications
- **AuditLog** - Activity tracking
- **Document** - File attachments and references

All tables use Prisma's generated IDs and include timestamp tracking.

---

**Backup Created:** December 5, 2025
**Package Location:** /home/nextjs/beky7
**Original Server:** localhost
**Total Records:** 6,541 employees + supporting data

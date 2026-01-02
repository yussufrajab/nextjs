# CSMS Production Database Backup

## Overview

This directory contains production-ready backups of the CSMS (Civil Service Management System) database after cleanup for production deployment.

**Backup Date:** December 4, 2024 20:17 UTC
**Database:** nody
**PostgreSQL Version:** Compatible with PostgreSQL 12+

## Backup Contents

### What's Included:

- **72 Institutions** with vote numbers and TIN numbers
- **27 System Users** (roles: ADMIN, HRO, CSCS, HHRMD, DO, HRMO, HRRP, PO, Admin)
- **Complete Database Schema** (all tables and relationships intact)
- **Empty transactional tables** (ready for production data)

### What's NOT Included:

- Employee records (removed for production)
- Employee user accounts (removed for production)
- Test/development request data (removed for production)
- Notifications (removed for production)
- Complaints (removed for production)

## System Users Preserved

### By Role:

- **ADMIN (1):** admin
- **Admin (2):** akassim, ymrajab
- **CSCS (1):** zhaji
- **DO (2):** maitest, mussi
- **HHRMD (3):** 4hhrmd, safiatest, skhamis
- **HRMO (2):** fautest, fiddi
- **HRO (14):** hro_commission, kmnyonge, ahmedm, fmakame, habdalla, lkali, mariamj, msalum, sali, skawesu, snjuma, yhzubeir, ajabdalla
- **HRRP (1):** khamadi
- **PO (1):** mishak

## Backup Files

### 1. Binary Format (.backup)

**File:** `nody_production_backup_20251204_201740.backup`
**Size:** 45KB
**Format:** PostgreSQL custom format (compressed)
**Use Case:** Faster restoration, smaller file size

### 2. SQL Format (.sql)

**File:** `nody_production_backup_20251204_201754.sql`
**Size:** 47KB
**Format:** Plain SQL text
**Use Case:** Human-readable, easier to modify or review

## How to Restore

### Option 1: Restore Binary Format (Recommended)

```bash
# Drop and recreate database
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS nody;"
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -c "CREATE DATABASE nody;"

# Restore from binary backup
PGPASSWORD=Mamlaka2020 pg_restore -h localhost -U postgres -d nody -v /home/nextjs/beky5/nody_production_backup_20251204_201740.backup
```

### Option 2: Restore SQL Format

```bash
# Drop and recreate database
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS nody;"
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -c "CREATE DATABASE nody;"

# Restore from SQL backup
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -f /home/nextjs/beky5/nody_production_backup_20251204_201754.sql
```

### Option 3: Restore to Different Database Name

```bash
# Create new database with different name
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -c "CREATE DATABASE nody_production;"

# Restore binary backup
PGPASSWORD=Mamlaka2020 pg_restore -h localhost -U postgres -d nody_production -v /home/nextjs/beky5/nody_production_backup_20251204_201740.backup
```

## Post-Restoration Steps

### 1. Verify Database Contents

```bash
# Check institution count (should be 72)
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"Institution\";"

# Check system user count (should be 27)
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"User\";"

# Check employee count (should be 0)
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"

# Check users by role
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "SELECT role, COUNT(*) FROM \"User\" GROUP BY role ORDER BY role;"
```

### 2. Update Prisma Client

```bash
cd /home/nextjs
npx prisma generate
```

### 3. Test System Access

- Test login with each system user role
- Verify institutions are visible
- Confirm all navigation menus work correctly

## Database Schema

### Tables:

1. **User** - System and employee users
2. **Employee** - Employee records (empty in production backup)
3. **Institution** - Government institutions (72 records)
4. **PromotionRequest** - Promotion requests (empty)
5. **ConfirmationRequest** - Confirmation requests (empty)
6. **LwopRequest** - Leave without pay requests (empty)
7. **RetirementRequest** - Retirement requests (empty)
8. **CadreChangeRequest** - Cadre change requests (empty)
9. **ResignationRequest** - Resignation requests (empty)
10. **SeparationRequest** - Separation requests (empty)
11. **ServiceExtensionRequest** - Service extension requests (empty)
12. **Complaint** - Employee complaints (empty)
13. **Notification** - System notifications (empty)
14. **EmployeeCertificate** - Employee certificates (empty)

## Security Notes

1. **Password Security:** All system user passwords are hashed using bcrypt
2. **Database Credentials:** Update database password in production environment
3. **User Access:** Review and update user permissions as needed for production
4. **Backup Security:** Store backups in secure location with restricted access

## Production Deployment Checklist

- [ ] Restore database from backup
- [ ] Update database connection credentials in .env
- [ ] Run Prisma generate
- [ ] Test all system user logins
- [ ] Verify institution data is correct
- [ ] Configure production environment variables
- [ ] Set up automated database backups
- [ ] Test HRIMS integration
- [ ] Verify file upload functionality
- [ ] Test email notifications (if configured)
- [ ] Set up monitoring and logging

## Data Population

After restoration, you can populate the system with production employee data using:

1. **Individual Fetch:** Use the admin dashboard at `/dashboard/admin/fetch-data`
2. **Bulk Fetch:** Run the automated script:
   ```bash
   cd /home/nextjs
   npx tsx scripts/fetch-all-institutions.ts
   ```

## Support and Maintenance

### Backup Script Location

The cleanup script used to prepare this backup is available at:
`/home/nextjs/scripts/production-cleanup.sql`

### Automated Fetch Script

The script to fetch employee data from HRIMS:
`/home/nextjs/scripts/fetch-all-institutions.ts`

### Important Notes

- Always test backup restoration in a non-production environment first
- Keep multiple backup copies in different locations
- Document any manual changes made to production data
- Schedule regular automated backups

## Troubleshooting

### Common Issues:

**Issue:** pg_restore fails with permission errors
**Solution:** Ensure PostgreSQL user has CREATE DATABASE permission

**Issue:** Tables are not empty after restoration
**Solution:** This backup should have empty transactional tables. Check backup file used.

**Issue:** System users cannot login
**Solution:** Verify user passwords haven't been modified. Default test passwords may need reset.

**Issue:** Institutions are missing vote numbers
**Solution:** 6 institutions don't have vote numbers or TIN numbers. This is expected.

## Contact

For questions or issues with this backup, contact the system administrator.

---

**Last Updated:** December 4, 2024
**Backup Version:** Production v1.0
**Database:** nody (PostgreSQL)

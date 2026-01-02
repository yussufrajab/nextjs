# HR Management System - mfumo3 Migration Guide

This guide provides complete instructions for migrating your HR Management System database from the current server to a new VPS with PostgreSQL and an empty `mfumo3` database.

## Overview

This migration process will:
1. Create a backup of your current database
2. Transfer the backup to the target VPS
3. Restore the data to the `mfumo3` database
4. Configure the application to use the new database

## Prerequisites

### Source Server (Current)
- HR Management System running
- PostgreSQL with current database
- Valid `.env` file with `DATABASE_URL`

### Target VPS
- Ubuntu/Linux with PostgreSQL installed
- Empty database named `mfumo3` created
- PostgreSQL user `postgres` with password `password`
- HR Management System application deployed (but no database)

## Migration Process

### Step 1: Create Backup on Source Server

1. **Navigate to your project directory**:
   ```bash
   cd /path/to/hr-management-system
   ```

2. **Run the backup script**:
   ```bash
   ./backup-to-mfumo3.sh
   ```

   This will create:
   - `backups/mfumo3_migration_YYYYMMDD_HHMMSS.sql`
   - `backups/mfumo3_migration_YYYYMMDD_HHMMSS.sql.gz` (compressed)

### Step 2: Transfer Backup to Target VPS

```bash
# Copy the backup file to target VPS
scp backups/mfumo3_migration_YYYYMMDD_HHMMSS.sql user@target-vps:/path/to/app/

# Or copy the compressed version
scp backups/mfumo3_migration_YYYYMMDD_HHMMSS.sql.gz user@target-vps:/path/to/app/
```

### Step 3: Prepare Target VPS

1. **Ensure PostgreSQL is running**:
   ```bash
   sudo systemctl status postgresql
   sudo systemctl start postgresql  # if not running
   ```

2. **Verify mfumo3 database exists**:
   ```bash
   sudo -u postgres psql -l | grep mfumo3
   ```

3. **If database doesn't exist, create it**:
   ```bash
   sudo -u postgres createdb mfumo3
   sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
   ```

4. **Verify .env file in application directory**:
   ```bash
   cd /path/to/app
   cat .env
   ```
   
   Should contain:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/mfumo3?schema=public"
   ```

### Step 4: Restore Database on Target VPS

1. **Navigate to application directory**:
   ```bash
   cd /path/to/app
   ```

2. **Make restore script executable** (if not already):
   ```bash
   chmod +x restore-from-backup.sh
   ```

3. **Run the restore script**:
   ```bash
   ./restore-from-backup.sh mfumo3_migration_YYYYMMDD_HHMMSS.sql
   
   # Or for compressed backup:
   ./restore-from-backup.sh mfumo3_migration_YYYYMMDD_HHMMSS.sql.gz
   ```

### Step 5: Setup Application on Target VPS

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Start the application**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   
   # Background production mode
   nohup npm start > production.log 2>&1 &
   ```

## Verification

### Database Verification
```bash
# Connect to mfumo3 database
psql -h localhost -U postgres -d mfumo3

# Check tables
\dt

# Check data counts
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Employee";
SELECT COUNT(*) FROM "Institution";
```

### Application Verification
1. Access the application via browser
2. Test login functionality
3. Verify dashboard loads with correct data
4. Test a few key features (requests, employee management)

## Troubleshooting

### Common Issues

**1. Connection refused to PostgreSQL**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
sudo systemctl start postgresql

# Check PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

**2. Database mfumo3 doesn't exist**
```bash
sudo -u postgres createdb mfumo3
```

**3. Authentication failed for user postgres**
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"
```

**4. Permission denied for database**
```bash
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mfumo3 TO postgres;"
```

**5. Application shows database connection errors**
- Verify `.env` file contains correct DATABASE_URL
- Check if Prisma client is generated: `npx prisma generate`
- Restart the application

**6. Tables not found errors**
- Verify backup was restored successfully
- Check table names are case-sensitive in PostgreSQL
- Run: `psql -h localhost -U postgres -d mfumo3 -c "\\dt"`

### Rollback Process

If migration fails and you need to rollback:

1. **Restore original database** (if you have a backup)
2. **Update .env** to point back to original database
3. **Restart application**

## Post-Migration Tasks

1. **Update any external integrations** to point to new server
2. **Update DNS records** if changing domains
3. **Setup monitoring** for the new server
4. **Configure backups** for the mfumo3 database
5. **Test all application features** thoroughly
6. **Update documentation** with new server details

## Scripts Reference

- `backup-to-mfumo3.sh` - Creates migration backup from current database
- `restore-from-backup.sh` - Restores backup to mfumo3 database
- `MFUMO3_MIGRATION_GUIDE.md` - This migration guide

## Security Notes

- Change default passwords after migration
- Review PostgreSQL security configuration
- Ensure firewall is properly configured
- Regular backup schedule for mfumo3 database
- Monitor logs for any suspicious activity

## Support

If you encounter issues during migration:
1. Check the script output for specific error messages
2. Verify all prerequisites are met
3. Check PostgreSQL logs: `/var/log/postgresql/`
4. Ensure sufficient disk space for backup/restore operations
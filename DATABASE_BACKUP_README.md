# Database Backup and Restore Guide

This guide provides instructions for backing up and restoring the HR Management System PostgreSQL database.

## Overview

The HR Management System uses PostgreSQL with Prisma ORM. This guide includes:
- Automated backup script that reads from your `.env` file
- Restore script optimized for existing PostgreSQL installations
- Support for both fresh installations and pre-configured systems

## Files

- `backup-database.sh` - Creates timestamped backups from your local database
- `restore-database.sh` - Restores backup to target system with existing PostgreSQL
- `DATABASE_BACKUP_README.md` - This documentation file

## Backup Process

### Prerequisites
- PostgreSQL client tools (`pg_dump`) installed locally
- Valid `.env` file with `DATABASE_URL`
- Database access permissions

### Running the Backup

1. **Navigate to project directory**:
   ```bash
   cd /path/to/your/hr-management-system
   ```

2. **Run the backup script**:
   ```bash
   ./backup-database.sh
   ```

The backup script will:
- Read database credentials from your `.env` file
- Create a `backups/` directory
- Generate timestamped SQL backup file
- Create compressed version (.gz)
- Display backup information

### Backup Output
```
backups/
├── hr_backup_20240115_143022.sql     # Full SQL backup
└── hr_backup_20240115_143022.sql.gz  # Compressed version
```

## Restore Process

### Prerequisites for Target System
- Ubuntu 22.04 LTS (or existing PostgreSQL installation)
- PostgreSQL already installed and running
- Empty database named "mfumo2" created
- Database user "postgres" with password "password"

### For Systems with Pre-existing PostgreSQL

If your target system already has PostgreSQL installed with the mfumo2 database:

1. **Copy backup file to target system**:
   ```bash
   scp hr_backup_YYYYMMDD_HHMMSS.sql user@target-server:/home/user/
   ```

2. **Make the restore script executable**:
   ```bash
   chmod +x restore-database.sh
   ```

3. **Run the restore script**:
   ```bash
   ./restore-database.sh /path/to/backup/hr_backup_YYYYMMDD_HHMMSS.sql
   ```

The restore script will:
- Connect to existing PostgreSQL installation
- Verify access to mfumo2 database
- Clear any existing data (ensure clean restore)
- Restore the backup data and schema
- Verify successful restoration
- Provide next steps for application setup

### Database Configuration
The restore script is pre-configured for:
- **Host**: localhost
- **Port**: 5432
- **Database**: mfumo2
- **User**: postgres
- **Password**: password

### For Fresh Ubuntu 22.04 Installation

If you need to install PostgreSQL from scratch, you can modify the script or manually install:

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres createdb mfumo2
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'password';"

# Then run the restore script
./restore-database.sh /path/to/backup/hr_backup_YYYYMMDD_HHMMSS.sql
```

## Post-Restore Application Setup

After successful database restore, configure your application:

1. **Update .env file** on target system:
   ```bash
   DATABASE_URL="postgresql://postgres:password@localhost:5432/mfumo2?schema=public"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```

4. **Build and start application**:
   ```bash
   npm run build
   npm start
   ```

## Troubleshooting

### Backup Issues

**Error: "DATABASE_URL not found in .env file"**
- Ensure your `.env` file exists in the project root
- Verify the `DATABASE_URL` line is not commented out
- Check for proper formatting: `DATABASE_URL="postgresql://..."`

**Error: "pg_dump: command not found"**
```bash
# Ubuntu/Debian
sudo apt install postgresql-client

# macOS
brew install postgresql
```

### Restore Issues

**Error: "Cannot connect to PostgreSQL database"**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database exists: `sudo -u postgres psql -l | grep mfumo2`
- Verify user credentials and permissions

**Error: "Permission denied"**
- Ensure user has access to the database
- Check PostgreSQL authentication configuration
- Verify password is correct

## Best Practices

1. **Regular Backups**: Schedule daily backups using cron
2. **Test Restores**: Periodically test restore process
3. **Secure Storage**: Store backups in secure, offsite location
4. **Version Control**: Keep backup scripts in version control
5. **Documentation**: Maintain restore procedures documentation

## Automation

### Daily Backup Cron Job
```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/hr-system && ./backup-database.sh >> backup.log 2>&1
```

### Backup Retention Script
```bash
# Keep only last 7 days of backups
find ./backups/ -name "hr_backup_*.sql*" -mtime +7 -delete
```

## Security Considerations

- Store database passwords securely
- Limit backup file access permissions
- Use encrypted storage for sensitive backups
- Regularly rotate database credentials
- Monitor backup access logs
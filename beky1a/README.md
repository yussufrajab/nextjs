# CSMS Database Backup Package

**Created:** January 03, 2026
**Database:** nody
**System:** Civil Service Management System (CSMS)
**Platform:** Ubuntu 24.04 LTS
**PostgreSQL Version:** psql (PostgreSQL) 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

## 📦 Contents

This backup package contains:

1. **nody_backup_20260103_202114.backup** - PostgreSQL custom format backup (compressed)
2. **nody_backup_20260103_202114.sql** - SQL format backup (plain text)
3. **nody_backup_20260103_202114_checksums.txt** - File integrity checksums
4. **nody_backup_20260103_202114_verification.txt** - Detailed backup verification report
5. **restore-database.sh** - Automated restoration script
6. **backup-database.sh** - This backup script
7. **README.md** - This documentation file

## 📊 Database Statistics

- **Database Size:** 21 MB
- **Backup Date:** Sat Jan  3 08:22:14 PM UTC 2026
- **Total Tables:** 0

### Key Tables:


## 🚀 Quick Start - Restore Database

### Using the Automated Restoration Script (Recommended)

```bash
# Navigate to backup directory
cd /home/latest/beky1a

# Make restore script executable
chmod +x restore-database.sh

# Run the restore script
./restore-database.sh

# Or with custom parameters
./restore-database.sh -h localhost -p 5432 -U postgres -d nody
```

### Manual Restoration

#### Using Custom Format (Faster)

```bash
# Create database
psql -U postgres -c "CREATE DATABASE nody WITH ENCODING='UTF8';"

# Restore from backup
pg_restore -U postgres -d nody nody_backup_20260103_202114.backup

# Verify
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

#### Using SQL Format

```bash
# Create database
psql -U postgres -c "CREATE DATABASE nody WITH ENCODING='UTF8';"

# Restore from SQL file
psql -U postgres -d nody -f nody_backup_20260103_202114.sql

# Verify
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

## 🔧 Post-Restoration Steps

### 1. Update Environment Variables

Update your `.env` file:

```env
DATABASE_URL="postgresql://postgres:YourPassword@localhost:5432/nody?schema=public"
```

### 2. Generate Prisma Client

```bash
cd /path/to/your/app
npx prisma generate
```

### 3. Verify Database Connection

```bash
npx prisma db pull
npx prisma studio  # Opens database browser
```

### 4. Start Your Application

```bash
npm run dev    # Development
npm run build  # Production build
npm start      # Production
```

## 🔍 Verify Backup Integrity

Check SHA256 checksums:

```bash
sha256sum -c nody_backup_20260103_202114_checksums.txt
```

## 📋 Troubleshooting

### Database Already Exists

```bash
psql -U postgres -c "DROP DATABASE nody;"
```

### Permission Denied

```bash
psql -U postgres -c "ALTER USER postgres WITH SUPERUSER;"
```

### Connection Refused

```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

## 🔐 Security Notes

- **Protect backup files** - Contains sensitive employee data
- **Encrypt backups** - Use encryption for backups at rest
- **Secure transfer** - Use SSH/SCP for transferring backups
- **Access control** - Limit access to authorized personnel
- **Regular testing** - Periodically test backup restoration

## 📞 Support

For assistance:

- Review the verification report: `nody_backup_20260103_202114_verification.txt`
- Check PostgreSQL logs: `/var/log/postgresql/`
- Prisma documentation: https://www.prisma.io/docs

---

**Created with:** CSMS Database Backup Script v1.0
**Platform:** Ubuntu 24.04 LTS
**PostgreSQL + Prisma ORM**

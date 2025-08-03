# CSMS Database Backup & Restore Scripts

Scripts for backing up and restoring the CSMS PostgreSQL database with dual ORM support (Prisma + Hibernate).

## Files

- `backup_prizma.sh` - Creates database backup
- `restore_prizma.sh` - Restores database to target server
- `target_config.env` - Configuration template for target server
- `backup_prizma.bat` - Windows batch version of backup script
- `restore_prizma.bat` - Windows batch version of restore script

## Usage

### 1. Create Backup (Source Server)

```bash
# Make script executable
chmod +x backup_prizma.sh

# Run backup
./backup_prizma.sh
```

This creates:
- `./backups/prizma_backup_YYYYMMDD_HHMMSS.sql`
- `./backups/backup_YYYYMMDD_HHMMSS_info.txt`

### 2. Configure Target Server

Copy and edit the configuration file:

```bash
cp target_config.env my_target.env
# Edit my_target.env with your target server details
```

### 3. Restore to Target Server

```bash
# Make script executable
chmod +x restore_prizma.sh

# Copy backup file to target server
scp ./backups/prizma_backup_*.sql user@target-server:/path/to/scripts/

# Run restore with custom config
./restore_prizma.sh prizma_backup_20250730_123456.sql my_target.env

# Or run with default config (target_config.env)
./restore_prizma.sh prizma_backup_20250730_123456.sql
```

## Windows Usage

Use the `.bat` versions on Windows systems:

```cmd
backup_prizma.bat
restore_prizma.bat backup_file.sql
```

## Important Notes

- **Dual ORM Support**: These scripts preserve compatibility with both Prisma and Hibernate
- **Schema Preservation**: All tables, sequences, and constraints are maintained
- **Data Integrity**: Full data backup with referential integrity
- **Configuration**: Update your application configs after restore:
  - Backend: `application.properties` 
  - Frontend: `.env` DATABASE_URL
- **Post-Restore**: Run `npx prisma generate` in frontend after restore

## Security

- Never commit actual credentials to version control
- Use environment-specific config files
- Ensure secure transfer of backup files
- Verify target server firewall settings

## Troubleshooting

- Ensure PostgreSQL client tools are installed
- Check network connectivity to target server
- Verify user permissions on target database
- Use `prod` profile on backend to validate schema after restore
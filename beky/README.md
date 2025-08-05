# CSMS Database Migration to Ubuntu VPS

This directory contains everything needed to migrate the CSMS (Civil Service Management System) database from Windows 11 to an Ubuntu VPS.

## Quick Start (Windows 11)

1. **Check requirements**:
   ```powershell
   .\beky\scripts\check-requirements.ps1
   ```

2. **Backup current database**:
   ```powershell
   # PowerShell (Recommended)
   .\beky\scripts\backup-database.ps1
   
   # OR CMD
   .\beky\scripts\backup-database.cmd
   ```

3. **Upload to VPS**:
   ```powershell
   .\beky\scripts\upload-to-vps.ps1 -VpsIp "YOUR_VPS_IP" -VpsUser "ubuntu"
   ```

4. **Complete setup on VPS** (SSH into VPS):
   ```bash
   ssh ubuntu@YOUR_VPS_IP
   cd /home/ubuntu/csms-app
   nano .env  # Edit database credentials
   bash beky/scripts/ubuntu-vps-setup.sh
   bash beky/scripts/deploy-vps.sh
   ```

## Directory Structure

```
beky/
├── scripts/
│   ├── backup-database.sh      # Backup Prisma database and migrations
│   ├── ubuntu-vps-setup.sh     # Setup Ubuntu VPS environment
│   ├── restore-database.sh     # Restore database using Prisma migrations
│   └── deploy-vps.sh          # Complete VPS deployment
├── config/
│   ├── .env.production        # Production environment template
│   ├── nginx.conf             # Nginx reverse proxy configuration
│   └── csms.service           # Systemd service configuration
├── docs/
│   └── MIGRATION_GUIDE.md     # Detailed migration guide
└── README.md                  # This file
```

## Files Overview

### Scripts

#### Windows Scripts
- **`check-requirements.ps1`**: Checks if all required tools are installed on Windows
- **`backup-database.ps1`**: PowerShell script to backup database and Prisma files
- **`backup-database.cmd`**: CMD script to backup database and Prisma files  
- **`upload-to-vps.ps1`**: PowerShell script to upload files to Ubuntu VPS

#### Ubuntu VPS Scripts  
- **`ubuntu-vps-setup.sh`**: Installs PostgreSQL, Node.js, and sets up the Ubuntu VPS environment
- **`restore-database.sh`**: Restores the database using Prisma migrations (recommended approach)
- **`deploy-vps.sh`**: Complete deployment script that builds and starts the application

### Configuration

- **`.env.production`**: Template for production environment variables
- **`nginx.conf`**: Nginx configuration for reverse proxy and SSL
- **`csms.service`**: Systemd service configuration for auto-start and process management

### Documentation

- **`MIGRATION_GUIDE.md`**: Comprehensive step-by-step migration guide with troubleshooting

## Key Features

- ✅ **Prisma-first approach**: Uses Prisma migrations instead of SQL dumps
- ✅ **Complete automation**: Scripts handle the entire migration process
- ✅ **Production-ready**: Includes Nginx, SSL, and systemd service configuration
- ✅ **Rollback support**: Backup strategy allows easy rollback if needed
- ✅ **Security**: Proper user permissions and security configurations

## Migration Strategy

This migration uses **Prisma migrations** rather than direct SQL dumps because:

1. **Schema consistency**: Ensures exact schema match between environments
2. **Version control**: Migration history is preserved
3. **Rollback capability**: Easy to rollback specific migrations
4. **Data integrity**: Prisma handles foreign key constraints properly
5. **Future updates**: Seamless for future schema changes

## Requirements

### Source (Windows)
- PostgreSQL with `nody` database
- Node.js and npm
- Prisma CLI

### Target (Ubuntu VPS)
- Ubuntu 18.04+ 
- Sudo access
- At least 2GB RAM
- 20GB+ storage

## Quick Commands

### Windows Commands
```powershell
# Check requirements
.\beky\scripts\check-requirements.ps1

# Backup database (PowerShell)
.\beky\scripts\backup-database.ps1

# Backup database (CMD)  
.\beky\scripts\backup-database.cmd

# Upload to VPS
.\beky\scripts\upload-to-vps.ps1 -VpsIp "YOUR_IP" -VpsUser "ubuntu"
```

### Ubuntu VPS Commands
```bash
# Setup VPS environment
bash beky/scripts/ubuntu-vps-setup.sh

# Deploy application  
bash beky/scripts/deploy-vps.sh

# Check application status
sudo systemctl status csms

# View application logs
sudo journalctl -u csms -f

# Restart application
sudo systemctl restart csms
```

## Support

For detailed instructions, see `docs/MIGRATION_GUIDE.md`

Common issues and solutions are documented in the migration guide.
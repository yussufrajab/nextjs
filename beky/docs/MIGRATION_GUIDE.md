# CSMS Database Migration Guide
## Migrating nody Database from Windows to Ubuntu VPS

This guide provides step-by-step instructions for migrating the Civil Service Management System (CSMS) PostgreSQL database from Windows to an Ubuntu VPS using Prisma ORM.

## Overview

The CSMS application uses:
- **Frontend/Backend**: Next.js 14 full-stack application
- **Database**: PostgreSQL with Prisma ORM
- **Port**: 9002
- **Database Name**: nody

## Migration Strategy

Since this is a Prisma-managed database, we'll use **Prisma migrations** instead of direct SQL dumps for the cleanest migration.

## Prerequisites

- Ubuntu VPS with sudo access
- Source database accessible (current Windows setup)
- Domain name (optional, can use IP address initially)

## Step-by-Step Migration

### Phase 1: Backup Current Database

1. **Navigate to your project directory**:
   ```bash
   cd C:\hamisho\nextjs\frontend
   ```

2. **Run the backup script**:
   ```bash
   bash beky/scripts/backup-database.sh
   ```

   This creates:
   - `backups/nody_backup_[timestamp].sql.gz` - Database dump
   - `backups/prisma_files_[timestamp].tar.gz` - Prisma schema and migrations

### Phase 2: Setup Ubuntu VPS

1. **Copy setup script to VPS**:
   ```bash
   scp beky/scripts/ubuntu-vps-setup.sh user@your-vps-ip:~/
   ```

2. **SSH into VPS and run setup**:
   ```bash
   ssh user@your-vps-ip
   chmod +x ubuntu-vps-setup.sh
   ./ubuntu-vps-setup.sh
   ```

3. **Change database password** (IMPORTANT):
   ```bash
   sudo -u postgres psql -c "ALTER USER nody_user PASSWORD 'your_new_secure_password';"
   ```

### Phase 3: Deploy Application

1. **Transfer your application files**:
   ```bash
   # Option A: Git clone (recommended)
   cd /home/ubuntu/csms-app
   git clone your-repository-url .
   
   # Option B: SCP transfer
   scp -r /path/to/your/nextjs/project/* user@your-vps-ip:/home/ubuntu/csms-app/
   ```

2. **Transfer Prisma backup**:
   ```bash
   scp backups/prisma_files_[timestamp].tar.gz user@your-vps-ip:/home/ubuntu/csms-app/
   cd /home/ubuntu/csms-app
   tar -xzf prisma_files_[timestamp].tar.gz
   ```

3. **Setup environment variables**:
   ```bash
   cp beky/config/.env.production .env
   # Edit .env with your actual values:
   nano .env
   ```

   Update these values:
   - `your-vps-ip` → Your actual VPS IP address
   - `your_secure_password` → Your database password
   - `your_production_gemini_api_key_here` → Your Gemini API key

### Phase 4: Database Migration

1. **Run the restore script**:
   ```bash
   chmod +x beky/scripts/restore-database.sh
   ./beky/scripts/restore-database.sh
   ```

2. **Verify migration**:
   ```bash
   npx prisma studio
   # Access at http://your-vps-ip:5555
   ```

### Phase 5: Application Deployment

1. **Install dependencies and build**:
   ```bash
   npm install
   npm run build
   ```

2. **Setup systemd service**:
   ```bash
   sudo cp beky/config/csms.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable csms
   sudo systemctl start csms
   sudo systemctl status csms
   ```

3. **Setup Nginx (optional but recommended)**:
   ```bash
   sudo apt install nginx
   sudo cp beky/config/nginx.conf /etc/nginx/sites-available/csms
   sudo ln -s /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Phase 6: SSL Setup (Optional)

1. **Install Certbot**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Update Nginx configuration**:
   - Uncomment HTTPS section in `/etc/nginx/sites-available/csms`
   - Update domain names
   - Restart Nginx

## Verification Checklist

- [ ] PostgreSQL service running
- [ ] Database `nody` exists with correct schema
- [ ] All Prisma migrations applied
- [ ] Next.js application builds successfully
- [ ] Application starts on port 9002
- [ ] API endpoints respond correctly
- [ ] Database connections work
- [ ] File uploads/downloads function
- [ ] Nginx proxy working (if configured)
- [ ] SSL certificate valid (if configured)

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check database exists
   sudo -u postgres psql -l | grep nody
   
   # Test connection
   npx prisma db ping
   ```

2. **Migration Errors**:
   ```bash
   # Reset and re-migrate
   npx prisma migrate reset
   npx prisma migrate deploy
   ```

3. **Application Won't Start**:
   ```bash
   # Check logs
   sudo journalctl -u csms -f
   
   # Check port availability
   sudo netstat -tlnp | grep :9002
   ```

4. **Nginx Issues**:
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

## Useful Commands

```bash
# Application management
sudo systemctl start csms
sudo systemctl stop csms
sudo systemctl restart csms
sudo systemctl status csms

# Database management
npx prisma studio               # Open database browser
npx prisma migrate status       # Check migration status
npx prisma migrate deploy       # Apply pending migrations
npx prisma migrate reset        # Reset database
npx prisma generate            # Regenerate Prisma client

# Logs
sudo journalctl -u csms -f     # Application logs
sudo tail -f /var/log/nginx/access.log  # Nginx access logs
sudo tail -f /var/log/nginx/error.log   # Nginx error logs
```

## Post-Migration Tasks

1. **Update DNS** to point to VPS IP
2. **Test all application features**
3. **Setup database backups**
4. **Configure monitoring** (optional)
5. **Update any hardcoded URLs** in the application

## Rollback Plan

If migration fails:

1. **Restore original database**:
   ```bash
   gunzip -c backups/nody_backup_[timestamp].sql.gz | psql -h localhost -U postgres -d nody
   ```

2. **Revert to Windows environment**
3. **Investigate and fix issues**
4. **Retry migration**

## Support

For issues during migration:
- Check application logs: `sudo journalctl -u csms -f`
- Verify Prisma connection: `npx prisma db ping`
- Test database directly: `sudo -u postgres psql -d nody`
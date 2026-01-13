# CSMS Complete Restoration Guide

**Created:** January 13, 2026
**System:** Civil Service Management System (CSMS)
**Platform:** Ubuntu 24.04 LTS
**Purpose:** Complete restoration to a new VPS

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Backup Package Contents](#backup-package-contents)
4. [Step-by-Step Restoration](#step-by-step-restoration)
5. [Post-Restoration Configuration](#post-restoration-configuration)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Security Hardening](#security-hardening)

---

## 🎯 Overview

This guide will walk you through the complete restoration of the CSMS application to a fresh Ubuntu 24.04 LTS VPS. The restoration process includes:

- Setting up all required system dependencies
- Restoring the PostgreSQL database
- Configuring environment variables
- Deploying the application
- Setting up background services
- Configuring storage (MinIO)

**Total estimated time:** 45-60 minutes

---

## ✅ Prerequisites

### What You Need

- **Fresh VPS Server**
  - Ubuntu 24.04 LTS (recommended)
  - Minimum 2 CPU cores
  - Minimum 4GB RAM
  - Minimum 40GB disk space
  - Root or sudo access

- **This Backup Package**
  - The complete `/beky2a` folder
  - All scripts and database backups

- **Access Credentials**
  - VPS root/sudo password
  - Your domain (if using custom domain)

### Before You Begin

1. **SSH into your new VPS:**
   ```bash
   ssh root@YOUR_VPS_IP
   ```

2. **Transfer the backup package to the VPS:**
   ```bash
   # On your local machine:
   scp -r beky2a root@YOUR_VPS_IP:/root/

   # Or use SFTP, rsync, or any file transfer method
   ```

---

## 📦 Backup Package Contents

Your `beky2a` folder contains:

```
beky2a/
├── database/                           # Database backups
│   ├── nody_backup_YYYYMMDD_HHMMSS.backup
│   ├── nody_backup_YYYYMMDD_HHMMSS.sql
│   ├── nody_backup_YYYYMMDD_HHMMSS_checksums.txt
│   ├── nody_backup_YYYYMMDD_HHMMSS_verification.txt
│   └── README.md
├── scripts/                            # Automation scripts
│   ├── setup-new-vps.sh               # VPS initial setup
│   ├── deploy-app.sh                  # Application deployment
│   ├── backup-database.sh             # Database backup script
│   └── restore-database.sh            # Database restore script
├── config/                             # Configuration files
│   ├── .env.template                  # Environment variables template
│   ├── ecosystem.config.js            # PM2 process configuration
│   └── schema.prisma                  # Database schema
├── application/                        # Application metadata
│   └── package.json                   # Dependencies list
└── docs/                              # Documentation
    └── RESTORATION_GUIDE.md           # This file
```

---

## 🚀 Step-by-Step Restoration

### Phase 1: Initial VPS Setup (15-20 minutes)

#### Step 1.1: Prepare the VPS

```bash
# Update system
apt-get update && apt-get upgrade -y

# Navigate to backup directory
cd /root/beky2a/scripts
```

#### Step 1.2: Run VPS Setup Script

This script will install all required software (Node.js, PostgreSQL, Redis, MinIO, PM2).

```bash
# Make script executable
chmod +x setup-new-vps.sh

# Run the setup
./setup-new-vps.sh
```

**What this installs:**
- Node.js 20.x LTS
- PostgreSQL 16
- Redis Server
- MinIO Object Storage
- PM2 Process Manager
- Required system dependencies

**During setup, you'll be prompted for:**
- PostgreSQL postgres user password (default: Mamlaka2020)
- Confirmation to continue

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║         VPS Setup Completed Successfully!                     ║
╚════════════════════════════════════════════════════════════════╝
```

---

### Phase 2: Upload Application Code (5-10 minutes)

#### Step 2.1: Transfer Application Code

You need to get your application source code to the VPS. Choose one method:

**Method A: Using Git (Recommended)**
```bash
cd /home/latest
git clone YOUR_REPOSITORY_URL .
```

**Method B: Using SCP**
```bash
# From your local machine:
scp -r /path/to/your/csms-app/* root@YOUR_VPS_IP:/home/latest/
```

**Method C: Using rsync**
```bash
# From your local machine:
rsync -avz /path/to/your/csms-app/ root@YOUR_VPS_IP:/home/latest/
```

#### Step 2.2: Verify Application Files

```bash
cd /home/latest
ls -la

# You should see:
# - package.json
# - src/ directory
# - prisma/ directory
# - next.config.js
# - etc.
```

---

### Phase 3: Database Restoration (5-10 minutes)

#### Step 3.1: Restore Database

```bash
cd /home/latest/beky2a/database

# Make restore script executable
chmod +x restore-database.sh

# Run restore script
./restore-database.sh
```

**You'll be prompted for:**
- PostgreSQL password (the one you set during VPS setup)
- Confirmation to restore

**The script will:**
1. Show available backup files
2. Auto-select the latest backup
3. Drop existing database (if exists)
4. Create fresh database
5. Restore all data
6. Verify restoration

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║         Database Restore Completed Successfully!              ║
╚════════════════════════════════════════════════════════════════╝
```

#### Step 3.2: Verify Database

```bash
# Check if database exists and has data
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"User\";"
```

---

### Phase 4: Application Configuration (5 minutes)

#### Step 4.1: Create Environment File

```bash
cd /home/latest

# Copy template
cp beky2a/config/.env.template .env

# Edit with your values
nano .env
```

#### Step 4.2: Configure Critical Variables

Update these values in your `.env` file:

```env
# Application URL (replace with your domain or IP)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com

# Database (update password if you changed it)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nody?schema=public"

# MinIO (update IP to your server IP)
NEXT_PUBLIC_MINIO_ENDPOINT=http://YOUR_SERVER_IP:9000
MINIO_CONSOLE_URL=http://YOUR_SERVER_IP:9001

# AI Configuration (add your Gemini API key)
GEMINI_API_KEY=your_actual_gemini_api_key

# CSRF Secret (generate with: openssl rand -base64 32)
CSRF_SECRET=your_generated_secret_key
```

**To generate a secure CSRF secret:**
```bash
openssl rand -base64 32
```

#### Step 4.3: Copy PM2 Configuration

```bash
cp beky2a/config/ecosystem.config.js /home/latest/
```

---

### Phase 5: Application Deployment (10-15 minutes)

#### Step 5.1: Run Deployment Script

```bash
cd /home/latest

# Make script executable
chmod +x beky2a/scripts/deploy-app.sh

# Run deployment
./beky2a/scripts/deploy-app.sh
```

**The script will:**
1. Verify all prerequisites
2. Install npm dependencies
3. Generate Prisma Client
4. Verify database connection
5. Build Next.js application
6. Set up MinIO buckets
7. Start application with PM2
8. Verify deployment

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║         Deployment Completed Successfully!                    ║
╚════════════════════════════════════════════════════════════════╝
```

#### Step 5.2: Verify Application is Running

```bash
# Check PM2 processes
pm2 list

# Check application logs
pm2 logs csms-app --lines 50

# Test HTTP response
curl http://localhost:9002
```

---

## ⚙️ Post-Restoration Configuration

### Configure Domain and SSL

#### Option A: Using Nginx as Reverse Proxy

1. **Install Nginx:**
   ```bash
   apt-get install -y nginx certbot python3-certbot-nginx
   ```

2. **Create Nginx configuration:**
   ```bash
   nano /etc/nginx/sites-available/csms
   ```

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:9002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Enable site:**
   ```bash
   ln -s /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

4. **Install SSL certificate:**
   ```bash
   certbot --nginx -d your-domain.com
   ```

#### Option B: Using aaPanel (If installed)

1. Create new website in aaPanel
2. Configure reverse proxy to `localhost:9002`
3. Enable SSL through aaPanel interface

### Configure Automated Backups

```bash
# Create backup script cron job
crontab -e

# Add this line for daily backups at 2 AM:
0 2 * * * cd /home/latest/beky2a/scripts && ./backup-database.sh -W "YOUR_PASSWORD" >> /var/log/csms-backup.log 2>&1
```

---

## ✅ Verification

### System Health Checks

```bash
# 1. Check PostgreSQL
systemctl status postgresql
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"

# 2. Check Redis
systemctl status redis-server
redis-cli ping  # Should return PONG

# 3. Check MinIO
systemctl status minio
curl http://localhost:9000/minio/health/live  # Should return OK

# 4. Check Application
pm2 list
pm2 logs csms-app --lines 20

# 5. Check HTTP Response
curl -I http://localhost:9002  # Should return 200 OK

# 6. Check from browser
# Open: http://YOUR_SERVER_IP:9002
```

### Application Functionality Tests

1. **Login Test:**
   - Open application in browser
   - Try logging in with a known user account

2. **Database Test:**
   - Navigate to employee list
   - Verify data is displayed correctly

3. **File Upload Test:**
   - Try uploading a document
   - Verify MinIO storage is working

4. **Background Jobs Test:**
   ```bash
   pm2 logs redis-worker --lines 50
   ```

---

## 🔧 Troubleshooting

### Application Won't Start

**Problem:** Application exits immediately after starting

**Solutions:**
```bash
# Check logs
pm2 logs csms-app --err

# Common issues:
# 1. Database connection error - check DATABASE_URL in .env
# 2. Port already in use - check: lsof -i :9002
# 3. Missing dependencies - run: npm install
```

### Database Connection Failed

**Problem:** "Cannot connect to database"

**Solutions:**
```bash
# 1. Check PostgreSQL is running
systemctl status postgresql
systemctl start postgresql  # if not running

# 2. Check database exists
psql -U postgres -l | grep nody

# 3. Test connection manually
psql -U postgres -d nody -c "SELECT 1;"

# 4. Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### MinIO Not Working

**Problem:** File uploads fail

**Solutions:**
```bash
# 1. Check MinIO is running
systemctl status minio
systemctl start minio  # if not running

# 2. Check buckets exist
mc alias set csms http://localhost:9000 csmsadmin Mamlaka2020MinIO
mc ls csms/

# 3. Create missing buckets
mc mb csms/documents
mc mb csms/certificates
mc mb csms/photos
mc mb csms/attachments
```

### PM2 Processes Crashing

**Problem:** Processes keep restarting

**Solutions:**
```bash
# View detailed logs
pm2 logs --lines 100

# Restart all processes
pm2 restart all

# Delete and recreate processes
pm2 delete all
pm2 start ecosystem.config.js
pm2 start npm --name "csms-app" -- start
pm2 save
```

### Performance Issues

**Problem:** Application is slow

**Solutions:**
```bash
# 1. Check server resources
htop  # or top

# 2. Check memory usage
free -h

# 3. Check disk space
df -h

# 4. Restart services
pm2 restart all
systemctl restart postgresql
systemctl restart redis-server
```

---

## 🔒 Security Hardening

### Essential Security Steps

#### 1. Change Default Passwords

```bash
# PostgreSQL
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'your_strong_password';
\q

# Update .env with new password
nano .env
```

#### 2. Configure Firewall

```bash
# Check firewall status
ufw status

# Ensure only necessary ports are open:
# - 22 (SSH)
# - 80 (HTTP)
# - 443 (HTTPS)
# - 9002 (Application - optional, use nginx proxy instead)

# Block direct access to internal services from outside
ufw deny 5432  # PostgreSQL
ufw deny 6379  # Redis
ufw deny 9000  # MinIO API (use reverse proxy)
ufw deny 9001  # MinIO Console (use reverse proxy)
```

#### 3. Enable Automatic Security Updates

```bash
apt-get install unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

#### 4. Set Up SSH Key Authentication

```bash
# On your local machine, generate SSH key if you don't have one:
ssh-keygen -t ed25519

# Copy public key to server:
ssh-copy-id root@YOUR_SERVER_IP

# On server, disable password authentication:
nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
systemctl restart sshd
```

#### 5. Configure PostgreSQL Access

```bash
# Edit PostgreSQL config to only allow local connections
nano /etc/postgresql/16/main/postgresql.conf
# Set: listen_addresses = 'localhost'

nano /etc/postgresql/16/main/pg_hba.conf
# Ensure only local connections are allowed

systemctl restart postgresql
```

#### 6. Set Up Log Monitoring

```bash
# Install logwatch
apt-get install logwatch

# Configure daily email reports
echo "/usr/sbin/logwatch --output mail --mailto your@email.com --detail high" | crontab -e
```

---

## 📞 Support and Maintenance

### Regular Maintenance Tasks

**Daily:**
- Check application logs: `pm2 logs`
- Monitor disk space: `df -h`

**Weekly:**
- Review security updates: `apt list --upgradable`
- Check backup status
- Review system logs

**Monthly:**
- Test backup restoration on test environment
- Review user access and permissions
- Update dependencies: `npm audit`

### Useful Commands Reference

```bash
# Application Management
pm2 list                    # List all processes
pm2 logs csms-app          # View app logs
pm2 restart csms-app       # Restart app
pm2 stop csms-app          # Stop app
pm2 start csms-app         # Start app
pm2 monit                  # Monitor processes

# Database Management
psql -U postgres -d nody                           # Connect to database
pg_dump -U postgres nody > backup.sql             # Backup database
psql -U postgres -d nody -f backup.sql            # Restore database

# System Monitoring
htop                       # Process monitor
df -h                      # Disk usage
free -h                    # Memory usage
systemctl status SERVICE   # Check service status

# Logs
tail -f /var/log/nginx/error.log                  # Nginx errors
pm2 logs --lines 100                              # PM2 logs
journalctl -u postgresql -f                       # PostgreSQL logs
```

---

## 📝 Final Checklist

Before going live, verify:

- [ ] Database restored successfully
- [ ] All services running (PM2, PostgreSQL, Redis, MinIO)
- [ ] Application accessible via browser
- [ ] Login functionality works
- [ ] File uploads work
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Automated backups configured
- [ ] Default passwords changed
- [ ] DNS configured correctly
- [ ] Monitoring set up

---

## 🎉 Congratulations!

Your CSMS application should now be fully restored and running on the new VPS!

**Next Steps:**
1. Test all functionality thoroughly
2. Notify users of the new system
3. Monitor logs for the first few days
4. Set up external monitoring (UptimeRobot, etc.)

---

**Document Version:** 1.0
**Last Updated:** January 13, 2026
**Author:** CSMS Development Team

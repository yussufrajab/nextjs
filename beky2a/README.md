# CSMS Complete Backup & Restoration Package

**Package Created:** January 13, 2026
**Database Backup Date:** January 13, 2026 19:07:22 UTC
**System:** Civil Service Management System (CSMS)
**Platform:** Ubuntu 24.04 LTS
**Purpose:** Complete system backup for VPS restoration

---

## 📦 What's Included

This package contains **everything** you need to restore the CSMS application to a new VPS:

✅ **Complete Database Backup**
- Full PostgreSQL dump (custom & SQL formats)
- Checksums for integrity verification
- Detailed verification reports

✅ **Automated Setup Scripts**
- VPS initial setup script
- Database backup & restore scripts
- Application deployment script

✅ **Configuration Files**
- Environment variables template
- PM2 process configuration
- Database schema

✅ **Comprehensive Documentation**
- Step-by-step restoration guide
- Quick start guide
- Troubleshooting tips

---

## 🎯 Quick Start

**Total Time: 45-60 minutes**

### Option 1: Express Restoration (Recommended)

See `QUICK_START.md` for a simplified guide:
```bash
cat beky2a/QUICK_START.md
```

### Option 2: Detailed Restoration

See complete documentation:
```bash
cat beky2a/docs/RESTORATION_GUIDE.md
```

---

## 📂 Package Structure

```
beky2a/
│
├── README.md                          # This file
├── QUICK_START.md                     # Quick restoration guide
├── MANIFEST.md                        # Complete file listing
│
├── database/                          # Database backups
│   ├── nody_backup_20260113_190722.backup    (5.6M)
│   ├── nody_backup_20260113_190722.sql       (33M)
│   ├── nody_backup_20260113_190722_checksums.txt
│   ├── nody_backup_20260113_190722_verification.txt
│   └── README.md
│
├── scripts/                           # Automation scripts
│   ├── setup-new-vps.sh              # ⭐ Initial VPS setup
│   ├── deploy-app.sh                 # ⭐ Application deployment
│   ├── backup-database.sh            # Database backup tool
│   └── restore-database.sh           # Database restore tool
│
├── config/                            # Configuration files
│   ├── .env.template                 # Environment variables
│   ├── ecosystem.config.js           # PM2 configuration
│   └── schema.prisma                 # Database schema
│
├── application/                       # Application metadata
│   └── package.json                  # Node.js dependencies
│
└── docs/                             # Detailed documentation
    └── RESTORATION_GUIDE.md          # Complete restoration guide
```

---

## ⚡ Three-Step Restoration

### Step 1: Setup VPS
```bash
cd beky2a/scripts
chmod +x setup-new-vps.sh
./setup-new-vps.sh
```

### Step 2: Restore Database
```bash
cd beky2a/database
chmod +x restore-database.sh
./restore-database.sh
```

### Step 3: Deploy Application
```bash
# After uploading app code and configuring .env
cd /home/latest
chmod +x beky2a/scripts/deploy-app.sh
./deploy-app.sh
```

---

## 📊 Database Statistics

**Database Size:** 64 MB
**Tables:** 16 main tables
**Key Data Entities:**
- Users
- Employees
- Institutions
- HR Requests (Promotions, Confirmations, LWOP, etc.)
- Audit Logs
- Notifications

---

## 🔧 System Requirements

**Minimum VPS Specifications:**
- **OS:** Ubuntu 24.04 LTS (or 22.04)
- **CPU:** 2 cores
- **RAM:** 4 GB
- **Disk:** 40 GB
- **Network:** SSH access

**Recommended for Production:**
- **CPU:** 4+ cores
- **RAM:** 8+ GB
- **Disk:** 100+ GB SSD
- **Network:** Static IP, firewall configured

---

## 🛠️ What Gets Installed

The setup process installs:

1. **Node.js 20.x LTS** - Runtime environment
2. **PostgreSQL 16** - Database server
3. **Redis** - Queue management (BullMQ)
4. **MinIO** - Object storage (documents, photos)
5. **PM2** - Process manager
6. **Required build tools** - gcc, make, etc.

---

## 🔐 Security Notes

### ⚠️ IMPORTANT: Before Going Live

This backup contains sensitive data. Follow these security practices:

1. **Change All Default Passwords**
   - PostgreSQL password
   - MinIO credentials
   - Application admin passwords

2. **Secure Environment Variables**
   - Generate new CSRF secret: `openssl rand -base64 32`
   - Update with your Gemini API key
   - Never commit .env to version control

3. **Configure Firewall**
   - Close unnecessary ports
   - Only allow required services
   - Use UFW or iptables

4. **Enable SSL/TLS**
   - Install Let's Encrypt certificate
   - Force HTTPS connections
   - Secure MinIO with HTTPS

5. **Set Up Monitoring**
   - Configure log monitoring
   - Set up uptime monitoring
   - Enable email alerts

6. **Regular Backups**
   - Configure automated database backups
   - Test restoration periodically
   - Store backups securely off-site

---

## 📝 Pre-Flight Checklist

Before starting restoration:

- [ ] Fresh VPS provisioned
- [ ] Root/sudo access confirmed
- [ ] beky2a package uploaded to VPS
- [ ] Application source code ready
- [ ] Domain/DNS configured (if using domain)
- [ ] Gemini API key obtained
- [ ] Backup of current system (if migrating)

---

## 🎯 Success Criteria

Your restoration is successful when:

✅ All services running (PostgreSQL, Redis, MinIO)
✅ Application accessible via browser
✅ Login functionality works
✅ Data displays correctly
✅ File uploads work
✅ No errors in PM2 logs
✅ Database queries execute successfully

---

## 🆘 Troubleshooting

### Quick Diagnostic Commands

```bash
# Check all services
systemctl status postgresql
systemctl status redis-server
systemctl status minio
pm2 list

# View logs
pm2 logs csms-app --lines 50
journalctl -u postgresql -n 50
tail -f /var/log/syslog

# Test connectivity
psql -U postgres -d nody -c "SELECT 1;"
redis-cli ping
curl http://localhost:9000/minio/health/live
curl http://localhost:9002
```

### Common Issues

**Database connection failed:**
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Test manual connection

**Application won't start:**
- Check PM2 logs: `pm2 logs csms-app --err`
- Verify .env file exists
- Check dependencies installed: `npm install`

**MinIO not accessible:**
- Check service: `systemctl status minio`
- Verify firewall: `ufw status`
- Check credentials in .env

---

## 📞 Support Resources

### Documentation Files

- `QUICK_START.md` - Fast restoration guide
- `docs/RESTORATION_GUIDE.md` - Complete detailed guide
- `database/README.md` - Database-specific info
- `MANIFEST.md` - Complete file listing

### Useful Commands Reference

```bash
# Application Management
pm2 start/stop/restart csms-app
pm2 logs csms-app
pm2 monit

# Database Management
psql -U postgres -d nody
pg_dump -U postgres nody > backup.sql

# System Monitoring
htop                    # Process monitor
df -h                   # Disk usage
free -h                 # Memory usage
```

---

## 🔄 Backup Verification

To verify backup integrity:

```bash
cd beky2a/database
sha256sum -c nody_backup_*_checksums.txt
```

Expected output: `OK` for all files

---

## 📈 Post-Restoration Tasks

After successful restoration:

1. **Test All Features**
   - Login/logout
   - Employee management
   - HR requests
   - File uploads
   - Reports

2. **Configure Production Settings**
   - Set up SSL certificate
   - Configure domain
   - Update DNS records
   - Set up reverse proxy (Nginx)

3. **Enable Monitoring**
   - Set up log rotation
   - Configure alerts
   - Enable uptime monitoring

4. **Schedule Backups**
   - Configure daily database backups
   - Set up off-site backup sync
   - Test restoration procedure

5. **Security Hardening**
   - Update all default passwords
   - Configure firewall rules
   - Enable automatic security updates
   - Set up SSH key authentication
   - Disable root login

---

## 📊 Package Information

**Package Version:** 1.0
**Created:** January 13, 2026
**Database Version:** PostgreSQL 16
**Node.js Version:** 20.x LTS
**Next.js Version:** 16.0.7
**Prisma Version:** 6.19.1

**Total Package Size:** ~40 MB compressed
**Restoration Time:** 45-60 minutes
**Skill Level Required:** Intermediate Linux/DevOps

---

## ✅ Validation

This package has been tested for:
- ✅ Database integrity (checksums verified)
- ✅ Script functionality (all scripts tested)
- ✅ Complete restoration process
- ✅ Application deployment
- ✅ Service configuration

---

## 🌟 Next Steps

**Ready to restore?**

1. Read `QUICK_START.md` for overview
2. Follow `docs/RESTORATION_GUIDE.md` for detailed steps
3. Start with `scripts/setup-new-vps.sh`

**Questions or issues?**
- Check the troubleshooting section in RESTORATION_GUIDE.md
- Review script comments for detailed explanations
- Test on a staging environment first if possible

---

## 📄 License & Attribution

**Civil Service Management System (CSMS)**
Zanzibar Civil Service Department

**Backup Package Created By:** CSMS Development Team
**Date:** January 13, 2026
**Platform:** Ubuntu 24.04 LTS with Next.js 16 + Prisma + PostgreSQL

---

**Good luck with your restoration! 🚀**

For the most up-to-date information, always refer to the documentation in the `docs/` directory.

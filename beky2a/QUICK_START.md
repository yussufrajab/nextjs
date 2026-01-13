# CSMS Restoration - Quick Start Guide

**⏱️ Total Time: 45-60 minutes**

---

## 🎯 What You'll Do

This guide helps you restore the CSMS application to a new VPS in 5 simple phases.

---

## 📋 Prerequisites

✅ Fresh Ubuntu 24.04 LTS VPS
✅ Root/sudo access
✅ This beky2a folder uploaded to VPS
✅ Your application source code ready

---

## 🚀 Quick Steps

### 1️⃣ Initial VPS Setup (15-20 min)

```bash
cd /path/to/beky2a/scripts
chmod +x setup-new-vps.sh
./setup-new-vps.sh
```

✅ Installs: Node.js, PostgreSQL, Redis, MinIO, PM2

---

### 2️⃣ Upload Application Code (5-10 min)

Choose one method:

**Using Git:**
```bash
cd /home/latest
git clone YOUR_REPO_URL .
```

**Using SCP (from your local machine):**
```bash
scp -r /path/to/app/* root@YOUR_VPS_IP:/home/latest/
```

---

### 3️⃣ Restore Database (5-10 min)

```bash
cd /home/latest/beky2a/database
chmod +x restore-database.sh
./restore-database.sh
```

✅ Restores complete database with all data

---

### 4️⃣ Configure Environment (5 min)

```bash
cd /home/latest
cp beky2a/config/.env.template .env
nano .env
```

**Update these values:**
- `NEXT_PUBLIC_APP_URL` → Your domain/IP
- `DATABASE_URL` → Your database password
- `NEXT_PUBLIC_MINIO_ENDPOINT` → Your server IP
- `GEMINI_API_KEY` → Your API key
- `CSRF_SECRET` → Generate with: `openssl rand -base64 32`

**Copy PM2 config:**
```bash
cp beky2a/config/ecosystem.config.js /home/latest/
```

---

### 5️⃣ Deploy Application (10-15 min)

```bash
cd /home/latest
chmod +x beky2a/scripts/deploy-app.sh
./deploy-app.sh
```

✅ Installs dependencies, builds app, starts with PM2

---

## ✅ Verification

```bash
# Check services
pm2 list
systemctl status postgresql
systemctl status redis-server
systemctl status minio

# Test application
curl http://localhost:9002

# Open in browser
http://YOUR_SERVER_IP:9002
```

---

## 🎉 Done!

Your CSMS application is now running!

**Next Steps:**
1. Set up SSL certificate
2. Configure domain
3. Test all functionality
4. Set up automated backups

---

## 📚 Need More Details?

See the complete guide:
```bash
cat beky2a/docs/RESTORATION_GUIDE.md
```

---

## 🆘 Having Issues?

**Common Problems:**

❌ **Database connection error**
```bash
# Check PostgreSQL
systemctl status postgresql
psql -U postgres -d nody -c "SELECT 1;"
```

❌ **Application won't start**
```bash
# Check logs
pm2 logs csms-app --err
```

❌ **Port already in use**
```bash
# Check what's using port 9002
lsof -i :9002
```

---

## 📞 Support

For detailed troubleshooting, see:
- `beky2a/docs/RESTORATION_GUIDE.md` (Complete guide)
- `beky2a/database/README.md` (Database specific)

---

**Quick Reference Commands:**

```bash
# Application
pm2 list                    # List processes
pm2 logs csms-app          # View logs
pm2 restart csms-app       # Restart app

# Database
psql -U postgres -d nody   # Connect to DB

# System
htop                       # Monitor resources
df -h                      # Disk space
```

---

**Last Updated:** January 13, 2026

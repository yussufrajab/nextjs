# PM2 Configuration Summary
## CSMS Next.js Application

**Date:** December 26, 2025
**Status:** ✓ Successfully Configured

---

## Configuration Details

### Application Information
- **App Name:** csms-app
- **Process ID:** 0
- **Port:** 9002
- **Status:** Online
- **Node.js Version:** 22.20.0
- **Mode:** Fork (single instance)
- **Working Directory:** /home/latest

### Process Configuration
```javascript
{
  name: 'csms-app',
  script: 'npm',
  args: 'start',
  instances: 1,
  exec_mode: 'fork',
  env: {
    NODE_ENV: 'production',
    PORT: 9002
  }
}
```

### Log Files
- **Combined Log:** /var/log/pm2/csms-app-0.log
- **Output Log:** /var/log/pm2/csms-app-out-0.log
- **Error Log:** /var/log/pm2/csms-app-error-0.log

### Auto-Startup Configuration
- **System:** systemd
- **Service:** pm2-root.service
- **Status:** Enabled (will start on system boot)
- **Service File:** /etc/systemd/system/pm2-root.service

---

## PM2 Commands Reference

### Basic Commands
```bash
# View all processes
pm2 list
pm2 status

# View detailed info
pm2 info csms-app

# View logs
pm2 logs csms-app
pm2 logs csms-app --lines 100
pm2 logs csms-app --lines 100 --err  # Error logs only

# Monitor in real-time
pm2 monit
```

### Process Control
```bash
# Restart app
pm2 restart csms-app

# Stop app
pm2 stop csms-app

# Start app
pm2 start ecosystem.config.js

# Reload app (zero-downtime)
pm2 reload csms-app

# Delete process from PM2
pm2 delete csms-app
```

### Startup Management
```bash
# Save current process list
pm2 save

# Update startup script
pm2 startup

# Remove startup script
pm2 unstartup systemd

# Test startup (simulate reboot)
pm2 kill  # Kill PM2 daemon
pm2 resurrect  # Restore saved processes
```

### Debugging
```bash
# Show environment variables
pm2 env 0

# Show all process details
pm2 show csms-app

# Flush logs
pm2 flush

# Clear all PM2 processes and logs
pm2 delete all
pm2 flush
```

---

## What Was Done

1. **Deleted All Existing PM2 Processes**
   - Removed `csms-app` (id: 0) - was running
   - Removed `nextjs-test` (id: 1) - was errored

2. **Created Log Directory**
   - Created `/var/log/pm2/` with proper permissions

3. **Started Application**
   - Started csms-app using `ecosystem.config.js`
   - Running on port 9002
   - Single instance (fork mode)

4. **Saved PM2 Configuration**
   - Process list saved to `/root/.pm2/dump.pm2`

5. **Configured Auto-Startup**
   - Created systemd service: `pm2-root.service`
   - Enabled service to start on boot
   - App will automatically start after server reboot

---

## Verification

### Current Status
```
✓ Only one PM2 process running (csms-app)
✓ App responding on port 9002
✓ Accessible via https://test.zanajira.go.tz/
✓ Auto-startup configured
✓ Logs properly configured
```

### Test Commands
```bash
# Check PM2 status
pm2 status

# Test app locally
curl http://localhost:9002/api/health

# Test via domain
curl https://test.zanajira.go.tz/

# Check systemd service
systemctl status pm2-root
```

---

## Monitoring and Maintenance

### Daily Health Checks
```bash
# Quick status check
pm2 status

# Check memory usage
pm2 monit

# Review recent logs
pm2 logs csms-app --lines 50
```

### Weekly Maintenance
```bash
# Flush old logs
pm2 flush

# Restart app to clear memory
pm2 restart csms-app

# Save current state
pm2 save
```

### Troubleshooting

#### App Not Starting
```bash
# Check logs
pm2 logs csms-app --err --lines 100

# Try manual start
cd /home/latest
npm start

# Check if port is in use
sudo lsof -i :9002
```

#### High Memory Usage
```bash
# Check memory
pm2 monit

# Restart app
pm2 restart csms-app

# Check for memory leaks
pm2 logs csms-app | grep -i "memory"
```

#### After Server Reboot
```bash
# Check if PM2 started
systemctl status pm2-root

# Check if app is running
pm2 status

# If not running, resurrect
pm2 resurrect

# Or manually start
pm2 start ecosystem.config.js
```

---

## Performance Metrics

Current performance (from `pm2 info`):
- **Used Heap:** 9.34 MiB
- **Heap Usage:** 86.1%
- **Event Loop Latency:** 0.52 ms (avg), 1.44 ms (p95)
- **Active Handles:** 5
- **Restarts:** 0 (stable)

---

## Configuration Files

### Main Configuration
- **File:** `/home/latest/ecosystem.config.js`
- **Purpose:** PM2 process configuration

### Environment Variables
- **File:** `/home/latest/.env`
- **Important Settings:**
  - `NODE_ENV=production`
  - `PORT=9002`
  - `NEXT_PUBLIC_APP_URL=https://test.zanajira.go.tz`
  - `NEXTAUTH_URL=https://test.zanajira.go.tz`

### Systemd Service
- **File:** `/etc/systemd/system/pm2-root.service`
- **Purpose:** Auto-start PM2 on system boot

---

## Next Steps (Optional Improvements)

### 1. Log Rotation
Set up log rotation to prevent disk space issues:

```bash
# Install logrotate configuration
sudo nano /etc/logrotate.d/pm2-csms
```

Add:
```
/var/log/pm2/csms-app*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    copytruncate
}
```

### 2. Monitoring
Install PM2 monitoring (optional):
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. Alerts
Set up email alerts for crashes:
```bash
# Install pm2-slack or configure custom monitoring
# This requires additional setup
```

---

## Summary

Your Next.js CSMS application is now running cleanly with PM2:

✓ **Single Instance:** Only `csms-app` is running
✓ **Port 9002:** Application accessible locally and via reverse proxy
✓ **Auto-Start:** Will automatically start after server reboots
✓ **Proper Logs:** All logs saved to `/var/log/pm2/`
✓ **Production Mode:** Running with NODE_ENV=production
✓ **HTTPS Access:** Available at https://test.zanajira.go.tz/

**All previous PM2 processes have been deleted and cleaned up.**

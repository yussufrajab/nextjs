# Background Worker Management Guide

## Quick Start - Manual Worker

### Start Worker (Simple)

```bash
cd /home/latest
npm run worker
```

**Keep this terminal open while processing jobs!**

### Stop Worker

```bash
# Press Ctrl+C in the worker terminal
```

---

## Production Setup - Keep Worker Running 24/7

Choose one of these methods to run the worker continuously:

### Method 1: Using PM2 (Recommended ✅)

PM2 is a production process manager that keeps your worker running, auto-restarts on crashes, and manages logs.

#### Install PM2

```bash
npm install -g pm2
```

#### Start Worker with PM2

```bash
cd /home/latest
pm2 start ecosystem.config.js
```

#### Check Worker Status

```bash
pm2 status
```

Output:

```
┌─────┬──────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name         │ mode        │ ↺       │ status  │ cpu      │
├─────┼──────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ redis-worker │ fork        │ 0       │ online  │ 0%       │
└─────┴──────────────┴─────────────┴─────────┴─────────┴──────────┘
```

#### View Worker Logs

```bash
# Live logs
pm2 logs redis-worker

# Last 100 lines
pm2 logs redis-worker --lines 100

# Error logs only
pm2 logs redis-worker --err
```

#### Restart Worker

```bash
pm2 restart redis-worker
```

#### Stop Worker

```bash
pm2 stop redis-worker
```

#### Delete Worker

```bash
pm2 delete redis-worker
```

#### Auto-start on Server Reboot

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

Now the worker will automatically start when the server reboots!

---

### Method 2: Using screen (Simple Alternative)

#### Start Worker in Background

```bash
# Create a screen session
screen -S redis-worker

# Inside screen, start worker
cd /home/latest
npm run worker

# Detach from screen (keeps running)
# Press: Ctrl+A, then D
```

#### Reattach to Check Worker

```bash
screen -r redis-worker
```

#### Stop Worker

```bash
# Reattach first
screen -r redis-worker

# Then press Ctrl+C
```

#### List All Screen Sessions

```bash
screen -ls
```

---

### Method 3: Using systemd Service

Create a system service for the worker:

```bash
sudo nano /etc/systemd/system/redis-worker.service
```

Add this content:

```ini
[Unit]
Description=Redis Background Worker for HRIMS Sync
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/home/latest
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run worker
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable redis-worker
sudo systemctl start redis-worker
sudo systemctl status redis-worker
```

View logs:

```bash
sudo journalctl -u redis-worker -f
```

---

## Complete Production Workflow

### 1. Ensure Redis is Running

```bash
redis-cli ping
# Should return: PONG

# If not running:
./scripts/start-redis.sh
```

### 2. Start Worker (Choose one method)

**Option A: PM2 (Recommended)**

```bash
pm2 start ecosystem.config.js
pm2 save
```

**Option B: screen**

```bash
screen -S redis-worker
npm run worker
# Ctrl+A, then D to detach
```

**Option C: Manual (for testing)**

```bash
npm run worker
```

### 3. Verify Worker is Running

**For PM2:**

```bash
pm2 status
pm2 logs redis-worker --lines 20
```

**For screen:**

```bash
screen -ls
screen -r redis-worker
# Ctrl+A, then D to detach again
```

**For manual:**

```bash
ps aux | grep start-worker
```

### 4. Use the Web Interface

Go to: https://test.zanajira.go.tz/dashboard/admin/fetch-data

- Select institution
- Click "Fetch by Vote Code" or "Fetch by TIN"
- Watch real-time progress
- Worker processes in background

### 5. Monitor Worker

**Check if processing jobs:**

```bash
# PM2
pm2 logs redis-worker

# screen
screen -r redis-worker

# Redis job queue
redis-cli
> KEYS bull:hrims-sync:*
```

---

## Troubleshooting

### Worker not processing jobs?

1. **Check if worker is running:**

   ```bash
   pm2 status
   # or
   screen -ls
   ```

2. **Check Redis connection:**

   ```bash
   redis-cli ping
   ```

3. **Check worker logs:**

   ```bash
   pm2 logs redis-worker
   ```

4. **Restart worker:**
   ```bash
   pm2 restart redis-worker
   ```

### Jobs stuck in queue?

```bash
# Check job queue
redis-cli
> KEYS bull:hrims-sync:*
> HGETALL bull:hrims-sync:job-id

# Clear failed jobs (careful!)
> FLUSHALL
```

### High memory usage?

```bash
# Check worker memory
pm2 status

# Restart if needed
pm2 restart redis-worker
```

---

## Recommended Setup for Production

```bash
# 1. Install PM2
npm install -g pm2

# 2. Start Redis
./scripts/start-redis.sh

# 3. Start worker with PM2
pm2 start ecosystem.config.js

# 4. Save PM2 process list
pm2 save

# 5. Setup auto-start on reboot
pm2 startup
# Run the command it outputs

# 6. Verify everything is running
pm2 status
redis-cli ping
```

Now the worker will:

- ✅ Run continuously in background
- ✅ Auto-restart if it crashes
- ✅ Auto-start when server reboots
- ✅ Keep logs in `/home/latest/logs/`
- ✅ Process jobs 24/7

---

## Quick Commands Reference

| Action  | PM2                             | screen                                      | Manual                  |
| ------- | ------------------------------- | ------------------------------------------- | ----------------------- |
| Start   | `pm2 start ecosystem.config.js` | `screen -S redis-worker` → `npm run worker` | `npm run worker`        |
| Stop    | `pm2 stop redis-worker`         | `screen -r redis-worker` → Ctrl+C           | Ctrl+C                  |
| Restart | `pm2 restart redis-worker`      | Stop → Start                                | Stop → Start            |
| Logs    | `pm2 logs redis-worker`         | `screen -r redis-worker`                    | Terminal output         |
| Status  | `pm2 status`                    | `screen -ls`                                | `ps aux \| grep worker` |

---

## Best Practices

1. **Use PM2 for production** - Most reliable
2. **Monitor logs regularly** - `pm2 logs redis-worker`
3. **Set up auto-restart** - `pm2 startup` + `pm2 save`
4. **Keep Redis running** - Use systemd or daemonize
5. **Monitor memory** - Set max_memory_restart in PM2 config
6. **Regular restarts** - Consider weekly restart: `pm2 restart redis-worker`

---

You're ready to process HRIMS data fetching jobs in production! 🚀

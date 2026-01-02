# How to Start Worker for HRIMS Data Fetching

## 🚀 Quick Start (3 Commands)

### 1. Check Current Status
```bash
cd /home/latest
./scripts/check-worker.sh
```

### 2. Start Worker
```bash
cd /home/latest
npm run worker
```

**✅ That's it! Keep this terminal open.**

### 3. Use Web Interface
Go to: **https://test.zanajira.go.tz/dashboard/admin/fetch-data**
- Select institution
- Click "Fetch by Vote Code" or "Fetch by TIN"
- Watch real-time progress

---

## ⚡ Production Setup (Runs 24/7)

Want the worker to run continuously without keeping a terminal open?

### Install PM2 (one-time)
```bash
npm install -g pm2
```

### Start Worker with PM2
```bash
cd /home/latest
pm2 start ecosystem.config.js
```

### Check Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs redis-worker
```

**Now the worker runs in background forever!** Even if you close the terminal.

---

## 📋 Common Commands

| What you want | Command |
|---------------|---------|
| Check if worker is running | `./scripts/check-worker.sh` |
| Start worker (manual) | `npm run worker` |
| Start worker (background) | `pm2 start ecosystem.config.js` |
| Stop worker (manual) | Press `Ctrl+C` |
| Stop worker (PM2) | `pm2 stop redis-worker` |
| Restart worker | `pm2 restart redis-worker` |
| View worker logs | `pm2 logs redis-worker` |
| Check Redis | `redis-cli ping` |
| Start Redis | `./scripts/start-redis.sh` |

---

## ✅ Current Status

Run this to see current status:
```bash
./scripts/check-worker.sh
```

---

## 🎯 Recommended for Production

```bash
# One-time setup
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Run the command it gives you

# That's it! Worker now:
# ✅ Runs 24/7
# ✅ Auto-restarts if crashes
# ✅ Auto-starts on server reboot
```

---

## 💡 Tips

- **Before fetching data**: Worker must be running
- **For testing**: Use `npm run worker` (manual)
- **For production**: Use `pm2 start ecosystem.config.js` (background)
- **To check**: Run `./scripts/check-worker.sh`

---

## 📚 More Info

- **Detailed guide**: See `WORKER_MANAGEMENT.md`
- **Redis setup**: See `REDIS_QUICK_START.md`
- **Full documentation**: See `docs/Background_Jobs_Implementation.md`

---

**Ready to process jobs!** 🚀

# CSMS Management Scripts

Collection of shell scripts for managing CSMS application services via PM2.

## Available Scripts

### `start-all.sh` - Full Startup
Starts all services with build:
- Kills port 9002 processes
- Deletes old PM2 processes
- Builds Next.js application
- Starts Redis, Worker, Genkit, and Next.js
- Saves PM2 configuration

**Usage:**
```bash
./scripts/start-all.sh
# OR
npm run start:all
```

---

### `stop-all.sh` - Stop All Services
Gracefully stops all PM2 services.

**Usage:**
```bash
./scripts/stop-all.sh
# OR
npm run stop:all
```

---

### `restart-all.sh` - Restart Without Build
Restarts all services without rebuilding Next.js.

**Usage:**
```bash
./scripts/restart-all.sh
# OR
npm run restart:all
```

---

### `status.sh` - System Status
Shows comprehensive status:
- PM2 process list
- Memory usage
- Port 9002 status
- Redis connection test
- Useful commands

**Usage:**
```bash
./scripts/status.sh
# OR
npm run status
```

---

### `start-worker.ts` - Redis Worker
Starts the HRIMS sync background worker.
This is called by PM2, not directly.

---

## Quick Reference

```bash
# Start everything (with build)
npm run start:all

# Stop everything
npm run stop:all

# Restart (no build)
npm run restart:all

# Check status
npm run status

# View logs
npm run pm2:logs

# Monitor resources
npm run pm2:monit
```

## Services Managed

1. **redis** - Redis server (Port 6379)
2. **worker** - HRIMS sync background worker
3. **genkit** - Genkit AI service
4. **production** - Next.js application (Port 9002)

## Documentation

See `PM2_MANAGEMENT_GUIDE.md` for complete documentation.

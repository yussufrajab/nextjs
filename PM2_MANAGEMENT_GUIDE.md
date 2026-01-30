# PM2 Management Guide for CSMS

Complete guide for managing all CSMS application services using PM2 process manager.

## Overview

CSMS now uses PM2 to manage all application services:

1. **Redis Server** - Key-value store for sessions and job queues
2. **Redis Worker** - Background worker for HRIMS sync jobs
3. **Genkit AI** - AI service for complaint rewriting
4. **Next.js App** - Main web application (Port 9002)

---

## Quick Start

### Start All Services (Build + Start)

```bash
npm run start:all
```

This will:
1. Kill any processes on port 9002
2. Delete old PM2 processes
3. Build the Next.js application
4. Start all 4 services via PM2
5. Save PM2 configuration
6. Display status

**OR use the direct script:**

```bash
./scripts/start-all.sh
```

---

## Common Commands

### NPM Scripts (Recommended)

```bash
# Start all services (with build)
npm run start:all

# Stop all services
npm run stop:all

# Restart all services (without rebuild)
npm run restart:all

# View status of all services
npm run status

# View live logs from all services
npm run pm2:logs

# Monitor resource usage
npm run pm2:monit
```

### Direct PM2 Commands

```bash
# View all processes
pm2 status

# View logs from all services
pm2 logs

# View logs from specific service
pm2 logs production    # Next.js app
pm2 logs redis         # Redis server
pm2 logs worker        # HRIMS sync worker
pm2 logs genkit        # Genkit AI service

# Restart specific service
pm2 restart production
pm2 restart redis
pm2 restart worker
pm2 restart genkit

# Restart all services
pm2 restart all

# Stop all services
pm2 stop all

# Delete all services
pm2 delete all

# Monitor resources (interactive)
pm2 monit

# View detailed info about a service
pm2 describe production
```

---

## Service Details

### 1. Redis Server (Port 6379)

**Name:** `redis`
**Purpose:** Key-value store for sessions, caching, and job queues
**Log Files:**
- Error: `./logs/redis-error.log`
- Output: `./logs/redis-out.log`

**Check if running:**
```bash
redis-cli ping
# Should respond: PONG
```

**View Redis info:**
```bash
redis-cli info server
```

**Memory limit:** 500MB (will auto-restart if exceeded)

---

### 2. Redis Worker (HRIMS Sync)

**Name:** `worker`
**Purpose:** Background processing of HRIMS synchronization jobs
**Script:** `npm run worker`
**Log Files:**
- Error: `./logs/worker-error.log`
- Output: `./logs/worker-out.log`

**View worker logs:**
```bash
pm2 logs worker
```

**Memory limit:** 300MB

---

### 3. Genkit AI Service

**Name:** `genkit`
**Purpose:** AI-powered complaint rewriting and processing
**Script:** `npm run genkit:watch`
**Log Files:**
- Error: `./logs/genkit-error.log`
- Output: `./logs/genkit-out.log`

**View Genkit logs:**
```bash
pm2 logs genkit
```

**Memory limit:** 500MB

---

### 4. Next.js Production Application

**Name:** `production`
**Purpose:** Main CSMS web application
**Port:** 9002
**URL:** https://csms.zanajira.go.tz
**Script:** `npm start`
**Log Files:**
- Error: `./logs/production-error.log`
- Output: `./logs/production-out.log`

**View application logs:**
```bash
pm2 logs production
```

**Memory limit:** 1GB

---

## Ecosystem Configuration

All services are configured in `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    { name: 'redis', ... },
    { name: 'worker', ... },
    { name: 'genkit', ... },
    { name: 'production', ... },
  ],
};
```

**Start all via ecosystem:**
```bash
pm2 start ecosystem.config.js
```

**Stop all via ecosystem:**
```bash
pm2 stop ecosystem.config.js
```

**Delete all via ecosystem:**
```bash
pm2 delete ecosystem.config.js
```

---

## Startup Order

Services start in this order (important for dependencies):

1. **Redis** - Must start first (other services depend on it)
2. **Worker** - Depends on Redis being available
3. **Genkit** - Can start in parallel with worker
4. **Production** - Next.js app starts last

---

## Auto-Restart Configuration

All services have `autorestart: true`, which means:
- If a service crashes, PM2 will automatically restart it
- If a service uses too much memory, it will restart
- Services are resilient to failures

**View restart count:**
```bash
pm2 status
# Check the "↺" column for restart count
```

---

## Log Management

### View Logs

```bash
# All services (live tail)
pm2 logs

# Specific service
pm2 logs production

# Last 100 lines
pm2 logs --lines 100

# Only errors
pm2 logs --err

# Only output
pm2 logs --out
```

### Log Files Location

All logs are stored in `./logs/`:
```
logs/
├── redis-error.log
├── redis-out.log
├── worker-error.log
├── worker-out.log
├── genkit-error.log
├── genkit-out.log
├── production-error.log
└── production-out.log
```

### Flush/Clear Logs

```bash
pm2 flush
```

---

## Monitoring

### Real-time Monitoring

```bash
pm2 monit
```

Shows:
- CPU usage
- Memory usage
- Logs (live)
- Restart count

Press `Ctrl+C` to exit.

### Web Dashboard (Optional)

```bash
pm2 plus
```

Provides a web-based dashboard for monitoring.

---

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
pm2 logs <service-name>
```

**Check detailed status:**
```bash
pm2 describe <service-name>
```

**Try restarting:**
```bash
pm2 restart <service-name>
```

---

### Port 9002 Already in Use

**Kill process on port:**
```bash
fuser -k 9002/tcp
```

**Or find and kill manually:**
```bash
lsof -i :9002
kill -9 <PID>
```

---

### Redis Not Responding

**Check if Redis is running:**
```bash
pm2 status redis
```

**Test connection:**
```bash
redis-cli ping
```

**Restart Redis:**
```bash
pm2 restart redis
```

---

### High Memory Usage

**Check which service is using memory:**
```bash
pm2 status
```

**View detailed memory info:**
```bash
pm2 describe production
```

**Services will auto-restart if memory limits are exceeded:**
- Redis: 500MB
- Worker: 300MB
- Genkit: 500MB
- Production: 1GB

---

### Service Keeps Restarting

**Check restart count:**
```bash
pm2 status
```

**View error logs:**
```bash
pm2 logs <service-name> --err
```

**Common causes:**
- Port already in use
- Missing dependencies
- Configuration errors
- Memory limits exceeded

---

## Deployment Workflow

### Full Deployment (with build)

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies (if needed)
npm install

# 3. Start all services (builds automatically)
npm run start:all
```

### Quick Restart (without build)

```bash
npm run restart:all
```

### Stop Services for Maintenance

```bash
npm run stop:all
```

---

## PM2 Persistence

### Save Current Process List

```bash
pm2 save
```

This saves the current PM2 process list. On server reboot, PM2 can restore these processes.

### Setup Auto-Start on Boot

```bash
pm2 startup
```

Follow the instructions to enable PM2 auto-start on system reboot.

### Delete Saved Process List

```bash
pm2 delete all
pm2 save --force
```

---

## Environment Variables

All services use these environment variables:

```bash
NODE_ENV=production
PORT=9002
```

Set in `ecosystem.config.js` under `env` section.

---

## Advanced PM2 Features

### Cluster Mode (for Next.js)

To run multiple Next.js instances:

Edit `ecosystem.config.js`:
```javascript
{
  name: 'production',
  instances: 2,           // Number of instances
  exec_mode: 'cluster',   // Use cluster mode
  // ...
}
```

**Not recommended unless you have >2GB RAM available.**

---

### Watch Mode (Development)

Enable auto-restart on file changes:

```javascript
{
  watch: true,
  ignore_watch: ['node_modules', 'logs'],
}
```

**Only use in development!**

---

### Memory Limits

Adjust memory limits in `ecosystem.config.js`:

```javascript
{
  max_memory_restart: '1G',  // Restart if exceeds 1GB
}
```

---

## Scripts Reference

### `./scripts/start-all.sh`
- Kills port 9002 processes
- Deletes PM2 processes
- Builds Next.js app
- Starts all services
- Saves PM2 config

### `./scripts/stop-all.sh`
- Stops all PM2 services gracefully

### `./scripts/restart-all.sh`
- Restarts all services without rebuilding

### `./scripts/status.sh`
- Shows comprehensive status of all services
- Checks port usage
- Tests Redis connection
- Displays useful commands

---

## Cheat Sheet

```bash
# Start everything
npm run start:all

# Stop everything
npm run stop:all

# Restart everything
npm run restart:all

# View status
npm run status

# View all logs
pm2 logs

# View specific log
pm2 logs production

# Monitor resources
pm2 monit

# Restart specific service
pm2 restart redis
pm2 restart worker
pm2 restart genkit
pm2 restart production

# Save PM2 state
pm2 save

# Flush all logs
pm2 flush
```

---

## Migration from Old Startup Method

### Old Method (Manual)
```bash
fuser -k 9002/tcp
pm2 delete production
PORT=9002 npm run build
PORT=9002 pm2 start npm --name production -- start
pm2 save
pm2 status
```

### New Method (Automated)
```bash
npm run start:all
```

**Benefits:**
- Manages all 4 services (not just Next.js)
- Automatic log rotation
- Memory limits
- Auto-restart on crash
- Centralized configuration
- One command startup

---

## Support

For issues:
1. Check logs: `pm2 logs`
2. Check status: `npm run status`
3. Restart services: `npm run restart:all`
4. Contact: CSMS Administrator

---

## Version History

- **v1.0** (2026-01-30) - Initial PM2 ecosystem setup
  - Redis server management
  - Redis worker management
  - Genkit AI management
  - Next.js app management
  - Automated startup scripts

# Redis Quick Start Guide

## ✅ Redis is Installed and Running!

Redis version 7.0.15 has been successfully installed on your system.

## Quick Commands

### Start Redis

```bash
./scripts/start-redis.sh
```

Or manually:

```bash
redis-server --daemonize yes --bind 127.0.0.1 --port 6379
```

### Stop Redis

```bash
./scripts/stop-redis.sh
```

Or manually:

```bash
redis-cli SHUTDOWN
```

### Check if Redis is Running

```bash
redis-cli ping
# Should return: PONG
```

### View Redis Info

```bash
redis-cli INFO server
```

## Running the Complete System

Open 2 terminals:

### Terminal 1: Start Background Worker

```bash
npm run worker
```

You should see:

```
🚀 Starting HRIMS Sync Worker...
✅ HRIMS Sync Worker started
Worker is running. Press Ctrl+C to stop.
```

### Terminal 2: Start Next.js Application

```bash
npm run dev
```

Then navigate to: http://localhost:9002/dashboard/admin/fetch-data

## Testing the Background Jobs

1. Go to `/dashboard/admin/fetch-data`
2. Select an institution
3. Choose identifier type (Vote Code or TIN)
4. Click "Fetch by Vote Code" or "Fetch by TIN"
5. Watch real-time progress updates
6. View results when complete

## Redis Status

### Current Status

- **Version:** Redis 7.0.15
- **Port:** 6379
- **Host:** localhost (127.0.0.1)
- **Mode:** Standalone
- **Status:** ✅ Running

### Process Info

```bash
ps aux | grep redis-server
# Shows: redis-server 127.0.0.1:6379
```

### Monitor Redis in Real-time

```bash
redis-cli MONITOR
```

### View Job Queue

```bash
redis-cli
> KEYS bull:hrims-sync:*
> GET bull:hrims-sync:job-id
```

## Troubleshooting

### Redis not responding?

```bash
# Check if running
redis-cli ping

# If not, start it
./scripts/start-redis.sh
```

### Worker can't connect?

```bash
# Verify Redis is running
redis-cli ping

# Check worker logs
npm run worker
```

### View logs

```bash
# Redis logs
tail -f /var/log/redis/redis-server.log

# Worker logs
# Shown in terminal where you ran: npm run worker
```

## Next Steps

✅ Redis is running
✅ Worker can connect
✅ Ready to process background jobs

Start using the HRIMS sync feature at:
**http://localhost:9002/dashboard/admin/fetch-data**

Enjoy non-blocking, scalable HRIMS data synchronization! 🚀

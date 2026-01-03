# Redis Setup Without Docker

This guide shows you how to set up Redis for the background job queue system without using Docker.

## Quick Start (Local Installation)

### Ubuntu/Debian Linux

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server

# Enable auto-start on boot
sudo systemctl enable redis-server

# Test connection
redis-cli ping
# Expected output: PONG
```

**No additional configuration needed!** The application will automatically connect to `localhost:6379`.

### macOS

```bash
# Install Redis using Homebrew
brew install redis

# Start Redis
brew services start redis

# Test connection
redis-cli ping
# Expected output: PONG
```

**No additional configuration needed!** The application will automatically connect to `localhost:6379`.

### Windows

**Option 1: WSL (Recommended)**

```bash
# Install WSL if not already installed
wsl --install

# Once in WSL, follow Ubuntu instructions above
sudo apt update
sudo apt install redis-server
redis-server
```

**Option 2: Native Windows (Unofficial Port)**

1. Download from: https://github.com/tporadowski/redis/releases
2. Extract the zip file
3. Run `redis-server.exe`

**No additional configuration needed!** The application will automatically connect to `localhost:6379`.

## Cloud Redis (No Installation Required)

If you don't want to install Redis locally, use a free cloud Redis service.

### Option 1: Upstash (Recommended - Free Forever)

1. **Sign up:** https://upstash.com/
2. **Create a Redis database**
3. **Copy connection details**
4. **Update your `.env` file:**

```env
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here
```

### Option 2: Redis Cloud

1. **Sign up:** https://redis.com/try-free/
2. **Create a free database** (30MB)
3. **Copy connection details**
4. **Update your `.env` file:**

```env
REDIS_HOST=redis-xxxxx.c1.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=xxxxx
REDIS_PASSWORD=your-password-here
```

## Verification

After setting up Redis (local or cloud), verify the connection:

### Test from Command Line

```bash
# For local Redis
redis-cli ping

# For cloud Redis with password
redis-cli -h your-host -p your-port -a your-password ping
```

Expected output: `PONG`

### Test from Application

Start the worker and check the logs:

```bash
npm run worker
```

You should see:

```
🚀 Starting HRIMS Sync Worker...
✅ Redis connected
✅ HRIMS Sync Worker started
Worker is running. Press Ctrl+C to stop.
```

If you see `✅ Redis connected`, you're all set!

## Environment Variables

Create or update your `.env.local` file:

### For Local Redis (Default)

```env
# No configuration needed!
# Defaults to localhost:6379
```

### For Cloud Redis

```env
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

## Running the Complete System

Once Redis is set up, run the system in 3 terminals:

### Terminal 1: Start Redis (if local)

```bash
# Linux/macOS
redis-server

# Or use system service (Linux)
sudo systemctl start redis-server

# Windows WSL
redis-server
```

### Terminal 2: Start Background Worker

```bash
npm run worker
```

### Terminal 3: Start Next.js Application

```bash
npm run dev
```

## Troubleshooting

### "Connection refused" error

**Problem:** Worker can't connect to Redis

**Solution:**

1. Check if Redis is running:
   ```bash
   redis-cli ping
   ```
2. If not running, start Redis:

   ```bash
   # Linux
   sudo systemctl start redis-server

   # macOS
   brew services start redis

   # Manual start
   redis-server
   ```

### "Authentication required" error

**Problem:** Cloud Redis requires password

**Solution:** Add password to `.env.local`:

```env
REDIS_PASSWORD=your-password-here
```

### "Port already in use" error

**Problem:** Another process is using port 6379

**Solution:**

1. Find the process:
   ```bash
   lsof -i :6379
   ```
2. Stop it or use a different port:
   ```env
   REDIS_PORT=6380
   ```

## Performance Tips

### Local Redis Optimization

Edit Redis config for better performance:

```bash
# Find config file
redis-cli CONFIG GET dir

# Edit redis.conf
sudo nano /etc/redis/redis.conf
```

Recommended settings:

```conf
# Increase max memory (e.g., 256MB)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Enable persistence
save 900 1
save 300 10
save 60 10000

# Increase max clients
maxclients 10000
```

Restart Redis after changes:

```bash
sudo systemctl restart redis-server
```

## Monitoring Redis

### Check Memory Usage

```bash
redis-cli INFO memory
```

### Monitor Commands in Real-time

```bash
redis-cli MONITOR
```

### View Job Queue

```bash
redis-cli
> KEYS bull:hrims-sync:*
> GET bull:hrims-sync:job-id
```

## Comparison: Docker vs Local vs Cloud

| Feature           | Local Redis    | Cloud Redis     | Docker Redis   |
| ----------------- | -------------- | --------------- | -------------- |
| Setup Time        | 2 minutes      | 5 minutes       | 1 minute       |
| Cost              | Free           | Free tier       | Free           |
| Performance       | Fastest        | Network latency | Fast           |
| Persistence       | Yes            | Yes             | Yes            |
| Auto-restart      | Yes (systemd)  | Yes             | Yes (Docker)   |
| Internet Required | No             | Yes             | No             |
| Maintenance       | Manual updates | Managed         | Manual updates |

**Recommendation:**

- **Development:** Local Redis (fastest, no internet needed)
- **Production:** Cloud Redis (managed, scalable, backups)
- **Quick Testing:** Docker (if you already have it)

## Next Steps

Once Redis is running:

1. ✅ Verify connection with `redis-cli ping`
2. ✅ Start worker with `npm run worker`
3. ✅ Start app with `npm run dev`
4. ✅ Test HRIMS sync at `/dashboard/admin/fetch-data`

You're all set! The background job queue will work without Docker.

#!/bin/bash
# Check if Redis Worker is running

echo "🔍 Checking Redis Worker status..."
echo ""

# Check Redis
echo "1️⃣  Redis Status:"
if redis-cli ping &>/dev/null; then
    echo "   ✅ Redis is running on port 6379"
    redis-cli INFO server | grep redis_version
else
    echo "   ❌ Redis is NOT running"
    echo "   → Run: ./scripts/start-redis.sh"
fi

echo ""

# Check Worker with PM2
echo "2️⃣  Worker Status (PM2):"
if command -v pm2 &>/dev/null; then
    if pm2 list | grep -q "redis-worker"; then
        echo "   ✅ Worker is running via PM2"
        pm2 list | grep redis-worker
    else
        echo "   ⚠️  Worker not found in PM2"
        echo "   → Run: pm2 start ecosystem.config.js"
    fi
else
    echo "   ⚠️  PM2 not installed"
    echo "   → Install: npm install -g pm2"
fi

echo ""

# Check Worker with screen
echo "3️⃣  Worker Status (screen):"
if screen -ls | grep -q "redis-worker"; then
    echo "   ✅ Worker is running in screen session"
    screen -ls | grep redis-worker
else
    echo "   ℹ️  No screen session found"
fi

echo ""

# Check Worker process
echo "4️⃣  Worker Process:"
if ps aux | grep -v grep | grep -q "start-worker"; then
    echo "   ✅ Worker process is running"
    ps aux | grep -v grep | grep "start-worker"
else
    echo "   ❌ Worker process NOT running"
    echo "   → Run: npm run worker"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check job queue
echo "5️⃣  Job Queue Status:"
if redis-cli ping &>/dev/null; then
    job_count=$(redis-cli KEYS "bull:hrims-sync:*" | wc -l)
    if [ "$job_count" -gt 0 ]; then
        echo "   📊 Jobs in queue: $job_count"
        echo "   → View: redis-cli KEYS 'bull:hrims-sync:*'"
    else
        echo "   ✅ Queue is empty (no pending jobs)"
    fi
else
    echo "   ⚠️  Cannot check queue (Redis not running)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Recommendations
if ! redis-cli ping &>/dev/null; then
    echo "⚠️  ACTION REQUIRED: Start Redis"
    echo "   Run: ./scripts/start-redis.sh"
    echo ""
fi

if ! ps aux | grep -v grep | grep -q "start-worker"; then
    echo "⚠️  ACTION REQUIRED: Start Worker"
    echo "   Run: pm2 start ecosystem.config.js"
    echo "   OR:  npm run worker"
    echo ""
fi

if redis-cli ping &>/dev/null && ps aux | grep -v grep | grep -q "start-worker"; then
    echo "✅ All systems operational!"
    echo "   Ready to process HRIMS sync jobs"
    echo "   → Go to: https://test.zanajira.go.tz/dashboard/admin/fetch-data"
fi

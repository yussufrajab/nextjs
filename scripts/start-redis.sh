#!/bin/bash
# Redis Startup Script
# Starts Redis server as a background daemon

echo "🚀 Starting Redis server..."

# Check if Redis is already running
if redis-cli ping &>/dev/null; then
    echo "✅ Redis is already running on port 6379"
    redis-cli INFO server | grep redis_version
    exit 0
fi

# Start Redis as daemon
redis-server --daemonize yes \
    --bind 127.0.0.1 \
    --port 6379 \
    --logfile /var/log/redis/redis-server.log \
    --dir /var/lib/redis

# Wait a moment for Redis to start
sleep 1

# Test connection
if redis-cli ping &>/dev/null; then
    echo "✅ Redis started successfully on port 6379"
    redis-cli INFO server | grep redis_version
else
    echo "❌ Failed to start Redis"
    exit 1
fi

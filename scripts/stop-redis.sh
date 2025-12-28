#!/bin/bash
# Redis Stop Script
# Gracefully shuts down Redis server

echo "⏹️  Stopping Redis server..."

# Check if Redis is running
if ! redis-cli ping &>/dev/null; then
    echo "⚠️  Redis is not running"
    exit 0
fi

# Gracefully shutdown Redis
redis-cli SHUTDOWN

# Wait a moment
sleep 1

# Verify shutdown
if ! redis-cli ping &>/dev/null; then
    echo "✅ Redis stopped successfully"
else
    echo "❌ Failed to stop Redis"
    exit 1
fi

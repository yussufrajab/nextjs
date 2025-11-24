#!/bin/bash

# Dashboard Performance Optimization Script
# This script applies database indexes to improve dashboard loading performance

echo "========================================="
echo "Dashboard Performance Optimization"
echo "========================================="
echo ""

# Database connection details (update these if needed)
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nody}"

# Check if PGPASSWORD is set
if [ -z "$PGPASSWORD" ]; then
    echo "Error: PGPASSWORD environment variable is not set"
    echo "Usage: PGPASSWORD=your_password ./scripts/optimize-dashboard.sh"
    exit 1
fi

echo "Step 1: Testing database connection..."
if ! psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "Error: Cannot connect to database"
    echo "Please check your connection details:"
    echo "  Host: $DB_HOST"
    echo "  User: $DB_USER"
    echo "  Database: $DB_NAME"
    exit 1
fi
echo "✓ Database connection successful"
echo ""

echo "Step 2: Creating performance indexes..."
echo "This may take a few minutes for large databases..."
echo "Using CONCURRENTLY to avoid blocking normal operations"
echo ""

if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f scripts/add-dashboard-indexes.sql; then
    echo ""
    echo "========================================="
    echo "✓ Optimization Complete!"
    echo "========================================="
    echo ""
    echo "Dashboard performance should now be significantly improved."
    echo "The optimization includes:"
    echo "  • Parallelized database queries"
    echo "  • Database indexes on frequently queried columns"
    echo "  • Response caching (60 seconds TTL)"
    echo "  • Optimized data fetching"
    echo ""
    echo "Please restart your application to see the improvements:"
    echo "  pm2 restart csms-app"
    echo ""
else
    echo ""
    echo "Error: Failed to create indexes"
    echo "Please check the error messages above"
    exit 1
fi

#!/bin/bash

# Database Restore Script for Prisma-managed PostgreSQL
# This script restores the nody database from a backup file

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="localhost"
DB_USER="postgres"
DB_PASSWORD="Mamlaka2020"
DB_NAME="nody"
BACKUP_DIR="/home/nextjs/beky8"

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Export password for PostgreSQL commands
export PGPASSWORD="$DB_PASSWORD"

echo "========================================="
echo "  Database Restore Script"
echo "========================================="
echo ""

# Check if backup file is provided or find the latest one
if [ -z "$1" ]; then
    print_info "No backup file specified. Looking for the latest backup..."
    BACKUP_FILE=$(ls -t ${BACKUP_DIR}/nody_backup_*.backup 2>/dev/null | head -n 1)

    if [ -z "$BACKUP_FILE" ]; then
        print_error "No backup files found in ${BACKUP_DIR}"
        exit 1
    fi

    print_info "Found latest backup: $(basename $BACKUP_FILE)"
else
    BACKUP_FILE="$1"

    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
fi

# Display backup file info
print_info "Backup file: $BACKUP_FILE"
print_info "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

# Ask for confirmation
read -p "This will DROP and RECREATE the database '$DB_NAME'. Continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_warning "Restore cancelled."
    exit 0
fi

print_info "Starting database restore process..."
echo ""

# Step 1: Terminate existing connections to the database
print_info "Step 1/5: Terminating existing connections..."
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '$DB_NAME'
    AND pid <> pg_backend_pid();
" > /dev/null 2>&1 || true

# Step 2: Drop the database if it exists
print_info "Step 2/5: Dropping existing database..."
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null 2>&1

# Step 3: Create a fresh database
print_info "Step 3/5: Creating fresh database..."
psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null 2>&1

# Step 4: Restore from backup
print_info "Step 4/5: Restoring data from backup..."
pg_restore -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -v "$BACKUP_FILE" 2>&1 | grep -E "processing|creating|restoring" || true

# Step 5: Verify the restore
print_info "Step 5/5: Verifying restore..."

# Count tables
TABLE_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
" | tr -d ' ')

# Count employees
EMPLOYEE_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM \"Employee\";
" 2>/dev/null | tr -d ' ' || echo "0")

# Count institutions
INSTITUTION_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT COUNT(*) FROM \"Institution\";
" 2>/dev/null | tr -d ' ' || echo "0")

echo ""
print_info "Restore completed successfully!"
echo ""
echo "========================================="
echo "  Restore Summary"
echo "========================================="
echo "Database: $DB_NAME"
echo "Tables: $TABLE_COUNT"
echo "Employees: $EMPLOYEE_COUNT"
echo "Institutions: $INSTITUTION_COUNT"
echo "========================================="
echo ""

# Optional: Run Prisma migrations
read -p "Do you want to apply Prisma migrations? (yes/no): " -r
echo
if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_info "Running Prisma migrations..."
    cd /home/nextjs
    npx prisma migrate deploy
    print_info "Prisma migrations completed!"
fi

# Unset password
unset PGPASSWORD

print_info "All done! Database restored successfully."

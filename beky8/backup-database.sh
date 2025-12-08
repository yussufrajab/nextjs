#!/bin/bash

# Database Backup Script for Prisma-managed PostgreSQL
# This script creates a backup of the nody database

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_HOST="localhost"
DB_USER="postgres"
DB_PASSWORD="Mamlaka2020"
DB_NAME="nody"
BACKUP_DIR="/home/nextjs/beky8"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
BACKUP_FILE="${BACKUP_DIR}/nody_backup_$(date +%Y%m%d_%H%M%S).backup"

# Export password for PostgreSQL commands
export PGPASSWORD="$DB_PASSWORD"

echo "========================================="
echo "  Database Backup Script"
echo "========================================="
echo ""
echo -e "${GREEN}[INFO]${NC} Starting backup of database: $DB_NAME"
echo -e "${GREEN}[INFO]${NC} Backup location: $BACKUP_FILE"
echo ""

# Get current database statistics
EMPLOYEE_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Employee\";" 2>/dev/null | tr -d ' ' || echo "0")
INSTITUTION_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Institution\";" 2>/dev/null | tr -d ' ' || echo "0")
USER_COUNT=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")

echo "Database Statistics:"
echo "  - Employees: $EMPLOYEE_COUNT"
echo "  - Institutions: $INSTITUTION_COUNT"
echo "  - Users: $USER_COUNT"
echo ""

# Create the backup
echo -e "${GREEN}[INFO]${NC} Creating backup..."
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE" 2>&1 | grep -E "dumping|saving" || true

# Check if backup was created successfully
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "========================================="
    echo -e "${GREEN}✓ Backup completed successfully!${NC}"
    echo "========================================="
    echo "Backup file: $(basename $BACKUP_FILE)"
    echo "File size: $BACKUP_SIZE"
    echo "Location: $BACKUP_DIR"
    echo ""

    # List recent backups
    echo "Recent backups in $BACKUP_DIR:"
    ls -lht ${BACKUP_DIR}/nody_backup_*.backup 2>/dev/null | head -n 5 | awk '{print "  " $9 " (" $5 ")"}'
    echo ""

    # Cleanup old backups (keep last 10)
    BACKUP_COUNT=$(ls ${BACKUP_DIR}/nody_backup_*.backup 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo -e "${YELLOW}[INFO]${NC} Cleaning up old backups (keeping latest 10)..."
        ls -t ${BACKUP_DIR}/nody_backup_*.backup | tail -n +11 | xargs rm -f
        echo -e "${GREEN}[INFO]${NC} Cleanup completed."
    fi
else
    echo ""
    echo -e "${RED}[ERROR]${NC} Backup failed!"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo -e "${GREEN}[INFO]${NC} Backup process completed."
echo ""

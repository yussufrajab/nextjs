#!/bin/bash

# Prisma Database Backup Script for nody database migration to Ubuntu VPS
# This script creates a backup of the PostgreSQL database with Prisma migrations

set -e

# Configuration
DB_NAME="nody"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/nody_backup_${TIMESTAMP}.sql"
PRISMA_DIR="./prisma"

echo "=== Prisma Database Backup Script ==="
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_FILE"
echo

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Verify Prisma files exist
if [ ! -f "$PRISMA_DIR/schema.prisma" ]; then
  echo "❌ Error: Prisma schema not found at $PRISMA_DIR/schema.prisma"
  exit 1
fi

if [ ! -d "$PRISMA_DIR/migrations" ]; then
  echo "❌ Error: Prisma migrations directory not found at $PRISMA_DIR/migrations"
  exit 1
fi

# Create database backup
echo "Creating database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Database backup completed successfully!"
  echo "Backup saved to: $BACKUP_FILE"
  
  # Display backup file size
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "Backup size: $BACKUP_SIZE"
  
  # Create Prisma files backup
  echo "Creating Prisma files backup..."
  PRISMA_BACKUP="${BACKUP_DIR}/prisma_files_${TIMESTAMP}.tar.gz"
  tar -czf "$PRISMA_BACKUP" -C . prisma/
  
  if [ $? -eq 0 ]; then
    echo "✅ Prisma files backup completed: $PRISMA_BACKUP"
    PRISMA_SIZE=$(du -h "$PRISMA_BACKUP" | cut -f1)
    echo "Prisma backup size: $PRISMA_SIZE"
  else
    echo "❌ Prisma files backup failed!"
  fi
  
  # Compress the database backup
  echo "Compressing database backup..."
  gzip "$BACKUP_FILE"
  COMPRESSED_FILE="${BACKUP_FILE}.gz"
  COMPRESSED_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
  echo "✅ Compressed database backup saved to: $COMPRESSED_FILE"
  echo "Compressed size: $COMPRESSED_SIZE"
else
  echo "❌ Database backup failed!"
  exit 1
fi

echo
echo "=== Backup Summary ==="
echo "Database backup: $COMPRESSED_FILE ($COMPRESSED_SIZE)"
echo "Prisma files: $PRISMA_BACKUP ($PRISMA_SIZE)"
echo "Database: $DB_NAME"
echo "Timestamp: $TIMESTAMP"
echo
echo "Files to transfer to Ubuntu VPS:"
echo "1. $COMPRESSED_FILE"
echo "2. $PRISMA_BACKUP"
echo
echo "Note: On Ubuntu VPS, restore using Prisma migrations, not direct SQL import"
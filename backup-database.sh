#!/bin/bash

# Database backup script for HR Management System
# This script creates a backup of the PostgreSQL database using credentials from .env

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}HR Management System Database Backup Script${NC}"
echo "=============================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please ensure you're running this script from the project root directory"
    exit 1
fi

# Parse DATABASE_URL from .env file
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not found in .env file${NC}"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database?schema=public
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${YELLOW}Database connection details:${NC}"
echo "Host: $DB_HOST:$DB_PORT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo

# Create backups directory if it doesn't exist
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="hr_backup_${TIMESTAMP}.sql"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

echo -e "${YELLOW}Creating database backup...${NC}"

# Create the backup using pg_dump
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password > "$BACKUP_PATH"; then
    echo -e "${GREEN}✓ Database backup created successfully${NC}"
else
    echo -e "${RED}Error: Failed to create database backup${NC}"
    exit 1
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)

echo -e "${GREEN}Backup completed!${NC}"
echo "File: $BACKUP_PATH"
echo "Size: $BACKUP_SIZE"

# Create compressed version
echo -e "${YELLOW}Creating compressed backup...${NC}"
COMPRESSED_BACKUP="${BACKUP_PATH}.gz"
if gzip -c "$BACKUP_PATH" > "$COMPRESSED_BACKUP"; then
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_BACKUP" | cut -f1)
    echo -e "${GREEN}✓ Compressed backup created${NC}"
    echo "Compressed file: $COMPRESSED_BACKUP"
    echo "Compressed size: $COMPRESSED_SIZE"
else
    echo -e "${YELLOW}Warning: Failed to create compressed backup${NC}"
fi

# Clean up environment variable
unset PGPASSWORD

echo
echo -e "${GREEN}Backup process completed successfully!${NC}"
echo "=============================================="
echo "Available backups:"
echo "- SQL backup: $BACKUP_PATH ($BACKUP_SIZE)"
if [ -f "$COMPRESSED_BACKUP" ]; then
    echo "- Compressed backup: $COMPRESSED_BACKUP ($COMPRESSED_SIZE)"
fi
echo
echo -e "${YELLOW}To restore this backup on another system:${NC}"
echo "1. Copy the backup file to the target system"
echo "2. Run: ./restore-database.sh $BACKUP_FILENAME"
#!/bin/bash

# PostgreSQL Database Restore Script for CSMS (Dual ORM: Prisma + Hibernate)
# This script restores the prizma database to a different VPS with different credentials

set -e

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file.sql> [config_file]"
    echo "Example: $0 prizma_backup_20250730_123456.sql"
    echo "Example with config: $0 prizma_backup_20250730_123456.sql target_config.env"
    exit 1
fi

BACKUP_FILE="$1"
CONFIG_FILE="${2:-target_config.env}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting CSMS Database Restore...${NC}"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Load configuration
if [ -f "$CONFIG_FILE" ]; then
    echo -e "${BLUE}Loading configuration from: $CONFIG_FILE${NC}"
    source "$CONFIG_FILE"
else
    echo -e "${YELLOW}Configuration file not found. Using default values.${NC}"
    echo -e "${YELLOW}Create $CONFIG_FILE for custom settings.${NC}"
fi

# Target database configuration (with defaults)
TARGET_HOST="${TARGET_HOST:-localhost}"
TARGET_PORT="${TARGET_PORT:-5432}"
TARGET_DB="${TARGET_DB:-prizma}"
TARGET_USER="${TARGET_USER:-postgres}"
TARGET_PASSWORD="${TARGET_PASSWORD:-your_target_password}"

echo -e "${BLUE}Target Configuration:${NC}"
echo -e "${BLUE}Host: $TARGET_HOST:$TARGET_PORT${NC}"
echo -e "${BLUE}Database: $TARGET_DB${NC}"
echo -e "${BLUE}User: $TARGET_USER${NC}"

# Confirm before proceeding
read -p "This will OVERWRITE the target database. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

# Export password to avoid prompting
export PGPASSWORD="$TARGET_PASSWORD"

echo -e "${YELLOW}Testing connection to target database...${NC}"

# Test connection
if ! pg_isready -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d postgres >/dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to PostgreSQL server at $TARGET_HOST:$TARGET_PORT${NC}"
    echo -e "${RED}Please verify the server is running and credentials are correct.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connection successful${NC}"

# Check if database exists and create if needed
echo -e "${YELLOW}Checking if database '$TARGET_DB' exists...${NC}"

DB_EXISTS=$(psql -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$TARGET_DB'")

if [ "$DB_EXISTS" != "1" ]; then
    echo -e "${YELLOW}Database '$TARGET_DB' does not exist. Creating...${NC}"
    createdb -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" "$TARGET_DB"
    echo -e "${GREEN}✓ Database created${NC}"
else
    echo -e "${BLUE}Database '$TARGET_DB' already exists${NC}"
fi

# Restore the database
echo -e "${YELLOW}Restoring database from backup...${NC}"
echo -e "${YELLOW}This may take several minutes depending on data size...${NC}"

psql \
  --host="$TARGET_HOST" \
  --port="$TARGET_PORT" \
  --username="$TARGET_USER" \
  --dbname="$TARGET_DB" \
  --quiet \
  --file="$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database restore completed successfully!${NC}"
    
    # Verify restore by checking table count
    TABLE_COUNT=$(psql -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
    echo -e "${GREEN}Tables restored: $TABLE_COUNT${NC}"
    
    # Check for key CSMS tables
    echo -e "${YELLOW}Verifying CSMS tables...${NC}"
    
    CSMS_TABLES=("User" "Employee" "Institution" "Request" "RequestType" "Notification")
    
    for table in "${CSMS_TABLES[@]}"; do
        if psql -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DB" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='$table')" | grep -q 't'; then
            echo -e "${GREEN}✓ Table '$table' exists${NC}"
        else
            echo -e "${YELLOW}⚠ Table '$table' not found${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ Restore verification completed${NC}"
    
else
    echo -e "${RED}✗ Restore failed!${NC}"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}    Database Restore Completed!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}1. Update your application configuration:${NC}"
echo -e "${BLUE}   - Backend: Update application.properties${NC}"
echo -e "${BLUE}   - Frontend: Update DATABASE_URL in .env${NC}"
echo
echo -e "${BLUE}2. Connection strings to use:${NC}"
echo -e "${BLUE}   Backend (Spring): jdbc:postgresql://$TARGET_HOST:$TARGET_PORT/$TARGET_DB${NC}"
echo -e "${BLUE}   Frontend (Prisma): postgresql://$TARGET_USER:$TARGET_PASSWORD@$TARGET_HOST:$TARGET_PORT/$TARGET_DB${NC}"
echo
echo -e "${BLUE}3. After updating configs:${NC}"
echo -e "${BLUE}   - Frontend: Run 'npx prisma generate'${NC}"
echo -e "${BLUE}   - Backend: Use 'prod' profile to validate schema${NC}"
echo
echo -e "${YELLOW}⚠ Important: Both Prisma and Hibernate will work with this restored database${NC}"
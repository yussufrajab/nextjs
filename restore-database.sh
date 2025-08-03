#!/bin/bash

# Database restore script for existing PostgreSQL installation
# This script restores the HR Management System database to an existing mfumo2 database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}HR Management System Database Restore Script${NC}"
echo "=================================================="

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Please provide the backup file path${NC}"
    echo "Usage: $0 <backup-file.sql>"
    echo "Example: $0 ./backups/hr_backup_20240115_143022.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file '$BACKUP_FILE' not found${NC}"
    exit 1
fi

# Database credentials for the target system (pre-configured)
DB_USER="postgres"
DB_PASSWORD="password"
DB_NAME="mfumo2"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${YELLOW}Restoring to existing PostgreSQL database...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Check PostgreSQL connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL database${NC}"
    echo "Please ensure:"
    echo "- PostgreSQL is running"
    echo "- Database '$DB_NAME' exists"
    echo "- User '$DB_USER' has access"
    echo "- Password is correct"
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"

# Clear existing data (if any) - should be empty but ensuring clean state
echo -e "${YELLOW}Ensuring database is clean...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DO \$\$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
" > /dev/null

echo -e "${GREEN}✓ Database is clean and ready${NC}"

# Restore the database
echo -e "${YELLOW}Restoring database from backup file...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database restored successfully${NC}"
else
    echo -e "${RED}Error: Failed to restore database${NC}"
    exit 1
fi

# Verify the restore
echo -e "${YELLOW}Verifying database restore...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Database verification successful - $TABLE_COUNT tables found${NC}"
else
    echo -e "${RED}Warning: No tables found in restored database${NC}"
fi

# Clean up environment variable
unset PGPASSWORD

echo
echo -e "${GREEN}Database restore completed successfully!${NC}"
echo "=================================================="
echo "Database Details:"
echo "- Host: $DB_HOST:$DB_PORT"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"
echo "- Tables: $TABLE_COUNT"
echo
echo -e "${YELLOW}Next steps for your application:${NC}"
echo "1. Update your .env file with the database URL:"
echo "   DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public\""
echo "2. Install project dependencies: npm install"
echo "3. Generate Prisma client: npx prisma generate"
echo "4. Start your application: npm run build && npm start"
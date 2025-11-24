#!/bin/bash

# Database restore script for mfumo3 migration
# This script restores a backup to the mfumo3 database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}HR Management System - Restore to mfumo3${NC}"
echo "============================================="

# Check if backup file is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Please provide the backup file path${NC}"
    echo "Usage: $0 <backup-file.sql>"
    echo "Example: $0 mfumo3_migration_20240115_143022.sql"
    exit 1
fi

BACKUP_FILE="$1"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file '$BACKUP_FILE' not found${NC}"
    exit 1
fi

# Target database credentials (mfumo3 setup)
DB_USER="postgres"
DB_PASSWORD="password"
DB_NAME="mfumo3"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${YELLOW}Restoring to mfumo3 database...${NC}"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST:$DB_PORT"
echo "Backup file: $BACKUP_FILE"
echo

# Check if .env file exists and verify DATABASE_URL
if [ -f ".env" ]; then
    ENV_DB_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')
    EXPECTED_URL="postgresql://postgres:password@localhost:5432/mfumo3"
    
    if [[ "$ENV_DB_URL" != *"mfumo3"* ]]; then
        echo -e "${YELLOW}Warning: .env DATABASE_URL doesn't contain 'mfumo3'${NC}"
        echo "Expected: DATABASE_URL=\"postgresql://postgres:password@localhost:5432/mfumo3\""
        echo "Current: $ENV_DB_URL"
        echo
    fi
else
    echo -e "${YELLOW}Warning: .env file not found in current directory${NC}"
    echo "Make sure to create .env with: DATABASE_URL=\"postgresql://postgres:password@localhost:5432/mfumo3\""
    echo
fi

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Check PostgreSQL connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL database${NC}"
    echo "Please ensure:"
    echo "- PostgreSQL is running: sudo systemctl status postgresql"
    echo "- Database '$DB_NAME' exists: sudo -u postgres psql -l | grep $DB_NAME"
    echo "- User '$DB_USER' has access with password '$DB_PASSWORD'"
    echo
    echo "To create the database:"
    echo "sudo -u postgres createdb $DB_NAME"
    echo "sudo -u postgres psql -c \"ALTER USER postgres PASSWORD 'password';\""
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"

# Clear existing data in mfumo3 database
echo -e "${YELLOW}Clearing existing data from mfumo3 database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
DO \$\$ 
DECLARE 
    r RECORD;
BEGIN 
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END \$\$;
" > /dev/null

echo -e "${GREEN}✓ Database cleared and ready${NC}"

# Restore the database
echo -e "${YELLOW}Restoring database from backup file...${NC}"

# For gzipped files
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Detected compressed backup file..."
    if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database restored successfully from compressed backup${NC}"
    else
        echo -e "${RED}Error: Failed to restore database from compressed backup${NC}"
        exit 1
    fi
else
    # Regular SQL file
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database restored successfully${NC}"
    else
        echo -e "${RED}Error: Failed to restore database${NC}"
        exit 1
    fi
fi

# Verify the restore
echo -e "${YELLOW}Verifying database restore...${NC}"
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Database verification successful - $TABLE_COUNT tables found${NC}"
    
    # Show some basic statistics
    USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")
    EMPLOYEE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Employee\";" 2>/dev/null | tr -d ' ' || echo "0")
    INSTITUTION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM \"Institution\";" 2>/dev/null | tr -d ' ' || echo "0")
    
    echo "- Users: $USER_COUNT"
    echo "- Employees: $EMPLOYEE_COUNT"  
    echo "- Institutions: $INSTITUTION_COUNT"
else
    echo -e "${RED}Warning: No tables found in restored database${NC}"
fi

# Clean up environment variable
unset PGPASSWORD

echo
echo -e "${GREEN}Database restore to mfumo3 completed successfully!${NC}"
echo "============================================="
echo "Database Details:"
echo "- Host: $DB_HOST:$DB_PORT"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"
echo "- Tables: $TABLE_COUNT"
echo
echo -e "${YELLOW}Next steps for your application:${NC}"
echo "1. Verify .env file contains:"
echo "   DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public\""
echo
echo "2. Install dependencies and setup Prisma:"
echo "   npm install"
echo "   npx prisma generate"
echo
echo "3. Build and start the application:"
echo "   npm run build"
echo "   npm start"
echo
echo "4. Optional - Test the connection:"
echo "   npx prisma db seed  # If you have seed data"
echo
echo -e "${GREEN}Your HR Management System should now be running with the migrated data!${NC}"
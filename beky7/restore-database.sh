#!/bin/bash

################################################################################
# Database Restore Script for CSMS (nody database)
#
# This script restores the PostgreSQL database backup to a new server
#
# Prerequisites:
#   - PostgreSQL installed and running on target server
#   - Database user with superuser privileges
#   - Network access to PostgreSQL server
#
# Usage:
#   ./restore-database.sh [options]
#
# Options:
#   -h HOST       Database host (default: localhost)
#   -p PORT       Database port (default: 5432)
#   -U USER       Database user (default: postgres)
#   -d DATABASE   Database name (default: nody)
#   -W PASSWORD   Database password (will prompt if not provided)
#   -f FORMAT     Backup format: 'custom' or 'sql' (default: custom)
#   --help        Show this help message
################################################################################

set -e  # Exit on error

# Default values
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="nody"
DB_PASSWORD=""
BACKUP_FORMAT="custom"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h)
            DB_HOST="$2"
            shift 2
            ;;
        -p)
            DB_PORT="$2"
            shift 2
            ;;
        -U)
            DB_USER="$2"
            shift 2
            ;;
        -d)
            DB_NAME="$2"
            shift 2
            ;;
        -W)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -f)
            BACKUP_FORMAT="$2"
            shift 2
            ;;
        --help)
            head -n 25 "$0" | tail -n 18
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Find the backup file
if [ "$BACKUP_FORMAT" = "custom" ]; then
    BACKUP_FILE=$(ls -t "$SCRIPT_DIR"/*.backup 2>/dev/null | head -n 1)
    BACKUP_EXT=".backup"
else
    BACKUP_FILE=$(ls -t "$SCRIPT_DIR"/*.sql 2>/dev/null | head -n 1)
    BACKUP_EXT=".sql"
fi

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: No backup file (*$BACKUP_EXT) found in $SCRIPT_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         CSMS Database Restore Script                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Host:     $DB_HOST"
echo -e "  Port:     $DB_PORT"
echo -e "  User:     $DB_USER"
echo -e "  Database: $DB_NAME"
echo -e "  Backup:   $(basename "$BACKUP_FILE")"
echo -e "  Format:   $BACKUP_FORMAT"
echo ""

# Prompt for password if not provided
if [ -z "$DB_PASSWORD" ]; then
    echo -n "Enter PostgreSQL password: "
    read -s DB_PASSWORD
    echo ""
fi

export PGPASSWORD="$DB_PASSWORD"

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}Error: Cannot connect to PostgreSQL server${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Connection successful${NC}"
echo ""

# Check if database exists
echo -e "${YELLOW}Checking if database '$DB_NAME' exists...${NC}"
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo -e "${YELLOW}⚠ Database '$DB_NAME' already exists${NC}"
    echo -n "Do you want to drop and recreate it? (yes/no): "
    read -r RESPONSE
    if [ "$RESPONSE" = "yes" ]; then
        echo -e "${YELLOW}Dropping existing database...${NC}"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\";"
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo -e "${RED}Restore cancelled${NC}"
        exit 1
    fi
fi

# Create database
echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" WITH ENCODING='UTF8';"
echo -e "${GREEN}✓ Database created${NC}"
echo ""

# Restore database
echo -e "${YELLOW}Restoring database from backup...${NC}"
echo -e "${BLUE}This may take several minutes depending on the database size...${NC}"
echo ""

if [ "$BACKUP_FORMAT" = "custom" ]; then
    # Restore from custom format backup
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v "$BACKUP_FILE" 2>&1 | while IFS= read -r line; do
        echo -e "${BLUE}  $line${NC}"
    done
else
    # Restore from SQL file
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" 2>&1 | while IFS= read -r line; do
        echo -e "${BLUE}  $line${NC}"
    done
fi

echo ""
echo -e "${GREEN}✓ Database restored successfully${NC}"
echo ""

# Verify restore
echo -e "${YELLOW}Verifying restore...${NC}"
echo ""

# Count key tables
TABLES=("User" "Employee" "Institution" "PromotionRequest" "ConfirmationRequest" "LwopRequest")
for TABLE in "${TABLES[@]}"; do
    COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM \"$TABLE\"" 2>/dev/null || echo "0")
    printf "  %-20s : %s records\n" "$TABLE" "$COUNT"
done

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Database restore completed successfully!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update your .env file with the new database credentials"
echo "  2. Run 'npx prisma generate' to generate Prisma client"
echo "  3. Test your application connection"
echo ""

# Clean up
unset PGPASSWORD

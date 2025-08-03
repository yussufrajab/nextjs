#!/bin/bash

# PostgreSQL Database Backup Script for CSMS (Dual ORM: Prisma + Hibernate)
# This script creates a comprehensive backup of the prizma database

set -e

# Source database configuration
SOURCE_HOST="localhost"
SOURCE_PORT="5432"
SOURCE_DB="prizma"
SOURCE_USER="postgres"
SOURCE_PASSWORD="Mamlaka2020"

# Backup configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="prizma_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting CSMS Database Backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Export password to avoid prompting
export PGPASSWORD="$SOURCE_PASSWORD"

echo -e "${YELLOW}Creating database dump...${NC}"

# Create comprehensive backup with all data, schema, and sequences
pg_dump \
  --host="$SOURCE_HOST" \
  --port="$SOURCE_PORT" \
  --username="$SOURCE_USER" \
  --dbname="$SOURCE_DB" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=plain \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database backup completed successfully!${NC}"
    echo -e "${GREEN}Backup saved to: $BACKUP_PATH${NC}"
    
    # Get backup file size
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo -e "${GREEN}Backup size: $BACKUP_SIZE${NC}"
    
    # Create a metadata file
    cat > "${BACKUP_DIR}/backup_${TIMESTAMP}_info.txt" << EOF
CSMS Database Backup Information
================================
Database: $SOURCE_DB
Source Host: $SOURCE_HOST:$SOURCE_PORT
Backup Date: $(date)
Backup File: $BACKUP_FILE
Backup Size: $BACKUP_SIZE
ORM Support: Prisma + Hibernate (JPA)

Notes:
- This backup includes all tables, sequences, and data
- Compatible with both Prisma and Hibernate schemas
- Use restore_prizma.sh to restore to target server
- Ensure target PostgreSQL version is compatible (15+)
EOF
    
    echo -e "${GREEN}✓ Backup metadata saved to: ${BACKUP_DIR}/backup_${TIMESTAMP}_info.txt${NC}"
    
else
    echo -e "${RED}✗ Backup failed!${NC}"
    exit 1
fi

# Unset password
unset PGPASSWORD

echo -e "${GREEN}Backup process completed!${NC}"
echo -e "${YELLOW}To restore on target server, copy the backup file and run:${NC}"
echo -e "${YELLOW}./restore_prizma.sh $BACKUP_FILE${NC}"
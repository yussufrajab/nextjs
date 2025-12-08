#!/bin/bash

# HRIMS Fetch Runner Script
# Runs the HRIMS data fetch script with proper logging and process management

set -e

SCRIPT_DIR="/home/nextjs/scripts"
LOG_DIR="/home/nextjs/logs"
LOG_FILE="${LOG_DIR}/hrims-fetch-$(date +%Y%m%d_%H%M%S).log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  HRIMS Data Fetch Script${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Script: $SCRIPT_DIR/fetch-hrims-data.ts"
echo "Log file: $LOG_FILE"
echo ""

# Check if dev server is running
if ! curl -s http://localhost:9002/api/institutions > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Dev server is not running on port 9002${NC}"
    echo "Please start the dev server first:"
    echo "  pm2 start csms-dev"
    exit 1
fi

echo -e "${GREEN}✓ Dev server is running${NC}"
echo ""

# Ask for confirmation
read -p "Start fetching data from HRIMS? This may take 1-2 hours. (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Cancelled.${NC}"
    exit 0
fi

echo -e "${GREEN}Starting HRIMS fetch...${NC}"
echo ""

# Run the script with output to both console and log file
cd "$SCRIPT_DIR"
npx tsx fetch-hrims-data.ts 2>&1 | tee "$LOG_FILE"

# Check exit status
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ Fetch completed successfully!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo "Log saved to: $LOG_FILE"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}❌ Fetch failed!${NC}"
    echo -e "${RED}=========================================${NC}"
    echo "Check log for details: $LOG_FILE"
    echo ""
    exit 1
fi

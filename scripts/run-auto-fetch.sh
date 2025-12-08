#!/bin/bash

# ============================================================================
# HRIMS Auto Fetch Script Runner
# ============================================================================
# This script runs the automatic institution data fetch from HRIMS
#
# Usage:
#   ./scripts/run-auto-fetch.sh
#
# The script will:
#   1. Fetch all institutions from the database
#   2. Automatically fetch employee data for each institution
#   3. Use pagination to handle large datasets
#   4. Retry failed institutions automatically
#   5. Save detailed logs to ./logs directory
#
# Prerequisites:
#   - Server must be running on port 9002
#   - Database must be accessible
#   - Node.js and dependencies must be installed
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  HRIMS Auto Fetch - All Institutions"
echo "=========================================="
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running on port 9002...${NC}"
if ! curl -s http://localhost:9002/api/health > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running on port 9002${NC}"
    echo -e "${YELLOW}Please start the server first:${NC}"
    echo "  npm run dev"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# Check if logs directory exists
if [ ! -d "./logs" ]; then
    echo -e "${BLUE}Creating logs directory...${NC}"
    mkdir -p ./logs
    echo -e "${GREEN}✓ Logs directory created${NC}"
    echo ""
fi

# Run the script
echo -e "${BLUE}Starting automatic fetch for all institutions...${NC}"
echo -e "${YELLOW}This may take several hours depending on data size.${NC}"
echo -e "${YELLOW}Logs will be saved to ./logs directory${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to cancel${NC}"
echo ""
sleep 3

# Run with npx tsx
npx tsx scripts/fetch-all-institutions-auto.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo -e "  Fetch completed successfully!"
    echo -e "==========================================${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo -e "  Fetch failed with errors"
    echo -e "==========================================${NC}"
    echo ""
    exit 1
fi

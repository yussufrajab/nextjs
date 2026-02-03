#!/bin/bash

# Script to fetch documents for WIZARA YA ELIMU NA MAFUNZO YA AMALI in parallel
# This institution has 18000+ employees, so parallel processing is essential

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}WIZARA YA ELIMU Document Fetch - Parallel${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# WIZARA YA ELIMU NA MAFUNZO YA AMALI institution ID (from database check)
INSTITUTION_ID="cmd06nn7r0002e67w8df8thtn"

echo -e "${GREEN}Institution ID: ${INSTITUTION_ID}${NC}"
echo ""

# Default values
BATCH_SIZE=4
OFFSET=7000
LIMIT=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --batch-size=*)
      BATCH_SIZE="${1#*=}"
      shift
      ;;
    --offset=*)
      OFFSET="${1#*=}"
      shift
      ;;
    --limit=*)
      LIMIT="--limit=${1#*=}"
      shift
      ;;
    --from-start)
      OFFSET=0
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--batch-size=N] [--offset=N] [--limit=N] [--from-start]"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}Configuration:${NC}"
echo "  Batch Size: $BATCH_SIZE employees in parallel"
echo "  Starting Offset: $OFFSET"
if [ -n "$LIMIT" ]; then
  echo "  Limit: ${LIMIT#*=} employees"
fi
echo ""

# Create logs directory if it doesn't exist
mkdir -p scripts/logs

# Generate log file name with timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="scripts/logs/wizara-elimu-parallel-${TIMESTAMP}.log"

echo -e "${YELLOW}Starting parallel document fetch...${NC}"
echo -e "${YELLOW}Log file: ${LOG_FILE}${NC}"
echo ""

# Run the parallel fetch script
npx tsx scripts/fetch-institution-documents-parallel.ts \
  --institution-id="$INSTITUTION_ID" \
  --batch-size="$BATCH_SIZE" \
  --offset="$OFFSET" \
  $LIMIT \
  2>&1 | tee "$LOG_FILE"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Fetch completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Log saved to: ${LOG_FILE}"

#!/bin/bash

###############################################################################
# CSMS Application Stop Script
#
# Stops all PM2 services gracefully
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Stopping CSMS Application Services               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🛑 Stopping all PM2 services...${NC}"
pm2 stop all
echo ""

echo -e "${GREEN}✓ All services stopped${NC}"
echo ""

echo -e "${YELLOW}📊 Current PM2 status:${NC}"
pm2 status
echo ""

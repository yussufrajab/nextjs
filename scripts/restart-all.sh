#!/bin/bash

###############################################################################
# CSMS Application Restart Script
#
# Restarts all PM2 services without rebuilding
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Restarting CSMS Application Services              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔄 Restarting all PM2 services...${NC}"
pm2 restart all
echo ""

echo -e "${GREEN}✓ All services restarted${NC}"
echo ""

echo -e "${YELLOW}📊 Current PM2 status:${NC}"
pm2 status
echo ""

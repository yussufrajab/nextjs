#!/bin/bash

###############################################################################
# CSMS Application Startup Script
#
# Starts all services via PM2:
# - Redis server
# - Redis worker (HRIMS sync)
# - Genkit AI service
# - Next.js production application
#
# Usage:
#   ./scripts/start-all.sh
#   OR
#   npm run start:all
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/www/wwwroot/nextjspro"
cd "$PROJECT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        CSMS Application Startup - PM2 Manager              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Step 1: Create logs directory
###############################################################################
echo -e "${YELLOW}📁 Creating logs directory...${NC}"
mkdir -p logs
echo -e "${GREEN}✓ Logs directory ready${NC}"
echo ""

###############################################################################
# Step 2: Kill existing processes on port 9002
###############################################################################
echo -e "${YELLOW}🔪 Killing existing processes on port 9002...${NC}"
if fuser -k 9002/tcp 2>/dev/null; then
    echo -e "${GREEN}✓ Killed processes on port 9002${NC}"
else
    echo -e "${GREEN}✓ No processes running on port 9002${NC}"
fi
echo ""

###############################################################################
# Step 3: Stop and delete all existing PM2 processes
###############################################################################
echo -e "${YELLOW}🛑 Stopping and deleting existing PM2 processes...${NC}"
pm2 delete all 2>/dev/null || echo "No PM2 processes to delete"
echo -e "${GREEN}✓ PM2 processes cleaned${NC}"
echo ""

###############################################################################
# Step 4: Build Next.js application
###############################################################################
echo -e "${YELLOW}🏗️  Building Next.js application...${NC}"
PORT=9002 npm run build
echo -e "${GREEN}✓ Next.js build completed${NC}"
echo ""

###############################################################################
# Step 5: Start all services via PM2 ecosystem
###############################################################################
echo -e "${YELLOW}🚀 Starting all services via PM2...${NC}"
pm2 start ecosystem.config.js
echo ""

###############################################################################
# Step 6: Save PM2 configuration
###############################################################################
echo -e "${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save
echo -e "${GREEN}✓ PM2 configuration saved${NC}"
echo ""

###############################################################################
# Step 7: Display PM2 status
###############################################################################
echo -e "${YELLOW}📊 Current PM2 status:${NC}"
pm2 status
echo ""

###############################################################################
# Step 8: Display service URLs and information
###############################################################################
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                   🎉 Startup Complete!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Services started:${NC}"
echo -e "  • ${GREEN}Redis Server${NC}      - Port 6379"
echo -e "  • ${GREEN}Redis Worker${NC}      - HRIMS sync background worker"
echo -e "  • ${GREEN}Genkit AI${NC}         - AI service for complaint rewriting"
echo -e "  • ${GREEN}Next.js App${NC}       - https://csms.zanajira.go.tz (Port 9002)"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  • ${YELLOW}pm2 status${NC}             - View all processes"
echo -e "  • ${YELLOW}pm2 logs${NC}               - View all logs (live)"
echo -e "  • ${YELLOW}pm2 logs production${NC}    - View Next.js logs"
echo -e "  • ${YELLOW}pm2 logs redis${NC}         - View Redis logs"
echo -e "  • ${YELLOW}pm2 logs worker${NC}        - View worker logs"
echo -e "  • ${YELLOW}pm2 logs genkit${NC}        - View Genkit logs"
echo -e "  • ${YELLOW}pm2 restart all${NC}        - Restart all services"
echo -e "  • ${YELLOW}pm2 stop all${NC}           - Stop all services"
echo -e "  • ${YELLOW}pm2 monit${NC}              - Monitor resources"
echo ""
echo -e "${BLUE}Log files location:${NC}"
echo -e "  • ${PROJECT_DIR}/logs/"
echo ""

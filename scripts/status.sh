#!/bin/bash

###############################################################################
# CSMS Application Status Script
#
# Shows status of all services and useful information
###############################################################################

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              CSMS Application Status                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📊 PM2 Processes:${NC}"
pm2 status
echo ""

echo -e "${YELLOW}💾 Memory Usage:${NC}"
pm2 describe production | grep -E "memory|cpu" || true
echo ""

echo -e "${YELLOW}🌐 Port 9002 Status:${NC}"
if lsof -i :9002 >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Port 9002 is in use (application running)${NC}"
    lsof -i :9002
else
    echo -e "${YELLOW}⚠ Port 9002 is not in use${NC}"
fi
echo ""

echo -e "${YELLOW}📡 Redis Status:${NC}"
if redis-cli ping >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is responding${NC}"
    redis-cli info server | grep redis_version || true
else
    echo -e "${YELLOW}⚠ Redis is not responding${NC}"
fi
echo ""

echo -e "${BLUE}Services:${NC}"
echo -e "  • Next.js:  https://csms.zanajira.go.tz"
echo -e "  • Redis:    localhost:6379"
echo ""

echo -e "${BLUE}Quick Commands:${NC}"
echo -e "  • ${YELLOW}npm run start:all${NC}   - Start all services"
echo -e "  • ${YELLOW}npm run stop:all${NC}    - Stop all services"
echo -e "  • ${YELLOW}npm run restart:all${NC} - Restart all services"
echo -e "  • ${YELLOW}pm2 logs${NC}            - View all logs"
echo -e "  • ${YELLOW}pm2 monit${NC}           - Monitor resources"
echo ""

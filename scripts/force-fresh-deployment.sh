#!/bin/bash

# Force Fresh Deployment - Nuclear Option
# This script aggressively clears ALL caches and forces a completely fresh build

set -e  # Exit on error

echo "========================================="
echo "FORCE FRESH DEPLOYMENT"
echo "========================================="
echo "This will completely clear all caches and rebuild from scratch"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/latest

echo -e "${RED}[1/13] Stopping PM2 processes...${NC}"
pm2 stop all || true
pm2 delete all || true
echo -e "${GREEN}✓ All PM2 processes stopped${NC}"
echo ""

echo -e "${RED}[2/13] Clearing Next.js build directory...${NC}"
if [ -d ".next" ]; then
    rm -rf .next
    echo -e "${GREEN}✓ .next directory removed${NC}"
else
    echo -e "${BLUE}ℹ No .next directory found${NC}"
fi
echo ""

echo -e "${RED}[3/13] Clearing node_modules/.cache...${NC}"
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo -e "${GREEN}✓ node_modules/.cache cleared${NC}"
else
    echo -e "${BLUE}ℹ No cache found${NC}"
fi
echo ""

echo -e "${RED}[4/13] Clearing npm cache...${NC}"
npm cache clean --force
echo -e "${GREEN}✓ npm cache cleared${NC}"
echo ""

echo -e "${RED}[5/13] Clearing Prisma generated files...${NC}"
if [ -d "node_modules/.prisma" ]; then
    rm -rf node_modules/.prisma
    echo -e "${GREEN}✓ Prisma cache cleared${NC}"
else
    echo -e "${BLUE}ℹ No Prisma cache found${NC}"
fi
echo ""

echo -e "${YELLOW}[6/13] Reinstalling dependencies...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies reinstalled${NC}"
echo ""

echo -e "${YELLOW}[7/13] Regenerating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client regenerated${NC}"
echo ""

echo -e "${YELLOW}[8/13] Building production application...${NC}"
NODE_ENV=production npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

echo -e "${YELLOW}[9/12] Clearing Nginx cache...${NC}"
# Clear nginx cache directories
if [ -d "/www/server/nginx/proxy_cache_dir" ]; then
    rm -rf /www/server/nginx/proxy_cache_dir/*
    echo -e "${GREEN}✓ Nginx proxy cache cleared${NC}"
fi
if [ -d "/var/cache/nginx" ]; then
    rm -rf /var/cache/nginx/*
    echo -e "${GREEN}✓ Nginx cache cleared${NC}"
fi
echo ""

echo -e "${YELLOW}[10/12] Reloading Nginx...${NC}"
if command -v nginx &> /dev/null; then
    if nginx -t 2>&1; then
        systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
        echo -e "${GREEN}✓ Nginx reloaded${NC}"
    else
        echo -e "${RED}✗ Nginx config test failed${NC}"
    fi
else
    echo -e "${BLUE}ℹ Nginx not found${NC}"
fi
echo ""

echo -e "${YELLOW}[11/12] Starting PM2 processes...${NC}"
pm2 start ecosystem.config.js
echo -e "${GREEN}✓ PM2 processes started${NC}"
echo ""

echo -e "${YELLOW}[12/12] Saving PM2 configuration...${NC}"
pm2 save
echo -e "${GREEN}✓ PM2 configuration saved${NC}"
echo ""

echo -e "${YELLOW}[13/13] Checking PM2 status...${NC}"
pm2 status
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${GREEN}Fresh deployment completed:${NC}"
echo "✓ All caches cleared (npm, Next.js, Prisma, Nginx)"
echo "✓ Fresh npm install"
echo "✓ Fresh Prisma generation"
echo "✓ Fresh Next.js build with new hashes"
echo "✓ Nginx cache cleared and reloaded"
echo "✓ PM2 processes restarted"
echo ""
echo -e "${YELLOW}Testing the application:${NC}"
echo "1. Open: https://csms.zanajira.go.tz/dashboard/add-employee"
echo "2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. Clear browser cache if needed"
echo "4. Check that required fields show red asterisk (*)"
echo "5. Test ZSSF/Payroll duplicate validation"
echo ""
echo -e "${YELLOW}Monitor logs:${NC}"
echo "- Production: pm2 logs production"
echo "- Worker: pm2 logs redis-worker"
echo "- All errors: pm2 logs --err"
echo "- Real-time: pm2 monit"
echo ""
echo -e "${RED}If still not working:${NC}"
echo "1. Clear browser cache completely (Settings → Clear browsing data)"
echo "2. Try incognito/private window"
echo "3. Try different browser"
echo "4. Check build output above for errors"
echo "5. Check: curl -I https://csms.zanajira.go.tz/dashboard/add-employee"
echo ""

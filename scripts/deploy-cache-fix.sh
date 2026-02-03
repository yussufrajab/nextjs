#!/bin/bash

# Cache Fix Deployment Script
# This script rebuilds and restarts the Next.js application with the cache fixes
# Addresses server-side caching issues: Next.js route caching, API response caching, and build cache

set -e  # Exit on error

echo "========================================="
echo "Cache Fix Deployment Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /www/wwwroot/nextjspro

echo -e "${YELLOW}[1/9] Checking current status...${NC}"
pm2 status || echo "PM2 not running"
echo ""

echo -e "${YELLOW}[2/9] Clearing Next.js build cache...${NC}"
if [ -d ".next/cache" ]; then
    rm -rf .next/cache
    echo -e "${GREEN}✓ Next.js cache cleared${NC}"
else
    echo -e "${BLUE}ℹ No cache directory found (already clean)${NC}"
fi
echo ""

echo -e "${YELLOW}[3/9] Clearing Next.js standalone build...${NC}"
if [ -d ".next/standalone" ]; then
    rm -rf .next/standalone
    echo -e "${GREEN}✓ Standalone build cleared${NC}"
else
    echo -e "${BLUE}ℹ No standalone build found${NC}"
fi
echo ""

echo -e "${YELLOW}[4/9] Installing dependencies...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}[5/9] Building production application (with cache cleared)...${NC}"
npm run build
echo -e "${GREEN}✓ Build completed${NC}"
echo ""

echo -e "${YELLOW}[6/9] Reloading Nginx (if available)...${NC}"
if command -v nginx &> /dev/null; then
    if nginx -t &> /dev/null; then
        systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || echo -e "${BLUE}ℹ Nginx reload skipped (no sudo or not running)${NC}"
        echo -e "${GREEN}✓ Nginx configuration reloaded${NC}"
    else
        echo -e "${RED}✗ Nginx configuration test failed - skipping reload${NC}"
    fi
else
    echo -e "${BLUE}ℹ Nginx not found - skipping${NC}"
fi
echo ""

echo -e "${YELLOW}[7/9] Restarting PM2 processes...${NC}"
pm2 restart ecosystem.config.js --update-env
echo -e "${GREEN}✓ PM2 processes restarted${NC}"
echo ""

echo -e "${YELLOW}[8/9] Checking PM2 status...${NC}"
pm2 status
echo ""

echo -e "${YELLOW}[9/9] Showing recent logs...${NC}"
echo -e "${BLUE}Production logs:${NC}"
pm2 logs production --lines 15 --nostream || true
echo ""
echo -e "${BLUE}Worker logs:${NC}"
pm2 logs redis-worker --lines 15 --nostream || true
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${GREEN}Cache Fix Applied:${NC}"
echo "✓ Next.js build cache cleared"
echo "✓ Fresh build with no-cache API routes"
echo "✓ Auto-refresh user data enabled"
echo "✓ Cache-busting timestamps added"
echo "✓ Comprehensive cache-control headers"
echo ""
echo -e "${YELLOW}Testing Steps:${NC}"
echo "1. Test the application at: https://csms.zanajira.go.tz/dashboard/add-employee"
echo "2. Open browser console and verify logs show fresh data"
echo "3. Check Network tab - verify no cached responses (200, not 304)"
echo "4. Test 'Refresh User Data' button if needed"
echo ""
echo -e "${YELLOW}Monitoring:${NC}"
echo "- Production logs: pm2 logs production"
echo "- Worker logs: pm2 logs redis-worker"
echo "- Error logs: pm2 logs production --err"
echo "- Real-time: pm2 monit"
echo ""
echo -e "${YELLOW}User Action Required:${NC}"
echo "Users with stale data in localStorage should:"
echo "1. Click 'Refresh User Data' button on error page, OR"
echo "2. Clear browser localStorage (F12 → Console → localStorage.clear())"
echo "3. Re-login to get fresh session data"
echo ""
echo -e "${RED}If issues occur:${NC}"
echo "- Review troubleshooting: cat CACHE_FIX_DEPLOYMENT.md"
echo "- Check API headers: curl -I https://csms.zanajira.go.tz/api/auth/refresh-user-data"
echo "- Verify institutionId in database for affected users"
echo ""

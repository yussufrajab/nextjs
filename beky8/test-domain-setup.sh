#!/bin/bash

# Test script for test.zanajira.go.tz configuration
# Run this after completing aaPanel setup

echo "========================================="
echo "CSMS Domain Configuration Test"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: DNS Resolution
echo "1. Testing DNS resolution..."
DNS_IP=$(dig +short test.zanajira.go.tz | head -1)
if [ "$DNS_IP" == "102.207.206.28" ]; then
    echo -e "${GREEN}✓ DNS resolves correctly to 102.207.206.28${NC}"
else
    echo -e "${RED}✗ DNS does not resolve correctly${NC}"
    echo "  Expected: 102.207.206.28"
    echo "  Got: $DNS_IP"
fi
echo ""

# Test 2: Check if app is running
echo "2. Checking if Next.js app is running..."
if pm2 status | grep -q "online"; then
    echo -e "${GREEN}✓ Next.js app is running${NC}"
    pm2 status | grep csms
else
    echo -e "${RED}✗ Next.js app is not running${NC}"
    echo "  Run: pm2 start ecosystem.config.js"
fi
echo ""

# Test 3: Check local port 9002
echo "3. Testing local port 9002..."
if curl -s http://localhost:9002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ App responds on port 9002${NC}"
else
    echo -e "${RED}✗ App not responding on port 9002${NC}"
fi
echo ""

# Test 4: Check HTTP access
echo "4. Testing HTTP access (http://test.zanajira.go.tz)..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: test.zanajira.go.tz" http://102.207.206.28/ 2>/dev/null)
if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "301" ] || [ "$HTTP_STATUS" == "302" ]; then
    echo -e "${GREEN}✓ HTTP access working (Status: $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ HTTP returned status: $HTTP_STATUS${NC}"
    echo "  If you haven't configured aaPanel yet, this is expected"
fi
echo ""

# Test 5: Check HTTPS access
echo "5. Testing HTTPS access (https://test.zanajira.go.tz)..."
if curl -sk https://test.zanajira.go.tz > /dev/null 2>&1; then
    HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://test.zanajira.go.tz/)
    echo -e "${GREEN}✓ HTTPS access working (Status: $HTTPS_STATUS)${NC}"

    # Check SSL certificate
    echo "  Checking SSL certificate..."
    SSL_EXPIRY=$(echo | openssl s_client -servername test.zanajira.go.tz -connect 102.207.206.28:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter)
    if [ ! -z "$SSL_EXPIRY" ]; then
        echo -e "  ${GREEN}SSL Certificate: $SSL_EXPIRY${NC}"
    fi
else
    echo -e "${YELLOW}⚠ HTTPS not accessible yet${NC}"
    echo "  This is normal if SSL hasn't been configured yet"
fi
echo ""

# Test 6: Check Nginx configuration
echo "6. Checking Nginx status..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx is running${NC}"
elif command -v nginx >/dev/null 2>&1; then
    if pgrep nginx > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Nginx is running (via aaPanel)${NC}"
    else
        echo -e "${RED}✗ Nginx is not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cannot detect Nginx status${NC}"
fi
echo ""

# Test 7: Check if port 9002 is accessible from outside
echo "7. Checking port 9002 accessibility..."
if command -v netstat >/dev/null 2>&1; then
    if netstat -tuln | grep -q ":9002"; then
        LISTEN_ADDR=$(netstat -tuln | grep ":9002" | awk '{print $4}')
        echo -e "${GREEN}✓ Port 9002 is listening on: $LISTEN_ADDR${NC}"
        if echo "$LISTEN_ADDR" | grep -q "127.0.0.1"; then
            echo -e "  ${GREEN}✓ Correctly bound to localhost only (secure)${NC}"
        else
            echo -e "  ${YELLOW}⚠ Port exposed on all interfaces (consider binding to localhost only)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠ netstat not available, skipping${NC}"
fi
echo ""

# Summary
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "Next Steps:"
echo ""
if [ "$DNS_IP" != "102.207.206.28" ]; then
    echo -e "${YELLOW}→ Configure DNS A record for test.zanajira.go.tz${NC}"
fi
if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "301" ] && [ "$HTTP_STATUS" != "302" ]; then
    echo -e "${YELLOW}→ Configure reverse proxy in aaPanel${NC}"
fi
if ! curl -sk https://test.zanajira.go.tz > /dev/null 2>&1; then
    echo -e "${YELLOW}→ Install SSL certificate in aaPanel${NC}"
fi
echo ""
echo "For detailed instructions, see:"
echo "  /home/latest/aapanel-configuration-guide.md"
echo ""

# Test from browser message
echo "========================================="
echo "Manual Browser Tests"
echo "========================================="
echo ""
echo "After completing aaPanel setup, test in browser:"
echo "  1. http://test.zanajira.go.tz/ (should redirect to HTTPS)"
echo "  2. https://test.zanajira.go.tz/ (should show CSMS login)"
echo "  3. Test login functionality"
echo "  4. Check browser console for errors"
echo ""

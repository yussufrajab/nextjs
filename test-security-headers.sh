#!/bin/bash

# Security Headers Testing Script
# Tests all security headers configured in next.config.ts

URL="${1:-http://localhost:9002}"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     Security Headers Test - CSMS Application              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Testing URL: $URL"
echo "───────────────────────────────────────────────────────────"
echo ""

# Array of headers to check with their expected values
declare -A headers=(
  ["X-Frame-Options"]="SAMEORIGIN"
  ["X-Content-Type-Options"]="nosniff"
  ["X-XSS-Protection"]="1; mode=block"
  ["Referrer-Policy"]="strict-origin-when-cross-origin"
  ["X-DNS-Prefetch-Control"]="on"
  ["X-Permitted-Cross-Domain-Policies"]="none"
  ["Cross-Origin-Embedder-Policy"]="require-corp"
  ["Cross-Origin-Opener-Policy"]="same-origin"
  ["Cross-Origin-Resource-Policy"]="same-origin"
)

# Special headers that need different handling
special_headers=(
  "Strict-Transport-Security"
  "Permissions-Policy"
  "Content-Security-Policy"
)

# Counters
total=0
passed=0
failed=0

# Test regular headers
echo "📋 Testing Security Headers..."
echo ""

for header in "${!headers[@]}"; do
  total=$((total + 1))
  expected="${headers[$header]}"
  actual=$(curl -s -I "$URL" | grep -i "^$header:" | cut -d' ' -f2- | tr -d '\r')

  if [ "$actual" = "$expected" ]; then
    echo "✅ $header"
    echo "   Value: $actual"
    passed=$((passed + 1))
  else
    echo "❌ $header"
    echo "   Expected: $expected"
    echo "   Actual: ${actual:-NOT FOUND}"
    failed=$((failed + 1))
  fi
  echo ""
done

# Test HSTS (value depends on environment)
echo "🔒 Testing HSTS (Strict-Transport-Security)..."
total=$((total + 1))
hsts=$(curl -s -I "$URL" | grep -i "^Strict-Transport-Security:" | cut -d' ' -f2- | tr -d '\r')

if [ -n "$hsts" ]; then
  echo "✅ Strict-Transport-Security"
  echo "   Value: $hsts"

  # Check if it's production (max-age > 0) or development (max-age=0)
  if [[ "$hsts" == *"max-age=0"* ]]; then
    echo "   Environment: Development (HSTS disabled)"
  else
    echo "   Environment: Production (HSTS enabled)"
  fi
  passed=$((passed + 1))
else
  echo "❌ Strict-Transport-Security: NOT FOUND"
  failed=$((failed + 1))
fi
echo ""

# Test Permissions-Policy
echo "🎭 Testing Permissions Policy..."
total=$((total + 1))
perms=$(curl -s -I "$URL" | grep -i "^Permissions-Policy:" | cut -d' ' -f2- | tr -d '\r')

if [ -n "$perms" ]; then
  echo "✅ Permissions-Policy"
  echo "   Value: $perms"

  # Check for expected restrictions
  if [[ "$perms" == *"camera=()"* ]] && [[ "$perms" == *"microphone=()"* ]]; then
    echo "   ✓ Camera and microphone access blocked"
  fi
  if [[ "$perms" == *"geolocation=()"* ]]; then
    echo "   ✓ Geolocation access blocked"
  fi
  if [[ "$perms" == *"interest-cohort=()"* ]]; then
    echo "   ✓ FLoC tracking blocked"
  fi
  passed=$((passed + 1))
else
  echo "❌ Permissions-Policy: NOT FOUND"
  failed=$((failed + 1))
fi
echo ""

# Test CSP
echo "🛡️  Testing Content Security Policy..."
total=$((total + 1))
csp=$(curl -s -I "$URL" | grep -i "^Content-Security-Policy:" | cut -d' ' -f2- | tr -d '\r')

if [ -n "$csp" ]; then
  echo "✅ Content-Security-Policy"
  echo "   Policy configured with following directives:"

  # Check for key directives
  if [[ "$csp" == *"default-src 'self'"* ]]; then
    echo "   ✓ default-src: 'self' (secure default)"
  fi
  if [[ "$csp" == *"object-src 'none'"* ]]; then
    echo "   ✓ object-src: 'none' (plugins blocked)"
  fi
  if [[ "$csp" == *"frame-ancestors 'self'"* ]]; then
    echo "   ✓ frame-ancestors: 'self' (clickjacking protection)"
  fi
  if [[ "$csp" == *"upgrade-insecure-requests"* ]]; then
    echo "   ✓ upgrade-insecure-requests (force HTTPS)"
  fi

  # Warning for unsafe directives
  if [[ "$csp" == *"'unsafe-inline'"* ]] || [[ "$csp" == *"'unsafe-eval'"* ]]; then
    echo "   ⚠️  Warning: Contains 'unsafe-inline' or 'unsafe-eval'"
    echo "      (Required for Next.js, but consider nonces for stricter policy)"
  fi

  passed=$((passed + 1))
else
  echo "❌ Content-Security-Policy: NOT FOUND"
  failed=$((failed + 1))
fi
echo ""

# Summary
echo "───────────────────────────────────────────────────────────"
echo ""
echo "📊 Test Summary:"
echo ""
echo "   Total Headers: $total"
echo "   ✅ Passed: $passed"
echo "   ❌ Failed: $failed"
echo ""

# Calculate percentage
percentage=$(( passed * 100 / total ))

# Grade based on percentage
if [ $percentage -eq 100 ]; then
  grade="A+"
  color="🟢"
elif [ $percentage -ge 90 ]; then
  grade="A"
  color="🟢"
elif [ $percentage -ge 80 ]; then
  grade="B"
  color="🟡"
elif [ $percentage -ge 70 ]; then
  grade="C"
  color="🟠"
else
  grade="F"
  color="🔴"
fi

echo "   Score: $percentage% - Grade: $grade $color"
echo ""

# Recommendations
if [ $failed -gt 0 ]; then
  echo "⚠️  Recommendations:"
  echo "   - Review failed headers in next.config.ts"
  echo "   - Ensure server has been restarted after config changes"
  echo "   - Check for any middleware overriding headers"
  echo ""
fi

# Additional checks
echo "🔍 Additional Security Checks:"
echo ""

# Check if HTTPS is enforced (in production)
if [[ "$hsts" == *"max-age=0"* ]]; then
  echo "   ℹ️  HTTPS Enforcement: Disabled (Development mode)"
else
  echo "   ✅ HTTPS Enforcement: Enabled (Production mode)"
fi

# Check for common security misconfigurations
response=$(curl -s -I "$URL")

if echo "$response" | grep -qi "Server:"; then
  server_header=$(echo "$response" | grep -i "^Server:" | cut -d' ' -f2- | tr -d '\r')
  echo "   ⚠️  Server header exposed: $server_header"
  echo "      (Consider hiding this in production)"
else
  echo "   ✅ Server header: Hidden"
fi

if echo "$response" | grep -qi "X-Powered-By:"; then
  powered_by=$(echo "$response" | grep -i "^X-Powered-By:" | cut -d' ' -f2- | tr -d '\r')
  echo "   ⚠️  X-Powered-By header exposed: $powered_by"
  echo "      (Remove this header in production)"
else
  echo "   ✅ X-Powered-By header: Not present"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Test Complete!                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Exit with appropriate code
if [ $failed -gt 0 ]; then
  exit 1
else
  exit 0
fi

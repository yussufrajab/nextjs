#!/bin/bash

echo "🔍 Testing HRIMS API Connectivity..."
echo "=================================="

# HRIMS Configuration
HRIMS_URL="http://10.0.217.11:8135/api/Employees"
API_KEY="0ea1e3f5-ea57-410b-a199-246fa288b851"
TOKEN="CfDJ8M6SKjORsSdBliudb_vdU_DEea8FKIcQckiBxdvt4EJgtcP0ba_3REOpGvWYeOF46fvqw8heVnqFnXTwOmD5Wg5Qg3yNJlwyGDHVhqbgyKxB31Bjh2pI6C2qAYnLMovU4XLlQFVu7cTpIqtgItNZpM4"

# Test 1: Employee List
echo ""
echo "📋 Test 1: Employee List (RequestId: 201)"
echo "----------------------------------------"

curl -X POST "$HRIMS_URL" \
  -H "ApiKey: $API_KEY" \
  -H "Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "RequestId": "201",
    "RequestPayloadData": {
      "PageNumber": 0,
      "PageSize": 5
    }
  }' \
  --connect-timeout 30 \
  --max-time 60 \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -S

echo ""
echo "========================================"

# Test 2: Specific Employee
echo ""
echo "👤 Test 2: Specific Employee (RequestId: 202)"
echo "---------------------------------------------"

curl -X POST "$HRIMS_URL" \
  -H "ApiKey: $API_KEY" \
  -H "Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "RequestId": "202",
    "RequestPayloadData": {
      "RequestBody": "536151"
    }
  }' \
  --connect-timeout 30 \
  --max-time 60 \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -S

echo ""
echo "========================================"

# Test 3: Employee Photo
echo ""
echo "📸 Test 3: Employee Photo (RequestId: 203)"
echo "------------------------------------------"

curl -X POST "$HRIMS_URL" \
  -H "ApiKey: $API_KEY" \
  -H "Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "RequestId": "203",
    "RequestPayloadData": {
      "RequestBody": "536151"
    }
  }' \
  --connect-timeout 30 \
  --max-time 60 \
  -w "\n\nHTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  -s -S

echo ""
echo "🏁 HRIMS API Tests Complete"
echo "=========================="
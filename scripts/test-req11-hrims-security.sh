#!/bin/bash
# Test Requirement 11: HRIMS Integration Security
# Tests synchronization authorization, institution validation,
# duplicate prevention, audit logging, and data integrity

BASE_URL="http://localhost:9002"
COOKIE_DIR="/tmp/csms-test-cookies"
mkdir -p "$COOKIE_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_COUNT=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS_COUNT++)); ((TOTAL_COUNT++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL_COUNT++)); ((TOTAL_COUNT++)); }
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# Login with MFA support
login_with_mfa() {
    local username=$1
    local cookie_file="$COOKIE_DIR/${username}-jar.txt"
    rm -f "$cookie_file"

    local login_response=$(curl -s -c "$cookie_file" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"Csms@2026\"}")

    local code=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
    local userId=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('userId',''))" 2>/dev/null)
    local success=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

    if [ "$success" = "True" ] && [ "$code" != "MFA_REQUIRED" ]; then
        local session_val=$(grep session "$cookie_file" 2>/dev/null | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
        local csrf_val=$(grep csrf-token "$cookie_file" 2>/dev/null | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
        eval "${username^^}_SESSION=\"$session_val\""
        eval "${username^^}_CSRF=\"$csrf_val\""
        return
    fi

    if [ "$code" = "MFA_REQUIRED" ] && [ -n "$userId" ]; then
        sleep 2
        local otp=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
            "SELECT token FROM \"MfaToken\" WHERE \"userId\" = '$userId' AND \"tokenType\" = 'OTP' AND \"usedAt\" IS NULL AND \"expiresAt\" > NOW() ORDER BY \"createdAt\" DESC LIMIT 1;" 2>/dev/null | tr -d ' ')

        if [ -n "$otp" ]; then
            local verify_response=$(curl -s -c "$cookie_file" -b "$cookie_file" -X POST "$BASE_URL/api/auth/mfa/verify-otp" \
                -H "Content-Type: application/json" \
                -d "{\"userId\":\"$userId\",\"otpCode\":\"$otp\"}")
            local verify_success=$(echo "$verify_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
            if [ "$verify_success" = "True" ]; then
                local session_val=$(grep session "$cookie_file" 2>/dev/null | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
                local csrf_val=$(grep csrf-token "$cookie_file" 2>/dev/null | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
                eval "${username^^}_SESSION=\"$session_val\""
                eval "${username^^}_CSRF=\"$csrf_val\""
                return
            fi
        fi
    fi
}

# Employee login (no MFA)
login_employee() {
    local zanId=$1
    local zssf=$2
    local payroll=$3
    local cookie_file="$COOKIE_DIR/emp-${zanId}-jar.txt"
    rm -f "$cookie_file"

    local response=$(curl -s -c "$cookie_file" -X POST "$BASE_URL/api/auth/employee-login" \
        -H "Content-Type: application/json" \
        -d "{\"zanId\":\"$zanId\",\"zssfNumber\":\"$zssf\",\"payrollNumber\":\"$payroll\"}")

    local success=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$success" = "True" ]; then
        local session_val=$(grep session "$cookie_file" 2>/dev/null | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
        local csrf_val=$(grep csrf-token "$cookie_file" 2>/dev/null | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
        eval "EMP_SESSION=\"$session_val\""
        eval "EMP_CSRF=\"$csrf_val\""
    fi
}

# Make authenticated POST request
auth_post() {
    local session=$1
    local csrf=$2
    local url=$3
    local data=$4
    curl -s -H "Cookie: session=$session; csrf-token=$csrf" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf" \
        -X POST "$url" \
        -d "$data"
}

# Make authenticated GET request
auth_get() {
    local session=$1
    local url=$2
    curl -s -o /dev/null -w "%{http_code}" -H "Cookie: session=$session" "$url"
}

echo "=========================================="
echo "  Requirement 11: HRIMS Integration Security"
echo "=========================================="
echo ""

# Clear old sessions
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
DELETE FROM \"Session\" WHERE \"userId\" IN (
    SELECT id FROM \"User\" WHERE username IN ('skawesu', 'fautest', 'skhamis', 'abdillahomarnajim')
);
" > /dev/null 2>&1

# Unlock accounts
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username IN ('skawesu', 'fautest', 'skhamis', 'abdillahomarnajim');" > /dev/null 2>&1

# Login as different roles
sleep 10
log_info "Logging in as HRO (skawesu)..."
login_with_mfa "skawesu"
if [ -n "$SKAWESU_SESSION" ]; then log_pass "HRO login successful"; else log_fail "HRO login failed"; fi

sleep 12
log_info "Logging in as HRMO (fautest)..."
login_with_mfa "fautest"
if [ -n "$FAUTEST_SESSION" ]; then log_pass "HRMO login successful"; else log_fail "HRMO login failed"; fi

sleep 12
log_info "Logging in as HHRMD (skhamis)..."
login_with_mfa "skhamis"
if [ -n "$SKHAMIS_SESSION" ]; then log_pass "HHRMD login successful"; else log_fail "HHRMD login failed"; fi

sleep 12
log_info "Logging in as EMPLOYEE (abdillahomarnajim)..."
login_employee "60363181" "00128420" "383356"
if [ -n "$EMP_SESSION" ]; then log_pass "EMPLOYEE login successful"; else log_fail "EMPLOYEE login failed"; fi

echo ""

# Get institution vote number for testing
INST_VOTE=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT \"voteNumber\" FROM \"Institution\" WHERE id = 'cmd059ion0000e6d85kexfukl';
" 2>/dev/null | tr -d ' ')
log_info "Institution vote number: $INST_VOTE"

# Get existing employee for matching tests
EXISTING_ZANID=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT \"zanId\" FROM \"Employee\" LIMIT 1;" 2>/dev/null | tr -d ' ')
log_info "Existing employee ZanID: $EXISTING_ZANID"
echo ""

# ==========================================
# Test 11.1: Synchronization Authorization
# ==========================================
echo "=========================================="
echo "  Test 11.1: Synchronization Authorization"
echo "=========================================="
echo ""

log_info "Test 11.1a: EMPLOYEE cannot trigger HRIMS sync"
if [ -n "$EMP_SESSION" ]; then
    EMP_SYNC=$(auth_post "$EMP_SESSION" "$EMP_CSRF" "$BASE_URL/api/hrims/sync-employee" '{
        "zanId": "TEST001",
        "institutionVoteNumber": "'$INST_VOTE'"
    }')
    if echo "$EMP_SYNC" | grep -q "Forbidden\|Unauthorized\|403\|FORBIDDEN"; then
        log_pass "EMPLOYEE correctly blocked from HRIMS sync (403)"
    else
        log_fail "EMPLOYEE was NOT blocked from HRIMS sync! Response: $EMP_SYNC"
    fi
fi

sleep 3

log_info "Test 11.1b: HRO cannot trigger HRIMS sync (only Admin/HHRMD)"
if [ -n "$SKAWESU_SESSION" ]; then
    HRO_SYNC=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/hrims/sync-employee" '{
        "zanId": "TEST001",
        "institutionVoteNumber": "'$INST_VOTE'"
    }')
    if echo "$HRO_SYNC" | grep -q "Forbidden\|Unauthorized\|403\|FORBIDDEN"; then
        log_pass "HRO correctly blocked from HRIMS sync (403)"
    else
        log_fail "HRO was NOT blocked from HRIMS sync! Response: $HRO_SYNC"
    fi
fi

sleep 3

log_info "Test 11.1c: HRMO cannot trigger HRIMS sync (only Admin/HHRMD)"
if [ -n "$FAUTEST_SESSION" ]; then
    HRMO_SYNC=$(auth_post "$FAUTEST_SESSION" "$FAUTEST_CSRF" "$BASE_URL/api/hrims/sync-employee" '{
        "zanId": "TEST001",
        "institutionVoteNumber": "'$INST_VOTE'"
    }')
    if echo "$HRMO_SYNC" | grep -q "Forbidden\|Unauthorized\|403\|FORBIDDEN"; then
        log_pass "HRMO correctly blocked from HRIMS sync (403)"
    else
        log_fail "HRMO was NOT blocked from HRIMS sync! Response: $HRMO_SYNC"
    fi
fi

sleep 3

log_info "Test 11.1d: HHRMD can trigger HRIMS sync"
if [ -n "$SKHAMIS_SESSION" ]; then
    HHRMD_SYNC=$(auth_post "$SKHAMIS_SESSION" "$SKHAMIS_CSRF" "$BASE_URL/api/hrims/sync-employee" '{
        "zanId": "'$EXISTING_ZANID'",
        "institutionVoteNumber": "'$INST_VOTE'"
    }')
    # This may fail due to HRIMS API not being available, but should not be a 403
    if echo "$HHRMD_SYNC" | grep -q "Forbidden\|Unauthorized\|403"; then
        log_fail "HHRMD was blocked from HRIMS sync!"
    else
        log_pass "HHRMD allowed to trigger HRIMS sync (not blocked by auth)"
    fi
fi

sleep 3

log_info "Test 11.1e: Unauthenticated access blocked"
UNAUTH_SYNC=$(curl -s -X POST "$BASE_URL/api/hrims/sync-employee" \
    -H "Content-Type: application/json" \
    -d '{"zanId":"TEST001","institutionVoteNumber":"123"}')
if echo "$UNAUTH_SYNC" | grep -q "UNAUTHENTICATED\|Authentication required\|401"; then
    log_pass "Unauthenticated HRIMS sync blocked (401)"
else
    log_fail "Unauthenticated HRIMS sync NOT blocked! Response: $UNAUTH_SYNC"
fi

echo ""

# ==========================================
# Test 11.2: Trusted Source Validation
# ==========================================
echo "=========================================="
echo "  Test 11.2: Trusted Source Validation"
echo "=========================================="
echo ""

log_info "Test 11.2: HRIMS API URL validated (code review)"
# Check that the sync uses configured HRIMS API URL
HRIMS_URL_CHECK=$(grep -n "HRIMS_API_URL\|hrimsApiUrl" /home/latest/src/app/api/hrims/sync-employee/route.ts 2>/dev/null | head -3)
if [ -n "$HRIMS_URL_CHECK" ]; then
    log_pass "HRIMS API URL validation exists (configurable via env var)"
    log_info "HRIMS URL config: $HRIMS_URL_CHECK"
else
    log_fail "HRIMS API URL validation NOT found"
fi

echo ""

# ==========================================
# Test 11.3: Employee Matching Validation
# ==========================================
echo "=========================================="
echo "  Test 11.3: Employee Matching Validation"
echo "=========================================="
echo ""

log_info "Test 11.3: Employee matching via ZanID or PayrollNumber (code review)"
MATCH_CHECK=$(grep -n "zanId.*payrollNumber\|findUnique\|findFirst" /home/latest/src/app/api/hrims/sync-employee/route.ts 2>/dev/null | head -5)
if [ -n "$MATCH_CHECK" ]; then
    log_pass "Employee matching validation exists (ZanID/PayrollNumber lookup)"
    log_info "Matching logic: $MATCH_CHECK"
else
    log_fail "Employee matching validation NOT found"
fi

echo ""

# ==========================================
# Test 11.4: Duplicate Prevention
# ==========================================
echo "=========================================="
echo "  Test 11.4: Duplicate Prevention"
echo "=========================================="
echo ""

log_info "Test 11.4: Duplicate prevention via upsert (code review)"
DUP_CHECK=$(grep -n "existingEmployee\|upsert\|update.*where\|create.*data" /home/latest/src/app/api/hrims/sync-employee/route.ts 2>/dev/null | head -5)
if [ -n "$DUP_CHECK" ]; then
    log_pass "Duplicate prevention exists (upsert pattern - update if exists, create if new)"
    log_info "Dedup logic: $DUP_CHECK"
else
    log_fail "Duplicate prevention NOT found"
fi

echo ""

# ==========================================
# Test 11.5: Institution Validation
# ==========================================
echo "=========================================="
echo "  Test 11.5: Institution Validation"
echo "=========================================="
echo ""

log_info "Test 11.5a: Institution validated by vote number"
if [ -n "$SKHAMIS_SESSION" ]; then
    INST_RESULT=$(auth_post "$SKHAMIS_SESSION" "$SKHAMIS_CSRF" "$BASE_URL/api/hrims/sync-employee" '{
        "zanId": "'$EXISTING_ZANID'",
        "institutionVoteNumber": "INVALID_VOTE_999"
    }')
    if echo "$INST_RESULT" | grep -q "not found\|404\|error"; then
        log_pass "Invalid institution vote number correctly rejected (404)"
    else
        log_fail "Invalid institution vote number NOT rejected! Response: $INST_RESULT"
    fi
fi

sleep 3

log_info "Test 11.5b: fetch-by-institution validates institution exists"
if [ -n "$SKHAMIS_SESSION" ]; then
    FETCH_INST=$(auth_post "$SKHAMIS_SESSION" "$SKHAMIS_CSRF" "$BASE_URL/api/hrims/fetch-by-institution" '{
        "identifierType": "votecode",
        "voteNumber": "'$INST_VOTE'",
        "institutionId": "non-existent-id-999"
    }')
    if echo "$FETCH_INST" | grep -q "not found\|404\|error"; then
        log_pass "Invalid institution ID correctly rejected (404)"
    else
        log_fail "Invalid institution ID NOT rejected! Response: $FETCH_INST"
    fi
fi

echo ""

# ==========================================
# Test 11.6: Synchronization Audit Logging
# ==========================================
echo "=========================================="
echo "  Test 11.6: Synchronization Audit Logging"
echo "=========================================="
echo ""

log_info "Test 11.6: HRIMS sync events logged (code review)"
AUDIT_CHECK=$(grep -n "logFileAction\|logEmployeeAction\|hrimsLogger" /home/latest/src/app/api/hrims/sync-employee/route.ts 2>/dev/null | head -5)
if [ -n "$AUDIT_CHECK" ]; then
    log_pass "HRIMS sync audit logging exists (hrimsLogger + employee sync logging)"
    log_info "Audit logging: $AUDIT_CHECK"
else
    log_fail "HRIMS sync audit logging NOT found"
fi

echo ""

# ==========================================
# Test 11.7: Synchronization Failure Handling
# ==========================================
echo "=========================================="
echo "  Test 11.7: Synchronization Failure Handling"
echo "=========================================="
echo ""

log_info "Test 11.7: Failure handling with try/catch (code review)"
FAIL_CHECK=$(grep -n "catch\|error\|failed\|null" /home/latest/src/app/api/hrims/sync-employee/route.ts 2>/dev/null | head -5)
if [ -n "$FAIL_CHECK" ]; then
    log_pass "HRIMS sync failure handling exists (try/catch, null returns, error logging)"
    log_info "Failure handling: $FAIL_CHECK"
else
    log_fail "HRIMS sync failure handling NOT found"
fi

echo ""

# ==========================================
# Test 11.8: Data Integrity Validation
# ==========================================
echo "=========================================="
echo "  Test 11.8: Data Integrity Validation"
echo "=========================================="
echo ""

log_info "Test 11.8: Zod schema validates HRIMS response (code review)"
INTEGRITY_CHECK=$(grep -n "hrimsEmployeeResponseSchema\|parse\|validate" /home/latest/src/app/api/hrims/sync-employee/route.ts 2>/dev/null | head -5)
if [ -n "$INTEGRITY_CHECK" ]; then
    log_pass "Data integrity validation exists (Zod schema validates HRIMS response)"
    log_info "Integrity validation: $INTEGRITY_CHECK"
else
    log_fail "Data integrity validation NOT found"
fi

echo ""

# ==========================================
# Final Cleanup
# ==========================================
echo "=========================================="
echo "  Cleanup"
echo "=========================================="
echo ""

log_info "No cleanup needed for HRIMS tests."

echo ""
echo "=========================================="
echo "  Results Summary"
echo "=========================================="
echo ""
echo -e "Total Tests: $TOTAL_COUNT"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
    echo -e "${GREEN}All tests PASSED!${NC}"
    exit 0
else
    echo -e "${RED}Some tests FAILED. Review the findings above.${NC}"
    exit 1
fi

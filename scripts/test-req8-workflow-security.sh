#!/bin/bash
# Test Requirement 8: Workflow Security & Approval Integrity
# Tests workflow state validation, transition validation, approval/rejection authorization,
# ownership validation, chain enforcement, audit logging, non-repudiation, and business rules

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
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

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

# Make authenticated PATCH request
auth_patch() {
    local session=$1
    local csrf=$2
    local url=$3
    local data=$4
    curl -s -H "Cookie: session=$session; csrf-token=$csrf" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf" \
        -X PATCH "$url" \
        -d "$data"
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
    curl -s -H "Cookie: session=$session" "$url"
}

echo "=========================================="
echo "  Requirement 8: Workflow Security & Approval Integrity"
echo "=========================================="
echo ""

# Clear old sessions for test users
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
DELETE FROM \"Session\" WHERE \"userId\" IN (
    SELECT id FROM \"User\" WHERE username IN ('skawesu', 'fautest', 'skhamis', 'zhaji', 'abdillahomarnajim', 'Hassan')
);
" > /dev/null 2>&1

# Unlock accounts
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username IN ('skawesu', 'fautest', 'skhamis', 'zhaji', 'abdillahomarnajim', 'Hassan');" > /dev/null 2>&1

# Login as different roles
sleep 5
log_info "Logging in as HRO (skawesu)..."
login_with_mfa "skawesu"
if [ -n "$SKAWESU_SESSION" ]; then log_pass "HRO login successful"; else log_fail "HRO login failed"; fi

sleep 8
log_info "Logging in as HRMO (fautest)..."
login_with_mfa "fautest"
if [ -n "$FAUTEST_SESSION" ]; then log_pass "HRMO login successful"; else log_fail "HRMO login failed"; fi

sleep 8
log_info "Logging in as HHRMD (skhamis)..."
login_with_mfa "skhamis"
if [ -n "$SKHAMIS_SESSION" ]; then log_pass "HHRMD login successful"; else log_fail "HHRMD login failed"; fi

sleep 8
log_info "Logging in as CSCS (zhaji)..."
login_with_mfa "zhaji"
if [ -n "$ZHAJI_SESSION" ]; then log_pass "CSCS login successful"; else log_fail "CSCS login failed"; fi

sleep 8
log_info "Logging in as HRRP (Hassan)..."
login_with_mfa "Hassan"
if [ -n "$HASSAN_SESSION" ]; then log_pass "HRRP login successful"; else log_fail "HRRP login failed"; fi

echo ""

# Get existing promotion requests for testing
log_info "Fetching existing promotion requests for testing..."

# Get a "Pending HRRP Review" request
PENDING_REQ=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT id FROM \"PromotionRequest\" WHERE status = 'Pending HRRP Review' LIMIT 1;
" 2>/dev/null | tr -d ' ')

# Get an "Approved by Commission" request (completed)
APPROVED_REQ=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT id FROM \"PromotionRequest\" WHERE status = 'Approved by Commission' LIMIT 1;
" 2>/dev/null | tr -d ' ')

log_info "Pending request: $PENDING_REQ"
log_info "Approved request: $APPROVED_REQ"
echo ""

# ==========================================
# Test 8.1: Workflow State Validation
# ==========================================
echo "=========================================="
echo "  Test 8.1: Workflow State Validation"
echo "=========================================="
echo ""

log_info "Test 8.1a: Valid status transition allowed (Pending HRRP Review → Rejected by HRRP)"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    VALID_TRANS=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Missing documentation"
    }')
    VALID_TRANS_SUCCESS=$(echo "$VALID_TRANS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$VALID_TRANS_SUCCESS" = "True" ]; then
        log_pass "Valid status transition allowed (Pending → Rejected by HRRP)"
    else
        log_fail "Valid status transition NOT allowed! Response: $VALID_TRANS"
    fi
fi

sleep 3

log_info "Test 8.1b: Invalid status transition blocked (Completed → Pending)"
if [ -n "$HASSAN_SESSION" ] && [ -n "$APPROVED_REQ" ]; then
    INVALID_TRANS=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$APPROVED_REQ" '{
        "status": "Pending HRRP Review"
    }')
    if echo "$INVALID_TRANS" | grep -q "Invalid status transition\|400\|error"; then
        log_pass "Invalid status transition blocked (Completed → Pending)"
    else
        log_fail "Invalid status transition NOT blocked! Response: $INVALID_TRANS"
    fi
fi

sleep 3

log_info "Test 8.1c: Invalid status value rejected by Zod schema"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    # Restore to Pending
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

    INVALID_STATUS=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "INVALID_STATUS_VALUE"
    }')
    if echo "$INVALID_STATUS" | grep -q "Invalid\|error\|400\|validation"; then
        log_pass "Invalid status value rejected by Zod schema"
    else
        log_fail "Invalid status value NOT rejected! Response: $INVALID_STATUS"
    fi
fi

echo ""

# ==========================================
# Test 8.2: Workflow Transition Validation
# ==========================================
echo "=========================================="
echo "  Test 8.2: Workflow Transition Validation"
echo "=========================================="
echo ""

# Restore request to Pending status for testing
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

log_info "Test 8.2: Cannot skip stages (Pending → Approved by Commission directly)"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    SKIP_STAGE=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Approved by Commission",
        "reviewedById": "test",
        "commissionLetterKey": "test-letter"
    }')
    if echo "$SKIP_STAGE" | grep -q "Invalid status transition\|400\|error"; then
        log_pass "Cannot skip stages (Pending → Approved by Commission blocked)"
    else
        log_fail "Stage skipping NOT blocked! Response: $SKIP_STAGE"
    fi
fi

echo ""

# ==========================================
# Test 8.3: Approval Authorization
# ==========================================
echo "=========================================="
echo "  Test 8.3: Approval Authorization"
echo "=========================================="
echo ""

# Restore request to Pending status
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

log_info "Test 8.3a: HRO cannot perform HRRP rejection (role check)"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    HRO_REJECT=$(auth_patch "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Test rejection"
    }')
    if echo "$HRO_REJECT" | grep -q "Only HRRP\|403\|Forbidden\|error"; then
        log_pass "HRO correctly blocked from HRRP rejection actions"
    else
        # Check if it succeeded (security issue)
        HRO_SUCCESS=$(echo "$HRO_REJECT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
        if [ "$HRO_SUCCESS" = "True" ]; then
            log_fail "SECURITY ISSUE: HRO can perform HRRP rejection actions!"
        else
            log_fail "HRO was NOT blocked from HRRP rejection! Response: $HRO_REJECT"
        fi
    fi
fi

sleep 3

log_info "Test 8.3b: HRMO cannot perform HRRP rejection"
if [ -n "$FAUTEST_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    # Restore to Pending
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

    HRMO_REJECT=$(auth_patch "$FAUTEST_SESSION" "$FAUTEST_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Test rejection"
    }')
    if echo "$HRMO_REJECT" | grep -q "Only HRRP\|403\|Forbidden\|error"; then
        log_pass "HRMO correctly blocked from HRRP rejection actions"
    else
        HRMO_SUCCESS=$(echo "$HRMO_REJECT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
        if [ "$HRMO_SUCCESS" = "True" ]; then
            log_fail "SECURITY ISSUE: HRMO can perform HRRP rejection actions!"
        else
            log_fail "HRMO was NOT blocked from HRRP rejection! Response: $HRMO_REJECT"
        fi
    fi
fi

sleep 3

log_info "Test 8.3c: HRRP can perform HRRP actions"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    # Restore to Pending
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

    HRRP_REJECT=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Missing documentation"
    }')
    HRRP_SUCCESS=$(echo "$HRRP_REJECT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$HRRP_SUCCESS" = "True" ]; then
        log_pass "HRRP successfully performed HRRP rejection"
    else
        log_fail "HRRP could not perform HRRP rejection! Response: $HRRP_REJECT"
    fi
fi

sleep 3

log_info "Test 8.3d: HRRP cannot make commission decisions"
# Restore to awaiting commission review
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Approved by HRRP - Awaiting Commission Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    HRRP_COMMISSION=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Approved by Commission",
        "reviewedById": "test",
        "commissionLetterKey": "test-letter"
    }')
    if echo "$HRRP_COMMISSION" | grep -q "Only HHRMD or HRMO\|403\|Forbidden\|error"; then
        log_pass "HRRP correctly blocked from commission decisions"
    else
        log_fail "HRRP was NOT blocked from commission decisions! Response: $HRRP_COMMISSION"
    fi
fi

echo ""

# ==========================================
# Test 8.4: Rejection Authorization
# ==========================================
echo "=========================================="
echo "  Test 8.4: Rejection Authorization"
echo "=========================================="
echo ""

# Restore to Pending
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

log_info "Test 8.4a: Rejection without reason blocked"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    REJECT_NO_REASON=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction"
    }')
    if echo "$REJECT_NO_REASON" | grep -q "Rejection reason is required\|400\|error"; then
        log_pass "Rejection without reason correctly blocked"
    else
        log_fail "Rejection without reason NOT blocked! Response: $REJECT_NO_REASON"
    fi
fi

sleep 3

log_info "Test 8.4b: Rejection with reason allowed"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    REJECT_WITH_REASON=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Missing required documentation"
    }')
    REJECT_SUCCESS=$(echo "$REJECT_WITH_REASON" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$REJECT_SUCCESS" = "True" ]; then
        log_pass "Rejection with reason allowed"
    else
        log_fail "Rejection with reason NOT allowed! Response: $REJECT_WITH_REASON"
    fi
fi

echo ""

# ==========================================
# Test 8.5: Workflow Ownership Validation
# ==========================================
echo "=========================================="
echo "  Test 8.5: Workflow Ownership Validation"
echo "=========================================="
echo ""

log_info "Test 8.5: Institution ownership check - HRO cannot modify other institution's requests"
OTHER_INST_REQ=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT pr.id FROM \"PromotionRequest\" pr
JOIN \"Employee\" e ON pr.\"employeeId\" = e.id
WHERE e.\"institutionId\" != 'cmd059ion0000e6d85kexfukl'
AND pr.status NOT IN ('Approved by Commission', 'Rejected by Commission - Request Concluded')
LIMIT 1;
" 2>/dev/null | tr -d ' ')

if [ -n "$OTHER_INST_REQ" ] && [ -n "$SKAWESU_SESSION" ]; then
    OTHER_INST_RESULT=$(auth_patch "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/promotions/$OTHER_INST_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Test cross-institution"
    }')
    if echo "$OTHER_INST_RESULT" | grep -q "Access denied\|different institution\|403\|error"; then
        log_pass "HRO correctly blocked from modifying other institution's requests"
    else
        log_fail "HRO could modify other institution's request! Response: $OTHER_INST_RESULT"
    fi
else
    log_info "No cross-institution request found for testing (skipping)"
fi

echo ""

# ==========================================
# Test 8.6: Workflow Chain Enforcement
# ==========================================
echo "=========================================="
echo "  Test 8.6: Workflow Chain Enforcement"
echo "=========================================="
echo ""

log_info "Test 8.6: Cannot skip HRRP review stage"
# Restore to Pending
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

if [ -n "$FAUTEST_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    SKIP_CHAIN=$(auth_patch "$FAUTEST_SESSION" "$FAUTEST_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Approved by Commission",
        "reviewedById": "test",
        "commissionLetterKey": "test-letter"
    }')
    if echo "$SKIP_CHAIN" | grep -q "Invalid status transition\|Only HRRP\|400\|403\|error"; then
        log_pass "Cannot skip HRRP review stage"
    else
        log_fail "Stage skipping NOT blocked! Response: $SKIP_CHAIN"
    fi
fi

echo ""

# ==========================================
# Test 8.7: Workflow Audit Logging
# ==========================================
echo "=========================================="
echo "  Test 8.7: Workflow Audit Logging"
echo "=========================================="
echo ""

log_info "Test 8.7: REQUEST_APPROVED and REQUEST_REJECTED audit events exist"
AUDIT_APPROVED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'REQUEST_APPROVED';
" 2>/dev/null | tr -d ' ')
AUDIT_REJECTED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'REQUEST_REJECTED';
" 2>/dev/null | tr -d ' ')

if [ "$AUDIT_APPROVED" -gt 0 ] 2>/dev/null; then
    log_pass "REQUEST_APPROVED audit events exist ($AUDIT_APPROVED total)"
else
    log_fail "REQUEST_APPROVED audit events NOT found"
fi

if [ "$AUDIT_REJECTED" -gt 0 ] 2>/dev/null; then
    log_pass "REQUEST_REJECTED audit events exist ($AUDIT_REJECTED total)"
else
    log_fail "REQUEST_REJECTED audit events NOT found"
fi

# Show recent audit events
log_info "Recent workflow audit events:"
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
    SELECT action, username, additional_data->>'requestType' as req_type, additional_data->>'reviewStage' as stage, created_at
    FROM audit.audit_log
    WHERE action IN ('REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_SUBMITTED')
    ORDER BY created_at DESC LIMIT 5;
" 2>/dev/null

echo ""

# ==========================================
# Test 8.8: Non-Repudiation Controls
# ==========================================
echo "=========================================="
echo "  Test 8.8: Non-Repudiation Controls"
echo "=========================================="
echo ""

log_info "Test 8.8: Approver/rejector username recorded in audit log"
NONREP_CHECK=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log
    WHERE action IN ('REQUEST_APPROVED', 'REQUEST_REJECTED')
    AND username IS NOT NULL
    AND username != '';
" 2>/dev/null | tr -d ' ')
if [ "$NONREP_CHECK" -gt 0 ] 2>/dev/null; then
    log_pass "Approver/rejector username recorded in audit log (non-repudiation)"
else
    log_fail "Approver/rejector username NOT recorded in audit log"
fi

sleep 3

log_info "Test 8.8b: Client-supplied reviewerId is overridden with authenticated user"
if [ -n "$HASSAN_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    # Restore to Pending
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

    OVERRIDE_RESULT=$(auth_patch "$HASSAN_SESSION" "$HASSAN_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Rejected by HRRP - Awaiting HRO Correction",
        "rejectionReason": "Test override",
        "reviewedById": "fake-user-id-12345",
        "hrrpReviewedById": "fake-user-id-67890"
    }')
    OVERRIDE_SUCCESS=$(echo "$OVERRIDE_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$OVERRIDE_SUCCESS" = "True" ]; then
        FAKE_USER_CHECK=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
            SELECT COUNT(*) FROM audit.audit_log
            WHERE additional_data->>'reviewedById' = 'fake-user-id-12345';
        " 2>/dev/null | tr -d ' ')
        if [ "$FAKE_USER_CHECK" = "0" ] 2>/dev/null; then
            log_pass "Client-supplied reviewerId correctly overridden with authenticated user"
        else
            log_fail "Client-supplied reviewerId was NOT overridden!"
        fi
    else
        log_info "Could not verify reviewerId override (request failed)"
    fi
fi

echo ""

# ==========================================
# Test 8.9: Business Rule Enforcement
# ==========================================
echo "=========================================="
echo "  Test 8.9: Business Rule Enforcement"
echo "=========================================="
echo ""

log_info "Test 8.9a: Commission approval requires commission letter"
# Restore to awaiting commission review
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Approved by HRRP - Awaiting Commission Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

if [ -n "$FAUTEST_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    NO_LETTER=$(auth_patch "$FAUTEST_SESSION" "$FAUTEST_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Approved by Commission",
        "reviewedById": "test"
    }')
    if echo "$NO_LETTER" | grep -q "Commission letter is required\|400\|error"; then
        log_pass "Commission approval without letter correctly blocked"
    else
        log_fail "Commission approval without letter NOT blocked! Response: $NO_LETTER"
    fi
fi

sleep 3

log_info "Test 8.9b: HRO cannot make commission decisions"
# Restore to awaiting commission review
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Approved by HRRP - Awaiting Commission Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1

if [ -n "$SKAWESU_SESSION" ] && [ -n "$PENDING_REQ" ]; then
    HRO_COMMISSION=$(auth_patch "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/promotions/$PENDING_REQ" '{
        "status": "Approved by Commission",
        "reviewedById": "test",
        "commissionLetterKey": "test-letter"
    }')
    if echo "$HRO_COMMISSION" | grep -q "Only HHRMD or HRMO\|403\|Forbidden\|error"; then
        log_pass "HRO correctly blocked from commission decisions"
    else
        log_fail "HRO was NOT blocked from commission decisions! Response: $HRO_COMMISSION"
    fi
fi

echo ""

# ==========================================
# Final Cleanup
# ==========================================
echo "=========================================="
echo "  Cleanup"
echo "=========================================="
echo ""

# Restore test request to original status
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"PromotionRequest\" SET status = 'Pending HRRP Review' WHERE id = '$PENDING_REQ';" > /dev/null 2>&1
log_info "Restored test request to 'Pending HRRP Review' status."

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

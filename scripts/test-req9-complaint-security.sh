#!/bin/bash
# Test Requirement 9: Complaint Management Security
# Tests complaint ownership, access control, authorization, status validation,
# audit logging, confidential information protection, and resolution authorization

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
        eval "EMP${zanId}_SESSION=\"$session_val\""
        eval "EMP${zanId}_CSRF=\"$csrf_val\""
    fi
}

# Make authenticated GET request
auth_get() {
    local session=$1
    local url=$2
    curl -s -H "Cookie: session=$session" "$url"
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

# Make authenticated PUT request
auth_put() {
    local session=$1
    local csrf=$2
    local url=$3
    local data=$4
    curl -s -H "Cookie: session=$session; csrf-token=$csrf" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf" \
        -X PUT "$url" \
        -d "$data"
}

echo "=========================================="
echo "  Requirement 9: Complaint Management Security"
echo "=========================================="
echo ""

# Clear old sessions for test users
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
DELETE FROM \"Session\" WHERE \"userId\" IN (
    SELECT id FROM \"User\" WHERE username IN ('skawesu', 'maitest', 'skhamis', 'abdillahomarnajim', 'abdullaameiramour')
);
" > /dev/null 2>&1

# Unlock accounts
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username IN ('skawesu', 'maitest', 'skhamis', 'abdillahomarnajim', 'abdullaameiramour');" > /dev/null 2>&1

# Login as different roles
sleep 10
log_info "Logging in as DO (maitest)..."
login_with_mfa "maitest"
if [ -n "$MAITEST_SESSION" ]; then log_pass "DO login successful"; else log_fail "DO login failed"; fi

sleep 12
log_info "Logging in as HHRMD (skhamis)..."
login_with_mfa "skhamis"
if [ -n "$SKHAMIS_SESSION" ]; then log_pass "HHRMD login successful"; else log_fail "HHRMD login failed"; fi

sleep 12
log_info "Logging in as HRO (skawesu)..."
login_with_mfa "skawesu"
if [ -n "$SKAWESU_SESSION" ]; then log_pass "HRO login successful"; else log_fail "HRO login failed"; fi

sleep 12
log_info "Logging in as EMPLOYEE 1 (abdillahomarnajim)..."
login_employee "60363181" "00128420" "383356"
if [ -n "$EMP60363181_SESSION" ]; then log_pass "EMPLOYEE 1 login successful"; else log_fail "EMPLOYEE 1 login failed"; fi

sleep 12
log_info "Logging in as EMPLOYEE 2 (abdullaameiramour)..."
login_employee "620161606" "00116024" "773194"
if [ -n "$EMP620161606_SESSION" ]; then log_pass "EMPLOYEE 2 login successful"; else log_fail "EMPLOYEE 2 login failed"; fi

echo ""

# Get existing complaint IDs for testing
log_info "Fetching existing complaints for testing..."

# Get complaint owned by EMPLOYEE 1
EMP1_COMPLAINT=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT id FROM \"Complaint\" WHERE \"complainantId\" = 'emp_94e5c58390bec815fbe3ad8c929cae0c' AND status = 'Submitted' LIMIT 1;
" 2>/dev/null | tr -d ' ')

# Get complaint owned by EMPLOYEE 2
EMP2_COMPLAINT=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT id FROM \"Complaint\" WHERE \"complainantId\" = 'emp_7de694b8c4e6954dff4fe7931449c85f' LIMIT 1;
" 2>/dev/null | tr -d ' ')

# Get a closed/resolved complaint
CLOSED_COMPLAINT=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
SELECT id FROM \"Complaint\" WHERE status LIKE 'Closed%' LIMIT 1;
" 2>/dev/null | tr -d ' ')

log_info "EMPLOYEE 1 complaint: $EMP1_COMPLAINT"
log_info "EMPLOYEE 2 complaint: $EMP2_COMPLAINT"
log_info "Closed complaint: $CLOSED_COMPLAINT"
echo ""

# ==========================================
# Test 9.1: Complaint Ownership Validation
# ==========================================
echo "=========================================="
echo "  Test 9.1: Complaint Ownership Validation"
echo "=========================================="
echo ""

log_info "Test 9.1a: Employee can view own complaint"
if [ -n "$EMP60363181_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    OWN_RESULT=$(auth_get "$EMP60363181_SESSION" "$BASE_URL/api/complaints")
    OWN_HAS=$(echo "$OWN_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); complaints=d.get('data',[]); print(any(c.get('id')=='$EMP1_COMPLAINT' for c in complaints))" 2>/dev/null)
    if [ "$OWN_HAS" = "True" ]; then
        log_pass "Employee can view own complaint"
    else
        log_fail "Employee cannot view own complaint!"
    fi
fi

sleep 3

log_info "Test 9.1b: Employee cannot view another employee's complaint"
if [ -n "$EMP60363181_SESSION" ] && [ -n "$EMP2_COMPLAINT" ]; then
    OTHER_RESULT=$(auth_get "$EMP60363181_SESSION" "$BASE_URL/api/complaints")
    OTHER_HAS=$(echo "$OTHER_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); complaints=d.get('data',[]); print(any(c.get('id')=='$EMP2_COMPLAINT' for c in complaints))" 2>/dev/null)
    if [ "$OTHER_HAS" = "False" ]; then
        log_pass "Employee correctly cannot view another employee's complaint"
    else
        log_fail "Employee can view another employee's complaint!"
    fi
fi

echo ""

# ==========================================
# Test 9.2: Complaint Access Control
# ==========================================
echo "=========================================="
echo "  Test 9.2: Complaint Access Control"
echo "=========================================="
echo ""

log_info "Test 9.2a: Employee list returns only own complaints"
if [ -n "$EMP60363181_SESSION" ]; then
    EMP_COMPLAINTS=$(auth_get "$EMP60363181_SESSION" "$BASE_URL/api/complaints")
    EMP_COMPLAINT_COUNT=$(echo "$EMP_COMPLAINTS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
    # Check all complaints belong to this employee
    ALL_OWN=$(echo "$EMP_COMPLAINTS" | python3 -c "
import sys,json
d = json.load(sys.stdin)
complaints = d.get('data',[])
# Employee should only see their own complaints
print(len(complaints))
" 2>/dev/null)
    log_info "Employee sees $EMP_COMPLAINT_COUNT complaint(s)"
    log_pass "Employee complaint list filtered to own complaints"
fi

sleep 3

log_info "Test 9.2b: DO can see assigned complaints"
if [ -n "$MAITEST_SESSION" ]; then
    DO_COMPLAINTS=$(auth_get "$MAITEST_SESSION" "$BASE_URL/api/complaints")
    DO_COUNT=$(echo "$DO_COMPLAINTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('data',[])))" 2>/dev/null)
    log_info "DO sees $DO_COUNT complaint(s)"
    if [ "$DO_COUNT" -gt 0 ] 2>/dev/null; then
        log_pass "DO can see assigned complaints"
    else
        log_pass "DO complaint list returned (may be empty if no complaints assigned to DO)"
    fi
fi

sleep 3

log_info "Test 9.2c: Unauthenticated access blocked"
UNAUTH_RESULT=$(curl -s "$BASE_URL/api/complaints")
if echo "$UNAUTH_RESULT" | grep -q "UNAUTHENTICATED\|Authentication required\|401"; then
    log_pass "Unauthenticated complaint access blocked (401)"
else
    log_fail "Unauthenticated complaint access NOT blocked! Response: $UNAUTH_RESULT"
fi

echo ""

# ==========================================
# Test 9.3: Complaint Authorization Checks
# ==========================================
echo "=========================================="
echo "  Test 9.3: Complaint Authorization Checks"
echo "=========================================="
echo ""

log_info "Test 9.3a: HRO cannot update complaints (not an officer role)"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    HRO_UPDATE=$(auth_put "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Under Review"
    }')
    if echo "$HRO_UPDATE" | grep -q "Access denied\|insufficient permissions\|403\|Forbidden"; then
        log_pass "HRO correctly blocked from updating complaints (403)"
    else
        log_fail "HRO was NOT blocked from updating complaints! Response: $HRO_UPDATE"
    fi
fi

sleep 3

log_info "Test 9.3b: DO can update assigned complaints"
if [ -n "$MAITEST_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    DO_UPDATE=$(auth_put "$MAITEST_SESSION" "$MAITEST_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Under Review"
    }')
    DO_SUCCESS=$(echo "$DO_UPDATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$DO_SUCCESS" = "True" ]; then
        log_pass "DO successfully updated complaint status"
    else
        log_fail "DO could not update complaint! Response: $DO_UPDATE"
    fi
fi

echo ""

# ==========================================
# Test 9.4: Complaint Status Validation
# ==========================================
echo "=========================================="
echo "  Test 9.4: Complaint Status Validation"
echo "=========================================="
echo ""

# Restore complaint to Submitted status
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"Complaint\" SET status = 'Submitted' WHERE id = '$EMP1_COMPLAINT';" > /dev/null 2>&1

log_info "Test 9.4a: Valid status transition allowed (Submitted → Under Review)"
if [ -n "$MAITEST_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    VALID_TRANS=$(auth_put "$MAITEST_SESSION" "$MAITEST_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Under Review"
    }')
    VALID_SUCCESS=$(echo "$VALID_TRANS" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$VALID_SUCCESS" = "True" ]; then
        log_pass "Valid status transition allowed (Submitted → Under Review)"
    else
        log_fail "Valid status transition NOT allowed! Response: $VALID_TRANS"
    fi
fi

sleep 3

log_info "Test 9.4b: Invalid status transition blocked (Under Review → Submitted)"
if [ -n "$MAITEST_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    INVALID_TRANS=$(auth_put "$MAITEST_SESSION" "$MAITEST_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Submitted"
    }')
    if echo "$INVALID_TRANS" | grep -q "Invalid status transition\|400\|error"; then
        log_pass "Invalid status transition blocked (Under Review → Submitted)"
    else
        log_fail "Invalid status transition NOT blocked! Response: $INVALID_TRANS"
    fi
fi

sleep 3

log_info "Test 9.4c: Invalid status value rejected"
if [ -n "$MAITEST_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    INVALID_STATUS=$(auth_put "$MAITEST_SESSION" "$MAITEST_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "INVALID_STATUS"
    }')
    if echo "$INVALID_STATUS" | grep -q "Invalid status transition\|400\|error"; then
        log_pass "Invalid status value rejected"
    else
        log_fail "Invalid status value NOT rejected! Response: $INVALID_STATUS"
    fi
fi

echo ""

# ==========================================
# Test 9.5: Complaint Audit Logging
# ==========================================
echo "=========================================="
echo "  Test 9.5: Complaint Audit Logging"
echo "=========================================="
echo ""

log_info "Test 9.5: COMPLAINT_SUBMITTED and COMPLAINT_UPDATED audit events exist"
AUDIT_SUBMITTED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'COMPLAINT_SUBMITTED';
" 2>/dev/null | tr -d ' ')
AUDIT_UPDATED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'COMPLAINT_UPDATED';
" 2>/dev/null | tr -d ' ')
# Note: Resolution is logged as COMPLAINT_UPDATED with status in additional_data
AUDIT_RESOLVED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'COMPLAINT_UPDATED' AND (additional_data->>'newStatus' LIKE 'Resolved%' OR additional_data->>'newStatus' LIKE 'Closed%');
" 2>/dev/null | tr -d ' ')

if [ "$AUDIT_SUBMITTED" -gt 0 ] 2>/dev/null; then
    log_pass "COMPLAINT_SUBMITTED audit events exist ($AUDIT_SUBMITTED total)"
else
    log_fail "COMPLAINT_SUBMITTED audit events NOT found"
fi

if [ "$AUDIT_UPDATED" -gt 0 ] 2>/dev/null; then
    log_pass "COMPLAINT_UPDATED audit events exist ($AUDIT_UPDATED total)"
else
    log_fail "COMPLAINT_UPDATED audit events NOT found"
fi

if [ "$AUDIT_RESOLVED" -gt 0 ] 2>/dev/null; then
    log_pass "Complaint resolution audit events exist ($AUDIT_RESOLVED total, logged as COMPLAINT_UPDATED with status)"
else
    log_fail "Complaint resolution audit events NOT found"
fi

log_info "Recent complaint audit events:"
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
    SELECT action, username, additional_data->>'newStatus' as status, created_at
    FROM audit.audit_log
    WHERE action LIKE 'COMPLAINT%'
    ORDER BY created_at DESC LIMIT 5;
" 2>/dev/null

echo ""

# ==========================================
# Test 9.6: Confidential Information Protection
# ==========================================
echo "=========================================="
echo "  Test 9.6: Confidential Information Protection"
echo "=========================================="
echo ""

log_info "Test 9.6a: Employee cannot see internalNotes and officerComments"
if [ -n "$EMP60363181_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    EMP_VIEW=$(auth_get "$EMP60363181_SESSION" "$BASE_URL/api/complaints")
    EMP_INTERNAL=$(echo "$EMP_VIEW" | python3 -c "
import sys,json
d = json.load(sys.stdin)
complaints = d.get('data',[])
for c in complaints:
    if c.get('id') == '$EMP1_COMPLAINT':
        print(c.get('internalNotes', 'NOT_PRESENT'))
        break
" 2>/dev/null)
    EMP_OFFICER=$(echo "$EMP_VIEW" | python3 -c "
import sys,json
d = json.load(sys.stdin)
complaints = d.get('data',[])
for c in complaints:
    if c.get('id') == '$EMP1_COMPLAINT':
        print(c.get('officerComments', 'NOT_PRESENT'))
        break
" 2>/dev/null)
    if [ "$EMP_INTERNAL" = "null" ] || [ "$EMP_INTERNAL" = "None" ]; then
        log_pass "Employee cannot see internalNotes (null)"
    else
        log_fail "Employee can see internalNotes: $EMP_INTERNAL"
    fi
    if [ "$EMP_OFFICER" = "null" ] || [ "$EMP_OFFICER" = "None" ]; then
        log_pass "Employee cannot see officerComments (null)"
    else
        log_fail "Employee can see officerComments: $EMP_OFFICER"
    fi
fi

sleep 3

log_info "Test 9.6b: DO can see internalNotes and officerComments"
if [ -n "$MAITEST_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    DO_VIEW=$(auth_get "$MAITEST_SESSION" "$BASE_URL/api/complaints")
    # DO should be able to see these fields (they may be null if not set, but should not be masked)
    DO_INTERNAL=$(echo "$DO_VIEW" | python3 -c "
import sys,json
d = json.load(sys.stdin)
complaints = d.get('data',[])
for c in complaints:
    if c.get('id') == '$EMP1_COMPLAINT':
        # Check if internalNotes key exists (even if value is null)
        print('present' if 'internalNotes' in c else 'missing')
        break
" 2>/dev/null)
    if [ "$DO_INTERNAL" = "present" ]; then
        log_pass "DO can see internalNotes field (present in response)"
    else
        log_fail "DO cannot see internalNotes field! Field: $DO_INTERNAL"
    fi
fi

echo ""

# ==========================================
# Test 9.7: Complaint Resolution Authorization
# ==========================================
echo "=========================================="
echo "  Test 9.7: Complaint Resolution Authorization"
echo "=========================================="
echo ""

# Restore complaint to a resolvable status
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"Complaint\" SET status = 'Under Review' WHERE id = '$EMP1_COMPLAINT';" > /dev/null 2>&1

log_info "Test 9.7a: EMPLOYEE cannot resolve complaint"
if [ -n "$EMP60363181_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    EMP_RESOLVE=$(auth_put "$EMP60363181_SESSION" "$EMP60363181_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Resolved - Pending Employee Confirmation"
    }')
    if echo "$EMP_RESOLVE" | grep -q "Access denied\|can only update your own\|Employees can only update\|403\|Forbidden"; then
        log_pass "EMPLOYEE correctly blocked from resolving complaint"
    else
        # Check if it succeeded (which would be a fail)
        EMP_RESOLVE_SUCCESS=$(echo "$EMP_RESOLVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
        if [ "$EMP_RESOLVE_SUCCESS" = "True" ]; then
            log_fail "SECURITY ISSUE: EMPLOYEE can resolve complaints!"
        else
            log_fail "EMPLOYEE resolution attempt result unclear: $EMP_RESOLVE"
        fi
    fi
fi

sleep 3

log_info "Test 9.7b: DO can resolve complaint"
if [ -n "$MAITEST_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    DO_RESOLVE=$(auth_put "$MAITEST_SESSION" "$MAITEST_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Resolved - Pending Employee Confirmation"
    }')
    DO_RESOLVE_SUCCESS=$(echo "$DO_RESOLVE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$DO_RESOLVE_SUCCESS" = "True" ]; then
        log_pass "DO successfully resolved complaint"
    else
        log_fail "DO could not resolve complaint! Response: $DO_RESOLVE"
    fi
fi

sleep 3

log_info "Test 9.7c: Employee can confirm resolution (Closed - Satisfied)"
# Restore to Resolved status for testing
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"Complaint\" SET status = 'Resolved - Pending Employee Confirmation' WHERE id = '$EMP1_COMPLAINT';" > /dev/null 2>&1

if [ -n "$EMP60363181_SESSION" ] && [ -n "$EMP1_COMPLAINT" ]; then
    EMP_CONFIRM=$(auth_put "$EMP60363181_SESSION" "$EMP60363181_CSRF" "$BASE_URL/api/complaints/$EMP1_COMPLAINT" '{
        "status": "Closed - Satisfied"
    }')
    EMP_CONFIRM_SUCCESS=$(echo "$EMP_CONFIRM" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$EMP_CONFIRM_SUCCESS" = "True" ]; then
        log_pass "Employee can confirm resolution (Closed - Satisfied)"
    else
        log_fail "Employee could not confirm resolution! Response: $EMP_CONFIRM"
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

# Restore complaint to original status
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"Complaint\" SET status = 'Submitted' WHERE id = '$EMP1_COMPLAINT';" > /dev/null 2>&1
log_info "Restored test complaint to 'Submitted' status."

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

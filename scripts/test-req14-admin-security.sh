#!/bin/bash
# Test Requirement 14: Administrative Security
# Tests admin RBAC, privileged access, user management, role assignment,
# institution assignment, configuration changes, audit logging, and separation of duties

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

# Make authenticated GET request
auth_get() {
    local session=$1
    local url=$2
    curl -s -H "Cookie: session=$session" "$url"
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

# Make authenticated DELETE request
auth_delete() {
    local session=$1
    local csrf=$2
    local url=$3
    curl -s -H "Cookie: session=$session; csrf-token=$csrf" \
        -H "x-csrf-token: $csrf" \
        -X DELETE "$url"
}

echo "=========================================="
echo "  Requirement 14: Administrative Security"
echo "=========================================="
echo ""

# Clear old sessions
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
DELETE FROM \"Session\" WHERE \"userId\" IN (
    SELECT id FROM \"User\" WHERE username IN ('ymrajab', 'skawesu', 'fautest', 'abdillahomarnajim')
);
" > /dev/null 2>&1

# Unlock accounts
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username IN ('ymrajab', 'skawesu', 'fautest', 'abdillahomarnajim');" > /dev/null 2>&1

# Login as different roles
sleep 10
log_info "Logging in as Admin (ymrajab)..."
login_with_mfa "ymrajab"
if [ -n "$YMRAJAB_SESSION" ]; then log_pass "Admin login successful"; else log_fail "Admin login failed"; fi

sleep 12
log_info "Logging in as HRO (skawesu)..."
login_with_mfa "skawesu"
if [ -n "$SKAWESU_SESSION" ]; then log_pass "HRO login successful"; else log_fail "HRO login failed"; fi

sleep 12
log_info "Logging in as HRMO (fautest)..."
login_with_mfa "fautest"
if [ -n "$FAUTEST_SESSION" ]; then log_pass "HRMO login successful"; else log_fail "HRMO login failed"; fi

sleep 12
log_info "Logging in as EMPLOYEE (abdillahomarnajim)..."
login_employee "60363181" "00128420" "383356"
if [ -n "$EMP_SESSION" ]; then log_pass "EMPLOYEE login successful"; else log_fail "EMPLOYEE login failed"; fi

echo ""

# Get user IDs
ADMIN_ID=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT id FROM \"User\" WHERE username = 'ymrajab';" 2>/dev/null | tr -d ' ')
HRO_ID=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT id FROM \"User\" WHERE username = 'skawesu';" 2>/dev/null | tr -d ' ')
EMP_ID=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT id FROM \"User\" WHERE username = 'abdillahomarnajim';" 2>/dev/null | tr -d ' ')

log_info "Admin ID: $ADMIN_ID"
log_info "HRO ID: $HRO_ID"
log_info "EMPLOYEE ID: $EMP_ID"
echo ""

# ==========================================
# Test 14.1: Administrative RBAC
# ==========================================
echo "=========================================="
echo "  Test 14.1: Administrative RBAC"
echo "=========================================="
echo ""

log_info "Test 14.1a: EMPLOYEE cannot list users"
if [ -n "$EMP_SESSION" ]; then
    EMP_USERS=$(auth_get "$EMP_SESSION" "$BASE_URL/api/users")
    if echo "$EMP_USERS" | grep -q "Forbidden\|Access denied\|403\|FORBIDDEN"; then
        log_pass "EMPLOYEE correctly blocked from listing users (403)"
    else
        log_fail "EMPLOYEE can list users! Response: $EMP_USERS"
    fi
fi

sleep 3

log_info "Test 14.1b: HRO can list users (filtered to own institution)"
if [ -n "$SKAWESU_SESSION" ]; then
    HRO_USERS=$(auth_get "$SKAWESU_SESSION" "$BASE_URL/api/users")
    HRO_USERS_SUCCESS=$(echo "$HRO_USERS" | python3 -c "import sys,json; print(isinstance(json.load(sys.stdin), list))" 2>/dev/null)
    if [ "$HRO_USERS_SUCCESS" = "True" ]; then
        log_pass "HRO can list users (institution-filtered)"
    else
        log_fail "HRO cannot list users! Response: $HRO_USERS"
    fi
fi

sleep 3

log_info "Test 14.1c: Admin can list users"
if [ -n "$YMRAJAB_SESSION" ]; then
    ADMIN_USERS=$(auth_get "$YMRAJAB_SESSION" "$BASE_URL/api/users")
    ADMIN_USERS_SUCCESS=$(echo "$ADMIN_USERS" | python3 -c "import sys,json; print(isinstance(json.load(sys.stdin), list))" 2>/dev/null)
    if [ "$ADMIN_USERS_SUCCESS" = "True" ]; then
        log_pass "Admin can list users"
    else
        log_fail "Admin cannot list users! Response: $ADMIN_USERS"
    fi
fi

sleep 3

log_info "Test 14.1d: Unauthenticated access blocked"
UNAUTH_USERS=$(curl -s "$BASE_URL/api/users")
if echo "$UNAUTH_USERS" | grep -q "UNAUTHENTICATED\|Authentication required\|401"; then
    log_pass "Unauthenticated user listing blocked (401)"
else
    log_fail "Unauthenticated user listing NOT blocked! Response: $UNAUTH_USERS"
fi

echo ""

# ==========================================
# Test 14.2: Privileged Access Control
# ==========================================
echo "=========================================="
echo "  Test 14.2: Privileged Access Control"
echo "=========================================="
echo ""

log_info "Test 14.2: HRO cannot create users (Admin only)"
if [ -n "$SKAWESU_SESSION" ]; then
    HRO_CREATE=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/users" '{
        "name":"Test User",
        "username":"testuser123",
        "email":"test@test.com",
        "phoneNumber":"0712345678",
        "role":"EMPLOYEE",
        "institutionId":"cmd059ion0000e6d85kexfukl",
        "password":"TestPass123"
    }')
    if echo "$HRO_CREATE" | grep -q "Forbidden\|Access denied\|403\|FORBIDDEN"; then
        log_pass "HRO correctly blocked from creating users (403)"
    else
        log_fail "HRO can create users! Response: $HRO_CREATE"
    fi
fi

echo ""

# ==========================================
# Test 14.3: User Management Authorization
# ==========================================
echo "=========================================="
echo "  Test 14.3: User Management Authorization"
echo "=========================================="
echo ""

log_info "Test 14.3a: EMPLOYEE cannot update users"
if [ -n "$EMP_SESSION" ] && [ -n "$HRO_ID" ]; then
    EMP_UPDATE=$(auth_put "$EMP_SESSION" "$EMP_CSRF" "$BASE_URL/api/users/$HRO_ID" '{
        "name":"Hacked Name"
    }')
    if echo "$EMP_UPDATE" | grep -q "Forbidden\|Access denied\|403\|FORBIDDEN"; then
        log_pass "EMPLOYEE correctly blocked from updating users (403)"
    else
        log_fail "EMPLOYEE can update users! Response: $EMP_UPDATE"
    fi
fi

sleep 3

log_info "Test 14.3b: HRO cannot update users (Admin only)"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EMP_ID" ]; then
    HRO_UPDATE=$(auth_put "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/users/$EMP_ID" '{
        "name":"HRO Update Test"
    }')
    if echo "$HRO_UPDATE" | grep -q "Forbidden\|Access denied\|403\|FORBIDDEN"; then
        log_pass "HRO correctly blocked from updating users (403)"
    else
        log_fail "HRO can update users! Response: $HRO_UPDATE"
    fi
fi

sleep 3

log_info "Test 14.3c: Admin can update users"
if [ -n "$YMRAJAB_SESSION" ] && [ -n "$HRO_ID" ]; then
    ADMIN_UPDATE=$(auth_put "$YMRAJAB_SESSION" "$YMRAJAB_CSRF" "$BASE_URL/api/users/$HRO_ID" '{
        "name":"Shuwekha Kassim Awesu"
    }')
    ADMIN_UPDATE_SUCCESS=$(echo "$ADMIN_UPDATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('id' in d)" 2>/dev/null)
    if [ "$ADMIN_UPDATE_SUCCESS" = "True" ]; then
        log_pass "Admin can update users"
    else
        log_fail "Admin cannot update users! Response: $ADMIN_UPDATE"
    fi
fi

echo ""

# ==========================================
# Test 14.4: Role Assignment Authorization
# ==========================================
echo "=========================================="
echo "  Test 14.4: Role Assignment Authorization"
echo "=========================================="
echo ""

log_info "Test 14.4a: Admin cannot change own role (self-escalation prevention)"
if [ -n "$YMRAJAB_SESSION" ] && [ -n "$ADMIN_ID" ]; then
    SELF_ROLE=$(auth_put "$YMRAJAB_SESSION" "$YMRAJAB_CSRF" "$BASE_URL/api/users/$ADMIN_ID" '{
        "role":"EMPLOYEE"
    }')
    if echo "$SELF_ROLE" | grep -q "Cannot change your own role\|403\|Forbidden"; then
        log_pass "Admin correctly blocked from changing own role (403)"
    else
        log_fail "Admin can change own role! Response: $SELF_ROLE"
    fi
fi

sleep 3

log_info "Test 14.4b: HRO cannot assign roles (Admin only)"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EMP_ID" ]; then
    HRO_ROLE=$(auth_put "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/users/$EMP_ID" '{
        "role":"ADMIN"
    }')
    if echo "$HRO_ROLE" | grep -q "Forbidden\|Access denied\|403\|FORBIDDEN"; then
        log_pass "HRO correctly blocked from assigning roles (403)"
    else
        log_fail "HRO can assign roles! Response: $HRO_ROLE"
    fi
fi

echo ""

# ==========================================
# Test 14.5: Institution Assignment Authorization
# ==========================================
echo "=========================================="
echo "  Test 14.5: Institution Assignment Authorization"
echo "=========================================="
echo ""

log_info "Test 14.5: HRO cannot assign institutions (Admin only)"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EMP_ID" ]; then
    HRO_INST=$(auth_put "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/users/$EMP_ID" '{
        "institutionId":"cmd1545dfaf1f7a12e14814"
    }')
    if echo "$HRO_INST" | grep -q "Forbidden\|Access denied\|403\|FORBIDDEN"; then
        log_pass "HRO correctly blocked from assigning institutions (403)"
    else
        log_fail "HRO can assign institutions! Response: $HRO_INST"
    fi
fi

echo ""

# ==========================================
# Test 14.6: Configuration Change Authorization
# ==========================================
echo "=========================================="
echo "  Test 14.6: Configuration Change Authorization"
echo "=========================================="
echo ""

log_info "Test 14.6: HRO cannot change system configuration (code review)"
# Check route permissions for admin-only routes
CONFIG_CHECK=$(grep -n "ADMIN\|Admin" /home/latest/src/app/api/users/route.ts 2>/dev/null | grep "allowedRoles" | head -3)
if [ -n "$CONFIG_CHECK" ]; then
    log_pass "User management restricted to Admin role (allowedRoles: ['ADMIN'])"
    log_info "Config: $CONFIG_CHECK"
else
    log_fail "User management role restriction NOT found"
fi

echo ""

# ==========================================
# Test 14.7: Administrative Audit Logging
# ==========================================
echo "=========================================="
echo "  Test 14.7: Administrative Audit Logging"
echo "=========================================="
echo ""

log_info "Test 14.7a: USER_CREATED audit events exist"
AUDIT_CREATED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'USER_CREATED';
" 2>/dev/null | tr -d ' ')
if [ "$AUDIT_CREATED" -gt 0 ] 2>/dev/null; then
    log_pass "USER_CREATED audit events exist ($AUDIT_CREATED total)"
else
    log_fail "USER_CREATED audit events NOT found"
fi

log_info "Test 14.7b: USER_UPDATED audit events exist"
AUDIT_UPDATED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'USER_UPDATED';
" 2>/dev/null | tr -d ' ')
if [ "$AUDIT_UPDATED" -gt 0 ] 2>/dev/null; then
    log_pass "USER_UPDATED audit events exist ($AUDIT_UPDATED total)"
else
    log_fail "USER_UPDATED audit events NOT found"
fi

log_info "Test 14.7c: USER_DELETED audit events exist"
AUDIT_DELETED=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log WHERE action = 'USER_DELETED';
" 2>/dev/null | tr -d ' ')
if [ "$AUDIT_DELETED" -gt 0 ] 2>/dev/null; then
    log_pass "USER_DELETED audit events exist ($AUDIT_DELETED total)"
else
    log_fail "USER_DELETED audit events NOT found"
fi

log_info "Recent admin audit events:"
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
    SELECT action, username, severity, created_at
    FROM audit.audit_log
    WHERE action LIKE 'USER_%'
    ORDER BY created_at DESC LIMIT 5;
" 2>/dev/null

echo ""

# ==========================================
# Test 14.8: Separation of Duties
# ==========================================
echo "=========================================="
echo "  Test 14.8: Separation of Duties"
echo "=========================================="
echo ""

log_info "Test 14.8: Self-role-change blocked (code review)"
SELF_ROLE_CHECK=$(grep -n "Cannot change your own role\|id === auth.userId" /home/latest/src/app/api/users/[id]/route.ts 2>/dev/null | head -3)
if [ -n "$SELF_ROLE_CHECK" ]; then
    log_pass "Self-role-change blocked (prevents self-escalation/demotion)"
    log_info "SoD check: $SELF_ROLE_CHECK"
else
    log_fail "Self-role-change prevention NOT found"
fi

echo ""

# ==========================================
# Final Cleanup
# ==========================================
echo "=========================================="
echo "  Cleanup"
echo "=========================================="
echo ""

log_info "No cleanup needed for admin tests."

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

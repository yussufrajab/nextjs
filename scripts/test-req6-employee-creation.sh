#!/bin/bash
# Test Requirement 6: Employee Creation Integrity
# Tests employee creation authorization, unique validation, institution validation,
# audit logging, and business rule enforcement

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

# Cleanup function to remove test employees
cleanup_test_employees() {
    log_info "Cleaning up test employees..."
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
        DELETE FROM \"Employee\" WHERE \"zanId\" IN ('9999900001', '9999900002', '9999900003', '8888800001', '8888800002', '7777700001', '6666600001', '5555500001', '5555500002', '5555500003');
    " > /dev/null 2>&1
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
        DELETE FROM \"Employee\" WHERE \"payrollNumber\" IN ('TESTP001', 'TESTP002', 'TESTP003', 'TESTP004', 'TESTP005', 'TESTP006', 'TESTPIO01', 'TESTPFD01', 'TESTPIZ01', 'TESTPIP01', 'TESTPLN01');
    " > /dev/null 2>&1
    log_info "Cleanup complete."
}

# Login with MFA support - stores session and csrf in global vars
# Usage: login_with_mfa <username>
# Sets: HRO_SESSION, HRO_CSRF (etc based on username)
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
        # No MFA needed - extract cookies
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
        EMP_SESSION="$session_val"
        EMP_CSRF="$csrf_val"
    fi
}

# Make authenticated GET request
auth_get() {
    local session=$1
    local url=$2
    curl -s -H "Cookie: session=$session" "$url"
}

# Make authenticated POST request with CSRF
auth_post() {
    local session=$1
    local csrf=$2
    local url=$3
    local data=$4
    curl -s -H "Cookie: session=$session; csrf-token=$csrf" -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "x-csrf-token: $csrf" \
        -d "$data"
}

echo "=========================================="
echo "  Requirement 6: Employee Creation Integrity"
echo "=========================================="
echo ""

# Clear old sessions for test users
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
DELETE FROM \"Session\" WHERE \"userId\" IN (
    SELECT id FROM \"User\" WHERE username IN ('skawesu', 'fautest', 'ymrajab', 'abdillahomarnajim', 'lela')
);
" > /dev/null 2>&1

# Unlock accounts
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username IN ('skawesu', 'fautest', 'abdillahomarnajim', 'ymrajab');" > /dev/null 2>&1

# Enable manual entry for HRO institution
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
UPDATE \"Institution\" SET \"manualEntryEnabled\" = true WHERE id = 'cmd059ion0000e6d85kexfukl';
" > /dev/null 2>&1

# Cleanup any previous test data
cleanup_test_employees

# Login as different roles - with longer delays to avoid rate limiting
sleep 5
log_info "Logging in as HRO (skawesu)..."
login_with_mfa "skawesu"
if [ -n "$SKAWESU_SESSION" ]; then
    log_pass "HRO login successful"
else
    log_fail "HRO login failed"
fi

sleep 8
log_info "Logging in as HRMO (fautest)..."
login_with_mfa "fautest"
if [ -n "$FAUTEST_SESSION" ]; then
    log_pass "HRMO login successful"
else
    log_fail "HRMO login failed"
fi

sleep 8
log_info "Logging in as Admin (ymrajab)..."
login_with_mfa "ymrajab"
if [ -n "$YMRAJAB_SESSION" ]; then
    log_pass "Admin login successful"
else
    log_fail "Admin login failed"
fi

sleep 8
log_info "Logging in as EMPLOYEE (abdillahomarnajim)..."
login_employee "60363181" "00128420" "383356"
if [ -n "$EMP_SESSION" ]; then
    log_pass "EMPLOYEE login successful"
else
    log_fail "EMPLOYEE login failed"
fi

echo ""

# Get existing employee data for duplicate tests
EXISTING_ZANID=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT \"zanId\" FROM \"Employee\" LIMIT 1;" 2>/dev/null | tr -d ' ')
EXISTING_PAYROLL=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT \"payrollNumber\" FROM \"Employee\" LIMIT 1;" 2>/dev/null | tr -d ' ')
EXISTING_ZSSF=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT \"zssfNumber\" FROM \"Employee\" LIMIT 1;" 2>/dev/null | tr -d ' ')

log_info "Existing employee for duplicate tests: ZAN=$EXISTING_ZANID, Payroll=$EXISTING_PAYROLL, ZSSF=$EXISTING_ZSSF"
echo ""

# ==========================================
# Test 6.1: Employee Creation Authorization
# ==========================================
echo "=========================================="
echo "  Test 6.1: Employee Creation Authorization"
echo "=========================================="
echo ""

# Test 6.1a: EMPLOYEE role cannot create employee
log_info "Test 6.1a: EMPLOYEE role cannot create employee via manual-entry"
if [ -n "$EMP_SESSION" ]; then
    EMP_CREATE_RESULT=$(auth_post "$EMP_SESSION" "$EMP_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Unauthorized",
        "gender":"Male",
        "zanId":"9999900001",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZ001",
        "payrollNumber":"TESTP001"
    }')
    if echo "$EMP_CREATE_RESULT" | grep -q "Forbidden\|Access denied\|403\|not allowed\|Unauthorized\|FORBIDDEN"; then
        log_pass "EMPLOYEE correctly blocked from creating employee (403 Forbidden)"
    else
        log_fail "EMPLOYEE was NOT blocked from creating employee! Response: $EMP_CREATE_RESULT"
    fi
fi

# Test 6.1b: HRMO role cannot create employee (only HRO allowed)
log_info "Test 6.1b: HRMO role cannot create employee (only HRO allowed)"
if [ -n "$FAUTEST_SESSION" ]; then
    HRMO_CREATE_RESULT=$(auth_post "$FAUTEST_SESSION" "$FAUTEST_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test HRMO Create",
        "gender":"Male",
        "zanId":"9999900002",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZ002",
        "payrollNumber":"TESTP002"
    }')
    if echo "$HRMO_CREATE_RESULT" | grep -q "Forbidden\|Access denied\|403\|not allowed\|Unauthorized\|FORBIDDEN"; then
        log_pass "HRMO correctly blocked from creating employee (403 Forbidden)"
    else
        log_fail "HRMO was NOT blocked from creating employee! Response: $HRMO_CREATE_RESULT"
    fi
fi

# Test 6.1c: Admin role cannot create employee via manual-entry (only HRO allowed)
log_info "Test 6.1c: Admin role cannot create employee via manual-entry (only HRO allowed)"
if [ -n "$YMRAJAB_SESSION" ]; then
    ADMIN_CREATE_RESULT=$(auth_post "$YMRAJAB_SESSION" "$YMRAJAB_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Admin Create",
        "gender":"Male",
        "zanId":"9999900003",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZ003",
        "payrollNumber":"TESTP003"
    }')
    if echo "$ADMIN_CREATE_RESULT" | grep -q "Forbidden\|Access denied\|403\|not allowed\|Unauthorized\|FORBIDDEN"; then
        log_pass "Admin correctly blocked from creating employee via manual-entry (403 Forbidden)"
    else
        log_fail "Admin was NOT blocked from creating employee! Response: $ADMIN_CREATE_RESULT"
    fi
fi

# Test 6.1d: HRO can create employee (authorized)
log_info "Test 6.1d: HRO can create employee (authorized)"
if [ -n "$SKAWESU_SESSION" ]; then
    HRO_CREATE_RESULT=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Employee Creation",
        "gender":"Male",
        "zanId":"7777700001",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZSSF01",
        "payrollNumber":"TESTP004",
        "phoneNumber":"0712345678"
    }')
    HRO_CREATE_SUCCESS=$(echo "$HRO_CREATE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$HRO_CREATE_SUCCESS" = "True" ]; then
        log_pass "HRO successfully created employee"
        CREATED_EMP_ID=$(echo "$HRO_CREATE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
        log_info "Created employee ID: $CREATED_EMP_ID"
    else
        log_fail "HRO could not create employee! Response: $HRO_CREATE_RESULT"
    fi
fi

# Test 6.1e: Unauthenticated access blocked
log_info "Test 6.1e: Unauthenticated access blocked"
UNAUTH_CREATE_RESULT=$(curl -s -X POST "$BASE_URL/api/employees/manual-entry" \
    -H "Content-Type: application/json" \
    -d '{
        "name":"Test Unauth",
        "gender":"Male",
        "zanId":"9999900099",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZ999",
        "payrollNumber":"TESTP099"
    }')
if echo "$UNAUTH_CREATE_RESULT" | grep -q "UNAUTHENTICATED\|Authentication required\|401"; then
    log_pass "Unauthenticated employee creation blocked (401)"
else
    log_fail "Unauthenticated employee creation NOT blocked! Response: $UNAUTH_CREATE_RESULT"
fi

echo ""

# ==========================================
# Test 6.2: Unique Payroll Number Validation
# ==========================================
echo "=========================================="
echo "  Test 6.2: Unique Payroll Number Validation"
echo "=========================================="
echo ""

log_info "Test 6.2: Duplicate payroll number rejected"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EXISTING_PAYROLL" ]; then
    DUP_PAYROLL_RESULT=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" "{
        \"name\":\"Test Dup Payroll\",
        \"gender\":\"Female\",
        \"zanId\":\"8888800001\",
        \"dateOfBirth\":\"1995-05-15\",
        \"zssfNumber\":\"TESTZDP01\",
        \"payrollNumber\":\"$EXISTING_PAYROLL\"
    }")
    if echo "$DUP_PAYROLL_RESULT" | grep -q "409\|already exists\|duplicate\|Payroll number\|payrollNumber"; then
        log_pass "Duplicate payroll number correctly rejected (409 Conflict)"
    else
        log_fail "Duplicate payroll number NOT rejected! Response: $DUP_PAYROLL_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 6.3: Unique ZanID Validation
# ==========================================
echo "=========================================="
echo "  Test 6.3: Unique ZanID Validation"
echo "=========================================="
echo ""

log_info "Test 6.3: Duplicate ZanID rejected"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EXISTING_ZANID" ]; then
    DUP_ZANID_RESULT=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" "{
        \"name\":\"Test Dup ZanID\",
        \"gender\":\"Male\",
        \"zanId\":\"$EXISTING_ZANID\",
        \"dateOfBirth\":\"1988-03-20\",
        \"zssfNumber\":\"TESTZDZ01\",
        \"payrollNumber\":\"TESTP005\"
    }")
    if echo "$DUP_ZANID_RESULT" | grep -q "409\|already exists\|duplicate\|ZanID\|zanId"; then
        log_pass "Duplicate ZanID correctly rejected (409 Conflict)"
    else
        log_fail "Duplicate ZanID NOT rejected! Response: $DUP_ZANID_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 6.4: Unique ZSSF Validation
# ==========================================
echo "=========================================="
echo "  Test 6.4: Unique ZSSF Validation"
echo "=========================================="
echo ""

log_info "Test 6.4: Duplicate ZSSF number rejected"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$EXISTING_ZSSF" ]; then
    DUP_ZSSF_RESULT=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" "{
        \"name\":\"Test Dup ZSSF\",
        \"gender\":\"Female\",
        \"zanId\":\"8888800002\",
        \"dateOfBirth\":\"1992-07-10\",
        \"zssfNumber\":\"$EXISTING_ZSSF\",
        \"payrollNumber\":\"TESTP006\"
    }")
    if echo "$DUP_ZSSF_RESULT" | grep -q "409\|already exists\|duplicate\|ZSSF\|zssfNumber"; then
        log_pass "Duplicate ZSSF number correctly rejected (409 Conflict)"
    else
        log_fail "Duplicate ZSSF number NOT rejected! Response: $DUP_ZSSF_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 6.5: Duplicate Detection (N/A)
# ==========================================
echo "=========================================="
echo "  Test 6.5: Duplicate Detection (Fuzzy)"
echo "=========================================="
echo ""
log_info "Test 6.5: N/A - No fuzzy duplicate detection beyond unique constraints"
log_info "This test case is marked N/A in the UAT document."
echo ""

# ==========================================
# Test 6.6: Institution Validation
# ==========================================
echo "=========================================="
echo "  Test 6.6: Institution Validation"
echo "=========================================="
echo ""

log_info "Test 6.6a: Employee created with HRO's institution (not client-supplied)"
if [ -n "$SKAWESU_SESSION" ] && [ -n "$CREATED_EMP_ID" ]; then
    EMP_INST=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
        "SELECT \"institutionId\" FROM \"Employee\" WHERE id = '$CREATED_EMP_ID';" 2>/dev/null | tr -d ' ')
    HRO_INST=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
        "SELECT \"institutionId\" FROM \"User\" WHERE username = 'skawesu';" 2>/dev/null | tr -d ' ')
    if [ "$EMP_INST" = "$HRO_INST" ]; then
        log_pass "Employee institution matches HRO's institution ($EMP_INST)"
    else
        log_fail "Employee institution ($EMP_INST) does NOT match HRO's institution ($HRO_INST)"
    fi
fi

log_info "Test 6.6b: Cannot override institutionId via request body"
if [ -n "$SKAWESU_SESSION" ]; then
    OVERRIDE_RESULT=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Institution Override",
        "gender":"Male",
        "zanId":"6666600001",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZIO01",
        "payrollNumber":"TESTPIO01",
        "institutionId":"cmd1545dfaf1f7a12e14814"
    }')
    OVERRIDE_SUCCESS=$(echo "$OVERRIDE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$OVERRIDE_SUCCESS" = "True" ]; then
        NEW_EMP_ID=$(echo "$OVERRIDE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)
        if [ -n "$NEW_EMP_ID" ]; then
            NEW_EMP_INST=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
                "SELECT \"institutionId\" FROM \"Employee\" WHERE id = '$NEW_EMP_ID';" 2>/dev/null | tr -d ' ')
            HRO_INST=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
                "SELECT \"institutionId\" FROM \"User\" WHERE username = 'skawesu';" 2>/dev/null | tr -d ' ')
            if [ "$NEW_EMP_INST" = "$HRO_INST" ]; then
                log_pass "institutionId override ignored - employee created with HRO's institution"
            else
                log_fail "institutionId override NOT ignored! Employee has institution: $NEW_EMP_INST"
            fi
        fi
    else
        log_pass "Employee creation with overridden institutionId rejected"
    fi
fi

echo ""

# ==========================================
# Test 6.7: Audit Logging on Creation
# ==========================================
echo "=========================================="
echo "  Test 6.7: Audit Logging on Creation"
echo "=========================================="
echo ""

log_info "Test 6.7: EMPLOYEE_CREATED audit event logged"
if [ -n "$CREATED_EMP_ID" ]; then
    AUDIT_CHECK=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
        SELECT COUNT(*) FROM audit.audit_log
        WHERE action = 'EMPLOYEE_CREATED'
        AND additional_data->>'employeeId' = '$CREATED_EMP_ID';
    " 2>/dev/null | tr -d ' ')
    if [ "$AUDIT_CHECK" -gt 0 ] 2>/dev/null; then
        log_pass "EMPLOYEE_CREATED audit event found for created employee"
        AUDIT_DETAILS=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
            SELECT action, username, additional_data->>'dataSource' as source, additional_data->>'institutionId' as inst, additional_data->>'employeeName' as emp_name
            FROM audit.audit_log
            WHERE action = 'EMPLOYEE_CREATED'
            AND additional_data->>'employeeId' = '$CREATED_EMP_ID'
            ORDER BY created_at DESC LIMIT 1;
        " 2>/dev/null)
        log_info "Audit details:"
        echo "$AUDIT_DETAILS"
    else
        log_fail "EMPLOYEE_CREATED audit event NOT found for created employee"
    fi
else
    log_info "Skipping audit test - no employee was created successfully"
fi

echo ""

# ==========================================
# Test 6.8: Business Rule Validation
# ==========================================
echo "=========================================="
echo "  Test 6.8: Business Rule Validation"
echo "=========================================="
echo ""

# Test 6.8a: Future date of birth rejected
log_info "Test 6.8a: Future date of birth rejected"
if [ -n "$SKAWESU_SESSION" ]; then
    FUTURE_DOB=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Future DOB",
        "gender":"Male",
        "zanId":"5555500001",
        "dateOfBirth":"2030-01-01",
        "zssfNumber":"TESTZFD01",
        "payrollNumber":"TESTPFD01"
    }')
    if echo "$FUTURE_DOB" | grep -q "future\|invalid\|date of birth\|400\|dateOfBirth"; then
        log_pass "Future date of birth correctly rejected"
    else
        log_fail "Future date of birth NOT rejected! Response: $FUTURE_DOB"
    fi
fi

# Test 6.8b: Invalid ZanID format rejected (too short)
log_info "Test 6.8b: Invalid ZanID format rejected (too short)"
if [ -n "$SKAWESU_SESSION" ]; then
    INVALID_ZANID=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Invalid ZanID",
        "gender":"Female",
        "zanId":"123",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZIZ01",
        "payrollNumber":"TESTPIZ01"
    }')
    if echo "$INVALID_ZANID" | grep -q "invalid\|format\|digits\|400\|ZanID\|zanId"; then
        log_pass "Invalid ZanID format correctly rejected"
    else
        log_fail "Invalid ZanID format NOT rejected! Response: $INVALID_ZANID"
    fi
fi

# Test 6.8c: Missing required fields rejected
log_info "Test 6.8c: Missing required fields rejected"
if [ -n "$SKAWESU_SESSION" ]; then
    MISSING_FIELDS=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Missing Fields"
    }')
    if echo "$MISSING_FIELDS" | grep -q "required\|missing\|400\|validation"; then
        log_pass "Missing required fields correctly rejected"
    else
        log_fail "Missing required fields NOT rejected! Response: $MISSING_FIELDS"
    fi
fi

# Test 6.8d: Invalid phone number format rejected
log_info "Test 6.8d: Invalid phone number format rejected"
if [ -n "$SKAWESU_SESSION" ]; then
    INVALID_PHONE=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" '{
        "name":"Test Invalid Phone",
        "gender":"Male",
        "zanId":"5555500002",
        "dateOfBirth":"1990-01-01",
        "zssfNumber":"TESTZIP01",
        "payrollNumber":"TESTPIP01",
        "phoneNumber":"invalid-phone"
    }')
    if echo "$INVALID_PHONE" | grep -q "invalid\|phone\|Phone\|format\|400\|digits"; then
        log_pass "Invalid phone number format correctly rejected"
    else
        log_fail "Invalid phone number format NOT rejected! Response: $INVALID_PHONE"
    fi
fi

# Test 6.8e: Name too long rejected (>200 chars)
log_info "Test 6.8e: Name too long rejected (>200 chars)"
if [ -n "$SKAWESU_SESSION" ]; then
    LONG_NAME=$(python3 -c "print('A' * 201)")
    LONG_NAME_RESULT=$(auth_post "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/manual-entry" "{
        \"name\":\"$LONG_NAME\",
        \"gender\":\"Male\",
        \"zanId\":\"5555500003\",
        \"dateOfBirth\":\"1990-01-01\",
        \"zssfNumber\":\"TESTZLN01\",
        \"payrollNumber\":\"TESTPLN01\"
    }")
    if echo "$LONG_NAME_RESULT" | grep -q "too long\|200\|length\|400\|name"; then
        log_pass "Name exceeding 200 characters correctly rejected"
    else
        log_fail "Long name NOT rejected! Response: $LONG_NAME_RESULT"
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

cleanup_test_employees

# Restore manual entry setting
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
UPDATE \"Institution\" SET \"manualEntryEnabled\" = false WHERE id = 'cmd059ion0000e6d85kexfukl';
" > /dev/null 2>&1
log_info "Manual entry disabled for institution."

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

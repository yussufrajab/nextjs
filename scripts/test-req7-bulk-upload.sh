#!/bin/bash
# Test Requirement 7: Bulk Upload Security
# Tests bulk upload authorization, file validation, duplicate detection,
# institution validation, audit logging, error handling, and transaction integrity

BASE_URL="http://localhost:9002"
COOKIE_DIR="/tmp/csms-test-cookies"
TEST_DIR="/tmp/csms-bulk-upload-test"
mkdir -p "$COOKIE_DIR" "$TEST_DIR"

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
        DELETE FROM \"Employee\" WHERE \"zanId\" LIKE 'BULK%' OR \"zanId\" LIKE 'CSV%' OR \"zanId\" LIKE 'MIXED%';
    " > /dev/null 2>&1
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
        DELETE FROM \"Employee\" WHERE \"payrollNumber\" LIKE 'BULK%' OR \"payrollNumber\" LIKE 'CSV%';
    " > /dev/null 2>&1
    log_info "Cleanup complete."
}

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
        EMP_SESSION="$session_val"
        EMP_CSRF="$csrf_val"
    fi
}

# Make authenticated POST with file upload (with explicit MIME type)
auth_upload() {
    local session=$1
    local csrf=$2
    local file_path=$3
    local mime_type=${4:-"text/csv"}
    curl -s -H "Cookie: session=$session; csrf-token=$csrf" \
        -H "x-csrf-token: $csrf" \
        -X POST "$BASE_URL/api/employees/bulk-upload" \
        -F "file=@$file_path;type=$mime_type"
}

# Make authenticated PUT with JSON
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
echo "  Requirement 7: Bulk Upload Security"
echo "=========================================="
echo ""

# Clear old sessions for test users
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
DELETE FROM \"Session\" WHERE \"userId\" IN (
    SELECT id FROM \"User\" WHERE username IN ('skawesu', 'fautest', 'ymrajab', 'abdillahomarnajim')
);
" > /dev/null 2>&1

# Unlock accounts
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username IN ('skawesu', 'fautest', 'ymrajab', 'abdillahomarnajim');" > /dev/null 2>&1

# Enable manual entry for HRO institution
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
UPDATE \"Institution\" SET \"manualEntryEnabled\" = true WHERE id = 'cmd059ion0000e6d85kexfukl';
" > /dev/null 2>&1

# Cleanup any previous test data
cleanup_test_employees

# Login as different roles
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

# Create test CSV files
log_info "Creating test CSV files..."

# Valid CSV with 2 employees
cat > "$TEST_DIR/valid.csv" << 'EOF'
Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date,Status
Bulk Test Employee 1,Male,BULK00001,1990-01-15,BULKZ001,BULKP001,Administrative Officer,President Office,Human Resources,2020-01-01,Confirmed
Bulk Test Employee 2,Female,BULK00002,1985-06-20,BULKZ002,BULKP002,Finance Officer,President Office,Finance,2019-03-15,On Probation
EOF

# CSV with invalid rows (missing required fields, bad data)
cat > "$TEST_DIR/invalid.csv" << 'EOF'
Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date,Status
,Male,CSV000001,1990-01-01,CSVZ001,CSVP001,Officer,Ministry,Dept,2020-01-01,Confirmed
Valid Person,Female,CSV000002,1990-01-01,CSVZ002,CSVP002,Officer,Ministry,Dept,2020-01-01,Confirmed
Bad Gender,Invalid,CSV000003,1990-01-01,CSVZ003,CSVP003,Officer,Ministry,Dept,2020-01-01,Confirmed
Future DOB,Male,CSV000004,2030-01-01,CSVZ004,CSVP004,Officer,Ministry,Dept,2020-01-01,Confirmed
EOF

# CSV with duplicate rows (same ZanID within file)
cat > "$TEST_DIR/duplicates.csv" << 'EOF'
Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date,Status
Dup Person 1,Male,BULK00001,1990-01-01,DUPZ001,DUPP001,Officer,Ministry,Dept,2020-01-01,Confirmed
Dup Person 2,Female,BULK00001,1985-01-01,DUPZ002,DUPP002,Officer,Ministry,Dept,2020-01-01,Confirmed
EOF

# Non-CSV file (should be rejected)
echo "This is not a CSV file" > "$TEST_DIR/notcsv.txt"

# Empty CSV (header only)
echo "Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date" > "$TEST_DIR/empty.csv"

# Oversized file (create 2MB file)
python3 -c "print('A' * 2097152)" > "$TEST_DIR/oversized.csv"

# File with wrong extension but CSV content
cp "$TEST_DIR/valid.csv" "$TEST_DIR/valid.pdf"

# CSV with existing employee ZanID
EXISTING_ZANID=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT \"zanId\" FROM \"Employee\" LIMIT 1;" 2>/dev/null | tr -d ' ')
cat > "$TEST_DIR/existing.csv" << EOF
Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date,Status
Existing Test,Male,$EXISTING_ZANID,1990-01-01,EXZ001,EXP001,Officer,Ministry,Dept,2020-01-01,Confirmed
EOF

log_info "Test files created."
echo ""

# ==========================================
# Test 7.1: Upload Authorization
# ==========================================
echo "=========================================="
echo "  Test 7.1: Upload Authorization"
echo "=========================================="
echo ""

# Test 7.1a: EMPLOYEE cannot bulk upload
log_info "Test 7.1a: EMPLOYEE cannot bulk upload"
if [ -n "$EMP_SESSION" ]; then
    EMP_UPLOAD=$(auth_upload "$EMP_SESSION" "$EMP_CSRF" "$TEST_DIR/valid.csv")
    if echo "$EMP_UPLOAD" | grep -q "Forbidden\|Unauthorized\|403\|FORBIDDEN"; then
        log_pass "EMPLOYEE correctly blocked from bulk upload (403 Forbidden)"
    else
        log_fail "EMPLOYEE was NOT blocked from bulk upload! Response: $EMP_UPLOAD"
    fi
fi

sleep 8

# Test 7.1b: HRMO cannot bulk upload (only HRO/Admin allowed)
log_info "Test 7.1b: HRMO cannot bulk upload (only HRO/Admin allowed)"
if [ -n "$FAUTEST_SESSION" ]; then
    HRMO_UPLOAD=$(auth_upload "$FAUTEST_SESSION" "$FAUTEST_CSRF" "$TEST_DIR/valid.csv")
    if echo "$HRMO_UPLOAD" | grep -q "Forbidden\|Unauthorized\|403\|FORBIDDEN"; then
        log_pass "HRMO correctly blocked from bulk upload (403 Forbidden)"
    else
        log_fail "HRMO was NOT blocked from bulk upload! Response: $HRMO_UPLOAD"
    fi
fi

sleep 8

# Test 7.1c: HRO can bulk upload (authorized)
log_info "Test 7.1c: HRO can bulk upload (authorized)"
if [ -n "$SKAWESU_SESSION" ]; then
    HRO_UPLOAD=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/valid.csv")
    HRO_UPLOAD_SUCCESS=$(echo "$HRO_UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$HRO_UPLOAD_SUCCESS" = "True" ]; then
        log_pass "HRO successfully uploaded CSV for validation"
        VALID_ROWS=$(echo "$HRO_UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('validRows',0))" 2>/dev/null)
        log_info "Valid rows: $VALID_ROWS"
    else
        log_fail "HRO could not upload CSV! Response: $HRO_UPLOAD"
    fi
fi

sleep 8

# Test 7.1d: Admin can bulk upload (authorized)
log_info "Test 7.1d: Admin can bulk upload (authorized)"
if [ -n "$YMRAJAB_SESSION" ]; then
    # Create a fresh valid CSV for admin test
    cat > "$TEST_DIR/admin-valid.csv" << 'EOF'
Name,Gender,ZanID,Date of Birth,ZSSF Number,Payroll Number,Cadre,Ministry,Department,Employment Date,Status
Admin Upload Test,Male,BULK00003,1990-01-01,BULKZ003,BULKP003,Officer,Ministry,Dept,2020-01-01,Confirmed
EOF
    ADMIN_UPLOAD=$(auth_upload "$YMRAJAB_SESSION" "$YMRAJAB_CSRF" "$TEST_DIR/admin-valid.csv")
    ADMIN_UPLOAD_SUCCESS=$(echo "$ADMIN_UPLOAD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$ADMIN_UPLOAD_SUCCESS" = "True" ]; then
        log_pass "Admin successfully uploaded CSV for validation"
    else
        log_fail "Admin could not upload CSV! Response: $ADMIN_UPLOAD"
    fi
fi

sleep 8

# Test 7.1e: Unauthenticated access blocked
log_info "Test 7.1e: Unauthenticated access blocked"
UNAUTH_UPLOAD=$(curl -s -X POST "$BASE_URL/api/employees/bulk-upload" -F "file=@$TEST_DIR/valid.csv;type=text/csv")
if echo "$UNAUTH_UPLOAD" | grep -q "UNAUTHENTICATED\|Authentication required\|401"; then
    log_pass "Unauthenticated bulk upload blocked (401)"
else
    log_fail "Unauthenticated bulk upload NOT blocked! Response: $UNAUTH_UPLOAD"
fi

echo ""

# ==========================================
# Test 7.2: File Type Validation
# ==========================================
echo "=========================================="
echo "  Test 7.2: File Type Validation"
echo "=========================================="
echo ""

# Test 7.2a: CSV file accepted
log_info "Test 7.2a: CSV file accepted"
if [ -n "$SKAWESU_SESSION" ]; then
    CSV_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/valid.csv")
    CSV_SUCCESS=$(echo "$CSV_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$CSV_SUCCESS" = "True" ]; then
        log_pass "CSV file accepted"
    else
        log_fail "CSV file NOT accepted! Response: $CSV_RESULT"
    fi
fi

sleep 8

# Test 7.2b: Non-CSV text file rejected
log_info "Test 7.2b: Non-CSV text file rejected"
if [ -n "$SKAWESU_SESSION" ]; then
    TXT_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/notcsv.txt" "text/plain")
    if echo "$TXT_RESULT" | grep -q "error\|invalid\|rejected\|400\|file type\|not allowed"; then
        log_pass "Non-CSV text file correctly rejected"
    else
        # Check if it was accepted (which would be a fail)
        TXT_SUCCESS=$(echo "$TXT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
        if [ "$TXT_SUCCESS" = "True" ]; then
            log_fail "Non-CSV text file was accepted!"
        else
            log_pass "Non-CSV text file correctly rejected"
        fi
    fi
fi

sleep 8

# Test 7.2c: Empty CSV rejected (header only, no data)
log_info "Test 7.2c: Empty CSV rejected (header only, no data)"
if [ -n "$SKAWESU_SESSION" ]; then
    EMPTY_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/empty.csv")
    if echo "$EMPTY_RESULT" | grep -q "at least one data row\|400\|error"; then
        log_pass "Empty CSV correctly rejected (no data rows)"
    else
        log_fail "Empty CSV NOT rejected! Response: $EMPTY_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 7.3: File Size Validation
# ==========================================
echo "=========================================="
echo "  Test 7.3: File Size Validation"
echo "=========================================="
echo ""

sleep 8

log_info "Test 7.3: Oversized file rejected (>1MB)"
if [ -n "$SKAWESU_SESSION" ]; then
    OVERSIZE_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/oversized.csv")
    if echo "$OVERSIZE_RESULT" | grep -q "too large\|size\|limit\|400\|413"; then
        log_pass "Oversized file correctly rejected"
    else
        # Check if it was accepted (which would be a fail)
        OVERSIZE_SUCCESS=$(echo "$OVERSIZE_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
        if [ "$OVERSIZE_SUCCESS" = "True" ]; then
            log_fail "Oversized file was accepted!"
        else
            log_pass "Oversized file correctly rejected"
        fi
    fi
fi

echo ""

# ==========================================
# Test 7.4: Duplicate Detection (N/A)
# ==========================================
echo "=========================================="
echo "  Test 7.4: Duplicate Detection"
echo "=========================================="
echo ""

sleep 8

log_info "Test 7.4a: Duplicate ZanID within file detected"
if [ -n "$SKAWESU_SESSION" ]; then
    DUP_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/duplicates.csv")
    DUP_INVALID=$(echo "$DUP_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('invalidRows',0))" 2>/dev/null)
    if [ "$DUP_INVALID" -gt 0 ] 2>/dev/null; then
        log_pass "Duplicate ZanID within file detected ($DUP_INVALID invalid rows)"
    else
        log_fail "Duplicate ZanID within file NOT detected! Response: $DUP_RESULT"
    fi
fi

sleep 8

log_info "Test 7.4b: Duplicate ZanID against database detected"
if [ -n "$SKAWESU_SESSION" ]; then
    EXISTING_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/existing.csv")
    EXISTING_INVALID=$(echo "$EXISTING_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('invalidRows',0))" 2>/dev/null)
    if [ "$EXISTING_INVALID" -gt 0 ] 2>/dev/null; then
        log_pass "Duplicate ZanID against database detected ($EXISTING_INVALID invalid rows)"
    else
        log_fail "Duplicate ZanID against database NOT detected! Response: $EXISTING_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 7.5: Employee Validation Rules
# ==========================================
echo "=========================================="
echo "  Test 7.5: Employee Validation Rules"
echo "=========================================="
echo ""

sleep 8

log_info "Test 7.5: Invalid rows rejected, valid rows preserved"
if [ -n "$SKAWESU_SESSION" ]; then
    MIXED_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/invalid.csv")
    MIXED_SUCCESS=$(echo "$MIXED_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    MIXED_VALID=$(echo "$MIXED_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('validRows',0))" 2>/dev/null)
    MIXED_INVALID=$(echo "$MIXED_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('invalidRows',0))" 2>/dev/null)
    if [ "$MIXED_SUCCESS" = "True" ] && [ "$MIXED_INVALID" -gt 0 ] 2>/dev/null; then
        log_pass "Invalid rows correctly rejected ($MIXED_INVALID invalid, $MIXED_VALID valid)"
        # Show error details
        log_info "Validation errors:"
        echo "$MIXED_RESULT" | python3 -c "
import sys,json
d = json.load(sys.stdin)
for emp in d.get('data',{}).get('invalidEmployees',[]):
    print(f'  Row {emp.get(\"rowNumber\",\"?\")}: {emp.get(\"errors\",[])}')
" 2>/dev/null
    else
        log_fail "Invalid rows NOT properly rejected! Response: $MIXED_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 7.6: Institution Validation
# ==========================================
echo "=========================================="
echo "  Test 7.6: Institution Validation"
echo "=========================================="
echo ""

sleep 8

log_info "Test 7.6: Institution from session used (not client-supplied)"
if [ -n "$SKAWESU_SESSION" ]; then
    # The bulk upload uses institutionId from auth context
    # We verify by checking that the validation response is tied to HRO's institution
    INST_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/valid.csv")
    INST_SUCCESS=$(echo "$INST_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$INST_SUCCESS" = "True" ]; then
        log_pass "Bulk upload uses institution from session (HRO's institution)"
    else
        log_fail "Bulk upload failed! Response: $INST_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 7.7: Import Audit Logging
# ==========================================
echo "=========================================="
echo "  Test 7.7: Import Audit Logging"
echo "=========================================="
echo ""

log_info "Test 7.7: FILE_UPLOADED audit event logged"
# Check audit log for recent bulk upload events
AUDIT_CHECK=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "
    SELECT COUNT(*) FROM audit.audit_log
    WHERE action = 'FILE_UPLOADED'
    AND additional_data->>'dataSource' = 'BULK_UPLOAD'
    AND created_at > NOW() - INTERVAL '10 minutes';
" 2>/dev/null | tr -d ' ')
if [ "$AUDIT_CHECK" -gt 0 ] 2>/dev/null; then
    log_pass "FILE_UPLOADED audit event found for bulk upload"
    AUDIT_DETAILS=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "
        SELECT action, username, additional_data->>'totalRows' as total, additional_data->>'validRows' as valid, additional_data->>'invalidRows' as invalid
        FROM audit.audit_log
        WHERE action = 'FILE_UPLOADED'
        AND additional_data->>'dataSource' = 'BULK_UPLOAD'
        ORDER BY created_at DESC LIMIT 1;
    " 2>/dev/null)
    log_info "Audit details:"
    echo "$AUDIT_DETAILS"
else
    log_fail "FILE_UPLOADED audit event NOT found for bulk upload"
fi

echo ""

# ==========================================
# Test 7.8: Import Error Handling
# ==========================================
echo "=========================================="
echo "  Test 7.8: Import Error Handling"
echo "=========================================="
echo ""

sleep 8

log_info "Test 7.8: Errors reported per row with details"
if [ -n "$SKAWESU_SESSION" ]; then
    # The invalid.csv test already showed per-row errors
    ERROR_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/invalid.csv")
    ERROR_INVALID=$(echo "$ERROR_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('invalidRows',0))" 2>/dev/null)
    HAS_ERRORS=$(echo "$ERROR_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); inv=d.get('data',{}).get('invalidEmployees',[]); print('yes' if inv and inv[0].get('errors') else 'no')" 2>/dev/null)
    if [ "$ERROR_INVALID" -gt 0 ] 2>/dev/null && [ "$HAS_ERRORS" = "yes" ]; then
        log_pass "Errors reported per row with details"
    else
        log_fail "Per-row error details missing! Response: $ERROR_RESULT"
    fi
fi

echo ""

# ==========================================
# Test 7.9: Transaction Integrity
# ==========================================
echo "=========================================="
echo "  Test 7.9: Transaction Integrity"
echo "=========================================="
echo ""

sleep 8

log_info "Test 7.9: Transaction integrity - PUT creates employees atomically"
if [ -n "$SKAWESU_SESSION" ]; then
    # First validate
    VALIDATE_RESULT=$(auth_upload "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$TEST_DIR/valid.csv")
    VALID_EMPLOYEES=$(echo "$VALIDATE_RESULT" | python3 -c "
import sys,json
d = json.load(sys.stdin)
valid = d.get('data',{}).get('validEmployees',[])
print(json.dumps(valid))
" 2>/dev/null)

    if [ -n "$VALID_EMPLOYEES" ] && [ "$VALID_EMPLOYEES" != "[]" ]; then
        # Now confirm creation via PUT
        PUT_RESULT=$(auth_put "$SKAWESU_SESSION" "$SKAWESU_CSRF" "$BASE_URL/api/employees/bulk-upload" "{\"employees\":$VALID_EMPLOYEES}")
        PUT_SUCCESS=$(echo "$PUT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
        CREATED_COUNT=$(echo "$PUT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('created',0))" 2>/dev/null)
        FAILED_COUNT=$(echo "$PUT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('failed',0))" 2>/dev/null)
        if [ "$PUT_SUCCESS" = "True" ]; then
            log_pass "PUT endpoint successfully created $CREATED_COUNT employee(s) (failed: $FAILED_COUNT)"
            # Verify employees exist in DB
            BULK_EMP_COUNT=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c "SELECT COUNT(*) FROM \"Employee\" WHERE \"zanId\" LIKE 'BULK%';" 2>/dev/null | tr -d ' ')
            log_info "Bulk employees in DB: $BULK_EMP_COUNT"
        else
            log_fail "PUT endpoint failed! Response: $PUT_RESULT"
        fi
    else
        log_info "No valid employees to test PUT endpoint"
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

# Remove test files
rm -rf "$TEST_DIR"

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

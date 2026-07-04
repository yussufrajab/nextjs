#!/bin/bash
# Test Requirement 4.4: Institution Filtering in Queries
# Handles MFA by querying OTP from database

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

# Login with MFA support - returns cookie header string
login_with_mfa() {
    local username=$1
    local cookie_file="$COOKIE_DIR/${username}-jar.txt"

    # Clean old cookie
    rm -f "$cookie_file"

    # Step 1: Login (triggers MFA)
    local login_response=$(curl -s -c "$cookie_file" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"Csms@2026\"}")

    local code=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
    local userId=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('userId',''))" 2>/dev/null)
    local success=$(echo "$login_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

    # If direct login succeeded (no MFA)
    if [ "$success" = "True" ] && [ "$code" != "MFA_REQUIRED" ]; then
        # Extract session cookie and URL-decode it
        local session_cookie=$(grep session "$cookie_file" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
        echo "session=$session_cookie"
        return
    fi

    # If MFA required, get OTP from database
    if [ "$code" = "MFA_REQUIRED" ] && [ -n "$userId" ]; then
        sleep 2  # Wait for OTP to be stored
        local otp=$(PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
            "SELECT token FROM \"MfaToken\" WHERE \"userId\" = '$userId' AND \"tokenType\" = 'OTP' AND \"usedAt\" IS NULL AND \"expiresAt\" > NOW() ORDER BY \"createdAt\" DESC LIMIT 1;" 2>/dev/null | tr -d ' ')

        if [ -n "$otp" ]; then
            # Step 2: Verify OTP using cookie jar
            local verify_response=$(curl -s -c "$cookie_file" -b "$cookie_file" -X POST "$BASE_URL/api/auth/mfa/verify-otp" \
                -H "Content-Type: application/json" \
                -d "{\"userId\":\"$userId\",\"otpCode\":\"$otp\"}")

            local verify_success=$(echo "$verify_response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
            if [ "$verify_success" = "True" ]; then
                # Extract session cookie and URL-decode it
                local session_cookie=$(grep session "$cookie_file" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
                echo "session=$session_cookie"
                return
            fi
        fi
    fi

    echo ""
}

echo "=========================================="
echo "  Requirement 4.4: Institution Filtering"
echo "=========================================="
echo ""

# Add delay to avoid rate limiting between logins
sleep 5

# Test 1: HRO can only see own institution employees
log_info "Test 1: HRO employee list - should only see own institution"
HRO_AUTH=$(login_with_mfa "skawesu")
if [ -n "$HRO_AUTH" ]; then
    hro_result=$(curl -s -H "Cookie: $HRO_AUTH" "$BASE_URL/api/employees")
    hro_count=$(echo "$hro_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
    hro_institutions=$(echo "$hro_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
insts=set(e.get('institutionId','') for e in d.get('data',[]) if e.get('institutionId'))
print(len(insts))
" 2>/dev/null)
    hro_inst_id=$(echo "$hro_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('data'): print(d['data'][0].get('institutionId',''))
else: print('')
" 2>/dev/null)

    if [ "$hro_institutions" = "1" ]; then
        log_pass "HRO sees employees from only 1 institution ($hro_count employees)"
    elif [ "$hro_count" = "0" ]; then
        log_pass "HRO sees 0 employees (institution has no employees - filter working)"
    else
        log_fail "HRO sees employees from $hro_institutions institutions (expected 1)"
    fi
else
    log_fail "Could not login as HRO (skawesu)"
fi

echo ""

sleep 5
# Test 2: CSC role (HHRMD) can see all institutions
log_info "Test 2: CSC role (HHRMD) employee list - should see all institutions"
HHRMD_AUTH=$(login_with_mfa "skhamis")
if [ -n "$HHRMD_AUTH" ]; then
    hhrmd_result=$(curl -s -H "Cookie: $HHRMD_AUTH" "$BASE_URL/api/employees?size=500")
    hhrmd_count=$(echo "$hhrmd_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
    hhrmd_institutions=$(echo "$hhrmd_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
insts=set(e.get('institutionId','') for e in d.get('data',[]) if e.get('institutionId'))
print(len(insts))
" 2>/dev/null)

    if [ "$hhrmd_institutions" -gt "1" ]; then
        log_pass "HHRMD (CSC role) sees employees from $hhrmd_institutions institutions ($hhrmd_count employees)"
    else
        log_fail "HHRMD only sees $hhrmd_institutions institution (expected multiple)"
    fi
else
    log_fail "Could not login as HHRMD (skhamis)"
fi

echo ""

sleep 5
# Test 3: HRMO (CSC role) can see all institutions
log_info "Test 3: CSC role (HRMO) employee list - should see all institutions"
HRMO_AUTH=$(login_with_mfa "fautest")
if [ -n "$HRMO_AUTH" ]; then
    hrmo_result=$(curl -s -H "Cookie: $HRMO_AUTH" "$BASE_URL/api/employees?size=500")
    hrmo_count=$(echo "$hrmo_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
    hrmo_institutions=$(echo "$hrmo_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
insts=set(e.get('institutionId','') for e in d.get('data',[]) if e.get('institutionId'))
print(len(insts))
" 2>/dev/null)

    if [ "$hrmo_institutions" -gt "1" ]; then
        log_pass "HRMO (CSC role) sees employees from $hrmo_institutions institutions ($hrmo_count employees)"
    else
        log_fail "HRMO only sees $hrmo_institutions institution (expected multiple)"
    fi
else
    log_fail "Could not login as HRMO (fautest)"
fi

echo ""

sleep 5
# Test 4: EMPLOYEE can only see own record
log_info "Test 4: EMPLOYEE list - should only see own record"
# Unlock employee account first
PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -c "UPDATE \"User\" SET active = true, \"failedLoginAttempts\" = 0, \"loginLockedUntil\" = NULL WHERE username = 'abdillahomarnajim';" > /dev/null 2>&1

EMP_COOKIE_FILE="$COOKIE_DIR/emp-jar.txt"
rm -f "$EMP_COOKIE_FILE"
EMP_RESPONSE=$(curl -s -c "$EMP_COOKIE_FILE" -X POST "$BASE_URL/api/auth/employee-login" \
    -H "Content-Type: application/json" \
    -d '{"zanId":"60363181","zssfNumber":"00128420","payrollNumber":"383356"}')
EMP_SUCCESS=$(echo "$EMP_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

if [ "$EMP_SUCCESS" = "True" ]; then
    EMP_AUTH=$(grep session "$EMP_COOKIE_FILE" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))")
    emp_result=$(curl -s -H "Cookie: session=$EMP_AUTH" "$BASE_URL/api/employees")
    emp_count=$(echo "$emp_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)

    if [ "$emp_count" = "1" ]; then
        log_pass "EMPLOYEE sees only 1 record (own record)"
    else
        log_fail "EMPLOYEE sees $emp_count records (expected 1)"
    fi
else
    log_fail "Could not login as EMPLOYEE"
fi

echo ""

# Test 5: HRO cannot bypass filter by passing institutionId parameter
log_info "Test 5: HRO cannot bypass filter with institutionId parameter"
if [ -n "$HRO_AUTH" ] && [ -n "$hhrmd_institutions" ] && [ "$hhrmd_institutions" -gt "0" ]; then
    # Get a different institution from HHRMD's results
    other_institution=$(echo "$hhrmd_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
hro_inst='$hro_inst_id'
for e in d.get('data',[]):
    inst = e.get('institutionId','')
    if inst and inst != hro_inst:
        print(inst)
        break
" 2>/dev/null)

    if [ -n "$other_institution" ]; then
        bypass_result=$(curl -s -H "Cookie: $HRO_AUTH" "$BASE_URL/api/employees?institutionId=$other_institution")
        bypass_inst=$(echo "$bypass_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('data'): print(d['data'][0].get('institutionId',''))
else: print('none')
" 2>/dev/null)

        if [ "$bypass_inst" = "$hro_inst_id" ]; then
            log_pass "HRO institutionId parameter ignored - still sees own institution only"
        elif [ "$bypass_inst" = "none" ]; then
            log_pass "HRO institutionId parameter ignored - no results returned"
        else
            log_fail "HRO was able to switch institutions via parameter! Got: $bypass_inst"
        fi
    else
        log_info "Could not find different institution for bypass test"
    fi
fi

echo ""

# Test 6: CSC role CAN filter by specific institution
log_info "Test 6: CSC role can filter by specific institutionId"
if [ -n "$HRMO_AUTH" ] && [ -n "$other_institution" ]; then
    csc_filter_result=$(curl -s -H "Cookie: $HRMO_AUTH" "$BASE_URL/api/employees?institutionId=$other_institution")
    csc_filter_count=$(echo "$csc_filter_result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
    csc_filter_inst=$(echo "$csc_filter_result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
insts=set(e.get('institutionId','') for e in d.get('data',[]) if e.get('institutionId'))
print(len(insts))
" 2>/dev/null)

    if [ "$csc_filter_inst" = "1" ]; then
        log_pass "CSC role successfully filtered to 1 institution ($csc_filter_count employees)"
    elif [ "$csc_filter_count" = "0" ]; then
        log_pass "CSC role filtered to institution with 0 employees (filter working)"
    else
        log_fail "CSC role filtering returned $csc_filter_inst institutions"
    fi
fi

echo ""

# Test 7: Unauthenticated access blocked
log_info "Test 7: Unauthenticated employee list blocked"
unauth_result=$(curl -s "$BASE_URL/api/employees")
if echo "$unauth_result" | grep -q "UNAUTHENTICATED\|Authentication required"; then
    log_pass "Unauthenticated access correctly blocked"
else
    log_fail "Unauthenticated access not blocked!"
fi

echo ""

# Test 8: HRO cannot access employee from different institution via ?id=
log_info "Test 8: HRO cannot access employee from different institution via ?id="
if [ -n "$HRO_AUTH" ] && [ -n "$HRMO_AUTH" ] && [ -n "$other_institution" ]; then
    # Get an employee from a different institution using HRMO
    other_employee=$(curl -s -H "Cookie: $HRMO_AUTH" "$BASE_URL/api/employees?institutionId=$other_institution" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('data'): print(d['data'][0]['id'])
" 2>/dev/null)

    if [ -n "$other_employee" ]; then
        idor_result=$(curl -s -H "Cookie: $HRO_AUTH" "$BASE_URL/api/employees?id=$other_employee")
        if echo "$idor_result" | grep -q "Access denied"; then
            log_pass "HRO correctly denied access to employee from different institution"
        else
            log_fail "HRO could access employee from different institution via ?id=!"
        fi
    else
        log_info "No employees found in other institution for IDOR test"
    fi
fi

echo ""

# Test 9: EMPLOYEE cannot access other employee via ?id=
log_info "Test 9: EMPLOYEE cannot access other employee via ?id="
if [ -n "$EMP_AUTH" ] && [ -n "$HRO_AUTH" ]; then
    # Get an employee ID from HRO's institution
    other_employee2=$(curl -s -H "Cookie: $HRO_AUTH" "$BASE_URL/api/employees" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if d.get('data'): print(d['data'][0]['id'])
" 2>/dev/null)

    if [ -n "$other_employee2" ]; then
        idor_emp_result=$(curl -s -H "Cookie: session=$EMP_AUTH" "$BASE_URL/api/employees?id=$other_employee2")
        if echo "$idor_emp_result" | grep -q "Access denied"; then
            log_pass "EMPLOYEE correctly denied access to other employee"
        else
            log_fail "EMPLOYEE could access other employee via ?id=!"
        fi
    fi
fi

echo ""

# Test 10-17: Various endpoints - HRO should only see own institution
for endpoint_name in "Promotions" "LWOP" "Confirmations" "Retirement" "Resignation" "Cadre Change" "Service Extension" "Termination"; do
    case "$endpoint_name" in
        "Promotions") endpoint="/api/promotions" ;;
        "LWOP") endpoint="/api/lwop" ;;
        "Confirmations") endpoint="/api/confirmations" ;;
        "Retirement") endpoint="/api/retirement" ;;
        "Resignation") endpoint="/api/resignation" ;;
        "Cadre Change") endpoint="/api/cadre-change" ;;
        "Service Extension") endpoint="/api/service-extension" ;;
        "Termination") endpoint="/api/termination" ;;
    esac

    log_info "Test: $endpoint_name - HRO should only see own institution"
    if [ -n "$HRO_AUTH" ]; then
        result=$(curl -s -H "Cookie: $HRO_AUTH" "$BASE_URL$endpoint")
        inst_count=$(echo "$result" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data=d.get('data',[])
if data:
    insts=set()
    for r in data:
        emp=r.get('Employee',{})
        if emp:
            insts.add(emp.get('institutionId',''))
    print(len(insts))
else:
    print(0)
" 2>/dev/null)

        if [ "$inst_count" -le "1" ]; then
            log_pass "$endpoint_name: HRO sees own institution only ($inst_count institutions)"
        else
            log_fail "$endpoint_name: HRO sees $inst_count institutions (expected 1)"
        fi
    fi
done

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
    echo -e "${GREEN}All institution filtering tests PASSED!${NC}"
    exit 0
else
    echo -e "${RED}Some tests FAILED. Review the findings above.${NC}"
    exit 1
fi

#!/bin/bash
# ============================================================================
# Runtime test harness for the 31 ⚠️ PENDING sub-tests reclassified in v1.1.
# Bypasses MFA rate-limiting by reading OTPs from the database (matching the
# pattern in scripts/test-institution-filtering.sh).
#
# Usage:
#   bash scripts/test-pending-uat.sh [batch-name]
#
# Output: appends pass/fail to /tmp/csms-test-output/results.jsonl
# ============================================================================

set -u
BASE_URL="http://localhost:9002"
COOKIE_DIR="/tmp/csms-test-cookies"
OUT_DIR="/tmp/csms-test-output"
mkdir -p "$COOKIE_DIR" "$OUT_DIR"
RESULTS_FILE="$OUT_DIR/results.jsonl"
: > "$RESULTS_FILE"  # truncate

RED='\033[0;31m'; GREEN='\033[0.32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

# Counters (also re-derived from results file at the end)
PASS_COUNT=0; FAIL_COUNT=0; SKIP_COUNT=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASS_COUNT=$((PASS_COUNT+1)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }
log_skip() { echo -e "${YELLOW}[SKIP]${NC} $1"; SKIP_COUNT=$((SKIP_COUNT+1)); }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------
get_user_id() {
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
        "SELECT id FROM \"User\" WHERE username = '$1' LIMIT 1;" 2>/dev/null | tr -d ' '
}

get_otp() {
    local user_id=$1
    sleep 1  # allow time for OTP to be persisted
    PGPASSWORD="Mamlaka2020" psql -h localhost -U postgres -d nody -t -c \
        "SELECT token FROM \"MfaToken\" WHERE \"userId\" = '$user_id' AND \"tokenType\" = 'OTP' AND \"usedAt\" IS NULL AND \"expiresAt\" > NOW() ORDER BY \"createdAt\" DESC LIMIT 1;" 2>/dev/null | tr -d ' '
}

# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

# get_csrf_token — fetches a pre-login CSRF token and writes it to a cookie jar.
# Usage: get_csrf_token <jar>
get_csrf_token() {
    local jar=$1
    curl -s -m 10 -c "$jar" "$BASE_URL/api/auth/csrf-token" >/dev/null
}

# login_with_mfa — logs in as $1, completes MFA, returns "session=..." string.
# If MFA is bypassed for the account, returns the session cookie directly.
login_with_mfa() {
    local username=$1
    local jar="$COOKIE_DIR/${username}-jar.txt"
    rm -f "$jar"
    get_csrf_token "$jar"
    local csrf=$(grep csrf-token "$jar" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)

    local resp
    resp=$(curl -s -m 10 -b "$jar" -c "$jar" -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" -H "x-csrf-token: $csrf" \
        -d "{\"username\":\"$username\",\"password\":\"Csms@2026\"}")

    local code=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null)
    local user_id=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('userId',''))" 2>/dev/null)
    local success=$(echo "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)

    if [ "$success" = "True" ] && [ "$code" != "MFA_REQUIRED" ]; then
        local session=$(grep -E "session\s" "$jar" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
        echo "session=$session"
        return
    fi

    if [ "$code" = "MFA_REQUIRED" ] && [ -n "$user_id" ]; then
        local otp=$(get_otp "$user_id")
        if [ -z "$otp" ]; then
            echo ""
            return
        fi
        # Refresh CSRF token (login route sets a fresh one on response)
        get_csrf_token "$jar"
        csrf=$(grep csrf-token "$jar" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
        local verify_resp=$(curl -s -m 10 -b "$jar" -c "$jar" -X POST "$BASE_URL/api/auth/mfa/verify-otp" \
            -H "Content-Type: application/json" -H "x-csrf-token: $csrf" \
            -d "{\"userId\":\"$user_id\",\"otpCode\":\"$otp\"}")
        local verify_success=$(echo "$verify_resp" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
        if [ "$verify_success" = "True" ]; then
            local session=$(grep -E "session\s" "$jar" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
            echo "session=$session"
            return
        fi
    fi
    echo ""
}

# reauth_admin — performs step-up re-auth so the admin can call unlock-account etc.
reauth_admin() {
    local username=$1
    local scope=$2
    local jar="$COOKIE_DIR/${username}-jar.txt"
    local csrf=$(grep csrf-token "$jar" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
    curl -s -m 10 -b "$jar" -c "$jar" -X POST "$BASE_URL/api/auth/reauth" \
        -H "Content-Type: application/json" -H "x-csrf-token: $csrf" \
        -d "{\"scope\":\"$scope\",\"password\":\"Csms@2026\"}" >/dev/null
}

# unlock_user — admin unlocks another user's account (clears failedLoginAttempts + loginLockedUntil).
# This is the test for Req 1.10/1.11 rate-limit reset path.
unlock_user() {
    local admin_user=$1
    local target_user_id=$2
    local jar="$COOKIE_DIR/${admin_user}-jar.txt"
    local csrf=$(grep csrf-token "$jar" | awk '{print $NF}' | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null)
    reauth_admin "$admin_user" "admin.unlock-account"
    local resp=$(curl -s -m 10 -b "$jar" -c "$jar" -X POST "$BASE_URL/api/admin/unlock-account" \
        -H "Content-Type: application/json" -H "x-csrf-token: $csrf" \
        -d "{\"userId\":\"$target_user_id\",\"verificationNotes\":\"UAT test reset - rate limit cooldown\",\"identityVerified\":true}")
    echo "$resp"
}

# Reset and cool down — 65 seconds between logins per the UAT doc
cooldown() {
    local secs=${1:-65}
    log_info "Cooldown: ${secs}s (auth-tier rate limit)"
    sleep "$secs"
}

# Run a test and record
record() {
    local test_id=$1
    local outcome=$2  # PASS|FAIL|SKIP
    local detail=$3
    echo "{\"test\":\"$test_id\",\"outcome\":\"$outcome\",\"detail\":\"$detail\",\"ts\":\"$(date -Iseconds)\"}" >> "$RESULTS_FILE"
}

run_test() {
    local test_id=$1
    local desc=$2
    shift 2
    # Remaining args form the actual test body
    if "$@" 2>&1; then
        log_pass "$test_id — $desc"
        record "$test_id" "PASS" "$desc"
    else
        log_fail "$test_id — $desc"
        record "$test_id" "FAIL" "$desc"
    fi
}

echo "=========================================="
echo "  UAT Runtime Pass — v1.1 Reclassified Sub-tests"
echo "  $(date -Iseconds)"
echo "=========================================="

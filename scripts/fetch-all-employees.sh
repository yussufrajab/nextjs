#!/bin/bash

# ============================================================================
# HRIMS Employee Fetch Script - All Institutions
# ============================================================================
# This script fetches employees from HRIMS for all institutions sequentially.
# Similar to the fetch-data page functionality at:
#   https://csms.zanajira.go.tz/dashboard/admin/fetch-data
#
# Usage:
#   ./scripts/fetch-all-employees.sh [OPTIONS]
#
# Options:
#   --page-size NUM     Records per page from HRIMS (default: 100)
#   --pause NUM         Seconds to pause between institutions (default: 15)
#   --identifier TYPE   Identifier type: votecode, tin, or auto (default: auto)
#   --start-from NUM    Start from institution number N (1-based)
#   --dry-run           List institutions without fetching
#   --help              Show this help message
#
# Prerequisites:
#   - jq (JSON processor) must be installed
#   - Server must be running on port 9002
# ============================================================================

set -e

# ============================================================================
# CONFIGURATION
# ============================================================================
BASE_URL="http://localhost:9002"
PAGE_SIZE=100
PAUSE_SECONDS=15
IDENTIFIER_TYPE="auto"  # auto, votecode, or tin
START_FROM=1
DRY_RUN=false
LOG_DIR="./logs"

# ============================================================================
# COLORS
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
log_info() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp]${NC} ℹ️  $1"
    [ -n "$LOG_FILE" ] && echo "[$timestamp] INFO: $1" >> "$LOG_FILE" || true
}

log_success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp]${NC} ✅ $1"
    [ -n "$LOG_FILE" ] && echo "[$timestamp] SUCCESS: $1" >> "$LOG_FILE" || true
}

log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp]${NC} ❌ $1"
    [ -n "$LOG_FILE" ] && echo "[$timestamp] ERROR: $1" >> "$LOG_FILE" || true
}

log_warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp]${NC} ⚠️  $1"
    [ -n "$LOG_FILE" ] && echo "[$timestamp] WARNING: $1" >> "$LOG_FILE" || true
}

log_divider() {
    local char="${1:-=}"
    local length="${2:-80}"
    printf '%*s\n' "$length" '' | tr ' ' "$char"
}

format_duration() {
    local seconds=$1
    local hours=$((seconds / 3600))
    local minutes=$(((seconds % 3600) / 60))
    local secs=$((seconds % 60))

    if [ $hours -gt 0 ]; then
        echo "${hours}h ${minutes}m ${secs}s"
    elif [ $minutes -gt 0 ]; then
        echo "${minutes}m ${secs}s"
    else
        echo "${secs}s"
    fi
}

show_help() {
    echo "HRIMS Employee Fetch Script - All Institutions"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --page-size NUM     Records per page from HRIMS (default: 100)"
    echo "  --pause NUM         Seconds to pause between institutions (default: 15)"
    echo "  --identifier TYPE   Identifier type: votecode, tin, or auto (default: auto)"
    echo "  --start-from NUM    Start from institution number N (1-based)"
    echo "  --dry-run           List institutions without fetching"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run with defaults"
    echo "  $0 --page-size 50 --pause 10         # Custom page size and pause"
    echo "  $0 --start-from 25                    # Resume from institution 25"
    echo "  $0 --dry-run                          # Just list institutions"
    echo ""
}

# ============================================================================
# PARSE COMMAND LINE ARGUMENTS
# ============================================================================
while [[ $# -gt 0 ]]; do
    case $1 in
        --page-size)
            PAGE_SIZE="$2"
            shift 2
            ;;
        --pause)
            PAUSE_SECONDS="$2"
            shift 2
            ;;
        --identifier)
            IDENTIFIER_TYPE="$2"
            shift 2
            ;;
        --start-from)
            START_FROM="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
echo ""
log_divider "="
echo -e "${CYAN}  HRIMS Employee Fetch - All Institutions${NC}"
log_divider "="
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed."
    echo "Please install jq:"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  CentOS/RHEL:   sudo yum install jq"
    echo "  macOS:         brew install jq"
    exit 1
fi
log_info "jq is available"

# Check if server is running
log_info "Checking server status..."
if ! curl -s "${BASE_URL}/api/institutions" > /dev/null 2>&1; then
    log_error "Server is not running on ${BASE_URL}"
    echo "Please start the server first:"
    echo "  npm run dev"
    exit 1
fi
log_success "Server is running"

# Create log directory
mkdir -p "$LOG_DIR"

# Create log file
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_FILE="${LOG_DIR}/fetch-employees-${TIMESTAMP}.log"
log_info "Log file: $LOG_FILE"

# ============================================================================
# FETCH INSTITUTIONS
# ============================================================================
echo ""
log_divider "-"
log_info "Fetching institutions list..."

INSTITUTIONS_RESPONSE=$(curl -s "${BASE_URL}/api/institutions")
INSTITUTIONS=$(echo "$INSTITUTIONS_RESPONSE" | jq -c '.data // []')
TOTAL_INSTITUTIONS=$(echo "$INSTITUTIONS" | jq 'length')

if [ "$TOTAL_INSTITUTIONS" -eq 0 ]; then
    log_error "No institutions found in the database"
    exit 1
fi

log_success "Found $TOTAL_INSTITUTIONS institutions"

# Show configuration
echo ""
log_divider "-"
log_info "CONFIGURATION:"
log_info "  Page size: $PAGE_SIZE"
log_info "  Pause between institutions: ${PAUSE_SECONDS}s"
log_info "  Identifier type: $IDENTIFIER_TYPE"
log_info "  Starting from: Institution #$START_FROM"
if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN MODE - No actual fetching will occur"
fi
log_divider "-"
echo ""

# ============================================================================
# DRY RUN - LIST INSTITUTIONS
# ============================================================================
if [ "$DRY_RUN" = true ]; then
    log_info "Listing all institutions:"
    echo ""

    for i in $(seq 0 $((TOTAL_INSTITUTIONS - 1))); do
        INST=$(echo "$INSTITUTIONS" | jq -r ".[$i]")
        INST_NAME=$(echo "$INST" | jq -r '.name')
        VOTE_NUMBER=$(echo "$INST" | jq -r '.voteNumber // "N/A"')
        TIN_NUMBER=$(echo "$INST" | jq -r '.tinNumber // "N/A"')

        printf "%3d. %-60s | Vote: %-10s | TIN: %s\n" \
            $((i + 1)) "$INST_NAME" "$VOTE_NUMBER" "$TIN_NUMBER"
    done

    echo ""
    log_info "Total: $TOTAL_INSTITUTIONS institutions"
    exit 0
fi

# ============================================================================
# FETCH EMPLOYEES FOR EACH INSTITUTION
# ============================================================================
SCRIPT_START_TIME=$(date +%s)
SUCCESS_COUNT=0
FAILURE_COUNT=0
SKIPPED_COUNT=0
TOTAL_EMPLOYEES=0

# Arrays to store results (bash 4+)
declare -a SUCCESS_LIST
declare -a FAILURE_LIST
declare -a SKIPPED_LIST

log_info "Starting employee fetch..."
echo ""

# Adjust index for 1-based start
START_INDEX=$((START_FROM - 1))

for i in $(seq $START_INDEX $((TOTAL_INSTITUTIONS - 1))); do
    INST=$(echo "$INSTITUTIONS" | jq -r ".[$i]")
    INST_ID=$(echo "$INST" | jq -r '.id')
    INST_NAME=$(echo "$INST" | jq -r '.name')
    VOTE_NUMBER=$(echo "$INST" | jq -r '.voteNumber // empty')
    TIN_NUMBER=$(echo "$INST" | jq -r '.tinNumber // empty')

    CURRENT_NUM=$((i + 1))
    PROGRESS="[$CURRENT_NUM/$TOTAL_INSTITUTIONS]"

    log_divider "-" 70
    log_info "$PROGRESS INSTITUTION: $INST_NAME"
    log_divider "-" 70

    # Determine which identifier to use
    USE_IDENTIFIER_TYPE=""
    USE_IDENTIFIER=""

    if [ "$IDENTIFIER_TYPE" = "auto" ]; then
        if [ -n "$VOTE_NUMBER" ] && [ "$VOTE_NUMBER" != "null" ]; then
            USE_IDENTIFIER_TYPE="votecode"
            USE_IDENTIFIER="$VOTE_NUMBER"
        elif [ -n "$TIN_NUMBER" ] && [ "$TIN_NUMBER" != "null" ]; then
            USE_IDENTIFIER_TYPE="tin"
            USE_IDENTIFIER="$TIN_NUMBER"
        fi
    elif [ "$IDENTIFIER_TYPE" = "votecode" ]; then
        if [ -n "$VOTE_NUMBER" ] && [ "$VOTE_NUMBER" != "null" ]; then
            USE_IDENTIFIER_TYPE="votecode"
            USE_IDENTIFIER="$VOTE_NUMBER"
        fi
    elif [ "$IDENTIFIER_TYPE" = "tin" ]; then
        if [ -n "$TIN_NUMBER" ] && [ "$TIN_NUMBER" != "null" ]; then
            USE_IDENTIFIER_TYPE="tin"
            USE_IDENTIFIER="$TIN_NUMBER"
        fi
    fi

    # Skip if no identifier available
    if [ -z "$USE_IDENTIFIER_TYPE" ] || [ -z "$USE_IDENTIFIER" ]; then
        log_warning "Skipping: No valid identifier available"
        ((SKIPPED_COUNT++))
        SKIPPED_LIST+=("$INST_NAME")
        continue
    fi

    log_info "Using $USE_IDENTIFIER_TYPE: $USE_IDENTIFIER"
    log_info "Page size: $PAGE_SIZE"

    # Prepare request body
    REQUEST_BODY=$(jq -n \
        --arg identifierType "$USE_IDENTIFIER_TYPE" \
        --arg voteNumber "${VOTE_NUMBER:-}" \
        --arg tinNumber "${TIN_NUMBER:-}" \
        --arg institutionId "$INST_ID" \
        --argjson pageSize "$PAGE_SIZE" \
        '{
            identifierType: $identifierType,
            voteNumber: (if $voteNumber == "" then null else $voteNumber end),
            tinNumber: (if $tinNumber == "" then null else $tinNumber end),
            institutionId: $institutionId,
            pageSize: $pageSize
        }')

    FETCH_START_TIME=$(date +%s)

    # Make the fetch request
    RESPONSE=$(curl -s -w "\n%{http_code}" \
        --max-time 3600 \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$REQUEST_BODY" \
        "${BASE_URL}/api/hrims/fetch-by-institution" 2>&1) || true

    FETCH_END_TIME=$(date +%s)
    FETCH_DURATION=$((FETCH_END_TIME - FETCH_START_TIME))

    # Parse response
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

    # Check for curl errors (non-numeric http code means curl failed)
    if ! [[ "$HTTP_CODE" =~ ^[0-9]+$ ]]; then
        log_error "Network error: $RESPONSE_BODY"
        ((FAILURE_COUNT++))
        FAILURE_LIST+=("$INST_NAME: Network error")
        continue
    fi

    # Parse the response
    SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success // false')

    if [ "$SUCCESS" = "true" ]; then
        EMPLOYEE_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.data.employeeCount // 0')
        PAGES_FETCHED=$(echo "$RESPONSE_BODY" | jq -r '.data.pagesFetched // 0')
        SKIPPED=$(echo "$RESPONSE_BODY" | jq -r '.data.skippedCount // 0')

        log_success "$INST_NAME: Fetched $EMPLOYEE_COUNT employees ($PAGES_FETCHED pages, $SKIPPED skipped) in $(format_duration $FETCH_DURATION)"

        ((SUCCESS_COUNT++))
        TOTAL_EMPLOYEES=$((TOTAL_EMPLOYEES + EMPLOYEE_COUNT))
        SUCCESS_LIST+=("$INST_NAME: $EMPLOYEE_COUNT employees")
    else
        ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.message // "Unknown error"')
        log_error "$INST_NAME: $ERROR_MSG"

        ((FAILURE_COUNT++))
        FAILURE_LIST+=("$INST_NAME: $ERROR_MSG")
    fi

    # Show running progress
    PROCESSED=$((SUCCESS_COUNT + FAILURE_COUNT + SKIPPED_COUNT))
    PROGRESS_PCT=$(awk "BEGIN {printf \"%.1f\", ($PROCESSED / $TOTAL_INSTITUTIONS) * 100}")
    log_info "Progress: $PROCESSED/$TOTAL_INSTITUTIONS ($PROGRESS_PCT%) | ✅ $SUCCESS_COUNT | ❌ $FAILURE_COUNT | ⏭️ $SKIPPED_COUNT"

    # Pause between institutions (except for the last one)
    if [ $i -lt $((TOTAL_INSTITUTIONS - 1)) ]; then
        log_info "Pausing ${PAUSE_SECONDS}s before next institution..."
        sleep "$PAUSE_SECONDS"
    fi

    echo ""
done

# ============================================================================
# FINAL SUMMARY
# ============================================================================
SCRIPT_END_TIME=$(date +%s)
TOTAL_DURATION=$((SCRIPT_END_TIME - SCRIPT_START_TIME))

echo ""
log_divider "="
echo -e "${CYAN}  FINAL SUMMARY${NC}"
log_divider "="
log_info "Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
log_info "Total duration: $(format_duration $TOTAL_DURATION)"
echo ""
log_info "Total institutions processed: $TOTAL_INSTITUTIONS"
log_success "Successfully fetched: $SUCCESS_COUNT"
log_error "Failed: $FAILURE_COUNT"
log_warning "Skipped (no identifier): $SKIPPED_COUNT"
log_info "Total employees fetched: $TOTAL_EMPLOYEES"
log_divider "="

# Print successful fetches
if [ $SUCCESS_COUNT -gt 0 ]; then
    echo ""
    log_info "✅ SUCCESSFUL FETCHES:"
    log_divider "-"
    for item in "${SUCCESS_LIST[@]}"; do
        echo "  - $item"
    done
fi

# Print failed fetches
if [ $FAILURE_COUNT -gt 0 ]; then
    echo ""
    log_info "❌ FAILED FETCHES:"
    log_divider "-"
    for item in "${FAILURE_LIST[@]}"; do
        echo "  - $item"
    done
fi

# Print skipped institutions
if [ $SKIPPED_COUNT -gt 0 ]; then
    echo ""
    log_info "⏭️ SKIPPED INSTITUTIONS:"
    log_divider "-"
    for item in "${SKIPPED_LIST[@]}"; do
        echo "  - $item"
    done
fi

echo ""
log_divider "="
log_info "Log file: $LOG_FILE"
log_success "Script completed!"
log_divider "="
echo ""

# Exit with error if there were failures
if [ $FAILURE_COUNT -gt 0 ]; then
    exit 1
fi

exit 0

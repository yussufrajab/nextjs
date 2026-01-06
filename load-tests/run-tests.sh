#!/bin/bash

# Load Testing Script
# This script makes it easy to run different types of load tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
BASE_URL="${BASE_URL:-http://localhost:9002}"
TEST_TYPE="${1:-stress}"
REPORT_DIR="load-tests/reports"

# Help message
show_help() {
    cat << EOF
Usage: ./load-tests/run-tests.sh [TEST_TYPE] [OPTIONS]

TEST_TYPES:
    stress          Run stress test (default) - finds breaking point
    auth            Run authentication tests
    hr-workflows    Run HR workflow tests
    file-ops        Run file operations tests
    smoke           Run quick smoke test
    all             Run all tests sequentially

OPTIONS:
    --url URL       Set base URL (default: http://localhost:9002)
    --help          Show this help message

EXAMPLES:
    # Run stress test against local server
    ./load-tests/run-tests.sh stress

    # Run auth tests against staging
    BASE_URL=https://staging.csms.gov.zz ./load-tests/run-tests.sh auth

    # Run all tests
    ./load-tests/run-tests.sh all

    # Quick smoke test
    ./load-tests/run-tests.sh smoke

ENVIRONMENT VARIABLES:
    BASE_URL        Base URL to test (default: http://localhost:9002)

EOF
}

# Check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}Error: k6 is not installed${NC}"
        echo "Please install k6 from https://k6.io/docs/get-started/installation/"
        echo ""
        echo "Quick install options:"
        echo "  macOS:   brew install k6"
        echo "  Linux:   See https://k6.io/docs/get-started/installation/"
        echo "  Windows: choco install k6"
        exit 1
    fi
}

# Create reports directory
mkdir -p "$REPORT_DIR"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            TEST_TYPE="$1"
            shift
            ;;
    esac
done

# Verify k6 is installed
check_k6

echo -e "${GREEN}=== CSMS Load Testing ===${NC}"
echo -e "Target URL: ${YELLOW}${BASE_URL}${NC}"
echo -e "Test Type:  ${YELLOW}${TEST_TYPE}${NC}"
echo ""

# Run tests based on type
run_stress_test() {
    echo -e "${GREEN}Running stress test...${NC}"
    k6 run \
        --out json="${REPORT_DIR}/stress-test-results.json" \
        --summary-export="${REPORT_DIR}/stress-test-summary.json" \
        load-tests/stress-test.js
}

run_auth_test() {
    echo -e "${GREEN}Running authentication tests...${NC}"
    k6 run \
        --out json="${REPORT_DIR}/auth-results.json" \
        load-tests/scenarios/auth.test.js
}

run_hr_workflows_test() {
    echo -e "${GREEN}Running HR workflows tests...${NC}"
    k6 run \
        --out json="${REPORT_DIR}/hr-workflows-results.json" \
        load-tests/scenarios/hr-workflows.test.js
}

run_file_ops_test() {
    echo -e "${GREEN}Running file operations tests...${NC}"
    k6 run \
        --out json="${REPORT_DIR}/file-operations-results.json" \
        load-tests/scenarios/file-operations.test.js
}

run_smoke_test() {
    echo -e "${GREEN}Running smoke test (quick validation)...${NC}"
    k6 run \
        --vus 1 \
        --duration 30s \
        --out json="${REPORT_DIR}/smoke-test-results.json" \
        load-tests/stress-test.js
}

# Execute selected test
case $TEST_TYPE in
    stress)
        run_stress_test
        ;;
    auth)
        run_auth_test
        ;;
    hr-workflows)
        run_hr_workflows_test
        ;;
    file-ops)
        run_file_ops_test
        ;;
    smoke)
        run_smoke_test
        ;;
    all)
        echo -e "${YELLOW}Running all tests sequentially...${NC}"
        run_smoke_test
        run_auth_test
        run_hr_workflows_test
        run_file_ops_test
        run_stress_test
        ;;
    *)
        echo -e "${RED}Error: Unknown test type '${TEST_TYPE}'${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
echo -e "Reports saved to: ${YELLOW}${REPORT_DIR}${NC}"
echo ""
echo "To view HTML report (if generated):"
echo "  open ${REPORT_DIR}/stress-test-*.html"
echo ""

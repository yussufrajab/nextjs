#!/bin/bash

# ============================================================================
# HRIMS Resumable Fetch Script - Shell Wrapper
# ============================================================================
# This script wraps the TypeScript resumable fetch script for easy execution.
# It will automatically resume from where it stopped if interrupted.
#
# Usage:
#   ./scripts/run-resumable-fetch.sh [OPTIONS]
#
# Options:
#   --status          Show current fetch progress
#   --reset           Reset state and start fresh
#   --force-restart   Ignore previous state and restart
#   --background      Run in background with nohup
#   --help            Show help message
#
# Examples:
#   ./scripts/run-resumable-fetch.sh                 # Start or resume
#   ./scripts/run-resumable-fetch.sh --status        # Check progress
#   ./scripts/run-resumable-fetch.sh --reset         # Reset and start fresh
#   ./scripts/run-resumable-fetch.sh --background    # Run in background
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
FETCH_SCRIPT="$SCRIPT_DIR/fetch-all-employees-resumable.ts"
LOG_DIR="$PROJECT_DIR/logs"
STATE_DIR="$SCRIPT_DIR/state"
STATE_FILE="$STATE_DIR/fetch-progress.json"

# Parse arguments
RUN_BACKGROUND=false
EXTRA_ARGS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --background|-b)
            RUN_BACKGROUND=true
            shift
            ;;
        --status)
            EXTRA_ARGS="$EXTRA_ARGS --status"
            shift
            ;;
        --reset)
            EXTRA_ARGS="$EXTRA_ARGS --reset"
            shift
            ;;
        --force-restart)
            EXTRA_ARGS="$EXTRA_ARGS --force-restart"
            shift
            ;;
        --help|-h)
            echo ""
            echo -e "${CYAN}HRIMS Resumable Fetch Script${NC}"
            echo "=============================================="
            echo ""
            echo "This script fetches employee data from HRIMS for all institutions."
            echo "It automatically resumes from where it stopped if interrupted."
            echo ""
            echo "Usage:"
            echo "  ./scripts/run-resumable-fetch.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --status           Show current fetch progress"
            echo "  --reset            Reset state file and start fresh"
            echo "  --force-restart    Ignore previous state and restart"
            echo "  --background, -b   Run in background with nohup"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./scripts/run-resumable-fetch.sh                 # Start or resume"
            echo "  ./scripts/run-resumable-fetch.sh --status        # Check progress"
            echo "  ./scripts/run-resumable-fetch.sh --reset         # Reset state"
            echo "  ./scripts/run-resumable-fetch.sh --background    # Run in background"
            echo ""
            echo "State file: $STATE_FILE"
            echo "Log directory: $LOG_DIR"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Change to project directory
cd "$PROJECT_DIR"

# Show header
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  HRIMS Resumable Fetch Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# Check if script exists
if [ ! -f "$FETCH_SCRIPT" ]; then
    echo -e "${RED}Error: Fetch script not found at $FETCH_SCRIPT${NC}"
    exit 1
fi

# Check if server is running
echo -e "${BLUE}Checking server status...${NC}"
if ! curl -s "http://localhost:9002/api/institutions" > /dev/null 2>&1; then
    echo -e "${RED}Error: Server is not running on http://localhost:9002${NC}"
    echo ""
    echo "Please start the server first:"
    echo "  npm run dev"
    echo ""
    exit 1
fi
echo -e "${GREEN}Server is running${NC}"
echo ""

# Show state file status
if [ -f "$STATE_FILE" ]; then
    echo -e "${YELLOW}Previous state found:${NC} $STATE_FILE"

    # Try to show progress from state file
    if command -v jq &> /dev/null; then
        PROGRESS=$(jq -r '.currentInstitutionIndex' "$STATE_FILE" 2>/dev/null || echo "?")
        TOTAL=$(jq -r '.totalInstitutions' "$STATE_FILE" 2>/dev/null || echo "?")
        IS_COMPLETE=$(jq -r '.isComplete' "$STATE_FILE" 2>/dev/null || echo "?")

        if [ "$IS_COMPLETE" = "true" ]; then
            echo -e "${GREEN}Previous run completed. Use --reset to start fresh.${NC}"
        else
            echo -e "Progress: ${PROGRESS}/${TOTAL} institutions"
        fi
    fi
    echo ""
else
    echo -e "${BLUE}No previous state found. Starting fresh.${NC}"
    echo ""
fi

# Create log directory
mkdir -p "$LOG_DIR"

# Run the script
if [ "$RUN_BACKGROUND" = true ]; then
    # Generate log file name
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    BG_LOG="$LOG_DIR/resumable-fetch-bg-$TIMESTAMP.log"

    echo -e "${BLUE}Starting in background...${NC}"
    echo "Log file: $BG_LOG"
    echo ""

    nohup npx tsx "$FETCH_SCRIPT" $EXTRA_ARGS > "$BG_LOG" 2>&1 &
    PID=$!

    echo -e "${GREEN}Started with PID: $PID${NC}"
    echo ""
    echo "To monitor progress:"
    echo "  tail -f $BG_LOG"
    echo ""
    echo "To check status:"
    echo "  ./scripts/run-resumable-fetch.sh --status"
    echo ""
    echo "To stop:"
    echo "  kill $PID"
    echo ""
else
    # Run in foreground
    echo -e "${BLUE}Starting fetch...${NC}"
    echo "Press Ctrl+C to safely interrupt (progress will be saved)"
    echo ""

    npx tsx "$FETCH_SCRIPT" $EXTRA_ARGS
fi

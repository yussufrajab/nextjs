#!/bin/bash

# Clear user sessions script for CSMS
# Usage: ./clear-sessions.sh [username|--all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
else
    echo "Error: .env file not found at $PROJECT_DIR/.env"
    exit 1
fi

# Extract database connection from DATABASE_URL
DB_URL="${DATABASE_URL%\?*}"
DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

run_query() {
    PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -t -c "$1" 2>/dev/null
}

show_usage() {
    echo "Usage: $0 [OPTIONS] [username]"
    echo ""
    echo "Options:"
    echo "  --all         Clear all sessions for all users"
    echo "  --list        List all active sessions"
    echo "  --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 skhamis       Clear sessions for user 'skhamis'"
    echo "  $0 --all         Clear all sessions"
    echo "  $0 --list        List all active sessions"
}

list_sessions() {
    echo "Active sessions:"
    echo "----------------"
    PGPASSWORD="$DB_PASSWORD" psql "$DB_URL" -c "
        SELECT
            u.username,
            s.\"deviceInfo\",
            s.\"ipAddress\",
            s.\"createdAt\"
        FROM \"Session\" s
        JOIN \"User\" u ON s.\"userId\" = u.id
        ORDER BY u.username, s.\"createdAt\" DESC;
    " 2>/dev/null
}

clear_user_sessions() {
    local username="$1"

    # Check if user exists
    user_exists=$(run_query "SELECT COUNT(*) FROM \"User\" WHERE username = '$username';")
    user_exists=$(echo "$user_exists" | tr -d ' ')

    if [ "$user_exists" -eq 0 ]; then
        echo "Error: User '$username' not found"
        exit 1
    fi

    # Count sessions
    session_count=$(run_query "SELECT COUNT(*) FROM \"Session\" s JOIN \"User\" u ON s.\"userId\" = u.id WHERE u.username = '$username';")
    session_count=$(echo "$session_count" | tr -d ' ')

    if [ "$session_count" -eq 0 ]; then
        echo "No active sessions found for user '$username'"
        exit 0
    fi

    echo "Found $session_count session(s) for user '$username'"

    # Delete sessions
    run_query "DELETE FROM \"Session\" WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE username = '$username');"

    echo "Successfully cleared $session_count session(s) for user '$username'"
}

clear_all_sessions() {
    # Count all sessions
    session_count=$(run_query "SELECT COUNT(*) FROM \"Session\";")
    session_count=$(echo "$session_count" | tr -d ' ')

    if [ "$session_count" -eq 0 ]; then
        echo "No active sessions found"
        exit 0
    fi

    echo "Found $session_count total session(s)"
    read -p "Are you sure you want to clear ALL sessions? (y/N): " confirm

    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted"
        exit 0
    fi

    # Delete all sessions
    run_query "DELETE FROM \"Session\";"

    echo "Successfully cleared $session_count session(s)"
}

# Main
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

case "$1" in
    --help|-h)
        show_usage
        ;;
    --list|-l)
        list_sessions
        ;;
    --all|-a)
        clear_all_sessions
        ;;
    *)
        clear_user_sessions "$1"
        ;;
esac

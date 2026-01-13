#!/bin/bash

################################################################################
# CSMS Database Restore Script (Sanitized Backup - No Employee Data)
#
# This script restores a sanitized database backup that contains:
#   ✓ Complete schema (all tables including Employee structure)
#   ✓ User data
#   ✓ Institution data
#   ✓ Audit logs, notifications, sessions
#
# But excludes:
#   ✗ Employee records
#   ✗ Employee-related HR requests
#
# Usage:
#   ./restore-database-no-employees.sh [options]
#
# Options:
#   -h HOST       Database host (default: localhost)
#   -p PORT       Database port (default: 5432)
#   -U USER       Database user (default: postgres)
#   -d DATABASE   Database name (default: nody)
#   -W PASSWORD   Database password (will prompt if not provided)
#   -f FILE       Backup file to restore (auto-detect if not specified)
#   --force       Skip confirmation prompts
#   --help        Show this help message
#
# Author: CSMS Development Team
# Created: January 2026
################################################################################

set -e
set -o pipefail

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nody}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="/home/latest/beky3a/database"
BACKUP_FILE=""
FORCE_MODE=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║    CSMS Database Restore (No Employee Data)                   ║${NC}"
    echo -e "${BLUE}║    Sanitized backup for development/testing                   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_info() {
    echo -e "${CYAN}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

show_help() {
    head -n 34 "$0" | tail -n 27
    exit 0
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) not found"
        exit 1
    fi

    print_success "PostgreSQL client tools found"

    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    print_success "Backup directory found"
}

detect_backup_file() {
    if [ -n "$BACKUP_FILE" ]; then
        if [ ! -f "$BACKUP_FILE" ]; then
            print_error "Specified backup file not found: $BACKUP_FILE"
            exit 1
        fi
        print_success "Using specified backup file: $(basename "$BACKUP_FILE")"
        return
    fi

    print_info "Detecting latest sanitized backup file..."

    cd "$BACKUP_DIR"

    # Find sanitized backup files
    local backups=($(ls -t ${DB_NAME}_no_employees_*.sql 2>/dev/null || true))

    if [ ${#backups[@]} -eq 0 ]; then
        print_error "No sanitized backup files found in $BACKUP_DIR"
        print_info "Expected pattern: ${DB_NAME}_no_employees_*.sql"
        exit 1
    fi

    # Show available backups
    echo ""
    echo -e "${YELLOW}Available sanitized backups:${NC}"
    echo ""

    local count=1
    declare -A backup_map

    for backup in "${backups[@]}"; do
        local size=$(du -h "$backup" 2>/dev/null | cut -f1)
        local date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d. -f1)
        printf "  ${GREEN}%2d${NC}) %-50s  %8s  %s\n" $count "$(basename "$backup")" "$size" "$date"
        backup_map[$count]="$backup"
        ((count++))
    done
    echo ""

    # Auto-select or prompt
    if [ "$FORCE_MODE" = true ]; then
        BACKUP_FILE="${BACKUP_DIR}/${backups[0]}"
        print_success "Auto-selected latest backup: $(basename "$BACKUP_FILE")"
    else
        echo -n "Select backup to restore (1-$((count-1))) or press Enter for latest: "
        read -r selection

        if [ -z "$selection" ]; then
            BACKUP_FILE="${BACKUP_DIR}/${backups[0]}"
        else
            if [ -n "${backup_map[$selection]}" ]; then
                BACKUP_FILE="${BACKUP_DIR}/${backup_map[$selection]}"
            else
                print_error "Invalid selection"
                exit 1
            fi
        fi

        print_success "Selected backup: $(basename "$BACKUP_FILE")"
    fi

    echo ""
}

test_connection() {
    print_info "Testing database connection..."

    export PGPASSWORD="$DB_PASSWORD"

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" > /dev/null 2>&1; then
        print_error "Cannot connect to PostgreSQL server"
        exit 1
    fi

    print_success "Database connection successful"
}

show_backup_info() {
    print_info "Backup file information..."

    local info_file="${BACKUP_FILE%.*}_info.txt"

    if [ -f "$info_file" ]; then
        echo ""
        cat "$info_file"
        echo ""
    else
        print_warning "No information file found for this backup"
        echo ""
        echo -e "${YELLOW}This backup contains:${NC}"
        echo "  ✓ Complete database schema"
        echo "  ✓ User data"
        echo "  ✓ Institution data"
        echo "  ✓ Audit logs, notifications"
        echo ""
        echo -e "${YELLOW}This backup excludes:${NC}"
        echo "  ✗ Employee records"
        echo "  ✗ HR requests"
        echo ""
    fi
}

confirm_restore() {
    if [ "$FORCE_MODE" = true ]; then
        return
    fi

    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                        WARNING!                                ║${NC}"
    echo -e "${RED}║  This will DROP the existing database and ALL its data!       ║${NC}"
    echo -e "${RED}║  This action cannot be undone!                                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Database:${NC} $DB_NAME"
    echo -e "${YELLOW}Backup:${NC}   $(basename "$BACKUP_FILE")"
    echo ""
    echo -n "Type 'yes' to confirm: "
    read -r response

    if [ "$response" != "yes" ]; then
        print_info "Restore cancelled by user"
        exit 0
    fi
    echo ""
}

drop_database() {
    print_info "Checking if database exists..."

    export PGPASSWORD="$DB_PASSWORD"

    local db_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

    if [ "$db_exists" = "1" ]; then
        print_info "Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" > /dev/null 2>&1
        print_success "Database dropped"
    else
        print_info "Database does not exist (will create new)"
    fi
}

create_database() {
    print_info "Creating fresh database..."

    export PGPASSWORD="$DB_PASSWORD"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE \"$DB_NAME\" WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';" \
        > /dev/null 2>&1

    print_success "Database created"
}

restore_database() {
    print_info "Restoring database from backup..."
    echo ""
    echo -e "${BLUE}This may take a few minutes...${NC}"
    echo ""

    export PGPASSWORD="$DB_PASSWORD"

    local start_time=$(date +%s)

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -f "$BACKUP_FILE" > /dev/null 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Database restored in ${duration}s"
    else
        print_error "Restore failed"
        exit 1
    fi

    echo ""
}

verify_restore() {
    print_info "Verifying database restoration..."
    echo ""

    export PGPASSWORD="$DB_PASSWORD"

    # Check key tables
    local tables=("User" "Institution" "Employee" "AuditLog" "Notification")

    echo -e "${YELLOW}Table Verification:${NC}"
    echo "┌─────────────────────────────┬──────────┬─────────────┐"
    echo "│ Table Name                  │ Records  │ Status      │"
    echo "├─────────────────────────────┼──────────┼─────────────┤"

    local all_ok=true

    for table in "${tables[@]}"; do
        local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "ERROR")

        if [ "$count" = "ERROR" ]; then
            printf "│ %-27s │ %-8s │ ${RED}%-11s${NC} │\n" "$table" "N/A" "ERROR"
            all_ok=false
        elif [ "$table" = "Employee" ] && [ "$count" != "0" ]; then
            printf "│ %-27s │ %-8s │ ${YELLOW}%-11s${NC} │\n" "$table" "$count" "WARNING"
            print_warning "Employee table should be empty in sanitized backup"
        elif [ "$table" = "Employee" ] && [ "$count" = "0" ]; then
            printf "│ %-27s │ %-8s │ ${GREEN}%-11s${NC} │\n" "$table" "$count" "OK (empty)"
        else
            printf "│ %-27s │ %-8s │ ${GREEN}%-11s${NC} │\n" "$table" "$count" "OK"
        fi
    done

    echo "└─────────────────────────────┴──────────┴─────────────┘"
    echo ""

    if [ "$all_ok" = true ]; then
        print_success "Verification passed"
    else
        print_warning "Some tables could not be verified"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      Database Restore Completed Successfully!                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Restore Summary:${NC}"
    echo -e "  Database:     ${CYAN}$DB_NAME${NC}"
    echo -e "  Server:       ${CYAN}$DB_HOST:$DB_PORT${NC}"
    echo -e "  Backup File:  ${CYAN}$(basename "$BACKUP_FILE")${NC}"
    echo ""
    echo -e "${YELLOW}What was restored:${NC}"
    echo -e "  ${GREEN}✓${NC} Complete database schema (all tables)"
    echo -e "  ${GREEN}✓${NC} User accounts and permissions"
    echo -e "  ${GREEN}✓${NC} Institution data"
    echo -e "  ${GREEN}✓${NC} Audit logs and notifications"
    echo ""
    echo -e "${YELLOW}What was NOT restored:${NC}"
    echo -e "  ${RED}✗${NC} Employee records (sanitized backup)"
    echo -e "  ${RED}✗${NC} HR requests (depend on employees)"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo -e "${CYAN}1. Update .env file${NC}"
    echo "   cd /home/latest"
    echo "   nano .env"
    echo "   # Verify DATABASE_URL is correct"
    echo ""
    echo -e "${CYAN}2. Generate Prisma Client${NC}"
    echo "   npx prisma generate"
    echo ""
    echo -e "${CYAN}3. (Optional) Add test employees${NC}"
    echo "   # You can manually add test employee records through the application"
    echo "   # Or import sample data for testing"
    echo ""
    echo -e "${CYAN}4. Start the application${NC}"
    echo "   npm run dev    # Development"
    echo "   npm start      # Production"
    echo ""
    echo -e "${YELLOW}Database is ready for use!${NC}"
    echo ""
}

################################################################################
# Main Script
################################################################################

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h)
            DB_HOST="$2"
            shift 2
            ;;
        -p)
            DB_PORT="$2"
            shift 2
            ;;
        -U)
            DB_USER="$2"
            shift 2
            ;;
        -d)
            DB_NAME="$2"
            shift 2
            ;;
        -W)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -f)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --force)
            FORCE_MODE=true
            shift
            ;;
        --help)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print header
print_header

# Show configuration
echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Host:         $DB_HOST"
echo -e "  Port:         $DB_PORT"
echo -e "  User:         $DB_USER"
echo -e "  Database:     $DB_NAME"
echo -e "  Backup Dir:   $BACKUP_DIR"
echo ""

# Prompt for password if not provided
if [ -z "$DB_PASSWORD" ]; then
    echo -n "Enter PostgreSQL password: "
    read -s DB_PASSWORD
    echo ""
    echo ""
fi

# Execute restore steps
check_prerequisites
detect_backup_file
test_connection
show_backup_info
confirm_restore
drop_database
create_database

echo ""
restore_database
verify_restore

# Print summary
print_summary

# Clean up password from environment
unset PGPASSWORD

exit 0

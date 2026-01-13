#!/bin/bash

################################################################################
# CSMS Database Restore Script
#
# This script restores PostgreSQL database backups created by backup-database.sh
# for the Civil Service Management System (CSMS)
#
# Features:
#   - Automatic backup file detection
#   - Database creation and cleanup
#   - Comprehensive verification
#   - Support for both custom and SQL format backups
#   - Reads from /home/latest/beky1a
#
# Prerequisites:
#   - PostgreSQL installed and running
#   - Database credentials with superuser privileges
#   - Backup files in /home/latest/beky1a
#   - Ubuntu 24.04 LTS
#
# Usage:
#   ./restore-database.sh [options]
#
# Options:
#   -h HOST       Database host (default: localhost)
#   -p PORT       Database port (default: 5432)
#   -U USER       Database user (default: postgres)
#   -d DATABASE   Database name (default: nody)
#   -W PASSWORD   Database password (will prompt if not provided)
#   -f FORMAT     Backup format: 'custom' or 'sql' (default: auto-detect latest)
#   -b BACKUP     Specific backup file to restore
#   --force       Skip confirmation prompts (use with caution)
#   --no-verify   Skip post-restore verification
#   --help        Show this help message
#
# Author: CSMS Development Team
# Created: January 2026
################################################################################

set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# Default values
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-nody}"
DB_PASSWORD="${DB_PASSWORD:-}"
BACKUP_DIR="/home/latest/beky1a"
BACKUP_FORMAT="auto"
BACKUP_FILE=""
FORCE_MODE=false
VERIFY_RESTORE=true

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         CSMS Database Restore Script (Ubuntu 24.04)           ║${NC}"
    echo -e "${BLUE}║         PostgreSQL with Prisma ORM                            ║${NC}"
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
    head -n 37 "$0" | tail -n 30
    exit 0
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if PostgreSQL client tools are installed
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) not found. Please install postgresql-client."
        exit 1
    fi

    if ! command -v pg_restore &> /dev/null; then
        print_error "pg_restore not found. Please install postgresql-client."
        exit 1
    fi

    print_success "PostgreSQL client tools found"

    # Check if backup directory exists
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi

    print_success "Backup directory found: $BACKUP_DIR"
}

detect_backup_file() {
    if [ -n "$BACKUP_FILE" ]; then
        # User specified a backup file
        if [ ! -f "$BACKUP_FILE" ]; then
            print_error "Specified backup file not found: $BACKUP_FILE"
            exit 1
        fi
        print_success "Using specified backup file: $(basename "$BACKUP_FILE")"
        return
    fi

    print_info "Detecting latest backup file..."

    cd "$BACKUP_DIR"

    # List available backups
    local custom_backups=($(ls -t ${DB_NAME}_backup_*.backup 2>/dev/null || true))
    local sql_backups=($(ls -t ${DB_NAME}_backup_*.sql 2>/dev/null || true))

    if [ ${#custom_backups[@]} -eq 0 ] && [ ${#sql_backups[@]} -eq 0 ]; then
        print_error "No backup files found in $BACKUP_DIR"
        print_info "Expected files: ${DB_NAME}_backup_*.backup or ${DB_NAME}_backup_*.sql"
        exit 1
    fi

    # Show available backups
    echo ""
    echo -e "${YELLOW}Available backups:${NC}"
    echo ""

    local count=1
    declare -A backup_map

    # List custom format backups
    if [ ${#custom_backups[@]} -gt 0 ]; then
        echo -e "${CYAN}Custom Format (.backup):${NC}"
        for backup in "${custom_backups[@]}"; do
            local size=$(du -h "$backup" 2>/dev/null | cut -f1)
            local date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d. -f1)
            printf "  ${GREEN}%2d${NC}) %-40s  %8s  %s\n" $count "$(basename "$backup")" "$size" "$date"
            backup_map[$count]="$backup"
            ((count++))
        done
        echo ""
    fi

    # List SQL format backups
    if [ ${#sql_backups[@]} -gt 0 ]; then
        echo -e "${CYAN}SQL Format (.sql):${NC}"
        for backup in "${sql_backups[@]}"; do
            local size=$(du -h "$backup" 2>/dev/null | cut -f1)
            local date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1,2 | cut -d. -f1)
            printf "  ${GREEN}%2d${NC}) %-40s  %8s  %s\n" $count "$(basename "$backup")" "$size" "$date"
            backup_map[$count]="$backup"
            ((count++))
        done
        echo ""
    fi

    # Auto-select or prompt for selection
    if [ "$BACKUP_FORMAT" = "auto" ] || [ "$FORCE_MODE" = true ]; then
        # Auto-select the latest custom format backup, or latest SQL if no custom
        if [ ${#custom_backups[@]} -gt 0 ]; then
            BACKUP_FILE="${BACKUP_DIR}/${custom_backups[0]}"
            BACKUP_FORMAT="custom"
            print_success "Auto-selected latest custom format backup: $(basename "$BACKUP_FILE")"
        else
            BACKUP_FILE="${BACKUP_DIR}/${sql_backups[0]}"
            BACKUP_FORMAT="sql"
            print_success "Auto-selected latest SQL format backup: $(basename "$BACKUP_FILE")"
        fi
    else
        # Prompt user to select
        echo -n "Select backup to restore (1-$((count-1))) or press Enter for latest: "
        read -r selection

        if [ -z "$selection" ]; then
            # Default to latest custom or SQL
            if [ ${#custom_backups[@]} -gt 0 ]; then
                BACKUP_FILE="${BACKUP_DIR}/${custom_backups[0]}"
                BACKUP_FORMAT="custom"
            else
                BACKUP_FILE="${BACKUP_DIR}/${sql_backups[0]}"
                BACKUP_FORMAT="sql"
            fi
        else
            if [ -n "${backup_map[$selection]}" ]; then
                BACKUP_FILE="${BACKUP_DIR}/${backup_map[$selection]}"
                if [[ "$BACKUP_FILE" == *.backup ]]; then
                    BACKUP_FORMAT="custom"
                else
                    BACKUP_FORMAT="sql"
                fi
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
        print_error "Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER"
        print_info "Make sure PostgreSQL is running: sudo systemctl status postgresql"
        exit 1
    fi

    print_success "Database connection successful"
}

check_database_exists() {
    print_info "Checking if database '$DB_NAME' exists..."

    export PGPASSWORD="$DB_PASSWORD"

    local db_exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

    if [ "$db_exists" = "1" ]; then
        print_warning "Database '$DB_NAME' already exists"

        if [ "$FORCE_MODE" = false ]; then
            echo ""
            echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
            echo -e "${RED}║                        WARNING!                                ║${NC}"
            echo -e "${RED}║  This will DROP the existing database and ALL its data!       ║${NC}"
            echo -e "${RED}║  This action cannot be undone!                                ║${NC}"
            echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
            echo ""
            echo -n "Type 'yes' to confirm dropping the database: "
            read -r response

            if [ "$response" != "yes" ]; then
                print_info "Restore cancelled by user"
                exit 0
            fi
        fi

        print_info "Dropping existing database..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
            -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" > /dev/null 2>&1
        print_success "Database dropped"
    fi
}

create_database() {
    print_info "Creating database '$DB_NAME'..."

    export PGPASSWORD="$DB_PASSWORD"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "CREATE DATABASE \"$DB_NAME\" WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';" \
        > /dev/null 2>&1

    print_success "Database created successfully"
}

restore_database() {
    print_info "Restoring database from backup..."
    echo ""
    echo -e "${BLUE}This may take several minutes depending on database size...${NC}"
    echo ""

    export PGPASSWORD="$DB_PASSWORD"

    local start_time=$(date +%s)

    if [ "$BACKUP_FORMAT" = "custom" ]; then
        # Restore from custom format backup
        print_info "Using pg_restore for custom format backup..."
        if pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --verbose "$BACKUP_FILE" 2>&1 | grep -E "(processing|creating|finished)" | while read line; do
            echo -e "${CYAN}  → ${NC}${line}"
        done; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            print_success "Database restored in ${duration}s"
        else
            print_error "Restore failed"
            exit 1
        fi
    else
        # Restore from SQL file
        print_info "Using psql for SQL format backup..."
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -f "$BACKUP_FILE" 2>&1 | grep -vE "^$|^SET|^--" | while read line; do
            echo -e "${CYAN}  → ${NC}${line}"
        done; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            print_success "Database restored in ${duration}s"
        else
            print_error "Restore failed"
            exit 1
        fi
    fi

    echo ""
}

verify_restore() {
    if [ "$VERIFY_RESTORE" = false ]; then
        print_warning "Restore verification skipped (--no-verify flag used)"
        return
    fi

    print_info "Verifying database restoration..."
    echo ""

    export PGPASSWORD="$DB_PASSWORD"

    # List of tables to verify
    local tables=("User" "Employee" "Institution" "PromotionRequest" "ConfirmationRequest"
                 "LwopRequest" "CadreChangeRequest" "RetirementRequest" "Notification" "AuditLog")

    echo -e "${YELLOW}Table Record Counts:${NC}"
    echo "┌─────────────────────────────┬──────────┐"
    echo "│ Table Name                  │ Records  │"
    echo "├─────────────────────────────┼──────────┤"

    local total_records=0

    for table in "${tables[@]}"; do
        local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "0")

        printf "│ %-27s │ %8s │\n" "$table" "$count"

        total_records=$((total_records + count))
    done

    echo "└─────────────────────────────┴──────────┘"
    echo ""

    if [ $total_records -gt 0 ]; then
        print_success "Verification passed: $total_records total records restored"
    else
        print_warning "No records found - database may be empty or verification failed"
    fi

    # Check database size
    local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))")

    print_success "Database size: $db_size"
}

show_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Database Restore Completed Successfully!              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Restore Summary:${NC}"
    echo -e "  Database:     ${CYAN}$DB_NAME${NC}"
    echo -e "  Server:       ${CYAN}$DB_HOST:$DB_PORT${NC}"
    echo -e "  Backup File:  ${CYAN}$(basename "$BACKUP_FILE")${NC}"
    echo -e "  Format:       ${CYAN}$BACKUP_FORMAT${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo -e "${CYAN}1. Update Environment Variables${NC}"
    echo "   Edit your .env file with the database credentials:"
    echo ""
    echo "   DATABASE_URL=\"postgresql://$DB_USER:YOUR_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public\""
    echo ""
    echo -e "${CYAN}2. Generate Prisma Client${NC}"
    echo "   cd /path/to/your/app"
    echo "   npx prisma generate"
    echo ""
    echo -e "${CYAN}3. Verify Prisma Connection${NC}"
    echo "   npx prisma db pull"
    echo "   npx prisma studio  # Opens database browser at http://localhost:5555"
    echo ""
    echo -e "${CYAN}4. Start Your Application${NC}"
    echo "   npm run dev        # Development mode"
    echo "   npm run build      # Production build"
    echo "   npm start          # Production server"
    echo ""
    echo -e "${YELLOW}Verification Commands:${NC}"
    echo ""
    echo "   # Check employee count"
    echo "   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \"SELECT COUNT(*) FROM \\\"Employee\\\";\""
    echo ""
    echo "   # Check all tables"
    echo "   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \"\\dt\""
    echo ""
    echo -e "${CYAN}Database is ready for use!${NC}"
    echo ""
}

generate_restore_report() {
    print_info "Generating restore report..."

    local report_file="${BACKUP_DIR}/restore_report_$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "================================================================================";
        echo "CSMS DATABASE RESTORE REPORT";
        echo "================================================================================";
        echo "";
        echo "Restore Date: $(date)";
        echo "Database: $DB_NAME";
        echo "Server: $DB_HOST:$DB_PORT";
        echo "User: $DB_USER";
        echo "";
        echo "Backup File: $(basename "$BACKUP_FILE")";
        echo "Backup Format: $BACKUP_FORMAT";
        echo "Backup Location: $BACKUP_DIR";
        echo "";
        echo "================================================================================";
        echo "RESTORE STATUS: SUCCESS ✓";
        echo "================================================================================";
        echo "";
    } > "$report_file"

    print_success "Restore report saved: $(basename "$report_file")"
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
            BACKUP_FORMAT="$2"
            shift 2
            ;;
        -b)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --force)
            FORCE_MODE=true
            shift
            ;;
        --no-verify)
            VERIFY_RESTORE=false
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
check_database_exists
create_database

echo ""
restore_database
verify_restore

echo ""
generate_restore_report
show_next_steps

# Clean up password from environment
unset PGPASSWORD

exit 0

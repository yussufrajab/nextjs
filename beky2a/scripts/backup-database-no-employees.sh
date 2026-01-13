#!/bin/bash

################################################################################
# CSMS Database Backup Script (Without Employee Data)
#
# This script creates a sanitized backup of the PostgreSQL database
# that includes ALL data EXCEPT employee records
#
# What's Included:
#   ✓ Complete database schema (all tables including Employee structure)
#   ✓ User data (login credentials and permissions)
#   ✓ Institution data
#   ✓ All HR request types (empty, since they reference employees)
#   ✓ Audit logs
#   ✓ Notifications
#   ✓ All other tables
#
# What's Excluded:
#   ✗ Employee table data (records removed)
#   ✗ EmployeeCertificate data (references employees)
#   ✗ HR request data (references employees)
#
# Usage:
#   ./backup-database-no-employees.sh [options]
#
# Options:
#   -h HOST       Database host (default: localhost)
#   -p PORT       Database port (default: 5432)
#   -U USER       Database user (default: postgres)
#   -d DATABASE   Database name (default: nody)
#   -W PASSWORD   Database password (will prompt if not provided)
#   -o OUTPUT     Output directory (default: /home/latest/beky2a/database)
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
OUTPUT_DIR="${OUTPUT_DIR:-/home/latest/beky2a/database}"

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="${DB_NAME}_no_employees_${TIMESTAMP}"

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
    echo -e "${BLUE}║    CSMS Database Backup (Without Employee Data)               ║${NC}"
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
    head -n 36 "$0" | tail -n 29
    exit 0
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) not found"
        exit 1
    fi

    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump not found"
        exit 1
    fi

    print_success "PostgreSQL client tools found"

    if [ ! -d "$OUTPUT_DIR" ]; then
        print_info "Creating output directory: $OUTPUT_DIR"
        mkdir -p "$OUTPUT_DIR"
    fi

    print_success "Output directory ready: $OUTPUT_DIR"
}

test_connection() {
    print_info "Testing database connection..."

    export PGPASSWORD="$DB_PASSWORD"

    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        print_error "Cannot connect to PostgreSQL server"
        exit 1
    fi

    print_success "Database connection successful"
}

get_database_stats() {
    print_info "Gathering database statistics..."

    export PGPASSWORD="$DB_PASSWORD"

    # Get counts
    EMPLOYEE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM \"Employee\"" 2>/dev/null || echo "0")

    USER_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM \"User\"" 2>/dev/null || echo "0")

    INSTITUTION_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT COUNT(*) FROM \"Institution\"" 2>/dev/null || echo "0")

    print_success "Database statistics gathered"
}

create_schema_backup() {
    print_info "Creating complete schema backup (all table structures)..."

    export PGPASSWORD="$DB_PASSWORD"

    local schema_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_schema.sql"

    # Backup only schema (no data)
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --schema-only \
        -f "$schema_file" 2>&1 | grep -v "^$" || true

    if [ -f "$schema_file" ]; then
        local file_size=$(du -h "$schema_file" | cut -f1)
        print_success "Schema backup created: $(basename "$schema_file") ($file_size)"
    else
        print_error "Failed to create schema backup"
        exit 1
    fi
}

create_data_backup() {
    print_info "Creating data backup (excluding employee records)..."

    export PGPASSWORD="$DB_PASSWORD"

    local data_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_data.sql"

    # Tables to exclude (Employee and related tables)
    local EXCLUDE_TABLES=(
        "Employee"
        "EmployeeCertificate"
        "PromotionRequest"
        "ConfirmationRequest"
        "LwopRequest"
        "CadreChangeRequest"
        "RetirementRequest"
        "ResignationRequest"
        "ServiceExtensionRequest"
        "TerminationRequest"
        "SeparationRequest"
        "Complaint"
    )

    # Build exclude options
    local EXCLUDE_OPTS=""
    for table in "${EXCLUDE_TABLES[@]}"; do
        EXCLUDE_OPTS="$EXCLUDE_OPTS --exclude-table-data=public.\"$table\""
    done

    # Backup data (excluding specified tables)
    eval "pg_dump -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' \
        --data-only \
        $EXCLUDE_OPTS \
        -f '$data_file'" 2>&1 | grep -v "^$" || true

    if [ -f "$data_file" ]; then
        local file_size=$(du -h "$data_file" | cut -f1)
        print_success "Data backup created: $(basename "$data_file") ($file_size)"
    else
        print_error "Failed to create data backup"
        exit 1
    fi
}

create_combined_backup() {
    print_info "Creating combined backup file..."

    local combined_file="${OUTPUT_DIR}/${BACKUP_PREFIX}.sql"
    local schema_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_schema.sql"
    local data_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_data.sql"

    {
        echo "-- ============================================================================="
        echo "-- CSMS Database Backup (Without Employee Data)"
        echo "-- Created: $(date)"
        echo "-- Database: $DB_NAME"
        echo "-- ============================================================================="
        echo "-- "
        echo "-- This backup includes:"
        echo "--   ✓ Complete database schema (all tables)"
        echo "--   ✓ User data ($USER_COUNT users)"
        echo "--   ✓ Institution data ($INSTITUTION_COUNT institutions)"
        echo "--   ✓ Audit logs, notifications, sessions"
        echo "-- "
        echo "-- This backup EXCLUDES:"
        echo "--   ✗ Employee records ($EMPLOYEE_COUNT employees excluded)"
        echo "--   ✗ Employee certificates"
        echo "--   ✗ HR requests (promotions, confirmations, etc.)"
        echo "--   ✗ Complaints"
        echo "-- "
        echo "-- Purpose: Development/testing environment without sensitive employee data"
        echo "-- ============================================================================="
        echo ""
        cat "$schema_file"
        echo ""
        echo "-- ============================================================================="
        echo "-- DATA SECTION (Excluding employee-related records)"
        echo "-- ============================================================================="
        echo ""
        cat "$data_file"
    } > "$combined_file"

    if [ -f "$combined_file" ]; then
        local file_size=$(du -h "$combined_file" | cut -f1)
        print_success "Combined backup created: $(basename "$combined_file") ($file_size)"

        # Remove temporary files
        rm -f "$schema_file" "$data_file"
        print_success "Temporary files cleaned up"
    else
        print_error "Failed to create combined backup"
        exit 1
    fi
}

generate_info_file() {
    print_info "Generating backup information file..."

    local info_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_info.txt"

    {
        echo "================================================================================"
        echo "CSMS DATABASE BACKUP (WITHOUT EMPLOYEE DATA)"
        echo "================================================================================"
        echo ""
        echo "Backup Date:     $(date)"
        echo "Database:        $DB_NAME"
        echo "Server:          $DB_HOST:$DB_PORT"
        echo "Backup Type:     Sanitized (No Employee Data)"
        echo ""
        echo "================================================================================"
        echo "WHAT'S INCLUDED"
        echo "================================================================================"
        echo ""
        echo "✓ Complete database schema (all table structures)"
        echo "✓ User data ($USER_COUNT users)"
        echo "✓ Institution data ($INSTITUTION_COUNT institutions)"
        echo "✓ Audit logs"
        echo "✓ Notifications"
        echo "✓ Sessions"
        echo ""
        echo "================================================================================"
        echo "WHAT'S EXCLUDED"
        echo "================================================================================"
        echo ""
        echo "✗ Employee records ($EMPLOYEE_COUNT employees excluded)"
        echo "✗ Employee certificates"
        echo "✗ HR requests (promotions, confirmations, LWOP, etc.)"
        echo "✗ Cadre change requests"
        echo "✗ Retirement requests"
        echo "✗ Resignation requests"
        echo "✗ Service extension requests"
        echo "✗ Termination requests"
        echo "✗ Separation requests"
        echo "✗ Complaints"
        echo ""
        echo "================================================================================"
        echo "PURPOSE"
        echo "================================================================================"
        echo ""
        echo "This sanitized backup is intended for:"
        echo "  - Development environments"
        echo "  - Testing environments"
        echo "  - Training environments"
        echo "  - Situations where employee PII should not be present"
        echo ""
        echo "================================================================================"
        echo "RESTORE INSTRUCTIONS"
        echo "================================================================================"
        echo ""
        echo "Using the restore script (Recommended):"
        echo "  cd /home/latest/beky2a/scripts"
        echo "  ./restore-database-no-employees.sh"
        echo ""
        echo "Manual restore:"
        echo "  # Drop existing database (if needed)"
        echo "  psql -U postgres -c \"DROP DATABASE IF EXISTS $DB_NAME;\""
        echo ""
        echo "  # Create fresh database"
        echo "  psql -U postgres -c \"CREATE DATABASE $DB_NAME;\""
        echo ""
        echo "  # Restore backup"
        echo "  psql -U postgres -d $DB_NAME -f ${BACKUP_PREFIX}.sql"
        echo ""
        echo "================================================================================"
        echo "BACKUP FILES"
        echo "================================================================================"
        echo ""
        echo "Main backup file:"
        echo "  ${BACKUP_PREFIX}.sql"
        echo ""
        echo "Information file:"
        echo "  ${BACKUP_PREFIX}_info.txt"
        echo ""
        echo "================================================================================"
        echo "SECURITY NOTE"
        echo "================================================================================"
        echo ""
        echo "This backup still contains sensitive data including:"
        echo "  - User credentials (hashed passwords)"
        echo "  - Audit logs (may contain PII)"
        echo "  - Institution information"
        echo ""
        echo "Handle with appropriate security measures."
        echo ""
        echo "================================================================================"
    } > "$info_file"

    print_success "Information file created: $(basename "$info_file")"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      Sanitized Database Backup Completed Successfully!        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Summary:${NC}"
    echo -e "  Database:     ${CYAN}$DB_NAME${NC}"
    echo -e "  Location:     ${CYAN}$OUTPUT_DIR${NC}"
    echo -e "  Timestamp:    ${CYAN}$TIMESTAMP${NC}"
    echo ""
    echo -e "${YELLOW}Included Data:${NC}"
    echo -e "  ${GREEN}✓${NC} Users: $USER_COUNT"
    echo -e "  ${GREEN}✓${NC} Institutions: $INSTITUTION_COUNT"
    echo -e "  ${GREEN}✓${NC} Complete schema (all tables)"
    echo ""
    echo -e "${YELLOW}Excluded Data:${NC}"
    echo -e "  ${RED}✗${NC} Employees: $EMPLOYEE_COUNT (excluded)"
    echo -e "  ${RED}✗${NC} Employee-related requests (excluded)"
    echo ""
    echo -e "${YELLOW}Files Created:${NC}"
    echo -e "  ${GREEN}✓${NC} ${BACKUP_PREFIX}.sql"
    echo -e "  ${GREEN}✓${NC} ${BACKUP_PREFIX}_info.txt"
    echo ""
    echo -e "${YELLOW}To restore this backup:${NC}"
    echo "  cd $OUTPUT_DIR"
    echo "  psql -U postgres -d $DB_NAME -f ${BACKUP_PREFIX}.sql"
    echo ""
    echo -e "${CYAN}Or use the restore script:${NC}"
    echo "  cd /home/latest/beky2a/scripts"
    echo "  ./restore-database-no-employees.sh"
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
        -o)
            OUTPUT_DIR="$2"
            shift 2
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
echo -e "  Output Dir:   $OUTPUT_DIR"
echo -e "  Timestamp:    $TIMESTAMP"
echo ""

# Prompt for password if not provided
if [ -z "$DB_PASSWORD" ]; then
    echo -n "Enter PostgreSQL password: "
    read -s DB_PASSWORD
    echo ""
    echo ""
fi

# Execute backup steps
check_prerequisites
test_connection
get_database_stats

echo ""
echo -e "${YELLOW}Creating sanitized backup (excluding employee data)...${NC}"
echo ""

create_schema_backup
create_data_backup
create_combined_backup
generate_info_file

# Print summary
print_summary

# Clean up password from environment
unset PGPASSWORD

exit 0

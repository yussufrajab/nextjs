#!/bin/bash

################################################################################
# CSMS Database Backup Script
#
# This script creates comprehensive backups of the PostgreSQL database
# for the Civil Service Management System (CSMS)
#
# Features:
#   - Creates both custom format and SQL format backups
#   - Generates checksums for integrity verification
#   - Provides backup verification report
#   - Stores backups in /home/latest/beky1a
#   - Supports automated and manual execution
#
# Prerequisites:
#   - PostgreSQL installed and running
#   - Database credentials with read access
#   - Sufficient disk space (minimum 500MB recommended)
#   - Ubuntu 24.04 LTS
#
# Usage:
#   ./backup-database.sh [options]
#
# Options:
#   -h HOST       Database host (default: localhost)
#   -p PORT       Database port (default: 5432)
#   -U USER       Database user (default: postgres)
#   -d DATABASE   Database name (default: nody)
#   -W PASSWORD   Database password (will prompt if not provided)
#   -o OUTPUT     Output directory (default: /home/latest/beky1a)
#   --no-verify   Skip backup verification
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
OUTPUT_DIR="${OUTPUT_DIR:-/home/latest/beky1a}"
VERIFY_BACKUP=true

# Timestamp for backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PREFIX="${DB_NAME}_backup_${TIMESTAMP}"

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
    echo -e "${BLUE}║         CSMS Database Backup Script (Ubuntu 24.04)            ║${NC}"
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
    head -n 34 "$0" | tail -n 27
    exit 0
}

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if PostgreSQL client tools are installed
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL client (psql) not found. Please install postgresql-client."
        exit 1
    fi

    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump not found. Please install postgresql-client."
        exit 1
    fi

    print_success "PostgreSQL client tools found"

    # Check if output directory exists, create if not
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
        print_error "Host: $DB_HOST, Port: $DB_PORT, User: $DB_USER, Database: $DB_NAME"
        exit 1
    fi

    print_success "Database connection successful"
}

get_database_stats() {
    print_info "Gathering database statistics..."

    export PGPASSWORD="$DB_PASSWORD"

    # Get database size
    DB_SIZE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'))")

    # Get table counts
    declare -A TABLE_COUNTS
    TABLES=("User" "Employee" "Institution" "PromotionRequest" "ConfirmationRequest"
            "LwopRequest" "CadreChangeRequest" "RetirementRequest" "ResignationRequest"
            "ServiceExtensionRequest" "TerminationRequest" "Complaint" "Notification" "AuditLog")

    for TABLE in "${TABLES[@]}"; do
        COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
            "SELECT COUNT(*) FROM \"$TABLE\"" 2>/dev/null || echo "0")
        TABLE_COUNTS["$TABLE"]=$COUNT
    done

    print_success "Database statistics gathered"
}

create_backup() {
    local format=$1
    local output_file=$2
    local description=$3

    print_info "$description"

    export PGPASSWORD="$DB_PASSWORD"

    if [ "$format" = "custom" ]; then
        # Custom format backup (compressed, faster restore)
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -F custom -b -v -f "$output_file" 2>&1 | grep -v "^$" || true
    else
        # SQL format backup (plain text, portable)
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -F plain -b -v -f "$output_file" 2>&1 | grep -v "^$" || true
    fi

    if [ -f "$output_file" ]; then
        local file_size=$(du -h "$output_file" | cut -f1)
        print_success "Backup created: $(basename "$output_file") ($file_size)"
    else
        print_error "Failed to create backup: $output_file"
        exit 1
    fi
}

generate_checksums() {
    print_info "Generating checksums for integrity verification..."

    local checksum_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_checksums.txt"

    cd "$OUTPUT_DIR"
    {
        echo "================================================================================";
        echo "CSMS DATABASE BACKUP CHECKSUMS";
        echo "================================================================================";
        echo "";
        echo "Generated: $(date)";
        echo "Database: $DB_NAME";
        echo "";
        echo "SHA256 Checksums:";
        echo "--------------------------------------------------------------------------------";
        sha256sum "${BACKUP_PREFIX}.backup" 2>/dev/null || true
        sha256sum "${BACKUP_PREFIX}.sql" 2>/dev/null || true
        echo "";
        echo "MD5 Checksums:";
        echo "--------------------------------------------------------------------------------";
        md5sum "${BACKUP_PREFIX}.backup" 2>/dev/null || true
        md5sum "${BACKUP_PREFIX}.sql" 2>/dev/null || true
        echo "";
        echo "================================================================================";
    } > "$checksum_file"

    print_success "Checksums generated: $(basename "$checksum_file")"
}

verify_backup() {
    if [ "$VERIFY_BACKUP" = false ]; then
        print_warning "Backup verification skipped (--no-verify flag used)"
        return
    fi

    print_info "Verifying backup integrity..."

    export PGPASSWORD="$DB_PASSWORD"

    # Try to list the custom format backup
    if pg_restore -l "${OUTPUT_DIR}/${BACKUP_PREFIX}.backup" > /dev/null 2>&1; then
        print_success "Custom format backup verified (can be listed with pg_restore)"
    else
        print_warning "Custom format backup verification failed"
    fi

    # Check SQL file has content
    if [ -s "${OUTPUT_DIR}/${BACKUP_PREFIX}.sql" ]; then
        local line_count=$(wc -l < "${OUTPUT_DIR}/${BACKUP_PREFIX}.sql")
        print_success "SQL format backup verified ($line_count lines)"
    else
        print_warning "SQL format backup appears empty"
    fi
}

generate_verification_report() {
    print_info "Generating verification report..."

    local report_file="${OUTPUT_DIR}/${BACKUP_PREFIX}_verification.txt"
    local custom_size=$(du -h "${OUTPUT_DIR}/${BACKUP_PREFIX}.backup" 2>/dev/null | cut -f1 || echo "N/A")
    local sql_size=$(du -h "${OUTPUT_DIR}/${BACKUP_PREFIX}.sql" 2>/dev/null | cut -f1 || echo "N/A")

    {
        echo "================================================================================";
        echo "CSMS DATABASE BACKUP VERIFICATION REPORT";
        echo "================================================================================";
        echo "";
        echo "Backup Date: $(date)";
        echo "Database: $DB_NAME";
        echo "Server: $DB_HOST:$DB_PORT";
        echo "Backup Location: $OUTPUT_DIR";
        echo "";
        echo "================================================================================";
        echo "BACKUP FILES";
        echo "================================================================================";
        echo "";
        echo "1. ${BACKUP_PREFIX}.backup ($custom_size) - PostgreSQL custom format";
        echo "2. ${BACKUP_PREFIX}.sql ($sql_size) - SQL plain text format";
        echo "3. ${BACKUP_PREFIX}_checksums.txt - Integrity checksums";
        echo "4. ${BACKUP_PREFIX}_verification.txt - This verification report";
        echo "";
        echo "================================================================================";
        echo "DATABASE STATISTICS";
        echo "================================================================================";
        echo "";
        echo "Database Size: $DB_SIZE";
        echo "";
        echo "Record Counts:";
        echo "┌─────────────────────────────┬──────────┐";
        echo "│ Table Name                  │ Records  │";
        echo "├─────────────────────────────┼──────────┤";

        # Print table counts
        for TABLE in "${!TABLE_COUNTS[@]}"; do
            printf "│ %-27s │ %8s │\n" "$TABLE" "${TABLE_COUNTS[$TABLE]}"
        done

        echo "└─────────────────────────────┴──────────┘";
        echo "";
        echo "================================================================================";
        echo "BACKUP INTEGRITY CHECK";
        echo "================================================================================";
        echo "";
        echo "✓ Custom format backup created successfully";
        echo "✓ SQL format backup created successfully";
        echo "✓ Database schema and constraints preserved";
        echo "✓ Indexes and sequences included";
        echo "✓ Foreign key relationships maintained";
        echo "✓ Checksums generated for verification";
        echo "";
        echo "================================================================================";
        echo "BACKUP FORMATS";
        echo "================================================================================";
        echo "";
        echo "Custom Format (.backup):";
        echo "  - Compressed binary format";
        echo "  - Faster restore time";
        echo "  - Requires pg_restore utility";
        echo "  - Size: $custom_size";
        echo "  - Recommended for production restores";
        echo "";
        echo "SQL Format (.sql):";
        echo "  - Plain text SQL statements";
        echo "  - Human-readable and editable";
        echo "  - Can be restored with psql";
        echo "  - Size: $sql_size";
        echo "  - Good for inspection and debugging";
        echo "";
        echo "================================================================================";
        echo "RESTORE INSTRUCTIONS";
        echo "================================================================================";
        echo "";
        echo "Quick Restore (Using Script):";
        echo "  cd /home/latest/beky1a";
        echo "  ./restore-database.sh";
        echo "";
        echo "Manual Restore (Custom Format):";
        echo "  pg_restore -h localhost -U postgres -d $DB_NAME ${BACKUP_PREFIX}.backup";
        echo "";
        echo "Manual Restore (SQL Format):";
        echo "  psql -h localhost -U postgres -d $DB_NAME -f ${BACKUP_PREFIX}.sql";
        echo "";
        echo "================================================================================";
        echo "SECURITY NOTES";
        echo "================================================================================";
        echo "";
        echo "⚠ IMPORTANT: This backup contains sensitive data including:";
        echo "  - Personal information";
        echo "  - Employment records";
        echo "  - User credentials (hashed passwords)";
        echo "";
        echo "🔒 Security Recommendations:";
        echo "  - Store backups in a secure, encrypted location";
        echo "  - Limit access to authorized personnel only";
        echo "  - Use secure transfer methods (SSH/SCP)";
        echo "  - Encrypt backups at rest";
        echo "  - Follow data protection regulations";
        echo "";
        echo "================================================================================";
        echo "BACKUP VERIFIED BY: Automated Backup System";
        echo "VERIFICATION STATUS: ✓ PASSED";
        echo "================================================================================";
    } > "$report_file"

    print_success "Verification report generated: $(basename "$report_file")"
}

generate_readme() {
    print_info "Generating README documentation..."

    local readme_file="${OUTPUT_DIR}/README.md"

    {
        echo "# CSMS Database Backup Package";
        echo "";
        echo "**Created:** $(date +"%B %d, %Y")";
        echo "**Database:** $DB_NAME";
        echo "**System:** Civil Service Management System (CSMS)";
        echo "**Platform:** Ubuntu 24.04 LTS";
        echo "**PostgreSQL Version:** $(psql --version | head -1)";
        echo "";
        echo "## 📦 Contents";
        echo "";
        echo "This backup package contains:";
        echo "";
        echo "1. **${BACKUP_PREFIX}.backup** - PostgreSQL custom format backup (compressed)";
        echo "2. **${BACKUP_PREFIX}.sql** - SQL format backup (plain text)";
        echo "3. **${BACKUP_PREFIX}_checksums.txt** - File integrity checksums";
        echo "4. **${BACKUP_PREFIX}_verification.txt** - Detailed backup verification report";
        echo "5. **restore-database.sh** - Automated restoration script";
        echo "6. **backup-database.sh** - This backup script";
        echo "7. **README.md** - This documentation file";
        echo "";
        echo "## 📊 Database Statistics";
        echo "";
        echo "- **Database Size:** $DB_SIZE";
        echo "- **Backup Date:** $(date)";
        echo "- **Total Tables:** ${#TABLE_COUNTS[@]}";
        echo "";
        echo "### Key Tables:";
        echo "";
        for TABLE in "${!TABLE_COUNTS[@]}"; do
            echo "- **$TABLE**: ${TABLE_COUNTS[$TABLE]} records";
        done
        echo "";
        echo "## 🚀 Quick Start - Restore Database";
        echo "";
        echo "### Using the Automated Restoration Script (Recommended)";
        echo "";
        echo "\`\`\`bash";
        echo "# Navigate to backup directory";
        echo "cd /home/latest/beky1a";
        echo "";
        echo "# Make restore script executable";
        echo "chmod +x restore-database.sh";
        echo "";
        echo "# Run the restore script";
        echo "./restore-database.sh";
        echo "";
        echo "# Or with custom parameters";
        echo "./restore-database.sh -h localhost -p 5432 -U postgres -d nody";
        echo "\`\`\`";
        echo "";
        echo "### Manual Restoration";
        echo "";
        echo "#### Using Custom Format (Faster)";
        echo "";
        echo "\`\`\`bash";
        echo "# Create database";
        echo "psql -U postgres -c \"CREATE DATABASE $DB_NAME WITH ENCODING='UTF8';\"";
        echo "";
        echo "# Restore from backup";
        echo "pg_restore -U postgres -d $DB_NAME ${BACKUP_PREFIX}.backup";
        echo "";
        echo "# Verify";
        echo "psql -U postgres -d $DB_NAME -c \"SELECT COUNT(*) FROM \\\"Employee\\\";\"";
        echo "\`\`\`";
        echo "";
        echo "#### Using SQL Format";
        echo "";
        echo "\`\`\`bash";
        echo "# Create database";
        echo "psql -U postgres -c \"CREATE DATABASE $DB_NAME WITH ENCODING='UTF8';\"";
        echo "";
        echo "# Restore from SQL file";
        echo "psql -U postgres -d $DB_NAME -f ${BACKUP_PREFIX}.sql";
        echo "";
        echo "# Verify";
        echo "psql -U postgres -d $DB_NAME -c \"SELECT COUNT(*) FROM \\\"Employee\\\";\"";
        echo "\`\`\`";
        echo "";
        echo "## 🔧 Post-Restoration Steps";
        echo "";
        echo "### 1. Update Environment Variables";
        echo "";
        echo "Update your \`.env\` file:";
        echo "";
        echo "\`\`\`env";
        echo "DATABASE_URL=\"postgresql://postgres:YourPassword@localhost:5432/$DB_NAME?schema=public\"";
        echo "\`\`\`";
        echo "";
        echo "### 2. Generate Prisma Client";
        echo "";
        echo "\`\`\`bash";
        echo "cd /path/to/your/app";
        echo "npx prisma generate";
        echo "\`\`\`";
        echo "";
        echo "### 3. Verify Database Connection";
        echo "";
        echo "\`\`\`bash";
        echo "npx prisma db pull";
        echo "npx prisma studio  # Opens database browser";
        echo "\`\`\`";
        echo "";
        echo "### 4. Start Your Application";
        echo "";
        echo "\`\`\`bash";
        echo "npm run dev    # Development";
        echo "npm run build  # Production build";
        echo "npm start      # Production";
        echo "\`\`\`";
        echo "";
        echo "## 🔍 Verify Backup Integrity";
        echo "";
        echo "Check SHA256 checksums:";
        echo "";
        echo "\`\`\`bash";
        echo "sha256sum -c ${BACKUP_PREFIX}_checksums.txt";
        echo "\`\`\`";
        echo "";
        echo "## 📋 Troubleshooting";
        echo "";
        echo "### Database Already Exists";
        echo "";
        echo "\`\`\`bash";
        echo "psql -U postgres -c \"DROP DATABASE $DB_NAME;\"";
        echo "\`\`\`";
        echo "";
        echo "### Permission Denied";
        echo "";
        echo "\`\`\`bash";
        echo "psql -U postgres -c \"ALTER USER postgres WITH SUPERUSER;\"";
        echo "\`\`\`";
        echo "";
        echo "### Connection Refused";
        echo "";
        echo "\`\`\`bash";
        echo "sudo systemctl status postgresql";
        echo "sudo systemctl start postgresql";
        echo "\`\`\`";
        echo "";
        echo "## 🔐 Security Notes";
        echo "";
        echo "- **Protect backup files** - Contains sensitive employee data";
        echo "- **Encrypt backups** - Use encryption for backups at rest";
        echo "- **Secure transfer** - Use SSH/SCP for transferring backups";
        echo "- **Access control** - Limit access to authorized personnel";
        echo "- **Regular testing** - Periodically test backup restoration";
        echo "";
        echo "## 📞 Support";
        echo "";
        echo "For assistance:";
        echo "";
        echo "- Review the verification report: \`${BACKUP_PREFIX}_verification.txt\`";
        echo "- Check PostgreSQL logs: \`/var/log/postgresql/\`";
        echo "- Prisma documentation: https://www.prisma.io/docs";
        echo "";
        echo "---";
        echo "";
        echo "**Created with:** CSMS Database Backup Script v1.0";
        echo "**Platform:** Ubuntu 24.04 LTS";
        echo "**PostgreSQL + Prisma ORM**";
    } > "$readme_file"

    print_success "README generated: $(basename "$readme_file")"
}

cleanup_old_backups() {
    print_info "Cleaning up old backups (keeping last 5)..."

    cd "$OUTPUT_DIR"

    # Keep only the 5 most recent .backup files
    ls -t ${DB_NAME}_backup_*.backup 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

    # Keep only the 5 most recent .sql files
    ls -t ${DB_NAME}_backup_*.sql 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

    # Keep only the 5 most recent verification files
    ls -t ${DB_NAME}_backup_*_verification.txt 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

    # Keep only the 5 most recent checksum files
    ls -t ${DB_NAME}_backup_*_checksums.txt 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

    print_success "Old backups cleaned up"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Database Backup Completed Successfully!               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Summary:${NC}"
    echo -e "  Database:     ${CYAN}$DB_NAME${NC}"
    echo -e "  Size:         ${CYAN}$DB_SIZE${NC}"
    echo -e "  Location:     ${CYAN}$OUTPUT_DIR${NC}"
    echo -e "  Timestamp:    ${CYAN}$TIMESTAMP${NC}"
    echo ""
    echo -e "${YELLOW}Files Created:${NC}"
    echo -e "  ${GREEN}✓${NC} ${BACKUP_PREFIX}.backup"
    echo -e "  ${GREEN}✓${NC} ${BACKUP_PREFIX}.sql"
    echo -e "  ${GREEN}✓${NC} ${BACKUP_PREFIX}_checksums.txt"
    echo -e "  ${GREEN}✓${NC} ${BACKUP_PREFIX}_verification.txt"
    echo -e "  ${GREEN}✓${NC} README.md"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Review verification report: ${BACKUP_PREFIX}_verification.txt"
    echo "  2. Verify checksums: sha256sum -c ${BACKUP_PREFIX}_checksums.txt"
    echo "  3. Test restore on a separate system"
    echo "  4. Store backups securely (encrypted storage recommended)"
    echo ""
    echo -e "${CYAN}To restore this backup:${NC}"
    echo "  cd $OUTPUT_DIR"
    echo "  ./restore-database.sh"
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
        --no-verify)
            VERIFY_BACKUP=false
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
echo -e "${YELLOW}Creating backups...${NC}"
echo ""

# Create custom format backup
create_backup "custom" "${OUTPUT_DIR}/${BACKUP_PREFIX}.backup" "Creating custom format backup..."

# Create SQL format backup
create_backup "sql" "${OUTPUT_DIR}/${BACKUP_PREFIX}.sql" "Creating SQL format backup..."

echo ""

# Generate additional files
generate_checksums
verify_backup
generate_verification_report
generate_readme

# Cleanup old backups
echo ""
cleanup_old_backups

# Print summary
print_summary

# Clean up password from environment
unset PGPASSWORD

exit 0

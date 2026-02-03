#!/bin/bash

#############################################
# Production Cleanup Script
# Deletes all employees and related data
# Preserves: Institutions, Users
#############################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=============================================="
echo "  CSMS Production Cleanup Script"
echo "=============================================="
echo ""
echo "This script will DELETE:"
echo "  - All employees"
echo "  - All employee certificates"
echo "  - All HR requests (promotions, confirmations, etc.)"
echo "  - All complaints"
echo "  - All notifications"
echo "  - All audit logs"
echo "  - All sessions"
echo "  - All files in MinIO storage"
echo ""
echo "This script will PRESERVE:"
echo "  - All institutions"
echo "  - All users"
echo ""
echo "=============================================="
echo ""

read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Run the TypeScript cleanup script
npx tsx "$SCRIPT_DIR/cleanup-employees.ts"

echo ""
echo "Cleanup script finished."

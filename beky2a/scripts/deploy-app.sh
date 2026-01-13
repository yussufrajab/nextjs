#!/bin/bash

################################################################################
# CSMS Application Deployment Script
#
# This script deploys the CSMS application after VPS setup is complete
#
# What this script does:
#   1. Verifies all prerequisites are installed
#   2. Installs Node.js dependencies
#   3. Generates Prisma Client
#   4. Builds the Next.js application
#   5. Sets up PM2 for process management
#   6. Configures MinIO buckets
#   7. Starts the application
#
# Prerequisites:
#   - VPS setup completed (setup-new-vps.sh)
#   - Database restored
#   - .env file configured
#   - Application code in /home/latest
#
# Usage:
#   cd /home/latest
#   ./beky2a/scripts/deploy-app.sh
#
# Author: CSMS Development Team
# Created: January 2026
################################################################################

set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Application directory
APP_DIR="/home/latest"

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         CSMS Application Deployment Script                    ║${NC}"
    echo -e "${BLUE}║         Civil Service Management System                       ║${NC}"
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

check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check if in correct directory
    if [ "$PWD" != "$APP_DIR" ]; then
        print_error "Please run this script from $APP_DIR"
        print_info "Run: cd $APP_DIR && ./beky2a/scripts/deploy-app.sh"
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Run setup-new-vps.sh first."
        exit 1
    fi
    print_success "Node.js found: $(node -v)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm found: $(npm -v)"

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL is not installed. Run setup-new-vps.sh first."
        exit 1
    fi
    print_success "PostgreSQL found"

    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        print_error "Redis is not installed. Run setup-new-vps.sh first."
        exit 1
    fi
    print_success "Redis found"

    # Check .env file
    if [ ! -f "$APP_DIR/.env" ]; then
        print_error ".env file not found"
        print_info "Copy the template: cp beky2a/config/.env.template .env"
        print_info "Then edit it with your actual values: nano .env"
        exit 1
    fi
    print_success ".env file found"

    # Check package.json
    if [ ! -f "$APP_DIR/package.json" ]; then
        print_error "package.json not found. Is the application code uploaded?"
        exit 1
    fi
    print_success "package.json found"
}

install_dependencies() {
    print_info "Installing Node.js dependencies..."
    echo ""

    npm install

    print_success "Dependencies installed"
}

generate_prisma_client() {
    print_info "Generating Prisma Client..."

    npx prisma generate

    print_success "Prisma Client generated"
}

verify_database() {
    print_info "Verifying database connection..."

    # Source .env to get DATABASE_URL
    export $(grep -v '^#' .env | xargs)

    if npx prisma db pull --force > /dev/null 2>&1; then
        print_success "Database connection verified"
    else
        print_error "Cannot connect to database"
        print_info "Please check DATABASE_URL in .env file"
        print_info "Make sure the database is restored"
        exit 1
    fi
}

build_application() {
    print_info "Building Next.js application..."
    echo ""

    npm run build

    print_success "Application built successfully"
}

setup_minio_buckets() {
    print_info "Setting up MinIO buckets..."

    # Install MinIO client if not present
    if ! command -v mc &> /dev/null; then
        print_info "Installing MinIO client..."
        wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
        chmod +x /usr/local/bin/mc
    fi

    # Source .env to get MinIO credentials
    export $(grep -v '^#' .env | xargs)

    # Configure MinIO client
    mc alias set csms http://localhost:9000 ${MINIO_ACCESS_KEY:-csmsadmin} ${MINIO_SECRET_KEY:-Mamlaka2020MinIO} 2>/dev/null || true

    # Create buckets
    mc mb csms/documents 2>/dev/null || print_warning "Bucket 'documents' may already exist"
    mc mb csms/certificates 2>/dev/null || print_warning "Bucket 'certificates' may already exist"
    mc mb csms/photos 2>/dev/null || print_warning "Bucket 'photos' may already exist"
    mc mb csms/attachments 2>/dev/null || print_warning "Bucket 'attachments' may already exist"

    # Set bucket policies (public read for photos/certificates if needed)
    # mc anonymous set download csms/photos 2>/dev/null || true

    print_success "MinIO buckets configured"
}

setup_pm2() {
    print_info "Setting up PM2 process management..."

    # Stop existing PM2 processes
    pm2 delete all 2>/dev/null || true

    # Start the main Next.js application
    pm2 start npm --name "csms-app" -- start

    # Start background workers if ecosystem.config.js exists
    if [ -f "$APP_DIR/ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
    fi

    # Save PM2 configuration
    pm2 save

    print_success "PM2 configured and application started"
}

verify_deployment() {
    print_info "Verifying deployment..."

    sleep 3

    # Check if application is responding
    if curl -s http://localhost:9002 > /dev/null; then
        print_success "Application is responding on port 9002"
    else
        print_warning "Application may not be responding yet (this is normal if it's still starting)"
    fi
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         Deployment Completed Successfully!                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Application Status:${NC}"
    pm2 list
    echo ""
    echo -e "${YELLOW}Useful Commands:${NC}"
    echo ""
    echo -e "${CYAN}View logs:${NC}"
    echo "   pm2 logs csms-app"
    echo "   pm2 logs redis-worker"
    echo "   pm2 logs genkit-ai"
    echo ""
    echo -e "${CYAN}Restart application:${NC}"
    echo "   pm2 restart csms-app"
    echo "   pm2 restart all"
    echo ""
    echo -e "${CYAN}Stop application:${NC}"
    echo "   pm2 stop csms-app"
    echo "   pm2 stop all"
    echo ""
    echo -e "${CYAN}Monitor processes:${NC}"
    echo "   pm2 monit"
    echo ""
    echo -e "${YELLOW}Access Points:${NC}"
    echo "   Application: http://YOUR_SERVER_IP:9002"
    echo "   MinIO Console: http://YOUR_SERVER_IP:9001"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "   1. Configure your domain DNS to point to this server"
    echo "   2. Set up SSL/TLS with Let's Encrypt"
    echo "   3. Configure reverse proxy (Nginx/Apache) if needed"
    echo "   4. Set up automated backups"
    echo "   5. Monitor application logs"
    echo ""
}

################################################################################
# Main Script
################################################################################

print_header

echo -e "${YELLOW}This script will deploy the CSMS application.${NC}"
echo -e "${YELLOW}Make sure you have:${NC}"
echo "   - Completed VPS setup (setup-new-vps.sh)"
echo "   - Restored the database"
echo "   - Configured .env file"
echo "   - Uploaded application code"
echo ""
echo -n "Continue with deployment? (yes/no): "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Deployment cancelled"
    exit 0
fi

echo ""

# Run deployment steps
check_prerequisites
install_dependencies
generate_prisma_client
verify_database
build_application
setup_minio_buckets
setup_pm2
verify_deployment

# Print summary
print_summary

exit 0

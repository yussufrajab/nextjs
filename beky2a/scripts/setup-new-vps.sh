#!/bin/bash

################################################################################
# CSMS New VPS Setup Script
#
# This script automates the setup of a fresh Ubuntu 24.04 LTS VPS for the
# Civil Service Management System (CSMS)
#
# What this script does:
#   1. Updates system packages
#   2. Installs Node.js 20.x LTS
#   3. Installs PostgreSQL 16
#   4. Installs Redis for BullMQ
#   5. Installs MinIO for object storage
#   6. Installs PM2 for process management
#   7. Configures firewall (UFW)
#   8. Sets up basic security hardening
#
# Prerequisites:
#   - Fresh Ubuntu 24.04 LTS server
#   - Root or sudo access
#   - Internet connection
#
# Usage:
#   sudo ./setup-new-vps.sh
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

################################################################################
# Functions
################################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         CSMS New VPS Setup Script (Ubuntu 24.04)              ║${NC}"
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

check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
    print_success "Running as root"
}

check_ubuntu_version() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" != "ubuntu" ]]; then
            print_error "This script is designed for Ubuntu"
            exit 1
        fi
        print_success "Detected Ubuntu $VERSION"
    else
        print_error "Cannot detect OS version"
        exit 1
    fi
}

update_system() {
    print_info "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq curl wget git build-essential
    print_success "System updated"
}

install_nodejs() {
    print_info "Installing Node.js 20.x LTS..."

    if command -v node &> /dev/null; then
        print_warning "Node.js is already installed: $(node -v)"
        return
    fi

    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs

    print_success "Node.js installed: $(node -v)"
    print_success "npm installed: $(npm -v)"
}

install_postgresql() {
    print_info "Installing PostgreSQL 16..."

    if command -v psql &> /dev/null; then
        print_warning "PostgreSQL is already installed: $(psql --version)"
        return
    fi

    apt-get install -y -qq postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql

    print_success "PostgreSQL installed: $(psql --version)"
    print_info "PostgreSQL is running on port 5432"
}

configure_postgresql() {
    print_info "Configuring PostgreSQL..."

    # Set postgres user password
    echo -n "Enter password for PostgreSQL 'postgres' user (or press Enter for 'Mamlaka2020'): "
    read -s PG_PASSWORD
    echo ""

    if [ -z "$PG_PASSWORD" ]; then
        PG_PASSWORD="Mamlaka2020"
    fi

    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$PG_PASSWORD';"

    # Create nody database
    sudo -u postgres psql -c "CREATE DATABASE nody WITH ENCODING='UTF8';" 2>/dev/null || print_warning "Database 'nody' may already exist"

    print_success "PostgreSQL configured"
    print_info "Database: nody"
    print_info "User: postgres"
    print_info "Password: (saved)"
}

install_redis() {
    print_info "Installing Redis..."

    if command -v redis-server &> /dev/null; then
        print_warning "Redis is already installed"
        return
    fi

    apt-get install -y -qq redis-server
    systemctl enable redis-server
    systemctl start redis-server

    print_success "Redis installed and running"
}

install_minio() {
    print_info "Installing MinIO..."

    if command -v minio &> /dev/null; then
        print_warning "MinIO is already installed"
        return
    fi

    wget -q https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio

    # Create minio user
    useradd -r minio-user -s /sbin/nologin 2>/dev/null || print_warning "minio-user already exists"

    # Create minio directories
    mkdir -p /mnt/data
    chown minio-user:minio-user /mnt/data

    # Create systemd service
    cat > /etc/systemd/system/minio.service <<EOF
[Unit]
Description=MinIO
Documentation=https://min.io/docs/minio/linux/index.html
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/usr/local

User=minio-user
Group=minio-user
ProtectProc=invisible

EnvironmentFile=-/etc/default/minio
ExecStartPre=/bin/bash -c "if [ -z \"\${MINIO_VOLUMES}\" ]; then echo \"Variable MINIO_VOLUMES not set in /etc/default/minio\"; exit 1; fi"
ExecStart=/usr/local/bin/minio server \$MINIO_OPTS \$MINIO_VOLUMES

Restart=always
LimitNOFILE=65536
TasksMax=infinity
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
EOF

    # Create default config
    cat > /etc/default/minio <<EOF
MINIO_ROOT_USER=csmsadmin
MINIO_ROOT_PASSWORD=Mamlaka2020MinIO
MINIO_VOLUMES="/mnt/data"
MINIO_OPTS="--console-address :9001"
EOF

    systemctl daemon-reload
    systemctl enable minio
    systemctl start minio

    print_success "MinIO installed and running"
    print_info "MinIO API: http://YOUR_SERVER_IP:9000"
    print_info "MinIO Console: http://YOUR_SERVER_IP:9001"
    print_info "Username: csmsadmin"
    print_info "Password: Mamlaka2020MinIO"
}

install_pm2() {
    print_info "Installing PM2..."

    if command -v pm2 &> /dev/null; then
        print_warning "PM2 is already installed"
        return
    fi

    npm install -g pm2
    pm2 startup systemd -u root --hp /root

    print_success "PM2 installed"
}

configure_firewall() {
    print_info "Configuring firewall (UFW)..."

    # Install UFW if not present
    apt-get install -y -qq ufw

    # Allow SSH (important!)
    ufw allow 22/tcp

    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp

    # Allow application port
    ufw allow 9002/tcp

    # Allow PostgreSQL (only from localhost by default)
    # ufw allow from 127.0.0.1 to any port 5432

    # Allow MinIO
    ufw allow 9000/tcp
    ufw allow 9001/tcp

    # Enable UFW
    echo "y" | ufw enable

    print_success "Firewall configured"
}

create_app_directory() {
    print_info "Creating application directory..."

    mkdir -p /home/latest
    cd /home/latest

    print_success "Application directory created: /home/latest"
}

install_prisma_dependencies() {
    print_info "Installing Prisma dependencies..."

    apt-get install -y -qq openssl libssl-dev

    print_success "Prisma dependencies installed"
}

print_summary() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         VPS Setup Completed Successfully!                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Installed Services:${NC}"
    echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
    echo -e "  ${GREEN}✓${NC} npm $(npm -v)"
    echo -e "  ${GREEN}✓${NC} PostgreSQL 16"
    echo -e "  ${GREEN}✓${NC} Redis Server"
    echo -e "  ${GREEN}✓${NC} MinIO Object Storage"
    echo -e "  ${GREEN}✓${NC} PM2 Process Manager"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo -e "${CYAN}1. Upload your application files${NC}"
    echo "   - Upload the CSMS application code to /home/latest"
    echo "   - You can use SCP, SFTP, or git clone"
    echo ""
    echo -e "${CYAN}2. Restore the database${NC}"
    echo "   cd /home/latest/beky2a/database"
    echo "   ./restore-database.sh"
    echo ""
    echo -e "${CYAN}3. Configure environment variables${NC}"
    echo "   cd /home/latest"
    echo "   cp beky2a/config/.env.template .env"
    echo "   nano .env  # Edit with your actual values"
    echo ""
    echo -e "${CYAN}4. Install application dependencies${NC}"
    echo "   cd /home/latest"
    echo "   npm install"
    echo ""
    echo -e "${CYAN}5. Generate Prisma Client${NC}"
    echo "   npx prisma generate"
    echo ""
    echo -e "${CYAN}6. Build the application${NC}"
    echo "   npm run build"
    echo ""
    echo -e "${CYAN}7. Start the application${NC}"
    echo "   npm start  # Or use PM2: pm2 start npm --name csms -- start"
    echo ""
    echo -e "${YELLOW}Service Status:${NC}"
    echo "   systemctl status postgresql"
    echo "   systemctl status redis-server"
    echo "   systemctl status minio"
    echo "   pm2 status"
    echo ""
    echo -e "${YELLOW}Important URLs:${NC}"
    echo "   Application: http://YOUR_SERVER_IP:9002"
    echo "   MinIO Console: http://YOUR_SERVER_IP:9001"
    echo ""
    echo -e "${CYAN}Security Recommendations:${NC}"
    echo "   1. Change default passwords in .env file"
    echo "   2. Set up SSL/TLS certificates (Let's Encrypt)"
    echo "   3. Configure proper firewall rules"
    echo "   4. Enable automatic security updates"
    echo "   5. Set up regular database backups"
    echo ""
}

################################################################################
# Main Script
################################################################################

print_header

echo -e "${YELLOW}This script will set up a new VPS for CSMS.${NC}"
echo -e "${YELLOW}It will install: Node.js, PostgreSQL, Redis, MinIO, and PM2${NC}"
echo ""
echo -n "Continue? (yes/no): "
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_info "Setup cancelled"
    exit 0
fi

echo ""

# Run setup steps
check_root
check_ubuntu_version
update_system
install_nodejs
install_postgresql
configure_postgresql
install_redis
install_minio
install_pm2
install_prisma_dependencies
configure_firewall
create_app_directory

# Print summary
print_summary

exit 0

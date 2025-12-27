# Installation Guide
## Civil Service Management System (CSMS)

---

### Document Control

| **Version** | **Date** | **Author** | **Changes** |
|-------------|----------|------------|-------------|
| 1.0 | 2025-01-15 | CSMS Technical Team | Initial installation guide |

**Document Classification**: RESTRICTED
**Distribution**: System Administrators, Technical Team

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Requirements](#2-system-requirements)
3. [Pre-Installation Checklist](#3-pre-installation-checklist)
4. [Installation Steps](#4-installation-steps)
5. [Configuration Guide](#5-configuration-guide)
6. [Database Setup](#6-database-setup)
7. [MinIO Object Storage Setup](#7-minio-object-storage-setup)
8. [Application Deployment](#8-application-deployment)
9. [Verification Steps](#9-verification-steps)
10. [Post-Installation Configuration](#10-post-installation-configuration)
11. [Troubleshooting](#11-troubleshooting)
12. [Maintenance and Updates](#12-maintenance-and-updates)

---

## 1. Introduction

### 1.1 Purpose
This guide provides step-by-step instructions for installing the Civil Service Management System (CSMS) on a production or development server.

### 1.2 Scope
The installation covers:
- Server preparation and dependencies
- PostgreSQL database setup
- MinIO object storage configuration
- Next.js application installation
- Nginx reverse proxy setup
- SSL/TLS certificate installation
- Process management with PM2

### 1.3 Audience
This guide is intended for:
- System Administrators
- DevOps Engineers
- IT Technical Staff

### 1.4 Installation Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Installation Process                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 1. Server Preparation                    │
    │    - OS Installation (Ubuntu 22.04 LTS)  │
    │    - System Updates                      │
    │    - Security Hardening                  │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 2. Install Dependencies                  │
    │    - Node.js 18 LTS                      │
    │    - PostgreSQL 14+                      │
    │    - MinIO                               │
    │    - Nginx                               │
    │    - PM2                                 │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 3. Configure Services                    │
    │    - PostgreSQL Database                 │
    │    - MinIO Storage                       │
    │    - Nginx Reverse Proxy                 │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 4. Install Application                   │
    │    - Clone Repository                    │
    │    - Install Dependencies                │
    │    - Configure Environment               │
    │    - Build Application                   │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 5. Database Migration                    │
    │    - Run Prisma Migrations               │
    │    - Seed Initial Data                   │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 6. Start Application                     │
    │    - Start with PM2                      │
    │    - Configure Auto-Restart              │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 7. SSL/TLS Setup                         │
    │    - Install Certificates                │
    │    - Configure HTTPS                     │
    └──────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────┐
    │ 8. Verification                          │
    │    - Health Checks                       │
    │    - Functional Testing                  │
    │    - Performance Testing                 │
    └──────────────────────────────────────────┘
```

**Estimated Installation Time**: 3-4 hours (experienced administrator)

---

## 2. System Requirements

### 2.1 Hardware Requirements

#### 2.1.1 Minimum Requirements (Development/Testing)
| **Component** | **Specification** |
|---------------|-------------------|
| CPU | 2 cores (2.0 GHz+) |
| RAM | 8 GB |
| Storage | 100 GB SSD |
| Network | 100 Mbps |

#### 2.1.2 Recommended Requirements (Production)
| **Component** | **Specification** |
|---------------|-------------------|
| CPU | 4 cores (2.5 GHz+) |
| RAM | 16 GB |
| Storage | 200 GB SSD (OS + Application) + 500 GB SSD (Database) + 1 TB HDD (MinIO) |
| Network | 1 Gbps |

#### 2.1.3 High-Availability Setup (Enterprise)
| **Component** | **Specification** |
|---------------|-------------------|
| Application Servers | 2+ servers (4 CPU, 16 GB RAM each) |
| Database Server | 1 primary + 1 replica (4 CPU, 32 GB RAM each) |
| MinIO Servers | 4+ servers (2 CPU, 8 GB RAM, 1 TB each) |
| Load Balancer | 2 servers (2 CPU, 4 GB RAM each) |

### 2.2 Software Requirements

#### 2.2.1 Operating System
- **Ubuntu 22.04 LTS** (Recommended)
- **Ubuntu 20.04 LTS** (Supported)
- **Debian 11+** (Supported)
- **CentOS/RHEL 8+** (Supported with modifications)

**Note**: This guide uses Ubuntu 22.04 LTS. Commands may differ for other distributions.

#### 2.2.2 Required Software

| **Software** | **Version** | **Purpose** |
|--------------|-------------|-------------|
| Node.js | 18.x LTS or 20.x LTS | Application runtime |
| npm | 9.x+ | Package management |
| PostgreSQL | 14.x, 15.x, or 16.x | Database server |
| MinIO | Latest stable | Object storage |
| Nginx | 1.18+ | Reverse proxy & web server |
| PM2 | 5.x+ | Process management |
| Git | 2.x+ | Version control |
| Certbot | Latest | SSL/TLS certificates (Let's Encrypt) |

#### 2.2.3 Optional Software

| **Software** | **Version** | **Purpose** |
|--------------|-------------|-------------|
| Redis | 6.x+ | Session storage (future enhancement) |
| Prometheus | Latest | Monitoring |
| Grafana | Latest | Metrics visualization |
| ELK Stack | Latest | Log aggregation |

### 2.3 Network Requirements

#### 2.3.1 Firewall Ports

| **Port** | **Protocol** | **Service** | **Access** |
|----------|--------------|-------------|------------|
| 22 | TCP | SSH | Restricted (admin only) |
| 80 | TCP | HTTP | Public (redirects to HTTPS) |
| 443 | TCP | HTTPS | Public |
| 5432 | TCP | PostgreSQL | Localhost / Internal network only |
| 9000 | TCP | MinIO API | Localhost / Internal network only |
| 9001 | TCP | MinIO Console | Restricted (admin only) |
| 9002 | TCP | Next.js App | Localhost only (behind Nginx) |

#### 2.3.2 External Connectivity
- **Internet Access**: Required for:
  - Package installation (apt, npm)
  - HRIMS API integration
  - SSL certificate generation (Let's Encrypt)
  - Email delivery (SMTP)
  - Software updates

- **Domain Name**: Required for production
  - Example: `csms.zanajira.go.tz`
  - DNS A record pointing to server IP

### 2.4 Access Requirements

- Root or sudo access to the server
- SSH access for remote administration
- Domain administrator access (for DNS configuration)
- Email account for SSL certificate notifications

---

## 3. Pre-Installation Checklist

### 3.1 Server Preparation

- [ ] Server provisioned (physical or virtual)
- [ ] Operating system installed (Ubuntu 22.04 LTS)
- [ ] Server accessible via SSH
- [ ] Root/sudo access confirmed
- [ ] Static IP address configured
- [ ] Hostname configured
- [ ] DNS records configured (A record for domain)
- [ ] NTP configured for time synchronization
- [ ] Firewall configured (UFW or iptables)

### 3.2 Documentation Gathered

- [ ] HRIMS API credentials obtained
- [ ] SMTP server credentials obtained (for email notifications)
- [ ] SSL certificate information (if using commercial cert)
- [ ] Backup storage location identified
- [ ] Domain name registered and verified
- [ ] Network diagram reviewed
- [ ] Security policies reviewed

### 3.3 Pre-Installation Commands

```bash
# Check system information
uname -a
lsb_release -a

# Check hardware resources
lscpu
free -h
df -h

# Check network connectivity
ping -c 4 google.com
curl -I https://www.google.com

# Verify SSH access
ssh user@server-ip

# Verify sudo access
sudo whoami
```

---

## 4. Installation Steps

### 4.1 Step 1: Server Preparation

#### 4.1.1 Update System Packages

```bash
# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Install essential utilities
sudo apt install -y curl wget git build-essential software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release
```

#### 4.1.2 Configure Hostname

```bash
# Set hostname (replace 'csms-server' with your desired hostname)
sudo hostnamectl set-hostname csms-server

# Update /etc/hosts
sudo nano /etc/hosts
# Add line:
# 127.0.0.1   csms-server
# [SERVER_IP] csms.zanajira.go.tz csms

# Verify
hostnamectl
```

#### 4.1.3 Configure Firewall

```bash
# Install UFW (if not already installed)
sudo apt install -y ufw

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MinIO Console (from specific IP only - replace with your admin IP)
# sudo ufw allow from [ADMIN_IP] to any port 9001

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### 4.1.4 Configure Time Synchronization

```bash
# Install NTP
sudo apt install -y ntp

# Enable and start NTP service
sudo systemctl enable ntp
sudo systemctl start ntp

# Verify time synchronization
timedatectl status
```

### 4.2 Step 2: Install Node.js

```bash
# Install Node.js 18 LTS (Recommended)
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher

# Alternatively, install Node.js 20 LTS
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt install -y nodejs

# Update npm to latest version
sudo npm install -g npm@latest

# Install global npm packages
sudo npm install -g pm2
```

### 4.3 Step 3: Install PostgreSQL

```bash
# Install PostgreSQL 14 (or latest available)
sudo apt install -y postgresql postgresql-contrib

# Verify installation
psql --version

# Check PostgreSQL status
sudo systemctl status postgresql

# Enable PostgreSQL to start on boot
sudo systemctl enable postgresql
```

### 4.4 Step 4: Install MinIO

```bash
# Download MinIO binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Verify installation
minio --version

# Create MinIO user
sudo useradd -r minio-user -s /sbin/nologin

# Create MinIO data directory
sudo mkdir -p /mnt/minio-data
sudo chown minio-user:minio-user /mnt/minio-data

# Create MinIO configuration directory
sudo mkdir -p /etc/minio
sudo chown minio-user:minio-user /etc/minio

# Create MinIO environment file
sudo nano /etc/default/minio
```

**Add the following content to `/etc/default/minio`**:
```bash
# MinIO configuration
MINIO_VOLUMES="/mnt/minio-data"
MINIO_OPTS="--address :9000 --console-address :9001"
MINIO_ROOT_USER=csmsadmin
MINIO_ROOT_PASSWORD=YourSecurePasswordHere123!
```

**Create MinIO systemd service**:
```bash
sudo nano /etc/systemd/system/minio.service
```

**Add the following content**:
```ini
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/usr/local/

User=minio-user
Group=minio-user
ProtectProc=invisible

EnvironmentFile=/etc/default/minio
ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES

# Let systemd restart this service always
Restart=always

# Specifies the maximum file descriptor number that can be opened by this process
LimitNOFILE=65536

# Specifies the maximum number of threads this process can create
TasksMax=infinity

# Disable timeout logic and wait until process is stopped
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
```

**Start MinIO service**:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable MinIO to start on boot
sudo systemctl enable minio

# Start MinIO
sudo systemctl start minio

# Check status
sudo systemctl status minio

# Verify MinIO is running
curl http://localhost:9000/minio/health/live
```

### 4.5 Step 5: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Verify installation
nginx -v

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Start Nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t
```

### 4.6 Step 6: Install Certbot (Let's Encrypt)

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

**Note**: SSL certificate will be obtained later after Nginx is configured.

---

## 5. Configuration Guide

### 5.1 PostgreSQL Configuration

#### 5.1.1 Create Database User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE USER csms_user WITH PASSWORD 'YourSecurePassword123!';
CREATE DATABASE nody OWNER csms_user;
GRANT ALL PRIVILEGES ON DATABASE nody TO csms_user;

# Exit PostgreSQL
\q
```

#### 5.1.2 Configure PostgreSQL for Production

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Recommended production settings** (adjust based on your RAM):
```conf
# Memory Settings (for 16GB RAM server)
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 10MB

# Checkpoint Settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200

# Connection Settings
max_connections = 200

# Write Ahead Log
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%m [%p] %q%u@%d '
log_timezone = 'UTC'
```

**Configure PostgreSQL authentication**:
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**Add/modify the following lines**:
```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Allow local connections
local   all             postgres                                peer
local   all             all                                     peer

# Allow localhost connections with password
host    nody            csms_user       127.0.0.1/32            md5
host    nody            csms_user       ::1/128                 md5

# For application server (if database is on different server)
# host    nody            csms_user       [APP_SERVER_IP]/32      md5
```

**Restart PostgreSQL**:
```bash
sudo systemctl restart postgresql
```

#### 5.1.3 Test Database Connection

```bash
# Test connection
psql -U csms_user -d nody -h localhost

# In psql prompt:
SELECT version();
\l
\q
```

### 5.2 MinIO Configuration

#### 5.2.1 Install MinIO Client (mc)

```bash
# Download mc (MinIO Client)
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Verify installation
mc --version
```

#### 5.2.2 Configure MinIO Client

```bash
# Configure mc alias
mc alias set csms-local http://localhost:9000 csmsadmin YourSecurePasswordHere123!

# Test connection
mc admin info csms-local
```

#### 5.2.3 Create MinIO Bucket

```bash
# Create bucket for CSMS documents
mc mb csms-local/csms-documents

# Set bucket policy to private
mc anonymous set none csms-local/csms-documents

# Enable versioning
mc version enable csms-local/csms-documents

# Configure lifecycle policy (optional - 30-day retention for deleted objects)
cat > lifecycle.json <<EOF
{
    "Rules": [
        {
            "ID": "DeleteOldVersions",
            "Status": "Enabled",
            "Expiration": {
                "Days": 30
            },
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 30
            }
        }
    ]
}
EOF

mc ilm import csms-local/csms-documents < lifecycle.json

# Verify bucket
mc ls csms-local
mc version info csms-local/csms-documents
```

### 5.3 Nginx Configuration

#### 5.3.1 Create Nginx Configuration for CSMS

```bash
# Remove default Nginx site
sudo rm /etc/nginx/sites-enabled/default

# Create CSMS configuration
sudo nano /etc/nginx/sites-available/csms
```

**Add the following configuration**:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name csms.zanajira.go.tz www.csms.zanajira.go.tz;

    # Allow Certbot for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server (will be updated after SSL certificate is obtained)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name csms.zanajira.go.tz www.csms.zanajira.go.tz;

    # SSL Configuration (placeholder - will be updated by Certbot)
    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

    # File Upload Limit (10MB - adjust as needed)
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/csms-access.log;
    error_log /var/log/nginx/csms-error.log;

    # Proxy to Next.js Application
    location / {
        proxy_pass http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate Limiting for Login Endpoint
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:9002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static {
        proxy_cache_valid 60m;
        proxy_pass http://localhost:9002;
    }
}
```

**Enable the site**:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/csms /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 6. Database Setup

### 6.1 Create Application Directory

```bash
# Create application directory
sudo mkdir -p /var/www/csms
sudo chown -R $USER:$USER /var/www/csms

# Navigate to application directory
cd /var/www/csms
```

### 6.2 Clone Repository

```bash
# Clone the CSMS repository (replace with your repository URL)
git clone [YOUR_REPOSITORY_URL] .

# Or if you have a tarball/zip file:
# wget [URL_TO_TARBALL]
# tar -xzf csms.tar.gz -C /var/www/csms

# Verify files
ls -la
```

### 6.3 Install Dependencies

```bash
# Install Node.js dependencies
npm ci --only=production

# Or for development environment:
# npm install

# Verify installation
npm list --depth=0
```

### 6.4 Configure Environment Variables

```bash
# Create .env.local file
nano .env.local
```

**Add the following configuration** (update with your actual values):
```bash
# Database Configuration
DATABASE_URL="postgresql://csms_user:YourSecurePassword123!@localhost:5432/nody?schema=public"

# MinIO Object Storage Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=csmsadmin
MINIO_SECRET_KEY=YourSecurePasswordHere123!
MINIO_BUCKET_NAME=csms-documents

# HRIMS Integration Configuration
HRIMS_API_URL=https://hrims-api.zanzibar.go.tz
HRIMS_API_KEY=your-hrims-api-key-here
HRIMS_MOCK_MODE=false

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://csms.zanajira.go.tz
PORT=9002

# Session Configuration
SESSION_SECRET=generate-a-secure-random-string-here-use-openssl-rand-base64-32

# Email Configuration (optional - for notifications)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@zanajira.go.tz
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=CSMS <noreply@zanajira.go.tz>

# Google AI (for complaint rewriting - optional)
GOOGLE_GENAI_API_KEY=your-google-ai-api-key-here
```

**Generate secure random strings**:
```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate another random secret if needed
openssl rand -hex 32
```

**Set proper permissions**:
```bash
# Restrict access to .env.local
chmod 600 .env.local

# Verify
ls -la .env.local
```

### 6.5 Generate Prisma Client

```bash
# Generate Prisma client
npx prisma generate

# Verify Prisma client
ls -la node_modules/.prisma/client/
```

### 6.6 Run Database Migrations

```bash
# Check migration status
npx prisma migrate status

# Deploy migrations to database
npx prisma migrate deploy

# Verify database schema
npx prisma db pull
npx prisma validate
```

### 6.7 Seed Database (Optional)

If you have a seed script:
```bash
# Seed initial data (system admin, institutions, etc.)
npx prisma db seed

# Or run custom seed script
# node scripts/seed.js
```

### 6.8 Verify Database Setup

```bash
# Open Prisma Studio (development only)
npx prisma studio

# Access at: http://localhost:5555
# Browse tables: User, Institution, Employee, etc.
# Press Ctrl+C to stop
```

---

## 7. MinIO Object Storage Setup

### 7.1 Verify MinIO Bucket

```bash
# List buckets
mc ls csms-local

# Check bucket info
mc stat csms-local/csms-documents

# Test file upload
echo "Test file" > test.txt
mc cp test.txt csms-local/csms-documents/
mc ls csms-local/csms-documents/
mc rm csms-local/csms-documents/test.txt
rm test.txt
```

### 7.2 Configure MinIO for Production

```bash
# Set bucket quota (optional - 100GB limit)
mc admin bucket quota csms-local/csms-documents --hard 100gb

# Enable bucket notifications (optional - for event processing)
# mc event add csms-local/csms-documents arn:minio:sqs::primary:webhook --event put,delete
```

### 7.3 MinIO Security

```bash
# Create service account for application (more secure than root credentials)
mc admin user add csms-local csms-app SecureAppPassword123!

# Create policy for application
cat > csms-app-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::csms-documents/*",
                "arn:aws:s3:::csms-documents"
            ]
        }
    ]
}
EOF

mc admin policy create csms-local csms-app-policy csms-app-policy.json
mc admin policy attach csms-local csms-app-policy --user csms-app

# Update .env.local with service account credentials
# MINIO_ACCESS_KEY=csms-app
# MINIO_SECRET_KEY=SecureAppPassword123!
```

---

## 8. Application Deployment

### 8.1 Build Application

```bash
# Navigate to application directory
cd /var/www/csms

# Build Next.js application
npm run build

# Verify build
ls -la .next/
ls -la .next/server/
```

### 8.2 Configure PM2

Create PM2 ecosystem file:
```bash
nano ecosystem.config.js
```

**Add the following configuration**:
```javascript
module.exports = {
  apps: [{
    name: 'csms-production',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/csms',
    instances: 4, // Adjust based on CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 9002
    },
    error_file: '/var/log/csms/error.log',
    out_file: '/var/log/csms/out.log',
    log_file: '/var/log/csms/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 5000,
    kill_timeout: 5000,
    wait_ready: true,
    shutdown_with_message: true,
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.next/cache'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 8.3 Create Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/csms

# Set permissions
sudo chown -R $USER:$USER /var/log/csms
```

### 8.4 Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs csms-production --lines 50

# Monitor
pm2 monit
```

### 8.5 Configure PM2 Startup

```bash
# Generate startup script
pm2 startup

# This will output a command like:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

# Run the generated command (copy-paste from output)
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

# Save PM2 process list
pm2 save

# Verify
sudo systemctl status pm2-$USER
```

---

## 9. Verification Steps

### 9.1 Service Status Checks

```bash
# Check all services
sudo systemctl status postgresql
sudo systemctl status minio
sudo systemctl status nginx
sudo systemctl status pm2-$USER

# Check PM2 application
pm2 status
```

### 9.2 Network Connectivity Checks

```bash
# Check if services are listening
sudo netstat -tulpn | grep -E ':(80|443|5432|9000|9001|9002)'

# Or using ss
sudo ss -tulpn | grep -E ':(80|443|5432|9000|9001|9002)'

# Expected output:
# tcp   0.0.0.0:80       (nginx)
# tcp   0.0.0.0:443      (nginx)
# tcp   127.0.0.1:5432   (postgres)
# tcp   0.0.0.0:9000     (minio)
# tcp   0.0.0.0:9001     (minio)
# tcp   127.0.0.1:9002   (node)
```

### 9.3 Health Endpoint Checks

```bash
# Check application health (local)
curl http://localhost:9002/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Check database health
curl http://localhost:9002/api/health/db
# Expected: {"status":"ok","database":"connected"}

# Check MinIO health
curl http://localhost:9000/minio/health/live
# Expected: (empty response with 200 status)

# Check application via Nginx (HTTP - should redirect to HTTPS)
curl -I http://localhost
# Expected: 301 Moved Permanently

# Check application via Nginx (HTTPS with self-signed cert)
curl -k https://localhost
# Expected: HTML content
```

### 9.4 Database Connection Test

```bash
# Test database connection
psql -U csms_user -d nody -h localhost -c "SELECT COUNT(*) FROM \"User\";"

# Expected: Count of users in database
```

### 9.5 MinIO Connection Test

```bash
# Test MinIO connection
mc ls csms-local/csms-documents

# Expected: Empty or list of files
```

### 9.6 Functional Testing

#### 9.6.1 Access Web Interface

```bash
# Get server IP
ip addr show | grep inet

# Access from browser (replace with your server IP or domain)
# http://[SERVER_IP]  (should redirect to HTTPS)
# https://[SERVER_IP] (with certificate warning if using self-signed)
```

#### 9.6.2 Test Login

1. Open browser to: `https://csms.zanajira.go.tz`
2. You should see the CSMS login page
3. Try logging in with default admin credentials (if seeded)

#### 9.6.3 Test File Upload

1. Log in to the system
2. Navigate to a form that allows file upload
3. Upload a test PDF file (< 2MB)
4. Verify file appears in MinIO:
```bash
mc ls csms-local/csms-documents
```

### 9.7 Performance Testing

```bash
# Install Apache Bench (if not installed)
sudo apt install -y apache2-utils

# Run basic load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:9002/api/health

# Check response time (should be < 2 seconds)
curl -w "@-" -o /dev/null -s http://localhost:9002/api/health <<'EOF'
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
      time_redirect:  %{time_redirect}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                    ----------\n
         time_total:  %{time_total}s\n
EOF
```

### 9.8 Security Testing

```bash
# Check SSL/TLS configuration (after SSL certificate is installed)
# Using SSL Labs: https://www.ssllabs.com/ssltest/
# Or using testssl.sh
# git clone https://github.com/drwetter/testssl.sh.git
# cd testssl.sh
# ./testssl.sh https://csms.zanajira.go.tz

# Check for open ports
sudo nmap localhost

# Check firewall rules
sudo ufw status verbose
```

### 9.9 Log Verification

```bash
# Check Nginx access logs
sudo tail -f /var/log/nginx/csms-access.log

# Check Nginx error logs
sudo tail -f /var/log/nginx/csms-error.log

# Check application logs
pm2 logs csms-production --lines 100

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Check MinIO logs
sudo journalctl -u minio -f
```

---

## 10. Post-Installation Configuration

### 10.1 SSL/TLS Certificate Installation

#### 10.1.1 Obtain Let's Encrypt Certificate

```bash
# Stop Nginx temporarily (if using standalone mode)
# sudo systemctl stop nginx

# Obtain certificate using Certbot (with Nginx plugin)
sudo certbot --nginx -d csms.zanajira.go.tz -d www.csms.zanajira.go.tz

# Follow the prompts:
# - Enter email address for renewal notifications
# - Agree to Terms of Service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Certbot will automatically update Nginx configuration

# Verify certificate
sudo certbot certificates
```

#### 10.1.2 Configure Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer

# Or via cron (if systemd timer not available)
sudo crontab -e
# Add line:
# 0 3 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

#### 10.1.3 Verify SSL Configuration

```bash
# Check SSL certificate
echo | openssl s_client -connect csms.zanajira.go.tz:443 2>/dev/null | openssl x509 -noout -dates

# Test HTTPS connection
curl -I https://csms.zanajira.go.tz

# Test SSL/TLS (using external tool)
# https://www.ssllabs.com/ssltest/analyze.html?d=csms.zanajira.go.tz
```

### 10.2 Backup Configuration

#### 10.2.1 Database Backup Script

Create backup script:
```bash
sudo mkdir -p /usr/local/bin
sudo nano /usr/local/bin/backup-csms-db.sh
```

**Add the following content**:
```bash
#!/bin/bash

# CSMS Database Backup Script
BACKUP_DIR="/var/backups/csms"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nody"
DB_USER="csms_user"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Dump database
export PGPASSWORD='YourSecurePassword123!'
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz

# Remove old backups
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup
echo "$(date): Database backup completed: ${DB_NAME}_${DATE}.sql.gz" >> $BACKUP_DIR/backup.log
```

**Make executable**:
```bash
sudo chmod +x /usr/local/bin/backup-csms-db.sh
```

#### 10.2.2 Schedule Database Backups

```bash
# Edit crontab
sudo crontab -e

# Add daily backup at 2:00 AM
0 2 * * * /usr/local/bin/backup-csms-db.sh

# Add weekly full backup on Sunday at 3:00 AM
0 3 * * 0 /usr/local/bin/backup-csms-db.sh
```

#### 10.2.3 MinIO Backup Configuration

```bash
# Set up MinIO replication (if you have a second MinIO instance)
# mc admin bucket remote add csms-local/csms-documents \
#   https://backup-minio:9000/csms-documents-backup \
#   --service replication --region us-east-1

# Or schedule periodic backup to external storage
sudo nano /usr/local/bin/backup-csms-minio.sh
```

**Add the following content**:
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/csms/minio"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# Mirror MinIO bucket to local backup
mc mirror csms-local/csms-documents $BACKUP_DIR/csms-documents-$DATE

# Create tarball
tar -czf $BACKUP_DIR/csms-documents-${DATE}.tar.gz -C $BACKUP_DIR csms-documents-$DATE
rm -rf $BACKUP_DIR/csms-documents-$DATE

# Remove old backups
find $BACKUP_DIR -name "csms-documents-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): MinIO backup completed: csms-documents-${DATE}.tar.gz" >> $BACKUP_DIR/backup.log
```

**Make executable and schedule**:
```bash
sudo chmod +x /usr/local/bin/backup-csms-minio.sh

# Add to crontab (weekly backup on Saturday at 3:00 AM)
sudo crontab -e
# Add line:
# 0 3 * * 6 /usr/local/bin/backup-csms-minio.sh
```

### 10.3 Monitoring Setup

#### 10.3.1 Basic Monitoring with PM2

```bash
# Install PM2 web dashboard (optional)
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true

# View monitoring dashboard
pm2 monit
```

#### 10.3.2 System Resource Monitoring

Create monitoring script:
```bash
sudo nano /usr/local/bin/monitor-csms.sh
```

**Add the following content**:
```bash
#!/bin/bash

# CSMS Monitoring Script
LOG_FILE="/var/log/csms/monitoring.log"

echo "=== CSMS System Monitoring - $(date) ===" >> $LOG_FILE

# Check disk usage
echo "Disk Usage:" >> $LOG_FILE
df -h | grep -E '(Filesystem|/dev/)' >> $LOG_FILE

# Check memory usage
echo "Memory Usage:" >> $LOG_FILE
free -h >> $LOG_FILE

# Check CPU load
echo "CPU Load:" >> $LOG_FILE
uptime >> $LOG_FILE

# Check service status
echo "Service Status:" >> $LOG_FILE
systemctl is-active postgresql >> $LOG_FILE
systemctl is-active minio >> $LOG_FILE
systemctl is-active nginx >> $LOG_FILE
pm2 status >> $LOG_FILE

echo "=======================================" >> $LOG_FILE
echo "" >> $LOG_FILE
```

**Make executable and schedule**:
```bash
sudo chmod +x /usr/local/bin/monitor-csms.sh

# Add to crontab (every 6 hours)
crontab -e
# Add line:
# 0 */6 * * * /usr/local/bin/monitor-csms.sh
```

### 10.4 Security Hardening

#### 10.4.1 Fail2Ban Configuration

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create CSMS jail configuration
sudo nano /etc/fail2ban/jail.d/csms.conf
```

**Add the following content**:
```ini
[csms-auth]
enabled = true
port = http,https
filter = csms-auth
logpath = /var/log/nginx/csms-access.log
maxretry = 5
bantime = 3600
findtime = 600
```

**Create filter**:
```bash
sudo nano /etc/fail2ban/filter.d/csms-auth.conf
```

**Add the following content**:
```ini
[Definition]
failregex = ^<HOST> .* "POST /api/auth/login HTTP.*" 401
ignoreregex =
```

**Restart Fail2Ban**:
```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status csms-auth
```

#### 10.4.2 Additional Security Measures

```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (if using SSH keys)

# Restart SSH
sudo systemctl restart ssh

# Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 11. Troubleshooting

### 11.1 Common Issues and Solutions

#### 11.1.1 Application Won't Start

**Symptoms**: PM2 shows app as "errored" or constantly restarting

**Diagnosis**:
```bash
# Check PM2 logs
pm2 logs csms-production --lines 100

# Check if port is already in use
sudo netstat -tulpn | grep 9002

# Check if .env.local exists and is readable
ls -la /var/www/csms/.env.local
cat /var/www/csms/.env.local
```

**Solutions**:
```bash
# If port is in use, kill the process
sudo kill -9 $(sudo lsof -t -i:9002)

# If .env.local is missing, create it (see section 6.4)
cd /var/www/csms
nano .env.local

# If dependencies are missing
npm ci --only=production

# If Prisma client is not generated
npx prisma generate

# Rebuild application
npm run build

# Restart PM2
pm2 restart csms-production
```

#### 11.1.2 Database Connection Errors

**Symptoms**: "Can't reach database server" or "Connection refused"

**Diagnosis**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -U csms_user -d nody -h localhost

# Check DATABASE_URL in .env.local
grep DATABASE_URL /var/www/csms/.env.local

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

**Solutions**:
```bash
# If PostgreSQL is not running
sudo systemctl start postgresql

# If password is incorrect, reset it
sudo -u postgres psql
ALTER USER csms_user WITH PASSWORD 'NewSecurePassword123!';
\q

# Update DATABASE_URL in .env.local
nano /var/www/csms/.env.local
# Update password in connection string

# If database doesn't exist
sudo -u postgres createdb nody -O csms_user

# Run migrations
cd /var/www/csms
npx prisma migrate deploy

# Restart application
pm2 restart csms-production
```

#### 11.1.3 MinIO Connection Errors

**Symptoms**: "Unable to connect to MinIO" or "Access Denied"

**Diagnosis**:
```bash
# Check MinIO status
sudo systemctl status minio

# Test MinIO connection
curl http://localhost:9000/minio/health/live

# Check MinIO credentials
grep MINIO /var/www/csms/.env.local

# Test with mc
mc ls csms-local
```

**Solutions**:
```bash
# If MinIO is not running
sudo systemctl start minio

# Check MinIO logs
sudo journalctl -u minio -f

# Verify MinIO configuration
cat /etc/default/minio

# Recreate bucket
mc mb csms-local/csms-documents

# Update credentials in .env.local if needed
nano /var/www/csms/.env.local

# Restart application
pm2 restart csms-production
```

#### 11.1.4 Nginx 502 Bad Gateway

**Symptoms**: Browser shows "502 Bad Gateway" error

**Diagnosis**:
```bash
# Check if application is running
pm2 status

# Check if port 9002 is listening
sudo netstat -tulpn | grep 9002

# Check Nginx error logs
sudo tail -f /var/log/nginx/csms-error.log

# Check Nginx configuration
sudo nginx -t
```

**Solutions**:
```bash
# If application is not running
pm2 start ecosystem.config.js

# If Nginx configuration has errors
sudo nano /etc/nginx/sites-available/csms
# Fix errors
sudo nginx -t
sudo systemctl reload nginx

# If upstream is incorrect
# Verify proxy_pass in Nginx config points to localhost:9002
sudo nano /etc/nginx/sites-available/csms

# Restart services
pm2 restart csms-production
sudo systemctl reload nginx
```

#### 11.1.5 SSL Certificate Errors

**Symptoms**: "Your connection is not private" or certificate warnings

**Diagnosis**:
```bash
# Check certificate
sudo certbot certificates

# Check Nginx SSL configuration
sudo nano /etc/nginx/sites-available/csms

# Test SSL
echo | openssl s_client -connect csms.zanajira.go.tz:443 2>/dev/null | openssl x509 -noout -dates
```

**Solutions**:
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx

# If certificate expired
sudo certbot certonly --nginx -d csms.zanajira.go.tz -d www.csms.zanajira.go.tz

# Update Nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

#### 11.1.6 File Upload Failures

**Symptoms**: File upload returns error or times out

**Diagnosis**:
```bash
# Check Nginx client_max_body_size
grep client_max_body_size /etc/nginx/sites-available/csms

# Check MinIO bucket permissions
mc stat csms-local/csms-documents

# Check application logs
pm2 logs csms-production | grep -i upload

# Check disk space
df -h
```

**Solutions**:
```bash
# Increase Nginx upload limit
sudo nano /etc/nginx/sites-available/csms
# Set: client_max_body_size 10M;
sudo nginx -t
sudo systemctl reload nginx

# Check MinIO bucket policy
mc anonymous get csms-local/csms-documents

# If disk is full
# Clean up old files, logs, backups
sudo du -sh /var/* | sort -rh | head -10
# Remove old files

# Restart services
pm2 restart csms-production
sudo systemctl restart minio
```

#### 11.1.7 High Memory Usage

**Symptoms**: Server slow, out of memory errors

**Diagnosis**:
```bash
# Check memory usage
free -h
pm2 monit

# Check process memory
ps aux --sort=-%mem | head -10

# Check swap usage
swapon --show
```

**Solutions**:
```bash
# Reduce PM2 instances
pm2 scale csms-production 2

# Add swap space (if not already configured)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Restart application with lower instances
nano /var/www/csms/ecosystem.config.js
# Change: instances: 2
pm2 restart csms-production

# Configure max_memory_restart in ecosystem.config.js
# max_memory_restart: '800M'
```

#### 11.1.8 HRIMS Integration Issues

**Symptoms**: Cannot fetch employee data from HRIMS

**Diagnosis**:
```bash
# Check HRIMS configuration
grep HRIMS /var/www/csms/.env.local

# Test HRIMS API connectivity
curl -I https://hrims-api.zanzibar.go.tz

# Check application logs
pm2 logs csms-production | grep -i hrims
```

**Solutions**:
```bash
# Enable mock mode temporarily
nano /var/www/csms/.env.local
# Set: HRIMS_MOCK_MODE=true

# Restart application
pm2 restart csms-production

# Verify API key with HRIMS support
# Contact: support@hrims.zanzibar.go.tz

# Test with curl
curl -H "Authorization: Bearer YOUR_API_KEY" https://hrims-api.zanzibar.go.tz/api/employees

# Update API key if needed
nano /var/www/csms/.env.local
pm2 restart csms-production
```

### 11.2 Diagnostic Commands

```bash
# System Information
uname -a
lsb_release -a
hostnamectl

# Resource Usage
htop
df -h
free -h
iostat

# Network
ip addr show
ss -tulpn
curl -I https://csms.zanajira.go.tz

# Services
sudo systemctl status postgresql minio nginx
pm2 status

# Logs
sudo journalctl -xe
sudo tail -f /var/log/syslog
sudo tail -f /var/log/nginx/csms-error.log
pm2 logs csms-production --lines 100

# Database
sudo -u postgres psql -c "SELECT version();"
psql -U csms_user -d nody -h localhost -c "SELECT COUNT(*) FROM \"User\";"

# MinIO
mc admin info csms-local
mc ls csms-local/csms-documents

# Application
curl http://localhost:9002/api/health
curl http://localhost:9002/api/health/db
```

### 11.3 Getting Help

If you cannot resolve the issue:

1. **Check Documentation**:
   - User Manual: `/home/latest/docs/User_Manual.md`
   - Administrator Manual: `/home/latest/docs/Administrator_Manual.md`
   - Quick Start Guide: `/home/latest/docs/Quick_Start_Guide.md`

2. **Collect Information**:
   ```bash
   # Create diagnostic report
   mkdir -p ~/csms-diagnostic
   pm2 logs csms-production --lines 200 > ~/csms-diagnostic/app-logs.txt
   sudo journalctl -u postgresql -n 200 > ~/csms-diagnostic/postgres-logs.txt
   sudo journalctl -u minio -n 200 > ~/csms-diagnostic/minio-logs.txt
   sudo tail -n 200 /var/log/nginx/csms-error.log > ~/csms-diagnostic/nginx-logs.txt
   df -h > ~/csms-diagnostic/disk-usage.txt
   free -h > ~/csms-diagnostic/memory-usage.txt
   pm2 status > ~/csms-diagnostic/pm2-status.txt
   tar -czf ~/csms-diagnostic-$(date +%Y%m%d).tar.gz ~/csms-diagnostic/
   ```

3. **Contact Support**:
   - Email: support@csms.zanajira.go.tz
   - Phone: +255-XXX-XXXX
   - Include: diagnostic report, error messages, steps to reproduce

---

## 12. Maintenance and Updates

### 12.1 Regular Maintenance Tasks

#### 12.1.1 Daily Tasks
- [ ] Check application status: `pm2 status`
- [ ] Review error logs: `pm2 logs csms-production --lines 50 | grep -i error`
- [ ] Monitor disk usage: `df -h`

#### 12.1.2 Weekly Tasks
- [ ] Review all logs for errors
- [ ] Check backup completion
- [ ] Monitor database size
- [ ] Review security logs
- [ ] Check SSL certificate expiration

#### 12.1.3 Monthly Tasks
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Review and archive old logs
- [ ] Database maintenance: `VACUUM` and `ANALYZE`
- [ ] Review user accounts and permissions
- [ ] Test backup restoration
- [ ] Performance review and optimization

### 12.2 Updating the Application

```bash
# Backup current version
cd /var/www
tar -czf csms-backup-$(date +%Y%m%d).tar.gz csms/

# Navigate to application directory
cd /var/www/csms

# Pull latest code
git fetch --all
git checkout production
git pull origin production

# Install new dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Restart application
pm2 restart csms-production

# Monitor logs
pm2 logs csms-production --lines 50

# Verify health
curl http://localhost:9002/api/health
```

### 12.3 Database Maintenance

```bash
# Connect to database
sudo -u postgres psql -d nody

# Analyze database
ANALYZE;

# Vacuum database
VACUUM VERBOSE ANALYZE;

# Check database size
SELECT pg_size_pretty(pg_database_size('nody'));

# Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

# Exit
\q
```

### 12.4 Log Rotation

```bash
# Configure log rotation for Nginx
sudo nano /etc/logrotate.d/nginx

# Add or verify:
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}

# Configure log rotation for CSMS application
sudo nano /etc/logrotate.d/csms

# Add:
/var/log/csms/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

# Test log rotation
sudo logrotate -d /etc/logrotate.d/csms
```

---

## Appendices

### Appendix A: Quick Reference

#### Essential Commands
```bash
# Start services
sudo systemctl start postgresql minio nginx
pm2 start ecosystem.config.js

# Stop services
pm2 stop csms-production
sudo systemctl stop nginx minio postgresql

# Restart services
pm2 restart csms-production
sudo systemctl restart nginx

# Check status
pm2 status
sudo systemctl status postgresql minio nginx

# View logs
pm2 logs csms-production
sudo journalctl -u minio -f
sudo tail -f /var/log/nginx/csms-error.log

# Health checks
curl http://localhost:9002/api/health
curl http://localhost:9000/minio/health/live
psql -U csms_user -d nody -h localhost -c "SELECT 1;"
```

### Appendix B: Port Reference

| Port | Service | Access | Description |
|------|---------|--------|-------------|
| 22 | SSH | Restricted | Remote administration |
| 80 | HTTP | Public | Redirects to HTTPS |
| 443 | HTTPS | Public | Web application |
| 5432 | PostgreSQL | Localhost | Database server |
| 9000 | MinIO API | Localhost | Object storage |
| 9001 | MinIO Console | Restricted | MinIO admin interface |
| 9002 | Next.js | Localhost | Application server |

### Appendix C: File Locations

| Component | Location |
|-----------|----------|
| Application | `/var/www/csms` |
| Configuration | `/var/www/csms/.env.local` |
| Nginx Config | `/etc/nginx/sites-available/csms` |
| PostgreSQL Data | `/var/lib/postgresql/14/main` |
| MinIO Data | `/mnt/minio-data` |
| Application Logs | `/var/log/csms/` |
| Nginx Logs | `/var/log/nginx/` |
| PostgreSQL Logs | `/var/log/postgresql/` |
| Backups | `/var/backups/csms/` |
| SSL Certificates | `/etc/letsencrypt/live/csms.zanajira.go.tz/` |

### Appendix D: Environment Variables Reference

See section 6.4 for complete list.

---

**Document End**

---

**For technical support regarding this installation, contact:**

**CSMS Technical Team**
Email: support@csms.zanajira.go.tz
Phone: +255-XXX-XXXX
Office: IT Department, Government Building

**Revolutionary Government of Zanzibar**
**Civil Service Management System (CSMS)**
**Version 1.0 | January 2025**

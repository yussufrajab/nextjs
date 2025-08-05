#!/bin/bash

# Ubuntu VPS Setup Script for Prisma PostgreSQL Database Migration
# This script sets up Ubuntu VPS with PostgreSQL, Node.js, and Prisma requirements

set -e

echo "=== Ubuntu VPS Setup for Prisma Database Migration ==="
echo "This script will install:"
echo "- PostgreSQL 15"
echo "- Node.js 18 LTS"
echo "- npm/npx"
echo "- Essential build tools"
echo

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Install PostgreSQL 15
echo "🗄️ Installing PostgreSQL 15..."
sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# Start and enable PostgreSQL
echo "🚀 Starting PostgreSQL service..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Node.js 18 LTS
echo "📦 Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
echo "✅ Verifying installations..."
echo "PostgreSQL version:"
sudo -u postgres psql -c "SELECT version();"

echo "Node.js version:"
node --version

echo "npm version:"
npm --version

# Configure PostgreSQL
echo "🔧 Configuring PostgreSQL..."

# Create database user (if not exists)
sudo -u postgres psql -c "CREATE USER nody_user WITH PASSWORD 'your_secure_password_here';" || echo "User might already exist"

# Create database
sudo -u postgres psql -c "CREATE DATABASE nody OWNER nody_user;" || echo "Database might already exist"

# Grant privileges
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nody TO nody_user;"
sudo -u postgres psql -c "ALTER USER nody_user CREATEDB;"

# Configure PostgreSQL for connections
echo "🔧 Configuring PostgreSQL for connections..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/15/main/postgresql.conf

# Add authentication rule for the nody_user
echo "host nody nody_user 127.0.0.1/32 md5" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

# Install Prisma CLI globally
echo "📦 Installing Prisma CLI..."
sudo npm install -g prisma

# Create working directory for the application
echo "📁 Creating application directory..."
mkdir -p /home/$USER/csms-app
cd /home/$USER/csms-app

# Set proper permissions
sudo chown -R $USER:$USER /home/$USER/csms-app

echo
echo "=== Setup Complete! ==="
echo "✅ PostgreSQL 15 installed and running"
echo "✅ Node.js 18 LTS installed"
echo "✅ Prisma CLI installed globally"
echo "✅ Database 'nody' created with user 'nody_user'"
echo "✅ Application directory created at /home/$USER/csms-app"
echo
echo "🔐 IMPORTANT: Change the default password!"
echo "Run: sudo -u postgres psql -c \"ALTER USER nody_user PASSWORD 'your_new_secure_password';\""
echo
echo "📋 Next steps:"
echo "1. Change the database password"
echo "2. Transfer your Prisma files to /home/$USER/csms-app"
echo "3. Set up your .env file with DATABASE_URL"
echo "4. Run prisma migrate deploy"
echo
echo "🌐 Database connection string format:"
echo "DATABASE_URL=\"postgresql://nody_user:your_password@localhost:5432/nody\""
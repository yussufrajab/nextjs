#!/bin/bash

# Prisma Database Restore Script for Ubuntu VPS
# This script restores the nody database using Prisma migrations (recommended approach)

set -e

# Configuration
DB_NAME="nody"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
APP_DIR="/www/wwwroot/nexxt/beky/scripts"
BACKUP_DIR="./backups"

echo "=== Prisma Database Restore Script ==="
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "App Directory: $APP_DIR"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run this script from your Next.js project directory."
  exit 1
fi

# Check if Prisma files exist
if [ ! -f "prisma/schema.prisma" ]; then
  echo "❌ Error: Prisma schema not found. Please ensure Prisma files are extracted."
  exit 1
fi

if [ ! -d "prisma/migrations" ]; then
  echo "❌ Error: Prisma migrations directory not found."
  exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found. Please create it with DATABASE_URL."
  exit 1
fi

# Verify DATABASE_URL is set
if ! grep -q "DATABASE_URL" .env; then
  echo "❌ Error: DATABASE_URL not found in .env file."
  exit 1
fi

echo "✅ Prisma files and configuration found."

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Check database connection
echo "🔍 Checking database connection..."
npx prisma db ping

if [ $? -ne 0 ]; then
  echo "❌ Database connection failed. Please check your DATABASE_URL and ensure PostgreSQL is running."
  exit 1
fi

echo "✅ Database connection successful."

# Option 1: Deploy migrations (recommended for production)
echo "🚀 Deploying Prisma migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations deployed successfully!"
else
  echo "❌ Migration deployment failed!"
  exit 1
fi

# Check migration status
echo "📋 Checking migration status..."
npx prisma migrate status

# Option to seed the database (if seed file exists)
if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
  echo
  read -p "🌱 Seed file found. Do you want to seed the database? (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
    
    if [ $? -eq 0 ]; then
      echo "✅ Database seeded successfully!"
    else
      echo "❌ Database seeding failed!"
    fi
  fi
fi

# Verify tables were created
echo "🔍 Verifying database structure..."
npx prisma db pull --print

echo
echo "=== Restore Complete! ==="
echo "✅ Prisma migrations deployed successfully"
echo "✅ Database structure verified"
echo "✅ Prisma client generated"
echo
echo "📋 Database Information:"
echo "- Database: $DB_NAME"
echo "- User: $DB_USER"
echo "- Host: $DB_HOST:$DB_PORT"
echo
echo "🔧 Useful commands:"
echo "- View data: npx prisma studio"
echo "- Reset DB: npx prisma migrate reset"
echo "- Generate client: npx prisma generate"
echo "- Deploy migrations: npx prisma migrate deploy"
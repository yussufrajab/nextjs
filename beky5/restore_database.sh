#!/bin/bash

# Database Restoration Script for VPS
# Usage: ./restore_database.sh

set -e  # Exit on any error

echo "🔄 Starting database restoration process..."

# Database credentials
DB_HOST="localhost"
DB_USER="postgres"
DB_PASSWORD="Mamlaka2020"
DB_NAME="nody"

# Set PGPASSWORD to avoid password prompts
export PGPASSWORD=$DB_PASSWORD

echo "📋 Step 1: Checking if database exists..."
if psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "⚠️  Database '$DB_NAME' exists. Terminating active connections..."
    
    # Terminate all connections to the database
    psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();"
    
    echo "🗑️  Dropping database '$DB_NAME'..."
    dropdb -h $DB_HOST -U $DB_USER $DB_NAME
fi

echo "🗄️  Step 2: Creating new database '$DB_NAME'..."
createdb -h $DB_HOST -U $DB_USER $DB_NAME

echo "📥 Step 3: Restoring database from backup..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f nody_backup.sql

#echo "📦 Step 4: Installing Node.js dependencies..."
#npm install --legacy-peer-deps

echo "🔧 Step 5: Setting up Prisma..."
# Create .env file with VPS credentials
echo 'DATABASE_URL="postgresql://postgres:Mamlaka2020@localhost:5432/nody?schema=public"' > .env

# Generate Prisma client
npx prisma generate

echo "✅ Step 6: Verifying database connection..."
npx prisma db pull --force

echo "🎉 Database restoration completed successfully!"
echo "📍 Database URL: postgresql://postgres:Mamlaka2020@localhost:5432/nody"
echo "🚀 You can now start your application with: npm run dev or npm start"

# Clean up
unset PGPASSWORD
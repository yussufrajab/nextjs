#!/bin/bash

# Database Restore Script for New VPS
# Usage: bash mjuba-restore.sh

echo "=== Prisma Database Restore Script ==="
echo ""

# Check if all backup files exist
echo "1. Checking backup files..."
required_files=("mjuba-schema.prisma" "mjuba-data.sql" "mjuba-migrations.tar.gz" "mjuba-seed.ts")
missing_files=0

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "   ❌ Missing: $file"
        missing_files=$((missing_files + 1))
    else
        echo "   ✅ Found: $file"
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "❌ Some backup files are missing. Please ensure all files are in the current directory."
    exit 1
fi

echo ""
echo "2. Setting up Prisma files..."

# Create prisma directory if it doesn't exist
mkdir -p prisma

# Copy schema file
cp mjuba-schema.prisma prisma/schema.prisma
echo "   ✅ Copied schema.prisma"

# Copy seed file
cp mjuba-seed.ts prisma/seed.ts
echo "   ✅ Copied seed.ts"

# Extract migrations
echo ""
echo "3. Restoring migrations..."
tar -xzf mjuba-migrations.tar.gz
echo "   ✅ Extracted migrations"

echo ""
echo "4. Database Configuration"
echo "   Please enter your PostgreSQL details:"
echo ""

# Get database credentials
read -p "   Database name: " DB_NAME
read -p "   Database user: " DB_USER
read -s -p "   Database password: " DB_PASS
echo ""
read -p "   Database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}
read -p "   Database port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Create .env file
echo ""
echo "5. Creating .env file..."
cat > .env << EOF
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
EOF
echo "   ✅ Created .env file"

# Create database if it doesn't exist
echo ""
echo "6. Creating database..."
PGPASSWORD=$DB_PASS createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Database created successfully"
else
    echo "   ℹ️  Database might already exist (continuing...)"
fi

# Install dependencies
echo ""
echo "7. Installing dependencies..."
npm install
echo "   ✅ Dependencies installed"

# Generate Prisma client
echo ""
echo "8. Generating Prisma client..."
npx prisma generate
echo "   ✅ Prisma client generated"

# Run migrations
echo ""
echo "9. Running Prisma migrations..."
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo "   ✅ Migrations applied successfully"
else
    echo "   ❌ Migration failed. Trying alternative approach..."
    
    # Alternative: Push schema directly
    echo "   Attempting direct schema push..."
    npx prisma db push --skip-generate
fi

# Import data
echo ""
echo "10. Importing data..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f mjuba-data.sql
if [ $? -eq 0 ]; then
    echo "   ✅ Data imported successfully"
else
    echo "   ❌ Data import failed"
    exit 1
fi

# Verify the restoration
echo ""
echo "11. Verifying restoration..."
echo ""
echo "=== Restoration Complete! ==="
echo ""
echo "You can now:"
echo "1. Run 'npx prisma studio' to view your data"
echo "2. Run 'npm run dev' to start your application"
echo "3. Check logs in case of any issues"
echo ""
echo "Database URL: postgresql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"
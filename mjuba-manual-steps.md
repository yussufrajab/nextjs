# Manual Restoration Steps

## On Your New VPS

### 1. Upload Backup Files
Transfer these files to your new VPS:
```
mjuba-schema.prisma
mjuba-data.sql
mjuba-migrations.tar.gz
mjuba-seed.ts
mjuba-restore.sh
```

### 2. Option A: Automated Restore (Recommended)
```bash
# Make script executable
chmod +x mjuba-restore.sh

# Run the restore script
bash mjuba-restore.sh
```

### 3. Option B: Manual Steps

#### Setup Project
```bash
# Install dependencies
npm install

# Create prisma directory
mkdir -p prisma

# Copy schema
cp mjuba-schema.prisma prisma/schema.prisma

# Copy seed file
cp mjuba-seed.ts prisma/seed.ts

# Extract migrations
tar -xzf mjuba-migrations.tar.gz
```

#### Database Setup
```bash
# Create database
createdb your_database_name

# Update .env file
echo 'DATABASE_URL="postgresql://user:pass@localhost:5432/your_db?schema=public"' > .env
```

#### Apply Prisma Schema
```bash
# Generate client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Import data
psql -d your_database_name -f mjuba-data.sql
```

#### Verify
```bash
# Check connection
npx prisma db pull

# View data
npx prisma studio

# Start app
npm run dev
```

## Troubleshooting

### If migrations fail:
```bash
npx prisma migrate reset
npx prisma migrate deploy
```

### If schema conflicts:
```bash
npx prisma db push --skip-generate
```

### Check migration status:
```bash
npx prisma migrate status
```

### Reset and reimport:
```bash
npx prisma migrate reset --force
psql -d your_db -f mjuba-data.sql
```
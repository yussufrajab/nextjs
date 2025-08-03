# Database Restore Instructions for VPS Migration

## Files Created for Backup
- `mjuba-schema.prisma` - Prisma schema file
- `mjuba-data.sql` - Database data with INSERT statements
- `mjuba-schema.sql` - Database schema only
- `mjuba-migrations.tar.gz` - Migration history
- `mjuba-seed.ts` - Seed file
- `mjuba.sql` - Complete database dump (alternative)

## Recommended Restore Process for New VPS

### Method 1: Using Prisma (Recommended)

1. **Setup the new Next.js project on VPS**
   ```bash
   # Clone/copy your Next.js project
   npm install
   ```

2. **Copy Prisma files**
   ```bash
   # Copy schema
   cp mjuba-schema.prisma prisma/schema.prisma
   
   # Copy seed file
   cp mjuba-seed.ts prisma/seed.ts
   
   # Extract and copy migrations
   tar -xzf mjuba-migrations.tar.gz
   cp -r prisma/migrations/* ./prisma/migrations/
   ```

3. **Setup database on new VPS**
   ```bash
   # Create new PostgreSQL database
   createdb your_database_name
   
   # Update .env file with new database credentials
   DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name?schema=public"
   ```

4. **Run Prisma migrations**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Apply migrations to create schema
   npx prisma migrate deploy
   ```

5. **Import data**
   ```bash
   # Import the data using psql
   PGPASSWORD=your_password psql -h localhost -U username -d your_database_name -f mjuba-data.sql
   ```

### Method 2: Direct Database Restore (Alternative)

1. **Create database on new VPS**
   ```bash
   createdb your_database_name
   ```

2. **Restore complete database**
   ```bash
   PGPASSWORD=your_password psql -h localhost -U username -d your_database_name -f mjuba.sql
   ```

3. **Update Prisma**
   ```bash
   # Copy schema
   cp mjuba-schema.prisma prisma/schema.prisma
   
   # Generate client
   npx prisma generate
   
   # Mark migrations as applied (if needed)
   npx prisma migrate resolve --applied "20250712105050_init"
   ```

## Important Notes

1. **Environment Variables**: Update `.env` file with new database credentials
2. **Migration State**: The backup includes migration history to maintain Prisma state
3. **Data Integrity**: Use Method 1 for better Prisma integration
4. **Permissions**: Ensure proper PostgreSQL user permissions on new VPS
5. **Dependencies**: Install all required dependencies with `npm install`

## Verification Steps

After restore, verify the setup:
```bash
# Check database connection
npx prisma db pull

# Verify data
npx prisma studio

# Test application
npm run dev
```

## Troubleshooting

- If migrations fail, reset and reapply:
  ```bash
  npx prisma migrate reset
  npx prisma migrate deploy
  ```
- For schema conflicts, use `npx prisma db push` to sync schema
- Check PostgreSQL logs for connection issues
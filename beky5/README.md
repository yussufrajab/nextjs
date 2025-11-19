# Database Restoration Instructions

## Prerequisites on VPS
- PostgreSQL installed and running
- Node.js and npm installed
- Git (optional, for cloning)

## Files Required in beky5 folder
- `nody_backup.sql` - Database backup file
- `schema.prisma` - Prisma schema file
- `package.json` - Node.js dependencies
- `.env` - Environment variables (will be created by script)

## Restoration Steps

### For Linux/Unix VPS:
1. Copy the `beky5` folder to your VPS
2. Navigate to the beky5 directory
3. Make the script executable:
   ```bash
   chmod +x restore_database.sh
   ```
4. Run the restoration script:
   ```bash
   ./restore_database.sh
   ```

### For Windows VPS:
1. Copy the `beky5` folder to your VPS
2. Navigate to the beky4 directory
3. Run the restoration script:
   ```cmd
   restore_database.bat
   ```

## Manual Steps (if scripts fail)

1. **Create Database:**
   ```bash
   createdb -h localhost -U postgres nody
   ```

2. **Restore Data:**
   ```bash
   psql -h localhost -U postgres -d nody -f nody_backup.sql
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Setup Environment:**
   ```bash
   echo 'DATABASE_URL="postgresql://postgres:Mamlaka2020@localhost:5432/nody?schema=public"' > .env
   ```

5. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

6. **Verify Connection:**
   ```bash
   npx prisma db pull --force
   ```

## Troubleshooting

- Ensure PostgreSQL is running: `sudo systemctl status postgresql`
- Check database connection: `psql -h localhost -U postgres -d nody -c "SELECT 1;"`
- Verify Prisma schema: `npx prisma validate`

## Post-Restoration

After successful restoration, you can:
- Start development server: `npm run dev`
- Start production server: `npm start`
- Run database migrations: `npx prisma migrate deploy`
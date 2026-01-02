# Automated Employee Photo Fetching Script

This script automatically fetches employee photos from HRIMS for all institutions and stores them in the database.

## Features

- Fetch photos for all institutions or specific institution
- Skip employees who already have photos
- Configurable delay between requests
- Batch processing support
- Dry run mode for testing
- Detailed logging with JSON export
- Progress tracking and error handling

## Usage

### Basic Usage

Fetch photos for all employees in all institutions:

```bash
npx tsx scripts/fetch-all-photos.ts
```

Or use the bash wrapper:

```bash
./scripts/fetch-photos.sh
```

### Command Line Options

```bash
npx tsx scripts/fetch-all-photos.ts [options]

Options:
  --institution-id <id>    Fetch photos for a specific institution only
  --skip-existing          Skip employees who already have photos
  --delay <ms>             Delay between requests in milliseconds (default: 100)
  --batch-size <n>         Number of employees to process (default: all)
  --dry-run                Show what would be done without making changes
  --help, -h               Show help message
```

### Examples

#### Fetch photos for all institutions
```bash
npx tsx scripts/fetch-all-photos.ts
```

#### Fetch photos for a specific institution
```bash
npx tsx scripts/fetch-all-photos.ts --institution-id abc123
```

#### Skip employees who already have photos
```bash
npx tsx scripts/fetch-all-photos.ts --skip-existing
```

#### Process only first 50 employees (for testing)
```bash
npx tsx scripts/fetch-all-photos.ts --batch-size 50
```

#### Dry run to see what would happen
```bash
npx tsx scripts/fetch-all-photos.ts --dry-run
```

#### Combine multiple options
```bash
npx tsx scripts/fetch-all-photos.ts --skip-existing --delay 200 --batch-size 100
```

## Setting Up Automated Execution

### Option 1: Run Manually

You can run the script manually whenever needed:

```bash
cd /home/nextjs
npx tsx scripts/fetch-all-photos.ts --skip-existing
```

### Option 2: Cron Job (Scheduled Execution)

#### Daily at 2 AM (Recommended for production)

1. Open crontab:
```bash
crontab -e
```

2. Add this line:
```bash
0 2 * * * cd /home/nextjs && npx tsx scripts/fetch-all-photos.ts --skip-existing >> logs/photo-fetch-cron.log 2>&1
```

#### Weekly on Sunday at 3 AM

```bash
0 3 * * 0 cd /home/nextjs && npx tsx scripts/fetch-all-photos.ts --skip-existing >> logs/photo-fetch-cron.log 2>&1
```

#### Every 6 hours

```bash
0 */6 * * * cd /home/nextjs && npx tsx scripts/fetch-all-photos.ts --skip-existing >> logs/photo-fetch-cron.log 2>&1
```

### Option 3: PM2 Schedule

You can use PM2 to schedule the script:

```bash
pm2 start scripts/fetch-photos.sh --name photo-fetch --cron "0 2 * * *" --no-autorestart
```

This will run the script daily at 2 AM.

To see scheduled jobs:
```bash
pm2 list
```

To stop the scheduled job:
```bash
pm2 stop photo-fetch
pm2 delete photo-fetch
```

## Output and Logging

### Console Output

The script provides detailed console output including:
- Configuration summary
- Institution-by-institution progress
- Employee-by-employee results
- Final statistics

### JSON Log Files

Results are automatically saved to JSON files in the `logs/` directory:

```
logs/photo-fetch-2025-12-09T14-30-00-000Z.json
```

Each file contains:
- Timestamp
- Configuration options used
- Summary statistics
- Detailed results for each employee

### Example Output

```
🚀 Starting Automated Photo Fetch Script

📋 Configuration:
   Institution ID: All institutions
   Skip existing: true
   Delay: 100ms
   Batch size: All
   Dry run: false

📊 Found 25 institution(s) to process

================================================================================
🏢 Processing: Ministry of Education
================================================================================

👥 Found 150 employee(s) to process
   [1/150] 📸 Fetching photo for John Doe (12345)...
   [1/150] ✅ Photo stored for John Doe
   [2/150] 📸 Fetching photo for Jane Smith (12346)...
   [2/150] ✅ Photo stored for Jane Smith
   ...

📊 Institution Summary for Ministry of Education:
   Total: 150
   ✅ Success: 145
   ❌ Failed: 3
   ⚠️  Skipped: 2

================================================================================
🏁 FINAL SUMMARY
================================================================================

📊 Overall Statistics:
   Total Processed: 3500
   ✅ Success: 3450
   ❌ Failed: 25
   ⚠️  Skipped: 25

💾 Results saved to: logs/photo-fetch-2025-12-09T14-30-00-000Z.json

✨ Script completed!
```

## Performance Considerations

### Delay Between Requests

The default delay is 100ms between requests. You can adjust this based on:
- HRIMS server load capacity
- Time constraints
- Network conditions

For faster execution (if HRIMS can handle it):
```bash
npx tsx scripts/fetch-all-photos.ts --delay 50
```

For more conservative execution:
```bash
npx tsx scripts/fetch-all-photos.ts --delay 500
```

### Batch Processing

For large institutions, you might want to process in batches:

```bash
# Process first 100 employees
npx tsx scripts/fetch-all-photos.ts --batch-size 100

# Run again to process next batch (with skip-existing)
npx tsx scripts/fetch-all-photos.ts --batch-size 100 --skip-existing
```

### Estimated Time

With 100ms delay:
- 100 employees: ~10 seconds
- 1,000 employees: ~1.7 minutes
- 5,000 employees: ~8.5 minutes

## Monitoring

### View Cron Job Logs

If running via cron:
```bash
tail -f logs/photo-fetch-cron.log
```

### View PM2 Logs

If running via PM2:
```bash
pm2 logs photo-fetch
```

### Check Recent Results

```bash
ls -lt logs/photo-fetch-*.json | head -5
cat logs/photo-fetch-2025-12-09T14-30-00-000Z.json | jq '.summary'
```

## Troubleshooting

### Script Fails to Run

1. Make sure you're in the project directory:
```bash
cd /home/nextjs
```

2. Check Node.js and dependencies are installed:
```bash
node --version
npm list @prisma/client
```

3. Try running with verbose output:
```bash
npx tsx scripts/fetch-all-photos.ts --dry-run
```

### HRIMS Connection Issues

If you get connection errors:
- Check HRIMS server is accessible: `curl http://10.0.217.11:8135/api`
- Verify API credentials are correct in the script
- Try increasing the timeout
- Increase delay between requests: `--delay 500`

### Database Connection Issues

If you get database errors:
- Check `.env` file has correct DATABASE_URL
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check database connection: `psql $DATABASE_URL`

## Best Practices

1. **Initial Run**: Use `--dry-run` first to see what will happen
2. **Production**: Always use `--skip-existing` to avoid refetching photos
3. **Monitoring**: Check log files regularly
4. **Scheduling**: Run during off-peak hours (e.g., 2 AM)
5. **Testing**: Test on a single institution first with `--institution-id`

## Support

For issues or questions, check:
- Console output for error messages
- JSON log files in `logs/` directory
- PM2 logs if using PM2: `pm2 logs photo-fetch`
- Cron logs if using cron: `logs/photo-fetch-cron.log`

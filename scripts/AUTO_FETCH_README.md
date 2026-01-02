# HRIMS Automatic Fetch Script

## Overview

This script automatically fetches employee data from HRIMS for **all institutions** in the database. It uses the improved pagination system to handle large datasets efficiently.

## Features

✨ **Key Features:**

- ✅ Automatic pagination for large institutions
- ✅ Configurable page size
- ✅ Automatic retry on failures
- ✅ Detailed logging to file
- ✅ Progress tracking
- ✅ Comprehensive error handling
- ✅ Skips institutions without identifiers
- ✅ Pause between institutions to avoid overwhelming the API
- ✅ Final summary with statistics

## Prerequisites

1. **Server Running**: The Next.js server must be running on port 9002

   ```bash
   npm run dev
   ```

2. **Database**: PostgreSQL database must be accessible

3. **Dependencies**: All npm packages must be installed
   ```bash
   npm install
   ```

## Quick Start

### Option 1: Using the Shell Script (Recommended)

```bash
# Make the script executable (first time only)
chmod +x scripts/run-auto-fetch.sh

# Run the script
./scripts/run-auto-fetch.sh
```

### Option 2: Direct Execution

```bash
# Run with tsx
npx tsx scripts/fetch-all-institutions-auto.ts
```

### Option 3: Background Execution (for overnight runs)

```bash
# Run in background and save output
nohup ./scripts/run-auto-fetch.sh > fetch-output.log 2>&1 &

# Check progress
tail -f fetch-output.log

# Or check the detailed log in logs/ directory
tail -f logs/hrims-fetch-*.log
```

## Configuration

Edit the `CONFIG` object in `fetch-all-institutions-auto.ts` to customize:

```typescript
const CONFIG = {
  // API Configuration
  API_URL: 'http://localhost:9002/api/hrims/fetch-by-institution',
  TIMEOUT: 3600000, // 60 minutes per institution

  // Pagination Configuration
  PAGE_SIZE: 100, // Records per page (50-200 recommended)

  // Retry Configuration
  MAX_RETRIES: 2, // Number of retries
  RETRY_DELAY: 30000, // 30 seconds between retries
  ENABLE_RETRIES: true, // Enable/disable retries

  // Flow Control
  PAUSE_BETWEEN_INSTITUTIONS: 15000, // 15 seconds pause

  // Logging
  LOG_DIR: './logs',
  DETAILED_LOGGING: true,
};
```

### Recommended Settings

**For large institutions (1000+ employees):**

```typescript
PAGE_SIZE: 50,
TIMEOUT: 3600000, // 60 minutes
```

**For normal institutions:**

```typescript
PAGE_SIZE: 100,
TIMEOUT: 1800000, // 30 minutes
```

**For overnight batch runs:**

```typescript
PAGE_SIZE: 100,
PAUSE_BETWEEN_INSTITUTIONS: 20000, // 20 seconds
ENABLE_RETRIES: true,
MAX_RETRIES: 3,
```

## Output

### Console Output

The script provides real-time progress updates:

```
[2025-12-08 10:30:00] ℹ️  [1/72] Fetching: WIZARA YA AFYA
[2025-12-08 10:35:23] ✅ WIZARA YA AFYA: Fetched 1234 employees (15 pages, 5m 23s)
[2025-12-08 10:35:23] ℹ️  📈 Progress: 1/72 (1.4%) | ✅ 1 | ❌ 0 | ⏭️ 0
```

### Log Files

Detailed logs are saved to `./logs/hrims-fetch-TIMESTAMP.log`

Example: `logs/hrims-fetch-2025-12-08T10-30-00.log`

### Final Summary

At the end, you'll get a comprehensive summary:

```
================================================================================
📊 FINAL SUMMARY
================================================================================
Completed at: 2025-12-08 14:30:00
Total duration: 4h 0m 0s

Total institutions: 72
✅ Successfully fetched: 65
❌ Failed: 2
⏭️  Skipped (no identifier): 5
👥 Total employees fetched: 10,234
⏱️  Average fetch time: 3m 41s
================================================================================
```

## Monitoring Progress

### Real-time Monitoring

```bash
# Follow the log file
tail -f logs/hrims-fetch-*.log

# Watch for errors
tail -f logs/hrims-fetch-*.log | grep "❌"

# Watch for successes
tail -f logs/hrims-fetch-*.log | grep "✅"
```

### Check Database Count

```bash
# In another terminal, check growing employee count
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

## Troubleshooting

### Problem: Server not running

**Solution:**

```bash
npm run dev
```

### Problem: Timeout errors

**Solution:** Increase timeout or decrease page size:

```typescript
TIMEOUT: 7200000, // 2 hours
PAGE_SIZE: 50, // Smaller pages
```

### Problem: Database connection errors

**Solution:** Check database is running and credentials are correct

### Problem: Memory issues

**Solution:** Increase Node.js memory:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npx tsx scripts/fetch-all-institutions-auto.ts
```

## Estimating Run Time

**Formula:**

```
Total Time ≈ (Number of Institutions × Average Fetch Time) + (Pause Time × Number of Institutions)
```

**Example:**

- 72 institutions
- Average 3 minutes per institution
- 15 seconds pause between institutions

```
Total Time ≈ (72 × 3min) + (72 × 15s) = 216min + 18min = 234min ≈ 4 hours
```

## Best Practices

1. **Run during off-peak hours** - Less load on HRIMS system
2. **Monitor the first few fetches** - Ensure everything works correctly
3. **Keep logs** - Useful for debugging and auditing
4. **Run in background** - Use `nohup` for long-running operations
5. **Check database** - Verify data is being saved correctly
6. **Have retry enabled** - Network issues can happen

## Failed Institutions

If institutions fail, you can:

1. **Check the log** for the specific error
2. **Run a retry script** (see `fetch-failed-institutions.ts`)
3. **Manually fetch** using the web interface at `/dashboard/admin/fetch-data`
4. **Adjust configuration** (increase timeout, decrease page size)

## Post-Fetch Verification

After the script completes:

```bash
# Check total employees in database
psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"

# Check employees per institution
psql -U postgres -d nody -c "
  SELECT i.name, COUNT(e.id) as employee_count
  FROM \"Institution\" i
  LEFT JOIN \"Employee\" e ON e.\"institutionId\" = i.id
  GROUP BY i.name
  ORDER BY employee_count DESC
  LIMIT 10;
"
```

## Support

If you encounter issues:

1. Check the log file in `./logs/`
2. Review the error messages
3. Verify server is running
4. Check database connectivity
5. Try manual fetch for problematic institution

## Script Files

- `fetch-all-institutions-auto.ts` - Main fetch script
- `run-auto-fetch.sh` - Convenience shell script
- `AUTO_FETCH_README.md` - This documentation
- `fetch-failed-institutions.ts` - Script to retry failed institutions

## Example Run

```bash
$ ./scripts/run-auto-fetch.sh

==========================================
  HRIMS Auto Fetch - All Institutions
==========================================

✓ Server is running

Starting automatic fetch for all institutions...
This may take several hours depending on data size.
Logs will be saved to ./logs directory

================================================================================
  🚀 HRIMS AUTO FETCH SCRIPT - ALL INSTITUTIONS
================================================================================
[2025-12-08 10:00:00] ℹ️  Started at: 2025-12-08 10:00:00
[2025-12-08 10:00:00] ℹ️  Log file: ./logs/hrims-fetch-2025-12-08T10-00-00.log
...

[4 hours later]

================================================================================
📊 FINAL SUMMARY
================================================================================
Total institutions: 72
✅ Successfully fetched: 65
❌ Failed: 2
⏭️  Skipped (no identifier): 5
👥 Total employees fetched: 10,234

✨ Script completed successfully!
```

---

**Last Updated:** December 8, 2025
**Version:** 1.0.0

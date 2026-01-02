# HRIMS Data Fetch Script Documentation

## Overview

This is an improved, production-ready script for fetching employee data from the HRIMS (Human Resource Information Management System) API and storing it in the local PostgreSQL database.

## Features

✅ **Axios-based HTTP Client** - Reliable timeout handling
✅ **8-minute timeout per institution** - Handles large datasets
✅ **Automatic retry logic** - Up to 2 retries for failed requests
✅ **Progress tracking** - Real-time status updates
✅ **Detailed logging** - Timestamped logs with emojis
✅ **Error handling** - Graceful handling of timeouts and network errors
✅ **Comprehensive summary** - Success/failure statistics and duration
✅ **Safe execution** - Proper connection management and cleanup

## Files

- `fetch-hrims-data.ts` - Main TypeScript fetch script
- `run-hrims-fetch.sh` - Bash wrapper for easy execution
- `HRIMS_FETCH_README.md` - This documentation

## Configuration

The script uses the following default configuration:

```typescript
const CONFIG = {
  API_URL: 'http://localhost:9002/api/hrims/fetch-by-institution',
  TIMEOUT: 480000, // 8 minutes per institution
  RETRY_DELAY: 15000, // 15 seconds between retries
  PAUSE_BETWEEN_INSTITUTIONS: 15000, // 15 seconds between institutions
  MAX_RETRIES: 2,
};
```

## Usage

### Quick Start (Recommended)

```bash
cd /home/nextjs/scripts
./run-hrims-fetch.sh
```

This will:

1. Check if the dev server is running
2. Ask for confirmation
3. Run the fetch script with logging
4. Save logs to `/home/nextjs/logs/`

### Manual Execution

```bash
cd /home/nextjs/scripts
npx tsx fetch-hrims-data.ts
```

### Background Execution

For long-running fetches, run in background:

```bash
nohup ./run-hrims-fetch.sh > fetch-output.log 2>&1 &
```

Monitor progress:

```bash
tail -f /home/nextjs/logs/hrims-fetch-*.log
```

## Prerequisites

1. **Dev server must be running:**

   ```bash
   pm2 start csms-dev
   # or
   npm run dev
   ```

2. **Database must be accessible:**
   - Host: localhost
   - Database: nody
   - User: postgres
   - Password: Mamlaka2020

3. **Network connectivity to HRIMS API:**
   - HRIMS API: http://10.0.217.11:8135/api

## Expected Duration

- **Small institutions (< 100 employees):** 30-60 seconds each
- **Medium institutions (100-500 employees):** 1-3 minutes each
- **Large institutions (500-2000 employees):** 3-8 minutes each
- **Very large institutions (2000+ employees):** Up to 8 minutes each

**Total estimated time for all 72 institutions:** 1-2 hours

## Output Examples

### Success Output

```
[2025-12-07 05:00:00] ✅ WIZARA YA AFYA: Fetched 1,234 employees (5m 23s)
```

### Retry Output

```
[2025-12-07 05:05:00] ❌ Hospitali ya Mnazi Mmoja: Timeout after 8 minutes
[2025-12-07 05:05:00] ⚠️  Waiting 15s before retry...
[2025-12-07 05:05:15] ℹ️  Fetching: Hospitali ya Mnazi Mmoja (Retry 1/2)
```

### Final Summary

```
===================================================================================
  📊 FETCH SUMMARY
===================================================================================
Completed at: 2025-12-07 06:30:00
Total duration: 90m 15s

Total institutions: 72
✅ Successfully fetched: 68
❌ Failed: 2
⏭️  Skipped (no identifier): 2
👥 Total employees fetched: 45,123
⏱️  Average fetch time: 3m 45s
===================================================================================
```

## Error Handling

The script handles various error scenarios:

### Timeouts

- Automatically retries up to 2 times
- 15-second delay between retries
- Clear error messages indicating timeout duration

### Network Errors

- Detects connection failures
- Provides specific error messages
- Continues with next institution after retries exhausted

### API Errors

- Captures HTTP error responses
- Logs error details
- Marks institution as failed but continues

### Database Errors

- Validates institution data
- Skips institutions without identifiers
- Maintains database connection throughout

## Troubleshooting

### Issue: "Dev server is not running"

**Solution:**

```bash
pm2 start csms-dev
# Wait 5 seconds for server to start
./run-hrims-fetch.sh
```

### Issue: "Timeout after 8 minutes"

**Possible causes:**

- Institution has too many employees (>5000)
- HRIMS API is slow or unresponsive
- Network connectivity issues

**Solutions:**

1. Script will automatically retry 2 times
2. If still failing, fetch that institution manually via admin dashboard
3. Check HRIMS API status
4. Increase timeout in script configuration if needed

### Issue: "No vote number or TIN number"

**Explanation:** Some institutions don't have identifiers in the database.

**Solution:**

1. Add identifiers via admin dashboard
2. Or skip these institutions - they cannot be fetched from HRIMS

### Issue: Script stops unexpectedly

**Solution:**

```bash
# Check the log file for errors
tail -100 /home/nextjs/logs/hrims-fetch-*.log

# Check if dev server is still running
pm2 status csms-dev

# Restart dev server if needed
pm2 restart csms-dev
```

## Monitoring

### Real-time Progress

```bash
# Watch the latest log file
tail -f /home/nextjs/logs/hrims-fetch-$(date +%Y%m%d)*.log
```

### Check Employee Count

```bash
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

### Check Fetch Status

```bash
# If running in background
ps aux | grep "fetch-hrims-data"

# Check process logs
tail -100 /home/nextjs/logs/hrims-fetch-*.log
```

## Post-Fetch Verification

After the fetch completes, verify the data:

```bash
# Total employee count
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "
SELECT COUNT(*) as total_employees FROM \"Employee\";
"

# Top 10 institutions by employee count
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "
SELECT i.name, COUNT(e.id) as employee_count
FROM \"Institution\" i
LEFT JOIN \"Employee\" e ON e.\"institutionId\" = i.id
GROUP BY i.name
ORDER BY employee_count DESC
LIMIT 10;
"

# Check for institutions with no employees
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "
SELECT i.name
FROM \"Institution\" i
LEFT JOIN \"Employee\" e ON e.\"institutionId\" = i.id
WHERE i.\"voteNumber\" IS NOT NULL
GROUP BY i.name
HAVING COUNT(e.id) = 0;
"
```

## Best Practices

1. **Backup before fetching:**

   ```bash
   cd /home/nextjs/beky8
   ./backup-database.sh
   ```

2. **Clear old data if needed:**

   ```bash
   # Delete only employees (keeps requests)
   PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "
   SET session_replication_role = replica;
   DELETE FROM \"EmployeeCertificate\";
   DELETE FROM \"Employee\";
   SET session_replication_role = DEFAULT;
   "
   ```

3. **Run during off-peak hours:**
   - Best time: Late evening or early morning
   - Reduces load on HRIMS API
   - Minimizes impact on users

4. **Monitor system resources:**

   ```bash
   # CPU and memory usage
   top -p $(pgrep -f fetch-hrims-data)

   # Disk space
   df -h /home/nextjs
   ```

5. **Keep logs for audit:**
   - Logs are saved to `/home/nextjs/logs/`
   - Review for any patterns in failures
   - Use for troubleshooting

## Advanced Configuration

To modify script behavior, edit `fetch-hrims-data.ts`:

### Change Timeout

```typescript
const CONFIG = {
  TIMEOUT: 600000, // 10 minutes instead of 8
  // ... other config
};
```

### Change Retry Logic

```typescript
const CONFIG = {
  MAX_RETRIES: 3, // 3 retries instead of 2
  RETRY_DELAY: 20000, // 20 seconds instead of 15
  // ... other config
};
```

### Change Pause Between Institutions

```typescript
const CONFIG = {
  PAUSE_BETWEEN_INSTITUTIONS: 30000, // 30 seconds instead of 15
  // ... other config
};
```

## Support

For issues or questions:

1. Check this documentation
2. Review log files in `/home/nextjs/logs/`
3. Verify dev server status: `pm2 status`
4. Check database connection
5. Test HRIMS API connectivity

## Version History

- **v1.0** (2025-12-07) - Initial improved version with axios
  - 8-minute timeout per institution
  - Automatic retry logic
  - Enhanced logging and error handling
  - Comprehensive summary reporting

---

**Last Updated:** 2025-12-07
**Author:** Claude Code Assistant
**Location:** `/home/nextjs/scripts/`

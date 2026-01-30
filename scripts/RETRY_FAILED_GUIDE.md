# Retry Failed Employees Guide

This guide explains how to retry document fetching for employees who failed during the parallel fetch process.

## Problem

During parallel fetching (e.g., Wizara ya Elimu with 3835 failed employees), many employees fail to fetch documents due to:
- API timeouts
- Rate limiting
- Network issues
- HRIMS API errors

## Solution

Use sequential retry script to fetch documents one at a time, which provides better success rates.

---

## Quick Start

### 1. Check Current Status

First, check how many employees failed and their current status:

```bash
npx tsx scripts/check-failed-employees.ts
```

**Options:**
- `--institution-id=<id>` - Check specific institution (default: Wizara ya Elimu)
- `--show-details` - Show detailed list of failed employees
- `--limit=<n>` - Limit number of failed employees to display (default: 50)

**Examples:**
```bash
# Check Wizara ya Elimu status
npx tsx scripts/check-failed-employees.ts

# Show detailed list of first 100 failed employees
npx tsx scripts/check-failed-employees.ts --show-details --limit=100

# Check another institution
npx tsx scripts/check-failed-employees.ts --institution-id=xxx
```

---

### 2. Retry Failed Employees

Retry fetching documents for failed employees sequentially (one at a time):

```bash
npx tsx scripts/retry-failed-wizara-employees.ts
```

**This script will:**
- ✅ Identify employees without documents in MinIO
- ✅ Retry them one at a time (sequential, not parallel)
- ✅ Wait 3 seconds between each request (configurable)
- ✅ Show detailed progress with real-time stats
- ✅ Save results to log files
- ✅ Generate summary report

---

## Script Options

### retry-failed-wizara-employees.ts

```bash
npx tsx scripts/retry-failed-wizara-employees.ts [options]
```

**Available Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--institution-id=<id>` | Institution ID to process | `cmd06nn7r0002e67w8df8thtn` (Wizara ya Elimu) |
| `--delay=<ms>` | Delay between requests in milliseconds | `3000` (3 seconds) |
| `--offset=<n>` | Skip first N failed employees | `0` |
| `--limit=<n>` | Limit total employees to retry | (none) |
| `--retry-all` | Retry all employees, not just failed ones | `false` |

---

## Common Scenarios

### Scenario 1: First Time Retry (Recommended)

Test with a small batch first:

```bash
# Test with first 10 failed employees
npx tsx scripts/retry-failed-wizara-employees.ts --limit=10
```

If successful, run full retry:

```bash
# Retry all failed employees
npx tsx scripts/retry-failed-wizara-employees.ts
```

---

### Scenario 2: Resume from Specific Position

If the script was interrupted or you want to skip already processed employees:

```bash
# Skip first 500 failed employees and continue from 501
npx tsx scripts/retry-failed-wizara-employees.ts --offset=500
```

---

### Scenario 3: Reduce API Load

If experiencing timeouts or rate limiting, increase delay:

```bash
# Wait 5 seconds between each request
npx tsx scripts/retry-failed-wizara-employees.ts --delay=5000

# Wait 10 seconds for very sensitive APIs
npx tsx scripts/retry-failed-wizara-employees.ts --delay=10000
```

---

### Scenario 4: Different Institution

```bash
# Retry failed employees from another institution
npx tsx scripts/retry-failed-wizara-employees.ts --institution-id=<other-institution-id>
```

---

### Scenario 5: Retry All Employees (Force Re-fetch)

If you want to re-fetch ALL employees (not just failed ones):

```bash
npx tsx scripts/retry-failed-wizara-employees.ts --retry-all
```

**⚠️ Warning:** This will attempt to fetch documents for ALL employees, even those who already have documents. The API will skip documents already stored in MinIO.

---

## Understanding the Output

### Progress Display

```
[1/3835] 📄 Fetching: John Doe
   Payroll: 12345 | ZanID: N/A
   ✅ Successfully fetched and stored 4 document(s)
   📦 Documents: 4 | Duration: 8.2s
   📊 Progress: 1/3835 | ✓1 ✗0 ⊘0 | ETA: 8h 45m
   ⏳ Waiting 3s...
```

**Legend:**
- ✓ = Successful fetches
- ✗ = Failed fetches
- ⊘ = Skipped (no payroll/zanID)
- ETA = Estimated time to completion

---

### Final Summary

```
═══════════════════════════════════════════════════════════════════════════
📊 FINAL SUMMARY

Institution: WIZARA YA ELIMU
Total Employees Retried: 3835
  ✅ Successful: 2891
  ❌ Failed: 944
  ⊘  Skipped: 0
  ⏱️  Duration: 3h 12m
  📈 Average Rate: 0.33 employees/second
  📊 Success Rate: 75.4%
═══════════════════════════════════════════════════════════════════════════
```

---

## Log Files

The script generates log files in `scripts/logs/`:

### 1. Failed Employees Log
**Filename:** `failed-retry-{institution-id}-{timestamp}.json`

Contains detailed list of employees who failed:
```json
{
  "institutionId": "cmd06nn7r0002e67w8df8thtn",
  "timestamp": "2026-01-26T10:30:00.000Z",
  "totalFailed": 944,
  "employees": [
    {
      "employeeId": "emp123",
      "employeeName": "Jane Smith",
      "payrollNumber": "67890",
      "error": "HRIMS API timeout"
    }
  ]
}
```

### 2. Summary Report
**Filename:** `retry-summary-{institution-id}-{timestamp}.json`

Contains overall statistics:
```json
{
  "institutionId": "cmd06nn7r0002e67w8df8thtn",
  "timestamp": "2026-01-26T13:42:00.000Z",
  "duration": "3h 12m",
  "total": 3835,
  "successful": 2891,
  "failed": 944,
  "skipped": 0,
  "successRate": "75.4%"
}
```

---

## Best Practices

### 1. Start Small
Always test with `--limit=10` first to ensure the script works correctly.

### 2. Monitor Progress
The script shows real-time progress. Keep an eye on:
- Success rate (should be >70%)
- Average duration per employee
- Error messages

### 3. Adjust Delay
If you see many timeouts or rate limit errors:
- Increase delay: `--delay=5000` or `--delay=10000`

### 4. Handle Interruptions
If the script stops or is interrupted:
- Note the last processed employee number
- Resume with `--offset=<number>`

### 5. Review Logs
After completion:
- Check failed employees log for patterns
- Review error messages to identify common issues
- Decide if another retry is needed

---

## Troubleshooting

### Problem: High Failure Rate (>50%)

**Solutions:**
1. Increase delay between requests:
   ```bash
   npx tsx scripts/retry-failed-wizara-employees.ts --delay=5000
   ```

2. Check HRIMS API status

3. Verify network connectivity

---

### Problem: Script Hangs or Timeouts

**Solutions:**
1. The script has a 120-second timeout per request
2. If requests consistently timeout, HRIMS API may be slow
3. Try increasing the delay or contact HRIMS support

---

### Problem: All Employees Skipped

**Cause:** Employees don't have payroll numbers or ZanIDs

**Solution:**
- Check database: employees need either `payrollNumber` or `zanId`
- Use `check-failed-employees.ts` to see how many employees lack IDs

---

### Problem: Rate Limiting Errors

**Solutions:**
1. Increase delay: `--delay=10000` (10 seconds)
2. Process in smaller batches: `--limit=100`

---

## Estimation Guide

### Time Estimates

Based on default settings (3s delay):

| Failed Employees | Estimated Time |
|-----------------|----------------|
| 100 | ~5-10 minutes |
| 500 | ~25-45 minutes |
| 1000 | ~50-90 minutes |
| 3835 | ~3-5 hours |

**Factors affecting duration:**
- HRIMS API response time
- Network speed
- Delay setting
- Number of documents per employee

---

## Example Workflow

### Complete Retry Workflow for Wizara ya Elimu

```bash
# Step 1: Check current status
npx tsx scripts/check-failed-employees.ts --show-details

# Step 2: Test with small batch
npx tsx scripts/retry-failed-wizara-employees.ts --limit=10

# Step 3: If successful, run full retry
npx tsx scripts/retry-failed-wizara-employees.ts

# Step 4: After completion, check status again
npx tsx scripts/check-failed-employees.ts

# Step 5: If still many failed, retry again (failed-only)
npx tsx scripts/retry-failed-wizara-employees.ts

# Step 6: Review final logs
ls -lh scripts/logs/
```

---

## Key Differences: Parallel vs Sequential

| Aspect | Parallel Fetch | Sequential Retry |
|--------|---------------|------------------|
| Speed | Fast (multiple at once) | Slower (one at a time) |
| Success Rate | Lower (~59%) | Higher (~75-90%) |
| API Load | High | Low |
| Good For | Initial bulk fetch | Recovering failures |
| Risk | Rate limiting | None |

---

## Support

If you encounter issues:

1. Check log files in `scripts/logs/`
2. Review error messages
3. Verify HRIMS API credentials in database (HrimsSettings table)
4. Check network connectivity

---

## Summary

✅ **Use sequential retry for failed employees**
✅ **Start with small test batches**
✅ **Monitor progress and adjust delay as needed**
✅ **Review logs after completion**
✅ **Retry multiple times if necessary for best results**

The sequential approach is slower but provides significantly better success rates for failed employees.

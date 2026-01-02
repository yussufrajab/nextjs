# HRIMS Data Fetch Scripts - Quick Reference Guide

## 📋 Available Scripts

### 1. **Automatic Fetch All Institutions** ⭐ RECOMMENDED
**File:** `fetch-all-institutions-auto.ts`
**Purpose:** Automatically fetch data for ALL institutions with pagination support
**Use When:** You want to fetch or update data for all institutions in one run

```bash
# Using shell script (recommended)
./scripts/run-auto-fetch.sh

# Or directly
npx tsx scripts/fetch-all-institutions-auto.ts

# Background execution
nohup ./scripts/run-auto-fetch.sh > fetch-output.log 2>&1 &
```

**Features:**
- ✅ Automatic pagination for large datasets
- ✅ Configurable page size
- ✅ Automatic retries
- ✅ Detailed logging
- ✅ Progress tracking
- ✅ Pauses between institutions

**Configuration:**
- Page Size: 100 (adjustable)
- Timeout: 60 minutes per institution
- Max Retries: 2
- Pause: 15 seconds between institutions

**Output:** Logs saved to `./logs/hrims-fetch-TIMESTAMP.log`

---

### 2. **Retry Failed Institutions**
**File:** `fetch-failed-only.ts`
**Purpose:** Retry specific institutions that failed during bulk fetch
**Use When:** Some institutions failed and you want to retry them with special settings

```bash
npx tsx scripts/fetch-failed-only.ts
```

**Features:**
- ✅ Smaller page size (50) for problematic institutions
- ✅ More retries (3 attempts)
- ✅ Longer pauses (30 seconds)
- ✅ Focused on specific institutions

**How to Use:**
1. Edit the `FAILED_INSTITUTIONS` array in the file
2. Add vote numbers and names of failed institutions
3. Run the script

**Example:**
```typescript
const FAILED_INSTITUTIONS = [
  { voteNumber: '025', name: 'Hospitali ya Mnazi Mmoja' },
  { voteNumber: '008', name: 'WIZARA YA AFYA' },
];
```

---

### 3. **Old Fetch Script** (Legacy)
**File:** `fetch-all-institutions.ts`
**Purpose:** Original fetch script without pagination
**Status:** ⚠️ Deprecated - Use `fetch-all-institutions-auto.ts` instead

```bash
npx tsx scripts/fetch-all-institutions.ts
```

**Note:** This script may timeout on large institutions.

---

### 4. **HRIMS Fetch Script** (Legacy)
**File:** `fetch-hrims-data.ts`
**Purpose:** First implementation using axios
**Status:** ⚠️ Deprecated - Use newer scripts

---

## 🎯 Which Script Should I Use?

### Scenario 1: First Time Setup
**Use:** `fetch-all-institutions-auto.ts`
```bash
./scripts/run-auto-fetch.sh
```
This will fetch all institutions from scratch.

### Scenario 2: Regular Updates
**Use:** `fetch-all-institutions-auto.ts`
```bash
./scripts/run-auto-fetch.sh
```
The script will update existing employees and add new ones.

### Scenario 3: Some Institutions Failed
**Use:** `fetch-failed-only.ts`
1. Check the log for failed institutions
2. Edit `fetch-failed-only.ts` to add failed institutions
3. Run: `npx tsx scripts/fetch-failed-only.ts`

### Scenario 4: Single Institution Update
**Use:** Web Interface
1. Go to: http://localhost:9002/dashboard/admin/fetch-data
2. Select the institution
3. Click "Fetch by Vote Code" or "Fetch by TIN"

---

## 📊 Script Comparison

| Feature | Auto Fetch | Retry Failed | Old Script |
|---------|-----------|--------------|------------|
| Pagination | ✅ Yes | ✅ Yes | ❌ No |
| All Institutions | ✅ Yes | ❌ No (manual list) | ✅ Yes |
| Retries | ✅ 2x | ✅ 3x | ✅ 2x |
| Large Institutions | ✅ Handles | ✅ Optimized | ❌ May timeout |
| Logging | ✅ Detailed | ✅ Detailed | ✅ Basic |
| Recommended | ✅ Yes | ✅ For failures | ❌ No |

---

## 🚀 Quick Start Commands

### Run Full Auto Fetch
```bash
# Make executable (first time only)
chmod +x scripts/run-auto-fetch.sh

# Run
./scripts/run-auto-fetch.sh
```

### Run in Background (Overnight)
```bash
nohup ./scripts/run-auto-fetch.sh > fetch-$(date +%Y%m%d-%H%M%S).log 2>&1 &

# Check progress
tail -f fetch-*.log
```

### Monitor Database Growth
```bash
# Watch employee count grow
watch -n 5 'psql -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"'
```

### Check Latest Log
```bash
# View latest log
tail -f logs/hrims-fetch-*.log

# View only successes
tail -f logs/hrims-fetch-*.log | grep "✅"

# View only errors
tail -f logs/hrims-fetch-*.log | grep "❌"
```

---

## ⚙️ Configuration Tips

### For Large Institutions (1000+ employees)
Edit `fetch-all-institutions-auto.ts`:
```typescript
const CONFIG = {
  PAGE_SIZE: 50,           // Smaller pages
  TIMEOUT: 3600000,        // 60 minutes
  MAX_RETRIES: 3,          // More retries
  PAUSE_BETWEEN_INSTITUTIONS: 20000, // 20 seconds
};
```

### For Fast Fetching (Small institutions)
```typescript
const CONFIG = {
  PAGE_SIZE: 150,          // Larger pages
  TIMEOUT: 1800000,        // 30 minutes
  MAX_RETRIES: 2,
  PAUSE_BETWEEN_INSTITUTIONS: 10000, // 10 seconds
};
```

### For Overnight Runs
```typescript
const CONFIG = {
  PAGE_SIZE: 100,
  TIMEOUT: 3600000,        // 60 minutes
  MAX_RETRIES: 3,
  PAUSE_BETWEEN_INSTITUTIONS: 30000, // 30 seconds (safer)
};
```

---

## 📁 File Structure

```
scripts/
├── fetch-all-institutions-auto.ts    ⭐ Main automatic fetch script
├── run-auto-fetch.sh                 ⭐ Shell wrapper for easy execution
├── fetch-failed-only.ts              🔄 Retry failed institutions
├── fetch-all-institutions.ts         ⚠️  Legacy (no pagination)
├── fetch-hrims-data.ts               ⚠️  Legacy (old implementation)
├── AUTO_FETCH_README.md              📖 Detailed documentation
├── FETCH_SCRIPTS_GUIDE.md            📖 This quick reference
└── HRIMS_FETCH_README.md             📖 API documentation

logs/
└── hrims-fetch-TIMESTAMP.log         📝 Execution logs
```

---

## 🔍 Troubleshooting

### Problem: Script hangs on large institution
**Solution:** Use smaller page size in `fetch-failed-only.ts`
```typescript
PAGE_SIZE: 25,  // Very small pages
```

### Problem: Many timeouts
**Solution:** Increase timeout and add longer pauses
```typescript
TIMEOUT: 7200000,  // 2 hours
PAUSE_BETWEEN_INSTITUTIONS: 60000,  // 1 minute
```

### Problem: Database connection errors
**Solution:** Check PostgreSQL is running
```bash
sudo systemctl status postgresql
```

### Problem: Server not responding
**Solution:** Restart Next.js server
```bash
# Stop current server
pkill -f "next dev"

# Start fresh
npm run dev
```

---

## 📈 Expected Performance

**Small Institution (< 100 employees):**
- Time: 30-60 seconds
- Pages: 1-2

**Medium Institution (100-500 employees):**
- Time: 2-5 minutes
- Pages: 2-5

**Large Institution (500-1000 employees):**
- Time: 5-10 minutes
- Pages: 5-10

**Very Large Institution (1000+ employees):**
- Time: 10-20 minutes
- Pages: 10-20

**All Institutions (72 total):**
- Estimated: 3-5 hours
- Depends on institution sizes

---

## ✅ Best Practices

1. **Before Running:**
   - ✓ Ensure server is running (`npm run dev`)
   - ✓ Check database connectivity
   - ✓ Have sufficient disk space for logs

2. **During Execution:**
   - ✓ Monitor first few institutions
   - ✓ Check logs for errors
   - ✓ Keep server running

3. **After Completion:**
   - ✓ Review final summary
   - ✓ Check failed institutions
   - ✓ Verify database counts
   - ✓ Save logs for audit

4. **For Production:**
   - ✓ Run during off-peak hours
   - ✓ Use background execution
   - ✓ Keep multiple log copies
   - ✓ Set up monitoring alerts

---

## 📞 Need Help?

1. **Check the logs:** `./logs/hrims-fetch-*.log`
2. **Read detailed docs:** `scripts/AUTO_FETCH_README.md`
3. **Review API docs:** `scripts/HRIMS_FETCH_README.md`
4. **Use web interface:** http://localhost:9002/dashboard/admin/fetch-data

---

**Last Updated:** December 8, 2025
**Maintained By:** CSMS Development Team

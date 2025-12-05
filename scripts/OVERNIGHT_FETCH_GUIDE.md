# Overnight Fetch Guide

## Changes Made

### 1. API Route Timeout Extension (`/home/nextjs/src/app/api/hrims/fetch-by-institution/route.ts`)
- **Increased timeout from default (~30 seconds) to 10 minutes (600,000ms)**
- Added AbortController for proper timeout handling
- Better error handling for timeout scenarios

### 2. Script Improvements (`/home/nextjs/scripts/fetch-all-institutions.ts`)
- **Automatic retry logic:** Up to 2 retries for failed fetches
- **Extended pause:** 10 seconds between institutions (instead of 3)
- **Retry delay:** 10 seconds wait before retry attempts
- **Better error messages:** Shows retry count and status

## How to Run Overnight

### Prerequisites
1. Make sure the development server is running:
   ```bash
   npm run dev
   ```

2. Clear existing incomplete data (optional):
   ```bash
   PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "DELETE FROM \"Employee\";"
   ```

### Start the Overnight Fetch

```bash
cd /home/nextjs
nohup npx tsx scripts/fetch-all-institutions.ts > fetch-overnight.log 2>&1 &
```

This will:
- Run the script in the background
- Continue running even if you close your terminal
- Save all output to `fetch-overnight.log`

### Monitor Progress

**Check the log file:**
```bash
tail -f /home/nextjs/fetch-overnight.log
```

**Check employee count:**
```bash
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "SELECT COUNT(*) FROM \"Employee\";"
```

**Check process status:**
```bash
ps aux | grep "tsx scripts/fetch-all-institutions"
```

## Expected Timeline

- **72 institutions** to process
- **10 seconds** pause between each
- **Up to 2 retries** per failed institution (with 10-second waits)
- **Estimated time:** 15-30 minutes (depending on retries)

## What to Expect

### Successful Institutions (should work now with longer timeout):
1. Baraza la Manispaa Mjini Unguja
2. Hospitali ya Mnazi Mmoja
3. OFISI YA MAKAMO WA PILI WA RAISI
4. OFISI YA RAIS, FEDHA NA MIPANGO
5. Wakala wa Barabara
6. WIZARA YA AFYA (Ministry of Health - LARGE)
7. WIZARA YA ELIMU NA MAFUNZO YA AMALI (Ministry of Education - LARGE)
8. WIZARA YA HABARI, VIJANA, UTAMADUNI NA MICHEZO
9. WIZARA YA KILIMO UMWAGILIAJI MALIASILI NA MIFUGO

### Expected Final Count:
- **Target:** 40,000-45,000 employees
- **Current:** 6,283 employees
- **Missing:** ~35,000-40,000 (from the 9 failed institutions)

## Morning Verification

After the overnight run completes, verify:

```bash
# 1. Check total employee count
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "
SELECT COUNT(*) as total_employees FROM \"Employee\";
"

# 2. Check distribution by institution
PGPASSWORD=Mamlaka2020 psql -h localhost -U postgres -d nody -c "
SELECT i.name, COUNT(e.id) as employee_count
FROM \"Institution\" i
LEFT JOIN \"Employee\" e ON e.\"institutionId\" = i.id
GROUP BY i.name
ORDER BY employee_count DESC
LIMIT 20;
"

# 3. Check for any remaining failures in log
grep "❌" /home/nextjs/fetch-overnight.log | wc -l
```

## If Issues Persist

If some institutions still fail after retries:
1. Check the `fetch-overnight.log` for specific errors
2. Those institutions can be fetched manually through admin dashboard
3. May need to contact HRIMS team about data quality issues

## Notes

- The script skips employees without valid ZanIDs (data quality issue in HRIMS)
- Some ministries returned 0 employees in previous runs - this is HRIMS data issue
- The 5-minute timeout should handle even the largest institutions
- Retry logic handles temporary network issues automatically

---

**Good luck with the overnight run!**

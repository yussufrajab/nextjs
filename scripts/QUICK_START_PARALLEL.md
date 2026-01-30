# Quick Start - Parallel Document Fetching

## TL;DR - Resume WIZARA YA ELIMU from Employee 7000

```bash
cd /www/wwwroot/nextjspro
./scripts/fetch-wizara-elimu-parallel.sh
```

**Expected time to complete**: 7-8 hours (vs 30+ hours with sequential)

---

## Common Commands

### 1. Check Current Status
```bash
npx tsx scripts/check-fetch-status.ts "WIZARA YA ELIMU"
```

### 2. Resume from Employee 7000 (Current Position)
```bash
./scripts/fetch-wizara-elimu-parallel.sh
```

### 3. Test with 50 Employees First
```bash
./scripts/fetch-wizara-elimu-parallel.sh --limit=50
```

### 4. Adjust Batch Size (if experiencing issues)
```bash
# More conservative (slower but safer)
./scripts/fetch-wizara-elimu-parallel.sh --batch-size=3

# More aggressive (faster but may stress API)
./scripts/fetch-wizara-elimu-parallel.sh --batch-size=5
```

### 5. Resume from Specific Position
```bash
./scripts/fetch-wizara-elimu-parallel.sh --offset=10000
```

---

## Running in Background (Recommended)

Since this will take 7-8 hours, run it in a screen session:

```bash
# Start screen session
screen -S wizara-fetch

# Run the script
./scripts/fetch-wizara-elimu-parallel.sh

# Detach from screen (Press Ctrl+A, then D)

# Later, reattach to check progress
screen -r wizara-fetch
```

---

## What It Does

1. **Fetches in Parallel**: Processes 4 employees at the same time (vs 1 at a time)
2. **Smart Filtering**: Skips employees without zanId or payrollNumber
3. **Resumable**: Can stop and resume from any point
4. **Progress Tracking**: Shows real-time progress with ETA
5. **Logging**: All output saved to `scripts/logs/`

---

## Expected Results

For WIZARA YA ELIMU (starting from employee 7000):
- **Remaining employees**: ~9,000
- **Estimated time**: 7-8 hours
- **Time saved vs sequential**: ~22 hours (73% faster)

---

## Monitoring Progress

While running, you'll see:

```
📦 Batch 142/2250 - Processing 4 employees in parallel...
   ✅ Batch complete: 3 success, 1 failed, 0 skipped

📊 Progress: 5680/9000 (63.1%) | ✓4201 ⚠0 ✗1479 ⊘0 | ETA: 2.5h | Rate: 0.47 emp/s
```

---

## If Something Goes Wrong

### Script Stops/Crashes
```bash
# Check the last processed position
cat scripts/state/documents-progress-*.json

# Resume from that position
./scripts/fetch-wizara-elimu-parallel.sh --offset=<last-offset>
```

### Too Many Failures
```bash
# Reduce batch size
./scripts/fetch-wizara-elimu-parallel.sh --batch-size=3
```

### Want to Check What's Left
```bash
npx tsx scripts/check-fetch-status.ts "WIZARA YA ELIMU"
```

---

## Files Created

- ✅ `scripts/fetch-institution-documents-parallel.ts` - Main parallel script
- ✅ `scripts/fetch-wizara-elimu-parallel.sh` - Convenience wrapper
- ✅ `scripts/check-fetch-status.ts` - Status checker
- ✅ `scripts/PARALLEL_FETCH_GUIDE.md` - Comprehensive guide
- 📁 `scripts/logs/wizara-elimu-parallel-*.log` - Execution logs
- 💾 `scripts/state/documents-progress-*.json` - Progress tracking

---

## For More Details

See the comprehensive guide:
```bash
cat scripts/PARALLEL_FETCH_GUIDE.md
```

---

**Last Updated**: 2026-01-25

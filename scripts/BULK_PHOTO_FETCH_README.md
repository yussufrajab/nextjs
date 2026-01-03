# Bulk Institution Photo Fetch Script

This script automates fetching employee photos from HRIMS for all institutions by calling the web API endpoint that powers the admin photo fetch page.

## Overview

The `fetch-all-institution-photos.ts` script:

1. Fetches all institutions from the database
2. For each institution, calls the `/api/hrims/fetch-photos-by-institution` API endpoint
3. Adds a 2-second delay between institutions to avoid overwhelming the HRIMS API
4. Displays real-time progress as photos are fetched
5. Saves all photos to MinIO storage automatically
6. Updates employee records with MinIO URLs
7. Provides detailed summaries at both institution and employee levels

## Features

- **Institution-level processing**: Processes one institution at a time with configurable delays
- **Real-time progress tracking**: Shows streaming progress for each employee being processed
- **MinIO storage**: Photos are automatically saved to MinIO and linked to employee profiles
- **Comprehensive reporting**: Detailed statistics at both institution and employee levels
- **Error resilience**: Continues processing even if some institutions or employees fail

## Usage

### Basic Usage

```bash
npx tsx scripts/fetch-all-institution-photos.ts
```

This will:

- Process all institutions in the database
- Fetch photos for all employees in each institution
- Add a 2-second delay between institutions
- Save all photos to MinIO storage

### Configuration

You can modify these constants in the script:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const DELAY_BETWEEN_INSTITUTIONS = 2000; // 2 seconds
```

## How It Works

### 1. Institution Fetching

The script queries the database for all institutions:

```sql
SELECT id, name, voteNumber, tinNumber FROM Institution ORDER BY name ASC
```

### 2. API Endpoint Calls

For each institution, it calls:

```
POST /api/hrims/fetch-photos-by-institution
Body: { institutionId: "..." }
```

This endpoint:

- Fetches all employees for the institution from the database
- Calls HRIMS API for each employee's photo
- Uploads photos to MinIO (`employee-photos/` folder)
- Updates employee records with MinIO URLs (`/api/files/employee-photos/{employeeId}.{ext}`)
- Streams progress updates back to the script

### 3. Progress Display

The script shows real-time progress:

```
[1/50] Institution: Ministry of Health
   Processing: John Doe
   Progress: 45/120 - Jane Smith
   ✅ Complete: 43 success, 1 failed, 1 skipped
   ⏱️  Duration: 12.3s
```

### 4. Delay Between Institutions

After processing each institution (except the last), the script waits 2 seconds before proceeding to the next one.

## Output

### During Execution

```
🚀 Starting bulk photo fetch for all institutions...

API Base URL: http://localhost:9002
Delay between institutions: 2000ms

────────────────────────────────────────────────────────────────────────────────

📋 Fetching institutions from database...
✅ Found 50 institutions

[1/50] Institution: Ministry of Health
📸 Processing: Ministry of Health
   Vote: 123 | TIN: 456789
   Progress: 120/120 - Last Employee Name
   ✅ Complete: 115 success, 3 failed, 2 skipped
   ⏱️  Duration: 15.2s
   ⏳ Waiting 2s before next institution...

[2/50] Institution: Ministry of Education
...
```

### Final Summary

```
════════════════════════════════════════════════════════════════════════════════

📊 FINAL SUMMARY

────────────────────────────────────────────────────────────────────────────────
Total Institutions: 50
  ✅ Success: 48
  ❌ Failed: 2
  ⊘  Skipped: 0
  ⏱️  Total Duration: 45.3 minutes

Employee Photo Results:
  Total Employees Processed: 5,432
  ✅ Photos Saved: 5,210
  ❌ Failed: 187
  ⊘  Skipped: 35

❌ Failed Institutions:
   • Old Institution Name: No employees found for this institution in database
   • Test Institution: HRIMS API error: 500

════════════════════════════════════════════════════════════════════════════════

✅ Bulk photo fetch completed!
```

## Error Handling

The script handles various error scenarios:

- **No payroll number**: Employee is skipped
- **Photo already exists**: Employee is skipped (checks for MinIO URLs or data URIs)
- **HRIMS API errors**: Employee fetch fails, continues with next employee
- **MinIO upload errors**: Employee fetch fails, continues with next employee
- **Institution errors**: If an entire institution fails, it continues with the next one

## Comparison with Other Scripts

### vs `fetch-all-photos.ts`

| Feature  | fetch-all-institution-photos.ts | fetch-all-photos.ts       |
| -------- | ------------------------------- | ------------------------- |
| Approach | Calls web API endpoint          | Direct HRIMS calls        |
| Grouping | By institution                  | By institution (optional) |
| Progress | Real-time streaming             | Per-employee logs         |
| Delay    | Between institutions (2s)       | Between employees (100ms) |
| Storage  | MinIO (via API)                 | MinIO (direct)            |
| Use Case | Bulk institution processing     | Fine-grained control      |

### When to Use This Script

Use `fetch-all-institution-photos.ts` when:

- You want to process all institutions systematically
- You prefer institution-level rate limiting
- You want to use the same logic as the web UI
- You need real-time streaming progress updates

Use `fetch-all-photos.ts` when:

- You need fine-grained control (batch size, specific institution)
- You want to skip existing photos
- You want faster processing with employee-level delays
- You need command-line options and dry-run mode

## Storage Details

Photos are stored in MinIO with the following structure:

- **Bucket**: `documents` (or value from `MINIO_BUCKET_NAME` env var)
- **Path**: `employee-photos/{employeeId}.{ext}`
- **URL in DB**: `/api/files/employee-photos/{employeeId}.{ext}`

The file extension is determined from the MIME type:

- `image/jpeg` → `.jpg`
- `image/png` → `.png`
- `image/gif` → `.gif`
- `image/webp` → `.webp`

## Requirements

- Node.js and TypeScript execution environment (`tsx`)
- Database access (Prisma client configured)
- MinIO server running and accessible
- HRIMS API accessible from the server
- Next.js application running (for API endpoint)

## Troubleshooting

### API Connection Errors

If you get connection errors, ensure:

1. The Next.js app is running on the specified port (default: 9002)
2. Update `API_BASE_URL` if running on a different URL

### MinIO Errors

If photos fail to upload to MinIO:

1. Check MinIO server is running
2. Verify MinIO credentials in environment variables
3. Ensure the `documents` bucket exists

### HRIMS API Errors

If HRIMS returns errors:

1. Check network connectivity to HRIMS server
2. Verify API credentials in the API route configuration
3. Check HRIMS server status

## Performance Considerations

- **2-second delay between institutions**: This prevents overwhelming the HRIMS API
- **Streaming responses**: Progress updates are sent in real-time without waiting for completion
- **Estimated duration**: For 50 institutions with ~100 employees each:
  - Per employee: ~0.1-0.3 seconds
  - Per institution: ~10-30 seconds
  - Total with delays: ~45-60 minutes

## Monitoring

Watch for:

- Institutions with high failure rates
- Consistent HRIMS API errors
- MinIO upload failures
- Network timeouts

Failed institutions can be re-run manually through the web UI at:
`http://your-domain:9002/dashboard/admin/get-photo`

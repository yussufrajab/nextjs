# Bulk Institution Document Fetch Script

This script automates fetching employee documents from HRIMS for all institutions by calling the web API endpoint that powers the admin document fetch page.

## Overview

The `fetch-all-institution-documents.ts` script:

1. Fetches all institutions from the database
2. For each institution, calls the `/api/hrims/fetch-documents-by-institution` API endpoint
3. Adds a 3-second delay between institutions to avoid overwhelming the HRIMS API
4. Displays real-time progress as documents are fetched
5. Saves all documents to MinIO storage automatically
6. Updates employee records with MinIO URLs
7. Provides detailed summaries at both institution and employee levels

## Features

- **Institution-level processing**: Processes one institution at a time with configurable delays
- **Real-time progress tracking**: Shows streaming progress for each employee being processed
- **Multiple document types**: Fetches CV (Ardhil Hali), job contract, birth certificate, and educational certificates
- **MinIO storage**: Documents are automatically saved to MinIO and linked to employee profiles
- **Comprehensive reporting**: Detailed statistics at both institution and employee levels
- **Error resilience**: Continues processing even if some institutions or employees fail
- **Smart caching**: Skips documents already stored in MinIO to avoid redundant API calls

## Usage

### Basic Usage

```bash
npx tsx scripts/fetch-all-institution-documents.ts
```

This will:
- Process all institutions in the database
- Fetch documents for all employees in each institution
- Add a 3-second delay between institutions
- Save all documents to MinIO storage

### Configuration

You can modify these constants in the script:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';
const DELAY_BETWEEN_INSTITUTIONS = 3000; // 3 seconds
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
POST /api/hrims/fetch-documents-by-institution
Body: { institutionId: "..." }
```

This endpoint:
- Fetches all employees for the institution from the database
- Makes **3 separate HRIMS API calls per employee** (one for each document type):
  - RequestBody: `2` → Ardhil Hali (CV)
  - RequestBody: `3` → Job Contract (Employment Contract)
  - RequestBody: `4` → Birth Certificate
- Extracts educational certificates from the responses
- Uploads all documents to MinIO (`employee-documents/` folder)
- Updates employee records with MinIO URLs
- Creates/updates certificate records in the database
- Streams progress updates back to the script

### 3. Document Types Fetched

The script fetches the following document types:

**Core Documents:**
- **Ardhil Hali** (CV) - Stored in `ardhilHaliUrl` field
- **Job Contract** - Stored in `jobContractUrl` field
- **Birth Certificate** - Stored in `birthCertificateUrl` field

**Educational Certificates:**
- Certificate of Secondary education (Form IV)
- Advanced Certificate of Secondary education (Form VII)
- Certificate
- Diploma
- Advanced Diploma
- Bachelor Degree
- Master Degree
- PHd

### 4. Progress Display

The script shows real-time progress with detailed statistics:

```
[1/50] Institution: Ministry of Health
   Processing: John Doe
   Progress: 45/120 - Jane Smith [✓42 ⚠2 ✗1]
   ✅ Complete: 115 successful, 3 partial, 2 failed
   ⏱️  Duration: 45.7s
```

Legend:
- ✓ = Successful (all documents fetched)
- ⚠ = Partial (some documents fetched)
- ✗ = Failed (no documents fetched)

### 5. Delay Between Institutions

After processing each institution (except the last), the script waits 3 seconds before proceeding to the next one. This is longer than the photo fetch delay because document fetching is more intensive (3 API calls per employee).

## Output

### During Execution

```
🚀 Starting bulk document fetch for all institutions...

API Base URL: http://localhost:9002
Delay between institutions: 3000ms

⚠️  Note: This process fetches 3 document types per employee:
   • Ardhil Hali (CV)
   • Job Contract
   • Birth Certificate
   • Educational Certificates

────────────────────────────────────────────────────────────────────────────────

📋 Fetching institutions from database...
✅ Found 50 institutions

[1/50] Institution: Ministry of Health
📄 Processing: Ministry of Health
   Vote: 123 | TIN: 456789
   Progress: 120/120 - Last Employee Name [✓115 ⚠3 ✗2]
   ✅ Complete: 115 successful, 3 partial, 2 failed
   ⏱️  Duration: 45.2s
   ⏳ Waiting 3s before next institution...

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
  ⏱️  Total Duration: 125.3 minutes

Employee Document Results:
  Total Employees Processed: 5,432
  ✅ Successful: 4,987 (all documents fetched)
  ⚠️  Partial: 345 (some documents fetched)
  ❌ Failed: 100 (no documents fetched)

Success Rate: 91.8%

⚠️  Institutions with partial results:
   • Ministry of Health: 12 employees with partial data
   • Ministry of Education: 8 employees with partial data

❌ Failed Institutions:
   • Old Institution Name: No employees found for this institution in database
   • Test Institution: HRIMS API error: 500

════════════════════════════════════════════════════════════════════════════════

✅ Bulk document fetch completed!

📝 Next Steps:
   • Review the summary above for any failed or partial results
   • Check employee profiles to verify documents are accessible
   • Re-run for specific institutions if needed
```

## Error Handling

The script handles various error scenarios:

- **No payroll number**: Employee is skipped (marked as failed)
- **Documents already exist**: Individual documents are skipped if already stored in MinIO
- **HRIMS API errors**: Employee fetch continues with next document type or employee
- **MinIO upload errors**: Document storage fails, continues with next document
- **Institution errors**: If an entire institution fails, it continues with the next one
- **Timeout handling**: Each HRIMS request has a 120-second timeout

## Success Status Definitions

- **Successful**: All available documents were fetched and stored
- **Partial**: Some documents were fetched, but others failed or were not available
- **Failed**: No documents could be fetched (usually due to missing payroll number or HRIMS errors)

## Storage Details

Documents are stored in MinIO with the following structure:

- **Bucket**: `documents` (or value from `MINIO_BUCKET_NAME` env var)
- **Path**: `employee-documents/{employeeId}_{documentType}.pdf`
- **URL in DB**: `/api/files/employee-documents/{employeeId}_{documentType}.pdf`

### Document Type Mapping

| HRIMS Document | Database Field | MinIO Filename Pattern |
|---------------|----------------|------------------------|
| Ardhil Hali | `ardhilHaliUrl` | `{employeeId}_ardhilHali.pdf` |
| Job Contract | `jobContractUrl` | `{employeeId}_jobContract.pdf` |
| Birth Certificate | `birthCertificateUrl` | `{employeeId}_birthCertificate.pdf` |
| Educational Certificates | `EmployeeCertificate` table | `{employeeId}_certificate_{type}.pdf` |

## HRIMS API Details

The script uses HRIMS RequestId `206` with three different RequestBody values:

```json
{
  "RequestId": "206",
  "SearchCriteria": "{payrollNumber}",
  "RequestPayloadData": {
    "RequestBody": "2"  // or "3" or "4"
  }
}
```

- **RequestBody: "2"** → Ardhil Hali
- **RequestBody: "3"** → Employment Contract
- **RequestBody: "4"** → Birth Certificate

Each API call returns an array of attachments with:
- `attachmentType`: String identifying the document type
- `attachmentContent`: Base64-encoded PDF content
- `contentSize`: Size of the attachment in bytes

## Performance Considerations

- **3-second delay between institutions**: This prevents overwhelming the HRIMS API
- **3 API calls per employee**: Each employee requires 3 separate HRIMS requests
- **2-second delay between document types**: Per employee, to prevent API rate limiting
- **1.5-second delay between employees**: Within an institution
- **Streaming responses**: Progress updates are sent in real-time without waiting for completion

### Estimated Duration

For 50 institutions with ~100 employees each:
- Per document type: ~2-3 seconds (includes 2s delay)
- Per employee: ~6-9 seconds (3 document types)
- Per institution: ~10-15 minutes (100 employees)
- Total with delays: **2-3 hours**

**Note**: Document fetching is significantly slower than photo fetching due to multiple API calls per employee.

## Requirements

- Node.js and TypeScript execution environment (`tsx`)
- Database access (Prisma client configured)
- MinIO server running and accessible
- HRIMS API accessible from the server (http://10.0.217.11:8135/api)
- Next.js application running (for API endpoint, default: port 9002)
- Valid HRIMS API credentials (ApiKey and Token)

## Troubleshooting

### API Connection Errors

If you get connection errors, ensure:
1. The Next.js app is running on the specified port (default: 9002)
2. Update `API_BASE_URL` if running on a different URL
3. Check that the API endpoint is accessible: `/api/hrims/fetch-documents-by-institution`

### MinIO Errors

If documents fail to upload to MinIO:
1. Check MinIO server is running
2. Verify MinIO credentials in environment variables
3. Ensure the `documents` bucket exists
4. Check MinIO has sufficient storage space

### HRIMS API Errors

If HRIMS returns errors:
1. Check network connectivity to HRIMS server (http://10.0.217.11:8135)
2. Verify API credentials in `/src/app/api/hrims/fetch-documents-by-institution/route.ts`
3. Check HRIMS server status and load
4. Verify employee payroll numbers are correct
5. Check if HRIMS has the documents for the specific employees

### Timeout Errors

If you encounter timeout errors:
1. The script uses a 120-second timeout per HRIMS request
2. Increase the timeout in the API route if needed
3. Check HRIMS server performance

### Partial Results

If many employees show partial results:
1. Check HRIMS logs for specific document type failures
2. Some employees may not have all documents in HRIMS
3. Verify document type codes are correct (2, 3, 4)

## Monitoring

Watch for:
- Institutions with high failure or partial rates
- Consistent HRIMS API errors for specific document types
- MinIO upload failures
- Network timeouts (especially for large institutions)
- Database connection issues

Failed institutions can be re-run manually through the web UI at:
`http://your-domain:9002/dashboard/admin/get-documents`

## Comparison with Photo Fetch Script

| Feature | Document Fetch | Photo Fetch |
|---------|---------------|-------------|
| API calls per employee | 3 (one per document type) | 1 |
| Delay between institutions | 3 seconds | 2 seconds |
| Processing time per employee | 6-9 seconds | 0.1-0.3 seconds |
| Storage location | `employee-documents/` | `employee-photos/` |
| File format | PDF | JPG/PNG/WebP |
| Success levels | Success/Partial/Failed | Success/Failed/Skipped |
| Typical duration (50 inst.) | 2-3 hours | 45-60 minutes |

## Advanced Usage

### Re-running for Specific Institutions

If you need to re-run for specific institutions, modify the script to filter:

```typescript
const institutions = await db.institution.findMany({
  where: {
    // Add filter here, e.g.:
    id: { in: ['inst-id-1', 'inst-id-2'] }
  },
  select: { /* ... */ },
});
```

### Adjusting Delays

To speed up processing (at risk of API rate limiting):

```typescript
const DELAY_BETWEEN_INSTITUTIONS = 1000; // Reduce to 1 second
```

To be more conservative:

```typescript
const DELAY_BETWEEN_INSTITUTIONS = 5000; // Increase to 5 seconds
```

## Best Practices

1. **Run during off-peak hours**: Document fetching is intensive and takes hours
2. **Monitor initial progress**: Watch the first few institutions to ensure everything works correctly
3. **Check storage space**: Ensure MinIO has sufficient space (estimate: ~100MB per institution)
4. **Database backups**: Consider backing up the database before running
5. **Log monitoring**: Watch server logs for HRIMS API errors or patterns
6. **Incremental approach**: Consider running for a subset of institutions first

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API endpoint logs: `/api/hrims/fetch-documents-by-institution`
3. Test individual institution processing through the web UI
4. Check HRIMS API connectivity and credentials
5. Verify MinIO server status and credentials

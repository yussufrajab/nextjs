# File Operations Fixes

## Issues Fixed

### 1. File Upload Failures (400 Bad Request)
**Problem**: File upload API was rejecting all uploads with 400 errors

**Root Cause**:
- API only accepts PDF files (validated at `/api/files/upload/route.ts:21-26`)
- Tests were sending various file types: JPG, DOCX, XLSX, PDF
- API has strict 2MB size limit

**Fix**:
- Updated `generateTestFile()` to only generate PDF files
- Changed file types to realistic document names:
  - `employment-contract.pdf`
  - `birth-certificate.pdf`
  - `academic-certificate.pdf`
  - `recommendation-letter.pdf`
  - `id-document.pdf`
- Adjusted file sizes to be under 2MB (50-100KB range)

### 2. File List Endpoint (404 Not Found)
**Problem**: GET `/api/files?page=1&limit=20` returning 404

**Root Cause**:
- No general file listing endpoint exists in the API
- File API structure only includes:
  - `/api/files/upload` (POST)
  - `/api/files/download/[objectKey]` (GET)
  - `/api/files/exists/[objectKey]` (GET)
  - `/api/files/preview/[objectKey]` (GET)
  - `/api/files/employee-documents/[filename]` (GET)
  - `/api/files/employee-photos/[filename]` (GET)

**Fix**: Removed file list endpoint from tests

### 3. Incorrect Download Endpoint
**Problem**: Tests using wrong download path

**Root Cause**: Tests were using `/api/files/${fileId}` but API expects `/api/files/download/${objectKey}`

**Fix**:
- Updated upload response parsing to extract `objectKey` instead of `fileId`
- Changed download URL to `/api/files/download/${objectKey}`
- Updated response checks to look for `data.objectKey`

### 4. Incorrect Request Format
**Problem**: Sending unnecessary form fields

**Root Cause**: Tests were sending `entityType` and `entityId` fields that the API doesn't expect

**Fix**:
- Removed `entityType` and `entityId` fields
- API only expects `file` (required) and `folder` (optional)
- Updated FormData to match API schema

## Updated File Operations Flow

### Before:
```javascript
// Wrong file types
const types = [
  { name: 'document.pdf', type: 'application/pdf', size: 50 },
  { name: 'report.docx', type: 'application/vnd...', size: 75 },  // ❌ Not allowed
  { name: 'image.jpg', type: 'image/jpeg', size: 200 },            // ❌ Not allowed
  { name: 'data.xlsx', type: 'application/vnd...', size: 150 },    // ❌ Not allowed
];

// Wrong form fields
formData.append('file', file);
formData.append('entityType', 'PROMOTION');  // ❌ Not used by API
formData.append('entityId', '123');          // ❌ Not used by API

// Wrong download path
http.get(`${BASE_URL}/api/files/${fileId}`)  // ❌ Endpoint doesn't exist

// Non-existent list endpoint
http.get(`${BASE_URL}/api/files?page=1&limit=20`)  // ❌ Endpoint doesn't exist
```

### After:
```javascript
// Only PDF files
const types = [
  { name: 'employment-contract.pdf', type: 'application/pdf', size: 50 },  // ✅
  { name: 'birth-certificate.pdf', type: 'application/pdf', size: 75 },     // ✅
  { name: 'academic-certificate.pdf', type: 'application/pdf', size: 100 }, // ✅
];

// Correct form fields
formData.append('file', file);                    // ✅ Required
formData.append('folder', 'documents');           // ✅ Optional

// Correct download path
const objectKey = response.json('data.objectKey');  // ✅ Get objectKey
http.get(`${BASE_URL}/api/files/download/${objectKey}`)  // ✅ Correct path

// Use exists endpoint instead
http.get(`${BASE_URL}/api/files/exists/${objectKey}`)  // ✅ Valid endpoint
```

## API Response Format

### Upload Response:
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "objectKey": "documents/employment-contract_1234567890.pdf",
    "originalName": "employment-contract.pdf",
    "size": 51200,
    "contentType": "application/pdf",
    "etag": "abc123...",
    "bucketName": "csms-files"
  }
}
```

### Download Response:
- Binary file content with appropriate headers
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="..."`

### Exists Response:
- 200 OK if file exists
- 404 Not Found if file doesn't exist (both are valid responses)

## Test Results

### Before Fix:
```
✗ file upload successful: 0%
✗ list files successful: 0% (404)
✗ file download: 0%
```

### After Fix:
```
✓ file upload successful: 100%
✓ returns object key: 100%
✓ file download successful: 100%
✓ has content: 100%
✓ file exists check: 100%
```

**Metrics:**
- Upload Duration: avg=259ms, p95=259ms ✅
- Download Duration: avg=996ms, p95=996ms ✅
- Upload Success Rate: 100% ✅

## Files Modified

1. **load-tests/scenarios/file-operations.test.js**
   - Updated `generateTestFile()` - only PDF files
   - Fixed upload request format
   - Updated download URL path
   - Removed file list test
   - Added file exists check

2. **load-tests/stress-test.js**
   - Simplified file scenario to use exists check only
   - Removed non-existent file list endpoint

## Verification

To verify file operations work correctly:

```bash
# Run file operations test
k6 run --vus 1 --iterations 1 load-tests/scenarios/file-operations.test.js

# Should show:
# ✓ file upload successful
# ✓ file download successful
# ✓ file exists check
```

## API Limitations Discovered

1. **Only PDF files accepted** - No support for other document types
2. **2MB file size limit** - Enforced server-side
3. **No file listing endpoint** - Cannot retrieve list of uploaded files
4. **No file metadata endpoint** - Cannot get file info without downloading
5. **No file deletion endpoint** - Cannot remove uploaded files via API

These are API design decisions, not test issues.

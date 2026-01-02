# Employee Photo Storage and Retrieval System

## Overview

This document explains how employee photos are fetched from HRIMS, stored in the database, and displayed in the application.

---

## Table of Contents

1. [Storage Architecture](#storage-architecture)
2. [Photo Storage Process](#photo-storage-process)
3. [Photo Retrieval Process](#photo-retrieval-process)
4. [Database Schema](#database-schema)
5. [Code References](#code-references)
6. [Performance Considerations](#performance-considerations)
7. [Automated Fetching](#automated-fetching)
8. [Troubleshooting](#troubleshooting)

---

## Storage Architecture

### Where Photos Are Stored

Photos are stored as **base64-encoded data URIs** directly in the PostgreSQL database.

**Database Table**: `Employee`
**Column**: `profileImageUrl` (String/Text type)
**Format**: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...`

### Why Data URIs?

**Advantages:**

- ✅ **Simple**: One database query gets everything including photo
- ✅ **Fast**: No additional HTTP requests for images
- ✅ **Atomic**: Photo and employee data stay in sync
- ✅ **Backup-friendly**: Photos included in database backups
- ✅ **Offline-capable**: Works offline once data is loaded
- ✅ **No file system**: No need to manage file storage/cleanup

**Considerations:**

- ⚠️ Average photo size: 50-200 KB (base64 encoded)
- ⚠️ Base64 encoding increases size by ~33%
- ⚠️ Stored in database, not file system

---

## Photo Storage Process

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHOTO STORAGE PROCESS                         │
└─────────────────────────────────────────────────────────────────┘

Step 1: Request from Application
   ↓
   POST /api/employees/[id]/fetch-photo
   OR
   Run script: npx tsx scripts/fetch-all-photos.ts
   ↓
Step 2: Fetch from HRIMS API
   ↓
   Endpoint: http://10.0.217.11:8135/api/Employees
   Method: POST
   Payload: {
     "RequestId": "203",
     "SearchCriteria": "payrollNumber"
   }
   ↓
Step 3: HRIMS Returns Photo
   ↓
   Response: {
     "code": 200,
     "data": "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMC..."
   }
   ↓
Step 4: Convert to Data URI
   ↓
   Original: "/9j/4AAQSkZJRgABAQEAYABgAAD..."
   Converted: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
   ↓
Step 5: Store in Database
   ↓
   UPDATE "Employee"
   SET "profileImageUrl" = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
   WHERE id = 'employee-id';
   ↓
Step 6: Photo Stored Successfully ✅
```

### Code Implementation

**Location**: `/src/app/api/employees/[id]/fetch-photo/route.ts`

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: employeeId } = await params;

  // Get employee data
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, payrollNumber: true, name: true },
  });

  // Fetch photo from HRIMS
  const photoPayload = {
    RequestId: '203',
    SearchCriteria: employee.payrollNumber,
  };

  const response = await fetch(`${HRIMS_URL}/Employees`, {
    method: 'POST',
    headers: {
      ApiKey: HRIMS_API_KEY,
      Token: HRIMS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(photoPayload),
  });

  const photoData = await response.json();
  let photoBase64 = photoData.data; // Base64 string

  // Convert to data URI
  let photoDataUri = photoBase64;
  if (!photoBase64.startsWith('data:image')) {
    photoDataUri = `data:image/jpeg;base64,${photoBase64}`;
  }

  // Store in database
  await prisma.employee.update({
    where: { id: employeeId },
    data: { profileImageUrl: photoDataUri },
  });

  return NextResponse.json({
    success: true,
    data: { photoUrl: photoDataUri },
  });
}
```

---

## Photo Retrieval Process

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHOTO RETRIEVAL PROCESS                       │
└─────────────────────────────────────────────────────────────────┘

Step 1: User Opens Profile Page
   ↓
   URL: /dashboard/profile
   User: HRO, HHRMD, DO, CSCS, Employee, or any authenticated user
   ↓
Step 2: Frontend Calls API
   ↓
   GET /api/employees?q=search&page=1&size=50
   ↓
Step 3: API Queries Database
   ↓
   SELECT id, name, zanId, payrollNumber, profileImageUrl, ...
   FROM "Employee"
   WHERE institutionId = 'xyz' -- (if institution-based role)
   ↓
Step 4: Database Returns Data
   ↓
   {
     "id": "abc123",
     "name": "Zaitun Mohammed Haji",
     "payrollNumber": "207547",
     "profileImageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
     ...
   }
   ↓
Step 5: Frontend Displays Photo
   ↓
   <Avatar>
     <AvatarImage src={profileImageUrl} alt={name} />
     <AvatarFallback>{initials}</AvatarFallback>
   </Avatar>
   ↓
Step 6: Browser Renders Image
   ↓
   Browser decodes base64 string and displays image inline
   NO additional HTTP request needed! ✅
   ↓
Step 7: Photo Displayed ✅
```

### Auto-Fetch Logic

When a user views an employee profile, the system automatically checks if a photo exists.

**Location**: `/src/app/dashboard/profile/page.tsx` (lines 114-156)

```tsx
useEffect(() => {
  const fetchPhotoFromHRIMS = async () => {
    // Check if photo is missing or not in base64 format
    if (
      (!profileImageUrl || !profileImageUrl.startsWith('data:image')) &&
      emp.payrollNumber &&
      !isFetchingPhoto
    ) {
      setIsFetchingPhoto(true);

      try {
        const response = await fetch(`/api/employees/${emp.id}/fetch-photo`, {
          method: 'POST',
        });

        const result = await response.json();

        if (result.success && result.data.photoUrl) {
          setProfileImageUrl(result.data.photoUrl);

          if (!result.data.alreadyExists) {
            toast({
              title: 'Photo Updated',
              description: 'Profile photo fetched from HRIMS successfully',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching photo:', error);
      } finally {
        setIsFetchingPhoto(false);
      }
    }
  };

  fetchPhotoFromHRIMS();
}, [emp.id, emp.payrollNumber, profileImageUrl, isFetchingPhoto]);
```

**This means:**

- **First view**: Automatically fetches photo from HRIMS and stores in database
- **Subsequent views**: Loads instantly from database (no HRIMS call needed)
- **All users**: HRO, HHRMD, DO, CSCS, Employee, etc. can trigger auto-fetch

---

## Database Schema

### Employee Table

**File**: `/prisma/schema.prisma`

```prisma
model Employee {
  id                      String                    @id
  employeeEntityId        String?
  name                    String
  gender                  String
  profileImageUrl         String?                   // ← Photo stored here
  dateOfBirth             DateTime?
  placeOfBirth            String?
  region                  String?
  countryOfBirth          String?
  zanId                   String                    @unique
  phoneNumber             String?
  contactAddress          String?
  zssfNumber              String?
  payrollNumber           String?                   // ← Used to fetch photo
  cadre                   String?
  salaryScale             String?
  ministry                String?
  department              String?
  appointmentType         String?
  contractType            String?
  recentTitleDate         DateTime?
  currentReportingOffice  String?
  currentWorkplace        String?
  employmentDate          DateTime?
  confirmationDate        DateTime?
  retirementDate          DateTime?
  status                  String?
  ardhilHaliUrl           String?
  confirmationLetterUrl   String?
  jobContractUrl          String?
  birthCertificateUrl     String?
  institutionId           String

  // Relations
  CadreChangeRequest      CadreChangeRequest[]
  ConfirmationRequest     ConfirmationRequest[]
  Institution             Institution               @relation(fields: [institutionId], references: [id])
  EmployeeCertificate     EmployeeCertificate[]
  LwopRequest             LwopRequest[]
  PromotionRequest        PromotionRequest[]
  ResignationRequest      ResignationRequest[]
  RetirementRequest       RetirementRequest[]
  SeparationRequest       SeparationRequest[]
  ServiceExtensionRequest ServiceExtensionRequest[]
  User                    User?
}
```

### Sample Database Query

```sql
-- View employees with photos
SELECT
  name,
  payrollNumber,
  CASE
    WHEN profileImageUrl IS NOT NULL THEN 'Has Photo'
    ELSE 'No Photo'
  END as photo_status,
  LEFT(profileImageUrl, 50) as photo_preview
FROM "Employee"
WHERE payrollNumber IS NOT NULL
LIMIT 10;

-- Count employees with/without photos
SELECT
  COUNT(*) as total_employees,
  COUNT(profileImageUrl) as with_photos,
  COUNT(*) - COUNT(profileImageUrl) as without_photos
FROM "Employee";

-- Find employees needing photos
SELECT
  id, name, payrollNumber, institutionId
FROM "Employee"
WHERE payrollNumber IS NOT NULL
  AND (profileImageUrl IS NULL
       OR NOT profileImageUrl LIKE 'data:image%')
LIMIT 100;
```

---

## Code References

### Frontend (Photo Display)

**File**: `/src/app/dashboard/profile/page.tsx`

**Lines 107-108**: State management

```tsx
const [profileImageUrl, setProfileImageUrl] = useState(emp.profileImageUrl);
const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);
```

**Lines 114-156**: Auto-fetch logic

```tsx
useEffect(() => {
  const fetchPhotoFromHRIMS = async () => {
    // Auto-fetch if photo missing
  };
  fetchPhotoFromHRIMS();
}, [emp.id, profileImageUrl]);
```

**Lines 187-197**: Display component

```tsx
<div className="relative inline-block">
  <Avatar className="h-24 w-24 mb-4 shadow-md mx-auto">
    <AvatarImage
      src={
        profileImageUrl || `https://placehold.co/100x100.png?text=${initials}`
      }
      alt={emp.name}
    />
    <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
  </Avatar>
  {isFetchingPhoto && (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
    </div>
  )}
</div>
```

### Backend API (Photo Fetching)

**File**: `/src/app/api/employees/[id]/fetch-photo/route.ts`

Key functions:

- Validates employee exists and has payroll number
- Checks if photo already exists (skips if present)
- Fetches from HRIMS using RequestId 203
- Converts to data URI format
- Stores in database
- Returns success/failure status

### Bulk Photo Fetching Script

**File**: `/scripts/fetch-all-photos.ts`

Features:

- Processes all institutions or specific institution
- Fetches photos for all employees in database
- Configurable delay between requests
- Progress tracking and logging
- JSON export of results

**Usage**:

```bash
# Fetch for all institutions
npx tsx scripts/fetch-all-photos.ts --skip-existing

# Fetch for specific institution
npx tsx scripts/fetch-all-photos.ts --institution-id abc123

# Dry run (test without changes)
npx tsx scripts/fetch-all-photos.ts --dry-run
```

---

## Performance Considerations

### Loading Time

| Scenario                    | Time         | Description                        |
| --------------------------- | ------------ | ---------------------------------- |
| Photo exists in DB          | 50-100ms     | Single database query              |
| Photo needs fetching        | 300-500ms    | DB query + HRIMS fetch + DB update |
| Bulk fetch (100 employees)  | ~10 seconds  | With 100ms delay between requests  |
| Bulk fetch (1000 employees) | ~1.7 minutes | With 100ms delay between requests  |

### Storage Impact

| Metric                        | Value          |
| ----------------------------- | -------------- |
| Average photo size (original) | ~40-150 KB     |
| Average photo size (base64)   | ~50-200 KB     |
| Base64 overhead               | +33%           |
| Storage per 1000 employees    | ~50-200 MB     |
| Storage per 10,000 employees  | ~500 MB - 2 GB |

### Network Efficiency

**Traditional Approach** (file-based):

```
1. GET /api/employees          → 200 KB (employee data)
2. GET /images/emp1.jpg         → 50 KB
3. GET /images/emp2.jpg         → 50 KB
4. GET /images/emp3.jpg         → 50 KB
Total: 4 requests, 350 KB
```

**Data URI Approach** (current):

```
1. GET /api/employees           → 350 KB (employee data + photos)
Total: 1 request, 350 KB
```

**Benefits:**

- Fewer HTTP requests = Faster loading
- No image server required
- Works offline once loaded
- Simpler architecture

---

## Automated Fetching

### Manual Web Interface

**URL**: http://10.0.225.14:9002/dashboard/admin/get-photo

**Features:**

- Select institution from list
- Bulk fetch photos for all employees
- Real-time progress tracking
- Detailed results with success/failure status

**Access**: Admin role only

### Automated Script

**File**: `/scripts/fetch-all-photos.ts`

**Command Line Options:**

```bash
--institution-id <id>    # Specific institution only
--skip-existing          # Skip employees with photos
--delay <ms>             # Delay between requests (default: 100)
--batch-size <n>         # Limit number of employees
--dry-run                # Test without changes
```

**Examples:**

```bash
# Fetch all missing photos
npx tsx scripts/fetch-all-photos.ts --skip-existing

# Test first 50 employees
npx tsx scripts/fetch-all-photos.ts --dry-run --batch-size 50

# Specific institution with slower rate
npx tsx scripts/fetch-all-photos.ts --institution-id abc123 --delay 200
```

### Scheduled Execution

**Cron Job** (Daily at 2 AM):

```bash
# Edit crontab
crontab -e

# Add this line
0 2 * * * cd /home/nextjs && npx tsx scripts/fetch-all-photos.ts --skip-existing >> logs/photo-fetch-cron.log 2>&1
```

**PM2 Schedule**:

```bash
pm2 start scripts/fetch-photos.sh --name photo-fetch --cron "0 2 * * *" --no-autorestart
```

---

## Troubleshooting

### Photo Not Displaying

**Possible Causes:**

1. **Photo not in database**

   ```sql
   SELECT profileImageUrl FROM "Employee" WHERE id = 'employee-id';
   ```

   Solution: Wait for auto-fetch or manually trigger fetch

2. **Invalid data URI format**

   ```sql
   SELECT profileImageUrl FROM "Employee"
   WHERE profileImageUrl NOT LIKE 'data:image%';
   ```

   Solution: Re-fetch from HRIMS

3. **Employee has no payroll number**
   ```sql
   SELECT id, name FROM "Employee" WHERE payrollNumber IS NULL;
   ```
   Solution: Add payroll number to employee record

### HRIMS Connection Issues

**Check HRIMS connectivity:**

```bash
curl -X POST http://10.0.217.11:8135/api/Employees \
  -H "ApiKey: YOUR_API_KEY" \
  -H "Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"RequestId":"203","SearchCriteria":"207547"}'
```

**Common Issues:**

- HRIMS server down or unreachable
- Invalid API credentials
- Network firewall blocking requests
- Employee photo not available in HRIMS

### Photo Fetch Fails

**Check API logs:**

```bash
pm2 logs csms-dev | grep -i "photo"
```

**Check database:**

```sql
SELECT id, name, payrollNumber,
       CASE
         WHEN profileImageUrl IS NULL THEN 'No photo'
         WHEN profileImageUrl LIKE 'data:image%' THEN 'Valid photo'
         ELSE 'Invalid photo'
       END as photo_status
FROM "Employee"
WHERE id = 'employee-id';
```

### Script Issues

**Test script:**

```bash
# Dry run
npx tsx scripts/fetch-all-photos.ts --dry-run --batch-size 5

# Check logs
tail -f logs/photo-fetch-background.log

# Check results
cat logs/photo-fetch-*.json | jq '.summary'
```

---

## API Endpoints Summary

### Fetch Single Photo

**Endpoint**: `POST /api/employees/[id]/fetch-photo`

**Description**: Fetches and stores photo for a single employee

**Request**: No body required

**Response**:

```json
{
  "success": true,
  "message": "Photo fetched and stored successfully",
  "data": {
    "employeeId": "abc123",
    "employeeName": "Zaitun Mohammed Haji",
    "photoUrl": "data:image/jpeg;base64,/9j/4AAQ...",
    "photoSize": 50000,
    "alreadyExists": false
  }
}
```

### Fetch Photos by Institution

**Endpoint**: `POST /api/hrims/fetch-photos-by-institution`

**Description**: Bulk fetches photos for all employees in an institution

**Request**:

```json
{
  "institutionId": "abc123"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Photo fetch completed",
  "data": {
    "summary": {
      "total": 150,
      "success": 145,
      "failed": 3,
      "skipped": 2
    },
    "results": [
      {
        "employeeName": "John Doe",
        "payrollNumber": "12345",
        "status": "success",
        "message": "Photo fetched and stored"
      },
      ...
    ]
  }
}
```

---

## Best Practices

### For Developers

1. **Always check if photo exists** before fetching
2. **Use auto-fetch feature** for seamless user experience
3. **Handle errors gracefully** - show placeholder if photo unavailable
4. **Add loading indicators** during fetch operations
5. **Log all HRIMS interactions** for debugging

### For Administrators

1. **Run bulk fetch during off-peak hours** (e.g., 2 AM)
2. **Use --skip-existing flag** to avoid refetching
3. **Monitor HRIMS API load** - adjust delay if needed
4. **Review logs regularly** - check for failed fetches
5. **Backup database** before bulk operations

### For System Maintenance

1. **Database optimization**: Index `payrollNumber` column
2. **Regular cleanup**: Remove orphaned photos if needed
3. **Monitor storage**: Track database size growth
4. **Performance monitoring**: Check query times
5. **HRIMS coordination**: Ensure API availability

---

## Related Documentation

- **HRIMS Integration**: See `/docs/HRIMS-INTEGRATION.md`
- **Photo Fetch Script**: See `/scripts/README-PHOTO-FETCH.md`
- **API Documentation**: See `/docs/API-REFERENCE.md`
- **Database Schema**: See `/prisma/schema.prisma`

---

## Changelog

| Date       | Version | Changes                               |
| ---------- | ------- | ------------------------------------- |
| 2025-12-09 | 1.0.0   | Initial documentation                 |
| 2025-12-09 | 1.1.0   | Added auto-fetch feature              |
| 2025-12-09 | 1.2.0   | Added bulk fetch script               |
| 2025-12-09 | 1.3.0   | Fixed Next.js 15 params compatibility |

---

## Support

For questions or issues:

1. Check this documentation first
2. Review logs: `logs/photo-fetch-*.json`
3. Check PM2 logs: `pm2 logs csms-dev`
4. Verify database: Check `Employee.profileImageUrl` column
5. Test HRIMS connectivity: Use curl command above

---

**Document maintained by**: CSMS Development Team
**Last updated**: 2025-12-09
**Version**: 1.3.0

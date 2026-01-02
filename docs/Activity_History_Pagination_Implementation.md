# Activity History Pagination Implementation

## Overview

Added full pagination support to the Recent Activities page, allowing users to view **all historical activities** instead of being limited to just the first 10 items.

## Problem Solved

### Before (No Pagination)

- Users could only see the **10 most recent activities**
- No way to view older activities
- Limited visibility into historical data
- Poor UX for users needing to track older requests

### After (Full Pagination)

- ✅ View **all activities** across multiple pages
- ✅ Navigate using Previous/Next buttons
- ✅ Jump to specific pages using page numbers
- ✅ See total activity count and current page info
- ✅ Configurable items per page (default: 10)

## Technical Implementation

### Backend Changes

#### 1. **API Endpoint Updated** (`/home/latest/src/app/api/dashboard/metrics/route.ts`)

**Added pagination query parameters:**

```typescript
// Get pagination parameters
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '10');
const skip = (page - 1) * limit;
```

**Replaced fixed `.slice(0, 10)` with dynamic pagination:**

```typescript
// Sort all activities by date
const sortedActivities = allActivities.sort(
  (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
);

// Calculate pagination metadata
const totalActivities = sortedActivities.length;
const totalPages = Math.ceil(totalActivities / limit);
const hasNextPage = page < totalPages;
const hasPrevPage = page > 1;

// Apply pagination
const recentActivities = sortedActivities
  .slice(skip, skip + limit)
  .map((activity) => ({
    ...activity,
    href: getRequestHref(activity.type),
  }));
```

**Added pagination metadata to response:**

```typescript
const response = {
  success: true,
  data: {
    stats,
    recentActivities,
    pagination: {
      currentPage: page,
      totalPages,
      totalActivities,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  },
};
```

### Frontend Changes

#### 2. **Recent Activities Page Updated** (`/home/latest/src/app/dashboard/recent-activities/page.tsx`)

**Added pagination state:**

```typescript
const [pagination, setPagination] = React.useState<PaginationInfo | null>(null);
const [currentPage, setCurrentPage] = React.useState(1);

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalActivities: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

**Updated fetch function to include page parameter:**

```typescript
const fetchRecentActivities = React.useCallback(
  async (page: number) => {
    const response = await fetch(
      `/api/dashboard/metrics?userRole=${role}&userInstitutionId=${user.institutionId}&page=${page}&limit=10`,
      { credentials: 'include' }
    );

    const result = await response.json();
    if (result.success && result.data?.recentActivities) {
      setRecentActivities(result.data.recentActivities);
      setPagination(result.data.pagination);
    }
  },
  [isAuthLoading, user, role]
);
```

**Added pagination handlers:**

```typescript
const handlePrevPage = () => {
  if (pagination?.hasPrevPage) {
    setCurrentPage((prev) => prev - 1);
  }
};

const handleNextPage = () => {
  if (pagination?.hasNextPage) {
    setCurrentPage((prev) => prev + 1);
  }
};

const handlePageClick = (page: number) => {
  setCurrentPage(page);
};
```

**Added pagination UI controls:**

```tsx
<CardFooter className="flex items-center justify-between border-t px-6 py-4">
  <div className="text-sm text-muted-foreground">
    Page {pagination.currentPage} of {pagination.totalPages}
  </div>
  <div className="flex items-center space-x-2">
    {/* Previous button */}
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrevPage}
      disabled={!pagination.hasPrevPage}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>

    {/* Page numbers (shows up to 5 pages) */}
    <div className="flex items-center space-x-1">
      {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
        // Smart page number calculation
        // Shows: 1 2 3 4 5 (if on page 1-3)
        // Shows: 3 4 5 6 7 (if on page 5)
        // Shows: ... last 5 pages (if near end)
        let pageNum = calculatePageNum(i, pagination);

        return (
          <Button
            key={pageNum}
            variant={pageNum === pagination.currentPage ? 'default' : 'outline'}
            onClick={() => handlePageClick(pageNum)}
          >
            {pageNum}
          </Button>
        );
      })}
    </div>

    {/* Next button */}
    <Button
      variant="outline"
      size="sm"
      onClick={handleNextPage}
      disabled={!pagination.hasNextPage}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
</CardFooter>
```

## Features

### Pagination Controls

1. **Previous/Next Buttons**
   - Navigate to adjacent pages
   - Automatically disabled at boundaries (no prev on page 1, no next on last page)

2. **Page Number Buttons**
   - Shows up to 5 page numbers at once
   - Smart algorithm shows relevant pages:
     - Pages 1-5 when on early pages
     - Current page ± 2 pages when in middle
     - Last 5 pages when near the end

3. **Page Information**
   - "Page X of Y" display
   - "Showing N of M activities" in header

4. **Visual Feedback**
   - Current page button highlighted
   - Disabled buttons grayed out
   - Hover effects on clickable buttons

### Smart Page Number Display

**Example scenarios:**

- **Total 3 pages:** Shows `1 2 3`
- **Total 10 pages, on page 1:** Shows `1 2 3 4 5`
- **Total 10 pages, on page 5:** Shows `3 4 5 6 7`
- **Total 10 pages, on page 9:** Shows `6 7 8 9 10`

This ensures users always see relevant page options without overwhelming the UI.

## API Usage

### Request Format

```
GET /api/dashboard/metrics?userRole={role}&userInstitutionId={id}&page={page}&limit={limit}
```

**Query Parameters:**

- `userRole` (required): User's role for filtering
- `userInstitutionId` (required): Institution ID for filtering
- `page` (optional, default: 1): Page number to fetch
- `limit` (optional, default: 10): Items per page

### Response Format

```json
{
  "success": true,
  "data": {
    "stats": {
      /* dashboard stats */
    },
    "recentActivities": [
      {
        "id": "conf-123",
        "type": "Confirmation",
        "employee": "John Doe",
        "status": "Pending HRMO Review",
        "updatedAt": "2025-12-28T...",
        "href": "/dashboard/confirmation"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalActivities": 47,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Benefits

### User Experience

- ✅ **Complete Visibility**: Access to all historical activities, not just recent 10
- ✅ **Easy Navigation**: Intuitive pagination controls
- ✅ **Performance**: Still fetches only 10 items at a time (not loading all activities)
- ✅ **Context**: Clear indication of total activities and current position

### Technical

- ✅ **Backward Compatible**: Main dashboard still shows top 10 (no pagination there)
- ✅ **Scalable**: Handles hundreds of activities efficiently
- ✅ **Flexible**: Easy to change items per page (just update `limit` param)
- ✅ **Cached**: Respects existing 60-second cache TTL

## Use Cases

### Scenario 1: HRO reviewing last month's activities

- **Before:** Could only see 10 activities, likely from this week
- **After:** Navigate through pages to see activities from 2-3 weeks ago

### Scenario 2: CSCS auditing all pending requests

- **Before:** Limited to 10 most recent, might miss older pending items
- **After:** Navigate all pages to review every pending request

### Scenario 3: HHRMD tracking approval history

- **Before:** No way to see activities from last month
- **After:** Jump to earlier pages to review historical approvals

## Files Modified

1. **`/home/latest/src/app/api/dashboard/metrics/route.ts`**
   - Added pagination query parameters (lines 37-39)
   - Replaced fixed `.slice(0, 10)` with dynamic pagination (lines 390-405)
   - Added pagination metadata to response (lines 429-436)

2. **`/home/latest/src/app/dashboard/recent-activities/page.tsx`**
   - Added pagination state and types (lines 26-33, 74-76)
   - Updated fetch function with page parameter (lines 84-124)
   - Added pagination handlers (lines 130-144)
   - Added pagination UI controls (lines 222-279)

## Testing Recommendations

1. **Basic Pagination**
   - Visit `/dashboard/recent-activities`
   - Verify first 10 activities display
   - Click "Next" → verify page 2 loads
   - Click page numbers → verify correct page loads

2. **Edge Cases**
   - Test with < 10 total activities → pagination should hide
   - Test with exactly 10 activities → should show 1 page
   - Test with 100+ activities → pagination should work smoothly

3. **Navigation**
   - Previous button disabled on page 1
   - Next button disabled on last page
   - Page number buttons highlight current page
   - Clicking current page button does nothing (already on that page)

4. **Performance**
   - Large datasets (100+ activities) should load quickly
   - Page changes should be instant (< 500ms)
   - No unnecessary re-fetching when clicking same page

## Production Status

- ✅ **Build:** Successful (compiled without errors)
- ✅ **Deployed:** PM2 production app restarted
- ✅ **Available at:** https://test.zanajira.go.tz/dashboard/recent-activities

## Future Enhancements (Optional)

1. **Adjustable Page Size**: Allow users to choose 10, 25, 50, or 100 items per page
2. **Search/Filter**: Add search box to filter activities by type, status, or employee
3. **Date Range Filter**: Filter activities by date range (last week, last month, etc.)
4. **Export**: Download all activities as CSV or PDF
5. **Keyboard Navigation**: Use arrow keys to navigate pages
6. **URL State**: Store current page in URL query params for shareable links

---

**Implementation Date:** December 28, 2025
**Modified Components:**

- API Route: `src/app/api/dashboard/metrics/route.ts`
- Frontend Page: `src/app/dashboard/recent-activities/page.tsx`
  **Impact:** Users can now view all historical activities with full pagination support

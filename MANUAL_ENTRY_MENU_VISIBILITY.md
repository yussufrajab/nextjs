# Add Employee Menu Visibility Implementation

## Overview
The "Add Employee" menu item in the left navigation sidebar is now conditionally visible based on whether the HRO user's institution has "Manual Entry" enabled by the admin.

## Changes Made

### 1. Sidebar Component (`src/components/layout/sidebar.tsx`)

**Added:**
- State to track manual entry permission: `hasManualEntryPermission`
- `useEffect` hook that fetches the institution's manual entry permission on mount
- Filter logic in `navItems` memoization to hide "Add Employee" if permission is disabled

**Implementation Details:**
```typescript
// Check if HRO user has manual entry permission for their institution
React.useEffect(() => {
  const checkManualEntryPermission = async () => {
    // Only check for HRO users with an institutionId
    if (role !== 'HRO' || !user?.institutionId) {
      setHasManualEntryPermission(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/institutions/${user.institutionId}/manual-entry-permission?t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        }
      );

      const result = await response.json();
      if (result.success && result.data) {
        // Set to true only if manual entry is enabled (not checking time window here)
        setHasManualEntryPermission(result.data.enabled === true);
      } else {
        setHasManualEntryPermission(false);
      }
    } catch (error) {
      console.error('Error checking manual entry permission:', error);
      setHasManualEntryPermission(false);
    }
  };

  checkManualEntryPermission();
}, [role, user?.institutionId]);

const navItems = React.useMemo(() => {
  const items = getNavItemsForRole(role);

  // Filter out "Add Employee" if HRO doesn't have manual entry permission
  if (role === 'HRO' && !hasManualEntryPermission) {
    return items.filter((item) => item.href !== '/dashboard/add-employee?nocache=1');
  }

  return items;
}, [role, hasManualEntryPermission]);
```

## How It Works

### For HRO Users:

1. **On Sidebar Mount:**
   - Check if user is HRO role
   - Check if user has an institutionId
   - Fetch institution's manual entry permission from API

2. **Menu Visibility Logic:**
   - If institution has `manualEntryEnabled = true` → Show "Add Employee" menu item
   - If institution has `manualEntryEnabled = false` → Hide "Add Employee" menu item
   - If user is not HRO → Hide "Add Employee" menu item (handled by role-based filtering)

3. **Cache Busting:**
   - Uses timestamp query parameter `?t=${Date.now()}`
   - Sets no-cache headers to ensure fresh data

### For Other Roles:

- Menu item is already hidden by role-based filtering in `getNavItemsForRole()`
- Only HRO role has access to "Add Employee" in the navigation config

## Multi-Layer Protection

The "Add Employee" feature is protected at multiple levels:

### 1. **Sidebar (UI Level)** ✅ NEW
- Menu item hidden if institution doesn't have manual entry enabled
- Users won't see the option in navigation

### 2. **Page Level** ✅ Existing
- `src/app/dashboard/add-employee/page.tsx` checks permission
- Shows access denied message if:
  - User is not HRO
  - User missing institutionId
  - Institution has `manualEntryEnabled = false`
  - Current time is outside the permitted time window

### 3. **Middleware Level** ✅ Existing
- `middleware.ts` checks role-based access
- Only HRO users can access `/dashboard/add-employee` route
- Redirects unauthorized users

### 4. **API Level** ✅ Existing
- `/api/employees/manual-entry` route checks authentication
- Validates user has HRO role
- Validates institution has manual entry enabled

## Testing

### Test Case 1: Institution with Manual Entry Enabled
1. Admin enables "Manual Entry" for an institution
2. HRO user from that institution logs in
3. **Expected:** "Add Employee" menu item is visible in sidebar
4. **Expected:** Clicking it opens the add employee page

### Test Case 2: Institution with Manual Entry Disabled
1. Admin disables "Manual Entry" for an institution
2. HRO user from that institution logs in
3. **Expected:** "Add Employee" menu item is NOT visible in sidebar
4. **Expected:** Direct URL access shows access denied page

### Test Case 3: Non-HRO User
1. User with HHRMD/HRMO/other role logs in
2. **Expected:** "Add Employee" menu item is NOT visible (role-based filtering)

### Test Case 4: HRO User Without InstitutionId
1. HRO user without institutionId logs in
2. **Expected:** "Add Employee" menu item is NOT visible
3. **Expected:** Direct URL access shows "missing institution information" error

## Admin Configuration

Admins can enable/disable manual entry for institutions at:
- **Page:** `/dashboard/admin/institutions`
- **Fields:**
  - `Enable Manual Entry` - Toggle to enable/disable
  - `Manual Entry Start Date` - Optional start date
  - `Manual Entry End Date` - Optional end date

## API Endpoints Used

### Check Manual Entry Permission
```
GET /api/institutions/[id]/manual-entry-permission
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "enabled": true,
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-12-31T23:59:59.999Z",
    "isWithinTimeWindow": true
  }
}
```

## Database Schema

The institution's manual entry settings are stored in the `Institution` table:

```prisma
model Institution {
  id                    String    @id @default(cuid())
  name                  String
  manualEntryEnabled    Boolean   @default(false)
  manualEntryStartDate  DateTime?
  manualEntryEndDate    DateTime?
  // ... other fields
}
```

## Performance Considerations

- Permission check happens once on sidebar mount
- Uses cache-busting to ensure fresh data
- No polling or repeated requests
- Sidebar re-checks permission when user or role changes

## Edge Cases Handled

1. **User without institutionId:** Menu hidden, shows error on page
2. **API error:** Menu hidden by default (fail-safe)
3. **Network timeout:** Menu hidden by default
4. **Invalid response:** Menu hidden by default
5. **Time window check:** Only checked on page, not in sidebar (to keep UI consistent)

## Future Enhancements

If needed, could add:
1. Real-time updates via WebSocket when admin changes settings
2. Visual indicator showing when manual entry window expires
3. Tooltip explaining why menu item is hidden
4. Admin notification when HRO tries to access without permission

## Rollback

If issues occur, the change can be rolled back by reverting the sidebar component:
```bash
git log --oneline src/components/layout/sidebar.tsx
git checkout <previous-commit> src/components/layout/sidebar.tsx
npm run build
pm2 restart all
```

## Deployment

After making this change, deploy using:
```bash
./scripts/force-fresh-deployment.sh
```

Or manually:
```bash
rm -rf .next
npm run build
pm2 restart all
```

Clear browser cache after deployment to see changes immediately.

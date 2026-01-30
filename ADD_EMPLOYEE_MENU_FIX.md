# Add Employee Menu Visibility Fix

## Problem
The "Add Employee" menu item was not visible to HRO users, even when their institution had manual entry enabled. The issue was that the menu item was not defined in the navigation configuration at all.

## Root Cause
The "Add Employee" menu item was missing from the `NAV_ITEMS` array in `src/lib/navigation.ts`. The sidebar component was trying to filter out a non-existent menu item, so it never appeared for any HRO users.

## Solution
Added the "Add Employee" menu item to the navigation configuration with the following properties:
- **Title**: "Add Employee"
- **Icon**: UserPlus (imported from lucide-react)
- **Route**: `/dashboard/add-employee?nocache=1`
- **Roles**: HRO only
- **Description**: "Manually add a new employee to the system."

The sidebar component already had the correct filtering logic to hide this menu item if the HRO's institution doesn't have manual entry enabled.

## Changes Made

### 1. `src/lib/navigation.ts`
- Added `UserPlus` to the icon imports
- Added "Add Employee" menu item to the `NAV_ITEMS` array
- Positioned it after "Urgent Actions" and before "Employee Profiles"

### 2. `src/components/layout/sidebar.tsx`
- Changed initial state of `hasManualEntryPermission` from `true` to `false` to prevent brief flash of menu item before permission check completes

## How It Works

### For HRO Users with Manual Entry Enabled:
1. User logs in as HRO
2. Sidebar loads and shows all HRO menu items including "Add Employee"
3. Sidebar fetches institution's manual entry permission from API
4. If `manualEntryEnabled = true`, the menu item remains visible
5. Clicking it opens the add employee page

### For HRO Users with Manual Entry Disabled:
1. User logs in as HRO
2. Sidebar loads with "Add Employee" initially hidden (hasManualEntryPermission = false)
3. Sidebar fetches institution's manual entry permission from API
4. If `manualEntryEnabled = false`, the menu item is filtered out
5. User does not see the "Add Employee" option

### For Other Roles:
1. The menu item is not included in their navigation items (role-based filtering)
2. They never see the "Add Employee" option

## Verification

### Test Case 1: HRO at Tourism Commission (wlali)
**Institution**: KAMISHENI YA UTALII ZANZIBAR
**Institution ID**: cmd06xe2r000be6bqrqhwhbq1
**Manual Entry**: Enabled
**Expected**: ✅ "Add Employee" menu item should be visible

**API Response**:
```json
{
  "success": true,
  "data": {
    "hasPermission": true,
    "enabled": true,
    "startDate": "2026-01-28T18:00:00.000Z",
    "endDate": "2026-03-07T18:00:00.000Z",
    "isWithinTimeWindow": true
  }
}
```

### Test Case 2: HRO at Institution with Manual Entry Disabled
**Expected**: ❌ "Add Employee" menu item should NOT be visible

### Test Case 3: Non-HRO User
**Expected**: ❌ "Add Employee" menu item should NOT be visible (role-based filtering)

## Multi-Layer Protection

The "Add Employee" feature is protected at multiple levels:

1. **Navigation Level** ✅
   - Only shown to HRO role in navigation config

2. **Sidebar Level** ✅
   - Filtered out if institution doesn't have manual entry enabled

3. **Middleware Level** ✅
   - Only HRO users can access `/dashboard/add-employee` route
   - Other roles are redirected

4. **Page Level** ✅
   - Page checks permission and shows access denied if:
     - User is not HRO
     - User missing institutionId
     - Institution has `manualEntryEnabled = false`
     - Current time is outside permitted time window

5. **API Level** ✅
   - API validates user role and institution settings

## Deployment

The changes have been deployed:
1. ✅ Code changes applied
2. ✅ TypeScript type checking passed
3. ✅ Production build completed successfully
4. ✅ Application restarted via PM2

## Testing Instructions

### As HRO User at Tourism Commission (wlali):
1. Login with username: `wlali`
2. Check the left navigation menu
3. ✅ You should see "Add Employee" menu item
4. Click on it
5. ✅ You should see the add employee form

### As Admin:
1. Go to `/dashboard/admin/institutions`
2. Find "KAMISHENI YA UTALII ZANZIBAR"
3. Toggle "Enable Manual Entry" off
4. Save changes
5. Login as `wlali` again
6. ✅ "Add Employee" menu item should disappear

## Notes

- The menu item uses a cache-busting query parameter `?nocache=1` to ensure validation updates are seen immediately
- The API endpoint uses no-cache headers to ensure fresh data
- The sidebar fetches permission on mount and whenever user or role changes
- The initial state is `false` to prevent flash of menu item before permission check

## Rollback

If issues occur, revert these files:
```bash
git checkout HEAD~1 src/lib/navigation.ts
git checkout HEAD~1 src/components/layout/sidebar.tsx
npm run build
pm2 restart all
```

# Troubleshooting: Add Employee Menu Not Showing

## Current Status

✅ **Server-side verification PASSED**:
- Navigation configuration includes "Add Employee" for HRO role
- API endpoint `/api/debug/nav-test` confirms the item is in the navigation
- Both wlali and msomar's institutions have manual entry enabled

## Issue
HRO users (wlali at Tourism Commission, msomar at Skuli ya JKU) are not seeing the "Add Employee" menu item in their left navigation, even though their institutions have manual entry enabled.

## Verification Steps

### Step 1: Clear Browser Cache
**This is the most likely cause - users have old JavaScript cached.**

1. Open the application in your browser
2. Press `Ctrl+Shift+Delete` (Windows/Linux) or `Cmd+Shift+Delete` (Mac)
3. Select "Cached images and files" and "Cookies and other site data"
4. Clear data
5. Alternatively, open in **Incognito/Private browsing mode** to test

### Step 2: Check Browser Console
1. Login as wlali or msomar
2. Open browser developer tools (F12)
3. Go to the "Console" tab
4. Look for log messages starting with `[Sidebar]`

**Expected console output:**
```
[Sidebar] Checking manual entry permission: {
  role: "HRO",
  userId: "...",
  username: "wlali",
  institutionId: "cmd06xe2r000be6bqrqhwhbq1"
}
[Sidebar] Fetching permission from: /api/institutions/cmd06xe2r000be6bqrqhwhbq1/manual-entry-permission?t=...
[Sidebar] Permission API response: {
  success: true,
  data: {
    hasPermission: true,
    enabled: true,
    ...
  }
}
[Sidebar] Setting hasManualEntryPermission to: true
[Sidebar] Computing navItems: {
  role: "HRO",
  hasManualEntryPermission: true,
  totalItems: 15,
  itemTitles: ["Dashboard", "Urgent Actions", "Add Employee", ...]
}
[Sidebar] Not filtering, returning all items
```

### Step 3: Verify User Data
Check that the user object has the correct institutionId:

In the browser console, run:
```javascript
// Check localStorage
JSON.parse(localStorage.getItem('auth-storage'))
```

**Expected output should include:**
```json
{
  "state": {
    "user": {
      "id": "...",
      "username": "wlali",
      "role": "HRO",
      "institutionId": "cmd06xe2r000be6bqrqhwhbq1",
      ...
    },
    "role": "HRO",
    "isAuthenticated": true
  }
}
```

### Step 4: Manually Test Permission API
In browser console:
```javascript
// Check permission API directly
fetch('/api/institutions/cmd06xe2r000be6bqrqhwhbq1/manual-entry-permission?t=' + Date.now())
  .then(r => r.json())
  .then(console.log)
```

**Expected response:**
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

## Common Issues and Solutions

### Issue 1: Browser Cache
**Symptoms**: Old version of the app is loaded
**Solution**: Hard refresh (Ctrl+F5) or clear cache completely

### Issue 2: Missing institutionId
**Symptoms**: Console shows "Not HRO or no institutionId"
**Solution**:
1. Logout
2. Clear localStorage: `localStorage.clear()`
3. Login again

### Issue 3: Permission API Failing
**Symptoms**: Console shows error fetching permission
**Solution**:
1. Check if the institution ID is correct
2. Verify the institution exists in database
3. Check server logs: `pm2 logs production`

### Issue 4: React State Not Updating
**Symptoms**: Permission is fetched but menu doesn't update
**Solution**: This is a React state synchronization issue. Try:
1. Navigate to a different page and back
2. Logout and login again

## Database Verification

### Check Institution Settings
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: {
      username: { in: ['wlali', 'msomar'] },
      role: 'HRO'
    },
    select: {
      id: true,
      username: true,
      role: true,
      institutionId: true,
      Institution: {
        select: {
          name: true,
          manualEntryEnabled: true,
          manualEntryStartDate: true,
          manualEntryEndDate: true
        }
      }
    }
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.\$disconnect();
}

check();
"
```

### Test Permission API from Server
```bash
curl -s "http://localhost:9002/api/institutions/cmd06xe2r000be6bqrqhwhbq1/manual-entry-permission"
```

### Test Navigation API
```bash
curl -s "http://localhost:9002/api/debug/nav-test"
```

## Expected Results

### For wlali (Tourism Commission):
- ✅ Institution: KAMISHENI YA UTALII ZANZIBAR
- ✅ Institution ID: cmd06xe2r000be6bqrqhwhbq1
- ✅ Manual Entry: Enabled
- ✅ Time Window: 2026-01-28 to 2026-03-07
- ✅ Should see "Add Employee" menu

### For msomar (Skuli ya JKU):
- ✅ Institution: Skuli ya JKU
- ✅ Institution ID: cmd6d9165d0597ad7596c4c
- ✅ Manual Entry: Enabled
- ✅ Time Window: 2026-01-31 to 2027-09-07
- ✅ Should see "Add Employee" menu

## Force Fresh Deployment

If none of the above works, force a fresh deployment:

```bash
cd /www/wwwroot/nextjspro
rm -rf .next
npm run build
pm2 restart production
```

Then clear browser cache completely and test again.

## Debug Logging

The sidebar component now includes comprehensive debug logging. When users login, check the browser console for:
1. User auth state
2. Permission check API calls
3. Navigation items computation
4. Filtering logic

All logs are prefixed with `[Sidebar]` for easy identification.

## Contact Points

If the issue persists after trying all the above:
1. Provide screenshots of browser console logs
2. Provide screenshot of the navigation menu
3. Confirm which browser and version is being used
4. Confirm that hard refresh was performed

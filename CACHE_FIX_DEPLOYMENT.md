# Cache Issue Fix - Deployment Guide

## Problem Summary

The `/dashboard/add-employee` page was showing stale data even with:
- New browsers
- Different devices
- `?nocache=1` query parameter

This was NOT a browser cache issue, but a **server-side caching problem** with multiple layers:

1. **Next.js Route Caching** - API routes were being cached by Next.js
2. **API Response Caching** - Responses didn't have proper cache-control headers
3. **Stale localStorage** - Auth state in localStorage had outdated user data
4. **Potential Nginx Caching** - While nginx was configured correctly, responses without cache headers could be cached

## What Was Fixed

### 1. API Routes - Force Dynamic & No-Cache Headers

**Files Modified:**
- `/src/app/api/auth/refresh-user-data/route.ts`
- `/src/app/api/institutions/[id]/manual-entry-permission/route.ts`

**Changes:**
- Added `export const dynamic = 'force-dynamic'` to prevent Next.js caching
- Added `export const revalidate = 0` to disable revalidation caching
- Added cache-control headers to ALL responses:
  ```
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
  Pragma: no-cache
  Expires: 0
  ```

### 2. Client-Side Fetch - Cache Busting

**Files Modified:**
- `/src/app/dashboard/add-employee/page.tsx`
- `/src/store/auth-store.ts`

**Changes:**
- Added timestamp query parameter: `?t=${Date.now()}`
- Added fetch options:
  ```javascript
  {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  }
  ```

### 3. Auto-Refresh on Page Load

**File Modified:**
- `/src/app/dashboard/add-employee/page.tsx`

**Changes:**
- Page now automatically refreshes user data from database when `institutionId` is missing
- Updates the auth store with fresh data without requiring logout/login
- Continues with permission check using the refreshed data

### 4. Manual Refresh Button

**File Modified:**
- `/src/app/dashboard/add-employee/page.tsx`

**Changes:**
- Added "Refresh User Data" button in error message
- Users can click to force-refresh their data from the database
- Updates the UI immediately without page reload

## Deployment Steps

### 1. Rebuild the Application

```bash
cd /www/wwwroot/nextjspro

# Install dependencies if needed
npm install

# Build the production application
npm run build
```

### 2. Restart the Application

```bash
# If using PM2
pm2 restart ecosystem.config.js

# Or restart the specific Next.js process
pm2 restart nextjs

# Check status
pm2 status
pm2 logs nextjs --lines 50
```

### 3. Reload Nginx (if needed)

```bash
# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Or using aaPanel
service nginx reload
```

### 4. Clear Any Server-Side Caches

```bash
# Clear Next.js build cache if needed
rm -rf /www/wwwroot/nextjspro/.next/cache

# Rebuild if you cleared cache
npm run build
pm2 restart nextjs
```

## Testing the Fix

### Test 1: Basic Access Test

1. Login as an HRO user
2. Navigate to `/dashboard/add-employee`
3. Check browser console for logs:
   - `[ADD-EMPLOYEE] Full user object:`
   - `[ADD-EMPLOYEE] User institutionId:`
4. Verify that institutionId is displayed correctly

### Test 2: Stale Data Recovery Test

1. If you see "missing institution information" error:
2. Click the **"Refresh User Data"** button
3. The page should reload with correct data
4. Permission check should pass if institution has manual entry enabled

### Test 3: Fresh Browser Test

1. Open in a completely new browser (or incognito mode)
2. Login as HRO
3. Navigate to `/dashboard/add-employee`
4. Should work correctly on first try

### Test 4: API Response Headers Test

```bash
# Test refresh-user-data endpoint
curl -I https://csms.zanajira.go.tz/api/auth/refresh-user-data \
  -H "Cookie: auth-storage=YOUR_COOKIE_VALUE"

# Should see these headers:
# Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
# Pragma: no-cache
# Expires: 0
```

### Test 5: Network Tab Test

1. Open browser DevTools → Network tab
2. Navigate to `/dashboard/add-employee`
3. Look for requests to:
   - `/api/auth/refresh-user-data?t=<timestamp>`
   - `/api/institutions/<id>/manual-entry-permission?t=<timestamp>`
4. Verify:
   - Requests have unique timestamps (no caching)
   - Response headers include `Cache-Control: no-store`
   - Status code is 200 (not 304 Not Modified)

## Troubleshooting

### Issue: Still seeing stale data

**Solution:**
1. Click "Refresh User Data" button on the error page
2. If that doesn't work, clear browser localStorage:
   ```javascript
   // In browser console:
   localStorage.clear()
   // Then login again
   ```

### Issue: "Refresh User Data" button doesn't work

**Check:**
1. Browser console for error messages
2. Network tab - is the API request being made?
3. Server logs: `pm2 logs nextjs`
4. Database connection - can the API fetch user data?

### Issue: Permission denied even with correct institution

**Check:**
1. Institution's `manualEntryEnabled` field in database
2. Institution's `manualEntryStartDate` and `manualEntryEndDate`
3. Current server time vs. the date range
4. User's `institutionId` matches the institution with permissions

### Issue: 500 Internal Server Error

**Check:**
1. Server logs: `pm2 logs nextjs --err`
2. Database connection
3. Prisma client errors
4. File permissions

## Rollback Plan

If issues occur after deployment:

```bash
# 1. Check out previous version
git log --oneline  # Find the commit before the changes
git checkout <previous-commit-hash>

# 2. Rebuild
npm run build

# 3. Restart
pm2 restart nextjs

# 4. Reload nginx
systemctl reload nginx
```

## Verification Checklist

- [ ] Application builds successfully (`npm run build`)
- [ ] PM2 shows process as running (`pm2 status`)
- [ ] No errors in PM2 logs (`pm2 logs nextjs`)
- [ ] Nginx configuration is valid (`nginx -t`)
- [ ] HRO users can access add-employee page
- [ ] Permission checks work correctly
- [ ] Auto-refresh fixes missing institutionId
- [ ] Manual refresh button works
- [ ] No cache-related headers in API responses
- [ ] Fresh browser loads page correctly
- [ ] Different devices can access without cache issues

## Long-term Monitoring

Monitor these metrics after deployment:

1. **Error Rate**: Check for increase in 500/404 errors
2. **Response Time**: Ensure API calls aren't slower
3. **User Reports**: Watch for complaints about permissions
4. **Server Logs**: Monitor for database connection issues

## Files Modified Summary

```
src/app/api/auth/refresh-user-data/route.ts
src/app/api/institutions/[id]/manual-entry-permission/route.ts
src/app/dashboard/add-employee/page.tsx
src/store/auth-store.ts
```

## Additional Notes

- The nginx configuration was already correct - no changes needed there
- The fix is backwards compatible - existing functionality is preserved
- The auto-refresh feature only triggers when needed (missing institutionId)
- Cache headers are comprehensive to cover all proxy/CDN scenarios
- Timestamp-based cache busting ensures unique requests every time

## Support

If issues persist after applying these fixes:

1. Check browser console for specific error messages
2. Review PM2 logs for backend errors
3. Verify database user data has `institutionId` set
4. Test with a different HRO user account
5. Check if the issue is specific to certain institutions

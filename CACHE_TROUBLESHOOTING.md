# Cache Troubleshooting Guide

## Problem
Changes to the code are not appearing in the browser after rebuild and restart.

## Root Cause
Multiple layers of aggressive caching:
1. **Nginx caching** - `/_next/static` files cached for 1 year
2. **Browser caching** - Following nginx cache headers
3. **Next.js build cache** - Old build artifacts
4. **Service worker** - If enabled, can cache pages

## Complete Solution

### Step 1: Run Force Fresh Deployment

```bash
cd /www/wwwroot/nextjspro
./scripts/force-fresh-deployment.sh
```

This script will:
- ✅ Stop all PM2 processes
- ✅ Clear Next.js build directory (`.next`)
- ✅ Clear Node modules cache
- ✅ Clear npm cache
- ✅ Clear Prisma generated files
- ✅ Reinstall dependencies
- ✅ Regenerate Prisma client
- ✅ Build fresh production app
- ✅ Clear Nginx cache directories
- ✅ Reload Nginx
- ✅ Restart PM2 processes

### Step 2: Clear Browser Cache

After server deployment, **CRITICAL** - Clear browser cache:

**Method 1: Hard Refresh (Quick)**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Method 2: Clear All Cache (Recommended)**
1. Open browser settings
2. Privacy/Security → Clear browsing data
3. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data (if willing to re-login)
4. Time range: "All time"
5. Click "Clear data"

**Method 3: Incognito/Private Window (Testing)**
- Open new incognito/private window
- This bypasses all browser cache
- Good for testing if server-side changes worked

**Method 4: Different Browser**
- Try Chrome, Firefox, Edge, Safari
- If it works in one but not another, it's browser cache

### Step 3: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check recent logs
pm2 logs production --lines 50

# Check for build errors
cat /www/wwwroot/nextjspro/.next/build-manifest.json | head

# Test API endpoint
curl -I https://csms.zanajira.go.tz/api/auth/refresh-user-data
# Should see: Cache-Control: no-store, no-cache...

# Check if new build has different hash
ls -la /www/wwwroot/nextjspro/.next/static/
```

## Understanding the Cache Layers

### 1. Nginx Cache (Server-Side)
**Location:** nginx-cscs-ssl.conf lines 73-89

```nginx
location /_next/static {
    expires 1y;  # 1 YEAR CACHE!
    add_header Cache-Control "public, immutable, max-age=31536000";
}
```

**Why it's aggressive:** Next.js includes content hashes in filenames, so same content = same filename. BUT if build doesn't generate new hashes, old files persist.

**Solution:** Clear nginx cache + ensure fresh build

### 2. Browser Cache (Client-Side)
Browsers respect `Cache-Control` headers from nginx. With 1-year expiry, browsers won't even check server for updates.

**Solution:** Hard refresh or clear browser cache

### 3. Next.js Build Cache
Next.js caches build artifacts to speed up rebuilds.

**Solution:** Delete `.next` directory before build

### 4. Node Modules Cache
Webpack and other tools cache in `node_modules/.cache`

**Solution:** Clear during deployment

## Quick Verification Checklist

After deployment, verify these:

- [ ] PM2 shows "online" status: `pm2 status`
- [ ] Recent logs show no errors: `pm2 logs production --lines 20`
- [ ] Build directory exists: `ls -la .next/`
- [ ] Static files have new timestamps: `ls -lat .next/static/ | head`
- [ ] Browser shows new changes (after hard refresh)
- [ ] Network tab shows 200 responses (not 304 Not Modified)
- [ ] Network tab shows no cached `/_next/static` files
- [ ] Required fields show red asterisk in add-employee page
- [ ] ZSSF/Payroll validation works (shows "Validating..." on blur)

## Testing the Add Employee Page

1. **Navigate to:** https://csms.zanajira.go.tz/dashboard/add-employee
2. **Login as HRO** with proper institution permissions
3. **Check for these changes:**
   - ✅ Date of Birth has red asterisk (*)
   - ✅ ZSSF Number has red asterisk (*)
   - ✅ Payroll Number has red asterisk (*)
   - ✅ Try entering duplicate ZSSF → Should show "Validating..." then error
   - ✅ Try entering duplicate Payroll → Same validation
   - ✅ Try leaving required fields empty and clicking Next → Should show errors

## If Still Not Working

### Option 1: Check Build Output
```bash
cd /www/wwwroot/nextjspro
npm run build 2>&1 | tee build-output.log
cat build-output.log
```
Look for:
- Build errors
- Warning about cached routes
- Missing dependencies

### Option 2: Manually Clear Everything
```bash
# Stop everything
pm2 stop all
pm2 delete all

# Nuclear option - clear everything
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma
npm cache clean --force

# Clear nginx
rm -rf /www/server/nginx/proxy_cache_dir/*
rm -rf /var/cache/nginx/*

# Fresh install
npm install --legacy-peer-deps
npx prisma generate
NODE_ENV=production npm run build

# Restart
nginx -t && systemctl reload nginx
pm2 start ecosystem.config.js
pm2 save
```

### Option 3: Check Nginx Active Config
```bash
# Find active nginx config
nginx -T | grep -A 50 "cscs.zanajira.go.tz"

# Check if our config is being used
ls -la /etc/nginx/sites-enabled/
ls -la /www/server/panel/vhost/nginx/
```

### Option 4: Verify File Permissions
```bash
# Check ownership
ls -la /www/wwwroot/nextjspro/.next/

# Fix if needed
chown -R www:www /www/wwwroot/nextjspro/.next/
chmod -R 755 /www/wwwroot/nextjspro/.next/
```

### Option 5: Check if Changes Actually in Code
```bash
# Verify the code has the changes
grep -n "Date of Birth.*\*" /www/wwwroot/nextjspro/src/components/manual-entry/personal-info-step.tsx

# Should show line ~300: Date of Birth <span className="text-red-500">*</span>
```

## Advanced Debugging

### Check Network Tab
1. Open DevTools (F12)
2. Network tab
3. Reload page
4. Look for `/_next/static/chunks/` files
5. Check:
   - Status: Should be 200 (not 304)
   - Headers → Response Headers → Cache-Control
   - Timing → Check if served from cache

### Check Service Worker
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('Service Workers:', registrations);
    // If any exist, unregister:
    registrations.forEach(reg => reg.unregister());
});
```

### Check localStorage
```javascript
// In browser console
console.log(localStorage);
// Clear if needed:
localStorage.clear();
```

## Prevention - Future Deployments

Always use the deployment script:
```bash
./scripts/force-fresh-deployment.sh
```

OR at minimum:
```bash
rm -rf .next
npm run build
pm2 restart all
```

## Contact

If issues persist after all these steps:
1. Check build logs: `pm2 logs production --err`
2. Check nginx error logs: `tail -f /www/wwwlogs/cscs.zanajira.go.tz.error.log`
3. Verify database connectivity
4. Check if PM2 is actually running the new code: `pm2 describe production`

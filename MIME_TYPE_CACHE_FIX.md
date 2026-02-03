# MIME Type Mismatch - Cache Issue Fix

## Problem Summary
Browser showing error:
```
The resource from "https://csms.zanajira.go.tz/_next/static/chunks/webpack-4be114fd215b30e5.js"
was blocked due to MIME type ("text/plain") mismatch (X-Content-Type-Options: nosniff)
```

## Root Cause
This is **NOT a MIME type issue** - it's a **cache issue**!

### What Actually Happened:
1. Old build had file: `webpack-4be114fd215b30e5.js`
2. New build has file: `webpack-5b2677dfb53c8b50.js` (different hash)
3. Browser cached the old HTML that references the old webpack file
4. Old webpack file no longer exists
5. Server returns 404 with `text/plain` content type (error page)
6. Browser blocks it due to MIME type mismatch

## Solution

### For Users (REQUIRED)
Users MUST clear their browser cache. There are 3 methods:

#### Method 1: Hard Refresh (Quick)
- **Windows/Linux:** Press `Ctrl + Shift + R`
- **Mac:** Press `Cmd + Shift + R`
- **Effect:** Reloads page without cache

#### Method 2: Clear Browser Cache (Recommended)
1. Open browser settings
2. Privacy/Security → Clear browsing data
3. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data (optional, requires re-login)
4. Time range: "Last hour" or "Last 24 hours"
5. Click "Clear data"

#### Method 3: Incognito/Private Window (Testing)
- Open new incognito/private window
- Navigate to https://csms.zanajira.go.tz
- If it works here, it confirms cache is the issue

### For Server (Already Done ✅)
- ✅ Nginx cache cleared
- ✅ SSL certificates fixed
- ✅ Nginx reloaded
- ✅ Application rebuilt and restarted

## Verification

### Check Current Build Hash
```bash
ls -la /www/wwwroot/nextjspro/.next/static/chunks/webpack-*.js
# Should show: webpack-5b2677dfb53c8b50.js
```

### Test Direct Access
```bash
curl -I http://localhost:9002/_next/static/chunks/webpack-5b2677dfb53c8b50.js
# Should return: 200 OK with correct Content-Type
```

### Test via Nginx
```bash
curl -I https://csms.zanajira.go.tz/_next/static/chunks/webpack-5b2677dfb53c8b50.js
# Should return: 200 OK
```

## Why This Happened

### Build Process Creates New Hashes
Every time Next.js builds, it creates new files with content-based hashes:
- Build 1: `webpack-4be114fd215b30e5.js`
- Build 2: `webpack-5b2677dfb53c8b50.js`
- Build 3: `webpack-[different-hash].js`

### Caching Layers
1. **Browser Cache** - Caches HTML, CSS, JS
2. **Nginx Cache** - Caches proxy responses
3. **CDN Cache** - If using CDN (not applicable here)

### The Issue Chain
```
Browser loads page
  ↓
Gets cached HTML (references old webpack-4be114fd215b30e5.js)
  ↓
Requests old webpack file
  ↓
File doesn't exist (404 error)
  ↓
Server returns 404 page with text/plain
  ↓
Browser blocks due to MIME mismatch
  ↓
Page fails to load
```

## Prevention

### 1. Proper Cache Headers
Our nginx config already has this for `/_next/static`:
```nginx
location /_next/static {
    expires 1y;
    add_header Cache-Control "public, immutable, max-age=31536000";
}
```

This is CORRECT because:
- Files have content hashes
- Same content = same filename
- Different content = different filename
- Old files get naturally purged

### 2. Don't Cache HTML Pages
Our nginx config correctly does NOT cache HTML:
```nginx
location / {
    proxy_pass http://127.0.0.1:9002;
    proxy_cache_bypass $http_upgrade;
}
```

### 3. Clear Caches After Deployment
Always run after deployment:
```bash
# Clear nginx cache
rm -rf /www/server/nginx/proxy_cache_dir/*

# Reload nginx
/www/server/nginx/sbin/nginx -s reload

# Restart PM2
pm2 restart all
```

## Current Status

### ✅ Server-Side (Fixed)
- Application built successfully
- PM2 processes running
- Nginx running and reloaded
- Caches cleared
- SSL certificates restored

### ⚠️ Client-Side (User Action Required)
Users need to clear browser cache to get the new HTML that references the correct webpack files.

## Instructions for Users

Send this message to users:

---

**Important Update Notice**

We've deployed a new version of the application. Please clear your browser cache:

**Quick Fix:**
- Press `Ctrl + Shift + R` (Windows/Linux)
- Press `Cmd + Shift + R` (Mac)

**If that doesn't work:**
1. Clear your browser cache (Settings → Privacy → Clear browsing data)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page

**Alternative:**
- Try accessing the site in incognito/private mode

Sorry for the inconvenience!

---

## Troubleshooting

### Issue: Still seeing MIME type errors after clearing cache
**Solution:**
1. Close ALL browser windows
2. Clear cache again
3. Reopen browser
4. Navigate to site

### Issue: Works in incognito but not in regular browser
**Solution:**
- Confirms cache issue
- Clear cache more aggressively:
  - Close browser completely
  - Clear ALL browsing data (not just cache)
  - Restart browser

### Issue: Works on one device but not another
**Solution:**
- Each device has its own cache
- Clear cache on each device separately

### Issue: Getting different webpack hash in error
**Solution:**
- Note the webpack hash in the error message
- Check if that file exists:
  ```bash
  ls -la /www/wwwroot/nextjspro/.next/static/chunks/webpack-*.js
  ```
- If file doesn't exist, it's a cache issue
- User must clear browser cache

## Preventing Future Issues

### Option 1: Cache Busting Query Parameter
Add to next.config.js:
```javascript
module.exports = {
  generateBuildId: async () => {
    return `build-${Date.now()}`
  }
}
```

### Option 2: Service Worker Cache Clear
Implement service worker to clear old caches on update.

### Option 3: Cache-Control for HTML
Serve HTML with:
```
Cache-Control: no-cache, must-revalidate
```

## Monitoring

After deployment, monitor:
1. **Error Rate** - Check for MIME type errors
2. **User Reports** - Users reporting blank pages
3. **Browser Console** - Check for 404s on webpack files

## Related Files
- `/www/server/panel/vhost/nginx/csms.zanajira.go.tz.conf` - Nginx config
- `/www/wwwroot/nextjspro/.next/static/chunks/` - Webpack chunks
- `/www/server/nginx/proxy_cache_dir/` - Nginx cache

## Summary

**The application is working correctly.**
**Users need to clear their browser cache to see the new version.**

This is a normal occurrence after deployment and will happen every time we rebuild the application with code changes.

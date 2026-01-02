# aaPanel Configuration Guide for CSMS

## Serving Next.js App via https://test.zanajira.go.tz/

This guide will help you configure aaPanel to serve your Next.js application through a custom domain with SSL.

---

## Prerequisites

- [ ] Next.js app running on port 9002 (confirmed ✓)
- [ ] aaPanel installed and accessible
- [ ] DNS access to configure test.zanajira.go.tz
- [ ] Server IP: 102.207.206.28

---

## Step 1: Configure DNS

**Before proceeding with aaPanel, configure your DNS settings:**

1. Log in to your DNS management panel (where zanajira.go.tz is managed)
2. Add an A record:
   - **Type**: A
   - **Name/Host**: test
   - **Value/Points to**: 102.207.206.28
   - **TTL**: 3600 (or default)

3. Save and wait for DNS propagation (5-30 minutes)

4. Verify DNS propagation:

   ```bash
   # Run this on your local machine or server
   nslookup test.zanajira.go.tz
   # Should return: 102.207.206.28

   # Or use dig
   dig test.zanajira.go.tz +short
   ```

---

## Step 2: Create Website in aaPanel

1. **Access aaPanel**:
   - Open your browser
   - Navigate to: `http://102.207.206.28:7800` (or your aaPanel port)
   - Login with your credentials

2. **Create New Website**:
   - Click on **"Website"** in the left sidebar
   - Click **"Add Site"** button
   - Fill in the form:
     - **Domain**: `test.zanajira.go.tz`
     - **Root Directory**: `/www/wwwroot/test.zanajira.go.tz` (default is fine)
     - **FTP**: No (uncheck)
     - **Database**: No (uncheck - we already have our database)
     - **PHP Version**: Pure static (we're using reverse proxy)
   - Click **"Submit"**

3. **Website Created**:
   - You should now see `test.zanajira.go.tz` in your website list

---

## Step 3: Configure Reverse Proxy

### Method A: Using aaPanel Reverse Proxy Plugin (Recommended)

1. **Install Nginx Reverse Proxy Plugin** (if not installed):
   - Go to **App Store** in aaPanel
   - Search for **"Reverse Proxy"** or **"Nginx Reverse Proxy"**
   - Click **Install**

2. **Configure Reverse Proxy**:
   - Go to **Website** → Find `test.zanajira.go.tz` → Click **"Settings"**
   - Click on **"Reverse Proxy"** tab
   - Click **"Add Reverse Proxy"**
   - Fill in:
     - **Proxy Name**: CSMS Next.js App
     - **Target URL**: `http://127.0.0.1:9002`
     - **Enable**: Yes
     - **Send Domain**: `$host`
     - **Additional Configuration**: Leave as default
   - Click **"Submit"**

### Method B: Manual Nginx Configuration

If the reverse proxy plugin is not available, manually edit the Nginx configuration:

1. **Edit Site Configuration**:
   - Go to **Website** → Find `test.zanajira.go.tz` → Click **"Settings"**
   - Click on **"Configuration File"** tab

2. **Replace the location block** with this configuration:

```nginx
server {
    listen 80;
    server_name test.zanajira.go.tz;

    # Access and error logs
    access_log /www/wwwlogs/test.zanajira.go.tz.log;
    error_log /www/wwwlogs/test.zanajira.go.tz.error.log;

    # Root directory (not used for proxy but required)
    root /www/wwwroot/test.zanajira.go.tz;
    index index.html;

    # Client body size for file uploads
    client_max_body_size 50M;

    # Reverse proxy to Next.js app
    location / {
        proxy_pass http://127.0.0.1:9002;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Caching
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # Next.js static files and assets
    location /_next/static {
        proxy_pass http://127.0.0.1:9002;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    # Next.js image optimization
    location /_next/image {
        proxy_pass http://127.0.0.1:9002;
        proxy_cache_valid 200 24h;
    }

    # API routes
    location /api {
        proxy_pass http://127.0.0.1:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Favicon and other static files
    location ~* \.(ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:9002;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. **Save** the configuration
4. **Reload Nginx**:
   - In aaPanel, there's usually a **"Reload Configuration"** or **"Service"** → **"Nginx"** → **"Reload"** button
   - Or click the **"Save"** button which should auto-reload

---

## Step 4: Test HTTP Access

Before setting up SSL, test that the reverse proxy works:

1. **Test from command line**:

   ```bash
   curl -H "Host: test.zanajira.go.tz" http://102.207.206.28/
   # Should return your Next.js app HTML
   ```

2. **Test from browser**:
   - Visit: `http://test.zanajira.go.tz/`
   - You should see your CSMS login page

3. **If it doesn't work**, check:
   - DNS is propagated: `nslookup test.zanajira.go.tz`
   - App is running: `pm2 status`
   - Nginx configuration is correct
   - Check Nginx error logs in aaPanel

---

## Step 5: Install SSL Certificate

### Option A: Let's Encrypt (Free SSL) - Recommended

1. **In aaPanel**:
   - Go to **Website** → Find `test.zanajira.go.tz` → Click **"Settings"**
   - Click on **"SSL"** tab
   - Select **"Let's Encrypt"**
   - Fill in:
     - **Domain**: Ensure `test.zanajira.go.tz` is checked
     - **Email**: Your email address (for renewal notifications)
   - Click **"Apply"**
   - Wait for the certificate to be issued (usually 1-2 minutes)

2. **Enable HTTPS**:
   - After certificate is installed, you'll see options:
   - **Enable**: Turn on the toggle to enable SSL
   - **Force HTTPS**: Turn on to redirect HTTP to HTTPS automatically
   - Click **"Save"**

### Option B: Upload Your Own Certificate

If you have a certificate from your organization:

1. **In aaPanel**:
   - Go to **Website** → Find `test.zanajira.go.tz` → Click **"Settings"**
   - Click on **"SSL"** tab
   - Select **"Other Certificate"**
   - Paste:
     - **Certificate (PEM format)**: Your certificate file content
     - **Private Key**: Your private key file content
     - **Certificate Chain** (if available): CA bundle
   - Click **"Save"**

2. **Enable HTTPS**:
   - **Enable**: Turn on SSL
   - **Force HTTPS**: Enable redirect
   - Click **"Save"**

---

## Step 6: Update Next.js Environment Variables

Your Next.js app needs to know it's running behind a proxy:

1. **Edit your .env file**:

   ```bash
   nano /home/latest/.env
   ```

2. **Add or update these variables**:

   ```env
   # Application URL
   NEXT_PUBLIC_APP_URL=https://test.zanajira.go.tz
   NEXTAUTH_URL=https://test.zanajira.go.tz

   # Trust proxy
   TRUST_PROXY=true
   ```

3. **Save and restart the application**:
   ```bash
   pm2 restart csms-app
   ```

---

## Step 7: Final Testing

### Test HTTPS Access

1. **From browser**:
   - Visit: `https://test.zanajira.go.tz/`
   - Verify:
     - ✓ SSL certificate is valid (green padlock)
     - ✓ Login page loads correctly
     - ✓ All assets load (images, CSS, JS)
     - ✓ No mixed content warnings

2. **Test functionality**:
   - ✓ Login works
   - ✓ Dashboard loads
   - ✓ API calls work
   - ✓ File uploads work
   - ✓ All navigation works

3. **Test HTTP to HTTPS redirect**:
   - Visit: `http://test.zanajira.go.tz/`
   - Should automatically redirect to: `https://test.zanajira.go.tz/`

### Command Line Tests

```bash
# Test SSL certificate
curl -I https://test.zanajira.go.tz/

# Test redirect
curl -I http://test.zanajira.go.tz/

# Test API endpoint
curl https://test.zanajira.go.tz/api/health

# Test with verbose output
curl -v https://test.zanajira.go.tz/ 2>&1 | grep -E "SSL|Server|HTTP"
```

---

## Troubleshooting

### Issue: DNS not resolving

**Solution**:

```bash
# Clear local DNS cache
sudo systemd-resolve --flush-caches

# Test with specific DNS server
nslookup test.zanajira.go.tz 8.8.8.8

# Check DNS propagation globally
# Visit: https://www.whatsmydns.net/#A/test.zanajira.go.tz
```

### Issue: 502 Bad Gateway

**Cause**: Nginx can't reach the Next.js app on port 9002

**Solution**:

```bash
# Check if app is running
pm2 status

# Check if port 9002 is listening
sudo netstat -tulpn | grep 9002
# or
sudo lsof -i :9002

# Restart the app
pm2 restart csms-app

# Check app logs
pm2 logs csms-app --lines 50
```

### Issue: 504 Gateway Timeout

**Cause**: Request taking too long

**Solution**: Increase timeout in Nginx configuration:

```nginx
proxy_connect_timeout 300s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

### Issue: SSL Certificate Error

**Solution**:

```bash
# Check certificate expiry
echo | openssl s_client -servername test.zanajira.go.tz -connect 102.207.206.28:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt certificate (in aaPanel)
# Go to SSL tab → Click "Renew"
```

### Issue: Mixed Content Warnings

**Cause**: Assets loading via HTTP instead of HTTPS

**Solution**:

1. Check NEXTAUTH_URL in .env is HTTPS
2. Ensure all assets use relative URLs
3. Check browser console for specific mixed content

### Issue: File Upload Not Working

**Solution**: Increase client body size in Nginx:

```nginx
client_max_body_size 50M;  # Adjust as needed
```

### Issue: WebSocket Connection Failed

**Cause**: WebSocket headers not forwarded

**Solution**: Ensure these headers are in Nginx config:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

## Monitoring and Maintenance

### Check Nginx Access Logs

```bash
tail -f /www/wwwlogs/test.zanajira.go.tz.log
```

### Check Nginx Error Logs

```bash
tail -f /www/wwwlogs/test.zanajira.go.tz.error.log
```

### Monitor Application

```bash
pm2 monit
```

### SSL Certificate Auto-Renewal

Let's Encrypt certificates expire every 90 days. aaPanel should auto-renew them.

**Verify auto-renewal is configured**:

- aaPanel usually has this enabled by default
- Check: aaPanel → Cron → Look for SSL renewal task

---

## Security Recommendations

### 1. Firewall Configuration

Block direct access to port 9002 from external connections:

```bash
# Allow only localhost to access port 9002
sudo ufw deny 9002
sudo ufw allow from 127.0.0.1 to any port 9002

# Or with iptables
sudo iptables -A INPUT -p tcp --dport 9002 -s 127.0.0.1 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9002 -j DROP
```

### 2. Additional Security Headers

Add to Nginx configuration:

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# HSTS (only after confirming HTTPS works!)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 3. Rate Limiting

To prevent brute force attacks:

```nginx
# Add before server block
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

# Inside server block, for login endpoint
location /api/auth/login {
    limit_req zone=login_limit burst=3 nodelay;
    proxy_pass http://127.0.0.1:9002;
    # ... other proxy settings
}
```

---

## Summary Checklist

- [ ] DNS A record created pointing to 102.207.206.28
- [ ] DNS propagation verified
- [ ] Website created in aaPanel for test.zanajira.go.tz
- [ ] Nginx reverse proxy configured to port 9002
- [ ] HTTP access tested and working
- [ ] SSL certificate installed (Let's Encrypt or custom)
- [ ] HTTPS enabled and force redirect configured
- [ ] Environment variables updated in Next.js app
- [ ] Application restarted with new settings
- [ ] HTTPS access tested and working
- [ ] All functionality tested (login, dashboard, API, uploads)
- [ ] Security headers configured
- [ ] Firewall rules updated
- [ ] Monitoring configured

---

## Quick Reference

**aaPanel Access**: http://102.207.206.28:7800
**Application**: https://test.zanajira.go.tz/
**App Directory**: /home/latest
**Nginx Config**: Available in aaPanel → Website → test.zanajira.go.tz → Settings → Configuration File
**Logs**: /www/wwwlogs/test.zanajira.go.tz.log

**Useful Commands**:

```bash
# Check DNS
dig test.zanajira.go.tz +short

# Check app status
pm2 status

# Restart app
pm2 restart csms-app

# View app logs
pm2 logs csms-app

# Test SSL
curl -I https://test.zanajira.go.tz/

# Reload Nginx (if manual changes)
sudo nginx -t && sudo nginx -s reload
```

---

**Note**: After completing this configuration, your CSMS application will be accessible at https://test.zanajira.go.tz/ instead of http://102.207.206.28:9002.

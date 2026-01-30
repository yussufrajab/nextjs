# SSL Certificate Installation Guide for cscs.zanajira.go.tz

## Overview
This guide will help you install your Comodo SSL certificate on the production server (10.0.225.11) running Ubuntu 24 with Nginx and aaPanel.

## Prerequisites

You should have received the following files from Comodo:
1. **Your domain certificate** - `cscs_zanajira_go_tz.crt` (or similar name)
2. **Intermediate certificate(s)** - Usually named `COMODORSADomainValidationSecureServerCA.crt`
3. **Root certificate** - `COMODORSAAddTrustCA.crt` (sometimes included in bundle)
4. **Your private key** - `cscs_zanajira_go_tz.key` (the one you generated when creating the CSR)

Alternatively, you might receive:
- A single `.crt` file (your certificate)
- A `.ca-bundle` file (contains intermediate and root certificates)

## Installation Steps

### Step 1: Prepare Certificate Files

SSH into your server:
```bash
ssh user@10.0.225.11
```

Create a directory for SSL certificates:
```bash
sudo mkdir -p /www/server/panel/vhost/cert/cscs.zanajira.go.tz
sudo chmod 755 /www/server/panel/vhost/cert/cscs.zanajira.go.tz
```

### Step 2: Upload Certificate Files

Upload your certificate files to the server. You can use SCP from your local machine:

```bash
# From your local machine (where you downloaded the Comodo files)
scp cscs_zanajira_go_tz.crt user@10.0.225.11:/tmp/
scp cscs_zanajira_go_tz.key user@10.0.225.11:/tmp/
scp *.ca-bundle user@10.0.225.11:/tmp/  # or individual intermediate certs
```

Or use FileZilla/WinSCP to upload to `/tmp/` directory.

### Step 3: Create the Certificate Chain

SSH back into the server and combine your certificate with the intermediate certificates:

```bash
# If you have a .ca-bundle file:
sudo cat /tmp/cscs_zanajira_go_tz.crt /tmp/*.ca-bundle > /tmp/fullchain.pem

# OR if you have individual certificate files, combine them in this order:
# 1. Your domain certificate
# 2. Intermediate certificate(s)
# 3. Root certificate
sudo cat /tmp/cscs_zanajira_go_tz.crt \
        /tmp/COMODORSADomainValidationSecureServerCA.crt \
        /tmp/COMODORSAAddTrustCA.crt > /tmp/fullchain.pem
```

### Step 4: Move Files to Nginx Certificate Directory

```bash
# Move the certificate chain
sudo mv /tmp/fullchain.pem /www/server/panel/vhost/cert/cscs.zanajira.go.tz/fullchain.pem

# Move the private key
sudo mv /tmp/cscs_zanajira_go_tz.key /www/server/panel/vhost/cert/cscs.zanajira.go.tz/privkey.pem

# Set proper permissions
sudo chmod 644 /www/server/panel/vhost/cert/cscs.zanajira.go.tz/fullchain.pem
sudo chmod 600 /www/server/panel/vhost/cert/cscs.zanajira.go.tz/privkey.pem
sudo chown www-data:www-data /www/server/panel/vhost/cert/cscs.zanajira.go.tz/*
```

### Step 5: Update Nginx Configuration

Update your Nginx configuration file. If using aaPanel:

**Option A: Via aaPanel Web Interface**
1. Open aaPanel in your browser
2. Go to **Website** → Find **cscs.zanajira.go.tz** → **Settings**
3. Go to **Configuration File** tab
4. Replace with the configuration from `nginx-cscs-ssl.conf` (provided separately)
5. Click **Save**

**Option B: Via Command Line**
```bash
# Backup current configuration
sudo cp /www/server/panel/vhost/nginx/cscs.zanajira.go.tz.conf \
        /www/server/panel/vhost/nginx/cscs.zanajira.go.tz.conf.backup

# Edit the configuration
sudo nano /www/server/panel/vhost/nginx/cscs.zanajira.go.tz.conf
# Paste the configuration from nginx-cscs-ssl.conf
```

### Step 6: Test Nginx Configuration

Before restarting Nginx, test the configuration:

```bash
sudo nginx -t
```

You should see:
```
nginx: the configuration file /www/server/nginx/conf/nginx.conf syntax is ok
nginx: configuration file /www/server/nginx/conf/nginx.conf test is successful
```

If there are errors, double-check:
- File paths are correct
- Certificate files exist
- Permissions are set correctly

### Step 7: Restart Nginx

```bash
sudo systemctl restart nginx
# or if using aaPanel
sudo /etc/init.d/nginx restart
```

Check Nginx status:
```bash
sudo systemctl status nginx
```

### Step 8: Verify SSL Installation

From within your internal network, test the HTTPS connection:

```bash
# Check SSL certificate
curl -v https://cscs.zanajira.go.tz

# Or use OpenSSL to verify
openssl s_client -connect cscs.zanajira.go.tz:443 -servername cscs.zanajira.go.tz
```

You should see your certificate details with:
- Issuer: Comodo/Sectigo
- Subject: cscs.zanajira.go.tz
- Validity dates

### Step 9: Update Firewall (if needed)

Ensure HTTPS port is open:

```bash
sudo ufw status
sudo ufw allow 443/tcp
sudo ufw reload
```

## Verification Checklist

- [ ] HTTPS works: `https://cscs.zanajira.go.tz`
- [ ] Certificate shows "Secure" in browser (no warnings)
- [ ] HTTP redirects to HTTPS (after uncommenting redirect block)
- [ ] Certificate issuer is Comodo/Sectigo
- [ ] Certificate matches your domain: cscs.zanajira.go.tz
- [ ] Certificate expiry date is correct
- [ ] Next.js application loads correctly over HTTPS
- [ ] File uploads work over HTTPS
- [ ] All API endpoints work

## Troubleshooting

### Issue: "Certificate verification failed"
- Check that fullchain.pem includes all intermediate certificates
- Verify the order: domain cert → intermediate → root

### Issue: "Private key does not match certificate"
- Ensure you're using the same private key that was used to generate the CSR
- Test with: `openssl x509 -noout -modulus -in fullchain.pem | openssl md5`
- Compare with: `openssl rsa -noout -modulus -in privkey.pem | openssl md5`
- The MD5 hashes should match

### Issue: "Connection refused on port 443"
- Check if Nginx is listening: `sudo netstat -tlnp | grep :443`
- Check firewall: `sudo ufw status`
- Check Nginx error logs: `sudo tail -f /www/wwwlogs/cscs.zanajira.go.tz.error.log`

### Issue: Mixed content warnings
- Ensure all internal links use HTTPS or relative URLs
- Check browser console for blocked HTTP resources

## Certificate Renewal

Comodo SSL certificates typically last 1-2 years. Set a reminder to renew 30 days before expiry.

When renewing:
1. Generate a new CSR with your private key (or generate a new key pair)
2. Submit CSR to Comodo
3. Follow steps 2-7 above with the new certificate files
4. No downtime needed - Nginx will use new certificate after restart

## Security Best Practices

1. **Keep private key secure**: Never share or expose `privkey.pem`
2. **Set proper permissions**: Private key should be readable only by root and www-data
3. **Enable HSTS**: After confirming HTTPS works (already in config)
4. **Monitor expiry**: Set calendar reminder for renewal
5. **Regular updates**: Keep Nginx and OpenSSL updated

## Support

If you encounter issues:
1. Check Nginx error logs: `/www/wwwlogs/cscs.zanajira.go.tz.error.log`
2. Check system logs: `sudo journalctl -u nginx -f`
3. Verify certificate chain with SSL Labs (if accessible from internet)
4. Contact Comodo support with your order number

## Files Provided

- `nginx-cscs-ssl.conf` - Complete Nginx configuration with SSL enabled
- `SSL_INSTALLATION_GUIDE.md` - This guide

## Notes for Private Network Setup

Since your server is on a private IP (10.0.225.11):
- SSL will work perfectly for internal users accessing cscs.zanajira.go.tz
- The certificate will be valid as long as internal DNS resolves cscs.zanajira.go.tz correctly
- Users must be on the government network or VPN to access the application
- Let's Encrypt is not suitable because it requires public internet validation
- Commercial SSL from Comodo is the correct choice for this scenario

# SSL Installation Quick Checklist

## Before You Start

### Files You Need from Comodo

- [ ] Domain certificate: `cscs_zanajira_go_tz.crt`
- [ ] Private key: `cscs_zanajira_go_tz.key` (the one you used to create CSR)
- [ ] CA Bundle or Intermediate certificates
- [ ] Root certificate (if separate)

### Server Information

- **Server IP**: 10.0.225.11
- **Domain**: cscs.zanajira.go.tz
- **App Port**: 9002
- **OS**: Ubuntu 24
- **Web Server**: Nginx (via aaPanel)

## Installation Steps (Quick Reference)

### 1. Upload Files
```bash
# Upload to /tmp/ using SCP or FileZilla
scp *.crt *.key *.ca-bundle user@10.0.225.11:/tmp/
```

### 2. Create Certificate Directory
```bash
ssh user@10.0.225.11
sudo mkdir -p /www/server/panel/vhost/cert/cscs.zanajira.go.tz
```

### 3. Combine Certificates
```bash
# Create fullchain: your cert + intermediates + root
sudo cat /tmp/cscs_zanajira_go_tz.crt /tmp/*.ca-bundle > /tmp/fullchain.pem
```

### 4. Move Files to Nginx Directory
```bash
sudo mv /tmp/fullchain.pem /www/server/panel/vhost/cert/cscs.zanajira.go.tz/
sudo mv /tmp/cscs_zanajira_go_tz.key /www/server/panel/vhost/cert/cscs.zanajira.go.tz/privkey.pem
sudo chmod 644 /www/server/panel/vhost/cert/cscs.zanajira.go.tz/fullchain.pem
sudo chmod 600 /www/server/panel/vhost/cert/cscs.zanajira.go.tz/privkey.pem
sudo chown www-data:www-data /www/server/panel/vhost/cert/cscs.zanajira.go.tz/*
```

### 5. Update Nginx Config
- Use the configuration from `nginx-cscs-ssl.conf`
- Via aaPanel: Website → cscs.zanajira.go.tz → Settings → Configuration File

### 6. Test and Restart
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Verify
```bash
curl -v https://cscs.zanajira.go.tz
```

## Troubleshooting Commands

```bash
# Check Nginx is running
sudo systemctl status nginx

# Check port 443 is listening
sudo netstat -tlnp | grep :443

# Check certificate details
openssl x509 -in /www/server/panel/vhost/cert/cscs.zanajira.go.tz/fullchain.pem -text -noout

# Check private key
openssl rsa -in /www/server/panel/vhost/cert/cscs.zanajira.go.tz/privkey.pem -check

# Verify cert and key match
openssl x509 -noout -modulus -in /www/server/panel/vhost/cert/cscs.zanajira.go.tz/fullchain.pem | openssl md5
openssl rsa -noout -modulus -in /www/server/panel/vhost/cert/cscs.zanajira.go.tz/privkey.pem | openssl md5

# Check error logs
sudo tail -f /www/wwwlogs/cscs.zanajira.go.tz.error.log

# Test SSL connection
openssl s_client -connect cscs.zanajira.go.tz:443 -servername cscs.zanajira.go.tz
```

## Common File Naming Variations

Comodo might send files with these names:

| What It Is | Possible Names |
|------------|----------------|
| Your Certificate | `cscs_zanajira_go_tz.crt`, `certificate.crt`, `domain.crt` |
| Private Key | `private.key`, `cscs_zanajira_go_tz.key`, `privatekey.pem` |
| CA Bundle | `ca_bundle.crt`, `intermediate.crt`, `chain.crt`, `*.ca-bundle` |
| Root CA | `root.crt`, `AddTrustExternalCARoot.crt` |

## Final Checks

- [ ] HTTPS loads: https://cscs.zanajira.go.tz
- [ ] No certificate warnings in browser
- [ ] Login works over HTTPS
- [ ] File uploads work
- [ ] API calls work
- [ ] HTTP redirects to HTTPS

## Certificate Details to Verify

- **Issued To**: cscs.zanajira.go.tz
- **Issued By**: Comodo/Sectigo
- **Valid From**: [check your certificate]
- **Valid Until**: [check your certificate]

## Support Contacts

- **Comodo Support**: [Your support contact]
- **System Admin**: [Your team contact]
- **Claude Code**: Ask me if you encounter issues!

## Renewal Reminder

Set a calendar reminder for **30 days before expiry** to renew your certificate.

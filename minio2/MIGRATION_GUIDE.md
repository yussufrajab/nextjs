# MinIO Migration Guide

This guide will help you migrate your MinIO setup to a new VPS server.

## Current Server Configuration

### Server Details
- **MinIO Binary**: `/usr/local/bin/minio`
- **Data Directory**: `/minio/data`
- **API Port**: `9000`
- **Console Port**: `9001`
- **Access Key**: `csmsadmin`
- **Secret Key**: `Mamlaka2020MinIO`

### Buckets and Policies
- **attachments** - Policy: `download` (public read)
- **certificates** - Policy: `download` (public read)
- **csms-files** - Policy: `private` (no public access)
- **documents** - Policy: `download` (public read)
- **photos** - Policy: `download` (public read)

## Migration Steps

### Step 1: Install MinIO on New Server

```bash
# Download MinIO binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio

# Make it executable
chmod +x minio

# Move to system path
sudo mv minio /usr/local/bin/

# Verify installation
minio --version
```

### Step 2: Create MinIO User and Data Directory

```bash
# Create MinIO user (optional but recommended)
sudo useradd -r minio-user -s /sbin/nologin

# Create data directory
sudo mkdir -p /minio/data

# Set ownership
sudo chown -R minio-user:minio-user /minio/data
```

### Step 3: Copy Data from Old Server to New Server

**Option A: Using rsync (recommended for large datasets)**
```bash
# On new server, from old server
rsync -avz --progress root@OLD_SERVER_IP:/minio/data/ /minio/data/
```

**Option B: Using tar and scp**
```bash
# On old server
cd /minio
tar czf minio-data-backup.tar.gz data/

# Copy to new server
scp minio-data-backup.tar.gz root@NEW_SERVER_IP:/tmp/

# On new server
cd /minio
tar xzf /tmp/minio-data-backup.tar.gz
```

### Step 4: Set Up MinIO Service

```bash
# Copy the systemd service file
sudo cp systemd-service.txt /etc/systemd/system/minio.service

# Reload systemd
sudo systemctl daemon-reload

# Enable MinIO to start on boot
sudo systemctl enable minio

# Start MinIO
sudo systemctl start minio

# Check status
sudo systemctl status minio
```

### Step 5: Install and Configure MinIO Client (mc)

```bash
# Download mc client
wget https://dl.min.io/client/mc/release/linux-amd64/mc

# Make it executable
chmod +x mc

# Move to system path
sudo mv mc /usr/local/bin/

# Configure local alias
bash mc-alias-setup.sh

# Verify connection
mc ls local
```

### Step 6: Verify Buckets and Set Policies

```bash
# List all buckets
mc ls local

# If buckets don't exist, create them and set policies
bash bucket-policies.sh

# Verify policies
for bucket in attachments certificates csms-files documents photos; do
  echo "Bucket: $bucket"
  mc anonymous get local/$bucket
  echo ""
done
```

### Step 7: Update Application Configuration

Update your `.env.local` file on the new server with the MinIO configuration:

```bash
# Copy environment variables from env-variables.txt
# Update MINIO_ENDPOINT if using a domain name instead of localhost
```

### Step 8: Configure Firewall

```bash
# Allow MinIO ports
sudo ufw allow 9000/tcp  # MinIO API
sudo ufw allow 9001/tcp  # MinIO Console

# Reload firewall
sudo ufw reload
```

### Step 9: Verify Migration

```bash
# Check MinIO health
curl http://localhost:9000/minio/health/live

# List buckets
mc ls local

# Check bucket contents
mc ls local/documents
mc ls local/photos
mc ls local/attachments

# Access MinIO Console
# Open browser to http://NEW_SERVER_IP:9001
# Login with: csmsadmin / Mamlaka2020MinIO
```

### Step 10: Update DNS/Reverse Proxy (if applicable)

If you're using a domain name or reverse proxy (nginx/caddy), update the configuration to point to the new server.

## Security Recommendations

1. **Change default credentials** in production:
   ```bash
   # Generate strong credentials
   MINIO_ROOT_USER=your-secure-username
   MINIO_ROOT_PASSWORD=your-secure-password-min-8-chars
   ```

2. **Enable SSL/TLS** for production:
   ```bash
   # Place SSL certificates in /home/minio-user/.minio/certs/
   # Update MINIO_USE_SSL=true in .env.local
   ```

3. **Restrict network access**:
   ```bash
   # Only allow specific IPs if MinIO is not public-facing
   sudo ufw allow from TRUSTED_IP to any port 9000
   ```

4. **Regular backups**:
   ```bash
   # Set up automated backups of /minio/data
   # Consider using mc mirror for replication
   ```

## Troubleshooting

### MinIO won't start
```bash
# Check logs
sudo journalctl -u minio -f

# Verify permissions
ls -la /minio/data

# Check port availability
sudo netstat -tlnp | grep -E '9000|9001'
```

### Cannot access MinIO Console
```bash
# Verify MinIO is running
systemctl status minio

# Check firewall
sudo ufw status

# Test local access
curl http://localhost:9001
```

### Bucket policies not working
```bash
# Re-apply policies
bash bucket-policies.sh

# Verify policies
mc anonymous get local/<bucket-name>
```

## Rollback Plan

If migration fails, you can rollback to the old server:

1. Stop MinIO on new server
2. Point your application back to old server IP
3. Restore old .env.local configuration
4. Verify old server is still functioning

## Post-Migration Checklist

- [ ] MinIO service is running on new server
- [ ] All 5 buckets exist and are accessible
- [ ] Bucket policies are correctly set
- [ ] Application can upload/download files
- [ ] MinIO Console is accessible
- [ ] Old server data is backed up
- [ ] DNS/proxy configuration updated
- [ ] Firewall rules configured
- [ ] Credentials are secure (changed from defaults)
- [ ] SSL/TLS enabled (if required)
- [ ] Monitoring/alerts configured

## Support

For issues, refer to:
- MinIO Documentation: https://docs.min.io/
- MinIO GitHub: https://github.com/minio/minio
- CSMS Application Docs: See `MINIO_SETUP.md` in project root

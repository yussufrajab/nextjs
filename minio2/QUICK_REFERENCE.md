# MinIO Migration - Quick Reference

## Essential Commands for New Server

### 1️⃣ Start MinIO Service
```bash
sudo systemctl start minio
sudo systemctl status minio
```

### 2️⃣ Stop MinIO Service
```bash
sudo systemctl stop minio
```

### 3️⃣ Restart MinIO Service
```bash
sudo systemctl restart minio
```

### 4️⃣ View MinIO Logs
```bash
sudo journalctl -u minio -f
```

### 5️⃣ Check MinIO Health
```bash
curl http://localhost:9000/minio/health/live
```

### 6️⃣ List All Buckets
```bash
mc ls local
```

### 7️⃣ Check Bucket Policy
```bash
mc anonymous get local/<bucket-name>
```

### 8️⃣ Set Bucket Policy
```bash
# Public read access
mc anonymous set download local/<bucket-name>

# Private (no public access)
mc anonymous set private local/<bucket-name>
```

### 9️⃣ Create New Bucket
```bash
mc mb local/<bucket-name>
```

### 🔟 Remove Bucket
```bash
mc rb local/<bucket-name>
```

## MinIO Console Access

**URL**: http://SERVER_IP:9001

**Login Credentials**:
- Username: `csmsadmin`
- Password: `Mamlaka2020MinIO`

## MinIO API Endpoint

**URL**: http://SERVER_IP:9000

## Important Paths

- **MinIO Binary**: `/usr/local/bin/minio`
- **MC Client**: `/usr/local/bin/mc`
- **Data Directory**: `/minio/data`
- **Service File**: `/etc/systemd/system/minio.service`
- **MC Config**: `/root/.mc/config.json`

## Required Buckets

```bash
mc mb local/attachments
mc mb local/certificates
mc mb local/csms-files
mc mb local/documents
mc mb local/photos
```

## Bucket Policies Setup

```bash
mc anonymous set download local/attachments
mc anonymous set download local/certificates
mc anonymous set private local/csms-files
mc anonymous set download local/documents
mc anonymous set download local/photos
```

## Environment Variables (for .env.local)

```
MINIO_ACCESS_KEY=csmsadmin
MINIO_SECRET_KEY=Mamlaka2020MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=documents
```

## Troubleshooting Quick Checks

### MinIO won't start
```bash
# Check if port is in use
sudo netstat -tlnp | grep -E '9000|9001'

# Check logs
sudo journalctl -u minio -n 50

# Check permissions
ls -la /minio/data
```

### Cannot connect to MinIO
```bash
# Check if service is running
systemctl status minio

# Check firewall
sudo ufw status | grep -E '9000|9001'

# Test local connection
curl http://localhost:9000/minio/health/live
```

### Bucket policies not working
```bash
# Re-apply policy
mc anonymous set download local/<bucket-name>

# Verify policy
mc anonymous get local/<bucket-name>
```

## Data Migration Commands

### Using rsync
```bash
rsync -avz --progress root@OLD_IP:/minio/data/ /minio/data/
```

### Using tar + scp
```bash
# On old server
tar czf minio-backup.tar.gz /minio/data

# Copy to new server
scp minio-backup.tar.gz root@NEW_IP:/tmp/

# On new server
cd /minio
tar xzf /tmp/minio-backup.tar.gz
```

## Firewall Configuration

```bash
# Allow MinIO ports
sudo ufw allow 9000/tcp
sudo ufw allow 9001/tcp
sudo ufw reload
```

## Backup Commands

### Manual Backup
```bash
# Backup data directory
tar czf minio-backup-$(date +%Y%m%d).tar.gz /minio/data

# Backup specific bucket
mc mirror local/documents /backup/documents-$(date +%Y%m%d)
```

### Restore from Backup
```bash
# Stop MinIO
sudo systemctl stop minio

# Restore data
tar xzf minio-backup-YYYYMMDD.tar.gz -C /

# Start MinIO
sudo systemctl start minio
```

## Verification Checklist

After migration:
- [ ] `systemctl status minio` shows active (running)
- [ ] `mc ls local` shows all 5 buckets
- [ ] MinIO Console accessible at port 9001
- [ ] Application can upload files
- [ ] Application can download files
- [ ] Bucket policies are correct

---

**Note**: Replace `SERVER_IP` with your actual server IP address or domain name.

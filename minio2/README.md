# MinIO Configuration for Migration

This folder contains all the MinIO settings needed to migrate to a new VPS server.

## 📁 Contents

### Configuration Files

1. **env-variables.txt**
   - Environment variables for MinIO
   - Copy these to `.env.local` on your new server

2. **mc-alias-setup.sh** ⚡
   - Script to configure MinIO client (mc) alias
   - Run this after installing mc on new server

3. **bucket-policies.sh** ⚡
   - Script to create buckets and set policies
   - Run this after MinIO server is running

4. **server-startup.sh** ⚡
   - Manual startup script for MinIO server
   - Use for testing or manual server starts

5. **systemd-service.txt**
   - Systemd service configuration
   - Copy to `/etc/systemd/system/minio.service`
   - Enables MinIO to run as a system service

6. **MIGRATION_GUIDE.md**
   - Complete step-by-step migration guide
   - **READ THIS FIRST** before starting migration

## 🚀 Quick Start

### For New Server Setup

1. **Read the migration guide**:
   ```bash
   cat MIGRATION_GUIDE.md
   ```

2. **Install MinIO**:
   ```bash
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   sudo mv minio /usr/local/bin/
   ```

3. **Install MinIO Client (mc)**:
   ```bash
   wget https://dl.min.io/client/mc/release/linux-amd64/mc
   chmod +x mc
   sudo mv mc /usr/local/bin/
   ```

4. **Set up MinIO service**:
   ```bash
   sudo cp systemd-service.txt /etc/systemd/system/minio.service
   sudo systemctl daemon-reload
   sudo systemctl enable minio
   sudo systemctl start minio
   ```

5. **Configure mc client**:
   ```bash
   bash mc-alias-setup.sh
   ```

6. **Create buckets and policies**:
   ```bash
   bash bucket-policies.sh
   ```

7. **Copy data from old server** (see MIGRATION_GUIDE.md for details)

## 📊 Current Configuration Summary

### Server Settings
- **Binary Location**: `/usr/local/bin/minio`
- **Data Directory**: `/minio/data`
- **API Port**: `9000`
- **Console Port**: `9001`

### Credentials
- **Access Key**: `csmsadmin`
- **Secret Key**: `Mamlaka2020MinIO`

⚠️ **IMPORTANT**: Change these credentials in production!

### Buckets and Policies

| Bucket        | Policy   | Description                      |
|---------------|----------|----------------------------------|
| attachments   | download | Public read access               |
| certificates  | download | Public read access               |
| csms-files    | private  | No public access                 |
| documents     | download | Public read access (main bucket) |
| photos        | download | Public read access               |

## 🔄 Migration Process Overview

1. Install MinIO on new server
2. Copy data from old server to new server
3. Set up MinIO service
4. Configure MinIO client (mc)
5. Verify buckets and policies
6. Update application configuration
7. Test and verify

## 📋 Verification Checklist

After migration, verify:
- [ ] MinIO service is running
- [ ] All 5 buckets exist
- [ ] Bucket policies are correct
- [ ] MinIO Console is accessible (port 9001)
- [ ] Application can upload/download files
- [ ] Data from old server is accessible

## 🔒 Security Notes

1. **Change default credentials** before going to production
2. **Enable SSL/TLS** for secure connections
3. **Configure firewall** to restrict access
4. **Set up regular backups** of `/minio/data`

## 📚 Additional Resources

- [MinIO Documentation](https://docs.min.io/)
- [MinIO Client Guide](https://docs.min.io/docs/minio-client-complete-guide.html)
- CSMS Application: See `MINIO_SETUP.md` in project root

## 🆘 Need Help?

Refer to the **Troubleshooting** section in `MIGRATION_GUIDE.md`

## 📝 Notes

- All scripts (*.sh) are executable and ready to run
- Keep this folder for reference after migration
- Consider backing up this folder along with your MinIO data
- The systemd service file assumes user `minio-user` - adjust if needed

---

**Created**: December 2025
**Purpose**: VPS Migration for CSMS Application
**MinIO Version**: Compatible with MinIO RELEASE.2024+

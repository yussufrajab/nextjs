# Windows 11 Quick Start Guide

## Prerequisites

1. **Install Required Software**:
   - PostgreSQL (if not already installed)
   - Node.js 18+ 
   - OpenSSH Client (Windows Optional Feature)
   - PowerShell 5+ (usually pre-installed)

2. **Check Requirements**:
   ```powershell
   .\beky\scripts\check-requirements.ps1
   ```

## Step-by-Step Migration

### Step 1: Backup Your Database

**Option A: PowerShell (Recommended)**
```powershell
.\beky\scripts\backup-database.ps1
```

**Option B: Command Prompt**
```cmd
.\beky\scripts\backup-database.cmd
```

This creates:
- `backups\nody_backup_[timestamp].sql.gz` - Compressed database dump
- `backups\prisma_files_[timestamp].zip` - Prisma schema and migrations

### Step 2: Upload to VPS

```powershell
.\beky\scripts\upload-to-vps.ps1 -VpsIp "YOUR_VPS_IP_ADDRESS" -VpsUser "ubuntu"
```

**Example**:
```powershell
.\beky\scripts\upload-to-vps.ps1 -VpsIp "203.0.113.10" -VpsUser "ubuntu"
```

This script will:
- Test SSH connection
- Upload backup files
- Upload project files (excluding node_modules, .next, etc.)
- Extract Prisma files on VPS
- Create .env file from template

### Step 3: Complete Setup on VPS

SSH into your VPS:
```powershell
ssh ubuntu@YOUR_VPS_IP
```

Navigate to app directory:
```bash
cd /home/ubuntu/csms-app
```

Edit environment variables:
```bash
nano .env
```

Update these values in .env:
```env
NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:9002/api
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VPS_IP:9002
DATABASE_URL="postgresql://nody_user:your_secure_password@localhost:5432/nody?schema=public"
GEMINI_API_KEY=your_production_gemini_api_key_here
```

Run VPS setup:
```bash
bash beky/scripts/ubuntu-vps-setup.sh
```

Deploy application:
```bash
bash beky/scripts/deploy-vps.sh
```

## Troubleshooting

### Common Windows Issues

**1. PowerShell Execution Policy Error**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**2. SSH Not Found**
- Install OpenSSH Client: Windows Settings > Apps > Optional Features > Add Feature > OpenSSH Client
- Or install Git for Windows which includes SSH

**3. PostgreSQL Not Found**
- Add PostgreSQL bin directory to PATH: `C:\Program Files\PostgreSQL\15\bin`
- Or download from: https://www.postgresql.org/download/windows/

**4. Database Connection Failed**
- Check if PostgreSQL service is running
- Verify database credentials in .env file
- Ensure database 'nody' exists

### SSH Connection Issues

**1. Permission Denied**
```powershell
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy public key to VPS
Get-Content ~/.ssh/id_rsa.pub | ssh ubuntu@YOUR_VPS_IP "cat >> ~/.ssh/authorized_keys"
```

**2. Connection Timeout**
- Check VPS IP address
- Verify VPS is running
- Check firewall settings (port 22 should be open)

### Upload Script Issues

**1. Large File Upload Timeout**
- Use the `-VpsPort` parameter if using non-standard SSH port
- Split large files if necessary

**2. Insufficient Disk Space**
```bash
# Check disk space on VPS
ssh ubuntu@YOUR_VPS_IP "df -h"
```

## Verification Steps

After successful deployment:

1. **Check application status**:
   ```bash
   ssh ubuntu@YOUR_VPS_IP "sudo systemctl status csms"
   ```

2. **Test application**:
   ```bash
   curl http://YOUR_VPS_IP:9002
   ```

3. **Check logs**:
   ```bash
   ssh ubuntu@YOUR_VPS_IP "sudo journalctl -u csms -f"
   ```

4. **Access application**:
   - Direct: `http://YOUR_VPS_IP:9002`
   - Via Nginx (if configured): `http://YOUR_VPS_IP`

## Next Steps

1. **Setup Domain**: Point your domain to VPS IP
2. **SSL Certificate**: Run `sudo certbot --nginx -d yourdomain.com`
3. **Firewall**: Configure UFW if needed
4. **Backups**: Setup automated database backups
5. **Monitoring**: Consider setting up application monitoring

## Script Parameters

### backup-database.ps1
```powershell
.\beky\scripts\backup-database.ps1 -DbUser "postgres" -DbHost "localhost" -DbPort "5432" -DbName "nody"
```

### upload-to-vps.ps1
```powershell
.\beky\scripts\upload-to-vps.ps1 -VpsIp "IP" -VpsUser "user" -VpsPort "22" -RemotePath "/home/user/app"
```

## Support

- Check `beky\docs\MIGRATION_GUIDE.md` for detailed documentation
- Run `.\beky\scripts\check-requirements.ps1` to verify setup
- View logs: `ssh ubuntu@vps "sudo journalctl -u csms -f"`
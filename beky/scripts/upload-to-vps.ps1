# Upload files to Ubuntu VPS using PowerShell
# This script uploads the backup files and project to your Ubuntu VPS

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsIp,
    
    [Parameter(Mandatory=$true)]  
    [string]$VpsUser,
    
    [string]$VpsPort = "22",
    [string]$ProjectPath = ".",
    [string]$RemotePath = "/home/$VpsUser/csms-app"
)

Write-Host "=== CSMS VPS Upload Script ===" -ForegroundColor Green
Write-Host "VPS IP: $VpsIp"
Write-Host "VPS User: $VpsUser"
Write-Host "VPS Port: $VpsPort"
Write-Host "Remote Path: $RemotePath"
Write-Host ""

# Check if SCP is available
$scpExists = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpExists) {
    Write-Host "❌ SCP not found. Please install OpenSSH client:" -ForegroundColor Red
    Write-Host "1. Windows Settings > Apps > Optional Features"
    Write-Host "2. Add 'OpenSSH Client'"
    Write-Host "3. Or install Git for Windows which includes SCP"
    exit 1
}

# Check if backup files exist
$backupDir = ".\backups"
if (-not (Test-Path $backupDir)) {
    Write-Host "❌ Backup directory not found. Please run backup script first." -ForegroundColor Red
    exit 1
}

# Find latest backup files
$latestDbBackup = Get-ChildItem "$backupDir\nody_backup_*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$latestPrismaBackup = Get-ChildItem "$backupDir\prisma_files_*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestDbBackup) {
    Write-Host "❌ No database backup found in $backupDir" -ForegroundColor Red
    exit 1
}

if (-not $latestPrismaBackup) {
    Write-Host "❌ No Prisma backup found in $backupDir" -ForegroundColor Red
    exit 1
}

Write-Host "Found backup files:" -ForegroundColor Yellow
Write-Host "- Database: $($latestDbBackup.Name)"
Write-Host "- Prisma: $($latestPrismaBackup.Name)"
Write-Host ""

# Test SSH connection
Write-Host "Testing SSH connection..." -ForegroundColor Yellow
$sshTest = ssh -p $VpsPort -o ConnectTimeout=10 -o BatchMode=yes "$VpsUser@$VpsIp" "echo 'SSH connection successful'"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ SSH connection failed. Please check:" -ForegroundColor Red
    Write-Host "1. VPS IP address and port"
    Write-Host "2. SSH key is set up or password authentication is enabled"
    Write-Host "3. VPS is running and accessible"
    exit 1
}

Write-Host "✅ SSH connection successful" -ForegroundColor Green

# Create remote directory
Write-Host "Creating remote directory..." -ForegroundColor Yellow
ssh -p $VpsPort "$VpsUser@$VpsIp" "mkdir -p $RemotePath/backups"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create remote directory" -ForegroundColor Red
    exit 1
}

# Upload backup files
Write-Host "Uploading backup files..." -ForegroundColor Yellow

Write-Host "  Uploading database backup..." -ForegroundColor Cyan
scp -P $VpsPort $latestDbBackup.FullName "$VpsUser@$VpsIp`:$RemotePath/backups/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Database backup uploaded" -ForegroundColor Green
} else {
    Write-Host "  ❌ Database backup upload failed" -ForegroundColor Red
    exit 1
}

Write-Host "  Uploading Prisma backup..." -ForegroundColor Cyan
scp -P $VpsPort $latestPrismaBackup.FullName "$VpsUser@$VpsIp`:$RemotePath/backups/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Prisma backup uploaded" -ForegroundColor Green
} else {
    Write-Host "  ❌ Prisma backup upload failed" -ForegroundColor Red
    exit 1
}

# Upload project files (excluding node_modules, .next, backups)
Write-Host "Uploading project files..." -ForegroundColor Yellow

# Create temporary directory for filtered files
$tempDir = "$env:TEMP\csms-upload-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # Copy project files excluding large directories
    $excludeDirs = @("node_modules", ".next", "backups", ".git", "dist", "build")
    
    Write-Host "  Preparing files for upload..." -ForegroundColor Cyan
    
    # Copy all files except excluded directories
    Get-ChildItem $ProjectPath -Recurse | Where-Object {
        $relativePath = $_.FullName.Substring((Resolve-Path $ProjectPath).Path.Length + 1)
        $shouldExclude = $false
        
        foreach ($excludeDir in $excludeDirs) {
            if ($relativePath.StartsWith("$excludeDir\") -or $relativePath -eq $excludeDir) {
                $shouldExclude = $true
                break
            }
        }
        
        return -not $shouldExclude
    } | ForEach-Object {
        $relativePath = $_.FullName.Substring((Resolve-Path $ProjectPath).Path.Length + 1)
        $targetPath = Join-Path $tempDir $relativePath
        $targetDir = Split-Path $targetPath -Parent
        
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        
        if (-not $_.PSIsContainer) {
            Copy-Item $_.FullName $targetPath -Force
        }
    }
    
    # Upload the filtered project files
    Write-Host "  Uploading project files..." -ForegroundColor Cyan
    scp -r -P $VpsPort "$tempDir\*" "$VpsUser@$VpsIp`:$RemotePath/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Project files uploaded" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Project files upload failed" -ForegroundColor Red
        exit 1
    }
    
} finally {
    # Clean up temporary directory
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Extract Prisma files on VPS
Write-Host "Extracting Prisma files on VPS..." -ForegroundColor Yellow
$extractCmd = @"
cd $RemotePath && 
unzip -o backups/$($latestPrismaBackup.Name) && 
echo 'Prisma files extracted successfully'
"@

ssh -p $VpsPort "$VpsUser@$VpsIp" $extractCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma files extracted" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma files extraction failed" -ForegroundColor Red
}

# Create basic .env file if it doesn't exist
Write-Host "Setting up environment file..." -ForegroundColor Yellow
$envSetupCmd = @"
cd $RemotePath && 
if [ ! -f .env ]; then 
    cp beky/config/.env.production .env
    echo 'Created .env from template'
else
    echo '.env already exists'
fi
"@

ssh -p $VpsPort "$VpsUser@$VpsIp" $envSetupCmd

Write-Host ""
Write-Host "=== Upload Complete! ===" -ForegroundColor Green
Write-Host "✅ Database backup uploaded: $($latestDbBackup.Name)"
Write-Host "✅ Prisma backup uploaded: $($latestPrismaBackup.Name)"
Write-Host "✅ Project files uploaded"
Write-Host "✅ Prisma files extracted"
Write-Host "✅ Environment template created"
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. SSH into your VPS: ssh -p $VpsPort $VpsUser@$VpsIp"
Write-Host "2. Navigate to app directory: cd $RemotePath"
Write-Host "3. Edit .env file with your database credentials"
Write-Host "4. Run the VPS setup script: bash beky/scripts/ubuntu-vps-setup.sh"
Write-Host "5. Run the deployment script: bash beky/scripts/deploy-vps.sh"
Write-Host ""
Write-Host "🔧 Commands to run on VPS:" -ForegroundColor Yellow
Write-Host "ssh -p $VpsPort $VpsUser@$VpsIp"
Write-Host "cd $RemotePath"
Write-Host "nano .env  # Edit database credentials"
Write-Host "bash beky/scripts/ubuntu-vps-setup.sh"
Write-Host "bash beky/scripts/deploy-vps.sh"

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
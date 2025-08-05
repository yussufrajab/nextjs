# Prisma Database Backup Script for Windows PowerShell
# This script creates a backup of the PostgreSQL database with Prisma migrations

param(
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost", 
    [string]$DbPort = "5432",
    [string]$DbName = "nody"
)

# Configuration - Navigate to project root first
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
Set-Location $ProjectRoot

$BackupDir = ".\backups"
$PrismaDir = ".\prisma"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\nody_backup_$Timestamp.sql"

Write-Host "=== Prisma Database Backup Script ===" -ForegroundColor Green
Write-Host "Project Root: $ProjectRoot"
Write-Host "Database: $DbName"
Write-Host "Host: $DbHost`:$DbPort"
Write-Host "User: $DbUser"
Write-Host "Backup file: $BackupFile"
Write-Host ""

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "Created backup directory: $BackupDir" -ForegroundColor Yellow
}

# Verify Prisma files exist
if (!(Test-Path "$PrismaDir\schema.prisma")) {
    Write-Host "❌ Error: Prisma schema not found at $PrismaDir\schema.prisma" -ForegroundColor Red
    exit 1
}

if (!(Test-Path "$PrismaDir\migrations")) {
    Write-Host "❌ Error: Prisma migrations directory not found at $PrismaDir\migrations" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prisma files verified" -ForegroundColor Green

# Get database password securely
$SecurePassword = Read-Host "Enter PostgreSQL password for user $DbUser" -AsSecureString
$PlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword))

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $PlainPassword

try {
    # Create database backup
    Write-Host "Creating database backup..." -ForegroundColor Yellow
    
    $pgDumpArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "--verbose",
        "--clean",
        "--if-exists", 
        "--create",
        "--format=plain",
        "--file=$BackupFile"
    )
    
    & pg_dump @pgDumpArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database backup completed successfully!" -ForegroundColor Green
        Write-Host "Backup saved to: $BackupFile"
        
        # Get backup file size
        $BackupSize = (Get-Item $BackupFile).Length
        $BackupSizeMB = [math]::Round($BackupSize / 1MB, 2)
        Write-Host "Backup size: $BackupSizeMB MB"
        
        # Create Prisma files backup
        Write-Host "Creating Prisma files backup..." -ForegroundColor Yellow
        $PrismaBackup = "$BackupDir\prisma_files_$Timestamp.zip"
        
        Compress-Archive -Path "$PrismaDir\*" -DestinationPath $PrismaBackup -Force
        
        if (Test-Path $PrismaBackup) {
            Write-Host "✅ Prisma files backup completed: $PrismaBackup" -ForegroundColor Green
            $PrismaSize = (Get-Item $PrismaBackup).Length
            $PrismaSizeMB = [math]::Round($PrismaSize / 1MB, 2)
            Write-Host "Prisma backup size: $PrismaSizeMB MB"
        } else {
            Write-Host "❌ Prisma files backup failed!" -ForegroundColor Red
        }
        
        # Compress the database backup
        Write-Host "Compressing database backup..." -ForegroundColor Yellow
        $CompressedFile = "$BackupFile.gz"
        
        # Convert to absolute paths
        $BackupFileAbs = Resolve-Path $BackupFile
        $CompressedFileAbs = Join-Path (Split-Path $BackupFileAbs -Parent) (Split-Path $CompressedFile -Leaf)
        
        # Read file content and compress using .NET
        $content = Get-Content $BackupFileAbs -Raw -Encoding UTF8
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
        
        $fileStream = [System.IO.File]::Create($CompressedFileAbs)
        $gzipStream = New-Object System.IO.Compression.GzipStream($fileStream, [System.IO.Compression.CompressionMode]::Compress)
        $gzipStream.Write($bytes, 0, $bytes.Length)
        $gzipStream.Close()
        $fileStream.Close()
        
        # Update variable to use absolute path
        $CompressedFile = $CompressedFileAbs
        
        if (Test-Path $CompressedFile) {
            Write-Host "✅ Compressed database backup saved to: $CompressedFile" -ForegroundColor Green
            $CompressedSize = (Get-Item $CompressedFile).Length
            $CompressedSizeMB = [math]::Round($CompressedSize / 1MB, 2)
            Write-Host "Compressed size: $CompressedSizeMB MB"
            Write-Host "Original uncompressed file retained: $BackupFileAbs"
        } else {
            Write-Host "❌ Compression failed, keeping original file" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "=== Backup Summary ===" -ForegroundColor Green
        Write-Host "Original database backup: $BackupFileAbs ($BackupSizeMB MB)"
        if (Test-Path $CompressedFile) {
            Write-Host "Compressed database backup: $CompressedFile ($CompressedSizeMB MB)"
        }
        if (Test-Path $PrismaBackup) {
            Write-Host "Prisma files: $PrismaBackup ($PrismaSizeMB MB)"
        }
        Write-Host "Database: $DbName"
        Write-Host "Timestamp: $Timestamp"
        Write-Host ""
        Write-Host "Files to transfer to Ubuntu VPS:" -ForegroundColor Cyan
        if (Test-Path $CompressedFile) {
            Write-Host "1. $CompressedFile (recommended - smaller size)"
            Write-Host "2. $BackupFileAbs (alternative - uncompressed)"
        } else {
            Write-Host "1. $BackupFileAbs"
        }
        if (Test-Path $PrismaBackup) {
            Write-Host "3. $PrismaBackup"
        }
        Write-Host ""
        Write-Host "Note: On Ubuntu VPS, restore using Prisma migrations, not direct SQL import" -ForegroundColor Yellow
        
    } else {
        Write-Host "❌ Database backup failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    $env:PGPASSWORD = $null
    $PlainPassword = $null
    [System.GC]::Collect()
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
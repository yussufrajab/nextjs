@echo off
REM Prisma Database Backup Script for Windows
REM This script creates a backup of the PostgreSQL database with Prisma migrations

setlocal enabledelayedexpansion

REM Navigate to project root (two levels up from scripts directory)
cd /d "%~dp0..\.."

REM Configuration
set DB_NAME=nody
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432
set BACKUP_DIR=.\backups
set PRISMA_DIR=.\prisma

REM Get timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set DATE=%%c%%a%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set TIME=%%a%%b)
set TIME=%TIME: =%
set TIMESTAMP=%DATE%_%TIME%
set BACKUP_FILE=%BACKUP_DIR%\nody_backup_%TIMESTAMP%.sql

echo === Prisma Database Backup Script ===
echo Database: %DB_NAME%
echo Host: %DB_HOST%:%DB_PORT%
echo User: %DB_USER%
echo Backup file: %BACKUP_FILE%
echo.

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Verify Prisma files exist
if not exist "%PRISMA_DIR%\schema.prisma" (
    echo Error: Prisma schema not found at %PRISMA_DIR%\schema.prisma
    exit /b 1
)

if not exist "%PRISMA_DIR%\migrations" (
    echo Error: Prisma migrations directory not found at %PRISMA_DIR%\migrations
    exit /b 1
)

REM Prompt for database password
set /p DB_PASSWORD=Enter PostgreSQL password for user %DB_USER%: 

REM Set PGPASSWORD environment variable
set PGPASSWORD=%DB_PASSWORD%

REM Create database backup
echo Creating database backup...
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% --verbose --clean --if-exists --create --format=plain --file="%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo Database backup completed successfully!
    echo Backup saved to: %BACKUP_FILE%
    
    REM Create Prisma files backup
    echo Creating Prisma files backup...
    set PRISMA_BACKUP=%BACKUP_DIR%\prisma_files_%TIMESTAMP%.zip
    
    REM Use PowerShell to create zip file
    powershell -command "Compress-Archive -Path '.\prisma\*' -DestinationPath '%PRISMA_BACKUP%'"
    
    if !ERRORLEVEL! equ 0 (
        echo Prisma files backup completed: !PRISMA_BACKUP!
    ) else (
        echo Prisma files backup failed!
    )
    
    REM Compress the database backup using PowerShell
    echo Compressing database backup...
    set COMPRESSED_FILE=%BACKUP_FILE%.gz
    powershell -command "& { $content = Get-Content '%BACKUP_FILE%' -Raw; $bytes = [System.Text.Encoding]::UTF8.GetBytes($content); $compressed = [System.IO.Compression.GzipStream]::new([System.IO.File]::Create('%COMPRESSED_FILE%'), [System.IO.Compression.CompressionMode]::Compress); $compressed.Write($bytes, 0, $bytes.Length); $compressed.Close() }"
    
    if !ERRORLEVEL! equ 0 (
        echo Compressed database backup saved to: !COMPRESSED_FILE!
        echo Original uncompressed file retained: %BACKUP_FILE%
    ) else (
        echo Compression failed, keeping original file
    )
) else (
    echo Database backup failed!
    exit /b 1
)

echo.
echo === Backup Summary ===
echo Database backup: %COMPRESSED_FILE%
echo Prisma files: %PRISMA_BACKUP%
echo Database: %DB_NAME%
echo Timestamp: %TIMESTAMP%
echo.
echo Files to transfer to Ubuntu VPS:
echo 1. %COMPRESSED_FILE%
echo 2. %PRISMA_BACKUP%
echo.
echo Note: On Ubuntu VPS, restore using Prisma migrations, not direct SQL import

REM Clear password from environment
set PGPASSWORD=
pause
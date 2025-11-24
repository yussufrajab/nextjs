@echo off
REM PostgreSQL Database Backup Script for CSMS (Windows)
REM This script creates a comprehensive backup of the prizma database

setlocal enabledelayedexpansion

REM Source database configuration
set SOURCE_HOST=localhost
set SOURCE_PORT=5432
set SOURCE_DB=prizma
set SOURCE_USER=postgres
set SOURCE_PASSWORD=Mamlaka2020

REM Backup configuration
set BACKUP_DIR=backups
REM Use PowerShell for timestamp (wmic not available on newer Windows)
for /f %%i in ('powershell -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set TIMESTAMP=%%i
set BACKUP_FILE=prizma_backup_%TIMESTAMP%.sql
set BACKUP_PATH=%BACKUP_DIR%\%BACKUP_FILE%

echo Starting CSMS Database Backup...

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Set password environment variable
set PGPASSWORD=%SOURCE_PASSWORD%

echo Creating database dump...

REM Create comprehensive backup
pg_dump ^
  --host=%SOURCE_HOST% ^
  --port=%SOURCE_PORT% ^
  --username=%SOURCE_USER% ^
  --dbname=%SOURCE_DB% ^
  --verbose ^
  --clean ^
  --if-exists ^
  --create ^
  --format=plain ^
  --no-owner ^
  --no-privileges ^
  --file="%BACKUP_PATH%"

if %errorlevel% equ 0 (
    echo [92m✓ Database backup completed successfully![0m
    echo [92mBackup saved to: %BACKUP_PATH%[0m
    
    REM Get backup file size with delayed expansion
    for %%I in ("%BACKUP_PATH%") do set "filesize=%%~zI"
    
    if defined filesize (
        if not "!filesize!"=="" (
            set /a sizeMB=!filesize! / 1024 / 1024
            echo [92mBackup size: !sizeMB! MB[0m
        ) else (
            echo [93m[WARN] Could not determine backup file size - empty value.[0m
        )
    ) else (
        echo [93m[WARN] Could not determine backup file size - variable not set.[0m
    )
    
    REM Create metadata file (use timeout to handle file locking)
    timeout /t 1 /nobreak >nul 2>&1
    (
        echo CSMS Database Backup Information
        echo ================================
        echo Database: %SOURCE_DB%
        echo Source Host: %SOURCE_HOST%:%SOURCE_PORT%
        echo Backup Date: %date% %time%
        echo Backup File: %BACKUP_FILE%
        echo Backup Size: !sizeMB! MB
        echo ORM Support: Prisma + Hibernate ^(JPA^)
        echo.
        echo Notes:
        echo - This backup includes all tables, sequences, and data
        echo - Compatible with both Prisma and Hibernate schemas
        echo - Use restore_prizma.bat to restore to target server
        echo - Ensure target PostgreSQL version is compatible ^(15+^)
    ) > "%BACKUP_DIR%\backup_%TIMESTAMP%_info.txt"
    
    echo [92m✓ Backup metadata saved[0m
    
) else (
    echo [91m✗ Backup failed![0m
    exit /b 1
)

REM Clear password
set PGPASSWORD=

echo Backup process completed!
echo To restore on target server, copy the backup file and run:
echo restore_prizma.bat %BACKUP_FILE%

pause
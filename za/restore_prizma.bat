@echo off
REM PostgreSQL Database Restore Script for CSMS (Windows)
REM This script restores the prizma database to a different server

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: %0 ^<backup_file.sql^>
    echo Example: %0 prizma_backup_20250730_123456.sql
    exit /b 1
)

set BACKUP_FILE=%1
set CONFIG_FILE=target_config.env

echo Starting CSMS Database Restore...

REM Check if backup file exists
if not exist "%BACKUP_FILE%" (
    echo ✗ Backup file not found: %BACKUP_FILE%
    exit /b 1
)

REM Load configuration if exists
if exist "%CONFIG_FILE%" (
    echo Loading configuration from: %CONFIG_FILE%
    for /f "usebackq tokens=1,2 delims==" %%a in ("%CONFIG_FILE%") do (
        set %%a=%%b
    )
) else (
    echo Configuration file not found. Using default values.
    echo Create %CONFIG_FILE% for custom settings.
)

REM Target database configuration (with defaults)
if not defined TARGET_HOST set TARGET_HOST=localhost
if not defined TARGET_PORT set TARGET_PORT=5432
if not defined TARGET_DB set TARGET_DB=prizma
if not defined TARGET_USER set TARGET_USER=postgres
if not defined TARGET_PASSWORD set TARGET_PASSWORD=your_target_password

echo Target Configuration:
echo Host: %TARGET_HOST%:%TARGET_PORT%
echo Database: %TARGET_DB%
echo User: %TARGET_USER%

REM Confirm before proceeding
set /p CONFIRM=This will OVERWRITE the target database. Continue? (y/N): 
if /i not "%CONFIRM%"=="y" (
    echo Operation cancelled.
    exit /b 0
)

REM Set password environment variable
set PGPASSWORD=%TARGET_PASSWORD%

echo Testing connection to target database...

REM Test connection
pg_isready -h %TARGET_HOST% -p %TARGET_PORT% -U %TARGET_USER% -d postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Cannot connect to PostgreSQL server at %TARGET_HOST%:%TARGET_PORT%
    echo Please verify the server is running and credentials are correct.
    exit /b 1
)

echo ✓ Connection successful

REM Check if database exists
echo Checking if database '%TARGET_DB%' exists...

for /f %%i in ('psql -h %TARGET_HOST% -p %TARGET_PORT% -U %TARGET_USER% -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='%TARGET_DB%'"') do set DB_EXISTS=%%i

if not "%DB_EXISTS%"=="1" (
    echo Database '%TARGET_DB%' does not exist. Creating...
    createdb -h %TARGET_HOST% -p %TARGET_PORT% -U %TARGET_USER% %TARGET_DB%
    echo ✓ Database created
) else (
    echo Database '%TARGET_DB%' already exists
)

REM Restore the database
echo Restoring database from backup...
echo This may take several minutes depending on data size...

psql ^
  --host=%TARGET_HOST% ^
  --port=%TARGET_PORT% ^
  --username=%TARGET_USER% ^
  --dbname=%TARGET_DB% ^
  --quiet ^
  --file="%BACKUP_FILE%"

if %errorlevel% equ 0 (
    echo ✓ Database restore completed successfully!
    
    REM Verify restore by checking table count
    for /f %%i in ('psql -h %TARGET_HOST% -p %TARGET_PORT% -U %TARGET_USER% -d %TARGET_DB% -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'"') do set TABLE_COUNT=%%i
    echo Tables restored: !TABLE_COUNT!
    
    echo Verifying CSMS tables...
    
    REM Check for key CSMS tables
    set TABLES=User Employee Institution Request RequestType Notification
    for %%t in (%TABLES%) do (
        for /f %%i in ('psql -h %TARGET_HOST% -p %TARGET_PORT% -U %TARGET_USER% -d %TARGET_DB% -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='%%t')"') do (
            if "%%i"=="t" (
                echo ✓ Table '%%t' exists
            ) else (
                echo ⚠ Table '%%t' not found
            )
        )
    )
    
    echo ✓ Restore verification completed
    
) else (
    echo ✗ Restore failed!
    exit /b 1
)

REM Clear password
set PGPASSWORD=

echo.
echo ========================================
echo     Database Restore Completed!
echo ========================================
echo.
echo Next Steps:
echo 1. Update your application configuration:
echo    - Backend: Update application.properties
echo    - Frontend: Update DATABASE_URL in .env
echo.
echo 2. Connection strings to use:
echo    Backend (Spring): jdbc:postgresql://%TARGET_HOST%:%TARGET_PORT%/%TARGET_DB%
echo    Frontend (Prisma): postgresql://%TARGET_USER%:%TARGET_PASSWORD%@%TARGET_HOST%:%TARGET_PORT%/%TARGET_DB%
echo.
echo 3. After updating configs:
echo    - Frontend: Run 'npx prisma generate'
echo    - Backend: Use 'prod' profile to validate schema
echo.
echo ⚠ Important: Both Prisma and Hibernate will work with this restored database

pause
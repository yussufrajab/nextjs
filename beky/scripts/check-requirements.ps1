# Check Windows Requirements for CSMS Migration
# This script verifies all required tools are installed

Write-Host "=== CSMS Migration Requirements Check ===" -ForegroundColor Green
Write-Host ""

$allGood = $true
$requirements = @()

# Check PostgreSQL
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($pgDump) {
    $pgVersion = & pg_dump --version
    Write-Host "  ✅ PostgreSQL found: $pgVersion" -ForegroundColor Green
    $requirements += @{Name="PostgreSQL"; Status="✅ Found"; Details=$pgVersion}
} else {
    Write-Host "  ❌ PostgreSQL not found in PATH" -ForegroundColor Red
    Write-Host "     Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    $requirements += @{Name="PostgreSQL"; Status="❌ Missing"; Details="Install from postgresql.org"}
    $allGood = $false
}

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    $nodeVersion = & node --version
    Write-Host "  ✅ Node.js found: $nodeVersion" -ForegroundColor Green
    $requirements += @{Name="Node.js"; Status="✅ Found"; Details=$nodeVersion}
    
    # Check if version is 18+
    $versionNumber = $nodeVersion -replace 'v', '' -split '\.' | Select-Object -First 1
    if ([int]$versionNumber -lt 18) {
        Write-Host "  ⚠️  Node.js version is below 18. Recommended: 18+" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Node.js not found" -ForegroundColor Red
    Write-Host "     Install from: https://nodejs.org/" -ForegroundColor Cyan
    $requirements += @{Name="Node.js"; Status="❌ Missing"; Details="Install from nodejs.org"}
    $allGood = $false
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
$npm = Get-Command npm -ErrorAction SilentlyContinue
if ($npm) {
    $npmVersion = & npm --version
    Write-Host "  ✅ npm found: v$npmVersion" -ForegroundColor Green
    $requirements += @{Name="npm"; Status="✅ Found"; Details="v$npmVersion"}
} else {
    Write-Host "  ❌ npm not found" -ForegroundColor Red
    $requirements += @{Name="npm"; Status="❌ Missing"; Details="Usually comes with Node.js"}
    $allGood = $false
}

# Check Prisma CLI
Write-Host "Checking Prisma CLI..." -ForegroundColor Yellow
$prisma = Get-Command prisma -ErrorAction SilentlyContinue
if (-not $prisma) {
    # Try npx prisma
    try {
        $prismaVersion = & npx prisma --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Prisma CLI available via npx" -ForegroundColor Green
            $requirements += @{Name="Prisma CLI"; Status="✅ Found"; Details="Available via npx"}
        } else {
            throw "Not found"
        }
    } catch {
        Write-Host "  ⚠️  Prisma CLI not found globally, will use npx" -ForegroundColor Yellow
        Write-Host "     You can install globally: npm install -g prisma" -ForegroundColor Cyan
        $requirements += @{Name="Prisma CLI"; Status="⚠️  Available"; Details="Will use npx prisma"}
    }
} else {
    $prismaVersion = & prisma --version | Select-String "prisma" | Select-Object -First 1
    Write-Host "  ✅ Prisma CLI found: $prismaVersion" -ForegroundColor Green
    $requirements += @{Name="Prisma CLI"; Status="✅ Found"; Details=$prismaVersion}
}

# Check SSH Client (OpenSSH)
Write-Host "Checking SSH Client..." -ForegroundColor Yellow
$ssh = Get-Command ssh -ErrorAction SilentlyContinue
$scp = Get-Command scp -ErrorAction SilentlyContinue
if ($ssh -and $scp) {
    $sshVersion = & ssh -V 2>&1 | Out-String
    Write-Host "  ✅ SSH Client found: $($sshVersion.Trim())" -ForegroundColor Green
    $requirements += @{Name="SSH Client"; Status="✅ Found"; Details=$sshVersion.Trim()}
} else {
    Write-Host "  ❌ SSH Client not found" -ForegroundColor Red
    Write-Host "     Install OpenSSH Client from Windows Optional Features" -ForegroundColor Cyan
    Write-Host "     Or install Git for Windows which includes SSH" -ForegroundColor Cyan
    $requirements += @{Name="SSH Client"; Status="❌ Missing"; Details="Install from Windows Optional Features"}
    $allGood = $false
}

# Check PowerShell version
Write-Host "Checking PowerShell..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion
if ($psVersion.Major -ge 5) {
    Write-Host "  ✅ PowerShell found: $psVersion" -ForegroundColor Green
    $requirements += @{Name="PowerShell"; Status="✅ Found"; Details="$psVersion"}
} else {
    Write-Host "  ⚠️  PowerShell version is old: $psVersion" -ForegroundColor Yellow
    Write-Host "     Consider upgrading to PowerShell 7+" -ForegroundColor Cyan
    $requirements += @{Name="PowerShell"; Status="⚠️  Old"; Details="$psVersion - consider upgrading"}
}

# Check database connection
Write-Host "Checking database connection..." -ForegroundColor Yellow
if ($pgDump) {
    try {
        # Try to connect to the nody database
        $env:PGPASSWORD = "Mamlaka2020"  # From your .env file
        $dbTest = & pg_dump -h localhost -p 5432 -U postgres -d nody --schema-only --file=nul 2>&1
        $env:PGPASSWORD = $null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Database 'nody' is accessible" -ForegroundColor Green
            $requirements += @{Name="Database Access"; Status="✅ Connected"; Details="nody database accessible"}
        } else {
            Write-Host "  ❌ Cannot connect to 'nody' database" -ForegroundColor Red
            Write-Host "     Error: $dbTest" -ForegroundColor Red
            $requirements += @{Name="Database Access"; Status="❌ Failed"; Details="Cannot connect to nody database"}
            $allGood = $false
        }
    } catch {
        Write-Host "  ❌ Database connection test failed" -ForegroundColor Red
        $requirements += @{Name="Database Access"; Status="❌ Failed"; Details="Connection test failed"}
        $allGood = $false
    }
} else {
    Write-Host "  ⏭️  Skipped (PostgreSQL not available)" -ForegroundColor Gray
    $requirements += @{Name="Database Access"; Status="⏭️  Skipped"; Details="PostgreSQL not available"}
}

# Check project files
Write-Host "Checking project files..." -ForegroundColor Yellow
$projectFiles = @("package.json", "prisma\schema.prisma", "prisma\migrations")
$projectOk = $true

foreach ($file in $projectFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Missing: $file" -ForegroundColor Red
        $projectOk = $false
    }
}

if ($projectOk) {
    $requirements += @{Name="Project Files"; Status="✅ Complete"; Details="All required files found"}
} else {
    $requirements += @{Name="Project Files"; Status="❌ Incomplete"; Details="Some required files missing"}
    $allGood = $false
}

# Summary
Write-Host ""
Write-Host "=== Requirements Summary ===" -ForegroundColor Green
Write-Host ""

$maxNameLength = ($requirements | ForEach-Object { $_.Name.Length } | Measure-Object -Maximum).Maximum
$maxStatusLength = ($requirements | ForEach-Object { $_.Status.Length } | Measure-Object -Maximum).Maximum

foreach ($req in $requirements) {
    $nameFormatted = $req.Name.PadRight($maxNameLength)
    $statusFormatted = $req.Status.PadRight($maxStatusLength)
    Write-Host "$nameFormatted | $statusFormatted | $($req.Details)"
}

Write-Host ""
if ($allGood) {
    Write-Host "🎉 All requirements met! You can proceed with the migration." -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Run backup script: .\beky\scripts\backup-database.ps1"
    Write-Host "2. Upload to VPS: .\beky\scripts\upload-to-vps.ps1 -VpsIp YOUR_VPS_IP -VpsUser YOUR_USERNAME"
    Write-Host "3. Follow the migration guide in beky\docs\MIGRATION_GUIDE.md"
} else {
    Write-Host "❌ Some requirements are missing. Please install them before proceeding." -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Installation Links:" -ForegroundColor Cyan
    Write-Host "- PostgreSQL: https://www.postgresql.org/download/windows/"
    Write-Host "- Node.js: https://nodejs.org/"
    Write-Host "- OpenSSH Client: Windows Settings > Apps > Optional Features > Add"
    Write-Host "- Git for Windows (includes SSH): https://git-scm.com/download/win"
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
# CSMS Backup Package - Complete File Manifest

**Package Name:** beky2a
**Created:** January 13, 2026
**Purpose:** Complete CSMS system backup for VPS restoration

---

## 📋 Complete File Listing

### Root Directory

| File | Size | Description |
|------|------|-------------|
| `README.md` | ~10 KB | Main package documentation |
| `QUICK_START.md` | ~4 KB | Quick restoration guide |
| `MANIFEST.md` | ~3 KB | This file - complete inventory |

---

### 📁 database/ - Database Backups

| File | Size | Format | Description |
|------|------|--------|-------------|
| `nody_backup_20260113_190722.backup` | 5.6 MB | Custom | PostgreSQL custom format (compressed, fast restore) |
| `nody_backup_20260113_190722.sql` | 33 MB | Plain SQL | SQL format (human-readable, portable) |
| `nody_backup_20260113_190722_checksums.txt` | ~1 KB | Text | SHA256 & MD5 checksums for integrity verification |
| `nody_backup_20260113_190722_verification.txt` | ~4 KB | Text | Detailed backup verification report |
| `README.md` | ~8 KB | Markdown | Database backup documentation |

**Database Statistics:**
- Database Name: nody
- Size: 64 MB (uncompressed)
- Tables: 16
- PostgreSQL Version: 16.x

**Key Tables Included:**
- User (authentication)
- Employee (employee records)
- Institution (organizations)
- PromotionRequest
- ConfirmationRequest
- LwopRequest
- CadreChangeRequest
- RetirementRequest
- ResignationRequest
- ServiceExtensionRequest
- TerminationRequest
- SeparationRequest
- EmployeeCertificate
- Complaint
- Notification
- AuditLog
- Session

---

### 📁 scripts/ - Automation Scripts

| File | Size | Executable | Description |
|------|------|-----------|-------------|
| `setup-new-vps.sh` | ~12 KB | ✅ Yes | Complete VPS setup (Node.js, PostgreSQL, Redis, MinIO, PM2) |
| `deploy-app.sh` | ~8 KB | ✅ Yes | Application deployment automation |
| `backup-database.sh` | ~25 KB | ✅ Yes | Database backup utility (copied from beky1a) |
| `restore-database.sh` | ~18 KB | ✅ Yes | Database restoration utility (copied from beky1a) |

**Script Capabilities:**

**setup-new-vps.sh:**
- Installs Node.js 20.x LTS
- Installs PostgreSQL 16
- Installs Redis Server
- Installs MinIO Object Storage
- Installs PM2 Process Manager
- Configures firewall (UFW)
- Creates application directory
- ~15-20 minutes execution time

**deploy-app.sh:**
- Verifies prerequisites
- Installs npm dependencies
- Generates Prisma Client
- Builds Next.js application
- Configures MinIO buckets
- Starts application with PM2
- ~10-15 minutes execution time

**backup-database.sh:**
- Creates dual-format backups
- Generates checksums
- Creates verification report
- Cleans old backups
- Supports custom parameters

**restore-database.sh:**
- Auto-detects backup files
- Interactive backup selection
- Database creation/cleanup
- Post-restore verification
- Detailed reporting

---

### 📁 config/ - Configuration Files

| File | Size | Type | Description |
|------|------|------|-------------|
| `.env.template` | ~2 KB | Template | Environment variables template with comments |
| `ecosystem.config.js` | ~1 KB | JavaScript | PM2 process management configuration |
| `schema.prisma` | ~15 KB | Prisma | Database schema definition |

**Configuration Details:**

**.env.template includes:**
- Application URLs
- Database connection string
- Gemini AI API configuration
- MinIO object storage settings
- CSRF protection secret
- Security notes and generation commands

**ecosystem.config.js manages:**
- Redis worker process
- Genkit AI process
- Auto-restart settings
- Memory limits
- Log file locations

**schema.prisma defines:**
- All database models
- Relationships
- Indexes
- Constraints
- Field types

---

### 📁 application/ - Application Metadata

| File | Size | Type | Description |
|------|------|------|-------------|
| `package.json` | ~4 KB | JSON | Node.js dependencies and scripts |

**Dependencies Summary:**
- **Runtime:** Node.js 20.x
- **Framework:** Next.js 16.0.7
- **Database:** Prisma 6.19.1, PostgreSQL
- **UI:** React 19, Radix UI, Tailwind CSS
- **Storage:** MinIO
- **Queue:** BullMQ, Redis
- **AI:** Google Genkit
- **Testing:** Vitest, Playwright

---

### 📁 docs/ - Documentation

| File | Size | Type | Description |
|------|------|------|-------------|
| `RESTORATION_GUIDE.md` | ~20 KB | Markdown | Complete step-by-step restoration guide |

**Guide Contents:**
- Overview and prerequisites
- Step-by-step restoration (5 phases)
- Post-restoration configuration
- Verification procedures
- Troubleshooting section
- Security hardening checklist
- Maintenance tasks
- Command reference

---

## 📊 Package Statistics

### Total Files: 15

**By Type:**
- Documentation (Markdown): 6 files
- Shell Scripts: 4 files
- Database Backups: 2 files
- Verification Files: 2 files
- Configuration: 3 files
- Application: 1 file

**By Purpose:**
- Documentation: 6 files (~45 KB)
- Database: 4 files (~40 MB)
- Scripts: 4 files (~63 KB)
- Configuration: 3 files (~18 KB)

### Total Package Size

**Uncompressed:** ~40 MB
**Compressed (tar.gz):** ~10-12 MB (estimated)

---

## 🔒 Security Considerations

### Sensitive Files (Handle with Care)

| File | Security Level | Notes |
|------|---------------|-------|
| `database/*.backup` | 🔴 Critical | Contains all user data, passwords (hashed) |
| `database/*.sql` | 🔴 Critical | Plain text SQL with all data |
| `.env.template` | 🟡 Medium | Template only, safe to share |

### Files Safe to Share

| File | Public? | Notes |
|------|---------|-------|
| `README.md` | ✅ Yes | General documentation |
| `QUICK_START.md` | ✅ Yes | Setup instructions |
| `MANIFEST.md` | ✅ Yes | This inventory |
| `scripts/*.sh` | ✅ Yes | No secrets, configurable |
| `config/.env.template` | ✅ Yes | Template only |
| `docs/RESTORATION_GUIDE.md` | ✅ Yes | Instructions only |

---

## 🎯 File Usage Matrix

### During Initial Setup

| Phase | Files Used |
|-------|-----------|
| VPS Setup | `scripts/setup-new-vps.sh` |
| Database Restore | `scripts/restore-database.sh`, `database/*.backup` |
| App Config | `config/.env.template`, `config/ecosystem.config.js` |
| Deployment | `scripts/deploy-app.sh`, `application/package.json` |

### For Reference

| Purpose | Files |
|---------|-------|
| Quick Start | `README.md`, `QUICK_START.md` |
| Detailed Guide | `docs/RESTORATION_GUIDE.md` |
| Database Info | `database/README.md`, `database/*_verification.txt` |
| Dependencies | `application/package.json` |
| Schema | `config/schema.prisma` |

---

## ✅ Integrity Verification

### Checksums Available

```bash
# Verify database backup integrity
cd beky2a/database
sha256sum -c nody_backup_20260113_190722_checksums.txt
```

**Expected Output:**
```
nody_backup_20260113_190722.backup: OK
nody_backup_20260113_190722.sql: OK
```

### File Completeness Check

```bash
# Count files in package
find beky2a -type f | wc -l
# Expected: 15 files

# Check all scripts are executable
ls -l beky2a/scripts/*.sh
# All should have 'x' permission
```

---

## 📦 Package Distribution

### Recommended Transfer Methods

1. **SCP (Secure Copy)**
   ```bash
   scp -r beky2a/ root@YOUR_VPS_IP:/root/
   ```

2. **Rsync (Efficient)**
   ```bash
   rsync -avz beky2a/ root@YOUR_VPS_IP:/root/beky2a/
   ```

3. **Tarball (Compressed)**
   ```bash
   # Create
   tar -czf csms-backup-20260113.tar.gz beky2a/

   # Transfer
   scp csms-backup-20260113.tar.gz root@YOUR_VPS_IP:/root/

   # Extract
   ssh root@YOUR_VPS_IP
   tar -xzf csms-backup-20260113.tar.gz
   ```

### Package Integrity After Transfer

```bash
# On VPS, verify structure
cd beky2a
ls -lR

# Verify scripts are executable
ls -l scripts/*.sh
# If not: chmod +x scripts/*.sh

# Verify checksums
cd database
sha256sum -c *_checksums.txt
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-13 | Initial backup package creation |

---

## 📝 Notes

### File Naming Convention

- Database backups: `nody_backup_YYYYMMDD_HHMMSS.*`
- Checksums: `*_checksums.txt`
- Verification: `*_verification.txt`
- Scripts: `*-*.sh` (kebab-case)
- Configs: Original names preserved

### Maintenance

**This manifest should be updated when:**
- New files are added to the package
- Files are removed or replaced
- Database is re-backed up
- Scripts are updated
- Documentation is revised

---

## 🎓 File Dependencies

```
setup-new-vps.sh
    ├── (standalone, no dependencies)
    └── Installs: Node.js, PostgreSQL, Redis, MinIO, PM2

restore-database.sh
    ├── Requires: PostgreSQL installed
    ├── Uses: database/*.backup OR database/*.sql
    └── Validates: *_checksums.txt

deploy-app.sh
    ├── Requires: VPS setup completed
    ├── Requires: Database restored
    ├── Uses: .env file
    ├── Uses: package.json
    ├── Uses: ecosystem.config.js
    └── Starts: Application with PM2

.env (user creates from template)
    ├── Based on: .env.template
    └── Used by: Application, deploy-app.sh
```

---

## 🏁 Completeness Checklist

This package is complete and ready for restoration when:

- [x] Database backup files present (both formats)
- [x] Checksums generated and verified
- [x] All scripts present and executable
- [x] Configuration templates included
- [x] Documentation complete
- [x] Package metadata documented
- [x] Manifest created (this file)

---

## 📞 Manifest Information

**Document Version:** 1.0
**Last Updated:** January 13, 2026
**Maintained By:** CSMS Development Team
**Package Location:** `/home/latest/beky2a/`

---

**This manifest serves as a complete inventory of the backup package.**
**All files listed here are essential for successful restoration.**

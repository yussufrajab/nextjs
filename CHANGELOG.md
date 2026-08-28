# Changelog

All notable changes to the Civil Service Management System (CSMS) are documented here.
Generated from commit history (382 commits, 2025-08-03 → 2026-08-04). No release tags exist;
periods are grouped by development waves. Format adapted from [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased] — 2026-08-04

### Security — IP Ban on Abuse
- **feat(security):** IpBan Prisma model + migration (`7518883c`)
- **feat(security):** IP ban audit event types (`4afaa2d8`)
- **feat(security):** constants, enums, pure helpers, status reads (`7244f4e8`)
- **feat(security):** Redis counters + write path — `banIp`, `autoUnban`, manual ban/unban (`9c2d5537`)
- **feat(security):** block banned IPs at login + feed failed-login counter (`23637ddd`)
- **feat(security):** feed auth-tier 429s into the IP ban counter (`e7a7e597`)
- **feat(security):** admin `ban-ip` / `unban-ip` API routes (`58493ab5`)
- **feat(security):** admin ip-bans list + public `ip-ban-status` routes (`52845a24`)
- **docs(security):** IP ban env vars documented (`1fb550a6`)
- **docs(security):** IP ban design + implementation plan (`86347d4f`)

### Authentication
- **feat(auth):** show-password checkbox on login form (`005dd527`)

---

## 2026-07-25 → 2026-07-26 — Security Controls & Self-Service Password Reset

### Security — Complainant Privacy & Export Authorization
- **feat(security):** complainant-identity confidentiality (Req 9.6) + prior security work (`36f11596`)
- **feat(security):** server-side export authorization (Req 12.2) (`80d1b96e`)
- **feat(security):** complainant privacy, role privileges, employee dedup + repo cleanup (`9414d375`)

### Self-Service Password Reset (Req 1.10)
- **docs:** design spec (`54307bba`) + implementation plan (`77c17700`)
- **feat(schema):** `PasswordResetToken` table (`fd7c6ecc`)
- **feat(lib):** hashed single-use password-reset token utilities (`2956c53e`)
- **feat(email):** `sendPasswordResetEmail` template (`a71789f1`)
- **feat(api):** `POST /api/auth/forgot-password` — non-enumerable reset link issuer (`db8f33d9`)
- **feat(api):** `POST /api/auth/reset-password` — token-verified self-service reset (`feb979a9`)
- **feat(ui):** forgot-password page + form (`7dffcc27`)
- **feat(ui):** reset-password page + form (`87e20dd3`)
- **feat(ui):** "Forgot password?" link on login page (`3ba3462f`)
- **chore(env):** password-reset token config vars (`a8cf407a`)

### Security Status Documentation
- **docs(security):** mark control 1.10 implemented (`e074b86d`)
- **docs(security):** bump master-summary totals for 1.10 flip (`5e6c105f`)
- **docs(security):** 30-requirement implementation status report (`4b0a8e75`)
- **docs(security):** v1.1 code-review pass — 31 PENDING sub-tests reclassified (`617e8c66`)
- **docs(security):** v1.2 runtime test pass — 31/31 PENDING confirmed (`94536420`)
- **docs(security):** v2.0 runtime pass for 31 PENDING sub-tests (`6901f5ff`)

---

## 2026-07-17 → 2026-07-20 — Fixes & Security Remediation

- **fix(security):** DB-validated session proxy + HRIMS fetch-data 500 fix (`5933947b`)
- **fix:** align dashboard metrics with HRRP workflow + HRIMS/files/users fixes (`f4577832`)
- **fix(employee-login):** surface email in login response so complaints MFA works (`47e73ec6`)

---

## 2026-07-10 — Role-Based Auth & Workflow Stage Fixes

### Role-Based Auth on Collection PATCH Handlers (UAT Req 3.5/8.3/18.3/25.3)
- **fix(termination):** add role-based auth (`99056cc4`)
- **fix(service-extension):** add role-based auth (`3195e0f3`)
- **fix(resignation):** add role-based auth (`0a95416c`)
- **fix(retirement):** add role-based auth (`5f64c5e4`)

### reviewStage Server-Side Advancement (Commission Decision buttons)
- **fix:** termination (`dbe37c7b`), service-extension (`dbe37c7b`), resignation (`4e8b7ab1`),
  retirement (`5f64c5e4`), confirmations (`6bd94509`), lwop (`73fe4710`), cadre-change (`de937395`),
  promotion (`9d217b6f`)

### E2E Test Suite Fixes (RC2–RC6)
- **test(e2e):** fix chronic suite failures — toast selector, loginAs, cleanup, eicar gate (`346d4bef`)
- **test(e2e):** correct loginAs toast match + relax auth rate limit (`05d3fc57`)
- **test(e2e):** rewrite lock-account test to assert via DB + reset HRO account (`4411d0d9`)

### Security Quick Wins
- **fix(security):** implement Quick Wins Q1–Q14 from security audit (`c03fa2d8`, PR #4)

---

## 2026-07-09 — Workflow Stepper UI & HHRMD/DO Cleanup

### Workflow Stepper UI (all HRRP modules)
- **feat:** confirmation (`fd62f5b6`), lwop (`fa19bc84`), promotion (`456850ea`),
  service-extension (`dba60505`), termination (`406792f8`, `1a3bd6e7`), dismissal (`e126a21c`),
  cadre-change (`ea82a290`), resignation (`f3e0c493`, `c0682026`), retirement (`78c50807`),
  complaints — replace hand-rolled indicator with WorkflowSteps component (`c65c9c32`)

### Workflow Corrections
- **feat(workflow):** correct HHRMD/DO review labels and consolidate dismissal flow (`a654e0ac`, PR #2)

### Chores
- **chore:** ignore `/csms` (production3 VPS source mirror) (`32af1a8b`)
- **chore(tsconfig):** exclude `/csms` from typecheck (`b91e0801`)
- **chore(eslint):** ignore `/csms` from linting (`7b23d94c`)

---

## 2026-06-29 → 2026-07-01 — Secure Cookie-Based Auth Refactor

### Design & Planning
- **docs:** spec for secure cookie-based auth — remove localStorage persistence (`35ee3f8d`)
- **docs:** implementation plan for secure cookie-based auth refactor (`0d87d2c8`)

### DB Session Storage (FIX 1, 3, 4)
- **feat(session):** cookie options, HMAC signing, `terminateOtherUserSessions` helper (`dc3070aa`)
- **feat(security):** `verifyAuth` validates signed DB session cookie (`c7778bd8`)
- **feat(security):** signed HttpOnly session cookie; stop returning sessionToken in login JSON (`7d3d261c`)
- **feat(security):** logout reads+verifies session cookie server-side, clears both cookies (`56b2ed93`)
- **feat(security):** stop persisting sessionToken/accessToken/refreshToken in localStorage (`2f2a67e5`)
- **feat(security):** client login/MFA forms stop storing sessionToken and writing auth-storage cookie (`b5ea14ba`)

### Session Security Enhancements
- **feat(security):** per-request IP/User-Agent binding check on every authenticated request — test 2.6 (`96c81f7c`)
- **feat(security):** embed expiration claim in signed session token — test 2.2 (`6a82c9ad`)
- **feat(security):** invalidate other sessions on password change — test 2.3 (`3a9892c0`)
- **refactor(auth):** sessions terminate uses `sessionId` instead of client-supplied `sessionToken` (`125e3423`)

### Auth Refactor Cleanup
- **refactor(auth):** drop unsigned auth-storage cookie from `completeLogin` (`169e1f1b`)
- **fix(auth):** refresh-user-data via signed session, strip `passwordHistory` (`c82aca46`)
- **refactor(auth):** `/api/auth/session` via signed session + `getMePayload` (`98f3f644`)
- **chore(auth):** audit confirms no further `passwordHistory` leakage in `src/app/api` (`228ccd03`)
- **refactor(auth):** apiClient cookie-only transport, drop localStorage tokens (`e8db7d23`)
- **refactor(auth):** auth-store in-memory only, hydrate from `/auth/me` (`c1e63862`)
- **fix(auth):** route auth-storage-dependent APIs through signed session (`c5cfa8e0`)
- **refactor(auth):** wire async `/auth/me` hydration, drop client auth-storage writer (`8b6ac958`)
- **refactor(auth):** logout clears session + csrf cookies only (`c35acc7e`)

### `/auth/me` Endpoint
- **feat(auth):** `getMePayload` UI-safe `/auth/me` helper (`09bda846`)
- **fix(auth):** include email in `MePayload` for complaints MFA flow (`5b7d175d`)
- **feat(auth):** `GET /api/auth/me` endpoint (signed-session, UI-safe) (`89ac312c`)
- **test(auth):** cover `/auth/me` user-not-found 401; no-store on 401 (`5a31a120`)

### Hardening
- **feat(security):** harden API routes with centralized error handling and session controls (`67fb9c81`)
- **fix(security):** reject unknown magic bytes when declared type has known signature — tests 10.4/10.5/10.6 (`933ea1f4`)

---

## 2026-07-01 → 2026-07-08 — UAT Testing & Security Remediation

- **test:** complete section 4 UAT tests (4.5, 4.6, 4.7) (`883b341e`)
- **test:** add Req 4.4 institution filtering test results to UAT (`61ca5d44`)
- **test:** complete Requirement 5 Employee Profile Protection UAT tests (`3f71af72`)
- **security:** remediate findings across requirements 11–38 (`d6880cdc`)
- **security:** close GAP-C2 generic file integrity + GAP-M2 withdrawal wiring (`809bf5e2`)
- **fix(workflow):** restore HRO resubmit across HRRP modules + security batch (`87cf6fff`)
- **docs(security):** session summaries for 2026-07-08 UAT review work (`6fca8027`)

---

## 2026-05-22 → 2026-05-31 — Security Sprint

### API Security (API-01 through API-04)
- **docs:** API security design spec (`a983304d`) + implementation plan (`cabc8ab5`)
- **feat:** API auth wrapper with session verification and role checking (`2538947c`)
- **feat:** Redis-backed rate limiter with auth/write/read/upload tiers (`8d4cb8c8`)
- **feat:** response sanitization to strip sensitive user fields (`9fd48544`)
- **feat:** Zod validation schemas and request validator (`dc89fecd`)
- **feat:** integrate auth, rate limiting, sanitization into core API routes (`645b90d4`)
- **feat:** integrate auth and rate limiting into all remaining API routes (`0d1ccb7c`)
- **feat:** gate debug/test routes behind non-production environment (`85d81bc2`)
- **feat:** move HRIMS credentials to env vars and fix CORS (`ffb485e9`)
- **feat:** mask session tokens to 4 chars and add auth to sessions API (`68194419`)
- **test:** unit tests for API auth, rate limiter, sanitization, validation schemas (`f13cd816`)

### File Upload Security (FILE-01 through FILE-04)
- **docs:** file upload security design spec (`a07e734b`) + implementation plan (`080f3871`)
- **feat:** ClamAV client for file malware scanning (`b10052e2`)
- **feat:** centralized file validation module (`c7be658d`)
- **feat:** integrate `validateFileUpload` into all upload routes (`1b1d8c66`)
- **feat:** update file upload component to handle security error codes (`3446a6cb`)
- **feat:** ClamAV env config and test setup (`8206c370`)
- **test:** unit tests for file validation and ClamAV client (`43590e5b`)
- **fix:** enforce 1MB file upload limit across all contexts (`0f221486`)

### Audit Logging Infrastructure
- **docs:** comprehensive audit logging design spec (`f0bf99e2`)
- **feat:** update AuditLog schema — `deviceInfo` replaces `userAgent` (`b827cc2e`)
- **feat:** expand audit-logger with new event types, `deviceInfo`, convenience functions (`49e51234`)
- **feat:** client-side device info utility for audit logging (`d20d786d`)
- **feat:** `x-device-info` header on mutating API requests (`41314051`)
- **feat:** `withAuditLogging` higher-order function for API routes (`7d8f0c4e`)
- **feat:** audit logging to auth (`9a977106`), admin (`745dfbda`), request (`26fe4fd4`),
  complaints/employees/users/institutions/file upload (`a8604eff`), MFA routes (`3be11cba`)
- **feat:** enhance audit trail page — new event types, device column, CSV export (`18a83412`)
- **feat:** audit log POST endpoint uses `deviceInfo` (`2c741357`)
- **feat:** CSRF utilities use `deviceInfo` instead of `userAgent` (`45fe9632`)

### Partitioned Audit Table
- **feat:** `audit-db.ts` for raw SQL access to partitioned audit table (`e68f1842`)
- **feat:** SQL migration for partitioned `audit.audit_log` table (`155fdc2e`)
- **feat:** rewrite `audit-logger.ts` to use raw SQL audit-db layer (`747c055f`)
- **feat:** remove redundant PrismaClient from audit logs route (`38a87551`)
- **feat:** remove AuditLog model from Prisma schema — uses partitioned table (`92d1e062`)
- **feat:** add `entityType`/`entityId` to audit trail page interface (`7fb06929`)
- **feat:** audit partition cron job and startup partition verification (`a2c092ef`)
- **feat:** audit log archival script with partition verification (`b3c573af`)
- **feat:** audit partition pre-creation script (`47388ab3`)

### Structured Logging (Pino)
- **feat:** structured Pino logger module with child loggers (`30658354`)
- **feat:** client-safe logger for browser components (`2602b45b`)
- **feat:** wire Prisma error events to structured logger (`7791fca2`)
- **feat:** logrotate configuration for CSMS log files (`cfe4bdc7`)
- **chore:** add pino and pino-pretty dependencies (`5bf0bad7`)
- **test:** unit tests for structured logger modules (`02ecc91a`)
- **feat:** replace console calls with structured Pino logger across codebase (`7386c2e2`)

### Centralized Error Handling (ERR-01)
- **feat:** `wrapHandler()` generic error wrapper (`f059f403`)
- **refactor:** apply centralized error handling to employees API (`40af4ad7`), auth API (`400b46b8`),
  promotions/confirmations/complaints (`f8ac9cf7`), batch 2 routes (`38823353`),
  remaining API routes (`9c7ac646`), all API routes (`026f2c8d`)
- **fix(audit):** log HRRP approval/rejection events in audit trail (`f436cfd8`)

---

## 2026-05-25 — HRRP Review Stage (All Modules)

### Design & Planning
- **docs:** HRRP review stage design spec (`dc7de0ea`) + implementation plan (`41becf39`)

### Confirmation
- **feat:** `hrrpReviewedById`/`hrrpReviewedAt` fields to `ConfirmationRequest` (`fa83f74b`)
- **feat:** POST routes HRO submissions through HRRP (`c53a6736`)
- **feat:** HRRP review actions to PATCH handler (`23959872`)
- **feat:** `hrrpReviewedBy` in GET response (`22a3c547`)
- **feat:** frontend uses HRRP review statuses (`b4fb0cff`)
- **feat:** review actions, buttons, workflow indicator to confirmation page (`9ee92e63`)
- **feat:** `hrrpReviewedBy` support to `[id]` route (`d8308aaf`)
- **feat:** HRRP-specific notification templates (`1b5bf7e3`)
- **docs:** confirmation route description update (`efa9bb3e`)

### LWOP
- **feat:** `hrrpReviewedById`/`hrrpReviewedAt` to `LwopRequest` (`35b090b3`)
- **feat:** POST routes through HRRP (`b51614ba`)
- **feat:** HRRP review actions to PATCH (`3425a887`)
- **feat:** `hrrpReviewedBy` in GET (`bfcd2ac7`)
- **feat:** `hrrpReviewedBy` to `[id]` route (`ece10ecf`)
- **feat:** HRRP notification templates (`62864974`)
- **feat:** review actions, buttons, workflow to LWOP page (`4039c2fc`)
- **docs:** LWOP route description update (`e35966d5`)

### Promotion
- **feat:** `hrrpReviewedById`/`hrrpReviewedAt` to `PromotionRequest` (`dd38569a`)
- **feat:** POST routes through HRRP (`d132d778`)
- **feat:** HRRP review actions to PATCH (`e6f6b0b4`)
- **feat:** `hrrpReviewedBy` in GET (`f014162c`)
- **feat:** `hrrpReviewedBy` to `[id]` route (`16b91deb`)
- **feat:** HRRP notification templates (`55f6073b`)
- **feat:** review actions, buttons, workflow to promotion page (`cd2cdc59`)
- **docs:** promotion route description update (`2d5ec894`)

### Cadre Change
- **feat:** `hrrpReviewedById`/`hrrpReviewedAt` to `CadreChangeRequest` (`5489f2ba`)
- **feat:** POST routes through HRRP (`7f4b45c1`)
- **feat:** HRRP review actions to PATCH (`b73e70d2`)
- **feat:** `hrrpReviewedBy` in GET (`6cc7c73a`)
- **feat:** `hrrpReviewedBy` to `[id]` route (`896083a7`)
- **feat:** HRRP notification templates (`46d888db`)
- **feat:** review actions, buttons, workflow to cadre-change page (`2fb8a18a`)
- **docs:** cadre-change route description update (`2753384f`)

### Cross-Module
- **feat:** HRRP review fields to remaining 4 modules — schema, notifications, permissions (`98b92170`)
- **docs:** confirmation commission letter design spec (`ac216b5d`) + plan (`504d49c6`)

---

## 2026-05-26 — Complaint MFA & Misc Features

- **feat:** HRRP workflow, commission letters, session timeout, EMPLOYEE login fixes (`c0da12fd`)
- **docs:** magic link MFA design for complaint submission (`79be3c30`) + plan (`65187895`)
- **feat:** magic link verify API for complaint submission (`34a8e184`)
- **feat:** magic link confirmation page for complaint MFA (`6f24848a`)
- **feat:** update complaints page to use magic link MFA flow (`958c01af`)
- **feat:** complete complaint MFA — email duplicate prevention, auth refresh, UX fixes (`35c6dccf`)
- **fix:** redirect to `/dashboard/complaints` instead of non-existent route (`9e106081`)
- **fix:** correct Swahili grammar connectors for 'link' in complaints module (`ea045403`)

---

## 2026-05-28 — Disaster Recovery & Logging

- **feat:** disaster recovery backup excluding employee data (`8414bc16`)
- **feat:** disaster recovery backup with employee data (`467d8c0d`)
- **docs:** backup manifest, restore guide, quick reference, backup options comparison
- **feat:** logging architecture, security improvements, dashboard updates (`9b000f4d`)
- **fix(logger):** fall back to stdout when log file path is unwritable (`899b0371`)

---

## 2026-05-18 — Advanced Search & Pagination

- **feat:** advanced employee search/filtering and multiple UI/backend improvements (`5af8bc84`)

---

## 2026-05-14 — Server-Side Pagination & Session Admin

- **feat:** server-side pagination and status filter tabs to all request modules (`a640ca1c`)
- **feat:** session cleanup admin page and institution display in request cards (`2b210370`)

---

## 2026-02-03 → 2026-02-17 — HRIMS Settings & Complaint Enhancements

- **feat:** admin HRIMS settings configuration page (`9dbe318d`) + admin navigation entry (`58acdb06`)
- **feat:** enhance complaint module and reduce file upload limit to 1MB (`ef065c1e`)

---

## 2026-01-13 → 2026-01-31 — Bulk Upload, Manual Entry & PM2

### Bulk Employee Upload
- **feat:** bulk employee upload feature for HROs (`d8dc3b04`)
- **docs:** quick start guide for bulk upload template (`071997a0`)
- **feat:** PDF bulk upload documentation (`4ecc695e`)
- **fix:** make bulk upload documentation publicly accessible (`7e78d7e0`)
- **fix:** button text "Download Guide as PDF" (`139b51b3`)

### Manual Employee Entry & HRIMS Integration
- **feat:** manual employee entry with cache fixes and validation (`a855afc6`)
- **feat:** institution manual entry system, HRIMS integration, employee fetch utilities (`36fa43e4`)
- **fix:** prevent HRIMS data fetching for manually entered employees (`1d7e1092`)

### PM2 Process Management
- **feat:** comprehensive PM2 process management for all services (`55988025`)

### Database & Infrastructure
- **feat:** comprehensive database backup and VPS migration tools (`d6a95d9a`)
- **feat:** institution unique constraints, delete confirmation, SSL configs (`b4e471c8`)
- **fix:** Next.js 16 Turbopack build issues + session management script (`2d7d622f`)
- **feat:** enhance certificate management and webpack configuration (`b6a6a05f`)

---

## 2026-01-02 → 2026-01-11 — Code Quality, Testing & Report Fixes

### Code Quality Tooling
- **feat:** Prettier for automatic code formatting (`16150514`)
- **feat:** custom ESLint rules with TypeScript best practices (`0d27867b`)
- **chore:** pre-commit hooks with Husky and lint-staged (`816ff080`, `4c94733e`)
- **chore:** npm-shrinkwrap.json with Husky and lint-staged dependencies (`4c94733e`)
- **docs:** Code Review Report updated to reflect resolved critical issues (`5e208952`)
- **docs:** proper documentation in docs folder (`bf6673d3`)

### TypeScript Enforcement
- **feat:** enforce TypeScript type checking for production builds (`ed7d6098`)
- **fix:** TypeScript compilation errors across codebase (`c7ef6233`)
- **test:** fix TypeScript errors in session-manager and test setup (`95a0aaab`)
- **test:** update csrf-utils tests with TypeScript fixes (`40a2063d`)

### Testing Infrastructure
- **feat:** comprehensive testing infrastructure and bug fixes (`cc3a009a`)
- **feat:** implemented testing and account lockout notifications fixed (`15de9184`)

### Report & Workflow Fixes
- **fix:** report and institution name fixed (`1ca6d1ad`)
- **fix:** report dates fixes and HHRMD assign last employee grade (`32506bec`)
- **fix:** HRO dashboard statistics to show all pending requests (`62fcfe8e`)
- **fix:** enable automatic refresh for all HR request modules (`c480844e`)

---

## 2025-12-27 → 2025-12-28 — Security, Performance & UX Polish

### Security Systems
- **feat:** comprehensive security enhancements and documentation reorganization (`eb0692dc`)
- **feat:** comprehensive password expiration and reset policy system (`85f52ce3`)
- **feat:** comprehensive Account Lockout Policy system (`d10794fe`)
- **feat:** session management and enhanced security tracking (`22413c6c`)
- **feat:** comprehensive CSRF protection and security headers (`32692f64`)

### Performance
- **feat:** comprehensive performance optimizations for CSMS (`8e7952e1`)
- **feat:** JavaScript bundle optimization — Phase 1 (`a07dbc79`)
- **feat:** UX polish, background job queue, pagination enhancements (`92811437`)

---

## 2025-12-01 → 2025-12-16 — HRIMS Integration & MinIO Storage

### HRIMS Automatic Fetch System
- **feat:** comprehensive HRIMS automatic fetch system with pagination (`90887d27`)
- **feat:** HRIMS bulk fetch improvements and documentation (`d32f6184`)
- **feat:** HRIMS document fetching with split requests and streaming progress (`b06b11eb`)
- **fix:** HRIMS document fetch timeout 60s → 120s (`6c38ff58`)
- **feat:** MinIO caching system to prevent redundant HRIMS API calls (`a2ba7338`)
- **feat:** MinIO storage for single employee fetch with photos and documents (`e73bd0e0`)
- **feat:** employee photo to MinIO storage from integration (`77914f0d`)
- **fix:** retirement age calculation in Urgent Actions page (`8ac05f4c`)
- **feat:** filter employee by TIN and vote number (`c2066a57`)

### Role & Permission Fixes
- **fix:** restrict Admin role to system administration only (`7b7cb915`)
- **fix:** CSCS role visibility and permissions across all request modules (`93e4d4bb`)
- **fix:** Employee column display in recent activities page and Admin role case (`7772db32`)
- **feat:** hide Recent Activities section from Admin role frontend (`3e44217b`)
- **fix:** remove Recent Activities from Admin navigation menu (`e4790aa5`)
- **fix:** Admin dashboard to show total system statistics (`ad476f6c`)

### Institutions
- **feat:** add institutions page and fix employee profile navigation (`92239af1`)

---

## 2025-11-24 → 2025-11-27 — Case Fixes, Auto-Provisioning & Pagination

- **fix:** case mismatch issues and auto-provisioning for employee login (`862e2c72`)
- **refactor:** fixing camelCase and PascalCase in whole codebase (`35137aee`)
- **fix:** auto-provisioning bug in employee login — add required `updatedAt` field (`9e4fc459`)
- **feat:** Tin Number field to Institution model + admin pages (`cf5a3ace`)
- **fix:** Tin Number field saving and unique constraint validation (`0088c0b1`)
- **feat:** optimize pagination for employee request management pages (`90ea882a`)
- **feat:** change password feature and fix submitter name display (`f867be43`)

---

## 2025-08-05 → 2025-10-16 — Initial Feature Development

### Employee Management
- **feat:** comprehensive employee document and certificate management system (`6c115df3`)
- **feat:** search by payroll and cross-institutional changes (`ce50a875`)
- **feat:** payroll number search across all HRO modules (`cc2057e8`)
- **fix:** include certificates in employee data queries for persistence after refresh (`c9407997`)

### User Management
- **feat:** email functionality to user management system (`e846fee7`)
- **feat:** improve user management search and role-based navigation (`40f9c033`)
- **feat:** user management improved (`bf9a2b20`)
- **fix:** HRO role fix (`68ca85ce`)

### Request Modules
- **feat:** visual completion indicators to all request modules (`19d8baed`)
- **fix:** restriction on service extension, promotion, lwop, employee confirmation (`186bbe87`)
- **fix:** confirmation module parallel review fixed (`0a6ee5c3`)
- **feat:** cadre and grade in promotion and cadre change module (`166b367b`)
- **feat:** gender added to report (`7581e7b0`)
- **feat:** other validations implemented (`19d084f8`)
- **feat:** validation to prevent duplication requests (`ccb67652`)
- **feat:** all modules show uploaded files with options (`a7f9f58d`)
- **feat:** uploaded file visual display (`9b80fb10`)

### Infrastructure
- **feat:** configure MinIO file storage and update application settings (`0058a3e5`)
- **feat:** MinIO setup scripts and documentation (`38ecdfc0`)
- **feat:** advanced institution management enabled (`09fe0e03`)
- **feat:** preparation for integration with HRIMS (`e5c42889`)
- **feat:** add SMZ logo to the CSMS (`8a853b1c`, `aa66866c`)

### Reports & Complaints
- **fix:** gender display in complaints report (`db7c7a77`)
- **fix:** retirement age calculation and resignation field label updates (`b2ef36a6`)

---

## 2025-08-03 — Initial Commit

- **feat:** Complete CSMS application with HRIMS integration (`a3570db1`)
- **feat:** Initial commit (`3ebdb8b6`)

---

*Generated 2026-08-08 from `git log` (382 commits across 6 months).*
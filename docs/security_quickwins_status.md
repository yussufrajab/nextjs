# Security Quick Wins — Implementation Status

Based on: `Security_Specification_Controls_Document.md` v2.0 (2026-05-29)
Status date: 2026-05-30

## Already Implemented (in-progress, uncommitted)

| Gap | Description | Status |
|-----|-------------|--------|
| **GAP-01** | Auth cookie `httpOnly` + `Secure` flags | Done. Server-side cookie set in `auth-helpers.ts`, session endpoint updated, client-side `setAuthCookie` removed from `auth-store.ts` |
| **GAP-02** | Default CSRF secret | Done. `csrf-utils.ts` now throws if `CSRF_SECRET` not set |
| **GAP-03** | Secrets in `.env` | Done. `.gitignore` updated to exclude `.env`, `.env.local`, `.env.*.local` |
| **GAP-06** | Duplicate RBAC config | Done. `route-permissions-config.ts` created as single source of truth, `route-permissions.ts` re-exports from it. Middleware still has a copy (Next.js edge runtime limitation) but is documented with a sync warning |
| **GAP-04** | CSP `unsafe-inline`/`unsafe-eval` | Partial. `csp.ts` created with nonce-based CSP + `report-uri`, but not yet wired into `next.config.ts` or layout |
| **GAP-05** | PII encryption at rest | Partial. `encryption.ts` created with pgcrypto helpers, but no DB migration or application integration yet |

## Remaining Quick Wins (not yet started)

| Priority | Gap | Effort | What Needs Doing |
|----------|-----|--------|-----------------|
| **P0** | GAP-03 (step 2) | Done | `.env` was never tracked by git — confirmed via `git ls-files --cached .env` |
| **P1** | GAP-08 | Done | Removed `accessKey` from MinIO startup log line in `src/lib/minio.ts:12` |
| **P1** | GAP-10 | Done | Changed default password from `employee.zanId` to `randomBytes(16).toString('hex')` in `employee-login/route.ts:121` |
| **P1** | GAP-14 | Done | Already conditional — `rejectUnauthorized: process.env.NODE_ENV === 'production'` in `email.ts:32` |
| **P2** | GAP-11 | Done | Created `src/lib/audit-health.ts` + `/api/health/audit` endpoint |
| **P2** | GAP-12 | Done | Already existed — `/api/csp-report` endpoint in `src/app/api/csp-report/route.ts` |
| **P2** | GAP-15 | Done | Already implemented — `Content-Length` check in `middleware.ts:240-251` |
| **P3** | GAP-13 | N/A | SRI not applicable — the only Google reference is `next/font/google` which bundles fonts at build time, no runtime external scripts |

## Larger Efforts (not quick wins)

| Gap | Effort | Reason |
|-----|--------|--------|
| GAP-04 (finish) | 3-5 days | Nonce plumbing through Next.js layout + testing |
| GAP-05 (finish) | 5-10 days | DB migration, data migration, app integration |
| GAP-07 | 1-2 hrs | `npm update @babel/runtime` + CI audit workflow |
| GAP-09 | 3-5 days | TOTP integration for users without email |

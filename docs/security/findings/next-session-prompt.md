# Continue Closing Security Gaps — CSMS Remediation Session

## Context

This is a continuation of a focused security remediation on the Civil Service Management System (CSMS), a Next.js 14 full-stack application for the Zanzibar Civil Service. Working directory: `/home/latest`. Branch: `feat/err01-batch3-wrap-handler`.

**Status as of 2026-07-06:** 27 of 29 security gaps are fully closed. **2 gaps are partially closed and need completion.** This session's sole purpose is to close those 2 remaining partials and update the tracking documents.

## Source Documents (READ THESE FIRST)

1. `/home/latest/docs/security/findings/gap_analysis.md` — **the remediation backlog**. Read §4 GAP-C2 and §6 GAP-M2 in full before starting. Both are marked 🟡 Partial.
2. `/home/latest/docs/security/findings/UAT_Security_review_By_AMINA.md` — **the test execution record**. Read row 10.7 (UAT), row 15.10 (UAT), and the v1.8 reconciliation section.

## Branch Setup

```bash
cd /home/latest
git checkout feat/err01-batch3-wrap-handler
git pull  # ensure latest
```

## Task 1: Close GAP-C2 — Wire File Integrity Into Generic Upload/Download/Preview (CRITICAL, ~1 day)

**Current state:** Helper `src/lib/file-integrity.ts` ships with `recordDocumentHash()` and `verifyDocumentHash()`. The `DocumentHash` model exists in `prisma/schema.prisma:166`. HRIMS post-store round-trip is already wired in `src/app/api/hrims/sync-documents/route.ts:275, 292`. **Generic `files/upload`, `files/download`, `files/preview` endpoints do NOT call the integrity helpers yet.**

**Sub-tasks:**

1.1. **`src/app/api/files/upload/route.ts:63`** — After ClamAV scan passes AND the file is persisted to MinIO, call `recordDocumentHash(employeeId, fieldName, rawBuffer, auth.userId)`. The `employeeId` and `fieldName` come from the upload request body. If the helper throws or returns failure, log a CRITICAL `POTENTIAL_BREACH` audit event and reject the upload.

1.2. **`src/app/api/files/download/route.ts:75`** — Before streaming the file from MinIO, look up the `DocumentHash` row for the document and call `verifyDocumentHash(employeeId, fieldName, retrievedBuffer)`. On mismatch, log CRITICAL `POTENTIAL_BREACH` and return 403.

1.3. **`src/app/api/files/preview/route.ts:104`** — Same pattern as download. Look up hash, verify before serving.

1.4. **Prisma migration** — Run `npx prisma migrate dev --name add_document_hash` to create the `DocumentHash` table.

1.5. **Tests** — Add unit tests in `src/lib/file-integrity.test.ts` (or a new route-level test file) covering:
   - Upload calls `recordDocumentHash` after a successful ClamAV scan
   - Download calls `verifyDocumentHash` and rejects on mismatch
   - Preview calls `verifyDocumentHash` and rejects on mismatch
   - Legacy documents without a hash row fail open (don't break existing flows)

**Pattern to follow** — see the HRIMS wiring in `hrims/sync-documents/route.ts:8, 275, 292` for the exact import + call sequence. Use `POTENTIAL_BREACH` event type from `src/lib/audit-logger.ts:39`.

## Task 2: Close GAP-M2 — Wire `logRequestWithdrawal` Into Workflow Cancel/Delete Handlers (MEDIUM, ~0.5 day)

**Current state:** Helper `logRequestWithdrawal({ requestType, requestId, employeeId, employeeName, employeeZanId, withdrawnById, withdrawnByUsername, withdrawnByRole, reason, ipAddress })` is defined at `src/lib/audit-logger.ts:542` and exported at line 1038. Unit test at `src/lib/audit-logger.medium-gaps.test.ts:126` covers the helper. **The helper is NOT wired into any of the 8 workflow DELETE / cancel handlers.**

**Sub-tasks:**

2.1. For each of the 10 workflow `[id]/route.ts` files, find the DELETE handler (or the cancel/withdraw branch if there is one) and call `logRequestWithdrawal` with the request context before returning success:
   - `src/app/api/promotions/[id]/route.ts`
   - `src/app/api/lwop/[id]/route.ts`
   - `src/app/api/lwop-requests/[id]/route.ts` (has a `/withdraw` sub-route — check for cancel branch)
   - `src/app/api/confirmations/[id]/route.ts`
   - `src/app/api/confirmation-requests/[id]/route.ts`
   - `src/app/api/cadre-change/[id]/route.ts`
   - `src/app/api/retirement/[id]/route.ts`
   - `src/app/api/resignation/[id]/route.ts`
   - `src/app/api/service-extension/[id]/route.ts`
   - `src/app/api/termination/[id]/route.ts`

   Pattern to follow — see how `logRequestForward` is called in the same files (e.g. `promotions/[id]/route.ts:382`). The withdrawal variant has `withdrawnById`/`withdrawnByUsername`/`withdrawnByRole` and `reason` instead of `forwardedById`/`forwardedByRole` and `comment`.

2.2. **Integration test** — Add a test that withdraws a request end-to-end and asserts the audit row contains `user` and `reason`. The test should use the existing `live` test pattern (see `src/lib/change-history.live.test.ts` for the guarded-by-`CSMS_LIVE_INTEGRATION=1` pattern). If the test files have existing test infrastructure for the 8 workflows, extend those; otherwise create `src/lib/audit-logger.medium-gaps.integration.test.ts`.

2.3. **Run the existing 8 `logRequestForward` unit tests** to make sure your changes don't break them.

## Task 3: Update Documentation

After both code changes are done and tests pass:

3.1. **`/home/latest/docs/security/findings/gap_analysis.md`**:
   - Bump Document Control version to **3.1** and update "Last Updated" line.
   - Change GAP-C2 status from 🟡 Partial to ✅ Resolved.
   - Change GAP-M2 status from 🟡 Partial to ✅ Resolved.
   - Update §4 GAP-C2 "Implementation Status (after)" and "Remediation (shipped)" sections with the new file:line citations.
   - Update §6 GAP-M2 same way, listing all 10 routes that now call `logRequestWithdrawal`.
   - Update §2 Totals: 4 CRITICAL closed, 12 MEDIUM closed.
   - Update §2 Gap Index rows for GAP-C2 and GAP-M2 to ✅ Resolved.
   - Update §2 Summary line.
   - Update §9 Effort Estimates rows 2 and 13a to ✅ DONE.
   - Update §10 Cross-Reference table.
   - Update §11 Tracking Checklist for GAP-C2 and GAP-M2.
   - Update Session Summary.
   - Update §13.4 GAP-C2 and GAP-M2 verification recipes.

3.2. **`/home/latest/docs/security/findings/UAT_Security_review_By_AMINA.md`**:
   - Bump version to **1.9** and update "Last Updated" line.
   - Update row 10.7 status from 🟡 Partial to ✅ Resolved with new file:line citations.
   - Update row 15.10 status from 🟡 Partial to ✅ Resolved with the 10 wired routes listed.
   - Add a v1.9 — Final Wrap section summarizing the two closures.
   - Update §5 Traceability Matrix rows for Req 10 and Req 15.

## Test & Build Verification (Run Before Committing)

```bash
cd /home/latest
npm run typecheck           # must pass
npm run lint                # 0 errors (warnings OK if pre-existing)
npx vitest run              # confirm 717+/728+ pass; no new failures
npm run build               # must pass with 0 errors
```

**Expected pass count after this session:** 717 → ~725+ passing (you'll add ~6-8 new tests for the wired routes and the integration test). The 8 pre-existing failures should remain unchanged (5 `password-utils`, 3 `manual-entry`).

## Commit & Wrap-Up

```bash
git add -A
git commit -m "security: close GAP-C2 generic file integrity + GAP-M2 withdrawal wiring

- Wire recordDocumentHash/verifyDocumentHash into files/upload|download|preview
- Wire logRequestWithdrawal into 10 workflow DELETE/cancel handlers
- Add integration test for withdrawal end-to-end
- Add unit tests for new file-integrity call sites
- Run npx prisma migrate dev to materialize DocumentHash table
- Update gap_analysis.md (v3.1) and UAT_Security_review_By_AMINA.md (v1.9)

Refs: GAP-C2 (10.7), GAP-M2 (15.10)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

## Important Constraints

- **Do NOT add new dependencies.** Everything you need is already in `package.json`.
- **Do NOT touch unrelated files.** The 2 gaps are the only scope.
- **Preserve all existing tests.** If a test starts failing, it's a regression — fix it before committing.
- **Match the existing code style** in the workflow files. Read one fully before editing others.
- **The `DocumentHash` model in `prisma/schema.prisma:166` is the source of truth** for the table schema — do not add fields to it.
- **`logRequestWithdrawal` is a one-shot event** — do not call it in a loop or for non-cancel operations. It is the cancellation/withdrawal analogue of `logRequestForward`.

## Quick-Reference: Existing Patterns to Reuse

- **Helper call site** (forward) — `src/app/api/promotions/[id]/route.ts:382` shows the exact try/catch + audit pattern.
- **File integrity round-trip** — `src/app/api/hrims/sync-documents/route.ts:275, 292` shows `recordDocumentHash` + post-store `verifyDocumentHash`.
- **Audit event shape** — see `src/lib/audit-logger.ts:46` for `REQUEST_FORWARDED` and `:542` for the `logRequestWithdrawal` signature.
- **POTENTIAL_BREACH event** — see `src/lib/audit-logger.ts:39` and `src/lib/file-integrity.ts:110, 227` for the helper-internal usage.

Begin with: `cd /home/latest && git status && git log --oneline -5`

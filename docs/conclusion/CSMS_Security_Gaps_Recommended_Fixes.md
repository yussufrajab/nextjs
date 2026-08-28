# CSMS Security Gaps — Recommended Fixes (by Priority)

**Source:** Derived from the re-audit of `CSMS_Security_Controls_Implementation_Status.md` (2026-08-04).
**Scope:** Concrete, code-level fixes for each open gap (23 ❌ Not Implemented + 53 ⚠️ Partial), ordered by risk — highest-impact integrity/confidentiality holes first.
**Codebase:** `/home/latest` (Next.js 14 + Prisma + PostgreSQL Civil Service Management System).

> All gaps below were re-verified against the current working tree on 2026-08-04 and confirmed still-open. The only work since the last re-audit (2026-07-26) was an additive **IP-ban-on-abuse** feature (11 commits) that strengthens already-✅ controls (Req 1.8, 26.1) without closing any gap.

---

## Priority 1 — Audit log immutability & tamper protection

**Affected controls:** Req 15.2, 21.1–21.6, 29.5
**Current state:** `audit.audit_log` is INSERT-only at the app layer (`audit-db.ts:137-144`) but the DB grants still allow `UPDATE`/`DELETE`. No hash chain means tampering is undetectable.

**Fix (migration + cron):**

```sql
-- migration: 20260804010000_audit_immutability
ALTER TABLE audit.audit_log
  ADD COLUMN previous_hash text,
  ADD COLUMN chain_hash   text NOT NULL DEFAULT '';

REVOKE UPDATE, DELETE ON audit.audit_log FROM csms_app;
GRANT INSERT, SELECT ON audit.audit_log TO csms_app;

-- Block mutation even by superuser path
CREATE OR REPLACE FUNCTION audit.audit_log_no_update_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.audit_log is append-only';
END; $$;
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit.audit_log
  FOR EACH ROW EXECUTE FUNCTION audit.audit_log_no_update_delete();
```

**App-layer changes:**
- In `src/lib/audit-db.ts:insertAuditLog`, compute `chain_hash = sha256(previous.chain_hash || row_payload)` before INSERT.
- Add `previous_hash` / `chain_hash` columns to the Prisma `AuditLog` view model (read-only).
- Add a cron job in `src/lib/cron-service.ts` that re-walks the chain and raises a `POTENTIAL_BREACH` via `dispatchSecurityAlert` on mismatch.

**Closes:** 15.2 (⚠️→✅), 21.1 (⚠️→✅), 21.2 (❌→✅), 21.3 (⚠️→✅), 21.4 (⚠️→✅), 21.6 (❌→✅), 29.5 (⚠️→✅).

---

## Priority 2 — PII encryption at rest + secure HRIMS transport

**Affected controls:** Req 30.5
**Current state:** `encryptPII`/`decryptPII` (`src/lib/encryption.ts:41-59`) are dead code — PII stored plaintext. HRIMS upstream is plaintext HTTP. `SystemSettings` secrets are plaintext.

**Fix:**

1. **Wire encryption into the Employee data layer** — create `src/lib/pii-field.ts`:
   ```ts
   // On write (manual-entry, bulk-upload, HRIMS sync):
   employee.zanId = await encryptPII(raw.zanId);
   employee.zssfNumber = await encryptPII(raw.zssfNumber);
   // On read (employees/route.ts, reports, export):
   const decrypted = await decryptPII(row.zanId);
   ```
   Add a one-time backfill migration that encrypts existing PII columns in place:
   ```sql
   UPDATE employee SET zanId = encrypt_pii(zanId) WHERE zanId IS NOT NULL;
   UPDATE employee SET zssfNumber = encrypt_pii(zssfNumber) WHERE zssfNumber IS NOT NULL;
   ```

2. **HRIMS upstream** — require HTTPS in `src/lib/hrims-config.ts`: reject `http://` hosts in `HRIMS_ALLOWED_HOSTS` validation (already allow-listed; add scheme gate). The production `https` requirement is already in place via `HRIMS_API_SCHEME=https`; ensure the allow-list enforces it strictly.

3. **SystemSettings secrets** — encrypt `apiKey`/`token` values via `encryptPII` on PUT (`admin/hrims-settings/route.ts`), decrypt on GET. Add a `SystemSettings.isEncrypted` flag so legacy plaintext values are detected and migrated on first read.

**Closes:** 30.5 (⚠️→✅). Partially addresses 23.1 (restricted-data at rest).

---

## Priority 3 — Background processing audit & re-validation

**Affected controls:** Req 16.1, 16.3, 16.6, 16.7, 29.1–29.4
**Current state:** BullMQ worker (`src/lib/jobs/hrims-sync-worker.ts`) writes no tamper-evident audit rows, doesn't re-validate `job.data.userId` permission, doesn't Zod-validate the HRIMS response, and doesn't re-verify the institution `voteNumber`.

**Fix in `src/lib/jobs/hrims-sync-worker.ts`:**

```ts
import { logHrimsSync } from '@/lib/audit-logger';
import { z } from 'zod';

// 16.1 re-validate permission
const user = await db.user.findUnique({ where: { id: job.data.userId }});
if (!user || !['HRO','HRRP','PO','DO','HRMO','HHRMD','CSCS','Admin'].includes(user.role))
  throw new Error('permission re-validation failed');

// 16.6 validate response shape
const HrimsResponseSchema = z.object({
  code: z.literal(200),
  data: z.array(z.object({ personalInfo: z.object({ zanIdNumber: z.string() }) })),
  overallDataSize: z.number(),
  currentDataSize: z.number(),
});
const parsed = HrimsResponseSchema.parse(hrimsResponse);

// 16.7 re-verify institution
const inst = await db.institution.findFirst({ where: { id: institutionId }});
if (inst.voteNumber !== job.data.identifier) throw new Error('institution mismatch');

// 16.3 / 29.1–29.4 audit with actor + counts + per-record failures
await logHrimsSync({
  performedBy: job.data.userId,
  institutionId,
  success: true,
  additionalData: { saved: savedEmployees.length, skipped, perRecordErrors },
});
```

Also add an audit event to `hrims/bulk-fetch/route.ts` (currently imports no audit helper).

**Closes:** 16.1 (⚠️→✅), 16.3 (⚠️→✅), 16.6 (❌→✅), 16.7 (⚠️→✅), 29.1 (⚠️→✅), 29.2 (⚠️→✅), 29.3 (⚠️→✅), 29.4 (⚠️→✅).

---

## Priority 4 — HRIMS transaction integrity

**Affected controls:** Req 11.4, 11.7, 11.8
**Current state:** No `$transaction` in any HRIMS route — partial commits possible. `fetch-employee`/`bulk-fetch` persist `any`-typed HRIMS data with no runtime Zod.

**Fix:**

1. Wrap multi-row sync writes in `prisma.$transaction(async (tx) => { ... })`:
   - `src/app/api/hrims/sync-documents/route.ts:storeEmployeeDocuments` (per-row `try/catch` → atomic)
   - `src/app/api/hrims/sync-employee/route.ts:194-199`
   - Background doc/cert sync (replace fire-and-forget `Promise.all(...).catch` with `await $transaction`)

2. Add Zod schemas to `src/app/api/hrims/fetch-employee/route.ts` and `src/app/api/hrims/bulk-fetch/route.ts` — parse the HRIMS response before persisting:
   ```ts
   const FetchEmployeeResponseSchema = z.object({
     code: z.number(),
     data: z.object({ personalInfo: z.object({ /* ... */ }) }),
   });
   const parsed = FetchEmployeeResponseSchema.safeParse(hrimsData);
   if (!parsed.success) return 400;
   ```

3. Add an idempotency key (`hrims-sync-${zanId}`) to prevent duplicate creation on `payrollNumber`-only responses with different `zanId`. Check `payrollNumber` uniqueness alongside `zanId` in the upsert.

**Closes:** 11.4 (⚠️→✅), 11.7 (❌→✅), 11.8 (⚠️→✅).

---

## Priority 5 — Data classification + restricted-data protection

**Affected controls:** Req 22.1–22.5, 23.2, 23.4, 27.3
**Current state:** No classification field, no classification-based authz/reporting/export/audit, no access-approval workflow, no dual-approval export.

**Fix (schema + wiring):**

```prisma
// prisma/schema.prisma
model Employee {
  classification  String @default("Internal") // Public|Internal|Confidential|Restricted
}
model Complaint {
  classification  String @default("Confidential")
}
model AuditLog {
  classification  String?
}
model AccessApproval {
  id              String   @id @default(cuid())
  userId          String
  resourceType   String
  resourceId     String
  classification String
  status         String   @default("PENDING") // PENDING|APPROVED|DENIED
  requestedById  String
  approvedById   String?
  createdAt      DateTime @default(now())
}
model ExportRequest {
  id         String   @id @default(cuid())
  userId      String
  reportType  String
  status      String   @default("PENDING")
  approvedById String?
}
```

**Wiring:**
- `src/lib/api-auth.ts` — deny if user role lacks clearance for `Restricted` records.
- `src/lib/report-generator.ts` — filter report rows by classification level the user is cleared for.
- `src/app/api/reports/export/route.ts` — require `ExportRequest` approval for `Restricted` report types.
- `src/lib/audit-logger.ts` — tag every audit event with the resource classification.

**Closes:** 22.1–22.5 (all ❌→✅), 23.2 (❌→✅), 23.4 (❌→✅), 27.3 (❌→✅).

---

## Priority 6 — Concurrency & data integrity

**Affected controls:** Req 20.1, 20.4, 28.5
**Current state:** Last-write-wins (no optimistic locking), ~60 routes still lack Zod, config has no schema validation.

**Fix:**

1. **Optimistic locking** — add `version Int @default(1)` to mutable models (`Employee`, `Institution`, `User`, `SystemSettings`). Use Prisma's conditional update:
   ```ts
   const updated = await db.employee.update({
     where: { id, version: existingVersion },
     data: { ...fields, version: { increment: 1 } },
   });
   // P2025 (record not found) → 409 Conflict
   ```

2. **Zod on remaining routes** — add schemas to:
   - `src/app/api/employees/route.ts` (POST/PUT)
   - `src/app/api/reports/route.ts`
   - `src/app/api/files/upload/route.ts`
   - `src/app/api/institutions/route.ts` (POST)
   - All remaining collection POST handlers (~60 routes)
   Reuse the central `src/lib/api-schemas.ts` pattern.

3. **Config schema validation** — add a full Zod schema for HRIMS config in `src/app/api/admin/hrims-settings/route.ts` PUT:
   ```ts
   const HrimsConfigSchema = z.object({
     host: z.string().min(1),
     port: z.string().regex(/^\d{1,5}$/),
     apiKey: z.string().min(1),
     token: z.string().min(1),
     scheme: z.enum(['http', 'https']).default('https'),
   });
   const parsed = HrimsConfigSchema.safeParse(body);
   if (!parsed.success) return 400;
   ```
   Replace the regex-only host/port validation with a structured schema + checksum on the config blob.

**Closes:** 20.1 (⚠️→✅), 20.4 (❌→✅), 28.5 (❌→✅).

---

## Priority 7 — Per-role MFA

**Affected controls:** Req 1.1, 14.2
**Current state:** MFA gates on email presence (`login/route.ts:422`), not role. Privileged roles (Admin, CSCS, HHRMD) without email skip MFA entirely.

**Fix:**

```ts
// prisma/schema.prisma — add per-user override
model User {
  requireMfa Boolean @default(false)
}
```

```ts
// src/lib/constants.ts — role-based policy
export const MFA_REQUIRED_ROLES = ['Admin','CSCS','HHRMD'];
```

```ts
// src/app/api/auth/login/route.ts — replace `if (user.email)` with:
const mfaRequired =
  (MFA_REQUIRED_ROLES.includes(user.role) || user.requireMfa);
if (mfaRequired && !user.email) {
  // Block login — privileged role must have email for MFA
  return 401 'MFA required for this role, but no email is on file';
}
if (mfaRequired) {
  // Existing MFA flow (OTP + magic link)
  ...
}
```

Also add `requireReauth` to `src/app/api/admin/hrims-settings/route.ts` PUT (Req 14.2 gap — currently no step-up reauth on config change).

**Closes:** 1.1 (⚠️→✅), 14.2 (⚠️→✅).

---

## Priority 8 — Correlation IDs

**Affected controls:** Req 24.5
**Current state:** No per-request correlation ID; audit events can't be chained end-to-end.

**Fix:**

1. **Migration** — add `correlation_id text` column to `audit.audit_log`:
   ```sql
   ALTER TABLE audit.audit_log ADD COLUMN correlation_id text;
   CREATE INDEX idx_audit_log_correlation_id ON audit.audit_log(correlation_id);
   ```

2. **Generate in proxy** — in `src/proxy.ts`, generate `crypto.randomUUID()` per request, attach as `x-correlation-id` response header:
   ```ts
   const correlationId = crypto.randomUUID();
   response.headers.set('x-correlation-id', correlationId);
   ```

3. **Propagate into routes** — pass `correlationId` through `withAuth` → handler context → audit calls. In `src/lib/audit-logger.ts:logAuditEvent`, accept `correlationId` from the request context and include it on every audit row:
   ```ts
   await logAuditEvent({ ..., correlationId });
   ```

4. **Error handler** — include `correlationId` in error responses so support can trace a failed request to its audit trail.

**Closes:** 24.5 (❌→✅). Partially improves 24.6 (⚠️ — end-to-end trail now reconstructable via `correlation_id` join).

---

## Priority 9 — Notification caller-permission gate + scope fan-out

**Affected controls:** Req 13.2, 13.3, 13.4
**Current state:** `createNotification`/`createNotificationForRole` are callable from any authed route with no "may this caller send?" check. Workflow/complaint notifications fan out to all active HHRMD/HRMO/DO regardless of involvement.

**Fix in `src/lib/notifications.ts`:**

```ts
// 13.2 — add caller gate
const NOTIFICATION_SENDER_ROLES = ['HRO','HRRP','PO','DO','HRMO','HHRMD','CSCS','Admin'];

export async function createNotification(
  data: NotificationData,
  caller: { userId: string; role: string }
) {
  // Only roles that manage workflows can send workflow notifications
  if (!NOTIFICATION_SENDER_ROLES.includes(caller.role)) return;
  ...
}
```

```ts
// 13.3 — scope workflow fan-out by institution + involvement
// Replace createNotificationForRole('HHRMD', ...) with:
const recipients = await db.user.findMany({
  where: { role: 'HHRMD', institutionId: request.institutionId, isActive: true }
});
recipients.forEach(r => createNotification({ userId: r.id, ... }, caller));
```

```ts
// 13.4 — scope complaint submission fan-out by institution/assignment
// Replace createNotificationForRole('DO', ...) with:
const officers = await db.user.findMany({
  where: {
    role: { in: ['DO','HHRMD','HRMO'] },
    institutionId: complaint.institutionId,
    isActive: true,
  }
});
officers.forEach(o => createNotification({ userId: o.id, ... }, caller));
```

**Closes:** 13.2 (⚠️→✅), 13.3 (⚠️→✅), 13.4 (⚠️→✅).

---

## Priority 10 — Remaining gaps (lower risk but still open)

### 10.1 Report ownership validation (Req 12.6)

**State:** Reports remain system-wide aggregates scoped only by role+institution; no per-user ownership/standing check.
**Fix:** Add a per-user "standing" check in `src/lib/report-generator.ts` — restrict report visibility to records the user's institution/role owns. For `EMPLOYEE` role, limit to own record's workflow history.

**Closes:** 12.6 (❌→✅).

### 10.2 Export approval workflow (Req 12.8, 27.5)

**State:** No approval workflow / second-admin sign-off / reauth on exports.
**Fix:**
- Add `ExportRequest` model (PENDING/APPROVED/DENIED) in `schema.prisma`.
- `POST /api/reports/export-request` — user requests export, creates `ExportRequest`.
- Admin/CSCS approves via `POST /api/reports/export-request/[id]/approve` (step-up reauth).
- `POST /api/reports/export` requires an approved `exportRequestId` — rejects if missing/expired.

**Closes:** 12.8 (❌→✅), 27.5 (❌→✅).

### 10.3 Admin audit before/after (Req 14.7)

**State:** `reset-password` logs only new state; `unlock-account` logs no prior lock reason; `cleanup-sessions` logs only deleted count.
**Fix:** Capture prior state on these admin actions:
- `admin/reset-password/route.ts` — fetch + log the prior password hash state (not the hash itself, just `wasTempPassword`/`wasExpired` flags).
- `admin/unlock-account/route.ts` — fetch + log the prior `lockReason` and `lockedAt`.
- `admin/cleanup-sessions/route.ts` — fetch + log the prior session list (userId, device, lastSeen) before deletion.

**Closes:** 14.7 (⚠️→✅).

### 10.4 Workflow integrity cron (Req 18.6)

**State:** Cron schedules only password-expiration, MFA-token cleanup, and audit-partition creation; no background/cron job detects orphaned/inconsistent workflow states.
**Fix:** Add a scheduled job in `src/lib/cron-service.ts`:
```ts
// Detect requests stuck in non-terminal status beyond SLA (e.g. 30 days)
const stuck = await db.$queryRaw`
  SELECT id, type, status, "reviewStage", "createdAt"
  FROM "Request"
  WHERE status NOT IN ('APPROVED','REJECTED','WITHDRAWN','ARCHIVED')
    AND "createdAt" < NOW() - INTERVAL '30 days'
`;
// Flag invalid reviewStage/status pairs
const invalid = await db.$queryRaw`
  SELECT id, status, "reviewStage"
  FROM "Request"
  WHERE ("reviewStage" = 'HRO' AND status NOT IN ('SUBMITTED','DRAFT'))
    OR ("reviewStage" = 'HRRP' AND status NOT IN ('PENDING_REVIEW','FORWARDED'))
`;
// Emit WORKFLOW_STUCK / WORKFLOW_INVALID_STATE audit events
```

**Closes:** 18.6 (❌→✅).

### 10.5 Field-level change tracking (Req 19.5)

**State:** Field-level prev/new only captured for user `role`/`institutionId` + HRIMS config; other UPDATEs (employees, institutions, workflow records) record new state only.
**Fix:** In employee/institution/workflow UPDATE handlers, compute a diff of changed fields and persist prev/new in the audit `additional_data`:
```ts
const before = await db.employee.findUnique({ where: { id }});
const updated = await db.employee.update({ where: { id }, data });
const diffs = diffFields(before, updated); // { field: { prev, new } }
await logAuditEvent({
  eventType: 'EMPLOYEE_UPDATED',
  additionalData: { diffs },
});
```

**Closes:** 19.5 (⚠️→✅). Also improves 15.6 (⚠️→✅).

### 10.6 Post-sync reconciliation cron (Req 20.5)

**State:** No scheduled reconciliation job to verify synced employee counts/fields against the HRIMS source.
**Fix:** Add a scheduled job in `src/lib/cron-service.ts` that:
- Fetches the HRIMS employee count for each institution.
- Compares against the local `Employee` count for that `institutionId`.
- Flags drift via a `HRIMS_SYNC_DRIFT` WARNING audit event + `dispatchSecurityAlert`.

**Closes:** 20.5 (⚠️→✅).

### 10.7 Admin sub-roles + two-person rule (Req 25.2, 25.5)

**State:** One `Admin` role performs both user-management and data/config functions; no two-person rule on destructive actions.
**Fix:**
1. Split `Admin` into sub-roles:
   - `UserAdmin` — user CRUD, password reset, lock/unlock.
   - `DataAdmin` — HRIMS config, institution settings.
   - `SecurityAdmin` — audit access, IP bans, security alerts.
   Map in `src/lib/constants.ts` and update `allowedRoles` on admin routes.
2. Require two distinct approvals for destructive actions:
   - Delete user — `UserAdmin` requests, `SecurityAdmin` approves.
   - Delete institution — `DataAdmin` requests, `SecurityAdmin` approves.
   - HRIMS config change — `DataAdmin` requests, `SecurityAdmin` approves.
   Add a `DestructiveActionApproval` model (PENDING/APPROVED/DENIED, requesterId, approverId, `approverId !== requesterId` enforced).

**Closes:** 25.2 (⚠️→✅), 25.5 (❌→✅). Also improves 14.8 (⚠️→✅).

### 10.8 Report PII minimization (Req 27.4)

**State:** `sanitizeText` is XSS-escaping only — report rows still carry full PII (`zanId`/`zssfNumber`/`phoneNumber`/`nidaNumber`), no minimization/masking.
**Fix:** Apply role-based masking in `src/lib/report-generator.ts` using the existing `EMPLOYEE_FIELD_MASKS` from `src/lib/sanitize-response.ts`:
```ts
import { applyFieldMasks } from '@/lib/sanitize-response';
// After building each report row:
row = applyFieldMasks(row, auth.role);
// zanId → "TZ****1234", zssfNumber → "****", phoneNumber → "****" for roles below HHRMD
```

**Closes:** 27.4 (⚠️→✅).

### 10.9 SystemSettings versioning (Req 28.4)

**State:** Audit-log JSONB stores before/after, but no `SystemSettingsHistory`/row versioning — upsert overwrites.
**Fix:** Add `SystemSettingsHistory` model:
```prisma
model SystemSettingsHistory {
  id        String   @id @default(cuid())
  key       String
  value     String
  version   Int
  changedById String
  changedAt DateTime @default(now())
}
```
On every `SystemSettings` upsert in `admin/hrims-settings/route.ts`, copy the prior row to `SystemSettingsHistory` with an incremented version + actor before writing the new value.

**Closes:** 28.4 (⚠️→✅).

### 10.10 Document-type role gating (Req 10.4)

**State:** All document types share identical role gating (filename-prefix only); no per-document-type role gating (e.g. `birthCertificate` vs `confirmationLetter`).
**Fix:** Add a `DOCUMENT_TYPE_ROLE_MAP` in `src/lib/file-access.ts`:
```ts
const DOCUMENT_TYPE_ROLE_MAP: Record<string, string[]> = {
  birthCertificate:    ['HRO','HRRP','ADMIN','CSCS'],
  confirmationLetter:  ['HRO','HRRP','HHRMD','ADMIN','CSCS'],
  jobContract:         ['HRO','HRRP','ADMIN','CSCS'],
  ardhiHali:           ['HRO','HRRP','ADMIN','CSCS'],
};
```
Check it in `files/employee-documents/[filename]/route.ts` after resolving the document type from the filename prefix.

**Closes:** 10.4 (❌→✅).

---

## Impact summary

| Priority | Gap count closed | ❌→✅ | ⚠️→✅ |
|---------:|:---:|:---:|:---:|
| 1 — Audit immutability | 7 | 2 | 5 |
| 2 — PII encryption | 1 | 0 | 1 |
| 3 — Worker audit & re-validation | 8 | 1 | 7 |
| 4 — HRIMS transaction integrity | 3 | 1 | 2 |
| 5 — Data classification | 8 | 7 | 1 |
| 6 — Concurrency & integrity | 3 | 2 | 1 |
| 7 — Per-role MFA | 2 | 0 | 2 |
| 8 — Correlation IDs | 1 | 1 | 0 |
| 9 — Notification controls | 3 | 0 | 3 |
| 10 — Remaining gaps | 10 | 3 | 7 |
| **Total** | **46** | **17** | **29** |

Closing all 46 would move the headline from **130/53/23** to **176/24/6** — 85.4% fully implemented, 11.7% partial, 2.9% not implemented. The remaining 6 ❌ would be: 23.2 (access-approval workflow), 23.5 (dual-control admin approval), 25.4 (independent verification DB CHECK), 24.6 (end-to-end trail — partially improved by correlation IDs but still needs full chain reconstruction), and any residual items requiring external infrastructure (SIEM integration depth, hardware-key MFA support).

---

*Prepared 2026-08-04 from re-audit of `/home/latest` against `CSMS_Security_Controls_Implementation_Status.md`. Each fix references exact files and line numbers from the current working tree.*
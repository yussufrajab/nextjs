# PLAN: Implement `hro_pemba` and `hrrp_pemba` Roles

> **Status:** Revised after auditing the codebase, the Prisma schema, the HRIMS
> sync mapping, and the `pemba_department_employees_report` (real production
> data). The earlier draft of this plan pivoted from `department ILIKE
> '%pemba%'` to a derived `Island` enum; that pivot is **rejected** here
> (see §0, Risks).

## Overview

Add two new roles — `hro_pemba` and `hrrp_pemba` — that behave identically to
`HRO` and `HRRP` respectively, except they are **scoped to only see/manage
employees whose `department` field contains the word "Pemba"**.

- `HRO` and `HRRP` continue to see **all employees** within their institution
  (both Pemba and Unguja).
- `hro_pemba` and `hrrp_pemba` only see employees whose `department` ILIKE
  `'%pemba%'`, *within* their institution.
- Both new roles exist within every institution, just like HRO/HRRP.

### Why `department` (not a new `Island` enum)

The report `pemba_department_employees_report.md` is generated from live data
and is authoritative about which field carries the Pemba signal:

| Field | Holds | Contains "Pemba"? |
|---|---|---|
| `department` | sub-office / unit name (`subEntityName`), e.g. **"Ofisi Kuu Pemba"** | ✅ for 3,425 employees |
| `currentWorkplace` | ministry / parent entity (`entityName`), e.g. "Wizara ya Elimu na Mafunzo ya Amali" | ❌ |
| `region` | **birth** region (`districtName ‖ birthRegionName ‖ regionName`) | sometimes — but this is birthplace, not posting |
| `currentReportingOffice` | `divisionName ‖ subEntityName` | sometimes (collides with `department`) |

The HRIMS mapping in `src/app/api/hrims/fetch-employee/route.ts:163-171` and
`src/lib/jobs/hrims-sync-worker.ts:154-195` confirms this exactly:

```ts
department:            currentEmployment?.subEntityName,   // "Ofisi Kuu Pemba"
currentReportingOffice: currentEmployment?.divisionName || currentEmployment?.subEntityName,
currentWorkplace:      currentEmployment?.entityName,      // ministry name (no "Pemba")
region:                personalInfo.districtName || personalInfo.birthRegionName || personalInfo.regionName,  // birthplace
```

So a derived `island` cascade of `region → currentWorkplace →
currentReportingOffice → institutionName` (the earlier draft) **omits the one
field that reliably carries "Pemba"** (`department`) and would misclassify
nearly all 3,425 employees (it would read the *birth* region and the *ministry*
name, neither of which is the posting office).

Decision: **scope directly on `department ILIKE '%pemba%'`.** This is the user's
stated requirement, it matches the data, it needs **no schema migration**, no
backfill, no HRIMS-sync changes, and the list endpoint already supports
case-insensitive `department` contains filtering
(`src/app/api/employees/route.ts:257-259`). The only cost is a sequential
scan on a `String?` column for the two pemba-scoped roles — acceptable at this
scale (3.4k of 36k rows) and trivially indexable later with a trigram/`pg_trgm`
index if needed (see §8, Optimization (optional)).

### Naming

The role *strings* stored in the DB and used everywhere in code are
**`HRO_PEMBA`** and **`HRRP_PEMBA`** (uppercase, underscore — matching the
existing `HRO`/`HRRP` convention and the existing `Role` union). The feature is
referred to in prose as `hro_pemba`/`hrrp_pemba`; the code-level identifiers are
the uppercase forms. `withAuth` compares case-insensitively
(`api-auth.ts:261-263`), so `allowedRoles: ['HRO_PEMBA']` matches a stored role
of `HRO_PEMBA` regardless of casing drift.

---

## 0. Risks the earlier draft missed

The earlier draft's "wherever `HRO` appears, add `HRO_PEMBA`" is correct in
spirit but **dangerously underspecified**. The codebase does **not** route all
HRO/HRRP authorization through helpers; many call sites use **exact-string
comparisons** for security-critical decisions. Missing any one of them produces
either (a) a security hole (pemba role bypasses an IDOR guard) or (b) a broken
UX (pemba role sees masked PII). The revised plan enumerates these categories
and introduces a small helper to prevent drift.

### Security-critical exact-string sites (must be updated, not just "allowedRoles")

| # | File:line | What it guards | Failure if missed |
|---|---|---|---|
| S1 | `src/app/api/employees/route.ts:107` | single-employee IDOR: `else if (userRole === 'HRO' \|\| userRole === 'HRRP')` → cross-institution 403 | `HRO_PEMBA` bypasses the institution check → reads any employee by id |
| S2 | `src/app/api/employees/[id]/certificates/route.ts:79,258,334` | HRO cert read/write institution check | pemba role denied access to own certs, or bypasses institution check |
| S3 | `src/app/api/employees/[id]/documents/route.ts:68,205` | HRO doc institution check | same |
| S4 | `src/app/api/employees/[id]/fetch-documents/route.ts:238` | `roleUpper === 'HRO' \|\| roleUpper === 'HRRP'` institution scope | pemba role falls through to wrong branch |
| S5 | `src/app/api/employees/[id]/fetch-photo/route.ts:34` | same | same |
| S6 | `src/app/api/files/employee-documents/[filename]/route.ts:42` | `roleUpper === 'HRO' \|\| roleUpper === 'HRRP'` | pemba role can't fetch files, or bypasses scope |
| S7 | `src/app/api/files/employee-photos/[filename]/route.ts:43` | same | same |
| S8 | `src/lib/sanitize-response.ts:67` | `PRIVILEGED_EMPLOYEE_ROLES` array | pemba role gets **masked PII** (redacted ZAN/ZSSF/phone/address) — broken UX |
| S9 | `src/app/api/lwop-requests/[id]/route.ts:145`, `resignation/[id]/route.ts:206`, `promotions/[id]/route.ts:207` | resubmission guard `!['HRO','HRRP'].includes(auth.role)` | pemba role cannot resubmit its own rejected requests |
| S10 | All `*Request/[id]/route.ts` `isHrrpApproval` checks: `auth.role === 'HRRP'` | HRRP-action attribution / audit | `HRRP_PEMBA` approvals mis-attributed or rejected |

### Workflow-logic exact-string sites (frontend + API)

The frontend drives submit/review/reject button visibility and status routing
with exact-string `role === ROLES.HRO` / `role === ROLES.HRRP` checks across
~13 dashboard pages (confirmation, lwop, promotion, retirement, resignation,
service-extension, termination, cadre-change, reports, track-status,
urgent-actions, recent-activities, profile, dashboard). The API mirrors these
for initial-status derivation (`isHRRP = auth.role === 'HRRP'` → auto-approve vs
pending). Every one needs the pemba variant added.

**There are dozens of such sites. Hand-editing each as `role === ROLES.HRO ||
role === ROLES.HRO_PEMBA` is error-prone and will rot.** The revised plan
centralizes this via two predicates (§1) so call sites read
`isHroLike(role)` / `isHrrpLike(role)`.

---

## 1. Role predicates (NEW — the keystone)

**File:** `src/lib/role-utils.ts` (append to existing)

```ts
// Roles that behave as HRO (full institution scope) or its Pemba-scoped variant.
export const HRO_LIKE_ROLES = ['HRO', 'HRO_PEMBA'] as const;
export const HRRP_LIKE_ROLES = ['HRRP', 'HRRP_PEMBA'] as const;

export function isHroLike(role: string | null | undefined): boolean {
  return !!role && (HRO_LIKE_ROLES as readonly string[]).includes(role);
}
export function isHrrpLike(role: string | null | undefined): boolean {
  return !!role && (HRRP_LIKE_ROLES as readonly string[]).includes(role);
}

// The Pemba-scoped variants specifically.
export const PEMBA_SCOPED_ROLES = ['HRO_PEMBA', 'HRRP_PEMBA'] as const;
export function isPembaScopedRole(role: string | null | undefined): boolean {
  return !!role && (PEMBA_SCOPED_ROLES as readonly string[]).includes(role);
}

/**
 * Appends the Pemba-scoped variant(s) to a role list, deduped, case-insensitively.
 * Use to extend `allowedRoles` arrays: `appendPembaRoles(['HRO','HRRP'])` →
 * `['HRO','HRRP','HRO_PEMBA','HRRP_PEMBA']`. With `which:'hro'` only the HRO
 * variant is appended, etc.
 */
export function appendPembaRoles(
  roles: readonly string[],
  which: 'hro' | 'hrrp' | 'both' = 'both'
): string[] {
  const add: string[] = [];
  if (which !== 'hrrp') add.push('HRO_PEMBA');
  if (which !== 'hro') add.push('HRRP_PEMBA');
  const seen = new Set(roles.map(r => r.toUpperCase()));
  const out = [...roles];
  for (const r of add) if (!seen.has(r.toUpperCase())) out.push(r);
  return out;
}
```

`shouldApplyInstitutionFilter` is **unchanged** — it already returns `true` for
any non-CSC role, covering both pemba variants (they are institution-scoped too,
just additionally filtered by department).

`isCSCRole` is unchanged; pemba roles are NOT CSC roles and must NOT see
all-institution data.

---

## 2. Type & constant definitions

### `src/lib/types.ts`

Add the two variants to the `Role` union (currently lines 1-11):

```ts
export type Role =
  | 'HRO'
  | 'HHRMD'
  | 'HRMO'
  | 'DO'
  | 'EMPLOYEE'
  | 'CSCS'
  | 'HRRP'
  | 'PO'
  | 'Admin'
  | 'HRO_PEMBA'
  | 'HRRP_PEMBA'
  | null;
```

### `src/lib/constants.ts`

Add to the `ROLES` record (lines 3-13):

```ts
export const ROLES: Record<string, Role> = {
  HRO: 'HRO',
  HHRMD: 'HHRMD',
  HRMO: 'HRMO',
  DO: 'DO',
  EMPLOYEE: 'EMPLOYEE',
  CSCS: 'CSCS',
  HRRP: 'HRRP',
  PO: 'PO',
  ADMIN: 'Admin',
  HRO_PEMBA: 'HRO_PEMBA',
  HRRP_PEMBA: 'HRRP_PEMBA',
};
```

> **No `INSTITUTIONS` change.** The seed defines 41 institution entries (the
> live DB has 72; the discrepancy is a separate seeding concern, not this
> feature). Pemba roles are assigned per-User via `User.institutionId`, exactly
> like HRO/HRRP — no new institutions are created.

---

## 3. Database / schema

**No migration. No `Island` enum. No backfill.** The `department` column
already exists on `Employee` (`prisma/schema.prisma:121`, `String?`) and is
populated by HRIMS sync. Filtering is done at query time.

The only schema-adjacent change is optional (§8): a trigram index for faster
`ILIKE '%pemba%'`.

---

## 4. Data-scope filter (the actual Pemba scoping)

### 4a. A shared where-clause builder

**File:** `src/lib/role-utils.ts` (append)

```ts
import type { Prisma } from '@prisma/client';

/**
 * Returns a Prisma `where` fragment that scopes employees to the Pemba
 * department when the role is Pemba-scoped, else an empty fragment.
 * Combine with the institution filter the caller already applies.
 *
 * Example:
 *   const where = {
 *     ...institutionWhere(auth),
 *     ...pembaDepartmentWhere(auth.role),  // adds department ILIKE only for pemba roles
 *   };
 */
export function pembaDepartmentWhere(
  role: string | null | undefined
): Prisma.EmployeeWhereInput {
  return isPembaScopedRole(role)
    ? { department: { contains: 'pemba', mode: 'insensitive' } }
    : {};
}
```

This is the **single** place that knows "Pemba = department contains 'pemba'
case-insensitively". Every list/metrics route calls it; nobody re-derives the
predicate. If the rule ever changes (e.g. add `currentReportingOffice`), it
changes in one place.

### 4b. Apply it in every employee-reading GET handler

Every route that reads employees and currently applies the institution filter
for HRO/HRRP must additionally spread `pembaDepartmentWhere(auth.role)` into its
where clause. Pattern (shown on `employees/route.ts`):

```ts
// src/app/api/employees/route.ts  (list branch, ~line 203)
else if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
  whereClause.institutionId = userInstitutionId;
  Object.assign(whereClause, pembaDepartmentWhere(userRole)); // ← ADD
  logger.info({ value: userRole }, 'Applying institution filter for role');
}
```

**Routes to update (list/GET branch):**

| # | Route | Notes |
|---|---|---|
| 1 | `src/app/api/employees/route.ts` | list (§4b) **and** single-employee IDOR branch (§5, S1) |
| 2 | `src/app/api/employees/search/route.ts` | search |
| 3 | `src/app/api/dashboard/metrics/route.ts` | counts/metrics |
| 4 | `src/app/api/confirmation-requests/route.ts` | list |
| 5 | `src/app/api/confirmations/route.ts` | list |
| 6 | `src/app/api/promotions/route.ts` | list (`allowedGetRoles` gate + where) |
| 7 | `src/app/api/lwop/route.ts` | list |
| 8 | `src/app/api/retirement/route.ts` | list |
| 9 | `src/app/api/resignation/route.ts` | list |
| 10 | `src/app/api/service-extension/route.ts` | list |
| 11 | `src/app/api/termination/route.ts` | list |
| 12 | `src/app/api/cadre-change/route.ts` | list |
| 13 | `src/app/api/reports/route.ts` | report data + keep complaints-blocked for pemba |
| 14 | `src/app/api/reports/export/route.ts` | export data |
| 15 | `src/app/api/urgent-actions/route.ts` | urgent list |
| 16 | `src/app/api/external/employees/route.ts` | external employees (has HRO/HRRP in allowed roles) |

> For the request-type routes (confirmations, promotions, lwop, retirement,
> resignation, service-extension, termination, cadre-change), the where
> clause filters on the related `Employee` via the relation — apply
> `pembaDepartmentWhere` to the `Employee` sub-where, e.g.:
> `{ Employee: { ...pembaDepartmentWhere(role) } }`.

---

## 5. Authorization gates — `allowedRoles` AND exact-string guards

Two distinct kinds of gate must be updated; conflating them is the earlier
draft's main defect.

### 5a. `withAuth({ allowedRoles })` arrays (case-insensitive)

Use `appendPembaRoles(...)` so the intent is explicit and the arrays stay in
sync. Example:

```ts
// src/app/api/employees/search/route.ts:193
}, { allowedRoles: appendPembaRoles(['ADMIN','HRO','HRRP','HRMO','HHRMD','DO','CSCS','EMPLOYEE']) }), ...
```

For routes that only allow HRO (e.g. manual-entry) use `which:'hro'`; for
HRRP-only use `which:'hrrp'`; for both use the default `'both'`.

**Routes with `allowedRoles` to extend** (add the matching pemba variant):

| Route | `which` |
|---|---|
| `employees/route.ts` (GET read) | both |
| `employees/search/route.ts` | both |
| `employees/manual-entry/route.ts:421` (`allowedRoles:['HRO']`) | hro |
| `employees/bulk-upload/route.ts` | hro |
| `employees/validate/route.ts:51` (`['HRO','Admin','HHRMD']`) | hro |
| `external/employees/route.ts:20-26` (`EXTERNAL_EMPLOYEES_ALLOWED_ROLES`) | both |
| `confirmation-requests/route.ts` | both |
| `confirmations/route.ts` | both |
| `promotions/route.ts:54` (`allowedGetRoles`) | both |
| `lwop/route.ts` | both |
| `retirement/route.ts` | both |
| `resignation/route.ts` | both |
| `service-extension/route.ts` | both |
| `termination/route.ts` | both |
| `cadre-change/route.ts` | both |
| `reports/route.ts:99`, `reports/export/route.ts:196` | both (and keep complaints blocked — §5c) |
| `urgent-actions/route.ts` | both |
| `dashboard/metrics/route.ts` | both |
| `users/route.ts` (if it allows HRO to manage users) | hro |

### 5b. Exact-string security guards (case-sensitive!) — use the predicates

These do **not** go through `withAuth`; they are inline `===` comparisons.
Replace each with the matching predicate so the pemba variant is covered
**without** hand-copying the string. Every site in the table in §0 (S1–S10)
must be converted. Examples:

```ts
// S1  src/app/api/employees/route.ts:107
} else if (isHroLike(userRole) || isHrrpLike(userRole)) {
  if (employee.institutionId !== userInstitutionId) { ... 403 ... }
  // ADD: pemba-scoped roles must also only read Pemba-department employees
  if (isPembaScopedRole(userRole) &&
      !(employee.department ?? '').toLowerCase().includes('pemba')) {
    return NextResponse.json({ success:false, message:'Access denied' }, { status:403 });
  }
}

// S6/S7  files/employee-documents|photos/[filename]/route.ts:42-43
} else if (isHroLike(roleUpper) || isHrrpLike(roleUpper)) { ... }
// (note: these use roleUpper.toUpperCase() already; the predicates are
//  case-sensitive on the exact role string — pass the original role, not
//  roleUpper, OR normalize the predicate inputs. Prefer passing `auth.role`
//  from the context, which is the canonical DB casing.)

// S8  src/lib/sanitize-response.ts:67
const PRIVILEGED_EMPLOYEE_ROLES = appendPembaRoles(
  ['ADMIN','HRO','HRRP','HHRMD','HRMO','CSCS','DO','PO'], 'both'
);
// (this is a module-level const; just add the two strings directly — appendPembaRoles
//  is a convenience for arrays you don't control; here, inline is fine:)
const PRIVILEGED_EMPLOYEE_ROLES = ['ADMIN','HRO','HRRP','HHRMD','HRMO','CSCS','DO','PO','HRO_PEMBA','HRRP_PEMBA'];

// S9  resubmission guards in lwop-requests/[id], resignation/[id], promotions/[id]
if (isResubmission && !isHroLike(auth.role) && !isHrrpLike(auth.role)) { ... 403 ... }
// (the original `!['HRO','HRRP'].includes(auth.role)` becomes the above; or keep
//  an array: ![...HRO_LIKE_ROLES, ...HRRP_LIKE_ROLES].includes(auth.role))

// S10  isHrrpApproval across all *Request/[id] routes
const isHrrpApproval =
  updateData.status === 'Approved by HRRP - Awaiting Commission Review' &&
  (updateData.hrrpReviewedById || isHrrpLike(userRole));
```

> **Case-sensitivity caveat.** `withAuth` uppercases both sides before
> comparing (api-auth.ts:261-263), so `allowedRoles` entries can be any case.
> The inline `===` guards do **not** uppercase. The canonical DB role string is
> `HRO_PEMBA` (uppercase). Pass the canonical `auth.role` to the predicates;
> the predicates compare exact strings. Do **not** feed `roleUpper` into the
> predicates unless you also uppercase the predicate constants.

### 5c. Reports: keep complaints blocked for pemba roles

`src/app/api/reports/route.ts` blocks the `complaints` report type for HRO/HRRP
and the frontend mirrors this
(`src/app/dashboard/reports/page.tsx:115`). Apply the same block for
`HRO_PEMBA`/`HRRP_PEMBA`:

```ts
// reports/route.ts — wherever complaints are excluded for HRO/HRRP
if (isHroLike(role) || isHrrpLike(role)) { /* exclude complaints */ }
// reports/page.tsx:115
if (isHroLike(role) || isHrrpLike(role)) {
  return REPORT_TYPES.filter(rt => rt.value !== 'complaints');
}
```

Report **data** must also be department-scoped (§4b item 13/14).

---

## 6. Navigation

**File:** `src/lib/navigation.ts`

`NAV_ITEMS` is an array of `{ title, href, icon, roles: Role[], ... }`. Add the
pemba variants to the `roles` arrays of the same items that currently list
`HRO`/`HRRP`. Use `ROLES.HRO_PEMBA` / `ROLES.HRRP_PEMBA`.

| Menu item | Add |
|---|---|
| Dashboard (roles include HRO,HRRP) | HRO_PEMBA, HRRP_PEMBA |
| Urgent Actions (HRO,HRRP) | HRO_PEMBA, HRRP_PEMBA |
| Add Employee (HRO only) | HRO_PEMBA |
| Employee Profiles | HRO_PEMBA, HRRP_PEMBA |
| Employee Confirmation | HRO_PEMBA, HRRP_PEMBA |
| LWOP | HRO_PEMBA, HRRP_PEMBA |
| Promotion | HRO_PEMBA, HRRP_PEMBA |
| Change of Cadre | HRO_PEMBA, HRRP_PEMBA |
| Retirement | HRO_PEMBA, HRRP_PEMBA |
| Resignation | HRO_PEMBA, HRRP_PEMBA |
| Service Extension | HRO_PEMBA, HRRP_PEMBA |
| Termination/Dismissal | HRO_PEMBA, HRRP_PEMBA |
| Track Status | HRO_PEMBA, HRRP_PEMBA |
| Recent Activities | HRO_PEMBA, HRRP_PEMBA |
| Reports & Analytics | HRO_PEMBA, HRRP_PEMBA |

`getNavItemsForRole(role)` (lines 268-277) filters by `role in item.roles` —
works unchanged once the arrays include the new strings.

---

## 7. Frontend pages — replace `=== ROLES.HRO`/`=== ROLES.HRRP` with predicates

The frontend has ~80+ exact-string `role === ROLES.HRO` / `role === ROLES.HRRP`
checks across ~13 pages driving: submit-button visibility, HRRP review-action
visibility, rejection-status routing, resubmit visibility, list filtering
(HRO sees only own submissions), labels ("My X Requests" vs "Review X
Requests"), and institution display. Missing any means the pemba role sees a
broken page (no submit button, wrong label, can't review, etc.).

### 7a. Import the predicates client-side

`role-utils.ts` is server+client safe (pure functions, no `db`). Import the
predicates into each page and replace:

```tsx
// before
{role === ROLES.HRO && (...)}
if (role === ROLES.HRRP) { rejectionStatus = 'Rejected by HRRP - Awaiting HRO Correction'; }
// after
import { isHroLike, isHrrpLike } from '@/lib/role-utils';
{isHroLike(role) && (...)}
if (isHrrpLike(role)) { rejectionStatus = 'Rejected by HRRP - Awaiting HRO Correction'; }
```

> The rejection-status **string** stays `'Rejected by HRRP - Awaiting HRO
> Correction'` — it is a stored status value, not a label. Do not change the
> string; only the role test that decides whether to use it.

### 7b. Page-by-page checklist

For each page, convert every `role === ROLES.HRO` → `isHroLike(role)` and
`role === ROLES.HRRP` → `isHrrpLike(role)` (and the `role !== ROLES.HRO`
negations). Files (line refs from the audit):

- `src/app/dashboard/page.tsx` — lines 253, 418, 586 (urgent count fetch, profile card, urgent-actions link)
- `src/app/dashboard/profile/page.tsx:983` — `isInstitutionalViewer` (`isHroLike(role) || isHrrpLike(role)`); `canUploadDocuments` array add `'HRO_PEMBA'`
- `src/app/dashboard/confirmation/page.tsx` — 292,297,508,511,626,640,875,1126,1128,1133,1135,1200,1288,1379
- `src/app/dashboard/lwop/page.tsx` — 368,371,669,672,822,836,923,1169,1176,1178,1183,1185,1281,1367,1447
- `src/app/dashboard/promotion/page.tsx` — 410,568,571,780,1151,1588,1590,1595,1597,1700,1787,1866
- `src/app/dashboard/retirement/page.tsx` — 858,1099,1489,1579,1661,1691,1786,1893
- `src/app/dashboard/resignation/page.tsx` — 539,782,1050,1145,1237,1332,1427
- `src/app/dashboard/service-extension/page.tsx` — 573,851,1130,1229,1322,1420,1489
- `src/app/dashboard/termination/page.tsx` — 628,911,1319,1414,1504,1598,1658
- `src/app/dashboard/cadre-change/page.tsx` — 577,768,1044,1148,1217,1247,1353,1453
- `src/app/dashboard/reports/page.tsx` — 115,149,186,509,515 (complaints block + institution filter lock)
- `src/app/dashboard/track-status/page.tsx` — 131,133,208,268,404,460
- `src/app/dashboard/urgent-actions/page.tsx:54` — `isAuthorized = isHroLike(role) || isHrrpLike(role)`
- `src/app/dashboard/recent-activities/page.tsx:237` — `shouldShowInstitution`
- `src/components/layout/sidebar.tsx` — manual-entry permission check (`role === 'HRO'` → `isHroLike(role)`)

> **Subtlety:** several pages use `role === ROLES.HRO` to mean *specifically*
> the submitting officer (HRO submits; HRRP reviews). `HRO_PEMBA` is also a
> submitter and `HRRP_PEMBA` is also a reviewer, so `isHroLike`/`isHrrpLike` is
> correct. Do **not** create a predicate that lumps HRO and HRRP together — the
> submitter vs reviewer distinction must remain.

---

## 8. Optimization (optional, defer)

`department ILIKE '%pemba%'` is a leading-wildcard ILIKE → sequential scan. At
36k rows this is fine. If it ever isn't:

```sql
-- one-time, after the feature ships
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX employee_department_trgm ON "Employee" USING gin (department gin_trgm_ops);
```

Prisma has no native `gin_trgm_ops` mapping; add this as a raw SQL migration
(`prisma/migrations/<ts>_employee_department_trgm/migration.sql`) and run
`prisma migrate deploy`. This is **not** required for correctness and is
explicitly out of scope for the initial cut.

---

## 9. Auth / login / session

**No changes** to:
- `src/lib/api-auth.ts` — `verifyAuth` reads `User.role` (plain `String`) into
  the auth context; `withAuth` compares case-insensitively. New role strings
  flow through unchanged.
- `src/store/auth-store.ts`, `src/hooks/use-auth.ts` — store role as string.
- `src/components/auth/login-form.tsx`, `employee-login-form.tsx` — generic.

The login endpoint returns whatever role the DB holds; `HRO_PEMBA`/`HRRP_PEMBA`
work without touching auth.

---

## 10. Manual entry & bulk upload (Pemba enforcement on writes)

`HRO_PEMBA` can add employees (manual entry + bulk upload), but must only add
employees whose `department` will contain "Pemba". Two options:

1. **Validate on write (recommended):** in `employees/manual-entry/route.ts`
   and `employees/bulk-upload/route.ts`, after parsing the submitted
   `department`, if the actor is `isPembaScopedRole(role)` and the department
   does not ILIKE `'%pemba%'`, reject with 400 ("Pemba-scoped officers can only
   add employees in Pemba departments"). This mirrors the read-side scope and
   prevents a `HRO_PEMBA` from creating Unguja employees they could then not
   see/manage.
2. **Auto-stamp:** force `department` to include "Pemba" — rejected; it would
   corrupt data and hide the real sub-office name.

Add `HRO_PEMBA` to the `allowedRoles` of both routes (§5a) and use
`isHroLike(role)` for the manual-entry institution check in `sidebar.tsx` and
the route's HRO branch.

---

## 11. Seed data

**File:** `prisma/seed.ts` + `src/lib/constants.ts` (`USERS`)

Add at least one `HRO_PEMBA` and one `HRRP_PEMBA` seed user, attached to an
institution that has Pemba-department employees (e.g. `WIZARA YA ELIMU NA
MAFUNZO YA AMALI`, `institutionId:'3'`, which the report shows has 2,214 Pemba
employees). These are for dev/QA only.

```ts
// in USERS[]
{
  username: 'hro_pemba_edu',
  name: 'HRO Pemba (Elimu)',
  password: 'password123',
  role: ROLES.HRO_PEMBA as Role,
  institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
  institutionId: '3',
  active: true,
},
{
  username: 'hrrp_pemba_edu',
  name: 'HRRP Pemba (Elimu)',
  password: 'password123',
  role: ROLES.HRRP_PEMBA as Role,
  institution: 'WIZARA YA ELIMU NA MAFUNZO YA AMALI',
  institutionId: '3',
  active: true,
},
```

> **Production users** for the two new roles are created via the existing User
> Management UI (`/dashboard/admin/users`) or `users/route.ts`, not via seed.
> The seed is dev-only. Ensure `users/route.ts` allows `Admin` to assign the
> new roles (§5a: add `HRO_PEMBA` to its HRO-allowlist if it restricts role
> assignment).

---

## 12. What NOT to do (rejected approaches)

- **❌ `Island` enum + `deriveIsland` + backfill.** The earlier draft's cascade
  (`region → currentWorkplace → currentReportingOffice → institutionName`)
  omits `department`, the only field that carries the Pemba posting signal.
  `region` is *birth* region (semantically wrong for "posted to Pemba");
  `currentWorkplace` is the ministry name (rarely contains "Pemba"). It would
  misclassify the bulk of the 3,425 employees the report identifies, requires a
  migration + 36k-row backfill + sync changes for no correctness gain, and
  introduces a derived column that can drift from `department`. Rejected.
- **❌ `department ILIKE` via a runtime filter only, without touching the
  exact-string guards.** This would leave the IDOR/PII/resubmission holes (§0).
  The guards and the list filter are both required.
- **❌ Reusing `isCSCRole` / expanding `CSC_ROLES`.** Pemba roles are
  institution-scoped, not commission-wide. They must NOT see all institutions.

---

## 13. Implementation order

1. **Predicates** — add `isHroLike`, `isHrrpLike`, `isPembaScopedRole`,
   `appendPembaRoles`, `pembaDepartmentWhere` to `role-utils.ts`.
2. **Types & constants** — `types.ts` union; `constants.ts` `ROLES`.
3. **Sanitize** — `PRIVILEGED_EMPLOYEE_ROLES` add the two strings (S8). (Do
   this early — it's one line and prevents the "masked PII" bug class.)
4. **API authorization** — `allowedRoles` via `appendPembaRoles` across all
   routes in §5a.
5. **API exact-string guards** — convert S1–S10 (§5b) to predicates; add the
   pemba department check to the single-employee IDOR branch (S1).
6. **API data scope** — spread `pembaDepartmentWhere(role)` into every list/
   metrics/reports where clause (§4b).
7. **Navigation** — `NAV_ITEMS` roles (§6).
8. **Frontend pages** — convert `=== ROLES.HRO/HRRP` to `isHroLike/isHrrpLike`
   across all pages in §7b. (Mechanical but large; do one page at a time and
   run `tsc` after each.)
9. **Manual entry / bulk upload** — Pemba write validation (§10).
10. **Seed users** — `constants.ts` `USERS` + `seed.ts` (no schema change).
11. **Verify** — §14.

---

## 14. Verification

Manual smoke (the repo has no end-to-end role suite; the existing route tests
mock `withAuth`):

- Log in as `hro_pemba_edu` → `/api/employees` returns only employees with
  `department ILIKE '%pemba%'` within institution 3; total ≤ 2,214.
- Log in as `hro_pemba_edu` → `/api/employees?id=<a non-Pemba employee in inst
  3>` returns 403 (IDOR + department guard).
- Log in as `hro_pemba_edu` → `/api/employees?id=<a Pemba employee in inst 3>`
  returns 200 with **unmasked** PII (validates S8).
- Log in as `hrrp_pemba_edu` → confirmation/lwop/promotion lists show only
  Pemba-department employees; "HRRP Review" actions appear on Pending items.
- Log in as `hrrp_pemba_edu` → can resubmit a rejected request (validates S9).
- Log in as `HRO` (inst 3) → still sees ALL inst-3 employees (Pemba + Unguja)
  — regression check that HRO scope is unchanged.
- Log in as `CSCS` → still sees all institutions — regression.
- Nav: `hro_pemba` sees Add Employee, Employee Profiles, etc.; `hrrp_pemba`
  sees review items; neither sees Institutions/Admin.
- `POST /api/employees/manual-entry` as `HRO_PEMBA` with
  `department:'Finance'` → 400; same body with `department:'Ofisi Kuu Pemba'`
  → 201.
- `npm run build` (Next.js) + `tsc --noEmit` clean — the predicate swap is
  type-safe; watch for any `Role` exhaustiveness switches that now need the
  two new members.

---

## 15. Summary of changes

| Area | File(s) | Change |
|---|---|---|
| Predicates | `src/lib/role-utils.ts` | **add** `isHroLike`, `isHrrpLike`, `isPembaScopedRole`, `appendPembaRoles`, `pembaDepartmentWhere` |
| Types | `src/lib/types.ts` | add `HRO_PEMBA`, `HRRP_PEMBA` to `Role` |
| Constants | `src/lib/constants.ts` | add to `ROLES`; add 2 seed `USERS` |
| PII sanitize | `src/lib/sanitize-response.ts` | add 2 strings to `PRIVILEGED_EMPLOYEE_ROLES` |
| API auth (allowedRoles) | ~18 route files | `appendPembaRoles(...)` |
| API exact-string guards | ~10 sites (S1–S10) | convert to `isHroLike`/`isHrrpLike`; add dept check to S1 |
| API data scope | ~16 route files | `pembaDepartmentWhere(role)` in where |
| Navigation | `src/lib/navigation.ts` | add roles to ~15 `NAV_ITEMS` |
| Frontend pages | ~13 `dashboard/**/page.tsx` + `sidebar.tsx` | `isHroLike(role)`/`isHrrpLike(role)` (~80 call sites) |
| Manual entry / bulk upload | 2 route files | Pemba write validation; `allowedRoles` |
| Seed | `prisma/seed.ts` (via `constants.ts`) | 2 dev users |
| Schema / migration | **none** | `department` already exists |
| HRIMS sync | **none** | `department` already populated |
| Backfill | **none** | — |
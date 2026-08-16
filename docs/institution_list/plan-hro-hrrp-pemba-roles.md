# PLAN: Implement `HRO_PEMBA` and `HRRP_PEMBA` Roles

## Overview

Add two new roles — `HRO_PEMBA` and `HRRP_PEMBA` — that behave identically to `HRO` and `HRRP` respectively, except that they are **scoped to only see/manage employees posted to Pemba island**.

- `HRO` and `HRRP` continue to see **all employees** within their institution (both Pemba and Unguja).
- `HRO_PEMBA` and `HRRP_PEMBA` only see employees whose `island` is `PEMBA`.
- Both new roles exist within every institution (all 72 institutions), just like HRO/HRRP.

### Core Design Decision: Dedicated `island` Field

Instead of using `department ILIKE '%pemba%'` (fragile, free-text, semantic mismatch), we add a dedicated **`Island` enum field** to the `Employee` model:

```prisma
enum Island {
  PENDING
  PEMBA
  UNGUJA
}
```

The value is **derived automatically during HRIMS sync** from a cascade of geographic fields (in priority order):
1. `region` — the employee's assigned region (standardized HRIMS field)
2. `currentWorkplace` — where they are physically posted
3. `currentReportingOffice` — their reporting office
4. `institution.name` — fallback

This correctly handles edge cases:
- **Born in Pemba, works in Unguja** → `region` = "Mjini Magharibi" → `UNGUJA` (correct)
- **Works in Pemba, department name doesn't say "Pemba"** → `region` = "Kaskazini Pemba" → `PEMBA` (correct)
- **Employee transferred from Pemba to Unguja** → HRIMS sync updates `region`, island auto-updates

---

## Files to Modify

### 1. Role Type Definitions

**File:** `src/lib/types.ts`

- Add `'HRO_PEMBA'` and `'HRRP_PEMBA'` to the `Role` union type.

```typescript
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

---

### 2. Role Constants

**File:** `src/lib/constants.ts`

- Add `HRO_PEMBA` and `HRRP_PEMBA` to the `ROLES` object.

```typescript
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

---

### 3. Role Utility Functions

**File:** `src/lib/role-utils.ts`

**New / modified functions:**

```typescript
// Existing
export const CSC_ROLES = ['HHRMD', 'HRMO', 'DO', 'PO', 'CSCS'];

export function isCSCRole(userRole: string | null): boolean {
  return userRole ? CSC_ROLES.includes(userRole) : false;
}

// --- NEW: Pemba-scoped role check ---
export const PEMBA_SCOPED_ROLES = ['HRO_PEMBA', 'HRRP_PEMBA'];

export function isPembaScopedRole(userRole: string | null): boolean {
  return userRole ? PEMBA_SCOPED_ROLES.includes(userRole) : false;
}

// --- Institution-scoped roles (includes both regular and pemba-scoped) ---
export function shouldApplyInstitutionFilter(
  userRole: string | null,
  userInstitutionId: string | null
): boolean {
  if (!userRole || !userInstitutionId) return false;
  // Both regular HRO/HRRP AND HRO_PEMBA/HRRP_PEMBA are institution-scoped
  return !isCSCRole(userRole);
}
```

**Note:** `shouldApplyInstitutionFilter` is unchanged — it already returns `true` for any non-CSC role, which covers both `HRO_PEMBA` and `HRRP_PEMBA` automatically.

---

### 4. Database / Schema — Add `Island` Enum

**File:** `prisma/schema.prisma`

Add the `Island` enum and `island` field to the `Employee` model:

```prisma
enum Island {
  PENDING
  PEMBA
  UNGUJA
}

model Employee {
  // ... existing fields (no changes to existing fields)

  // ADD this field:
  island      Island?     @default(PENDING)
}
```

**Migration commands:**
```bash
npx prisma migrate dev --name add-island-enum
```

If deploying to production:
```bash
npx prisma migrate deploy
```

---

### 5. HRIMS Sync — Derive Island During Sync

**Two files need modification:**

| File | Location |
|------|----------|
| Fetch single employee | `src/app/api/hrims/fetch-employee/route.ts` |
| Bulk sync worker | `src/lib/jobs/hrims-sync-worker.ts` |

**Add a shared helper function** to derive the island value. Best placed in `src/lib/role-utils.ts` or a new `src/lib/island-utils.ts`:

```typescript
// src/lib/island-utils.ts

export enum Island {
  PENDING = 'PENDING',
  PEMBA = 'PEMBA',
  UNGUJA = 'UNGUJA',
}

export function deriveIsland(
  region?: string | null,
  currentWorkplace?: string | null,
  currentReportingOffice?: string | null,
  institutionName?: string | null
): Island {
  const checks = [region, currentWorkplace, currentReportingOffice, institutionName]
    .filter(Boolean)
    .map(s => s!.toLowerCase());

  for (const val of checks) {
    // Pemba regions and workplace indicators
    if (val.includes('pemba')) return Island.PEMBA;
    // Unguja regions and workplace indicators
    if (val.includes('unguja') || val.includes('mjini') || val.includes('magharibi')) return Island.UNGUJA;
  }
  return Island.PENDING;
}
```

#### 5a. In `fetch-employee/route.ts`

After the main employee data mapping (around the `saveEmployeeToDatabase` upsert), add:

```typescript
import { deriveIsland } from '@/lib/island-utils';

// Inside the data object passed to prisma.employee.upsert():
island: deriveIsland(
  personalInfo.regionName,
  currentEmployment?.entityName,       // maps to currentWorkplace
  currentEmployment?.divisionName,     // maps to currentReportingOffice
  institution?.name
),
```

#### 5b. In `hrims-sync-worker.ts`

In the `saveEmployeeFromDetailedData` function, add to the upsert data:

```typescript
import { deriveIsland } from '@/lib/island-utils';

// Inside the upsert data:
island: deriveIsland(
  personalInfo.districtName || personalInfo.birthRegionName || personalInfo.regionName,
  currentEmployment?.entityName,
  currentEmployment?.divisionName || currentEmployment?.subEntityName,
  institution?.name
),
```

---

### 6. Backfill Existing Data

Run a one-time SQL query to populate the `island` field for all 36K+ existing employees:

```sql
UPDATE "Employee" SET "island" = CASE
  WHEN "region" ILIKE '%pemba%'
    OR "currentWorkplace" ILIKE '%pemba%'
    OR "currentReportingOffice" ILIKE '%pemba%'
  THEN 'PEMBA'
  WHEN "region" ILIKE ANY(ARRAY['%unguja%', '%mjini%', '%magharibi%'])
    OR "currentWorkplace" ILIKE ANY(ARRAY['%unguja%', '%mjini%', '%magharibi%'])
    OR "currentReportingOffice" ILIKE ANY(ARRAY['%unguja%', '%mjini%', '%magharibi%'])
  THEN 'UNGUJA'
  ELSE 'PENDING'
END;
```

**Run this immediately after deploying the migration.**

---

### 7. All API Route GET Handlers — Add Island Filtering

Every API route that reads/returns employee data and currently applies the `institutionId` filter for HRO/HRRP must **also** apply an `island` filter when the user is `HRO_PEMBA` or `HRRP_PEMBA`.

**Files (non-exhaustive — search for `shouldApplyInstitutionFilter` usage):**

| # | API Route | Notes |
|---|-----------|-------|
| 1 | `src/app/api/employees/route.ts` | Main employee listing |
| 2 | `src/app/api/employees/search/route.ts` | Employee search endpoint |
| 3 | `src/app/api/dashboard/metrics/route.ts` | Dashboard metrics |
| 4 | `src/app/api/confirmation-requests/route.ts` | Confirmation requests |
| 5 | `src/app/api/confirmations/route.ts` | Confirmation CRUD |
| 6 | `src/app/api/promotions/route.ts` | Promotions CRUD |
| 7 | `src/app/api/lwop/route.ts` | LWOP CRUD |
| 8 | `src/app/api/retirement/route.ts` | Retirement CRUD |
| 9 | `src/app/api/resignation/route.ts` | Resignation CRUD |
| 10 | `src/app/api/service-extension/route.ts` | Service Extension CRUD |
| 11 | `src/app/api/termination/route.ts` | Termination CRUD |
| 12 | `src/app/api/cadre-change/route.ts` | Cadre Change CRUD |
| 13 | `src/app/api/reports/route.ts` | Reports |
| 14 | `src/app/api/urgent-actions/route.ts` | Urgent actions |

**Pattern to apply in each route (example from employees/route.ts):**

```typescript
import { isPembaScopedRole } from '@/lib/role-utils';

// In the GET handler, after applying institution filter:
if (shouldApplyInstitutionFilter(userRole, userInstitutionId)) {
  whereClause.institutionId = userInstitutionId;

  // ADD: If user is pemba-scoped, also filter by island
  if (isPembaScopedRole(userRole)) {
    whereClause.island = 'PEMBA';
  }
}
```

**Query benefit:** `whereClause.island = 'PEMBA'` is an exact-match equality check that can be indexed. Contrast with `department ILIKE '%pemba%'` which forces a full sequential scan.

---

### 8. API Route `allowedRoles` — Add New Roles

Every API route's `withAuth()` call that currently lists `HRO` and/or `HRRP` in `allowedRoles` must also include `HRO_PEMBA` and/or `HRRP_PEMBA`.

Since `withAuth()` does case-insensitive comparison, role names work as-is.

**Reference list of affected API routes (from the exploration):**

| # | Route File | Current allowedRoles | New allowedRoles |
|---|------------|---------------------|------------------|
| 1 | `src/app/api/employees/search/route.ts` | `['ADMIN', 'HRO', 'HRRP', 'HRMO', 'HHRMD', 'DO', 'CSCS', 'EMPLOYEE']` | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 2 | `src/app/api/confirmation-requests/route.ts` | `['HRO', 'HHRMD', 'HRMO', 'CSCS', 'HRRP']` | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 3 | `src/app/api/users/route.ts` | `['ADMIN', 'HHRMD', 'HRO']` | + `'HRO_PEMBA'` |
| 4 | `src/app/api/employees/bulk-upload/route.ts` | `['HRO', 'ADMIN']` | + `'HRO_PEMBA'` |
| 5 | `src/app/api/confirmations/route.ts` | `checkRoleAuthorization(['HRO', 'HRRP'])` | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 6 | `src/app/api/promotions/route.ts` | `['HRRP']` and `['HRO', 'HRRP']` | + `'HRRP_PEMBA'` and `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 7 | `src/app/api/lwop/route.ts` | `['HRO', 'HRRP']` | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 8 | `src/app/api/retirement/route.ts` | Same pattern | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 9 | `src/app/api/resignation/route.ts` | Same pattern | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 10 | `src/app/api/service-extension/route.ts` | Same pattern | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 11 | `src/app/api/termination/route.ts` | Same pattern | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 12 | `src/app/api/cadre-change/route.ts` | Same pattern | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 13 | `src/app/api/employees/manual-entry/route.ts` | HRO-specific | + `'HRO_PEMBA'` |
| 14 | `src/app/api/files/employee-documents/[filename]/route.ts` | HRO-specific institution check | + `'HRO_PEMBA'` |
| 15 | `src/app/api/files/employee-photos/[filename]/route.ts` | HRO-specific institution check | + `'HRO_PEMBA'` |
| 16 | `src/app/api/reports/route.ts` | Blocks complaints for HRO/HRRP | + block for `HRO_PEMBA`/`HRRP_PEMBA` |
| 17 | `src/app/api/employees/route.ts` | Uses `withAuth` | + `'HRO_PEMBA', 'HRRP_PEMBA'` |
| 18 | All other API routes with HRO/HRRP in allowedRoles | — | — |

**Principle:** Wherever `HRO` appears, add `HRO_PEMBA`. Wherever `HRRP` appears, add `HRRP_PEMBA`. Where both appear, add both.

---

### 9. Navigation Items

**File:** `src/lib/navigation.ts`

Add `HRO_PEMBA` and `HRRP_PEMBA` to the same navigation items that currently include `HRO` and `HRRP`:

| Menu Item | Currently includes | Add |
|-----------|-------------------|-----|
| Dashboard | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Urgent Actions | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Add Employee | HRO (only) | HRO_PEMBA (only) |
| Employee Profiles | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Employee Confirmation | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| LWOP | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Promotion | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Change of Cadre | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Retirement | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Resignation | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Service Extension | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Termination/Dismissal | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Track Status | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Recent Activities | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |
| Reports & Analytics | HRO, HRRP | HRO_PEMBA, HRRP_PEMBA |

---

### 10. Frontend Pages — Role Checks

Every frontend page that checks for `HRO` or `HRRP` must also check for `HRO_PEMBA` / `HRRP_PEMBA`.

#### 10a. Profile Page (`src/app/dashboard/profile/page.tsx`)

```typescript
// isInstitutionalViewer — already includes HRO and HRRP, add pemba variants
const isInstitutionalViewer = useMemo(
  () =>
    role === ROLES.HRO ||
    role === ROLES.HRRP ||
    role === ROLES.HRO_PEMBA ||
    role === ROLES.HRRP_PEMBA,
  [role]
);

// canUploadDocuments — add HRO_PEMBA
const canUploadDocuments =
  userRole &&
  ['HRO', 'HHRMD', 'HRMO', 'DO', 'CSCS', 'PO', 'ADMIN', 'HRO_PEMBA'].includes(userRole);
```

#### 10b. Dashboard Page (`src/app/dashboard/page.tsx`)

Add `HRO_PEMBA` and `HRRP_PEMBA` alongside every `HRO` and `HRRP` check:

- Urgent actions card fetch: check for `ROLES.HRO_PEMBA` and `ROLES.HRRP_PEMBA`
- Profile link: add `ROLES.HRO_PEMBA`
- Urgent actions link: add `ROLES.HRO_PEMBA` and `ROLES.HRRP_PEMBA`

#### 10c. Sidebar (`src/components/layout/sidebar.tsx`)

Add `HRO_PEMBA` to the manual entry permission check alongside `HRO`:

```typescript
if (role !== 'HRO' && role !== 'HRO_PEMBA' || !user?.institutionId) {
  setHasManualEntryPermission(false);
  return;
}
```

#### 10d. All Other Dashboard Pages (19 pages)

Each page in `src/app/dashboard/` that checks `ROLES.HRO` or `ROLES.HRRP` for:
- Workflow step labels (e.g. "HRRP Review", "HRO Submit")
- Button visibility (Submit, Approve, Reject)
- Form rendering
- Status display

Add corresponding checks for `ROLES.HRO_PEMBA` and `ROLES.HRRP_PEMBA`.

**Approach:** In each page, wherever there is a check like `role === ROLES.HRO`, change it to `role === ROLES.HRO || role === ROLES.HRO_PEMBA`. Same for HRRP.

---

### 11. Auth System

No changes needed to:
- `src/store/auth-store.ts` — stores role as a string, works generically
- `src/hooks/use-auth.ts` — generic wrapper
- `src/lib/api-auth.ts` — `withAuth()` does case-insensitive comparison, works automatically

The `verifyAuth` function reads the user's role from the database and stores it in the auth context. Since role is a plain string in Prisma, `HRO_PEMBA` and `HRRP_PEMBA` will work without changes.

---

### 12. Login Forms

No changes needed to:
- `src/components/auth/login-form.tsx`
- `src/components/auth/employee-login-form.tsx`

These work generically with any role value stored in the database.

---

### 13. Login API (`/api/auth/login`)

No changes needed — the login endpoint reads the user's role from the database and returns it in the response. New roles work automatically.

---

### 14. Additional Considerations

#### 14a. Employee Create/Edit (Manual Entry & Bulk Upload)
- `src/app/api/employees/manual-entry/route.ts`: Add `HRO_PEMBA` to the HRO check. `HRO_PEMBA` should only be able to add employees whose island will be Pemba. This may require form validation or auto-derivation from the entered region/workplace.
- `src/app/api/employees/bulk-upload/route.ts`: Same consideration. The bulk upload handler should derive `island` from the uploaded data and reject entries where `HRO_PEMBA` tries to add a non-Pemba employee.

#### 14b. File Uploads
- `src/app/api/files/employee-documents/[filename]/route.ts` and `src/app/api/files/employee-photos/[filename]/route.ts` have HRO-specific institution checks. Add `HRO_PEMBA` alongside HRO.

#### 14c. Reports
- `src/app/api/reports/route.ts`: `HRO_PEMBA` and `HRRP_PEMBA` should have the same restrictions as HRO/HRRP (e.g., blocked from complaints reports). Also, their report data should be filtered to `island = 'PEMBA'`.

#### 14d. Dashboard Metrics
- `src/app/api/dashboard/metrics/route.ts`: Must apply the `island = 'PEMBA'` filter for `HRO_PEMBA`/`HRRP_PEMBA` just like the employee listing endpoints.

#### 14e. Institution Filter UI on Profile Page
Currently the institution filter dropdown in the profile page only shows for `isCommissionUser`. Since `HRO_PEMBA` and `HRRP_PEMBA` are institution-scoped (like HRO/HRRP), they won't see the institution filter. This is correct — they should only see employees within their institution (filtered further by `island = 'PEMBA'`).

---

## Implementation Order

1. **Types & Constants** — Add role strings to `types.ts` and `constants.ts`
2. **Schema Migration** — Add `Island` enum + `Employee.island` field to Prisma schema, run migration
3. **Island Utils** — Create `src/lib/island-utils.ts` with `deriveIsland()` function
4. **Backfill** — Run SQL to populate `island` for all existing employees
5. **HRIMS Sync** — Update `fetch-employee/route.ts` and `hrims-sync-worker.ts` to derive island during sync
6. **Role Utils** — Add `isPembaScopedRole()` and `PEMBA_SCOPED_ROLES` to `role-utils.ts`
7. **Navigation** — Add new roles to `navigation.ts`
8. **API Routes: Filtering** — Modify all API route GET handlers to apply `island` filter for pemba-scoped roles
9. **API Routes: allowedRoles** — Add new roles to all `withAuth()` calls
10. **Frontend: Shared Logic** — Update `profile/page.tsx`, `dashboard/page.tsx`, `sidebar.tsx`
11. **Frontend: All Dashboard Pages** — Add new roles to role checks in all 19+ pages
12. **Seed Data** — Add seed users for new roles
13. **Testing** — Verify that:
    - `HRO_PEMBA` sees only employees with `island = 'PEMBA'` within their institution
    - `HRRP_PEMBA` sees only employees with `island = 'PEMBA'` within their institution
    - `HRO` continues to see all employees in their institution
    - `HRRP` continues to see all employees in their institution
    - CSC roles continue to see all employees across all institutions
    - API routes enforce proper data scoping
    - Navigation items show/hide correctly for each role
    - New HRIMS syncs correctly derive and persist island values
    - Backfill SQL produces correct island assignments for all 36K+ employees

---

## Summary of Changes

| Area | Files to Modify | Nature of Change |
|------|----------------|------------------|
| Types | `src/lib/types.ts` | Add to Role union |
| Constants | `src/lib/constants.ts` | Add ROLES entries + seed users |
| Prisma Schema | `prisma/schema.prisma` | Add `Island` enum + `Employee.island` field |
| Island Utils | `src/lib/island-utils.ts` | **New file** — `deriveIsland()` helper |
| Role Utils | `src/lib/role-utils.ts` | Add `isPembaScopedRole()` |
| HRIMS Sync (fetch) | `src/app/api/hrims/fetch-employee/route.ts` | Derive island during upsert |
| HRIMS Sync (worker) | `src/lib/jobs/hrims-sync-worker.ts` | Derive island during upsert |
| Navigation | `src/lib/navigation.ts` | Add roles to NAV_ITEMS |
| API Routes (~20 files) | Various `src/app/api/` | Add `island` filter + `allowedRoles` |
| Frontend Pages (~20 files) | Various `src/app/dashboard/` | Add role checks alongside HRO/HRRP |
| Sidebar | `src/components/layout/sidebar.tsx` | Add HRO_PEMBA to manual entry check |
| **Total** | **~45 files** | — |

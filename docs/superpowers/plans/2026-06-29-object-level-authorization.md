# Plan: Add Object-Level Authorization to All HR API Routes (Tests 17.2, 17.3, 17.4)

## Context

**Problem:** All 16 HR entity route files (8 main + 8 `[id]`) are completely unauthenticated:

- GET handlers accept `userId`, `userRole`, `institutionId` as **URL query params** (client-controlled)
- POST/PATCH handlers read `userRole`, `submittedById`, `reviewedById` from **request body** (client-controlled)
- No server-side verification of caller identity exists — anyone with network access can read/write any record

This fails security tests:
- **17.2 (Object-Level Authorization)**: Anyone can iterate entity IDs and modify status/reviewStage
- **17.3 (Resource Access Validation)**: No access validation on these 16 routes

**Test 17.4 (Secure Object References)** already passes — all entities use UUID v4 IDs (`@id String` with `uuidv4()` generation), not sequential integers. No work needed for 17.4.

## Approach

Apply `withAuth()` from `src/lib/api-auth.ts` to all handlers, replacing client-controlled query params and body fields with the DB-derived `AuthContext` (`auth.userId`, `auth.role`, `auth.institutionId`).

### Reference pattern

From `src/app/api/employees/[id]/documents/route.ts`:

```ts
import { withAuth, AuthContext } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';

export const GET = wrapHandler(withRateLimit(withAuth(async (
  req: Request | NextRequest,
  { auth }: { auth: AuthContext }
) => {
  const userRole = auth.role;
  const userInstitutionId = auth.institutionId;
  // handler body unchanged from this point
}), 'read'), 'entity-name');
```

For `[id]` routes, `params` destructuring is incompatible with `withAuth` (which uses the 2nd arg for `{ auth }`), so extract the ID from the URL:

```ts
const id = request.url.match(/\/api\/entity-name\/([^/]+)/)?.[1];
```

### What changes per handler

**GET handlers**: Replace:
```ts
const { searchParams } = new URL(req.url);
const userId = searchParams.get('userId');
const userRole = searchParams.get('userRole');
const userInstitutionId = searchParams.get('userInstitutionId');
```
With:
```ts
const userId = auth.userId;
const userRole = auth.role;
const userInstitutionId = auth.institutionId;
```

**POST/PATCH handlers**: Replace:
```ts
const body = await req.json();
const isHRRP = body.userRole === 'HRRP';
```
With `auth.role` for all role-based decisions. Keep `body` for domain fields only.

**`[id]` PATCH/PUT handlers**: Replace `body.reviewedById` with `auth.userId` for audit logging. Add `withAuth` wrapping around the existing handler.

### Files to modify

**Main routes** (8 files) — each has GET/POST/PATCH (3 handlers):

| File | Handler style |
|------|--------------|
| `src/app/api/promotions/route.ts` | Inline `async (req)` |
| `src/app/api/confirmations/route.ts` | Inline `async (req)` |
| `src/app/api/lwop/route.ts` | Inline `async (req)` |
| `src/app/api/cadre-change/route.ts` | Named `async function GETHandler/POSTHandler/PATCHHandler` |
| `src/app/api/retirement/route.ts` | Same named-function pattern |
| `src/app/api/resignation/route.ts` | Same named-function pattern |
| `src/app/api/termination/route.ts` | Same named-function pattern |
| `src/app/api/service-extension/route.ts` | Same named-function pattern |

**`[id]` routes** (8 files) — each has PUT/PATCH:

| File | Export pattern |
|------|---------------|
| `src/app/api/promotions/[id]/route.ts` | `const handleUpdate = wrapHandler(async ..., 'promotions')` |
| `src/app/api/confirmations/[id]/route.ts` | Same inline wrap |
| `src/app/api/cadre-change/[id]/route.ts` | Bare `async function handleUpdate`, `export = wrapHandler(handleUpdate, ...)` |
| `src/app/api/retirement/[id]/route.ts` | Same bare function |
| `src/app/api/resignation/[id]/route.ts` | Same |
| `src/app/api/lwop/[id]/route.ts` | Same |
| `src/app/api/termination/[id]/route.ts` | Same |
| `src/app/api/service-extension/[id]/route.ts` | Same |

### Execution order

1. **Main routes — inline pattern** (promotions, confirmations, lwop)
2. **Main routes — named-function pattern** (cadre-change, retirement, resignation, termination, service-extension)
3. **`[id]` routes** (all 8)

## Verification

1. `npm run typecheck` — must pass after each batch
2. `npm test` — all unit tests must pass
3. For each modified file: confirm the wrapping pattern matches the reference implementation

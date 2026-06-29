# ERR-01 Centralized Error Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement centralized error handling across all 96 API routes and enhance frontend error boundaries to eliminate information leakage and provide consistent error responses.

**Architecture:** The existing `src/lib/error-handler.ts` utility (`withErrorHandler`, `handleApiError`, `AppError`) is fully implemented and tested but unused by any API route. The plan wraps every exported API handler with `withErrorHandler`, replaces manual try/catch blocks, and enhances the frontend `error.tsx`/`global-error.tsx` boundaries to report errors to the server.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zod, Prisma, Vitest, Pino logger

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/error-handler.ts` | Modify | Add generic `wrapHandler()` that adapts to any handler signature |
| `src/lib/error-handler.test.ts` | Modify | Add tests for `wrapHandler()` and the `withCSRF` + `withAuth` composition path |
| `src/app/api/*/route.ts` (all 96 files) | Modify | Remove manual try/catch, wrap exports with `withErrorHandler` |
| `src/app/error.tsx` | Modify | Add server-side error reporting |
| `src/app/global-error.tsx` | Modify | Add server-side error reporting |
| `src/app/api/error-report/route.ts` | Create | Endpoint for client-side error reporting |
| `docs/Security_Controls_Implementation_Status.md` | Modify | Mark ERR-01 as IMPLEMENTED |

---

## Task 1: Enhance `error-handler.ts` with generic wrapper

**Files:**
- Modify: `src/lib/error-handler.ts`
- Modify: `src/lib/error-handler.test.ts`

- [ ] **Step 1: Write failing tests for `wrapHandler()`**

Add these tests to `src/lib/error-handler.test.ts`:

```typescript
describe('wrapHandler', () => {
  it('wraps a simple handler and catches errors', async () => {
    const { wrapHandler } = await import('@/lib/error-handler');
    const handler = wrapHandler(async () => {
      throw new Error('boom');
    });
    const res = await handler(new Request('http://localhost/api/test'));
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INTERNAL_ERROR');
  });

  it('passes arguments through to the inner handler', async () => {
    const { wrapHandler } = await import('@/lib/error-handler');
    const inner = async (req: Request, ctx: { auth: { userId: string } }) => {
      return new NextResponse(JSON.stringify({ userId: ctx.auth.userId }), { status: 200 });
    };
    const handler = wrapHandler(inner);
    const req = new Request('http://localhost/api/test');
    const res = await handler(req, { auth: { userId: 'user-1' } });
    const body = await res.json();
    expect(body.userId).toBe('user-1');
  });

  it('returns AppError responses with correct status', async () => {
    const { wrapHandler, AppError } = await import('@/lib/error-handler');
    const handler = wrapHandler(async () => {
      throw new AppError('Not found', 404, 'NOT_FOUND');
    });
    const res = await handler(new Request('http://localhost/api/test'));
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.errorCode).toBe('NOT_FOUND');
  });

  it('works as outermost wrapper around composed middleware', async () => {
    const { wrapHandler, AppError } = await import('@/lib/error-handler');
    // Simulate withAuth-like middleware that throws
    const withFakeAuth = (handler: any) => async (req: Request) => {
      return handler(req, { auth: { userId: 'u1' } });
    };
    const inner = withFakeAuth(async (_req: Request, _ctx: any) => {
      throw new AppError('Forbidden', 403, 'FORBIDDEN');
    });
    const handler = wrapHandler(inner, 'test');
    const res = await handler(new Request('http://localhost/api/test'));
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.errorCode).toBe('FORBIDDEN');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/error-handler.test.ts --reporter=verbose`
Expected: FAIL — `wrapHandler` does not exist yet.

- [ ] **Step 3: Implement `wrapHandler()` in `error-handler.ts`**

Add this function after the existing `handleApiError` function (before the closing of the file):

```typescript
/**
 * Generic error-catching wrapper that adapts to any handler signature.
 * Catches errors from the inner handler AND any middleware that runs before it
 * (withAuth, withCSRF, etc.) since it's the outermost layer in the chain.
 *
 * Usage — wrap at the outermost level:
 *   export const GET = wrapHandler(withRateLimit(withAuth(async (req, { auth }) => {
 *     // ... handler logic — errors are caught automatically
 *   }), 'read'), 'employees');
 *
 * For unauthenticated routes:
 *   export const POST = wrapHandler(withRateLimit(async (req) => {
 *     // ...
 *   }, 'auth'), 'auth-login');
 */
export function wrapHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: string,
): T {
  return withErrorHandler(handler, context) as unknown as T;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/error-handler.test.ts --reporter=verbose`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/error-handler.ts src/lib/error-handler.test.ts
git commit -m "feat(security): add wrapHandler() generic error wrapper for ERR-01"
```

---

## Task 2: Apply centralized error handling to a representative route (employees)

**Files:**
- Modify: `src/app/api/employees/route.ts`

- [ ] **Step 1: Read the current file**

Read `src/app/api/employees/route.ts` fully to understand all exported handlers.

- [ ] **Step 2: Refactor to use `wrapHandler()`**

Replace the manual try/catch pattern. Example transformation for the GET handler:

**Before:**
```typescript
export const GET = withRateLimit(withAuth(async (request, { auth }) => {
  try {
    // ... handler logic ...
    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    logger.error({ err: error }, 'EMPLOYEES GET');
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}), 'read');
```

**After:**
```typescript
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  // ... handler logic (no try/catch needed) ...
  return NextResponse.json({ success: true, data: employees });
}), 'read'), 'employees');
```

`wrapHandler` goes outermost so it catches errors from `withAuth`, `withRateLimit`, AND the handler itself.
Apply the same transformation to all exported handlers (GET, POST, PUT, DELETE) in this file.

- [ ] **Step 3: Run typecheck to verify no type errors**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Run the dev server and verify the endpoint works**

Run: `npm run dev` in background, then test:
```bash
# Test that the endpoint returns properly (auth will block, but no 500 crash)
curl -s http://localhost:9002/api/employees | head -c 200
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/employees/route.ts
git commit -m "refactor(security): apply centralized error handling to employees API (ERR-01)"
```

---

## Task 3: Apply centralized error handling to auth routes

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/logout/route.ts`
- Modify: `src/app/api/auth/change-password/route.ts`
- Modify: `src/app/api/auth/forgot-password/route.ts`
- Modify: `src/app/api/auth/reset-password/route.ts`
- Modify: `src/app/api/auth/verify-otp/route.ts`
- Modify: `src/app/api/auth/verify-magic-link/route.ts`
- Modify: `src/app/api/auth/employee-login/route.ts`
- Modify: `src/app/api/auth/refresh-user-data/route.ts`

- [ ] **Step 1: Read each auth route file**

Read each file to identify the try/catch patterns and exported handlers.

- [ ] **Step 2: Apply `wrapHandler()` to all auth route handlers**

For each file:
1. Add `import { wrapHandler } from '@/lib/error-handler';`
2. Wrap the handler function with `wrapHandler()`
3. Remove the manual try/catch block
4. Keep business-logic error responses (e.g., "Invalid credentials" with status 401) — only remove the generic catch block

Example for `login/route.ts`:
```typescript
export const POST = wrapHandler(withRateLimit(async (request) => {
  const body = await request.json();
  const { username, password } = loginSchema.parse(body);
  // ... rest of login logic
  // Business errors (invalid credentials, MFA required, etc.) stay as explicit returns
}, 'auth'), 'auth-login');
```

Note: Login routes don't use `withAuth()` (they're unauthenticated), so `wrapHandler` wraps `withRateLimit(handler)` directly.
Also update the test to match the new signature.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/
git commit -m "refactor(security): apply centralized error handling to auth routes (ERR-01)"
```

---

## Task 4: Apply centralized error handling to all remaining API routes (batch 1 — promotions, confirmations, employees)

**Files:**
- Modify: All route files under `src/app/api/promotions/`
- Modify: All route files under `src/app/api/confirmations/`
- Modify: All route files under `src/app/api/confirmation-requests/`
- Modify: All route files under `src/app/api/employees/` (non-root routes)
- Modify: All route files under `src/app/api/complaints/`

- [ ] **Step 1: List all route files in these directories**

Run:
```bash
find src/app/api/promotions src/app/api/confirmations src/app/api/confirmation-requests src/app/api/employees src/app/api/complaints -name "route.ts" | sort
```

- [ ] **Step 2: Apply `wrapHandler()` to each route file**

For each file:
1. Add `import { wrapHandler } from '@/lib/error-handler';`
2. Wrap the handler function with `wrapHandler(handler, 'context-name')`
3. Remove the manual try/catch catch block
4. Keep any business-logic error returns (404s, 403s, validation errors)

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/promotions/ src/app/api/confirmations/ src/app/api/confirmation-requests/ src/app/api/employees/ src/app/api/complaints/
git commit -m "refactor(security): apply centralized error handling to promotions, confirmations, complaints (ERR-01)"
```

---

## Task 5: Apply centralized error handling to all remaining API routes (batch 2 — LWOP, retirement, resignation, service extension, cadre change)

**Files:**
- Modify: All route files under `src/app/api/lwop/` and `src/app/api/lwop-requests/`
- Modify: All route files under `src/app/api/retirement/` and `src/app/api/retirement-requests/`
- Modify: All route files under `src/app/api/resignation/`
- Modify: All route files under `src/app/api/service-extension/` and `src/app/api/service-extension-requests/`
- Modify: All route files under `src/app/api/cadre-change/`
- Modify: All route files under `src/app/api/termination/`

- [ ] **Step 1: List all route files**

Run:
```bash
find src/app/api/lwop src/app/api/lwop-requests src/app/api/retirement src/app/api/retirement-requests src/app/api/resignation src/app/api/service-extension src/app/api/service-extension-requests src/app/api/cadre-change src/app/api/termination -name "route.ts" | sort
```

- [ ] **Step 2: Apply `wrapHandler()` to each route file**

Same transformation as Task 4.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/lwop/ src/app/api/lwop-requests/ src/app/api/retirement/ src/app/api/retirement-requests/ src/app/api/resignation/ src/app/api/service-extension/ src/app/api/service-extension-requests/ src/app/api/cadre-change/ src/app/api/termination/
git commit -m "refactor(security): apply centralized error handling to HR workflow routes (ERR-01)"
```

---

## Task 6: Apply centralized error handling to remaining API routes (batch 3 — admin, dashboard, files, notifications, reports, users, misc)

**Files:**
- Modify: All route files under `src/app/api/admin/`
- Modify: All route files under `src/app/api/dashboard/`
- Modify: All route files under `src/app/api/files/`
- Modify: All route files under `src/app/api/notifications/`
- Modify: All route files under `src/app/api/reports/`
- Modify: All route files under `src/app/api/users/`
- Modify: All route files under `src/app/api/institutions/`
- Modify: All route files under `src/app/api/requests/`
- Modify: All remaining route files in `src/app/api/`

- [ ] **Step 1: List all remaining route files**

Run:
```bash
find src/app/api -name "route.ts" | sort
```

- [ ] **Step 2: Apply `wrapHandler()` to each route file**

Same transformation pattern. For files that already use `validateRequest()`, the ZodError is handled by `wrapHandler` automatically — remove the manual `if (error instanceof ZodError)` check.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/ src/app/api/dashboard/ src/app/api/files/ src/app/api/notifications/ src/app/api/reports/ src/app/api/users/ src/app/api/institutions/ src/app/api/requests/ src/app/api/
git commit -m "refactor(security): apply centralized error handling to remaining API routes (ERR-01)"
```

---

## Task 7: Create client-side error reporting endpoint

**Files:**
- Create: `src/app/api/error-report/route.ts`

- [ ] **Step 1: Write failing test**

Create `src/app/api/error-report/route.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('error-report API', () => {
  it('accepts valid error report payload', async () => {
    const { POST } = await import('@/app/api/error-report/route');
    const req = new Request('http://localhost/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Something went wrong',
        digest: 'abc123',
        url: '/dashboard',
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('rejects empty message', async () => {
    const { POST } = await import('@/app/api/error-report/route');
    const req = new Request('http://localhost/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/error-report/route.test.ts --reporter=verbose`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the endpoint**

Create `src/app/api/error-report/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const errorReportSchema = z.object({
  message: z.string().min(1).max(1000),
  digest: z.string().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = errorReportSchema.parse(body);

    logger.error(
      {
        clientError: true,
        message: parsed.message,
        digest: parsed.digest,
        url: parsed.url,
        userAgent: parsed.userAgent,
      },
      'Client-side error reported',
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid error report' },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/error-report/route.test.ts --reporter=verbose`
Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/error-report/
git commit -m "feat(security): add client-side error reporting endpoint (ERR-01)"
```

---

## Task 8: Enhance frontend error boundaries with server-side reporting

**Files:**
- Modify: `src/app/error.tsx`
- Modify: `src/app/global-error.tsx`

- [ ] **Step 1: Update `src/app/error.tsx`**

Replace the current content with server-reporting version:

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to server-side logging
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {
      // Silently fail — don't cascade errors from error reporting
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        An unexpected error occurred. Please try again or contact support if the problem persists.
      </p>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/global-error.tsx`**

Replace the current content:

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/app/error.tsx src/app/global-error.tsx
git commit -m "feat(security): add server-side error reporting to frontend error boundaries (ERR-01)"
```

---

## Task 9: Update Security Controls document

**Files:**
- Modify: `docs/Security_Controls_Implementation_Status.md`

- [ ] **Step 1: Update ERR-01 status**

Change the ERR-01 row from:
```
| ERR-01 | Trigger application error | **NOT IMPLEMENTED** | No centralized global error handler or error boundary. Each API route handles errors independently. No `error.tsx` in the Next.js app directory. Some individual routes do return generic messages (e.g., rate limiter returns generic "Too many requests"). |
```

To:
```
| ERR-01 | Trigger application error | **IMPLEMENTED** | `src/lib/error-handler.ts` — `wrapHandler()` wraps all 96 API routes. Catches AppError (safe to expose), ZodError (field-level), and unknown errors (generic message in production). `src/app/error.tsx` and `src/app/global-error.tsx` — Frontend error boundaries with server-side reporting via `/api/error-report`. All production 500 responses return generic "Internal Server Error" — no stack traces or internal details leaked. |
```

- [ ] **Step 2: Update the summary table**

Change the Error Handling row:
```
| Error Handling (ERR) | 3 | 2 | 0 | 1 |
```
To:
```
| Error Handling (ERR) | 3 | 3 | 0 | 0 |
```

And update the totals:
```
| **TOTAL** | **59** | **53** | **0** | **6** |
```
To:
```
| **TOTAL** | **59** | **54** | **0** | **5** |
```

And the implementation rate:
```
**Overall Implementation Rate: 90% (53/59 fully implemented)**
```
To:
```
**Overall Implementation Rate: 92% (54/59 fully implemented)**
```

- [ ] **Step 3: Update recommendations**

Remove the ERR-01 recommendation from "High Priority (Not Implemented)" section.

- [ ] **Step 4: Commit**

```bash
git add docs/Security_Controls_Implementation_Status.md
git commit -m "docs: mark ERR-01 as implemented in security controls status"
```

---

## Task 10: Run full test suite and typecheck

- [ ] **Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 2: Run unit tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Build the application**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(security): address test/lint/build issues from ERR-01 implementation"
```

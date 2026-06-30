# Secure Cookie-Based Auth — Remove localStorage Persistence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all auth data from `localStorage`, make the backend the single source of truth via a new `GET /api/auth/me` endpoint backed by the signed `session` cookie, and stop returning password hashes to any client API.

**Architecture:** The backend already uses an HttpOnly, HMAC-signed `session` cookie validated by `verifyAuth`/`withAuth` against the DB `Session` table (with IP/UA binding). This plan keeps that and (a) adds `/api/auth/me` returning only UI-safe fields, (b) deletes the redundant unsigned `auth-storage` cookie, (c) strips `passwordHistory`/password-policy fields from client-facing auth responses, and (d) makes the frontend Zustand store in-memory only, hydrated from `/auth/me` on every page load. CSRF keeps its existing double-submit-cookie pattern.

**Tech Stack:** Next.js 14 App Router API routes, Prisma (PostgreSQL), Zustand, Vitest (jsdom, globals enabled, setup at `test/setup.ts`), `@/` path alias → `./src/*`.

**Spec:** `docs/superpowers/specs/2026-06-30-secure-auth-cookie-refactor-design.md`

**Test env note:** `test/setup.ts` already sets `process.env.SESSION_SECRET` and `process.env.CSRF_SECRET`. `vitest.config.ts` has `globals: true`, `environment: 'jsdom'`, `mockReset: true`. Run a single test file with `npx vitest run <path>` (the `npm test` script is `vitest` in watch mode — always use `npx vitest run` in plan steps).

**Conventions for every commit:** end the message with a trailing line `Co-Authored-By: Claude <noreply@anthropic.com>`. Do NOT stage `dump.rdb` or `.well-known/` files — stage only the files each task lists.

---

## File Structure

- **Create** `src/lib/auth-me.ts` — `getMePayload(userId)` DB-backed helper returning the UI-safe `/auth/me` payload (no password fields). One responsibility: shape + fetch the safe payload.
- **Create** `src/app/api/auth/me/route.ts` — `GET /api/auth/me`, `withAuth`-protected, returns `getMePayload` or 401, `no-store`.
- **Create** `src/lib/auth-me.test.ts` — unit tests for `getMePayload`.
- **Create** `src/app/api/auth/me/route.test.ts` — integration test for the route via mocked `session-manager` + `db` (mirrors `src/lib/api-auth.test.ts`).
- **Modify** `src/lib/auth-helpers.ts` — delete the unsigned `auth-storage` cookie set in `completeLogin`.
- **Modify** `src/app/api/auth/refresh-user-data/route.ts` — route through `verifyAuth`; strip `passwordHistory`/password-policy fields; keep `no-store`.
- **Modify** `src/app/api/auth/session/route.ts` — route through `verifyAuth` via `getMePayload`; drop `auth-storage` cookie parsing.
- **Modify** `src/app/api/auth/logout/route.ts` — drop `auth-storage` cookie-clear (keep `session` + `csrf-token` clearing).
- **Modify** `src/lib/api-client.ts` — remove localStorage token storage, `Authorization` header, 401→refresh flow; keep CSRF header + `credentials: 'include'`.
- **Modify** `src/store/auth-store.ts` — remove `persist` middleware; drop `accessToken`/`refreshToken`/`sessionToken`/`csrfToken` state; `initializeAuth` hydrates from `/auth/me`; `refreshUserData` → `/auth/me`; `logout` reset in-memory only.
- **Modify** `src/hooks/use-api-init.ts` — remove localStorage token init + refresh-token interval.
- **Modify** `src/hooks/use-auth.ts` — handle async hydration (`isLoading` until `/auth/me` resolves).
- **Modify** `src/store/auth-provider.tsx` — drive `initializeAuth` and gate render on hydration-done.
- **Modify** `src/store/auth-store.test.ts` (create) — no `auth-storage` localStorage key written; hydration from `/auth/me`.
- **Modify** `src/lib/api-client.test.ts` (create) — no `Authorization` header; no localStorage token writes.

---

### Task 1: `getMePayload` UI-safe helper

**Files:**
- Create: `src/lib/auth-me.ts`
- Test: `src/lib/auth-me.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth-me.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMePayload, type MePayload } from './auth-me';

const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

const FULL_USER = {
  id: 'u1',
  username: 'ymrajab',
  name: 'Yussuf Mzee Rajab',
  email: 'yussuf.rajab@zanajira.go.tz',
  role: 'Admin',
  active: true,
  employeeId: null,
  institutionId: 'inst-1',
  createdAt: new Date('2025-08-10T04:26:50.826Z'),
  updatedAt: new Date('2026-06-30T02:59:41.551Z'),
  password: 'SHOULD-NOT-LEAK',
  passwordHistory: ['hash-1', 'hash-2'],
  isTemporaryPassword: false,
  temporaryPasswordExpiry: null,
  mustChangePassword: false,
  lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
  failedPasswordChangeAttempts: 0,
  passwordChangeLockoutUntil: null,
  loginLockedUntil: null,
};

describe('getMePayload', () => {
  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns null when the user is not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await getMePayload('missing');
    expect(result).toBeNull();
    expect(mockInstitutionFindUnique).not.toHaveBeenCalled();
  });

  it('returns UI-safe fields and never password/passwordHistory/lockout', async () => {
    mockUserFindUnique.mockResolvedValue(FULL_USER);
    mockInstitutionFindUnique.mockResolvedValue({ name: 'TUME YA UTUMISHI SERIKALINI' });

    const result = (await getMePayload('u1')) as MePayload;

    expect(result).not.toBeNull();
    expect(result).toEqual({
      id: 'u1',
      username: 'ymrajab',
      name: 'Yussuf Mzee Rajab',
      role: 'Admin',
      active: true,
      employeeId: null,
      institutionId: 'inst-1',
      institutionName: 'TUME YA UTUMISHI SERIKALINI',
      mustChangePassword: false,
      isTemporaryPassword: false,
      temporaryPasswordExpiry: null,
      lastPasswordChange: '2026-05-14T07:51:39.477Z',
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('passwordHistory');
    expect(serialized).not.toContain('failedPasswordChangeAttempts');
    expect(serialized).not.toContain('passwordChangeLockoutUntil');
    expect(serialized).not.toContain('loginLocked');
  });

  it('selects only safe columns from the DB (no password column)', async () => {
    mockUserFindUnique.mockResolvedValue(FULL_USER);
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });
    await getMePayload('u1');
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: expect.objectContaining({
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        employeeId: true,
        institutionId: true,
        isTemporaryPassword: true,
        temporaryPasswordExpiry: true,
        mustChangePassword: true,
        lastPasswordChange: true,
      }),
    });
    const selectArg = mockUserFindUnique.mock.calls[0][0].select;
    expect(selectArg.password).toBeUndefined();
    expect(selectArg.passwordHistory).toBeUndefined();
  });

  it('handles a user with no institution', async () => {
    mockUserFindUnique.mockResolvedValue({ ...FULL_USER, institutionId: null });
    const result = (await getMePayload('u1')) as MePayload;
    expect(result.institutionId).toBeNull();
    expect(result.institutionName).toBeNull();
    expect(mockInstitutionFindUnique).not.toHaveBeenCalled();
  });

  it('coerces Date fields to ISO strings', async () => {
    mockUserFindUnique.mockResolvedValue({
      ...FULL_USER,
      lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
      temporaryPasswordExpiry: new Date('2026-07-01T00:00:00.000Z'),
    });
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });
    const result = (await getMePayload('u1')) as MePayload;
    expect(result.lastPasswordChange).toBe('2026-05-14T07:51:39.477Z');
    expect(result.temporaryPasswordExpiry).toBe('2026-07-01T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth-me.test.ts`
Expected: FAIL — `Cannot find module './auth-me'` (or import error).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/auth-me.ts`:

```ts
import { db } from '@/lib/db';

/**
 * UI-safe payload returned by GET /api/auth/me and the session endpoint.
 *
 * Deliberately EXCLUDES: password, passwordHistory, failedPasswordChangeAttempts,
 * passwordChangeLockoutUntil, loginLocked*, lockoutNotes, passwordExpiresAt, etc.
 * Those fields must never reach the browser.
 */
export interface MePayload {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
  employeeId: string | null;
  institutionId: string | null;
  institutionName: string | null;
  mustChangePassword: boolean;
  isTemporaryPassword: boolean;
  temporaryPasswordExpiry: string | null;
  lastPasswordChange: string | null;
}

function toISO(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

/**
 * Fetch the UI-safe user payload for /auth/me. Returns null if the user does
 * not exist. Performs its own DB lookup with an explicit safe `select` so no
 * password column is ever read.
 */
export async function getMePayload(userId: string): Promise<MePayload | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      employeeId: true,
      institutionId: true,
      isTemporaryPassword: true,
      temporaryPasswordExpiry: true,
      mustChangePassword: true,
      lastPasswordChange: true,
    },
  });

  if (!user) return null;

  let institutionName: string | null = null;
  if (user.institutionId) {
    const institution = await db.institution.findUnique({
      where: { id: user.institutionId },
      select: { name: true },
    });
    institutionName = institution?.name ?? null;
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    active: user.active,
    employeeId: user.employeeId ?? null,
    institutionId: user.institutionId ?? null,
    institutionName,
    mustChangePassword: user.mustChangePassword ?? false,
    isTemporaryPassword: user.isTemporaryPassword ?? false,
    temporaryPasswordExpiry: toISO(user.temporaryPasswordExpiry),
    lastPasswordChange: toISO(user.lastPasswordChange),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth-me.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-me.ts src/lib/auth-me.test.ts
git commit -m "feat(auth): add getMePayload UI-safe /auth/me helper

Returns only UI-safe user fields; selects no password column so
passwordHistory/hashes can never reach the client.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: `GET /api/auth/me` route

**Files:**
- Create: `src/app/api/auth/me/route.ts`
- Test: `src/app/api/auth/me/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/auth/me/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const expiry = Date.now() + 86400000;
    const payload = `${token}.${expiry}`;
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(payload);
    return `${payload}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 3) return null;
      const [token, expiryStr, provided] = parts;
      const expiry = Number(expiryStr);
      if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(`${token}.${expiryStr}`);
      const expected = hmac.digest('base64');
      const a = Buffer.from(provided, 'base64');
      const b = Buffer.from(expected, 'base64');
      if (a.length !== b.length) return null;
      return timingSafeEqual(a, b) ? token : null;
    } catch {
      return null;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
}));

const SAFE_USER = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1',
  isTemporaryPassword: false, temporaryPasswordExpiry: null,
  mustChangePassword: false, lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
};

function authedRequest(): NextRequest {
  return new NextRequest('http://localhost:9002/api/auth/me', {
    headers: {
      cookie: `session=${signSessionToken('good-token')}`,
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
  });
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns 401 when no session cookie is present', async () => {
    const { GET } = await import('./route');
    const req = new NextRequest('http://localhost:9002/api/auth/me');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.clone().json();
    expect(body.success).toBe(false);
  });

  it('returns the UI-safe payload with no password fields', async () => {
    // verifyAuth's lookup (select subset) vs getMePayload's lookup (select name) — branch on select.name
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0' });
    mockUserFindUnique.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
      Promise.resolve(select?.name ? SAFE_USER : { id: 'u1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'ymrajab' })
    );
    mockInstitutionFindUnique.mockResolvedValue({ name: 'TUME YA UTUMISHI SERIKALINI' });

    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    const body = await res.clone().json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      id: 'u1', username: 'ymrajab', name: 'Yussuf', role: 'Admin', active: true,
      employeeId: null, institutionId: 'inst-1',
      institutionName: 'TUME YA UTUMISHI SERIKALINI',
      mustChangePassword: false, isTemporaryPassword: false,
      temporaryPasswordExpiry: null, lastPasswordChange: '2026-05-14T07:51:39.477Z',
    });
    const serialized = JSON.stringify(body.data);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('passwordHistory');
  });

  it('returns 401 when the session is invalid', async () => {
    mockValidateSession.mockResolvedValue(null);
    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/auth/me/route.test.ts`
Expected: FAIL — `Cannot find module './route'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/api/auth/me/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { getMePayload } from '@/lib/auth-me';
import { wrapHandler } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/auth/me — backend source of truth for client auth hydration.
 *
 * Authenticated via the signed `session` cookie (HttpOnly) through withAuth.
 * Returns only UI-safe user fields; never password hashes or password history.
 * The client calls this on page load instead of trusting persisted state.
 */
export const GET = wrapHandler(
  withAuth(async (_request: NextRequest, { auth }) => {
    const payload = await getMePayload(auth.userId);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'User not found', errorCode: 'INVALID_SESSION' },
        { status: 401 }
      );
    }
    const response = NextResponse.json({ success: true, data: payload });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }),
  'auth-me'
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/auth/me/route.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/me/route.ts src/app/api/auth/me/route.test.ts
git commit -m "feat(auth): add GET /api/auth/me endpoint (signed-session, UI-safe)

Backend source of truth for client hydration. withAuth-protected via the
HttpOnly signed session cookie; returns only UI-safe fields, no password
history. no-store.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Drop the unsigned `auth-storage` cookie in `completeLogin`

**Files:**
- Modify: `src/lib/auth-helpers.ts` (the `auth-storage` cookie set block, ~lines 214–229)

- [ ] **Step 1: Read the target block to confirm exact text**

Run: `grep -n "auth-storage" src/lib/auth-helpers.ts`
Expected: shows the `const authCookieValue = JSON.stringify({...})` block and the `response.cookies.set('auth-storage', ...)` call around lines 214–229.

- [ ] **Step 2: Remove the unsigned cookie set**

In `src/lib/auth-helpers.ts`, delete the block:

```ts
  // Set auth cookie server-side with httpOnly and Secure flags
  const authCookieValue = JSON.stringify({
    userId: user.id,
    role: user.role,
    username: user.username,
    institutionId: user.institutionId,
    isAuthenticated: true,
  });

  response.cookies.set('auth-storage', authCookieValue, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
```

Leave the signed `session` cookie set and the pre-session cookie clear untouched.

- [ ] **Step 3: Verify no remaining auth-storage reference in this file**

Run: `grep -n "auth-storage" src/lib/auth-helpers.ts`
Expected: no matches.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: no new errors in `src/lib/auth-helpers.ts` (the `isProduction` variable is still used by the session/pre-session cookies above, so no unused-var error).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-helpers.ts
git commit -m "refactor(auth): drop unsigned auth-storage cookie from completeLogin

Identity is authoritative only via the signed HttpOnly session cookie
validated by verifyAuth. The redundant unsigned auth-storage cookie is
removed so no forgeable identity path remains.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Strip sensitive fields from `/api/auth/refresh-user-data` and route via `verifyAuth`

**Files:**
- Modify: `src/app/api/auth/refresh-user-data/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/auth/refresh-user-data/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const expiry = Date.now() + 86400000;
    const payload = `${token}.${expiry}`;
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(payload);
    return `${payload}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 3) return null;
      const [token, expiryStr, provided] = parts;
      const expiry = Number(expiryStr);
      if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(`${token}.${expiryStr}`);
      const expected = hmac.digest('base64');
      const a = Buffer.from(provided, 'base64');
      const b = Buffer.from(expected, 'base64');
      if (a.length !== b.length) return null;
      return timingSafeEqual(a, b) ? token : null;
    } catch {
      return null;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
}));

const SAFE_USER = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1',
  isTemporaryPassword: false, temporaryPasswordExpiry: null,
  mustChangePassword: false, lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
};

function authedRequest(): NextRequest {
  return new NextRequest('http://localhost:9002/api/auth/refresh-user-data', {
    headers: {
      cookie: `session=${signSessionToken('good-token')}`,
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
    },
  });
}

describe('GET /api/auth/refresh-user-data', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns 401 with no session cookie', async () => {
    const { GET } = await import('./route');
    const res = await GET(new NextRequest('http://localhost:9002/api/auth/refresh-user-data'));
    expect(res.status).toBe(401);
  });

  it('returns UI-safe data and never passwordHistory', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0' });
    mockUserFindUnique.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
      Promise.resolve(select?.name ? SAFE_USER : { id: 'u1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'ymrajab' })
    );
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });

    const { GET } = await import('./route');
    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.success).toBe(true);
    const serialized = JSON.stringify(body.data);
    expect(serialized).not.toContain('passwordHistory');
    expect(serialized).not.toContain('passwordChangeLockoutUntil');
    expect(serialized).not.toContain('failedPasswordChangeAttempts');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/auth/refresh-user-data/route.test.ts`
Expected: FAIL — the old route reads the unsigned `auth-storage` cookie and returns `passwordHistory`, so the "never passwordHistory" assertion fails (or 401 path differs).

- [ ] **Step 3: Rewrite the route to use `verifyAuth` + `getMePayload`**

Replace the entire contents of `src/app/api/auth/refresh-user-data/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { getMePayload } from '@/lib/auth-me';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Refresh User Data API
 *
 * Returns the latest UI-safe user data from the database. Authenticated via
 * the signed `session` cookie (verifyAuth) — not the legacy auth-storage
 * cookie. Returns no password hashes or password history. Clients should
 * prefer GET /api/auth/me; this route is kept for compatibility and delegates
 * to the same safe payload.
 */
export const GET = wrapHandler(async (request: NextRequest) => {
  const authResult = await verifyAuth(request);
  if (!authResult.authenticated) {
    const response = NextResponse.json(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  const payload = await getMePayload(authResult.context!.userId);
  if (!payload) {
    authLogger.warn({ userId: authResult.context!.userId }, 'refresh-user-data: user not found');
    const response = NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    );
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  const response = NextResponse.json({ success: true, data: payload });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}, 'auth-refresh-user-data');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/auth/refresh-user-data/route.test.ts`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/refresh-user-data/route.ts src/app/api/auth/refresh-user-data/route.test.ts
git commit -m "fix(auth): refresh-user-data via signed session, strip passwordHistory

Route through verifyAuth (signed session cookie) instead of the unsigned
auth-storage cookie, and return only UI-safe fields via getMePayload so
password hashes/history are never sent to the client.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Route `/api/auth/session` through `verifyAuth` + `getMePayload`

**Files:**
- Modify: `src/app/api/auth/session/route.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/auth/session/route.test.ts` (same mock scaffold as Task 4, different URL/expectations):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { signSessionToken } from '@/lib/session-manager';

const mockValidateSession = vi.fn();
const mockUserFindUnique = vi.fn();
const mockInstitutionFindUnique = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...a: any[]) => mockValidateSession(...a),
  markSessionSuspicious: vi.fn(),
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const expiry = Date.now() + 86400000;
    const payload = `${token}.${expiry}`;
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(payload);
    return `${payload}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 3) return null;
      const [token, expiryStr, provided] = parts;
      const expiry = Number(expiryStr);
      if (!Number.isFinite(expiry) || Date.now() > expiry) return null;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(`${token}.${expiryStr}`);
      const expected = hmac.digest('base64');
      const a = Buffer.from(provided, 'base64');
      const b = Buffer.from(expected, 'base64');
      if (a.length !== b.length) return null;
      return timingSafeEqual(a, b) ? token : null;
    } catch {
      return null;
    }
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: any[]) => mockUserFindUnique(...a) },
    institution: { findUnique: (...a: any[]) => mockInstitutionFindUnique(...a) },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
}));

const SAFE_USER = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1',
  isTemporaryPassword: false, temporaryPasswordExpiry: null,
  mustChangePassword: false, lastPasswordChange: new Date('2026-05-14T07:51:39.477Z'),
};

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockUserFindUnique.mockReset();
    mockInstitutionFindUnique.mockReset();
  });

  it('returns isAuthenticated:false when no session cookie', async () => {
    const { GET } = await import('./route');
    const res = await GET(new NextRequest('http://localhost:9002/api/auth/session'));
    expect(res.status).toBe(200);
    const body = await res.clone().json();
    expect(body.data.isAuthenticated).toBe(false);
  });

  it('returns isAuthenticated:true with UI-safe payload when authed', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'u1', ipAddress: '10.0.0.1', userAgent: 'TestAgent/1.0' });
    mockUserFindUnique.mockImplementation(({ select }: { select: Record<string, boolean> }) =>
      Promise.resolve(select?.name ? SAFE_USER : { id: 'u1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'ymrajab' })
    );
    mockInstitutionFindUnique.mockResolvedValue({ name: 'Inst' });

    const { GET } = await import('./route');
    const res = await GET(new NextRequest('http://localhost:9002/api/auth/session', {
      headers: {
        cookie: `session=${signSessionToken('good-token')}`,
        'x-forwarded-for': '10.0.0.1',
        'user-agent': 'TestAgent/1.0',
      },
    }));
    const body = await res.clone().json();
    expect(body.data.isAuthenticated).toBe(true);
    expect(body.data.id).toBe('u1');
    expect(JSON.stringify(body.data)).not.toContain('passwordHistory');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/auth/session/route.test.ts`
Expected: FAIL — old route reads the `auth-storage` cookie; with no such cookie it returns `isAuthenticated:false` even when a valid `session` cookie is present (second test fails).

- [ ] **Step 3: Rewrite the route**

Replace the entire contents of `src/app/api/auth/session/route.ts` with:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { getMePayload } from '@/lib/auth-me';
import { wrapHandler } from '@/lib/error-handler';

/**
 * Session endpoint — backend source of truth for client hydration.
 *
 * Authenticated via the signed `session` cookie (verifyAuth). Returns a
 * UI-safe payload (no password fields) or isAuthenticated:false. The legacy
 * auth-storage cookie is no longer read.
 */
export const GET = wrapHandler(async (request: NextRequest) => {
  const authResult = await verifyAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json({
      success: true,
      data: { isAuthenticated: false },
    });
  }

  const payload = await getMePayload(authResult.context!.userId);
  if (!payload) {
    return NextResponse.json({
      success: true,
      data: { isAuthenticated: false },
    });
  }

  return NextResponse.json({
    success: true,
    data: { isAuthenticated: true, ...payload },
  });
}, 'auth-session');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/auth/session/route.test.ts`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/session/route.ts src/app/api/auth/session/route.test.ts
git commit -m "refactor(auth): /api/auth/session via signed session + getMePayload

Drop auth-storage cookie parsing; authenticate via verifyAuth and return
the UI-safe payload. No password fields exposed.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Audit auth/user API responses for password-field leakage

**Files:**
- Potentially modify: any route under `src/app/api/auth/` or `src/app/api/users/` that returns `passwordHistory` / `password`.

- [ ] **Step 1: Find leakage sites**

Run:

```bash
grep -rn "passwordHistory" src/app/api | grep -v ".test."
grep -rn "select:" src/app/api/auth src/app/api/users 2>/dev/null | grep -i "password"
grep -rn "password:" src/app/api/auth src/app/api/users 2>/dev/null | grep -v ".test." | grep -iv "change\|reset\|verify\|update\|newPassword\|currentPassword\|confirmPassword\|tempPassword"
```

Expected: surfaces `src/app/api/auth/refresh-user-data/route.ts` (already fixed in Task 4) and any user-list / user-detail routes that spread a full user row into a response.

- [ ] **Step 2: Inspect each hit**

For every hit that returns a user object to the client (not a route that *accepts* a password input like change-password), open the file and confirm whether `passwordHistory`/`password` reaches the JSON response. Document findings in the commit message.

- [ ] **Step 3: Strip leakage (per file)**

For each leaking route, replace any `{ ...user }` / `select` that includes `password`/`passwordHistory` with an explicit safe `select` (mirror the field list in `getMePayload`'s select, plus only what that route's clients need), and delete `passwordHistory`/`password`/`failedPasswordChangeAttempts`/`passwordChangeLockoutUntil`/`loginLocked*` from the response body. If a route already uses an explicit safe select and does not include those fields, no change is needed — note it and move on.

- [ ] **Step 4: Verify no auth API returns passwordHistory**

Run:

```bash
grep -rn "passwordHistory" src/app/api | grep -v ".test."
```

Expected: no matches in non-test files (the DB schema column may still be referenced in `src/lib/*` for password-change validation — that is server-side and allowed; this check scopes to `src/app/api`).

- [ ] **Step 5: Run affected tests + typecheck**

Run: `npx vitest run src/app/api/auth && npm run typecheck`
Expected: PASS, no new type errors.

- [ ] **Step 6: Commit**

```bash
git add <each modified route file>
git commit -m "fix(auth): strip passwordHistory/password from auth API responses

Audit of auth/user API routes; remove password hashes and password-policy
fields from any client-facing response so they cannot leak to the browser.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If Step 1 finds no leaking routes beyond the one fixed in Task 4, skip the code edit and instead commit a no-op note: `git commit --allow-empty -m "chore(auth): audit confirms no further passwordHistory leakage in src/app/api"`.)

---

### Task 7: `apiClient` — remove localStorage tokens, Bearer header, refresh flow

**Files:**
- Modify: `src/lib/api-client.ts`
- Test: `src/lib/api-client.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/api-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './api-client';

describe('ApiClient auth transport', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not read or write accessToken in localStorage on construction', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem');
    // Trigger a fresh request path that reads state
    apiClient.clearToken();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    // setToken must not persist to localStorage
    apiClient.setToken('whatever');
    expect(localStorage.getItem('accessToken')).toBeNull();
    // getItem spy may still be called by other code; assert no accessToken key written
    expect(spy).not.toHaveBeenCalledWith('accessToken');
  });

  it('sends no Authorization header on requests (cookie-based auth)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    await apiClient.get('/ping');
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Authorization')).toBe(false);
    expect(init?.credentials).toBe('include');
  });

  it('clearToken does not throw and leaves localStorage empty', () => {
    expect(() => apiClient.clearToken()).not.toThrow();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/api-client.test.ts`
Expected: FAIL — `setToken` currently writes `localStorage.setItem('accessToken', ...)` and the constructor reads `localStorage.getItem('accessToken')`; the Authorization-header test also fails because the request adds `Bearer`.

- [ ] **Step 3: Edit `src/lib/api-client.ts`**

3a. Replace the constructor body (lines ~146–161) so it no longer reads `accessToken` from localStorage:

```ts
  constructor() {
    // Client-side: relative path so requests hit Next.js API routes and the
    // HttpOnly session cookie is sent automatically (credentials: 'include').
    // Server-side: direct backend URL.
    this.baseURL =
      typeof window !== 'undefined'
        ? '/api'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  }
```

3b. In `request<T>`, remove the block that builds the `Authorization` header from `localStorage.getItem('accessToken')` (lines ~175–182). Keep the CSRF header block (lines ~184–209) and `x-device-info` block exactly as-is.

3c. Replace the 401-handling block (lines ~218–278) with a simple clear-and-logout:

```ts
      // 401 on a non-auth route means the session is gone/expired. There is no
      // refresh token in the session-cookie model — clear local auth state and
      // let the caller / route guard redirect to /login.
      if (
        response.status === 401 &&
        endpoint !== '/auth/login' &&
        endpoint !== '/auth/refresh'
      ) {
        clientLogger.info({ endpoint }, '401 Unauthorized, clearing auth');
        this.clearToken();
        if (typeof window !== 'undefined') {
          import('@/store/auth-store').then(({ useAuthStore }) => {
            useAuthStore.getState().logout();
          });
        }
        return { success: false, message: 'Authentication failed', code: 'UNAUTHENTICATED' };
      }
```

3d. Replace `setToken` / `clearToken` with no-op-storage versions:

```ts
  /** No-op storage kept for API compatibility. Auth is cookie-based. */
  setToken(_token: string) {
    this.token = null;
  }

  clearToken() {
    this.token = null;
  }
```

3e. Delete the `refreshToken(...)` method and `setDevelopmentUser()` method (no longer used — session-based auth has no refresh token; verify with the grep in Step 4 before deleting).

- [ ] **Step 4: Confirm no remaining callers of removed methods**

Run:

```bash
grep -rn "apiClient.refreshToken\|\.refreshToken(" src --include="*.ts" --include="*.tsx" | grep -v ".test."
grep -rn "setDevelopmentUser" src --include="*.ts" --include="*.tsx" | grep -v ".test."
grep -rn "localStorage.getItem('accessToken')\|localStorage.getItem('refreshToken')\|localStorage.setItem('accessToken')\|localStorage.setItem('refreshToken')" src --include="*.ts" --include="*.tsx" | grep -v ".test."
```

Expected: no matches outside `src/lib/api-client.ts` itself (and after the edit, none inside it either). If `refreshToken`/`setDevelopmentUser` still have callers, do NOT delete them in 3e — instead leave them but make `refreshToken` call `clearToken()` + return failure, and note it in the commit.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/api-client.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-client.ts src/lib/api-client.test.ts
git commit -m "refactor(auth): apiClient cookie-only transport, drop localStorage tokens

Remove accessToken/refreshToken localStorage read/write, the Authorization
Bearer header, and the 401->refresh-token retry flow. Auth rides the
HttpOnly session cookie via credentials:'include'. CSRF header unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: `auth-store` — remove `persist`, hydrate from `/auth/me`

**Files:**
- Modify: `src/store/auth-store.ts`
- Test: `src/store/auth-store.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/store/auth-store.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './auth-store';

const ME_PAYLOAD = {
  id: 'u1', username: 'ymrajab', name: 'Yussuf', role: 'Admin', active: true,
  employeeId: null, institutionId: 'inst-1', institutionName: 'TUME YA UTUMISHI SERIKALINI',
  mustChangePassword: false, isTemporaryPassword: false,
  temporaryPasswordExpiry: null, lastPasswordChange: '2026-05-14T07:51:39.477Z',
};

describe('auth-store persistence + hydration', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      user: null, role: null, isAuthenticated: false,
      accessToken: null, refreshToken: null, sessionToken: null, csrfToken: null,
    });
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does NOT write an auth-storage key to localStorage after login sets state', () => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Yussuf', username: 'ymrajab', role: 'Admin', active: true, institutionId: 'inst-1' } as any,
      role: 'Admin',
      isAuthenticated: true,
    });
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });

  it('initializeAuth hydrates authenticated state from /api/auth/me', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: ME_PAYLOAD }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('u1');
    expect(state.role).toBe('Admin');
    expect(state.user?.institutionName).toBe('TUME YA UTUMISHI SERIKALINI');
    expect(state.csrfToken).toBeUndefined();
    expect(localStorage.getItem('auth-storage')).toBeNull();
  });

  it('initializeAuth clears auth state on 401 from /api/auth/me', async () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'stale' } as any, role: 'Admin' });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401 }));

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.role).toBeNull();
  });

  it('initializeAuth clears a leftover legacy auth-storage localStorage key', async () => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user: { id: 'old' } } }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 401 }));

    await useAuthStore.getState().initializeAuth();

    expect(localStorage.getItem('auth-storage')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/auth-store.test.ts`
Expected: FAIL — the store currently uses `persist` (so `localStorage.getItem('auth-storage')` is non-null after `setState`), and `initializeAuth` reads persisted state rather than fetching `/auth/me`.

- [ ] **Step 3: Rewrite `src/store/auth-store.ts`**

Replace the entire file with:

```ts
import { create } from 'zustand';
import type { User, Role } from '@/lib/types';
import { apiClient } from '@/lib/api-client';
import { clientLogger } from '@/lib/logger-client';

const log = clientLogger.child({ component: 'auth-store' });

/**
 * UI-safe auth state held IN MEMORY only. Nothing is persisted to localStorage.
 * The backend is the source of truth: state is hydrated from GET /api/auth/me
 * on page load. The session credential lives only in the HttpOnly `session`
 * cookie, which JavaScript cannot read.
 *
 * The CSRF token is intentionally NOT stored here — apiClient reads it from
 * the `csrf-token` cookie (double-submit pattern) when making state-changing
 * requests.
 */
interface SafeUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  employeeId?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  mustChangePassword?: boolean;
  isTemporaryPassword?: boolean;
  temporaryPasswordExpiry?: string | null;
  lastPasswordChange?: string | null;
}

interface AuthState {
  user: SafeUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  setUserManually: (user: User) => void;
  initializeAuth: () => Promise<void>;
  refreshUserData: () => Promise<boolean>;
}

function toSafeUser(payload: any): SafeUser {
  return {
    id: payload.id,
    name: payload.name,
    username: payload.username,
    role: payload.role as Role,
    active: payload.active,
    employeeId: payload.employeeId ?? null,
    institutionId: payload.institutionId ?? null,
    institutionName: payload.institutionName ?? null,
    mustChangePassword: payload.mustChangePassword ?? false,
    isTemporaryPassword: payload.isTemporaryPassword ?? false,
    temporaryPasswordExpiry: payload.temporaryPasswordExpiry ?? null,
    lastPasswordChange: payload.lastPasswordChange ?? null,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    try {
      log.info({ username }, 'Login start');
      const response = await apiClient.login(username, password);

      if (response.code === 'SESSION_LIMIT_REACHED') {
        const error: any = new Error('SESSION_LIMIT_REACHED');
        error.activeSessions = response.data?.activeSessions || [];
        error.userId = response.data?.userId;
        throw error;
      }

      if (response.code === 'MFA_REQUIRED') {
        const mfaError: any = new Error('MFA_REQUIRED');
        mfaError.userId = response.data?.userId;
        mfaError.email = response.data?.email;
        throw mfaError;
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Login failed');
      }

      // The backend login response carries a user object for immediate render.
      // Extract it (the response is double-wrapped) and set in-memory state.
      const backendResponse = response.data;
      let authData = null;
      if (backendResponse?.data?.data) {
        authData = backendResponse.data.data;
      } else if (backendResponse?.data && (backendResponse.data.token || backendResponse.data.user)) {
        authData = backendResponse.data;
      } else if (backendResponse?.token || backendResponse?.user) {
        authData = backendResponse;
      }

      const userData = authData?.user;
      if (!userData || !userData.id || !userData.username || !userData.role) {
        log.error('Missing required user fields in login response');
        return null;
      }

      const user: User = {
        id: userData.id,
        name: userData.fullName || userData.name || userData.username,
        username: userData.username,
        password: '',
        role: userData.role as Role,
        active: userData.isEnabled !== undefined ? userData.isEnabled : userData.active !== undefined ? userData.active : true,
        employeeId: userData.employeeId,
        institutionId: userData.institutionId,
        institution: userData.institutionName ? { name: userData.institutionName } : userData.institution,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.lastLoginDate ? new Date(userData.lastLoginDate) : new Date(),
        mustChangePassword: userData.mustChangePassword,
        isTemporaryPassword: userData.isTemporaryPassword,
        temporaryPasswordExpiry: userData.temporaryPasswordExpiry ?? null,
      };

      set({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          active: user.active,
          employeeId: user.employeeId,
          institutionId: user.institutionId,
          institutionName: userData.institutionName ?? null,
          mustChangePassword: user.mustChangePassword,
          isTemporaryPassword: user.isTemporaryPassword,
          temporaryPasswordExpiry: user.temporaryPasswordExpiry,
          lastPasswordChange: null,
        },
        role: user.role,
        isAuthenticated: true,
      });

      // Nothing persisted. /auth/me remains the source of truth on reload.
      return user;
    } catch (error) {
      log.error({ err: error }, 'Login error');
      throw error;
    }
  },

  logout: async () => {
    try {
      const currentUserId = get().user?.id;
      await apiClient.logout(currentUserId);
    } catch (error) {
      log.error({ err: error }, 'Logout error');
    } finally {
      apiClient.clearToken();
      set({ user: null, role: null, isAuthenticated: false });
    }
  },

  setUserManually: (user: User) => {
    set({ user: toSafeUser(user), role: user.role, isAuthenticated: true });
  },

  initializeAuth: async () => {
    // One-time migration: clear any leftover localStorage from the old
    // persist-based design so stale sensitive data is gone immediately.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
    }

    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (response.status === 401) {
        set({ user: null, role: null, isAuthenticated: false });
        return;
      }

      if (!response.ok) {
        log.error({ status: response.status }, 'initializeAuth: /auth/me failed');
        set({ user: null, role: null, isAuthenticated: false });
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        set({
          user: toSafeUser(result.data),
          role: result.data.role as Role,
          isAuthenticated: true,
        });
        log.info({ userId: result.data.id, role: result.data.role }, 'Auth state hydrated from /auth/me');
        return;
      }

      set({ user: null, role: null, isAuthenticated: false });
    } catch (error) {
      log.error({ err: error }, 'initializeAuth error');
      set({ user: null, role: null, isAuthenticated: false });
    }
  },

  refreshUserData: async () => {
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      if (!response.ok) {
        log.error({ status: response.status }, 'refreshUserData failed');
        return false;
      }
      const result = await response.json();
      if (result.success && result.data) {
        set({ user: toSafeUser(result.data), role: result.data.role as Role });
        return true;
      }
      return false;
    } catch (error) {
      log.error({ err: error }, 'refreshUserData error');
      return false;
    }
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/auth-store.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/store/auth-store.ts src/store/auth-store.test.ts
git commit -m "refactor(auth): auth-store in-memory only, hydrate from /auth/me

Remove Zustand persist middleware (no localStorage). Drop accessToken,
refreshToken, sessionToken, csrfToken from state. initializeAuth and
refreshUserData fetch UI-safe data from GET /api/auth/me. Clears legacy
auth-storage localStorage key on load.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Wire async hydration into `auth-provider`, `use-auth`, `use-api-init`

**Files:**
- Modify: `src/store/auth-provider.tsx`
- Modify: `src/hooks/use-auth.ts`
- Modify: `src/hooks/use-api-init.ts`

- [ ] **Step 1: Read current consumers to avoid breaking them**

Run:

```bash
grep -rn "refreshAuthToken\|updateTokenFromApiClient\|getCSRFToken\|sessionToken\|csrfToken" src --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v "src/store/auth-store.ts" | grep -v "src/lib/api-client.ts"
```

Expected: surfaces any external caller of the removed store methods. If hits exist outside the three files in this task, those callers must be updated too (remove the call — the methods no longer exist). Note them for Step 4.

- [ ] **Step 2: Rewrite `src/store/auth-provider.tsx`**

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from './auth-store';
import { useApiInit } from '@/hooks/use-api-init';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [hydrated, setHydrated] = useState(false);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useApiInit();

  useEffect(() => {
    // Hydrate auth state from the backend (GET /api/auth/me) on first load.
    // Nothing is read from localStorage — the backend is the source of truth.
    let cancelled = false;
    initializeAuth().finally(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initializeAuth]);

  if (!hydrated) {
    return null;
  }

  return <>{children}</>;
};
```

- [ ] **Step 3: Rewrite `src/hooks/use-auth.ts`**

```ts
'use client';
import { useAuthStore } from '@/store/auth-store';
import { useEffect, useState } from 'react';
import type { User, Role } from '@/lib/types';

interface AuthHookState {
  user: User | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  isLoading: boolean;
}

export const useAuth = (): AuthHookState => {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logoutStore = useAuthStore((s) => s.logout);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // AuthProvider drives initializeAuth(); once mounted, hydration is done.
    setIsLoading(false);
  }, []);

  return {
    user: (user as unknown as User) ?? null,
    role,
    isAuthenticated,
    login,
    logout: () => logoutStore(),
    isLoading,
  };
};
```

- [ ] **Step 4: Rewrite `src/hooks/use-api-init.ts`**

```ts
/**
 * Hook retained for apiClient access. Token bootstrap and refresh-token
 * polling were removed with the move to cookie-based sessions (no JWT, no
 * refresh token). The HttpOnly session cookie is sent automatically.
 */
import { useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export function useApiInit() {
  useEffect(() => {
    // No localStorage token to bootstrap; nothing to poll.
  }, []);
  return apiClient;
}
```

If Step 1 found external callers of removed store methods, update each to delete that call now.

- [ ] **Step 5: Run typecheck + relevant tests**

Run: `npm run typecheck && npx vitest run src/store/auth-store.test.ts src/lib/api-client.test.ts`
Expected: no new type errors; tests still PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store/auth-provider.tsx src/hooks/use-auth.ts src/hooks/use-api-init.ts <any extra caller files from Step 1>
git commit -m "refactor(auth): wire async /auth/me hydration into providers/hooks

AuthProvider calls initializeAuth() (fetch /auth/me) and gates render on
hydration. use-auth drops synchronous localStorage assumptions. use-api-init
drops localStorage token bootstrap and refresh-token polling.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Logout route — stop clearing the now-removed `auth-storage` cookie

**Files:**
- Modify: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Remove the auth-storage cookie-clear block**

In `src/app/api/auth/logout/route.ts`, delete:

```ts
  // Clear the auth-storage cookie
  response.cookies.set('auth-storage', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
```

Keep the `session` cookie clear (`SESSION_COOKIE_NAME`) — that is the real credential. Also clear the `csrf-token` cookie so it does not outlive the session:

```ts
  // Clear the CSRF cookie (double-submit token) alongside the session.
  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
```

(Add the csrf-token clear right after the session cookie clear. `isProduction` is already defined above in this file.)

- [ ] **Step 2: Verify no auth-storage reference remains in the route**

Run: `grep -n "auth-storage" src/app/api/auth/logout/route.ts`
Expected: no matches.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "refactor(auth): logout clears session + csrf cookies only

The unsigned auth-storage cookie no longer exists (set nowhere, read
nowhere). Clear the signed session cookie and the csrf-token cookie on
logout.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Full verification

- [ ] **Step 1: Run the whole auth + store + client test suite**

Run: `npx vitest run src/lib/auth-me.test.ts src/app/api/auth/me/route.test.ts src/app/api/auth/refresh-user-data/route.test.ts src/app/api/auth/session/route.test.ts src/lib/api-auth.test.ts src/lib/api-client.test.ts src/store/auth-store.test.ts`
Expected: all PASS.

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --run` (or `npx vitest run`)
Expected: no regressions. If a pre-existing unrelated test fails, note it but do not block on it unless it is in auth/store/client code touched by this plan.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: no new errors/warnings in files this plan touched.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds (CLAUDE.md notes TS/ESLint warnings are ignored during builds, so this is a smoke check for runtime/import errors).

- [ ] **Step 5: Manual runtime verification**

Run: `npm run dev` (port 9002). In the browser (Chrome DevTools MCP or manual):

1. Log in as `ymrajab`.
2. Open DevTools → Application → Local Storage → http://localhost:9002. Assert there is **no** `auth-storage` key, no `accessToken`, no `refreshToken`. (A `csrf-token` cookie may exist but must not be in localStorage.)
3. DevTools → Application → Cookies. Assert a `session` cookie exists with `HttpOnly: true`, `Secure` (in prod), `SameSite: Strict`. Assert it is **not** readable via `document.cookie` (run `document.cookie` in the console — `session` must not appear).
4. Run in console: `localStorage.getItem("auth-storage")` → expect `null`. `JSON.parse(...)` of any user payload → confirm no `passwordHistory`.
5. Reload the page. Assert the dashboard still renders (state hydrated from `/auth/me`).
6. Log out. Assert the `session` cookie is removed and the app redirects to `/login`.
7. Network tab: confirm a `GET /api/auth/me` 200 on load, and that its response body contains no `passwordHistory`.

- [ ] **Step 6: Final commit (if any verification fixups)**

If Steps 1–5 required fixups, commit them:

```bash
git add <fixup files>
git commit -m "fix(auth): verification fixups for secure cookie auth

Co-Authored-By: Claude <noreply@anthropic.com>"
```

If no fixups, no commit needed.

---

## Self-Review

**Spec coverage:**
- §1 `/auth/me` → Task 2 (+ helper Task 1). ✓
- §2 store de-persistence + `/auth/me` hydration + drop vestigial fields → Task 8. ✓
- §3 apiClient cleanup → Task 7. ✓
- §4 backend hardening: drop unsigned cookie (Task 3), refresh-user-data strip+verifyAuth (Task 4), session via verifyAuth (Task 5), response audit (Task 6). ✓
- §5 XSS impact → covered by removing all JS-reachable auth data + HttpOnly session cookie (Tasks 3, 7, 8). ✓
- §6 testing → Tasks 1,2,4,5,7,8 tests + Task 11 full suite + manual. ✓
- Logout cookie update (spec §3 `logout()`) → Task 10. ✓

**Placeholder scan:** Steps contain concrete code and exact commands. Task 6 is inherently discovery-driven (audit) but provides exact grep commands and a decision rule; the empty-commit fallback is explicit. No "TBD"/"handle edge cases" phrasing.

**Type consistency:** `MePayload` (Task 1) is consumed by Tasks 2, 4, 5 with the same field names. `SafeUser` (Task 8) mirrors `MePayload` fields. `getMePayload(userId: string)` signature consistent across all callers. Removed store methods (`refreshAuthToken`, `updateTokenFromApiClient`, `getCSRFToken`, `sessionToken`, `csrfToken`) — Task 9 Step 1 greps for external callers to catch dangling references before deletion.
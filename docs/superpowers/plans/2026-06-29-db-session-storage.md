# DB Session Storage (HttpOnly Cookie) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage `sessionToken` with a dedicated HttpOnly `session` cookie validated against the DB `Session` table on every authenticated request, and make the session row's `userId` the authoritative identity (not the client-controlled `auth-storage` cookie).

**Architecture:** A new `session` HttpOnly cookie carries the 32-byte `sessionToken`. `verifyAuth` reads it, calls `validateSession()` (existing), and derives `userId`/`role` from the DB — ignoring `auth-storage`'s `userId`. The `auth-storage` cookie remains only as an edge-middleware role hint. Logout reads the `session` cookie server-side. The client never receives or stores `sessionToken`.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), Zustand, Vitest. Existing infra: `Session` model (`prisma/schema.prisma:445`), `session-manager.ts` (`createSession`/`validateSession`/`terminateSession`/`terminateSessionById`), `completeLogin()` in `src/lib/auth-helpers.ts`.

**Spec:** `docs/superpowers/specs/2026-06-29-db-session-storage-design.md`

**Decisions (from brainstorming):** fixed 24h expiry (no sliding), `SameSite=Strict`, force re-login on deploy (no graceful bridge), minimal cleanup (stop persisting vestigial tokens; keep fields in code).

---

## File map

- **Modify** `src/lib/session-manager.ts` — add `SESSION_COOKIE_NAME` + `getSessionCookieOptions`.
- **Modify** `src/lib/api-auth.ts` — rewrite `verifyAuth` to use the `session` cookie + `validateSession`.
- **Modify** `src/lib/auth-helpers.ts` — `completeLogin` sets the `session` cookie, drops `sessionToken` from JSON.
- **Modify** `src/app/api/auth/logout/route.ts` — read `session` cookie, terminate, clear both cookies.
- **Modify** `src/store/auth-store.ts` — `partialize` stops persisting tokens; `login`/`logout` stop using `sessionToken`.
- **Modify** `src/lib/api-client.ts` — `logout` drops the `sessionToken` parameter.
- **Modify** `middleware.ts` — require `session` cookie presence on `/dashboard` routes.
- **Modify** `src/components/auth/employee-login-form.tsx` — stop storing `sessionToken` / setting `auth-storage` cookie client-side.
- **Modify** `src/components/auth/mfa-verify-form.tsx` — same.
- **Modify** `src/app/(auth)/mfa/magic-link-confirm/page.tsx` — same.
- **Modify** `src/app/api/auth/sessions/route.ts` — POST `terminate` uses `sessionId`; drop the `validate` action.
- **Rewrite** `src/lib/api-auth.test.ts` — cover the new cookie/session validation path.
- **Extend** `src/lib/session-manager.test.ts` — cover `getSessionCookieOptions`.

---

## Task 1: Add session cookie constants and options helper

**Files:**
- Modify: `src/lib/session-manager.ts` (after `getPreSessionCookieOptions`, ~line 46)
- Test: `src/lib/session-manager.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/session-manager.test.ts` (update the import block at top to include `SESSION_COOKIE_NAME`, `getSessionCookieOptions`):

```ts
import {
  // ...existing imports...
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from './session-manager';
```

Add a new `describe` block at the end of the outer `describe('session-manager', ...)` (before its closing `});`):

```ts
  describe('Session cookie', () => {
    it('exposes the session cookie name', () => {
      expect(SESSION_COOKIE_NAME).toBe('session');
    });

    it('returns HttpOnly, Strict, path=/ cookie options in production', () => {
      const opts = getSessionCookieOptions(true);
      expect(opts).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_EXPIRY_MS / 1000,
      });
    });

    it('returns non-secure cookie options in dev', () => {
      const opts = getSessionCookieOptions(false);
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(false);
      expect(opts.sameSite).toBe('strict');
      expect(opts.path).toBe('/');
      expect(opts.maxAge).toBe(SESSION_EXPIRY_MS / 1000);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/session-manager.test.ts`
Expected: FAIL — `SESSION_COOKIE_NAME` / `getSessionCookieOptions` are not exported.

- [ ] **Step 3: Add the constant and helper**

In `src/lib/session-manager.ts`, add immediately after the `getPreSessionCookieOptions` function (after line ~46):

```ts
/**
 * Name of the HttpOnly cookie that carries the DB session token.
 */
export const SESSION_COOKIE_NAME = 'session';

/**
 * Cookie options for the session token cookie.
 * httpOnly: true so the token is never readable by JavaScript (XSS defense).
 * sameSite: 'strict' so the cookie is not sent on cross-site requests.
 * maxAge matches SESSION_EXPIRY_MS so the cookie and DB row expire together.
 */
export function getSessionCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_EXPIRY_MS / 1000,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/session-manager.test.ts`
Expected: PASS (all existing + new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/session-manager.ts src/lib/session-manager.test.ts
git commit -m "feat(session): add SESSION_COOKIE_NAME and cookie options helper"
```

---

## Task 2: Rewrite verifyAuth to validate the DB session via the `session` cookie

**Files:**
- Modify: `src/lib/api-auth.ts`
- Rewrite: `src/lib/api-auth.test.ts`

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `src/lib/api-auth.test.ts` with:

```ts
/**
 * Unit tests for src/lib/api-auth.ts
 *
 * verifyAuth reads the HttpOnly `session` cookie, validates it against the DB
 * via validateSession, and derives userId/role from the session row + User
 * table — never from the client-controlled auth-storage cookie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, withAuth } from './api-auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockValidateSession = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...args: any[]) => mockValidateSession(...args),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequestWithSessionCookie(sessionToken?: string): NextRequest {
  const url = 'http://localhost:9002/api/test';
  if (sessionToken === undefined) return new NextRequest(url);
  return new NextRequest(url, {
    headers: { cookie: `session=${sessionToken}` },
  });
}

async function responseBody(response: NextResponse): Promise<any> {
  return response.clone().json();
}

// ---------------------------------------------------------------------------
// verifyAuth
// ---------------------------------------------------------------------------

describe('verifyAuth', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockFindUnique.mockReset();
  });

  it('returns UNAUTHENTICATED (401) when no session cookie is present', async () => {
    const req = new NextRequest('http://localhost:9002/api/test');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    expect(result.response!.status).toBe(401);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('UNAUTHENTICATED');
  });

  it('returns INVALID_SESSION (401) when validateSession returns null', async () => {
    mockValidateSession.mockResolvedValue(null);
    const req = makeRequestWithSessionCookie('forged-or-expired');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns INVALID_SESSION when the DB user lookup returns null', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);
    const req = makeRequestWithSessionCookie('good-token');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns INVALID_SESSION when the user is inactive', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: false, role: 'Admin', institutionId: null, username: 'admin' });
    const req = makeRequestWithSessionCookie('good-token');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns authenticated context derived from the session row + DB user', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'hro1' });
    const req = makeRequestWithSessionCookie('good-token');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context).toEqual({
      userId: 'user-1',
      role: 'HRO',
      institutionId: 'inst-1',
      username: 'hro1',
    });
    // User lookup must use the session row's userId, not any cookie value.
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, active: true, role: true, institutionId: true, username: true },
    });
  });

  it('uses the session userId even when an auth-storage cookie claims a different user', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'real-user', User: { id: 'real-user' } });
    mockFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === 'real-user'
          ? { id: 'real-user', active: true, role: 'EMPLOYEE', institutionId: null, username: 'real' }
          : null
      )
    );
    // Tampered auth-storage cookie claims userId='attacker-target'; session cookie is the real one.
    const req = new NextRequest('http://localhost:9002/api/test', {
      headers: { cookie: 'session=good-token; auth-storage=' + encodeURIComponent(JSON.stringify({ userId: 'attacker-target', role: 'Admin' })) },
    });
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context!.userId).toBe('real-user');
    expect(result.context!.role).toBe('EMPLOYEE');
  });

  it('returns INVALID_SESSION when validateSession throws', async () => {
    mockValidateSession.mockRejectedValue(new Error('DB down'));
    const req = makeRequestWithSessionCookie('good-token');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns INVALID_SESSION when the user lookup throws', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockRejectedValue(new Error('DB down'));
    const req = makeRequestWithSessionCookie('good-token');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('supports plain Request objects by parsing the cookie header', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'Admin', institutionId: null, username: 'admin' });
    const req = new Request('http://localhost:9002/api/test', {
      headers: { cookie: 'session=good-token' },
    });
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context!.userId).toBe('user-1');
  });
});

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

describe('withAuth', () => {
  beforeEach(() => {
    mockValidateSession.mockReset();
    mockFindUnique.mockReset();
  });

  it('calls the handler with the DB-derived auth context', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'User', institutionId: null, username: 'user' });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);
    const req = makeRequestWithSessionCookie('good-token');

    await wrapped(req);

    expect(handler).toHaveBeenCalledWith(req, {
      auth: { userId: 'user-1', role: 'User', institutionId: null, username: 'user' },
    });
  });

  it('returns 403 FORBIDDEN when the DB role is not in allowedRoles', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'User', institutionId: null, username: 'user' });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler, { allowedRoles: ['Admin'] });
    const req = makeRequestWithSessionCookie('good-token');

    const response = await wrapped(req);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    const body = await response.clone().json();
    expect(body.errorCode).toBe('FORBIDDEN');
  });

  it('matches allowedRoles case-insensitively', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'a1', User: { id: 'a1' } });
    mockFindUnique.mockResolvedValue({ id: 'a1', active: true, role: 'Admin', institutionId: 'inst-1', username: 'admin' });

    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler, { allowedRoles: ['ADMIN'] });
    const req = makeRequestWithSessionCookie('good-token');

    const response = await wrapped(req);

    expect(handler).toHaveBeenCalledOnce();
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it('returns 401 when no session cookie is present', async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withAuth(handler);
    const req = new NextRequest('http://localhost:9002/api/test');

    const response = await wrapped(req);

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/api-auth.test.ts`
Expected: FAIL — `verifyAuth` still reads `auth-storage`, so the new session-cookie expectations fail.

- [ ] **Step 3: Rewrite verifyAuth**

Replace the body of `verifyAuth` in `src/lib/api-auth.ts` (lines 86-161) with:

```ts
export async function verifyAuth(
  request: NextRequest | Request
): Promise<AuthResult> {
  // 1. Read the `session` cookie (HttpOnly) -------------------------------
  let sessionToken: string | undefined;

  if (request instanceof NextRequest) {
    sessionToken = request.cookies.get('session')?.value;
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/session=([^;]+)/);
      if (match) {
        sessionToken = match[1];
      }
    }
  }

  if (!sessionToken) {
    return unauthenticated();
  }

  // 2. Validate the session against the DB ---------------------------------
  const { validateSession } = await import('@/lib/session-manager');
  let session: Awaited<ReturnType<typeof validateSession>>;
  try {
    session = await validateSession(sessionToken);
  } catch (error) {
    authLogger.error({ err: error }, 'Session validation failed');
    return invalidSession();
  }

  if (!session) {
    return invalidSession();
  }

  // 3. Look up the user by the SESSION's userId (authoritative) -----------
  const userId = session.userId;

  let user: { id: string; active: boolean; role: string; institutionId: string | null; username: string } | null;
  try {
    user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, active: true, role: true, institutionId: true, username: true },
    });

    if (!user || !user.active) {
      return invalidSession();
    }
  } catch (error) {
    authLogger.error({ err: error }, 'Database error during auth verification');
    return invalidSession();
  }

  // 4. Success -------------------------------------------------------------
  return {
    authenticated: true,
    context: {
      userId: user.id,
      role: user.role,
      institutionId: user.institutionId ?? null,
      username: user.username,
    },
  };
}
```

Also update the file-top doc comment to reflect the new behavior:

```ts
/**
 * API Authentication Wrapper
 *
 * Provides verifyAuth() and withAuth() for protecting Next.js API routes.
 * Reads the session token from the HttpOnly `session` cookie, validates it
 * against the DB Session table via validateSession(), then looks up the User
 * by the session row's userId. The client-controlled `auth-storage` cookie is
 * NOT used for identity — only the DB session row is authoritative.
 */
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api-auth.test.ts`
Expected: PASS (all new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-auth.ts src/lib/api-auth.test.ts
git commit -m "feat(security): verifyAuth validates DB session via session cookie (FIX 4)"
```

---

## Task 3: Set the `session` cookie in completeLogin and stop returning sessionToken in JSON

**Files:**
- Modify: `src/lib/auth-helpers.ts`

- [ ] **Step 1: Update imports**

In `src/lib/auth-helpers.ts`, update the import from `@/lib/session-manager` (lines 5-10) to also bring in `SESSION_COOKIE_NAME` and `getSessionCookieOptions`:

```ts
import {
  createSession,
  checkSessionLimit,
  cleanupExpiredSessions,
  PRE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/session-manager';
```

- [ ] **Step 2: Set the session cookie and drop sessionToken from the JSON body**

In `completeLogin`, replace the response-building block (lines 189-199) with:

```ts
  const response = NextResponse.json({
    success: true,
    data: {
      ...authData,
    },
    passwordStatus,
    csrfToken: signedCSRFToken,
    message: 'Login successful',
  });

  // Set CSRF token cookie (readable by JS for double-submit pattern)
  response.cookies.set(CSRF_COOKIE_NAME, signedCSRFToken, csrfCookieOptions);

  // Set the HttpOnly session cookie carrying the DB session token.
  // The client never receives this token; the browser sends it automatically.
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(
    SESSION_COOKIE_NAME,
    session.sessionToken,
    getSessionCookieOptions(isProduction)
  );

  // Set auth cookie server-side with httpOnly and Secure flags
  const authCookieValue = JSON.stringify({
    userId: user.id,
    role: user.role,
    username: user.username,
    institutionId: user.institutionId,
    isAuthenticated: true,
  });
```

(The `response.cookies.set('auth-storage', authCookieValue, { ... })` call at lines 214-220 stays unchanged. The pre-session cookie clear at 222-229 stays unchanged.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS — no new errors introduced by removing `sessionToken` from the response payload (it was an extra field, not referenced by the type).

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth-helpers.ts
git commit -m "feat(security): set HttpOnly session cookie; stop returning sessionToken in login JSON (FIX 1, 3)"
```

---

## Task 4: Logout reads the session cookie server-side and clears both cookies

**Files:**
- Modify: `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Rewrite the logout route**

Replace the entire contents of `src/app/api/auth/logout/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clearUserActivity } from '@/lib/session-timeout-utils';
import {
  terminateSession,
  terminateAllUserSessions,
  SESSION_COOKIE_NAME,
} from '@/lib/session-manager';
import {
  logAuditEvent,
  AuditEventType,
  AuditEventCategory,
  AuditSeverity,
  getClientIp,
} from '@/lib/audit-logger';
import { authLogger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';

function readSessionToken(req: Request): string | undefined {
  if (req instanceof NextRequest) {
    return req.cookies.get(SESSION_COOKIE_NAME)?.value;
  }
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : undefined;
}

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  const logoutAll = body?.logoutAll === true;

  const sessionToken = readSessionToken(req);

  authLogger.info({
    userId,
    hasSessionToken: !!sessionToken,
    logoutAll,
  }, 'Logout request');

  if (logoutAll && userId) {
    const count = await terminateAllUserSessions(userId);
    authLogger.info({ userId, count }, 'Terminated all sessions');
  } else if (sessionToken) {
    const success = await terminateSession(sessionToken);
    if (!success) {
      authLogger.warn('Failed to terminate session (may already be deleted)');
    }
  } else {
    authLogger.warn('No session cookie or userId provided for logout');
  }

  if (userId) {
    await clearUserActivity(userId);
  }

  if (userId) {
    await logAuditEvent({
      eventType: AuditEventType.LOGOUT,
      eventCategory: AuditEventCategory.AUTHENTICATION,
      severity: AuditSeverity.INFO,
      userId,
      username: null,
      userRole: null,
      ipAddress: getClientIp(req.headers),
      deviceInfo: JSON.parse(req.headers.get('x-device-info') || 'null'),
      attemptedRoute: '/api/auth/logout',
      requestMethod: 'POST',
      isAuthenticated: true,
      wasBlocked: false,
      blockReason: null,
      additionalData: { logoutAll },
    }).catch(() => {});
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear the session cookie
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  // Clear the auth-storage cookie
  response.cookies.set('auth-storage', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });

  return response;
}, 'auth-logout');
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/logout/route.ts
git commit -m "feat(security): logout reads session cookie server-side and clears both cookies"
```

---

## Task 5: Stop persisting tokens in the Zustand auth store

**Files:**
- Modify: `src/store/auth-store.ts`

- [ ] **Step 1: Remove token fields from partialize**

In `src/store/auth-store.ts`, replace the `persistedState` object inside `partialize` (lines 496-504) with:

```ts
        const persistedState = {
          user: serializableUser,
          role: state.role,
          isAuthenticated: state.isAuthenticated,
          csrfToken: state.csrfToken,
        };
```

(`accessToken`, `refreshToken`, `sessionToken` are no longer persisted to localStorage.)

- [ ] **Step 2: Stop extracting/storing sessionToken in login()**

In the `login` function, remove the block that extracts the session token (lines 205-211):

```ts
          // Extract session token from backend response (check both locations)
          const sessionToken =
            backendResponse?.sessionToken ||
            backendResponse?.data?.sessionToken ||
            (response as any).sessionToken ||
            null;
          log.info({ hasSessionToken: !!sessionToken }, 'Session token extracted');
```

And in the `set({ ... })` call (lines 217-225), remove the `sessionToken: sessionToken,` line, leaving:

```ts
          set({
            user,
            role: userRole,
            isAuthenticated: true,
            accessToken: token || null,
            refreshToken: refreshToken || null,
            csrfToken: csrfToken,
          });
```

- [ ] **Step 3: Update logout() to stop sending sessionToken**

In the `logout` function, replace lines 243-261 so they no longer read/send `sessionToken` and no longer clear token localStorage keys:

```ts
      logout: async () => {
        try {
          const currentUserId = get().user?.id;
          await apiClient.logout(currentUserId);
        } catch (error) {
          log.error({ err: error }, 'Logout error');
        } finally {
          apiClient.clearToken();
          clearAuthCookie();
          if (typeof window !== 'undefined') {
            document.cookie =
              'csrf-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
          set({
            user: null,
            role: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
            sessionToken: null,
            csrfToken: null,
          });
        }
      },
```

- [ ] **Step 4: Remove token localStorage cleanup from initializeAuth()**

In `initializeAuth`, remove the `localStorage.removeItem('accessToken')` / `removeItem('refreshToken')` lines inside the inconsistent-state branch (lines 342-345), leaving:

```ts
          clearAuthCookie();
          set({ user: null, role: null, isAuthenticated: false });
          return;
```

- [ ] **Step 5: Remove localStorage writes from refreshAuthToken() and updateTokenFromApiClient()**

In `refreshAuthToken`, remove the block (lines 306-309):

```ts
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newAccessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
          }
```

In `updateTokenFromApiClient`, remove (lines 385-387):

```ts
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', newAccessToken);
        }
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/store/auth-store.ts
git commit -m "feat(security): stop persisting sessionToken/accessToken/refreshToken in localStorage (FIX 1)"
```

---

## Task 6: api-client.logout drops the sessionToken parameter

**Files:**
- Modify: `src/lib/api-client.ts`

- [ ] **Step 1: Update the logout method**

In `src/lib/api-client.ts`, replace the `logout` method (lines 397-407) with:

```ts
  async logout(userId?: string, logoutAll: boolean = false): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ userId, logoutAll }),
    });
    this.clearToken();
    return result;
  }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (The auth-store logout call site `apiClient.logout(currentUserId)` from Task 5 still matches the signature — `logoutAll` defaults to false.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "refactor(auth): api-client.logout no longer sends sessionToken in body"
```

---

## Task 7: Middleware requires the session cookie on dashboard routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Add the session-cookie presence check**

In `middleware.ts`, inside the `if (pathname.startsWith('/dashboard'))` block, after `const { role, isAuthenticated, userId } = parseAuthStorage(authCookie);` (line 275), add a session-cookie presence check. Replace lines 274-275 with:

```ts
    const authCookie = request.cookies.get('auth-storage')?.value;
    const sessionCookie = request.cookies.get('session')?.value;
    const { role, isAuthenticated, userId } = parseAuthStorage(authCookie);

    // After the DB-session rollout, a valid login always sets a `session`
    // cookie. A stale auth-storage-only cookie (from before the rollout) must
    // not reach a dashboard page — require the session cookie too.
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
```

(The existing `if (!isAuthenticated || !userId)` check below stays as a secondary guard.)

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(security): middleware requires session cookie on dashboard routes"
```

---

## Task 8: Client login/MFA forms stop storing sessionToken and setting auth-storage cookie

**Files:**
- Modify: `src/components/auth/employee-login-form.tsx`
- Modify: `src/components/auth/mfa-verify-form.tsx`
- Modify: `src/app/(auth)/mfa/magic-link-confirm/page.tsx`

The server (`completeLogin`) now sets both the `session` and `auth-storage` cookies in its `Set-Cookie` headers. The client only needs to populate the Zustand store with `user`, `role`, `isAuthenticated`, `csrfToken` and redirect. It must NOT store `sessionToken` or write the `auth-storage` cookie itself.

- [ ] **Step 1: Update EmployeeLoginForm**

In `src/components/auth/employee-login-form.tsx`, replace lines 88-116 (from `const userData = result.user || result.data?.user;` through the `document.cookie = \`auth-storage=...\`;` line) with:

```tsx
        const userData = result.user || result.data?.user;
        const csrfToken = result.csrfToken || result.data?.csrfToken || null;

        useAuthStore.setState({
          user: userData,
          role: userData?.role,
          isAuthenticated: true,
          csrfToken: csrfToken,
          accessToken: null,
          refreshToken: null,
          sessionToken: null,
        });

        // The server sets the `session` and `auth-storage` HttpOnly cookies
        // via Set-Cookie headers in completeLogin(). No client-side cookie
        // writes needed.
```

The existing `toast(...)` and `router.push('/dashboard/profile')` that follow (lines 118-124) stay unchanged. The `const sessionToken = ...` line and the entire `document.cookie = 'auth-storage=...'` block are removed by this replacement.

- [ ] **Step 2: Update MfaVerifyForm**

In `src/components/auth/mfa-verify-form.tsx`, replace lines 117-148 (from the `// MFA verified — set auth state from the login response` comment through the `document.cookie = \`auth-storage=...\`;` line) with:

```tsx
      // MFA verified — set auth state from the login response
      const authData = result.data;
      const userData = authData?.user;
      const csrfToken = result.csrfToken;

      if (userData) {
        useAuthStore.setState({
          user: {
            ...userData,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
            updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
          },
          role: userData.role,
          isAuthenticated: true,
          csrfToken: csrfToken || null,
          accessToken: null,
          refreshToken: null,
          sessionToken: null,
        });

        // The server sets the `session` and `auth-storage` HttpOnly cookies
        // via Set-Cookie headers in completeLogin(). No client-side cookie
        // writes needed.
```

The `if (userData) {` block continues with the existing password-change check, toast, and `router.push(...)` (lines 150+), which stay unchanged. The `const sessionToken = result.sessionToken;` line and the `document.cookie = 'auth-storage=...'` block are removed by this replacement.

- [ ] **Step 3: Update the magic-link-confirm page**

In `src/app/(auth)/mfa/magic-link-confirm/page.tsx`, replace lines 56-86 (from the `// MFA verified — set auth state` comment through the `document.cookie = \`auth-storage=...\`;` line) with:

```tsx
      // MFA verified — set auth state
      const authData = result.data;
      const userData = authData?.user;
      const csrfToken = result.csrfToken;

      if (userData) {
        useAuthStore.setState({
          user: {
            ...userData,
            createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
            updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
          },
          role: userData.role,
          isAuthenticated: true,
          csrfToken: csrfToken || null,
          accessToken: null,
          refreshToken: null,
          sessionToken: null,
        });

        // The server sets the `session` and `auth-storage` HttpOnly cookies
        // via Set-Cookie headers in completeLogin(). No client-side cookie
        // writes needed.
```

The `if (userData) {` block continues with the existing password-change check, toast, and `router.push(...)` (lines 88+), which stay unchanged. The `const sessionToken = result.sessionToken;` line and the `document.cookie = 'auth-storage=...'` block are removed by this replacement.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/employee-login-form.tsx src/components/auth/mfa-verify-form.tsx "src/app/(auth)/mfa/magic-link-confirm/page.tsx"
git commit -m "feat(security): client login/MFA forms stop storing sessionToken and writing auth-storage cookie"
```

---

## Task 9: /api/auth/sessions POST terminate uses sessionId; drop validate action

The client no longer has a `sessionToken` to send. The GET endpoint already returns `sessionId` (the session row's `id`) alongside the masked token, so termination switches to `sessionId` using the existing `terminateSessionById(sessionId, userId)` helper. The `validate` action had no remaining client caller (the client can't supply a token) and is removed.

**Files:**
- Modify: `src/app/api/auth/sessions/route.ts`

- [ ] **Step 1: Rewrite the POST handler**

In `src/app/api/auth/sessions/route.ts`, replace the schema definitions (lines 18-24) and the entire `POST` export (lines 54-115) with:

```ts
const terminateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

// ...GET stays unchanged...

/**
 * POST /api/auth/sessions?action=terminate
 * Terminate one of the caller's own sessions by sessionId.
 */
export const POST = wrapHandler(withRateLimit(
  withAuth(async (request, { auth }) => {
      const body = await request.json();
      const { searchParams } = new URL(request.url);
      const action = searchParams.get('action');

      if (action === 'terminate') {
        const { sessionId } = terminateSessionSchema.parse(body);

        // terminateSessionById verifies the session belongs to auth.userId,
        // so a user can only terminate their own sessions.
        const { terminateSessionById } = await import('@/lib/session-manager');
        const success = await terminateSessionById(sessionId, auth.userId);

        if (!success) {
          return NextResponse.json(
            { success: false, message: 'Failed to terminate session' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Session terminated successfully',
        });
      }

      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
  }),
  'write'
), 'auth-sessions');
```

Remove the now-unused `validateSessionSchema` and the `validateSession` import from the top import block (line 5) if it becomes unused. Keep `getUserActiveSessions`, `terminateSession` only if still referenced — after this change `terminateSession` is no longer used here, so remove it from the import as well. The final import block:

```ts
import {
  getUserActiveSessions,
  terminateSessionById,
} from '@/lib/session-manager';
```

(Remove the dynamic `import('@/lib/session-manager')` inside the handler since `terminateSessionById` is now imported at the top.)

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/sessions/route.ts
git commit -m "refactor(auth): sessions terminate uses sessionId instead of client-supplied sessionToken"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: PASS — including the rewritten `api-auth.test.ts` and extended `session-manager.test.ts`.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual verification in the browser**

1. `npm run dev` (port 9002).
2. Log in as an HR officer. Open DevTools → Application → Cookies → `localhost:9002`. Confirm:
   - A `session` cookie exists, HttpOnly=true, SameSite=Strict.
   - `auth-storage` exists, HttpOnly=true.
   - In Application → Local Storage, the `auth-storage` key contains `{"state":{"user":...,"role":...,"isAuthenticated":true,"csrfToken":...}}` with NO `sessionToken`, `accessToken`, or `refreshToken` fields.
3. Run `document.cookie` in the console — confirm the `session` cookie is NOT readable (HttpOnly).
4. Navigate the dashboard; confirm API calls succeed (the `session` cookie authenticates them).
5. Click logout. Confirm both `session` and `auth-storage` cookies are gone and Local Storage `auth-storage` no longer has token fields.
6. Manually delete the `session` cookie in DevTools and reload a dashboard page — confirm redirect to `/login`.

- [ ] **Step 4: Session-expiry / revocation check**

In a dev DB, set a logged-in user's `User.active` to `false`. Hit an authenticated API route with their `session` cookie. Confirm 401 `INVALID_SESSION` (the deactivation takes effect immediately — this is the cookie-trust fix).

- [ ] **Step 5: Commit any remaining changes (e.g. test-only fixes) and report**

```bash
git status
```

If clean, done. If test fixtures needed adjustment, commit them with `test(security): ...`.

---

## Notes for the implementer

- **No Prisma migration needed** — the `Session` model already has `sessionToken`, `userId`, `expiresAt`, etc. This plan only changes code that reads/writes sessions and cookies.
- **`completeLogin` is the single cookie-set point** — all four login paths (`/api/auth/login`, `/api/auth/employee-login`, `/api/auth/mfa/verify-otp`, `/api/auth/mfa/magic-link`) call it, so the Task 3 change covers every login flow.
- **The `auth-storage` cookie is now advisory** — only `middleware.ts` (edge, no DB) reads it for role-gating. `verifyAuth` (Node) ignores it for identity. A tampered `auth-storage` can no longer escalate privileges; `verifyAuth` uses `session.userId` + a fresh DB lookup.
- **Force re-login on deploy** is intentional. Existing users with only an `auth-storage` cookie will be redirected to `/login` by the Task 7 middleware check. Orphaned `Session` rows expire and are swept by `cleanupExpiredSessions()` (called on each login).
- **CSRF is unchanged** — the double-submit pattern via the JS-readable `csrf-token` cookie + `api-csrf-middleware.ts` continues to work.
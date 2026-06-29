# DB Session Storage (HttpOnly Cookie) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage `sessionToken` with a dedicated HttpOnly `session` cookie validated against the DB `Session` table on every authenticated request, make the session row's `userId` the authoritative identity, HMAC-sign the cookie value so forged cookies are rejected pre-DB, and invalidate all other sessions when a user changes their password.

**Architecture:** A new `session` HttpOnly cookie carries an HMAC-signed session token (`<token>.<signature>`). `verifyAuth` verifies the HMAC, calls `validateSession()` (existing) with the raw token, and derives `userId`/`role` from the DB — ignoring `auth-storage`'s `userId`. The `auth-storage` cookie remains only as an edge-middleware role hint. Logout reads the `session` cookie server-side. On password change, all of the user's other sessions are terminated (current device stays logged in). The client never receives or stores `sessionToken`.

**Tech Stack:** Next.js 14 App Router, Prisma (PostgreSQL), Zustand, Vitest, Node `crypto` (HMAC-SHA256). Existing infra: `Session` model (`prisma/schema.prisma:445`), `session-manager.ts` (`createSession`/`validateSession`/`terminateSession`/`terminateSessionById`/`terminateAllUserSessions`), `completeLogin()` in `src/lib/auth-helpers.ts`. Signing mirrors the existing `csrf-utils.ts` pattern (`signCSRFToken`/`verifyCSRFToken`, `CSRF_SECRET`).

**Spec:** `docs/superpowers/specs/2026-06-29-db-session-storage-design.md` (this plan extends the spec with HMAC signing for test 2.2 and password-change invalidation for test 2.3 — see spec addendum).

**Decisions (from brainstorming + test-row review):** fixed 24h expiry (no sliding), `SameSite=Strict`, force re-login on deploy (no graceful bridge), minimal cleanup (stop persisting vestigial tokens; keep fields in code), HMAC-signed cookie value (test 2.2), invalidate other sessions on password change (test 2.3).

---

## File map

- **Modify** `src/lib/session-manager.ts` — add `SESSION_COOKIE_NAME`, `getSessionCookieOptions`, `signSessionToken`, `verifySessionToken`, `terminateOtherUserSessions`.
- **Modify** `src/lib/api-auth.ts` — rewrite `verifyAuth` to verify the HMAC signature, read the `session` cookie, and validate via `validateSession`.
- **Modify** `src/lib/auth-helpers.ts` — `completeLogin` sets the signed `session` cookie, drops `sessionToken` from JSON.
- **Modify** `src/app/api/auth/logout/route.ts` — read + verify the `session` cookie, terminate, clear both cookies.
- **Modify** `src/store/auth-store.ts` — `partialize` stops persisting tokens; `login`/`logout` stop using `sessionToken`.
- **Modify** `src/lib/api-client.ts` — `logout` drops the `sessionToken` parameter.
- **Modify** `middleware.ts` — require `session` cookie presence on `/dashboard` routes.
- **Modify** `src/components/auth/employee-login-form.tsx` — stop storing `sessionToken` / setting `auth-storage` cookie client-side.
- **Modify** `src/components/auth/mfa-verify-form.tsx` — same.
- **Modify** `src/app/(auth)/mfa/magic-link-confirm/page.tsx` — same.
- **Modify** `src/app/api/auth/sessions/route.ts` — POST `terminate` uses `sessionId`; drop the `validate` action.
- **Modify** `src/app/api/auth/change-password/route.ts` — terminate other sessions on successful password change.
- **Modify** `test/setup.ts` — add `SESSION_SECRET` env var for tests.
- **Rewrite** `src/lib/api-auth.test.ts` — cover the new cookie/session validation path (incl. signature failures).
- **Extend** `src/lib/session-manager.test.ts` — cover cookie options, signing, and `terminateOtherUserSessions`.

---

## Task 1: Cookie options + HMAC token signing + terminateOtherUserSessions helper

**Files:**
- Modify: `src/lib/session-manager.ts`
- Modify: `test/setup.ts`
- Test: `src/lib/session-manager.test.ts`

- [ ] **Step 1: Add `SESSION_SECRET` to the test setup**

In `test/setup.ts`, after the `process.env.CSRF_SECRET = ...` line, add:

```ts
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only';
```

- [ ] **Step 2: Write the failing tests**

In `src/lib/session-manager.test.ts`, update the top import block to include the new exports:

```ts
import {
  generateSessionToken,
  calculateSessionExpiry,
  parseUserAgent,
  createSession,
  validateSession,
  terminateSession,
  terminateAllUserSessions,
  terminateOtherUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions,
  getUserSessionCount,
  signSessionToken,
  verifySessionToken,
  MAX_CONCURRENT_SESSIONS,
  SESSION_EXPIRY_HOURS,
  SESSION_EXPIRY_MS,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from './session-manager';
```

Add a new `describe` block at the end of the outer `describe('session-manager', ...)` (before its closing `});`):

```ts
  describe('Session cookie options', () => {
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

  describe('signSessionToken / verifySessionToken', () => {
    it('produces a token.signature string', () => {
      const token = generateSessionToken();
      const signed = signSessionToken(token);
      expect(signed).toContain('.');
      expect(signed.startsWith(token + '.')).toBe(true);
    });

    it('verifySessionToken returns the raw token for a valid signature', () => {
      const token = generateSessionToken();
      const signed = signSessionToken(token);
      expect(verifySessionToken(signed)).toBe(token);
    });

    it('verifySessionToken returns null for a tampered signature', () => {
      const token = generateSessionToken();
      const signed = signSessionToken(token);
      const tampered = signed.slice(0, -2) + 'xx';
      expect(verifySessionToken(tampered)).toBeNull();
    });

    it('verifySessionToken returns null for a token signed with a different secret', () => {
      const token = generateSessionToken();
      // Sign with the real helper, then verify against a value the attacker
      // might construct without the secret — a bare token with no signature.
      expect(verifySessionToken(token)).toBeNull();
    });

    it('verifySessionToken returns null for malformed input', () => {
      expect(verifySessionToken('')).toBeNull();
      expect(verifySessionToken('no-signature-here-with-no-dot')).toBeNull();
    });
  });

  describe('terminateOtherUserSessions', () => {
    const userId = 'user-123';
    const keepToken = 'keep-token';

    it('deletes all sessions for the user except the keep token', async () => {
      mockedDb.session.deleteMany.mockResolvedValue({ count: 2 });

      const count = await terminateOtherUserSessions(userId, keepToken);

      expect(count).toBe(2);
      expect(mockedDb.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId,
          sessionToken: { not: keepToken },
        },
      });
    });

    it('returns 0 when deleteMany fails', async () => {
      mockedDb.session.deleteMany.mockRejectedValue(new Error('DB Error'));

      const count = await terminateOtherUserSessions(userId, keepToken);

      expect(count).toBe(0);
    });
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/session-manager.test.ts`
Expected: FAIL — the new exports/helpers don't exist yet.

- [ ] **Step 4: Add the helpers to session-manager.ts**

At the top of `src/lib/session-manager.ts`, update the `crypto` import and add the secret guard (after the existing `import { randomBytes } from 'crypto';` line, replace it with):

```ts
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
```

After the existing imports / before the configuration block, add the secret guard:

```ts
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  throw new Error(
    'CRITICAL: SESSION_SECRET environment variable is not set. ' +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
  );
}
```

After the `getPreSessionCookieOptions` function (~line 46), add:

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

/**
 * HMAC-sign an opaque session token for cookie transport.
 * Cookie value format: `<token>.<base64-signature>`. The signature lets
 * verifyAuth reject forged cookies without a DB lookup; the DB row remains
 * the source of truth for validity and expiry.
 */
export function signSessionToken(token: string): string {
  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(token);
  const signature = hmac.digest('base64');
  return `${token}.${signature}`;
}

/**
 * Verify a signed session cookie value and return the raw token on success.
 * Returns null if the value is malformed or the signature does not match
 * (constant-time comparison). The raw token is then used for validateSession.
 */
export function verifySessionToken(signed: string): string | null {
  try {
    const parts = signed.split('.');
    if (parts.length !== 2) return null;
    const [token, providedSignature] = parts;

    const hmac = createHmac('sha256', SESSION_SECRET);
    hmac.update(token);
    const expectedSignature = hmac.digest('base64');

    const a = Buffer.from(providedSignature, 'base64');
    const b = Buffer.from(expectedSignature, 'base64');
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? token : null;
  } catch {
    return null;
  }
}
```

Then add `terminateOtherUserSessions` immediately after `terminateAllUserSessions`:

```ts
/**
 * Terminate all sessions for a user EXCEPT the one matching keepSessionToken.
 * Used on password change to force re-login on other devices while keeping
 * the current device signed in.
 *
 * @param userId - User ID
 * @param keepSessionToken - Session token to preserve (the current device)
 * @returns Number of sessions terminated
 */
export async function terminateOtherUserSessions(
  userId: string,
  keepSessionToken: string
): Promise<number> {
  try {
    const result = await db.session.deleteMany({
      where: {
        userId,
        sessionToken: { not: keepSessionToken },
      },
    });
    sessionLogger.info(
      { count: result.count, userId },
      'Terminated other sessions for user'
    );
    return result.count;
  } catch (error) {
    sessionLogger.error({ err: error, userId }, 'Failed to terminate other sessions');
    return 0;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/session-manager.test.ts`
Expected: PASS (all existing + new tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-manager.ts src/lib/session-manager.test.ts test/setup.ts
git commit -m "feat(session): add cookie options, HMAC signing, and terminateOtherUserSessions helper"
```

---

## Task 2: Rewrite verifyAuth to validate the signed session cookie against the DB

**Files:**
- Modify: `src/lib/api-auth.ts`
- Rewrite: `src/lib/api-auth.test.ts`

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `src/lib/api-auth.test.ts` with:

```ts
/**
 * Unit tests for src/lib/api-auth.ts
 *
 * verifyAuth reads the HttpOnly `session` cookie, verifies its HMAC signature,
 * validates the raw token against the DB via validateSession, and derives
 * userId/role from the session row + User table — never from the client-
 * controlled auth-storage cookie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, withAuth } from './api-auth';
import { signSessionToken } from '@/lib/session-manager';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockValidateSession = vi.fn();
const mockFindUnique = vi.fn();

vi.mock('@/lib/session-manager', () => ({
  validateSession: (...args: any[]) => mockValidateSession(...args),
  // Pass-through signing helpers so the tests can build realistic cookies.
  signSessionToken: (token: string) => {
    const { createHmac } = require('crypto');
    const hmac = createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(token);
    return `${token}.${hmac.digest('base64')}`;
  },
  verifySessionToken: (signed: string): string | null => {
    try {
      const parts = signed.split('.');
      if (parts.length !== 2) return null;
      const [token, provided] = parts;
      const { createHmac, timingSafeEqual } = require('crypto');
      const hmac = createHmac('sha256', process.env.SESSION_SECRET);
      hmac.update(token);
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
    user: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequestWithSessionCookie(signedSessionToken?: string): NextRequest {
  const url = 'http://localhost:9002/api/test';
  if (signedSessionToken === undefined) return new NextRequest(url);
  return new NextRequest(url, {
    headers: { cookie: `session=${signedSessionToken}` },
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

  it('returns INVALID_SESSION (401) when the cookie signature is invalid', async () => {
    const req = makeRequestWithSessionCookie('forged-token.bogus-signature');
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  it('returns INVALID_SESSION (401) when validateSession returns null', async () => {
    mockValidateSession.mockResolvedValue(null);
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns INVALID_SESSION when the DB user lookup returns null', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue(null);
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns INVALID_SESSION when the user is inactive', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: false, role: 'Admin', institutionId: null, username: 'admin' });
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns authenticated context derived from the session row + DB user', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'HRO', institutionId: 'inst-1', username: 'hro1' });
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context).toEqual({
      userId: 'user-1',
      role: 'HRO',
      institutionId: 'inst-1',
      username: 'hro1',
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, active: true, role: true, institutionId: true, username: true },
    });
    // validateSession must receive the RAW token, not the signed cookie value.
    expect(mockValidateSession).toHaveBeenCalledWith('good-token');
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
    const req = new NextRequest('http://localhost:9002/api/test', {
      headers: {
        cookie:
          'session=' +
          signSessionToken('good-token') +
          '; auth-storage=' +
          encodeURIComponent(JSON.stringify({ userId: 'attacker-target', role: 'Admin' })),
      },
    });
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(true);
    expect(result.context!.userId).toBe('real-user');
    expect(result.context!.role).toBe('EMPLOYEE');
  });

  it('returns INVALID_SESSION when validateSession throws', async () => {
    mockValidateSession.mockRejectedValue(new Error('DB down'));
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('returns INVALID_SESSION when the user lookup throws', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockRejectedValue(new Error('DB down'));
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));
    const result = await verifyAuth(req);

    expect(result.authenticated).toBe(false);
    const body = await responseBody(result.response!);
    expect(body.errorCode).toBe('INVALID_SESSION');
  });

  it('supports plain Request objects by parsing the cookie header', async () => {
    mockValidateSession.mockResolvedValue({ id: 's1', userId: 'user-1', User: { id: 'user-1' } });
    mockFindUnique.mockResolvedValue({ id: 'user-1', active: true, role: 'Admin', institutionId: null, username: 'admin' });
    const req = new Request('http://localhost:9002/api/test', {
      headers: { cookie: 'session=' + signSessionToken('good-token') },
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
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));

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
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));

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
    const req = makeRequestWithSessionCookie(signSessionToken('good-token'));

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
  // 1. Read the signed `session` cookie (HttpOnly) ------------------------
  let signedSessionToken: string | undefined;

  if (request instanceof NextRequest) {
    signedSessionToken = request.cookies.get('session')?.value;
  } else {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/session=([^;]+)/);
      if (match) {
        signedSessionToken = match[1];
      }
    }
  }

  if (!signedSessionToken) {
    return unauthenticated();
  }

  // 2. Verify the HMAC signature and extract the raw token ----------------
  const { verifySessionToken, validateSession } = await import('@/lib/session-manager');
  const sessionToken = verifySessionToken(signedSessionToken);
  if (!sessionToken) {
    return invalidSession();
  }

  // 3. Validate the session against the DB --------------------------------
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

  // 4. Look up the user by the SESSION's userId (authoritative) -----------
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

  // 5. Success -------------------------------------------------------------
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

Update the file-top doc comment to:

```ts
/**
 * API Authentication Wrapper
 *
 * Provides verifyAuth() and withAuth() for protecting Next.js API routes.
 * Reads the HMAC-signed session token from the HttpOnly `session` cookie,
 * verifies the signature, validates the raw token against the DB Session
 * table via validateSession(), then looks up the User by the session row's
 * userId. The client-controlled `auth-storage` cookie is NOT used for
 * identity — only the DB session row is authoritative.
 */
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/api-auth.test.ts`
Expected: PASS (all new tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-auth.ts src/lib/api-auth.test.ts
git commit -m "feat(security): verifyAuth validates signed DB session cookie (FIX 4)"
```

---

## Task 3: Set the signed `session` cookie in completeLogin and stop returning sessionToken in JSON

**Files:**
- Modify: `src/lib/auth-helpers.ts`

- [ ] **Step 1: Update imports**

In `src/lib/auth-helpers.ts`, update the import from `@/lib/session-manager` (lines 5-10) to:

```ts
import {
  createSession,
  checkSessionLimit,
  cleanupExpiredSessions,
  PRE_SESSION_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  signSessionToken,
} from '@/lib/session-manager';
```

- [ ] **Step 2: Set the signed session cookie and drop sessionToken from the JSON body**

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

  // Set the HttpOnly, HMAC-signed session cookie. The client never receives
  // the raw token; the browser sends the signed value automatically.
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set(
    SESSION_COOKIE_NAME,
    signSessionToken(session.sessionToken),
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
Expected: PASS — removing `sessionToken` from the response payload drops an extra field; nothing references it on the type.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth-helpers.ts
git commit -m "feat(security): set signed HttpOnly session cookie; stop returning sessionToken in login JSON (FIX 1, 3)"
```

---

## Task 4: Logout reads + verifies the session cookie server-side and clears both cookies

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
  verifySessionToken,
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

function readRawSessionToken(req: Request): string | undefined {
  let signed: string | undefined;
  if (req instanceof NextRequest) {
    signed = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
      signed = match ? match[1] : undefined;
    }
  }
  if (!signed) return undefined;
  return verifySessionToken(signed) ?? undefined;
}

export const POST = wrapHandler(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const userId = body?.userId;
  const logoutAll = body?.logoutAll === true;

  const sessionToken = readRawSessionToken(req);

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
git commit -m "feat(security): logout reads+verifies session cookie server-side and clears both cookies"
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
Expected: PASS. (The auth-store logout call site `apiClient.logout(currentUserId)` from Task 5 still matches — `logoutAll` defaults to false.)

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

In `middleware.ts`, inside the `if (pathname.startsWith('/dashboard'))` block, replace lines 274-275 with:

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

(The existing `if (!isAuthenticated || !userId)` check below stays as a secondary guard. Middleware checks cookie presence only — HMAC verification happens in the Node API layer, since edge middleware avoids the Node crypto secret.)

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

The client no longer has a `sessionToken` to send. The GET endpoint already returns `sessionId` (the session row's `id`) alongside the masked token, so termination switches to `sessionId` using the existing `terminateSessionById(sessionId, userId)` helper. The `validate` action had no remaining client caller and is removed.

**Files:**
- Modify: `src/app/api/auth/sessions/route.ts`

- [ ] **Step 1: Update imports and schemas**

In `src/app/api/auth/sessions/route.ts`, replace the import block (lines 3-7) with:

```ts
import {
  getUserActiveSessions,
  terminateSessionById,
} from '@/lib/session-manager';
```

Replace the schema definitions (lines 18-24) with a single schema:

```ts
const terminateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});
```

- [ ] **Step 2: Rewrite the POST handler**

Replace the entire `POST` export (lines 54-115) with:

```ts
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

(The GET handler stays unchanged.)

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/sessions/route.ts
git commit -m "refactor(auth): sessions terminate uses sessionId instead of client-supplied sessionToken"
```

---

## Task 10: Invalidate other sessions on password change

When a user changes their password, all of their sessions except the current device's are terminated, forcing re-login on every other device. The current device stays signed in on its existing signed session cookie.

**Files:**
- Modify: `src/app/api/auth/change-password/route.ts`

- [ ] **Step 1: Add the session-invalidation call**

In `src/app/api/auth/change-password/route.ts`, add imports at the top (after the existing `@/lib` imports, before `withRateLimit`):

```ts
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  terminateOtherUserSessions,
} from '@/lib/session-manager';
import type { NextRequest } from 'next/server';
```

Then, after the successful `db.user.update(...)` and the password-expiration reset block (after line 195, before the audit-logging block), insert:

```ts
    // Invalidate all other sessions for this user (force re-login on other
    // devices). The current device stays signed in on its existing session.
    let currentSessionToken: string | undefined;
    if (request instanceof NextRequest) {
      currentSessionToken = verifySessionToken(
        request.cookies.get(SESSION_COOKIE_NAME)?.value ?? ''
      ) ?? undefined;
    } else {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
        if (match) {
          currentSessionToken = verifySessionToken(match[1]) ?? undefined;
        }
      }
    }
    if (currentSessionToken) {
      const terminated = await terminateOtherUserSessions(user.id, currentSessionToken);
      authLogger.info({ userId: user.id, terminated }, 'Terminated other sessions after password change');
    } else {
      // No session cookie on the request (e.g. admin forcing a password
      // change on behalf of a user) — terminate ALL sessions to be safe.
      const { terminateAllUserSessions } = await import('@/lib/session-manager');
      const terminated = await terminateAllUserSessions(user.id);
      authLogger.info({ userId: user.id, terminated }, 'Terminated all sessions after password change (no current session cookie)');
    }
```

Then extend the audit `additionalData` (in the `logAuditEvent` call, lines 214-220) to record the invalidation. Add a `sessionsInvalidated: true` field:

```ts
      additionalData: {
        wasTemporaryPassword: user.isTemporaryPassword,
        newExpirationDate: calculatePasswordExpirationDate(
          new Date(),
          user.role
        ),
        sessionsInvalidated: true,
      },
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/change-password/route.ts
git commit -m "feat(security): invalidate other sessions on password change (test 2.3)"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: PASS — including the rewritten `api-auth.test.ts` and extended `session-manager.test.ts`.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Add `SESSION_SECRET` to the production environment**

Generate a strong secret and add `SESSION_SECRET=<64-byte hex>` to `.env.production` (and any deployment secret store). The app will throw at boot if it is missing, mirroring `CSRF_SECRET`. Do NOT commit the real production secret to git.

- [ ] **Step 4: Manual verification in the browser**

1. `npm run dev` (port 9002). Ensure `SESSION_SECRET` is set in `.env` (dev) — add a dev value if missing.
2. Log in as an HR officer. Open DevTools → Application → Cookies → `localhost:9002`. Confirm:
   - A `session` cookie exists, HttpOnly=true, SameSite=Strict, and its value looks like `<hex>.<base64>` (signed).
   - `auth-storage` exists, HttpOnly=true.
   - In Application → Local Storage, the `auth-storage` key contains `{"state":{"user":...,"role":...,"isAuthenticated":true,"csrfToken":...}}` with NO `sessionToken`, `accessToken`, or `refreshToken` fields.
3. Run `document.cookie` in the console — confirm the `session` cookie is NOT readable (HttpOnly).
4. Navigate the dashboard; confirm API calls succeed (the signed `session` cookie authenticates them).
5. Tamper with the `session` cookie value in DevTools (change the last few chars). Hit an API route — confirm 401 `INVALID_SESSION` (signature rejected).
6. Click logout. Confirm both `session` and `auth-storage` cookies are gone and Local Storage `auth-storage` no longer has token fields.
7. Manually delete the `session` cookie in DevTools and reload a dashboard page — confirm redirect to `/login`.

- [ ] **Step 5: Revocation + password-change checks**

1. In a dev DB, set a logged-in user's `User.active` to `false`. Hit an authenticated API route with their `session` cookie. Confirm 401 `INVALID_SESSION` (deactivation takes effect immediately).
2. Log in on two browsers (or a normal + incognito window) as the same user. Change the password in window A. Refresh an API call in window B — confirm 401 `INVALID_SESSION` (other session invalidated). Window A remains logged in.

- [ ] **Step 6: Commit any remaining changes (e.g. test-only fixes) and report**

```bash
git status
```

If clean, done. If test fixtures needed adjustment, commit them with `test(security): ...`.

---

## Notes for the implementer

- **No Prisma migration needed** — the `Session` model already has `sessionToken`, `userId`, `expiresAt`, etc. This plan only changes code that reads/writes sessions and cookies, plus adds `SESSION_SECRET` to the environment.
- **`completeLogin` is the single cookie-set point** — all four login paths (`/api/auth/login`, `/api/auth/employee-login`, `/api/auth/mfa/verify-otp`, `/api/auth/mfa/magic-link`) call it, so the Task 3 change covers every login flow.
- **The `auth-storage` cookie is now advisory** — only `middleware.ts` (edge, no DB) reads it for role-gating. `verifyAuth` (Node) ignores it for identity. A tampered `auth-storage` can no longer escalate privileges; `verifyAuth` uses `session.userId` + a fresh DB lookup.
- **HMAC signing is a pre-DB forgery filter** — `verifySessionToken` rejects malformed/unsigned/tampered cookies before hitting the DB. The DB lookup remains the source of truth for validity, expiry, and revocation (e.g. deactivation, password change). The signing secret is `SESSION_SECRET` (separate from `CSRF_SECRET`), required at boot.
- **Force re-login on deploy** is intentional. Existing users with only an `auth-storage` cookie will be redirected to `/login` by the Task 7 middleware check. Orphaned `Session` rows expire and are swept by `cleanupExpiredSessions()` (called on each login).
- **Password-change invalidation (Task 10)** keeps the current device signed in by reading its `session` cookie and calling `terminateOtherUserSessions(userId, currentToken)`. If no session cookie is present on the request (admin-initiated change), all sessions are terminated.
- **CSRF is unchanged** — the double-submit pattern via the JS-readable `csrf-token` cookie + `api-csrf-middleware.ts` continues to work.
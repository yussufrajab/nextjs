# DB Session Storage (HttpOnly Cookie) — Design

**Date:** 2026-06-29
**Status:** Approved (brainstormed)
**Driver:** Security testing — eliminate `sessionToken` from `localStorage`; make DB session the authoritative identity.

## 1. Problem

The recommended session model (OPTION 1: HttpOnly cookie + DB session) is only partially implemented today:

- **FIX 1 violation:** Zustand `partialize` persists `sessionToken`, `accessToken`, `refreshToken` into `localStorage` (`src/store/auth-store.ts:496-504`). `completeLogin` also returns `sessionToken` in the login JSON body (`src/lib/auth-helpers.ts:193-197`), so the token reaches the client and is written to `localStorage` — readable by any XSS payload.
- **FIX 3 missing:** No cookie carries the `sessionToken` itself. The existing `auth-storage` HttpOnly cookie carries only `{userId, role, username, institutionId, isAuthenticated}`.
- **FIX 4 missing:** `verifyAuth()` (`src/lib/api-auth.ts:86`) trusts the `userId` from the `auth-storage` cookie and only checks the user exists/active. It never calls `validateSession()`. This is also a cookie-trust vulnerability: a crafted `auth-storage` cookie with another user's `userId` authenticates as that user.

What already works: the `Session` Prisma model (`prisma/schema.prisma:445`), `session-manager.ts` (`createSession`/`validateSession`/`terminateSession`/`cleanupExpiredSessions`), DB session creation inside `completeLogin`, and an HttpOnly `auth-storage` cookie set server-side.

## 2. Goals & non-goals

**Goals**
- Stop persisting `sessionToken` (and vestigial `accessToken`/`refreshToken`) in `localStorage`.
- Stop returning `sessionToken` in the login response body.
- Introduce a dedicated HttpOnly `session` cookie carrying the `sessionToken`.
- Make `verifyAuth` validate the session against the DB on every request and derive `userId` authoritatively from the session row (not the cookie).
- Make logout read the session cookie server-side and terminate the DB session.

**Non-goals**
- Removing the vestigial `accessToken`/`refreshToken` fields from `AuthState` and `api-client` (deferred — minimal cleanup).
- Changing the concurrent-session limit (3) or suspicious-login detection.
- Changing CSRF handling (double-submit via `csrf-token` cookie stays).
- Sliding-session expiry (fixed 24h retained).
- Edge-runtime DB access in middleware (middleware stays cookie-only).

## 3. Decisions (from brainstorming)

| Decision | Choice | Rationale |
|---|---|---|
| Session expiry | Fixed 24h | Simpler, predictable; matches current `SESSION_EXPIRY_HOURS`. |
| `session` cookie SameSite | Strict | Matches current `auth-storage` behavior; most secure. |
| Migration | Force re-login | Clean cut; orphaned `Session` rows swept by existing `cleanupExpiredSessions()`. |
| Vestigial tokens | Stop persisting only | Minimal blast radius; fields remain in code. |
| Architecture | Approach A — dedicated `session` cookie | Clean separation of identity (Node) vs. role hint (edge middleware). |

## 4. Cookie model

Two HttpOnly cookies after login:

| Cookie | Value | Purpose | Read by |
|---|---|---|---|
| `session` (NEW) | 32-byte hex `sessionToken` | Authoritative session identity | `verifyAuth` (Node API routes) |
| `auth-storage` (existing, shape unchanged) | `{userId, role, username, institutionId, isAuthenticated}` | Edge role-gating hint only | `middleware.ts` (edge) |

Both: `httpOnly: true`, `secure: isProduction`, `sameSite: 'strict'`, `path: '/'`.
- `session` `maxAge` = `SESSION_EXPIRY_MS / 1000` (86400).
- `auth-storage` `maxAge` = 7 days (unchanged).

The JS-readable `csrf-token` cookie (double-submit) is unchanged.

**Trust rule:** `userId`/`role` inside `auth-storage` are advisory. The Node API layer derives `userId` exclusively from `validateSession(sessionToken)` → `session.userId`, then re-fetches `role`/`active`/`institutionId` from the `User` table. A tampered `auth-storage` cookie can no longer escalate privileges — at worst it changes what middleware renders before the next API call 401s.

## 5. Component changes

### 5.1 `src/lib/session-manager.ts`
- Add `SESSION_COOKIE_NAME = 'session'`.
- Add `getSessionCookieOptions(isProduction: boolean)` returning `{ httpOnly: true, secure: isProduction, sameSite: 'strict' as const, path: '/', maxAge: SESSION_EXPIRY_MS / 1000 }`.
- `validateSession` unchanged (fixed 24h — no sliding extension).

### 5.2 `src/lib/auth-helpers.ts` → `completeLogin()`
- After `createSession()`, set the `session` cookie = `session.sessionToken` using `getSessionCookieOptions(isProduction)`.
- Remove `sessionToken: session.sessionToken` from the response JSON — both `data.sessionToken` and the top-level `sessionToken` field. The client no longer receives it.
- Keep setting `auth-storage` and `csrf-token` cookies as today.
- Keep clearing the `pre-session` cookie after successful auth.

### 5.3 `src/store/auth-store.ts`
- In `partialize`: remove `accessToken`, `refreshToken`, `sessionToken` from the returned object. Keep `user`, `role`, `isAuthenticated`, `csrfToken`.
- In `login()`: stop extracting `sessionToken` from the response; stop storing it in `set(...)`. Keep `accessToken: null`, `refreshToken: null` in `set(...)` to preserve `AuthState` shape.
- In `logout()`: stop reading `sessionToken` from state; call `apiClient.logout(currentUserId)` with no token arg. Remove the `localStorage.removeItem('accessToken'/'refreshToken'/'sessionToken')` lines.
- In `initializeAuth()` and `refreshAuthToken()`: remove `localStorage.removeItem(...)` token cleanup (no longer written). Leave `refreshAuthToken` returning false when `refreshToken` is null (already the case).

### 5.4 `src/lib/api-client.ts`
- `logout(userId, sessionToken?)` → drop the `sessionToken` parameter; request body becomes `{ userId, logoutAll }`.
- Leave `setToken`/`clearToken` and the `Authorization: Bearer` header path in place (minimal cleanup; accessToken stays null in practice).

### 5.5 `src/lib/api-auth.ts` → `verifyAuth()` (FIX 4 — core change)
- Read the `session` cookie (not `auth-storage`) from the request. Support both `NextRequest` (`request.cookies.get('session')?.value`) and plain `Request` (parse `cookie` header for `session=([^;]+)`).
- If no `session` cookie → `unauthenticated()`.
- `await validateSession(sessionToken)`. If null → `invalidSession()`.
- Use `session.userId` (authoritative) to `db.user.findUnique({ where: { id: session.userId }, select: { id: true, active: true, role: true, institutionId: true, username: true } })`. Missing or `active === false` → `invalidSession()`.
- Return `AuthContext` with `userId = session.userId`, `role = user.role`, `institutionId = user.institutionId ?? null`, `username = user.username`.
- Stop reading `userId`/`role`/`institutionId`/`username` from the `auth-storage` cookie.

### 5.6 `src/app/api/auth/logout/route.ts`
- Read `sessionToken` from the `session` cookie server-side (same NextRequest/Request pattern as `verifyAuth`).
- If `logoutAll && userId` → `terminateAllUserSessions(userId)`; else if `sessionToken` → `terminateSession(sessionToken)`.
- On the response, clear both cookies: `response.cookies.set('session', '', { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/', maxAge: 0 })` and the existing `auth-storage` clear.
- Body no longer needs `sessionToken`; accept `{ userId, logoutAll }`.

### 5.7 `middleware.ts`
- Unchanged role-gating via `auth-storage`.
- Add a 1-line hardening: if `request.cookies.get('session')` is absent on a `/dashboard` route, redirect to `/login` (same as the unauthenticated path). This prevents a stale `auth-storage`-only cookie from reaching a dashboard page after deploy.

### 5.8 Client components referencing `sessionToken`
- Audit `src/components/auth/employee-login-form.tsx` and `src/components/auth/mfa-verify-form.tsx` (and `src/app/(auth)/mfa/magic-link-confirm/page.tsx`) for any `sessionToken` handling on login/MFA success; remove client-side reads/stores of it. The MFA flow must still work — the `session` cookie is set by the server on the final MFA-success response, same as `completeLogin`.

## 6. Data flow

### Login
1. `POST /api/auth/login` → `completeLogin()` verifies credentials; `createSession()` writes a DB `Session` row (`sessionToken`, `userId`, `expiresAt = now + 24h`, `ipAddress`, `userAgent`, `deviceInfo`).
2. Response sets cookies: `session=<token>` (HttpOnly, 24h), `auth-storage={...}` (HttpOnly, 7d), `csrf-token=<signed>` (JS-readable).
3. Response JSON: `{ success, data: {...authData}, passwordStatus, csrfToken, message }` — no `sessionToken` field.
4. Client Zustand store persists `user`, `role`, `isAuthenticated`, `csrfToken` only; no token in `localStorage`.

### Authenticated API request
1. Browser sends `session` + `auth-storage` + `csrf-token` cookies.
2. `withAuth(handler)` → `verifyAuth(req)` reads `session` → `validateSession(token)` returns the session row (and updates `lastActivity`).
3. `verifyAuth` fetches `User { active, role, institutionId }` by `session.userId`. Inactive/missing → 401 `INVALID_SESSION`.
4. Role check (`allowedRoles`) against the DB-derived role. Handler runs with authoritative `auth.userId`.

### Page navigation
1. `middleware.ts` (edge) reads `auth-storage` for role-gating and checks `session` cookie presence; absent → redirect `/login`.
2. Page renders; API calls go through the flow above.

### Logout
1. `POST /api/auth/logout` with `{ userId, logoutAll? }`.
2. Route reads `session` cookie → `terminateSession(token)` (or `terminateAllUserSessions(userId)`).
3. Response clears `session` and `auth-storage` cookies (`maxAge: 0`).
4. Client `auth-store.logout()` clears state and the `csrf-token` cookie.

### Expired session
1. Next request → `validateSession` sees `expiresAt < now` → deletes the row → returns null → `verifyAuth` returns 401 `INVALID_SESSION`.
2. Client API client sees 401 → `useAuthStore.logout()` → redirect `/login`.

## 7. Error handling & edge cases

- **No `session` cookie on an API route:** `verifyAuth` → `unauthenticated()` (401 `UNAUTHENTICATED`).
- **`session` cookie with no DB row** (forged, or row deleted by admin/cleanup): `validateSession` returns null → `invalidSession()` (401 `INVALID_SESSION`).
- **Session valid but User inactive/locked:** `verifyAuth` user lookup fails → `invalidSession()`. Closes the existing hole where a deactivated user retains access until cookie expiry.
- **`validateSession` throws (DB error):** returns null (existing behavior) → `invalidSession()`; logged via `sessionLogger`.
- **Concurrent-session limit (3):** unchanged. `createSession` evicts the oldest row; the evicted session's cookie still exists client-side but its next request 401s — FIX 4 now enforces eviction at the API layer.
- **CSRF:** unchanged.
- **Logout with no `session` cookie:** logs a warning, still clears both cookies, returns success (idempotent).
- **Migration (force re-login):** on deploy, existing `auth-storage`-only cookies fail the new `session`-cookie check in middleware → redirect to `/login`. Orphaned `Session` rows expire and get swept by `cleanupExpiredSessions()` (already called on each login).

## 8. Testing

### Unit (`vitest`)
- `session-manager.test.ts`: add assertions for `getSessionCookieOptions` (`httpOnly`, `secure`, `sameSite`, `maxAge`).
- `api-auth.test.ts`: rewrite `verifyAuth` cases — stub `validateSession` to return a session row / null / throw; assert `userId` comes from the session row, not the cookie; assert inactive user → 401; assert no `session` cookie → 401 `UNAUTHENTICATED`; assert a tampered `auth-storage` cookie with a different `userId` cannot authenticate as that user (session row's `userId` wins).
- `auth-store` test (new, if absent): assert `partialize` output contains no `sessionToken`/`accessToken`/`refreshToken`.

### API route tests
- Login response sets the `session` cookie (HttpOnly) and does NOT include `sessionToken` in the JSON body.
- Logout reads the `session` cookie, terminates the session, and clears both `session` and `auth-storage` cookies.
- A request with a valid `session` cookie and a tampered `auth-storage` cookie authenticates as the session's real user (not the cookie's `userId`).

### Manual / Playwright E2E
- Login → verify `session` cookie is HttpOnly (not readable via `document.cookie`) and `localStorage` has no `sessionToken`.
- Navigate dashboard; perform an action that hits an API route.
- Logout → both cookies cleared; `localStorage` auth-storage entry has no token fields.
- Session-expiry path: with a shortened expiry test fixture, wait past expiry → next request redirects to `/login`.

### Regression
- Existing `session-manager.test.ts` and `api-auth.test.ts` pass.
- `npm run typecheck` and `npm run lint` clean.

## 9. Security controls addressed

- **ERR-01 / session hygiene:** session token no longer exposed to JS.
- **Cookie-trust / privilege escalation:** `userId` no longer taken from a client-controlled cookie; DB session row is authoritative.
- **Revocation on deactivation:** a deactivated user's next request 401s immediately (DB lookup in `verifyAuth`).
- **Concurrent-session enforcement:** eviction now actually takes effect on the evicted session's next request.

## 10. Addendum (post-approval extensions for security test rows 2.2 and 2.3)

Two additions were approved after the initial design review to satisfy security-test expectations:

**10.1 HMAC-signed cookie value (test 2.2 — "token cryptographically signed").**
The `session` cookie value is `<rawToken>.<base64-HMAC-SHA256(rawToken)>` using a `SESSION_SECRET` env var (separate from `CSRF_SECRET`, required at boot — mirrors `csrf-utils.ts`). `verifyAuth` calls `verifySessionToken(signedValue)` before `validateSession`; a forged/unsigned/tampered cookie is rejected pre-DB. The DB session row remains the source of truth for validity, expiry, and revocation — signing is a forgery filter, not a replacement for DB validation. The raw token stored in the DB is unchanged (32-byte hex); only the cookie transport is signed.

**10.2 Session invalidation on password change (test 2.3).**
On a successful password change in `src/app/api/auth/change-password/route.ts`, call `terminateOtherUserSessions(userId, currentSessionToken)` — a new `session-manager` helper that deletes all of the user's sessions except the one matching the current device's `session` cookie. The current device stays signed in; every other device is forced to re-login. If the request has no `session` cookie (admin-initiated change), terminate ALL of the user's sessions.
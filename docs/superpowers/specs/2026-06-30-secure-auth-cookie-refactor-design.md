# Secure Cookie-Based Auth — Remove localStorage Persistence

**Date:** 2026-06-30
**Status:** Approved
**Branch:** feat/err01-batch3-wrap-handler

## Problem

The frontend persists the entire authentication state to `localStorage` under the
`auth-storage` key via Zustand's `persist` middleware. The persisted blob includes the
full user object — **including `passwordHistory` bcrypt hashes**, lockout metadata,
email, and institution details — plus the `csrfToken` and `isAuthenticated` flag.

`localStorage` is fully accessible to JavaScript, so any XSS incident exposes all of
it: password hashes for offline cracking, role/identity data for client-side
tampering, and CSRF tokens. Separately, `apiClient` stores `accessToken` /
`refreshToken` in `localStorage` and sends a `Bearer` header — vestigial from the old
JWT design — and `/api/auth/refresh-user-data` returns `passwordHistory` to the client
(the direct source of the hashes in `localStorage`).

## What Is Already Secure (unchanged)

The backend session architecture is sound and is **not** being replaced:

- **Authoritative credential:** the HttpOnly, HMAC-signed `session` cookie, validated
  by `verifyAuth` / `withAuth` in `src/lib/api-auth.ts` against the DB `Session` table,
  with per-request IP / User-Agent binding (session-hijacking protection).
- **CSRF:** OWASP double-submit-cookie pattern — an HMAC-signed `csrf-token` cookie
  (JS-readable by design, `SameSite=Strict`), validated server-side by
  `src/lib/api-csrf-middleware.ts`. The CSRF token is **not** sensitive like a session
  secret; JS readability is required by the pattern.
- **Backend = source of truth** for every protected action via `withAuth`.

## Goals

1. Remove all auth data from `localStorage` (user, tokens, CSRF, auth state).
2. Make the backend the single source of truth for client hydration via a new
   `GET /api/auth/me` endpoint that uses the signed `session` cookie.
3. Keep only UI-safe, non-persisted state in the frontend store.
4. Stop returning password hashes / password-history to any client API.
5. Remove the redundant unsigned `auth-storage` identity cookie; route identity
   through the signed `session` cookie only.
6. Preserve existing UX (login flow, password-expiration banner, change-password
   redirect, institution-scoped queries).

## Non-Goals

- Introducing JWT (opaque signed session cookies are the correct model here).
- Changing MFA, session-limit, account-lockout, or audit-logging flows.
- Removing client-side route guards (they remain UX-only; `withAuth` is the real
  enforcement).

## Decisions (confirmed with user)

- **Client state scope:** UI-safe set — `id, name, username, role, active, employeeId,
  institutionId, institutionName, mustChangePassword, isTemporaryPassword,
  temporaryPasswordExpiry, lastPasswordChange`. Never persisted. Strips
  `passwordHistory` and lockout fields.
- **`auth-storage` cookie:** Remove the unsigned HttpOnly `auth-storage` cookie
  entirely; route `/auth/me` (and `/api/auth/session`) through `verifyAuth` using the
  signed `session` cookie.

## Design

### 1. New endpoint — `GET /api/auth/me`

`src/app/api/auth/me/route.ts`, protected by `withAuth` (signed `session` cookie → DB
`User` lookup). Returns only UI-safe fields, with `Cache-Control: no-store`:

```jsonc
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "username": "...",
    "role": "Admin",
    "active": true,
    "employeeId": null,
    "institutionId": "...",
    "institutionName": "...",
    "mustChangePassword": false,
    "isTemporaryPassword": false,
    "temporaryPasswordExpiry": null,
    "lastPasswordChange": "2026-05-14T07:51:39.477Z"
  }
}
```

**Never returned:** `password`, `passwordHistory`, `failedPasswordChangeAttempts`,
`passwordChangeLockoutUntil`, `loginLockedUntil`, `loginLockoutReason`, etc.
Returns `401` when unauthenticated so the client can route to `/login`.

A shared helper (`src/lib/auth-me.ts`) builds the UI-safe payload from a `User` row so
`/auth/me` and `/api/auth/session` stay consistent.

### 2. Frontend store — `src/store/auth-store.ts`

- Remove the `persist` middleware and `createJSONStorage` usage entirely. The store
  becomes in-memory only, repopulated from `/auth/me` on each page load.
- Drop vestigial state fields: `accessToken`, `refreshToken`, `sessionToken`,
  `csrfToken`. Auth is cookie-based; `apiClient` reads the CSRF token from its cookie
  when needed (it already does — `api-client.ts:191`).
- `User` in state keeps the UI-safe set above — **not persisted**.
- `initializeAuth()` becomes: `fetch('/api/auth/me')` → on 200 set
  `{ user, role, isAuthenticated: true }`; on 401 set unauthenticated. Also clear any
  leftover `auth-storage` `localStorage` key from the old design (one-time migration).
- `refreshUserData()` repoints to `/auth/me`.
- `login()` simplified: the backend login response still carries the user object for
  immediate render, but the store no longer persists it; `/auth/me` remains the source
  of truth. CSRF / session cookies are set server-side via `Set-Cookie` (HttpOnly) —
  the frontend never touches them.
- `logout()` calls `/api/auth/logout` (server clears `session` / `csrf-token`) and
  resets in-memory state. Remove client-side `document.cookie` clearing of
  `auth-storage` / `csrf-token` — the backend owns those cookies.

### 3. API client — `src/lib/api-client.ts`

- Remove `localStorage.getItem/setItem('accessToken' | 'refreshToken')` and the
  `Authorization: Bearer` header. Auth rides the `session` cookie via
  `credentials: 'include'` (already set on every request).
- Remove the 401 → `refreshToken` retry flow and `setToken` / `clearToken` token
  logic. A 401 now triggers `logout()` / redirect to `/login` (no refresh token in a
  session model).
- Keep CSRF header injection (reads `csrf-token` cookie) and `x-device-info` unchanged.

### 4. Backend hardening

- `completeLogin` (`src/lib/auth-helpers.ts`): delete the unsigned `auth-storage`
  cookie set (current lines 214–229). Keep the signed `session` + `csrf-token`
  cookies. The login JSON body keeps returning the user object with UI-safe fields
  only (it already omits `passwordHistory`).
- `/api/auth/refresh-user-data`: strip `passwordHistory` and password-policy fields
  from the response; redirect clients to `/auth/me` and deprecate this route (keep it
  working but minimal during transition).
- `/api/auth/session`: repoint to `verifyAuth` (signed session) via the shared
  `auth-me` helper instead of the unsigned `auth-storage` cookie, returning the same
  minimal shape.
- Response audit: grep all auth/user API routes for `passwordHistory` / `password` /
  `select: { ... password: true }` reaching responses; strip anywhere a client could
  see them.

### 5. XSS impact

With `localStorage` empty of auth data and the session cookie `HttpOnly` +
`SameSite=Strict`, an XSS attacker:

- **cannot steal the session** (no JS access to the cookie),
- **cannot read credential material** (none in JS-reachable storage),
- can only tamper with client-side routing — every real action still passes through
  `withAuth` server-side.

This is the production-grade posture the task targets.

## Testing

- New unit test: `/auth/me` returns 401 unauthenticated; returns UI-safe fields (no
  `passwordHistory`) when authenticated via signed session.
- Update `auth-store` tests: no `auth-storage` `localStorage` key written after login;
  `initializeAuth` hydrates from `/auth/me` (mock fetch).
- Update `api-client` tests: no `Authorization` header, no `localStorage` token writes.
- Manual: login → confirm `localStorage.getItem('auth-storage') === null` and
  `document.cookie` exposes no session; reload → state hydrates from `/auth/me`;
  logout → session cookie cleared.

## Build Sequence (summary — full plan follows)

1. `src/lib/auth-me.ts` shared UI-safe payload helper.
2. `src/app/api/auth/me/route.ts` using `withAuth`.
3. Backend hardening: `auth-helpers.ts` (drop unsigned cookie), `refresh-user-data`
   strip, `session` route repoint, response audit.
4. `api-client.ts` cleanup.
5. `auth-store.ts` de-persistence + `/auth/me` hydration.
6. Update `use-auth.ts` / `auth-provider.tsx` for async hydration.
7. Tests + manual verification.
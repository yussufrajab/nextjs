# Self-Service Token-Based Password Reset — Design (Req 1.10)

**Date:** 2026-07-25
**Branch:** `fix/e2e-chronic-failures`
**Closes:** Security control 1.10 (Secure password reset: token, single-use, ≤15 min) in `docs/conclusion/CSMS_Security_Controls_Implementation_Status.md`.
**Status:** Approved by user on 2026-07-25.

## Goal

Add a self-service, token-based password-reset flow so users who have forgotten
their password can reset it themselves via an emailed, single-use, ≤15-minute
link — without an administrator. This closes the last ❌ gap under Requirement 1
(Authentication & Identity Assurance).

Today the only reset path is admin-issued (`src/app/api/admin/reset-password/route.ts`),
which hands out a 7-day temporary password. There is no self-service token flow
and no `resetToken`/`resetTokenExpiry` concept anywhere on `User`.

## Decisions (confirmed with user)

1. **Token storage — dedicated `PasswordResetToken` table** (not columns on
   `User`). The gap text literally says "add `resetToken`/`resetTokenExpiry`
   columns on `User`", but the codebase's established single-use-token pattern
   is the `MfaToken` table (`token @unique`, `expiresAt`, `usedAt`, `attempts`).
   A dedicated table is consistent with that pattern, supports per-token attempt
   tracking, keeps an audit trail, and lets us **hash** the token at rest. The
   functional requirement (single-use, ≤15-min TTL) is fully met either way.
2. **Scope — API + full UI.** Two endpoints, a forgot-password page, a
   reset-password page, a "Forgot password?" link on the login page, and a
   reset email.
3. **Identifier — username or email** (mirrors the login endpoint). The
   forgot-password endpoint accepts either and never reveals which matched.

## Non-goals

- Per-role MFA policy (the other half of remediation list item #9) — out of
  scope; remains open.
- Changing the admin reset path or temporary-password flow — untouched.
- Self-service unlock of admin/security lockouts — intentionally **not**
  provided (see §"Lockout preservation").

## Architecture

### Data model — new `PasswordResetToken` table

Mirrors `MfaToken` but stores a **SHA-256 hash** of the raw token (the raw token
is never persisted; only the hash is queryable):

```prisma
model PasswordResetToken {
  id           String    @id @default(cuid())
  userId       String
  tokenHash    String    @unique          // SHA-256(rawToken); raw token never persisted
  email        String                     // address the reset link was sent to (audit trail)
  attempts     Int       @default(0)
  expiresAt    DateTime                   // createdAt + PASSWORD_RESET_TOKEN_EXPIRY_MINUTES
  usedAt       DateTime?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime  @default(now())
  User         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
}
```

Add the back-relation on `User`:

```prisma
  PasswordResetToken  PasswordResetToken[]
```

**TTL:** 15 minutes. Constant `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES` (default
`15`), env-overridable so the E2E suite can widen it if needed (same convention
as `MFA_TOKEN_EXPIRY_MINUTES`).

### New library — `src/lib/password-reset.ts` (server-only)

Imports `@/lib/db` and `node:crypto`. Functions:

- `generateResetToken(): string` — `crypto.randomBytes(32).toString('hex')`
  (64 hex chars), identical generator to `generateMagicLinkToken`.
- `hashResetToken(token: string): string` —
  `crypto.createHash('sha256').update(token).digest('hex')`. Used for both
  insert and lookup so the raw token is never stored or indexed.
- `createPasswordResetToken(userId, email, ipAddress, userAgent)` — first
  invalidate any existing unused tokens for the user
  (`updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } })`,
  same as `createMfaToken`), then insert a new row with `tokenHash`, `expiresAt`
  = now + TTL. Returns `{ token: <raw>, expiresAt }`.
- `consumePasswordResetToken(rawToken)` — compute `tokenHash`, find the row.
  Reject (return `{ valid:false, reason }`) when not found, `usedAt` set,
  `expiresAt` past, or `attempts ≥ PASSWORD_RESET_MAX_VERIFY_ATTEMPTS`. On a
  valid candidate, **atomically** mark `usedAt` via
  `updateMany({ where: { id, usedAt: null }, data: { usedAt: now } })` and
  require `count === 1`; if `count === 0` another request won the race → return
  `{ valid:false, reason:'already_used' }`. This guarantees single-use under
  concurrent requests. Returns `{ valid:true, userId, email }` on success.
- `incrementResetVerifyAttempts(tokenId)` — bump `attempts`; once it reaches
  `PASSWORD_RESET_MAX_VERIFY_ATTEMPTS` (default 5) set `usedAt` to invalidate
  the token. Returns `{ allowed, remainingAttempts }`.
- `cleanupExpiredResetTokens()` — `deleteMany` where `expiresAt < now` and
  `usedAt: null`; callable from the existing token-cleanup path.

### Endpoint — `POST /api/auth/forgot-password` (unauthenticated)

File: `src/app/api/auth/forgot-password/route.ts`.

- Body: `{ identifier: string }` (username or email).
- Wrapping: `wrapHandler(withRateLimit('auth', …))` (per-IP) +
  `validateCSRF` (mirrors `login/route.ts`) + a per-identifier
  `checkRateLimitSliding(buildUserRateLimitKey(identifier), 'auth',
  { failClosed: true })` to throttle enumeration / link-spam from many IPs
  against one identifier (same shape as login's per-user limit).
- Behavior:
  1. Parse + validate the identifier.
  2. Determine `isEmail = identifier.includes('@')`; look up user
     (`findFirst({ where: isEmail ? { email } : { username } })`, select
     `id, username, email, name, active, role`).
  3. **Always** return the same generic success response regardless of outcome:
     `{ success:true, message:"If an account with that identifier exists and
     has an email on file, a reset link has been sent." }`. No enumeration, no
     timing-based distinguishability beyond unavoidable DB-lookup variance
     (accepted, same as login).
  4. Only when user found **and `active`** **and `email` present**: call
     `createPasswordResetToken`, build
     `${NEXT_PUBLIC_APP_URL}/reset-password?token=<rawToken>`, and
     `sendPasswordResetEmail(...)`. Email-send failure is logged (error level)
     but still returns the generic success response — never leaks whether the
     send happened.
  5. Audit `PASSWORD_RESET_REQUESTED` (category `SECURITY`, severity `INFO`)
     with `additionalData.identifier` and `userId` when known, so the SOC can
     observe enumeration/abuse. For not-found/inactive/no-email cases the audit
     still records the attempt (no userId).

### Endpoint — `POST /api/auth/reset-password` (unauthenticated, token holder)

File: `src/app/api/auth/reset-password/route.ts`.

- Body: `{ token: string, newPassword: string }`.
- Wrapping: `wrapHandler(withRateLimit('auth', …))` (per-IP) + `validateCSRF`.
- Behavior:
  1. Parse + validate presence of `token` and `newPassword`.
  2. Resolve the token: look up by `tokenHash`. On not-found / `usedAt` set /
     expired / `attempts ≥ cap`, return a **non-distinguishing** 400
     ("This reset link is invalid or has expired. Please request a new one.")
     — except the already-used case, which may say the link was already used.
     For an over-attempts token, call `incrementResetVerifyAttempts` first so
     the count advances; once the cap is reached the token is invalidated.
  3. Load the user (`findUnique({ where: { id: token.userId } })`). Reject with
     the same generic 400 if the user is missing or `active === false` (account
     may have been deactivated since the link was issued).
  4. Run the **full change-password validation chain**, reusing the same
     helpers as `src/app/api/auth/change-password/route.ts`:
     `validatePasswordComplexity`, `isCommonPassword`, `checkPasswordBreached`
     (HIBP — reject if pwned; **fail-open** on HIBP error with a warn log),
     `checkPasswordHistory` (last `PASSWORD_HISTORY_LENGTH` = 5), and
     not-same-as-current (`comparePassword(newPassword, user.password)`).
     These checks run **before** the token is consumed, so a rejected weak
     password does not burn the link.
  5. **Consume the token** (atomic, race-safe — see
     `consumePasswordResetToken`). If the race was lost (`count === 0`),
     return "This reset link has already been used."
  6. `hashPassword(newPassword)`, then update the user:
     - `password` = new hash
     - `passwordHistory` = `[oldHash, ...prevHistory].slice(0, 5)`
     - `isTemporaryPassword: false`, `mustChangePassword: false`,
       `temporaryPasswordExpiry: null`
     - `failedPasswordChangeAttempts: 0`, `passwordChangeLockoutUntil: null`
     - `failedLoginAttempts: 0`, clear **standard** login-lockout fields
       (`loginLockedUntil: null`, `loginLockoutReason: null`,
       `loginLockoutType: null`) — identity was just proven via email control,
       so a standard auto-lockout should not persist.
     - `lastPasswordChange: now`, `updatedAt: now`
  7. `resetPasswordExpiration(userId, user.role)` (from
     `@/lib/password-expiration-utils`).
  8. `terminateAllUserSessions(userId)` — force re-login on every device.
  9. Audit `PASSWORD_RESET` (category `SECURITY`, severity `INFO`) with
     `userId`, `username`, `role`, ip, deviceInfo, and
     `additionalData.via = 'self_service_token'`,
     `additionalData.sessionsInvalidated = true`.
  10. Return `{ success:true, message:"Your password has been reset
      successfully. You can now sign in." }`.

#### Lockout preservation (security-critical)

The reset must **not** clear `isManuallyLocked`, `lockedBy`, `lockedAt`, or
`lockoutNotes`. Those are admin-imposed security lockouts; allowing an
attacker who controls the victim's email to clear them would defeat the
lockout. A manually-locked user may reset their password (they proved email
control) but remains unable to sign in until an admin unlocks the account.
Standard auto-lockouts (30-min, self-clearing) **are** cleared in step 6.

### Email helper — `src/lib/email.ts`

`sendPasswordResetEmail({ email, resetLink, userName, expiryMinutes })` →
`SendEmailResult`. Modeled on `sendMfaEmail` (same branded table/shell), with:
a "Reset your password" button linking `resetLink`, a note that the link
expires in `expiryMinutes` minutes and can be used **once**, and "If you did
not request this, ignore this email — your password has not been changed."
Subject: `Password Reset Request - CSMS`.

### UI (route group `(auth)`)

Mirror the existing login page structure (`src/app/(auth)/login/page.tsx` +
`components/auth/login-form.tsx`): `Card`/`CardContent`, `Logo`, `APP_NAME`,
branded footer; client form fetches a CSRF token and posts JSON with the
`x-csrf-token` header (same as login-form).

1. **`/forgot-password`** (`src/app/(auth)/forgot-password/page.tsx` + a client
   form component) — single input (username or email) + submit. On submit →
   `POST /api/auth/forgot-password`; on any response show the generic success
   message and a "Back to login" link. Loading/disabled states while in flight.
2. **`/reset-password`** (`src/app/(auth)/reset-password/page.tsx` + a client
   form) — reads `?token=` via `useSearchParams`. No/empty token → error state
   ("Invalid reset link") with a link to `/forgot-password`. Form = new
   password + confirm password + strength meter (reuse the existing
   password-strength UI used in change-password). On success → redirect to
   `/login?reset=success` (login page shows a confirmation toast). On failure
   → show the message; offer a "Request a new link" link to
   `/forgot-password`.
3. **Login page** — add a `Forgot password?` link (next to / under the existing
   `Employee Login` button) → `/forgot-password`.

### Migration & config

- New Prisma migration (`prisma/migrations/<timestamp>_add_password_reset_token`)
  creating the `PasswordResetToken` table + the `User` back-relation, generated
  via `npx prisma migrate dev --name add_password_reset_token` (requires DB
  connectivity; if unavailable in the work environment, fall back to
  `npx prisma db push` and document).
- `.env.example` and `.env.production`: add
  `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=15` and
  `PASSWORD_RESET_MAX_VERIFY_ATTEMPTS=5`.
- Reuses `NEXT_PUBLIC_APP_URL`, existing SMTP env, and the existing `auth`
  rate-limit tier (env-tunable via `RATE_LIMIT_AUTH_LIMIT` for E2E).

## Testing (Vitest, co-located `.test.ts`)

- `src/lib/password-reset.test.ts` — `generateResetToken`/`hashResetToken`
  shape; `createPasswordResetToken` invalidates prior unused tokens;
  `consumePasswordResetToken` for valid / already-used / expired / not-found /
  over-attempts; **concurrent single-use**: two parallel `consume` calls on the
  same token → exactly one `valid:true`, one `already_used`.
- `src/app/api/auth/forgot-password/route.test.ts` — generic success returned
  for not-found / no-email / inactive / ok (all identical response); email sent
  **only** for active+email case; rate limit triggers; audit event recorded
  with identifier.
- `src/app/api/auth/reset-password/route.test.ts` — valid token resets the
  password, clears temp/lockout flags, preserves `isManuallyLocked`,
  invalidates all sessions, writes `PASSWORD_RESET` audit; expired / used /
  not-found / weak-password (token **not** consumed) / same-as-current /
  not-same-as-history rejections; inactive-user rejection.

## Documentation update — `CSMS_Security_Controls_Implementation_Status.md`

- Row **1.10**: `❌ Not Implemented` → `✅ Implemented`, evidence =
  `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`,
  `src/lib/password-reset.ts`, `prisma/schema.prisma` (PasswordResetToken model).
  Append a "Fixed (2026-07-25)" note describing the hashed, single-use,
  15-min-TTL token table + flow.
- **Master summary**, Req 1 row: `10 ✅ / 2 ⚠️ / 1 ❌` → `11 ✅ / 2 ⚠️ / 0 ❌`.
- **Remediation list item #9** ("MFA per-role & self-service password reset"):
  mark the self-service-token-reset half closed; per-role MFA remains open.
- Update the "Closed in this pass (2026-07-25)" paragraph with the new files.

## Build sequence (summary — full plan via writing-plans)

1. Schema + migration + `db` regenerate.
2. `src/lib/password-reset.ts` + unit tests.
3. `sendPasswordResetEmail` in `src/lib/email.ts`.
4. `forgot-password` route + tests.
5. `reset-password` route + tests.
6. UI pages + login link.
7. Env vars in `.env.example` / `.env.production`.
8. Update the security status doc.
9. `npm run typecheck` + `npm test` for the new files.
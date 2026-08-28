## Task 6: Wire the login route — `isIpBanned` gate + `recordFailedLoginFromIp`

**Files:**
- Modify: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/login.ip-ban.test.ts`

**Interfaces:**
- Consumes: `isIpBanned`, `getIpBanStatus`, `recordFailedLoginFromIp`, `autoUnbanExpiredIps` from `@/lib/ip-ban-utils` (Tasks 3-5).
- Produces: a `403 IP_BLOCKED` response for banned IPs, before the DB user lookup; failed credential checks feed the IP counter.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/auth/login.ip-ban.test.ts`:

```typescript
/**
 * Login route — IP ban gate. Verifies a banned IP gets 403 before the DB lookup,
 * and a failed login feeds the IP failed-login counter.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock ip-ban-utils BEFORE importing the route. vi.mock is hoisted.
vi.mock('@/lib/ip-ban-utils', () => ({
  isIpBanned: vi.fn(),
  getIpBanStatus: vi.fn(),
  recordFailedLoginFromIp: vi.fn().mockResolvedValue(undefined),
  autoUnbanExpiredIps: vi.fn().mockResolvedValue(0),
  isTrustedIp: vi.fn().mockReturnValue(false),
}));

// Mock the other heavy deps the route imports, so the test is isolated.
vi.mock('@/lib/db', () => ({ db: { user: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock('@/lib/password-hash', () => ({ comparePassword: vi.fn() }));
vi.mock('@/lib/audit-logger', () => ({
  logLoginAttempt: vi.fn().mockResolvedValue(undefined),
  getClientIp: vi.fn().mockReturnValue('203.0.113.9'),
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  AuditEventType: { PASSWORD_PWNED_LOGIN: 'PASSWORD_PWNED_LOGIN' },
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { WARNING: 'WARNING' },
}));
vi.mock('@/lib/hibp', () => ({ checkPasswordBreached: vi.fn().mockResolvedValue({ isPwned: false }) }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/auth-helpers', () => ({ completeLogin: vi.fn() }));
vi.mock('@/lib/mfa-utils', () => ({
  createMfaToken: vi.fn(),
  checkOtpRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
  maskEmail: vi.fn().mockReturnValue('j***@e.com'),
}));
vi.mock('@/lib/email', () => ({ sendMfaEmail: vi.fn() }));
vi.mock('@/lib/rate-limiter', () => ({
  withRateLimit: vi.fn((_h: any) => _h), // pass-through wrapper
  checkRateLimitSliding: vi.fn().mockResolvedValue({ allowed: true }),
  buildUserRateLimitKey: vi.fn().mockReturnValue('k'),
}));
vi.mock('@/lib/logger', () => ({ authLogger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/error-handler', () => ({ wrapHandler: vi.fn((_h: any) => _h) }));
vi.mock('@/lib/api-csrf-middleware', () => ({ validateCSRF: vi.fn().mockResolvedValue({ valid: true }) }));
vi.mock('@/lib/session-manager', () => ({
  generatePreSessionToken: vi.fn().mockReturnValue('t'),
  getPreSessionCookieOptions: vi.fn().mockReturnValue({}),
  PRE_SESSION_COOKIE_NAME: 'pre_session',
}));

import { POST } from './route';
import { isIpBanned, recordFailedLoginFromIp } from '@/lib/ip-ban-utils';
import { NextRequest } from 'next/server';

function makeReq(body: object) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('login route — IP ban gate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 IP_BLOCKED when the IP is banned, before any DB lookup', async () => {
    (isIpBanned as any).mockResolvedValue(true);
    const res = await POST(makeReq({ username: 'someone', password: 'x' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.errorCode).toBe('IP_BLOCKED');
    // recordFailedLoginFromIp must NOT have been called (already banned)
    expect(recordFailedLoginFromIp).not.toHaveBeenCalled();
  });

  it('does not 403 when the IP is not banned', async () => {
    (isIpBanned as any).mockResolvedValue(false);
    const res = await POST(makeReq({ username: 'someone', password: 'x' }));
    expect(res.status).not.toBe(403);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/auth/login.ip-ban.test.ts`
Expected: FAIL — either `POST` doesn't reject banned IPs (status 403 assertion fails), or the route doesn't yet import the gate.

- [ ] **Step 3: Wire the gate + recording into the login route**

In `src/app/api/auth/login/route.ts`:

3a. Inside the `withRateLimit(async (request) => {` handler, **after** the CSRF check and `ipAddress` extraction (after current line 38, i.e. after `const deviceInfo = ...`), and **before** the per-user sliding limit block (line 46), add:

```typescript
    // --- IP ban gate (auto-ban on abuse) ---
    // Banned IPs are blocked before the DB user lookup. The hard gate reads
    // Postgres (IpBan), so it survives a Redis outage — only the ephemeral
    // counters live in Redis. See src/lib/ip-ban-utils.ts.
    const {
      isIpBanned: checkIpBanned,
      getIpBanStatus,
      recordFailedLoginFromIp,
      autoUnbanExpiredIps,
    } = await import('@/lib/ip-ban-utils');
    await autoUnbanExpiredIps();

    if (await checkIpBanned(ipAddress)) {
      const status = await getIpBanStatus(ipAddress);
      const isSecurity = status.banType === 'security';
      const message = isSecurity
        ? 'Access denied'
        : `Too many attempts from this address. Please try again in ${status.remainingMinutes} minutes.`;
      const ipResponse = NextResponse.json(
        {
          success: false,
          message,
          errorCode: 'IP_BLOCKED',
          retryAfter: status.remainingMinutes,
        },
        { status: 403 }
      );
      ipResponse.cookies.set(PRE_SESSION_COOKIE_NAME, preSessionToken, preSessionCookieOptions);
      return ipResponse;
    }
```

3b. Feed the counter on credential failures. In the **`User not found`** branch (the block starting at the current `if (!user) {`, around line 90), add before the `const response = NextResponse.json(...)` return:

```typescript
      // Feed the per-IP failed-login counter (may auto-ban on repeated abuse).
      await recordFailedLoginFromIp(ipAddress).catch(() => {});
```

3c. In the **`Account locked`** branch (the `if (isAccountLocked(currentUser)) {` block, around line 163), add after the `incrementFailedLoginAttempts(...)` call and before the `await logLoginAttempt(...)`:

```typescript
      await recordFailedLoginFromIp(ipAddress).catch(() => {});
```

3d. In the **`Invalid password`** branch (the `if (!isPasswordValid) {` block, around line 228), add after the `incrementFailedLoginAttempts(...)` call and before `await logLoginAttempt(...)`:

```typescript
      await recordFailedLoginFromIp(ipAddress).catch(() => {});
```

> **Do NOT** add `recordFailedLoginFromIp` to the password-expired / temporary-password-expired branches — those are policy blocks, not credential failures, and counting them would ban a legit user retrying with an expired password.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/auth/login.ip-ban.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Run the full login route test + existing auth tests to check for regressions**

Run: `npx vitest run src/app/api/auth/ src/lib/account-lockout-utils.test.ts`
Expected: PASS (no regressions in account-lockout tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth/login/route.ts src/app/api/auth/login.ip-ban.test.ts
git commit -m "feat(security): block banned IPs at login + feed failed-login counter"
```

---


## Task 8: Admin routes — `ban-ip` + `unban-ip`

**Files:**
- Create: `src/app/api/admin/ban-ip/route.ts`
- Create: `src/app/api/admin/unban-ip/route.ts`
- Create: `src/app/api/admin/ban-ip.route.test.ts`

**Interfaces:**
- Consumes: `banIpManually`, `unbanIp`, `isIpBanned` from `@/lib/ip-ban-utils`; `withAuth`/`requireReauth` from `@/lib/api-auth`; `withRateLimit`, `wrapHandler`, `validateCSRF`, `getClientIp`, `logAuditEvent` per the pattern in `src/app/api/admin/lock-account/route.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/admin/ban-ip.route.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/ip-ban-utils', () => ({
  banIpManually: vi.fn().mockResolvedValue(undefined),
  unbanIp: vi.fn().mockResolvedValue(undefined),
  isIpBanned: vi.fn().mockResolvedValue(false),
}));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  getClientIp: () => '127.0.0.1',
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { CRITICAL: 'CRITICAL', INFO: 'INFO' },
  AuditEventType: { ADMIN_IP_BAN: 'ADMIN_IP_BAN', ADMIN_IP_UNBAN: 'ADMIN_IP_UNBAN' },
}));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/api-auth', () => ({
  withAuth: vi.fn((h: any) => h),
  requireReauth: vi.fn(() => null),
}));
vi.mock('@/lib/rate-limiter', () => ({ withRateLimit: vi.fn((h: any) => h) }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn() } }));
vi.mock('@/lib/error-handler', () => ({ wrapHandler: vi.fn((h: any) => h) }));
vi.mock('@/lib/api-csrf-middleware', () => ({ validateCSRF: vi.fn().mockResolvedValue({ valid: true }) }));

import { POST as banPost } from './ban-ip/route';
import { POST as unbanPost } from './unban-ip/route';
import { banIpManually, unbanIp } from '@/lib/ip-ban-utils';
import { NextRequest } from 'next/server';

function req(body: object, path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/ban-ip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bans an IP and returns 200', async () => {
    const res = await banPost(req({ ipAddress: '203.0.113.9', reason: 'credential stuffing' }, '/api/admin/ban-ip'));
    expect(res.status).toBe(200);
    expect(banIpManually).toHaveBeenCalledWith('203.0.113.9', expect.any(String), 'credential stuffing', undefined);
  });

  it('rejects a short reason with 400', async () => {
    const res = await banPost(req({ ipAddress: '203.0.113.9', reason: 'bad' }, '/api/admin/ban-ip'));
    expect(res.status).toBe(400);
    expect(banIpManually).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/unban-ip', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unbans an IP and returns 200', async () => {
    const res = await unbanPost(req({ ipAddress: '203.0.113.9', notes: 'investigated — false positive' }, '/api/admin/unban-ip'));
    expect(res.status).toBe(200);
    expect(unbanIp).toHaveBeenCalledWith('203.0.113.9', expect.any(String), 'investigated — false positive');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/admin/ban-ip.route.test.ts`
Expected: FAIL — modules `./ban-ip/route` and `./unban-ip/route` not found.

- [ ] **Step 3: Create the `ban-ip` route**

Create `src/app/api/admin/ban-ip/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { banIpManually } from '@/lib/ip-ban-utils';
import { getClientIp } from '@/lib/audit-logger';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const banIpSchema = z.object({
  ipAddress: z.string().min(1, 'IP address is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  notes: z.string().optional(),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  // Step-up re-authentication: manually banning an IP is a Tier-1 action.
  const denied = requireReauth(request, 'admin.ban-ip', auth);
  if (denied) return denied;

  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) return csrfCheck.response!;

  const body = await request.json();
  const parsed = banIpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }
  const { ipAddress, reason, notes } = parsed.data;

  const adminId = auth.userId;
  const clientIp = getClientIp(request.headers);

  await banIpManually(ipAddress, adminId, reason, notes);

  logger.info(`IP ${ipAddress} banned by admin ${auth.username}`);

  return NextResponse.json({
    success: true,
    message: 'IP banned successfully',
    data: { ipAddress, reason, bannedBy: auth.username },
  });
}, { allowedRoles: ['Admin'] }), 'write'), 'admin-ban-ip');
```

- [ ] **Step 4: Create the `unban-ip` route**

Create `src/app/api/admin/unban-ip/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { unbanIp } from '@/lib/ip-ban-utils';
import { getClientIp } from '@/lib/audit-logger';
import { withAuth, requireReauth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { wrapHandler } from '@/lib/error-handler';
import { validateCSRF } from '@/lib/api-csrf-middleware';

const unbanIpSchema = z.object({
  ipAddress: z.string().min(1, 'IP address is required'),
  notes: z.string().min(10, 'Notes must be at least 10 characters'),
});

export const POST = wrapHandler(withRateLimit(withAuth(async (request, { auth }) => {
  const denied = requireReauth(request, 'admin.unban-ip', auth);
  if (denied) return denied;

  const csrfCheck = await validateCSRF(request);
  if (!csrfCheck.valid) return csrfCheck.response!;

  const body = await request.json();
  const parsed = unbanIpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }
  const { ipAddress, notes } = parsed.data;

  const adminId = auth.userId;
  await unbanIp(ipAddress, adminId, notes);

  logger.info(`IP ${ipAddress} unbanned by admin ${auth.username}`);

  return NextResponse.json({
    success: true,
    message: 'IP unbanned successfully',
    data: { ipAddress, unbannedBy: auth.username },
  });
}, { allowedRoles: ['Admin'] }), 'write'), 'admin-unban-ip');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/app/api/admin/ban-ip.route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/ban-ip/route.ts src/app/api/admin/unban-ip/route.ts src/app/api/admin/ban-ip.route.test.ts
git commit -m "feat(security): admin ban-ip / unban-ip API routes"
```

---


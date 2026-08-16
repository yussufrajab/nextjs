## Task 9: Admin list route + public status route

**Files:**
- Create: `src/app/api/admin/ip-bans/route.ts`
- Create: `src/app/api/auth/ip-ban-status/route.ts`
- Create: `src/app/api/admin/ip-bans.route.test.ts`

**Interfaces:**
- Consumes: `db.ipBan` (`findMany` with `where` + `orderBy`), `getIpBanStatus` from `@/lib/ip-ban-utils`.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/admin/ip-bans.route.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    ipBan: {
      findMany: vi.fn().mockResolvedValue([
        { ipAddress: '203.0.113.9', isActive: true, banType: 'security', banCount: 4, banReason: 'failed_logins', bannedUntil: null, isManuallyBanned: false, bannedBy: null, bannedAt: null, banNotes: null },
      ]),
      count: vi.fn().mockResolvedValue(1),
    },
  },
}));
vi.mock('@/lib/ip-ban-utils', () => ({
  getIpBanStatus: vi.fn().mockResolvedValue({
    isBanned: true, banType: 'security', banReason: 'failed_logins',
    remainingMinutes: 0, canAutoUnban: false, isManuallyBanned: false,
    bannedBy: null, bannedAt: null, banNotes: null,
  }),
}));
vi.mock('@/lib/api-auth', () => ({ withAuth: vi.fn((h: any) => h) }));
vi.mock('@/lib/rate-limiter', () => ({ withRateLimit: vi.fn((h: any) => h) }));
vi.mock('@/lib/error-handler', () => ({ wrapHandler: vi.fn((h: any) => h) }));

import { GET as listGet } from './ip-bans/route';
import { GET as statusGet } from '../auth/ip-ban-status/route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

describe('GET /api/admin/ip-bans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists bans filtered by status=active', async () => {
    const req = new NextRequest('http://localhost/api/admin/ip-bans?status=active');
    const res = await listGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].ipAddress).toBe('203.0.113.9');
    expect((db.ipBan.findMany as any).mock.calls[0][0].where.isActive).toBe(true);
  });
});

describe('GET /api/auth/ip-ban-status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns status for the requested IP', async () => {
    const req = new NextRequest('http://localhost/api/auth/ip-ban-status?ip=203.0.113.9');
    const res = await statusGet(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.isBanned).toBe(true);
  });

  it('rejects a missing ip with 400', async () => {
    const req = new NextRequest('http://localhost/api/auth/ip-ban-status');
    const res = await statusGet(req);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/admin/ip-bans.route.test.ts`
Expected: FAIL — routes not found.

- [ ] **Step 3: Create the admin list route**

Create `src/app/api/admin/ip-bans/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-auth';
import { withRateLimit } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

export const GET = wrapHandler(withRateLimit(withAuth(async (request) => {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'active';

  const where: { isActive?: boolean } = {};
  if (status === 'active') where.isActive = true;
  if (status === 'expired') where.isActive = false;
  // status === 'all' → no filter

  const [bans, total] = await Promise.all([
    db.ipBan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.ipBan.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: bans, total });
}, { allowedRoles: ['Admin'] }), 'read'), 'admin-ip-bans-list');
```

- [ ] **Step 4: Create the public status route**

Create `src/app/api/auth/ip-ban-status/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getIpBanStatus } from '@/lib/ip-ban-utils';
import { withRateLimit } from '@/lib/rate-limiter';
import { wrapHandler } from '@/lib/error-handler';

const querySchema = z.object({ ip: z.string().min(1, 'ip is required') });

export const GET = wrapHandler(withRateLimit(async (request) => {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ ip: url.searchParams.get('ip') });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid request' },
      { status: 400 }
    );
  }

  const status = await getIpBanStatus(parsed.data.ip);
  return NextResponse.json({ success: true, data: status });
}, 'read'), 'ip-ban-status');
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/app/api/admin/ip-bans.route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/ip-bans/route.ts src/app/api/auth/ip-ban-status/route.ts src/app/api/admin/ip-bans.route.test.ts
git commit -m "feat(security): admin ip-bans list + public ip-ban-status routes"
```

---


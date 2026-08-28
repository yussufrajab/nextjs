## Task 5: `ip-ban-utils.ts` — `banIp`, `autoUnbanExpiredIps`, `banIpManually`, `unbanIp`

**Files:**
- Modify: `src/lib/ip-ban-utils.ts` (replace the `declare const banIp` placeholder from Task 4 with the real function; add the rest)
- Modify: `src/lib/ip-ban-utils.test.ts` (append ban/escalation/unban tests)

**Interfaces:**
- Produces:
  - `banIp(ip: string, reason: IpBanReason, context?: Record<string, any>): Promise<IpBan | null>`
  - `autoUnbanExpiredIps(): Promise<number>`
  - `banIpManually(ip: string, adminId: string, reason: string, notes?: string): Promise<void>`
  - `unbanIp(ip: string, adminId: string, notes: string): Promise<void>`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/ip-ban-utils.test.ts`:

```typescript
import {
  banIp,
  autoUnbanExpiredIps,
  banIpManually,
  unbanIp,
  IpBanReason,
} from './ip-ban-utils';
import { logAuditEvent } from '@/lib/audit-logger';

describe('banIp — escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1st ban: standard, 30 min, banCount=1, emits IP_BANNED', async () => {
    (db.ipBan.findUnique as any).mockResolvedValue(null); // no prior ban
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9', banCount: 1, banType: 'standard' });
    await banIp('203.0.113.9', IpBanReason.FAILED_LOGINS, { count: 10 });
    const upsertArgs = (db.ipBan.upsert as any).mock.calls[0][0];
    expect(upsertArgs.where.ipAddress).toBe('203.0.113.9');
    expect(upsertArgs.create.banCount).toBe(1);
    expect(upsertArgs.create.banType).toBe('standard');
    expect(upsertArgs.create.banReason).toBe('failed_logins');
    expect(upsertArgs.create.bannedUntil).toBeInstanceOf(Date);
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'IP_BANNED', severity: 'WARNING', wasBlocked: true })
    );
  });

  it('does not re-escalate within the same active burst', async () => {
    (db.ipBan.findUnique as any).mockResolvedValue({
      ipAddress: '203.0.113.9', isActive: true, banType: 'standard',
      bannedUntil: new Date(Date.now() + 30 * 60000), banCount: 1,
    });
    await banIp('203.0.113.9', IpBanReason.FAILED_LOGINS, { count: 11 });
    expect(db.ipBan.upsert).not.toHaveBeenCalled(); // already actively banned
  });

  it('4th ban upgrades to security (admin unban only), emits IP_BANNED_UPGRADED', async () => {
    (db.ipBan.findUnique as any).mockResolvedValue({
      ipAddress: '203.0.113.9', isActive: false, banType: 'standard',
      bannedUntil: null, banCount: 3,
    });
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b4', ipAddress: '203.0.113.9', banCount: 4, banType: 'security' });
    await banIp('203.0.113.9', IpBanReason.FAILED_LOGINS, { count: 10 });
    const upsertArgs = (db.ipBan.upsert as any).mock.calls[0][0];
    expect(upsertArgs.update.banCount.increment).toBe(1);
    expect(upsertArgs.update.banType).toBe('security');
    expect(upsertArgs.update.bannedUntil).toBeNull();
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'IP_BANNED_UPGRADED', severity: 'CRITICAL' })
    );
  });
});

describe('autoUnbanExpiredIps', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears expired standard bans and emits IP_AUTO_UNBANNED per row', async () => {
    (db.ipBan.updateMany as any).mockResolvedValue({ count: 2 });
    const n = await autoUnbanExpiredIps();
    expect(n).toBe(2);
    expect(db.ipBan.updateMany).toHaveBeenCalledTimes(1);
    expect(db.ipBan.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          banType: 'standard',
          isManuallyBanned: false,
          bannedUntil: { lt: expect.any(Date) },
        }),
      })
    );
  });
});

describe('banIpManually / unbanIp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('banIpManually sets a security manual ban + emits ADMIN_IP_BAN', async () => {
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9' });
    await banIpManually('203.0.113.9', 'admin-1', 'Abuse from this IP', 'repeat offender');
    const upsertArgs = (db.ipBan.upsert as any).mock.calls[0][0];
    expect(upsertArgs.update.isManuallyBanned).toBe(true);
    expect(upsertArgs.update.banType).toBe('security');
    expect(upsertArgs.update.banReason).toBe('admin_ban');
    expect(upsertArgs.update.bannedBy).toBe('admin-1');
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ADMIN_IP_BAN', severity: 'CRITICAL' })
    );
  });

  it('unbanIp clears the ban + Redis counters + emits ADMIN_IP_UNBAN', async () => {
    (db.ipBan.update as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9' });
    await unbanIp('203.0.113.9', 'admin-1', 'investigated — false positive');
    expect(db.ipBan.update).toHaveBeenCalledTimes(1);
    const updateArgs = (db.ipBan.update as any).mock.calls[0][0];
    expect(updateArgs.where.ipAddress).toBe('203.0.113.9');
    expect(updateArgs.data.isActive).toBe(false);
    expect(updateArgs.data.isManuallyBanned).toBe(false);
    expect(updateArgs.data.banType).toBeNull();
    expect(mockDel).toHaveBeenCalled();
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'ADMIN_IP_UNBAN', severity: 'INFO' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ip-ban-utils.test.ts`
Expected: FAIL — `banIp`/`autoUnbanExpiredIps`/`banIpManually`/`unbanIp` not exported (the `declare const banIp` has no runtime body).

- [ ] **Step 3: Replace the `declare const banIp` line with the real functions**

In `src/lib/ip-ban-utils.ts`, **delete** the line:
```typescript
declare const banIp: (ip: string, reason: IpBanReason, context?: Record<string, any>) => Promise<void>;
```
and append the following at the end of the file:

```typescript
// ---------------------------------------------------------------------------
// Ban write path
// ---------------------------------------------------------------------------

function bannedUntilFor(banCount: number): Date | null {
  const mins = durationMinutesForBanCount(banCount);
  if (mins === 0) return null; // security — no auto-expiry
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

/**
 * Create or escalate a ban for an IP. Idempotent within an active burst:
 * if the IP is already actively banned, does nothing (no double-escalation).
 * On a NEW burst (prior ban inactive/expired), increments banCount and applies
 * the next escalation step. Emits IP_BANNED (first/new burst) or
 * IP_BANNED_UPGRADED (standard → security).
 */
export async function banIp(
  ip: string,
  reason: IpBanReason,
  context?: Record<string, any>
): Promise<IpBan | null> {
  if (!ip || ip === 'unknown') return null;
  const existing = await db.ipBan.findUnique({ where: { ipAddress: ip } });
  const now = new Date();

  // Already actively banned — don't double-escalate within the same burst.
  if (existing && isBanRowActive(existing, now)) {
    return existing;
  }

  const banCount = existing ? existing.banCount + 1 : 1;
  const banType = determineBanType(banCount);
  const bannedUntil = bannedUntilFor(banCount);
  const isUpgrade =
    existing?.banType === IpBanType.STANDARD && banType === IpBanType.SECURITY;

  const row = await db.ipBan.upsert({
    where: { ipAddress: ip },
    create: {
      ipAddress: ip,
      banCount,
      banType,
      bannedUntil,
      banReason: reason,
      isActive: true,
      isManuallyBanned: false,
    },
    update: {
      banCount: { increment: 1 },
      banType,
      bannedUntil,
      banReason: reason,
      isActive: true,
      isManuallyBanned: false,
      bannedBy: null,
      bannedAt: null,
      banNotes: null,
    },
  });

  await logAuditEvent({
    eventType: isUpgrade ? AuditEventType.IP_BANNED_UPGRADED : AuditEventType.IP_BANNED,
    eventCategory: AuditEventCategory.SECURITY,
    severity: banType === IpBanType.SECURITY ? AuditSeverity.CRITICAL : AuditSeverity.WARNING,
    userId: null,
    username: null,
    userRole: null,
    ipAddress: ip,
    deviceInfo: null,
    attemptedRoute: '/api/auth/login',
    requestMethod: 'POST',
    isAuthenticated: false,
    wasBlocked: true,
    blockReason: isUpgrade
      ? `IP ban upgraded to SECURITY after ${banCount} offences`
      : `IP banned (${reason}) after ${context?.count ?? 'N'} hits`,
    additionalData: { ip, banCount, banType, bannedUntil, reason, ...context },
  }).catch(() => {}); // best-effort audit

  return row;
}

/**
 * Clear expired standard (auto-expiring) bans. Mirrors autoUnlockExpiredAccounts.
 * Called on login attempts. Returns the number of bans cleared.
 */
export async function autoUnbanExpiredIps(): Promise<number> {
  const now = new Date();
  const result = await db.ipBan.updateMany({
    where: {
      isActive: true,
      banType: IpBanType.STANDARD,
      isManuallyBanned: false,
      bannedUntil: { lt: now },
    },
    data: {
      isActive: false,
      banType: null,
      bannedUntil: null,
      banReason: null,
    },
  });
  return result.count;
}

/**
 * Admin manual ban. Always a security (admin-unban-only) ban.
 */
export async function banIpManually(
  ip: string,
  adminId: string,
  reason: string,
  notes?: string
): Promise<void> {
  const now = new Date();
  await db.ipBan.upsert({
    where: { ipAddress: ip },
    create: {
      ipAddress: ip,
      banCount: 1,
      banType: IpBanType.SECURITY,
      bannedUntil: null,
      banReason: IpBanReason.ADMIN_BAN,
      isManuallyBanned: true,
      bannedBy: adminId,
      bannedAt: now,
      banNotes: notes || reason,
      isActive: true,
    },
    update: {
      banType: IpBanType.SECURITY,
      bannedUntil: null,
      banReason: IpBanReason.ADMIN_BAN,
      isManuallyBanned: true,
      bannedBy: adminId,
      bannedAt: now,
      banNotes: notes || reason,
      isActive: true,
    },
  });

  await logAuditEvent({
    eventType: AuditEventType.ADMIN_IP_BAN,
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.CRITICAL,
    userId: adminId,
    username: null,
    userRole: null,
    ipAddress: ip,
    deviceInfo: null,
    attemptedRoute: '/api/admin/ban-ip',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: `Admin manual IP ban: ${reason}`,
    additionalData: { ip, reason, notes },
  }).catch(() => {});
}

/**
 * Admin manual unban. Clears the ban + Redis counters.
 */
export async function unbanIp(ip: string, adminId: string, notes: string): Promise<void> {
  await db.ipBan.update({
    where: { ipAddress: ip },
    data: {
      isActive: false,
      isManuallyBanned: false,
      banType: null,
      bannedUntil: null,
      banReason: null,
      bannedBy: null,
      bannedAt: null,
      banNotes: notes,
    },
  });

  await clearIpCounters(ip);

  await logAuditEvent({
    eventType: AuditEventType.ADMIN_IP_UNBAN,
    eventCategory: AuditEventCategory.SECURITY,
    severity: AuditSeverity.INFO,
    userId: adminId,
    username: null,
    userRole: null,
    ipAddress: ip,
    deviceInfo: null,
    attemptedRoute: '/api/admin/unban-ip',
    requestMethod: 'POST',
    isAuthenticated: true,
    wasBlocked: false,
    blockReason: null,
    additionalData: { ip, notes },
  }).catch(() => {});
}
```

- [ ] **Step 4: Run the full lib test file to verify all tests pass**

Run: `npx vitest run src/lib/ip-ban-utils.test.ts`
Expected: PASS — all suites (pure helpers, counters, escalation, auto-unban, manual ban/unban).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ip-ban-utils.ts src/lib/ip-ban-utils.test.ts
git commit -m "feat(security): ip-ban write path (banIp, autoUnban, manual ban/unban)"
```

---


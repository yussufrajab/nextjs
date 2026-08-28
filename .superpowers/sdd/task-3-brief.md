## Task 3: `ip-ban-utils.ts` — constants, enums, pure helpers, status reads

**Files:**
- Create: `src/lib/ip-ban-utils.ts`
- Create: `src/lib/ip-ban-utils.test.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db` (`db.ipBan.*` from Task 1), `logAuditEvent`/`AuditEventCategory`/`AuditSeverity` from `@/lib/audit-logger` (Task 2).
- Produces:
  - `IpBanType` enum (`STANDARD='standard'`, `SECURITY='security'`)
  - `IpBanReason` enum (`FAILED_LOGINS='failed_logins'`, `RATE_LIMIT='rate_limit'`, `ADMIN_BAN='admin_ban'`)
  - `determineBanType(banCount: number): IpBanType`
  - `durationMinutesForBanCount(banCount: number): number` (returns minutes for standard bans; 0 for security)
  - `isBanRowActive(ban: { isActive: boolean; banType: string | null; bannedUntil: Date | null }, now?: Date): boolean`
  - `getIpBan(ip: string): Promise<IpBan | null>`
  - `isIpBanned(ip: string): Promise<boolean>`
  - `getIpBanStatus(ip: string): Promise<IpBanStatus>`
  - `IpBanStatus` interface

- [ ] **Step 1: Write the failing tests for pure helpers**

Create `src/lib/ip-ban-utils.test.ts`:

```typescript
/**
 * Unit Tests for IP Ban Utilities
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    ipBan: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock the audit logger
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { INFO: 'INFO', WARNING: 'WARNING', CRITICAL: 'CRITICAL' },
  AuditEventType: {
    IP_BANNED: 'IP_BANNED',
    IP_BANNED_UPGRADED: 'IP_BANNED_UPGRADED',
    IP_AUTO_UNBANNED: 'IP_AUTO_UNBANNED',
    ADMIN_IP_BAN: 'ADMIN_IP_BAN',
    ADMIN_IP_UNBAN: 'ADMIN_IP_UNBAN',
  },
}));

import {
  determineBanType,
  durationMinutesForBanCount,
  isBanRowActive,
  IpBanType,
} from './ip-ban-utils';

describe('determineBanType — escalation ladder', () => {
  it('1st ban → standard', () => {
    expect(determineBanType(1)).toBe(IpBanType.STANDARD);
  });
  it('2nd ban → standard', () => {
    expect(determineBanType(2)).toBe(IpBanType.STANDARD);
  });
  it('3rd ban → standard', () => {
    expect(determineBanType(3)).toBe(IpBanType.STANDARD);
  });
  it('4th ban → security (admin unban only)', () => {
    expect(determineBanType(4)).toBe(IpBanType.SECURITY);
  });
  it('10th ban → security', () => {
    expect(determineBanType(10)).toBe(IpBanType.SECURITY);
  });
});

describe('durationMinutesForBanCount', () => {
  it('1st ban → 30 min', () => expect(durationMinutesForBanCount(1)).toBe(30));
  it('2nd ban → 120 min (2h)', () => expect(durationMinutesForBanCount(2)).toBe(120));
  it('3rd ban → 1440 min (24h)', () => expect(durationMinutesForBanCount(3)).toBe(1440));
  it('security bans (4+) → 0 (no auto-expiry)', () => {
    expect(durationMinutesForBanCount(4)).toBe(0);
    expect(durationMinutesForBanCount(10)).toBe(0);
  });
});

describe('isBanRowActive', () => {
  const now = new Date('2026-08-04T12:00:00Z');
  const future = new Date('2026-08-04T13:00:00Z');
  const past = new Date('2026-08-04T11:00:00Z');

  it('inactive row → not active', () => {
    expect(isBanRowActive({ isActive: false, banType: 'standard', bannedUntil: future }, now)).toBe(false);
  });
  it('security ban → always active while isActive', () => {
    expect(isBanRowActive({ isActive: true, banType: 'security', bannedUntil: null }, now)).toBe(true);
  });
  it('standard ban, not yet expired → active', () => {
    expect(isBanRowActive({ isActive: true, banType: 'standard', bannedUntil: future }, now)).toBe(true);
  });
  it('standard ban, expired → not active', () => {
    expect(isBanRowActive({ isActive: true, banType: 'standard', bannedUntil: past }, now)).toBe(false);
  });
  it('null ban → not active', () => {
    expect(isBanRowActive(null as any, now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/ip-ban-utils.test.ts`
Expected: FAIL — module `./ip-ban-utils` not found.

- [ ] **Step 3: Write the implementation (constants, enums, helpers, status reads)**

Create `src/lib/ip-ban-utils.ts`:

```typescript
import { db } from '@/lib/db';
import { logAuditEvent, AuditEventCategory, AuditSeverity, AuditEventType } from '@/lib/audit-logger';
import { ipBanLogger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants (env-overridable so E2E, which makes many logins from one IP,
// doesn't trip the ban before tests complete)
// ---------------------------------------------------------------------------

export const IP_FAILED_LOGIN_BAN_THRESHOLD =
  Number(process.env.IP_FAILED_LOGIN_BAN_THRESHOLD) || 10;
export const IP_RATELIMIT_HIT_BAN_THRESHOLD =
  Number(process.env.IP_RATELIMIT_HIT_BAN_THRESHOLD) || 3;
export const IP_BAN_WINDOW_SECONDS = Number(process.env.IP_BAN_WINDOW_SECONDS) || 900;

// Escalation ladder: index 0 = 1st ban (30 min), 1 = 2nd ban (2h), 2 = 3rd ban (24h).
// 4th and beyond → SECURITY (admin unban only).
const STANDARD_BAN_DURATIONS_MINUTES = [30, 120, 1440];

function getTrustedIps(): string[] {
  return (process.env.TRUSTED_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isTrustedIp(ip: string | null | undefined): boolean {
  if (!ip || ip === 'unknown') return false;
  return getTrustedIps().includes(ip);
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum IpBanType {
  STANDARD = 'standard', // Auto-expires after a duration
  SECURITY = 'security', // Requires admin unban
}

export enum IpBanReason {
  FAILED_LOGINS = 'failed_logins',
  RATE_LIMIT = 'rate_limit',
  ADMIN_BAN = 'admin_ban',
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function determineBanType(banCount: number): IpBanType {
  // 4th offence and beyond → security lockout (admin unban only)
  if (banCount >= 4) return IpBanType.SECURITY;
  return IpBanType.STANDARD;
}

export function durationMinutesForBanCount(banCount: number): number {
  if (banCount >= 4) return 0; // security — no auto-expiry
  const idx = Math.min(Math.max(banCount - 1, 0), STANDARD_BAN_DURATIONS_MINUTES.length - 1);
  return STANDARD_BAN_DURATIONS_MINUTES[idx];
}

export function isBanRowActive(
  ban: { isActive: boolean; banType: string | null; bannedUntil: Date | null } | null,
  now: Date = new Date()
): boolean {
  if (!ban || !ban.isActive) return false;
  if (ban.banType === IpBanType.SECURITY) return true; // admin-unban only
  if (!ban.bannedUntil) return false;
  return now < new Date(ban.bannedUntil);
}

function remainingMinutes(bannedUntil: Date | null, now: Date = new Date()): number {
  if (!bannedUntil) return 0;
  const ms = new Date(bannedUntil).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 60000));
}

// ---------------------------------------------------------------------------
// Status reads (the hard gate reads from Postgres, not Redis)
// ---------------------------------------------------------------------------

export interface IpBan {
  id: string;
  ipAddress: string;
  banCount: number;
  banType: string | null;
  bannedUntil: Date | null;
  banReason: string | null;
  isManuallyBanned: boolean;
  bannedBy: string | null;
  bannedAt: Date | null;
  banNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IpBanStatus {
  isBanned: boolean;
  banType: IpBanType | null;
  banReason: IpBanReason | null;
  remainingMinutes: number;
  canAutoUnban: boolean;
  isManuallyBanned: boolean;
  bannedBy: string | null;
  bannedAt: Date | null;
  banNotes: string | null;
}

export async function getIpBan(ip: string): Promise<IpBan | null> {
  if (!ip || ip === 'unknown') return null;
  return db.ipBan.findUnique({ where: { ipAddress: ip } });
}

export async function isIpBanned(ip: string): Promise<boolean> {
  const ban = await getIpBan(ip);
  return isBanRowActive(ban);
}

export async function getIpBanStatus(ip: string): Promise<IpBanStatus> {
  const ban = await getIpBan(ip);
  const isBanned = isBanRowActive(ban);
  const banType = (ban?.banType as IpBanType | null) ?? null;
  return {
    isBanned,
    banType,
    banReason: (ban?.banReason as IpBanReason | null) ?? null,
    remainingMinutes: isBanned ? remainingMinutes(ban?.bannedUntil ?? null) : 0,
    canAutoUnban: isBanned && banType === IpBanType.STANDARD && !ban?.isManuallyBanned,
    isManuallyBanned: ban?.isManuallyBanned ?? false,
    bannedBy: ban?.bannedBy ?? null,
    bannedAt: ban?.bannedAt ?? null,
    banNotes: ban?.banNotes ?? null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/ip-ban-utils.test.ts`
Expected: PASS (the `determineBanType`, `durationMinutesForBanCount`, `isBanRowActive` suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ip-ban-utils.ts src/lib/ip-ban-utils.test.ts
git commit -m "feat(security): ip-ban constants, enums, pure helpers, status reads"
```

---


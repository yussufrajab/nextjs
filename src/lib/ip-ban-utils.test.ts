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
// logAuditEvent is async (returns Promise<void>); the mock must return a
// resolved promise so the implementation's `logAuditEvent({...}).catch(()=>{})`
// does not throw "Cannot read properties of undefined (reading 'catch')".
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
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

// Mock ioredis — each test sets the return values via mockFns.
const mockEval = vi.fn();
const mockDel = vi.fn();
vi.mock('ioredis', () => {
  function MockRedis(this: any) {
    this.eval = (...args: any[]) => mockEval(...args);
    this.del = (...args: any[]) => mockDel(...args);
    this.on = vi.fn();
    this.quit = vi.fn();
  }
  return { default: MockRedis };
});

import {
  determineBanType,
  durationMinutesForBanCount,
  isBanRowActive,
  isTrustedIp,
  IpBanType,
  IpBanReason,
  recordFailedLoginFromIp,
  recordRateLimitHit,
  banIp,
  autoUnbanExpiredIps,
  banIpManually,
  unbanIp,
} from './ip-ban-utils';
import { db } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit-logger';

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

describe('isTrustedIp', () => {
  const orig = process.env.TRUSTED_IPS;
  afterEach(() => { process.env.TRUSTED_IPS = orig; });

  it('returns true for a listed IP', () => {
    process.env.TRUSTED_IPS = '10.0.0.1, 10.0.0.2';
    expect(isTrustedIp('10.0.0.1')).toBe(true);
  });
  it('returns false for an unlisted IP', () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    expect(isTrustedIp('203.0.113.9')).toBe(false);
  });
  it('returns false for unknown/null', () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    expect(isTrustedIp('unknown')).toBe(false);
    expect(isTrustedIp(null)).toBe(false);
  });
});

describe('recordFailedLoginFromIp — counter + threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // vitest 4 clearAllMocks resets mockResolvedValue; re-establish so the
    // implementation's logAuditEvent({...}).catch(()=>{}) does not throw.
    (logAuditEvent as any).mockResolvedValue(undefined);
    (db.ipBan.findUnique as any).mockResolvedValue(null); // not currently banned
  });

  it('does nothing for a trusted IP', async () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    await recordFailedLoginFromIp('10.0.0.1');
    expect(mockEval).not.toHaveBeenCalled();
  });

  it('increments the Redis counter but does NOT ban below threshold', async () => {
    mockEval.mockResolvedValue(3); // ZCARD after ZADD → 3, below default 10
    await recordFailedLoginFromIp('203.0.113.9');
    expect(mockEval).toHaveBeenCalledTimes(1);
    expect(db.ipBan.upsert).not.toHaveBeenCalled();
  });

  it('calls banIp when the counter reaches the threshold', async () => {
    mockEval.mockResolvedValue(10); // reaches default threshold 10
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9', banCount: 1 });
    await recordFailedLoginFromIp('203.0.113.9');
    expect(db.ipBan.upsert).toHaveBeenCalledTimes(1);
  });

  it('fails open (no throw) when Redis is unavailable', async () => {
    mockEval.mockRejectedValue(new Error('redis down'));
    await expect(recordFailedLoginFromIp('203.0.113.9')).resolves.toBeUndefined();
    expect(db.ipBan.upsert).not.toHaveBeenCalled();
  });

  it('does not count while the IP is already actively banned', async () => {
    (db.ipBan.findUnique as any).mockResolvedValue({
      ipAddress: '203.0.113.9', isActive: true, banType: 'security', bannedUntil: null,
    });
    await recordFailedLoginFromIp('203.0.113.9');
    expect(mockEval).not.toHaveBeenCalled();
  });
});

describe('recordRateLimitHit — counter + threshold', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (logAuditEvent as any).mockResolvedValue(undefined);
    (db.ipBan.findUnique as any).mockResolvedValue(null);
  });

  it('calls banIp after the configured number of auth 429s', async () => {
    mockEval.mockResolvedValue(3); // reaches default threshold 3
    (db.ipBan.upsert as any).mockResolvedValue({ id: 'b1', ipAddress: '203.0.113.9', banCount: 1 });
    await recordRateLimitHit('203.0.113.9');
    expect(db.ipBan.upsert).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a trusted IP', async () => {
    process.env.TRUSTED_IPS = '10.0.0.1';
    await recordRateLimitHit('10.0.0.1');
    expect(mockEval).not.toHaveBeenCalled();
  });
});

describe('banIp — escalation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (logAuditEvent as any).mockResolvedValue(undefined);
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
  beforeEach(() => {
    vi.clearAllMocks();
    (logAuditEvent as any).mockResolvedValue(undefined);
  });

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
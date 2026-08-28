import Redis from 'ioredis';
import { db } from '@/lib/db';
import { logAuditEvent, AuditEventCategory, AuditSeverity, AuditEventType } from '@/lib/audit-logger';
// ipBanLogger is used by downstream ban functions (Tasks 4-5); kept imported
// here so this module is the single import surface for the IP-ban feature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export async function getIpBan(ip: string | null): Promise<IpBan | null> {
  if (!ip || ip === 'unknown') return null;
  return db.ipBan.findUnique({ where: { ipAddress: ip } });
}

export async function isIpBanned(ip: string | null): Promise<boolean> {
  const ban = await getIpBan(ip);
  return isBanRowActive(ban);
}

export async function getIpBanStatus(ip: string | null): Promise<IpBanStatus> {
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

// Re-export the audit helpers that downstream ban functions (Tasks 4-5) use,
// so they can import everything from this module.
export { logAuditEvent, AuditEventCategory, AuditSeverity, AuditEventType };

// ---------------------------------------------------------------------------
// Redis client (ephemeral per-IP abuse counters)
// ---------------------------------------------------------------------------

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  try {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // fail fast — counters fail open
      lazyConnect: true,
      connectTimeout: 2000,
    });
    redisClient.on('error', (err) => {
      ipBanLogger.warn({ err: err.message || err }, 'ip-ban Redis error');
    });
  } catch (err) {
    ipBanLogger.warn({ err }, 'Failed to create ip-ban Redis client');
    redisClient = null;
  }
  return redisClient;
}

/**
 * Atomic sliding-window counter: trims members older than the window, adds the
 * current timestamp, refreshes the TTL, and returns the surviving count.
 * Mirrors the ZSET pattern in rate-limiter.ts (SLIDING_WINDOW_SCRIPT) but
 * returns the count instead of a allow/deny decision.
 */
const IP_COUNTER_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])
local member = ARGV[3]
local cutoff = now - windowSeconds * 1000
redis.call('ZREMRANGEBYSCORE', key, '-inf', '(' .. cutoff)
redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, windowSeconds)
return redis.call('ZCARD', key)
`;

/**
 * Increment the per-IP sliding-window counter and return the new count.
 * Returns null when Redis is unavailable or errors (caller fails open).
 */
async function incrementIpCounter(ip: string, keyPrefix: string): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;
  const now = Date.now();
  const member = `${now}:${Math.random().toString(36).slice(2)}`;
  try {
    const count = (await client.eval(
      IP_COUNTER_SCRIPT,
      1,
      `${keyPrefix}:${ip}`,
      now,
      IP_BAN_WINDOW_SECONDS,
      member
    )) as number;
    return Number(count);
  } catch (err) {
    ipBanLogger.warn({ err, keyPrefix, ip }, 'ip-ban Redis counter error – fail-open');
    return null;
  }
}

async function clearIpCounters(ip: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.del(`ipban:failedlogins:${ip}`, `ipban:limithits:${ip}`);
  } catch {
    // best-effort — counters age out via TTL anyway
  }
}

// ---------------------------------------------------------------------------
// Counter-driven ban triggers
// ---------------------------------------------------------------------------

export async function recordFailedLoginFromIp(
  ip: string | null,
  context?: Record<string, any>
): Promise<void> {
  if (!ip || isTrustedIp(ip)) return;
  if (await isIpBanned(ip)) return; // don't count while already actively banned
  const count = await incrementIpCounter(ip, 'ipban:failedlogins');
  if (count === null) return; // Redis down — fail open
  if (count >= IP_FAILED_LOGIN_BAN_THRESHOLD) {
    await banIp(ip, IpBanReason.FAILED_LOGINS, { count, ...context });
  }
}

export async function recordRateLimitHit(ip: string | null): Promise<void> {
  if (!ip || isTrustedIp(ip)) return;
  if (await isIpBanned(ip)) return;
  const count = await incrementIpCounter(ip, 'ipban:limithits');
  if (count === null) return;
  if (count >= IP_RATELIMIT_HIT_BAN_THRESHOLD) {
    await banIp(ip, IpBanReason.RATE_LIMIT, { count });
  }
}

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
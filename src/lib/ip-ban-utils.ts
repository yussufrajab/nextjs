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

// Re-export the audit helpers that downstream ban functions (Tasks 4-5) use,
// so they can import everything from this module.
export { logAuditEvent, AuditEventCategory, AuditSeverity, AuditEventType };
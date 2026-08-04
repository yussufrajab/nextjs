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
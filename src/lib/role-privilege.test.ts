/**
 * Tests for role-privilege helpers (Req 26.2): escalation classification and
 * burst detection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PRIVILEGE_ROLE_RANK,
  privilegeRank,
  isPrivilegeEscalation,
  isHighPrivilegeRole,
  detectEscalationBurst,
  escalationBurstWindowSeconds,
  escalationBurstThreshold,
} from './role-privilege';

describe('role-privilege — static ranking', () => {
  it('ranks the CSMS privilege tiers in increasing order', () => {
    expect(privilegeRank('EMPLOYEE')).toBeLessThan(privilegeRank('HRO'));
    expect(privilegeRank('HRO')).toBeLessThan(privilegeRank('HRMO'));
    expect(privilegeRank('HRMO')).toBeLessThan(privilegeRank('HHRMD'));
    expect(privilegeRank('HHRMD')).toBeLessThan(privilegeRank('CSCS'));
    expect(privilegeRank('CSCS')).toBeLessThan(privilegeRank('Admin'));
  });

  it('treats the high-privilege tiers as Admin/HHRMD/CSCS', () => {
    expect(isHighPrivilegeRole('Admin')).toBe(true);
    expect(isHighPrivilegeRole('HHRMD')).toBe(true);
    expect(isHighPrivilegeRole('CSCS')).toBe(true);
    // case-insensitive
    expect(isHighPrivilegeRole('admin')).toBe(true);
    expect(isHighPrivilegeRole('cscs')).toBe(true);
    // non-high-priv tiers
    expect(isHighPrivilegeRole('HRO')).toBe(false);
    expect(isHighPrivilegeRole('HRMO')).toBe(false);
    expect(isHighPrivilegeRole('EMPLOYEE')).toBe(false);
    expect(isHighPrivilegeRole(null)).toBe(false);
  });

  it('preserves the full ADMIN key in the rank map (ROLES.ADMIN === "Admin")', () => {
    expect(PRIVILEGE_ROLE_RANK['Admin']).toBe(6);
  });
});

describe('isPrivilegeEscalation', () => {
  it('flags a rank increase as an escalation', () => {
    expect(isPrivilegeEscalation('HRO', 'Admin')).toBe(true);
    expect(isPrivilegeEscalation('EMPLOYEE', 'CSCS')).toBe(true);
    expect(isPrivilegeEscalation('HRO', 'HHRMD')).toBe(true);
    expect(isPrivilegeEscalation('HRMO', 'HHRMD')).toBe(true);
    expect(isPrivilegeEscalation('HHRMD', 'CSCS')).toBe(true);
    expect(isPrivilegeEscalation('HRO', 'HRMO')).toBe(true);
  });

  it('does not flag lateral moves (same rank)', () => {
    expect(isPrivilegeEscalation('DO', 'HRMO')).toBe(false);
    expect(isPrivilegeEscalation('HRRP', 'PO')).toBe(false);
  });

  it('does not flag demotions', () => {
    expect(isPrivilegeEscalation('Admin', 'HRO')).toBe(false);
    expect(isPrivilegeEscalation('CSCS', 'HHRMD')).toBe(false);
    expect(isPrivilegeEscalation('HRMO', 'HRO')).toBe(false);
  });

  it('does not flag an unknown new role as an escalation', () => {
    expect(isPrivilegeEscalation('HRO', 'SUPERUSER')).toBe(false);
    expect(isPrivilegeEscalation('HRO', '')).toBe(false);
    expect(isPrivilegeEscalation('HRO', undefined)).toBe(false);
  });

  it('treats a role emerging from an unknown previous role as an escalation when the new role is known and outranks -1', () => {
    // Previous role unknown → rank -1; any known new role outranks it.
    expect(isPrivilegeEscalation('SUPERUSER', 'HRO')).toBe(true);
    expect(isPrivilegeEscalation(null, 'Admin')).toBe(true);
  });
});

describe('detectEscalationBurst', () => {
  const mockQueryAuditLogs = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    mockQueryAuditLogs.mockReset();
    vi.doMock('@/lib/audit-db', () => ({
      queryAuditLogs: (...a: any[]) => mockQueryAuditLogs(...a),
    }));
  });

  async function load() {
    const mod = await import('./role-privilege');
    return mod.detectEscalationBurst;
  }

  function logWith(privilegeEscalation: boolean) {
    return { additionalData: { privilegeEscalation } };
  }

  it('counts the in-flight escalation on top of prior escalations in the window', async () => {
    // Two prior escalations already in the audit trail → count = 3 → burst.
    mockQueryAuditLogs.mockResolvedValue({
      logs: [logWith(true), logWith(true), logWith(false), logWith(false)],
      total: 4,
    });
    const detect = await load();
    const result = await detect({ threshold: 3, windowSeconds: 3600 });
    expect(result).not.toBeNull();
    expect(result!.count).toBe(3);
    expect(result!.threshold).toBe(3);
    expect(result!.isBurst).toBe(true);
  });

  it('is not a burst when prior escalations plus the in-flight one stay below threshold', async () => {
    mockQueryAuditLogs.mockResolvedValue({
      logs: [logWith(true), logWith(false), logWith(false)],
      total: 3,
    });
    const detect = await load();
    const result = await detect({ threshold: 3, windowSeconds: 3600 });
    expect(result!.count).toBe(2); // 1 prior + in-flight
    expect(result!.isBurst).toBe(false);
  });

  it('queries USER_UPDATED events since (now - windowSeconds)', async () => {
    mockQueryAuditLogs.mockResolvedValue({ logs: [], total: 0 });
    const detect = await load();
    const now = new Date('2026-07-26T12:00:00Z');
    await detect({ threshold: 5, windowSeconds: 600, now });
    expect(mockQueryAuditLogs).toHaveBeenCalledTimes(1);
    const filters = mockQueryAuditLogs.mock.calls[0][0];
    expect(filters.eventType).toBe('USER_UPDATED');
    expect(filters.startDate).toEqual(new Date('2026-07-26T11:50:00Z'));
  });

  it('returns null (never throws) when the audit query fails', async () => {
    mockQueryAuditLogs.mockRejectedValue(new Error('audit db down'));
    const detect = await load();
    const result = await detect({ threshold: 3 });
    expect(result).toBeNull();
  });
});

describe('burst env configuration', () => {
  it('defaults the window to 1h and the threshold to 3', () => {
    delete process.env.PRIVILEGE_ESCALATION_BURST_WINDOW_SECONDS;
    delete process.env.PRIVILEGE_ESCALATION_BURST_THRESHOLD;
    expect(escalationBurstWindowSeconds()).toBe(3600);
    expect(escalationBurstThreshold()).toBe(3);
  });

  it('honours env overrides and falls back on bad values', () => {
    process.env.PRIVILEGE_ESCALATION_BURST_WINDOW_SECONDS = '900';
    process.env.PRIVILEGE_ESCALATION_BURST_THRESHOLD = '5';
    expect(escalationBurstWindowSeconds()).toBe(900);
    expect(escalationBurstThreshold()).toBe(5);

    process.env.PRIVILEGE_ESCALATION_BURST_WINDOW_SECONDS = 'nope';
    process.env.PRIVILEGE_ESCALATION_BURST_THRESHOLD = '';
    expect(escalationBurstWindowSeconds()).toBe(3600);
    expect(escalationBurstThreshold()).toBe(3);

    delete process.env.PRIVILEGE_ESCALATION_BURST_WINDOW_SECONDS;
    delete process.env.PRIVILEGE_ESCALATION_BURST_THRESHOLD;
  });
});
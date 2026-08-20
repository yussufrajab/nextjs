/**
 * Tests for PUT /api/users/[id] — privilege-escalation detection & alerting
 * (Req 26.2).
 *
 * Verifies that a role change escalating to a high-privilege tier
 * (Admin/HHRMD/CSCS) emits a CRITICAL POTENTIAL_BREACH audit event through the
 * dispatchSecurityAlert pipeline, that a burst of routine-tier escalations
 * also emits one, and that lateral / non-escalating changes do not.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockDbUserFindUnique = vi.fn(); // previousUser lookup
const mockDbUserUpdate = vi.fn();
const mockLogUserAction = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockTerminateAllUserSessions = vi.fn();
const mockDetectEscalationBurst = vi.fn();
const mockHashPassword = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...a: any[]) => mockDbUserFindUnique(...a),
      update: (...a: any[]) => mockDbUserUpdate(...a),
    },
  },
}));

vi.mock('@/lib/audit-logger', () => ({
  getClientIp: (headers: Headers) => headers.get('x-forwarded-for') || null,
  logUserAction: (...a: any[]) => mockLogUserAction(...a),
  logAuditEvent: (...a: any[]) => mockLogAuditEvent(...a),
  AuditEventType: { POTENTIAL_BREACH: 'POTENTIAL_BREACH', ADMIN_PASSWORD_RESET: 'ADMIN_PASSWORD_RESET' },
  AuditEventCategory: { SECURITY: 'SECURITY' },
  AuditSeverity: { CRITICAL: 'CRITICAL', INFO: 'INFO', WARNING: 'WARNING' },
}));

vi.mock('@/lib/api-auth', () => ({
  // Pass the handler through unchanged so the test can supply `{ auth }`.
  withAuth: (h: any) => h,
  // Step-up re-auth always satisfied in these tests.
  requireReauth: () => null,
}));

vi.mock('@/lib/session-manager', () => ({
  terminateAllUserSessions: (...a: any[]) => mockTerminateAllUserSessions(...a),
}));

vi.mock('@/lib/role-privilege', () => ({
  isPrivilegeEscalation: (prev: string, next: string) => {
    // Mirror the real rank logic without importing the env-dependent module.
    const rank: Record<string, number> = {
      EMPLOYEE: 0, HRO: 1, HRRP: 2, PO: 2, DO: 3, HRMO: 3, HHRMD: 4, CSCS: 5, Admin: 6,
    };
    const n = rank[next];
    if (n === undefined) return false;
    return n > (rank[prev] ?? -1);
  },
  isHighPrivilegeRole: (role: string) =>
    ['ADMIN', 'HHRMD', 'CSCS'].includes(String(role).toUpperCase()),
  detectEscalationBurst: (...a: any[]) => mockDetectEscalationBurst(...a),
}));

vi.mock('@/lib/error-handler', () => ({
  wrapHandler: (h: any) => h,
}));

vi.mock('@/lib/password-utils', () => ({
  validatePasswordComplexity: (pwd: string) => pwd && pwd.length >= 12,
  isCommonPassword: () => false,
  calculateTemporaryPasswordExpiry: () => new Date(),
  PASSWORD_MIN_LENGTH: 12,
}));
vi.mock('@/lib/password-hash', () => ({
  hashPassword: (...a: any[]) => mockHashPassword(...a),
}));


function putRequest(id: string, body: any): NextRequest {
  return new NextRequest(`http://localhost:9002/api/users/${id}`, {
    method: 'PUT',
    headers: {
      'x-forwarded-for': '10.0.0.1',
      'user-agent': 'TestAgent/1.0',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function authedContext(overrides: any = {}) {
  return {
    auth: {
      userId: 'admin-1',
      username: 'admin_user',
      role: 'Admin',
      institutionId: 'inst-1',
      ...overrides,
    },
  };
}

const NON_BURST = { count: 1, threshold: 3, windowSeconds: 3600, isBurst: false };
const BURST = { count: 3, threshold: 3, windowSeconds: 3600, isBurst: true };

describe('PUT /api/users/[id] — privilege-escalation alerting (Req 26.2)', () => {
  beforeEach(() => {
    mockDbUserFindUnique.mockReset();
    mockDbUserUpdate.mockReset();
    mockLogUserAction.mockReset();
    mockLogAuditEvent.mockReset();
    mockTerminateAllUserSessions.mockReset();
    mockDetectEscalationBurst.mockReset();
    mockLogUserAction.mockResolvedValue(undefined);
    mockLogAuditEvent.mockResolvedValue(undefined);
    mockTerminateAllUserSessions.mockResolvedValue(1);
    mockDetectEscalationBurst.mockResolvedValue(NON_BURST);
  });

  it('emits a CRITICAL POTENTIAL_BREACH on escalation to Admin', async () => {
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'Admin', active: true, Institution: { name: 'Commission' },
    });

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { role: 'Admin' }), authedContext());

    expect(res.status).toBe(200);

    // USER_UPDATED audit row carries the escalation flag (for burst counting).
    expect(mockLogUserAction).toHaveBeenCalledTimes(1);
    const updateCall = mockLogUserAction.mock.calls[0][0];
    expect(updateCall.additionalData.privilegeEscalation).toBe(true);
    expect(updateCall.additionalData.newRole).toBe('Admin');

    // CRITICAL POTENTIAL_BREACH emitted through the alert pipeline.
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const alert = mockLogAuditEvent.mock.calls[0][0];
    expect(alert.eventType).toBe('POTENTIAL_BREACH');
    expect(alert.eventCategory).toBe('SECURITY');
    expect(alert.severity).toBe('CRITICAL');
    expect(alert.additionalData.privilegeEscalation).toBe(true);
    expect(alert.additionalData.highPrivilegeEscalation).toBe(true);
    expect(alert.additionalData.previousRole).toBe('HRO');
    expect(alert.additionalData.newRole).toBe('Admin');
  });

  it('emits a CRITICAL alert on escalation to HHRMD and CSCS too', async () => {
    for (const targetRole of ['HHRMD', 'CSCS']) {
      mockLogAuditEvent.mockClear();
      mockDbUserFindUnique.mockResolvedValue({
        id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
      });
      mockDbUserUpdate.mockResolvedValue({
        id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
        role: targetRole, active: true, Institution: { name: 'Commission' },
      });

      const { PUT } = (await import('./route')) as { PUT: any };
      const res = await PUT(putRequest('u2', { role: targetRole }), authedContext());
      expect(res.status).toBe(200);
      expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
      const alert = mockLogAuditEvent.mock.calls[0][0];
      expect(alert.severity).toBe('CRITICAL');
      expect(alert.additionalData.highPrivilegeEscalation).toBe(true);
      expect(alert.additionalData.newRole).toBe(targetRole);
    }
  });

  it('does NOT emit a CRITICAL alert on a lateral (same-rank) role change', async () => {
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'DO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'HRMO', active: true, Institution: { name: 'Commission' },
    });

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { role: 'HRMO' }), authedContext());
    expect(res.status).toBe(200);

    // USER_UPDATED still recorded, but NOT flagged as an escalation.
    expect(mockLogUserAction).toHaveBeenCalledTimes(1);
    expect(mockLogUserAction.mock.calls[0][0].additionalData.privilegeEscalation).toBe(false);
    // No CRITICAL POTENTIAL_BREACH for a lateral move.
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it('does NOT emit a CRITICAL alert on a demotion', async () => {
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'CSCS', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'HRO', active: true, Institution: { name: 'Commission' },
    });

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { role: 'HRO' }), authedContext());
    expect(res.status).toBe(200);
    expect(mockLogUserAction.mock.calls[0][0].additionalData.privilegeEscalation).toBe(false);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it('does NOT alert on a routine single escalation (HRO→HRMO) outside a burst', async () => {
    // Rank increases (1 → 3) but not into a high-privilege tier and not a burst.
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'HRMO', active: true, Institution: { name: 'Commission' },
    });
    mockDetectEscalationBurst.mockResolvedValue(NON_BURST);

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { role: 'HRMO' }), authedContext());
    expect(res.status).toBe(200);
    // Flagged as an escalation on the USER_UPDATED row (counted toward burst)...
    expect(mockLogUserAction.mock.calls[0][0].additionalData.privilegeEscalation).toBe(true);
    // ...but no CRITICAL alert, since it is neither high-privilege nor a burst.
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it('emits a CRITICAL alert when a routine-tier escalation is part of a burst', async () => {
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'HRMO', active: true, Institution: { name: 'Commission' },
    });
    mockDetectEscalationBurst.mockResolvedValue(BURST);

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { role: 'HRMO' }), authedContext());
    expect(res.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const alert = mockLogAuditEvent.mock.calls[0][0];
    expect(alert.severity).toBe('CRITICAL');
    expect(alert.additionalData.highPrivilegeEscalation).toBe(false);
    expect(alert.additionalData.burst.isBurst).toBe(true);
    expect(alert.additionalData.burst.count).toBe(3);
  });

  it('still escalates the alert when the burst lookup fails (high-privilege path)', async () => {
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'Admin', active: true, Institution: { name: 'Commission' },
    });
    mockDetectEscalationBurst.mockResolvedValue(null); // audit query failed

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { role: 'Admin' }), authedContext());
    expect(res.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    expect(mockLogAuditEvent.mock.calls[0][0].severity).toBe('CRITICAL');
    expect(mockLogAuditEvent.mock.calls[0][0].additionalData.burst).toBeNull();
  });

  it('does not alert when only the institution changes (no role escalation)', async () => {
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'HRO', active: true, Institution: { name: 'Other Inst' },
    });

    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { institutionId: 'inst-9' }), authedContext());
    expect(res.status).toBe(200);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it('blocks self-role-change with a CRITICAL POTENTIAL_BREACH and no DB write', async () => {
    // An admin attempts to change their OWN role. This is the canonical
    // self-escalation attack — it must be blocked, logged as CRITICAL, and
    // must NOT reach the DB update.
    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(
      putRequest('admin-1', { role: 'Admin' }),
      authedContext({ userId: 'admin-1', role: 'Admin' })
    );
    expect(res.status).toBe(403);

    // CRITICAL POTENTIAL_BREACH audit event emitted with the attempt details.
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1);
    const alert = mockLogAuditEvent.mock.calls[0][0];
    expect(alert.eventType).toBe('POTENTIAL_BREACH');
    expect(alert.severity).toBe('CRITICAL');
    expect(alert.wasBlocked).toBe(true);
    expect(alert.blockReason).toBe('SELF_ROLE_CHANGE_BLOCKED');
    expect(alert.additionalData.selfRoleChange).toBe(true);
    expect(alert.additionalData.attemptedNewRole).toBe('Admin');

    // No DB mutation for the blocked attempt.
    expect(mockDbUserUpdate).not.toHaveBeenCalled();
  });
});

describe('PUT /api/users/[id] — optional password change', () => {
  beforeEach(() => {
    mockDbUserFindUnique.mockReset();
    mockDbUserUpdate.mockReset();
    mockLogUserAction.mockReset();
    mockLogAuditEvent.mockReset();
    mockTerminateAllUserSessions.mockReset();
    mockDetectEscalationBurst.mockReset();
    mockHashPassword.mockReset();
    mockHashPassword.mockResolvedValue('hashed-pw');
    mockLogUserAction.mockResolvedValue(undefined);
    mockLogAuditEvent.mockResolvedValue(undefined);
    mockTerminateAllUserSessions.mockResolvedValue(1);
    mockDetectEscalationBurst.mockResolvedValue(NON_BURST);
    mockDbUserFindUnique.mockResolvedValue({
      id: 'u2', role: 'HRO', institutionId: 'inst-2', username: 'target',
    });
    mockDbUserUpdate.mockResolvedValue({
      id: 'u2', name: 'Target', username: 'target', email: null, phoneNumber: null,
      role: 'HRO', active: true, Institution: { name: 'Commission' },
    });
  });

  it('leaves the password untouched when no password is supplied', async () => {
    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(putRequest('u2', { name: 'Target Renamed' }), authedContext());
    expect(res.status).toBe(200);

    const updateArg = mockDbUserUpdate.mock.calls[0][0];
    // No password hash written, no temporary-password flags set.
    expect(updateArg.data.password).toBeUndefined();
    expect(updateArg.data.isTemporaryPassword).toBeUndefined();
    expect(updateArg.data.mustChangePassword).toBeUndefined();

    const body = await res.json();
    expect(body.passwordChanged).toBe(false);
    // No ADMIN_PASSWORD_RESET audit event.
    const resetEvents = mockLogAuditEvent.mock.calls
      .map((c) => c[0])
      .filter((e) => e.eventType === 'ADMIN_PASSWORD_RESET');
    expect(resetEvents).toHaveLength(0);
  });

  it('hashes and installs a temporary password when a valid password is supplied', async () => {
    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(
      putRequest('u2', { name: 'Target', password: 'StrongNewPass1!2024' }),
      authedContext()
    );
    expect(res.status).toBe(200);

    const updateArg = mockDbUserUpdate.mock.calls[0][0];
    expect(updateArg.data.password).toBe('hashed-pw');
    expect(updateArg.data.isTemporaryPassword).toBe(true);
    expect(updateArg.data.mustChangePassword).toBe(true);
    expect(updateArg.data.temporaryPasswordExpiry).toBeInstanceOf(Date);
    expect(updateArg.data.passwordExpiresAt).toBeNull();

    const body = await res.json();
    expect(body.passwordChanged).toBe(true);

    // ADMIN_PASSWORD_RESET audit event emitted.
    const resetEvents = mockLogAuditEvent.mock.calls
      .map((c) => c[0])
      .filter((e) => e.eventType === 'ADMIN_PASSWORD_RESET');
    expect(resetEvents).toHaveLength(1);
    expect(resetEvents[0].additionalData.targetUserId).toBe('u2');

    // Sessions terminated for the target after a password change.
    expect(mockTerminateAllUserSessions).toHaveBeenCalledWith('u2');
  });
  it('rejects a weak password with 400 and does not update', async () => {
    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(
      putRequest('u2', { name: 'Target', password: 'weak' }),
      authedContext()
    );
    expect(res.status).toBe(400);
    expect(mockDbUserUpdate).not.toHaveBeenCalled();
  });

  it('blocks an admin from setting their own password through this path', async () => {
    const { PUT } = (await import('./route')) as { PUT: any };
    const res = await PUT(
      putRequest('admin-1', { name: 'Admin', password: 'StrongNewPass1!2024' }),
      authedContext({ userId: 'admin-1' })
    );
    expect(res.status).toBe(403);
    expect(mockDbUserUpdate).not.toHaveBeenCalled();
  });
});
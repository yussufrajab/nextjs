/**
 * Wiring tests for the security-alerting hook in logAuditEvent (Req 26.6).
 *
 * `logAuditEvent` must, on top of the audit INSERT + pino log, fire-and-forget
 * `dispatchSecurityAlert` for CRITICAL events, and dispatch an ERROR alert
 * when the audit write itself fails (a tampering/DB-outage signal). The
 * alert dispatch must never block the audit call or throw into it.
 *
 * The alert module's own behavior is unit-tested in
 * src/lib/security-alerts.test.ts; here we only assert the wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeAuditLogMock = vi.fn();
const dispatchSecurityAlertMock = vi.fn();

vi.mock('./audit-db', () => ({
  writeAuditLog: (...a: any[]) => writeAuditLogMock(...a),
  queryAuditLogs: vi.fn(),
  queryAuditStats: vi.fn(),
  ensurePartitions: vi.fn(),
}));

vi.mock('@/lib/security-alerts', () => ({
  dispatchSecurityAlert: (...a: any[]) => dispatchSecurityAlertMock(...a),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  writeAuditLogMock.mockReset();
  dispatchSecurityAlertMock.mockReset();
  dispatchSecurityAlertMock.mockResolvedValue(undefined);
  writeAuditLogMock.mockResolvedValue(undefined);
});

describe('logAuditEvent — security alert wiring (Req 26.6)', () => {
  it('dispatches an alert for a CRITICAL audit event', async () => {
    const { logAuditEvent, AuditEventType, AuditEventCategory, AuditSeverity } = await import(
      './audit-logger'
    );

    await logAuditEvent({
      eventType: AuditEventType.USER_DELETED,
      eventCategory: AuditEventCategory.DATA_MODIFICATION,
      severity: AuditSeverity.CRITICAL,
      userId: 'admin-1',
      username: 'admin',
      userRole: 'Admin',
      ipAddress: '10.0.0.1',
      attemptedRoute: '/api/users/u2',
      requestMethod: 'DELETE',
      isAuthenticated: true,
      wasBlocked: false,
    });

    expect(dispatchSecurityAlertMock).toHaveBeenCalledTimes(1);
    const event = dispatchSecurityAlertMock.mock.calls[0][0];
    expect(event.eventType).toBe('USER_DELETED');
    expect(event.severity).toBe('CRITICAL');
    expect(event.username).toBe('admin');
    expect(event.attemptedRoute).toBe('/api/users/u2');
  });

  it('still dispatches for ERROR events (alert module applies the threshold)', async () => {
    const { logAuditEvent, AuditEventCategory, AuditSeverity } = await import('./audit-logger');

    await logAuditEvent({
      eventType: 'FORBIDDEN_ROUTE',
      eventCategory: AuditEventCategory.ACCESS,
      severity: AuditSeverity.ERROR,
      attemptedRoute: '/dashboard/admin',
      requestMethod: 'GET',
    });

    // Wiring forwards every event; the threshold gate lives in the alert
    // module (unit-tested separately). Here we only assert it is forwarded.
    expect(dispatchSecurityAlertMock).toHaveBeenCalledTimes(1);
  });

  it('dispatches an AUDIT_WRITE_FAILED alert when the audit INSERT throws, without rethrowing', async () => {
    writeAuditLogMock.mockRejectedValueOnce(new Error('db down'));
    const { logAuditEvent, AuditEventCategory, AuditSeverity } = await import('./audit-logger');

    await expect(
      logAuditEvent({
        eventType: 'EMPLOYEE_UPDATED',
        eventCategory: AuditEventCategory.DATA_MODIFICATION,
        severity: AuditSeverity.INFO,
        username: 'hro',
        attemptedRoute: '/api/employees/e1',
        requestMethod: 'PATCH',
      })
    ).resolves.toBeUndefined();

    expect(dispatchSecurityAlertMock).toHaveBeenCalledTimes(1);
    const event = dispatchSecurityAlertMock.mock.calls[0][0];
    expect(event.eventType).toBe('AUDIT_WRITE_FAILED');
    expect(event.severity).toBe('ERROR');
    expect(event.blockReason).toContain('db down');
  });
});
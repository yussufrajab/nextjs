/**
 * Tests for MEDIUM-gap audit helpers
 *
 * Covers:
 *  - logRequestForward: emits REQUEST_FORWARDED with fromStage/toStage
 *  - logConfigChange: emits HRIMS_CONFIG_CHANGED for hrims prefix, SYSTEM_SETTING_CHANGED otherwise
 *  - logSuspiciousLoginSuccess: emits SUSPICIOUS_LOGIN_SUCCESS with reasons
 *  - AuditEventType enum exposes the new event types
 *
 * Strategy: intercept the underlying writeAuditLog (the lowest-level sink) so
 * we can assert on what each helper passes downstream. The helpers themselves
 * run unchanged.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture every audit write through the lowest-level sink
const mockWriteAuditLog = vi.fn();

vi.mock('@/lib/audit-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit-db')>();
  return {
    ...actual,
    writeAuditLog: (...args: any[]) => mockWriteAuditLog(...args),
  };
});

describe('MEDIUM-gap audit helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logRequestForward', () => {
    it('emits REQUEST_FORWARDED with fromStage/toStage in additionalData', async () => {
      const { logRequestForward } = await import('@/lib/audit-logger');
      await logRequestForward({
        requestType: 'PROMOTION',
        requestId: 'req-123',
        employeeId: 'emp-1',
        employeeName: 'Jane Doe',
        forwardedById: 'user-1',
        forwardedByUsername: 'hrrp_user',
        forwardedByRole: 'HRRP',
        fromStage: 'PENDING',
        toStage: 'HRRP_REVIEW',
        comment: 'Ready for HRRP review',
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('REQUEST_FORWARDED');
      expect(call.severity).toBe('INFO');
      expect(call.additionalData.fromStage).toBe('PENDING');
      expect(call.additionalData.toStage).toBe('HRRP_REVIEW');
      expect(call.additionalData.action).toBe('FORWARDED');
    });
  });

  describe('logConfigChange', () => {
    it('emits HRIMS_CONFIG_CHANGED for hrims prefix', async () => {
      const { logConfigChange } = await import('@/lib/audit-logger');
      await logConfigChange({
        configKey: 'HRIMS_API_URL',
        previousValue: 'https://old.example.com',
        newValue: 'https://new.example.com',
        performedById: 'admin-1',
        performedByUsername: 'admin',
        performedByRole: 'Admin',
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('HRIMS_CONFIG_CHANGED');
      expect(call.severity).toBe('CRITICAL');
    });

    it('emits SYSTEM_SETTING_CHANGED for non-hrims keys', async () => {
      const { logConfigChange } = await import('@/lib/audit-logger');
      await logConfigChange({
        configKey: 'MAX_LOGIN_ATTEMPTS',
        previousValue: '5',
        newValue: '3',
        performedById: 'admin-1',
        performedByUsername: 'admin',
        performedByRole: 'Admin',
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('SYSTEM_SETTING_CHANGED');
    });
  });

  describe('logSuspiciousLoginSuccess', () => {
    it('emits SUSPICIOUS_LOGIN_SUCCESS with reasons', async () => {
      const { logSuspiciousLoginSuccess } = await import('@/lib/audit-logger');
      await logSuspiciousLoginSuccess({
        userId: 'user-1',
        username: 'testuser',
        userRole: 'HRO',
        ipAddress: '203.0.113.99',
        deviceInfo: { ua: 'Mozilla/5.0' },
        reasons: ['Login from new IP address', 'Login from new device type: Mobile'],
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('SUSPICIOUS_LOGIN_SUCCESS');
      expect(call.severity).toBe('WARNING');
      expect(call.additionalData.reasons).toEqual([
        'Login from new IP address',
        'Login from new device type: Mobile',
      ]);
      expect(call.additionalData.notifyUser).toBe(true);
    });
  });

  describe('AuditEventType enum', () => {
    it('exposes the new event types', async () => {
      const { AuditEventType } = await import('@/lib/audit-logger');
      expect(AuditEventType.REQUEST_FORWARDED).toBe('REQUEST_FORWARDED');
      expect(AuditEventType.SUSPICIOUS_LOGIN_SUCCESS).toBe('SUSPICIOUS_LOGIN_SUCCESS');
      expect(AuditEventType.HRIMS_CONFIG_CHANGED).toBe('HRIMS_CONFIG_CHANGED');
      expect(AuditEventType.SYSTEM_SETTING_CHANGED).toBe('SYSTEM_SETTING_CHANGED');
      expect(AuditEventType.REQUEST_WITHDRAWN).toBe('REQUEST_WITHDRAWN');
      expect(AuditEventType.PASSWORD_PWNED_LOGIN).toBe('PASSWORD_PWNED_LOGIN');
      // Req 5.6: profile-view event type must exist for successful PII reads
      expect(AuditEventType.EMPLOYEE_VIEWED).toBe('EMPLOYEE_VIEWED');
    });
  });

  describe('logEmployeeView (Req 5.6 — profile view)', () => {
    it('emits EMPLOYEE_VIEWED ACCESS event with actor + target, no PII payload', async () => {
      const { logEmployeeView } = await import('@/lib/audit-logger');
      await logEmployeeView({
        employeeId: 'emp-1',
        employeeName: 'Jane Doe',
        employeeZanId: '60363181',
        targetInstitutionId: 'inst-A',
        performedById: 'user-1',
        performedByUsername: 'hro_user',
        performedByRole: 'HRO',
        ipAddress: '203.0.113.10',
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('EMPLOYEE_VIEWED');
      expect(call.eventCategory).toBe('ACCESS');
      expect(call.severity).toBe('INFO');
      expect(call.requestMethod).toBe('GET');
      expect(call.attemptedRoute).toBe('/api/employees?id=emp-1');
      expect(call.isAuthenticated).toBe(true);
      expect(call.wasBlocked).toBe(false);
      expect(call.userId).toBe('user-1');
      expect(call.username).toBe('hro_user');
      expect(call.userRole).toBe('HRO');
      expect(call.ipAddress).toBe('203.0.113.10');
      // Target identity for SOC triage...
      expect(call.additionalData.employeeId).toBe('emp-1');
      expect(call.additionalData.employeeZanId).toBe('60363181');
      expect(call.additionalData.employeeName).toBe('Jane Doe');
      expect(call.additionalData.targetInstitutionId).toBe('inst-A');
      expect(call.additionalData.action).toBe('VIEWED');
      // ...and the read was NOT a block.
      expect(call.blockReason).toBeNull();
    });
  });

  describe('logRequestWithdrawal (GAP-M2)', () => {
    it('emits REQUEST_WITHDRAWN with user + reason in additionalData', async () => {
      const { logRequestWithdrawal } = await import('@/lib/audit-logger');
      await logRequestWithdrawal({
        requestType: 'Promotion',
        requestId: 'req-456',
        employeeId: 'emp-1',
        employeeName: 'Jane Doe',
        employeeZanId: '60363181',
        withdrawnById: 'user-1',
        withdrawnByUsername: 'hro_user',
        withdrawnByRole: 'HRO',
        withdrawalReason: 'Submitted in error',
        reviewStage: 'Pending HRRP Review',
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('REQUEST_WITHDRAWN');
      expect(call.severity).toBe('WARNING');
      expect(call.userId).toBe('user-1');
      expect(call.username).toBe('hro_user');
      expect(call.userRole).toBe('HRO');
      expect(call.additionalData.action).toBe('WITHDRAWN');
      expect(call.additionalData.withdrawalReason).toBe('Submitted in error');
      expect(call.additionalData.requestType).toBe('Promotion');
      expect(call.additionalData.requestId).toBe('req-456');
      expect(call.additionalData.employeeZanId).toBe('60363181');
      // Non-repudiation: blockReason carries the reason too
      expect(call.blockReason).toBe('Submitted in error');
    });
  });

  describe('logUserAction role/institution diff (GAP-M3/M4)', () => {
    it('records previous/new role + institution diff in additionalData', async () => {
      const { logUserAction } = await import('@/lib/audit-logger');
      await logUserAction({
        action: 'UPDATED',
        targetUserId: 'user-2',
        targetUsername: 'target_user',
        performedById: 'admin-1',
        performedByUsername: 'admin',
        performedByRole: 'Admin',
        additionalData: {
          previousRole: 'HRO',
          newRole: 'HRMO',
          roleChanged: true,
          previousInstitutionId: 'inst-A',
          newInstitutionId: 'inst-A',
          institutionChanged: false,
        },
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('USER_UPDATED');
      // The diff fields must be carried through to the audit row
      expect(call.additionalData.previousRole).toBe('HRO');
      expect(call.additionalData.newRole).toBe('HRMO');
      expect(call.additionalData.roleChanged).toBe(true);
      expect(call.additionalData.previousInstitutionId).toBe('inst-A');
      expect(call.additionalData.newInstitutionId).toBe('inst-A');
      expect(call.additionalData.institutionChanged).toBe(false);
      expect(call.additionalData.targetUserId).toBe('user-2');
    });
  });

  describe('logInstitutionAction manual-entry window diff (GAP-M5)', () => {
    it('records previous/new manual-entry window in additionalData', async () => {
      const { logInstitutionAction } = await import('@/lib/audit-logger');
      await logInstitutionAction({
        action: 'UPDATED',
        institutionId: 'inst-1',
        institutionName: 'Ministry of Example',
        performedById: 'admin-1',
        performedByUsername: 'admin',
        performedByRole: 'Admin',
        additionalData: {
          manualEntryWindowChanged: true,
          previousManualEntryEnabled: false,
          newManualEntryEnabled: true,
          previousManualEntryStartDate: null,
          newManualEntryStartDate: '2026-07-01',
          previousManualEntryEndDate: null,
          newManualEntryEndDate: '2026-07-31',
        },
      });
      expect(mockWriteAuditLog).toHaveBeenCalledOnce();
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('INSTITUTION_UPDATED');
      expect(call.additionalData.manualEntryWindowChanged).toBe(true);
      expect(call.additionalData.previousManualEntryEnabled).toBe(false);
      expect(call.additionalData.newManualEntryEnabled).toBe(true);
      expect(call.additionalData.newManualEntryStartDate).toBe('2026-07-01');
      expect(call.additionalData.newManualEntryEndDate).toBe('2026-07-31');
    });
  });

  describe('cross-institution / IDOR / privilege-escalation events (GAP-M6/M7/M8/M10)', () => {
    it('M6: UNAUTHORIZED_ACCESS event type exists and is emitted for a cross-institution attempt', async () => {
      const { logUnauthorizedAccess, AuditEventType } = await import('@/lib/audit-logger');
      expect(AuditEventType.UNAUTHORIZED_ACCESS).toBe('UNAUTHORIZED_ACCESS');
      await logUnauthorizedAccess({
        userId: 'user-1',
        username: 'hro_a',
        userRole: 'HRO',
        attemptedRoute: '/api/employees?id=emp-from-inst-B',
        blockReason: 'Cross-institution access attempt',
        isAuthenticated: true,
        requestMethod: 'GET',
        additionalData: { targetInstitutionId: 'inst-B', actorInstitutionId: 'inst-A' },
      });
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('UNAUTHORIZED_ACCESS');
      expect(call.wasBlocked).toBe(true);
      expect(call.additionalData.targetInstitutionId).toBe('inst-B');
    });

    it('M7/M10: an IDOR attempt records the target institution id + attempted object id', async () => {
      const { logUnauthorizedAccess } = await import('@/lib/audit-logger');
      await logUnauthorizedAccess({
        userId: 'user-1',
        username: 'hro_a',
        userRole: 'HRO',
        attemptedRoute: '/api/employees?id=emp-999',
        blockReason: 'IDOR: object belongs to a different institution',
        isAuthenticated: true,
        requestMethod: 'GET',
        additionalData: {
          idor: true,
          attemptedObjectId: 'emp-999',
          targetInstitutionId: 'inst-B',
          actorInstitutionId: 'inst-A',
        },
      });
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('UNAUTHORIZED_ACCESS');
      // Forensic shape (GAP-M10): both the target institution and the
      // attempted object id must be present for SOC triage.
      expect(call.additionalData.attemptedObjectId).toBe('emp-999');
      expect(call.additionalData.targetInstitutionId).toBe('inst-B');
      expect(call.additionalData.idor).toBe(true);
    });

    it('M8: a forged-role / privilege-escalation attempt fires FORBIDDEN_ROUTE with ROLE_VIOLATION/PERMISSION_DENIED available', async () => {
      const { logForbiddenRoute, AuditEventType } = await import('@/lib/audit-logger');
      expect(AuditEventType.ROLE_VIOLATION).toBe('ROLE_VIOLATION');
      expect(AuditEventType.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
      await logForbiddenRoute({
        userId: 'user-1',
        username: 'rogue',
        userRole: 'EMPLOYEE',
        attemptedRoute: '/api/users',
        requestMethod: 'POST',
        additionalData: {
          requiredRoles: ['Admin'],
          actualRole: 'EMPLOYEE',
          privilegeEscalationAttempt: true,
          forgedRoleInBody: 'Admin',
        },
      });
      const call = mockWriteAuditLog.mock.calls[0][0];
      expect(call.eventType).toBe('FORBIDDEN_ROUTE');
      expect(call.wasBlocked).toBe(true);
      expect(call.additionalData.actualRole).toBe('EMPLOYEE');
      expect(call.additionalData.privilegeEscalationAttempt).toBe(true);
    });
  });
});

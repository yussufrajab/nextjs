/**
 * Unit Tests for Account Lockout Utilities
 *
 * Testing account lockout, unlock, and failed login attempt handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateStandardLockoutExpiry,
  isAccountLocked,
  getRemainingLockoutTime,
  determineLockoutType,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  lockAccountManually,
  unlockAccount,
  getAccountLockoutStatus,
  autoUnlockExpiredAccounts,
  MAX_FAILED_LOGIN_ATTEMPTS,
  STANDARD_LOCKOUT_DURATION_MINUTES,
  LockoutType,
  LockoutReason,
} from './account-lockout-utils';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock the audit logger
vi.mock('@/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  AuditEventCategory: {
    SECURITY: 'security',
  },
  AuditSeverity: {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
  },
}));

// Import the mocked db
import { db } from '@/lib/db';

describe('account-lockout-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // Constants
  // =============================================================================

  describe('Constants', () => {
    it('should have correct MAX_FAILED_LOGIN_ATTEMPTS value', () => {
      expect(MAX_FAILED_LOGIN_ATTEMPTS).toBe(5);
    });

    it('should have correct STANDARD_LOCKOUT_DURATION_MINUTES value', () => {
      expect(STANDARD_LOCKOUT_DURATION_MINUTES).toBe(30);
    });
  });

  describe('Enums', () => {
    it('should have correct LockoutType values', () => {
      expect(LockoutType.STANDARD).toBe('standard');
      expect(LockoutType.SECURITY).toBe('security');
    });

    it('should have correct LockoutReason values', () => {
      expect(LockoutReason.FAILED_ATTEMPTS).toBe('failed_attempts');
      expect(LockoutReason.PASSWORD_EXPIRED).toBe('password_expired');
      expect(LockoutReason.ADMIN_LOCK).toBe('admin_lock');
      expect(LockoutReason.SECURITY_REVIEW).toBe('security_review');
    });
  });

  // =============================================================================
  // Lockout Expiry Calculation
  // =============================================================================

  describe('calculateStandardLockoutExpiry', () => {
    it('should calculate expiry date in the future', () => {
      const now = new Date();
      const expiry = calculateStandardLockoutExpiry();

      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should set expiry to 30 minutes from now', () => {
      const now = new Date();
      const expiry = calculateStandardLockoutExpiry();
      const diffMinutes = Math.floor(
        (expiry.getTime() - now.getTime()) / 60000
      );

      expect(diffMinutes).toBe(STANDARD_LOCKOUT_DURATION_MINUTES);
    });

    it('should return Date object', () => {
      const expiry = calculateStandardLockoutExpiry();
      expect(expiry).toBeInstanceOf(Date);
    });
  });

  // =============================================================================
  // Account Lock Status
  // =============================================================================

  describe('isAccountLocked', () => {
    it('should return true for manually locked account', () => {
      const user = {
        loginLockedUntil: null,
        isManuallyLocked: true,
        loginLockoutType: null,
      };

      expect(isAccountLocked(user)).toBe(true);
    });

    it('should return true for security lockout', () => {
      const user = {
        loginLockedUntil: null,
        isManuallyLocked: false,
        loginLockoutType: LockoutType.SECURITY,
      };

      expect(isAccountLocked(user)).toBe(true);
    });

    it('should return true for active standard lockout', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes in future
      const user = {
        loginLockedUntil: futureDate,
        isManuallyLocked: false,
        loginLockoutType: LockoutType.STANDARD,
      };

      expect(isAccountLocked(user)).toBe(true);
    });

    it('should return false for expired standard lockout', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes in past
      const user = {
        loginLockedUntil: pastDate,
        isManuallyLocked: false,
        loginLockoutType: LockoutType.STANDARD,
      };

      expect(isAccountLocked(user)).toBe(false);
    });

    it('should return false for unlocked account', () => {
      const user = {
        loginLockedUntil: null,
        isManuallyLocked: false,
        loginLockoutType: null,
      };

      expect(isAccountLocked(user)).toBe(false);
    });

    it('should prioritize manual lock over expired standard lockout', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      const user = {
        loginLockedUntil: pastDate,
        isManuallyLocked: true,
        loginLockoutType: LockoutType.STANDARD,
      };

      expect(isAccountLocked(user)).toBe(true);
    });
  });

  // =============================================================================
  // Remaining Lockout Time
  // =============================================================================

  describe('getRemainingLockoutTime', () => {
    it('should return 0 if loginLockedUntil is null', () => {
      expect(getRemainingLockoutTime(null)).toBe(0);
    });

    it('should return 0 if lockout has expired', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      expect(getRemainingLockoutTime(pastDate)).toBe(0);
    });

    it('should return remaining minutes for future lockout', () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const remaining = getRemainingLockoutTime(futureDate);

      expect(remaining).toBeGreaterThanOrEqual(14);
      expect(remaining).toBeLessThanOrEqual(15);
    });

    it('should round up partial minutes', () => {
      const futureDate = new Date(Date.now() + 90 * 1000); // 1.5 minutes
      const remaining = getRemainingLockoutTime(futureDate);

      expect(remaining).toBe(2); // Should round up
    });

    it('should return 0 for current time', () => {
      const now = new Date();
      const remaining = getRemainingLockoutTime(now);

      expect(remaining).toBeLessThanOrEqual(1); // Could be 0 or 1 due to timing
    });
  });

  // =============================================================================
  // Lockout Type Determination
  // =============================================================================

  describe('determineLockoutType', () => {
    it('should return STANDARD for 5 failed attempts', () => {
      expect(determineLockoutType(5)).toBe(LockoutType.STANDARD);
    });

    it('should return STANDARD for 10 failed attempts', () => {
      expect(determineLockoutType(10)).toBe(LockoutType.STANDARD);
    });

    it('should return SECURITY for 11 failed attempts', () => {
      expect(determineLockoutType(11)).toBe(LockoutType.SECURITY);
    });

    it('should return SECURITY for 20 failed attempts', () => {
      expect(determineLockoutType(20)).toBe(LockoutType.SECURITY);
    });

    it('should return STANDARD for 1 failed attempt', () => {
      expect(determineLockoutType(1)).toBe(LockoutType.STANDARD);
    });
  });

  // =============================================================================
  // Increment Failed Login Attempts
  // =============================================================================

  describe('incrementFailedLoginAttempts', () => {
    const userId = 'user-123';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    it('should increment failed attempts when below threshold', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 2,
        loginLockedUntil: null,
        isManuallyLocked: false,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 3,
      });

      const result = await incrementFailedLoginAttempts(
        userId,
        ipAddress,
        userAgent
      );

      expect(result.locked).toBe(false);
      expect(result.lockoutType).toBeNull();
      expect(result.remainingAttempts).toBe(2); // 5 - 3 = 2

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          failedLoginAttempts: 3,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should lock account with standard lockout on 5th attempt', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 4,
        loginLockedUntil: null,
        isManuallyLocked: false,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 5,
        active: false,
      });

      const result = await incrementFailedLoginAttempts(
        userId,
        ipAddress,
        userAgent
      );

      expect(result.locked).toBe(true);
      expect(result.lockoutType).toBe(LockoutType.STANDARD);
      expect(result.remainingAttempts).toBe(0);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
          loginLockoutType: LockoutType.STANDARD,
          active: false,
          loginLockedUntil: expect.any(Date),
        }),
      });
    });

    it('should lock account with security lockout on 11th attempt', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 10,
        loginLockedUntil: null,
        isManuallyLocked: false,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 11,
        active: false,
      });

      const result = await incrementFailedLoginAttempts(
        userId,
        ipAddress,
        userAgent
      );

      expect(result.locked).toBe(true);
      expect(result.lockoutType).toBe(LockoutType.SECURITY);
      expect(result.remainingAttempts).toBe(0);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          failedLoginAttempts: 11,
          loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
          loginLockoutType: LockoutType.SECURITY,
          active: false,
          loginLockedUntil: null, // Security lockout has no expiry
        }),
      });
    });

    it('should throw error if user not found', async () => {
      (db.user.findUnique as any).mockResolvedValue(null);

      await expect(
        incrementFailedLoginAttempts(userId, ipAddress, userAgent)
      ).rejects.toThrow('User not found');
    });

    it('should calculate remaining attempts correctly', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 0,
        loginLockedUntil: null,
        isManuallyLocked: false,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({
        ...mockUser,
        failedLoginAttempts: 1,
      });

      const result = await incrementFailedLoginAttempts(
        userId,
        ipAddress,
        userAgent
      );

      expect(result.remainingAttempts).toBe(4); // 5 - 1 = 4
    });
  });

  // =============================================================================
  // Reset Failed Login Attempts
  // =============================================================================

  describe('resetFailedLoginAttempts', () => {
    const userId = 'user-123';

    it('should reset failed attempts to 0', async () => {
      (db.user.update as any).mockResolvedValue({
        id: userId,
        failedLoginAttempts: 0,
      });

      await resetFailedLoginAttempts(userId);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          loginLockedUntil: null,
          loginLockoutReason: null,
          loginLockoutType: null,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should clear lockout fields', async () => {
      (db.user.update as any).mockResolvedValue({});

      await resetFailedLoginAttempts(userId);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          loginLockedUntil: null,
          loginLockoutReason: null,
          loginLockoutType: null,
        }),
      });
    });
  });

  // =============================================================================
  // Manual Account Lock
  // =============================================================================

  describe('lockAccountManually', () => {
    const userId = 'user-123';
    const adminId = 'admin-456';
    const reason = 'Suspicious activity detected';
    const notes = 'Multiple failed login attempts from unknown locations';

    it('should lock account manually', async () => {
      (db.user.update as any).mockResolvedValue({});
      (db.user.findUnique as any).mockResolvedValue({
        username: 'testuser',
        role: 'ADMIN',
      });

      await lockAccountManually(userId, adminId, reason, notes);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          isManuallyLocked: true,
          lockedBy: adminId,
          lockedAt: expect.any(Date),
          loginLockoutReason: LockoutReason.ADMIN_LOCK,
          loginLockoutType: LockoutType.SECURITY,
          lockoutNotes: notes,
          active: false,
        }),
      });
    });

    it('should use reason as lockoutNotes if notes not provided', async () => {
      (db.user.update as any).mockResolvedValue({});
      (db.user.findUnique as any).mockResolvedValue({
        username: 'testuser',
        role: 'ADMIN',
      });

      await lockAccountManually(userId, adminId, reason);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          lockoutNotes: reason,
        }),
      });
    });

    it('should deactivate account when locking', async () => {
      (db.user.update as any).mockResolvedValue({});
      (db.user.findUnique as any).mockResolvedValue({
        username: 'testuser',
        role: 'ADMIN',
      });

      await lockAccountManually(userId, adminId, reason, notes);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          active: false,
        }),
      });
    });
  });

  // =============================================================================
  // Unlock Account
  // =============================================================================

  describe('unlockAccount', () => {
    const userId = 'user-123';
    const adminId = 'admin-456';
    const verificationNotes = 'Identity verified by phone call';

    it('should unlock account', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 5,
        loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
        isManuallyLocked: true,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({});

      await unlockAccount(userId, adminId, verificationNotes);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          isManuallyLocked: false,
          lockedBy: null,
          lockedAt: null,
          loginLockedUntil: null,
          loginLockoutReason: null,
          loginLockoutType: null,
          lockoutNotes: null,
          failedLoginAttempts: 0,
          active: true,
        }),
      });
    });

    it('should reset failed attempts when unlocking', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 10,
        loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
        isManuallyLocked: true,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({});

      await unlockAccount(userId, adminId, verificationNotes);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          failedLoginAttempts: 0,
        }),
      });
    });

    it('should reactivate account when unlocking', async () => {
      const mockUser = {
        id: userId,
        username: 'testuser',
        failedLoginAttempts: 5,
        loginLockoutReason: LockoutReason.ADMIN_LOCK,
        isManuallyLocked: true,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({});

      await unlockAccount(userId, adminId, verificationNotes);

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          active: true,
        }),
      });
    });

    it('should throw error if user not found', async () => {
      (db.user.findUnique as any).mockResolvedValue(null);

      await expect(
        unlockAccount(userId, adminId, verificationNotes)
      ).rejects.toThrow('User not found');
    });
  });

  // =============================================================================
  // Get Account Lockout Status
  // =============================================================================

  describe('getAccountLockoutStatus', () => {
    it('should return complete status for locked account', () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000);
      const lockedAt = new Date(Date.now() - 5 * 60 * 1000);
      const user = {
        failedLoginAttempts: 5,
        loginLockedUntil: futureDate,
        loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
        loginLockoutType: LockoutType.STANDARD,
        isManuallyLocked: false,
        lockedBy: null,
        lockedAt,
        lockoutNotes: null,
      };

      const status = getAccountLockoutStatus(user);

      expect(status.isLocked).toBe(true);
      expect(status.lockoutType).toBe(LockoutType.STANDARD);
      expect(status.lockoutReason).toBe(LockoutReason.FAILED_ATTEMPTS);
      expect(status.lockedUntil).toBe(futureDate);
      expect(status.failedAttempts).toBe(5);
      expect(status.isManuallyLocked).toBe(false);
      expect(status.canAutoUnlock).toBe(true);
    });

    it('should return status for manually locked account', () => {
      const user = {
        failedLoginAttempts: 3,
        loginLockedUntil: null,
        loginLockoutReason: LockoutReason.ADMIN_LOCK,
        loginLockoutType: LockoutType.SECURITY,
        isManuallyLocked: true,
        lockedBy: 'admin-123',
        lockedAt: new Date(),
        lockoutNotes: 'Suspicious activity',
      };

      const status = getAccountLockoutStatus(user);

      expect(status.isLocked).toBe(true);
      expect(status.lockoutType).toBe(LockoutType.SECURITY);
      expect(status.isManuallyLocked).toBe(true);
      expect(status.lockedBy).toBe('admin-123');
      expect(status.canAutoUnlock).toBe(false); // Manual lock cannot auto-unlock
      expect(status.lockoutNotes).toBe('Suspicious activity');
    });

    it('should return status for unlocked account', () => {
      const user = {
        failedLoginAttempts: 0,
        loginLockedUntil: null,
        loginLockoutReason: null,
        loginLockoutType: null,
        isManuallyLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockoutNotes: null,
      };

      const status = getAccountLockoutStatus(user);

      expect(status.isLocked).toBe(false);
      expect(status.lockoutType).toBeNull();
      expect(status.lockoutReason).toBeNull();
      expect(status.remainingMinutes).toBe(0);
      expect(status.failedAttempts).toBe(0);
      expect(status.canAutoUnlock).toBe(false);
    });

    it('should indicate security lockout cannot auto-unlock', () => {
      const user = {
        failedLoginAttempts: 12,
        loginLockedUntil: null,
        loginLockoutReason: LockoutReason.FAILED_ATTEMPTS,
        loginLockoutType: LockoutType.SECURITY,
        isManuallyLocked: false,
        lockedBy: null,
        lockedAt: new Date(),
        lockoutNotes: null,
      };

      const status = getAccountLockoutStatus(user);

      expect(status.isLocked).toBe(true);
      expect(status.lockoutType).toBe(LockoutType.SECURITY);
      expect(status.canAutoUnlock).toBe(false); // Security lockout requires admin
    });
  });

  // =============================================================================
  // Auto-Unlock Expired Accounts
  // =============================================================================

  describe('autoUnlockExpiredAccounts', () => {
    it('should unlock expired standard lockouts', async () => {
      (db.user.updateMany as any).mockResolvedValue({ count: 3 });

      const count = await autoUnlockExpiredAccounts();

      expect(count).toBe(3);
      expect(db.user.updateMany).toHaveBeenCalledWith({
        where: {
          active: false,
          isManuallyLocked: false,
          loginLockoutType: LockoutType.STANDARD,
          loginLockedUntil: {
            lt: expect.any(Date),
          },
        },
        data: expect.objectContaining({
          active: true,
          loginLockedUntil: null,
          loginLockoutReason: null,
          loginLockoutType: null,
          failedLoginAttempts: 0,
        }),
      });
    });

    it('should return 0 if no expired lockouts', async () => {
      (db.user.updateMany as any).mockResolvedValue({ count: 0 });

      const count = await autoUnlockExpiredAccounts();

      expect(count).toBe(0);
    });

    it('should reset failed attempts when auto-unlocking', async () => {
      (db.user.updateMany as any).mockResolvedValue({ count: 2 });

      await autoUnlockExpiredAccounts();

      expect(db.user.updateMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        data: expect.objectContaining({
          failedLoginAttempts: 0,
        }),
      });
    });

    it('should only unlock standard lockouts, not security', async () => {
      (db.user.updateMany as any).mockResolvedValue({ count: 1 });

      await autoUnlockExpiredAccounts();

      expect(db.user.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          loginLockoutType: LockoutType.STANDARD,
        }),
        data: expect.any(Object),
      });
    });

    it('should not unlock manually locked accounts', async () => {
      (db.user.updateMany as any).mockResolvedValue({ count: 1 });

      await autoUnlockExpiredAccounts();

      expect(db.user.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isManuallyLocked: false,
        }),
        data: expect.any(Object),
      });
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe('Edge Cases', () => {
    it('should handle lockout exactly at threshold (5 attempts)', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        failedLoginAttempts: 4,
        loginLockedUntil: null,
        isManuallyLocked: false,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({});

      const result = await incrementFailedLoginAttempts(
        'user-123',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.locked).toBe(true);
      expect(result.remainingAttempts).toBe(0);
    });

    it('should handle lockout at security threshold (11 attempts)', async () => {
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        failedLoginAttempts: 10,
        loginLockedUntil: null,
        isManuallyLocked: false,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (db.user.update as any).mockResolvedValue({});

      const result = await incrementFailedLoginAttempts(
        'user-123',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.lockoutType).toBe(LockoutType.SECURITY);
    });

    it('should handle account with both manual and standard lockout flags', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const user = {
        loginLockedUntil: futureDate,
        isManuallyLocked: true, // Manual lock takes precedence
        loginLockoutType: LockoutType.STANDARD,
      };

      expect(isAccountLocked(user)).toBe(true);
    });

    it('should handle lockout with exactly 0 minutes remaining', () => {
      const now = new Date();
      const remaining = getRemainingLockoutTime(now);

      expect(remaining).toBeLessThanOrEqual(1);
    });
  });
});
